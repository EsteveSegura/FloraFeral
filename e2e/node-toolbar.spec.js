import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
} from './helpers/canvas.js'

// VueFlow picks the multi-selection key per platform, and on macOS Chromium a
// Control+click would be delivered as a right click anyway
const MULTI_SELECT_KEY = process.platform === 'darwin' ? 'Meta' : 'Control'

/**
 * Plain click on the first node, modifier+click on the rest. Clicking the
 * header keeps the pointer away from the textareas inside the node body.
 */
async function selectNodes(page, nodeLocators) {
  for (const [index, node] of nodeLocators.entries()) {
    await node.locator('.node-header').click(index === 0 ? {} : { modifiers: [MULTI_SELECT_KEY] })
  }
  await page.waitForTimeout(100)
}

test.describe('Node toolbar visibility', () => {
  test('shows the toolbar for a single selected node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [{ type: 'image-generator', x: 200, y: 160 }])

    await selectNodes(page, [page.locator('.vue-flow__node-image-generator')])

    await expect(page.locator('.vue-flow__node-toolbar')).toHaveCount(1)
  })

  test('hides every toolbar while several nodes are selected', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Image Generator')
    await addNodeFromSidebar(page, 'Text Generator')
    // Selecting a node elevates it, so leave room or its box swallows the
    // clicks meant for the next header
    await positionNodes(page, [
      { type: 'image-generator', x: 100, y: 120 },
      { type: 'text-generator', x: 620, y: 120 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-image-generator'),
      page.locator('.vue-flow__node-text-generator'),
    ])

    await expect(page.locator('.vue-flow__node-toolbar')).toHaveCount(0)
  })

  test('brings the toolbar back when the selection shrinks to one node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Image Generator')
    await addNodeFromSidebar(page, 'Text Generator')
    await positionNodes(page, [
      { type: 'image-generator', x: 100, y: 120 },
      { type: 'text-generator', x: 620, y: 120 },
    ])

    const imageGenerator = page.locator('.vue-flow__node-image-generator')
    await selectNodes(page, [
      imageGenerator,
      page.locator('.vue-flow__node-text-generator'),
    ])
    await expect(page.locator('.vue-flow__node-toolbar')).toHaveCount(0)

    // Clicking an already selected node keeps the multi-selection, so the
    // selection is cleared on the pane before picking a single node again
    await page.locator('.vue-flow__pane').click({ position: { x: 950, y: 600 } })
    await selectNodes(page, [imageGenerator])

    await expect(page.locator('.vue-flow__node-toolbar')).toHaveCount(1)
  })
})
