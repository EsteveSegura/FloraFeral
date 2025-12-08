<template>
  <div
    v-if="shouldShow"
    class="node-navbar"
    :style="navbarStyle"
  >
    <div class="navbar-container">
      <!-- Model Selector -->
      <div class="navbar-control">
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
        class="navbar-control"
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

        <!-- Fallback to text -->
        <input
          v-else
          :id="`control-${control.key}`"
          type="text"
          :value="getParamValue(control.key, control.default)"
          @input="onParamChange(control.key, $event.target.value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFlowStore } from '@/stores/flow'
import replicateService from '@/services/replicate'

const props = defineProps({
  nodeId: {
    type: String,
    required: true
  }
})

const flowStore = useFlowStore()

// Get the current node
const node = computed(() => flowStore.getNodeById(props.nodeId))

// Only show navbar for image-generator nodes
const shouldShow = computed(() => {
  return node.value && node.value.type === 'image-generator'
})

// Available models
const availableModels = computed(() => replicateService.listModels())

// Current model from node data
const currentModel = computed(() => {
  return node.value?.data?.model || 'nano-banana-pro'
})

// Get UI schema for current model
const uiSchema = computed(() => {
  if (!currentModel.value) return null
  return replicateService.getModelUiSchema(currentModel.value)
})

// Controls to render
const controls = computed(() => {
  return uiSchema.value?.controls || []
})

// Get model label from uiSchema
function getModelLabel(modelId) {
  const schema = replicateService.getModelUiSchema(modelId)
  return schema?.label || modelId
}

// Get current parameter value
function getParamValue(key, defaultValue) {
  return node.value?.data?.params?.[key] ?? defaultValue
}

// Handle model change
function onModelChange(event) {
  const newModel = event.target.value

  // Get defaults for the new model
  const defaults = replicateService.getModelDefaults(newModel)

  // Update node with new model and reset params to defaults
  flowStore.updateNodeData(props.nodeId, {
    model: newModel,
    params: defaults
  })
}

// Handle parameter change
function onParamChange(key, value) {
  const currentParams = node.value?.data?.params || {}

  flowStore.updateNodeData(props.nodeId, {
    params: {
      ...currentParams,
      [key]: value
    }
  })
}

// Calculate navbar position based on node position
const navbarStyle = computed(() => {
  if (!node.value) return {}

  const nodePosition = node.value.position
  const nodeWidth = 300 // Approximate node width
  const navbarOffset = 10 // Distance above node

  return {
    left: `${nodePosition.x + nodeWidth / 2}px`, // Center of the node
    top: `${nodePosition.y - 60 - navbarOffset}px`, // Position above node (navbar height ~60px)
    transform: 'translateX(-50%)', // Center the navbar
    minWidth: `${nodeWidth}px`
  }
})
</script>

<style scoped>
.node-navbar {
  position: absolute;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border: 2px solid #4CAF50;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  padding: 0.75rem 1rem;
  pointer-events: auto;
}

.navbar-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  max-width: 100%;
}

.navbar-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar-control label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.navbar-control select,
.navbar-control input[type="text"],
.navbar-control input[type="number"] {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
  min-width: 120px;
  transition: border-color 0.2s;
}

.navbar-control select:focus,
.navbar-control input[type="text"]:focus,
.navbar-control input[type="number"]:focus {
  outline: none;
  border-color: #4CAF50;
}

.navbar-control select:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.6;
}

.navbar-control input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .navbar-container {
    flex-direction: column;
    align-items: stretch;
  }

  .navbar-control {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }

  .navbar-control select,
  .navbar-control input[type="text"],
  .navbar-control input[type="number"] {
    width: 100%;
  }
}
</style>
