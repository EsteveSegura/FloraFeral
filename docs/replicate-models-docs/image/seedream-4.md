## Basic model info

Model name: bytedance/seedream-4
Model description: Unified text-to-image generation and precise single-sentence editing at up to 4K resolution


## Model inputs

- prompt (required): Text prompt for image generation (string)
- image_input (optional): Input image(s) for image-to-image generation. List of 1-10 images for single or multi-reference generation. (array)
- size (optional): Image resolution: 1K (1024px), 2K (2048px), 4K (4096px), or 'custom' for specific dimensions. (string)
- aspect_ratio (optional): Image aspect ratio. Only used when size is not 'custom'. Use 'match_input_image' to automatically match the input image's aspect ratio. (string)
- width (optional): Custom image width (only used when size='custom'). Range: 1024-4096 pixels. (integer)
- height (optional): Custom image height (only used when size='custom'). Range: 1024-4096 pixels. (integer)
- sequential_image_generation (optional): Group image generation mode. 'disabled' generates a single image. 'auto' lets the model decide whether to generate multiple related images (e.g., story scenes, character variations). (string)
- max_images (optional): Maximum number of images to generate when sequential_image_generation='auto'. Range: 1-15. Total images (input + generated) cannot exceed 15. (integer)
- enhance_prompt (optional): Enable prompt enhancement for higher quality results, this will take longer to generate. (boolean)


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

### Example (https://replicate.com/p/7g68gknx8drme0cs5s9bdyptjg)

#### Input

```json
{
  "size": "2K",
  "width": 2048,
  "height": 2048,
  "prompt": "a selection of photos of this woman looking at a store front and perusing a book shop that's called \"Seedream 4\", it sells books, a poster in the window says \"Seedream 4 now on Replicate\"",
  "max_images": 4,
  "image_input": [
    "https://replicate.delivery/pbxt/NgNa2k87ua7v4G2Z51JpiWFcjXoTV1wPVQ86YjmLPfREnWfD/0_1.webp"
  ],
  "aspect_ratio": "4:3",
  "sequential_image_generation": "auto"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/W4oDJ3dpV0phN1eLuLsHvZT1OjepgjA6hOqXg0nA0juhe4mqA/tmpe2n7sv24.jpg",
  "https://replicate.delivery/xezq/D0RIbLaYuGaPGdCRO3Gssvs7iA02u7AK1QhfFbBXqzyQPupKA/tmpppiemf81.jpg",
  "https://replicate.delivery/xezq/LGitpMjljpLdPNkctQwUZVRIoEJSB2zgJub8DLKFEFaoH3UF/tmp75bf8ax_.jpg"
]
```


### Example (https://replicate.com/p/9ebj5m296nrme0cs6dhrr9zf9m)

#### Input

```json
{
  "size": "2K",
  "width": 2048,
  "height": 2048,
  "prompt": "a photo of a store front called \"Seedream 4\", it sells books, a poster in the window says \"Seedream 4 now on Replicate\"",
  "max_images": 1,
  "image_input": [],
  "aspect_ratio": "4:3",
  "sequential_image_generation": "disabled"
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/fnJ14cVwXep4g0qfuyurzx9Dsk8eld3VDywecSJNNQg5kJeUF/tmp7cvbut6o.jpg"
]
```


## Model readme

> # Seedream 4.0
> 
> Seedream 4.0 is ByteDance’s next-generation image creation model that combines text-to-image generation and image editing into a single architecture. It offers fast, high-resolution image generation, rich prompt understanding, and support for multi-reference and batch workflows.
> 
> ## Key Features
> 
> - **Unified generation & editing**  
>   Both text-to-image creation and image modifications (e.g. removing or replacing objects) are handled in one model—no need for separate tools.
> 
> - **High-resolution and fast inference**  
>   Produces outputs up to 4K with significantly faster inference than prior versions.
> 
> - **Batch and multi-reference support**  
>   Accepts multiple reference images and returns multiple outputs in one request.
> 
> - **Natural-language prompt editing**  
>   Make precise edits using simple language, like “Remove the boy in this picture” or “Replace this dog with a Schnauzer.”
> 
> - **Versatile style transfer**  
>   Apply diverse visual styles such as watercolor, cyberpunk, or architectural to inputs or prompts.
> 
> - **Knowledge-driven generation**  
>   Capable of complex content like educational illustrations, charts, timelines, or annotated scenes, with strong reasoning and prompt-following abilities.
> 
> ## Use Cases
> 
> | Scenario                        | Example                                                                 |
> |---------------------------------|-------------------------------------------------------------------------|
> | Creative agencies / designers   | Generate batches of concept art or storyboards from multi-image inputs. |
> | Illustration & education        | Produce accurate diagrams or timelines with labeled details.             |
> | Visual editing & prototyping    | Modify photos or designs via text prompts for fast iteration.            |
> 
> ---
> 
> **Try the model yourself on the [Replicate Playground](https://replicate.com/google/nano-banana)** to explore its capabilities and see how it can enhance your creative workflow.

