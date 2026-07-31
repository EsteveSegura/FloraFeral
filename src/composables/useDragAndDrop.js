/**
 * Composable for Drag & Drop operations
 * Handles dragging nodes from sidebar and dropping them on canvas
 * Also handles dropping image files to create image nodes
 * Also handles dropping JSON files to load flows
 */

import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import { ensureUniqueLabel } from '@/lib/node-label'
import { loadFlowFromFile } from '@/lib/flow-io'

// Rough node size, used to drop the new node centered on the pointer
const NODE_HALF_WIDTH = 75
const NODE_HALF_HEIGHT = 50

export function useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore, vueFlowHelpers = {}, onMenuClose = null, menuOrigin = null) {
  let draggedNodeType = null
  let isDragging = false

  /**
   * Convert screen coordinates into canvas coordinates, centering the node there
   * @param {number} clientX - Screen X coordinate
   * @param {number} clientY - Screen Y coordinate
   * @param {DOMRect} rect - Canvas wrapper bounds
   */
  function toCenteredCanvasPosition(clientX, clientY, rect) {
    return {
      x: (clientX - rect.left - viewport.value.x) / viewport.value.zoom - NODE_HALF_WIDTH,
      y: (clientY - rect.top - viewport.value.y) / viewport.value.zoom - NODE_HALF_HEIGHT
    }
  }

  /**
   * Handle drag start from sidebar
   */
  function onDragStart(event, nodeType) {
    draggedNodeType = nodeType
    isDragging = true
    event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Create node when clicking (not dragging): at the point where the context menu
   * was opened, or at the viewport center when the menu was opened as a sidebar
   */
  function onNodeItemClick(nodeType) {
    // Small delay to check if drag started
    setTimeout(() => {
      if (isDragging) {
        isDragging = false
        return
      }

      // Get canvas wrapper dimensions
      const canvasWrapper = document.querySelector('.canvas-wrapper')
      if (!canvasWrapper) return

      const rect = canvasWrapper.getBoundingClientRect()

      // Right-click opens the menu at the pointer, so spawn the node there.
      // Without an origin (sidebar mode) fall back to the center of the viewport
      const origin = menuOrigin?.value ?? null
      const spawnX = origin ? origin.x : rect.left + rect.width / 2
      const spawnY = origin ? origin.y : rect.top + rect.height / 2

      createNodeAtPosition(nodeType, toCenteredCanvasPosition(spawnX, spawnY, rect))
      isNodesMenuOpen.value = false
      if (onMenuClose) onMenuClose()
    }, 100)
  }

  /**
   * Handle image file drop
   */
  function handleImageFileDrop(file, position) {
    const reader = new FileReader()
    reader.onload = (event) => {
      // Get IO configuration for image node
      const ioConfig = getNodeIOConfig(NODE_TYPES.IMAGE)

      // Create image node with the file data
      const newNode = createNode(
        `node_${Date.now()}`,
        NODE_TYPES.IMAGE,
        position,
        {
          label: ensureUniqueLabel('Image', flowStore.nodes),
          src: event.target.result,
          name: file.name
        },
        ioConfig
      )

      // Add to store
      flowStore.nodes.push(newNode)
      console.log('Image node created from file:', file.name)
    }

    reader.onerror = (error) => {
      console.error('Error reading image file:', error)
      flowStore.setError('Failed to load image file')
      setTimeout(() => flowStore.clearError(), 5000)
    }

    reader.readAsDataURL(file)
  }

  /**
   * Handle JSON flow file drop
   */
  async function handleJsonFileDrop(file) {
    try {
      const result = await loadFlowFromFile(file, flowStore, vueFlowHelpers)

      if (result.success) {
        console.log('Flow loaded from dropped file:', file.name)
      } else {
        console.error('Failed to load flow:', result.error)
        flowStore.setError(result.error || 'Failed to load flow')
        setTimeout(() => flowStore.clearError(), 5000)
      }
    } catch (error) {
      console.error('Error loading flow from dropped file:', error)
      flowStore.setError('Failed to load flow file')
      setTimeout(() => flowStore.clearError(), 5000)
    }
  }

  /**
   * Handle drop on canvas
   */
  function onDrop(event) {
    const canvasWrapper = event.currentTarget
    const rect = canvasWrapper.getBoundingClientRect()

    // Calculate position relative to canvas, accounting for zoom and pan
    const position = toCenteredCanvasPosition(event.clientX, event.clientY, rect)

    // Check if dropping a file
    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]

      // Check if it's a JSON file (flow)
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        event.preventDefault()
        handleJsonFileDrop(file)
        isNodesMenuOpen.value = false
        return
      }

      // Check if it's an image file
      if (file.type.startsWith('image/')) {
        event.preventDefault()
        handleImageFileDrop(file, position)
        isNodesMenuOpen.value = false
        return
      }
    }

    // Regular node drop
    if (!draggedNodeType) return

    // Create node at drop position
    createNodeAtPosition(draggedNodeType, position)
    draggedNodeType = null
    isDragging = false

    // Close nodes menu after dropping
    isNodesMenuOpen.value = false
    if (onMenuClose) onMenuClose()
  }

  return {
    onDragStart,
    onNodeItemClick,
    onDrop
  }
}
