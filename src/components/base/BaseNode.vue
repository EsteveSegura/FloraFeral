<template>
  <div
    class="base-node"
    :class="[
      `node-type-${type}`,
      {
        selected: isSelected,
        disabled: disabled,
        loading: loading,
        error: !!error
      }
    ]"
  >
    <!-- Input Handles -->
    <Handle
      v-for="(input, index) in inputs"
      :key="`input-${index}`"
      :id="`input-${index}`"
      type="target"
      :position="Position.Left"
      :style="{
        top: `${getHandlePosition(index, inputs.length)}%`,
        background: getPortColor(input)
      }"
    >
      <span class="handle-label handle-label-left">{{ input }}</span>
    </Handle>

    <!-- Output Handles -->
    <Handle
      v-for="(output, index) in outputs"
      :key="`output-${index}`"
      :id="`output-${index}`"
      type="source"
      :position="Position.Right"
      :style="{
        top: `${getHandlePosition(index, outputs.length)}%`,
        background: getPortColor(output)
      }"
    >
      <span class="handle-label handle-label-right">{{ output }}</span>
    </Handle>

    <!-- Header Slot -->
    <div class="node-header">
      <slot name="header">
        <span class="node-icon">{{ icon }}</span>
        <span class="node-label">{{ label }}</span>
      </slot>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>

    <!-- Body/Content Slot -->
    <div class="node-content">
      <slot></slot>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="node-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{{ error }}</span>
    </div>

    <!-- Footer Slot -->
    <div v-if="$slots.footer" class="node-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

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
    default: () => ({})
  },
  label: {
    type: String,
    default: 'Node'
  },
  icon: {
    type: String,
    default: '⚙️'
  },
  selected: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  inputs: {
    type: Array,
    default: () => []
  },
  outputs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:data', 'action:run', 'action:upload'])

const isSelected = computed(() => props.selected)

/**
 * Calculate handle position for even distribution
 */
function getHandlePosition(index, total) {
  if (total === 1) return 50
  return ((index + 1) / (total + 1)) * 100
}

/**
 * Get color for port type using Flora design tokens
 */
function getPortColor(portType) {
  const colorMap = {
    image: 'var(--flora-color-port-image)',
    prompt: 'var(--flora-color-port-prompt)',
    text: 'var(--flora-color-port-text)',
    number: 'var(--flora-color-port-number)'
  }
  return colorMap[portType] || 'var(--flora-color-border-strong)'
}
</script>

<style scoped>
.base-node {
  position: relative;
  min-width: 200px;
  background: var(--flora-color-surface);
  border: var(--flora-border-width-medium) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-lg);
  box-shadow: var(--flora-shadow-md);
  transition: all var(--flora-transition-base);
}

.base-node.selected {
  border-color: var(--flora-color-accent);
  box-shadow: var(--flora-shadow-accent-lg);
}

.base-node:hover {
  box-shadow: var(--flora-shadow-lg);
}

.base-node.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.base-node.error {
  border-color: var(--flora-color-danger);
}

.node-header {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
  padding: var(--flora-space-3);
  background: var(--flora-color-bg-secondary);
  border-bottom: var(--flora-border-width-thin) solid var(--flora-color-border-subtle);
  border-radius: var(--flora-radius-md) var(--flora-radius-md) 0 0;
}

.node-icon {
  font-size: var(--flora-font-size-xl);
}

.node-label {
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
  font-size: var(--flora-font-size-sm);
}

.node-content {
  padding: var(--flora-space-3);
}

.node-footer {
  padding: var(--flora-space-2) var(--flora-space-3);
  background: var(--flora-color-bg-secondary);
  border-top: var(--flora-border-width-thin) solid var(--flora-color-border-subtle);
  border-radius: 0 0 var(--flora-radius-md) var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-secondary);
}

.node-error {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
  padding: var(--flora-space-2) var(--flora-space-3);
  background: var(--flora-color-danger-bg);
  border-top: var(--flora-border-width-thin) solid var(--flora-color-danger-border);
  color: var(--flora-color-danger);
  font-size: var(--flora-font-size-sm);
}

.error-icon {
  font-size: var(--flora-font-size-base);
}

.error-message {
  flex: 1;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--flora-color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--flora-radius-lg);
  z-index: var(--flora-z-overlay);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--flora-color-border-subtle);
  border-top: 4px solid var(--flora-color-accent);
  border-radius: var(--flora-radius-full);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Handle Labels */
.handle-label {
  position: absolute;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-secondary);
  white-space: nowrap;
  pointer-events: none;
  background: var(--flora-color-surface);
  padding: var(--flora-space-1) var(--flora-space-2);
  border-radius: var(--flora-radius-sm);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  font-weight: var(--flora-font-weight-medium);
  backdrop-filter: blur(4px);
}

.handle-label-left {
  right: 20px;
  transform: translateY(-50%);
}

.handle-label-right {
  left: 20px;
  transform: translateY(-50%);
}

/* Handle Styles - Make handles larger and easier to click */
:deep(.vue-flow__handle) {
  width: 14px;
  height: 14px;
  border: var(--flora-border-width-thick) solid var(--flora-color-surface);
  box-shadow: var(--flora-shadow-md);
  cursor: crosshair;
  transition: all var(--flora-transition-fast);
}

:deep(.vue-flow__handle:hover) {
  width: 16px;
  height: 16px;
  box-shadow: var(--flora-shadow-lg);
}

:deep(.vue-flow__handle-connecting) {
  width: 18px;
  height: 18px;
  animation: pulse 0.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(22, 163, 74, 0);
  }
}
</style>
