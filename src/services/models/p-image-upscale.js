/**
 * PrunaAI P-Image-Upscale Model Configuration
 * Model: prunaai/p-image-upscale
 */

export const P_IMAGE_UPSCALE = {
  id: 'p-image-upscale',
  name: 'P-Image Upscale',
  owner: 'prunaai',
  version: 'latest',
  category: 'image', // Model category: image generation
  endpointPath: '/v1/models/prunaai/p-image-upscale/predictions',

  /**
   * This model rewrites an image instead of generating one, so the node hides
   * its prompt: there is nothing for the user to describe
   */
  requiresPrompt: false,

  /**
   * Default parameters for the model
   *
   * `upscale_mode` is fixed at 'target' and `factor` is never sent: the node
   * offers a target resolution in megapixels, which is the mode that reads it.
   * `no_op` is deprecated and ignored by the model
   */
  defaults: {
    target: 4,
    enhance_realism: true,
    enhance_details: false,
    output_format: 'jpg',
    output_quality: 80,
    disable_safety_checker: false,
    upscale_mode: 'target'
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'p-image-upscale',
    // The suffix tells the two kinds of image model apart in the dropdown
    label: 'P-Image Upscale (upscaler)',
    controls: [
      {
        key: 'target',
        label: 'Target (MP)',
        type: 'number',
        min: 1,
        max: 8,
        default: 4
      }
    ],

    /**
     * Secondary options, rendered in the node options side panel
     */
    advancedControls: [
      {
        key: 'enhance_realism',
        label: 'Enhance realism',
        type: 'checkbox',
        default: true,
        description: 'Recommended for AI generated images. May deviate more from the original'
      },
      {
        key: 'enhance_details',
        label: 'Enhance details',
        type: 'checkbox',
        default: false,
        description: 'Sharpens fine textures. May raise the contrast a little'
      },
      {
        key: 'output_format',
        label: 'Output format',
        type: 'select',
        enum: ['jpg', 'png', 'webp'],
        default: 'jpg'
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
        key: 'disable_safety_checker',
        label: 'Disable safety checker',
        type: 'checkbox',
        default: false,
        description: 'Skips the moderation pass on the upscaled image'
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    output_format: ['jpg', 'png', 'webp']
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {Array<string>} [options.imageInput] - Input image (only the first entry is used)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { imageInput = [], params = {} } = options

    if (imageInput.length === 0) {
      throw new Error('An input image is required. Connect an image to this node.')
    }

    return {
      // The model upscales a single image, so any extra input is ignored
      image: imageInput[0],
      target: params.target ?? this.defaults.target,
      enhance_realism: params.enhance_realism !== undefined
        ? params.enhance_realism
        : this.defaults.enhance_realism,
      enhance_details: params.enhance_details !== undefined
        ? params.enhance_details
        : this.defaults.enhance_details,
      output_format: params.output_format || this.defaults.output_format,
      output_quality: params.output_quality ?? this.defaults.output_quality,
      disable_safety_checker: params.disable_safety_checker !== undefined
        ? params.disable_safety_checker
        : this.defaults.disable_safety_checker,
      // Fixed: the toolbar asks for megapixels, see `defaults`
      upscale_mode: this.defaults.upscale_mode
    }
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    const validated = {}

    if (params.output_format && !this.validValues.output_format.includes(params.output_format)) {
      throw new Error(`Invalid output_format. Must be one of: ${this.validValues.output_format.join(', ')}`)
    }

    if (params.target !== undefined && params.target !== null) {
      const target = parseInt(params.target)
      if (isNaN(target) || target < 1 || target > 8) {
        throw new Error('target must be between 1 and 8 megapixels')
      }
      validated.target = target
    }

    if (params.output_quality !== undefined && params.output_quality !== null) {
      const quality = parseInt(params.output_quality)
      if (isNaN(quality) || quality < 0 || quality > 100) {
        throw new Error('output_quality must be between 0 and 100')
      }
      validated.output_quality = quality
    }

    return {
      target: validated.target,
      enhance_realism: params.enhance_realism,
      enhance_details: params.enhance_details,
      output_format: params.output_format,
      output_quality: validated.output_quality,
      disable_safety_checker: params.disable_safety_checker
      // upscale_mode and factor are deliberately dropped: buildInput always
      // upscales to a target resolution
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

export default P_IMAGE_UPSCALE
