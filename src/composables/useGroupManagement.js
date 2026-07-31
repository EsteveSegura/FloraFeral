/**
 * Composable for Group Management
 * Handles automatic grouping/ungrouping of nodes when dragged
 * Also handles manual grouping with Ctrl+G
 */

import { nextTick } from 'vue'
import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import { ensureUniqueLabel } from '@/lib/node-label'

export function useGroupManagement(flowStore, onNodeDragStop) {
  /**
   * Setup node drag stop handler for automatic group linking/unlinking
   */
  function setupDragStopHandler() {
    onNodeDragStop((event) => {
      const node = event.node

      // Skip group nodes themselves
      if (node.type === NODE_TYPES.GROUP) return

      if (node.parentNode) {
        // Node has a parent - check if it should be unlinked
        const parentNode = flowStore.nodes.find(n => n.id === node.parentNode)
        if (!parentNode || !parentNode.style) return

        // Get parent dimensions
        const parentWidth = parseInt(parentNode.style.width) || 0
        const parentHeight = parseInt(parentNode.style.height) || 0

        // Check if node is outside parent bounds (with some tolerance)
        const tolerance = 50 // Allow 50px outside before unlinking
        if (
          node.position.x < -tolerance ||
          node.position.y < -tolerance ||
          node.position.x > parentWidth + tolerance ||
          node.position.y > parentHeight + tolerance
        ) {
          // Node is outside parent, unlink it
          console.log(`Unlinking node ${node.id} from parent ${node.parentNode}`)

          // Convert position to absolute (parent position + relative position)
          node.position = {
            x: parentNode.position.x + node.position.x,
            y: parentNode.position.y + node.position.y
          }

          // Remove parent relationship
          delete node.parentNode
          if (node.extent) delete node.extent
        }
      } else {
        // Node has no parent - check if it should be linked to a group
        const groups = flowStore.nodes.filter(n => n.type === NODE_TYPES.GROUP && n.id !== node.id)

        for (const group of groups) {
          if (!group.style) continue

          // Get group dimensions and position
          const groupX = group.position.x
          const groupY = group.position.y
          const groupWidth = parseInt(group.style.width) || 0
          const groupHeight = parseInt(group.style.height) || 0

          // Check if node center is inside group
          const nodeWidth = node.dimensions?.width || 200
          const nodeHeight = node.dimensions?.height || 150
          const nodeCenterX = node.position.x + nodeWidth / 2
          const nodeCenterY = node.position.y + nodeHeight / 2

          if (
            nodeCenterX >= groupX &&
            nodeCenterX <= groupX + groupWidth &&
            nodeCenterY >= groupY &&
            nodeCenterY <= groupY + groupHeight
          ) {
            // Node is inside group, link it
            console.log(`Linking node ${node.id} to parent ${group.id}`)

            // Convert position to relative (node position - parent position)
            node.position = {
              x: node.position.x - groupX,
              y: node.position.y - groupY
            }

            // Set parent relationship
            node.parentNode = group.id

            break // Only link to first matching group
          }
        }
      }
    })
  }

  /**
   * Group selected nodes with Ctrl+G
   */
  async function handleGroup() {
    const selectedNodes = flowStore.nodes.filter(n => n.selected)

    if (selectedNodes.length < 2) {
      console.log('Need at least 2 nodes to create a group')
      return
    }

    // Check if any selected node is already in a group (prevent nested groups)
    const hasNodeInGroup = selectedNodes.some(node => node.parentNode)
    if (hasNodeInGroup) {
      console.log('Cannot create nested groups - one or more nodes are already in a group')
      flowStore.setError('Cannot create nested groups')
      setTimeout(() => flowStore.clearError(), 3000)
      return
    }

    // Calculate bounding box of all selected nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    selectedNodes.forEach(node => {
      minX = Math.min(minX, node.position.x)
      minY = Math.min(minY, node.position.y)
      // Use actual dimensions if available, otherwise estimate
      const nodeWidth = node.dimensions?.width || node.width || 250
      const nodeHeight = node.dimensions?.height || node.height || 200
      maxX = Math.max(maxX, node.position.x + nodeWidth)
      maxY = Math.max(maxY, node.position.y + nodeHeight)
    })

    // Add padding around the group
    const padding = 40
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const groupWidth = maxX - minX
    const groupHeight = maxY - minY

    // Create parent group node
    const parentId = `group_${Date.now()}`
    const ioConfig = getNodeIOConfig(NODE_TYPES.GROUP)

    const parentNode = createNode(
      parentId,
      NODE_TYPES.GROUP,
      { x: minX, y: minY },
      { label: ensureUniqueLabel('Group', flowStore.nodes) },
      ioConfig
    )

    // Set style for the group container
    parentNode.style = {
      backgroundColor: 'rgba(128, 128, 128, 0.2)',
      width: `${groupWidth}px`,
      height: `${groupHeight}px`,
      border: '2px solid rgba(128, 128, 128, 0.5)'
    }

    // Add parent node to store first
    flowStore.nodes.push(parentNode)

    // Wait for Vue to process the parent node
    await nextTick()

    // Now update all selected nodes to be children
    selectedNodes.forEach(node => {
      node.parentNode = parentId
      // Don't use extent to allow dragging nodes out of the group
      // Adjust position to be relative to parent
      node.position = {
        x: node.position.x - minX,
        y: node.position.y - minY
      }
      node.selected = false
    })

    console.log(`Grouped ${selectedNodes.length} nodes into group ${parentId}`)
  }

  // Initialize drag stop handler
  setupDragStopHandler()

  return {
    handleGroup
  }
}
