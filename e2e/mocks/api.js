// 1x1 blue pixel PNG as data URL (fake generated image)
export const FAKE_GENERATED_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

// 1x1 red pixel PNG as data URL (second fake generated image)
export const FAKE_GENERATED_IMAGE_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='

// Text generation responses
export const TEXT_GENERATION_RESPONSE = 'a green hillside with rolling clouds under a bright blue sky'

// Minimal MP4 data URL (not playable, enough to travel through the app as a src)
export const FAKE_GENERATED_VIDEO =
  'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='

/**
 * Mock the GPT-5 text generation endpoint.
 * Optionally verify the request payload via `assertRequest`.
 */
export async function mockGpt5(page, { response = TEXT_GENERATION_RESPONSE, assertRequest } = {}) {
  await page.route('**/v1/models/openai/gpt-5/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'text-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the Nano Banana Pro image generation endpoint.
 * Optionally verify the request payload via `assertRequest`.
 */
export async function mockNanaBananaPro(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/google/nano-banana-pro/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the Gemini 2.5 Flash text generation endpoint.
 */
export async function mockGemini25Flash(page, { response = TEXT_GENERATION_RESPONSE, assertRequest } = {}) {
  await page.route('**/v1/models/google/gemini-2.5-flash/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'text-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the Seedream-4 image generation endpoint.
 */
export async function mockSeedream4(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/bytedance/seedream-4/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the GPT Image 1 image generation endpoint.
 */
export async function mockGptImage1(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/openai/gpt-image-1/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the Nano Banana 2 image generation endpoint.
 * The real model returns a single URI, so `output` is a plain string here.
 */
export async function mockNanoBanana2(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/google/nano-banana-2/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: response,
      }),
    })
  })
}

/**
 * Mock the Seedream-4.5 image generation endpoint.
 */
export async function mockSeedream45(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/bytedance/seedream-4.5/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock the Seedream-5 Lite image generation endpoint.
 */
export async function mockSeedream5Lite(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/models/bytedance/seedream-5-lite/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}

/**
 * Mock any of the three FLUX.2 image generation endpoints.
 * They share a payload shape, so the variant is just part of the path.
 * @param {'flex'|'pro'|'max'} variant
 */
export async function mockFlux2(page, variant, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route(`**/v1/models/black-forest-labs/flux-2-${variant}/predictions`, async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'img-pred-' + Date.now(),
        status: 'succeeded',
        output: response,
      }),
    })
  })
}

/**
 * Mock the P-Video video generation endpoint.
 * The real model returns a single URI, so `output` is a plain string here.
 */
export async function mockPVideo(page, { response = FAKE_GENERATED_VIDEO, assertRequest } = {}) {
  await page.route('**/v1/models/prunaai/p-video/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'video-pred-' + Date.now(),
        status: 'succeeded',
        output: response,
      }),
    })
  })
}

/**
 * Mock the Lang Segment Anything endpoint (uses /v1/predictions).
 */
export async function mockLangSegmentAnything(page, { response = FAKE_GENERATED_IMAGE, assertRequest } = {}) {
  await page.route('**/v1/predictions', async (route) => {
    const body = JSON.parse(route.request().postData())

    if (assertRequest) {
      assertRequest(body)
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'seg-pred-' + Date.now(),
        status: 'succeeded',
        output: [response],
      }),
    })
  })
}
