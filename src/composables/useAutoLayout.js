/**
 * Composable for Auto Layout
 * Rearranges the canvas by dependency. Reverting it is the canvas-wide undo's
 * job now, see useFlowHistory
 */

import { nextTick } from 'vue'
import { computeAutoLayout } from '@/lib/auto-layout'
import { isCenterInsideGroup } from '@/lib/group-membership'
import { NODE_TYPES } from '@/lib/node-shapes'
import { useSettingsStore } from '@/stores/settings'

export function useAutoLayout(flowStore, { applyNodeChanges, fitView, flushHistory }) {
  const settingsStore = useSettingsStore()

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

    // Close whatever step is in flight, so the whole rearrangement is ONE entry
    // of the history and a single Ctrl+Z takes it back, positions and group
    // sizes together
    flushHistory()

    const { positions, groupSizes } = computeAutoLayout(flowStore.nodes, flowStore.edges, {
      layoutGroupContents: settingsStore.autoLayoutGroupContents
    })
    if (!positions.size) return

    resizeGroups(groupSizes)

    for (const node of flowStore.nodes) {
      const position = positions.get(node.id)
      if (position) node.position = { x: position.x, y: position.y }

      // A selection left over from before would turn the next drag into a mass
      // move, which is the one thing that could undo the arrangement
      if (node.selected) node.selected = false
    }

    if (import.meta.env.DEV) warnOnStrayNodes()

    await nextTick()
    fitView({ duration: 300, padding: 0.2 })
  }

  return {
    handleAutoLayout
  }
}
