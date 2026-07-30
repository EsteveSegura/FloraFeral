import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  getHandleCenter,
  positionNodes,
} from './helpers/canvas.js'

/**
 * Drag a connection from a handle and release it on empty canvas.
 */
async function dropConnectionOnPane(page, nodeLocator, handleId, target) {
  const from = await getHandleCenter(nodeLocator, handleId)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 10 })
  await page.mouse.up()
}

/**
 * Read the edges currently stored in the flow store.
 */
async function getEdges(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    return pinia._s.get('flow').edges.map(e => ({
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
    }))
  })
}

/**
 * Read a node's id and type by node type + index.
 */
async function getNode(page, nodeType, nth = 0) {
  return page.evaluate(({ nodeType, nth }) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const matching = pinia._s.get('flow').nodes.filter(n => n.type === nodeType)
    const node = matching[nth]
    return node ? { id: node.id, type: node.type, position: node.position } : null
  }, { nodeType, nth })
}

test.describe('Connection dropped on empty canvas', () => {
  test('offers only image targets when dragging from an image output', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await positionNodes(page, [{ type: 'image', x: 100, y: 200 }])

    const imageNode = page.locator('.vue-flow__node-image')
    await dropConnectionOnPane(page, imageNode, 'output-0', { x: 800, y: 400 })

    const menu = page.locator('.nodes-menu')
    await expect(menu).toBeVisible()
    await expect(menu.locator('.header')).toHaveText('Connect to')

    const items = menu.locator('.node-item .node-text')
    // Nodes with an `image` input
    await expect(items.filter({ hasText: /^Image Generator$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Text Generator$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Draw$/ })).toHaveCount(1)
    // Diff and Compare have two image inputs, but are listed once each
    await expect(items.filter({ hasText: /^Image Diff$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Image Compare$/ })).toHaveCount(1)
    // Nodes without an `image` input must not be offered
    await expect(items.filter({ hasText: /^Prompt$/ })).toHaveCount(0)
    await expect(items.filter({ hasText: /^Prompt Template$/ })).toHaveCount(0)
    await expect(items.filter({ hasText: /^Comment$/ })).toHaveCount(0)
  })

  test('creates the chosen node already connected to the origin output', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await positionNodes(page, [{ type: 'image', x: 100, y: 200 }])

    const imageNode = page.locator('.vue-flow__node-image')
    await dropConnectionOnPane(page, imageNode, 'output-0', { x: 800, y: 400 })

    await page.locator('.nodes-menu .node-item .node-text')
      .filter({ hasText: /^Image Generator$/ })
      .click()

    await expect(page.locator('.vue-flow__node-image-generator')).toBeVisible()
    await expect(page.locator('.nodes-menu')).toBeHidden()

    const source = await getNode(page, 'image')
    const target = await getNode(page, 'image-generator')
    const edges = await getEdges(page)

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: source.id,
      sourceHandle: 'output-0',
      target: target.id,
      targetHandle: 'input-0',
    })
    // New node is placed to the right of the origin
    expect(target.position.x).toBeGreaterThan(source.position.x)
  })

  test('wires a node with several compatible ports to its first one', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await positionNodes(page, [{ type: 'image', x: 100, y: 200 }])

    const imageNode = page.locator('.vue-flow__node-image')
    await dropConnectionOnPane(page, imageNode, 'output-0', { x: 800, y: 400 })

    await page.locator('.nodes-menu .node-item .node-text')
      .filter({ hasText: /^Image Diff$/ })
      .click()

    await expect(page.locator('.vue-flow__node-diff')).toBeVisible()

    const edges = await getEdges(page)
    expect(edges).toHaveLength(1)
    expect(edges[0].targetHandle).toBe('input-0')
  })

  test('offers only prompt sources when dragging backwards from a prompt input', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [{ type: 'image-generator', x: 600, y: 200 }])

    const generatorNode = page.locator('.vue-flow__node-image-generator')
    await dropConnectionOnPane(page, generatorNode, 'input-1', { x: 200, y: 400 })

    const menu = page.locator('.nodes-menu')
    await expect(menu).toBeVisible()

    const items = menu.locator('.node-item .node-text')
    await expect(items.filter({ hasText: /^Prompt$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Prompt Template$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Text Generator$/ })).toHaveCount(1)
    await expect(items.filter({ hasText: /^Image$/ })).toHaveCount(0)
    await expect(items.filter({ hasText: /^Draw$/ })).toHaveCount(0)

    await items.filter({ hasText: /^Prompt$/ }).click()

    const promptNode = await getNode(page, 'prompt')
    const generator = await getNode(page, 'image-generator')
    const edges = await getEdges(page)

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: promptNode.id,
      sourceHandle: 'output-0',
      target: generator.id,
      targetHandle: 'input-1',
    })
    // New node is placed to the left of the origin
    expect(promptNode.position.x).toBeLessThan(generator.position.x)
  })

  test('places the new node at the drop point after zooming and panning', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await positionNodes(page, [{ type: 'image', x: 100, y: 200 }])

    // Zoom out and pan the canvas so screen and flow coordinates diverge
    await page.mouse.move(700, 400)
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(300)
    await page.mouse.move(900, 500)
    await page.mouse.down()
    await page.mouse.move(820, 430, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Guard: the assertions below are only meaningful if the viewport actually moved
    const transform = await page.locator('.vue-flow__transformationpane').evaluate(el => el.style.transform)
    expect(transform).not.toMatch(/scale\(1\)/)

    const dropPoint = { x: 700, y: 450 }
    const imageNode = page.locator('.vue-flow__node-image')
    await dropConnectionOnPane(page, imageNode, 'output-0', dropPoint)

    await page.locator('.nodes-menu .node-item .node-text')
      .filter({ hasText: /^Draw$/ })
      .click()

    const drawNode = page.locator('.vue-flow__node-draw')
    await expect(drawNode).toBeVisible()

    // The node must render where the connection was released, not somewhere else
    const box = await drawNode.boundingBox()
    expect(Math.abs(box.x - dropPoint.x)).toBeLessThan(60)
    expect(Math.abs(box.y + box.height / 2 - dropPoint.y)).toBeLessThan(80)
  })

  test('does not open the menu when the connection lands on a valid handle', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [
      { type: 'image', x: 100, y: 200 },
      { type: 'image-generator', x: 600, y: 200 },
    ])

    const imageNode = page.locator('.vue-flow__node-image')
    const generatorNode = page.locator('.vue-flow__node-image-generator')
    const target = await getHandleCenter(generatorNode, 'input-0')

    await dropConnectionOnPane(page, imageNode, 'output-0', target)

    await expect(page.locator('.nodes-menu')).toBeHidden()

    const edges = await getEdges(page)
    expect(edges).toHaveLength(1)
    expect(edges[0].targetHandle).toBe('input-0')
  })
})
