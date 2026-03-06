<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="[]"
    :outputs="[]"
    icon="💬"
    :selected="selected"
    :hide-header="true"
  >
    <div class="comment-node-content">
      <!-- Edit mode: show textarea when selected -->
      <textarea
        v-if="selected"
        ref="textareaRef"
        v-model="localComment"
        class="comment-textarea"
        placeholder="Write your comment here..."
        @blur="updateComment"
        @mousedown.stop
        @keydown.stop
      />
      <!-- View mode: show plain text when not selected -->
      <div v-else class="comment-text">
        {{ nodeData.comment || 'Double-click to add a comment...' }}
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import BaseNode from '@/components/base/BaseNode.vue'

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

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Template ref for textarea
const textareaRef = ref(null)

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

// Local comment state
const localComment = ref(props.data.comment || '')

// Watch for external changes to comment
watch(() => nodeData.value.comment, (newComment) => {
  if (newComment !== localComment.value) {
    localComment.value = newComment || ''
  }
})

// Watch local comment changes and update immediately
watch(localComment, (newComment) => {
  if (newComment !== nodeData.value.comment) {
    updateNodeData(props.id, {
      comment: newComment
    })
  }
})

// Focus textarea when entering edit mode
watch(() => props.selected, async (isSelected) => {
  if (isSelected) {
    await nextTick()
    textareaRef.value?.focus()
  }
})

function updateComment() {
  if (localComment.value !== nodeData.value.comment) {
    updateNodeData(props.id, {
      comment: localComment.value
    })
  }
}
</script>

<style scoped>
.comment-node-content {
  padding: var(--flora-space-3);
  min-width: 200px;
  min-height: 60px;
}

.comment-textarea {
  width: 100%;
  min-height: 80px;
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-secondary);
  border: 1px solid var(--flora-color-border);
  border-radius: var(--flora-radius-sm);
  color: var(--flora-color-text-primary);
  font-family: 'Inter', sans-serif;
  font-size: var(--flora-font-size-sm);
  line-height: 1.5;
  resize: both;
  outline: none;
}

.comment-textarea:focus {
  border-color: var(--flora-color-primary);
}

.comment-textarea::placeholder {
  color: var(--flora-color-text-tertiary);
}

.comment-text {
  color: var(--flora-color-text-secondary);
  font-family: 'Inter', sans-serif;
  font-size: var(--flora-font-size-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
