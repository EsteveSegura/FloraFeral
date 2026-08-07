import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  connectNodes,
  connectNodesProgrammatic,
} from './helpers/canvas.js'

/**
 * Edges carry no ids in the DOM, and a reroute stores nothing at all: what it
 * is carrying only shows up in the wiring, so the store is the place to read.
 */
async function readGraph(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    return {
      nodes: flowStore.nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
      edges: flowStore.edges.map(e => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    }
  })
}

/** Node ids by type, in creation order */
async function idsOfType(page, type) {
  const { nodes } = await readGraph(page)
  return nodes.filter(n => n.type === type).map(n => n.id)
}

/** Mark nodes as selected in the store, the selection a click cannot express */
async function selectNodesProgrammatic(page, matchers) {
  await page.evaluate((specs) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    flowStore.nodes.forEach(n => { n.selected = false })
    for (const { type, nth } of specs) {
      const matching = flowStore.nodes.filter(n => n.type === type)
      const node = matching[nth || 0]
      if (node) node.selected = true
    }
  }, matchers)
  await page.waitForTimeout(100)
}

test.describe('Reroute node', () => {
  test('passes a prompt through to the node downstream', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Text Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', x: 450, y: 220 },
      { type: 'text-generator', x: 700, y: 200 },
    ])

    const promptNode = page.locator('.vue-flow__node-prompt')
    const textGenNode = page.locator('.vue-flow__node-text-generator')

    await promptNode.locator('textarea').fill('a cute cat')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])

    // The generator reads its prompt one hop back, and that hop is the reroute
    await expect(textGenNode.locator('.prompt-preview')).toContainText('a cute cat')
  })

  test('takes the colour of the port feeding it', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', x: 500, y: 220 },
    ])

    const rerouteNode = page.locator('.vue-flow__node-reroute')
    const outputHandle = rerouteNode.locator('.vue-flow__handle[data-handleid="output-0"]')

    // Unconnected: no type yet, so the neutral fallback
    const unconnected = await outputHandle.evaluate(el => getComputedStyle(el).backgroundColor)

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
    ])

    const connected = await outputHandle.evaluate(el => getComputedStyle(el).backgroundColor)
    expect(connected).not.toBe(unconnected)
  })

  test('refuses a port type it is not carrying', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Prompt')

    await positionNodes(page, [
      { type: 'image', x: 100, y: 150 },
      { type: 'reroute', x: 450, y: 170 },
      { type: 'prompt', x: 700, y: 150 },
    ])

    // Now the reroute carries an image
    await connectNodesProgrammatic(page, [
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
    ])

    const rerouteNode = page.locator('.vue-flow__node-reroute')
    const promptNode = page.locator('.vue-flow__node-prompt')

    await connectNodes(page, rerouteNode, 'output-0', promptNode, 'input-0')
    await page.waitForTimeout(300)

    // Only the image edge survives: an image cannot land on a prompt input
    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(1)
  })

  test('accepts the port type it is carrying', async ({ page }) => {
    // The control for the test above: same gesture onto the same handle, so a
    // rejection there is the validation talking and not a drag that missed
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Prompt')

    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 100, y: 150 },
      { type: 'reroute', x: 450, y: 170 },
      { type: 'prompt', nth: 1, x: 700, y: 150 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceNth: 0, sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
    ])

    const rerouteNode = page.locator('.vue-flow__node-reroute')
    const secondPrompt = page.locator('.vue-flow__node-prompt').nth(1)

    await connectNodes(page, rerouteNode, 'output-0', secondPrompt, 'input-0')
    await page.waitForTimeout(300)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(2)
  })

  test('takes a single input', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')

    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 100, y: 100 },
      { type: 'prompt', nth: 1, x: 100, y: 350 },
      { type: 'reroute', x: 500, y: 220 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceNth: 0, sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
    ])

    const secondPrompt = page.locator('.vue-flow__node-prompt').nth(1)
    const rerouteNode = page.locator('.vue-flow__node-reroute')

    await connectNodes(page, secondPrompt, 'output-0', rerouteNode, 'input-0')
    await page.waitForTimeout(300)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(1)
  })

  test('deleting it leaves the wire connected', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Text Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', x: 450, y: 220 },
      { type: 'text-generator', x: 700, y: 200 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])

    const [promptId] = await idsOfType(page, 'prompt')
    const [textGenId] = await idsOfType(page, 'text-generator')

    await selectNodesProgrammatic(page, [{ type: 'reroute' }])
    await page.keyboard.press('Delete')
    await page.waitForTimeout(400)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      source: promptId,
      sourceHandle: 'output-0',
      target: textGenId,
      targetHandle: 'input-1',
    })
  })

  test('deleting it rewires every node it was feeding', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Text Generator')
    await addNodeFromSidebar(page, 'Image Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', x: 450, y: 220 },
      { type: 'text-generator', x: 700, y: 60 },
      { type: 'image-generator', x: 700, y: 420 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
      { sourceType: 'reroute', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])

    const [promptId] = await idsOfType(page, 'prompt')

    await selectNodesProgrammatic(page, [{ type: 'reroute' }])
    await page.keyboard.press('Delete')
    await page.waitForTimeout(400)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(2)
    expect(edges.every(e => e.source === promptId)).toBe(true)
  })

  test('deleting a whole chain of them leaves one edge behind', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Text Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', nth: 0, x: 350, y: 220 },
      { type: 'reroute', nth: 1, x: 550, y: 220 },
      { type: 'text-generator', x: 750, y: 200 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetNth: 0, targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceNth: 0, sourceHandle: 'output-0', targetType: 'reroute', targetNth: 1, targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceNth: 1, sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])

    const [promptId] = await idsOfType(page, 'prompt')
    const [textGenId] = await idsOfType(page, 'text-generator')

    await selectNodesProgrammatic(page, [
      { type: 'reroute', nth: 0 },
      { type: 'reroute', nth: 1 },
    ])
    await page.keyboard.press('Delete')
    await page.waitForTimeout(400)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({ source: promptId, target: textGenId })
  })

  test('deleting the middle one keeps the reroute that survives', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Reroute')
    await addNodeFromSidebar(page, 'Text Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', nth: 0, x: 350, y: 220 },
      { type: 'reroute', nth: 1, x: 550, y: 220 },
      { type: 'text-generator', x: 750, y: 200 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetNth: 0, targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceNth: 0, sourceHandle: 'output-0', targetType: 'reroute', targetNth: 1, targetHandle: 'input-0' },
      { sourceType: 'reroute', sourceNth: 1, sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])

    const firstRerouteId = (await idsOfType(page, 'reroute'))[0]
    const [textGenId] = await idsOfType(page, 'text-generator')

    await selectNodesProgrammatic(page, [{ type: 'reroute', nth: 1 }])
    await page.keyboard.press('Delete')
    await page.waitForTimeout(400)

    // The surviving reroute is a legitimate source, so the wire stops there
    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(2)
    expect(edges.some(e => e.source === firstRerouteId && e.target === textGenId)).toBe(true)
  })

  test('carries nothing into the exported flow', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Reroute')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'reroute', x: 500, y: 220 },
    ])

    await page.locator('.vue-flow__node-prompt textarea').fill('a cute cat')
    await page.locator('.vue-flow__node-prompt textarea').blur()

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'reroute', targetHandle: 'input-0' },
    ])

    const { nodes } = await readGraph(page)
    const reroute = nodes.find(n => n.type === 'reroute')

    // Everything about it is recomputed from the graph, so its data holds only
    // the label every node gets
    expect(reroute.data.prompt).toBeUndefined()
    expect(reroute.data.portType).toBeUndefined()
  })

  test('Backspace in a prompt edits text instead of deleting nodes', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 300, y: 200 }])

    const textarea = page.locator('.vue-flow__node-prompt textarea')
    await textarea.fill('cats')
    await textarea.press('Backspace')
    await page.waitForTimeout(200)

    await expect(textarea).toHaveValue('cat')
    await expect(page.locator('.vue-flow__node-prompt')).toHaveCount(1)
  })
})
