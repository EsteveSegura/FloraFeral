/**
 * Google Gemini 2.5 Flash Model Configuration
 * Model: google/gemini-2.5-flash
 * Google's hybrid "thinking" AI model optimized for speed and cost-efficiency
 */

export const GEMINI_2_5_FLASH = {
  id: 'gemini-2.5-flash',
  name: 'Gemini 2.5 Flash',
  owner: 'google',
  version: 'latest',
  category: 'text', // Model category: text generation
  endpointPath: '/v1/models/google/gemini-2.5-flash/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    temperature: 1,
    top_p: 0.95,
    max_output_tokens: 65535,
    dynamic_thinking: false
  },

  /**
   * UI Schema - defines controls for the navbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    controls: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'number',
        min: 0,
        max: 2,
        step: 0.1,
        default: 1
      },
      {
        key: 'top_p',
        label: 'Top P',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.95
      },
      {
        key: 'max_output_tokens',
        label: 'Max Output Tokens',
        type: 'number',
        min: 1,
        max: 65535,
        default: 65535
      },
      {
        key: 'dynamic_thinking',
        label: 'Dynamic Thinking',
        type: 'checkbox',
        default: false
      },
      {
        key: 'thinking_budget',
        label: 'Thinking Budget',
        type: 'number',
        min: 0,
        max: 24576,
        default: null
      }
    ]
  },

  /**
   * Valid values for each parameter
   */
  validValues: {
    temperature: { min: 0, max: 2 },
    top_p: { min: 0, max: 1 },
    max_output_tokens: { min: 1, max: 65535 },
    thinking_budget: { min: 0, max: 24576 }
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text prompt
   * @param {Array<string>} [options.imageInput] - Input images (max 10)
   * @param {Array<string>} [options.videoInput] - Input videos (max 10)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], videoInput = [], params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    const input = {
      prompt: prompt.trim(),
      temperature: params.temperature ?? this.defaults.temperature,
      top_p: params.top_p ?? this.defaults.top_p,
      max_output_tokens: params.max_output_tokens ?? this.defaults.max_output_tokens,
      dynamic_thinking: params.dynamic_thinking ?? this.defaults.dynamic_thinking
    }

    // Add input images if provided (max 10 images)
    if (imageInput.length > 0) {
      if (imageInput.length > 10) {
        throw new Error('Maximum 10 images allowed')
      }
      input.images = imageInput
    }

    // Add input videos if provided (max 10 videos)
    if (videoInput.length > 0) {
      if (videoInput.length > 10) {
        throw new Error('Maximum 10 videos allowed')
      }
      input.videos = videoInput
    }

    // Add system instruction if provided
    if (params.system_instruction) {
      input.system_instruction = params.system_instruction
    }

    // Add thinking budget if provided and dynamic thinking is disabled
    if (params.thinking_budget !== undefined && params.thinking_budget !== null && !input.dynamic_thinking) {
      input.thinking_budget = params.thinking_budget
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

    // Validate temperature
    if (params.temperature !== undefined) {
      const temp = parseFloat(params.temperature)
      if (isNaN(temp) || temp < this.validValues.temperature.min || temp > this.validValues.temperature.max) {
        throw new Error(`Invalid temperature. Must be between ${this.validValues.temperature.min} and ${this.validValues.temperature.max}`)
      }
      validated.temperature = temp
    }

    // Validate top_p
    if (params.top_p !== undefined) {
      const topP = parseFloat(params.top_p)
      if (isNaN(topP) || topP < this.validValues.top_p.min || topP > this.validValues.top_p.max) {
        throw new Error(`Invalid top_p. Must be between ${this.validValues.top_p.min} and ${this.validValues.top_p.max}`)
      }
      validated.top_p = topP
    }

    // Validate max_output_tokens
    if (params.max_output_tokens !== undefined) {
      const tokens = parseInt(params.max_output_tokens)
      if (isNaN(tokens) || tokens < this.validValues.max_output_tokens.min || tokens > this.validValues.max_output_tokens.max) {
        throw new Error(`Invalid max_output_tokens. Must be between ${this.validValues.max_output_tokens.min} and ${this.validValues.max_output_tokens.max}`)
      }
      validated.max_output_tokens = tokens
    }

    // Validate thinking_budget
    if (params.thinking_budget !== undefined && params.thinking_budget !== null) {
      const budget = parseInt(params.thinking_budget)
      if (isNaN(budget) || budget < this.validValues.thinking_budget.min || budget > this.validValues.thinking_budget.max) {
        throw new Error(`Invalid thinking_budget. Must be between ${this.validValues.thinking_budget.min} and ${this.validValues.thinking_budget.max}`)
      }
      validated.thinking_budget = budget
    }

    // Validate dynamic_thinking
    if (params.dynamic_thinking !== undefined) {
      validated.dynamic_thinking = Boolean(params.dynamic_thinking)
    }

    // System instruction
    if (params.system_instruction) {
      validated.system_instruction = params.system_instruction
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

export default GEMINI_2_5_FLASH

