/**
 * Google Nano Banana Pro Model Configuration
 * Model: google/nano-banana-pro
 */

export const NANO_BANANA_PRO = {
  id: 'nano-banana-pro',
  name: 'Nano Banana Pro',
  owner: 'google',
  version: 'latest',
  endpoint: 'http://localhost:1111/v1/models/google/nano-banana-pro/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    resolution: '2K',
    aspect_ratio: 'match_input_image',
    output_format: 'png',
    safety_filter_level: 'block_only_high'
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'nano-banana-pro',
    label: 'Nano Banana Pro',
    controls: [
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: [
          'match_input_image',
          '1:1', '2:3', '3:2', '3:4', '4:3',
          '4:5', '5:4', '9:16', '16:9', '21:9'
        ],
        default: 'match_input_image'
      },
      {
        key: 'resolution',
        label: 'Resolution',
        type: 'select',
        enum: ['1K', '2K', '4K'],
        default: '2K'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    resolution: ['1K', '2K', '4K'],
    aspect_ratio: [
      'match_input_image',
      '1:1', '2:3', '3:2', '3:4', '4:3',
      '4:5', '5:4', '9:16', '16:9', '21:9'
    ],
    output_format: ['jpg', 'png'],
    safety_filter_level: [
      'block_low_and_above',
      'block_medium_and_above',
      'block_only_high'
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

    return {
      prompt: prompt.trim(),
      image_input: imageInput,
      resolution: params.resolution || this.defaults.resolution,
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      output_format: params.output_format || this.defaults.output_format,
      safety_filter_level: params.safety_filter_level || this.defaults.safety_filter_level
    }
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    const validated = {}

    if (params.resolution && !this.validValues.resolution.includes(params.resolution)) {
      throw new Error(`Invalid resolution. Must be one of: ${this.validValues.resolution.join(', ')}`)
    }

    if (params.aspect_ratio && !this.validValues.aspect_ratio.includes(params.aspect_ratio)) {
      throw new Error(`Invalid aspect_ratio. Must be one of: ${this.validValues.aspect_ratio.join(', ')}`)
    }

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    if (params.safety_filter_level && !this.validValues.safety_filter_level.includes(params.safety_filter_level)) {
      throw new Error(`Invalid safety_filter_level. Must be one of: ${this.validValues.safety_filter_level.join(', ')}`)
    }

    return {
      resolution: params.resolution,
      aspect_ratio: params.aspect_ratio,
      output_format: params.output_format,
      safety_filter_level: params.safety_filter_level
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

    // The output is typically an array with the image URL
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

export default NANO_BANANA_PRO
