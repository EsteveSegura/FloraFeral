import { test, expect } from '@playwright/test'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  positionNodes,
  renameNode,
} from './helpers/canvas.js'

/**
 * Read a node's persisted label straight from the store (works with the header
 * hidden, where there is nothing to assert against in the DOM).
 */
async function readLabels(page, type) {
  return page.evaluate((nodeType) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    return flowStore.nodes.filter(n => n.type === nodeType).map(n => n.data?.label)
  }, type)
}

test.describe('Node rename', () => {
  test('double-click on the header renames a node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await expect(promptNode.locator('.node-label')).toHaveText('New Prompt')

    await renameNode(page, promptNode, 'Character sheet')
    await expect(promptNode.locator('.node-label')).toHaveText('Character sheet')

    // The context menu title reads the same data
    await promptNode.click({ button: 'right' })
    await expect(page.locator('.node-context-menu .header')).toHaveText('Character sheet')
  })

  test('Escape reverts the rename', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await promptNode.locator('.node-label').dblclick()

    const input = promptNode.locator('.node-label-input')
    await input.fill('discard me')
    await input.press('Escape')

    await expect(input).toBeHidden()
    await expect(promptNode.locator('.node-label')).toHaveText('New Prompt')
  })

  test('an empty name keeps the previous one', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await promptNode.locator('.node-label').dblclick()

    const input = promptNode.locator('.node-label-input')
    await input.fill('   ')
    await input.blur()

    await expect(promptNode.locator('.node-label')).toHaveText('New Prompt')
  })

  test('editing the title neither deletes nor copies the node', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await promptNode.locator('.node-label').dblclick()

    const input = promptNode.locator('.node-label-input')
    await input.fill('AB')

    // The canvas deletes selected nodes on Backspace/Delete and pastes on Ctrl+V
    await input.press('Backspace')
    await input.press('Delete')
    await input.press('Control+c')
    await input.press('Control+v')
    await expect(page.locator('.vue-flow__node-prompt')).toHaveCount(1)

    await input.press('Enter')
    await expect(promptNode.locator('.node-label')).toHaveText('A')
  })

  test('a repeated name gets a number', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [
      { type: 'prompt', x: 120, y: 80 },
      { type: 'prompt', x: 120, y: 320 },
      { type: 'prompt', x: 120, y: 560 },
    ])

    const promptNodes = page.locator('.vue-flow__node-prompt')
    await renameNode(page, promptNodes.nth(0), 'Scene')
    await renameNode(page, promptNodes.nth(1), 'Scene')
    await renameNode(page, promptNodes.nth(2), 'Scene')

    await expect(promptNodes.nth(0).locator('.node-label')).toHaveText('Scene')
    await expect(promptNodes.nth(1).locator('.node-label')).toHaveText('Scene 2')
    await expect(promptNodes.nth(2).locator('.node-label')).toHaveText('Scene 3')
  })

  test('two nodes of the same type get different names on creation', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt')

    expect(await readLabels(page, 'prompt')).toEqual(['New Prompt', 'New Prompt 2'])
  })

  test('the new name survives export/import', async ({ page }) => {
    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await renameNode(page, promptNode, 'Character sheet')

    const exported = await page.evaluate(async () => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const flowStore = pinia._s.get('flow')
      const { exportFlow } = await import('/src/lib/flow-io.js')
      return exportFlow(flowStore)
    })

    expect(exported.nodes.find(n => n.type === 'prompt').data.label).toBe('Character sheet')

    await page.evaluate(async (flowData) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const flowStore = pinia._s.get('flow')
      const { importFlow } = await import('/src/lib/flow-io.js')
      flowStore.nodes.splice(0, flowStore.nodes.length)
      await importFlow(flowData, flowStore)
    }, exported)

    await expect(page.locator('.vue-flow__node-prompt .node-label')).toHaveText('Character sheet')
  })

  test('renaming from the context menu works with headers hidden', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await positionNodes(page, [{ type: 'prompt', x: 240, y: 200 }])

    const promptNode = page.locator('.vue-flow__node-prompt')
    await expect(promptNode.locator('.node-label')).toBeHidden()

    await promptNode.click({ button: 'right' })
    const menu = page.locator('.node-context-menu')
    await menu.waitFor({ state: 'visible', timeout: 3000 })
    await menu.locator('.menu-text').filter({ hasText: 'Rename' }).click()

    const dialog = page.locator('#node-name')
    await dialog.waitFor({ state: 'visible', timeout: 3000 })
    await dialog.fill('Renamed from menu')
    await dialog.press('Enter')

    expect(await readLabels(page, 'prompt')).toEqual(['Renamed from menu'])
  })
})
