## Basic model info

Model name: black-forest-labs/flux-2-pro
Model description: High-quality image generation and editing with support for eight reference images


## Model inputs

- prompt (required): Text prompt for image generation (string)
- input_images (optional): List of input images for image-to-image generation. Maximum 8 images. Must be jpeg, png, gif, or webp. (array)
- aspect_ratio (optional): Aspect ratio for the generated image. Use 'match_input_image' to match the first input image's aspect ratio. (string)
- resolution (optional): Resolution in megapixels. Up to 4 MP is possible, but 2 MP or below is recommended. The maximum image size is 2048x2048, which means that high-resolution images may not respect the resolution if aspect ratio is not 1:1.

Resolution is not used when aspect_ratio is 'custom'. When aspect_ratio is 'match_input_image', use 'match_input_image' to match the input image's resolution (clamped to 0.5-4 MP). (string)
- width (optional): Width of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16 (if it's not, it will be rounded to nearest multiple of 16). (integer)
- height (optional): Height of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16 (if it's not, it will be rounded to nearest multiple of 16). (integer)
- safety_tolerance (optional): Safety tolerance, 1 is most strict and 5 is most permissive (integer)
- seed (optional): Random seed. Set for reproducible generation (integer)
- output_format (optional): Format of the output images. (string)
- output_quality (optional): Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs (integer)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/rwn48vjygdrma0ctqcgbrd06t4)

#### Input

```json
{
  "prompt": "Glossy candy-colored 3D letters in hot pink, electric orange, and lime green on a sun-drenched poolside patio with bold terrazzo tiles and vintage lounge chairs in turquoise and yellow. Shot on Kodachrome film with a Hasselblad 500C, warm golden afternoon sunlight, dramatic lens flare, punchy oversaturated colors with that distinctive 70s yellow-orange cast, shallow depth of field with the text sharp in the foreground, tropical palms and a sparkling aquamarine pool behind that spells out \"Run FLUX.2 [pro] on Replicate!\"",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [],
  "output_format": "webp",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/EXuyWm6qQuK9J19lUCtc9sbO4k2RyHwoOP6GoYMCpeyM4a2KA/tmpzd16m4x2.webp"
```


### Example (https://replicate.com/p/4xa7gdmjj5rmc0ctqdksd7z4q4)

#### Input

```json
{
  "prompt": "The person from image 1 is petting the cat from image 2, the bird from image 3 is next to them",
  "resolution": "1 MP",
  "aspect_ratio": "match_input_image",
  "input_images": [
    "https://replicate.delivery/pbxt/O7kSsp5sasepfpL7XJm6lcALZEaFLxHYN6UrQONik4Z19QIM/woman-by-car.webp",
    "https://replicate.delivery/pbxt/O7kSt7OV4b92EmiTyXsqN51O3aPTEyWTQfMha9kHNFaL4ylt/cat-at-window.webp",
    "https://replicate.delivery/pbxt/O7kSscCDcTZNDbkIdDzXMIpw5rAufD3dpcXBBUGRBbc5ZnTo/bird.webp"
  ],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/rK8Zcn68IPIEMtGHj4fe6YZfWwcxz45zfb4DGvKDtLyhmbzWB/tmpec2opkym.jpg"
```


### Example (https://replicate.com/p/errce0p8ssrma0ctqdv9efe794)

#### Input

```json
{
  "prompt": "change the car to blue",
  "resolution": "1 MP",
  "aspect_ratio": "match_input_image",
  "input_images": [
    "https://replicate.delivery/pbxt/O7kie6B4lIVLUi3ikTBWZCviUUzNeIVv2HLduINkdxlnNkPZ/woman-by-car.jpg"
  ],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/qwxw1mHmUGarO93xDG2NwAjeg8u9hNePulz8InznPGZ8I3sVA/tmpso5ny8db.jpg"
```


### Example (https://replicate.com/p/pjh9wf0he1rma0ctqe6a1tgywm)

#### Input

```json
{
  "prompt": "Photorealistic infographic showing the complete Berlin TV Tower (Fernsehturm) from ground base to antenna tip, full vertical view with entire structure visible including concrete shaft, metallic sphere, and antenna spire. Slight upward perspective angle looking up toward the iconic sphere, perfectly centered on clean white background. Left side labels with thin horizontal connector lines: the text '368m' in extra large bold dark grey numerals (#2D3748) positioned at exactly the antenna tip with 'TOTAL HEIGHT' in small caps below. The text '207m' in extra large bold with 'TELECAF\u00c9' in small caps below, with connector line touching the sphere precisely at the window level. Right side label with horizontal connector line touching the sphere's equator: the text '32m' in extra large bold dark grey numerals with 'SPHERE DIAMETER' in small caps below. Bottom section arranged in three balanced columns: Left - Large text '986' in extra bold dark grey with 'STEPS' in caps below. Center - 'BERLIN TV TOWER' in bold caps with 'FERNSEHTURM' in lighter weight below. Right - 'INAUGURATED' in bold caps with 'OCTOBER 3, 1969' below. At the very bottom center, below the columns, add small italicized text 'Run Flux.2 on Replicate' in medium grey (#A0AEC0). All typography in modern sans-serif font (such as Inter or Helvetica), color #2D3748 unless specified, clean minimal technical diagram style. Horizontal connector lines are thin, precise, and clearly visible, touching the tower structure at exact corresponding measurement points. Professional architectural elevation drawing aesthetic with dynamic low angle perspective creating sense of height and grandeur, poster-ready infographic design with perfect visual hierarchy.",
  "resolution": "1 MP",
  "aspect_ratio": "9:16",
  "input_images": [],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/xGyq3mJeG0wlfUSw1LMSG94xfUGkwyYBLOlWpeHU8Qnw6dzWB/tmpy_bgo81_.jpg"
```


### Example (https://replicate.com/p/hrf30ppv3nrm80ctqgxbsr7tvw)

#### Input

```json
{
  "prompt": "{\n  \"scene\": \"Professional studio product photography setup with polished concrete surface\",\n  \"subjects\": [\n    {\n      \"description\": \"Minimalist ceramic coffee mug with steam rising from hot coffee inside. The mug has white text: Run Flux.2 [pro] on Replicate\",\n      \"pose\": \"Stationary on surface\",\n      \"position\": \"Center foreground on polished concrete surface\",\n      \"color_palette\": [\"goo colored ceramic with red, yellow, orange, purple\"]\n    }\n  ],\n  \"style\": \"Ultra-realistic product photography with commercial quality\",\n  \"color_palette\": [\"red\", \"yellow\", \"orange\", \"purple\", \"concrete gray\", \"soft white highlights\"],\n  \"lighting\": \"Three-point softbox setup creating soft, diffused highlights with no harsh shadows\",\n  \"mood\": \"Clean, professional, minimalist\",\n  \"background\": \"Polished concrete surface with studio backdrop\",\n  \"composition\": \"rule of thirds\",\n  \"camera\": {\n    \"angle\": \"high angle\",\n    \"distance\": \"medium shot\",\n    \"focus\": \"Sharp focus on steam rising from coffee and mug details\",\n    \"lens-mm\": 85,\n    \"f-number\": \"f/5.6\",\n    \"ISO\": 200\n  }\n}",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/A19fBcdcemvzL0qWisFe43KV3KBz2HV7n6fOLo6YGSEDHpzWB/tmpq3mpq5_m.jpg"
```


### Example (https://replicate.com/p/y27283sg6srma0ctqh0tjtrzdw)

#### Input

```json
{
  "prompt": "this exact image but the couple next to the fire is replaced by the people in image 2 and 3",
  "resolution": "1 MP",
  "aspect_ratio": "3:4",
  "input_images": [
    "https://replicate.delivery/pbxt/O7o67ArxiVtSQL9PlXRUt6WkFyudWGi4ig7Ez6u9vRNTW6XH/campfire.jpg",
    "https://replicate.delivery/pbxt/O7nxUlRnxGieBbqXqeFkTddC3xVJpvLPajC3Hlbczk3FW1sI/jay-soundo.jpg",
    "https://replicate.delivery/pbxt/O7nxUrruI8z37aQjPd0tniQAdkp86jNKlmr7NMpU4oa5hHXc/woman-by-car.jpg"
  ],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/FUAAfqs53GVWT6l0aTgC9eeCYk1HK3kq9la7B5DN9u7kw0ZrA/tmpzpavqdgi.jpg"
```


## Model readme

> # Flux 2 Pro
> 
> Flux 2 Pro is an image generation and editing model by Black Forest Labs. It creates high-quality images from text prompts and can edit existing images using natural language instructions. The model handles complex text rendering, photorealistic details, and maintains consistent characters or styles across multiple reference images.
> 
> ## What it does
> 
> Generate images from text descriptions, edit existing images, or combine multiple reference images to create something new. The model understands detailed instructions and can work with up to eight reference images at once on the API.
> 
> Some things it's particularly good at:
> 
> **Text rendering** - The model can write legible text in images, including complex typography, infographics, and user interface mockups. This works reliably in production, not just for simple cases.
> 
> **Photorealism** - Sharp textures, natural lighting, and realistic details make this useful for product photography, architectural visualization, and scenes that need to look like real photographs.
> 
> **Character consistency** - Use multiple reference images to maintain the same character, product, or style across different generations. This helps when you need a consistent look across a series of images.
> 
> **Structured prompting** - You can use JSON to precisely control scene composition, including camera angles, lighting, color palettes, and the positioning of subjects.
> 
> ## How to use it
> 
> ### Basic text-to-image
> 
> Write a clear description of what you want. The model works best when you organize your prompt by importance: subject first, then action, style, and context.
> 
> For example: "A sleek silver sports car racing along a coastal highway at sunset, high-dynamic-range, hyper-realistic"
> 
> The more specific you are, the more predictable the output.
> 
> ### Editing images
> 
> Upload an image and describe what to change using natural language. You can reference specific parts of the image or point to other reference images by their index number.
> 
> For example: "Replace the background with the beach in image 3" or "Make the woman in the blue dress wear a red jacket"
> 
> ### JSON prompting
> 
> For precise control, you can structure your prompt as JSON with fields like scene, subjects, style, lighting, camera, and color_palette. Each field accepts plain English descriptions.
> 
> The camera field lets you specify angle, distance, focal length, aperture, and ISO. The color_palette field accepts hex codes or color names to control the overall look.
> 
> ### Using reference images
> 
> You can upload multiple reference images to guide the generation. The model will use these to understand style, composition, or specific elements you want to include. The total input size is limited to 9 megapixels on the API.
> 
> ## Things to know
> 
> **No negative prompts** - The model doesn't understand negative prompts like "no text" or "no extra fingers." If you try using them, it might actually add what you're trying to avoid. Instead, describe what you want to see. Write "Clean background with natural hands at rest out of frame" instead of "no cluttered background, no extra fingers."
> 
> **Color control** - You can use hex codes in your prompts to match exact colors. This is useful for brand work or when you need specific color accuracy.
> 
> **Resolution** - The model can edit images at resolutions up to 4 megapixels while keeping detail and coherence.
> 
> **Multi-reference editing** - When working with multiple reference images, you can point to specific images by their index number to tell the model which elements to use from where.
> 
> ## About the model
> 
> Flux 2 Pro uses a latent flow matching architecture that combines the Mistral-3 24 billion parameter vision-language model with a rectified flow transformer. The vision-language model brings real-world knowledge and context, while the transformer handles spatial relationships, materials, and composition. The model was trained from scratch with a new latent space optimized for both image quality and efficient learning.
> 
> Black Forest Labs built Flux 2 Pro as part of their open core approach - releasing both open-weight models for research and community use, alongside production-ready endpoints for teams that need reliability and scale.
> 
> ## Tips for better results
> 
> Use clear, specific language. The more detail you give, the more control you have over the output.
> 
> Describe what you want rather than what you don't want. Positive descriptions work much better than trying to exclude things.
> 
> Try hex codes when you need exact colors.
> 
> Experiment with multiple reference images to blend styles or maintain consistency across generations.
> 
> Keep your prompts concise but descriptive. You don't need to write paragraphs - just include the important details organized by priority.
> 
> ---
> 
> You can try Flux 2 Pro on the Replicate playground at replicate.com/playground

