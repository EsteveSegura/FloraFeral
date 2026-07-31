/**
 * Node label utilities
 * Labels are how a human identifies a node: they name the batch table columns,
 * the CSV headers and the files inside the batch ZIP, so two nodes on the same
 * canvas must never share one
 */

/**
 * Strip a trailing " 2" / " 3" so a re-colliding name keeps growing from the
 * same root instead of stacking suffixes ("Scene 2 2")
 * @param {string} label
 * @returns {string} Label without its numeric suffix
 */
function getLabelRoot(label) {
  const match = label.match(/^(.*?)\s+\d+$/)
  return match ? match[1] : label
}

/**
 * Make a label unique among the given nodes by appending an incrementing number
 * @param {string} label - Desired label
 * @param {Array} nodes - All nodes on the canvas
 * @param {string|null} [excludeId] - Node being renamed (its own label is free)
 * @returns {string} The label as-is, or "<label> N" when it was already taken
 */
export function ensureUniqueLabel(label, nodes, excludeId = null) {
  const desired = (label || '').trim()
  if (!desired) return desired

  const taken = new Set(
    (nodes || [])
      .filter(node => node.id !== excludeId)
      .map(node => (node.data?.label || '').trim())
      .filter(Boolean)
  )

  if (!taken.has(desired)) return desired

  const root = getLabelRoot(desired)
  let suffix = 2
  while (taken.has(`${root} ${suffix}`)) suffix++

  return `${root} ${suffix}`
}
