/**
 * PrunaAI P-Video Model Configuration
 * Model: prunaai/p-video
 */

export const P_VIDEO = {
  id: 'p-video',
  name: 'P-Video',
  owner: 'prunaai',
  version: 'latest',
  category: 'video', // Model category: video generation
  endpointPath: '/v1/models/prunaai/p-video/predictions',

  /**
   * Default parameters for the model
   */
  defaults: {
    duration: 5,
    aspect_ratio: '16:9',
    resolution: '720p',
    fps: 24,
    draft: false,
    prompt_upsampling: true,
    save_audio: true
  },

  /**
   * UI Schema - defines controls for the node toolbar
   * Used to dynamically render UI controls for model parameters
   */
  uiSchema: {
    id: 'p-video',
    label: 'P-Video',
    controls: [
      {
        key: 'duration',
        label: 'Duration (s)',
        type: 'number',
        min: 1,
        max: 20,
        default: 5
      },
      {
        key: 'aspect_ratio',
        label: 'Aspect Ratio',
        type: 'select',
        enum: ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'],
        default: '16:9'
      },
      {
        key: 'resolution',
        label: 'Resolution',
        type: 'select',
        enum: ['720p', '1080p'],
        default: '720p'
      },
      {
        key: 'fps',
        label: 'FPS',
        type: 'select',
        enum: [24, 48],
        default: 24
      }
    ],

    /**
     * Secondary options, rendered in the node options side panel
     */
    advancedControls: [
      {
        key: 'draft',
        label: 'Draft mode',
        type: 'checkbox',
        default: false,
        description: 'Lower quality preview, around 4x faster and cheaper. Handy while iterating on a prompt'
      },
      {
        key: 'prompt_upsampling',
        label: 'Prompt upsampling',
        type: 'checkbox',
        default: true,
        description: 'Let the model rewrite the prompt to enhance it'
      },
      {
        key: 'save_audio',
        label: 'Save audio',
        type: 'checkbox',
        default: true,
        description: 'Keep the generated audio track in the video'
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
    aspect_ratio: ['16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '1:1'],
    resolution: ['720p', '1080p'],
    fps: [24, 48]
  },

  /**
   * Build input payload for the API
   * @param {Object} options
   * @param {string} options.prompt - Text description of the video
   * @param {Array<string>} [options.imageInput] - First frame image (only the first entry is used)
   * @param {string} [options.lastFrameImage] - Reference image for the last frame
   * @param {Object} [options.params] - Additional parameters
   * @returns {Object} API input payload
   */
  buildInput(options) {
    const { prompt, imageInput = [], lastFrameImage = null, params = {} } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required and must be a non-empty string')
    }

    const input = {
      prompt: prompt.trim(),
      duration: params.duration ?? this.defaults.duration,
      resolution: params.resolution || this.defaults.resolution,
      fps: params.fps ?? this.defaults.fps,
      draft: params.draft !== undefined ? params.draft : this.defaults.draft,
      prompt_upsampling: params.prompt_upsampling !== undefined
        ? params.prompt_upsampling
        : this.defaults.prompt_upsampling,
      save_audio: params.save_audio !== undefined ? params.save_audio : this.defaults.save_audio
    }

    // The model takes a single image as the video's first frame
    if (imageInput.length > 0) {
      input.image = imageInput[0]
    }

    if (lastFrameImage) {
      input.last_frame_image = lastFrameImage
    }

    // aspect_ratio is ignored by the model when an input image is provided,
    // so it is only sent for text-to-video generations
    if (!input.image) {
      input.aspect_ratio = params.aspect_ratio || this.defaults.aspect_ratio
    }

    // Optional seed for reproducible generations
    if (params.seed !== undefined && params.seed !== null && params.seed !== '') {
      input.seed = parseInt(params.seed)
    }

    return input
  },

  /**
   * Validate and sanitize parameters
   * The toolbar selects hand back strings, so numeric params are coerced here
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

    if (params.fps !== undefined && params.fps !== null) {
      const fps = parseInt(params.fps)
      if (!this.validValues.fps.includes(fps)) {
        throw new Error(`Invalid fps. Must be one of: ${this.validValues.fps.join(', ')}`)
      }
      validated.fps = fps
    }

    if (params.duration !== undefined && params.duration !== null) {
      const duration = parseInt(params.duration)
      if (isNaN(duration) || duration < 1 || duration > 20) {
        throw new Error('duration must be between 1 and 20 seconds')
      }
      validated.duration = duration
    }

    return {
      duration: validated.duration,
      aspect_ratio: params.aspect_ratio,
      resolution: params.resolution,
      fps: validated.fps,
      draft: params.draft,
      prompt_upsampling: params.prompt_upsampling,
      save_audio: params.save_audio,
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

    // The model outputs a single video URI, but tolerate an array response
    const videoUrl = Array.isArray(response.output)
      ? response.output[0]
      : response.output

    return {
      videoUrl,
      id: response.id,
      status: response.status,
      model: this.id
    }
  }
}

export default P_VIDEO
