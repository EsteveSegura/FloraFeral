import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFlowStore = defineStore('flow', () => {
  // State
  const nodes = ref([])
  const edges = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  // Bumped by every flow import. Loading a flow replaces the whole canvas, and
  // the history drops what it had rather than offering to undo back past it.
  // A counter on the store is what lets all three import routes - the menu, a
  // dropped .json and the intro modal - signal that with one line each
  const importToken = ref(0)

  // Actions
  const reset = () => {
    nodes.value = []
    edges.value = []
    error.value = null
    isLoading.value = false
  }

  const setLoading = (loading) => {
    isLoading.value = loading
  }

  const setError = (err) => {
    error.value = err
  }

  const clearError = () => {
    error.value = null
  }

  const markImported = () => {
    importToken.value += 1
  }

  return {
    nodes,
    edges,
    isLoading,
    error,
    importToken,
    reset,
    markImported,
    setLoading,
    setError,
    clearError
  }
})
