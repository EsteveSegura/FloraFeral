/**
 * Composable for Context Menu on right-click
 * Shows NodesSidebar at cursor position when right-clicking on empty canvas
 */

import { ref } from 'vue'

const MENU_WIDTH = 210
const MENU_HEIGHT = 400
const EDGE_MARGIN = 20

export function useContextMenu(isNodesMenuOpen) {
  const menuPosition = ref(null)

  /**
   * Calculate position that keeps menu within window boundaries
   */
  function calculateBoundedPosition(x, y, containerRect) {
    let posX = x
    let posY = y

    // Right edge
    if (x + MENU_WIDTH + EDGE_MARGIN > containerRect.width) {
      posX = containerRect.width - MENU_WIDTH - EDGE_MARGIN
    }
    // Bottom edge
    if (y + MENU_HEIGHT + EDGE_MARGIN > containerRect.height) {
      posY = containerRect.height - MENU_HEIGHT - EDGE_MARGIN
    }
    // Left edge
    if (posX < EDGE_MARGIN) posX = EDGE_MARGIN
    // Top edge
    if (posY < EDGE_MARGIN) posY = EDGE_MARGIN

    return { x: posX, y: posY }
  }

  /**
   * Handle right-click on empty canvas to show context menu
   */
  function handlePaneContextMenu(event) {
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (!canvasWrapper) return

    const rect = canvasWrapper.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    menuPosition.value = calculateBoundedPosition(clickX, clickY, rect)
    isNodesMenuOpen.value = true
  }

  /**
   * Reset menu position (for sidebar mode)
   */
  function resetMenuPosition() {
    menuPosition.value = null
  }

  /**
   * Close menu and reset position
   */
  function closeMenu() {
    isNodesMenuOpen.value = false
    menuPosition.value = null
  }

  return {
    menuPosition,
    handlePaneContextMenu,
    resetMenuPosition,
    closeMenu
  }
}
