import path from 'path'

// Path to the real test image asset
export const TEST_IMAGE_PATH = path.resolve(import.meta.dirname, '../assets/background-xp.png')

/**
 * Set a fake API key in localStorage and navigate to a blank canvas.
 */
export async function setupBlankCanvas(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'flora-settings',
      JSON.stringify({ replicateApiKey: 'test-api-key-fake', openaiApiKey: 'test-openai-key-fake' })
    )
  })
  await page.goto('/')
  await page.getByText('Blank canvas').click()
}

/**
 * Add a node from the sidebar by exact name match.
 */
export async function addNodeFromSidebar(page, nodeName) {
  const menu = page.locator('.nodes-menu')
  const isOpen = await menu.isVisible().catch(() => false)
  if (!isOpen) {
    await page.locator('button[title="Add nodes"]').click()
    await menu.waitFor({ state: 'visible', timeout: 3000 })
  }
  await page.locator('.nodes-menu .node-item .node-text').filter({ hasText: new RegExp(`^${nodeName}$`) }).click()
  // Wait for the 100ms setTimeout in onNodeItemClick to close the menu
  await page.waitForTimeout(200)
}

/**
 * Get the center coordinates of a Vue Flow handle.
 */
export async function getHandleCenter(nodeLocator, handleId) {
  const handle = nodeLocator.locator(`.vue-flow__handle[data-handleid="${handleId}"]`)
  const box = await handle.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Connect two nodes by dragging from a source handle to a target handle.
 */
export async function connectNodes(page, sourceNode, sourceHandle, targetNode, targetHandle) {
  const from = await getHandleCenter(sourceNode, sourceHandle)
  const to = await getHandleCenter(targetNode, targetHandle)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 5 })
  await page.mouse.up()
}

/**
 * Upload an image file to an Image node via the file chooser.
 */
export async function uploadImageToNode(page, nodeLocator, filePath = TEST_IMAGE_PATH) {
  const uploadBtn = nodeLocator.getByRole('button', { name: 'Upload Image' })
  await uploadBtn.waitFor({ state: 'visible', timeout: 5000 })
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    uploadBtn.click(),
  ])
  await fileChooser.setFiles(filePath)
  await nodeLocator.locator('.image-preview img').waitFor({ state: 'visible', timeout: 5000 })
}

/**
 * Position nodes on the canvas via Pinia store.
 * @param {Array<{ type: string, x: number, y: number, nth?: number }>} positions
 */
export async function positionNodes(page, positions) {
  await page.evaluate((pos) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')

    const counts = {}
    for (const { type, x, y, nth } of pos) {
      const index = nth ?? (counts[type] || 0)
      counts[type] = index + 1

      const matching = flowStore.nodes.filter(n => n.type === type)
      if (matching[index]) {
        matching[index].position = { x, y }
      }
    }
  }, positions)
  await page.waitForTimeout(300)
}

/**
 * Select a model in a node's toolbar model-select dropdown.
 * Clicks the node first to make it selected (toolbar visible).
 */
/**
 * Programmatically connect nodes via the Pinia store (for off-screen nodes).
 * @param {Array<{ sourceType: string, sourceHandle: string, targetType: string, targetHandle: string, sourceNth?: number, targetNth?: number }>} connections
 */
export async function connectNodesProgrammatic(page, connections) {
  await page.evaluate((conns) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')

    // Access VueFlow's addEdges through the component tree
    const vfComp = document.querySelector('.vue-flow').__vueParentComponent
    const addEdges = vfComp.parent.setupState.addEdges

    function findNode(type, nth) {
      const matching = flowStore.nodes.filter(n => n.type === type)
      return matching[nth || 0]
    }

    const newEdges = []
    for (const conn of conns) {
      const source = findNode(conn.sourceType, conn.sourceNth)
      const target = findNode(conn.targetType, conn.targetNth)
      if (source && target) {
        newEdges.push({
          id: `e-${source.id}-${conn.sourceHandle}-${target.id}-${conn.targetHandle}`,
          source: source.id,
          sourceHandle: conn.sourceHandle,
          target: target.id,
          targetHandle: conn.targetHandle,
        })
      }
    }

    addEdges(newEdges)
  }, connections)
  await page.waitForTimeout(500)
}

/**
 * Pan the VueFlow viewport to center a specific node on screen.
 */
/**
 * Pan the VueFlow viewport to center a specific node on screen.
 */
export async function scrollToNode(page, nodeType, nth = 0) {
  await page.evaluate(({ nodeType, nth }) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const matching = flowStore.nodes.filter(n => n.type === nodeType)
    const node = matching[nth]
    if (!node) return

    // Use fitView with node IDs to center on specific node
    const vfComp = document.querySelector('.vue-flow').__vueParentComponent
    const fitView = vfComp.parent.setupState.fitView
    if (fitView) {
      fitView({ nodes: [node.id], padding: 0.5, maxZoom: 1 })
    }
  }, { nodeType, nth })
  await page.waitForTimeout(500)
}

export async function selectModel(page, nodeLocator, modelId) {
  // Use bounding box to click center of the node
  const box = await nodeLocator.boundingBox()
  if (!box) throw new Error('selectModel: node has no bounding box')
  // Click center-top area of the node
  await page.mouse.click(box.x + box.width / 2, box.y + 20)
  await page.waitForTimeout(500)

  const modelSelect = page.locator('#model-select')
  const isVisible = await modelSelect.isVisible().catch(() => false)
  if (!isVisible) {
    // Retry: click a different spot
    await page.mouse.click(box.x + 30, box.y + 30)
    await page.waitForTimeout(500)
  }

  await modelSelect.waitFor({ state: 'visible', timeout: 5000 })
  await modelSelect.selectOption(modelId)
  // Click away to deselect and dismiss toolbar
  await page.mouse.click(10, 10)
  await page.waitForTimeout(200)
}

/**
 * Set a node's model programmatically via Pinia store.
 * Use this when UI-based selectModel fails due to toolbar overlap.
 */
export async function setModelProgrammatic(page, nodeType, nth, modelId) {
  await page.evaluate(({ nodeType, nth, modelId }) => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
    const flowStore = pinia._s.get('flow')
    const matching = flowStore.nodes.filter(n => n.type === nodeType)
    const node = matching[nth || 0]
    if (node) {
      node.data.model = modelId
      // Clear params from previous model to avoid validation errors
      node.data.params = {}
    }
  }, { nodeType, nth, modelId })
  await page.waitForTimeout(200)
}
