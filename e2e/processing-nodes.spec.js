import { test, expect } from '@playwright/test'
import {
  TEST_IMAGE_PATH,
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
  uploadImageToNode,
} from './helpers/canvas.js'

test.describe('Processing Nodes', () => {
  test('Image → Draw node opens modal and saves', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Draw')

    const imageNode = page.locator('.vue-flow__node-image')
    const drawNode = page.locator('.vue-flow__node-draw')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 200 },
      { type: 'draw', x: 500, y: 200 },
    ])

    // Upload image
    await uploadImageToNode(page, imageNode)

    // Connect Image → Draw
    await connectNodes(page, imageNode, 'output-0', drawNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Wait for draw node to receive image
    await expect(drawNode.locator('.image-preview')).toBeVisible({ timeout: 5000 })

    // Click preview to open drawing modal
    await drawNode.locator('.image-preview').click()
    const modal = page.locator('.drawing-modal-content')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Draw a stroke on the canvas
    const canvas = modal.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const canvasBox = await canvas.boundingBox()
    const cx = canvasBox.x + canvasBox.width / 2
    const cy = canvasBox.y + canvasBox.height / 2
    await page.mouse.move(cx - 30, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 30, cy, { steps: 5 })
    await page.mouse.up()

    // Click Save
    await modal.getByRole('button', { name: 'Save' }).click()

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    // Draw node should still show preview (output exists)
    await expect(drawNode.locator('.image-preview')).toBeVisible()
  })

  test('Two Images → Diff node shows diff', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Diff')

    const imageNodes = page.locator('.vue-flow__node-image')
    const diffNode = page.locator('.vue-flow__node-diff')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 100, nth: 0 },
      { type: 'image', x: 100, y: 400, nth: 1 },
      { type: 'diff', x: 500, y: 250 },
    ])

    // Upload images to both nodes
    await uploadImageToNode(page, imageNodes.nth(0))
    await uploadImageToNode(page, imageNodes.nth(1))

    // Connect Image1 → Diff(input-0)
    await connectNodes(page, imageNodes.nth(0), 'output-0', diffNode, 'input-0')
    // Connect Image2 → Diff(input-1)
    await connectNodes(page, imageNodes.nth(1), 'output-0', diffNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // Verify diff result appears
    await expect(diffNode.locator('.diff-result')).toBeVisible({ timeout: 10000 })
    await expect(diffNode.locator('.diff-canvas')).toBeVisible()
  })

  test('Two Images → Compare node shows slider', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Compare')

    const imageNodes = page.locator('.vue-flow__node-image')
    const compareNode = page.locator('.vue-flow__node-compare')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 100, nth: 0 },
      { type: 'image', x: 100, y: 400, nth: 1 },
      { type: 'compare', x: 550, y: 250 },
    ])

    // Upload images to both nodes
    await uploadImageToNode(page, imageNodes.nth(0))
    await uploadImageToNode(page, imageNodes.nth(1))

    // Connect Image1 → Compare(input-0)
    await connectNodes(page, imageNodes.nth(0), 'output-0', compareNode, 'input-0')
    // Connect Image2 → Compare(input-1)
    await connectNodes(page, imageNodes.nth(1), 'output-0', compareNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // Verify compare result with slider
    const preview = compareNode.locator('.compare-preview')
    await expect(preview).toBeVisible({ timeout: 10000 })
    await expect(compareNode.locator('.compare-label-left')).toHaveText('Before')
    await expect(compareNode.locator('.compare-label-right')).toHaveText('After')

    // Interact with slider — drag from center to left
    const previewBox = await preview.boundingBox()
    const startX = previewBox.x + previewBox.width / 2
    const startY = previewBox.y + previewBox.height / 2
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(previewBox.x + previewBox.width * 0.3, startY, { steps: 5 })
    await page.mouse.up()
  })
})
