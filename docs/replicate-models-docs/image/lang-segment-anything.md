## Basic model info

Model name: tmappdev/lang-segment-anything
Model description: Segment Anything with prompts


## Model inputs

- image (required): Path to the input image (string)
- text_prompt (required): Text prompt for segmentation (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/a6qx184q6xrj20ckdqqvgy8cfw)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/M2tUXKe06UEAExSwWbcYvMOoGVXGtEbvsD52HaSgC3vulSfR/a2ed4.jpg",
  "text_prompt": "text,watermark"
}
```

#### Output

```json
"https://replicate.delivery/yhqm/Q2pSoJaTgtbrE5kw9tKgC9SNEWAkFs5kS408pHxVjjYexm6JA/mask_output.png"
```


## Model readme

> # Langsam
> 
> A [lang-segment-anything](https://github.com/luca-medeiros/lang-segment-anything) replicate app created by [@ashhadahsan](https://github.com/ashhadahsan).
> 
> Hit me up to get in touch.

