/**
 * Composable for Keyboard Shortcuts
 * Handles global keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+G, Ctrl+Z, Ctrl+Y)
 * Copy and paste act on the whole selection, see useCopyPaste
 * Undo and redo cover the whole canvas, see useFlowHistory
 */

import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts({ handleCopy, handlePaste, handleGroup, undo, redo, copiedNodes, flowStore }) {
  /**
   * Handle keyboard shortcuts
   */
  function handleKeyDown(event) {
    // Check if we're in an editable field (input, textarea, contenteditable)
    const isEditableField =
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable

    // Check for Ctrl+C or Cmd+C (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      if (!isEditableField) {
        // With nothing selected let the native text copy through: handleCopy
        // flushes the clipboard so a later Ctrl+V does not paste a stale copy
        if (flowStore.nodes.some(n => n.selected)) {
          event.preventDefault()
        }
        handleCopy()
      }
    }

    // Check for Ctrl+V or Cmd+V (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      // Only paste nodes if not in editable field and the clipboard has some
      if (!isEditableField && copiedNodes.value.length > 0) {
        event.preventDefault()
        handlePaste()
      }
    }

    // Check for Ctrl+G or Cmd+G (Mac) - Group nodes
    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
      event.preventDefault()
      handleGroup()
    }

    // Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo.
    // Inside a text field the browser's own undo wins: the node adopts whatever
    // the field ends up holding, so the edit is still undoable from the canvas a
    // step later
    if ((event.ctrlKey || event.metaKey) && !isEditableField) {
      // With Shift held, `event.key` for that key is an uppercase 'Z'
      const key = event.key.toLowerCase()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
  }

  // Setup keyboard listeners
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {}
}
