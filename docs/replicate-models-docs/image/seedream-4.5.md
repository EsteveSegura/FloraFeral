## Basic model info

Model name: bytedance/seedream-4.5
Model description: Seedream 4.5: Upgraded Bytedance image model with stronger spatial understanding and world knowledge


## Model inputs

- prompt (required): Text prompt for image generation. Maximum 4000 characters. BytePlus recommends keeping prompts under 600 English words for best results. (string)
- image_input (optional): Input image(s) for image-to-image generation. List of 1-14 images for single or multi-reference generation. (array)
- size (optional): Image resolution: 2K (2048px), 4K (4096px), or 'custom' for specific dimensions. Note: 1K resolution is not supported in Seedream 4.5. (string)
- aspect_ratio (optional): Image aspect ratio. Only used when size is not 'custom'. Use 'match_input_image' to automatically match the input image's aspect ratio. (string)
- width (optional): Custom image width (only used when size='custom'). Range: 1024-4096 pixels. (integer)
- height (optional): Custom image height (only used when size='custom'). Range: 1024-4096 pixels. (integer)
- sequential_image_generation (optional): Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images (e.g., story scenes, character variations). (string)
- max_images (optional): Maximum number of images to generate when sequential_image_generation='auto'. Range: 1-15. Total images (input + generated) cannot exceed 15. (integer)
- disable_safety_checker (optional): Disable the safety checker for generated images. When enabled, input moderation is relaxed to only block illegal content (CSAM). Use responsibly. (boolean)


## Model output schema

{
  "type": "array",
  "items": {
    "type": "string",
    "format": "uri"
  },
  "title": "Output"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/9vw2ze1x09rme0ctwjdvgfa1c8)

#### Input

```json
{
  "size": "2K",
  "prompt": "an abstract modern art painting of glass fruit, the glass shines with an iridescent flare, the fruit is transparent",
  "max_images": 1,
  "image_input": [],
  "aspect_ratio": "match_input_image",
  "sequential_image_generation": "disabled"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/DRFeuDyXJUxzJCjEfvCAUHFg1CrysxvzWwu5y4Xbl7VfVf9WB/tmphy771eq9.jpg"
]
```


### Example (https://replicate.com/p/v5h0j0cwhsrma0ctwjhvzdp4s4)

#### Input

```json
{
  "size": "2K",
  "prompt": "new york",
  "max_images": 1,
  "image_input": [
    "https://replicate.delivery/pbxt/OAaYu3nOgLO4ukhJDZEDCXJhgxb34siLv1LMnWhS2yodrAYI/preview-7.webp"
  ],
  "aspect_ratio": "match_input_image",
  "sequential_image_generation": "disabled"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/v6u1m55gG1LfYaUnAZZUNyLxY797ttIOV7cvxI7amffcmf9WB/tmptbtp7ee8.jpg"
]
```


### Example (https://replicate.com/p/gajz93f8gdrmc0ctx9kt03372r)

#### Input

```json
{
  "size": "4K",
  "width": 2048,
  "height": 2048,
  "prompt": "A warm, nostalgic film-style interior of a cozy caf\u00e9, shot on 35mm-inspired digital photography with soft afternoon sunlight filtering through the front windows. Wooden shelves display neatly arranged ceramics, pastries, and coffee beans. Hand-painted signage on the main interior window reads \u2018Seedream 4.5\u2019 in clean, classic lettering, similar to boutique branding. A vintage bicycle with a wicker basket is visible outside the entrance, casting soft shadows on the floor. Rich textures, natural light, warm tones, subtle grain, and calm neighborhood-caf\u00e9 ambiance.",
  "max_images": 1,
  "image_input": [],
  "aspect_ratio": "16:9",
  "sequential_image_generation": "disabled"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/lSRiDsXJnC5HD9gOSrb2HTgAYRMRSmyd0UcbvzMhVSEp29bF/tmpq47k3q7q.jpg"
]
```


## Model readme

> Seedream 4.5 is a next-generation visual generation model designed for high-quality, consistent, and production-ready outputs. It delivers cinematic aesthetics, strong spatial reasoning, and precise instruction following, making it suitable for both creative and professional workflows.
> 
> Features:
> 
> ⭐ Superior Aesthetics
> 
> Produces cinematic, film-like visuals
> Refined lighting, shading, and rendering for polished results
> 
> 🔁 Higher Consistency
> 
> Maintains stable subjects across multiple images
> 
> Preserves clear details and coherent scenes
> 
> 🧠 Smarter Instruction Following
> 
> Accurately interprets complex or layered prompts
> 
> Supports precise visual control and interactive editing
> 
> 📐 Stronger Spatial Understanding
> 
> Realistic proportions, layout, and object placement
> 
> Generates believable, structured environments
> 
> 🌍 Richer World Knowledge
> 
> Creates knowledge-grounded visuals
> 
> Supports accurate scientific, technical, and real-world reasoning
> 
> 🏭 Industry-Ready Applications
> 
> Optimized for professional workflows across:
> E-commerce,
> Film & advertising,
> Gaming & virtual worlds,
> Education & training,
> Interior & architectural design

