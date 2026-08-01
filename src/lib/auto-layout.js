/**
 * Auto layout
 *
 * Arranges the canvas by dependency: sources on the left, and every node to the
 * right of whatever feeds it. Groups are laid out as blocks — their content is
 * arranged first, and the resulting box takes part in the outer layout as a
 * single item, so a group never overlaps anything around it.
 *
 * The layering comes from `topologicalSort`, which already assigns a node to the
 * level right after its last dependency. That level is the column.
 */

import { topologicalSort } from './graph-utils'
import { NODE_TYPES } from './node-shapes'
import { getGroupSize, getNodeSize } from './group-membership'

export const AUTO_LAYOUT_DEFAULTS = {
  hGap: 140,           // below ~100px the bezier edges flatten against the handles
  vGap: 60,
  groupPadding: 40,    // same padding handleGroup uses, and it clears the group label
  groupMinWidth: 200,  // the NodeResizer minimums of GroupNode
  groupMinHeight: 150,
  bandGap: 80,
  bandMaxWidth: 1200,
  sweeps: 4
}

const WHITE = 0
const GRAY = 1
const BLACK = 2

/**
 * Drop the edges the layout cannot use: the ones pointing outside the set, self
 * edges, and duplicates.
 *
 * Deduplicating is not cosmetic. `buildDependencyGraph` keeps its adjacency in a
 * Set but counts one in-degree per edge, so two parallel edges leave the target
 * stuck above zero and `topologicalSort` silently drops it and everything
 * downstream. The UI blocks duplicates, an imported JSON does not.
 */
function sanitizeEdges(ids, edges) {
  const seen = new Set()
  const clean = []

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    if (edge.source === edge.target) continue

    const key = `${edge.source}|${edge.target}`
    if (seen.has(key)) continue

    seen.add(key)
    clean.push({ source: edge.source, target: edge.target })
  }

  return clean
}

/**
 * Return the edges of a spanning DFS with the back edges removed, so the rest of
 * the layout can assume a DAG.
 *
 * Nothing in the app forbids a cycle: `validateConnection` only blocks self and
 * duplicate connections. Feeding a cycle to Kahn's algorithm loses the cycle
 * *and* everything downstream of it, which would pile the whole canvas into one
 * column. The dropped edges only disappear from the layout — the flow keeps
 * them, and they end up drawn right to left.
 */
function breakCycles(items, edges) {
  const successors = new Map(items.map(item => [item.id, []]))
  const inDegree = new Map(items.map(item => [item.id, 0]))

  for (const edge of edges) {
    successors.get(edge.source).push(edge.target)
    inDegree.set(edge.target, inDegree.get(edge.target) + 1)
  }

  // Walking from the sources first keeps forward edges from being mistaken for
  // back edges just because the traversal started in the middle of a chain
  const roots = items
    .map((item, index) => ({ id: item.id, index }))
    .sort((a, b) => {
      const rootA = inDegree.get(a.id) === 0 ? 0 : 1
      const rootB = inDegree.get(b.id) === 0 ? 0 : 1
      return rootA - rootB || a.index - b.index
    })

  const color = new Map(items.map(item => [item.id, WHITE]))
  const kept = []

  for (const root of roots) {
    if (color.get(root.id) !== WHITE) continue

    // Iterative: a long enough chain would overflow a recursive DFS
    color.set(root.id, GRAY)
    const stack = [{ id: root.id, next: 0 }]

    while (stack.length) {
      const frame = stack[stack.length - 1]
      const children = successors.get(frame.id)

      if (frame.next >= children.length) {
        color.set(frame.id, BLACK)
        stack.pop()
        continue
      }

      const child = children[frame.next++]

      // A gray child means we looped back into the current path
      if (color.get(child) === GRAY) continue

      kept.push({ source: frame.id, target: child })

      if (color.get(child) === WHITE) {
        color.set(child, GRAY)
        stack.push({ id: child, next: 0 })
      }
    }
  }

  return kept
}

function median(values) {
  if (!values.length) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function boundsOf(items, positions) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const item of items) {
    const position = positions.get(item.id)
    if (!position) continue

    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x + item.width)
    maxY = Math.max(maxY, position.y + item.height)
  }

  if (minX === Infinity) return null

  return { minX, minY, maxX, maxY }
}

/**
 * Lay out one graph left to right. Used for the whole canvas and, on its own,
 * for the content of each group.
 *
 * @param {Array<{id: string, width: number, height: number, seedX: number, seedY: number}>} items
 * @param {Array<{source: string, target: string}>} edges
 * @returns {{ positions: Map<string, {x: number, y: number}>, width: number, height: number }}
 *          positions are top-left corners, normalized so the bounding box starts at (0, 0)
 */
export function layoutSubgraph(items, edges, opts = {}) {
  const options = { ...AUTO_LAYOUT_DEFAULTS, ...opts }
  const positions = new Map()

  if (!items.length) return { positions, width: 0, height: 0 }

  const byId = new Map(items.map(item => [item.id, item]))
  const order = new Map(items.map((item, index) => [item.id, index]))

  const clean = sanitizeEdges(new Set(byId.keys()), edges)
  const dag = breakCycles(items, clean)

  const predecessors = new Map(items.map(item => [item.id, []]))
  const successors = new Map(items.map(item => [item.id, []]))
  for (const edge of dag) {
    successors.get(edge.source).push(edge.target)
    predecessors.get(edge.target).push(edge.source)
  }

  // Nodes nothing connects to (comments, leftovers) would inflate the first
  // column and push the real graph aside, so they get their own band below
  const connectedIds = new Set()
  for (const edge of clean) {
    connectedIds.add(edge.source)
    connectedIds.add(edge.target)
  }
  const connected = items.filter(item => connectedIds.has(item.id))
  const isolated = items.filter(item => !connectedIds.has(item.id))

  const { levels } = topologicalSort(connected, dag)
  const columns = levels.map(level => level.map(id => byId.get(id)))

  // Safety net: with the cycles already broken nothing should be left over
  const placed = new Set(columns.flat().map(item => item.id))
  const missing = connected.filter(item => !placed.has(item.id))
  if (missing.length) columns.push(missing)

  // Seed the order with what the user is already looking at, so the arrangement
  // stays recognizable and running the layout twice changes nothing
  const bySeed = (a, b) => a.seedY - b.seedY || a.seedX - b.seedX || order.get(a.id) - order.get(b.id)
  for (const column of columns) column.sort(bySeed)

  const rank = new Map()
  const reindex = () => {
    for (const column of columns) {
      column.forEach((item, index) => rank.set(item.id, index))
    }
  }
  reindex()

  // Barycenter sweeps. One forward pass would leave the first column in creation
  // order, and that is where most of the crossings come from; the backward pass
  // is what carries the consumers' order back to the sources.
  for (let sweep = 0; sweep < options.sweeps; sweep++) {
    const goingDown = sweep % 2 === 0
    const indexes = columns.map((_, index) => index)
    const range = goingDown ? indexes.slice(1) : indexes.slice(0, -1).reverse()
    const neighbours = goingDown ? predecessors : successors

    for (const index of range) {
      const column = columns[index]
      const keys = new Map()

      for (const item of column) {
        const related = neighbours.get(item.id)
        // Ranks, never pixels: node heights span 150 to 700px and a pixel
        // barycenter swings with them instead of with the topology
        keys.set(item.id, related.length
          ? related.reduce((sum, id) => sum + rank.get(id), 0) / related.length
          : rank.get(item.id))
      }

      column.sort((a, b) => keys.get(a.id) - keys.get(b.id) || rank.get(a.id) - rank.get(b.id))
      reindex()
    }
  }

  // A column is as wide as its widest node, which is what lets hGap be a
  // constant even though nodes range from 200 to 450+ px
  const columnX = []
  let x = 0
  for (const column of columns) {
    columnX.push(x)
    x += Math.max(...column.map(item => item.width)) + options.hGap
  }

  // Left to right: longest-path layering puts every predecessor in an earlier
  // column, so by the time a node is placed its inputs already have a position
  const centerY = new Map()
  for (const [index, column] of columns.entries()) {
    const desired = column.map(item => {
      const related = predecessors.get(item.id).filter(id => centerY.has(id))
      if (!related.length) return null
      return related.reduce((sum, id) => sum + centerY.get(id), 0) / related.length
    })

    const tops = []
    let previousBottom = null

    for (const [position, item] of column.entries()) {
      let top = desired[position] !== null
        ? desired[position] - item.height / 2
        : previousBottom !== null ? previousBottom + options.vGap : 0

      // Stacking wins over the barycenter: overlapping nodes are worse than a
      // node sitting slightly off its inputs
      if (previousBottom !== null) top = Math.max(top, previousBottom + options.vGap)

      tops.push(top)
      previousBottom = top + item.height
    }

    // Sliding the column as a block keeps both the order and the gaps. Median
    // and not mean, or one very tall node drags the whole column with it
    const drift = []
    for (const [position, item] of column.entries()) {
      if (desired[position] !== null) drift.push(desired[position] - (tops[position] + item.height / 2))
    }
    const shift = median(drift)

    for (const [position, item] of column.entries()) {
      const top = tops[position] + shift
      positions.set(item.id, { x: columnX[index], y: top })
      centerY.set(item.id, top + item.height / 2)
    }
  }

  if (isolated.length) {
    const main = boundsOf(connected, positions)
    const startX = main ? main.minX : 0
    const bandWidth = Math.max(main ? main.maxX - main.minX : 0, options.bandMaxWidth)

    let bandX = startX
    let bandY = main ? main.maxY + options.bandGap : 0
    let rowHeight = 0

    for (const item of [...isolated].sort(bySeed)) {
      if (bandX > startX && bandX + item.width > startX + bandWidth) {
        bandX = startX
        bandY += rowHeight + options.vGap
        rowHeight = 0
      }

      positions.set(item.id, { x: bandX, y: bandY })
      bandX += item.width + options.hGap
      rowHeight = Math.max(rowHeight, item.height)
    }
  }

  const bounds = boundsOf(items, positions)
  for (const [id, position] of positions) {
    positions.set(id, {
      x: Math.round(position.x - bounds.minX),
      y: Math.round(position.y - bounds.minY)
    })
  }

  return {
    positions,
    width: Math.round(bounds.maxX - bounds.minX),
    height: Math.round(bounds.maxY - bounds.minY)
  }
}

function clampGroupSize(size, options) {
  return {
    width: Math.max(Math.round(size.width), options.groupMinWidth),
    height: Math.max(Math.round(size.height), options.groupMinHeight)
  }
}

function toItem(node) {
  const { width, height } = getNodeSize(node)

  return {
    id: node.id,
    width,
    height,
    seedX: node.position.x,
    seedY: node.position.y
  }
}

/**
 * Move a node the shortest distance that takes its center out of a rectangle.
 * Group membership is decided by the center, so one pixel past the edge is
 * enough.
 */
function pushOutOfRect(position, size, rectPosition, rectSize) {
  const centerX = position.x + size.width / 2
  const centerY = position.y + size.height / 2
  const left = rectPosition.x
  const right = rectPosition.x + rectSize.width
  const top = rectPosition.y
  const bottom = rectPosition.y + rectSize.height

  if (centerX < left || centerX > right || centerY < top || centerY > bottom) return position

  const exits = [
    { dx: left - 1 - centerX, dy: 0 },
    { dx: right + 1 - centerX, dy: 0 },
    { dx: 0, dy: top - 1 - centerY },
    { dx: 0, dy: bottom + 1 - centerY }
  ]
  const nearest = exits.reduce((best, exit) =>
    Math.abs(exit.dx) + Math.abs(exit.dy) < Math.abs(best.dx) + Math.abs(best.dy) ? exit : best
  )

  return {
    x: Math.round(position.x + nearest.dx),
    y: Math.round(position.y + nearest.dy)
  }
}

/**
 * Work out where every node should sit.
 *
 * The returned positions are in the space VueFlow expects in `node.position`:
 * **relative to the group for its children, absolute for everything else**.
 *
 * @param {Array} nodes VueFlow nodes, read only
 * @param {Array} edges
 * @returns {{ positions: Map<string, {x: number, y: number}>,
 *             groupSizes: Map<string, {width: number, height: number}> }}
 */
export function computeAutoLayout(nodes, edges, opts = {}) {
  const options = { ...AUTO_LAYOUT_DEFAULTS, ...opts }
  const positions = new Map()
  const groupSizes = new Map()

  const byId = new Map(nodes.map(node => [node.id, node]))
  const groups = nodes.filter(node => node.type === NODE_TYPES.GROUP)
  const groupIds = new Set(groups.map(group => group.id))

  // A parentNode pointing at a group that is gone makes the node free. VueFlow
  // already warns about it; the layout reads the model, it does not repair it
  const parentOf = node => (node.parentNode && groupIds.has(node.parentNode) ? node.parentNode : null)

  // The content of each group comes first: its box is the slot the outer layout
  // has to reserve, padding and minimum size included
  const interiors = new Map()
  for (const group of groups) {
    const children = nodes.filter(node => parentOf(node) === group.id)

    if (!children.length) {
      // Nothing to arrange, so keep whatever size the user gave it
      interiors.set(group.id, {
        size: clampGroupSize(getGroupSize(group), options),
        positions: new Map(),
        resized: false
      })
      continue
    }

    const childIds = new Set(children.map(child => child.id))
    const inner = layoutSubgraph(
      children.map(toItem),
      edges.filter(edge => childIds.has(edge.source) && childIds.has(edge.target)),
      options
    )

    interiors.set(group.id, {
      size: clampGroupSize({
        width: inner.width + options.groupPadding * 2,
        height: inner.height + options.groupPadding * 2
      }, options),
      positions: inner.positions,
      resized: true
    })
  }

  // Comments are annotations, not part of the flow: they keep their place
  const isMovable = node =>
    node.type !== NODE_TYPES.GROUP &&
    node.type !== NODE_TYPES.COMMENT &&
    !parentOf(node)

  const freeNodes = nodes.filter(isMovable)
  const items = [
    ...freeNodes.map(toItem),
    ...groups.map(group => ({
      id: group.id,
      ...interiors.get(group.id).size,
      seedX: group.position.x,
      seedY: group.position.y
    }))
  ]

  if (!items.length) return { positions, groupSizes }

  // Every edge is redrawn between the blocks the layout actually places, so an
  // edge in or out of a group becomes an edge of the group itself
  const itemIds = new Set(items.map(item => item.id))
  const representativeOf = id => {
    const node = byId.get(id)
    return node ? parentOf(node) || id : null
  }

  const outerEdges = []
  for (const edge of edges) {
    const source = representativeOf(edge.source)
    const target = representativeOf(edge.target)

    if (!source || !target || source === target) continue
    if (!itemIds.has(source) || !itemIds.has(target)) continue

    outerEdges.push({ source, target })
  }

  const outer = layoutSubgraph(items, outerEdges, options)

  // Anchor the result on the top-left corner the canvas already occupied, so the
  // arrangement changes but the flow does not jump across the viewport
  const anchor = items.reduce((corner, item) => ({
    x: Math.min(corner.x, item.seedX),
    y: Math.min(corner.y, item.seedY)
  }), { x: Infinity, y: Infinity })

  for (const item of items) {
    const position = outer.positions.get(item.id)
    positions.set(item.id, {
      x: position.x + anchor.x,
      y: position.y + anchor.y
    })

    if (!groupIds.has(item.id)) continue

    const interior = interiors.get(item.id)
    if (interior.resized) groupSizes.set(item.id, interior.size)

    // Children stay relative to their group, offset by the padding
    for (const [childId, childPosition] of interior.positions) {
      positions.set(childId, {
        x: childPosition.x + options.groupPadding,
        y: childPosition.y + options.groupPadding
      })
    }
  }

  // A group may have landed on top of a comment. Left alone, the next drag would
  // hand the comment over to that group and it would start travelling with it
  for (const node of nodes) {
    if (node.type !== NODE_TYPES.COMMENT || parentOf(node)) continue

    const size = getNodeSize(node)
    let position = { x: node.position.x, y: node.position.y }

    for (const group of groups) {
      position = pushOutOfRect(
        position,
        size,
        positions.get(group.id) || group.position,
        groupSizes.get(group.id) || getGroupSize(group)
      )
    }

    if (position.x !== node.position.x || position.y !== node.position.y) {
      positions.set(node.id, position)
    }
  }

  return { positions, groupSizes }
}
