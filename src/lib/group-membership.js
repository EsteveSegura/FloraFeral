/**
 * Group membership geometry
 *
 * A node belongs to a group when its center sits inside the group rectangle.
 * The same rule is used no matter how the node ended up there (dragged into the
 * group, or the group resized around/away from it), so what the canvas shows
 * always matches the parent/child links stored in the flow.
 */

import { NODE_TYPES } from './node-shapes'

const DEFAULT_NODE_WIDTH = 250
const DEFAULT_NODE_HEIGHT = 200

/**
 * Measured size when VueFlow already rendered the node, estimate otherwise.
 */
export function getNodeSize(node) {
  return {
    width: node.dimensions?.width || node.width || DEFAULT_NODE_WIDTH,
    height: node.dimensions?.height || node.height || DEFAULT_NODE_HEIGHT
  }
}

/**
 * Groups carry their size in the inline style until VueFlow measures them.
 */
export function getGroupSize(group) {
  return {
    width: group.dimensions?.width || parseInt(group.style?.width) || 0,
    height: group.dimensions?.height || parseInt(group.style?.height) || 0
  }
}

/**
 * Canvas coordinates of a child node, whose position is relative to its parent.
 */
export function toAbsolutePosition(node, parent) {
  return {
    x: parent.position.x + node.position.x,
    y: parent.position.y + node.position.y
  }
}

/**
 * @param {{ x: number, y: number }} absolutePosition top-left of the node on the canvas
 */
export function isCenterInsideGroup(absolutePosition, node, group) {
  const { width, height } = getNodeSize(node)
  const centerX = absolutePosition.x + width / 2
  const centerY = absolutePosition.y + height / 2

  const groupSize = getGroupSize(group)

  return (
    centerX >= group.position.x &&
    centerX <= group.position.x + groupSize.width &&
    centerY >= group.position.y &&
    centerY <= group.position.y + groupSize.height
  )
}

/**
 * Make the node a child of the group, turning its position into a relative one.
 */
export function attachNodeToGroup(node, group) {
  node.position = {
    x: node.position.x - group.position.x,
    y: node.position.y - group.position.y
  }
  node.parentNode = group.id
}

/**
 * Release the node from its group, restoring its absolute position.
 */
export function detachNodeFromGroup(node, group) {
  node.position = toAbsolutePosition(node, group)
  delete node.parentNode
  if (node.extent) delete node.extent
}

/**
 * Re-evaluate every node against a single group: children left outside are
 * released and free nodes covered by the group are adopted. Nodes belonging to
 * another group are left alone, since nested groups are not supported.
 */
export function syncGroupMembership(group, nodes) {
  for (const node of nodes) {
    if (node.id === group.id || node.type === NODE_TYPES.GROUP) continue

    if (node.parentNode === group.id) {
      if (!isCenterInsideGroup(toAbsolutePosition(node, group), node, group)) {
        detachNodeFromGroup(node, group)
      }
    } else if (!node.parentNode && isCenterInsideGroup(node.position, node, group)) {
      attachNodeToGroup(node, group)
    }
  }
}
