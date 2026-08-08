/**
 * Composable for undo/redo of the canvas
 *
 * A selective watcher rather than a hook per action. The watcher getter reads
 * only what gets serialized, so it stays blind to `dragging`, `dimensions`,
 * `selected` and the rest of the internals VueFlow keeps on the very same node
 * objects, and a debounce collapses a drag or a burst of typing into one step
 *
 * In memory only: the history never travels in the exported .json
 */

import { computed, nextTick, ref, watch } from 'vue'
import { mergeRestoredData, sameSnapshot, takeSnapshot } from '@/lib/history-snapshot'
import { useWorkflowExecutionStore } from '@/stores/workflow-execution'
import { useBatchStore } from '@/stores/batch'

// 30 undoable steps means 31 states
const MAX_ENTRIES = 31
// Longer than the gap between keystrokes, far longer than a drag frame
const DEBOUNCE_MS = 400
// Ceiling, so three minutes of typing is not a single step and does not eat the 30
const MAX_WAIT_MS = 1500

export function useFlowHistory(flowStore, {
  findNode,
  addNodes,
  removeNodes,
  addEdges,
  removeEdges,
  applyNodeChanges,
  updateNodeData
}) {
  const executionStore = useWorkflowExecutionStore()
  const batchStore = useBatchStore()

  const entries = []
  const index = ref(-1)

  let cache = new Map()
  let timer = null
  let burstStart = 0
  let isRestoring = false
  let restoreToken = 0

  /**
   * A run writes results across many nodes, and a batch rewrites the inputs of
   * every row before putting the originals back. None of that is an edit
   * Both flags are needed: between batch rows `isExecuting` drops back to false
   */
  const isBusy = computed(() => executionStore.isExecuting || batchStore.isRunning)

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < entries.length - 1)

  function snapshot() {
    const next = takeSnapshot(flowStore, cache)
    cache = next.cache

    return next
  }

  /**
   * Push a state, unless it says the same as the one we are on
   * @param {Object} next
   */
  function commit(next) {
    if (index.value >= 0 && sameSnapshot(entries[index.value], next)) return

    // Doing something new abandons the redo branch
    entries.splice(index.value + 1)
    entries.push(next)
    if (entries.length > MAX_ENTRIES) entries.shift()

    index.value = entries.length - 1
  }

  function cancel() {
    clearTimeout(timer)
    timer = null
    burstStart = 0
  }

  function record() {
    timer = null
    burstStart = 0

    if (isRestoring || isBusy.value) return

    // Position changes on every frame of a drag, so wait for the drop and the
    // whole gesture is one step. This runs from a setTimeout, meaning outside any
    // effect, so reading `dragging` here does NOT pull it into the watcher getter
    if (flowStore.nodes.some(node => node.dragging)) {
      schedule()
      return
    }

    commit(snapshot())
  }

  function schedule() {
    if (isRestoring) return

    const now = Date.now()
    if (!burstStart) burstStart = now

    clearTimeout(timer)
    timer = setTimeout(record, Math.min(DEBOUNCE_MS, Math.max(0, burstStart + MAX_WAIT_MS - now)))
  }

  /**
   * Close the step in flight, so whatever happens next is a step of its own
   */
  function flush() {
    cancel()
    record()
  }

  /**
   * Rebase the history onto whatever is on the canvas right now, without adding
   * a step. Used after a run, and as the initial state
   */
  function rebase() {
    cancel()

    if (index.value < 0) commit(snapshot())
    else entries[index.value] = snapshot()
  }

  /**
   * Drop the history entirely and start over from the current canvas
   * Loading a flow replaces everything, and going back to what was there before
   * is not something the history is meant to offer
   */
  function reset() {
    cancel()
    entries.length = 0
    index.value = -1
    cache = new Map()
    restoreToken++
    isRestoring = false
    commit(snapshot())
  }

  /**
   * Reconcile the canvas onto a snapshot, touching only what differs
   * @param {Object} target
   */
  function restore(target) {
    const token = ++restoreToken
    isRestoring = true
    cancel()

    const current = snapshot()
    const currentById = new Map(current.nodes.map(node => [node.id, node]))
    const targetIds = new Set(target.nodes.map(node => node.id))

    // 1. The ones still around, in place. This is the common case (a move, an
    //    edit) and it never touches the structure, so there is no watcher hop
    const resizes = []

    for (const wanted of target.nodes) {
      const live = findNode(wanted.id)
      if (!live) continue

      const before = currentById.get(wanted.id)

      if (before.x !== wanted.x || before.y !== wanted.y) {
        live.position = { x: wanted.x, y: wanted.y }
      }

      if (before.parentNode !== wanted.parentNode) {
        if (wanted.parentNode) live.parentNode = wanted.parentNode
        else delete live.parentNode
      }

      if (before.extent !== wanted.extent) {
        if (wanted.extent) live.extent = wanted.extent
        else delete live.extent
      }

      // A group's size lives in `style`. Writing it as a dimensions change keeps
      // `dimensions` and `style` in step, the same route NodeResizer takes
      if (before.width !== wanted.width || before.height !== wanted.height) {
        resizes.push({
          id: wanted.id,
          type: 'dimensions',
          dimensions: {
            width: parseInt(wanted.width) || 0,
            height: parseInt(wanted.height) || 0
          },
          updateStyle: true
        })
      }

      if (before.data !== wanted.data) {
        updateNodeData(
          wanted.id,
          mergeRestoredData(live.data, wanted.data, wanted.type),
          { replace: true }
        )
      }
    }

    if (resizes.length) applyNodeChanges(resizes)

    // 2. The ones that no longer belong. After step 1, which is where a node that
    //    outlived its group had its `parentNode` cleared
    const gone = current.nodes
      .filter(node => !targetIds.has(node.id))
      .map(node => node.id)
    if (gone.length) removeNodes(gone, false)

    // 3. The ones missing. `addNodes` parses and lands them in VueFlow's own
    //    state synchronously, so the edges below already find their endpoints:
    //    that is why no undo needs the setTimeout importFlow relies on
    const missing = target.nodes
      .filter(node => !findNode(node.id))
      .map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: node.data,
        io: node.io,
        ...(node.parentNode && { parentNode: node.parentNode }),
        ...(node.extent && { extent: node.extent }),
        ...(node.style && { style: node.style })
      }))
    if (missing.length) addNodes(missing)

    // 4. Edges are never edited, only born and removed. Remove before adding, or
    //    validateConnection would reject a transient duplicate
    const targetEdgeIds = new Set(target.edges.map(edge => edge.id))

    const stale = current.edges
      .filter(edge => !targetEdgeIds.has(edge.id))
      .map(edge => edge.id)
    if (stale.length) removeEdges(stale)

    const kept = new Set(
      current.edges.filter(edge => targetEdgeIds.has(edge.id)).map(edge => edge.id)
    )
    const born = target.edges.filter(edge => !kept.has(edge.id))
    if (born.length) addEdges(born)

    settle(token)
  }

  /**
   * VueFlow writes its state back to the store on the next flush, and the nodes
   * react to their new data a tick later. Rebasing once everything has landed
   * keeps a component that re-derives a field (DrawNode republishing its output,
   * PromptTemplate its prompt) from looking like a brand new step
   * The token lets 30 rapid Ctrl+Z apply synchronously: only the last one rebases
   * @param {number} token
   */
  async function settle(token) {
    await nextTick()
    await nextTick()

    if (token !== restoreToken) return

    entries[index.value] = snapshot()
    isRestoring = false
  }

  function undo() {
    // An edit still inside the debounce window is a step of its own
    flush()
    if (!canUndo.value) return

    index.value -= 1
    restore(entries[index.value])
  }

  function redo() {
    if (!canRedo.value) return

    index.value += 1
    restore(entries[index.value])
  }

  watch(
    () => [
      // `updateNodeData` replaces `node.data` outright, so a fresh identity IS
      // the signal that someone wrote. Reading only the reference keeps this
      // getter clear of `dragging`, `dimensions`, `selected` and the rest of the
      // VueFlow internals that live on the same objects
      flowStore.nodes.map(node => node.data),
      flowStore.nodes.map(node =>
        `${node.id}@${node.position.x},${node.position.y}` +
        `>${node.parentNode ?? ''}` +
        // Groups keep their size in `style`, which is what the .json preserves.
        // The measuring burst on mount does not write style - only a change
        // carrying `updateStyle` does - so this does not wake the history up
        `#${node.style?.width ?? ''}x${node.style?.height ?? ''}`
      ).join('|'),
      flowStore.edges.map(edge =>
        `${edge.id}:${edge.source}/${edge.sourceHandle}>${edge.target}/${edge.targetHandle}`
      ).join('|')
    ],
    schedule,
    { flush: 'post' }
  )

  // Coming back from a run: whatever it wrote is the new starting point, never a
  // step of its own
  watch(isBusy, busy => {
    if (!busy) rebase()
  })

  // Importing a flow starts over. The edges land a moment after the nodes
  // (flow-io waits for VueFlow to see them), so the reset waits for the whole
  // thing to settle instead of recording a canvas with no wires
  watch(() => flowStore.importToken, () => {
    setTimeout(reset, 200)
  })

  // The canvas as it stands is step zero
  rebase()

  return { undo, redo, canUndo, canRedo, flush, reset }
}
