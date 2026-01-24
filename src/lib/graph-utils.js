/**
 * Graph Utilities for Workflow Execution
 * Provides topological sorting, cycle detection, and dependency analysis
 */

/**
 * Build a dependency graph (adjacency list) from nodes and edges
 * @param {Array} nodes - Array of node objects with id property
 * @param {Array} edges - Array of edge objects with source and target properties
 * @returns {Object} - { adjacencyList, inDegree, nodeIds }
 */
export function buildDependencyGraph(nodes, edges) {
  const nodeIds = new Set(nodes.map(n => n.id))
  const adjacencyList = new Map() // nodeId -> Set of downstream node ids
  const inDegree = new Map() // nodeId -> number of incoming edges

  // Initialize all nodes
  for (const nodeId of nodeIds) {
    adjacencyList.set(nodeId, new Set())
    inDegree.set(nodeId, 0)
  }

  // Build adjacency list and count in-degrees
  for (const edge of edges) {
    const { source, target } = edge

    // Skip edges with nodes not in our set
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue

    adjacencyList.get(source).add(target)
    inDegree.set(target, inDegree.get(target) + 1)
  }

  return { adjacencyList, inDegree, nodeIds }
}

/**
 * Get direct dependencies (upstream nodes) for a specific node
 * @param {string} nodeId - The node to find dependencies for
 * @param {Array} edges - Array of edge objects
 * @returns {Array<string>} - Array of upstream node IDs
 */
export function getNodeDependencies(nodeId, edges) {
  return edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source)
}

/**
 * Get direct dependents (downstream nodes) for a specific node
 * @param {string} nodeId - The node to find dependents for
 * @param {Array} edges - Array of edge objects
 * @returns {Array<string>} - Array of downstream node IDs
 */
export function getNodeDependents(nodeId, edges) {
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => edge.target)
}

/**
 * Perform topological sort using Kahn's algorithm
 * Returns nodes organized by execution levels (nodes in same level can run in parallel)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} - { levels: Array<Array<string>>, sorted: Array<string>, hasCycle: boolean }
 */
export function topologicalSort(nodes, edges) {
  const { adjacencyList, inDegree, nodeIds } = buildDependencyGraph(nodes, edges)

  const levels = [] // Array of arrays, each containing node IDs at that level
  const sorted = [] // Flat array of sorted node IDs
  const inDegreeCopy = new Map(inDegree) // Work with a copy

  // Find all nodes with no dependencies (in-degree 0)
  let currentLevel = []
  for (const [nodeId, degree] of inDegreeCopy) {
    if (degree === 0) {
      currentLevel.push(nodeId)
    }
  }

  while (currentLevel.length > 0) {
    levels.push([...currentLevel])
    sorted.push(...currentLevel)

    const nextLevel = []

    for (const nodeId of currentLevel) {
      // For each downstream node, reduce its in-degree
      for (const downstream of adjacencyList.get(nodeId)) {
        const newDegree = inDegreeCopy.get(downstream) - 1
        inDegreeCopy.set(downstream, newDegree)

        if (newDegree === 0) {
          nextLevel.push(downstream)
        }
      }
    }

    currentLevel = nextLevel
  }

  // Check if all nodes were processed (no cycle)
  const hasCycle = sorted.length !== nodeIds.size

  return { levels, sorted, hasCycle }
}

/**
 * Detect cycles in the graph using DFS
 * Returns detailed information about the cycle if found
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @returns {Object} - { hasCycle: boolean, cyclePath: Array<string> | null }
 */
export function detectCycles(nodes, edges) {
  const { adjacencyList, nodeIds } = buildDependencyGraph(nodes, edges)

  const WHITE = 0 // Not visited
  const GRAY = 1  // Currently in recursion stack (visiting)
  const BLACK = 2 // Completely processed

  const color = new Map()
  const parent = new Map()

  for (const nodeId of nodeIds) {
    color.set(nodeId, WHITE)
    parent.set(nodeId, null)
  }

  let cyclePath = null

  function dfs(nodeId) {
    color.set(nodeId, GRAY)

    for (const neighbor of adjacencyList.get(nodeId)) {
      if (color.get(neighbor) === GRAY) {
        // Found a cycle! Reconstruct the path
        cyclePath = [neighbor]
        let current = nodeId
        while (current !== neighbor) {
          cyclePath.unshift(current)
          current = parent.get(current)
        }
        cyclePath.unshift(neighbor) // Complete the cycle
        return true
      }

      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, nodeId)
        if (dfs(neighbor)) return true
      }
    }

    color.set(nodeId, BLACK)
    return false
  }

  for (const nodeId of nodeIds) {
    if (color.get(nodeId) === WHITE) {
      if (dfs(nodeId)) {
        return { hasCycle: true, cyclePath }
      }
    }
  }

  return { hasCycle: false, cyclePath: null }
}

/**
 * Find nodes that are ready to execute (all dependencies satisfied)
 * @param {Array} nodes - Array of node objects
 * @param {Array} edges - Array of edge objects
 * @param {Set<string>} executedNodes - Set of already executed node IDs
 * @returns {Array<string>} - Array of node IDs ready to execute
 */
export function findExecutableNodes(nodes, edges, executedNodes) {
  const executableNodes = []

  for (const node of nodes) {
    // Skip already executed nodes
    if (executedNodes.has(node.id)) continue

    // Get all dependencies
    const dependencies = getNodeDependencies(node.id, edges)

    // Check if all dependencies are satisfied
    const allDependenciesMet = dependencies.every(depId => executedNodes.has(depId))

    if (allDependenciesMet) {
      executableNodes.push(node.id)
    }
  }

  return executableNodes
}

/**
 * Get all upstream nodes (transitive dependencies) for a node
 * @param {string} nodeId - Starting node ID
 * @param {Array} edges - Array of edge objects
 * @returns {Set<string>} - Set of all upstream node IDs
 */
export function getAllUpstreamNodes(nodeId, edges) {
  const upstream = new Set()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()
    const deps = getNodeDependencies(current, edges)

    for (const dep of deps) {
      if (!upstream.has(dep)) {
        upstream.add(dep)
        queue.push(dep)
      }
    }
  }

  return upstream
}

/**
 * Get all downstream nodes (transitive dependents) for a node
 * @param {string} nodeId - Starting node ID
 * @param {Array} edges - Array of edge objects
 * @returns {Set<string>} - Set of all downstream node IDs
 */
export function getAllDownstreamNodes(nodeId, edges) {
  const downstream = new Set()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()
    const deps = getNodeDependents(current, edges)

    for (const dep of deps) {
      if (!downstream.has(dep)) {
        downstream.add(dep)
        queue.push(dep)
      }
    }
  }

  return downstream
}

/**
 * Get execution order for a subset of nodes (e.g., from a selected node)
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @param {string} startNodeId - Node to start execution from
 * @returns {Object} - { levels, sorted, hasCycle }
 */
export function getExecutionOrderFrom(nodes, edges, startNodeId) {
  // Get all downstream nodes including the start node
  const relevantNodeIds = new Set([startNodeId])
  const downstream = getAllDownstreamNodes(startNodeId, edges)
  for (const id of downstream) {
    relevantNodeIds.add(id)
  }

  // Filter nodes and edges to only include relevant ones
  const relevantNodes = nodes.filter(n => relevantNodeIds.has(n.id))
  const relevantEdges = edges.filter(e =>
    relevantNodeIds.has(e.source) && relevantNodeIds.has(e.target)
  )

  return topologicalSort(relevantNodes, relevantEdges)
}
