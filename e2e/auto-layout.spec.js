import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  connectNodesProgrammatic,
} from './helpers/canvas.js'

// VueFlow picks the multi-selection key per platform, and the same modifier is
// the undo key
const MODIFIER = process.platform === 'darwin' ? 'Meta' : 'Control'

/**
 * Every node with its size and its absolute position: children of a group store
 * a position relative to it, and groups cannot nest, so one hop is enough.
 */
async function readNodes(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const byId = new Map(flowStore.nodes.map(n => [n.id, n]))

    return flowStore.nodes.map(n => {
      const parent = n.parentNode ? byId.get(n.parentNode) : null

      return {
        id: n.id,
        type: n.type,
        parentNode: n.parentNode || null,
        x: parent ? parent.position.x + n.position.x : n.position.x,
        y: parent ? parent.position.y + n.position.y : n.position.y,
        relativeX: n.position.x,
        relativeY: n.position.y,
        width: n.dimensions?.width || parseInt(n.style?.width) || 0,
        height: n.dimensions?.height || parseInt(n.style?.height) || 0,
      }
    })
  })
}

const ofType = (nodes, type) => nodes.filter(n => n.type === type)
const firstOfType = (nodes, type) => ofType(nodes, type)[0]

async function autoLayout(page) {
  await page.locator('button[title="Auto Layout"]').click()
  // the button ends with a fitView animation of 300ms
  await page.waitForTimeout(700)
}

test.describe('Auto layout ordering', () => {
  test('lines up a chain left to right, whatever order it was placed in', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')
    await addNodeFromSidebar(page, 'Image Generator')

    // Deliberately backwards: the last node of the chain sits furthest left
    await positionNodes(page, [
      { type: 'image-generator', x: 100, y: 500 },
      { type: 'text-generator', x: 700, y: 100 },
      { type: 'prompt', x: 1300, y: 900 },
    ])
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
      { sourceType: 'text-generator', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])

    await autoLayout(page)

    const nodes = await readNodes(page)
    const prompt = firstOfType(nodes, 'prompt')
    const text = firstOfType(nodes, 'text-generator')
    const image = firstOfType(nodes, 'image-generator')

    expect(prompt.x + prompt.width).toBeLessThanOrEqual(text.x)
    expect(text.x + text.width).toBeLessThanOrEqual(image.x)
  })

  test('puts two sources in the same column, ahead of what they feed', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    await positionNodes(page, [
      { type: 'image', x: 900, y: 100 },
      { type: 'prompt', x: 200, y: 700 },
      { type: 'image-generator', x: 500, y: 200 },
    ])
    await connectNodesProgrammatic(page, [
      { sourceType: 'image', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-0' },
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])

    await autoLayout(page)

    const nodes = await readNodes(page)
    const image = firstOfType(nodes, 'image')
    const prompt = firstOfType(nodes, 'prompt')
    const generator = firstOfType(nodes, 'image-generator')

    // Both sources have no dependency, so they share the first column
    expect(image.x).toBe(prompt.x)
    expect(generator.x).toBeGreaterThan(image.x)
    // ...and they do not sit on top of each other
    expect(Math.abs(image.y - prompt.y)).toBeGreaterThan(0)
  })

  test('running it twice changes nothing', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')
    await addNodeFromSidebar(page, 'Image Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 800, y: 60 },
      { type: 'text-generator', x: 120, y: 640 },
      { type: 'image-generator', x: 1400, y: 260 },
    ])
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
      { sourceType: 'text-generator', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])

    await autoLayout(page)
    const first = await readNodes(page)

    await autoLayout(page)
    const second = await readNodes(page)

    expect(second.map(n => [n.id, n.x, n.y])).toEqual(first.map(n => [n.id, n.x, n.y]))
  })

  test('leaves a loose comment where the user put it', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')
    await addNodeFromSidebar(page, 'Comment')

    await positionNodes(page, [
      { type: 'prompt', x: 600, y: 100 },
      { type: 'text-generator', x: 200, y: 100 },
      { type: 'comment', x: 300, y: 1400 },
    ])
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
    ])

    await autoLayout(page)

    const comment = firstOfType(await readNodes(page), 'comment')
    expect(comment.x).toBe(300)
    expect(comment.y).toBe(1400)
  })
})

/**
 * Two prompt nodes wrapped in a group, plus a free Image feeding the first one.
 * Grouping needs the headers visible: they are the only spot on a node that does
 * not focus a textarea.
 */
async function setupGroupedFlow(page) {
  await setupBlankCanvas(page, { showNodeHeaders: true })
  await addNodeFromSidebar(page, 'Prompt')
  await addNodeFromSidebar(page, 'Prompt')
  await addNodeFromSidebar(page, 'Image')

  await positionNodes(page, [
    { type: 'prompt', nth: 0, x: 300, y: 200 },
    { type: 'prompt', nth: 1, x: 300, y: 500 },
    { type: 'image', x: 1200, y: 800 },
  ])

  const prompts = page.locator('.vue-flow__node-prompt')
  await prompts.nth(0).locator('.node-header').click()
  await prompts.nth(1).locator('.node-header').click({ modifiers: [MODIFIER] })
  await page.keyboard.press(`${MODIFIER}+g`)
  await page.waitForTimeout(300)

  await expect(page.locator('.vue-flow__node-group')).toHaveCount(1)

  await connectNodesProgrammatic(page, [
    { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'prompt', targetHandle: 'input-0', sourceNth: 0, targetNth: 1 },
  ])
}

test.describe('Auto layout with groups', () => {
  test('keeps the group around its content and sizes it to fit', async ({ page }) => {
    await setupGroupedFlow(page)
    await autoLayout(page)

    const nodes = await readNodes(page)
    const group = firstOfType(nodes, 'group')
    const children = nodes.filter(n => n.parentNode === group.id)

    expect(children).toHaveLength(2)

    // Children are inset by the group padding, in coordinates relative to it
    for (const child of children) {
      expect(child.relativeX).toBeGreaterThanOrEqual(40)
      expect(child.relativeY).toBeGreaterThanOrEqual(40)
      expect(child.relativeX + child.width).toBeLessThanOrEqual(group.width - 40)
      expect(child.relativeY + child.height).toBeLessThanOrEqual(group.height - 40)
    }

    // The box is the content plus one padding on each side, not a pixel more
    const right = Math.max(...children.map(c => c.relativeX + c.width))
    const bottom = Math.max(...children.map(c => c.relativeY + c.height))
    expect(group.width).toBe(right + 40)
    expect(group.height).toBe(bottom + 40)
  })

  test('never leaves a free node inside a group', async ({ page }) => {
    await setupGroupedFlow(page)
    await autoLayout(page)

    const nodes = await readNodes(page)
    const groups = ofType(nodes, 'group')
    expect(groups.length).toBeGreaterThan(0)

    for (const node of nodes) {
      if (node.parentNode || node.type === 'group') continue

      const centerX = node.x + node.width / 2
      const centerY = node.y + node.height / 2

      for (const group of groups) {
        const inside =
          centerX >= group.x && centerX <= group.x + group.width &&
          centerY >= group.y && centerY <= group.y + group.height

        expect(inside, `${node.id} ended up inside ${group.id}`).toBe(false)
      }
    }
  })

  test('a free node dragged after the layout is not adopted by a group', async ({ page }) => {
    await setupGroupedFlow(page)
    await autoLayout(page)

    const before = firstOfType(await readNodes(page), 'image')
    expect(before.parentNode).toBeNull()

    // Nudging a node is what triggers the membership check on drag stop
    const header = page.locator('.vue-flow__node-image .node-header')
    const box = await header.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 15, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const after = firstOfType(await readNodes(page), 'image')
    expect(after.parentNode).toBeNull()
  })
})

test.describe('Auto layout undo', () => {
  test('Ctrl+Z puts every node back where it was', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')
    await addNodeFromSidebar(page, 'Image Generator')

    await positionNodes(page, [
      { type: 'prompt', x: 940, y: 120 },
      { type: 'text-generator', x: 260, y: 620 },
      { type: 'image-generator', x: 1500, y: 320 },
    ])
    await connectNodesProgrammatic(page, [
      { sourceType: 'prompt', sourceHandle: 'output-0', targetType: 'text-generator', targetHandle: 'input-1' },
      { sourceType: 'text-generator', sourceHandle: 'output-0', targetType: 'image-generator', targetHandle: 'input-1' },
    ])

    const before = await readNodes(page)

    await autoLayout(page)
    const laidOut = await readNodes(page)
    expect(laidOut.map(n => [n.x, n.y])).not.toEqual(before.map(n => [n.x, n.y]))

    await page.keyboard.press(`${MODIFIER}+z`)
    await page.waitForTimeout(700)

    const restored = await readNodes(page)
    expect(restored.map(n => [n.id, n.x, n.y])).toEqual(before.map(n => [n.id, n.x, n.y]))
  })
})
