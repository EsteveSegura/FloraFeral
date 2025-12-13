/**
 * Lang Segment Anything Model Configuration
 * Model: tmappdev/lang-segment-anything
 * Version: 891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc
 */

export const LANG_SEGMENT_ANYTHING = {
  id: 'lang-segment-anything',
  name: 'Lang Segment Anything',
  owner: 'tmappdev',
  version: '891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc',
  category: 'image', // Model category: image processing/generation
  endpoint: 'http://localhost:1111/v1/predictions',
  useVersionInBody: true,  // Uses version in request body instead of path

  /**
   * Default parameters for the model
   */
  defaults: {
    text_prompt: 'object'
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   * This model doesn't need toolbar controls - it uses the node's prompt textarea
   */
  uiSchema: {
    id: 'lang-segment-anything',
    label: 'Lang Segment Anything',
    controls: []
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text prompt for segmentation
   * @param {Array<string>} [options.imageInput] - Input image (only 1 supported)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], params = {} } = options

    // This model uses the prompt as text_prompt for segmentation
    const textPrompt = prompt || params.text_prompt || this.defaults.text_prompt

    if (!textPrompt || typeof textPrompt !== 'string' || !textPrompt.trim()) {
      throw new Error('Segmentation prompt is required and must be a non-empty string')
    }

    if (imageInput.length === 0) {
      throw new Error('Input image is required for segmentation')
    }

    if (imageInput.length > 1) {
      throw new Error('Lang Segment Anything only supports 1 input image')
    }

    return {
      image: imageInput[0],
      text_prompt: textPrompt.trim()
    }
  },

  /**
   * Validate and sanitize parameters
   * @param {Object} params
   * @returns {Object} Validated parameters
   */
  validateParams(params = {}) {
    const validated = {}

    if (params.text_prompt !== undefined) {
      if (typeof params.text_prompt !== 'string' || !params.text_prompt.trim()) {
        throw new Error('text_prompt must be a non-empty string')
      }
      validated.text_prompt = params.text_prompt
    }

    return validated
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

    // Output is directly a URI string
    const imageUrl = typeof response.output === 'string'
      ? response.output
      : response.output[0] || response.output

    return {
      imageUrl,
      id: response.id,
      status: response.status,
      model: this.id
    }
  }
}

export default LANG_SEGMENT_ANYTHING
