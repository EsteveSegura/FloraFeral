import { PORT_TYPES } from './node-shapes'
import nodeRegistry from './node-registry'

/**
 * Get the PORT_TYPE for an edge connection
 * @param {Object} edge - Edge object with sourceHandle/targetHandle
 * @param {Array} nodes - Array of all nodes
 * @param {Object} registry - Node registry instance
 * @param {boolean} isSource - True for source port, false for target port
 * @returns {string|null} PORT_TYPE ('image', 'prompt') or null
 */
export function getEdgePortType(edge, nodes, registry, isSource = true) {
  const nodeId = isSource ? edge.source : edge.target
  const handleId = isSource ? edge.sourceHandle : edge.targetHandle

  if (!nodeId || !handleId) return null

  const node = nodes.find(n => n.id === nodeId)
  if (!node) return null

  const nodeDef = registry.getNodeDef(node.type)
  if (!nodeDef) return null

  // Parse handle index (e.g., "output-0" -> 0)
  const handleIndex = parseInt(handleId.split('-')[1])
  if (isNaN(handleIndex)) return null

  // Get port types array
  const portTypes = isSource ? nodeDef.outputs : nodeDef.inputs

  return portTypes[handleIndex] || null
}

/**
 * Validates if two port types are compatible to connect (private)
 * @param {string} sourcePortType - Output port type
 * @param {string} targetPortType - Input port type
 * @returns {boolean} true if compatible, false otherwise
 */
function canConnect(sourcePortType, targetPortType) {
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
    const sourcePortType = getEdgePortType(connection, allNodes.length > 0 ? allNodes : [sourceNode, targetNode], nodeRegistry, true)
    const targetPortType = getEdgePortType(connection, allNodes.length > 0 ? allNodes : [sourceNode, targetNode], nodeRegistry, false)

    if (sourcePortType && targetPortType) {
      if (sourcePortType !== targetPortType) {
        return {
          valid: false,
          reason: `Incompatible port types: ${sourcePortType} → ${targetPortType}`
        }
      }
    }
  }

  // Prevent duplicate connections (same source and target)
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
