/**
 * OpenAI GPT IMAGE 2 Model Configuration
 * Model: openai/gpt-image-2
 */

import { useSettingsStore } from '@/stores/settings'

export const GPT_IMAGE_2 = {
  id: 'gpt-image-2',
  name: 'GPT Image 2',
  owner: 'openai',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/openai/gpt-image-2/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    aspect_ratio: '1:1',
    number_of_images: 1,
    quality: 'auto',
    background: 'auto',
    output_compression: 90,
    output_format: 'webp',
    moderation: 'auto'
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    controls: [
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: ['1:1', '3:2', '2:3'],
        default: '1:1'
      },
      {
        key: 'quality',
        label: 'Quality',
        type: 'select',
        enum: ['low', 'medium', 'high', 'auto'],
        default: 'auto'
      },
      {
        key: 'background',
        label: 'Background',
        type: 'select',
        enum: ['auto', 'transparent', 'opaque'],
        default: 'auto'
      },
      {
        key: 'output_format',
        label: 'Output Format',
        type: 'select',
        enum: ['webp', 'png', 'jpeg'],
        default: 'webp'
      }
    ],

    /**
     * Secondary options, rendered in the node options side panel
     */
    advancedControls: [
      {
        key: 'number_of_images',
        label: 'Number of images',
        type: 'number',
        min: 1,
        max: 10,
        default: 1,
        description: 'The node shows the first one; the rest come back in the same response'
      },
      {
        key: 'output_compression',
        label: 'Output compression',
        type: 'number',
        min: 0,
        max: 100,
        default: 90,
        description: 'Compression level as a percentage'
      },
      {
        key: 'moderation',
        label: 'Moderation',
        type: 'select',
        enum: ['auto', 'low'],
        default: 'auto',
        description: 'Content moderation level applied by OpenAI'
      },
      {
        key: 'user_id',
        label: 'User id',
        type: 'text',
        default: '',
        placeholder: 'Optional',
        description: 'Identifier for your end user, so OpenAI can trace abuse back to them'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    aspect_ratio: ['1:1', '3:2', '2:3'],
    quality: ['low', 'medium', 'high', 'auto'],
    background: ['auto', 'transparent', 'opaque'],
    moderation: ['auto', 'low'],
    output_format: ['png', 'jpeg', 'webp']
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {Array<string>} [options.imageInput] - Input images
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    const input = {
      prompt: prompt.trim(),
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      number_of_images: params.number_of_images || this.defaults.number_of_images,
      quality: params.quality || this.defaults.quality,
      background: params.background || this.defaults.background,
      output_compression: params.output_compression || this.defaults.output_compression,
      output_format: params.output_format || this.defaults.output_format,
      moderation: params.moderation || this.defaults.moderation
    }

    // OpenAI API key is optional: when provided, OpenAI bills the user directly,
    // otherwise the request runs through Replicate's own credentials
    const settingsStore = useSettingsStore()
    const openaiApiKey = settingsStore.getOpenaiApiKey()

    if (openaiApiKey) {
      input.openai_api_key = openaiApiKey
    }

    // Add input images if provided
    if (imageInput.length > 0) {
      input.input_images = imageInput
    }

    // Add optional user_id if provided
    if (params.user_id) {
      input.user_id = params.user_id
    }

    return input
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    const validated = {}

    if (params.aspect_ratio && !this.validValues.aspect_ratio.includes(params.aspect_ratio)) {
      throw new Error(`Invalid aspect_ratio. Must be one of: ${this.validValues.aspect_ratio.join(', ')}`)
    }

    if (params.quality && !this.validValues.quality.includes(params.quality)) {
      throw new Error(`Invalid quality. Must be one of: ${this.validValues.quality.join(', ')}`)
    }

    if (params.background && !this.validValues.background.includes(params.background)) {
      throw new Error(`Invalid background. Must be one of: ${this.validValues.background.join(', ')}`)
    }

    if (params.moderation && !this.validValues.moderation.includes(params.moderation)) {
      throw new Error(`Invalid moderation. Must be one of: ${this.validValues.moderation.join(', ')}`)
    }

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    if (params.number_of_images !== undefined) {
      const num = parseInt(params.number_of_images)
      if (isNaN(num) || num < 1 || num > 10) {
        throw new Error('number_of_images must be between 1 and 10')
      }
      validated.number_of_images = num
    }

    if (params.output_compression !== undefined) {
      const comp = parseInt(params.output_compression)
      if (isNaN(comp) || comp < 0 || comp > 100) {
        throw new Error('output_compression must be between 0 and 100')
      }
      validated.output_compression = comp
    }

    return {
      aspect_ratio: params.aspect_ratio,
      quality: params.quality,
      background: params.background,
      moderation: params.moderation,
      output_format: params.output_format,
      number_of_images: validated.number_of_images,
      output_compression: validated.output_compression,
      user_id: params.user_id
    }
  },

  /**
   * Parse response from API
   * @param {Object} response - API response
   * @returns {Object} Parsed result
   */
  parseResponse(response) {
    if (!response.output) {
      throw new Error('No output in response')
    }

    // Output is an array of image URLs
    const imageUrls = Array.isArray(response.output)
      ? response.output
      : [response.output]

    // Return the first image URL (for compatibility with existing code)
    // But also include all URLs in the response
    return {
      imageUrl: imageUrls[0],
      imageUrls: imageUrls,
      id: response.id,
      status: response.status,
      model: this.id
    }
  }
}

export default GPT_IMAGE_2
