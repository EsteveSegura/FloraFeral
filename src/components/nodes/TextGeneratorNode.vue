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
            @change="onModelChange"
          >
            <option value="gpt-5">GPT-5</option>
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

          <!-- Number Input -->
          <input
            v-else-if="control.type === 'number'"
            :id="`control-${control.key}`"
            type="number"
            :value="getParamValue(control.key, control.default)"
            :min="control.min"
            :max="control.max"
            @input="onParamChange(control.key, $event.target.value ? parseInt($event.target.value) : null)"
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
      :outputs="['prompt']"
      :loading="isGenerating"
      :error="nodeData.error"
      icon="💬"
      :selected="selected"
      @action:run="handleGenerate"
    >
      <div class="text-generator-node-content">
        <!-- Connected images thumbnails -->
        <div v-if="connectedImages.length > 0" class="connected-images">
          <div class="section-label">Input Images:</div>
          <div class="thumbnails-grid">
            <div
              v-for="(img, index) in connectedImages"
              :key="index"
              class="thumbnail"
            >
              <img :src="img.src" :alt="img.name" />
            </div>
          </div>
        </div>

        <!-- Connected prompt -->
        <div v-if="connectedPrompt" class="connected-prompt">
          <div class="section-label">Input Prompt:</div>
          <div class="prompt-preview">{{ connectedPrompt }}</div>
        </div>

        <!-- Prompt input -->
        <div class="prompt-section">
          <label for="prompt-input">Prompt:</label>
          <textarea
            id="prompt-input"
            v-model="localPrompt"
            placeholder="Enter your prompt here..."
            rows="4"
          ></textarea>
        </div>

        <!-- Generate button -->
        <div class="generate-section">
          <button
            class="generate-button"
            :disabled="isGenerating || !localPrompt.trim()"
            @click="handleGenerate"
          >
            {{ isGenerating ? 'Generating...' : 'Generate Text' }}
          </button>
          <div v-if="connectedImages.length > 0" class="input-info">
            Using {{ connectedImages.length }} input {{ connectedImages.length === 1 ? 'image' : 'images' }}
          </div>
        </div>

        <!-- Generated text output -->
        <div v-if="nodeData.generatedText" class="output-section">
          <div class="section-label">Generated Text:</div>
          <div class="text-output">{{ nodeData.generatedText }}</div>
        </div>

        <!-- Status info -->
        <div v-if="!nodeData.generatedText && !isGenerating" class="status-info">
          <div class="status-icon">💬</div>
          <p>Enter prompt and click "Generate Text"</p>
        </div>
      </div>
    </BaseNode>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNode, useVueFlow, Position } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { useFlowStore } from '@/stores/flow'
import BaseNode from '@/components/base/BaseNode.vue'
import replicateService from '@/services/replicate'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false }
})

const flowStore = useFlowStore()
const isGenerating = ref(false)
const localPrompt = ref('')
const currentModel = ref('gpt-5')

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Get UI controls for the current model
const controls = computed(() => {
  const uiSchema = replicateService.getModelUiSchema(currentModel.value)
  return uiSchema ? uiSchema.controls : []
})

// Get connected images from incoming edges
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

// Get connected prompt from incoming edges
const connectedPrompt = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    if (sourceNode && sourceNode.type === 'prompt' && sourceNode.data?.prompt) {
      return sourceNode.data.prompt
    }
  }

  return null
})

// Initialize local prompt from node data only on mount
if (nodeData.value.userPrompt) {
  localPrompt.value = nodeData.value.userPrompt
}

// Update node data when local prompt changes (store as userPrompt)
watch(localPrompt, (newPrompt) => {
  updateNodeData(props.id, { userPrompt: newPrompt })
})

// Handle model change
function onModelChange(event) {
  currentModel.value = event.target.value
  updateNodeData(props.id, {
    model: currentModel.value,
    params: {}
  })
}

// Get parameter value
function getParamValue(key, defaultValue) {
  return nodeData.value.params?.[key] ?? defaultValue
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

// Handle text generation
async function handleGenerate() {
  if (isGenerating.value) return

  try {
    isGenerating.value = true
    updateNodeData(props.id, { error: null })

    // Use connected prompt if available, otherwise use local prompt
    const promptToUse = connectedPrompt.value || localPrompt.value

    if (!promptToUse || !promptToUse.trim()) {
      throw new Error('Please provide a prompt')
    }

    // Collect connected images
    const imageSources = connectedImages.value.map(img => img.src)

    console.log('Generating text with GPT-5:')
    console.log('  Prompt:', promptToUse.substring(0, 50) + '...')
    console.log('  Images:', imageSources.length)
    console.log('  Model:', currentModel.value)
    console.log('  Params:', nodeData.value.params)

    // Call the text generation service
    const result = await replicateService.generateText({
      prompt: promptToUse,
      imageSrc: imageSources.length > 0 ? imageSources : null,
      model: currentModel.value,
      params: nodeData.value.params || {}
    })

    console.log('Text generation result:', result)

    // Update node with generated text (keep userPrompt separate)
    updateNodeData(props.id, {
      generatedText: result.text,
      prompt: result.text, // Set as prompt output for downstream nodes
      lastGenerationId: result.id,
      error: null
      // userPrompt stays unchanged
    })

  } catch (error) {
    console.error('Text generation error:', error)
    updateNodeData(props.id, {
      error: error.message || 'Failed to generate text'
    })
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.node-toolbar-content {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  flex-wrap: wrap;
}

.toolbar-control {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
}

.toolbar-control label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #666;
}

.toolbar-control select,
.toolbar-control input {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  background: white;
}

.toolbar-control select:focus,
.toolbar-control input:focus {
  outline: none;
  border-color: #4CAF50;
}

.text-generator-node-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  min-width: 320px;
  max-width: 500px;
}

.section-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 0.25rem;
}

.connected-images {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
}

.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid #eee;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.connected-prompt {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-preview {
  padding: 0.5rem;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #333;
  max-height: 60px;
  overflow-y: auto;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prompt-section label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.prompt-section textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
}

.prompt-section textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.output-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f0f8f0;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
}

.text-output {
  font-size: 0.85rem;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 2px dashed #ddd;
}

.status-icon {
  font-size: 2rem;
}

.status-info p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  text-align: center;
}

.generate-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.generate-button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #E91E63 0%, #C2185B 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(233, 30, 99, 0.2);
}

.generate-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #C2185B 0%, #AD1457 100%);
  box-shadow: 0 4px 8px rgba(233, 30, 99, 0.3);
  transform: translateY(-1px);
}

.generate-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

.input-info {
  font-size: 0.8rem;
  color: #666;
  text-align: center;
  font-style: italic;
}
</style>
