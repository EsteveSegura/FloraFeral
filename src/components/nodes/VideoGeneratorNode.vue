<template>
  <div>
    <!-- Node Toolbar: hides itself unless this node is the only one selected -->
    <NodeToolbar :position="Position.Top" :offset="10">
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
            @change="onParamChange(control.key, castParamValue(control, $event.target.value))"
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

          <!-- Checkbox -->
          <BaseCheckbox
            v-else-if="control.type === 'checkbox'"
            :id="`control-${control.key}`"
            :model-value="getParamValue(control.key, control.default)"
            @change="onParamChange(control.key, $event.target.checked)"
          />
        </div>

        <!-- The toolbar is one row and does not scale past a handful of
             controls, so the rest of the model options live in a side panel -->
        <button
          v-if="advancedControls.length"
          class="toolbar-more"
          type="button"
          title="More options"
          @click="openPanel(PANEL_TYPES.NODE_OPTIONS, { nodeId: id })"
        >
          ⋮
        </button>
      </div>
    </NodeToolbar>

    <BaseNode
      :id="id"
      :type="type"
      :data="nodeData"
      :label="nodeData.label"
      :inputs="inputPorts"
      :outputs="['video']"
      :loading="isGenerating"
      :error="nodeData.error"
      icon="🎬"
      :selected="selected"
      :execution-status="executionStatus"
      @action:run="handleGenerate"
    >
      <div class="video-generator-node-content">
        <!-- Connected frame images -->
        <div v-if="firstFrameImage || lastFrameImage" class="connected-images">
          <div class="section-label">Frames:</div>
          <div class="frames-grid">
            <div v-if="firstFrameImage" class="frame">
              <img :src="firstFrameImage" alt="First frame" />
              <span class="frame-caption">First</span>
            </div>
            <div v-if="lastFrameImage" class="frame">
              <img :src="lastFrameImage" alt="Last frame" />
              <span class="frame-caption">Last</span>
            </div>
          </div>
        </div>

        <!-- Generated video preview -->
        <div v-if="nodeData.lastOutputVideoSrc" class="video-preview nodrag">
          <video
            :src="nodeData.lastOutputVideoSrc"
            controls
            loop
            playsinline
            @mousedown.stop
          ></video>
          <BaseButton variant="primary" size="sm" @click="showVideoPreview = true">
            Open preview
          </BaseButton>
        </div>
        <div v-else class="video-placeholder">
          <span class="placeholder-icon">🎬</span>
          <p>{{ isGenerating ? 'Generating video...' : 'No video generated' }}</p>
        </div>

        <!-- Prompt input (hidden if there's a connected prompt) -->
        <div v-if="!connectedPrompt" class="prompt-section">
          <BaseLabel for="prompt">Prompt:</BaseLabel>
          <BaseTextarea
            id="prompt"
            v-model="localPrompt"
            placeholder="Describe the video you want to generate..."
            :rows="3"
            @blur="updatePrompt"
            @mousedown.stop
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
            {{ isGenerating ? 'Generating...' : 'Generate Video' }}
          </BaseButton>
          <div v-if="firstFrameImage" class="input-info">
            Image-to-video{{ lastFrameImage ? ' with last frame reference' : '' }}
          </div>
        </div>
      </div>
    </BaseNode>

    <!-- Video Preview Modal -->
    <BaseModal
      v-model="showVideoPreview"
      :show-header="false"
      :show-footer="false"
      size="xl"
    >
      <div class="video-preview-modal">
        <video :src="nodeData.lastOutputVideoSrc" controls autoplay loop playsinline></video>
      </div>
    </BaseModal>
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
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import replicateService from '@/services/replicate'
import { getEdgePortType } from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import { convertUrlToBase64, isHttpUrl } from '@/lib/image-utils'
import { useWorkflowEvents } from '@/composables/useWorkflowEvents'
import { useSidePanel, PANEL_TYPES } from '@/composables/useSidePanel'

const DEFAULT_MODEL = 'p-video'

/**
 * Handles of the two image inputs. Both carry PORT_TYPES.IMAGE, so the handle
 * id is what tells the first frame apart from the last frame reference
 */
const LAST_FRAME_HANDLE = 'input-0'
const FIRST_FRAME_HANDLE = 'input-1'

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
const showVideoPreview = ref(false)

// Workflow execution integration
const { onExecutionRequested, executionStatus } = useWorkflowEvents(props.id)

// Register handler for workflow execution
onExecutionRequested(async () => {
  await handleGenerate()
})

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Handle labels: two image ports need to be distinguishable on the canvas
const inputPorts = [
  { type: PORT_TYPES.IMAGE, label: 'last frame' },
  { type: PORT_TYPES.IMAGE, label: 'image' },
  { type: PORT_TYPES.PROMPT }
]

/**
 * Read the image coming into one of this node's image handles
 * @param {string} handleId - Target handle id
 * @returns {string|null} Image src or null when nothing is connected
 */
function readImageOnHandle(handleId) {
  const edge = flowStore.edges.find(
    e => e.target === props.id && e.targetHandle === handleId
  )
  if (!edge) return null

  const portType = getEdgePortType(edge, flowStore.nodes, nodeRegistry, true)
  if (portType !== PORT_TYPES.IMAGE) return null

  const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
  if (!sourceNode || !sourceNode.data) return null

  return sourceNode.data.src || sourceNode.data.lastOutputSrc || null
}

// First frame of the video (image-to-video)
const firstFrameImage = computed(() => readImageOnHandle(FIRST_FRAME_HANDLE))

// Reference image for the last frame
const lastFrameImage = computed(() => readImageOnHandle(LAST_FRAME_HANDLE))

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

// Toolbar controls - Available models (only video generation models)
const availableModels = computed(() => replicateService.listModels('video'))

// Current model from node data
const currentModel = computed(() => nodeData.value.model || DEFAULT_MODEL)

// Get UI schema for current model
const uiSchema = computed(() => {
  if (!currentModel.value) return null
  return replicateService.getModelUiSchema(currentModel.value)
})

// Controls to render
const controls = computed(() => uiSchema.value?.controls || [])

// Model options that go to the side panel instead of the toolbar
const advancedControls = computed(() => uiSchema.value?.advancedControls || [])

const { openPanel } = useSidePanel()

// Get model label from uiSchema
function getModelLabel(modelId) {
  const schema = replicateService.getModelUiSchema(modelId)
  return schema?.label || modelId
}

// Get current parameter value
function getParamValue(key, defaultValue) {
  return nodeData.value.params?.[key] ?? defaultValue
}

/**
 * Selects always hand back strings; numeric enums (fps) must stay numeric so
 * the value survives serialization and reaches the API as a number
 */
function castParamValue(control, rawValue) {
  if (typeof control.default !== 'number') return rawValue

  const parsed = Number(rawValue)
  return Number.isNaN(parsed) ? rawValue : parsed
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

/**
 * Only HTTP URLs and data URLs can be sent to the API
 */
function isUsableImageSrc(src) {
  if (!src) return false
  return isHttpUrl(src) || src.startsWith('data:')
}

async function handleGenerate() {
  // Use connected prompt if available, otherwise use local textarea prompt
  const promptToUse = connectedPrompt.value || localPrompt.value

  // Already generating - skip
  if (isGenerating.value) return

  // No prompt available - throw error so workflow executor knows this node failed
  if (!promptToUse.trim()) {
    throw new Error('No prompt available. Connect a prompt node or enter a prompt.')
  }

  isGenerating.value = true

  try {
    // Update prompt before generating
    updateNodeData(props.id, {
      prompt: promptToUse
    })

    const imageSrc = isUsableImageSrc(firstFrameImage.value) ? firstFrameImage.value : null
    const lastFrame = isUsableImageSrc(lastFrameImage.value) ? lastFrameImage.value : null

    // Get model and params from node data
    const model = nodeData.value.model || DEFAULT_MODEL
    const params = nodeData.value.params || {}

    // Call Replicate API
    const result = await replicateService.generateVideo({
      prompt: promptToUse,
      imageSrc,
      lastFrameImage: lastFrame,
      model,
      params
    })

    // Convert video URL to base64 for persistence: Replicate output URLs are
    // short-lived and flows are saved as standalone JSON files
    let videoData = result.videoUrl
    if (isHttpUrl(result.videoUrl)) {
      console.log('Converting Replicate video URL to base64 for persistence...')
      try {
        videoData = await convertUrlToBase64(result.videoUrl)
        console.log('Video converted to base64 successfully')
      } catch (error) {
        console.warn('Failed to convert video to base64, using original URL:', error)
        // Fallback to original URL if conversion fails
        videoData = result.videoUrl
      }
    }

    // Update node with generated video
    updateNodeData(props.id, {
      prompt: promptToUse,
      lastOutputVideoSrc: videoData,
      model: result.model,
      generationId: result.id,
      // Keep existing model params - don't overwrite them
      params: nodeData.value.params || {},
      // Store generation metadata separately
      generationMetadata: {
        usedFirstFrame: !!imageSrc,
        usedLastFrame: !!lastFrame
      }
    })
  } catch (error) {
    console.error('Error generating video:', error)

    // Show error to user
    updateNodeData(props.id, {
      error: error.message || 'Failed to generate video'
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
.video-generator-node-content {
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

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: var(--flora-space-2);
}

.frame {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
  align-items: center;
}

.frame img {
  width: 100%;
  height: 60px;
  object-fit: cover;
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
}

.frame-caption {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
}

.video-preview {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.video-preview video {
  width: 100%;
  max-height: 220px;
  border-radius: var(--flora-radius-md);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  background: var(--flora-color-bg-tertiary);
}

.video-placeholder {
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

.video-placeholder p {
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

/* Pushed to the far right, and kept there even when the toolbar wraps */
.toolbar-more {
  margin-left: auto;
  align-self: center;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  font-size: var(--flora-font-size-lg);
  line-height: 1;
  color: var(--flora-color-text-secondary);
  transition: all var(--flora-transition-fast);
  padding: 0;
}

.toolbar-more:hover {
  background: var(--flora-color-bg-secondary);
  color: var(--flora-color-text-primary);
}

/* Video Preview Modal */
.video-preview-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 500px;
  padding: var(--flora-space-4);
}

.video-preview-modal video {
  max-width: 100%;
  max-height: 80vh;
  border-radius: var(--flora-radius-md);
}
</style>
