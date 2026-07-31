import { test, expect } from '@playwright/test'
import { FAKE_GENERATED_VIDEO, mockPVideo } from './mocks/api.js'
import {
  setupBlankCanvas,
  addNodeFromSidebar,
  connectNodes,
  positionNodes,
  uploadImageToNode,
} from './helpers/canvas.js'

/**
 * Select the video node so its toolbar shows up.
 * Clicking the prompt textarea would not select it (it stops mousedown), so the
 * click lands on the preview area at the top of the node
 */
async function selectVideoNode(page, nodeLocator) {
  const box = await nodeLocator.boundingBox()
  if (!box) throw new Error('selectVideoNode: node has no bounding box')

  await page.mouse.click(box.x + box.width / 2, box.y + 30)
  await page.locator('#model-select').waitFor({ state: 'visible', timeout: 5000 })
}

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

test.describe('Video Generator Node', () => {
  test('generates a video from a prompt (text-to-video)', async ({ page }) => {
    let received = null
    await mockPVideo(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Video Generator')

    const videoNode = page.locator('.vue-flow__node-video-generator')
    await expect(videoNode).toBeVisible()
    await expect(videoNode.locator('.video-placeholder')).toBeVisible()

    await videoNode.locator('textarea').fill('a paper plane gliding over a city')
    await videoNode.getByRole('button', { name: 'Generate Video' }).click()

    const video = videoNode.locator('.video-preview video')
    await expect(video).toBeVisible({ timeout: 15000 })
    await expect(video).toHaveAttribute('src', FAKE_GENERATED_VIDEO)

    // Default parameters travel to the API, and text-to-video does send an
    // aspect ratio (the model only ignores it when an input image is present)
    expect(received.prompt).toBe('a paper plane gliding over a city')
    expect(received.duration).toBe(5)
    expect(received.resolution).toBe('720p')
    expect(received.fps).toBe(24)
    expect(received.draft).toBe(false)
    expect(received.aspect_ratio).toBe('16:9')
    expect(received.image).toBeUndefined()
    expect(received.last_frame_image).toBeUndefined()
  })

  test('uses the connected images as first and last frame', async ({ page }) => {
    let received = null
    await mockPVideo(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Image')
    await addNodeFromSidebar(page, 'Video Generator')

    const firstFrameNode = page.locator('.vue-flow__node-image').nth(0)
    const lastFrameNode = page.locator('.vue-flow__node-image').nth(1)
    const videoNode = page.locator('.vue-flow__node-video-generator')

    await positionNodes(page, [
      { type: 'image', x: 60, y: 60, nth: 0 },
      { type: 'image', x: 60, y: 420, nth: 1 },
      { type: 'video-generator', x: 620, y: 200 },
    ])

    await uploadImageToNode(page, firstFrameNode)
    await uploadImageToNode(page, lastFrameNode)

    // Wire only the last frame reference first (input-0), so the payload proves
    // which handle feeds which field
    await connectNodes(page, lastFrameNode, 'output-0', videoNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await expect(videoNode.locator('.frame-caption').filter({ hasText: 'Last' })).toBeVisible()
    await expect(videoNode.locator('.frame-caption').filter({ hasText: 'First' })).toHaveCount(0)

    await videoNode.locator('textarea').fill('the camera pushes in slowly')
    await videoNode.getByRole('button', { name: 'Generate Video' }).click()
    await expect(videoNode.locator('.video-preview video')).toBeVisible({ timeout: 15000 })

    expect(received.last_frame_image).toMatch(/^data:image\//)
    expect(received.image).toBeUndefined()

    // Now add the first frame (input-1): image-to-video
    await connectNodes(page, firstFrameNode, 'output-0', videoNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(2, { timeout: 5000 })

    await expect(videoNode.locator('.frame-caption').filter({ hasText: 'First' })).toBeVisible()

    received = null
    await videoNode.getByRole('button', { name: 'Generate Video' }).click()
    await expect.poll(() => received !== null, { timeout: 15000 }).toBe(true)

    expect(received.image).toMatch(/^data:image\//)
    expect(received.last_frame_image).toMatch(/^data:image\//)
    // Ignored by the model when an input image is given, so it is not sent
    expect(received.aspect_ratio).toBeUndefined()
  })

  test('toolbar options reach the API', async ({ page }) => {
    let received = null
    await mockPVideo(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Video Generator')

    const videoNode = page.locator('.vue-flow__node-video-generator')
    await positionNodes(page, [{ type: 'video-generator', x: 400, y: 320 }])

    await selectVideoNode(page, videoNode)

    await page.locator('#control-duration').fill('8')
    await page.locator('#control-aspect_ratio').selectOption('9:16')
    await page.locator('#control-resolution').selectOption('1080p')
    await page.locator('#control-fps').selectOption('48')
    await page.locator('#control-draft').check()

    // Click away to dismiss the toolbar before using the node body
    await page.mouse.click(10, 10)

    await videoNode.locator('textarea').fill('a vertical clip of falling confetti')
    await videoNode.getByRole('button', { name: 'Generate Video' }).click()

    await expect(videoNode.locator('.video-preview video')).toBeVisible({ timeout: 15000 })

    expect(received.duration).toBe(8)
    expect(received.aspect_ratio).toBe('9:16')
    expect(received.resolution).toBe('1080p')
    // Selects hand back strings; fps must stay numeric for the API
    expect(received.fps).toBe(48)
    expect(received.draft).toBe(true)
  })

  test('uses a connected prompt node', async ({ page }) => {
    let received = null
    await mockPVideo(page, { assertRequest: (body) => { received = body.input } })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Video Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const videoNode = page.locator('.vue-flow__node-video-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 60, y: 200 },
      { type: 'video-generator', x: 620, y: 200 },
    ])

    await promptNode.locator('textarea').fill('a neon sign flickering in the rain')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    // input-2 is the prompt port
    await connectNodes(page, promptNode, 'output-0', videoNode, 'input-2')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    // The local textarea gives way to the connected prompt
    await expect(videoNode.locator('.prompt-preview')).toContainText('a neon sign flickering')
    await expect(videoNode.locator('textarea')).toHaveCount(0)

    await videoNode.getByRole('button', { name: 'Generate Video' }).click()

    await expect(videoNode.locator('.video-preview video')).toBeVisible({ timeout: 15000 })
    expect(received.prompt).toBe('a neon sign flickering in the rain')
  })

  test('the video output cannot be wired into an image input', async ({ page }) => {
    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Video Generator')
    await addNodeFromSidebar(page, 'Image Generator')

    const videoNode = page.locator('.vue-flow__node-video-generator')
    const imageGenNode = page.locator('.vue-flow__node-image-generator')

    await positionNodes(page, [
      { type: 'video-generator', x: 60, y: 200 },
      { type: 'image-generator', x: 640, y: 200 },
    ])

    // video → image is rejected by the port type validation
    await connectNodes(page, videoNode, 'output-0', imageGenNode, 'input-0')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(0)

    // ...and so is video → prompt
    await connectNodes(page, videoNode, 'output-0', imageGenNode, 'input-1')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(0)
  })

  test('inlines a remote video so the flow can be saved', async ({ page }) => {
    const remoteUrl = 'https://replicate.delivery/fake/output.mp4'

    await mockPVideo(page, { response: remoteUrl })
    await page.route(remoteUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body: Buffer.from('fake-mp4-bytes'),
      })
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Video Generator')

    const videoNode = page.locator('.vue-flow__node-video-generator')
    await videoNode.locator('textarea').fill('a wave breaking in slow motion')
    await videoNode.getByRole('button', { name: 'Generate Video' }).click()

    const video = videoNode.locator('.video-preview video')
    await expect(video).toBeVisible({ timeout: 15000 })

    // Replicate URLs expire, so the node stores the bytes instead of the link
    const src = await video.getAttribute('src')
    expect(src.startsWith('data:video/mp4;base64,')).toBe(true)
  })

  test('can be marked as a batch output', async ({ page }) => {
    const receivedPrompts = []
    await mockPVideo(page, {
      assertRequest: (body) => receivedPrompts.push(body.input.prompt),
    })

    await setupBlankCanvas(page)
    await addNodeFromSidebar(page, 'Prompt')
    await addNodeFromSidebar(page, 'Video Generator')

    const promptNode = page.locator('.vue-flow__node-prompt')
    const videoNode = page.locator('.vue-flow__node-video-generator')

    await positionNodes(page, [
      { type: 'prompt', x: 60, y: 200 },
      { type: 'video-generator', x: 620, y: 200 },
    ])

    await promptNode.locator('textarea').fill('a placeholder prompt')
    await promptNode.locator('textarea').blur()
    await page.waitForTimeout(200)

    await connectNodes(page, promptNode, 'output-0', videoNode, 'input-2')
    await expect(page.locator('.vue-flow__edge')).toHaveCount(1, { timeout: 5000 })

    await markBatchRole(page, promptNode, 'Mark as batch input')
    await markBatchRole(page, videoNode, 'Mark as batch output')

    await expect(promptNode.locator('.batch-badge-input')).toHaveText('IN')
    await expect(videoNode.locator('.batch-badge-output')).toHaveText('OUT')

    await page.locator('button[title="Batch Run"]').click()
    const modal = page.locator('.batch-content')
    await expect(modal).toBeVisible()

    await modal.locator('#run-count').fill('2')
    const rows = modal.locator('.batch-table tbody tr')
    await expect(rows).toHaveCount(2)

    await rows.nth(0).locator('.col-input textarea').fill('a kite over the sea')
    await rows.nth(1).locator('.col-input textarea').fill('a train crossing a bridge')

    await modal.getByRole('button', { name: 'Run batch' }).click()

    await expect(rows.nth(0).locator('.status-done')).toBeVisible({ timeout: 30000 })
    await expect(rows.nth(1).locator('.status-done')).toBeVisible({ timeout: 30000 })

    expect(receivedPrompts).toEqual(['a kite over the sea', 'a train crossing a bridge'])

    // Each row holds its generated video, previewable at full size
    await expect(rows.nth(0).locator('.col-output video')).toHaveAttribute('src', FAKE_GENERATED_VIDEO)
    await expect(rows.nth(1).locator('.col-output video')).toHaveAttribute('src', FAKE_GENERATED_VIDEO)

    await rows.nth(0).locator('.col-output video').click()
    await expect(page.locator('.preview-modal video')).toBeVisible()
  })
})
