/**
 * Constants for node types
 */
export const NODE_TYPES = {
  IMAGE: 'image',
  IMAGE_GENERATOR: 'image-generator',
  PROMPT: 'prompt',
  PROMPT_TEMPLATE: 'prompt-template',
  DIFF: 'diff',
  COMPARE: 'compare',
  TEXT_GENERATOR: 'text-generator',
  GROUP: 'group'
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
 * IO configuration definitions per node type (private)
 */
const NODE_IO_CONFIG = {
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
  [NODE_TYPES.PROMPT_TEMPLATE]: {
    inputs: [PORT_TYPES.PROMPT],
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
  },
  [NODE_TYPES.GROUP]: {
    inputs: [],
    outputs: []
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
