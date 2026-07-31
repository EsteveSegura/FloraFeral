/**
 * Composable for Copy/Paste operations
 * Copies the whole selection and pastes it back keeping the relative layout,
 * the connections between the copied nodes and their upstream feeds
 */

import { ref, nextTick } from 'vue'
import { createNode, getNodeIOConfig, NODE_TYPES } from '@/lib/node-shapes'
import { ensureUniqueLabel } from '@/lib/node-label'

/**
 * Short random suffix so two ids minted in the same millisecond differ
 * @returns {string}
 */
function randomSuffix() {
  return Math.random().toString(36).slice(2, 7)
}

export function useCopyPaste(flowStore, viewport, mousePosition, { addEdges }) {
  // Snapshot of the selection, plain and serializable, taken at copy time
  const copiedNodes = ref([])
  // Edges feeding the snapshot; their source may be inside it or outside
  const copiedEdges = ref([])

  /**
   * Absolute canvas position of a node: children of a group store their
   * position relative to it, and groups cannot nest, so one hop is enough
   */
  function toAbsolutePosition(node) {
    const parent = node.parentNode
      ? flowStore.nodes.find(n => n.id === node.parentNode)
      : null

    if (!parent) return { x: node.position.x, y: node.position.y }

    return {
      x: parent.position.x + node.position.x,
      y: parent.position.y + node.position.y
    }
  }

  /**
   * Copy every selected node plus the edges that feed them.
   * Group containers are skipped: their size lives in `style`, which the node
   * schema drops, so the copy would be an invisible empty box
   */
  function handleCopy() {
    const selected = flowStore.nodes.filter(
      node => node.selected && node.type !== NODE_TYPES.GROUP
    )

    // Only the schema fields: the store holds VueFlow graph nodes, and their
    // internals (dimensions, handleBounds, computedPosition) must not be cloned
    copiedNodes.value = selected.map(node => ({
      id: node.id,
      type: node.type,
      position: toAbsolutePosition(node),
      data: JSON.parse(JSON.stringify(node.data ?? {}))
    }))

    const copiedIds = new Set(copiedNodes.value.map(node => node.id))

    // Incoming edges only. Cloning an outgoing edge would rewire a node the
    // user did not copy: targets merge every incoming edge, so the original
    // consumer would silently start reading two sources
    copiedEdges.value = flowStore.edges
      .filter(edge => copiedIds.has(edge.target))
      .map(edge => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null
      }))

    console.log(`Copied ${copiedNodes.value.length} node(s), ${copiedEdges.value.length} incoming edge(s)`)
  }

  /**
   * Paste the snapshot with its top-left corner at the mouse pointer
   */
  async function handlePaste() {
    if (copiedNodes.value.length === 0) return

    // Pointer in canvas coordinates (undo pan and zoom)
    const pointer = {
      x: (mousePosition.value.x - viewport.value.x) / viewport.value.zoom,
      y: (mousePosition.value.y - viewport.value.y) / viewport.value.zoom
    }

    // Anchor the bounding box of the snapshot at the pointer, so every node
    // keeps its offset to the others
    const originX = Math.min(...copiedNodes.value.map(node => node.position.x))
    const originY = Math.min(...copiedNodes.value.map(node => node.position.y))

    const stamp = Date.now()
    const idMap = new Map()
    const pastedNodes = []

    copiedNodes.value.forEach((snapshot, index) => {
      const data = JSON.parse(JSON.stringify(snapshot.data))

      // Labels name the batch columns, so a copy cannot reuse one. The pending
      // nodes count too: they are not in the store yet
      if (data.label) {
        data.label = ensureUniqueLabel(data.label, [...flowStore.nodes, ...pastedNodes])
      }

      const newNode = createNode(
        `node_${stamp}_${index}_${randomSuffix()}`,
        snapshot.type,
        {
          x: pointer.x + (snapshot.position.x - originX),
          y: pointer.y + (snapshot.position.y - originY)
        },
        data,
        getNodeIOConfig(snapshot.type)
      )

      // The paste leaves its result selected, ready to be dragged or pasted
      // again. VueFlow keeps this flag when the node enters the graph
      newNode.selected = true

      idMap.set(snapshot.id, newNode.id)
      pastedNodes.push(newNode)
    })

    // Only the fresh copy stays selected
    flowStore.nodes.forEach(node => {
      if (node.selected) node.selected = false
    })

    flowStore.nodes.push(...pastedNodes)

    // Wait for VueFlow to process the new nodes before adding edges
    await nextTick()

    const newEdges = copiedEdges.value
      // An edge coming from outside the selection keeps its original source,
      // unless that node is gone by now
      .filter(template =>
        idMap.has(template.source) || flowStore.nodes.some(node => node.id === template.source)
      )
      .map((template, index) => ({
        id: `edge_${stamp}_${index}_${randomSuffix()}`,
        source: idMap.get(template.source) || template.source,
        target: idMap.get(template.target),
        sourceHandle: template.sourceHandle,
        targetHandle: template.targetHandle
      }))

    if (newEdges.length > 0) {
      addEdges(newEdges)
    }

    console.log(`Pasted ${pastedNodes.length} node(s), ${newEdges.length} edge(s)`)
  }

  return {
    copiedNodes,
    handleCopy,
    handlePaste
  }
}
