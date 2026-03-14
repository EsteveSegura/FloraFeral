import { test, expect } from '@playwright/test'
import {
  FAKE_GENERATED_IMAGE,
  FAKE_GENERATED_IMAGE_2,
  mockGpt5,
  mockGemini25Flash,
  mockNanaBananaPro,
  mockSeedream4,
  mockGptImage1,
  mockLangSegmentAnything,
} from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  uploadImageToNode,
  selectModel,
  setModelProgrammatic,
  connectNodesProgrammatic,
  scrollToNode,
} from './helpers/canvas.js'

test.describe('Large Pipelines', () => {
  test('Multi-model image generation with comparison (12 nodes)', async ({ page }) => {
    test.setTimeout(60000)

    const gpt5Response = 'a lush green valley with mountains'
    const geminiResponse = 'a serene mountain lake at dawn'

    await mockGpt5(page, { response: gpt5Response })
    await mockGemini25Flash(page, { response: geminiResponse })
    await mockNanaBananaPro(page, { response: FAKE_GENERATED_IMAGE })
    await mockSeedream4(page, { response: FAKE_GENERATED_IMAGE_2 })

    await setupBlankCanvas(page)

    // Add all 12 nodes
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')  // nth 0: GPT-5
    await addNodeFromSidebar(page, 'Text Generator')  // nth 1: Gemini
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator') // nth 0: Nano-Banana
    await addNodeFromSidebar(page, 'Image Generator') // nth 1: Seedream-4
    await addNodeFromSidebar(page, 'Image Diff')
    await addNodeFromSidebar(page, 'Image Compare')
    await addNodeFromSidebar(page, 'Draw')
    await addNodeFromSidebar(page, 'Comment')         // nth 0
    await addNodeFromSidebar(page, 'Comment')         // nth 1

    await positionNodes(page, [
      { type: 'image', x: 100, y: 200 },
      { type: 'prompt', x: 100, y: 50 },
      { type: 'text-generator', x: 400, y: 50, nth: 0 },
      { type: 'text-generator', x: 400, y: 400, nth: 1 },
      { type: 'prompt-template', x: 700, y: 50 },
      { type: 'image-generator', x: 1000, y: 50, nth: 0 },
      { type: 'image-generator', x: 700, y: 400, nth: 1 },
      { type: 'diff', x: 1000, y: 400 },
      { type: 'compare', x: 1000, y: 700 },
      { type: 'draw', x: 1300, y: 50 },
      { type: 'comment', x: 100, y: 600, nth: 0 },
      { type: 'comment', x: 400, y: 700, nth: 1 },
    ])

    const textGenNodes = page.locator('.vue-flow__node-text-generator')
    const imageGenNodes = page.locator('.vue-flow__node-image-generator')
    const diffNode = page.locator('.vue-flow__node-diff')
    const compareNode = page.locator('.vue-flow__node-compare')
    const commentNodes = page.locator('.vue-flow__node-comment')

    // --- Upload image ---
    await scrollToNode(page, 'image', 0)
    await uploadImageToNode(page, page.locator('.vue-flow__node-image'))

    // --- Set prompt ---
    await scrollToNode(page, 'prompt', 0)
    const promptNode = page.locator('.vue-flow__node-prompt')
    await promptNode.locator('textarea').fill('describe this image')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // --- Select models ---
    await scrollToNode(page, 'text-generator', 1)
    await selectModel(page, textGenNodes.nth(1), 'gemini-2.5-flash')

    await scrollToNode(page, 'image-generator', 1)
    await selectModel(page, imageGenNodes.nth(1), 'seedream-4')

    // --- Connect all edges programmatically ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-0', targetNth: 0 },
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-0', targetNth: 1 },
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1', targetNth: 0 },
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1', targetNth: 1 },
      { sourceType: 'text-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'prompt-template', targetHandle: 'input-0' },
      { sourceType: 'prompt-template', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 0 },
      { sourceType: 'text-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 1 },
    ])

    await expect(page.locator('.vue-flow__edge')).toHaveCount(7, { timeout: 5000 })

    // --- Generate text with GPT-5 ---
    await scrollToNode(page, 'text-generator', 0)
    await textGenNodes.nth(0).getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNodes.nth(0).locator('.text-output')).toBeVisible({ timeout: 15000 })
    await expect(textGenNodes.nth(0).locator('.text-output')).toHaveText(gpt5Response)

    // --- Generate text with Gemini ---
    await scrollToNode(page, 'text-generator', 1)
    await textGenNodes.nth(1).getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNodes.nth(1).locator('.text-output')).toBeVisible({ timeout: 15000 })
    await expect(textGenNodes.nth(1).locator('.text-output')).toHaveText(geminiResponse)

    // --- Generate image with Nano-Banana ---
    await scrollToNode(page, 'image-generator', 0)
    await imageGenNodes.nth(0).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(0).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Generate image with Seedream-4 ---
    await scrollToNode(page, 'image-generator', 1)
    await imageGenNodes.nth(1).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(1).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Connect outputs to Diff, Compare, Draw ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'image-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'diff', targetHandle: 'input-0' },
      { sourceType: 'image-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'diff', targetHandle: 'input-1' },
      { sourceType: 'image-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-0' },
      { sourceType: 'image-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-1' },
      { sourceType: 'image-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'draw', targetHandle: 'input-0' },
    ])

    await expect(page.locator('.vue-flow__edge')).toHaveCount(12, { timeout: 5000 })

    // --- Verify Diff ---
    await scrollToNode(page, 'diff', 0)
    await expect(diffNode.locator('.diff-result')).toBeVisible({ timeout: 10000 })

    // --- Verify Compare ---
    await scrollToNode(page, 'compare', 0)
    await expect(compareNode.locator('.compare-preview')).toBeVisible({ timeout: 10000 })

    // --- Edit comments ---
    await scrollToNode(page, 'comment', 0)
    await commentNodes.nth(0).click()
    await commentNodes.nth(0).locator('.comment-textarea').fill('GPT-5 pipeline branch')

    await scrollToNode(page, 'comment', 1)
    await commentNodes.nth(1).click()
    await commentNodes.nth(1).locator('.comment-textarea').fill('Gemini pipeline branch')
    await page.mouse.click(10, 10)
    await page.waitForTimeout(300)

    await expect(commentNodes.nth(1).locator('.comment-text')).toHaveText('Gemini pipeline branch')
  })

  test('Iterative prompt refinement (11 nodes)', async ({ page }) => {
    test.setTimeout(60000)

    const gpt5Response = 'a watercolor painting of a majestic sunset over mountains'
    const geminiResponse = 'an enhanced watercolor sunset with vivid orange and purple hues'

    await mockGpt5(page, { response: gpt5Response })
    await mockGemini25Flash(page, { response: geminiResponse })
    await mockNanaBananaPro(page, { response: FAKE_GENERATED_IMAGE })
    await mockGptImage1(page, { response: FAKE_GENERATED_IMAGE_2 })

    await setupBlankCanvas(page)

    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Prompt')            // nth 0
    await addNodeFromSidebar(page, 'Prompt')            // nth 1
    await addNodeFromSidebar(page, 'Prompt Template')   // nth 0
    await addNodeFromSidebar(page, 'Prompt Template')   // nth 1
    await addNodeFromSidebar(page, 'Text Generator')    // nth 0: GPT-5
    await addNodeFromSidebar(page, 'Text Generator')    // nth 1: Gemini
    await addNodeFromSidebar(page, 'Image Generator')   // nth 0: Nano-Banana
    await addNodeFromSidebar(page, 'Image Generator')   // nth 1: GPT-Image-1
    await addNodeFromSidebar(page, 'Image Compare')
    await addNodeFromSidebar(page, 'Comment')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 350 },
      { type: 'prompt', x: 100, y: 50, nth: 0 },
      { type: 'prompt', x: 100, y: 700, nth: 1 },
      { type: 'prompt-template', x: 400, y: 50, nth: 0 },
      { type: 'prompt-template', x: 400, y: 700, nth: 1 },
      { type: 'text-generator', x: 700, y: 50, nth: 0 },
      { type: 'text-generator', x: 700, y: 700, nth: 1 },
      { type: 'image-generator', x: 1050, y: 50, nth: 0 },
      { type: 'image-generator', x: 1050, y: 700, nth: 1 },
      { type: 'compare', x: 1400, y: 350 },
      { type: 'comment', x: 100, y: 950 },
    ])

    const promptNodes = page.locator('.vue-flow__node-prompt')
    const templateNodes = page.locator('.vue-flow__node-prompt-template')
    const textGenNodes = page.locator('.vue-flow__node-text-generator')
    const imageGenNodes = page.locator('.vue-flow__node-image-generator')
    const compareNode = page.locator('.vue-flow__node-compare')
    const commentNode = page.locator('.vue-flow__node-comment')

    // --- Upload image ---
    await scrollToNode(page, 'image', 0)
    await uploadImageToNode(page, page.locator('.vue-flow__node-image'))

    // --- Set up prompts ---
    await scrollToNode(page, 'prompt', 0)
    await promptNodes.nth(0).locator('textarea').fill('A {{STYLE}} painting of {{SUBJECT}}')
    await promptNodes.nth(0).locator('textarea').blur()

    await scrollToNode(page, 'prompt', 1)
    await promptNodes.nth(1).locator('textarea').fill('Enhance: {{DESCRIPTION}}')
    await promptNodes.nth(1).locator('textarea').blur()
    await page.waitForTimeout(200)

    // --- Select models ---
    await scrollToNode(page, 'text-generator', 1)
    await selectModel(page, textGenNodes.nth(1), 'gemini-2.5-flash')

    // ImageGeneratorNode reads model from data.model (reactive computed), so programmatic works
    await setModelProgrammatic(page, 'image-generator', 1, 'gpt-image-1')

    // --- Connect prompts to templates ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceNth: 0, sourceHandle: 'output-0', targetType: 'prompt-template', targetHandle: 'input-0', targetNth: 0 },
      { sourceType: 'prompt', sourceNth: 1, sourceHandle: 'output-0', targetType: 'prompt-template', targetHandle: 'input-0', targetNth: 1 },
    ])

    // --- Fill template 1 variables ---
    await scrollToNode(page, 'prompt-template', 0)
    await expect(templateNodes.nth(0).locator('.variables-list')).toBeVisible({ timeout: 5000 })
    const vars1 = templateNodes.nth(0).locator('.variable-item input')
    await vars1.nth(0).fill('watercolor')
    await vars1.nth(0).blur()
    await vars1.nth(1).fill('sunset over mountains')
    await vars1.nth(1).blur()
    await page.waitForTimeout(300)

    // --- Fill template 2 variables ---
    await scrollToNode(page, 'prompt-template', 1)
    await expect(templateNodes.nth(1).locator('.variables-list')).toBeVisible({ timeout: 5000 })
    const vars2 = templateNodes.nth(1).locator('.variable-item input')
    await vars2.nth(0).fill('a golden sunrise with misty fog')
    await vars2.nth(0).blur()
    await page.waitForTimeout(300)

    // --- Connect remaining edges ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt-template', sourceNth: 0, sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1', targetNth: 0 },
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-0', targetNth: 0 },
      { sourceType: 'text-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 0 },
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-0', targetNth: 0 },
      { sourceType: 'prompt-template', sourceNth: 1, sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1', targetNth: 1 },
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-0', targetNth: 1 },
      { sourceType: 'text-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 1 },
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-0', targetNth: 1 },
    ])

    await expect(page.locator('.vue-flow__edge')).toHaveCount(10, { timeout: 5000 })

    // --- Dismiss any stray modal that might be open ---
    const modal = page.locator('.flora-modal-overlay')
    if (await modal.isVisible().catch(() => false)) {
      await modal.click({ position: { x: 5, y: 5 } })
      await modal.waitFor({ state: 'hidden', timeout: 3000 })
    }

    // --- Generate pipeline 1 ---
    await scrollToNode(page, 'text-generator', 0)
    await textGenNodes.nth(0).getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNodes.nth(0).locator('.text-output')).toBeVisible({ timeout: 15000 })

    await scrollToNode(page, 'image-generator', 0)
    await imageGenNodes.nth(0).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(0).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Generate pipeline 2 ---
    await scrollToNode(page, 'text-generator', 1)
    await textGenNodes.nth(1).getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNodes.nth(1).locator('.text-output')).toBeVisible({ timeout: 15000 })

    await scrollToNode(page, 'image-generator', 1)
    await imageGenNodes.nth(1).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(1).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Connect to Compare ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'image-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-0' },
      { sourceType: 'image-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-1' },
    ])

    await scrollToNode(page, 'compare', 0)
    await expect(compareNode.locator('.compare-preview')).toBeVisible({ timeout: 10000 })
    await expect(compareNode.locator('.compare-label-left')).toHaveText('Before')
    await expect(compareNode.locator('.compare-label-right')).toHaveText('After')

    // --- Add annotation ---
    await scrollToNode(page, 'comment', 0)
    await commentNode.click()
    await commentNode.locator('.comment-textarea').fill('Comparing watercolor vs enhanced generation')
    await page.mouse.click(10, 10)
    await expect(commentNode.locator('.comment-text')).toHaveText('Comparing watercolor vs enhanced generation')
  })

  test('Segmentation and redraw pipeline (10 nodes)', async ({ page }) => {
    test.setTimeout(60000)

    await mockLangSegmentAnything(page, { response: FAKE_GENERATED_IMAGE })
    await mockNanaBananaPro(page, { response: FAKE_GENERATED_IMAGE_2 })

    await setupBlankCanvas(page)

    await addNodeFromSidebar(page, 'Image')            // nth 0: source
    await addNodeFromSidebar(page, 'Image')            // nth 1: original for diff/compare
    await addNodeFromSidebar(page, 'Prompt')            // nth 0: segmentation
    await addNodeFromSidebar(page, 'Prompt')            // nth 1: redraw
    await addNodeFromSidebar(page, 'Image Generator')   // nth 0: Lang-Segment-Anything
    await addNodeFromSidebar(page, 'Draw')
    await addNodeFromSidebar(page, 'Image Generator')   // nth 1: Nano-Banana
    await addNodeFromSidebar(page, 'Image Diff')
    await addNodeFromSidebar(page, 'Image Compare')
    await addNodeFromSidebar(page, 'Comment')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 200, nth: 0 },
      { type: 'image', x: 100, y: 450, nth: 1 },
      { type: 'prompt', x: 100, y: 50, nth: 0 },
      { type: 'prompt', x: 400, y: 450, nth: 1 },
      { type: 'image-generator', x: 400, y: 200, nth: 0 },
      { type: 'draw', x: 700, y: 200 },
      { type: 'image-generator', x: 700, y: 450, nth: 1 },
      { type: 'diff', x: 1000, y: 150 },
      { type: 'compare', x: 1000, y: 450 },
      { type: 'comment', x: 100, y: 650 },
    ])

    const imageNodes = page.locator('.vue-flow__node-image')
    const promptNodes = page.locator('.vue-flow__node-prompt')
    const imageGenNodes = page.locator('.vue-flow__node-image-generator')
    const drawNode = page.locator('.vue-flow__node-draw')
    const diffNode = page.locator('.vue-flow__node-diff')
    const compareNode = page.locator('.vue-flow__node-compare')
    const commentNode = page.locator('.vue-flow__node-comment')

    // --- Upload images ---
    await scrollToNode(page, 'image', 0)
    await uploadImageToNode(page, imageNodes.nth(0))

    await scrollToNode(page, 'image', 1)
    await uploadImageToNode(page, imageNodes.nth(1))

    // --- Set prompts ---
    await scrollToNode(page, 'prompt', 0)
    await promptNodes.nth(0).locator('textarea').fill('a cat')
    await promptNodes.nth(0).locator('textarea').blur()

    await scrollToNode(page, 'prompt', 1)
    await promptNodes.nth(1).locator('textarea').fill('a golden retriever')
    await promptNodes.nth(1).locator('textarea').blur()
    await page.waitForTimeout(200)

    // --- Select model ---
    await scrollToNode(page, 'image-generator', 0)
    await selectModel(page, imageGenNodes.nth(0), 'lang-segment-anything')

    // --- Connect all edges ---
    await connectNodesProgrammatic(page, [
      { sourceType: 'image', sourceNth: 0, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-0', targetNth: 0 },
      { sourceType: 'prompt', sourceNth: 0, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 0 },
      { sourceType: 'image-generator', sourceNth: 0, sourceHandle: 'output-0', targetType: 'draw', targetHandle: 'input-0' },
      { sourceType: 'draw', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-0', targetNth: 1 },
      { sourceType: 'prompt', sourceNth: 1, sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1', targetNth: 1 },
      { sourceType: 'image-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'diff', targetHandle: 'input-0' },
      { sourceType: 'image', sourceNth: 1, sourceHandle: 'output-0', targetType: 'diff', targetHandle: 'input-1' },
      { sourceType: 'image-generator', sourceNth: 1, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-0' },
      { sourceType: 'image', sourceNth: 1, sourceHandle: 'output-0', targetType: 'compare', targetHandle: 'input-1' },
    ])

    await expect(page.locator('.vue-flow__edge')).toHaveCount(9, { timeout: 5000 })

    // --- Run segmentation ---
    await scrollToNode(page, 'image-generator', 0)
    await imageGenNodes.nth(0).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(0).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Draw on segmented image ---
    await scrollToNode(page, 'draw', 0)
    await expect(drawNode.locator('.image-preview')).toBeVisible({ timeout: 5000 })
    await drawNode.locator('.image-preview').click()
    const modal = page.locator('.drawing-modal-content')
    await expect(modal).toBeVisible({ timeout: 5000 })

    const canvas = modal.locator('canvas').first()
    const canvasBox = await canvas.boundingBox()
    const cx = canvasBox.x + canvasBox.width / 2
    const cy = canvasBox.y + canvasBox.height / 2
    await page.mouse.move(cx - 20, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 20, cy, { steps: 5 })
    await page.mouse.up()

    await modal.getByRole('button', { name: 'Save' }).click()
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // --- Generate redraw ---
    await scrollToNode(page, 'image-generator', 1)
    await imageGenNodes.nth(1).getByRole('button', { name: 'Generate Image' }).click()
    await expect(imageGenNodes.nth(1).locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    // --- Verify Diff and Compare ---
    await scrollToNode(page, 'diff', 0)
    await expect(diffNode.locator('.diff-result')).toBeVisible({ timeout: 10000 })

    await scrollToNode(page, 'compare', 0)
    await expect(compareNode.locator('.compare-preview')).toBeVisible({ timeout: 10000 })

    // --- Add annotation ---
    await scrollToNode(page, 'comment', 0)
    await commentNode.click()
    await commentNode.locator('.comment-textarea').fill('Segmentation → Redraw pipeline')
    await page.mouse.click(10, 10)
    await expect(commentNode.locator('.comment-text')).toHaveText('Segmentation → Redraw pipeline')
  })
})
