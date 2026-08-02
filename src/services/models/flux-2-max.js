/**
 * Black Forest Labs FLUX.2 Max Model Configuration
 * Model: black-forest-labs/flux-2-max
 */

export const FLUX_2_MAX = {
  id: 'flux-2-max',
  name: 'FLUX.2 Max',
  owner: 'black-forest-labs',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/black-forest-labs/flux-2-max/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    aspect_ratio: '1:1',
    resolution: '1 MP',
    width: 1024,
    height: 1024,
    safety_tolerance: 2,
    output_format: 'webp',
    output_quality: 80
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'flux-2-max',
    label: 'FLUX.2 Max',
    controls: [
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: [
          'match_input_image',
          '1:1', '3:4', '4:3', '2:3', '3:2',
          '4:5', '5:4', '9:16', '16:9', '9:21', '21:9',
          'custom'
        ],
        default: '1:1'
      },
      {
        key: 'resolution',
        label: 'Resolution',
        type: 'select',
        enum: ['match_input_image', '0.5 MP', '1 MP', '2 MP', '4 MP'],
        default: '1 MP'
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
        min: 256,
        max: 2048,
        step: 16,
        default: 1024,
        description: 'Only used when Aspect Ratio is set to custom. Rounded to a multiple of 16'
      },
      {
        key: 'height',
        label: 'Custom height',
        type: 'number',
        min: 256,
        max: 2048,
        step: 16,
        default: 1024,
        description: 'Only used when Aspect Ratio is set to custom. Rounded to a multiple of 16'
      },
      {
        key: 'output_format',
        label: 'Output format',
        type: 'select',
        enum: ['webp', 'jpg', 'png'],
        default: 'webp'
      },
      {
        key: 'output_quality',
        label: 'Output quality',
        type: 'number',
        min: 0,
        max: 100,
        default: 80,
        description: 'Ignored for png outputs'
      },
      {
        key: 'safety_tolerance',
        label: 'Safety tolerance',
        type: 'number',
        min: 1,
        max: 5,
        default: 2,
        description: '1 is the strictest, 5 the most permissive'
      },
      {
        key: 'seed',
        label: 'Seed',
        type: 'number',
        default: null,
        placeholder: 'Random',
        description: 'Fix it to reproduce the same generation twice'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    aspect_ratio: [
      'match_input_image',
      '1:1', '3:4', '4:3', '2:3', '3:2',
      '4:5', '5:4', '9:16', '16:9', '9:21', '21:9',
      'custom'
    ],
    resolution: ['match_input_image', '0.5 MP', '1 MP', '2 MP', '4 MP'],
    output_format: ['webp', 'jpg', 'png']
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {Array<string>} [options.imageInput] - Input images (up to 8)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    if (imageInput.length > 8) {
      throw new Error('Maximum 8 input images are supported')
    }

    const input = {
      prompt: prompt.trim(),
      input_images: imageInput,
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      safety_tolerance: params.safety_tolerance ?? this.defaults.safety_tolerance,
      output_format: params.output_format || this.defaults.output_format,
      output_quality: params.output_quality ?? this.defaults.output_quality
    }

    // Width and height replace the resolution when the ratio is free-form
    if (input.aspect_ratio === 'custom') {
      input.width = params.width || this.defaults.width
      input.height = params.height || this.defaults.height
    } else {
      input.resolution = params.resolution || this.defaults.resolution
    }

    // Optional seed for reproducible generations
    if (params.seed !== undefined && params.seed !== null && params.seed !== '') {
      input.seed = parseInt(params.seed)
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

    if (params.resolution && !this.validValues.resolution.includes(params.resolution)) {
      throw new Error(`Invalid resolution. Must be one of: ${this.validValues.resolution.join(', ')}`)
    }

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    if (params.safety_tolerance !== undefined && params.safety_tolerance !== null) {
      const tolerance = parseInt(params.safety_tolerance)
      if (isNaN(tolerance) || tolerance < 1 || tolerance > 5) {
        throw new Error('safety_tolerance must be between 1 and 5')
      }
      validated.safety_tolerance = tolerance
    }

    if (params.output_quality !== undefined && params.output_quality !== null) {
      const quality = parseInt(params.output_quality)
      if (isNaN(quality) || quality < 0 || quality > 100) {
        throw new Error('output_quality must be between 0 and 100')
      }
      validated.output_quality = quality
    }

    // The model rounds the dimensions to a multiple of 16 anyway, so it is done
    // here to keep what the panel shows and what the API gets in sync
    if (params.width !== undefined && params.width !== null) {
      const width = parseInt(params.width)
      if (isNaN(width) || width < 256 || width > 2048) {
        throw new Error('Width must be between 256 and 2048 pixels')
      }
      validated.width = Math.round(width / 16) * 16
    }

    if (params.height !== undefined && params.height !== null) {
      const height = parseInt(params.height)
      if (isNaN(height) || height < 256 || height > 2048) {
        throw new Error('Height must be between 256 and 2048 pixels')
      }
      validated.height = Math.round(height / 16) * 16
    }

    return {
      aspect_ratio: params.aspect_ratio,
      resolution: params.resolution,
      width: validated.width,
      height: validated.height,
      safety_tolerance: validated.safety_tolerance,
      output_format: params.output_format,
      output_quality: validated.output_quality,
      seed: params.seed
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

    // The model returns a single URI, but tolerate an array response
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

export default FLUX_2_MAX
