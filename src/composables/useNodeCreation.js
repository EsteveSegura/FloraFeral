/**
 * Composable for Node Creation
 * Handles creating nodes at specific positions with proper configuration
 */

import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import { ensureUniqueLabel } from '@/lib/node-label'
import replicateService from '@/services/replicate'

export function useNodeCreation(flowStore) {
  /**
   * Create a node at a specific position
   * @param {string} nodeType - Type of node to create
   * @param {object} position - Position {x, y} in canvas coordinates
   */
  function createNodeAtPosition(nodeType, position) {
    // Get node definition from registry
    const nodeDef = nodeRegistry.getNodeDef(nodeType)
    if (!nodeDef) {
      console.error(`Node type ${nodeType} not found in registry`)
      return
    }

    // Get IO configuration for this node type
    const ioConfig = getNodeIOConfig(nodeType)

    // Create node data. Labels name the batch columns, so they must be unique
    const data = {
      label: ensureUniqueLabel(`New ${nodeDef.label}`, flowStore.nodes)
    }

    // Add prompt field and model params for generator nodes
    if (nodeType === NODE_TYPES.IMAGE_GENERATOR) {
      data.prompt = ''
      data.model = 'nano-banana-pro'
      data.params = replicateService.getModelDefaults('nano-banana-pro')
    }

    // Add prompt field and model params for text generator nodes
    if (nodeType === NODE_TYPES.TEXT_GENERATOR) {
      data.prompt = ''
      data.model = 'gpt-5'
      data.params = replicateService.getModelDefaults('gpt-5')
    }

    // Add prompt field and model params for video generator nodes
    if (nodeType === NODE_TYPES.VIDEO_GENERATOR) {
      data.prompt = ''
      data.model = 'p-video'
      data.params = replicateService.getModelDefaults('p-video')
    }

    // Add prompt field for prompt nodes
    if (nodeType === NODE_TYPES.PROMPT) {
      data.prompt = ''
    }

    // Add comment field for comment nodes
    if (nodeType === NODE_TYPES.COMMENT) {
      data.comment = ''
    }

    // Create new node using the schema
    const newNode = createNode(
      `node_${Date.now()}`,
      nodeType,
      position,
      data,
      ioConfig
    )

    // Mutate store array directly - preserves component instances
    flowStore.nodes.push(newNode)

    return newNode
  }

  return {
    createNodeAtPosition
  }
}
