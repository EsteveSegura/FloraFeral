import { test, expect } from '@playwright/test'
import { setupBlankCanvas, addNodeFromSidebar } from './helpers/canvas.js'

test.describe('Comment Node', () => {
  test('allows editing text', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Comment')

    const commentNode = page.locator('.vue-flow__node-comment')
    await expect(commentNode).toBeVisible()

    // Default placeholder text visible in view mode
    await expect(commentNode.locator('.comment-text')).toHaveText('Double-click to add a comment...')

    // Click to select the node — textarea should appear
    await commentNode.click()
    const textarea = commentNode.locator('.comment-textarea')
    await expect(textarea).toBeVisible({ timeout: 3000 })

    // Type a comment
    await textarea.fill('This is a test annotation')

    // Click away to deselect — should show view mode
    await page.mouse.click(10, 10)
    await page.waitForTimeout(300)

    await expect(commentNode.locator('.comment-text')).toHaveText('This is a test annotation')
  })
})
