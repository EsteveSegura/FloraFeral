<template>
  <div class="flow-canvas-container">
    <!-- Alert Banner -->
    <AlertBanner v-if="showAlert" type-alert="alert">
      You don't have a Replicate API key, <strong>you cannot make AI inferences</strong> without a key. Get yours <a href="https://youtu.be/ukJTEuO4QUU" target="_blank" rel="noopener noreferrer">here</a>
    </AlertBanner>

    <!-- Canvas VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent @mousemove="onMouseMove">
      <!-- Floating Menu -->
      <FloatingMenu
        ref="floatingMenu"
        :is-locked="isLocked"
        :is-nodes-menu-open="isNodesMenuOpen"
        @toggle-nodes="isNodesMenuOpen = !isNodesMenuOpen"
        @export="handleExport"
        @import="handleImport"
        @lock-toggle="handleLockToggle"
        @fit-view="handleFitView"
        @open-settings="isSettingsModalOpen = true"
      />

      <!-- Nodes Sidebar -->
      <NodesSidebar
        v-if="isNodesMenuOpen"
        ref="sidebarMenu"
        :nodes="availableNodes"
        @drag-start="onDragStart"
        @node-click="onNodeItemClick"
      />

      <!-- Hidden file input for import -->
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="onFileSelected"
      />

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
        :nodes-draggable="!isLocked"
        :pan-on-drag="!isLocked"
        :connection-radius="60"
        :snap-to-handle="true"
        :connection-line-style="{ strokeWidth: 2 }"
        elevate-edges-on-select
        elevate-nodes-on-select
      >
        <Background pattern-color="#242424" :gap="24" variant="dots" size="2" />
      </VueFlow>
    </div>

    <!-- Intro Modal -->
    <IntroModal v-model="showIntro" />

    <!-- Settings Modal -->
    <SettingsModal v-model="isSettingsModalOpen" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { useFlowStore } from '@/stores/flow'
import { useSettingsStore } from '@/stores/settings'
import { validateConnection } from '@/lib/connection'
import nodeRegistry from '@/lib/node-registry'
import FloatingMenu from '@/components/canvas/FloatingMenu.vue'
import NodesSidebar from '@/components/canvas/NodesSidebar.vue'
import SettingsModal from '@/components/canvas/SettingsModal.vue'
import IntroModal from '@/components/canvas/IntroModal.vue'
import AlertBanner from '@/components/canvas/AlertBanner.vue'
import { useFlowIO } from '@/composables/useFlowIO'
import { useViewportControls } from '@/composables/useViewportControls'
import { useCopyPaste } from '@/composables/useCopyPaste'
import { useNodeCreation } from '@/composables/useNodeCreation'
import { useDragAndDrop } from '@/composables/useDragAndDrop'
import { useGroupManagement } from '@/composables/useGroupManagement'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const flowStore = useFlowStore()
const settingsStore = useSettingsStore()

const isNodesMenuOpen = ref(false)
const mousePosition = ref({ x: 0, y: 0 })
const floatingMenu = ref(null)
const sidebarMenu = ref(null)
const isSettingsModalOpen = ref(false)
const showIntro = ref(false)

// Show alert if no Replicate API key is configured
const showAlert = computed(() => !settingsStore.getReplicateApiKey())

// VueFlow composable
const { findNode, onConnect, addEdges, viewport, onNodeDragStop, fitView } = useVueFlow()

// Use composables
const { fileInput, handleExport, handleImport, onFileSelected } = useFlowIO(flowStore, { addEdges })
const { isLocked, handleLockToggle, handleFitView } = useViewportControls(fitView)
const { copiedNode, handleCopy, handlePaste } = useCopyPaste(flowStore, viewport, mousePosition)
const { createNodeAtPosition } = useNodeCreation(flowStore)
const { onDragStart, onNodeItemClick, onDrop } = useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore, { addEdges })
const { handleGroup } = useGroupManagement(flowStore, onNodeDragStop)

// Setup keyboard shortcuts
useKeyboardShortcuts({ handleCopy, handlePaste, handleGroup, copiedNode, flowStore })

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
const availableNodes = computed(() => nodeRegistry.listNodes().filter(node => !node.config?.hidden))

// Close menu when clicking outside
function handleClickOutside(event) {
  if (!isNodesMenuOpen.value) return

  const floatingMenuEl = floatingMenu.value?.$el || floatingMenu.value
  const sidebarMenuEl = sidebarMenu.value?.$el || sidebarMenu.value

  const clickedFloatingMenu = floatingMenuEl?.contains(event.target)
  const clickedSidebar = sidebarMenuEl?.contains(event.target)

  if (!clickedFloatingMenu && !clickedSidebar) {
    isNodesMenuOpen.value = false
  }
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
    flowStore.edges,
    flowStore.nodes  // Pass all nodes for port type validation
  )

  if (!validation.valid) {
    console.warn('Connection rejected:', validation.reason)
  }

  return validation.valid
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

// Setup click outside handler
onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  // Show intro modal if canvas is empty
  if (flowStore.nodes.length === 0) {
    showIntro.value = true
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
.flow-canvas-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

</style>