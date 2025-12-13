/**
 * Node Registration
 * Register all available node types with the registry
 */

import nodeRegistry from './node-registry'
import { NODE_TYPES, PORT_TYPES } from './node-shapes'
import ImageNode from '@/components/nodes/ImageNode.vue'
import ImageGeneratorNode from '@/components/nodes/ImageGeneratorNode.vue'
import PromptNode from '@/components/nodes/PromptNode.vue'
import DiffNode from '@/components/nodes/DiffNode.vue'
import ImageCompareNode from '@/components/nodes/ImageCompareNode.vue'
import TextGeneratorNode from '@/components/nodes/TextGeneratorNode.vue'

/**
 * Register all available node types
 */
export function registerAllNodes() {
  // Register Image Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.IMAGE,
    label: 'Image',
    description: 'Source image node - upload and use images as input for other nodes',
    inputs: [],
    outputs: [PORT_TYPES.IMAGE],
    component: ImageNode,
    config: {
      category: 'Input',
      color: '#4CAF50'
    }
  })

  // Register Image Generator Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.IMAGE_GENERATOR,
    label: 'Image Generator',
    description: 'Generate images using AI based on a text prompt',
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.PROMPT],
    outputs: [PORT_TYPES.IMAGE],
    component: ImageGeneratorNode,
    config: {
      category: 'Generator',
      color: '#2196F3'
    }
  })

  // Register Prompt Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.PROMPT,
    label: 'Prompt',
    description: 'Text prompt node - provide prompts for image generation',
    inputs: [],
    outputs: [PORT_TYPES.PROMPT],
    component: PromptNode,
    config: {
      category: 'Input',
      color: '#9C27B0'
    }
  })

  // Register Diff Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.DIFF,
    label: 'Image Diff',
    description: 'Compare two images and visualize differences with inverted colors',
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.IMAGE],
    outputs: [],
    component: DiffNode,
    config: {
      category: 'Processing',
      color: '#FF9800'
    }
  })

  // Register Image Compare Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.COMPARE,
    label: 'Image Compare',
    description: 'Compare two images side-by-side with an interactive slider',
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.IMAGE],
    outputs: [],
    component: ImageCompareNode,
    config: {
      category: 'Processing',
      color: '#00BCD4'
    }
  })

  // Register Text Generator Node
  nodeRegistry.registerNode({
    type: NODE_TYPES.TEXT_GENERATOR,
    label: 'Text Generator',
    description: 'Generate text using GPT-5 with optional image and prompt inputs',
    inputs: [PORT_TYPES.IMAGE, PORT_TYPES.PROMPT],
    outputs: [PORT_TYPES.PROMPT],
    component: TextGeneratorNode,
    config: {
      category: 'Generator',
      color: '#E91E63'
    }
  })

  console.log('[NodeRegistry] All nodes registered successfully')
}

export default nodeRegistry
