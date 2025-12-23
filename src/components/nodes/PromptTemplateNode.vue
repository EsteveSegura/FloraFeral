<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['prompt']"
    :outputs="['prompt']"
    icon="🔧"
    :selected="selected"
  >
    <div class="prompt-template-content">
      <div v-if="detectedVariables.length === 0" class="no-template">
        Connect a prompt with {{VARIABLES}}
      </div>

      <!-- Variables Section -->
      <div v-if="detectedVariables.length > 0" class="variables-list">
        <div
          v-for="variable in detectedVariables"
          :key="variable"
          class="variable-item"
        >
          <label class="variable-name">{{ variable }}</label>
          <BaseInput
            v-model="localVariables[variable]"
            :placeholder="`Enter ${variable}`"
            @blur="updateVariables"
            @mousedown.stop
          />
        </div>
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { getEdgePortType } from '@/lib/connection'
import { PORT_TYPES } from '@/lib/node-shapes'
import nodeRegistry from '@/lib/node-registry'
import BaseNode from '@/components/base/BaseNode.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

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

// Local state for variables
const localVariables = ref(props.data.variables || {})

// Get input prompt from connected node
const inputPrompt = computed(() => {
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

  return ''
})

// Detect variables in the input prompt
const detectedVariables = computed(() => {
  if (!inputPrompt.value) return []

  const regex = /\{\{([^}]+)\}\}/g
  const variables = []
  let match

  while ((match = regex.exec(inputPrompt.value)) !== null) {
    const variableName = match[1].trim()
    if (!variables.includes(variableName)) {
      variables.push(variableName)
    }
  }

  return variables
})

// Generate output prompt with replaced variables
const outputPrompt = computed(() => {
  if (!inputPrompt.value) return ''

  let result = inputPrompt.value

  // Replace each variable with its value, or remove if empty
  detectedVariables.value.forEach(variable => {
    const value = localVariables.value[variable]
    const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g')

    if (value && value.trim()) {
      // Replace with value if it exists and is not empty
      result = result.replace(regex, value)
    } else {
      // Remove the variable placeholder if no value
      result = result.replace(regex, '')
    }
  })

  return result
})

// Watch for changes in detected variables and initialize missing ones
watch(detectedVariables, (newVars) => {
  const updated = { ...localVariables.value }
  let hasChanges = false

  newVars.forEach(variable => {
    if (!(variable in updated)) {
      updated[variable] = ''
      hasChanges = true
    }
  })

  if (hasChanges) {
    localVariables.value = updated
    updateVariables()
  }
}, { immediate: true })

// Watch local variables changes and update node data + output
watch(localVariables, (newVars) => {
  updateNodeData(props.id, {
    variables: newVars,
    prompt: outputPrompt.value
  })
}, { deep: true })

// Watch output prompt and update node data
watch(outputPrompt, (newOutput) => {
  if (newOutput !== nodeData.value.prompt) {
    updateNodeData(props.id, {
      prompt: newOutput,
      variables: localVariables.value
    })
  }
})

function updateVariables() {
  updateNodeData(props.id, {
    variables: localVariables.value,
    prompt: outputPrompt.value
  })
}
</script>

<style scoped>
.prompt-template-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
  padding: var(--flora-space-3);
  min-width: 300px;
}

.no-template {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-tertiary);
  text-align: center;
  padding: var(--flora-space-4);
  font-style: italic;
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
}

.variable-item {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.variable-name {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-secondary);
  font-weight: var(--flora-font-weight-medium);
  font-family: var(--flora-font-family-mono);
}
</style>
