<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="[]"
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

const localPrompt = ref(props.data.prompt || '')

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

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
</script>

<style scoped>
.prompt-node-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
  padding: var(--flora-space-3);
  min-width: 250px;
}

.character-count {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  text-align: right;
}
</style>
