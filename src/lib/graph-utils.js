/**
 * Graph Utilities for Workflow Execution
 * Provides topological sorting and cycle detection
 */

/**
 * Build a dependency graph (adjacency list) from nodes and edges
 * @param {Array} nodes - Array of node objects with id property
 * @param {Array} edges - Array of edge objects with source and target properties
 * @returns {Object} - { adjacencyList, inDegree, nodeIds }
 */
function buildDependencyGraph(nodes, edges) {
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
