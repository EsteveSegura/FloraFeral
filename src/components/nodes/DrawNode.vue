<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['image']"
    :outputs="['image']"
    icon="🎨"
    :selected="selected"
  >
    <div class="draw-node-content">
      <!-- Input Image Preview (if connected) -->
      <div v-if="connectedImage && !nodeData.outputSrc" class="image-preview" @click="openDrawingModal">
        <img :src="connectedImage" alt="Input image" />
        <div class="draw-overlay">
          <span class="draw-icon">✏️</span>
          <p>Click to draw</p>
        </div>
      </div>

      <!-- Output Image Preview (after drawing) -->
      <div v-else-if="nodeData.outputSrc" class="image-preview" @click="openDrawingModal">
        <img :src="nodeData.outputSrc" alt="Output image" />
        <div class="draw-overlay">
          <span class="draw-icon">✏️</span>
          <p>Click to edit</p>
        </div>
      </div>

      <!-- Placeholder -->
      <div v-else class="image-placeholder">
        <span class="placeholder-icon">🎨</span>
        <p>Connect an image to start drawing</p>
      </div>
    </div>
  </BaseNode>

  <!-- Drawing Modal -->
  <BaseModal
    v-model="showDrawingModal"
    title="Draw on Image"
    size="xl"
    :show-footer="false"
  >
    <div class="drawing-modal-content">
      <div class="drawing-canvas-wrapper">
        <DrawingCanvas
          v-if="showDrawingModal && currentImageSrc"
          ref="drawingCanvasRef"
          :image-src="currentImageSrc"
          :strokes-data="nodeData.strokesData"
          @update:canvas="handleCanvasUpdate"
        />
      </div>

      <div class="drawing-actions">
        <BaseButton
          variant="secondary"
          @click="clearDrawing"
        >
          Clear Drawing
        </BaseButton>
        <BaseButton
          variant="primary"
          @click="saveDrawing"
        >
          Save
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { getEdgePortType } from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import BaseNode from '@/components/base/BaseNode.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DrawingCanvas from '@/components/drawing/DrawingCanvas.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: () => ({})
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const flowStore = useFlowStore()

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data
const nodeData = computed(() => node.data)

// Drawing modal state
const showDrawingModal = ref(false)
const drawingCanvasRef = ref(null)

// Get connected image from upstream nodes
const connectedImage = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    const portType = getEdgePortType(edge, flowStore.nodes, nodeRegistry, true)
    if (portType !== PORT_TYPES.IMAGE) continue

    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    if (!sourceNode || !sourceNode.data) continue

    const imageSrc = sourceNode.data.src || sourceNode.data.lastOutputSrc || sourceNode.data.outputSrc
    if (imageSrc) return imageSrc
  }

  return null
})

// Current image to draw on (always the original without strokes)
const currentImageSrc = computed(() => {
  return nodeData.value.originalSrc || connectedImage.value
})

// Original image (without drawings)
const originalImageSrc = computed(() => {
  return nodeData.value.originalSrc || connectedImage.value
})

// Automatically propagate input image to output if no custom drawing exists
watchEffect(() => {
  const inputImage = connectedImage.value
  const currentOutput = nodeData.value.outputSrc
  const hasStrokes = nodeData.value.strokesData

  // If there's an input image and no output, pass it through
  if (inputImage && !currentOutput) {
    updateNodeData(props.id, {
      originalSrc: inputImage,
      outputSrc: inputImage,
      lastOutputSrc: inputImage
    })
  }
  // If input changed and it's different from stored original, reset
  else if (inputImage && nodeData.value.originalSrc && inputImage !== nodeData.value.originalSrc) {
    updateNodeData(props.id, {
      originalSrc: inputImage,
      outputSrc: inputImage,
      lastOutputSrc: inputImage,
      strokesData: null
    })
  }
})

function openDrawingModal() {
  if (!currentImageSrc.value) return

  // Save original image reference if not saved yet
  if (!nodeData.value.originalSrc && connectedImage.value) {
    updateNodeData(props.id, {
      originalSrc: connectedImage.value
    })
  }

  showDrawingModal.value = true
}

function handleCanvasUpdate(canvasData) {
  // canvasData contains { composite, strokes }
  // We don't need to store temporary data anymore
}

function clearDrawing() {
  // Clear strokes data
  updateNodeData(props.id, {
    strokesData: null,
    outputSrc: originalImageSrc.value,
    lastOutputSrc: originalImageSrc.value
  })

  // Close and reopen modal to reload the canvas
  showDrawingModal.value = false
  setTimeout(() => {
    showDrawingModal.value = true
  }, 100)
}

function saveDrawing() {
  const canvasData = drawingCanvasRef.value?.getCanvasData()

  if (canvasData) {
    updateNodeData(props.id, {
      outputSrc: canvasData.composite,
      lastOutputSrc: canvasData.composite,
      strokesData: canvasData.strokes,
      originalSrc: nodeData.value.originalSrc || originalImageSrc.value
    })
  }

  showDrawingModal.value = false
}
</script>

<style scoped>
.draw-node-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--flora-space-3);
  min-width: 300px;
}

.image-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  cursor: pointer;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  transition: transform var(--flora-transition-fast);
}

.image-preview:hover {
  transform: scale(1.02);
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.draw-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--flora-transition-fast);
  color: white;
}

.image-preview:hover .draw-overlay {
  opacity: 1;
}

.draw-icon {
  font-size: 3rem;
  margin-bottom: var(--flora-space-2);
}

.draw-overlay p {
  margin: 0;
  font-size: var(--flora-font-size-lg);
  font-weight: var(--flora-font-weight-medium);
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--flora-space-8);
  border: 2px dashed var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  background: var(--flora-color-bg-secondary);
  min-height: 200px;
  width: 100%;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: var(--flora-space-3);
  opacity: 0.5;
}

.image-placeholder p {
  margin: 0;
  color: var(--flora-color-text-tertiary);
  font-size: var(--flora-font-size-sm);
  text-align: center;
}

.drawing-modal-content {
  display: flex;
  flex-direction: column;
  height: 80vh;
  max-height: 90vh;
}

.drawing-canvas-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.drawing-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--flora-space-3);
  padding: var(--flora-space-3);
  border-top: 1px solid var(--flora-color-border-default);
  flex-shrink: 0;
}
</style>
