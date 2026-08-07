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
import { PORT_TYPES } from '@/lib/node-shapes'
import { readUpstream, pickPrompt } from '@/lib/upstream'
import { extractVariables, applyVariables } from '@/lib/prompt-template'
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

// Get input prompt from connected node, reaching past any reroute in between
const inputPrompt = computed(() =>
  readUpstream(props.id, flowStore.nodes, flowStore.edges, pickPrompt, {
    portType: PORT_TYPES.PROMPT
  }) || ''
)

// Detect variables in the input prompt
const detectedVariables = computed(() => extractVariables(inputPrompt.value))

// Generate output prompt with replaced variables
const outputPrompt = computed(() => applyVariables(inputPrompt.value, localVariables.value))

// Resync local state when variables are replaced from outside the component
// (flow import, undo, batch run).
// Must be sync: `watch(outputPrompt)` below republishes `variables` from local
// state, so if this adoption waited for the next flush it would lose the race
// and the external values would be silently reverted.
watch(() => nodeData.value.variables, (newVariables) => {
  if (newVariables && newVariables !== localVariables.value) {
    localVariables.value = newVariables
  }
}, { flush: 'sync' })

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
