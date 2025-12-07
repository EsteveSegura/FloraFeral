<template>
  <div class="flow-canvas-container">
    <!-- Sidebar para drag & drop de nodos -->
    <aside class="sidebar">
      <h3>Nodos</h3>
      <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'image')">
        📷 Imagen
      </div>
      <div class="node-item" draggable="true" @dragstart="onDragStart($event, 'generator')">
        ✨ Generador
      </div>
    </aside>

    <!-- Canvas de VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent>
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :default-viewport="{ zoom: 1 }"
        :min-zoom="0.2"
        :max-zoom="4"
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
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useFlowStore } from '@/stores/flow'
import '@/styles/FlowCanvasView.css'

const flowStore = useFlowStore()

// Inicializar nodos mock al montar
onMounted(() => {
  if (flowStore.nodes.length === 0) {
    flowStore.initMockNodes()
  }
})

// Computed para sincronizar con el store
const nodes = computed(() => flowStore.nodes)
const edges = computed(() => flowStore.edges)

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

  // Calcular posición relativa al canvas
  const position = {
    x: event.clientX - rect.left - 75, // Centrar el nodo (ancho ~150px)
    y: event.clientY - rect.top - 50   // Centrar el nodo (alto ~100px)
  }

  // Crear nuevo nodo
  const newNode = {
    id: `node_${Date.now()}`,
    type: draggedNodeType,
    position,
    data: {
      label: draggedNodeType === 'image' ? 'Nueva Imagen' : 'Nuevo Generador',
      ...(draggedNodeType === 'generator' && { prompt: '' })
    }
  }

  flowStore.addNode(newNode)
  draggedNodeType = null
}

// Conectar nodos
function onConnect(connection) {
  // Validar conexión
  const sourceNode = flowStore.getNodeById(connection.source)
  const targetNode = flowStore.getNodeById(connection.target)

  if (!sourceNode || !targetNode) {
    flowStore.setError('Nodos no encontrados')
    return
  }

  // Evitar auto-conexiones
  if (connection.source === connection.target) {
    flowStore.setError('No puedes conectar un nodo consigo mismo')
    return
  }

  // Evitar conexiones duplicadas
  const isDuplicate = flowStore.edges.some(
    edge => edge.source === connection.source && edge.target === connection.target
  )

  if (isDuplicate) {
    flowStore.setError('Esta conexión ya existe')
    return
  }

  // Crear edge
  const newEdge = {
    id: `edge_${connection.source}_${connection.target}_${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle
  }

  flowStore.addEdge(newEdge)
  flowStore.clearError()
}

// Seleccionar nodo
function onNodeClick(event) {
  flowStore.setSelectedNode(event.node.id)
}
</script>
