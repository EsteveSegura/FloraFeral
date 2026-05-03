import { useFlowStore } from '@/stores/flow'
import { topologicalSort } from '@/lib/graph-utils'

const H_GAP = 80
const V_GAP = 40
const FALLBACK_W = 220
const FALLBACK_H = 150

function getNodeWidth(node) {
  return node.dimensions?.width || node.width || FALLBACK_W
}

function getNodeHeight(node) {
  return node.dimensions?.height || node.height || FALLBACK_H
}

function gridFallback(nodes) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id))

  const rowHeights = []
  const colWidths = []
  sorted.forEach((node, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    rowHeights[r] = Math.max(rowHeights[r] || 0, getNodeHeight(node))
    colWidths[c] = Math.max(colWidths[c] || 0, getNodeWidth(node))
  })

  const colX = []
  colWidths.forEach((w, c) => {
    colX[c] = c === 0 ? 0 : colX[c - 1] + colWidths[c - 1] + H_GAP
  })
  const rowY = []
  rowHeights.forEach((h, r) => {
    rowY[r] = r === 0 ? 0 : rowY[r - 1] + rowHeights[r - 1] + V_GAP
  })

  sorted.forEach((node, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    node.position = { x: colX[c], y: rowY[r] }
  })
}

export function useAutoLayout() {
  const flowStore = useFlowStore()

  function autoLayoutNodes() {
    const allNodes = flowStore.nodes
    if (allNodes.length < 2) return

    const layoutNodes = allNodes.filter(n => !n.parentNode)
    if (layoutNodes.length < 2) return

    const layoutIds = new Set(layoutNodes.map(n => n.id))
    const layoutEdges = flowStore.edges.filter(
      e => layoutIds.has(e.source) && layoutIds.has(e.target)
    )

    const { levels, hasCycle } = topologicalSort(layoutNodes, layoutEdges)

    if (hasCycle) {
      gridFallback(layoutNodes)
      return
    }

    const nodeById = new Map(layoutNodes.map(n => [n.id, n]))

    const incoming = new Map()
    layoutNodes.forEach(n => incoming.set(n.id, []))
    layoutEdges.forEach(e => {
      incoming.get(e.target)?.push(e.source)
    })

    const colW = levels.map(level =>
      level.reduce((max, id) => Math.max(max, getNodeWidth(nodeById.get(id))), 0)
    )

    const colX = []
    colW.forEach((w, i) => {
      colX[i] = i === 0 ? 0 : colX[i - 1] + colW[i - 1] + H_GAP
    })

    const positionsY = new Map()

    const colHeights = []
    levels.forEach((level, i) => {
      let ordered
      if (i === 0) {
        ordered = [...level].sort((a, b) => a.localeCompare(b))
      } else {
        ordered = [...level].sort((a, b) => {
          const ba = barycenter(a, incoming, positionsY, nodeById)
          const bb = barycenter(b, incoming, positionsY, nodeById)
          if (ba === bb) return a.localeCompare(b)
          return ba - bb
        })
      }

      let y = 0
      ordered.forEach((id, k) => {
        const node = nodeById.get(id)
        if (k > 0) y += V_GAP
        positionsY.set(id, y)
        y += getNodeHeight(node)
      })
      colHeights[i] = y

      // Replace level with ordered IDs so the apply step uses the new order.
      levels[i] = ordered
    })

    const maxColHeight = colHeights.reduce((m, h) => Math.max(m, h), 0)
    const centerY = maxColHeight / 2

    levels.forEach((level, i) => {
      const offset = centerY - colHeights[i] / 2
      level.forEach(id => {
        const node = nodeById.get(id)
        const yLocal = positionsY.get(id)
        node.position = { x: colX[i], y: offset + yLocal }
      })
    })
  }

  return { autoLayoutNodes }
}

function barycenter(id, incoming, positionsY, nodeById) {
  const sources = incoming.get(id) || []
  if (sources.length === 0) return positionsY.get(id) ?? 0
  let sum = 0
  let count = 0
  for (const s of sources) {
    const y = positionsY.get(s)
    if (y === undefined) continue
    sum += y + getNodeHeight(nodeById.get(s)) / 2
    count++
  }
  return count > 0 ? sum / count : 0
}
