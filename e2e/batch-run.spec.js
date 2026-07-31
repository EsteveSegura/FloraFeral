import { test, expect } from '@playwright/test'
import { FAKE_GENERATED_IMAGE, mockNanaBananaPro } from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
  renameNode,
  TEST_IMAGE_PATH,
} from './helpers/canvas.js'

/**
 * Mark a node with a batch role through its right-click context menu.
 */
async function markBatchRole(page, nodeLocator, optionLabel) {
  await nodeLocator.click({ button: 'right' })
  const menu = page.locator('.node-context-menu')
  await menu.waitFor({ state: 'visible', timeout: 3000 })
  await menu.locator('.menu-text').filter({ hasText: optionLabel }).click()
  await expect(menu).toBeHidden()
}

test.describe('Batch Run', () => {
  test('runs a Prompt → PromptTemplate → ImageGenerator flow 2 times', async ({ page }) => {
    const receivedPrompts = []
    await mockNanaBananaPro(page, {
      assertRequest: (body) => {
        receivedPrompts.push(body.input.prompt)
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'prompt-template', x: 560, y: 60 },
      { type: 'image-generator', x: 900, y: 60 },
    ])

    // Template lives in the Prompt node and is filled in by the Template node
    await promptNode.locator('textarea').fill('A {{ANIMAL}} in the snow')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // Mark batch roles from the node context menu
    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    // Badges reflect the marks
    await expect(templateNode.locator('.batch-badge-input')).toHaveText('IN')
    await expect(generatorNode.locator('.batch-badge-output')).toHaveText('OUT')

    // Open the batch panel
    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await expect(modal).toBeVisible()

    // Two runs with different values for {{ANIMAL}}
    await modal.locator('#run-count').fill('2')
    await expect(modal.locator('.batch-table tbody tr')).toHaveCount(2)

    const rows = modal.locator('.batch-table tbody tr')
    await rows.nth(0).locator('.col-input input').fill('fox')
    await rows.nth(1).locator('.col-input input').fill('bear')

    await modal.getByRole('button', { name: 'Run batch' }).click()

    // Both runs finish successfully
    await expect(rows.nth(0).locator('.status-done')).toBeVisible({ timeout: 30000 })
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 30000 })

    // Each run substituted its own variable value
    expect(receivedPrompts).toEqual(['A fox in the snow', 'A bear in the snow'])

    // Each row holds its generated image
    await expect(rows.nth(0).locator('.col-output img')).toHaveAttribute('src', FAKE_GENERATED_IMAGE)
    await expect(rows.nth(1).locator('.col-output img')).toHaveAttribute('src', FAKE_GENERATED_IMAGE)

    // The canvas is restored to its pre-batch state
    await expect(templateNode.locator('input')).toHaveValue('')
  })

  test('Prompt and PromptTemplate both marked as input', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 20, y: 40 },
      { type: 'prompt-template', x: 540, y: 40 },
      { type: 'image-generator', x: 950, y: 40 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} here')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(300)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // A value already set on the canvas must not leak into the runs
    await templateNode.locator('input').fill('CANVASVALUE')
    await templateNode.locator('input').blur()
    await page.waitForTimeout(300)

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('2')

    const rows = modal.locator('.batch-table tbody tr')
    await rows.nth(0).locator('textarea').fill('B {{ANIMAL}} here')
    await rows.nth(0).locator('.col-input input').fill('fox')
    await rows.nth(1).locator('textarea').fill('C {{ANIMAL}} here')
    await rows.nth(1).locator('.col-input input').fill('bear')

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 40000 })

    expect(received).toEqual(['B fox here', 'C bear here'])
  })

  test('a row can introduce a new template variable', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 20, y: 40 },
      { type: 'prompt-template', x: 540, y: 40 },
      { type: 'image-generator', x: 950, y: 40 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} here')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(300)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('1')

    const row = modal.locator('.batch-table tbody tr').first()
    await expect(row.locator('.col-input input')).toHaveCount(1)

    // Typing a template with a new variable adds its column
    await row.locator('textarea').fill('A {{ANIMAL}} in {{PLACE}}')
    await expect(row.locator('.col-input input')).toHaveCount(2)

    await row.locator('.col-input input').nth(0).fill('fox')
    await row.locator('.col-input input').nth(1).fill('Paris')

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(row.locator('.status-done')).toBeVisible({ timeout: 40000 })

    expect(received).toEqual(['A fox in Paris'])
  })

  test('retrying a row re-runs only that row', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await connectNodes(page, promptNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('3')

    const rows = modal.locator('.batch-table tbody tr')
    await rows.nth(0).locator('textarea').fill('one')
    await rows.nth(1).locator('textarea').fill('two')
    await rows.nth(2).locator('textarea').fill('three')

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(rows.nth(2).locator('.status-done')).toBeVisible({ timeout: 40000 })
    expect(received).toEqual(['one', 'two', 'three'])

    // Change row 2 and retry just that one
    received.length = 0
    await rows.nth(1).locator('textarea').fill('two-fixed')
    await rows.nth(1).getByRole('button', { name: 'Retry' }).click()
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 40000 })

    expect(received).toEqual(['two-fixed'])

    // The other rows kept their results
    await expect(rows.nth(0).locator('.status-done')).toBeVisible()
    await expect(rows.nth(2).locator('.status-done')).toBeVisible()
    await expect(rows.nth(0).locator('.col-output img')).toBeVisible()
    await expect(rows.nth(2).locator('.col-output img')).toBeVisible()
  })

  test('a single row can be run without running the batch', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await connectNodes(page, promptNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('3')

    const rows = modal.locator('.batch-table tbody tr')
    await rows.nth(1).locator('textarea').fill('only me')

    // Pending rows offer "Run" instead of "Retry"
    await rows.nth(1).getByRole('button', { name: 'Run' }).click()
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 40000 })

    expect(received).toEqual(['only me'])
    await expect(rows.nth(0).locator('.status-pending')).toBeVisible()
    await expect(rows.nth(2).locator('.status-pending')).toBeVisible()
  })

  test('batch marks survive export/import', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    // Export, wipe the canvas, import back
    const exported = await page.evaluate(async () => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const flowStore = pinia._s.get('flow')
      const { exportFlow } = await import('/src/lib/flow-io.js')
      return exportFlow(flowStore)
    })

    expect(exported.nodes.find(n => n.type === 'prompt').data.batchRole).toBe('input')
    expect(exported.nodes.find(n => n.type === 'image-generator').data.batchRole).toBe('output')

    await page.evaluate(async (flowData) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      const flowStore = pinia._s.get('flow')
      const { importFlow } = await import('/src/lib/flow-io.js')
      flowStore.nodes.splice(0, flowStore.nodes.length)
      await importFlow(flowData, flowStore)
    }, exported)

    // Badges are rendered again from the persisted data
    await expect(page.locator('.vue-flow__node-prompt .batch-badge-input')).toHaveText('IN')
    await expect(page.locator('.vue-flow__node-image-generator .batch-badge-output')).toHaveText('OUT')
  })

  test('uses a per-run uploaded image as batch input', async ({ page }) => {
    const receivedImageCounts = []
    await mockNanaBananaPro(page, {
      assertRequest: (body) => {
        const images = body.input.image_input || body.input.image || []
        receivedImageCounts.push(Array.isArray(images) ? images.length : 1)
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')

    const imageNode = page.locator('.vue-flow__node-image')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'image', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await connectNodes(page, imageNode, 'output-0', generatorNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // The generator needs a prompt of its own since none is connected
    await generatorNode.locator('textarea').fill('restyle this photo')
    await generatorNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await markBatchRole(page, imageNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('1')

    const row = modal.locator('.batch-table tbody tr').first()
    await row.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH)
    await expect(row.locator('.col-input img')).toBeVisible()

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(row.locator('.status-done')).toBeVisible({ timeout: 30000 })

    // The uploaded image reached the model
    expect(receivedImageCounts).toEqual([1])
  })

  test('blocks running without a batch output', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')

    const promptNode = page.locator('.vue-flow__node-prompt')
    await positionNodes(page, [{ type: 'prompt', x: 100, y: 200 }])
    await markBatchRole(page, promptNode, 'Mark as batch input')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')

    await expect(modal.locator('.batch-warning')).toContainText('Mark at least one node as batch output')
    await expect(modal.getByRole('button', { name: 'Run batch' })).toBeDisabled()
  })

  test('closing the panel flushes its contents', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await connectNodes(page, promptNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('2')
    await modal.locator('.batch-table tbody tr').first().locator('textarea').fill('typed value')

    await page.locator('.flora-modal-close').click()
    await expect(modal).toBeHidden()

    const runsAfterClose = await page.evaluate(() => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      return pinia._s.get('batch').runs.length
    })
    expect(runsAfterClose).toBe(0)

    // Reopening starts clean, reseeded from the canvas
    await page.locator('button[title="Batch Run"]').click()
    await expect(modal.locator('.batch-table tbody tr').first().locator('textarea')).toHaveValue('')
  })

  test('warns when a marked input cannot reach any output', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 20, y: 40 },
      { type: 'prompt-template', x: 540, y: 40 },
      { type: 'image-generator', x: 950, y: 40 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} here')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // The template is a dead end: the generator is fed straight from the prompt
    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, promptNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    await expect(page.locator('.batch-warning--soft')).toContainText('has no effect')
  })

  test('blocks running when a prompt drops a required variable', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 40, y: 60 },
      { type: 'prompt-template', x: 560, y: 60 },
      { type: 'image-generator', x: 900, y: 60 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} in the snow')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')

    // Removing {{ANIMAL}} breaks the downstream template
    await modal.locator('.batch-table tbody tr').first().locator('textarea').fill('A cat in the snow')

    await expect(modal.locator('.cell-error').first()).toContainText('Missing')
    await expect(modal.getByRole('button', { name: 'Run batch' })).toBeDisabled()
  })
})

test.describe('Batch Run CSV', () => {
  test('downloads a CSV template and imports it back with more rows', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 20, y: 40 },
      { type: 'prompt-template', x: 540, y: 40 },
      { type: 'image-generator', x: 950, y: 40 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} here')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(300)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await modal.locator('#run-count').fill('2')

    // Download the template
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      modal.getByRole('button', { name: 'Download CSV' }).click(),
    ])
    const csvPath = await download.path()
    const csvText = await (await import('fs/promises')).readFile(csvPath, 'utf8')
    expect(csvText).toContain('ANIMAL')

    // Feed back a CSV with 4 rows instead of the 2 downloaded
    const header = csvText.split(/\r?\n/)[0]
    const refilled = [header, '1,fox', '2,bear', '3,wolf', '4,deer'].join('\r\n')

    await modal.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'filled.csv', mimeType: 'text/csv', buffer: Buffer.from(refilled, 'utf8'),
    })

    const rows = modal.locator('.batch-table tbody tr')
    await expect(rows).toHaveCount(4)
    await expect(modal.locator('.csv-message')).toContainText('Imported 4 rows')

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(rows.nth(3).locator('.status-done')).toBeVisible({ timeout: 60000 })

    expect(received).toEqual(['A fox here', 'A bear here', 'A wolf here', 'A deer here'])
  })

  test('CSV image filenames block their row until uploaded', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image Generator')

    const imageNode = page.locator('.vue-flow__node-image')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'image', x: 40, y: 60 },
      { type: 'image-generator', x: 700, y: 60 },
    ])

    await connectNodes(page, imageNode, 'output-0', generatorNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await generatorNode.locator('textarea').fill('restyle it')
    await generatorNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await markBatchRole(page, imageNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      modal.getByRole('button', { name: 'Download CSV' }).click(),
    ])
    const csvText = await (await import('fs/promises')).readFile(await download.path(), 'utf8')
    const header = csvText.split(/\r?\n/)[0]

    // Two rows referencing image files that have not been uploaded
    const filled = [header, '1,shot-a.png', '2,shot-b.png'].join('\r\n')
    await modal.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'filled.csv', mimeType: 'text/csv', buffer: Buffer.from(filled, 'utf8'),
    })

    const rows = modal.locator('.batch-table tbody tr')
    await expect(rows).toHaveCount(2)

    // Both files are listed as missing and the rows cannot run
    await expect(modal.locator('.image-inbox-count')).toContainText('2 missing')
    await expect(rows.nth(0).getByRole('button', { name: 'Run' })).toBeDisabled()

    // Upload only the first one, matched by filename
    await modal.locator('.image-dropzone input[type="file"]').setInputFiles({
      name: 'shot-a.png', mimeType: 'image/png', buffer: await readTestImage(),
    })

    await expect(modal.locator('.image-inbox-count')).toContainText('1 missing')
    await expect(rows.nth(0).locator('.col-input img')).toBeVisible()
    await expect(rows.nth(0).getByRole('button', { name: 'Run' })).toBeEnabled()
    await expect(rows.nth(1).getByRole('button', { name: 'Run' })).toBeDisabled()

    // Running the batch does the complete row and flags the incomplete one
    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(rows.nth(0).locator('.status-done')).toBeVisible({ timeout: 40000 })
    await expect(rows.nth(1).locator('.status-error')).toBeVisible()
    await expect(rows.nth(1)).toContainText('Missing image: shot-b.png')

    expect(received).toHaveLength(1)
  })

  test('renamed nodes name the modal columns and the CSV headers', async ({ page }) => {
    const received = []
    await mockNanaBananaPro(page, { assertRequest: (b) => received.push(b.input.prompt) })

    await setupBlankCanvas(page, { showNodeHeaders: true })
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Image Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const generatorNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 20, y: 40 },
      { type: 'prompt-template', x: 540, y: 40 },
      { type: 'image-generator', x: 950, y: 40 },
    ])

    await promptNode.locator('textarea').fill('A {{ANIMAL}} here')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(300)

    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await connectNodes(page, templateNode, 'output-0', generatorNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await renameNode(page, templateNode, 'Scene')
    await renameNode(page, generatorNode, 'Render')

    await markBatchRole(page, templateNode, 'Mark as batch input')
    await markBatchRole(page, generatorNode, 'Mark as batch output')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')

    // The table header and the legend are built from the node names
    await expect(modal.locator('th.col-input')).toHaveText('Scene · ANIMAL')
    await expect(modal.locator('th.col-output')).toHaveText('Render')
    await expect(modal.locator('.batch-legend')).toContainText('Inputs: Scene')
    await expect(modal.locator('.batch-legend')).toContainText('Outputs: Render')

    await modal.locator('#run-count').fill('2')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      modal.getByRole('button', { name: 'Download CSV' }).click(),
    ])
    const csvText = await (await import('fs/promises')).readFile(await download.path(), 'utf8')
    expect(csvText).toContain('Scene · ANIMAL')
    expect(csvText).not.toContain('New Prompt Template')

    // The renamed header still maps back on import
    const header = csvText.split(/\r?\n/)[0]
    await modal.locator('input[type="file"][accept*="csv"]').setInputFiles({
      name: 'filled.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from([header, '1,fox', '2,bear'].join('\r\n'), 'utf8'),
    })

    const rows = modal.locator('.batch-table tbody tr')
    await expect(rows).toHaveCount(2)
    await expect(modal.locator('.csv-message')).toContainText('Imported 2 rows')

    await modal.getByRole('button', { name: 'Run batch' }).click()
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 60000 })

    expect(received).toEqual(['A fox here', 'A bear here'])
  })
})

async function readTestImage() {
  const fs = await import('fs/promises')
  return fs.readFile(TEST_IMAGE_PATH)
}
