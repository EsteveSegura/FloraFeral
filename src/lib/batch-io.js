/**
 * Batch IO utilities
 * Defines which nodes can act as batch inputs/outputs and how to read/write
 * their data during a batch run
 */

import { NODE_TYPES, PORT_TYPES } from './node-shapes'
import { resolveUpstream, pickPrompt } from './upstream'
import { extractVariables, applyVariables } from './prompt-template'

/**
 * Roles a node can play in a batch run
 */
export const BATCH_ROLES = {
  INPUT: 'input',
  OUTPUT: 'output'
}

/**
 * Node types usable as batch inputs
 */
const BATCH_INPUT_TYPES = [
  NODE_TYPES.IMAGE,
  NODE_TYPES.PROMPT,
  NODE_TYPES.PROMPT_TEMPLATE
]

/**
 * Node types usable as batch outputs
 */
const BATCH_OUTPUT_TYPES = [
  NODE_TYPES.IMAGE_GENERATOR,
  NODE_TYPES.TEXT_GENERATOR,
  NODE_TYPES.VIDEO_GENERATOR
]

/**
 * Kinds of value a batch cell holds
 */
export const BATCH_VALUE_KINDS = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  VARIABLES: 'variables'
}

/**
 * Kinds whose value is a data URL, packaged as a binary file on export
 */
const BINARY_VALUE_KINDS = [BATCH_VALUE_KINDS.IMAGE, BATCH_VALUE_KINDS.VIDEO]

/**
 * @param {string} kind - BATCH_VALUE_KINDS value
 * @returns {boolean}
 */
export function isBinaryValueKind(kind) {
  return BINARY_VALUE_KINDS.includes(kind)
}

/**
 * @param {string} nodeType
 * @returns {boolean}
 */
export function canBeBatchInput(nodeType) {
  return BATCH_INPUT_TYPES.includes(nodeType)
}

/**
 * @param {string} nodeType
 * @returns {boolean}
 */
export function canBeBatchOutput(nodeType) {
  return BATCH_OUTPUT_TYPES.includes(nodeType)
}

/**
 * Check whether a node can take a given batch role
 * @param {string} nodeType
 * @param {string} role - BATCH_ROLES value
 * @returns {boolean}
 */
export function canTakeBatchRole(nodeType, role) {
  if (role === BATCH_ROLES.INPUT) return canBeBatchInput(nodeType)
  if (role === BATCH_ROLES.OUTPUT) return canBeBatchOutput(nodeType)
  return false
}

/**
 * Get all nodes marked with a given batch role
 * @param {Array} nodes - All nodes
 * @param {string} role - BATCH_ROLES value
 * @returns {Array} Matching nodes
 */
export function getBatchNodes(nodes, role) {
  return nodes.filter(node =>
    node.data?.batchRole === role && canTakeBatchRole(node.type, role)
  )
}

/**
 * Resolve the prompt coming from an upstream node through a PROMPT port
 * Mirrors the `connectedPrompt` computed used by the node components
 * @param {string} nodeId - Target node ID
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {string} Upstream prompt, or empty string
 */
export function resolveUpstreamPrompt(nodeId, nodes, edges) {
  return resolveUpstreamPromptNode(nodeId, nodes, edges)?.data?.prompt || ''
}

/**
 * Find the node feeding a PROMPT port of the given node
 * @param {string} nodeId - Target node ID
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Object|null} Source node, or null
 */
export function resolveUpstreamPromptNode(nodeId, nodes, edges) {
  // The real producer, never a reroute standing in the middle of the wire:
  // BatchRunModal writes the batch rows into whatever comes back from here
  const inputs = resolveUpstream(nodeId, nodes, edges, { portType: PORT_TYPES.PROMPT })

  return inputs.find(input => pickPrompt(input.node))?.node || null
}

/**
 * Describe the batch table columns produced by an input node
 * @param {Object} node - Input node
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @param {Array<string>} [extraVariables] - Extra variable names the table must
 *        expose (templates typed into the rows can declare their own)
 * @returns {Object} { nodeId, label, kind, columns, lockedVariables }
 */
export function getBatchInputSpec(node, nodes, edges, extraVariables = []) {
  const label = node.data?.label || node.type

  if (node.type === NODE_TYPES.PROMPT_TEMPLATE) {
    // The template lives in the upstream node; the editable part are its variables
    const upstream = resolveUpstreamPromptNode(node.id, nodes, edges)
    const template = upstream?.data?.prompt || ''

    // If the upstream prompt is itself a batch input, each row can carry its own
    // template, so the columns must cover every variable any row asks for
    const variables = extractVariables(template)
    for (const extra of extraVariables) {
      if (!variables.includes(extra)) variables.push(extra)
    }

    return {
      nodeId: node.id,
      label,
      kind: BATCH_VALUE_KINDS.VARIABLES,
      template,
      upstreamNodeId: upstream?.id || null,
      columns: variables.map(variable => ({
        key: `${node.id}:${variable}`,
        variable,
        label: `${label} · ${variable}`
      })),
      lockedVariables: []
    }
  }

  if (node.type === NODE_TYPES.IMAGE) {
    return {
      nodeId: node.id,
      label,
      kind: BATCH_VALUE_KINDS.IMAGE,
      columns: [{ key: node.id, label }],
      lockedVariables: []
    }
  }

  // NODE_TYPES.PROMPT
  // If this prompt feeds a template downstream, its {{VARIABLES}} must survive editing
  return {
    nodeId: node.id,
    label,
    kind: BATCH_VALUE_KINDS.TEXT,
    columns: [{ key: node.id, label }],
    lockedVariables: extractVariables(node.data?.prompt)
  }
}

/**
 * Get the initial value for an input node, used to seed the batch table rows
 * @param {Object} node - Input node
 * @returns {string|Object} Initial value
 */
export function getBatchInputInitialValue(node) {
  if (node.type === NODE_TYPES.PROMPT_TEMPLATE) {
    return { ...(node.data?.variables || {}) }
  }

  if (node.type === NODE_TYPES.IMAGE) {
    // Images are held as { name, src }: a CSV can reference a file by name
    // before its bytes have been uploaded
    return { name: node.data?.name || '', src: node.data?.src || null }
  }

  return node.data?.prompt || ''
}

/**
 * Is an image cell ready to run? (it has actual bytes, not just a filename)
 * @param {Object} value - { name, src }
 * @returns {boolean}
 */
export function isImageValueReady(value) {
  return Boolean(value?.src)
}

/**
 * Build the `data` patch that applies a run value to an input node
 * @param {Object} node - Input node
 * @param {string|Object} value - Value from the batch table
 * @param {Array} nodes - All nodes
 * @param {Array} edges - All edges
 * @returns {Object|null} Partial data to merge, or null to leave the node untouched
 */
export function buildBatchInputPatch(node, value, nodes, edges) {
  // No value for this row (e.g. the node was marked after the rows were built):
  // leave the node as the user configured it instead of blanking it out
  if (value === undefined || value === null) {
    return null
  }

  if (node.type === NODE_TYPES.PROMPT_TEMPLATE) {
    const variables = value || {}
    const template = resolveUpstreamPrompt(node.id, nodes, edges)

    // Write the resolved prompt too: PromptTemplateNode derives it from its own
    // local state, so the batch cannot rely on the component recomputing it
    return {
      variables: { ...variables },
      prompt: applyVariables(template, variables)
    }
  }

  if (node.type === NODE_TYPES.IMAGE) {
    if (!value.src) return null

    return { src: value.src, name: value.name || 'batch-input' }
  }

  return { prompt: value || '' }
}

/**
 * Build the `data` patch that clears an output node before a run
 * Clearing is what lets the batch tell "generated nothing" apart from "failed"
 * @param {Object} node - Output node
 * @returns {Object} Partial data to merge into the node
 */
export function buildBatchOutputResetPatch(node) {
  if (node.type === NODE_TYPES.TEXT_GENERATOR) {
    return { generatedText: null, prompt: '', error: null }
  }

  if (node.type === NODE_TYPES.VIDEO_GENERATOR) {
    return { lastOutputVideoSrc: null, error: null }
  }

  return { lastOutputSrc: null, error: null }
}

/**
 * Read the produced output of an output node
 * @param {Object} node - Output node
 * @returns {Object} { kind, value, error }
 */
export function readBatchOutput(node) {
  if (node.type === NODE_TYPES.TEXT_GENERATOR) {
    return {
      kind: BATCH_VALUE_KINDS.TEXT,
      value: node.data?.generatedText || null,
      error: node.data?.error || null
    }
  }

  if (node.type === NODE_TYPES.VIDEO_GENERATOR) {
    return {
      kind: BATCH_VALUE_KINDS.VIDEO,
      value: node.data?.lastOutputVideoSrc || null,
      error: node.data?.error || null
    }
  }

  return {
    kind: BATCH_VALUE_KINDS.IMAGE,
    value: node.data?.lastOutputSrc || null,
    error: node.data?.error || null
  }
}

/**
 * Check whether a node can reach any of the given nodes by following edges
 * downstream. Used to warn about inputs that cannot influence any output —
 * editing them in the table would silently do nothing.
 * @param {string} startNodeId
 * @param {Set<string>} targetIds
 * @param {Array} edges - All edges
 * @returns {boolean}
 */
export function reachesAnyNode(startNodeId, targetIds, edges) {
  if (targetIds.size === 0) return false

  const visited = new Set([startNodeId])
  const queue = [startNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()

    for (const edge of edges) {
      if (edge.source !== currentId || visited.has(edge.target)) continue

      if (targetIds.has(edge.target)) return true

      visited.add(edge.target)
      queue.push(edge.target)
    }
  }

  return false
}

/**
 * Validate a text input value against the variables it must preserve
 * @param {string} value - Edited value
 * @param {Array<string>} lockedVariables - Variables that must remain present
 * @returns {Array<string>} Missing variable names (empty when valid)
 */
export function getMissingVariables(value, lockedVariables = []) {
  if (!lockedVariables.length) return []

  const present = extractVariables(value)
  return lockedVariables.filter(variable => !present.includes(variable))
}
