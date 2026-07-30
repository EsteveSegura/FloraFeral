/**
 * Batch Executor Service
 * Runs the whole workflow N times sequentially, applying a different set of
 * inputs on each run and collecting the outputs of the marked nodes.
 *
 * Runs are sequential by design: WorkflowExecutor drives execution through the
 * event bus and the mounted node components (see useWorkflowEvents), and there
 * is a single component instance per node on the canvas.
 */

import { nextTick } from 'vue'
import workflowExecutor from '@/services/workflow-executor'
import workflowEventBus, { WORKFLOW_EVENTS } from '@/lib/workflow-events'
import { topologicalSort } from '@/lib/graph-utils'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import { useFlowStore } from '@/stores/flow'
import {
  BATCH_ROLES,
  getBatchNodes,
  buildBatchInputPatch,
  buildBatchOutputResetPatch,
  readBatchOutput
} from '@/lib/batch-io'

/**
 * Keep the per-node timeout below the workflow default (5 min) so a node whose
 * component stopped answering cannot stall the whole batch
 */
const BATCH_NODE_TIMEOUT = 150000

/**
 * Max iterations spent waiting for the graph to settle after writing inputs
 */
const MAX_SETTLE_ITERATIONS = 20

/**
 * Compute a signature of every value that can propagate through the graph.
 * Used to detect when reactive chains (prompt -> template -> generator) have
 * finished recomputing.
 * @param {Array} nodes
 * @returns {string}
 */
function graphSignature(nodes) {
  return nodes
    .map(node => `${node.id}:${node.data?.prompt ?? ''}:${node.data?.src ?? ''}`)
    .join('|')
}

/**
 * Wait until the graph stops changing.
 *
 * Counting ticks is not reliable here: WorkflowExecutor emits the execute event
 * synchronously and the generator reads its `connectedPrompt` computed right
 * away, so the inputs must have fully propagated before execution starts.
 * @param {Object} flowStore
 * @returns {Promise<boolean>} true if it settled, false if it timed out
 */
async function waitForGraphSettled(flowStore) {
  let previous = graphSignature(flowStore.nodes)

  for (let i = 0; i < MAX_SETTLE_ITERATIONS; i++) {
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const current = graphSignature(flowStore.nodes)
    if (current === previous) {
      return true
    }
    previous = current
  }

  return false
}

/**
 * Order input nodes so that upstream ones are written first.
 *
 * A PromptTemplate resolves its template from the node feeding it, so if that
 * node is also a batch input it must already hold this run's value.
 * @param {Array} inputNodes - Nodes marked as batch inputs
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Array} inputNodes, upstream first
 */
function sortUpstreamFirst(inputNodes, nodes, edges) {
  const { sorted } = topologicalSort(nodes, edges)
  const order = new Map(sorted.map((nodeId, index) => [nodeId, index]))

  return [...inputNodes].sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  )
}

/**
 * Take a JSON-safe snapshot of the data of the given nodes
 * @param {Array} nodes
 * @returns {Map<string, Object>} nodeId -> cloned data
 */
function snapshotNodeData(nodes) {
  const snapshot = new Map()

  for (const node of nodes) {
    snapshot.set(node.id, JSON.parse(JSON.stringify(node.data || {})))
  }

  return snapshot
}

/**
 * Run the workflow once per row, applying its inputs and collecting its outputs
 *
 * @param {Object} params
 * @param {Array} params.runs - Rows: [{ inputs: { nodeId: value } }]
 * @param {Function} params.updateNodeData - VueFlow's updateNodeData, injected
 *        from a component (calling useVueFlow() outside one creates a detached store)
 * @param {Function} [params.onRunStart] - (index) => void
 * @param {Function} [params.onRunFinish] - (index, result) => void
 * @param {Function} [params.shouldCancel] - () => boolean, checked between steps
 * @returns {Promise<Array>} One result per run: { status, error, outputs }
 */
export async function runBatch({
  runs,
  updateNodeData,
  onRunStart,
  onRunFinish,
  shouldCancel = () => false
}) {
  const flowStore = useFlowStore()
  const executionStore = useWorkflowExecutionStore()

  const inputNodes = sortUpstreamFirst(
    getBatchNodes(flowStore.nodes, BATCH_ROLES.INPUT),
    flowStore.nodes,
    flowStore.edges
  )
  const outputNodes = getBatchNodes(flowStore.nodes, BATCH_ROLES.OUTPUT)

  if (outputNodes.length === 0) {
    throw new Error('Mark at least one node as batch output before running')
  }

  const snapshot = snapshotNodeData([...inputNodes, ...outputNodes])
  const results = []

  try {
    for (let index = 0; index < runs.length; index++) {
      if (shouldCancel()) break

      onRunStart?.(index)

      const result = await executeSingleRun({
        run: runs[index],
        inputNodes,
        outputNodes,
        flowStore,
        executionStore,
        updateNodeData,
        shouldCancel
      })

      results.push(result)
      onRunFinish?.(index, result)
    }
  } finally {
    restoreNodeData(snapshot, updateNodeData)
    await nextTick()
  }

  return results
}

/**
 * Execute one run: write inputs, clear outputs, run the workflow, read results
 * @returns {Promise<Object>} { status, error, outputs }
 */
async function executeSingleRun({
  run,
  inputNodes,
  outputNodes,
  flowStore,
  executionStore,
  updateNodeData,
  shouldCancel
}) {
  // 1. Apply this run's inputs
  for (const node of inputNodes) {
    const value = run.inputs?.[node.id]
    const patch = buildBatchInputPatch(node, value, flowStore.nodes, flowStore.edges)

    // A null patch means "this row has no value for the node" — keep its own
    if (patch) {
      updateNodeData(node.id, patch)
    }
  }

  // 2. Clear previous outputs so an empty field means "this run produced nothing"
  for (const node of outputNodes) {
    updateNodeData(node.id, buildBatchOutputResetPatch(node))
  }

  // 3. Let the reactive chains finish before the executor reads them
  const settled = await waitForGraphSettled(flowStore)
  if (!settled) {
    return {
      status: 'error',
      error: 'Inputs did not propagate through the graph in time',
      outputs: {}
    }
  }

  if (shouldCancel()) {
    return { status: 'error', error: 'Cancelled', outputs: {} }
  }

  // 4. Capture outputs the moment each node reports back.
  //    Both generators swallow their API errors and never rethrow, so the bus
  //    reports NODE_COMPLETE even on failure and `data.error` is wiped 5s later
  //    by ImageGeneratorNode. Reading synchronously here is the only reliable
  //    way to know what actually happened.
  const captured = new Map()
  const outputIds = new Set(outputNodes.map(node => node.id))

  const captureOutput = ({ nodeId }) => {
    if (!outputIds.has(nodeId)) return

    const node = flowStore.nodes.find(n => n.id === nodeId)
    if (node) {
      captured.set(nodeId, readBatchOutput(node))
    }
  }

  const unsubscribeComplete = workflowEventBus.on(WORKFLOW_EVENTS.NODE_COMPLETE, captureOutput)
  const unsubscribeError = workflowEventBus.on(WORKFLOW_EVENTS.NODE_ERROR, ({ nodeId, error }) => {
    if (!outputIds.has(nodeId)) return
    captured.set(nodeId, { value: null, error: error || 'Node execution failed' })
  })

  // 5. Run the workflow
  let executionError = null
  try {
    executionStore.resetExecution()
    await workflowExecutor.executeWorkflow({
      forceRerun: true,
      nodeTimeout: BATCH_NODE_TIMEOUT
    })
  } catch (error) {
    executionError = error.message || 'Workflow execution failed'
  } finally {
    unsubscribeComplete()
    unsubscribeError()
  }

  // 6. Build the row result.
  //    `result.success` from the executor is not trustworthy (it reports success
  //    when nothing was executable and when the run was stopped), so the batch
  //    judges by the outputs it captured.
  const outputs = {}
  const errors = []

  for (const node of outputNodes) {
    const current = flowStore.nodes.find(n => n.id === node.id) || node
    const capturedOutput = captured.get(node.id)
    const live = readBatchOutput(current)

    const value = capturedOutput?.value ?? live.value
    const error = capturedOutput?.error ?? live.error

    outputs[node.id] = {
      kind: live.kind,
      label: current.data?.label || current.type,
      value: value || null
    }

    if (!value) {
      errors.push(`${current.data?.label || current.type}: ${error || 'no output produced'}`)
    }
  }

  if (executionError) {
    errors.unshift(executionError)
  }

  return {
    status: errors.length > 0 ? 'error' : 'done',
    error: errors.length > 0 ? errors.join(' · ') : null,
    outputs
  }
}

/**
 * Restore the node data captured before the batch started
 * @param {Map<string, Object>} snapshot
 * @param {Function} updateNodeData
 */
function restoreNodeData(snapshot, updateNodeData) {
  for (const [nodeId, data] of snapshot) {
    updateNodeData(nodeId, data, { replace: true })
  }
}
