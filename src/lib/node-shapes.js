/**
 * Constants for node types
 */
export const NODE_TYPES = {
  IMAGE: 'image',
  IMAGE_GENERATOR: 'image-generator',
  PROMPT: 'prompt',
  DIFF: 'diff',
  COMPARE: 'compare',
  TEXT_GENERATOR: 'text-generator'
}

/**
 * Constants for port types
 */
export const PORT_TYPES = {
  IMAGE: 'image',
  PROMPT: 'prompt'
}

/**
 * Node schema
 * @typedef {Object} NodeShape
 * @property {string} id - Unique node identifier
 * @property {string} type - Node type (NODE_TYPES)
 * @property {Object} position - Canvas position
 * @property {number} position.x - X coordinate
 * @property {number} position.y - Y coordinate
 * @property {Object} data - Node-specific data
 * @property {string} data.label - Node label
 * @property {Object} io - Input/output configuration
 * @property {Array<string>} io.inputs - Array of input port types
 * @property {Array<string>} io.outputs - Array of output port types
 */

/**
 * Edge/connection schema
 * @typedef {Object} EdgeShape
 * @property {string} id - Unique edge identifier
 * @property {string} source - Source node ID
 * @property {string} target - Target node ID
 * @property {string} [sourceHandle] - Specific source node handle
 * @property {string} [targetHandle] - Specific target node handle
 * @property {string} [type] - Edge type (optional)
 */

/**
 * Creates a node with its complete schema
 * @param {string} id - Node ID
 * @param {string} type - Node type
 * @param {Object} position - Position {x, y}
 * @param {Object} data - Node data
 * @param {Object} io - IO configuration
 * @returns {NodeShape}
 */
export function createNode(id, type, position, data, io) {
  return {
    id,
    type,
    position: {
      x: position.x || 0,
      y: position.y || 0
    },
    data: {
      label: data.label || 'Nodo',
      ...data
    },
    io: {
      inputs: io?.inputs || [],
      outputs: io?.outputs || []
    }
  }
}

/**
 * Creates an edge with its complete schema
 * @param {string} id - Edge ID
 * @param {string} source - Source node ID
 * @param {string} target - Target node ID
 * @param {string} [sourceHandle] - Source handle
 * @param {string} [targetHandle] - Target handle
 * @param {string} [type] - Edge type
 * @returns {EdgeShape}
 */
export function createEdge(id, source, target, sourceHandle = null, targetHandle = null, type = null) {
  const edge = {
    id,
    source,
    target
  }

  if (sourceHandle) edge.sourceHandle = sourceHandle
  if (targetHandle) edge.targetHandle = targetHandle
  if (type) edge.type = type

  return edge
}

/**
 * Validates if a node complies with the schema
 * @param {*} node - Node to validate
 * @returns {boolean}
 */
export function isValidNode(node) {
  if (!node || typeof node !== 'object') return false
  if (!node.id || typeof node.id !== 'string') return false
  if (!node.type || typeof node.type !== 'string') return false
  if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') return false
  if (!node.data || typeof node.data !== 'object') return false
  if (!node.io || !Array.isArray(node.io.inputs) || !Array.isArray(node.io.outputs)) return false

  return true
}

/**
 * Validates if an edge complies with the schema
 * @param {*} edge - Edge to validate
 * @returns {boolean}
 */
export function isValidEdge(edge) {
  if (!edge || typeof edge !== 'object') return false
  if (!edge.id || typeof edge.id !== 'string') return false
  if (!edge.source || typeof edge.source !== 'string') return false
  if (!edge.target || typeof edge.target !== 'string') return false

  return true
}

/**
 * IO configuration definitions per node type
 */
export const NODE_IO_CONFIG = {
  [NODE_TYPES.IMAGE]: {
    inputs: [],
    outputs: [PORT_TYPES.IMAGE]
  },
  [NODE_TYPES.IMAGE_GENERATOR]: {
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.PROMPT],
    outputs: [PORT_TYPES.IMAGE]
  },
  [NODE_TYPES.PROMPT]: {
    inputs: [],
    outputs: [PORT_TYPES.PROMPT]
  },
  [NODE_TYPES.DIFF]: {
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.IMAGE],
    outputs: []
  },
  [NODE_TYPES.COMPARE]: {
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.IMAGE],
    outputs: []
  },
  [NODE_TYPES.TEXT_GENERATOR]: {
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.PROMPT],
    outputs: [PORT_TYPES.PROMPT]
  }
}

/**
 * Gets the IO configuration for a node type
 * @param {string} nodeType - Node type
 * @returns {Object} IO configuration
 */
export function getNodeIOConfig(nodeType) {
  return NODE_IO_CONFIG[nodeType] || { inputs: [], outputs: [] }
}
