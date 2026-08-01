import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
} from './helpers/canvas.js'

const MORE_OPTIONS_BUTTON = 'button[title="More options"]'
const PANEL = '.node-options-panel'

/**
 * Select a generator node so its toolbar shows up.
 * Clicking the prompt textarea would not select it (it stops mousedown), so the
 * click lands near the top of the node, on the preview area
 */
async function selectNode(page, nodeLocator) {
  const box = await nodeLocator.boundingBox()
  if (!box) throw new Error('selectNode: node has no bounding box')

  await page.mouse.click(box.x + box.width / 2, box.y + 30)
  await page.locator('#model-select').waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Read a node from the Pinia store by type.
 */
async function readNode(page, type) {
  return page.evaluate((nodeType) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const node = flowStore.nodes.find(n => n.type === nodeType)
    if (!node) return null

    return {
      id: node.id,
      model: node.data.model,
      params: JSON.parse(JSON.stringify(node.data.params || {})),
      position: { ...node.position },
    }
  }, type)
}

/**
 * Drop a Video Generator on the canvas and open its options panel.
 */
async function openVideoPanel(page) {
  await setupBlankCanvas(page)
  await addNodeFromSidebar(page, 'Video Generator')

  const videoNode = page.locator('.vue-flow__node-video-generator')
  await positionNodes(page, [{ type: 'video-generator', x: 320, y: 260 }])

  await selectNode(page, videoNode)
  await page.locator(MORE_OPTIONS_BUTTON).click()
  await expect(page.locator(PANEL)).toBeVisible()

  return videoNode
}

test.describe('Node options panel', () => {
  test('opens from the toolbar, docked to the right edge', async ({ page }) => {
    await openVideoPanel(page)

    const panel = page.locator('.flora-side-panel')
    const box = await panel.boundingBox()
    const viewport = page.viewportSize()

    // Flush against the right edge and running the full height
    expect(Math.round(box.x + box.width)).toBe(viewport.width)
    expect(Math.round(box.height)).toBe(viewport.height)

    // The model's secondary options are the ones on show
    await expect(page.locator('#panel-control-draft')).toBeVisible()
    await expect(page.locator('#panel-control-seed')).toBeVisible()
    await expect(page.locator('#panel-control-prompt_upsampling')).toBeVisible()
    await expect(page.locator('#panel-control-save_audio')).toBeVisible()
  })

  test('moves Draft out of the toolbar and into the panel', async ({ page }) => {
    await openVideoPanel(page)

    await expect(page.locator('#control-draft')).toHaveCount(0)
    await expect(page.locator('#panel-control-draft')).toBeVisible()

    // The primary controls stay where they were
    await expect(page.locator('#control-duration')).toBeVisible()
    await expect(page.locator('#control-fps')).toBeVisible()
  })

  test('closes with the close button', async ({ page }) => {
    await openVideoPanel(page)

    await page.locator('.side-panel-close').click()
    await expect(page.locator(PANEL)).toBeHidden()

    // Closing the panel does not deselect the node, so the toolbar stays
    await expect(page.locator('#model-select')).toBeVisible()
  })

  test('closes when the node is deselected', async ({ page }) => {
    await openVideoPanel(page)

    // Empty canvas: away from the left dock and from the panel itself
    await page.mouse.click(700, 620)
    await expect(page.locator(PANEL)).toBeHidden()
  })

  test('closes when another node is selected', async ({ page }) => {
    await openVideoPanel(page)

    await addNodeFromSidebar(page, 'Prompt')
    // Clear of the video node, of the panel on the right and of the left dock,
    // any of which would swallow the click
    await positionNodes(page, [{ type: 'prompt', x: 160, y: 600 }])

    // The corner is padding: anywhere else on a Prompt node lands on the
    // textarea or on the disabled send button, neither of which selects it
    await page.locator('.vue-flow__node-prompt').click({ position: { x: 4, y: 4 } })

    await expect(page.locator(PANEL)).toBeHidden()
  })

  test('closes when the node is deleted', async ({ page }) => {
    await openVideoPanel(page)

    await page.keyboard.press('Delete')

    await expect(page.locator('.vue-flow__node-video-generator')).toHaveCount(0)
    await expect(page.locator(PANEL)).toBeHidden()
  })

  test('writes the changed options into the node params', async ({ page }) => {
    await openVideoPanel(page)

    await page.locator('#panel-control-draft').check()
    await page.locator('#panel-control-save_audio').uncheck()
    await page.locator('#panel-control-seed').fill('1234')

    const node = await readNode(page, 'video-generator')
    expect(node.params.draft).toBe(true)
    expect(node.params.save_audio).toBe(false)
    // Numbers must not be stored as strings, or they reach the API as strings
    expect(node.params.seed).toBe(1234)
  })

  test('leaves the canvas usable while it is open', async ({ page }) => {
    const videoNode = await openVideoPanel(page)

    const before = await readNode(page, 'video-generator')

    const box = await videoNode.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + 30)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + 90, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    const after = await readNode(page, 'video-generator')
    expect(after.position.x).not.toBe(before.position.x)

    // Dragging keeps the node selected, so the panel is still up
    await expect(page.locator(PANEL)).toBeVisible()
  })

  test('shows the options of a text model', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Text Generator')
    await positionNodes(page, [{ type: 'text-generator', x: 320, y: 240 }])

    const textNode = page.locator('.vue-flow__node-text-generator')
    await selectNode(page, textNode)
    await page.locator(MORE_OPTIONS_BUTTON).click()

    await expect(page.locator(PANEL)).toBeVisible()
    await expect(page.locator('#panel-control-system_prompt')).toBeVisible()

    await page.locator('#panel-control-system_prompt').fill('Answer like a pirate')

    const node = await readNode(page, 'text-generator')
    expect(node.params.system_prompt).toBe('Answer like a pirate')
  })

  test('follows the model selected in the toolbar', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Text Generator')
    await positionNodes(page, [{ type: 'text-generator', x: 320, y: 240 }])

    const textNode = page.locator('.vue-flow__node-text-generator')
    await selectNode(page, textNode)
    await page.locator(MORE_OPTIONS_BUTTON).click()
    await expect(page.locator('#panel-control-system_prompt')).toBeVisible()

    // Gemini names the same idea differently, so the panel has to swap controls
    await page.locator('#model-select').selectOption('gemini-2.5-flash')

    await expect(page.locator('#panel-control-system_prompt')).toHaveCount(0)
    await expect(page.locator('#panel-control-system_instruction')).toBeVisible()
  })
})
