/**
 * Composable for Flow Import/Export operations
 * Handles loading and saving flow JSON files
 */

import { ref } from 'vue'
import { downloadFlow, loadFlowFromFile } from '@/lib/flow-io'

export function useFlowIO(flowStore, { addEdges }) {
  const fileInput = ref(null)

  /**
   * Generate default filename for export
   */
  function getDefaultFilename() {
    return `flow-${Date.now()}.json`
  }

  /**
   * Export current flow to JSON file
   * @param {string} filename - Optional filename for the export
   */
  function handleExport(filename) {
    try {
      downloadFlow(flowStore, filename)
      console.log('Flow exported successfully')
    } catch (error) {
      console.error('Error exporting flow:', error)
      flowStore.setError('Failed to export flow')
    }
  }

  /**
   * Trigger file input for import
   */
  function handleImport() {
    fileInput.value?.click()
  }

  /**
   * Handle file selection and import
   */
  async function onFileSelected(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = await loadFlowFromFile(file, flowStore, { addEdges })

      if (result.success) {
        console.log('Flow imported successfully')
        // Clear file input for next import
        if (fileInput.value) {
          fileInput.value.value = ''
        }
      } else {
        console.error('Import failed:', result.error)
        flowStore.setError(result.error || 'Failed to import flow')
        setTimeout(() => flowStore.clearError(), 5000)
      }
    } catch (error) {
      console.error('Error importing flow:', error)
      flowStore.setError('Failed to import flow')
      setTimeout(() => flowStore.clearError(), 5000)
    }
  }

  return {
    fileInput,
    handleExport,
    handleImport,
    onFileSelected,
    getDefaultFilename
  }
}
