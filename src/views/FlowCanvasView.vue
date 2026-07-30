<template>
  <div class="flow-canvas-container">
    <!-- Alert Banner -->
    <AlertBanner v-if="showAlert" type-alert="alert">
      You don't have a Replicate API key, <strong>you cannot make AI inferences</strong> without a key. Get yours <a href="https://youtu.be/ukJTEuO4QUU" target="_blank" rel="noopener noreferrer">here</a>
    </AlertBanner>

    <!-- Workflow Controls (top-left) -->
    <WorkflowControls style="position: absolute; top: 20px; left: 20px; z-index: 10;" />

    <!-- Canvas VueFlow -->
    <div class="canvas-wrapper" @drop="onDrop" @dragover.prevent @mousemove="onMouseMove">
      <!-- Floating Menu -->
      <FloatingMenu
        ref="floatingMenu"
        :is-locked="isLocked"
        :is-nodes-menu-open="isNodesMenuOpen"
        @toggle-nodes="toggleNodesMenu"
        @export="onExportClick"
        @import="handleImport"
        @open-batch="isBatchModalOpen = true"
        @lock-toggle="handleLockToggle"
        @fit-view="handleFitView"
        @open-settings="isSettingsModalOpen = true"
      />

      <!-- Nodes Sidebar -->
      <NodesSidebar
        v-if="isNodesMenuOpen"
        ref="sidebarMenu"
        :nodes="availableNodes"
        :position="menuPosition"
        :connection-options="pendingConnection ? connectionOptions : null"
        @drag-start="onDragStart"
        @node-click="onNodeItemClick"
        @connect-option="createNodeFromConnection"
      />

      <!-- Node Context Menu -->
      <NodeContextMenu
        v-if="nodeMenuPosition && contextNode"
        ref="nodeContextMenu"
        :node="contextNode"
        :position="nodeMenuPosition"
        @set-role="onSetBatchRole"
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

    <!-- Batch Run Modal -->
    <BatchRunModal v-model="isBatchModalOpen" :update-node-data="updateNodeData" />

    <!-- Save Dialog -->
    <SaveDialog
      v-model="isSaveDialogOpen"
      :default-filename="saveDialogFilename"
      @save="onSaveDialogSave"
    />
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
import NodeContextMenu from '@/components/canvas/NodeContextMenu.vue'
import SettingsModal from '@/components/canvas/SettingsModal.vue'
import IntroModal from '@/components/canvas/IntroModal.vue'
import AlertBanner from '@/components/canvas/AlertBanner.vue'
import SaveDialog from '@/components/canvas/SaveDialog.vue'
import WorkflowControls from '@/components/workflow/WorkflowControls.vue'
import BatchRunModal from '@/components/batch/BatchRunModal.vue'
import { useFlowIO } from '@/composables/useFlowIO'
import { useViewportControls } from '@/composables/useViewportControls'
import { useCopyPaste } from '@/composables/useCopyPaste'
import { useNodeCreation } from '@/composables/useNodeCreation'
import { useDragAndDrop } from '@/composables/useDragAndDrop'
import { useGroupManagement } from '@/composables/useGroupManagement'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useContextMenu } from '@/composables/useContextMenu'
import { useConnectionDrop } from '@/composables/useConnectionDrop'

const flowStore = useFlowStore()
const settingsStore = useSettingsStore()

const isNodesMenuOpen = ref(false)
const mousePosition = ref({ x: 0, y: 0 })
const floatingMenu = ref(null)
const sidebarMenu = ref(null)
const nodeContextMenu = ref(null)
const isSettingsModalOpen = ref(false)
const isSaveDialogOpen = ref(false)
const isBatchModalOpen = ref(false)
const saveDialogFilename = ref('')
const showIntro = ref(false)

// Show alert if no Replicate API key is configured
const showAlert = computed(() => !settingsStore.getReplicateApiKey())

// VueFlow composable
const { findNode, onConnect, onConnectStart, onConnectEnd, addEdges, viewport, onNodeDragStop, fitView, screenToFlowCoordinate, onPaneContextMenu, onNodeContextMenu, updateNodeData } = useVueFlow()

// Use composables
const { fileInput, handleExport, handleImport, onFileSelected, getDefaultFilename } = useFlowIO(flowStore, { addEdges })

// Handle export button click - show dialog or export directly based on settings
function onExportClick() {
  if (settingsStore.skipSaveDialog) {
    // Skip dialog, use default filename
    handleExport(getDefaultFilename())
  } else {
    // Show save dialog
    saveDialogFilename.value = getDefaultFilename()
    isSaveDialogOpen.value = true
  }
}

// Handle save from dialog
function onSaveDialogSave(filename) {
  handleExport(filename)
}

// Close the nodes menu and drop any connection waiting for a node
function closeNodesMenu() {
  cancelPendingConnection()
  closeMenu()
}

// Toggle nodes menu from floating menu (reset position for sidebar mode)
function toggleNodesMenu() {
  if (isNodesMenuOpen.value) {
    closeNodesMenu()
  } else {
    cancelPendingConnection() // Ensure regular mode (not filtered by a connection)
    resetMenuPosition() // Ensure sidebar mode (no custom position)
    isNodesMenuOpen.value = true
  }
}
const { isLocked, handleLockToggle, handleFitView } = useViewportControls(fitView)
const { copiedNode, handleCopy, handlePaste } = useCopyPaste(flowStore, viewport, mousePosition, { addEdges })
const { createNodeAtPosition } = useNodeCreation(flowStore)
const {
  menuPosition,
  nodeMenuPosition,
  contextNode,
  openNodesMenuAt,
  handlePaneContextMenu,
  handleNodeContextMenu,
  resetMenuPosition,
  closeNodeMenu,
  closeMenu
} = useContextMenu(isNodesMenuOpen)
const {
  pendingConnection,
  connectionOptions,
  handleConnectStart,
  handleConnectEnd,
  markConnectionMade,
  isDropGestureClick,
  createNodeFromConnection,
  cancelPendingConnection
} = useConnectionDrop(flowStore, createNodeAtPosition, screenToFlowCoordinate, { addEdges }, openNodesMenuAt, closeMenu)
const { onDragStart, onNodeItemClick, onDrop } = useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore, { addEdges }, closeNodesMenu)
const { handleGroup } = useGroupManagement(flowStore, onNodeDragStop)

// Register right-click handlers for context menus
onPaneContextMenu(handlePaneContextMenu)
onNodeContextMenu(handleNodeContextMenu)

// Register connection drop handlers (drag from a handle, release on empty canvas)
onConnectStart(handleConnectStart)
onConnectEnd(handleConnectEnd)

// Set (or clear) the batch role of the node targeted by the context menu
function onSetBatchRole(role) {
  if (contextNode.value) {
    updateNodeData(contextNode.value.id, { batchRole: role })
  }
  closeNodeMenu()
}

// Setup keyboard shortcuts
useKeyboardShortcuts({ handleCopy, handlePaste, handleGroup, copiedNode, flowStore })

// Register connection handler - use addEdges directly
onConnect((params) => {
  // Validation already done by isValidConnection
  markConnectionMade()
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
  if (nodeMenuPosition.value) {
    const nodeMenuEl = nodeContextMenu.value?.$el || nodeContextMenu.value
    if (!nodeMenuEl?.contains(event.target)) {
      closeNodeMenu()
    }
  }

  if (!isNodesMenuOpen.value) return

  // The click that released the connection must not close the menu it just opened
  if (pendingConnection.value && isDropGestureClick(event)) return

  const floatingMenuEl = floatingMenu.value?.$el || floatingMenu.value
  const sidebarMenuEl = sidebarMenu.value?.$el || sidebarMenu.value

  const clickedFloatingMenu = floatingMenuEl?.contains(event.target)
  const clickedSidebar = sidebarMenuEl?.contains(event.target)

  if (!clickedFloatingMenu && !clickedSidebar) {
    closeNodesMenu()
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