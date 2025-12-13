<template>
  <button
    :class="['flora-button', `flora-button--${variant}`, `flora-button--${size}`, { 'flora-button--disabled': disabled }]"
    :disabled="disabled"
    :type="type"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success'].includes(value)
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
  type: {
    type: String,
    default: 'button'
  }
})

// Inherit all attrs including events (@click, etc.)
defineOptions({
  inheritAttrs: false
})
</script>

<style scoped>
.flora-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--flora-space-2);
  font-family: var(--flora-font-family-base);
  font-weight: var(--flora-font-weight-semibold);
  border: none;
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  transition: all var(--flora-transition-fast);
  white-space: nowrap;
  user-select: none;
}

.flora-button:focus-visible {
  outline: var(--flora-focus-ring-width) solid var(--flora-focus-ring-color);
  outline-offset: var(--flora-focus-ring-offset);
}

/* Sizes */
.flora-button--sm {
  height: var(--flora-button-height-sm);
  padding: 0 var(--flora-space-3);
  font-size: var(--flora-font-size-xs);
}

.flora-button--md {
  height: var(--flora-button-height-md);
  padding: 0 var(--flora-space-4);
  font-size: var(--flora-font-size-sm);
}

.flora-button--lg {
  height: var(--flora-button-height-lg);
  padding: 0 var(--flora-space-5);
  font-size: var(--flora-font-size-base);
}

/* Variants */
.flora-button--primary {
  background: var(--flora-color-accent);
  color: var(--flora-color-text-primary);
}

.flora-button--primary:hover:not(:disabled) {
  background: var(--flora-color-accent-hover);
  box-shadow: var(--flora-shadow-accent);
  transform: translateY(-1px);
}

.flora-button--primary:active:not(:disabled) {
  background: var(--flora-color-accent-active);
  transform: translateY(0);
}

.flora-button--success {
  background: var(--flora-color-success);
  color: var(--flora-color-text-primary);
}

.flora-button--success:hover:not(:disabled) {
  background: #1ea952;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  transform: translateY(-1px);
}

.flora-button--success:active:not(:disabled) {
  background: #16843d;
  transform: translateY(0);
}

/* Disabled state */
.flora-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.flora-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
</style>
