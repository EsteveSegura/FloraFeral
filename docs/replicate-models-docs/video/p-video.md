## Basic model info

Model name: prunaai/p-video
Model description: Fast video generation with built-in draft mode for rapid creative iteration. Text-to-video, image-to-video, and audio-to-video in a single endpoint.


## Model inputs

- prompt (required): Text prompt for video generation. (string)
- image (optional): Input image to generate video from (image-to-video). Supports jpg, jpeg, png, webp. (string)
- last_frame_image (optional): Reference image for the last frame of the video. Supports jpg, jpeg, png, webp. (string)
- audio (optional): Input audio to condition video generation. Supports flac, mp3, wav. (string)
- duration (optional): Duration of the video in seconds (1-20). Ignored when audio is provided. (integer)
- aspect_ratio (optional): Aspect ratio of the video. Ignored when an input image is provided. (string)
- resolution (optional): Resolution of the video. (string)
- fps (optional): Frames per second of the video. (integer)
- draft (optional): Draft mode. Generates a lower-quality preview of the video. (boolean)
- prompt_upsampling (optional): Use prompt upsampling to enhance the prompt. (boolean)
- disable_safety_filter (optional): Disable safety filter for prompts (and input image). When disabled, prompts are not checked for unsafe content before generation. (boolean)
- save_audio (optional): Save the video with audio. (boolean)
- seed (optional): Random seed. Set for reproducible generation. (integer)
- no_op (optional): Health check mode - returns status without inference. (boolean)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/mw0dgpeddxrmr0cwk7t9rzjtjm)

#### Input

```json
{
  "fps": 24,
  "audio": "https://replicate.delivery/pbxt/Nw6ta10DEp6Q1RMCjtGBosVhDah8fN0JulfN95bBonZ1DiCx/replicate-prediction-gpnzzkjeghrme0ct2a59v9h038.wav",
  "draft": false,
  "image": "https://replicate.delivery/pbxt/Nw6tZuQCrJRv1wgMAkQaJhlNQJNLRX60UKJBrzCYW5RvmShk/replicate-prediction-vkwqkpxagnrm80ct2a4b0bye7g.webp",
  "prompt": "A woman sings and strums her guitar",
  "duration": 5,
  "resolution": "720p",
  "save_audio": true,
  "aspect_ratio": "16:9",
  "prompt_upsampling": true,
  "disable_safety_filter": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/NYfH3gIkhnRgNybQFJJVLfiKk2USVQgl69J9s13Moev5FetYB/output.mp4"
```


### Example (https://replicate.com/p/m7b5n1sxndrmw0cwk7w8s9gz5m)

#### Input

```json
{
  "fps": 24,
  "draft": false,
  "image": "https://replicate.delivery/pbxt/OXkJpAQAIbwcBCpqV5USf14PGOhQpTzdTdtl2yhrrBqqde5E/replicate-prediction-px6n3hq8zhrmr0cw6jasjwafew.jpg",
  "prompt": "the camera zooms in on to the man as he lifts both arms up in celebration",
  "duration": 5,
  "resolution": "720p",
  "save_audio": true,
  "aspect_ratio": "16:9",
  "prompt_upsampling": true,
  "disable_safety_filter": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/z2jCOh0Rbw4sHBlZZR5AZSonE6WbM3fbMFAkPMRVVf9bGfWsA/output.mp4"
```


### Example (https://replicate.com/p/6p0efnaywsrmt0cx056bk4wne8)

#### Input

```json
{
  "fps": 24,
  "draft": false,
  "image": "https://replicate.delivery/pbxt/OejQrIXERvqS9kpygH9PfQZDOIdzkD6GKytAXxedNSyyRtej/9.png",
  "prompt": "The prune says \"And this, kids, is how you generate a video in less than 10 seconds\".",
  "duration": 5,
  "resolution": "720p",
  "save_audio": true,
  "aspect_ratio": "16:9",
  "prompt_upsampling": false,
  "disable_safety_filter": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/SMhKj9PDteyILCENXNH1dO1GDXuPGpkSeVpkmIaA3wISVGSWA/output.mp4"
```


### Example (https://replicate.com/p/jmc9cpgwxsrmw0cx1e6bew4fsc)

#### Input

```json
{
  "fps": 24,
  "draft": false,
  "image": "https://replicate.delivery/pbxt/OejQrIXERvqS9kpygH9PfQZDOIdzkD6GKytAXxedNSyyRtej/9.png",
  "no_op": false,
  "prompt": "The prune says \"And this, kids, is how you generate a video in less than 10 seconds\".",
  "duration": 5,
  "resolution": "720p",
  "save_audio": true,
  "aspect_ratio": "16:9",
  "prompt_upsampling": false,
  "disable_safety_filter": true
}
```

#### Output

```json
"https://replicate.delivery/xezq/pyaeIfrebUZZpowThXDgjyaS98rlFKiuOtlbfpb3i4P7PBLZB/output.mp4"
```


## Model readme

> # P-Video
> 
> P-Video is Pruna AI's video generation model built for speed and creative iteration. It generates a 5-second 720p video in about 10 seconds, and includes a draft mode that's 4× faster for quick previews before committing to a full render.
> 
> ## Features
> 
> - **All-in-one endpoint** — text-to-video, image-to-video, and audio-to-video
> - **Draft mode** — 4× faster previews for rapid iteration
> - **Built-in audio generation** — native dialogue and sound, plus custom audio import
> - **Up to 1080p at 48 FPS**
> - **Multi-aspect ratio support** — 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 1:1
> - **Prompt upsampling** — automatic prompt enhancement with full user control
> 
> ## Pricing
> 
> |  | Draft OFF | Draft ON |
> |---|---|---|
> | **720p** | $0.02/sec | $0.005/sec |
> | **1080p** | $0.04/sec | $0.01/sec |
> 
> ## Inputs
> 
> - **prompt** (required) — text description of the video you want to generate
> - **image** — input image for image-to-video generation (jpg, jpeg, png, webp)
> - **audio** — input audio to condition video generation (flac, mp3, wav)
> - **duration** — video length in seconds, 1–10 (default: 5). Ignored when audio is provided
> - **aspect_ratio** — 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, or 1:1 (default: 16:9). Ignored when an input image is provided
> - **resolution** — 720p or 1080p (default: 720p)
> - **fps** — 24 or 48 frames per second (default: 24)
> - **draft** — enable draft mode for faster, lower-quality previews (default: false)
> - **prompt_upsampling** — enhance the prompt automatically (default: true)
> - **seed** — set for reproducible generation
> 
> ## What it's good at
> 
> - **Talking avatars and lip sync** — strong input-image consistency with reliable lip synchronization and native dialogue generation
> - **Close-up subjects** — particularly strong with foreground objects and close-up shots
> - **Product animation** — turn static product images into animated videos
> - **Social ads and short-form content** — fast iteration with multi-resolution output
> - **Music videos** — combine your own audio with generated visuals
> - **Animating low-resolution assets** — effective at bringing low-res images to life
> 
> ## Tips
> 
> - **Use draft mode for iteration.** Start with draft mode on to quickly explore different prompts and compositions, then switch it off for the final render.
> - **Vertical formats may work better at 1080p and 48 FPS.**
> - **Try different resolutions and FPS settings.** Output quality can vary depending on the combination of resolution, FPS, and input framing.
> - **Light prompt refinement helps.** Like any generative model, a short experimentation phase with your prompts will get better results.
> 
> ## Limitations
> 
> - Not designed for extreme cinematic camera motion or complex multi-scene storytelling
> - No native 4K output
> - Sound effects (SFX) performance is limited — for premium voice realism or advanced sound design, dedicated audio providers can deliver higher fidelity, and their output can be used as audio input to P-Video
> - Above two speakers, speaker separation can degrade
> - Speaker attribution drift can occur (e.g., one voice delivering multiple lines)

