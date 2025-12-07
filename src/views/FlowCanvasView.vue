<template>
  <div class="flow-canvas-container">
    <!-- Sidebar para drag & drop de nodos -->
    <aside class="sidebar">
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

    <!-- Canvas de VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent>
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
        :delete-key-code="['Delete', 'Backspace']"
        :multi-selection-key-code="['Meta', 'Control']"
        @connect="onConnect"
        @node-click="onNodeClick"
        @node-drag-stop="onNodeDragStop"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useFlowStore } from '@/stores/flow'
import { validateConnection } from '@/lib/connection'
import { createEdge, createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import '@/styles/FlowCanvasView.css'

const flowStore = useFlowStore()
const { nodes, edges } = storeToRefs(flowStore)

// Create node types mapping from registry
const nodeTypes = {}
nodeRegistry.listNodes().forEach(nodeDef => {
  nodeTypes[nodeDef.type] = nodeDef.component
})

// Get available nodes from registry
const availableNodes = computed(() => nodeRegistry.listNodes())

// Get icon for node type
function getNodeIcon(type) {
  const icons = {
    [NODE_TYPES.IMAGE]: '📷',
    [NODE_TYPES.IMAGE_GENERATOR]: '✨'
  }
  return icons[type] || '⚙️'
}

// Inicializar nodos mock al montar
onMounted(() => {
  if (flowStore.nodes.length === 0) {
    flowStore.initMockNodes()
  }
})

// Guardar posición cuando se termina de arrastrar un nodo
function onNodeDragStop(event) {
  flowStore.updateNodePosition(event.node.id, event.node.position)
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

  // Add prompt field for generator nodes
  if (draggedNodeType === NODE_TYPES.IMAGE_GENERATOR) {
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

  flowStore.addNode(newNode)
  draggedNodeType = null
}

// Connect nodes
function onConnect(connection) {
  // Get nodes
  const sourceNode = flowStore.getNodeById(connection.source)
  const targetNode = flowStore.getNodeById(connection.target)

  // Validate connection using the validation system
  const validation = validateConnection(
    connection,
    sourceNode,
    targetNode,
    flowStore.edges
  )

  if (!validation.valid) {
    flowStore.setError(validation.reason)
    console.warn('Connection rejected:', validation.reason)
    return
  }

  // Create edge using the schema
  const newEdge = createEdge(
    `edge_${connection.source}_${connection.target}_${Date.now()}`,
    connection.source,
    connection.target,
    connection.sourceHandle,
    connection.targetHandle
  )

  flowStore.addEdge(newEdge)
  flowStore.clearError()
}

// Seleccionar nodo
function onNodeClick(event) {
  flowStore.setSelectedNode(event.node.id)
}
</script>
