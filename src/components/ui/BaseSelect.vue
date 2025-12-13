<template>
  <select
    :class="['flora-select', `flora-select--${size}`, { 'flora-select--error': error }]"
    :value="modelValue"
    :disabled="disabled"
    @change="handleChange"
    v-bind="$attrs"
  >
    <slot />
  </select>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

function handleChange(event) {
  emit('update:modelValue', event.target.value)
  emit('change', event)
}

// Inherit all attrs except class
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.flora-select {
  width: 100%;
  font-family: var(--flora-font-family-base);
  color: var(--flora-color-text-primary);
  background: var(--flora-color-bg-secondary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  transition: all var(--flora-transition-fast);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a3a3a3' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--flora-space-3) center;
  padding-right: var(--flora-space-8);
}

.flora-select:hover:not(:disabled) {
  border-color: var(--flora-color-border-strong);
}

.flora-select:focus {
  outline: none;
  border-color: var(--flora-color-accent);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.flora-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--flora-color-bg-tertiary);
}

/* Sizes */
.flora-select--sm {
  height: var(--flora-input-height-sm);
  padding: 0 var(--flora-space-2);
  font-size: var(--flora-font-size-xs);
}

.flora-select--md {
  height: var(--flora-input-height-md);
  padding: 0 var(--flora-space-3);
  font-size: var(--flora-font-size-sm);
}

.flora-select--lg {
  height: var(--flora-input-height-lg);
  padding: 0 var(--flora-space-4);
  font-size: var(--flora-font-size-base);
}

/* Error state */
.flora-select--error {
  border-color: var(--flora-color-danger);
}

.flora-select--error:focus {
  border-color: var(--flora-color-danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Option styling */
.flora-select option {
  background: var(--flora-color-bg-secondary);
  color: var(--flora-color-text-primary);
  padding: var(--flora-space-2);
}
</style>
