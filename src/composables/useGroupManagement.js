/**
 * Composable for Group Management
 * Handles automatic grouping/ungrouping of nodes when dragged
 * Also handles manual grouping with Ctrl+G
 */

import { nextTick } from 'vue'
import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import { ensureUniqueLabel } from '@/lib/node-label'
import {
  attachNodeToGroup,
  detachNodeFromGroup,
  getNodeSize,
  isCenterInsideGroup,
  syncGroupMembership,
  toAbsolutePosition
} from '@/lib/group-membership'

export function useGroupManagement(flowStore, onNodeDragStop) {
  /**
   * Setup node drag stop handler for automatic group linking/unlinking
   */
  function setupDragStopHandler() {
    onNodeDragStop((event) => {
      const node = event.node

      // A moved group keeps its children, but it may have been dropped over
      // free nodes that now sit inside it
      if (node.type === NODE_TYPES.GROUP) {
        syncGroupMembership(node, flowStore.nodes)
        return
      }

      if (node.parentNode) {
        // Node has a parent - unlink it once its center leaves the group
        const parentNode = flowStore.nodes.find(n => n.id === node.parentNode)
        if (!parentNode) return

        if (!isCenterInsideGroup(toAbsolutePosition(node, parentNode), node, parentNode)) {
          detachNodeFromGroup(node, parentNode)
        }
      } else {
        // Node has no parent - link it to the first group covering its center
        const group = flowStore.nodes.find(n =>
          n.type === NODE_TYPES.GROUP &&
          n.id !== node.id &&
          isCenterInsideGroup(node.position, node, n)
        )

        if (group) attachNodeToGroup(node, group)
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
      const { width, height } = getNodeSize(node)
      maxX = Math.max(maxX, node.position.x + width)
      maxY = Math.max(maxY, node.position.y + height)
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
