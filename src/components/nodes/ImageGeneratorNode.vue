<template>
  <div>
    <!-- Node Toolbar -->
    <NodeToolbar :is-visible="selected" :position="Position.Top" :offset="10">
    <div class="node-toolbar-content">
      <!-- Model Selector -->
      <div class="toolbar-control">
        <label for="model-select">Model:</label>
        <select
          id="model-select"
          :value="currentModel"
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
        </select>
      </div>

      <!-- Dynamic Controls from uiSchema -->
      <div
        v-for="control in controls"
        :key="control.key"
        class="toolbar-control"
      >
        <label :for="`control-${control.key}`">{{ control.label }}:</label>

        <!-- Select Control -->
        <select
          v-if="control.type === 'select'"
          :id="`control-${control.key}`"
          :value="getParamValue(control.key, control.default)"
          @change="onParamChange(control.key, $event.target.value)"
        >
          <option
            v-for="option in control.enum"
            :key="option"
            :value="option"
          >
            {{ option }}
          </option>
        </select>

        <!-- Text Input -->
        <input
          v-else-if="control.type === 'text'"
          :id="`control-${control.key}`"
          type="text"
          :value="getParamValue(control.key, control.default)"
          @input="onParamChange(control.key, $event.target.value)"
        />

        <!-- Number Input -->
        <input
          v-else-if="control.type === 'number'"
          :id="`control-${control.key}`"
          type="number"
          :value="getParamValue(control.key, control.default)"
          @input="onParamChange(control.key, parseFloat($event.target.value))"
        />

        <!-- Checkbox -->
        <input
          v-else-if="control.type === 'checkbox'"
          :id="`control-${control.key}`"
          type="checkbox"
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
        <label for="prompt">Prompt:</label>
        <textarea
          id="prompt"
          v-model="localPrompt"
          placeholder="Describe the image you want to generate..."
          rows="3"
          @blur="updatePrompt"
        ></textarea>
      </div>

      <!-- Show connected prompt info -->
      <div v-else class="connected-prompt-info">
        <div class="section-label">📝 Using connected prompt</div>
        <div class="prompt-preview">{{ connectedPrompt }}</div>
      </div>

      <!-- Generate button -->
      <div class="generate-section">
        <button
          class="generate-button"
          :disabled="isGenerating || (!connectedPrompt && !localPrompt.trim())"
          @click="handleGenerate"
        >
          {{ isGenerating ? 'Generating...' : 'Generate Image' }}
        </button>
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
import { useNode, useHandleConnections, useNodesData, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Position } from '@vue-flow/core'
import BaseNode from '@/components/base/BaseNode.vue'
import replicateService from '@/services/replicate'

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

// Get connected prompt from upstream prompt node or text generator node
const connectedPrompt = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    // Accept prompts from 'prompt' nodes or 'text-generator' nodes
    if (sourceNode && (sourceNode.type === 'prompt' || sourceNode.type === 'text-generator') && sourceNode.data?.prompt) {
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
  gap: 0.75rem;
  min-width: 280px;
}

.connected-images {
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.5rem;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
}

.thumbnail {
  width: 100%;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview {
  width: 100%;
  height: 180px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #eee;
  background: #fafafa;
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
  background: #f5f5f5;
  border: 2px dashed #ddd;
  border-radius: 4px;
  color: #999;
}

.placeholder-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.image-placeholder p {
  margin: 0;
  font-size: 0.85rem;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.prompt-section label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #555;
}

.prompt-section textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.85rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.prompt-section textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.connected-prompt-info {
  padding: 0.5rem;
  background: #f0f7ff;
  border-radius: 4px;
  border: 1px solid #d0e5ff;
}

.prompt-preview {
  font-size: 0.85rem;
  color: #333;
  margin-top: 0.25rem;
  padding: 0.25rem;
  background: white;
  border-radius: 3px;
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.generate-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.generate-button {
  width: 100%;
  padding: 0.6rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.2s;
}

.generate-button:hover:not(:disabled) {
  background: #1976D2;
}

.generate-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.input-info {
  font-size: 0.75rem;
  color: #666;
  text-align: center;
  padding: 0.25rem;
  background: #e3f2fd;
  border-radius: 4px;
  font-weight: 500;
}

/* Node Toolbar Styles */
.node-toolbar-content {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 2px solid #4CAF50;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.toolbar-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-control label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.toolbar-control select,
.toolbar-control input[type="text"],
.toolbar-control input[type="number"] {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
  transition: border-color 0.2s;
}

.toolbar-control select:focus,
.toolbar-control input[type="text"]:focus,
.toolbar-control input[type="number"]:focus {
  outline: none;
  border-color: #4CAF50;
}

.toolbar-control select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.toolbar-control input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
</style>
