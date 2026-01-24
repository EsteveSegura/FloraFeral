/**
 * useWorkflowExecution Composable
 * Vue composable that provides reactive bindings for workflow execution
 */

import { computed, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import workflowExecutor from '@/services/workflow-executor'
import workflowEventBus, { WORKFLOW_EVENTS } from '@/lib/workflow-events'

/**
 * Composable for managing workflow execution in Vue components
 * @returns {Object} - Reactive state and methods for workflow execution
 */
export function useWorkflowExecution() {
  const store = useWorkflowExecutionStore()

  // Get reactive refs from store
  const {
    isExecuting,
    isPaused,
    wasStopped,
    executionId,
    progress,
    hasErrors,
    failedNodeIds,
    executionDuration,
    nodeStates,
    nodeErrors
  } = storeToRefs(store)

  // Event listeners cleanup
  const cleanupFns = []

  /**
   * Execute the entire workflow
   * @param {Object} options - Execution options
   * @returns {Promise<Object>}
   */
  async function executeWorkflow(options = {}) {
    try {
      const result = await workflowExecutor.executeWorkflow(options)
      return result
    } catch (error) {
      console.error('[useWorkflowExecution] Execution error:', error)
      throw error
    }
  }

  /**
   * Pause execution
   */
  function pauseExecution() {
    workflowExecutor.pauseExecution()
  }

  /**
   * Resume execution
   */
  function resumeExecution() {
    workflowExecutor.resumeExecution()
  }

  /**
   * Stop execution
   */
  function stopExecution() {
    workflowExecutor.stopExecution()
  }

  /**
   * Retry failed nodes
   * @returns {Promise<Object>}
   */
  async function retryFailedNodes() {
    return workflowExecutor.retryFailedNodes()
  }

  /**
   * Reset execution state
   */
  function resetExecution() {
    store.resetExecution()
  }

  /**
   * Get status for a specific node
   * @param {string} nodeId
   * @returns {string}
   */
  function getNodeStatus(nodeId) {
    return store.getNodeStatus(nodeId)
  }

  /**
   * Get error for a specific node
   * @param {string} nodeId
   * @returns {string|null}
   */
  function getNodeError(nodeId) {
    return store.getNodeError(nodeId)
  }

  /**
   * Subscribe to workflow events
   * @param {string} event - Event name from WORKFLOW_EVENTS
   * @param {Function} callback
   * @returns {Function} - Unsubscribe function
   */
  function onWorkflowEvent(event, callback) {
    const unsub = workflowEventBus.on(event, callback)
    cleanupFns.push(unsub)
    return unsub
  }

  /**
   * Subscribe to workflow start
   * @param {Function} callback
   */
  function onWorkflowStart(callback) {
    return onWorkflowEvent(WORKFLOW_EVENTS.WORKFLOW_START, callback)
  }

  /**
   * Subscribe to workflow complete
   * @param {Function} callback
   */
  function onWorkflowComplete(callback) {
    return onWorkflowEvent(WORKFLOW_EVENTS.WORKFLOW_COMPLETE, callback)
  }

  /**
   * Subscribe to workflow error
   * @param {Function} callback
   */
  function onWorkflowError(callback) {
    return onWorkflowEvent(WORKFLOW_EVENTS.WORKFLOW_ERROR, callback)
  }

  // Computed: can execute (not currently executing)
  const canExecute = computed(() => !isExecuting.value)

  // Computed: can pause (executing and not paused)
  const canPause = computed(() => isExecuting.value && !isPaused.value)

  // Computed: can resume (executing and paused)
  const canResume = computed(() => isExecuting.value && isPaused.value)

  // Computed: can stop (currently executing)
  const canStop = computed(() => isExecuting.value)

  // Computed: can retry (has errors and not executing)
  const canRetry = computed(() => hasErrors.value && !isExecuting.value)

  // Computed: progress percentage
  const progressPercentage = computed(() => progress.value.percentage)

  // Computed: status text
  const statusText = computed(() => {
    if (!isExecuting.value && progress.value.total === 0) {
      return 'Ready'
    }

    if (isPaused.value) {
      return 'Paused'
    }

    if (isExecuting.value) {
      const { completed, total, executing } = progress.value
      return `Executing... ${completed}/${total} (${executing} running)`
    }

    // Execution finished - check if it was stopped (error or manual)
    if (wasStopped.value) {
      // If there are errors, it failed; otherwise it was manually stopped
      if (hasErrors.value) {
        return 'Failed Execution'
      }
      return 'Stopped Execution'
    }

    const { completed, total } = progress.value
    return `Completed ${completed}/${total}`
  })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupFns.forEach(fn => fn())
  })

  return {
    // State (reactive)
    isExecuting,
    isPaused,
    wasStopped,
    executionId,
    progress,
    hasErrors,
    failedNodeIds,
    executionDuration,
    nodeStates,
    nodeErrors,

    // Computed
    canExecute,
    canPause,
    canResume,
    canStop,
    canRetry,
    progressPercentage,
    statusText,

    // Actions
    executeWorkflow,
    pauseExecution,
    resumeExecution,
    stopExecution,
    retryFailedNodes,
    resetExecution,
    getNodeStatus,
    getNodeError,

    // Event subscriptions
    onWorkflowEvent,
    onWorkflowStart,
    onWorkflowComplete,
    onWorkflowError
  }
}
