import { test, expect } from '@playwright/test'
import {
  FAKE_GENERATED_IMAGE_2,
  mockPImageUpscale,
} from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
  uploadImageToNode,
  selectModel,
} from './helpers/canvas.js'

const MORE_OPTIONS_BUTTON = 'button[title="More options"]'
const PANEL = '.node-options-panel'

/**
 * Drop an Image node feeding an Image Generator set to the upscaler.
 * The two are wired before the model changes, so the image port keeps its index
 */
async function setupUpscaler(page, { connect = true } = {}) {
  await setupBlankCanvas(page)
  await addNodeFromSidebar(page, 'Image')
  await addNodeFromSidebar(page, 'Image Generator')

  const imageNode = page.locator('.vue-flow__node-image')
  const generatorNode = page.locator('.vue-flow__node-image-generator')

  await positionNodes(page, [
    { type: 'image', x: 100, y: 200 },
    { type: 'image-generator', x: 500, y: 200 },
  ])

  await uploadImageToNode(page, imageNode)

  if (connect) {
    await connectNodes(page, imageNode, 'output-0', generatorNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })
  }

  await selectModel(page, generatorNode, 'p-image-upscale')

  return { imageNode, generatorNode }
}

/**
 * Vertical distance in screen pixels between where the edge ends and the centre
 * of the image input handle it is wired to. VueFlow draws edges inside a
 * transformed viewport, so the path point is mapped through the SVG's screen
 * matrix. Only the vertical axis is measured: an edge ends at the node's edge
 * rather than at the middle of the handle, which is a constant horizontal
 * offset, while the bug this guards against moves the handle up or down
 */
async function edgeToHandleGap(page) {
  return page.evaluate(() => {
    const path = document.querySelector('.vue-flow__edge-path')
    const handle = document.querySelector(
      '.vue-flow__node-image-generator .vue-flow__handle-left'
    )
    if (!path || !handle) return null

    const end = path.getPointAtLength(path.getTotalLength())
    const screenEnd = end.matrixTransform(path.getScreenCTM())

    const box = handle.getBoundingClientRect()

    return Math.abs(screenEnd.y - (box.y + box.height / 2))
  })
}

/**
 * Select the generator so its toolbar shows. `selectModel` clicks away when it
 * is done, which dismisses it
 */
async function selectNode(page, nodeLocator) {
  const box = await nodeLocator.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + 30)
  await page.locator('#model-select').waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Select the generator again and open its options panel.
 */
async function openPanel(page, nodeLocator) {
  await selectNode(page, nodeLocator)

  await page.locator(MORE_OPTIONS_BUTTON).click()
  await expect(page.locator(PANEL)).toBeVisible()
}

test.describe('Image upscaler model', () => {
  test('is offered in the dropdown, marked as an upscaler', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image Generator')

    const generatorNode = page.locator('.vue-flow__node-image-generator')
    await positionNodes(page, [{ type: 'image-generator', x: 320, y: 220 }])

    const box = await generatorNode.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + 30)

    const modelSelect = page.locator('#model-select')
    await modelSelect.waitFor({ state: 'visible', timeout: 5000 })

    const label = await modelSelect
      .locator('option[value="p-image-upscale"]')
      .textContent()

    expect(label.trim()).toContain('(upscaler)')
  })

  test('hides the prompt, its port and the target stays in the toolbar', async ({ page }) => {
    const { generatorNode } = await setupUpscaler(page)

    // No textarea and no hint of a connected prompt
    await expect(generatorNode.locator('textarea')).toHaveCount(0)
    await expect(generatorNode.locator('.connected-prompt-info')).toHaveCount(0)
    await expect(generatorNode.locator('.upscaler-hint')).toBeVisible()

    // The prompt input port is gone, only the image one is left
    await expect(generatorNode.locator('.vue-flow__handle-left')).toHaveCount(1)

    // Target is the one option worth a click, in megapixels
    await selectNode(page, generatorNode)
    await expect(page.locator('#control-target')).toBeVisible()
    await expect(page.locator('label[for="control-target"]')).toContainText('MP')
  })

  test('keeps upscale mode and factor out of the UI entirely', async ({ page }) => {
    const { generatorNode } = await setupUpscaler(page)
    await openPanel(page, generatorNode)

    for (const key of ['upscale_mode', 'factor', 'no_op']) {
      await expect(page.locator(`#control-${key}`)).toHaveCount(0)
      await expect(page.locator(`#panel-control-${key}`)).toHaveCount(0)
    }

    // What the panel does show
    await expect(page.locator('#panel-control-enhance_realism')).toBeVisible()
    await expect(page.locator('#panel-control-enhance_details')).toBeVisible()
    await expect(page.locator('#panel-control-output_format')).toBeVisible()
    await expect(page.locator('#panel-control-output_quality')).toBeVisible()
    await expect(page.locator('#panel-control-disable_safety_checker')).toBeVisible()
  })

  test('upscales the connected image and sends target mode', async ({ page }) => {
    let received = null
    await mockPImageUpscale(page, { assertRequest: (body) => { received = body.input } })

    const { generatorNode } = await setupUpscaler(page)

    await generatorNode.getByRole('button', { name: 'Generate Image' }).click()

    await expect(generatorNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
    await expect(generatorNode.locator('.image-preview img'))
      .toHaveAttribute('src', FAKE_GENERATED_IMAGE_2)

    // The single input image travels under `image`, not as an array
    expect(typeof received.image).toBe('string')
    expect(received.image.startsWith('data:')).toBe(true)
    expect(received.prompt).toBeUndefined()

    // Target mode is fixed, so the megapixels in the toolbar are what counts
    expect(received.upscale_mode).toBe('target')
    expect(received.target).toBe(4)
    expect(received.factor).toBeUndefined()
    expect(received.enhance_realism).toBe(true)
    expect(received.output_format).toBe('jpg')
  })

  test('sends the options changed in the toolbar and the panel', async ({ page }) => {
    let received = null
    await mockPImageUpscale(page, { assertRequest: (body) => { received = body.input } })

    const { generatorNode } = await setupUpscaler(page)
    await openPanel(page, generatorNode)

    await page.locator('#panel-control-enhance_details').check()
    await page.locator('#panel-control-output_format').selectOption('png')
    await page.locator('#panel-control-output_quality').fill('55')
    await page.locator('#panel-control-output_quality').blur()

    await page.locator('#control-target').fill('8')

    // Clicking away dismisses the toolbar and closes the panel with it
    await page.mouse.click(10, 10)
    await expect(page.locator(PANEL)).toBeHidden()

    await generatorNode.getByRole('button', { name: 'Generate Image' }).click()
    await expect(generatorNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })

    expect(received.target).toBe(8)
    expect(received.enhance_details).toBe(true)
    expect(received.output_format).toBe('png')
    expect(received.output_quality).toBe(55)
  })

  test('cannot generate without a connected image', async ({ page }) => {
    const { generatorNode } = await setupUpscaler(page, { connect: false })

    await expect(generatorNode.getByRole('button', { name: 'Generate Image' }))
      .toBeDisabled()
  })

  test('drops a prompt edge when switching to the upscaler', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'image-generator', x: 600, y: 200 },
    ])

    await promptNode.locator('textarea').fill('a golden sunset')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await connectNodes(page, promptNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // The port the edge lands on disappears with the model change, so the edge
    // has to go with it rather than dangle
    await selectModel(page, generatorNode, 'p-image-upscale')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(0)
  })

  test('keeps the image edge on its handle when the prompt port goes', async ({ page }) => {
    const { generatorNode } = await setupUpscaler(page)

    // Dropping the prompt port moves the image handle from a third of the way
    // down the node to the middle, and the edge has to follow it
    expect(await edgeToHandleGap(page)).toBeLessThan(4)

    await selectModel(page, generatorNode, 'nano-banana-pro')
    await expect(generatorNode.locator('.vue-flow__handle-left')).toHaveCount(2)

    // And back again, now that the prompt port has returned
    expect(await edgeToHandleGap(page)).toBeLessThan(4)
  })

  test('restores the prompt when switching back to a generator', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image Generator')

    const generatorNode = page.locator('.vue-flow__node-image-generator')
    await positionNodes(page, [{ type: 'image-generator', x: 320, y: 220 }])

    await generatorNode.locator('textarea').fill('a lighthouse in a storm')
    await generatorNode.locator('textarea').blur()

    await selectModel(page, generatorNode, 'p-image-upscale')
    await expect(generatorNode.locator('textarea')).toHaveCount(0)

    await selectModel(page, generatorNode, 'nano-banana-pro')
    await expect(generatorNode.locator('textarea')).toHaveValue('a lighthouse in a storm')
    await expect(generatorNode.locator('.vue-flow__handle-left')).toHaveCount(2)
  })
})
