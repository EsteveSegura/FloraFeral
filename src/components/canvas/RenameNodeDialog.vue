<template>
  <BaseModal
    v-model="isOpen"
    title="Rename Node"
    :show-header="true"
    :show-footer="true"
    size="sm"
  >
    <div class="rename-dialog-content">
      <div class="input-group">
        <label for="node-name" class="input-label">Name</label>
        <BaseInput
          id="node-name"
          ref="nameInput"
          v-model="name"
          placeholder="Enter node name"
          @keydown.enter="handleRename"
        />
        <p class="input-hint">Names must be unique: a repeated one gets a number appended</p>
      </div>
    </div>

    <template #footer>
      <button class="cancel-btn" @click="handleCancel">Cancel</button>
      <button class="rename-btn" @click="handleRename">Rename</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  currentLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'rename', 'cancel'])

const nameInput = ref(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const name = ref('')

// Seed the input with the current name and select it when the dialog opens
watch(isOpen, (newValue) => {
  if (newValue) {
    name.value = props.currentLabel

    nextTick(() => {
      const input = nameInput.value?.$el
      if (input && typeof input.focus === 'function') {
        input.focus()
        input.select()
      }
    })
  }
})

function handleRename() {
  const trimmed = name.value.trim()

  // An empty name would leave the node unidentifiable
  if (!trimmed) return

  emit('rename', trimmed)
  isOpen.value = false
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}
</script>

<style scoped>
.rename-dialog-content {
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

.rename-btn {
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

.rename-btn:hover {
  background: #15a352;
}

.rename-btn:active {
  transform: scale(0.98);
}
</style>
