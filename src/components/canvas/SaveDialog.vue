<template>
  <BaseModal
    v-model="isOpen"
    title="Save Flow"
    :show-header="true"
    :show-footer="true"
    size="sm"
  >
    <div class="save-dialog-content">
      <div class="input-group">
        <label for="filename" class="input-label">Filename</label>
        <BaseInput
          id="filename"
          ref="filenameInput"
          v-model="filename"
          placeholder="Enter filename"
          @keydown.enter="handleSave"
        />
        <p class="input-hint">.json extension will be added automatically if not included</p>
      </div>

      <div class="checkbox-group">
        <BaseCheckbox
          id="dont-ask-again"
          v-model="dontAskAgain"
          label="Don't ask again"
        />
        <p class="checkbox-hint">
          Use default filename for future saves. You can change this in Settings.
        </p>
      </div>
    </div>

    <template #footer>
      <button class="cancel-btn" @click="handleCancel">Cancel</button>
      <button class="save-btn" @click="handleSave">Save</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  defaultFilename: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const settingsStore = useSettingsStore()
const filenameInput = ref(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const filename = ref('')
const dontAskAgain = ref(false)

// Focus input and select text when dialog opens
watch(isOpen, (newValue) => {
  if (newValue) {
    // Initialize filename from prop
    filename.value = props.defaultFilename
    dontAskAgain.value = false

    // Focus input after modal renders
    nextTick(() => {
      const input = filenameInput.value?.$el
      if (input && typeof input.focus === 'function') {
        input.focus()
        input.select()
      }
    })
  }
})

function ensureJsonExtension(name) {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.toLowerCase().endsWith('.json')) {
    return trimmed
  }
  return `${trimmed}.json`
}

function handleSave() {
  const finalFilename = ensureJsonExtension(filename.value)

  if (!finalFilename || finalFilename === '.json') {
    return // Don't save with empty filename
  }

  // Save preference if checkbox is checked
  if (dontAskAgain.value) {
    settingsStore.skipSaveDialog = true
  }

  emit('save', finalFilename)
  isOpen.value = false
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>

<style scoped>
.save-dialog-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-4);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.input-label {
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
}

.input-hint {
  margin: 0;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.checkbox-hint {
  margin: 0;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  padding-left: calc(18px + var(--flora-space-2));
}

.cancel-btn {
  padding: var(--flora-space-2) var(--flora-space-4);
  background: transparent;
  color: var(--flora-color-text-secondary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancel-btn:hover {
  background: var(--flora-color-bg-secondary);
  color: var(--flora-color-text-primary);
}

.save-btn {
  padding: var(--flora-space-2) var(--flora-space-4);
  background: #1ac460;
  color: white;
  border: none;
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  cursor: pointer;
  transition: all 0.15s ease;
}

.save-btn:hover {
  background: #15a352;
}

.save-btn:active {
  transform: scale(0.98);
}
</style>
