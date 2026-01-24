/**
 * useWorkflowEvents Composable
 * Hook for node components to listen for and respond to workflow execution events
 */

import { onMounted, onUnmounted, computed } from 'vue'
import workflowEventBus, { WORKFLOW_EVENTS } from '@/lib/workflow-events'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import { storeToRefs } from 'pinia'

/**
 * Composable for nodes to participate in workflow execution
 * @param {string} nodeId - The node's ID
 * @returns {Object} - Methods and state for workflow participation
 */
export function useWorkflowEvents(nodeId) {
  const store = useWorkflowExecutionStore()
  const { isExecuting, nodeStates } = storeToRefs(store)

  // Store cleanup functions
  const cleanupFns = []

  // Execution handler set by the node
  let executionHandler = null

  /**
   * Register a handler for when this node should execute
   * The handler should return a Promise that resolves when execution is complete
   * @param {Function} handler - Async function that performs the node's execution
   */
  function onExecutionRequested(handler) {
    executionHandler = handler

    console.log(`[useWorkflowEvents] Registering execution handler for node ${nodeId}`)

    // Subscribe to execute events for this node
    const unsub = workflowEventBus.onNode(
      WORKFLOW_EVENTS.NODE_EXECUTE,
      nodeId,
      async () => {
        console.log(`[useWorkflowEvents] Execution requested for node ${nodeId}`)

        if (!executionHandler) {
          // No handler registered, emit error
          console.error(`[useWorkflowEvents] No execution handler for node ${nodeId}`)
          workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_ERROR, nodeId, {
            error: 'No execution handler registered for this node'
          })
          return
        }

        try {
          console.log(`[useWorkflowEvents] Calling handler for node ${nodeId}`)
          // Execute the handler
          const result = await executionHandler()

          console.log(`[useWorkflowEvents] Handler completed for node ${nodeId}`)
          // Emit completion
          workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_COMPLETE, nodeId, {
            result
          })
        } catch (error) {
          console.error(`[useWorkflowEvents] Handler failed for node ${nodeId}:`, error)
          // Emit error
          workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_ERROR, nodeId, {
            error: error.message || 'Execution failed'
          })
        }
      }
    )

    cleanupFns.push(unsub)
    return unsub
  }

  /**
   * Manually signal that execution started (for custom execution flows)
   */
  function signalExecutionStart() {
    workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_START, nodeId)
  }

  /**
   * Manually signal that execution completed successfully
   * @param {*} result - Execution result
   */
  function signalExecutionComplete(result) {
    workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_COMPLETE, nodeId, { result })
  }

  /**
   * Manually signal that execution failed
   * @param {Error|string} error - Error information
   */
  function signalExecutionError(error) {
    const errorMessage = error instanceof Error ? error.message : error
    workflowEventBus.emitNodeEvent(WORKFLOW_EVENTS.NODE_ERROR, nodeId, {
      error: errorMessage
    })
  }

  // Computed: current execution status for this node
  const executionStatus = computed(() => {
    return store.getNodeStatus(nodeId)
  })

  // Computed: is this node currently executing?
  const isNodeExecuting = computed(() => {
    return executionStatus.value === 'executing'
  })

  // Computed: is this node pending execution?
  const isNodePending = computed(() => {
    return executionStatus.value === 'pending'
  })

  // Computed: has this node completed?
  const isNodeCompleted = computed(() => {
    return executionStatus.value === 'completed'
  })

  // Computed: has this node errored?
  const isNodeError = computed(() => {
    return executionStatus.value === 'error'
  })

  // Computed: was this node skipped?
  const isNodeSkipped = computed(() => {
    return executionStatus.value === 'skipped'
  })

  // Computed: get error message for this node
  const nodeError = computed(() => {
    return store.getNodeError(nodeId)
  })

  // Computed: is workflow currently running?
  const isWorkflowRunning = computed(() => {
    return isExecuting.value
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupFns.forEach(fn => fn())
    executionHandler = null
  })

  return {
    // Registration
    onExecutionRequested,

    // Manual signaling
    signalExecutionStart,
    signalExecutionComplete,
    signalExecutionError,

    // State (computed refs)
    executionStatus,
    isNodeExecuting,
    isNodePending,
    isNodeCompleted,
    isNodeError,
    isNodeSkipped,
    nodeError,
    isWorkflowRunning
  }
}
