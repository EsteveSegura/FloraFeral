<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['image', 'image']"
    :outputs="[]"
    icon="⚖️"
    :selected="selected"
  >
    <div class="compare-node-content">
      <!-- Status info -->
      <div v-if="!hasImage1 || !hasImage2" class="status-info">
        <div class="status-icon">⚖️</div>
        <p>Connect 2 images to compare</p>
        <div class="connection-status">
          <div :class="['status-dot', { active: hasImage1 }]"></div>
          <span>Image 1 (Left)</span>
        </div>
        <div class="connection-status">
          <div :class="['status-dot', { active: hasImage2 }]"></div>
          <span>Image 2 (Right)</span>
        </div>
      </div>

      <!-- Compare result -->
      <div v-else class="compare-result">
        <div
          ref="compareContainer"
          class="compare-preview"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        >
          <!-- Base image (right/after) -->
          <img :src="image2Src" alt="After" class="compare-image-full" />

          <!-- Overlay container with clipped image (left/before) -->
          <div class="compare-overlay" :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }">
            <img :src="image1Src" alt="Before" class="compare-image-full" />
          </div>

          <!-- Slider line and handle -->
          <div class="compare-divider" :style="{ left: sliderPosition + '%' }">
            <div class="compare-handle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </div>
          </div>

          <!-- Labels -->
          <div class="compare-label compare-label-left">Before</div>
          <div class="compare-label compare-label-right">After</div>
        </div>
        <div class="compare-info">
          <span class="info-label">Click and drag to compare</span>
        </div>
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import BaseNode from '@/components/base/BaseNode.vue'
import { getEdgePortType } from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false }
})

const flowStore = useFlowStore()
const compareContainer = ref(null)
const sliderPosition = ref(50)
const isDragging = ref(false)

// VueFlow composables
const { node } = useNode()
const { viewport } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Drag functionality
function handleMouseDown(event) {
  // Prevent node dragging
  event.stopPropagation()
  isDragging.value = true
  updatePosition(event)
}

function handleMouseMove(event) {
  if (!isDragging.value) return
  event.stopPropagation()
  updatePosition(event)
}

function handleMouseUp(event) {
  if (isDragging.value) {
    event.stopPropagation()
  }
  isDragging.value = false
}

function updatePosition(event) {
  if (!compareContainer.value) return

  const rect = compareContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = (x / rect.width) * 100

  // Clamp between 0 and 100
  sliderPosition.value = Math.max(0, Math.min(100, percentage))
}

// Get connected images from incoming edges
// Using flowStore directly for reactivity with PORT_TYPE validation
const connectedImages = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  return incomingEdges
    .map(edge => {
      // Validate port type
      const portType = getEdgePortType(edge, flowStore.nodes, nodeRegistry, true)
      if (portType !== PORT_TYPES.IMAGE) return null

      const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
      if (!sourceNode) return null

      // Get image from source node
      const imageSrc = sourceNode.data?.src || sourceNode.data?.lastOutputSrc
      if (!imageSrc) return null

      return {
        src: imageSrc,
        handle: edge.targetHandle,
        nodeId: edge.source
      }
    })
    .filter(img => img !== null)
})

const hasImage1 = computed(() => {
  return connectedImages.value.some(img => img.handle === 'input-0')
})

const hasImage2 = computed(() => {
  return connectedImages.value.some(img => img.handle === 'input-1')
})

const image1Src = computed(() => {
  const img = connectedImages.value.find(img => img.handle === 'input-0')
  return img ? img.src : null
})

const image2Src = computed(() => {
  const img = connectedImages.value.find(img => img.handle === 'input-1')
  return img ? img.src : null
})
</script>

<style scoped>
.compare-node-content {
  padding: var(--flora-space-3);
  min-width: 450px;
}

.status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--flora-space-3);
  padding: var(--flora-space-6);
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-medium) dashed var(--flora-color-border-default);
}

.status-icon {
  font-size: var(--flora-font-size-3xl);
  margin-bottom: var(--flora-space-1);
}

.status-info p {
  margin: 0;
  color: var(--flora-color-text-tertiary);
  font-size: var(--flora-font-size-sm);
  text-align: center;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-tertiary);
  width: 100%;
  padding: var(--flora-space-1) var(--flora-space-2);
  background: var(--flora-color-surface);
  border-radius: var(--flora-radius-md);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--flora-radius-full);
  background: var(--flora-color-border-default);
  transition: all var(--flora-transition-base);
}

.status-dot.active {
  background: var(--flora-color-accent);
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
}

.compare-result {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.compare-preview {
  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 16 / 9;
  min-height: 300px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  background: #000;
  cursor: ew-resize;
  user-select: none;
}

.compare-image-full {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
}

.compare-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.compare-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--flora-color-accent);
  transform: translateX(-50%);
  z-index: 2;
  pointer-events: none;
  box-shadow: 0 0 20px rgba(22, 163, 74, 0.5);
}

.compare-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  background: var(--flora-color-accent);
  border: var(--flora-border-width-thick) solid var(--flora-color-surface);
  border-radius: var(--flora-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  box-shadow: var(--flora-shadow-lg);
}

.compare-handle svg {
  flex-shrink: 0;
}

.compare-label {
  position: absolute;
  top: var(--flora-space-3);
  padding: var(--flora-space-2) var(--flora-space-3);
  background: var(--flora-color-bg-overlay);
  color: var(--flora-color-text-primary);
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-semibold);
  border-radius: var(--flora-radius-md);
  z-index: 3;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.compare-label-left {
  left: var(--flora-space-3);
}

.compare-label-right {
  right: var(--flora-space-3);
}

.compare-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
}

.info-label {
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-tertiary);
}

.info-detail {
  color: var(--flora-color-text-primary);
  font-style: italic;
}
</style>
