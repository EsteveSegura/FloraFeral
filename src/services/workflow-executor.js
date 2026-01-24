/**
 * Workflow Executor Service
 * Orchestrates the execution of workflow nodes in topological order
 */

import { topologicalSort, detectCycles } from '@/lib/graph-utils'
import workflowEventBus, { WORKFLOW_EVENTS } from '@/lib/workflow-events'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import { useFlowStore } from '@/stores/flow'
import nodeRegistry from '@/lib/node-registry'
import { NODE_TYPES } from '@/lib/node-shapes'

/**
 * Default execution options
 */
const DEFAULT_OPTIONS = {
  maxParallelism: 10,        // Max nodes to execute in parallel
  continueOnError: false,   // Stop execution when a node fails
  skipCompleted: true,      // Skip nodes that already have valid output
  forceRerun: false,        // Force re-execution even if nodes have output
  nodeTimeout: 300000       // 5 minutes timeout per node
}

/**
 * Determine if a node should be executed based on its current state
 * @param {Object} node - Node object from flowStore
 * @returns {boolean}
 */
function shouldExecuteNode(node) {
  const nodeDef = nodeRegistry.getNodeDef(node.type)

  // Nodes without outputs are terminal nodes (display only) - skip them
  if (!nodeDef || !nodeDef.outputs || nodeDef.outputs.length === 0) {
    return false
  }

  // Group nodes don't execute
  if (node.type === NODE_TYPES.GROUP) {
    return false
  }

  // Check by node type if it already has valid output
  switch (node.type) {
    case NODE_TYPES.IMAGE_GENERATOR:
      // Execute if no generated image
      return !node.data?.lastOutputSrc

    case NODE_TYPES.TEXT_GENERATOR:
      // Execute if no generated text
      return !node.data?.generatedText

    case NODE_TYPES.PROMPT:
      // Prompt nodes are "complete" if they have prompt text
      // They don't need execution - they're input nodes
      return false

    case NODE_TYPES.PROMPT_TEMPLATE:
      // Template nodes process reactively, don't need workflow execution
      return false

    case NODE_TYPES.DRAW:
      // Draw nodes output their canvas state reactively
      // They're interactive, not executed
      return false

    case NODE_TYPES.IMAGE:
      // Image nodes are source nodes with uploaded images
      // They don't need execution
      return false

    default:
      // Unknown nodes - try to execute
      return true
  }
}

/**
 * Check if a node has valid input (all required inputs connected and with data)
 * This is a soft check - nodes can still attempt execution and fail with their own errors
 * @param {Object} node - Node object
 * @param {Array} edges - All edges
 * @param {Array} nodes - All nodes
 * @returns {{ valid: boolean, reason: string | null }}
 */
function checkNodeInputs(node, edges, nodes) {
  const nodeDef = nodeRegistry.getNodeDef(node.type)
  if (!nodeDef) {
    return { valid: false, reason: 'Unknown node type' }
  }

  // Let nodes attempt execution - they have their own validation
  // Only skip if there's a critical structural issue
  return { valid: true, reason: null }
}

/**
 * WorkflowExecutor class
 * Manages workflow execution lifecycle
 */
class WorkflowExecutor {
  constructor() {
    this.executionStore = null
    this.flowStore = null
    this.options = { ...DEFAULT_OPTIONS }
    this.abortController = null
  }

  /**
   * Initialize stores (called lazily to avoid Pinia setup issues)
   */
  initStores() {
    if (!this.executionStore) {
      this.executionStore = useWorkflowExecutionStore()
    }
    if (!this.flowStore) {
      this.flowStore = useFlowStore()
    }
  }

  /**
   * Execute the entire workflow
   * Uses dependency-based execution: nodes start as soon as their dependencies complete,
   * allowing independent chains to run in parallel without waiting for each other.
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} - Execution result
   */
  async executeWorkflow(options = {}) {
    this.initStores()
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.abortController = new AbortController()

    // Access store values directly (don't destructure refs)
    const nodes = this.flowStore.nodes
    const edges = this.flowStore.edges

    console.log('[WorkflowExecutor] Starting workflow execution')
    console.log('[WorkflowExecutor] Nodes:', nodes.length, nodes.map(n => ({ id: n.id, type: n.type })))
    console.log('[WorkflowExecutor] Edges:', edges.length)

    // Check for cycles
    const cycleResult = detectCycles(nodes, edges)
    if (cycleResult.hasCycle) {
      const error = {
        type: 'cycle',
        message: 'Workflow contains a cycle and cannot be executed',
        cyclePath: cycleResult.cyclePath
      }
      alert(error.message)
      workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_ERROR, error)
      throw new Error(error.message)
    }

    // Build dependency graph and determine which nodes need execution
    const executableNodes = this.getExecutableNodes(nodes, edges)
    console.log('[WorkflowExecutor] Executable nodes:', executableNodes)

    if (executableNodes.length === 0) {
      console.log('[WorkflowExecutor] No executable nodes found')
      return { success: true, executionId: null, duration: 0, progress: { completed: 0, total: 0 } }
    }

    // Build dependency map for executable nodes
    // A node's dependencies are upstream nodes that are also in the executable set
    const dependencyMap = new Map() // nodeId -> Set of nodeIds it depends on
    const dependentsMap = new Map() // nodeId -> Set of nodeIds that depend on it

    for (const nodeId of executableNodes) {
      dependencyMap.set(nodeId, new Set())
      dependentsMap.set(nodeId, new Set())
    }

    for (const edge of edges) {
      const sourceExecutable = executableNodes.includes(edge.source)
      const targetExecutable = executableNodes.includes(edge.target)

      if (targetExecutable) {
        // Only add dependency if source is also executable
        // (if source is a static node like Image, we don't wait for it)
        if (sourceExecutable) {
          dependencyMap.get(edge.target).add(edge.source)
          dependentsMap.get(edge.source).add(edge.target)
        }
      }
    }

    console.log('[WorkflowExecutor] Dependency map:',
      Object.fromEntries([...dependencyMap].map(([k, v]) => [k, [...v]])))

    // Initialize execution state with flat list (no levels needed)
    this.executionStore.initializeExecution([executableNodes])

    // Emit workflow start event
    workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_START, {
      executionId: this.executionStore.executionId,
      totalNodes: executableNodes.length,
      levels: 1 // Not using levels anymore
    })

    try {
      // Track completion state
      const completedNodes = new Set()
      const failedNodes = new Set()
      const runningNodes = new Set()
      const pendingNodes = new Set(executableNodes)
      let stopOnError = false // Flag to stop execution on error

      // Find initially ready nodes (no dependencies)
      const readyQueue = executableNodes.filter(nodeId =>
        dependencyMap.get(nodeId).size === 0
      )
      for (const nodeId of readyQueue) {
        pendingNodes.delete(nodeId)
      }

      console.log('[WorkflowExecutor] Initially ready nodes:', readyQueue)

      // Process nodes as they become ready
      while ((readyQueue.length > 0 || runningNodes.size > 0) && !stopOnError) {
        // Check for stop signal
        if (!this.executionStore.isExecuting) {
          break
        }

        // Wait while paused
        while (this.executionStore.isPaused) {
          await this.sleep(100)
          if (!this.executionStore.isExecuting) break
        }

        if (!this.executionStore.isExecuting) break

        // Start as many nodes as possible (up to maxParallelism)
        while (readyQueue.length > 0 && runningNodes.size < this.options.maxParallelism && !stopOnError) {
          const nodeId = readyQueue.shift()
          runningNodes.add(nodeId)

          // Execute node asynchronously - don't await here!
          this.executeNodeAsync(nodeId, this.options.nodeTimeout)
            .then(result => {
              runningNodes.delete(nodeId)
              completedNodes.add(nodeId)

              // Don't process dependents if we're stopping
              if (stopOnError) return

              // Check dependents - are any now ready?
              const dependents = dependentsMap.get(nodeId) || new Set()
              for (const depId of dependents) {
                if (pendingNodes.has(depId)) {
                  // Check if all dependencies are now satisfied
                  const deps = dependencyMap.get(depId)
                  const allDepsCompleted = [...deps].every(d => completedNodes.has(d))
                  const anyDepFailed = [...deps].some(d => failedNodes.has(d))

                  if (anyDepFailed) {
                    // Skip this node - upstream failed
                    pendingNodes.delete(depId)
                    failedNodes.add(depId)
                    this.executionStore.setNodeStatus(depId, 'skipped')
                    workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_SKIP, depId, {
                      reason: 'Upstream node failed'
                    })
                  } else if (allDepsCompleted) {
                    pendingNodes.delete(depId)
                    readyQueue.push(depId)
                    console.log(`[WorkflowExecutor] Node ${depId} is now ready`)
                  }
                }
              }
            })
            .catch(error => {
              runningNodes.delete(nodeId)
              failedNodes.add(nodeId)

              // Stop execution on error
              if (!this.options.continueOnError) {
                console.log(`[WorkflowExecutor] Stopping execution due to error in node ${nodeId}`)
                stopOnError = true
                // Clear the ready queue to prevent new nodes from starting
                readyQueue.length = 0
                // Stop the execution store
                this.executionStore.stopExecution()
                return
              }

              // Skip dependent nodes (only if continuing on error)
              const dependents = dependentsMap.get(nodeId) || new Set()
              for (const depId of dependents) {
                if (pendingNodes.has(depId)) {
                  pendingNodes.delete(depId)
                  failedNodes.add(depId)
                  this.executionStore.setNodeStatus(depId, 'skipped')
                  workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_SKIP, depId, {
                    reason: 'Upstream node failed'
                  })
                }
              }
            })
        }

        // Small delay to prevent busy-waiting
        await this.sleep(50)
      }

      // Wait for any remaining running nodes to finish
      while (runningNodes.size > 0) {
        await this.sleep(50)
      }

      // Only complete if not stopped due to error
      if (!stopOnError) {
        this.executionStore.completeExecution()
      }

      const result = {
        success: failedNodes.size === 0 && !stopOnError,
        executionId: this.executionStore.executionId,
        duration: this.executionStore.executionDuration,
        progress: this.executionStore.progress
      }

      workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_COMPLETE, result)

      return result
    } catch (error) {
      this.executionStore.stopExecution()
      workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_ERROR, {
        message: error.message,
        error
      })
      throw error
    }
  }

  /**
   * Get list of nodes that should be executed
   */
  getExecutableNodes(nodes, edges) {
    return nodes
      .filter(node => {
        // Check if node should be executed
        const shouldExec = shouldExecuteNode(node)

        // If forceRerun is enabled, execute all generator nodes regardless of current state
        if (this.options.forceRerun) {
          const isGeneratorNode = node.type === NODE_TYPES.IMAGE_GENERATOR || node.type === NODE_TYPES.TEXT_GENERATOR
          if (isGeneratorNode) {
            console.log(`[WorkflowExecutor] Force re-running node ${node.id}`)
            return true
          }
        }

        if (this.options.skipCompleted && !shouldExec) {
          console.log(`[WorkflowExecutor] Skipping node ${node.id} - already completed or not executable`)
          return false
        }

        return shouldExec
      })
      .map(n => n.id)
  }

  /**
   * Execute a node asynchronously (returns a promise)
   */
  async executeNodeAsync(nodeId, timeout) {
    return this.executeNode(nodeId, timeout)
  }

  /**
   * Execute nodes in a single level with parallelism control
   * @param {Array<string>} nodeIds - Node IDs to execute
   */
  async executeLevelNodes(nodeIds) {
    const { maxParallelism, continueOnError, nodeTimeout } = this.options
    const chunks = this.chunkArray(nodeIds, maxParallelism)

    for (const chunk of chunks) {
      // Check for stop/pause
      if (!this.executionStore.isExecuting) break
      while (this.executionStore.isPaused) {
        await this.sleep(100)
        if (!this.executionStore.isExecuting) return
      }

      // Execute chunk in parallel
      const promises = chunk.map(nodeId => this.executeNode(nodeId, nodeTimeout))

      const results = await Promise.allSettled(promises)

      // Check results
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const nodeId = chunk[i]

        if (result.status === 'rejected') {
          console.error(`Node ${nodeId} execution failed:`, result.reason)

          if (!continueOnError) {
            throw result.reason
          }

          // Mark dependent nodes as skipped
          this.skipDependentNodes(nodeId)
        }
      }
    }
  }

  /**
   * Execute a single node
   * @param {string} nodeId - Node ID
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<Object>}
   */
  async executeNode(nodeId, timeout) {
    this.initStores()

    console.log(`[WorkflowExecutor] Executing node ${nodeId}`)

    const node = this.flowStore.nodes.find(n => n.id === nodeId)
    if (!node) {
      console.log(`[WorkflowExecutor] Node ${nodeId} not found!`)
      this.executionStore.setNodeError(nodeId, 'Node not found')
      throw new Error(`Node ${nodeId} not found`)
    }

    // Check inputs
    const inputCheck = checkNodeInputs(node, this.flowStore.edges, this.flowStore.nodes)
    console.log(`[WorkflowExecutor] Node ${nodeId} input check:`, inputCheck)

    if (!inputCheck.valid) {
      console.log(`[WorkflowExecutor] Node ${nodeId} skipped: ${inputCheck.reason}`)
      this.executionStore.setNodeStatus(nodeId, 'skipped')
      workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_SKIP, nodeId, {
        reason: inputCheck.reason
      })
      return { skipped: true, reason: inputCheck.reason }
    }

    // Mark as executing
    this.executionStore.setNodeStatus(nodeId, 'executing')
    workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_START, nodeId)

    console.log(`[WorkflowExecutor] Requesting execution for node ${nodeId}`)

    try {
      // Request node to execute via event bus
      // The node component listens for this and calls its handleGenerate or similar
      const result = await workflowEventBus.requestNodeExecution(nodeId, timeout)

      console.log(`[WorkflowExecutor] Node ${nodeId} completed successfully`)
      // Mark as completed
      this.executionStore.setNodeStatus(nodeId, 'completed')

      return result
    } catch (error) {
      console.error(`[WorkflowExecutor] Node ${nodeId} failed:`, error)
      this.executionStore.setNodeError(nodeId, error)
      throw error
    }
  }

  /**
   * Skip nodes that depend on a failed node
   * @param {string} failedNodeId
   */
  skipDependentNodes(failedNodeId) {
    this.initStores()

    const { edges } = this.flowStore

    // Find all nodes that depend on the failed node
    const dependents = edges
      .filter(e => e.source === failedNodeId)
      .map(e => e.target)

    for (const depId of dependents) {
      const status = this.executionStore.getNodeStatus(depId)
      if (status === 'pending') {
        this.executionStore.setNodeStatus(depId, 'skipped')
        workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_SKIP, depId, {
          reason: 'Upstream node failed'
        })

        // Recursively skip dependents
        this.skipDependentNodes(depId)
      }
    }
  }

  /**
   * Pause execution
   */
  pauseExecution() {
    this.initStores()
    this.executionStore.pauseExecution()
    workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_PAUSED, {
      executionId: this.executionStore.executionId
    })
  }

  /**
   * Resume execution
   */
  resumeExecution() {
    this.initStores()
    this.executionStore.resumeExecution()
    workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_RESUMED, {
      executionId: this.executionStore.executionId
    })
  }

  /**
   * Stop execution
   */
  stopExecution() {
    this.initStores()
    if (this.abortController) {
      this.abortController.abort()
    }
    this.executionStore.stopExecution()
    workflowEventBus.emit(WORKFLOW_EVENTS.WORKFLOW_STOPPED, {
      executionId: this.executionStore.executionId
    })
  }

  /**
   * Get current execution state
   * @returns {Object}
   */
  getExecutionState() {
    this.initStores()
    return {
      isExecuting: this.executionStore.isExecuting,
      isPaused: this.executionStore.isPaused,
      progress: this.executionStore.progress,
      executionId: this.executionStore.executionId,
      duration: this.executionStore.executionDuration
    }
  }

  /**
   * Retry failed nodes
   * @returns {Promise<Object>}
   */
  async retryFailedNodes() {
    this.initStores()

    const failedIds = this.executionStore.failedNodeIds
    if (failedIds.length === 0) {
      return { success: true, message: 'No failed nodes to retry' }
    }

    // Reset failed nodes to pending
    for (const nodeId of failedIds) {
      this.executionStore.setNodeStatus(nodeId, 'pending')
    }

    // Re-run execution for just those nodes
    // This is a simplified retry - for complex cases may need full re-execution
    for (const nodeId of failedIds) {
      if (!this.executionStore.isExecuting) break

      try {
        await this.executeNode(nodeId, this.options.nodeTimeout)
      } catch (error) {
        console.error(`Retry failed for node ${nodeId}:`, error)
      }
    }

    return {
      success: !this.executionStore.hasErrors,
      retriedCount: failedIds.length
    }
  }

  // Utility methods

  /**
   * Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
const workflowExecutor = new WorkflowExecutor()
export default workflowExecutor

// Export class for testing
export { WorkflowExecutor, shouldExecuteNode, checkNodeInputs }
