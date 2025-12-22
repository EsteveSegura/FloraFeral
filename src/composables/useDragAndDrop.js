/**
 * Composable for Drag & Drop operations
 * Handles dragging nodes from sidebar and dropping them on canvas
 * Also handles dropping image files to create image nodes
 * Also handles dropping JSON files to load flows
 */

import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import { loadFlowFromFile } from '@/lib/flow-io'

export function useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore, vueFlowHelpers = {}) {
  let draggedNodeType = null
  let isDragging = false

  /**
   * Handle drag start from sidebar
   */
  function onDragStart(event, nodeType) {
    draggedNodeType = nodeType
    isDragging = true
    event.dataTransfer.effectAllowed = 'move'
  }

  /**
   * Create node at viewport center when clicking (not dragging)
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

      // Calculate center of viewport in canvas coordinates
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const position = {
        x: (centerX - viewport.value.x) / viewport.value.zoom - 75, // Center node (width ~150px)
        y: (centerY - viewport.value.y) / viewport.value.zoom - 50   // Center node (height ~100px)
      }

      createNodeAtPosition(nodeType, position)
      isNodesMenuOpen.value = false
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
          label: 'Image',
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
    const position = {
      x: (event.clientX - rect.left - viewport.value.x) / viewport.value.zoom - 75, // Center node (width ~150px)
      y: (event.clientY - rect.top - viewport.value.y) / viewport.value.zoom - 50   // Center node (height ~100px)
    }

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
  }

  return {
    onDragStart,
    onNodeItemClick,
    onDrop
  }
}
