<template>
  <label
    :for="for"
    :class="['flora-label', `flora-label--${variant}`]"
  >
    <slot />
  </label>
</template>

<script setup>
defineProps({
  for: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'form',
    validator: (value) => ['form', 'toolbar'].includes(value)
  }
})
</script>

<style scoped>
.flora-label {
  display: block;
  font-family: var(--flora-font-family-base);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
  user-select: none;
}

/* Form label - standard for form inputs */
.flora-label--form {
  font-size: var(--flora-font-size-sm);
  margin-bottom: var(--flora-space-2);
}

/* Toolbar label - for inline controls */
.flora-label--toolbar {
  font-size: var(--flora-font-size-xs);
  font-weight: var(--flora-font-weight-semibold);
  margin-bottom: var(--flora-space-1);
}
</style>
