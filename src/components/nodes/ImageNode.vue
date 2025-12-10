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

      <button class="upload-button" @click="handleUpload">
        {{ nodeData.src ? 'Change Image' : 'Upload Image' }}
      </button>

      <div v-if="nodeData.name" class="image-info">
        <span class="info-label">File:</span>
        <span class="info-value">{{ nodeData.name }}</span>
      </div>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFlowStore } from '@/stores/flow'
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
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const flowStore = useFlowStore()
const isDragging = ref(false)

// Get the current node data directly from store for reactivity
const nodeData = computed(() => {
  const node = flowStore.getNodeById(props.id)
  return node ? node.data : props.data
})

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
    flowStore.updateNodeData(props.id, {
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
  gap: 0.5rem;
}

.image-preview {
  width: 100%;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid #eee;
  transition: border-color 0.2s;
}

.image-preview.dragging {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 2px dashed #ddd;
  border-radius: 4px;
  color: #999;
  transition: all 0.2s;
}

.image-placeholder.dragging {
  border-color: #4CAF50;
  background: #f0f8f0;
  color: #4CAF50;
}

.placeholder-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.image-placeholder p {
  margin: 0;
  font-size: 0.85rem;
}

.upload-button {
  width: 100%;
  padding: 0.5rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.upload-button:hover {
  background: #45a049;
}

.image-info {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 0.75rem;
}

.info-label {
  font-weight: 600;
  color: #666;
}

.info-value {
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
</style>
