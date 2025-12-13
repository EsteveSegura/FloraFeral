<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="[]"
    :outputs="['image']"
    icon="📷"
    :selected="selected"
    @action:upload="handleUpload"
  >
    <div
      class="image-node-content"
      @drop="handleDrop"
      @dragover.prevent
      @dragenter.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
    >
      <div
        v-if="nodeData.src"
        class="image-preview"
        :class="{ dragging: isDragging }"
      >
        <img :src="nodeData.src" :alt="nodeData.name || nodeData.label" />
      </div>
      <div
        v-else
        class="image-placeholder"
        :class="{ dragging: isDragging }"
      >
        <span class="placeholder-icon">🖼️</span>
        <p>{{ isDragging ? 'Drop image here' : 'No image' }}</p>
      </div>

      <BaseButton variant="success" size="md" @click="handleUpload">
        {{ nodeData.src ? 'Change Image' : 'Upload Image' }}
      </BaseButton>

      <div v-if="nodeData.name" class="image-info">
        <span class="info-label">File:</span>
        <span class="info-value">{{ nodeData.name }}</span>
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import BaseNode from '@/components/base/BaseNode.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

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

const isDragging = ref(false)

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Get the current node data from useNode composable
const nodeData = computed(() => node.data)

function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'

  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  input.click()
}

function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false

  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

function processFile(file) {
  const reader = new FileReader()
  reader.onload = (event) => {
    updateNodeData(props.id, {
      src: event.target.result,
      name: file.name
    })
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.image-node-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
  width: 200px;
}

.image-preview {
  width: 200px;
  height: 150px;
  border-radius: var(--flora-radius-md);
  overflow: hidden;
  border: var(--flora-border-width-medium) solid var(--flora-color-border-default);
  transition: border-color var(--flora-transition-fast);
  flex-shrink: 0;
}

.image-preview.dragging {
  border-color: var(--flora-color-accent);
  background: var(--flora-color-success-bg);
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--flora-color-bg-primary);
}

.image-placeholder {
  width: 200px;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--flora-color-bg-tertiary);
  border: var(--flora-border-width-medium) dashed var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  color: var(--flora-color-text-tertiary);
  transition: all var(--flora-transition-fast);
  flex-shrink: 0;
}

.image-placeholder.dragging {
  border-color: var(--flora-color-accent);
  background: var(--flora-color-success-bg);
  color: var(--flora-color-accent);
}

.placeholder-icon {
  font-size: var(--flora-font-size-3xl);
  margin-bottom: var(--flora-space-2);
}

.image-placeholder p {
  margin: 0;
  font-size: var(--flora-font-size-sm);
}

.image-info {
  display: flex;
  gap: var(--flora-space-2);
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-xs);
}

.info-label {
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-tertiary);
}

.info-value {
  color: var(--flora-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
