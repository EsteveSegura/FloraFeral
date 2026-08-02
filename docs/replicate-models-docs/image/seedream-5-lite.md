## Basic model info

Model name: bytedance/seedream-5-lite
Model description: Seedream 5.0 lite: image generation with built-in reasoning, example-based editing, and deep domain knowledge


## Model inputs

- prompt (required): Text prompt for image generation. Maximum 4000 characters. BytePlus recommends keeping prompts under 600 English words for best results. (string)
- image_input (optional): Input image(s) for image-to-image generation. List of 1-14 images for single or multi-reference generation. (array)
- size (optional): Image resolution: 2K (2048px) or 3K (3072px). (string)
- aspect_ratio (optional): Image aspect ratio. Use 'match_input_image' to automatically match the input image's aspect ratio. (string)
- sequential_image_generation (optional): Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images (e.g., story scenes, character variations). (string)
- max_images (optional): Maximum number of images to generate when sequential_image_generation='auto'. Range: 1-15. Total images (input + generated) cannot exceed 15. (integer)
- output_format (optional): Output image format. (string)
- return_byteplus_urls (optional): Return raw BytePlus-hosted image URLs instead of downloading the images. These URLs are recognized as trusted inputs by Seedance 2.0, bypassing face detection moderation when passed as reference images. URLs expire after 24 hours. (boolean)


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

### Example (https://replicate.com/p/644agnmbgdrmt0cwhwnsz3fe4w)

#### Input

```json
{
  "size": "2K",
  "prompt": "A Renaissance-style oil painting of a modern-day farmer's market. A woman in a hoodie and jeans examines heirloom tomatoes under a striped canvas awning, lit like a Vermeer interior. Behind her, a man with a beard sells artisanal sourdough loaves arranged in a pyramid. A golden retriever sits patiently beside a stroller. Bunches of sunflowers, purple lavender, and fresh herbs in mason jars line the tables. String lights crisscross overhead. A busker plays acoustic guitar in the background. Children chase soap bubbles. The scene has the warm, golden light of a Dutch Golden Age painting but every detail is unmistakably contemporary.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/eG2pfAezTFZtzow6LeIxb6wiyJYlcsNW6Y092mDvLFjrfWWxC/tmpud9jmfu_.png"
]
```


### Example (https://replicate.com/p/h5gb22d3hsrmy0cwhwp8hd7pxc)

#### Input

```json
{
  "size": "3K",
  "prompt": "A detailed cross-section diagram of a coral reef ecosystem, scientific illustration style. Below: volcanic basalt foundation. Middle: calcium carbonate reef structure with visible fossil layers. Upper reef: a thriving ecosystem with labeled species \u2014 staghorn coral, brain coral, clownfish in an anemone, a moray eel in a crevice, parrotfish grazing, sea turtle swimming above. Above the waterline: a small tropical island with palm trees. Depth markers on the left edge in meters. Precise linework with watercolor fills. Labels in elegant serif type. Published in Nature magazine style.",
  "aspect_ratio": "16:9"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/wUZPIpHJ3MIXGhIeWqlmCTrDalOf67gbAnndKlehPJtCylVsA/tmpzh3ov7wk.png"
]
```


### Example (https://replicate.com/p/fqwbwgp8k9rmw0cwhwp9n2pf38)

#### Input

```json
{
  "size": "2K",
  "prompt": "A large-format typographic poster for a fictional jazz festival. At the top in bold condensed sans-serif: \"BLUE NOTE SESSIONS\" in deep navy. Below in elegant script: \"Summer 2026 \u2014 Central Park, New York.\" The poster lists four performers: \"Miles Ahead Quintet / Saturday 8PM\" \"Sarah Chen Trio / Saturday 10PM\" \"The Monk Revival / Sunday 7PM\" \"Coltrane Legacy Orchestra / Sunday 9PM\". A stylized golden saxophone silhouette runs vertically along the right edge. Background is a gradient from midnight blue to warm amber. At the bottom in small caps: \"Tickets at bluenote.nyc \u2014 All ages welcome.\"",
  "aspect_ratio": "2:3"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/YrcPJs8bekVhOafodLLfSHIQFqCWIV6fuzreu2tFRqfMRusiF/tmpnxzxgtdu.png"
]
```


### Example (https://replicate.com/p/hmjg29v36nrmw0cwhwnvgzresm)

#### Input

```json
{
  "size": "3K",
  "prompt": "A 2x3 comic strip panel layout in a bold, dynamic superhero style with thick black outlines and vibrant colors. Panel 1: A masked hero in a red and gold suit stands on a rooftop at night, cape billowing, city skyline behind her. Speech bubble: \"The signal...\". Panel 2: Close-up of her eyes narrowing with determination, reflections of fire in her visor. Panel 3: She leaps off the building, dynamic diagonal composition with speed lines. Sound effect text: \"WHOOOOSH\". Panel 4: She lands in a crater on a street, one fist down, cracks radiating outward. Panel 5: She looks up at a towering robot with glowing red eyes. Speech bubble: \"You picked the wrong city.\" Panel 6: Wide shot of her charging at the robot, energy crackling from her fists. Bold title at top: \"CRIMSON VANGUARD\" issue #1.",
  "aspect_ratio": "2:3"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/lJnomOULuzJgBNDtrNd8Ivmrl4HfNB6pANsTzZOfNntG4yKWA/tmprodz3p3y.png"
]
```


### Example (https://replicate.com/p/rn3r1mrvmhrmt0cwhwsb8fjgp8)

#### Input

```json
{
  "size": "2K",
  "prompt": "A woman standing in a Tokyo alleyway at dusk, neon signs reflecting off wet pavement. Shot on expired Kodak Portra 800, pushed two stops. The tungsten light from a ramen shop spills warm orange across her face while the neon casts cool cyan highlights on her hair. Visible grain, halation around the light sources, slightly lifted blacks. She's mid-step, caught between two worlds of color.",
  "aspect_ratio": "2:3"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/gLPicWRN4L4FORGw0oo2NnOUG4fizBjcsM5bxt02vNgRfyKWA/tmpd2i2i3b0.png"
]
```


### Example (https://replicate.com/p/csr99hh919rmw0cwhwsr58c4e4)

#### Input

```json
{
  "size": "2K",
  "prompt": "A striking fashion editorial photograph of a model wearing an elaborate haute couture gown made entirely of living flowers \u2014 white peonies, pale pink roses, and trailing jasmine. She stands in a misty English garden at dawn. The dress cascades to the ground and merges with the garden floor. Dewdrops on every petal catch the first light. Her hair is pulled back severely, face serene, skin porcelain. A single monarch butterfly rests on her shoulder. The background is a soft impressionist blur of green hedgerows and pale sky. Shot on Phase One IQ4 150MP, every stamen and pistil razor sharp.",
  "aspect_ratio": "2:3"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/jgk6z2NaG3oELlJTG2ZifjbadsXTmHAPqSKjmhpQefWCfLrYB/tmpqviali82.png"
]
```


## Model readme

> # Seedream 5.0 lite
> 
> Seedream 5.0 lite is ByteDance's latest image generation model. It goes beyond standard text-to-image by adding multi-step reasoning, example-based editing, and deep domain knowledge to the generation process.
> 
> ## What's new in 5.0
> 
> ### Example-based editing
> Instead of describing a complex edit in words, show the model what you want. Give it a before/after pair, then a new image — the model figures out what changed and applies the same transformation. This works for material swaps, style transfers, scene changes, and more.
> 
> ### Logical reasoning
> Seedream 5.0 reasons through spatial relationships, physics, and processes. Ask it to put objects on a seesaw with correct weight distribution, draw a clock with hands in the right positions, or illustrate a metamorphosis across life stages — it gets the details right.
> 
> ### Deep domain knowledge
> The model understands professional conventions across architecture, science, health, and design. Feed it a floor plan sketch and get a photorealistic interior rendering. Ask for a scientific cross-section diagram and get labeled, accurate illustrations.
> 
> ## Features
> 
> - **Text-to-image**: Generate images from text prompts with strong aesthetic quality
> - **Image-to-image**: Edit existing images using natural language instructions
> - **Multi-image blending**: Combine up to 14 reference images with text to create new compositions
> - **Sequential batch generation**: Generate sets of related images (storyboards, brand identity packages, character sheets) in one request
> - **Text rendering**: Accurate typography with support for multiple languages — wrap text in double quotes for best results
> - **Output format**: PNG or JPEG output
> 
> ## Resolutions
> 
> - **2K**: Up to 2048px base dimension
> - **3K**: Up to 3072px base dimension
> 
> Supported aspect ratios: 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 21:9
> 
> ## Prompting tips
> 
> 1. **Use natural language, not keyword lists.** "A girl in a lavish dress walking under a parasol along a tree-lined path, in the style of a Monet oil painting" works better than "girl, umbrella, tree-lined street, oil painting texture."
> 2. **Use double quotes for text rendering.** If you want specific text in your image, wrap it in double quotation marks.
> 3. **Be specific about what to keep.** When editing, tell the model what shouldn't change: "Replace the hat with a crown, keeping the pose and expression unchanged."
> 4. **For example-based editing, show don't tell.** When the transformation is hard to describe in words, provide a before/after example pair as input images.
> 5. **Specify your use case.** Telling the model "Design a logo for a gaming company" gives better results than just describing the visual elements.
> 
> ## API quickstart
> 
> ```python
> import replicate
> 
> output = replicate.run(
>     "bytedance/seedream-5",
>     input={
>         "prompt": "A color film-inspired portrait with shallow depth of field, fine grain suggesting high ISO film stock, candid documentary style",
>         "size": "2K",
>         "aspect_ratio": "3:2",
>     }
> )
> 
> print(output)
> ```
> 
> ### With image input
> 
> ```python
> output = replicate.run(
>     "bytedance/seedream-5",
>     input={
>         "prompt": "Transform the color grading to match a Wong Kar-wai film — saturated teal shadows, warm amber highlights, soft diffusion",
>         "image_input": ["https://example.com/portrait.jpg"],
>         "size": "2K",
>     }
> )
> ```
> 
> ### Batch generation
> 
> ```python
> output = replicate.run(
>     "bytedance/seedream-5",
>     input={
>         "prompt": "A series of 4 coherent illustrations of a courtyard across the four seasons",
>         "sequential_image_generation": "auto",
>         "max_images": 4,
>     }
> )
> ```

