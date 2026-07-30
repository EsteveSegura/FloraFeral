/**
 * Prompt Template utilities
 * Shared {{VARIABLE}} detection and substitution logic used by
 * PromptTemplateNode and the batch executor
 */

const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g

/**
 * Extract the list of {{VARIABLE}} names present in a text
 * Names are trimmed and deduplicated, preserving order of appearance
 * @param {string} text - Text containing {{VARIABLE}} placeholders
 * @returns {Array<string>} Variable names
 */
export function extractVariables(text) {
  if (!text) return []

  const variables = []
  const regex = new RegExp(VARIABLE_REGEX.source, 'g')
  let match

  while ((match = regex.exec(text)) !== null) {
    const variableName = match[1].trim()
    if (!variables.includes(variableName)) {
      variables.push(variableName)
    }
  }

  return variables
}

/**
 * Replace {{VARIABLE}} placeholders with their values
 * Variables without a value (or with an empty one) are removed from the output
 * @param {string} text - Text containing {{VARIABLE}} placeholders
 * @param {Object} values - Map of variableName -> value
 * @returns {string} Resulting text
 */
export function applyVariables(text, values = {}) {
  if (!text) return ''

  let result = text

  for (const variable of extractVariables(text)) {
    const value = values[variable]
    const regex = new RegExp(`\\{\\{\\s*${escapeRegExp(variable)}\\s*\\}\\}`, 'g')

    result = value && value.trim()
      ? result.replace(regex, value)
      : result.replace(regex, '')
  }

  return result
}

/**
 * Escape a string so it can be safely embedded in a RegExp
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
