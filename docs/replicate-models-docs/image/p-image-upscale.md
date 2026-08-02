## Basic model info

Model name: prunaai/p-image-upscale
Model description: Fastest image upscaler in the world (<1s) supporting outputs up to 128 MP. contact us for dedicated endpoints.


## Model inputs

- image (required): Input image to upscale. (string)
- upscale_mode (optional): Upscale mode. 'target' scales to a fixed megapixel resolution. 'factor' multiplies each side by the given factor. (string)
- target (optional): Target resolution in megapixels (used when upscale_mode is 'target'). (integer)
- factor (optional): Scaling factor applied to each side of the image (used when upscale_mode is 'factor'). Output capped at 128 MP. (number)
- enhance_details (optional): Enhance fine textures and small details. May increase contrast and introduce minor deviations from the original image. (boolean)
- enhance_realism (optional): Improve realism. May deviate more from the original image. Recommended for AI-generated images. (boolean)
- output_format (optional): Format of the output images (string)
- output_quality (optional): Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs (integer)
- disable_safety_checker (optional): Disable safety checker for generated images. (boolean)
- no_op (optional): Deprecated and ignored. Predictions always run normally. (boolean)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/qjdxz5nd0drmy0cx1fx9p513n0)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/OmaliydBQQZna8XQXcCLvRp07gRpPRM7UgEmOCFs3GpQUc1T/out-3.jpg",
  "no_op": false,
  "factor": 2,
  "target": 8,
  "upscale_mode": "target",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": false,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/f1dkK41oYekHtkPk50m9o2hRpwZxBxeLyr76743EmymTKklsA/upscaled_image.jpg"
```


### Example (https://replicate.com/p/h8jafqa3bnrmy0cx1fxr1yzsgm)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/OmamKGxQ16YLy3VAAGqnruURQty3klGtKVro6bhtPdgKZrfd/out-4.jpg",
  "no_op": false,
  "factor": 2,
  "target": 2,
  "upscale_mode": "target",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": true,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/3AEX209HuSKvHJ79Wd4tODme4kjY9L72NjO1GxGqRtQ3CZJLA/upscaled_image.jpg"
```


### Example (https://replicate.com/p/avxz79s189rmy0cx1fy9t6ynmw)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/OmanE9cRIlGFlupO4KTtgwlI3PmQkY9Toec3duevhcH678O1/out-5.jpg",
  "no_op": false,
  "factor": 2,
  "target": 8,
  "upscale_mode": "target",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": false,
  "enhance_realism": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/Ren2HpF8wUxSEKu7OWGpeQWYZAdub2UBvRDbD1sYBe6QNklsA/upscaled_image.jpg"
```


### Example (https://replicate.com/p/0tfrtqdymhrmt0cx1fzb6tk6vr)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Omapvg7uP3fcEwCVz1mHy7qJPOBk5vt7kOdVE68fOCIexXuh/output_138235.jpg",
  "no_op": false,
  "factor": 8,
  "target": 2,
  "upscale_mode": "factor",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": true,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/2HDqKvWVhfRLLiO0YLj3In9eQLYsefQoK6FrtOWENNeVKRWyC/upscaled_image.jpg"
```


### Example (https://replicate.com/p/7vtgpb88s1rmy0cx1fzrqb0c34)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/OmaqEldcmFFDgj2ftvYO6P6DmutvJs7PiwuR3AlE2lRwyFVI/output_300147.jpg",
  "no_op": false,
  "factor": 8,
  "target": 2,
  "upscale_mode": "factor",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": true,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/r4cqgeGeN9jXL0M3sNtGMRkaFfvfUmIcf2cxJTFysuqvMRWyC/upscaled_image.jpg"
```


### Example (https://replicate.com/p/1ac86kdtvnrmr0cx1g58srqr3c)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Omb2L1aOCEjqoP5R1bm6biU0MsbI1PGMtsoUdoIdOaO4Pc16/rltivouao62wpy9zcl5o3woj1wam.jpg",
  "no_op": false,
  "factor": 2,
  "target": 4,
  "upscale_mode": "target",
  "output_format": "jpg",
  "output_quality": 50,
  "enhance_details": false,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/xGbjxWJ62fVXCCNFL7M2cOSY8zOSXqCENAWxnhidorFyKZJLA/upscaled_image.jpg"
```


### Example (https://replicate.com/p/13qw7crgndrmr0cx9tkt6yexzm)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Omaod5X49qN1VNDfR52POKGR8DRDsWSCAXklmmBCRU9WCc3d/out.jpg",
  "no_op": false,
  "factor": 2,
  "target": 4,
  "upscale_mode": "target",
  "output_format": "jpg",
  "output_quality": 80,
  "enhance_details": false,
  "enhance_realism": false
}
```

#### Output

```json
"https://replicate.delivery/xezq/9yC53SmqfmR8bKlUWUCatWKJ6W4b8yjNp8rJ6Bct040klhLLA/upscaled_image.jpg"
```


## Model readme

> # P-Image-Upscale
> 
> P-Image-Upscale is Pruna's AI-powered image upscaling model. Give it an image and a target resolution, and it increases the resolution while preserving detail. It can upscale images to 4 megapixels in under a second, with support for outputs up to 8 MP.
> 
> ## How it works
> 
> You can upscale in two modes:
> 
> - **Target mode** (default): set a target resolution in megapixels (1–8 MP), and the model scales your image to match.
> - **Factor mode**: multiply each side of the image by a scaling factor (1–8x). Output is capped at 8 MP.
> 
> ## Enhancement options
> 
> Two optional toggles let you improve the quality of the upscaled image:
> 
> - **Enhance realism** (on by default): improves the overall realism of the output. Works especially well on AI-generated images. May deviate slightly from the original.
> - **Enhance details**: sharpens fine textures and small details. Can increase contrast and may introduce minor differences from the original.
> 
> You can use either or both depending on the result you're after.
> 
> ## Output formats
> 
> Supports JPEG, PNG, and WebP. For JPEG and WebP, you can set the output quality from 0–100 (default is 80).
> 
> ## Pricing
> 
> | Output resolution | Price |
> |---|---|
> | 1–4 MP | $0.005 / image |
> | 5–8 MP | $0.01 / image |
> 
> ## Links
> 
> - [Pruna API documentation](https://docs.api.pruna.ai/guides/models/p-image-upscale)

