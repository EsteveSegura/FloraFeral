<template>
  <input
    :class="['flora-input', `flora-input--${size}`, { 'flora-input--error': error }]"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :min="min"
    :max="max"
    :step="step"
    @input="handleInput"
    v-bind="$attrs"
  />
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (value) => ['text', 'number', 'email', 'password', 'url'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  step: {
    type: Number,
    default: undefined
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'change', 'blur'])

function handleInput(event) {
  let value = event.target.value

  // Parse number types
  if (props.type === 'number') {
    value = value === '' ? null : parseFloat(value)
  }

  emit('update:modelValue', value)
  emit('input', event)
}

// Inherit all attrs except class
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.flora-input {
  width: 100%;
  font-family: var(--flora-font-family-base);
  color: var(--flora-color-text-primary);
  background: var(--flora-color-bg-secondary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  transition: all var(--flora-transition-fast);
}

.flora-input::placeholder {
  color: var(--flora-color-text-tertiary);
}

.flora-input:hover:not(:disabled) {
  border-color: var(--flora-color-border-strong);
}

.flora-input:focus {
  outline: none;
  border-color: var(--flora-color-accent);
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.flora-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--flora-color-bg-tertiary);
}

/* Sizes */
.flora-input--sm {
  height: var(--flora-input-height-sm);
  padding: 0 var(--flora-space-2);
  font-size: var(--flora-font-size-xs);
}

.flora-input--md {
  height: var(--flora-input-height-md);
  padding: 0 var(--flora-space-3);
  font-size: var(--flora-font-size-sm);
}

.flora-input--lg {
  height: var(--flora-input-height-lg);
  padding: 0 var(--flora-space-4);
  font-size: var(--flora-font-size-base);
}

/* Error state */
.flora-input--error {
  border-color: var(--flora-color-danger);
}

.flora-input--error:focus {
  border-color: var(--flora-color-danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
</style>
