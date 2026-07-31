import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  connectNodesProgrammatic,
} from './helpers/canvas.js'

/**
 * Ids, selection flags and positions are not in the DOM: read them from the
 * store, the same access positionNodes uses.
 */
async function readGraph(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    return {
      nodes: flowStore.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.data?.label,
        selected: !!n.selected,
        parentNode: n.parentNode || null,
        x: n.position.x,
        y: n.position.y,
      })),
      edges: flowStore.edges.map(e => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    }
  })
}

/**
 * Plain click on the first node, Ctrl+click on the rest (the canvas uses
 * Control/Meta as its multi-selection key). The header is the only spot
 * guaranteed not to focus a textarea, so headers must be visible.
 */
async function selectNodes(page, nodeLocators) {
  for (const [index, node] of nodeLocators.entries()) {
    await node.locator('.node-header').click(index === 0 ? {} : { modifiers: ['Control'] })
  }
  await page.waitForTimeout(100)
}

/** Mark nodes as selected in the store, for selections a click cannot express */
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

/** Ctrl+C, park the pointer over an empty spot, Ctrl+V */
async function copyAndPasteAt(page, x, y) {
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Control+c')
  // handlePaste places the batch at the last position the mouse reported
  await page.mouse.move(x, y)
  await page.keyboard.press('Control+v')
  await page.waitForTimeout(400)
}

test.describe('Copy/paste the selection', () => {
  test('pastes a single selected node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 160 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await selectNodes(page, [promptNode])
    await copyAndPasteAt(page, 700, 500)

    await expect(promptNode).toHaveCount(2)
    const { nodes } = await readGraph(page)
    expect(nodes.map(n => n.label)).toEqual(['New Prompt', 'New Prompt 2'])
  })

  test('pastes every selected node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Prompt')
    // Selecting a node elevates it, so leave room or its box swallows the
    // clicks meant for the next header
    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 100, y: 100 },
      { type: 'image', nth: 0, x: 560, y: 100 },
      { type: 'prompt', nth: 1, x: 100, y: 430 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt').nth(0),
      page.locator('.vue-flow__node-image').nth(0),
      page.locator('.vue-flow__node-prompt').nth(1),
    ])
    await copyAndPasteAt(page, 850, 520)

    const { nodes } = await readGraph(page)
    expect(nodes).toHaveLength(6)
    expect(nodes.filter(n => n.type === 'prompt')).toHaveLength(4)
    expect(nodes.filter(n => n.type === 'image')).toHaveLength(2)
    // Labels stay unique even though the copies are created in one pass
    expect(new Set(nodes.map(n => n.label)).size).toBe(6)
  })

  test('keeps the relative layout of the copied nodes', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 100, y: 100 },
      { type: 'prompt', nth: 1, x: 400, y: 260 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt').nth(0),
      page.locator('.vue-flow__node-prompt').nth(1),
    ])
    await copyAndPasteAt(page, 800, 480)

    const { nodes } = await readGraph(page)
    const pasted = nodes.slice(2)
    expect(pasted).toHaveLength(2)
    expect(pasted[1].x - pasted[0].x).toBeCloseTo(300, 0)
    expect(pasted[1].y - pasted[0].y).toBeCloseTo(160, 0)
  })

  test('rewires connections between the pasted nodes', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [
      { type: 'prompt', x: 120, y: 140 },
      { type: 'image-generator', x: 480, y: 140 },
    ])
    await connectNodesProgrammatic(page, [{
      sourceType: 'prompt', sourceHandle: 'output-0',
      targetType: 'image-generator', targetHandle: 'input-1',
    }])

    const before = await readGraph(page)
    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt'),
      page.locator('.vue-flow__node-image-generator'),
    ])
    await copyAndPasteAt(page, 820, 520)

    const { nodes, edges } = await readGraph(page)
    expect(edges).toHaveLength(2)

    const pastedIds = new Set(nodes.slice(2).map(n => n.id))
    const newEdge = edges.find(e => !before.edges.some(o => o.source === e.source && o.target === e.target))
    // Both ends land on the clones, not on the originals
    expect(pastedIds.has(newEdge.source)).toBe(true)
    expect(pastedIds.has(newEdge.target)).toBe(true)
    expect(newEdge.sourceHandle).toBe('output-0')
    expect(newEdge.targetHandle).toBe('input-1')
  })

  test('keeps external inputs pointing at the original source', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [
      { type: 'image', x: 120, y: 140 },
      { type: 'image-generator', x: 480, y: 140 },
    ])
    await connectNodesProgrammatic(page, [{
      sourceType: 'image', sourceHandle: 'output-0',
      targetType: 'image-generator', targetHandle: 'input-0',
    }])

    const before = await readGraph(page)
    const imageId = before.nodes.find(n => n.type === 'image').id

    // Only the consumer is copied: its feed must survive
    await selectNodes(page, [page.locator('.vue-flow__node-image-generator')])
    await copyAndPasteAt(page, 820, 520)

    const { nodes, edges } = await readGraph(page)
    expect(edges).toHaveLength(2)

    const pastedGenerator = nodes.filter(n => n.type === 'image-generator')[1]
    const newEdge = edges.find(e => e.target === pastedGenerator.id)
    expect(newEdge.source).toBe(imageId)
    expect(newEdge.targetHandle).toBe('input-0')
  })

  test('does not duplicate outgoing connections', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')
    await positionNodes(page, [
      { type: 'image', x: 120, y: 140 },
      { type: 'image-generator', x: 480, y: 140 },
    ])
    await connectNodesProgrammatic(page, [{
      sourceType: 'image', sourceHandle: 'output-0',
      targetType: 'image-generator', targetHandle: 'input-0',
    }])

    const before = await readGraph(page)
    const generatorId = before.nodes.find(n => n.type === 'image-generator').id

    // Copying a producer must not make the untouched consumer read two sources
    await selectNodes(page, [page.locator('.vue-flow__node-image')])
    await copyAndPasteAt(page, 820, 520)

    const { edges } = await readGraph(page)
    expect(edges).toHaveLength(1)
    expect(edges.filter(e => e.target === generatorId)).toHaveLength(1)
  })

  test('leaves the pasted nodes selected and the originals unselected', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 120, y: 120 },
      { type: 'prompt', nth: 1, x: 420, y: 120 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt').nth(0),
      page.locator('.vue-flow__node-prompt').nth(1),
    ])
    await copyAndPasteAt(page, 800, 500)

    const { nodes } = await readGraph(page)
    expect(nodes.filter(n => n.selected).map(n => n.id)).toEqual(nodes.slice(2).map(n => n.id))
  })

  test('chained paste keeps producing fresh nodes', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 120, y: 120 },
      { type: 'prompt', nth: 1, x: 420, y: 120 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt').nth(0),
      page.locator('.vue-flow__node-prompt').nth(1),
    ])
    await copyAndPasteAt(page, 760, 460)

    // The clones are selected now, so a second Ctrl+C/Ctrl+V copies them
    await copyAndPasteAt(page, 300, 620)

    const { nodes } = await readGraph(page)
    expect(nodes).toHaveLength(6)
    expect(new Set(nodes.map(n => n.id)).size).toBe(6)
    expect(new Set(nodes.map(n => n.label)).size).toBe(6)
  })

  test('pastes nothing when there is no selection', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 160 }])

    // Clicking the pane clears the selection
    await page.locator('.vue-flow__pane').click({ position: { x: 900, y: 550 } })
    await page.waitForTimeout(100)
    await copyAndPasteAt(page, 900, 550)

    await expect(page.locator('.vue-flow__node-prompt')).toHaveCount(1)
  })

  test('skips group containers', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 200, y: 200 },
      { type: 'prompt', nth: 1, x: 500, y: 200 },
    ])

    await selectNodes(page, [
      page.locator('.vue-flow__node-prompt').nth(0),
      page.locator('.vue-flow__node-prompt').nth(1),
    ])
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(300)
    await expect(page.locator('.vue-flow__node-group')).toHaveCount(1)

    // handleGroup clears the selection, and clicking the container is brittle
    await selectNodesProgrammatic(page, [
      { type: 'prompt', nth: 0 },
      { type: 'prompt', nth: 1 },
      { type: 'group', nth: 0 },
    ])
    await copyAndPasteAt(page, 850, 560)

    const { nodes } = await readGraph(page)
    // Two prompts cloned, the container left alone
    expect(nodes.filter(n => n.type === 'prompt')).toHaveLength(4)
    expect(nodes.filter(n => n.type === 'group')).toHaveLength(1)
    // Clones are top-level, pasted at their absolute position
    const pastedPrompts = nodes.filter(n => n.type === 'prompt').slice(2)
    expect(pastedPrompts.every(n => n.parentNode === null)).toBe(true)
    expect(pastedPrompts[1].x - pastedPrompts[0].x).toBeCloseTo(300, 0)
  })
})
