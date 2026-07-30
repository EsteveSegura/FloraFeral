/**
 * Batch Store
 * Holds the state of the Batch Run panel: the table rows, their inputs/outputs
 * and the progress of the sequential execution
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Status of an individual run
 * @typedef {'pending' | 'running' | 'done' | 'error'} RunStatus
 */

export const useBatchStore = defineStore('batch', () => {
  // Panel state
  const isOpen = ref(false)

  // Execution state
  const isRunning = ref(false)
  const currentRunIndex = ref(-1)
  const cancelRequested = ref(false)

  // Table rows: { id, inputs: { nodeId: value }, outputs: { nodeId: {kind, value} }, status, error }
  const runs = ref([])

  // True while there are generated results that have not been downloaded yet
  const hasUnsavedResults = ref(false)

  // Computed: how many runs produced at least one output
  const completedCount = computed(() =>
    runs.value.filter(run => run.status === 'done').length
  )

  const failedCount = computed(() =>
    runs.value.filter(run => run.status === 'error').length
  )

  const hasResults = computed(() =>
    runs.value.some(run => Object.values(run.outputs || {}).some(output => output?.value))
  )

  /**
   * Replace the whole set of runs
   * @param {Array} newRuns
   */
  function setRuns(newRuns) {
    runs.value = newRuns
  }

  /**
   * Update a single run in place
   * @param {number} index
   * @param {Object} patch
   */
  function updateRun(index, patch) {
    const run = runs.value[index]
    if (run) {
      Object.assign(run, patch)
    }
  }

  /**
   * Mark the batch as started
   */
  function startBatch() {
    isRunning.value = true
    cancelRequested.value = false
    currentRunIndex.value = -1
  }

  /**
   * Mark the batch as finished
   */
  function finishBatch() {
    isRunning.value = false
    currentRunIndex.value = -1
  }

  /**
   * Request cancellation of the running batch
   */
  function requestCancel() {
    cancelRequested.value = true
  }

  /**
   * Clear every result while keeping the inputs the user typed
   */
  function clearResults() {
    for (const run of runs.value) {
      run.outputs = {}
      run.status = 'pending'
      run.error = null
    }
    hasUnsavedResults.value = false
  }

  /**
   * Reset the store to its initial state
   */
  function reset() {
    isRunning.value = false
    currentRunIndex.value = -1
    cancelRequested.value = false
    runs.value = []
    hasUnsavedResults.value = false
  }

  return {
    // State
    isOpen,
    isRunning,
    currentRunIndex,
    cancelRequested,
    runs,
    hasUnsavedResults,

    // Computed
    completedCount,
    failedCount,
    hasResults,

    // Actions
    setRuns,
    updateRun,
    startBatch,
    finishBatch,
    requestCancel,
    clearResults,
    reset
  }
})
