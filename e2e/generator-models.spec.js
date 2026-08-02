import { test, expect } from '@playwright/test'
import {
  FAKE_GENERATED_IMAGE,
  TEXT_GENERATION_RESPONSE,
  mockGemini25Flash,
  mockSeedream4,
  mockGptImage1,
} from './mocks/api.js'
import {
  TEST_IMAGE_PATH,
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
  uploadImageToNode,
  selectModel,
} from './helpers/canvas.js'

test.describe('Generator Model Selection', () => {
  test('TextGenerator with Gemini 2.5 Flash', async ({ page }) => {
    const geminiResponse = 'Gemini says hello from the flash side'
    await mockGemini25Flash(page, {
      response: geminiResponse,
      assertRequest: (body) => {
        expect(body.input.prompt).toBe('tell me a joke')
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Text Generator')

    const textGenNode = page.locator('.vue-flow__node-text-generator')
    await expect(textGenNode).toBeVisible()

    // Select Gemini model
    await selectModel(page, textGenNode, 'gemini-2.5-flash')

    // Type prompt and generate
    await textGenNode.locator('textarea').fill('tell me a joke')
    await textGenNode.getByRole('button', { name: 'Generate Text' }).click()

    await expect(textGenNode.locator('.text-output')).toBeVisible({ timeout: 15000 })
    await expect(textGenNode.locator('.text-output')).toHaveText(geminiResponse)
  })

  test('Image → ImageGenerator with Seedream-4', async ({ page }) => {
    let received = null
    await mockSeedream4(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')

    const imageNode = page.locator('.vue-flow__node-image')
    const imageGenNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 200 },
      { type: 'image-generator', x: 500, y: 200 },
    ])

    // Upload image
    await uploadImageToNode(page, imageNode)

    // Select Seedream-4 model
    await selectModel(page, imageGenNode, 'seedream-4')

    // Connect Image → ImageGenerator(input-0:image)
    await connectNodes(page, imageNode, 'output-0', imageGenNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Type prompt and generate
    await imageGenNode.locator('textarea').fill('a beautiful landscape')
    await imageGenNode.getByRole('button', { name: 'Generate Image' }).click()

    await expect(imageGenNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
    await expect(imageGenNode.locator('.image-preview img')).toHaveAttribute('src', FAKE_GENERATED_IMAGE)

    // The node shows one image, so it must never pay for a batch
    expect(received.max_images).toBe(1)
    expect(received.sequential_image_generation).toBe('disabled')
  })

  test('Prompt → ImageGenerator with GPT Image 1', async ({ page }) => {
    let received = null
    await mockGptImage1(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const imageGenNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'image-generator', x: 600, y: 200 },
    ])

    // Type prompt
    await promptNode.locator('textarea').fill('a golden sunset over the ocean')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // Select GPT Image 1 model
    await selectModel(page, imageGenNode, 'gpt-image-1')

    // Connect Prompt → ImageGenerator(input-1:prompt)
    await connectNodes(page, promptNode, 'output-0', imageGenNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Verify prompt preview shows
    await expect(imageGenNode.locator('.prompt-preview')).toContainText('a golden sunset')

    // Generate image
    await imageGenNode.getByRole('button', { name: 'Generate Image' }).click()

    await expect(imageGenNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
    await expect(imageGenNode.locator('.image-preview img')).toHaveAttribute('src', FAKE_GENERATED_IMAGE)

    // The node shows one image, so it must never pay for a batch
    expect(received.number_of_images).toBe(1)
  })

  test('a saved flow cannot ask for more than one image', async ({ page }) => {
    let received = null
    await mockGptImage1(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image Generator')

    const imageGenNode = page.locator('.vue-flow__node-image-generator')
    await positionNodes(page, [{ type: 'image-generator', x: 300, y: 200 }])
    await selectModel(page, imageGenNode, 'gpt-image-1')

    // A JSON written before the option was pulled, or edited by hand
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const node = pinia._s.get('flow').nodes.find(n => n.type === 'image-generator')
      node.data.params = { ...node.data.params, number_of_images: 5 }
    })

    await imageGenNode.locator('textarea').fill('a golden sunset over the ocean')
    await imageGenNode.getByRole('button', { name: 'Generate Image' }).click()

    await expect(imageGenNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
    expect(received.number_of_images).toBe(1)
  })
})
