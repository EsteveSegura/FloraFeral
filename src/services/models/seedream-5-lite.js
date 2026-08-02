/**
 * ByteDance SeeDream-5 Lite Model Configuration
 * Model: bytedance/seedream-5-lite
 */

export const SEEDREAM_5_LITE = {
  id: 'seedream-5-lite',
  name: 'SeeDream-5 Lite',
  owner: 'bytedance',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/bytedance/seedream-5-lite/predictions',

  /**
   * Default parameters for the model
   *
   * `max_images` is fixed at 1 and `sequential_image_generation` at 'disabled',
   * neither exposed in the UI: an Image Generator node renders a single output,
   * so any extra image would be billed and then dropped on the floor
   */
  defaults: {
    aspect_ratio: 'match_input_image',
    size: '2K',
    output_format: 'png',
    return_byteplus_urls: false,
    max_images: 1,
    sequential_image_generation: 'disabled'
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'seedream-5-lite',
    label: 'SeeDream-5 Lite',
    controls: [
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
        key: 'size',
        label: 'Size',
        type: 'select',
        enum: ['2K', '3K'],
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
        enum: ['png', 'jpeg'],
        default: 'png'
      },
      {
        key: 'return_byteplus_urls',
        label: 'Return BytePlus URLs',
        type: 'checkbox',
        default: false,
        description: 'Skips the download and hands back BytePlus URLs that expire in 24 hours'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    size: ['2K', '3K'],
    aspect_ratio: [
      'match_input_image',
      '1:1', '4:3', '3:4', '16:9', '9:16',
      '3:2', '2:3', '21:9'
    ],
    output_format: ['png', 'jpeg']
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
      size: params.size || this.defaults.size,
      aspect_ratio: params.aspect_ratio || this.defaults.aspect_ratio,
      output_format: params.output_format || this.defaults.output_format,
      return_byteplus_urls: params.return_byteplus_urls !== undefined
        ? params.return_byteplus_urls
        : this.defaults.return_byteplus_urls,
      // Always a single image, see `defaults`
      max_images: this.defaults.max_images,
      sequential_image_generation: this.defaults.sequential_image_generation
    }
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    if (params.size && !this.validValues.size.includes(params.size)) {
      throw new Error(`Invalid size. Must be one of: ${this.validValues.size.join(', ')}`)
    }

    if (params.aspect_ratio && !this.validValues.aspect_ratio.includes(params.aspect_ratio)) {
      throw new Error(`Invalid aspect_ratio. Must be one of: ${this.validValues.aspect_ratio.join(', ')}`)
    }

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    return {
      size: params.size,
      aspect_ratio: params.aspect_ratio,
      output_format: params.output_format,
      return_byteplus_urls: params.return_byteplus_urls
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

export default SEEDREAM_5_LITE
