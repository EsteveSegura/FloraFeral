<template>
  <div class="flora-checkbox-wrapper">
    <input
      :id="id"
      type="checkbox"
      class="flora-checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
      v-bind="$attrs"
    />
    <label v-if="label" :for="id" class="flora-checkbox-label">
      {{ label }}
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: () => `checkbox-${Math.random().toString(36).substr(2, 9)}`
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

function handleChange(event) {
  emit('update:modelValue', event.target.checked)
  emit('change', event)
}

// Inherit all attrs except class and id
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.flora-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--flora-space-2);
}

.flora-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--flora-color-accent);
  border-radius: var(--flora-radius-sm);
}

.flora-checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.flora-checkbox:focus-visible {
  outline: var(--flora-focus-ring-width) solid var(--flora-focus-ring-color);
  outline-offset: var(--flora-focus-ring-offset);
}

.flora-checkbox-label {
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-primary);
  cursor: pointer;
  user-select: none;
}

.flora-checkbox:disabled + .flora-checkbox-label {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
