# Replicate Service

Service layer for interacting with Replicate API to generate images using AI models.

## Configuration

### API Token

Configure your Replicate API token through the Settings UI:

1. Open the application and click the Settings button (⚙️)
2. Enter your Replicate API Key in the "API Keys" section
3. Get your token from: https://replicate.com/account/api-tokens
4. The key is automatically saved to localStorage

Alternatively, you can set the token programmatically:

```javascript
import replicateService from '@/services/replicate'
replicateService.setApiToken('your_token_here')
```

### Mock Mode

If no API token is provided, the service will automatically use mock responses for development/testing.

## Usage

### Basic Image Generation

```javascript
import replicateService from '@/services/replicate'

const result = await replicateService.generateImage({
  prompt: "A beautiful sunset over mountains"
})

console.log(result.imageUrl) // URL of generated image
```

### With Input Images

```javascript
const result = await replicateService.generateImage({
  prompt: "Transform this image into a watercolor painting",
  imageSrc: "https://example.com/input-image.jpg",
  // or multiple images:
  // imageSrc: ["url1.jpg", "url2.jpg"]
})
```

### With Custom Parameters

```javascript
const result = await replicateService.generateImage({
  prompt: "A serene landscape",
  model: "nano-banana-pro",
  params: {
    resolution: "4K",
    aspect_ratio: "16:9",
    output_format: "png",
    safety_filter_level: "block_medium_and_above"
  }
})
```

## Available Models

### Image Generation Models

#### nano-banana-pro (Google)

Fast and efficient image generation model.

**Parameters:**
- `resolution`: "1K", "2K", "4K" (default: "2K")
- `aspect_ratio`: "1:1", "16:9", "4:3", etc. (default: "match_input_image")
- `output_format`: "jpg", "png" (default: "jpg")
- `safety_filter_level`: "block_low_and_above", "block_medium_and_above", "block_only_high"

**Input Images:** Supports up to 14 input images

#### nano-banana-2 (Google)

Gemini 3.1 Flash Image: Pro-level quality at Flash speed, with web grounding.

**Parameters:**
- `aspect_ratio`: "match_input_image", "1:1", "16:9", … up to "8:1" (default: "match_input_image")
- `resolution`: "1K", "2K", "4K" (default: "2K")
- `output_format`: "jpg", "png" (default: "jpg")
- `google_search`: boolean (default: false) - Ground the image on real-time web results
- `image_search`: boolean (default: false) - Use web images as visual context

**Input Images:** Supports up to 14 input images

#### seedream-4.5 (ByteDance)

Upgraded SeeDream with stronger spatial understanding. Note that 1K is not a
valid size here, unlike SeeDream-4.

**Parameters:**
- `size`: "2K", "4K", "custom" (default: "2K")
- `aspect_ratio`: "match_input_image", "1:1", "16:9", … (default: "match_input_image")
- `width` / `height`: 1024-4096, only read when `size` is "custom"
- `disable_safety_checker`: boolean (default: false)

**Input Images:** Supports up to 14 input images

#### seedream-5-lite (ByteDance)

SeeDream 5.0 lite: built-in reasoning and example-based editing.

**Parameters:**
- `aspect_ratio`: "match_input_image", "1:1", "16:9", … (default: "match_input_image")
- `size`: "2K", "3K" (default: "2K")
- `output_format`: "png", "jpeg" (default: "png")
- `return_byteplus_urls`: boolean (default: false) - URLs that expire in 24 hours

**Input Images:** Supports up to 14 input images

#### flux-2-flex, flux-2-pro, flux-2-max (Black Forest Labs)

The FLUX.2 family. They share a payload; Flex adds the quality-versus-speed
dials, Max is the highest fidelity of the three.

**Parameters:**
- `aspect_ratio`: "match_input_image", "1:1", … , "custom" (default: "1:1")
- `resolution`: "match_input_image", "0.5 MP", "1 MP", "2 MP", "4 MP" (default: "1 MP")
- `width` / `height`: 256-2048, rounded to a multiple of 16, only read when
  `aspect_ratio` is "custom". They replace `resolution`, which is not sent then
- `output_format`: "webp", "jpg", "png" (default: "webp")
- `output_quality`: 0-100 (default: 80), ignored for png
- `safety_tolerance`: 1-5 (default: 2), 1 being the strictest
- `seed`: integer (optional)
- Flex only — `steps`: 1-50 (default: 20), `guidance`: 1-10 (default: 3.5),
  `prompt_upsampling`: boolean (default: false)

**Input Images:** Flex takes up to 10, Pro and Max up to 8. The payload key is
`input_images`, not `image_input`

### Text Generation Models

#### GPT-5 (OpenAI)

Advanced language model with reasoning capabilities.

**Parameters:**
- `reasoning_effort`: "minimal", "low", "medium", "high" (default: "minimal")
- `verbosity`: "low", "medium", "high" (default: "medium")
- `max_completion_tokens`: 1-100,000 (optional)
- `system_prompt`: Custom system instruction (optional)

**Input Images:** Supports multiple input images for multimodal tasks

**Usage:**
```javascript
const result = await replicateService.generateText({
  prompt: "Explain quantum computing",
  model: "gpt-5",
  params: {
    reasoning_effort: "high",
    verbosity: "medium"
  }
})
```

#### Gemini 2.5 Flash (Google)

Google's hybrid "thinking" AI model optimized for speed and cost-efficiency.

**Parameters:**
- `temperature`: 0-2 (default: 1) - Controls randomness
- `top_p`: 0-1 (default: 0.95) - Nucleus sampling parameter
- `max_output_tokens`: 1-65,535 (default: 65,535)
- `dynamic_thinking`: boolean (default: false) - Enable adaptive reasoning
- `thinking_budget`: 0-24,576 (optional) - Fixed reasoning budget
- `system_instruction`: Custom system instruction (optional)

**Input Images:** Supports up to 10 input images (each up to 7MB)

**Input Videos:** Supports up to 10 input videos (each up to 45 minutes)

**Usage:**
```javascript
const result = await replicateService.generateText({
  prompt: "Analyze this image",
  imageSrc: ["image1.jpg", "image2.jpg"],
  model: "gemini-2.5-flash",
  params: {
    temperature: 0.7,
    dynamic_thinking: true,
    system_instruction: "You are a helpful assistant"
  }
})
```

**References:**
- [Gemini 2.5 Flash API Documentation](https://replicate.com/google/gemini-2.5-flash/api/api-reference)
- [Gemini 2.5 Flash Schema](https://replicate.com/google/gemini-2.5-flash/api/schema)

## Adding New Models

Create a new model configuration file in `src/services/models/`:

```javascript
// src/services/models/my-model.js
export const MY_MODEL = {
  id: 'my-model',
  name: 'My Model',
  owner: 'username',
  endpoint: 'https://api.replicate.com/v1/models/username/my-model/predictions',

  defaults: {
    // default parameters
  },

  buildInput(options) {
    // build API input payload
  },

  parseResponse(response) {
    // parse API response
  }
}
```

Register it in `src/services/replicate.js`:

```javascript
import MY_MODEL from './models/my-model'

const MODELS = {
  'my-model': MY_MODEL,
  // ... other models
}
```

## Error Handling

The service handles common errors automatically:

- **Timeout**: Default 2 minutes, configurable
- **Invalid API Token**: 401/403 errors
- **Rate Limiting**: 429 errors
- **Service Unavailable**: 500/503 errors

```javascript
try {
  const result = await replicateService.generateImage({ prompt })
} catch (error) {
  console.error(error.message)
  // "Image generation timed out. Please try again."
  // "Invalid API token. Please check your Replicate API key."
  // "Rate limit exceeded. Please try again later."
  // etc.
}
```

## API Reference

### `generateImage(options)`

Generate an image using a Replicate model.

**Parameters:**
- `options.prompt` (string, required): Text description of the image
- `options.imageSrc` (string|Array<string>, optional): Input image(s)
- `options.model` (string, optional): Model ID (default: "nano-banana-pro")
- `options.params` (object, optional): Model-specific parameters

**Returns:** Promise<Object>
- `imageUrl` (string): URL of generated image
- `id` (string): Generation ID
- `status` (string): Generation status
- `model` (string): Model used
- `isMock` (boolean): Whether this is a mock response

### `generateText(options)`

Generate text using a Replicate language model.

**Parameters:**
- `options.prompt` (string, required): Text prompt to send to the model
- `options.imageSrc` (string|Array<string>, optional): Input image(s) for multimodal tasks
- `options.model` (string, optional): Model ID (default: "gpt-5")
- `options.params` (object, optional): Model-specific parameters

**Returns:** Promise<Object>
- `text` (string): Generated text response
- `id` (string): Generation ID
- `status` (string): Generation status
- `model` (string): Model used

### `setApiToken(token)`

Set the API token programmatically (alternative to Settings UI).

### `listModels()`

Get list of available model IDs.

### `getModel(modelId)`

Get configuration for a specific model.

## Testing

The service includes mock responses for testing without API calls:

```javascript
// Mock mode is automatic if no token is provided
const result = await replicateService.generateImage({ prompt })
console.log(result.isMock) // true
```
