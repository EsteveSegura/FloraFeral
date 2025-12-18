/**
 * OpenAI GPT-5 Model Configuration
 * Model: openai/gpt-5
 */

export const GPT_5 = {
  id: 'gpt-5',
  name: 'GPT-5',
  owner: 'openai',
  version: 'latest',
  category: 'text', // Model category: text generation
  endpoint: `${import.meta.env.VITE_BASE_URL_API || 'http://localhost:8787'}/v1/models/openai/gpt-5/predictions`,

  /**
   * Default parameters for the model
   */
  defaults: {
    reasoning_effort: 'minimal',
    verbosity: 'medium'
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'gpt-5',
    label: 'GPT-5',
    controls: [
      {
        key: 'reasoning_effort',
        label: 'Reasoning Effort',
        type: 'select',
        enum: ['minimal', 'low', 'medium', 'high'],
        default: 'minimal'
      },
      {
        key: 'verbosity',
        label: 'Verbosity',
        type: 'select',
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      {
        key: 'max_completion_tokens',
        label: 'Max Tokens',
        type: 'number',
        min: 1,
        max: 100000,
        default: null
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    reasoning_effort: ['minimal', 'low', 'medium', 'high'],
    verbosity: ['low', 'medium', 'high']
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text prompt
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
      reasoning_effort: params.reasoning_effort || this.defaults.reasoning_effort,
      verbosity: params.verbosity || this.defaults.verbosity
    }

    // Add input images if provided
    if (imageInput.length > 0) {
      input.image_input = imageInput
    }

    // Add system prompt if provided
    if (params.system_prompt) {
      input.system_prompt = params.system_prompt
    }

    // Add max_completion_tokens if provided
    if (params.max_completion_tokens) {
      input.max_completion_tokens = params.max_completion_tokens
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

    if (params.reasoning_effort && !this.validValues.reasoning_effort.includes(params.reasoning_effort)) {
      throw new Error(`Invalid reasoning_effort. Must be one of: ${this.validValues.reasoning_effort.join(', ')}`)
    }

    if (params.verbosity && !this.validValues.verbosity.includes(params.verbosity)) {
      throw new Error(`Invalid verbosity. Must be one of: ${this.validValues.verbosity.join(', ')}`)
    }

    if (params.max_completion_tokens !== undefined) {
      const tokens = parseInt(params.max_completion_tokens)
      if (isNaN(tokens) || tokens < 1) {
        throw new Error('max_completion_tokens must be a positive integer')
      }
      validated.max_completion_tokens = tokens
    }

    return {
      reasoning_effort: params.reasoning_effort,
      verbosity: params.verbosity,
      max_completion_tokens: validated.max_completion_tokens,
      system_prompt: params.system_prompt
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

    // Output is an array of strings (streaming chunks)
    // Join them to get the full text
    const textOutput = Array.isArray(response.output)
      ? response.output.join('')
      : response.output

    return {
      text: textOutput,
      id: response.id,
      status: response.status,
      model: this.id
    }
  }
}

export default GPT_5
