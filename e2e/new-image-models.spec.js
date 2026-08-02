import { test, expect } from '@playwright/test'
import {
  FAKE_GENERATED_IMAGE,
  mockNanoBanana2,
  mockSeedream45,
  mockSeedream5Lite,
  mockFlux2,
} from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  selectModel,
} from './helpers/canvas.js'

const MORE_OPTIONS_BUTTON = 'button[title="More options"]'
const PANEL = '.node-options-panel'

/**
 * What each new model puts in the node toolbar and what it moves to the side
 * panel. The toolbar is one row, so only the two options worth a single click
 * live there
 */
const MODELS = [
  {
    id: 'nano-banana-2',
    toolbar: ['aspect_ratio', 'resolution'],
    panel: ['output_format', 'google_search', 'image_search'],
  },
  {
    id: 'seedream-4.5',
    toolbar: ['size', 'aspect_ratio'],
    panel: ['width', 'height', 'disable_safety_checker'],
  },
  {
    id: 'seedream-5-lite',
    toolbar: ['aspect_ratio', 'size'],
    panel: ['output_format', 'return_byteplus_urls'],
  },
  {
    id: 'flux-2-flex',
    toolbar: ['aspect_ratio', 'resolution'],
    panel: ['steps', 'guidance', 'prompt_upsampling', 'output_format', 'seed'],
  },
  {
    id: 'flux-2-pro',
    toolbar: ['aspect_ratio', 'resolution'],
    panel: ['width', 'height', 'output_format', 'safety_tolerance', 'seed'],
  },
  {
    id: 'flux-2-max',
    toolbar: ['aspect_ratio', 'resolution'],
    panel: ['width', 'height', 'output_format', 'safety_tolerance', 'seed'],
  },
]

/**
 * Drop an Image Generator on the canvas and switch it to `modelId`.
 */
async function setupGenerator(page, modelId) {
  await setupBlankCanvas(page)
  await addNodeFromSidebar(page, 'Image Generator')

  const node = page.locator('.vue-flow__node-image-generator')
  await positionNodes(page, [{ type: 'image-generator', x: 320, y: 220 }])
  await selectModel(page, node, modelId)

  return node
}

/**
 * Select the node again so its toolbar shows, then open the options panel.
 */
async function openPanel(page, nodeLocator) {
  const box = await nodeLocator.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + 30)
  await page.locator('#model-select').waitFor({ state: 'visible', timeout: 5000 })

  await page.locator(MORE_OPTIONS_BUTTON).click()
  await expect(page.locator(PANEL)).toBeVisible()
}

/**
 * Type a prompt and generate, waiting for the image to land in the node.
 */
async function generate(page, nodeLocator, prompt = 'a lighthouse in a storm') {
  await nodeLocator.locator('textarea').fill(prompt)
  await nodeLocator.getByRole('button', { name: 'Generate Image' }).click()

  await expect(nodeLocator.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
  await expect(nodeLocator.locator('.image-preview img')).toHaveAttribute('src', FAKE_GENERATED_IMAGE)
}

test.describe('New image models', () => {
  test('every new model is offered by the Image Generator', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image Generator')

    const node = page.locator('.vue-flow__node-image-generator')
    await positionNodes(page, [{ type: 'image-generator', x: 320, y: 220 }])

    const box = await node.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + 30)

    const modelSelect = page.locator('#model-select')
    await modelSelect.waitFor({ state: 'visible', timeout: 5000 })

    const values = await modelSelect.locator('option').evaluateAll(
      options => options.map(o => o.value)
    )

    for (const model of MODELS) {
      expect(values).toContain(model.id)
    }
  })

  for (const model of MODELS) {
    test(`${model.id} splits its options between toolbar and panel`, async ({ page }) => {
      const node = await setupGenerator(page, model.id)
      await openPanel(page, node)

      for (const key of model.toolbar) {
        await expect(page.locator(`#control-${key}`)).toBeVisible()
      }

      for (const key of model.panel) {
        await expect(page.locator(`#panel-control-${key}`)).toBeVisible()
        // A key never shows up in both places at once
        await expect(page.locator(`#control-${key}`)).toHaveCount(0)
      }
    })
  }

  test('Nano Banana 2 sends its toolbar and panel options', async ({ page }) => {
    let received = null
    await mockNanoBanana2(page, { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'nano-banana-2')
    await openPanel(page, node)

    await page.locator('#panel-control-google_search').check()
    await page.locator('#panel-control-output_format').selectOption('png')

    // Clicking away dismisses the toolbar and closes the panel with it
    await page.mouse.click(10, 10)
    await expect(page.locator(PANEL)).toBeHidden()

    await generate(page, node)

    expect(received.aspect_ratio).toBe('match_input_image')
    expect(received.resolution).toBe('2K')
    expect(received.output_format).toBe('png')
    expect(received.google_search).toBe(true)
    expect(received.image_search).toBe(false)
  })

  test('Seedream-4.5 asks for a single image', async ({ page }) => {
    let received = null
    await mockSeedream45(page, { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'seedream-4.5')
    await generate(page, node)

    expect(received.size).toBe('2K')
    // The node shows one image, so it must never pay for a batch
    expect(received.max_images).toBe(1)
    expect(received.sequential_image_generation).toBe('disabled')
    expect(received.disable_safety_checker).toBe(false)
  })

  test('Seedream-5 Lite asks for a single image', async ({ page }) => {
    let received = null
    await mockSeedream5Lite(page, { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'seedream-5-lite')
    await generate(page, node)

    expect(received.size).toBe('2K')
    expect(received.output_format).toBe('png')
    expect(received.max_images).toBe(1)
    expect(received.sequential_image_generation).toBe('disabled')
  })

  test('FLUX.2 Flex sends steps, guidance and a numeric seed', async ({ page }) => {
    let received = null
    await mockFlux2(page, 'flex', { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'flux-2-flex')
    await openPanel(page, node)

    await page.locator('#panel-control-steps').fill('30')
    await page.locator('#panel-control-guidance').fill('4.5')
    await page.locator('#panel-control-seed').fill('4242')
    await page.locator('#panel-control-seed').blur()

    await page.mouse.click(10, 10)
    await expect(page.locator(PANEL)).toBeHidden()

    await generate(page, node)

    expect(received.steps).toBe(30)
    expect(received.guidance).toBe(4.5)
    expect(received.seed).toBe(4242)
    expect(received.resolution).toBe('1 MP')
    expect(received.output_quality).toBe(80)
  })

  test('FLUX.2 Pro swaps resolution for width and height on a custom ratio', async ({ page }) => {
    let received = null
    await mockFlux2(page, 'pro', { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'flux-2-pro')
    await openPanel(page, node)

    // Dimensions are only read when the ratio is free-form
    await page.locator('#control-aspect_ratio').selectOption('custom')
    await page.locator('#panel-control-width').fill('1500')
    await page.locator('#panel-control-height').fill('1000')
    await page.locator('#panel-control-height').blur()

    await page.mouse.click(10, 10)
    await expect(page.locator(PANEL)).toBeHidden()

    await generate(page, node)

    expect(received.aspect_ratio).toBe('custom')
    expect(received.resolution).toBeUndefined()
    // Rounded to the multiple of 16 the model works in
    expect(received.width).toBe(1504)
    expect(received.height).toBe(1008)
  })

  test('FLUX.2 Max sends its defaults untouched', async ({ page }) => {
    let received = null
    await mockFlux2(page, 'max', { assertRequest: (body) => { received = body.input } })

    const node = await setupGenerator(page, 'flux-2-max')
    await generate(page, node)

    expect(received.aspect_ratio).toBe('1:1')
    expect(received.resolution).toBe('1 MP')
    expect(received.output_format).toBe('webp')
    expect(received.safety_tolerance).toBe(2)
    expect(received.input_images).toEqual([])
  })
})
