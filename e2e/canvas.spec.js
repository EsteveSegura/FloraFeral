import { test, expect } from '@playwright/test'
import {
  FAKE_GENERATED_IMAGE,
  TEXT_GENERATION_RESPONSE,
  mockGpt5,
  mockNanaBananaPro,
} from './mocks/api.js'
import {
  TEST_IMAGE_PATH,
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
} from './helpers/canvas.js'

test.describe('TextGenerator Node', () => {
  test('generates text with mocked API - sends "hello" and receives a response', async ({ page }) => {
    await mockGpt5(page, {
      response: 'hey, how are you?',
      assertRequest: (body) => {
        expect(body.input.prompt).toBe('hello')
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Text Generator')

    const textGeneratorNode = page.locator('.vue-flow__node-text-generator')
    await expect(textGeneratorNode).toBeVisible()

    await textGeneratorNode.locator('textarea').fill('hello')
    await textGeneratorNode.getByRole('button', { name: 'Generate Text' }).click()

    const outputSection = textGeneratorNode.locator('.text-output')
    await expect(outputSection).toBeVisible({ timeout: 15000 })
    await expect(outputSection).toHaveText('hey, how are you?')
  })
})

test.describe('Image → TextGenerator → ImageGenerator pipeline', () => {
  test('uploads image, describes it via text generator, then generates a new image', async ({ page }) => {
    // Mock GPT-5: expect the image + prompt, return a description
    await mockGpt5(page, {
      assertRequest: (body) => {
        expect(body.input.prompt).toBe('describe this image')
        expect(body.input.image_input).toBeTruthy()
        expect(body.input.image_input.length).toBe(1)
      },
    })

    // Mock Nano Banana Pro: expect the generated description as prompt
    await mockNanaBananaPro(page, {
      assertRequest: (body) => {
        expect(body.input.prompt).toBe(TEXT_GENERATION_RESPONSE)
      },
    })

    await setupBlankCanvas(page)

    // --- Step 1: Add Image node and upload test image ---
    await addNodeFromSidebar(page, 'Image')

    const imageNode = page.locator('.vue-flow__node-image')
    await expect(imageNode).toBeVisible()

    // Intercept file chooser and upload the real test asset
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      imageNode.getByRole('button', { name: 'Upload Image' }).click(),
    ])
    await fileChooser.setFiles(TEST_IMAGE_PATH)

    // Verify image was loaded in the node
    await expect(imageNode.locator('.image-preview img')).toBeVisible({ timeout: 5000 })

    // --- Step 2: Add Text Generator node ---
    await addNodeFromSidebar(page, 'Text Generator')

    const textGenNode = page.locator('.vue-flow__node-text-generator')
    await expect(textGenNode).toBeVisible()

    // --- Step 3: Add Image Generator node ---
    await addNodeFromSidebar(page, 'Image Generator')

    const imageGenNode = page.locator('.vue-flow__node-image-generator')
    await expect(imageGenNode).toBeVisible()

    // --- Step 4: Space nodes apart so they don't overlap ---
    await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const flowStore = pinia._s.get('flow')

      const imgNode = flowStore.nodes.find(n => n.type === 'image')
      const txtNode = flowStore.nodes.find(n => n.type === 'text-generator')
      const genNode = flowStore.nodes.find(n => n.type === 'image-generator')

      // Layout: Image(left) → TextGenerator(center) → ImageGenerator(right)
      if (imgNode) { imgNode.position = { x: 100, y: 200 } }
      if (txtNode) { txtNode.position = { x: 500, y: 200 } }
      if (genNode) { genNode.position = { x: 1000, y: 200 } }
    })

    // Wait for Vue to re-render node positions
    await page.waitForTimeout(300)

    // --- Step 5: Connect nodes by dragging handles ---
    // Image(output-0:image) → TextGenerator(input-0:image)
    await connectNodes(page, imageNode, 'output-0', textGenNode, 'input-0')

    // TextGenerator(output-0:prompt) → ImageGenerator(input-1:prompt)
    await connectNodes(page, textGenNode, 'output-0', imageGenNode, 'input-1')

    // Verify both edges were created
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // --- Step 6: Type prompt in Text Generator and generate ---
    await textGenNode.locator('textarea').fill('describe this image')
    await textGenNode.getByRole('button', { name: 'Generate Text' }).click()

    // Verify generated text appears
    const textOutput = textGenNode.locator('.text-output')
    await expect(textOutput).toBeVisible({ timeout: 15000 })
    await expect(textOutput).toHaveText(TEXT_GENERATION_RESPONSE)

    // --- Step 7: Verify ImageGenerator shows the connected prompt ---
    const connectedPromptInfo = imageGenNode.locator('.prompt-preview')
    await expect(connectedPromptInfo).toBeVisible()
    await expect(connectedPromptInfo).toContainText('a green hillside')

    // --- Step 8: Generate image ---
    await imageGenNode.getByRole('button', { name: 'Generate Image' }).click()

    // Verify generated image appears
    const generatedImage = imageGenNode.locator('.image-preview img')
    await expect(generatedImage).toBeVisible({ timeout: 15000 })
    await expect(generatedImage).toHaveAttribute('src', FAKE_GENERATED_IMAGE)
  })
})
