import { test, expect } from '@playwright/test'
import { TEXT_GENERATION_RESPONSE, mockGpt5 } from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
} from './helpers/canvas.js'

test.describe('Prompt Nodes', () => {
  test('Prompt node passes text to TextGenerator', async ({ page }) => {
    await mockGpt5(page, {
      assertRequest: (body) => {
        expect(body.input.prompt).toBe('a cute cat')
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Text Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const textGenNode = page.locator('.vue-flow__node-text-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'text-generator', x: 600, y: 200 },
    ])

    // Type prompt text
    await promptNode.locator('textarea').fill('a cute cat')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // Connect Prompt(output-0) → TextGenerator(input-1:prompt)
    await connectNodes(page, promptNode, 'output-0', textGenNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Verify connected prompt shows in TextGenerator
    await expect(textGenNode.locator('.prompt-preview')).toContainText('a cute cat')

    // Generate text
    await textGenNode.getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNode.locator('.text-output')).toBeVisible({ timeout: 15000 })
    await expect(textGenNode.locator('.text-output')).toHaveText(TEXT_GENERATION_RESPONSE)
  })

  test('Prompt → PromptTemplate replaces variables', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'prompt-template', x: 600, y: 200 },
    ])

    // Type template text in prompt node
    await promptNode.locator('textarea').fill('A {{STYLE}} painting of a {{SUBJECT}}')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // Connect Prompt → PromptTemplate
    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Verify variables detected
    const variablesList = templateNode.locator('.variables-list')
    await expect(variablesList).toBeVisible({ timeout: 5000 })
    await expect(templateNode.locator('.variable-item')).toHaveCount(2)

    // Fill variables
    const variableInputs = templateNode.locator('.variable-item input')
    await variableInputs.nth(0).fill('watercolor')
    await variableInputs.nth(0).blur()
    await variableInputs.nth(1).fill('mountain')
    await variableInputs.nth(1).blur()
    await page.waitForTimeout(300)
  })

  test('Prompt → PromptTemplate → TextGenerator chain', async ({ page }) => {
    await mockGpt5(page, {
      assertRequest: (body) => {
        expect(body.input.prompt).toContain('watercolor')
        expect(body.input.prompt).toContain('sunset')
      },
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Prompt Template')
    await addNodeFromSidebar(page, 'Text Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const templateNode = page.locator('.vue-flow__node-prompt-template')
    const textGenNode = page.locator('.vue-flow__node-text-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 100, y: 200 },
      { type: 'prompt-template', x: 550, y: 200 },
      { type: 'text-generator', x: 1000, y: 200 },
    ])

    // Type template
    await promptNode.locator('textarea').fill('A {{STYLE}} painting of a {{SUBJECT}}')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // Connect Prompt → PromptTemplate
    await connectNodes(page, promptNode, 'output-0', templateNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // Fill variables
    await expect(templateNode.locator('.variables-list')).toBeVisible({ timeout: 5000 })
    const variableInputs = templateNode.locator('.variable-item input')
    await variableInputs.nth(0).fill('watercolor')
    await variableInputs.nth(0).blur()
    await variableInputs.nth(1).fill('sunset')
    await variableInputs.nth(1).blur()
    await page.waitForTimeout(300)

    // Connect PromptTemplate → TextGenerator
    await connectNodes(page, templateNode, 'output-0', textGenNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    // Generate text
    await textGenNode.getByRole('button', { name: 'Generate Text' }).click()
    await expect(textGenNode.locator('.text-output')).toBeVisible({ timeout: 15000 })
    await expect(textGenNode.locator('.text-output')).toHaveText(TEXT_GENERATION_RESPONSE)
  })
})
