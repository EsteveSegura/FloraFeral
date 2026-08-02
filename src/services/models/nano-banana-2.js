/**
 * Google Nano Banana 2 Model Configuration
 * Model: google/nano-banana-2
 */

export const NANO_BANANA_2 = {
  id: 'nano-banana-2',
  name: 'Nano Banana 2',
  owner: 'google',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/google/nano-banana-2/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    aspect_ratio: 'match_input_image',
    resolution: '2K',
    output_format: 'jpg',
    google_search: false,
    image_search: false
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'nano-banana-2',
    label: 'Nano Banana 2',
    controls: [
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: [
          'match_input_image',
          '1:1', '2:3', '3:2', '3:4', '4:3',
          '4:5', '5:4', '9:16', '16:9', '21:9',
          '1:4', '4:1', '1:8', '8:1'
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
    ],

    /**
     * Secondary options, rendered in the node options side panel
     */
    advancedControls: [
      {
        key: 'output_format',
        label: 'Output format',
        type: 'select',
        enum: ['jpg', 'png'],
        default: 'jpg'
      },
      {
        key: 'google_search',
        label: 'Google Search grounding',
        type: 'checkbox',
        default: false,
        description: 'Ground the image on real-time web results, such as weather or recent events'
      },
      {
        key: 'image_search',
        label: 'Image Search grounding',
        type: 'checkbox',
        default: false,
        description: 'Pull web images in as visual context. It turns on web search too'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    aspect_ratio: [
      'match_input_image',
      '1:1', '2:3', '3:2', '3:4', '4:3',
      '4:5', '5:4', '9:16', '16:9', '21:9',
      '1:4', '4:1', '1:8', '8:1'
    ],
    resolution: ['1K', '2K', '4K'],
    output_format: ['jpg', 'png']
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
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      resolution: params.resolution || this.defaults.resolution,
      output_format: params.output_format || this.defaults.output_format,
      google_search: params.google_search !== undefined
        ? params.google_search
        : this.defaults.google_search,
      image_search: params.image_search !== undefined
        ? params.image_search
        : this.defaults.image_search
    }
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    if (params.aspect_ratio && !this.validValues.aspect_ratio.includes(params.aspect_ratio)) {
      throw new Error(`Invalid aspect_ratio. Must be one of: ${this.validValues.aspect_ratio.join(', ')}`)
    }

    if (params.resolution && !this.validValues.resolution.includes(params.resolution)) {
      throw new Error(`Invalid resolution. Must be one of: ${this.validValues.resolution.join(', ')}`)
    }

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    return {
      aspect_ratio: params.aspect_ratio,
      resolution: params.resolution,
      output_format: params.output_format,
      google_search: params.google_search,
      image_search: params.image_search
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

export default NANO_BANANA_2
