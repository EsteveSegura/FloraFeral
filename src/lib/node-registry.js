/**
 * Node Registry
 * Centralized registry for all node types with their metadata and components
 */

/**
 * Node definition structure
 * @typedef {Object} NodeDefinition
 * @property {string} type - Unique node type identifier
 * @property {string} label - Human-readable label for the node
 * @property {string} description - Description of what the node does
 * @property {Array<string>} inputs - Array of input port types
 * @property {Array<string>} outputs - Array of output port types
 * @property {Object} component - Vue component for rendering this node
 * @property {Object} [config] - Additional configuration options
 */

class NodeRegistry {
  constructor() {
    this.nodes = new Map()
  }

  /**
   * Register a new node type
   * @param {NodeDefinition} definition - Node definition
   * @throws {Error} If node type is already registered or definition is invalid
   */
  registerNode(definition) {
    // Validate definition
    if (!definition || typeof definition !== 'object') {
      throw new Error('Node definition must be an object')
    }

    if (!definition.type || typeof definition.type !== 'string') {
      throw new Error('Node definition must have a valid "type" string')
    }

    if (this.nodes.has(definition.type)) {
      throw new Error(`Node type "${definition.type}" is already registered`)
    }

    if (!definition.label || typeof definition.label !== 'string') {
      throw new Error('Node definition must have a valid "label" string')
    }

    if (!Array.isArray(definition.inputs)) {
      throw new Error('Node definition must have an "inputs" array')
    }

    if (!Array.isArray(definition.outputs)) {
      throw new Error('Node definition must have an "outputs" array')
    }

    if (!definition.component) {
      throw new Error('Node definition must have a "component"')
    }

    // Register the node
    this.nodes.set(definition.type, {
      type: definition.type,
      label: definition.label,
      description: definition.description || '',
      inputs: [...definition.inputs],
      outputs: [...definition.outputs],
      component: definition.component,
      config: definition.config || {}
    })

    console.log(`[NodeRegistry] Registered node: ${definition.type}`)
  }

  /**
   * Get node definition by type
   * @param {string} type - Node type
   * @returns {NodeDefinition|null} Node definition or null if not found
   */
  getNodeDef(type) {
    return this.nodes.get(type) || null
  }

  /**
   * Check if a node type is registered
   * @param {string} type - Node type
   * @returns {boolean}
   */
  hasNode(type) {
    return this.nodes.has(type)
  }

  /**
   * List all registered nodes with their definitions
   * @returns {Array<NodeDefinition>} Array of node definitions
   */
  listNodes() {
    return Array.from(this.nodes.values())
  }

  /**
   * Unregister a node type (useful for hot-reloading or testing)
   * @param {string} type - Node type to unregister
   * @returns {boolean} True if node was unregistered, false if not found
   */
  unregisterNode(type) {
    const existed = this.nodes.has(type)
    this.nodes.delete(type)

    if (existed) {
      console.log(`[NodeRegistry] Unregistered node: ${type}`)
    }

    return existed
  }

  /**
   * Clear all registered nodes
   */
  clear() {
    this.nodes.clear()
    console.log('[NodeRegistry] Cleared all registered nodes')
  }

  /**
   * Get component for a node type
   * @param {string} type - Node type
   * @returns {Object|null} Vue component or null if not found
   */
  getNodeComponent(type) {
    const def = this.getNodeDef(type)
    return def ? def.component : null
  }
}

// Create and export singleton instance
const nodeRegistry = new NodeRegistry()

export default nodeRegistry

// Export the class for testing purposes
export { NodeRegistry }
