## Basic model info

Model name: black-forest-labs/flux-2-flex
Model description: Max-quality image generation and editing with support for ten reference images


## Model inputs

- prompt (required): Text prompt for image generation (string)
- input_images (optional): List of input images for image-to-image generation. Maximum 10 images. Must be jpeg, png, gif, or webp. (array)
- aspect_ratio (optional): Aspect ratio for the generated image. Use 'match_input_image' to match the first input image's aspect ratio. (string)
- resolution (optional): Resolution in megapixels. Up to 4 MP is possible, but 2 MP or below is recommended. The maximum image size is 2048x2048, which means that high-resolution images may not respect the resolution if aspect ratio is not 1:1.

Resolution is not used when aspect_ratio is 'custom'. When aspect_ratio is 'match_input_image', use 'match_input_image' to match the input image's resolution (clamped to 0.5-4 MP). (string)
- width (optional): Width of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16 (if it's not, it will be rounded to nearest multiple of 16). (integer)
- height (optional): Height of the generated image. Only used when aspect_ratio=custom. Must be a multiple of 16 (if it's not, it will be rounded to nearest multiple of 16). (integer)
- safety_tolerance (optional): Safety tolerance, 1 is most strict and 5 is most permissive (integer)
- seed (optional): Random seed. Set for reproducible generation (integer)
- prompt_upsampling (optional): Automatically modify the prompt for more creative generation (boolean)
- steps (optional): Number of inference steps (integer)
- guidance (optional): Guidance scale for generation. Controls how closely the output follows the prompt (number)
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

### Example (https://replicate.com/p/bqxav211vnrm80ctqckad81qxg)

#### Input

```json
{
  "prompt": "Fluffy cotton candy sculpted into voluminous 3D letters spelling \"Flex\" in swirls of bubblegum pink, baby blue, and soft lavender, held on a wooden stick in front of a vintage pastel cotton candy cart with hand-painted signage reading \"Run FLUX.2 [flex] on Replicate!\" on a sunny carnival boardwalk. Shot on Kodak Portra 160 with a Mamiya RZ67, bright midday summer sunlight, the spun sugar texture catching light with wispy translucent edges and denser pillowy centers, visible sticky strands, a vintage pastel Ferris wheel and striped circus tents in the soft-focus background, weathered wooden boardwalk planks beneath.",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [],
  "output_format": "webp",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/DxBvdhGcpX6FLxoUikZhQdbYs87OMEv83563fspgBuXS7a2KA/tmp249z689p.webp"
```


### Example (https://replicate.com/p/f6j5thqvjnrma0ctqe6bxbezs8)

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
  "prompt_upsampling": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/AoDktPZMjJrRGFTrjRXRAx6lmwzYB1qtDYQNeoe7JeI5fdzWB/tmpg3nd4scz.jpg"
```


### Example (https://replicate.com/p/hrv5h4jaf5rm80ctqeg9y1jkm8)

#### Input

```json
{
  "prompt": "The man is leaning against the wall reading a newspaper with the title \"FLUX.2\"\nThe woman is walking past him, carrying one of the tote bags with the text \"R8\" on it, wearing the black boots The focus is on their contrasting styles, her relaxed, creative vibe versus his formal look.",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [
    "https://replicate.delivery/pbxt/O7lPaVJnrzTIXkrZAT0aVgatdR9vMab15CvzMMXZIS1JIPRY/jay-soundo.jpg",
    "https://replicate.delivery/pbxt/O7lPbBWUQnWRAGjqJhdgH8us43PBhj0I6ibihABnKj9tNp9L/bags.jpg",
    "https://replicate.delivery/pbxt/O7lPavCpg5ueAmZowUWShAeAZf6IJzitzWP0xCZP6X32phRk/woman-by-car.jpg",
    "https://replicate.delivery/pbxt/O7lPbHGa4uKdbn8STRJjEMmCWehmsB1y07LFaVhS8uwnbWCr/shoes.jpg",
    "https://replicate.delivery/pbxt/O7lPaxMstjGEZmDD6SsVEemF7mbelXC2in1jm7n6sNNlj2YJ/buildings.jpg"
  ],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/wjZleLeN14mxYk6ge5Si8AN8hAP6ga7fmqeToxwm321gneNbF/tmphaic5du6.jpg"
```


### Example (https://replicate.com/p/hgavaafwb9rm80ctqen93x59jc)

#### Input

```json
{
  "prompt": "this exact image but the couple next to the fire replaced by the people in image 2 and 3",
  "resolution": "1 MP",
  "aspect_ratio": "3:4",
  "input_images": [
    "https://replicate.delivery/pbxt/O7lafo8rMDDriTkaHai6myxwfWKjgUaklcFJUNfqcJZYLaWb/campfire.jpg",
    "https://replicate.delivery/pbxt/O7laerU6Uxxg9h8SZkLm42HpCRfQ6IrOLXmlJczakyg7XXe1/jay-soundo.jpg",
    "https://replicate.delivery/pbxt/O7laevdOTIsAbw8gKb137e1CBQ7mkVGlCshNszadUiOwkQR1/woman-by-car.jpg"
  ],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/qiGjhjKuiz53LVonkaT92odpyw5YMA5gVqOQ5wSr6u00fb2KA/tmpno431dzl.jpg"
```


### Example (https://replicate.com/p/tgpccs4gznrme0ctqgwtej2pxw)

#### Input

```json
{
  "prompt": "{\n  \"scene\": \"Professional studio product photography setup with polished concrete surface\",\n  \"subjects\": [\n    {\n      \"description\": \"Minimalist ceramic coffee mug with steam rising from hot coffee inside. The mug has white text: Run Flux.2 [flex] on Replicate\",\n      \"pose\": \"Stationary on surface\",\n      \"position\": \"Center foreground on polished concrete surface\",\n      \"color_palette\": [\"goo colored ceramic with red, yellow, orange, purple\"]\n    }\n  ],\n  \"style\": \"Ultra-realistic product photography with commercial quality\",\n  \"color_palette\": [\"red\", \"yellow\", \"orange\", \"purple\", \"concrete gray\", \"soft white highlights\"],\n  \"lighting\": \"Three-point softbox setup creating soft, diffused highlights with no harsh shadows\",\n  \"mood\": \"Clean, professional, minimalist\",\n  \"background\": \"Polished concrete surface with studio backdrop\",\n  \"composition\": \"rule of thirds\",\n  \"camera\": {\n    \"angle\": \"high angle\",\n    \"distance\": \"medium shot\",\n    \"focus\": \"Sharp focus on steam rising from coffee and mug details\",\n    \"lens-mm\": 85,\n    \"f-number\": \"f/5.6\",\n    \"ISO\": 200\n  }\n}",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [],
  "output_format": "jpg",
  "output_quality": 80,
  "safety_tolerance": 2,
  "prompt_upsampling": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/KgizEOElkUbiBhPrccVD24W9MeXeWxkA59P7enuGq8kdh0ZrA/tmpmuva6rxw.jpg"
```


## Model readme

> # Flux 2 Flex
> 
> Flux 2 Flex from Black Forest Labs gives you control over the quality-speed trade-off when generating images. Unlike typical text-to-image models that make these decisions for you, Flex lets you adjust how many steps to run and how strongly the model should follow your prompt.
> 
> This is the model to reach for when you're iterating on designs, creating typography-heavy work like infographics or UI mockups, or editing images with multiple reference photos.
> 
> ## What it's good at
> 
> Text rendering is where Flex really shines. The model can reliably generate clean typography, readable captions, and complex layouts—the kind of stuff that usually takes multiple attempts with other models. If you're making memes, posters, or product mockups with text, this is your model.
> 
> The multi-reference feature lets you blend up to ten images into a single output while keeping things coherent. Use this for style transfer, compositional guidance, or when you want to combine elements from different sources.
> 
> ## Practical tips
> 
> **Start simple with plain text prompts.** You don't need to overthink it:
> 
> ```
> A neon-lit cyberpunk alley at night, rain-slick streets, reflective puddles
> ```
> 
> **For more control, use a structured approach.** Describe what you want in clear sections:
> 
> ```
> Scene: Modern coffee shop interior with large windows
> Subjects: Barista preparing espresso, two customers chatting at a table
> Lighting: Warm afternoon sunlight streaming through windows
> Style: Photorealistic with shallow depth of field
> Camera: Shot at eye level with 35mm lens
> ```
> 
> **Negative prompts don't work here.** Instead of saying what you don't want, be specific about what you do want. Say "clean background" instead of "no clutter."
> 
> ## How the parameters work
> 
> **Guidance scale** controls how closely the model sticks to your prompt. Lower values (around 2-3) give the model more creative freedom. Higher values (4-5) make it follow your instructions more literally. Start around 3.5 and adjust based on what you're seeing.
> 
> **Number of steps** is your quality dial. Fewer steps (6-10) generate images quickly but with less detail—good for rapid prototyping. More steps (20-50) take longer but produce sharper results with better typography. For most work, 20 steps hits a good balance.
> 
> **Multi-reference images** let you upload up to ten reference photos (14 MB total). The model will extract style, composition, and other visual elements to inform the generation. This is useful for maintaining consistent characters across outputs or matching a specific aesthetic.
> 
> ## Image editing
> 
> Flex handles editing at resolutions up to 4 megapixels. Upload a base image and describe what you want to change or add. The model will make modifications while keeping the rest of the image coherent.
> 
> For style transfer or compositional changes, provide reference images alongside your edit instructions. The model uses these to understand the direction you're going.
> 
> ## What to expect
> 
> Output resolution is 1024 × 1024 pixels in PNG format. The model accepts PNG or JPEG inputs for reference images and editing tasks.
> 
> Generation time varies based on your step count—expect 10-30 seconds for typical runs. Higher resolutions and more steps will take longer.
> 
> This model is built for production workflows where you need reliable typography and the flexibility to fine-tune quality versus speed. If you're making quick sketches or need the absolute highest fidelity, check out the other models in the [Flux family](https://replicate.com/collections/flux).
> 
> ## Try it yourself
> 
> You can experiment with Flux 2 Flex on the Replicate Playground at [replicate.com/playground](https://replicate.com/playground).

