/**
 * Composable for Auto Layout
 * Rearranges the canvas by dependency and offers a one step undo, since the
 * repo has no history and a layout throws away every manual placement
 */

import { computed, nextTick, ref } from 'vue'
import { computeAutoLayout } from '@/lib/auto-layout'
import { getGroupSize, isCenterInsideGroup } from '@/lib/group-membership'
import { NODE_TYPES } from '@/lib/node-shapes'

export function useAutoLayout(flowStore, { applyNodeChanges, fitView }) {
  // Positions and group sizes as they were right before the last layout
  const snapshot = ref(null)

  const canUndoLayout = computed(() => snapshot.value !== null)

  /**
   * Group sizes live in `style` because that is what the JSON keeps. Writing
   * them as a dimensions change updates `dimensions` and `style` at once, the
   * same path NodeResizer takes.
   */
  function resizeGroups(sizes) {
    const ids = new Set(flowStore.nodes.map(node => node.id))
    const changes = [...sizes]
      .filter(([id]) => ids.has(id))
      .map(([id, dimensions]) => ({ id, type: 'dimensions', dimensions, updateStyle: true }))

    if (changes.length) applyNodeChanges(changes)
  }

  /**
   * A node whose center ends up inside a group would be adopted by
   * `syncGroupMembership` on the next drag, and would silently start travelling
   * with that group. The layout keeps every box apart, so this only fires on a
   * regression.
   */
  function warnOnStrayNodes() {
    const groups = flowStore.nodes.filter(node => node.type === NODE_TYPES.GROUP)
    if (!groups.length) return

    for (const node of flowStore.nodes) {
      if (node.parentNode || node.type === NODE_TYPES.GROUP) continue

      for (const group of groups) {
        if (isCenterInsideGroup(node.position, node, group)) {
          console.warn(`[AutoLayout] ${node.id} sits inside ${group.id} and will be adopted`)
        }
      }
    }
  }

  async function handleAutoLayout() {
    if (flowStore.nodes.length < 2) return

    // Sizes are measured by a ResizeObserver, so let any pending render land
    // before reading them
    await nextTick()

    const previous = flowStore.nodes.map(node => ({
      id: node.id,
      position: { ...node.position },
      size: node.type === NODE_TYPES.GROUP ? getGroupSize(node) : null
    }))

    const { positions, groupSizes } = computeAutoLayout(flowStore.nodes, flowStore.edges)
    if (!positions.size) return

    resizeGroups(groupSizes)

    for (const node of flowStore.nodes) {
      const position = positions.get(node.id)
      if (position) node.position = { x: position.x, y: position.y }

      // A selection left over from before would turn the next drag into a mass
      // move, which is the one thing that could undo the arrangement
      if (node.selected) node.selected = false
    }

    snapshot.value = previous

    if (import.meta.env.DEV) warnOnStrayNodes()

    await nextTick()
    fitView({ duration: 300, padding: 0.2 })
  }

  /**
   * Put every node back where it was before the last layout. Nodes added or
   * removed since then are skipped rather than resurrected.
   */
  async function undoAutoLayout() {
    if (!snapshot.value) return

    const previous = snapshot.value
    snapshot.value = null

    resizeGroups(new Map(
      previous.filter(entry => entry.size).map(entry => [entry.id, entry.size])
    ))

    const byId = new Map(flowStore.nodes.map(node => [node.id, node]))
    for (const entry of previous) {
      const node = byId.get(entry.id)
      if (node) node.position = { ...entry.position }
    }

    await nextTick()
    fitView({ duration: 300, padding: 0.2 })
  }

  return {
    canUndoLayout,
    handleAutoLayout,
    undoAutoLayout
  }
}
