import { PORT_TYPES } from './node-shapes'
import nodeRegistry from './node-registry'

/**
 * Validates if two port types are compatible to connect
 * @param {string} sourcePortType - Output port type
 * @param {string} targetPortType - Input port type
 * @returns {boolean} true if compatible, false otherwise
 */
export function canConnect(sourcePortType, targetPortType) {
  // Ports must be of the same type to connect
  return sourcePortType === targetPortType
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
 * @param {Object} sourceNode - Complete source node
 * @param {Object} targetNode - Complete target node
 * @param {Array} existingEdges - Array of existing edges
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateConnection(connection, sourceNode, targetNode, existingEdges = []) {
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

  // Check node type compatibility
  const nodesCompatibility = canNodesConnect(sourceNode.type, targetNode.type)
  if (!nodesCompatibility.valid) {
    return nodesCompatibility
  }

  // Prevent duplicate connections
  const isDuplicate = existingEdges.some(
    edge => edge.source === connection.source && edge.target === connection.target
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

/**
 * Gets compatible port types for a given port
 * @param {string} portType - Port type
 * @returns {Array<string>} Array of compatible port types
 */
export function getCompatiblePortTypes(portType) {
  // For now, only ports of the same type are compatible
  // In the future, this could be expanded to support type conversions
  return [portType]
}

/**
 * Validates if a node can receive more incoming connections
 * @param {Object} node - Node to check
 * @param {Array} edges - Array of existing edges
 * @param {number} [maxConnections=Infinity] - Maximum number of allowed connections
 * @returns {boolean}
 */
export function canReceiveMoreConnections(node, edges, maxConnections = Infinity) {
  const incomingConnections = edges.filter(edge => edge.target === node.id)
  return incomingConnections.length < maxConnections
}

/**
 * Validates if a node can send more outgoing connections
 * @param {Object} node - Node to check
 * @param {Array} edges - Array of existing edges
 * @param {number} [maxConnections=Infinity] - Maximum number of allowed connections
 * @returns {boolean}
 */
export function canSendMoreConnections(node, edges, maxConnections = Infinity) {
  const outgoingConnections = edges.filter(edge => edge.source === node.id)
  return outgoingConnections.length < maxConnections
}
