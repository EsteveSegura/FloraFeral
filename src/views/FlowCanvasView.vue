<template>
  <div class="flow-canvas-container">
    <!-- Canvas de VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent @mousemove="onMouseMove">
      <!-- Toggle button for nodes menu -->
      <button class="nodes-menu-toggle" @click="isNodesMenuOpen = !isNodesMenuOpen" :title="isNodesMenuOpen ? 'Hide nodes menu' : 'Show nodes menu'">
        {{ isNodesMenuOpen ? '✕' : '📦' }}
      </button>

      <!-- Floating Sidebar para drag & drop de nodos -->
      <aside v-if="isNodesMenuOpen" class="sidebar">
        <h3>Nodes</h3>
        <div
          v-for="nodeDef in availableNodes"
          :key="nodeDef.type"
          class="node-item"
          draggable="true"
          @dragstart="onDragStart($event, nodeDef.type)"
        >
          {{ getNodeIcon(nodeDef.type) }} {{ nodeDef.label }}
        </div>
      </aside>
      <!-- Toolbar -->
      <div class="toolbar">
        <BaseButton variant="primary" size="sm" @click="handleExport" title="Export flow to JSON">
          💾 Export
        </BaseButton>
        <BaseButton variant="primary" size="sm" @click="handleImport" title="Import flow from JSON">
          📂 Import
        </BaseButton>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          style="display: none"
          @change="onFileSelected"
        />
      </div>

      <VueFlow
        v-model:nodes="flowStore.nodes"
        v-model:edges="flowStore.edges"
        :node-types="nodeTypes"
        :is-valid-connection="isValidConnection"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
        :delete-key-code="['Delete', 'Backspace']"
        :multi-selection-key-code="['Meta', 'Control']"
        elevate-edges-on-select
        elevate-nodes-on-select
      >
        <Background pattern-color="#242424" :gap="24" variant="dots" size="2" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, markRaw, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useFlowStore } from '@/stores/flow'
import { validateConnection } from '@/lib/connection'
import { createEdge, createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import { downloadFlow, loadFlowFromFile } from '@/lib/flow-io'
import replicateService from '@/services/replicate'
import BaseButton from '@/components/ui/BaseButton.vue'
import '@/styles/FlowCanvasView.css'

const flowStore = useFlowStore()

const fileInput = ref(null)
const isNodesMenuOpen = ref(false)
const copiedNode = ref(null)
const mousePosition = ref({ x: 0, y: 0 })

// VueFlow composable
const { findNode, onConnect, addEdges, viewport, onNodeDragStop } = useVueFlow()

// Register connection handler - use addEdges directly
onConnect((params) => {
  // Validation already done by isValidConnection
  addEdges([params])
  flowStore.clearError()
})

// Detect when a node is dragged in/out of a group
onNodeDragStop((event) => {
  const node = event.node

  // Skip group nodes themselves
  if (node.type === NODE_TYPES.GROUP) return

  if (node.parentNode) {
    // Node has a parent - check if it should be unlinked
    const parentNode = flowStore.nodes.find(n => n.id === node.parentNode)
    if (!parentNode || !parentNode.style) return

    // Get parent dimensions
    const parentWidth = parseInt(parentNode.style.width) || 0
    const parentHeight = parseInt(parentNode.style.height) || 0

    // Check if node is outside parent bounds (with some tolerance)
    const tolerance = 50 // Allow 50px outside before unlinking
    if (
      node.position.x < -tolerance ||
      node.position.y < -tolerance ||
      node.position.x > parentWidth + tolerance ||
      node.position.y > parentHeight + tolerance
    ) {
      // Node is outside parent, unlink it
      console.log(`Unlinking node ${node.id} from parent ${node.parentNode}`)

      // Convert position to absolute (parent position + relative position)
      node.position = {
        x: parentNode.position.x + node.position.x,
        y: parentNode.position.y + node.position.y
      }

      // Remove parent relationship
      delete node.parentNode
      if (node.extent) delete node.extent
    }
  } else {
    // Node has no parent - check if it should be linked to a group
    const groups = flowStore.nodes.filter(n => n.type === NODE_TYPES.GROUP && n.id !== node.id)

    for (const group of groups) {
      if (!group.style) continue

      // Get group dimensions and position
      const groupX = group.position.x
      const groupY = group.position.y
      const groupWidth = parseInt(group.style.width) || 0
      const groupHeight = parseInt(group.style.height) || 0

      // Check if node center is inside group
      const nodeWidth = node.dimensions?.width || 200
      const nodeHeight = node.dimensions?.height || 150
      const nodeCenterX = node.position.x + nodeWidth / 2
      const nodeCenterY = node.position.y + nodeHeight / 2

      if (
        nodeCenterX >= groupX &&
        nodeCenterX <= groupX + groupWidth &&
        nodeCenterY >= groupY &&
        nodeCenterY <= groupY + groupHeight
      ) {
        // Node is inside group, link it
        console.log(`Linking node ${node.id} to parent ${group.id}`)

        // Convert position to relative (node position - parent position)
        node.position = {
          x: node.position.x - groupX,
          y: node.position.y - groupY
        }

        // Set parent relationship
        node.parentNode = group.id

        break // Only link to first matching group
      }
    }
  }
})

// Create node types mapping from registry
const nodeTypes = {}
nodeRegistry.listNodes().forEach(nodeDef => {
  nodeTypes[nodeDef.type] = markRaw(nodeDef.component)
})

// Get available nodes from registry
const availableNodes = computed(() => nodeRegistry.listNodes())

// Get icon for node type
function getNodeIcon(type) {
  const icons = {
    [NODE_TYPES.IMAGE]: '📷',
    [NODE_TYPES.IMAGE_GENERATOR]: '✨',
    [NODE_TYPES.PROMPT]: '📝',
    [NODE_TYPES.DIFF]: '🔍',
    [NODE_TYPES.COMPARE]: '⚖️',
    [NODE_TYPES.TEXT_GENERATOR]: '💬'
  }
  return icons[type] || '⚙️'
}

// Drag & Drop
let draggedNodeType = null

function onDragStart(event, nodeType) {
  draggedNodeType = nodeType
  event.dataTransfer.effectAllowed = 'move'
}

// Handle image file drop
function handleImageFileDrop(file, position) {
  const reader = new FileReader()
  reader.onload = (event) => {
    // Get IO configuration for image node
    const ioConfig = getNodeIOConfig(NODE_TYPES.IMAGE)

    // Create image node with the file data
    const newNode = createNode(
      `node_${Date.now()}`,
      NODE_TYPES.IMAGE,
      position,
      {
        label: 'Image',
        src: event.target.result,
        name: file.name
      },
      ioConfig
    )

    // Add to store
    flowStore.nodes.push(newNode)
    console.log('Image node created from file:', file.name)
  }

  reader.onerror = (error) => {
    console.error('Error reading image file:', error)
    flowStore.setError('Failed to load image file')
    setTimeout(() => flowStore.clearError(), 5000)
  }

  reader.readAsDataURL(file)
}

function onDrop(event) {
  const canvasWrapper = event.currentTarget
  const rect = canvasWrapper.getBoundingClientRect()

  // Calculate position relative to canvas, accounting for zoom and pan
  const position = {
    x: (event.clientX - rect.left - viewport.value.x) / viewport.value.zoom - 75, // Center node (width ~150px)
    y: (event.clientY - rect.top - viewport.value.y) / viewport.value.zoom - 50   // Center node (height ~100px)
  }

  // Check if dropping a file (image)
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    const file = files[0]
    // Check if it's an image file
    if (file.type.startsWith('image/')) {
      event.preventDefault()
      handleImageFileDrop(file, position)
      return
    }
  }

  // Regular node drop
  if (!draggedNodeType) return

  // Get node definition from registry
  const nodeDef = nodeRegistry.getNodeDef(draggedNodeType)
  if (!nodeDef) {
    console.error(`Node type ${draggedNodeType} not found in registry`)
    draggedNodeType = null
    return
  }

  // Get IO configuration for this node type
  const ioConfig = getNodeIOConfig(draggedNodeType)

  // Create node data
  const data = {
    label: `New ${nodeDef.label}`
  }

  // Add prompt field and model params for generator nodes
  if (draggedNodeType === NODE_TYPES.IMAGE_GENERATOR) {
    data.prompt = ''
    data.model = 'nano-banana-pro'
    data.params = replicateService.getModelDefaults('nano-banana-pro')
  }

  // Add prompt field and model params for text generator nodes
  if (draggedNodeType === NODE_TYPES.TEXT_GENERATOR) {
    data.prompt = ''
    data.model = 'gpt-5'
    data.params = replicateService.getModelDefaults('gpt-5')
  }

  // Add prompt field for prompt nodes
  if (draggedNodeType === NODE_TYPES.PROMPT) {
    data.prompt = ''
  }

  // Create new node using the schema
  const newNode = createNode(
    `node_${Date.now()}`,
    draggedNodeType,
    position,
    data,
    ioConfig
  )

  // Mutate store array directly - preserves component instances
  flowStore.nodes.push(newNode)
  draggedNodeType = null
}

// Validate connection before allowing it (visual feedback)
function isValidConnection(connection) {
  const sourceNode = flowStore.nodes.find(n => n.id === connection.source)
  const targetNode = flowStore.nodes.find(n => n.id === connection.target)

  if (!sourceNode || !targetNode) return false

  const validation = validateConnection(
    connection,
    sourceNode,
    targetNode,
    flowStore.edges
  )

  return validation.valid
}

// Export flow to JSON file
function handleExport() {
  try {
    downloadFlow(flowStore)
    console.log('Flow exported successfully')
  } catch (error) {
    console.error('Error exporting flow:', error)
    flowStore.setError('Failed to export flow')
  }
}

// Trigger file input for import
function handleImport() {
  fileInput.value?.click()
}

// Handle file selection
async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await loadFlowFromFile(file, flowStore, { addEdges })

    if (result.success) {
      console.log('Flow imported successfully')
      // Clear file input for next import
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    } else {
      console.error('Import failed:', result.error)
      flowStore.setError(result.error || 'Failed to import flow')
      setTimeout(() => flowStore.clearError(), 5000)
    }
  } catch (error) {
    console.error('Error importing flow:', error)
    flowStore.setError('Failed to import flow')
    setTimeout(() => flowStore.clearError(), 5000)
  }
}

// Track mouse position over canvas
function onMouseMove(event) {
  const canvasWrapper = event.currentTarget
  const rect = canvasWrapper.getBoundingClientRect()
  mousePosition.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }
}

// Copy selected node
function handleCopy() {
  const selectedNode = flowStore.nodes.find(n => n.selected)
  if (selectedNode) {
    // Create a deep copy immediately to capture current state
    copiedNode.value = {
      ...selectedNode,
      data: JSON.parse(JSON.stringify(selectedNode.data))
    }
    console.log('Node copied:', selectedNode.type, 'with data:', copiedNode.value.data)
  }
}

// Paste copied node at mouse position
function handlePaste() {
  if (!copiedNode.value) return

  // Calculate position at mouse, accounting for zoom and pan
  const position = {
    x: (mousePosition.value.x - viewport.value.x) / viewport.value.zoom,
    y: (mousePosition.value.y - viewport.value.y) / viewport.value.zoom
  }

  // Get IO configuration for this node type
  const ioConfig = getNodeIOConfig(copiedNode.value.type)

  // Use already cloned data from handleCopy
  const clonedData = { ...copiedNode.value.data }

  // Update label to indicate it's a copy
  if (clonedData.label) {
    clonedData.label = `${clonedData.label} (Copy)`
  }

  // Create new node with same type and data
  const newNode = createNode(
    `node_${Date.now()}`,
    copiedNode.value.type,
    position,
    clonedData,
    ioConfig
  )

  // Add to store
  flowStore.nodes.push(newNode)
  console.log('Node pasted:', newNode.type, 'with data:', clonedData)
}

// Group selected nodes with Ctrl+G
async function handleGroup() {
  const selectedNodes = flowStore.nodes.filter(n => n.selected)

  if (selectedNodes.length < 2) {
    console.log('Need at least 2 nodes to create a group')
    return
  }

  // Check if any selected node is already in a group (prevent nested groups)
  const hasNodeInGroup = selectedNodes.some(node => node.parentNode)
  if (hasNodeInGroup) {
    console.log('Cannot create nested groups - one or more nodes are already in a group')
    flowStore.setError('Cannot create nested groups')
    setTimeout(() => flowStore.clearError(), 3000)
    return
  }

  // Calculate bounding box of all selected nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  selectedNodes.forEach(node => {
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    // Use actual dimensions if available, otherwise estimate
    const nodeWidth = node.dimensions?.width || node.width || 250
    const nodeHeight = node.dimensions?.height || node.height || 200
    maxX = Math.max(maxX, node.position.x + nodeWidth)
    maxY = Math.max(maxY, node.position.y + nodeHeight)
  })

  // Add padding around the group
  const padding = 40
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const groupWidth = maxX - minX
  const groupHeight = maxY - minY

  // Create parent group node
  const parentId = `group_${Date.now()}`
  const ioConfig = getNodeIOConfig(NODE_TYPES.GROUP)

  const parentNode = createNode(
    parentId,
    NODE_TYPES.GROUP,
    { x: minX, y: minY },
    { label: 'Group' },
    ioConfig
  )

  // Set style for the group container
  parentNode.style = {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    width: `${groupWidth}px`,
    height: `${groupHeight}px`,
    border: '2px solid rgba(128, 128, 128, 0.5)'
  }

  // Add parent node to store first
  flowStore.nodes.push(parentNode)

  // Wait for Vue to process the parent node
  await nextTick()

  // Now update all selected nodes to be children
  selectedNodes.forEach(node => {
    node.parentNode = parentId
    // Don't use extent to allow dragging nodes out of the group
    // Adjust position to be relative to parent
    node.position = {
      x: node.position.x - minX,
      y: node.position.y - minY
    }
    node.selected = false
  })

  console.log(`Grouped ${selectedNodes.length} nodes into group ${parentId}`)
}

// Handle keyboard shortcuts
function handleKeyDown(event) {
  // Check for Ctrl+C or Cmd+C (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    event.preventDefault()
    handleCopy()
  }

  // Check for Ctrl+V or Cmd+V (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    event.preventDefault()
    handlePaste()
  }

  // Check for Ctrl+G or Cmd+G (Mac) - Group nodes
  if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
    event.preventDefault()
    handleGroup()
  }
}

// Setup keyboard listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
