/**
 * Flow Import/Export utilities
 * Handles serialization and deserialization of flow canvas state
 */

export const FLOW_VERSION = '1.0.0'
const LEGACY_VERSION = '0.0.0'

/**
 * Parse a semver string into { major, minor, patch }
 */
function parseSemver(version) {
  const parts = version.split('.').map(Number)
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
}

/**
 * Compare two semver strings.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareSemver(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] < pb[key]) return -1
    if (pa[key] > pb[key]) return 1
  }
  return 0
}

/**
 * Migration registry. Each entry has { from, to, migrate(flowData) }.
 * Migrations run sequentially on flows with version >= from and < to.
 *
 * Example:
 * { from: '1.0.0', to: '1.1.0', migrate(flowData) { flowData.nodes.forEach(n => n.data.newField ??= null) } }
 */
const migrations = []

/**
 * Run applicable migrations on flowData, mutating it in place.
 * Updates flowData.version to FLOW_VERSION when done.
 */
function migrateFlow(flowData) {
  for (const m of migrations) {
    if (compareSemver(flowData.version, m.from) >= 0 && compareSemver(flowData.version, m.to) < 0) {
      m.migrate(flowData)
      flowData.version = m.to
    }
  }
  return flowData
}

/**
 * Export current flow state to JSON
 * @param {Object} flowStore - Pinia flow store instance
 * @returns {Object} Serialized flow data
 */
export function exportFlow(flowStore) {
  return {
    version: FLOW_VERSION,
    createdAt: new Date().toISOString(),
    nodes: flowStore.nodes.map(node => {
      const exported = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        io: node.io
      }

      // Include nesting/grouping properties (only if they exist)
      if (node.parentNode !== undefined) exported.parentNode = node.parentNode
      if (node.extent !== undefined) exported.extent = node.extent
      if (node.expandParent !== undefined) exported.expandParent = node.expandParent
      if (node.style !== undefined) exported.style = node.style
      if (node.class !== undefined) exported.class = node.class

      return exported
    }),
    edges: flowStore.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }))
  }
}

/**
 * Validate imported flow structure
 * @param {Object} flowData - Imported flow data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateFlow(flowData) {
  const errors = []

  // Check basic structure
  if (!flowData || typeof flowData !== 'object') {
    errors.push('Flow data must be an object')
    return { valid: false, errors }
  }

  // Normalize version — legacy files may not have one
  if (!flowData.version || typeof flowData.version !== 'string') {
    flowData.version = LEGACY_VERSION
  }

  // Normalize createdAt — legacy files may not have one
  if (!flowData.createdAt || typeof flowData.createdAt !== 'string') {
    flowData.createdAt = new Date().toISOString()
  }

  // Check nodes array
  if (!Array.isArray(flowData.nodes)) {
    errors.push('Nodes must be an array')
  } else {
    flowData.nodes.forEach((node, index) => {
      if (!node.id || typeof node.id !== 'string') {
        errors.push(`Node ${index}: missing or invalid id`)
      }
      if (!node.type || typeof node.type !== 'string') {
        errors.push(`Node ${index}: missing or invalid type`)
      }
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        errors.push(`Node ${index}: missing or invalid position`)
      }
      if (!node.data || typeof node.data !== 'object') {
        errors.push(`Node ${index}: missing or invalid data`)
      }
    })
  }

  // Check edges array
  if (!Array.isArray(flowData.edges)) {
    errors.push('Edges must be an array')
  } else {
    flowData.edges.forEach((edge, index) => {
      if (!edge.id || typeof edge.id !== 'string') {
        errors.push(`Edge ${index}: missing or invalid id`)
      }
      if (!edge.source || typeof edge.source !== 'string') {
        errors.push(`Edge ${index}: missing or invalid source`)
      }
      if (!edge.target || typeof edge.target !== 'string') {
        errors.push(`Edge ${index}: missing or invalid target`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Import flow from JSON data
 * @param {Object} flowData - Imported flow data
 * @param {Object} flowStore - Pinia flow store instance
 * @param {Object} vueFlowHelpers - VueFlow composable helpers (addEdges)
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export async function importFlow(flowData, flowStore, vueFlowHelpers = {}) {
  // Validate flow structure
  const validation = validateFlow(flowData)

  if (!validation.valid) {
    console.error('Flow validation failed:', validation.errors)
    return {
      success: false,
      error: `Invalid flow format: ${validation.errors.join(', ')}`
    }
  }

  // Run migrations to bring flow data up to current version
  migrateFlow(flowData)

  try {
    // Clear current flow first (maintains array references)
    flowStore.nodes.splice(0, flowStore.nodes.length)
    flowStore.edges.splice(0, flowStore.edges.length)

    // Import nodes (push to maintain reference)
    const importedNodes = flowData.nodes.map(node => {
      const imported = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        io: node.io
      }

      // Include nesting/grouping properties (only if they exist)
      if (node.parentNode !== undefined) imported.parentNode = node.parentNode
      if (node.extent !== undefined) imported.extent = node.extent
      if (node.expandParent !== undefined) imported.expandParent = node.expandParent
      if (node.style !== undefined) imported.style = node.style
      if (node.class !== undefined) imported.class = node.class

      return imported
    })
    flowStore.nodes.push(...importedNodes)

    // Wait for Vue to process nodes before adding edges
    // This is critical for VueFlow to recognize node references
    await new Promise(resolve => setTimeout(resolve, 100))

    // Import edges using VueFlow's addEdges if available, otherwise push directly
    const importedEdges = flowData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    }))

    if (vueFlowHelpers.addEdges) {
      // Use VueFlow's addEdges for proper internal state management
      vueFlowHelpers.addEdges(importedEdges)
    } else {
      // Fallback to direct push
      flowStore.edges.push(...importedEdges)
    }

    console.log('Flow imported successfully:', {
      nodes: flowData.nodes.length,
      edges: flowData.edges.length,
      version: flowData.version
    })

    return { success: true }
  } catch (error) {
    console.error('Error importing flow:', error)
    return {
      success: false,
      error: error.message || 'Failed to import flow'
    }
  }
}

/**
 * Download flow as JSON file
 * @param {Object} flowStore - Pinia flow store instance
 * @param {string} filename - Optional filename (default: flow-{timestamp}.json)
 */
export function downloadFlow(flowStore, filename) {
  const flowData = exportFlow(flowStore)
  const json = JSON.stringify(flowData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `flow-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log('Flow exported:', a.download)
}

/**
 * Load flow from file
 * @param {File} file - JSON file to import
 * @param {Object} flowStore - Pinia flow store instance
 * @param {Object} vueFlowHelpers - VueFlow composable helpers (addEdges)
 * @returns {Promise<Object>} { success: boolean, error?: string }
 */
export function loadFlowFromFile(file, flowStore, vueFlowHelpers = {}) {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ success: false, error: 'No file provided' })
      return
    }

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      resolve({ success: false, error: 'File must be a JSON file' })
      return
    }

    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const flowData = JSON.parse(event.target.result)
        const result = await importFlow(flowData, flowStore, vueFlowHelpers)
        resolve(result)
      } catch (error) {
        console.error('Error parsing JSON:', error)
        resolve({
          success: false,
          error: 'Invalid JSON format'
        })
      }
    }

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to read file'
      })
    }

    reader.readAsText(file)
  })
}
