## Basic model info

Model name: google/nano-banana-2
Model description: Google's fast image generation model with conversational editing, multi-image fusion, and character consistency


## Model inputs

- prompt (required): A text description of the image you want to generate (string)
- image_input (optional): Input images to transform or use as reference (supports up to 14 images) (array)
- aspect_ratio (optional): Aspect ratio of the generated image (string)
- resolution (optional): Resolution of the generated image. Higher resolutions take longer to generate. (string)
- google_search (optional): Use Google Web Search grounding to generate images based on real-time information (e.g. weather, sports scores, recent events). (boolean)
- image_search (optional): Use Google Image Search grounding to find web images as visual context for generation. When enabled, web search is also used automatically. (boolean)
- output_format (optional): Format of the output image (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/pazq5tpd7xrmr0cwkbb8ek35pr)

#### Input

```json
{
  "prompt": "Create a picture of a nano banana 2 dish in a fancy restaurant with a Replicate theme",
  "image_input": [],
  "aspect_ratio": "match_input_image",
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/PNicQdZsGyLWNpXvNX4pqiaaotTP5j23J9cSyTuReLpLVxFLA/tmpx6zdponu.jpeg"
```


### Example (https://replicate.com/p/bca2qphr91rmw0cwkbb9ped188)

#### Input

```json
{
  "prompt": "a golden retriever puppy playing in autumn leaves, warm sunlight"
}
```

#### Output

```json
"https://replicate.delivery/xezq/0plMmeVefCSxxJV8MvxSWcIpzg08BRJX6pA9vKRJO02zTFXsA/tmp5hj7uutl.jpeg"
```


### Example (https://replicate.com/p/5cjmq0082hrmt0cwkbq8djs220)

#### Input

```json
{
  "prompt": "Anime character design, full color, concept sketch against white. Just the characters, no other sketches or words. A young adult man and woman on their phones, sitting cross legged, back to back. Pick interesting fashion choices, hair style and unusual footwear.",
  "image_input": [],
  "aspect_ratio": "1:1",
  "output_format": "jpg"
}
```

#### Output

```json
"https://replicate.delivery/xezq/TZKrfYQ0XjUTKC5yAB1xV2HIQC1NIDYx4OXs1aGvCD1HhxFLA/tmp54fifmcm.jpeg"
```


### Example (https://replicate.com/p/gd6jm64pc1rmw0cwkbtrame0tm)

#### Input

```json
{
  "prompt": "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep wrinkles and a warm smile, carefully inspecting a freshly glazed tea bowl in his rustic sun-drenched workshop. Soft golden hour light streams through a window, highlighting the texture of the clay. Shot with an 85mm portrait lens, shallow depth of field with creamy bokeh.",
  "aspect_ratio": "3:4"
}
```

#### Output

```json
"https://replicate.delivery/xezq/IigIzxqBovIzM5GIkBm6Ef3LVeuT0djhy464hZdQHF8AKjLWA/tmpaiuubx6q.jpeg"
```


### Example (https://replicate.com/p/xycfvywebhrmw0cwkbvbz4sa6m)

#### Input

```json
{
  "prompt": "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat, munching on a green bamboo leaf. Bold clean outlines, simple cel-shading, vibrant color palette. White background.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/qnWLBLoTfV0vNSYB127ZEm6JMoOFNvdrWBZd4r4zTh4dlxFLA/tmp2oqfsqal.jpeg"
```


### Example (https://replicate.com/p/f6q14t3pasrmw0cwkbvr5ygnz0)

#### Input

```json
{
  "prompt": "A scientifically accurate cross-section infographic of the human eye, with clean labels pointing to the cornea, iris, pupil, lens, retina, and optic nerve. Modern flat design style with a dark navy background and bright accent colors. Title reads 'ANATOMY OF THE HUMAN EYE' in a clean sans-serif font at the top.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/6mD39k2BFyIAFlO3WJqx8hIZ2Yp4e2ALoM1qJeQz0A64LjLWA/tmppsnii9dg.jpeg"
```


### Example (https://replicate.com/p/5epfabq5zhrmw0cwkbvvbe7fr4)

#### Input

```json
{
  "prompt": "A cinematic wide shot of a lone astronaut standing on the surface of Mars, looking up at Earth visible in the dusty orange sky. Dramatic rim lighting from the setting sun creates a silhouette. Sci-fi atmosphere, photorealistic. Anamorphic lens flare.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/a6ZAPpRP0jKNCxBigH8HosbwZf2FtsnpPX5715yCjoiKmxFLA/tmpvkyyuodm.jpeg"
```


### Example (https://replicate.com/p/8pn0xwawd9rmt0cwkbw8wdhpz0)

#### Input

```json
{
  "prompt": "A watercolor painting of a Venetian canal at dawn. Gondolas are moored along weathered stone walls. Soft pastel reflections shimmer on the water. Loose, expressive brushstrokes with visible paper texture. Warm golden and cool blue tones.",
  "aspect_ratio": "3:2"
}
```

#### Output

```json
"https://replicate.delivery/xezq/dYKsIq3ekWXwE6UweedeDWSAaAJNr1CWk2vbYwS7hXjXzMuYB/tmp3t1o4coa.jpeg"
```


### Example (https://replicate.com/p/bx55z76pc9rmt0cwkbwbv8601r)

#### Input

```json
{
  "prompt": "A modern minimalist logo for a sustainable coffee brand called 'EVERGREEN ROASTERS'. The logo features a stylized coffee leaf integrated with a coffee bean. Clean geometric lines, forest green and cream color scheme. White background.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/NKeJ1uwvfwsCFkb58grsKRBVExxF5acafVeoIUlIeKnJqZcxC/tmpmwiwv6gk.jpeg"
```


### Example (https://replicate.com/p/sty1jqtjc5rmt0cwkbwvm4hmtm)

#### Input

```json
{
  "prompt": "Transform this photograph into a Studio Ghibli anime style illustration. Keep the same composition but render everything with soft cel-shading, warm colors, and the dreamy atmosphere of a Miyazaki film.",
  "image_input": [
    "https://replicate.delivery/xezq/Res3dPZneqnk9E9z0qrPtIQchh0cc36J385ISGlJd3eeQLuYB/tmpcc4o9c5a.jpeg"
  ],
  "aspect_ratio": "match_input_image"
}
```

#### Output

```json
"https://replicate.delivery/xezq/Rh8hOr979h45BZnyYAMb12xy5Ef2ZIEPheIEwja3aOl4NjLWA/tmpnc9vxl6b.jpeg"
```


### Example (https://replicate.com/p/z92xaxpyhsrmw0cwkbwrm6jq8w)

#### Input

```json
{
  "prompt": "A 3-panel comic strip in a clean, modern cartoon style. Panel 1: A programmer stares at their screen with a confused expression, coffee cup in hand. Panel 2: The programmer's eyes widen as they spot the bug. Panel 3: The programmer celebrates with arms raised, confetti falls, and the screen shows a green checkmark. Caption at the bottom reads 'THE DEBUGGING EXPERIENCE'.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
"https://replicate.delivery/xezq/YRmQpEdlIs6ULZPLTEiYh2Nd153SCW1IlssGry5FeWeZOjLWA/tmp_9laf92c.jpeg"
```


### Example (https://replicate.com/p/61egkqv1v9rmt0cwkbxbzw766w)

#### Input

```json
{
  "prompt": "An isometric 3D miniature diorama of a cozy Japanese ramen shop at night. Warm light spills from the entrance. Tiny detailed figures sit at the counter. Steam rises from bowls of ramen. Rain puddles reflect neon signs on the street. Tilt-shift photography effect.",
  "aspect_ratio": "1:1"
}
```

#### Output

```json
"https://replicate.delivery/xezq/aW4vaIf7HUzcXqnlgGeyic1l1eH0zUrRxNGtwcdDYOfu7MuYB/tmp7ag51byn.jpeg"
```


## Model readme

> Nano Banana 2 is Google's latest image generation model, built on Gemini 3.1 Flash Image. It's the high-efficiency counterpart to [Nano Banana Pro](https://replicate.com/google/nano-banana-pro) — optimized for speed and high-volume use cases while still producing high-fidelity images.
> 
> Google [announced Nano Banana 2](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/) on February 26, 2026, describing it as their "best image generation and editing model" — combining Pro-level visual quality with Flash-level speed and pricing.
> 
> ## What it can do
> 
> **Generate images from text.** Describe what you want and the model creates it — photorealistic scenes, illustrations, product mockups, whatever you need.
> 
> ![A cozy café interior at golden hour](https://replicate.delivery/xezq/Res3dPZneqnk9E9z0qrPtIQchh0cc36J385ISGlJd3eeQLuYB/tmpcc4o9c5a.jpeg)
> 
> **Render text accurately.** One of the standout improvements over previous Flash image models — text in images is crisp and readable, with support for multiple languages.
> 
> 
> **Edit existing images.** Pass in one or more images along with a text prompt to transform them — change backgrounds, swap colors, adjust styles, or combine multiple images into one scene.
> 
> **Use up to 14 reference images.** Feed in multiple images for style transfer, image combination, or complex editing tasks that draw on several visual references at once.
> 
> ## Key improvements over the original Nano Banana
> 
> - Higher fidelity output with richer textures and sharper details
> - Much better text rendering and multilingual support
> - Stronger instruction following for complex prompts
> - New aspect ratios: 1:4, 4:1, 1:8, and 8:1 (in addition to the standard set)
> - Multiple output resolutions: 512px, 1K, 2K, and 4K
> 
> ## Aspect ratios
> 
> Supports `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, and `21:9`. Set `match_input_image` to automatically match the aspect ratio of your input image.
> 
> ## Output format
> 
> Choose between `jpg` (default) and `png`.
> 
> ## Links
> 
> - [Google's announcement blog post](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/)
> - [Gemini 3.1 Flash Image API docs](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image-preview)
> - [Image generation guide](https://ai.google.dev/gemini-api/docs/image-generation)
> 
> You can try Nano Banana 2 on the [Replicate playground](https://replicate.com/playground).

