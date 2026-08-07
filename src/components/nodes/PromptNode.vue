<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['prompt']"
    :outputs="['prompt']"
    icon="📝"
    :selected="selected"
  >
    <div class="prompt-node-content">
      <BaseTextarea
        v-model="localPrompt"
        placeholder="Enter your prompt here..."
        :rows="5"
        @blur="updatePrompt"
        @mousedown.stop
      />

      <div v-if="nodeData.prompt" class="character-count">
        {{ nodeData.prompt.length }} characters
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
import BaseNode from '@/components/base/BaseNode.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'

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

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Get input prompt from connected node, reaching past any reroute in between
const connectedPrompt = computed(() =>
  readUpstream(props.id, flowStore.nodes, flowStore.edges, pickPrompt, {
    portType: PORT_TYPES.PROMPT
  })
)

// Initialize local prompt with connected prompt or stored prompt
const localPrompt = ref(connectedPrompt.value || props.data.prompt || '')

// Watch for connected prompt changes
watch(connectedPrompt, (newConnectedPrompt) => {
  if (newConnectedPrompt !== null && newConnectedPrompt !== localPrompt.value) {
    localPrompt.value = newConnectedPrompt
  }
})

// Watch for external changes to prompt
watch(() => nodeData.value.prompt, (newPrompt) => {
  if (newPrompt !== localPrompt.value && !connectedPrompt.value) {
    localPrompt.value = newPrompt
  }
})

// Watch local prompt changes and update immediately
watch(localPrompt, (newPrompt) => {
  if (newPrompt !== nodeData.value.prompt) {
    updateNodeData(props.id, {
      prompt: newPrompt
    })
  }
})

function updatePrompt() {
  if (localPrompt.value !== nodeData.value.prompt) {
    updateNodeData(props.id, {
      prompt: localPrompt.value
    })
  }
}
</script>

<style scoped>
.prompt-node-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
  padding: var(--flora-space-3);
  min-width: 450px;
}

.character-count {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  text-align: right;
}
</style>
