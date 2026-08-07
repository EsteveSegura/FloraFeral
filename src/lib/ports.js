/**
 * Port helpers
 * Handle IDs follow the `input-<index>` / `output-<index>` convention that
 * BaseNode generates, and the index maps 1:1 onto the inputs/outputs arrays a
 * node declares in the registry
 *
 * This lives apart from connection.js so that upstream.js can resolve port
 * types without importing it: connection.js needs upstream.js to resolve what
 * a reroute is carrying, and the two would otherwise import each other
 */

/**
 * Index encoded in a handle ID
 * @param {string} handleId - Handle ID (e.g. "output-0")
 * @returns {number|null} Index, or null when the ID does not carry one
 */
export function getHandleIndex(handleId) {
  if (!handleId) return null

  const index = parseInt(String(handleId).split('-')[1])

  return isNaN(index) ? null : index
}

/**
 * PORT_TYPE a node type declares on one of its handles
 * This is what the registry says, so a reroute always comes back as the
 * wildcard here: resolving what it actually carries is upstream.js's job
 * @param {string} nodeType - Node type
 * @param {string} handleId - Handle ID (e.g. "output-0")
 * @param {boolean} isSource - True for an output handle, false for an input
 * @param {Object} registry - Node registry instance
 * @returns {string|null} PORT_TYPE, or null when the handle does not exist
 */
export function getDeclaredPortType(nodeType, handleId, isSource, registry) {
  if (!nodeType || !handleId) return null

  const nodeDef = registry.getNodeDef(nodeType)
  if (!nodeDef) return null

  const handleIndex = getHandleIndex(handleId)
  if (handleIndex === null) return null

  const portTypes = isSource ? nodeDef.outputs : nodeDef.inputs

  return portTypes[handleIndex] || null
}
