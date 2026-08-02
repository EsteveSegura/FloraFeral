/**
 * Replicate API Service
 * Handles image generation using Replicate models
 */

import NANO_BANANA_PRO from './models/nano-banana-pro'
import NANO_BANANA_2 from './models/nano-banana-2'
import SEEDREAM_4 from './models/seedream-4'
import SEEDREAM_4_5 from './models/seedream-4.5'
import SEEDREAM_5_LITE from './models/seedream-5-lite'
import FLUX_2_FLEX from './models/flux-2-flex'
import FLUX_2_PRO from './models/flux-2-pro'
import FLUX_2_MAX from './models/flux-2-max'
import LANG_SEGMENT_ANYTHING from './models/lang-segment-anything'
import GPT_IMAGE_1 from './models/gpt-image-1'
import GPT_IMAGE_2 from './models/gpt-image-2'
import GPT_5 from './models/gpt-5'
import GEMINI_2_5_FLASH from './models/gemini-2.5-flash'
import P_VIDEO from './models/p-video'
import { useSettingsStore } from '@/stores/settings'

/**
 * Registry of available models
 */
const MODELS = {
  'nano-banana-pro': NANO_BANANA_PRO,
  'nano-banana-2': NANO_BANANA_2,
  'seedream-4': SEEDREAM_4,
  'seedream-4.5': SEEDREAM_4_5,
  'seedream-5-lite': SEEDREAM_5_LITE,
  'flux-2-flex': FLUX_2_FLEX,
  'flux-2-pro': FLUX_2_PRO,
  'flux-2-max': FLUX_2_MAX,
  'lang-segment-anything': LANG_SEGMENT_ANYTHING,
  'gpt-image-1': GPT_IMAGE_1,
  'gpt-image-2': GPT_IMAGE_2,
  'gpt-5': GPT_5,
  'gemini-2.5-flash': GEMINI_2_5_FLASH,
  'p-video': P_VIDEO,
  'default': NANO_BANANA_PRO
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  timeout: 120000, // 2 minutes
  apiUrl: import.meta.env.VITE_BASE_URL_API || 'http://localhost:8787',
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
   * Get API token from settings store or stored value
   * @returns {string|null}
   */
  getApiToken() {
    // Try to get from settings store first (highest priority)
    try {
      const settingsStore = useSettingsStore()
      const storeKey = settingsStore.getReplicateApiKey()
      if (storeKey) {
        return storeKey
      }
    } catch (error) {
      console.warn('Could not access settings store:', error)
    }

    // Fallback to stored value
    if (this.apiToken) {
      return this.apiToken
    }

    return null
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
   * @param {string} [category] - Optional category filter ('image', 'text')
   * @returns {Array<string>} Array of model IDs
   */
  listModels(category = null) {
    const modelIds = Object.keys(MODELS).filter(id => id !== 'default')

    if (!category) {
      return modelIds
    }

    // Filter by category
    return modelIds.filter(id => {
      const model = MODELS[id]
      return model.category === category
    })
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
   * Generate text using Replicate API
   * @param {Object} options
   * @param {string} options.prompt - Text prompt
   * @param {string|Array<string>} [options.imageSrc] - Input image(s)
   * @param {string} [options.model] - Model ID to use (default: gpt-5)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Promise<Object>} Generated text result
   */
  async generateText(options) {
    const {
      prompt,
      imageSrc = null,
      model: modelId = 'gpt-5',
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

    console.log('Replicate service - preparing text generation:')
    console.log('  Prompt:', prompt.substring(0, 50) + '...')
    console.log('  Image inputs:', imageInput.length, 'images')

    // Validate and build input
    const validatedParams = model.validateParams(params)
    const input = model.buildInput({
      prompt,
      imageInput,
      params: validatedParams
    })

    console.log('  API input payload:', {
      prompt: input.prompt?.substring(0, 50) + '...',
      image_input_count: input.image_input?.length || 0,
      reasoning_effort: input.reasoning_effort,
      verbosity: input.verbosity
    })

    // Check for API token
    const token = this.getApiToken()
    if (!token) {
      throw new Error('No Replicate API token found. Please configure it in Settings.')
    }

    // Build complete endpoint URL
    const endpoint = this.config.apiUrl + model.endpointPath

    // Make API call
    try {
      const response = await this._callApi(endpoint, input, token, model)
      return model.parseResponse(response)
    } catch (error) {
      throw this._handleError(error)
    }
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
      prompt: input.prompt || input.text_prompt?.substring(0, 50) + '...',
      image_input_count: input.image_input?.length || (input.image ? 1 : 0),
      ...(input.resolution && { resolution: input.resolution }),
      ...(input.output_format && { output_format: input.output_format })
    })

    // Check for API token
    const token = this.getApiToken()
    if (!token) {
      console.warn('No Replicate API token found. Using mock response.')
      return this._mockGenerate(prompt, imageInput)
    }

    // Build complete endpoint URL
    const endpoint = this.config.apiUrl + model.endpointPath

    // Make API call
    try {
      const response = await this._callApi(endpoint, input, token, model)
      return model.parseResponse(response)
    } catch (error) {
      throw this._handleError(error)
    }
  }

  /**
   * Generate video using Replicate API
   * @param {Object} options
   * @param {string} options.prompt - Text description
   * @param {string} [options.imageSrc] - First frame image
   * @param {string} [options.lastFrameImage] - Last frame reference image
   * @param {string} [options.model] - Model ID to use (default: p-video)
   * @param {Object} [options.params] - Additional parameters
   * @returns {Promise<Object>} Generated video result
   */
  async generateVideo(options) {
    const {
      prompt,
      imageSrc = null,
      lastFrameImage = null,
      model: modelId = 'p-video',
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

    console.log('Replicate service - preparing video generation:')
    console.log('  Prompt:', prompt.substring(0, 50) + '...')
    console.log('  First frame image:', imageInput.length > 0 ? 'yes' : 'no')
    console.log('  Last frame image:', lastFrameImage ? 'yes' : 'no')

    // Validate and build input
    const validatedParams = model.validateParams(params)
    const input = model.buildInput({
      prompt,
      imageInput,
      lastFrameImage,
      params: validatedParams
    })

    console.log('  API input payload:', {
      prompt: input.prompt?.substring(0, 50) + '...',
      has_image: !!input.image,
      has_last_frame_image: !!input.last_frame_image,
      duration: input.duration,
      resolution: input.resolution,
      fps: input.fps,
      draft: input.draft,
      ...(input.aspect_ratio && { aspect_ratio: input.aspect_ratio })
    })

    // Check for API token. Unlike images there is no mock video to fall back to
    const token = this.getApiToken()
    if (!token) {
      throw new Error('No Replicate API token found. Please configure it in Settings.')
    }

    // Build complete endpoint URL
    const endpoint = this.config.apiUrl + model.endpointPath

    // Make API call
    try {
      const response = await this._callApi(endpoint, input, token, model)
      return model.parseResponse(response)
    } catch (error) {
      throw this._handleError(error)
    }
  }

  /**
   * Transform Replicate API URL to use local proxy
   * @param {string} url - Original Replicate API URL
   * @returns {string} Transformed URL for local proxy
   * @private
   */
  _transformUrlToProxy(url) {
    // Replace only the domain, keeping the path (including /v1)
    return url.replace('https://api.replicate.com', this.config.apiUrl)
  }

  /**
   * Poll prediction status until completed
   * @param {string} pollUrl - URL to poll for prediction status
   * @param {string} token - API token
   * @param {number} maxWaitTime - Maximum time to wait in ms (default: 3 minutes)
   * @returns {Promise<Object>} Final prediction response
   * @private
   */
  async _pollPrediction(pollUrl, token, maxWaitTime = 180000) {
    const startTime = Date.now()
    const pollInterval = 3500 // 3.5 seconds

    // Transform URL to use local proxy
    const transformedUrl = this._transformUrlToProxy(pollUrl)
    console.log(`Transformed polling URL: ${pollUrl} -> ${transformedUrl}`)

    while (true) {
      // Check if we've exceeded max wait time
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Prediction polling timeout after 3 minutes')
      }

      // Poll the prediction status
      const response = await fetch(transformedUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `Polling failed with status ${response.status}`)
      }

      const prediction = await response.json()

      console.log(`Polling prediction ${prediction.id}: status=${prediction.status}`)

      // Check prediction status
      if (prediction.status === 'succeeded') {
        return prediction
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Prediction failed')
      }

      if (prediction.status === 'canceled') {
        throw new Error('Prediction was canceled')
      }

      // Status is 'starting' or 'processing' - wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }
  }

  /**
   * Call Replicate API
   * @param {string} endpoint - API endpoint
   * @param {Object} input - Input payload
   * @param {string} token - API token
   * @param {Object} model - Model configuration
   * @returns {Promise<Object>} API response
   * @private
   */
  async _callApi(endpoint, input, token, model) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      // Build request body - some models need version in body
      const requestBody = model.useVersionInBody
        ? { version: model.version, input }
        : { input }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait' // Wait for synchronous response (up to 60s)
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `API request failed with status ${response.status}`)
      }

      const prediction = await response.json()

      // Check if prediction is already completed
      if (prediction.status === 'succeeded') {
        console.log('Prediction completed immediately')
        return prediction
      }

      // If not succeeded, we need to poll using urls.get
      if (prediction.urls && prediction.urls.get) {
        console.log(`Prediction not ready (status: ${prediction.status}), starting polling...`)
        return await this._pollPrediction(prediction.urls.get, token)
      }

      // Fallback: if no urls.get, return as is (shouldn't happen normally)
      return prediction
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
      return new Error('Generation timed out. Please try again.')
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
