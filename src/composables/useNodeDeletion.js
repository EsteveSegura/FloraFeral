/**
 * Composable for deleting the selection
 *
 * VueFlow's own delete key is turned off (`:delete-key-code="null"`) so the
 * removal can be wrapped: deleting a reroute must leave the wire it was only
 * bending connected. It has to happen here rather than in a hook, because
 * `removeNodes` fires `edgesChange` and `nodesChange` only once it has applied
 * them, and by then the reroute's edges - the only record of where the wire
 * went - are already gone
 */

import { onMounted, onUnmounted } from 'vue'
import { planRerouteBypass } from '@/lib/upstream'

// Same guard VueFlow applies before acting on a key, so typing in a prompt
// never deletes nodes
const EDITABLE_TAGS = ['INPUT', 'SELECT', 'TEXTAREA']

/**
 * Whether a keyboard event came from somewhere the canvas must keep its hands off
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
function isEditableTarget(event) {
  const target = event.composedPath?.()?.[0] || event.target
  if (!target) return false

  if (EDITABLE_TAGS.includes(target.nodeName)) return true
  if (target.isContentEditable) return true
  if (typeof target.hasAttribute === 'function' && target.hasAttribute('contenteditable')) return true

  return typeof target.closest === 'function' && !!target.closest('.nokey')
}

export function useNodeDeletion(flowStore, vueFlow) {
  const { getSelectedNodes, getSelectedEdges, removeNodes, removeEdges, addEdges } = vueFlow

  /**
   * Delete the current selection, reconnecting around any reroute in it
   */
  function handleDelete() {
    // Copies: removeNodes mutates the selection behind these computed
    const nodes = [...getSelectedNodes.value]
    const edges = [...getSelectedEdges.value]
    if (!nodes.length && !edges.length) return

    // Planned while the graph is still whole
    const bridges = planRerouteBypass(nodes, flowStore.nodes, flowStore.edges)

    // Same order VueFlow used: nodes first, their edges go with them
    if (nodes.length) removeNodes(nodes)
    if (edges.length) removeEdges(edges)

    // Last, so the cascade cannot take the new edges with it. addEdges runs
    // isValidConnection, which is the safety net we want here: a bridge that
    // would duplicate a wire already on the canvas is dropped
    if (bridges.length) addEdges(bridges)
  }

  function onKeyDown(event) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return
    if (isEditableTarget(event)) return

    event.preventDefault()
    handleDelete()
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

  return { handleDelete }
}
