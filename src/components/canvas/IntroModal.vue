<template>
  <BaseModal
    v-model="isOpen"
    title="Welcome to Flora Feral"
    size="md"
    :show-footer="false"
    :show-header="false"
  >
    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="onFileSelected"
    />

    <div class="intro-content">
      <!-- New Section -->
      <div class="files-section">
        <div class="section-title">New</div>
        <button class="file-item" @click="startBlank">
          <img src="@/assets/new-file.svg" alt="" class="file-icon" />
          <span class="file-name">Blank canvas</span>
        </button>
      </div>

      <!-- Files Section -->
      <div class="files-section">
        <div class="section-title">Files</div>

        <!-- Open file option -->
        <button class="file-item" @click="openFile">
          <img src="@/assets/folder.svg" alt="" class="file-icon" />
          <span class="file-name">Open file ...</span>
        </button>

        <!-- Example flows -->
        <button
          v-for="example in examples"
          :key="example.id"
          class="file-item"
          @click="loadExample(example)"
        >
          <img src="@/assets/file-edit.svg" alt="" class="file-icon" />
          <span class="file-name">{{ example.title }}</span>
        </button>
      </div>

      <!-- Help Link -->
      <div class="help-section">
        <p class="help-text">
          If you need help getting started,
          <a
            href="https://youtu.be/ukJTEuO4QUU"
            target="_blank"
            rel="noopener noreferrer"
            class="help-link"
          >
            watch this video
          </a>
        </p>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import BaseModal from '@/components/ui/BaseModal.vue'
import { useFlowStore } from '@/stores/flow'
import { importFlow, loadFlowFromFile } from '@/lib/flow-io'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const flowStore = useFlowStore()
const { addEdges } = useVueFlow()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const examples = [
  {
    id: 'windows-xp',
    title: 'Recreate Windows XP Wallpaper',
    file: '/examples/recreate_windows-xp_wallpapper.json'
  },
  {
    id: 'materials',
    title: 'Materials Creation',
    file: '/examples/materials_creation.json'
  },
  {
    id: 'toy-packaging',
    title: 'Toy Packaging',
    file: '/examples/toy_packaging.json'
  }
]

// Hidden file input for opening files
const fileInput = ref(null)

async function loadExample(example) {
  try {
    const response = await fetch(example.file)

    if (!response.ok) {
      throw new Error(`Failed to load example: ${response.statusText}`)
    }

    const flowData = await response.json()

    // Import the flow using flow-io
    const result = await importFlow(flowData, flowStore, { addEdges })

    if (result.success) {
      // Close modal
      isOpen.value = false
    } else {
      alert(`Failed to load example: ${result.error}`)
    }
  } catch (error) {
    console.error('Error loading example:', error)
    alert(`Failed to load example: ${error.message}`)
  }
}

function openFile() {
  // Trigger file input
  if (fileInput.value) {
    fileInput.value.click()
  }
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const result = await loadFlowFromFile(file, flowStore, { addEdges })

    if (result.success) {
      // Close modal
      isOpen.value = false
      // Clear file input for next import
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    } else {
      alert(`Failed to load file: ${result.error}`)
    }
  } catch (error) {
    console.error('Error loading file:', error)
    alert(`Failed to load file: ${error.message}`)
  }
}

function startBlank() {
  // Just close the modal, canvas is already blank
  isOpen.value = false
}
</script>

<style scoped>
.intro-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-6);
  padding: var(--flora-space-4);
}

/* Files Section */
.files-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section-title {
  font-size: var(--flora-font-size-lg);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
  padding: var(--flora-space-2) var(--flora-space-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--flora-font-size-sm);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--flora-space-3);
  padding: var(--flora-space-3) var(--flora-space-4);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all var(--flora-transition-fast);
}

.file-item:hover {
  background: var(--flora-color-surface-hover);
}

.file-item:hover .file-name {
  color: var(--flora-color-accent);
  text-decoration: underline;
}

.file-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.file-name {
  font-size: var(--flora-font-size-base);
  color: var(--flora-color-text-primary);
  font-weight: var(--flora-font-weight-normal);
  transition: all var(--flora-transition-fast);
}

/* Help Section */
.help-section {
  padding: var(--flora-space-4);
  text-align: center;
}

.help-text {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-tertiary);
  margin: 0;
}

.help-link {
  color: var(--flora-color-text-secondary);
  text-decoration: underline;
  transition: color var(--flora-transition-fast);
}

.help-link:hover {
  color: var(--flora-color-accent);
}
</style>
