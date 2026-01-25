/**
 * useWorkflowExecution Composable
 * Vue composable that provides reactive bindings for workflow execution
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import workflowExecutor from '@/services/workflow-executor'

/**
 * Composable for managing workflow execution in Vue components
 * @returns {Object} - Reactive state and methods for workflow execution
 */
export function useWorkflowExecution() {
  const store = useWorkflowExecutionStore()

  // Get reactive refs from store
  const {
    isExecuting,
    wasStopped,
    executionId,
    progress,
    hasErrors,
    executionDuration,
    nodeStates,
    nodeErrors
  } = storeToRefs(store)

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
   * Stop execution
   */
  function stopExecution() {
    workflowExecutor.stopExecution()
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

  // Computed: can execute (not currently executing)
  const canExecute = computed(() => !isExecuting.value)

  // Computed: can stop (currently executing)
  const canStop = computed(() => isExecuting.value)

  // Computed: progress percentage
  const progressPercentage = computed(() => progress.value.percentage)

  // Computed: status text
  const statusText = computed(() => {
    if (!isExecuting.value && progress.value.total === 0) {
      return 'Ready'
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

  return {
    // State (reactive)
    isExecuting,
    wasStopped,
    executionId,
    progress,
    hasErrors,
    executionDuration,
    nodeStates,
    nodeErrors,

    // Computed
    canExecute,
    canStop,
    progressPercentage,
    statusText,

    // Actions
    executeWorkflow,
    stopExecution,
    resetExecution,
    getNodeStatus,
    getNodeError
  }
}
