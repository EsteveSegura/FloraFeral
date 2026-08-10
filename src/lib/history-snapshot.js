/**
 * Snapshots for undo/redo
 *
 * A snapshot holds what an exported .json holds, minus the fields a generation
 * writes: those are never undone, so a Ctrl+Z can't throw away an image that
 * cost a real API call
 *
 * The `data` objects are kept BY REFERENCE, never cloned. Every write in the app
 * goes through `updateNodeData`, which replaces `node.data` with a fresh object,
 * so a node nobody touched carries the very same object from one snapshot to the
 * next. That is what makes a snapshot cost a handful of small objects even when a
 * node holds a base64 image of several megabytes, and what makes comparing two
 * snapshots a chain of identity checks instead of a JSON.stringify
 */

import { NODE_TYPES } from './node-shapes'

/**
 * Written by a failure and wiped by a setTimeout 5s later, on any node type
 * Keeping it out is what stops that deferred wipe from becoming a history entry
 */
const VOLATILE_ANY_TYPE = ['error']

/**
 * Written by a generator when a result comes back
 * `model` and `params` are deliberately absent: the person picks those, and a
 * generator rewrites the same value it was given
 */
const VOLATILE_BY_TYPE = {
  [NODE_TYPES.IMAGE_GENERATOR]: ['lastOutputSrc', 'generationId', 'generationMetadata'],
  // `prompt` is this node's OUTPUT - what the person types lives in `userPrompt`
  [NODE_TYPES.TEXT_GENERATOR]: ['generatedText', 'prompt', 'lastGenerationId'],
  [NODE_TYPES.VIDEO_GENERATOR]: ['lastOutputVideoSrc', 'generationId', 'generationMetadata']
}

const EMPTY_DATA = Object.freeze({})

/**
 * Fields of a node type that the history neither records nor restores
 * Note this is per type on purpose: `lastOutputSrc` is a generation on an image
 * generator but the result of drawing on a DrawNode, and excluding it globally
 * would make drawing impossible to undo
 * @param {string} nodeType - NODE_TYPES value
 * @returns {Array<string>}
 */
export function volatileFields(nodeType) {
  const byType = VOLATILE_BY_TYPE[nodeType]

  return byType ? [...VOLATILE_ANY_TYPE, ...byType] : VOLATILE_ANY_TYPE
}

/**
 * @param {Object} data
 * @param {string} nodeType
 * @returns {Object} A copy without the volatile fields
 */
function stripVolatile(data, nodeType) {
  const stripped = { ...data }
  for (const field of volatileFields(nodeType)) delete stripped[field]

  return stripped
}

/**
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  const keys = Object.keys(a)

  return keys.length === Object.keys(b).length &&
    keys.every(key => Object.is(a[key], b[key]))
}

/**
 * Take a snapshot of everything the history is responsible for
 * @param {Object} flowStore - Pinia flow store
 * @param {Map} [cache] - The previous snapshot's cache. Reusing it is what keeps
 *   an untouched node on the same stripped `data` object, so the next snapshot
 *   still compares equal by identity
 * @returns {{ nodes: Array, edges: Array, cache: Map }}
 */
export function takeSnapshot(flowStore, cache = new Map()) {
  // Rebuilt every time, so entries for deleted nodes fall out on their own
  const nextCache = new Map()

  const nodes = flowStore.nodes.map(node => {
    const raw = node.data ?? EMPTY_DATA
    const hit = cache.get(node.id)
    let data

    if (hit && hit.raw === raw) {
      // Nobody wrote to this node at all
      data = hit.data
    } else {
      const stripped = stripVolatile(raw, node.type)
      // A generation only moved volatile fields: hold on to the old identity so
      // the snapshot compares equal and no entry is born
      data = hit && shallowEqual(hit.data, stripped) ? hit.data : stripped
    }

    nextCache.set(node.id, { raw, data })

    return {
      id: node.id,
      type: node.type,
      x: node.position.x,
      y: node.position.y,
      parentNode: node.parentNode ?? null,
      extent: node.extent ?? null,
      // A group keeps its size in `style`, which is what the .json preserves.
      // Pulled apart here so comparing two snapshots stays a scalar check
      width: node.style?.width ?? null,
      height: node.style?.height ?? null,
      style: node.style ? { ...node.style } : null,
      // Never mutated at runtime, so a reference is enough
      io: node.io,
      data
    }
  })

  const edges = flowStore.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null
  }))

  return { nodes, edges, cache: nextCache }
}

/**
 * Whether two snapshots describe the same canvas
 * Compares `data` by identity, which the cache in takeSnapshot is what makes
 * meaningful: no deep walk, no stringify
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export function sameSnapshot(a, b) {
  if (!a || !b) return false
  if (a.nodes.length !== b.nodes.length) return false
  if (a.edges.length !== b.edges.length) return false

  for (let i = 0; i < a.nodes.length; i++) {
    const left = a.nodes[i]
    const right = b.nodes[i]

    if (left.id !== right.id) return false
    if (left.data !== right.data) return false
    if (left.x !== right.x || left.y !== right.y) return false
    if (left.parentNode !== right.parentNode) return false
    if (left.width !== right.width || left.height !== right.height) return false
  }

  for (let i = 0; i < a.edges.length; i++) {
    const left = a.edges[i]
    const right = b.edges[i]

    if (left.id !== right.id) return false
    if (left.source !== right.source || left.target !== right.target) return false
    if (left.sourceHandle !== right.sourceHandle) return false
    if (left.targetHandle !== right.targetHandle) return false
  }

  return true
}

/**
 * The data to write back into a node: the snapshot for everything that belongs
 * to the person, the live value for everything a generation produced
 * Without this merge, undoing a move made after a generation would wipe the
 * generated image, since the snapshot never held it
 * @param {Object} currentData - The node's data right now
 * @param {Object} snapshotData - The data recorded in the snapshot
 * @param {string} nodeType
 * @returns {Object}
 */
export function mergeRestoredData(currentData, snapshotData, nodeType) {
  const merged = { ...snapshotData }

  for (const field of volatileFields(nodeType)) {
    if (currentData && field in currentData) merged[field] = currentData[field]
  }

  return merged
}
