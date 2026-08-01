## Basic model info

Model name: openai/gpt-image-2
Model description: OpenAI's state-of-the-art image generation model. Create and edit images from text with strong instruction following, sharp text rendering, and detailed editing.


## Model inputs

- prompt (required): A text description of the desired image (string)
- openai_api_key (optional): Your OpenAI API key (optional - uses proxy if not provided) (string)
- aspect_ratio (optional): The size of the generated image. Use 'auto' to let the model pick. Sizes above 2560x1440 are experimental and may give more variable results. (string)
- input_images (optional): A list of images to use as input for the generation (array)
- number_of_images (optional): Number of images to generate (1-10) (integer)
- quality (optional): The quality of the generated image (string)
- background (optional): Set whether the background is transparent or opaque or choose automatically (string)
- output_compression (optional): Compression level (0-100%) (integer)
- output_format (optional): Output format (string)
- moderation (optional): Content moderation level (string)
- user_id (optional): An optional unique identifier representing your end-user. This helps OpenAI monitor and detect abuse. (string)


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

### Example (https://replicate.com/p/drk132mwx5rmt0cxp878wad6gc)

#### Input

```json
{
  "prompt": "A photo of a computer screen displaying a Spotify playlist in golden hour evening in a living room with lots of green plants in the background. The playlist says GPT-image-2. caption is \"this new image model from OpenAI is dope.\" and the artists are Replicate. the songs are themes about open source AI and Machine learning. the account name is Replicate. use the logo for replicate as the profile picture and artist image.",
  "quality": "auto",
  "background": "auto",
  "moderation": "auto",
  "aspect_ratio": "3:2",
  "input_images": [
    "https://replicate.delivery/pbxt/Oy2U6Sw4k3ZYEZ5cXeuVJMq8k45GQ17J2iKvt1HcHVUtVj5O/download.jpg"
  ],
  "output_format": "webp",
  "number_of_images": 1,
  "output_compression": 90
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/AjohJsKVZ26WEZ4tkXI7fKIun2rUbTZxct9EfRKQAPcEWadWA/tmp5ydq16cm.webp"
]
```


## Model readme

> # GPT Image 2
> 
> GPT Image 2 is OpenAI's state-of-the-art image generation model. Create images from text or edit existing images with precise, instruction-following control.
> 
> ## What it does
> 
> GPT Image 2 handles two workflows: generating images from text descriptions, and editing existing images with specific instructions. It's designed to follow your directions closely while keeping the parts you want unchanged.
> 
> When you pass reference images, GPT Image 2 processes them at high fidelity automatically. There's no knob to adjust — the model always does its best to preserve the details of the input. Pass one image to edit it, or pass multiple images to combine styles, subjects, or references into a single output.
> 
> ## Key capabilities
> 
> **Photorealism and detail**: Natural-looking images with accurate lighting, believable materials, and rich textures. From honest, unposed photography to polished commercial visuals.
> 
> **Text rendering**: Dense text, small lettering, and complex layouts like infographics, UI mockups, and marketing materials.
> 
> **Precise editing**: Targeted changes without reinterpreting the entire image. The model preserves identity, composition, and lighting while you adjust specific elements.
> 
> **Style control**: Apply consistent visual styles across different subjects, or transfer the look of one image to another with minimal prompting.
> 
> **World knowledge**: Ask for a scene set in "Bethel, New York in August 1969" and the model understands you want Woodstock — it has reasoning built in.
> 
> ## Use cases
> 
> **Image generation**: Infographics, logos, UI mockups, photorealistic scenes, comic strips, marketing visuals. Works well for both creative exploration and production-ready outputs.
> 
> **Image editing**: Style transfer, virtual clothing try-ons, product mockups, text translation in images, lighting adjustments, object removal, scene compositing. Insert people into new scenes while preserving their likeness, or swap furniture in room photos without changing the camera angle.
> 
> **Character consistency**: Build multi-page illustrations where characters look the same across different scenes — useful for children's books, storyboards, and campaigns.
> 
> ## How to get good results
> 
> **Be specific**: Describe what you want clearly. Instead of "make it better," say "add soft coastal daylight" or "change the red hat to light blue velvet."
> 
> **Use photo language for realism**: Mention lens type, lighting quality, and framing when you want photorealistic results. "Shot with a 50mm lens, soft daylight, shallow depth of field" gets you closer to real photography than generic quality terms.
> 
> **Lock what shouldn't change**: When editing, explicitly state what must stay the same. "Change only the lighting, preserve the subject's face, pose, and clothing" prevents unwanted alterations.
> 
> **Put text in quotes**: For readable text in images, put the exact copy in "quotes" and describe the typography. "Bold sans-serif, centered, high contrast" helps ensure legibility.
> 
> **Iterate with small changes**: Start with a base image, then make one adjustment at a time rather than rewriting everything.
> 
> **Reference multiple images clearly**: When working with several input images, label them by number and describe how they relate. "Apply the style from image 1 to the subject in image 2."
> 
> ## Inputs
> 
> - `prompt`: What you want to generate or how to edit the input
> - `input_images`: One or more reference images (for editing or composing)
> - `aspect_ratio`: `1:1` (square), `3:2` (landscape), or `2:3` (portrait)
> - `quality`: `low`, `medium`, `high`, or `auto` — lower quality is faster and cheaper
> - `number_of_images`: Generate up to 10 images in a single call
> - `output_format`: `webp` (default), `png`, or `jpeg`
> - `background`: `auto` or `opaque`
> - `moderation`: `auto` (default) or `low` for less strict content filtering
> - `openai_api_key`: Optional — bring your own OpenAI API key to pay OpenAI directly
> 
> ## Notes
> 
> GPT Image 2 doesn't support transparent backgrounds. For transparent PNGs, use [openai/gpt-image-1.5](https://replicate.com/openai/gpt-image-1.5).
> 
> You can try this model on the Replicate Playground at [replicate.com/playground](https://replicate.com/playground).

