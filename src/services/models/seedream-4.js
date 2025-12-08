/**
 * ByteDance SeeDream-4 Model Configuration
 * Model: bytedance/seedream-4
 */

export const SEEDREAM_4 = {
  id: 'seedream-4',
  name: 'SeeDream-4',
  owner: 'bytedance',
  version: 'latest',
  endpoint: 'http://localhost:1111/v1/models/bytedance/seedream-4/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    size: '2K',
    aspect_ratio: 'match_input_image',
    width: 2048,
    height: 2048,
    enhance_prompt: true,
    max_images: 1,
    sequential_image_generation: 'disabled'
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'seedream-4',
    label: 'SeeDream-4',
    controls: [
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        enum: ['1K', '2K', '4K', 'custom'],
        default: '2K'
      },
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: [
          'match_input_image',
          '1:1', '4:3', '3:4', '16:9', '9:16',
          '3:2', '2:3', '21:9'
        ],
        default: 'match_input_image'
      },
      {
        key: 'enhance_prompt',
        label: 'Enhance Prompt',
        type: 'checkbox',
        default: true
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    size: ['1K', '2K', '4K', 'custom'],
    aspect_ratio: [
      'match_input_image',
      '1:1', '4:3', '3:4', '16:9', '9:16',
      '3:2', '2:3', '21:9'
    ],
    sequential_image_generation: ['disabled', 'auto']
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {Array<string>} [options.imageInput] - Input images (up to 10)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    if (imageInput.length > 10) {
      throw new Error('Maximum 10 input images are supported')
    }

    const input = {
      prompt: prompt.trim(),
      image_input: imageInput,
      size: params.size || this.defaults.size,
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      enhance_prompt: params.enhance_prompt !== undefined ? params.enhance_prompt : this.defaults.enhance_prompt,
      max_images: params.max_images || this.defaults.max_images,
      sequential_image_generation: params.sequential_image_generation || this.defaults.sequential_image_generation
    }

    // Add width and height only if size is 'custom'
    if (input.size === 'custom') {
      input.width = params.width || this.defaults.width
      input.height = params.height || this.defaults.height
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

    if (params.size && !this.validValues.size.includes(params.size)) {
      throw new Error(`Invalid size. Must be one of: ${this.validValues.size.join(', ')}`)
    }

    if (params.aspect_ratio && !this.validValues.aspect_ratio.includes(params.aspect_ratio)) {
      throw new Error(`Invalid aspect_ratio. Must be one of: ${this.validValues.aspect_ratio.join(', ')}`)
    }

    if (params.sequential_image_generation && !this.validValues.sequential_image_generation.includes(params.sequential_image_generation)) {
      throw new Error(`Invalid sequential_image_generation. Must be one of: ${this.validValues.sequential_image_generation.join(', ')}`)
    }

    if (params.width !== undefined) {
      const width = parseInt(params.width)
      if (isNaN(width) || width < 1024 || width > 4096) {
        throw new Error('Width must be between 1024 and 4096 pixels')
      }
      validated.width = width
    }

    if (params.height !== undefined) {
      const height = parseInt(params.height)
      if (isNaN(height) || height < 1024 || height > 4096) {
        throw new Error('Height must be between 1024 and 4096 pixels')
      }
      validated.height = height
    }

    if (params.max_images !== undefined) {
      const maxImages = parseInt(params.max_images)
      if (isNaN(maxImages) || maxImages < 1 || maxImages > 15) {
        throw new Error('max_images must be between 1 and 15')
      }
      validated.max_images = maxImages
    }

    return {
      size: params.size,
      aspect_ratio: params.aspect_ratio,
      enhance_prompt: params.enhance_prompt,
      width: validated.width,
      height: validated.height,
      max_images: validated.max_images,
      sequential_image_generation: params.sequential_image_generation
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

    // The output can be a single URL or an array of URLs
    const imageUrl = Array.isArray(response.output)
      ? response.output[0]
      : response.output

    return {
      imageUrl,
      id: response.id,
      status: response.status,
      model: this.id,
      allOutputs: Array.isArray(response.output) ? response.output : [response.output]
    }
  }
}

export default SEEDREAM_4
