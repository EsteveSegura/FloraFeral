/**
 * Workflow Execution Store
 * Manages the state of workflow execution including node statuses, progress, and errors
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Execution status for individual nodes
 * @typedef {'idle' | 'pending' | 'executing' | 'completed' | 'error' | 'skipped'} ExecutionStatus
 */

export const useWorkflowExecutionStore = defineStore('workflowExecution', () => {
  // Core execution state
  const isExecuting = ref(false)
  const isPaused = ref(false)
  const wasStopped = ref(false) // Track if execution was stopped (error or manual)
  const executionId = ref(null)
  const startTime = ref(null)
  const endTime = ref(null)

  // Node execution states: nodeId -> ExecutionStatus
  const nodeStates = ref(new Map())

  // Node errors: nodeId -> Error object or message
  const nodeErrors = ref(new Map())

  // Execution queue (ordered array of node IDs or levels)
  const executionQueue = ref([])

  // Current execution level index
  const currentLevelIndex = ref(0)

  // Computed progress
  const progress = computed(() => {
    const states = nodeStates.value
    let total = 0
    let pending = 0
    let executing = 0
    let completed = 0
    let error = 0
    let skipped = 0

    for (const status of states.values()) {
      total++
      switch (status) {
        case 'pending':
          pending++
          break
        case 'executing':
          executing++
          break
        case 'completed':
          completed++
          break
        case 'error':
          error++
          break
        case 'skipped':
          skipped++
          break
      }
    }

    const processed = completed + error + skipped
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0

    return {
      total,
      pending,
      executing,
      completed,
      error,
      skipped,
      percentage
    }
  })

  // Computed: is execution complete?
  const isComplete = computed(() => {
    if (!isExecuting.value) return false
    const { pending, executing } = progress.value
    return pending === 0 && executing === 0
  })

  // Computed: has any errors?
  const hasErrors = computed(() => {
    return progress.value.error > 0
  })

  // Computed: get failed node IDs
  const failedNodeIds = computed(() => {
    const failed = []
    for (const [nodeId, status] of nodeStates.value) {
      if (status === 'error') {
        failed.push(nodeId)
      }
    }
    return failed
  })

  // Computed: execution duration in seconds
  const executionDuration = computed(() => {
    if (!startTime.value) return 0
    const end = endTime.value || Date.now()
    return Math.round((end - startTime.value) / 1000)
  })

  // Actions

  /**
   * Initialize execution with a list of node IDs
   * @param {Array<Array<string>>} levels - Execution levels from topological sort
   */
  function initializeExecution(levels) {
    // Generate unique execution ID
    executionId.value = `exec-${Date.now()}`
    startTime.value = Date.now()
    endTime.value = null
    isExecuting.value = true
    isPaused.value = false
    executionQueue.value = levels
    currentLevelIndex.value = 0

    // Initialize all nodes as pending
    nodeStates.value = new Map()
    nodeErrors.value = new Map()

    for (const level of levels) {
      for (const nodeId of level) {
        nodeStates.value.set(nodeId, 'pending')
      }
    }
  }

  /**
   * Set a node's execution status
   * @param {string} nodeId
   * @param {ExecutionStatus} status
   */
  function setNodeStatus(nodeId, status) {
    nodeStates.value.set(nodeId, status)
    // Trigger reactivity
    nodeStates.value = new Map(nodeStates.value)
  }

  /**
   * Set a node error
   * @param {string} nodeId
   * @param {Error|string} error
   */
  function setNodeError(nodeId, error) {
    const errorMessage = error instanceof Error ? error.message : error
    nodeErrors.value.set(nodeId, errorMessage)
    setNodeStatus(nodeId, 'error')
    // Trigger reactivity
    nodeErrors.value = new Map(nodeErrors.value)
  }

  /**
   * Get error for a specific node
   * @param {string} nodeId
   * @returns {string|null}
   */
  function getNodeError(nodeId) {
    return nodeErrors.value.get(nodeId) || null
  }

  /**
   * Get status for a specific node
   * @param {string} nodeId
   * @returns {ExecutionStatus}
   */
  function getNodeStatus(nodeId) {
    return nodeStates.value.get(nodeId) || 'idle'
  }

  /**
   * Pause execution
   */
  function pauseExecution() {
    if (isExecuting.value && !isPaused.value) {
      isPaused.value = true
    }
  }

  /**
   * Resume execution
   */
  function resumeExecution() {
    if (isExecuting.value && isPaused.value) {
      isPaused.value = false
    }
  }

  /**
   * Stop execution completely
   */
  function stopExecution() {
    if (isExecuting.value) {
      isExecuting.value = false
      isPaused.value = false
      wasStopped.value = true
      endTime.value = Date.now()

      // Mark remaining pending nodes as skipped
      for (const [nodeId, status] of nodeStates.value) {
        if (status === 'pending' || status === 'executing') {
          setNodeStatus(nodeId, 'skipped')
        }
      }
    }
  }

  /**
   * Complete execution successfully
   */
  function completeExecution() {
    isExecuting.value = false
    isPaused.value = false
    endTime.value = Date.now()
  }

  /**
   * Reset execution state (clear all)
   */
  function resetExecution() {
    isExecuting.value = false
    isPaused.value = false
    wasStopped.value = false
    executionId.value = null
    startTime.value = null
    endTime.value = null
    nodeStates.value = new Map()
    nodeErrors.value = new Map()
    executionQueue.value = []
    currentLevelIndex.value = 0
  }

  /**
   * Clear node states without resetting execution flags
   * Useful for re-running workflows
   */
  function clearNodeStates() {
    nodeStates.value = new Map()
    nodeErrors.value = new Map()
  }

  /**
   * Advance to next execution level
   */
  function advanceLevel() {
    currentLevelIndex.value++
  }

  /**
   * Get current level's nodes
   * @returns {Array<string>}
   */
  function getCurrentLevelNodes() {
    if (currentLevelIndex.value >= executionQueue.value.length) {
      return []
    }
    return executionQueue.value[currentLevelIndex.value] || []
  }

  /**
   * Check if there are more levels to execute
   * @returns {boolean}
   */
  function hasMoreLevels() {
    return currentLevelIndex.value < executionQueue.value.length
  }

  return {
    // State
    isExecuting,
    isPaused,
    wasStopped,
    executionId,
    startTime,
    endTime,
    nodeStates,
    nodeErrors,
    executionQueue,
    currentLevelIndex,

    // Computed
    progress,
    isComplete,
    hasErrors,
    failedNodeIds,
    executionDuration,

    // Actions
    initializeExecution,
    setNodeStatus,
    setNodeError,
    getNodeError,
    getNodeStatus,
    pauseExecution,
    resumeExecution,
    stopExecution,
    completeExecution,
    resetExecution,
    clearNodeStates,
    advanceLevel,
    getCurrentLevelNodes,
    hasMoreLevels
  }
})
