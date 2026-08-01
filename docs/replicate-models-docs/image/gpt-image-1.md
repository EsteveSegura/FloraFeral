## Basic model info

Model name: openai/gpt-image-1
Model description: A multimodal image generation model that creates high-quality images. You need to bring your own verified OpenAI key to use this model. Your OpenAI account will be charged for usage.


## Model inputs

- openai_api_key (required): Your OpenAI API key (string)
- prompt (required): A text description of the desired image (string)
- aspect_ratio (optional): The aspect ratio of the generated image (string)
- input_fidelity (optional): Control how much effort the model will exert to match the style and features, especially facial features, of input images (string)
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

### Example (https://replicate.com/p/1f7kjzpk7xrmc0cpfmmvysbdcc)

#### Input

```json
{
  "prompt": "Add the floral pattern to the vase",
  "quality": "auto",
  "background": "auto",
  "moderation": "auto",
  "aspect_ratio": "1:1",
  "input_images": [
    "https://replicate.delivery/pbxt/MusWuQJm1RJPu1Cj0ajRmoMnHyYNPk6ljT1QCU4DbHMsqDTF/53541851-62f3-44a7-b075-ef053ae2f324.jpg",
    "https://replicate.delivery/pbxt/MusWuPkfcvyZQuuXeMIbQXEMe9K2G8rDCNraQffAt0OzMRaT/colored-flower-pattern-free-vector.jpg"
  ],
  "output_format": "webp",
  "openai_api_key": "[REDACTED]",
  "number_of_images": 1,
  "output_compression": 90
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/hEcJpm50O9ouFVu506qf6wAjLKc4MH1oFeRZ4PORmTqVqVnUA/tmpfkxavg8q.png"
]
```


## Model readme

> GPT Image 1 is a new state-of-the-art image generation model. It is a natively multimodal language model that accepts both text and image inputs, and produces image outputs.
> 
> ## Capabilities
> 
> - Creates images across diverse styles
> - Follows custom guidelines
> - Leverages world knowledge
> - Renders text accurately
> 
> ## Pricing
> 
> This is a bring-your-own-token model. You need to bring your own verified OpenAI key to use this model. Your OpenAI account will be charged for usage based on the following pricing.
> 
> See [OpenAI’s pricing](https://openai.com/api/pricing/) for details.
> 
> ## Safety Features
> 
> - Same safety guardrails as image generation in ChatGPT
> - Safeguards against generating harmful images
> - C2PA metadata included in generated images
> - Moderation sensitivity control with the `moderation` parameter:
>   - `auto` (default): standard filtering
>   - `low`: less restrictive filtering
> 
> ## Data Usage
> 
> - By default, OpenAI does not train on customer API data
> - All image inputs and outputs remain subject to API usage policies
> 
> # Verify Organization
> 
> If you see the error: "your organization must be verified to use the model" please go to [platform.openai.com/settings/organization/general](https://platform.openai.com/settings/organization/general) and click on `Verify Organization`. If you just verified, it can take up to 15 minutes for access to propagate.
> 
> # Billing
> 
> You pay OpenAI directly via your API key.

