/**
 * ByteDance SeeDream-4.5 Model Configuration
 * Model: bytedance/seedream-4.5
 */

export const SEEDREAM_4_5 = {
  id: 'seedream-4.5',
  name: 'SeeDream-4.5',
  owner: 'bytedance',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/bytedance/seedream-4.5/predictions',

  /**
   * Default parameters for the model
   *
   * `max_images` is fixed at 1 and `sequential_image_generation` at 'disabled',
   * neither exposed in the UI: an Image Generator node renders a single output,
   * so any extra image would be billed and then dropped on the floor
   */
  defaults: {
    size: '2K',
    aspect_ratio: 'match_input_image',
    width: 2048,
    height: 2048,
    disable_safety_checker: false,
    max_images: 1,
    sequential_image_generation: 'disabled'
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'seedream-4.5',
    label: 'SeeDream-4.5',
    controls: [
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        // 1K is not supported by this version, unlike SeeDream-4
        enum: ['2K', '4K', 'custom'],
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
      }
    ],

    /**
     * Secondary options, rendered in the node options side panel
     */
    advancedControls: [
      {
        key: 'width',
        label: 'Custom width',
        type: 'number',
        min: 1024,
        max: 4096,
        default: 2048,
        description: 'Only used when Size is set to custom'
      },
      {
        key: 'height',
        label: 'Custom height',
        type: 'number',
        min: 1024,
        max: 4096,
        default: 2048,
        description: 'Only used when Size is set to custom'
      },
      {
        key: 'disable_safety_checker',
        label: 'Disable safety checker',
        type: 'checkbox',
        default: false,
        description: 'Relaxes moderation down to illegal content only. Use responsibly'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    size: ['2K', '4K', 'custom'],
    aspect_ratio: [
      'match_input_image',
      '1:1', '4:3', '3:4', '16:9', '9:16',
      '3:2', '2:3', '21:9'
    ]
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {Array<string>} [options.imageInput] - Input images (up to 14)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    if (imageInput.length > 14) {
      throw new Error('Maximum 14 input images are supported')
    }

    const input = {
      prompt: prompt.trim(),
      image_input: imageInput,
      size: params.size || this.defaults.size,
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      disable_safety_checker: params.disable_safety_checker !== undefined
        ? params.disable_safety_checker
        : this.defaults.disable_safety_checker,
      // Always a single image, see `defaults`
      max_images: this.defaults.max_images,
      sequential_image_generation: this.defaults.sequential_image_generation
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

    return {
      size: params.size,
      aspect_ratio: params.aspect_ratio,
      width: validated.width,
      height: validated.height,
      disable_safety_checker: params.disable_safety_checker
      // max_images and sequential_image_generation are deliberately dropped:
      // buildInput always asks for a single image
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

    // The output is an array of URLs, but tolerate a single string
    const imageUrl = Array.isArray(response.output)
      ? response.output[0]
      : response.output

    return {
      imageUrl,
      id: response.id,
      status: response.status,
      model: this.id
    }
  }
}

export default SEEDREAM_4_5
