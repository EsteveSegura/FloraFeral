import { test, expect } from '@playwright/test'
import { mockNanaBananaPro } from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  connectNodesProgrammatic,
} from './helpers/canvas.js'

// Longer than the history's 400ms debounce, so a step is closed before the next
const SETTLED = 600

/**
 * Positions, ids and data are not in the DOM: read them from the store, the same
 * access positionNodes uses.
 */
async function readGraph(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    return {
      nodes: flowStore.nodes.map(n => ({
        id: n.id,
        type: n.type,
        x: n.position.x,
        y: n.position.y,
        parentNode: n.parentNode || null,
        data: n.data,
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

/** Move a node straight through the store, the way positionNodes does */
async function moveNode(page, type, x, y, nth = 0) {
  await page.evaluate(({ type, x, y, nth }) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const node = flowStore.nodes.filter(n => n.type === type)[nth]
    if (node) node.position = { x, y }
  }, { type, x, y, nth })
  await page.waitForTimeout(SETTLED)
}

async function undo(page) {
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
}

async function redo(page, key = 'Control+Shift+z') {
  await page.evaluate(() => document.activeElement?.blur())
  await page.keyboard.press(key)
  await page.waitForTimeout(400)
}

test.describe('Undo and redo', () => {
  test('undoes a move and redoes it', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 200 }])
    await page.waitForTimeout(SETTLED)

    await moveNode(page, 'prompt', 600, 400)
    expect((await readGraph(page)).nodes[0]).toMatchObject({ x: 600, y: 400 })

    await undo(page)
    expect((await readGraph(page)).nodes[0]).toMatchObject({ x: 200, y: 200 })

    await redo(page)
    expect((await readGraph(page)).nodes[0]).toMatchObject({ x: 600, y: 400 })
  })

  test('Ctrl+Y redoes too', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 200 }])
    await page.waitForTimeout(SETTLED)

    await moveNode(page, 'prompt', 500, 300)
    await undo(page)
    expect((await readGraph(page)).nodes[0]).toMatchObject({ x: 200, y: 200 })

    await redo(page, 'Control+y')
    expect((await readGraph(page)).nodes[0]).toMatchObject({ x: 500, y: 300 })
  })

  test('a typed sentence is one step, not one per keystroke', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 200 }])
    await page.waitForTimeout(SETTLED)

    const textarea = page.locator('.vue-flow__node-prompt textarea')
    await textarea.click()
    // Typed, not filled: every keystroke writes to the store through a watcher
    await textarea.pressSequentially('a cute cat', { delay: 30 })
    await textarea.blur()
    await page.waitForTimeout(SETTLED)

    expect((await readGraph(page)).nodes[0].data.prompt).toBe('a cute cat')

    // A single undo has to clear the whole burst
    await undo(page)
    expect((await readGraph(page)).nodes[0].data.prompt ?? '').toBe('')
    await expect(textarea).toHaveValue('')
  })

  test('undoing a delete brings the node and its edges back', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')

    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 80, y: 80 },
      { type: 'prompt', nth: 1, x: 80, y: 400 },
      { type: 'text-generator', x: 600, y: 200 },
    ])

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceNth: 0, sourceHandle: 'output-0', targetType: 'prompt', targetNth: 1, targetHandle: 'input-0' },
      { sourceType: 'prompt', sourceNth: 1, sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])
    await page.waitForTimeout(SETTLED)

    const before = await readGraph(page)
    expect(before.edges).toHaveLength(2)

    // The middle prompt carries both edges
    await selectNodesProgrammatic(page, [{ type: 'prompt', nth: 1 }])
    await page.keyboard.press('Delete')
    await page.waitForTimeout(SETTLED)

    expect((await readGraph(page)).edges).toHaveLength(0)

    await undo(page)

    const after = await readGraph(page)
    expect(after.nodes).toHaveLength(3)
    expect(after.edges).toHaveLength(2)
    expect(new Set(after.edges.map(e => `${e.source}>${e.target}`)))
      .toEqual(new Set(before.edges.map(e => `${e.source}>${e.target}`)))
  })

  test('undoing a group takes the container away and frees its children', async ({ page }) => {
    const warnings = []
    page.on('console', message => {
      if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text())
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')

    await positionNodes(page, [
      { type: 'prompt', nth: 0, x: 200, y: 200 },
      { type: 'prompt', nth: 1, x: 500, y: 200 },
    ])
    await page.waitForTimeout(SETTLED)

    await selectNodesProgrammatic(page, [
      { type: 'prompt', nth: 0 },
      { type: 'prompt', nth: 1 },
    ])
    await page.keyboard.press('Control+g')
    await page.waitForTimeout(SETTLED)

    expect(await page.locator('.vue-flow__node-group').count()).toBe(1)

    await undo(page)

    const after = await readGraph(page)
    expect(after.nodes.filter(n => n.type === 'group')).toHaveLength(0)
    // Children back to absolute coordinates, no parent pointing at a node that
    // no longer exists
    expect(after.nodes.every(n => n.parentNode === null)).toBe(true)
    expect(after.nodes.map(n => [n.x, n.y])).toEqual([[200, 200], [500, 200]])
    expect(warnings.filter(w => w.includes('parent'))).toEqual([])
  })

  test('a generated image survives undoing a later move', async ({ page }) => {
    await mockNanaBananaPro(page)

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'image-generator', x: 600, y: 200 },
    ])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await promptNode.locator('textarea').fill('a cute cat')
    await promptNode.locator('textarea').blur()

    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])
    await page.waitForTimeout(SETTLED)

    const generatorNode = page.locator('.vue-flow__node-image-generator')
    await generatorNode.getByRole('button', { name: 'Generate Image' }).click()
    await expect(generatorNode.locator('.image-preview img')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(SETTLED)

    const generated = (await readGraph(page)).nodes
      .find(n => n.type === 'image-generator').data.lastOutputSrc
    expect(generated).toBeTruthy()

    // Move something unrelated, then take it back
    await moveNode(page, 'prompt', 150, 500)
    await undo(page)

    const after = await readGraph(page)
    expect(after.nodes.find(n => n.type === 'prompt')).toMatchObject({ x: 100, y: 200 })
    // The whole point of the design: the undo did not throw away the result
    expect(after.nodes.find(n => n.type === 'image-generator').data.lastOutputSrc).toBe(generated)
    await expect(generatorNode.locator('.image-preview img')).toBeVisible()
  })

  test('stops at 30 steps', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 100, y: 100 }])
    await page.waitForTimeout(SETTLED)

    // 35 moves, each its own step
    for (let step = 1; step <= 35; step++) {
      await moveNode(page, 'prompt', 100 + step * 10, 100)
    }
    expect((await readGraph(page)).nodes[0].x).toBe(450)

    for (let step = 0; step < 40; step++) {
      await page.keyboard.press('Control+z')
    }
    await page.waitForTimeout(600)

    // 30 undoable steps back from move 35 lands on move 5, never on the start
    expect((await readGraph(page)).nodes[0].x).toBe(150)
  })

  test('importing a flow clears the history', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 200, y: 200 }])
    await page.waitForTimeout(SETTLED)
    await moveNode(page, 'prompt', 500, 500)

    // Import a flow holding a single comment node, through the real hidden input
    await page.locator('input[type="file"][accept*="json"]').setInputFiles({
      name: 'imported.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        version: '1.0.0',
        createdAt: '2026-01-01T00:00:00.000Z',
        nodes: [{
          id: 'imported_1',
          type: 'comment',
          position: { x: 300, y: 300 },
          data: { label: 'Imported', comment: 'hello' },
          io: { inputs: [], outputs: [] },
        }],
        edges: [],
      })),
    })
    await page.waitForTimeout(1000)

    expect((await readGraph(page)).nodes.map(n => n.type)).toEqual(['comment'])

    // Nothing to go back to: the imported flow is step zero
    await undo(page)
    expect((await readGraph(page)).nodes.map(n => n.type)).toEqual(['comment'])
  })
})
