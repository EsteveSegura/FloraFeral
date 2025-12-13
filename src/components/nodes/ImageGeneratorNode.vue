<template>
  <div>
    <!-- Node Toolbar -->
    <NodeToolbar :is-visible="selected" :position="Position.Top" :offset="10">
    <div class="node-toolbar-content">
      <!-- Model Selector -->
      <div class="toolbar-control">
        <BaseLabel variant="toolbar" for="model-select">Model:</BaseLabel>
        <BaseSelect
          id="model-select"
          size="sm"
          :model-value="currentModel"
          :disabled="availableModels.length <= 1"
          @change="onModelChange"
        >
          <option
            v-for="modelId in availableModels"
            :key="modelId"
            :value="modelId"
          >
            {{ getModelLabel(modelId) }}
          </option>
        </BaseSelect>
      </div>

      <!-- Dynamic Controls from uiSchema -->
      <div
        v-for="control in controls"
        :key="control.key"
        class="toolbar-control"
      >
        <BaseLabel variant="toolbar" :for="`control-${control.key}`">{{ control.label }}:</BaseLabel>

        <!-- Select Control -->
        <BaseSelect
          v-if="control.type === 'select'"
          :id="`control-${control.key}`"
          size="sm"
          :model-value="getParamValue(control.key, control.default)"
          @change="onParamChange(control.key, $event.target.value)"
        >
          <option
            v-for="option in control.enum"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </BaseSelect>

        <!-- Text Input -->
        <BaseInput
          v-else-if="control.type === 'text'"
          :id="`control-${control.key}`"
          type="text"
          size="sm"
          :model-value="getParamValue(control.key, control.default)"
          @input="onParamChange(control.key, $event.target.value)"
        />

        <!-- Number Input -->
        <BaseInput
          v-else-if="control.type === 'number'"
          :id="`control-${control.key}`"
          type="number"
          size="sm"
          :model-value="getParamValue(control.key, control.default)"
          @input="onParamChange(control.key, parseFloat($event.target.value))"
        />

        <!-- Checkbox -->
        <BaseCheckbox
          v-else-if="control.type === 'checkbox'"
          :id="`control-${control.key}`"
          :checked="getParamValue(control.key, control.default)"
          @change="onParamChange(control.key, $event.target.checked)"
        />
      </div>
    </div>
  </NodeToolbar>

  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['image', 'prompt']"
    :outputs="['image']"
    :loading="isGenerating"
    :error="nodeData.error"
    icon="✨"
    :selected="selected"
    @action:run="handleGenerate"
  >
    <div class="generator-node-content">
      <!-- Connected images thumbnails -->
      <div v-if="connectedImages.length > 0" class="connected-images">
        <div class="section-label">Input Images:</div>
        <div class="thumbnails-grid">
          <div
            v-for="(img, index) in connectedImages"
            :key="index"
            class="thumbnail"
          >
            <img :src="img.src" :alt="`Input ${index + 1}`" />
          </div>
        </div>
      </div>

      <!-- Generated image preview -->
      <div v-if="nodeData.lastOutputSrc" class="image-preview">
        <img :src="nodeData.lastOutputSrc" :alt="nodeData.label" />
      </div>
      <div v-else class="image-placeholder">
        <span class="placeholder-icon">✨</span>
        <p>{{ isGenerating ? 'Generating...' : 'No image generated' }}</p>
      </div>

      <!-- Prompt input (hidden if there's a connected prompt) -->
      <div v-if="!connectedPrompt" class="prompt-section">
        <BaseLabel for="prompt">Prompt:</BaseLabel>
        <BaseTextarea
          id="prompt"
          v-model="localPrompt"
          placeholder="Describe the image you want to generate..."
          :rows="3"
          @blur="updatePrompt"
        />
      </div>

      <!-- Show connected prompt info -->
      <div v-else class="connected-prompt-info">
        <div class="section-label">📝 Using connected prompt</div>
        <div class="prompt-preview">{{ connectedPrompt }}</div>
      </div>

      <!-- Generate button -->
      <div class="generate-section">
        <BaseButton
          variant="primary"
          size="md"
          :disabled="isGenerating || (!connectedPrompt && !localPrompt.trim())"
          @click="handleGenerate"
        >
          {{ isGenerating ? 'Generating...' : 'Generate Image' }}
        </BaseButton>
        <div v-if="connectedImages.length > 0" class="input-info">
          Using {{ connectedImages.length }} input {{ connectedImages.length === 1 ? 'image' : 'images' }}
        </div>
      </div>
    </div>
  </BaseNode>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Position } from '@vue-flow/core'
import BaseNode from '@/components/base/BaseNode.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLabel from '@/components/ui/BaseLabel.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import replicateService from '@/services/replicate'
import { getEdgePortType } from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'

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
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const flowStore = useFlowStore()
const localPrompt = ref(props.data.prompt || '')
const isGenerating = ref(false)

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Get connected images from upstream nodes
// Using flowStore directly for reactivity
const connectedImages = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  return incomingEdges
    .map(edge => {
      // Check if this edge connects an IMAGE port
      const portType = getEdgePortType(edge, flowStore.nodes, nodeRegistry, true)
      if (portType !== PORT_TYPES.IMAGE) return null

      const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
      if (!sourceNode || !sourceNode.data) return null

      const imageSrc = sourceNode.data.src || sourceNode.data.lastOutputSrc
      if (!imageSrc) return null

      return {
        src: imageSrc,
        name: sourceNode.data.name || sourceNode.data.label
      }
    })
    .filter(img => img !== null)
})

// Get connected prompt from upstream nodes (uses PORT_TYPE instead of node type)
const connectedPrompt = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    // Check if this edge connects a PROMPT port
    const portType = getEdgePortType(edge, flowStore.nodes, nodeRegistry, true)
    if (portType !== PORT_TYPES.PROMPT) continue

    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    if (sourceNode && sourceNode.data?.prompt) {
      return sourceNode.data.prompt
    }
  }

  return null
})

// Toolbar controls - Available models (only image generation models)
const availableModels = computed(() => replicateService.listModels('image'))

// Current model from node data
const currentModel = computed(() => nodeData.value.model || 'nano-banana-pro')

// Get UI schema for current model
const uiSchema = computed(() => {
  if (!currentModel.value) return null
  return replicateService.getModelUiSchema(currentModel.value)
})

// Controls to render
const controls = computed(() => uiSchema.value?.controls || [])

// Get model label from uiSchema
function getModelLabel(modelId) {
  const schema = replicateService.getModelUiSchema(modelId)
  return schema?.label || modelId
}

// Get current parameter value
function getParamValue(key, defaultValue) {
  return nodeData.value.params?.[key] ?? defaultValue
}

// Handle model change
function onModelChange(event) {
  const newModel = event.target.value
  const defaults = replicateService.getModelDefaults(newModel)

  updateNodeData(props.id, {
    model: newModel,
    params: defaults
  })
}

// Handle parameter change
function onParamChange(key, value) {
  const currentParams = nodeData.value.params || {}

  updateNodeData(props.id, {
    params: {
      ...currentParams,
      [key]: value
    }
  })
}

// Watch for external changes to prompt
watch(() => nodeData.value.prompt, (newPrompt) => {
  if (newPrompt !== localPrompt.value) {
    localPrompt.value = newPrompt
  }
})

function updatePrompt() {
  if (localPrompt.value !== nodeData.value.prompt) {
    updateNodeData(props.id, {
      prompt: localPrompt.value
    })
  }
}

async function handleGenerate() {
  // Use connected prompt if available, otherwise use local textarea prompt
  const promptToUse = connectedPrompt.value || localPrompt.value
  if (!promptToUse.trim() || isGenerating.value) return

  isGenerating.value = true

  try {
    // Update prompt before generating
    updateNodeData(props.id, {
      prompt: promptToUse
    })

    // Prepare input images from connected nodes
    // The API accepts HTTP URLs and data URLs (base64)
    const inputImages = connectedImages.value
      .map(img => img.src)
      .filter(src => {
        if (!src) return false
        // Accept HTTP/HTTPS URLs and data URLs
        return src.startsWith('http://') ||
               src.startsWith('https://') ||
               src.startsWith('data:')
      })

    // Get model and params from node data
    const model = nodeData.value.model || 'nano-banana-pro'
    const params = nodeData.value.params || {}

    // Call Replicate API
    const result = await replicateService.generateImage({
      prompt: promptToUse,
      imageSrc: inputImages.length > 0 ? inputImages : null,
      model,
      params
    })

    // Update node with generated image
    updateNodeData(props.id, {
      prompt: promptToUse,
      lastOutputSrc: result.imageUrl,
      model: result.model,
      generationId: result.id,
      // Keep existing model params - don't overwrite them
      params: nodeData.value.params || {},
      // Store generation metadata separately
      generationMetadata: {
        inputImagesCount: inputImages.length,
        connectedNodesCount: connectedImages.value.length,
        usedInputImages: inputImages.length > 0,
        isMock: result.isMock || false
      }
    })
  } catch (error) {
    console.error('Error generating image:', error)

    // Show error to user
    updateNodeData(props.id, {
      error: error.message || 'Failed to generate image'
    })

    // Clear error after 5 seconds
    setTimeout(() => {
      updateNodeData(props.id, {
        error: null
      })
    }, 5000)
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.generator-node-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
  min-width: 280px;
}

.connected-images {
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
}

.section-label {
  font-size: var(--flora-font-size-xs);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-tertiary);
  margin-bottom: var(--flora-space-2);
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: var(--flora-space-2);
}

.thumbnail {
  width: 100%;
  height: 60px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview {
  width: 100%;
  height: 180px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  background: var(--flora-color-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-placeholder {
  width: 100%;
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--flora-color-bg-tertiary);
  border: var(--flora-border-width-medium) dashed var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  color: var(--flora-color-text-tertiary);
}

.placeholder-icon {
  font-size: var(--flora-font-size-3xl);
  margin-bottom: var(--flora-space-2);
}

.image-placeholder p {
  margin: 0;
  font-size: var(--flora-font-size-sm);
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.connected-prompt-info {
  padding: var(--flora-space-2);
  background: var(--flora-color-info-bg);
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-thin) solid var(--flora-color-info-border);
}

.prompt-preview {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-primary);
  margin-top: var(--flora-space-1);
  padding: var(--flora-space-2);
  background: var(--flora-color-surface);
  border-radius: var(--flora-radius-sm);
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.generate-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.input-info {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  text-align: center;
  padding: var(--flora-space-2);
  background: var(--flora-color-info-bg);
  border-radius: var(--flora-radius-md);
  font-weight: var(--flora-font-weight-medium);
}

/* Node Toolbar Styles */
.node-toolbar-content {
  display: flex;
  gap: var(--flora-space-4);
  padding: var(--flora-space-3);
  background: var(--flora-color-surface);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  box-shadow: var(--flora-shadow-lg);
  max-width: 800px;
  flex-wrap: wrap;
}

.toolbar-control {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
  min-width: 120px;
}
</style>
