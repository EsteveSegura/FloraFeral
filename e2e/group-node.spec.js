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
 * Absolute position, parent id and size of every non-group node, keyed by the
 * order they were added to the canvas.
 */
async function readNodes(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const group = flowStore.nodes.find(n => n.type === 'group')

    return flowStore.nodes
      .filter(n => n.type !== 'group')
      .map(n => ({
        id: n.id,
        parentNode: n.parentNode ?? null,
        x: n.parentNode === group?.id ? group.position.x + n.position.x : n.position.x,
        y: n.parentNode === group?.id ? group.position.y + n.position.y : n.position.y,
        height: n.dimensions?.height,
      }))
  })
}

async function readGroup(page) {
  return page.evaluate(() => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const group = pinia._s.get('flow').nodes.find(n => n.type === 'group')
    if (!group) return null
    return {
      x: group.position.x,
      y: group.position.y,
      width: group.dimensions?.width || parseInt(group.style?.width),
      height: group.dimensions?.height || parseInt(group.style?.height),
    }
  })
}

/**
 * Drop two prompt nodes on the canvas and wrap them in a group with Ctrl/Cmd+G.
 */
async function createGroupWithTwoNodes(page) {
  await setupBlankCanvas(page, { showNodeHeaders: true })
  await addNodeFromSidebar(page, 'Prompt')
  await addNodeFromSidebar(page, 'Prompt')
  await positionNodes(page, [
    { type: 'prompt', nth: 0, x: 300, y: 200 },
    { type: 'prompt', nth: 1, x: 300, y: 420 },
  ])

  const nodes = page.locator('.vue-flow__node-prompt')
  await nodes.nth(0).locator('.node-header').click()
  await nodes.nth(1).locator('.node-header').click({ modifiers: [MULTI_SELECT_KEY] })
  await page.keyboard.press(`${MULTI_SELECT_KEY}+g`)
  await page.waitForTimeout(300)

  await expect(page.locator('.vue-flow__node-group')).toHaveCount(1)
}

/**
 * Drag one of the group resize handles by the given screen offset.
 * The group has to be selected for its handles to be rendered.
 */
async function dragResizeHandle(page, corner, deltaX, deltaY) {
  const group = page.locator('.vue-flow__node-group')
  // The label swallows its own clicks, so the group is selected through the
  // padding band that surrounds its children
  const groupBox = await group.boundingBox()
  await page.mouse.click(groupBox.x + groupBox.width - 10, groupBox.y + 10)
  await page.waitForTimeout(200)

  const handle = page.locator(`.vue-flow__resize-control.${corner.join('.')}.handle`)
  const box = await handle.boundingBox()
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + deltaX, from.y + deltaY, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

test.describe('Group resizing', () => {
  test('keeps the children in place when resizing from the top left handle', async ({ page }) => {
    await createGroupWithTwoNodes(page)

    const before = await readNodes(page)
    const groupBefore = await readGroup(page)

    await dragResizeHandle(page, ['top', 'left'], -120, -80)

    const after = await readNodes(page)
    const groupAfter = await readGroup(page)

    // The group grew towards the top left, so its origin moved
    expect(groupAfter.x).toBeLessThan(groupBefore.x)
    expect(groupAfter.y).toBeLessThan(groupBefore.y)
    expect(groupAfter.width).toBeGreaterThan(groupBefore.width)

    // ...and the nodes it contains did not move an inch
    for (const [index, node] of after.entries()) {
      expect(node.parentNode).toBe(before[index].parentNode)
      expect(Math.abs(node.x - before[index].x)).toBeLessThanOrEqual(1)
      expect(Math.abs(node.y - before[index].y)).toBeLessThanOrEqual(1)
    }
  })

  test('releases the nodes left outside after shrinking the group', async ({ page }) => {
    await createGroupWithTwoNodes(page)

    const before = await readNodes(page)
    const groupBefore = await readGroup(page)
    expect(before.every(n => n.parentNode)).toBe(true)

    // Pull the bottom edge up until it sits above the lower node's center
    const targetBottom = before[1].y + before[1].height / 2 - 10
    await dragResizeHandle(page, ['bottom', 'right'], 0, targetBottom - (groupBefore.y + groupBefore.height))

    const after = await readNodes(page)
    expect(after[0].parentNode).toBe(before[0].parentNode)
    expect(after[1].parentNode).toBeNull()

    // Releasing a node must not teleport it
    expect(Math.abs(after[1].x - before[1].x)).toBeLessThanOrEqual(1)
    expect(Math.abs(after[1].y - before[1].y)).toBeLessThanOrEqual(1)
  })

  test('adopts the nodes the group is enlarged over', async ({ page }) => {
    await createGroupWithTwoNodes(page)

    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', nth: 2, x: 300, y: 640 }])

    const before = await readNodes(page)
    expect(before[2].parentNode).toBeNull()

    // Push the bottom edge down until the third node is covered
    await dragResizeHandle(page, ['bottom', 'right'], 0, 400)

    const after = await readNodes(page)
    expect(after[2].parentNode).toBe(after[0].parentNode)
    expect(Math.abs(after[2].x - before[2].x)).toBeLessThanOrEqual(1)
    expect(Math.abs(after[2].y - before[2].y)).toBeLessThanOrEqual(1)
  })
})
