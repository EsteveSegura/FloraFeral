<template>
  <div class="flow-canvas-container">
    <!-- Canvas de VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent>
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
        <button class="toolbar-button" @click="handleExport" title="Export flow to JSON">
          💾 Export
        </button>
        <button class="toolbar-button" @click="handleImport" title="Import flow from JSON">
          📂 Import
        </button>
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
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useFlowStore } from '@/stores/flow'
import { validateConnection } from '@/lib/connection'
import { createEdge, createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import { downloadFlow, loadFlowFromFile } from '@/lib/flow-io'
import replicateService from '@/services/replicate'
import '@/styles/FlowCanvasView.css'

const flowStore = useFlowStore()

const fileInput = ref(null)
const isNodesMenuOpen = ref(false)

// VueFlow composable
const { findNode, onConnect, addEdges } = useVueFlow()

// Register connection handler - use addEdges directly
onConnect((params) => {
  // Validation already done by isValidConnection
  addEdges([params])
  flowStore.clearError()
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

function onDrop(event) {
  if (!draggedNodeType) return

  const canvasWrapper = event.currentTarget
  const rect = canvasWrapper.getBoundingClientRect()

  // Calculate position relative to canvas
  const position = {
    x: event.clientX - rect.left - 75, // Center node (width ~150px)
    y: event.clientY - rect.top - 50   // Center node (height ~100px)
  }

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
</script>
