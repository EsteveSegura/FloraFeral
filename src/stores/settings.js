/**
 * Settings Store
 * Manages application-wide settings and preferences
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'flora-settings'

/**
 * Load settings from localStorage
 */
function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error loading settings from localStorage:', error)
    return {}
  }
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving settings to localStorage:', error)
  }
}

export const useSettingsStore = defineStore('settings', () => {
  // Load persisted settings
  const persisted = loadSettings()

  // UI Settings
  const showNodeHeaders = ref(persisted.showNodeHeaders ?? false)
  const skipSaveDialog = ref(persisted.skipSaveDialog ?? false)

  // Shape of the edges between nodes. 'default' is VueFlow's bezier curve
  const edgeType = ref(persisted.edgeType ?? 'default')

  // Beta features, hidden until the user opts in
  const betaAutoLayout = ref(persisted.betaAutoLayout ?? false)

  // Off by default: a group is usually arranged the way its author wanted, and
  // the auto layout only moves the box around
  const autoLayoutGroupContents = ref(persisted.autoLayoutGroupContents ?? false)

  // API Keys Settings
  const replicateApiKey = ref(persisted.replicateApiKey ?? '')
  const openaiApiKey = ref(persisted.openaiApiKey ?? '')

  // Watch for changes and persist to localStorage
  watch(
    () => ({
      showNodeHeaders: showNodeHeaders.value,
      skipSaveDialog: skipSaveDialog.value,
      edgeType: edgeType.value,
      betaAutoLayout: betaAutoLayout.value,
      autoLayoutGroupContents: autoLayoutGroupContents.value,
      replicateApiKey: replicateApiKey.value,
      openaiApiKey: openaiApiKey.value
    }),
    (settings) => {
      saveSettings(settings)
    },
    { deep: true }
  )

  // UI Actions
  function toggleNodeHeaders() {
    showNodeHeaders.value = !showNodeHeaders.value
  }

  function setNodeHeaders(value) {
    showNodeHeaders.value = value
  }

  function setSkipSaveDialog(value) {
    skipSaveDialog.value = value
  }

  function setEdgeType(value) {
    edgeType.value = value
  }

  function setBetaAutoLayout(value) {
    betaAutoLayout.value = value
  }

  function setAutoLayoutGroupContents(value) {
    autoLayoutGroupContents.value = value
  }

  // API Keys Actions
  function setReplicateApiKey(key) {
    replicateApiKey.value = key
  }

  function setOpenaiApiKey(key) {
    openaiApiKey.value = key
  }

  /**
   * Get Replicate API key from settings
   */
  function getReplicateApiKey() {
    return replicateApiKey.value || null
  }

  /**
   * Get OpenAI API key from settings
   */
  function getOpenaiApiKey() {
    return openaiApiKey.value || null
  }

  /**
   * Clear all API keys
   */
  function clearApiKeys() {
    replicateApiKey.value = ''
    openaiApiKey.value = ''
  }

  return {
    // State
    showNodeHeaders,
    skipSaveDialog,
    edgeType,
    betaAutoLayout,
    autoLayoutGroupContents,
    replicateApiKey,
    openaiApiKey,

    // Actions
    toggleNodeHeaders,
    setNodeHeaders,
    setSkipSaveDialog,
    setEdgeType,
    setBetaAutoLayout,
    setAutoLayoutGroupContents,
    setReplicateApiKey,
    setOpenaiApiKey,
    getReplicateApiKey,
    getOpenaiApiKey,
    clearApiKeys
  }
})
