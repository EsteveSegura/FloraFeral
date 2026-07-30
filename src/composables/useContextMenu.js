/**
 * Composable for Context Menu on right-click
 * Shows NodesSidebar at cursor position when right-clicking on empty canvas,
 * and NodeContextMenu when right-clicking on a node
 */

import { ref } from 'vue'

const MENU_WIDTH = 210
const MENU_HEIGHT = 400
const EDGE_MARGIN = 20

// The node menu is a short list, so it needs far less vertical room
const NODE_MENU_HEIGHT = 160

export function useContextMenu(isNodesMenuOpen) {
  const menuPosition = ref(null)
  const nodeMenuPosition = ref(null)
  const contextNode = ref(null)

  /**
   * Calculate position that keeps menu within window boundaries
   */
  function calculateBoundedPosition(x, y, containerRect, menuHeight = MENU_HEIGHT) {
    let posX = x
    let posY = y

    // Right edge
    if (x + MENU_WIDTH + EDGE_MARGIN > containerRect.width) {
      posX = containerRect.width - MENU_WIDTH - EDGE_MARGIN
    }
    // Bottom edge
    if (y + menuHeight + EDGE_MARGIN > containerRect.height) {
      posY = containerRect.height - menuHeight - EDGE_MARGIN
    }
    // Left edge
    if (posX < EDGE_MARGIN) posX = EDGE_MARGIN
    // Top edge
    if (posY < EDGE_MARGIN) posY = EDGE_MARGIN

    return { x: posX, y: posY }
  }

  /**
   * Open the nodes menu at a given screen position, bounded to the window
   * @param {number} clientX - Screen X coordinate
   * @param {number} clientY - Screen Y coordinate
   */
  function openNodesMenuAt(clientX, clientY) {
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (!canvasWrapper) return

    const rect = canvasWrapper.getBoundingClientRect()
    const posX = clientX - rect.left
    const posY = clientY - rect.top

    menuPosition.value = calculateBoundedPosition(posX, posY, rect)
    closeNodeMenu()
    isNodesMenuOpen.value = true
  }

  /**
   * Handle right-click on empty canvas to show context menu
   */
  function handlePaneContextMenu(event) {
    openNodesMenuAt(event.clientX, event.clientY)
  }

  /**
   * Handle right-click on a node to show its context menu
   * @param {Object} payload - VueFlow payload { event, node }
   */
  function handleNodeContextMenu({ event, node }) {
    const canvasWrapper = document.querySelector('.canvas-wrapper')
    if (!canvasWrapper) return

    event.preventDefault()

    const rect = canvasWrapper.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top

    nodeMenuPosition.value = calculateBoundedPosition(clickX, clickY, rect, NODE_MENU_HEIGHT)
    contextNode.value = node

    // Only one menu at a time
    isNodesMenuOpen.value = false
    menuPosition.value = null
  }

  /**
   * Reset menu position (for sidebar mode)
   */
  function resetMenuPosition() {
    menuPosition.value = null
  }

  /**
   * Close the node context menu
   */
  function closeNodeMenu() {
    nodeMenuPosition.value = null
    contextNode.value = null
  }

  /**
   * Close menu and reset position
   */
  function closeMenu() {
    isNodesMenuOpen.value = false
    menuPosition.value = null
    closeNodeMenu()
  }

  return {
    menuPosition,
    nodeMenuPosition,
    contextNode,
    openNodesMenuAt,
    handlePaneContextMenu,
    handleNodeContextMenu,
    resetMenuPosition,
    closeNodeMenu,
    closeMenu
  }
}
