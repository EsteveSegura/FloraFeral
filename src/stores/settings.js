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

  // API Keys Settings
  const replicateApiKey = ref(persisted.replicateApiKey ?? '')
  const openaiApiKey = ref(persisted.openaiApiKey ?? '')

  // Watch for changes and persist to localStorage
  watch(
    () => ({
      showNodeHeaders: showNodeHeaders.value,
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

  // API Keys Actions
  function setReplicateApiKey(key) {
    replicateApiKey.value = key
  }

  function setOpenaiApiKey(key) {
    openaiApiKey.value = key
  }

  /**
   * Get Replicate API key (prioritize store over env)
   */
  function getReplicateApiKey() {
    if (replicateApiKey.value) {
      return replicateApiKey.value
    }
    // Fallback to environment variable
    if (import.meta.env.VITE_REPLICATE_API_TOKEN) {
      return import.meta.env.VITE_REPLICATE_API_TOKEN
    }
    return null
  }

  /**
   * Get OpenAI API key (prioritize store over env)
   */
  function getOpenaiApiKey() {
    if (openaiApiKey.value) {
      return openaiApiKey.value
    }
    // Fallback to environment variable
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      return import.meta.env.VITE_OPENAI_API_KEY
    }
    return null
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
    replicateApiKey,
    openaiApiKey,

    // Actions
    toggleNodeHeaders,
    setNodeHeaders,
    setReplicateApiKey,
    setOpenaiApiKey,
    getReplicateApiKey,
    getOpenaiApiKey,
    clearApiKeys
  }
})
