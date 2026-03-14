// 1x1 blue pixel PNG as data URL (fake generated image)
export const FAKE_GENERATED_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='

// 1x1 red pixel PNG as data URL (second fake generated image)
export const FAKE_GENERATED_IMAGE_2 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='

// Text generation responses
export const TEXT_GENERATION_RESPONSE = 'a green hillside with rolling clouds under a bright blue sky'

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
