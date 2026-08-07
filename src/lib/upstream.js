/**
 * Upstream resolution
 * A reroute node is pure wiring: it stores no data and has no port type of its
 * own. Every node reads its inputs through this module, so a reroute sitting in
 * the middle of a wire is invisible to whatever is downstream of it
 */

import { NODE_TYPES } from './node-shapes'
import nodeRegistry from './node-registry'
import { getDeclaredPortType } from './ports'

// A chain longer than this is a mistake, not a workflow. The cycle guard covers
// loops; this covers pathological depth
const MAX_HOPS = 64

/**
 * Whether a node is transparent to upstream resolution
 * @param {Object} node
 * @returns {boolean}
 */
export function isPassThrough(node) {
  return node?.type === NODE_TYPES.REROUTE
}

/**
 * Walk an edge backwards until the node that actually produces the data
 * @param {Object} edge - Edge to walk back from
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @param {(node: Object) => boolean} skip - Nodes to walk through
 * @param {Set<string>} visited - Node IDs already walked (cycle guard)
 * @returns {{ node: Object, sourceHandle: string, portType: string|null }|null}
 */
function walkBack(edge, nodes, edges, skip, visited) {
  let current = edge

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const source = nodes.find(n => n.id === current.source)
    if (!source) return null

    if (!skip(source)) {
      return {
        node: source,
        sourceHandle: current.sourceHandle,
        portType: getDeclaredPortType(source.type, current.sourceHandle, true, nodeRegistry)
      }
    }

    // Nothing stops the user from wiring a reroute back into itself through
    // another one: validateConnection only rejects source === target. A loop
    // resolves to nothing instead of hanging the computed walking it
    if (visited.has(source.id)) return null
    visited.add(source.id)

    // A reroute takes a single input (enforced in validateConnection)
    const feed = edges.find(e => e.target === source.id)
    if (!feed) return null

    current = feed
  }

  return null
}

/**
 * Every input feeding a node, with reroutes resolved to their real producer
 * Results keep the order of the incoming edges: the nodes that hand several
 * images to one model depend on it
 * @param {string} nodeId - Consumer node ID
 * @param {Array} nodes - All nodes. Pass the reactive array, never a copy, or
 *   the computed calling this stops tracking the graph
 * @param {Array} edges - All edges
 * @param {Object} [options]
 * @param {string} [options.portType] - Keep only inputs of this PORT_TYPE
 * @param {string} [options.handle] - Keep only inputs landing on this handle
 * @param {Function} [options.skip] - Nodes to resolve through
 * @returns {Array<{node: Object, portType: string|null, sourceHandle: string,
 *   handle: string, edge: Object}>}
 */
export function resolveUpstream(nodeId, nodes, edges, options = {}) {
  const { portType = null, handle = null, skip = isPassThrough } = options
  const resolved = []

  for (const edge of edges) {
    if (edge.target !== nodeId) continue
    if (handle && edge.targetHandle !== handle) continue

    // Seeded with the consumer so `consumer -> reroute -> consumer` terminates
    const producer = walkBack(edge, nodes, edges, skip, new Set([nodeId]))
    if (!producer) continue
    if (portType && producer.portType !== portType) continue

    resolved.push({
      node: producer.node,
      portType: producer.portType,
      sourceHandle: producer.sourceHandle,
      handle: edge.targetHandle,
      edge
    })
  }

  return resolved
}

/**
 * First upstream value a picker manages to read
 * An upstream holding nothing is skipped rather than read as "not connected",
 * which is what the per-component loops did before
 * @param {string} nodeId - Consumer node ID
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @param {(node: Object) => *} pick - Reads the value off a producer node
 * @param {Object} [options] - Same options as resolveUpstream
 * @returns {*} The value, or null when no upstream holds one
 */
export function readUpstream(nodeId, nodes, edges, pick, options = {}) {
  for (const input of resolveUpstream(nodeId, nodes, edges, options)) {
    const value = pick(input.node)
    if (value) return value
  }

  return null
}

/**
 * Every upstream value a picker can read, in incoming-edge order
 * @param {string} nodeId - Consumer node ID
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @param {(node: Object) => *} pick - Reads the value off a producer node
 * @param {Object} [options] - Same options as resolveUpstream
 * @returns {Array<{value: *, node: Object, handle: string, nodeId: string}>}
 */
export function readUpstreamAll(nodeId, nodes, edges, pick, options = {}) {
  const values = []

  for (const input of resolveUpstream(nodeId, nodes, edges, options)) {
    const value = pick(input.node)
    if (!value) continue

    values.push({ value, node: input.node, handle: input.handle, nodeId: input.node.id })
  }

  return values
}

/**
 * Prompt text a node produces
 * @param {Object} node
 * @returns {string|null}
 */
export const pickPrompt = node => node.data?.prompt || null

/**
 * Image a node produces: uploads keep it in `src`, generators in
 * `lastOutputSrc`, and the draw node writes `outputSrc` alongside its own
 * @param {Object} node
 * @returns {string|null}
 */
export const pickImage = node =>
  node.data?.src || node.data?.lastOutputSrc || node.data?.outputSrc || null

/**
 * PORT_TYPE a reroute is currently carrying, null while nothing feeds it
 * A reroute borrows the type of its producer instead of storing one, so this is
 * recomputed from the graph every time: nothing about a reroute is serialized
 * @param {string} nodeId - Reroute node ID
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {string|null}
 */
export function resolveRerouteType(nodeId, nodes, edges) {
  return resolveUpstream(nodeId, nodes, edges)[0]?.portType || null
}

/**
 * Whether two connections describe the same wire
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
function isSameConnection(a, b) {
  return a.source === b.source &&
    a.target === b.target &&
    (a.sourceHandle ?? null) === (b.sourceHandle ?? null) &&
    (a.targetHandle ?? null) === (b.targetHandle ?? null)
}

/**
 * Connections that keep a graph wired after deleting some nodes
 * Deleting a reroute must not break the wire it was tidying, so its producer is
 * reconnected to everything it fed. Reroutes deleted in the same gesture are
 * walked through, which is what makes deleting a whole chain leave one edge
 * behind instead of edges hanging off nodes that no longer exist
 * @param {Array<Object>} deletedNodes - Nodes about to be removed
 * @param {Array} nodes - All nodes, before the removal
 * @param {Array} edges - All edges, before the removal
 * @returns {Array<Object>} Connections to add after the removal. No IDs: VueFlow
 *   mints them and drops the ones that already exist
 */
export function planRerouteBypass(deletedNodes, nodes, edges) {
  const reroutes = deletedNodes.filter(isPassThrough)
  if (!reroutes.length) return []

  const deletedIds = new Set(deletedNodes.map(node => node.id))

  // Only the reroutes going away are transparent here: one that survives is a
  // legitimate source, and rewiring past it would undo the user's tidying
  const skip = node => isPassThrough(node) && deletedIds.has(node.id)

  const bridges = []

  for (const reroute of reroutes) {
    const [upstream] = resolveUpstream(reroute.id, nodes, edges, { skip })

    // Nothing feeding it, or its producer is on the way out too
    if (!upstream || deletedIds.has(upstream.node.id)) continue

    for (const edge of edges) {
      if (edge.source !== reroute.id) continue
      if (deletedIds.has(edge.target)) continue

      const bridge = {
        source: upstream.node.id,
        sourceHandle: upstream.sourceHandle,
        target: edge.target,
        targetHandle: edge.targetHandle
      }

      // VueFlow dedupes against the edges already in the store, not within the
      // batch it is handed, so the same bridge reached through two deleted
      // reroutes has to be caught here
      if (bridges.some(existing => isSameConnection(existing, bridge))) continue

      bridges.push(bridge)
    }
  }

  return bridges
}
