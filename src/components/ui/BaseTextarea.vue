<template>
  <textarea
    :class="['flora-textarea', { 'flora-textarea--error': error }]"
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    @input="handleInput"
    v-bind="$attrs"
  ></textarea>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  rows: {
    type: Number,
    default: 4
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

const emit = defineEmits(['update:modelValue', 'input', 'change', 'blur'])

function handleInput(event) {
  emit('update:modelValue', event.target.value)
  emit('input', event)
}

// Inherit all attrs except class
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.flora-textarea {
  width: 100%;
  font-family: var(--flora-font-family-base);
  font-size: var(--flora-font-size-sm);
  line-height: var(--flora-line-height-normal);
  color: var(--flora-color-text-primary);
  background: var(--flora-color-bg-secondary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  padding: var(--flora-space-3);
  resize: vertical;
  transition: all var(--flora-transition-fast);
}

.flora-textarea::placeholder {
  color: var(--flora-color-text-tertiary);
}

.flora-textarea:hover:not(:disabled) {
  border-color: var(--flora-color-border-strong);
}

.flora-textarea:focus {
  outline: none;
  border-color: var(--flora-color-accent);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.flora-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--flora-color-bg-tertiary);
  resize: none;
}

/* Error state */
.flora-textarea--error {
  border-color: var(--flora-color-danger);
}

.flora-textarea--error:focus {
  border-color: var(--flora-color-danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
</style>
