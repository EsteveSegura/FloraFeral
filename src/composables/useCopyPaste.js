/**
 * Composable for Copy/Paste operations
 * Handles copying and pasting nodes
 */

import { ref } from 'vue'
import { createNode, getNodeIOConfig } from '@/lib/node-shapes'

export function useCopyPaste(flowStore, viewport, mousePosition) {
  const copiedNode = ref(null)

  /**
   * Copy selected node
   */
  function handleCopy() {
    const selectedNode = flowStore.nodes.find(n => n.selected)
    if (selectedNode) {
      // Create a deep copy immediately to capture current state
      copiedNode.value = {
        ...selectedNode,
        data: JSON.parse(JSON.stringify(selectedNode.data))
      }
      console.log('Node copied:', selectedNode.type, 'with data:', copiedNode.value.data)
    }
  }

  /**
   * Paste copied node at mouse position
   */
  function handlePaste() {
    if (!copiedNode.value) return

    // Calculate position at mouse, accounting for zoom and pan
    const position = {
      x: (mousePosition.value.x - viewport.value.x) / viewport.value.zoom,
      y: (mousePosition.value.y - viewport.value.y) / viewport.value.zoom
    }

    // Get IO configuration for this node type
    const ioConfig = getNodeIOConfig(copiedNode.value.type)

    // Use already cloned data from handleCopy
    const clonedData = JSON.parse(JSON.stringify(copiedNode.value.data))

    // Update label to indicate it's a copy
    if (clonedData.label) {
      clonedData.label = `${clonedData.label}`
    }

    // Create new node with same type and data
    const newNode = createNode(
      `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      copiedNode.value.type,
      position,
      clonedData,
      ioConfig
    )

    // Add to store
    flowStore.nodes.push(newNode)
    console.log('Node pasted:', newNode.type, 'with data:', clonedData)
  }

  return {
    copiedNode,
    handleCopy,
    handlePaste
  }
}
