/**
 * Replicate API Service
 * Handles image generation using Replicate models
 */

import NANO_BANANA_PRO from './models/nano-banana-pro'
import SEEDREAM_4 from './models/seedream-4'

/**
 * Registry of available models
 */
const MODELS = {
  'nano-banana-pro': NANO_BANANA_PRO,
  'seedream-4': SEEDREAM_4,
  'default': NANO_BANANA_PRO
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  timeout: 120000, // 2 minutes
  apiUrl: 'http://localhost:1111/v1',
  model: 'nano-banana-pro'
}

/**
 * ReplicateService class
 */
class ReplicateService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.apiToken = null
  }

  /**
   * Set API token
   * @param {string} token - Replicate API token
   */
  setApiToken(token) {
    this.apiToken = token
  }

  /**
   * Get API token from environment or stored value
   * @returns {string|null}
   */
  getApiToken() {
    // Try to get from environment variable first
    if (import.meta.env.VITE_REPLICATE_API_TOKEN) {
      return import.meta.env.VITE_REPLICATE_API_TOKEN
    }
    return this.apiToken 
  }

  /**
   * Get model configuration
   * @param {string} modelId - Model identifier
   * @returns {Object} Model configuration
   */
  getModel(modelId) {
    const model = MODELS[modelId] || MODELS.default
    if (!model) {
      throw new Error(`Model "${modelId}" not found`)
    }
    return model
  }

  /**
   * Register a new model
   * @param {string} id - Model identifier
   * @param {Object} modelConfig - Model configuration
   */
  registerModel(id, modelConfig) {
    MODELS[id] = modelConfig
  }

  /**
   * List available models
   * @returns {Array<string>} Array of model IDs
   */
  listModels() {
    return Object.keys(MODELS).filter(id => id !== 'default')
  }

  /**
   * Get UI schema for a model
   * @param {string} modelId - Model ID
   * @returns {Object} UI schema with controls definition
   */
  getModelUiSchema(modelId) {
    const model = this.getModel(modelId)
    return model.uiSchema || null
  }

  /**
   * Get default parameters for a model
   * @param {string} modelId - Model ID
   * @returns {Object} Default parameters
   */
  getModelDefaults(modelId) {
    const model = this.getModel(modelId)
    return { ...model.defaults }
  }

  /**
   * Generate image using Replicate API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {string|Array<string>} [options.imageSrc] - Input image(s)
   * @param {string} [options.model] - Model ID to use
   * @param {Object} [options.params] - Additional parameters
   * @returns {Promise<Object>} Generated image result
   */
  async generateImage(options) {
    const {
      prompt,
      imageSrc = null,
      model: modelId = this.config.model,
      params = {}
    } = options

    // Validate inputs
    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Get model configuration
    const model = this.getModel(modelId)

    // Prepare image input
    let imageInput = []
    if (imageSrc) {
      imageInput = Array.isArray(imageSrc) ? imageSrc : [imageSrc]
    }

    console.log('Replicate service - preparing generation:')
    console.log('  Prompt:', prompt.substring(0, 50) + '...')
    console.log('  Image inputs:', imageInput.length, 'images')
    if (imageInput.length > 0) {
      console.log('  Image types:', imageInput.map(src => {
        if (src.startsWith('data:')) return 'data URL'
        if (src.startsWith('http')) return 'HTTP URL'
        return 'unknown'
      }))
    }

    // Validate and build input
    const validatedParams = model.validateParams(params)
    const input = model.buildInput({
      prompt,
      imageInput,
      params: validatedParams
    })

    console.log('  API input payload:', {
      prompt: input.prompt.substring(0, 50) + '...',
      image_input_count: input.image_input.length,
      resolution: input.resolution,
      output_format: input.output_format
    })

    // Check for API token
    const token = this.getApiToken()
    if (!token) {
      console.warn('No Replicate API token found. Using mock response.')
      return this._mockGenerate(prompt, imageInput)
    }

    // Make API call
    try {
      const response = await this._callApi(model.endpoint, input, token)
      return model.parseResponse(response)
    } catch (error) {
      throw this._handleError(error)
    }
  }

  /**
   * Call Replicate API
   * @param {string} endpoint - API endpoint
   * @param {Object} input - Input payload
   * @param {string} token - API token
   * @returns {Promise<Object>} API response
   * @private
   */
  async _callApi(endpoint, input, token) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait' // Wait for synchronous response
        },
        body: JSON.stringify({ input }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API request failed with status ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`)
      }

      throw error
    }
  }

  /**
   * Mock generation for development/testing
   * @param {string} prompt
   * @param {Array} imageInput
   * @returns {Promise<Object>}
   * @private
   */
  async _mockGenerate(prompt, imageInput) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Generate mock image URL
    const text = encodeURIComponent(prompt.substring(0, 30))
    const color = Math.random() > 0.5 ? '4CAF50' : '2196F3'
    const imageUrl = `https://via.placeholder.com/512x512/${color}/FFFFFF?text=${text}`

    return {
      imageUrl,
      id: `mock_${Date.now()}`,
      status: 'succeeded',
      model: 'mock',
      isMock: true
    }
  }

  /**
   * Handle and format errors
   * @param {Error} error
   * @returns {Error}
   * @private
   */
  _handleError(error) {
    if (error.message.includes('timeout')) {
      return new Error('Image generation timed out. Please try again.')
    }

    if (error.message.includes('401') || error.message.includes('403')) {
      return new Error('Invalid API token. Please check your Replicate API key.')
    }

    if (error.message.includes('429')) {
      return new Error('Rate limit exceeded. Please try again later.')
    }

    if (error.message.includes('500') || error.message.includes('503')) {
      return new Error('Replicate service is temporarily unavailable. Please try again later.')
    }

    return error
  }
}

// Create and export singleton instance
const replicateService = new ReplicateService()

export default replicateService

// Export class for testing
export { ReplicateService, MODELS }
