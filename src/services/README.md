# Replicate Service

Service layer for interacting with Replicate API to generate images using AI models.

## Configuration

### API Token

Set your Replicate API token in a `.env` file:

```bash
VITE_REPLICATE_API_TOKEN=your_token_here
```

Get your token from: https://replicate.com/account/api-tokens

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

### nano-banana-pro (Google)

Fast and efficient image generation model.

**Parameters:**
- `resolution`: "1K", "2K", "4K" (default: "2K")
- `aspect_ratio`: "1:1", "16:9", "4:3", etc. (default: "match_input_image")
- `output_format`: "jpg", "png" (default: "jpg")
- `safety_filter_level`: "block_low_and_above", "block_medium_and_above", "block_only_high"

**Input Images:** Supports up to 14 input images

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

### `setApiToken(token)`

Set the API token programmatically (alternative to environment variable).

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
