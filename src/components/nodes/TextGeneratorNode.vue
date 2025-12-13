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
            @change="onModelChange"
          >
            <option value="gpt-5">GPT-5</option>
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

          <!-- Number Input -->
          <BaseInput
            v-else-if="control.type === 'number'"
            :id="`control-${control.key}`"
            type="number"
            size="sm"
            :model-value="getParamValue(control.key, control.default)"
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
          <BaseLabel for="prompt-input">Prompt:</BaseLabel>
          <BaseTextarea
            id="prompt-input"
            v-model="localPrompt"
            placeholder="Enter your prompt here..."
            :rows="4"
          />
        </div>

        <!-- Generate button -->
        <div class="generate-section">
          <BaseButton
            variant="primary"
            size="md"
            :disabled="isGenerating || !localPrompt.trim()"
            @click="handleGenerate"
          >
            {{ isGenerating ? 'Generating...' : 'Generate Text' }}
          </BaseButton>
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
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLabel from '@/components/ui/BaseLabel.vue'
import replicateService from '@/services/replicate'
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

// Get connected images from incoming edges (uses PORT_TYPE)
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

// Get connected prompt from incoming edges (uses PORT_TYPE)
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

.text-generator-node-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
  padding: var(--flora-space-3);
  min-width: 320px;
  max-width: 500px;
}

.section-label {
  font-size: var(--flora-font-size-xs);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--flora-space-1);
}

.connected-images {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: var(--flora-space-2);
}

.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-medium) solid var(--flora-color-border-default);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.connected-prompt {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.prompt-preview {
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-tertiary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-secondary);
  max-height: 60px;
  overflow-y: auto;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.output-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
  padding: var(--flora-space-3);
  background: var(--flora-color-success-bg);
  border: var(--flora-border-width-thin) solid var(--flora-color-success-border);
  border-radius: var(--flora-radius-md);
}

.text-output {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-primary);
  line-height: var(--flora-line-height-normal);
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.status-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--flora-space-2);
  padding: var(--flora-space-6);
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-medium) dashed var(--flora-color-border-default);
}

.status-icon {
  font-size: var(--flora-font-size-3xl);
}

.status-info p {
  margin: 0;
  color: var(--flora-color-text-tertiary);
  font-size: var(--flora-font-size-sm);
  text-align: center;
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
  font-style: italic;
}
</style>
