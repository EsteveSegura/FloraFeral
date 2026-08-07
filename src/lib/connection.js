import { NODE_TYPES, PORT_TYPES } from './node-shapes'
import nodeRegistry from './node-registry'
import { getDeclaredPortType } from './ports'
import { isPassThrough, resolveRerouteType } from './upstream'

/**
 * Get the PORT_TYPE for an edge connection
 * @param {Object} edge - Edge object with sourceHandle/targetHandle
 * @param {Array} nodes - Array of all nodes
 * @param {Object} registry - Node registry instance
 * @param {boolean} isSource - True for source port, false for target port
 * @param {Array} [edges] - All edges. Needed to resolve what a reroute carries;
 *   without it a reroute reports the wildcard
 * @returns {string|null} PORT_TYPE ('image', 'prompt') or null
 */
export function getEdgePortType(edge, nodes, registry, isSource = true, edges = null) {
  const nodeId = isSource ? edge.source : edge.target
  const handleId = isSource ? edge.sourceHandle : edge.targetHandle

  if (!nodeId || !handleId) return null

  const node = nodes.find(n => n.id === nodeId)
  if (!node) return null

  const declared = getDeclaredPortType(node.type, handleId, isSource, registry)

  // A reroute declares the wildcard on both sides: swap it for the type it is
  // actually carrying, and keep the wildcard while nothing feeds it so it
  // still accepts anything
  if (declared === PORT_TYPES.ANY && isPassThrough(node) && edges) {
    return resolveRerouteType(node.id, nodes, edges) || PORT_TYPES.ANY
  }

  return declared
}

/**
 * Get the PORT_TYPE of a single handle from the registry
 * Handle IDs follow the `input-<index>` / `output-<index>` convention
 * @param {string} nodeType - Node type
 * @param {string} handleId - Handle ID (e.g., "output-0")
 * @param {string} handleType - VueFlow handle type ('source' or 'target')
 * @returns {string|null} PORT_TYPE ('image', 'prompt') or null
 */
export function getHandlePortType(nodeType, handleId, handleType) {
  return getDeclaredPortType(nodeType, handleId, handleType === 'source', nodeRegistry)
}

/**
 * Validates if two port types are compatible to connect (private)
 * @param {string} sourcePortType - Output port type
 * @param {string} targetPortType - Input port type
 * @returns {boolean} true if compatible, false otherwise
 */
function canConnect(sourcePortType, targetPortType) {
  // A reroute reports the wildcard only while nothing feeds it: once it is
  // carrying something, getEdgePortType hands out the concrete type and this
  // goes back to being a strict equality
  if (sourcePortType === PORT_TYPES.ANY || targetPortType === PORT_TYPES.ANY) return true

  // Ports must be of the same type to connect
  return sourcePortType === targetPortType
}

/**
 * List the node types that can connect to a given port
 * Used when a connection is dropped on empty canvas: the menu only offers
 * the nodes that are actually connectable, once each, wired to their first
 * compatible port
 * @param {string} portType - PORT_TYPE of the port the connection started from
 * @param {string} handleType - Handle type of the origin ('source' or 'target')
 * @returns {Array<Object>} Options: { nodeType, label, handleId, portType }
 */
export function getCompatibleConnectionOptions(portType, handleType) {
  if (!portType) return []

  // Dragging from an output looks for inputs, and the other way around
  const lookingForInputs = handleType === 'source'
  const handlePrefix = lookingForInputs ? 'input' : 'output'

  const options = []

  nodeRegistry.listNodes().forEach(nodeDef => {
    if (nodeDef.config?.hidden) return

    const portTypes = lookingForInputs ? nodeDef.inputs : nodeDef.outputs
    const portIndex = portTypes.findIndex(type => canConnect(portType, type))
    if (portIndex === -1) return

    options.push({
      nodeType: nodeDef.type,
      label: nodeDef.label,
      handleId: `${handlePrefix}-${portIndex}`,
      portType: portTypes[portIndex]
    })
  })

  return options
}

/**
 * Validates if two nodes can connect based on their types
 * Uses NodeRegistry to get node definitions
 * @param {string} sourceNodeType - Source node type
 * @param {string} targetNodeType - Target node type
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function canNodesConnect(sourceNodeType, targetNodeType) {
  // Get node definitions from registry
  const sourceDef = nodeRegistry.getNodeDef(sourceNodeType)
  const targetDef = nodeRegistry.getNodeDef(targetNodeType)

  // Check if node types are registered
  if (!sourceDef) {
    return {
      valid: false,
      reason: `Source node type "${sourceNodeType}" not found in registry`
    }
  }

  if (!targetDef) {
    return {
      valid: false,
      reason: `Target node type "${targetNodeType}" not found in registry`
    }
  }

  // Check if source node has outputs
  if (!sourceDef.outputs || sourceDef.outputs.length === 0) {
    return {
      valid: false,
      reason: 'Source node has no output ports'
    }
  }

  // Check if target node has inputs
  if (!targetDef.inputs || targetDef.inputs.length === 0) {
    return {
      valid: false,
      reason: 'Target node has no input ports'
    }
  }

  // Check if there's at least one compatible port type
  const hasCompatiblePort = sourceDef.outputs.some(outputType =>
    targetDef.inputs.some(inputType => canConnect(outputType, inputType))
  )

  if (!hasCompatiblePort) {
    return {
      valid: false,
      reason: 'Nodes have no compatible ports'
    }
  }

  return { valid: true }
}

/**
 * Validates a complete connection between two nodes
 * @param {Object} connection - Connection object
 * @param {string} connection.source - Source node ID
 * @param {string} connection.target - Target node ID
 * @param {string} connection.sourceHandle - Source handle ID
 * @param {string} connection.targetHandle - Target handle ID
 * @param {Object} sourceNode - Complete source node
 * @param {Object} targetNode - Complete target node
 * @param {Array} existingEdges - Array of existing edges
 * @param {Array} allNodes - Array of all nodes (for getEdgePortType)
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateConnection(connection, sourceNode, targetNode, existingEdges = [], allNodes = []) {
  // Validate that nodes exist
  if (!sourceNode) {
    return {
      valid: false,
      reason: 'Source node not found'
    }
  }

  if (!targetNode) {
    return {
      valid: false,
      reason: 'Target node not found'
    }
  }

  // Prevent self-connections
  if (connection.source === connection.target) {
    return {
      valid: false,
      reason: 'Cannot connect a node to itself'
    }
  }

  // Check node type compatibility (general check)
  const nodesCompatibility = canNodesConnect(sourceNode.type, targetNode.type)
  if (!nodesCompatibility.valid) {
    return nodesCompatibility
  }

  // IMPORTANT: Validate specific port types if handles are provided
  if (connection.sourceHandle && connection.targetHandle) {
    const pool = allNodes.length > 0 ? allNodes : [sourceNode, targetNode]

    // Passing the edges is what lets a reroute be typed from the graph, so a
    // chain of them resolves correctly mid-drag
    const sourcePortType = getEdgePortType(connection, pool, nodeRegistry, true, existingEdges)
    const targetPortType = getEdgePortType(connection, pool, nodeRegistry, false, existingEdges)

    if (sourcePortType && targetPortType && !canConnect(sourcePortType, targetPortType)) {
      return {
        valid: false,
        reason: `Incompatible port types: ${sourcePortType} → ${targetPortType}`
      }
    }
  }

  // A reroute forwards exactly one signal: with several inputs both the type it
  // carries and the value it hands on would be arbitrary
  if (targetNode.type === NODE_TYPES.REROUTE) {
    const alreadyFed = existingEdges.some(edge => edge.target === connection.target)

    if (alreadyFed) {
      return {
        valid: false,
        reason: 'A reroute already has an input'
      }
    }
  }

  // Prevent duplicate connections (same wire, handles included)
  // Comparing the target handle too is what lets one source feed two different
  // inputs of the same node, which the two image inputs of Diff and Compare
  // have always been meant to allow
  const isDuplicate = existingEdges.some(
    edge => edge.source === connection.source &&
      edge.target === connection.target &&
      (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
  )

  if (isDuplicate) {
    return {
      valid: false,
      reason: 'This connection already exists'
    }
  }

  // Check if target node has reached max incoming connections
  // (For now we allow multiple connections, but this could be limited in the future)

  return { valid: true }
}
