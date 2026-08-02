## Basic model info

Model name: black-forest-labs/flux-2-max
Model description: The highest fidelity image model from Black Forest Labs


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

### Example (https://replicate.com/p/xs953f0q8nrmc0cv4yxtzptxwr)

#### Input

```json
{
  "prompt": "A photorealistic wide shot of a large minimalist digital billboard standing in the middle of a forest filled with purple and lavender-hued trees. Soft violet foliage surrounds the scene, creating a surreal yet elegant atmosphere. The billboard has a sleek metal frame with subtle overhead lights, blending advanced technology with dreamlike nature. On the screen, a dark glass display shows a clean, futuristic UI with gentle lavender and magenta accents. The billboard is transparent, showing the trees behind it. Centered text reads: \u201cFLUX.2 [max]\u201d in a modern sans-serif font, calm, confident, and precise. Soft daylight with a purple color cast, cinematic composition, ultra-high resolution, premium AI launch aesthetic, minimalism, tranquil mood.",
  "resolution": "1 MP",
  "aspect_ratio": "1:1",
  "input_images": [],
  "output_format": "webp",
  "output_quality": 80,
  "safety_tolerance": 2
}
```

#### Output

```json
"https://replicate.delivery/xezq/ao8amjkARBLSJBU1ke494CLvIOKReDfmiACAcuJyPtCkNlnrA/tmp67_fq1dd.webp"
```


## Model readme

> # FLUX.2 [max]
> 
> **FLUX.2 [max]** is the new top-tier image model from **Black Forest Labs**, pushing image quality, prompt understanding, and editing consistency to the highest level yet.
> 
> With **FLUX.2 [pro]**, we introduced a high-quality, production-grade model designed to scale to the highest volumes. **FLUX.2 [max]** now puts the cherry on top 🍒 — improving upon FLUX.2 [pro] across *all* dimensions.
> 
> It is easier and more intuitive to prompt, delivers superior prompt adherence, and enables even more consistent editing of **characters, objects, styles, and backgrounds**.
> 
> If you’re looking to give your professional content the final polish before publishing — at a competitive price — **FLUX.2 [max]** is the definitive choice.
> 
> ---
> 
> ## For which use cases can I use FLUX.2 [max]?
> 
> Use **FLUX.2 [max]** for the following and more:
> 
> - Use FLUX.2 [max] in scenarios where FLUX.2 [pro] lacks consistency. It delivers a higher hit/miss ratio for very complex edits involving multiple references, while offering superior prompt adherence for image generation.
> - Create top-quality product imagery from **0 to 1**, reducing time-to-online from days to minutes.
> - Transform low-quality product photos into high-quality shots ready for publishing — straight from your phone to your product website.
> - Generate cinematic, motion-picture-quality **key frames** for animation while preserving characters *and* emotions, saving thousands of dollars in pre-visualization.
> - Create systematic color variations of products, precisely controlled by **hex color codes** in your prompt.
> - Generate new **3D views** of a scene from a single image or a small set of references, enabling virtual tours of real or imagined environments.
> - Produce images grounded in **real-time information** — visualize trending products, current events, or the latest styles without manually sourcing references.
> 
> ---
> 
> ## Where should I use FLUX.2 [max] vs FLUX.2 [pro] vs FLUX.2 [flex]?
> 
> |  | **FLUX.2 [max]** | **FLUX.2 [pro]** | **FLUX.2 [flex]** |
> | --- | --- | --- | --- |
> | **General Description** | **Maximum performance.** Highest editing consistency across tasks, vast world knowledge, strongest prompt following, and faithful representation of styles. | **Top performance at an affordable price.** A production-grade image generation and editing model. | **Specialized models** optimized for typography and preserving small details. |
> | **Product Marketing** | Highest-quality product shots ready for top-tier online marketplaces. | Create scalable ad creatives for social campaigns. | Finalize content with text overlays while preserving fine details. |
> | **Movie Making** | Cinematic-quality content with accurate emotions and styles, ideal for high-end pre-visualization. | Rapid ideation and static movie banner generation. | Best for text-heavy assets like intros, credits, and advertising materials. |
> | **Creative Design Platforms (Multi-tier Subscriptions)** | Premium model for highest subscription tiers. | Backbone model for pro subscriptions handling scaled traffic. | Text-placement and overlay specialist, available across tiers with higher quotas at the top tier. |
> | **Food Imagery** | Final polish for real food images or upsampled outputs, ready for advertising. | Generate multiple upsampled variations from casual food photos, making dishes look more appealing. | Rapid daily text edits for deals and localized advertising content. |
> 
> ---
> 
> ## Why it matters
> 
> - **Highest precision image editing**  
>   FLUX.2 [max] delivers the most consistent image editing in the FLUX.2 lineup to date. It preserves colors, lighting, faces, text, and objects with exceptional fidelity, making it the default choice for high-quality use cases such as **product marketing, e-commerce, product variations, interior design, 3D reconstruction, food imagery, and video production**.
> 
> - **A model that truly understands your intent**  
>   Best-in-class prompt following for both short and long prompts. FLUX.2 [max] understands instructions more accurately than any previous FLUX model.
> 
> - **Multi-reference editing with state-of-the-art character consistency**  
>   Maintain identities, products, and styles across large batches:
>   - Up to **8 reference images** via API  
>   - Up to **10 reference images** in the Playground  
>   Create dozens of ad variants using the same face, consistent product mockups across environments, or dynamic fashion editorials with unwavering identity fidelity.
> 
> - **Our most creative model yet**  
>   Generate multiple images from the same prompt where no two results look alike — while still respecting the prompt. Ideal for ideation, exploration, and creative discovery.
> 
> - **Maximum quality at FLUX speed**  
>   Despite major gains in image quality, editing precision, and prompt adherence, FLUX.2 [max] generates content nearly as fast as FLUX.2 [pro], making it up to **3× faster** than competing models of similar quality.
> 
> ---
> 
> **FLUX.2 [max]**  
> *Maximum performance. Maximum consistency. Maximum creative control.*

