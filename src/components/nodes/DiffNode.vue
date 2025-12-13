<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['image', 'image']"
    :outputs="[]"
    icon="🔍"
    :selected="selected"
  >
    <div class="diff-node-content">
      <!-- Status info -->
      <div v-if="!hasImage1 || !hasImage2" class="status-info">
        <div class="status-icon">🔍</div>
        <p>Connect 2 images to compare</p>
        <div class="connection-status">
          <div :class="['status-dot', { active: hasImage1 }]"></div>
          <span>Image 1</span>
        </div>
        <div class="connection-status">
          <div :class="['status-dot', { active: hasImage2 }]"></div>
          <span>Image 2</span>
        </div>
      </div>

      <!-- Diff result -->
      <div v-else class="diff-result">
        <div class="diff-preview">
          <canvas ref="diffCanvas" class="diff-canvas"></canvas>
        </div>
        <div class="diff-info">
          <span class="info-label">Diff Result</span>
          <span class="info-detail">{{ diffSize }}</span>
        </div>
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useNode } from '@vue-flow/core'
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
const diffCanvas = ref(null)
const diffSize = ref('')

// VueFlow composables
const { node } = useNode()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

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

// Watch for changes in connected images and regenerate diff
watch([image1Src, image2Src], async () => {
  if (image1Src.value && image2Src.value) {
    await nextTick()
    await generateDiff()
  }
}, { immediate: true })

async function generateDiff() {
  if (!diffCanvas.value || !image1Src.value || !image2Src.value) return

  try {
    // Load both images
    const img1 = await loadImage(image1Src.value)
    const img2 = await loadImage(image2Src.value)

    // Determine the size - use the larger dimensions to fit both
    const maxWidth = Math.max(img1.width, img2.width)
    const maxHeight = Math.max(img1.height, img2.height)

    // Set canvas size
    const canvas = diffCanvas.value
    canvas.width = maxWidth
    canvas.height = maxHeight

    diffSize.value = `${maxWidth} × ${maxHeight}px`

    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Draw first image
    ctx.drawImage(img1, 0, 0, img1.width, img1.height)

    // Get image data for first image
    const imageData1 = ctx.getImageData(0, 0, maxWidth, maxHeight)

    // Clear and draw second image
    ctx.clearRect(0, 0, maxWidth, maxHeight)
    ctx.drawImage(img2, 0, 0, img2.width, img2.height)

    // Get image data for second image
    const imageData2 = ctx.getImageData(0, 0, maxWidth, maxHeight)

    // Create diff by comparing pixels and inverting colors
    const diffData = ctx.createImageData(maxWidth, maxHeight)

    for (let i = 0; i < imageData1.data.length; i += 4) {
      // Calculate absolute difference for each channel
      const rDiff = Math.abs(imageData1.data[i] - imageData2.data[i])
      const gDiff = Math.abs(imageData1.data[i + 1] - imageData2.data[i + 1])
      const bDiff = Math.abs(imageData1.data[i + 2] - imageData2.data[i + 2])


      // Invert the difference to make differences more visible
      diffData.data[i] = 255 - rDiff        // R
      diffData.data[i + 1] = 255 - gDiff    // G
      diffData.data[i + 2] = 255 - bDiff    // B
      diffData.data[i + 3] = 255            // A (full opacity)
    }

    // Draw the diff result
    ctx.putImageData(diffData, 0, 0)

  } catch (error) {
    console.error('Error generating diff:', error)
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Generate diff on mount if images are already connected
onMounted(async () => {
  if (image1Src.value && image2Src.value) {
    await nextTick()
    await generateDiff()
  }
})
</script>

<style scoped>
.diff-node-content {
  padding: var(--flora-space-3);
  min-width: 280px;
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

.diff-result {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.diff-preview {
  width: 100%;
  max-height: 300px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  background: var(--flora-color-bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.diff-canvas {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  display: block;
}

.diff-info {
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
  font-family: monospace;
}
</style>
