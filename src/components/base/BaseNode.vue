<template>
  <div
    class="base-node"
    :class="[
      `node-type-${type}`,
      {
        selected: isSelected,
        disabled: disabled,
        loading: loading,
        error: !!error,
        'execution-pending': executionStatus === 'pending',
        'execution-executing': executionStatus === 'executing',
        'execution-completed': executionStatus === 'completed',
        'execution-error': executionStatus === 'error',
        'execution-skipped': executionStatus === 'skipped'
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
        background: getPortColor(getPortType(input))
      }"
    >
      <span class="handle-label handle-label-left">{{ getPortLabel(input) }}</span>
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
        background: getPortColor(getPortType(output))
      }"
    >
      <span class="handle-label handle-label-right">{{ getPortLabel(output) }}</span>
    </Handle>

    <!-- Execution Status Badge -->
    <div v-if="executionStatus && executionStatus !== 'idle'" class="execution-badge" :class="`badge-${executionStatus}`">
      <span class="badge-icon">{{ executionBadgeIcon }}</span>
    </div>

    <!-- Batch Role Badge -->
    <div
      v-if="batchRole"
      class="batch-badge"
      :class="`batch-badge-${batchRole}`"
      :title="`Batch ${batchRole}`"
    >
      {{ batchRole === 'input' ? 'IN' : 'OUT' }}
    </div>

    <!-- Header Slot -->
    <div v-if="settingsStore.showNodeHeaders && !hideHeader" class="node-header">
      <slot name="header">
        <span class="node-icon">{{ icon }}</span>
        <input
          v-if="isEditingLabel"
          ref="labelInput"
          v-model="labelDraft"
          class="node-label-input nodrag nopan"
          size="1"
          @mousedown.stop
          @dblclick.stop
          @keydown="onLabelKeydown"
          @blur="commitLabel"
        />
        <span
          v-else
          class="node-label"
          :title="nodeLabel"
          @dblclick.stop.prevent="startEditingLabel"
        >{{ nodeLabel }}</span>
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
import { computed, nextTick, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useSettingsStore } from '@/stores/settings'
import { canTakeBatchRole } from '@/lib/batch-io'
import { ensureUniqueLabel } from '@/lib/node-label'

const settingsStore = useSettingsStore()
const { updateNodeData, getNodes } = useVueFlow()

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
  hideHeader: {
    type: Boolean,
    default: false
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
  },
  executionStatus: {
    type: String,
    default: 'idle',
    validator: (value) => ['idle', 'pending', 'executing', 'completed', 'error', 'skipped'].includes(value)
  }
})

// Computed execution badge icon
const executionBadgeIcon = computed(() => {
  switch (props.executionStatus) {
    case 'pending': return '⏳'
    case 'executing': return '⚡'
    case 'completed': return '✓'
    case 'error': return '✕'
    case 'skipped': return '⏭'
    default: return ''
  }
})

// Batch role marked from the node context menu (persisted in node.data)
const batchRole = computed(() => {
  const role = props.data?.batchRole
  return canTakeBatchRole(props.type, role) ? role : null
})

const emit = defineEmits(['update:data', 'action:run', 'action:upload'])

const isSelected = computed(() => props.selected)

/**
 * Node title. Read from `data` rather than the `label` prop: VueFlow passes a
 * top-level `label` down to every node component, and that undefined value
 * falls through $attrs and wins over the binding the node makes explicitly
 */
const nodeLabel = computed(() => props.data?.label || props.label)

// In-place rename of the node title (double-click on the header)
const isEditingLabel = ref(false)
const labelDraft = ref('')
const labelInput = ref(null)

async function startEditingLabel() {
  labelDraft.value = nodeLabel.value
  isEditingLabel.value = true
  await nextTick()
  labelInput.value?.focus()
  labelInput.value?.select()
}

/**
 * Enter confirms, Escape reverts. Keydown never leaves the input: the canvas
 * deletes nodes on Backspace and groups them on Ctrl+G
 */
function onLabelKeydown(event) {
  event.stopPropagation()

  if (event.key === 'Enter') {
    event.preventDefault()
    commitLabel()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    isEditingLabel.value = false
  }
}

function commitLabel() {
  // Escape already closed the editor; the blur it fires must not re-commit
  if (!isEditingLabel.value) return
  isEditingLabel.value = false

  // An empty name would leave the node unidentifiable: keep the previous one
  const next = labelDraft.value.trim()
  if (!next || next === nodeLabel.value) return

  updateNodeData(props.id, { label: ensureUniqueLabel(next, getNodes.value, props.id) })
}

/**
 * Calculate handle position for even distribution
 */
function getHandlePosition(index, total) {
  if (total === 1) return 50
  return ((index + 1) / (total + 1)) * 100
}

/**
 * Port type of an entry in `inputs`/`outputs`
 * Ports are plain PORT_TYPES strings, or `{ type, label }` when a node has
 * several ports of the same type and the handle labels need to tell them apart
 * @param {string|Object} port
 * @returns {string} PORT_TYPE
 */
function getPortType(port) {
  return typeof port === 'string' ? port : port.type
}

/**
 * Text shown next to a handle. Defaults to the port type
 * @param {string|Object} port
 * @returns {string}
 */
function getPortLabel(port) {
  if (typeof port === 'string') return port
  return port.label || port.type
}

/**
 * Get color for port type using Flora design tokens
 */
function getPortColor(portType) {
  const colorMap = {
    image: 'var(--flora-color-port-image)',
    prompt: 'var(--flora-color-port-prompt)',
    text: 'var(--flora-color-port-text)',
    number: 'var(--flora-color-port-number)',
    video: 'var(--flora-color-port-video)'
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
  /* The title must never widen the node: zero intrinsic width, stretched to
     whatever the node content decides */
  width: 0;
  min-width: 100%;
  overflow: hidden;
}

.node-icon {
  font-size: var(--flora-font-size-xl);
  flex-shrink: 0;
}

.node-label {
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
  font-size: var(--flora-font-size-sm);
  cursor: text;
  /* The double-click must not leave a word selected behind the input */
  user-select: none;
  /* A long name is truncated; the native tooltip shows it in full */
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-label-input {
  /* width:0 keeps the input from widening the header past the node */
  flex: 1;
  width: 0;
  min-width: 0;
  font-family: inherit;
  font-weight: var(--flora-font-weight-semibold);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-primary);
  background: var(--flora-color-surface);
  border: var(--flora-border-width-thin) solid var(--flora-color-accent);
  border-radius: var(--flora-radius-sm);
  padding: 0 var(--flora-space-1);
  outline: none;
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
  /* Deliberately not `all`: handles are spread down the side of the node, so
     `top` changes whenever a node gains or loses a port. VueFlow reads handle
     positions once per change and would catch one mid-slide, leaving the edge
     pinned to a spot the handle has already left */
  transition:
    width var(--flora-transition-fast),
    height var(--flora-transition-fast),
    background-color var(--flora-transition-fast),
    border-color var(--flora-transition-fast),
    box-shadow var(--flora-transition-fast);
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

/* Execution Status Badge */
.execution-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: var(--flora-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: var(--flora-font-weight-bold);
  z-index: 10;
  border: 2px solid var(--flora-color-surface);
  box-shadow: var(--flora-shadow-md);
}

.badge-icon {
  line-height: 1;
}

.badge-pending {
  background: var(--flora-color-bg-tertiary);
  color: var(--flora-color-text-tertiary);
}

.badge-executing {
  background: var(--flora-color-accent);
  color: white;
  animation: executingPulse 1s ease-in-out infinite;
}

.badge-completed {
  background: var(--flora-color-success);
  color: white;
}

.badge-error {
  background: var(--flora-color-danger);
  color: white;
}

.badge-skipped {
  background: var(--flora-color-bg-tertiary);
  color: var(--flora-color-text-quaternary);
  opacity: 0.8;
}

/* Batch Role Badge */
.batch-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  min-width: 24px;
  height: 20px;
  padding: 0 var(--flora-space-2);
  border-radius: var(--flora-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--flora-font-weight-bold);
  letter-spacing: 0.05em;
  color: white;
  z-index: 10;
  border: 2px solid var(--flora-color-surface);
  box-shadow: var(--flora-shadow-md);
}

.batch-badge-input {
  background: var(--flora-color-port-image);
}

.batch-badge-output {
  background: var(--flora-color-port-prompt);
}

/* Execution State Node Styles */
.base-node.execution-pending {
  opacity: 0.85;
}

.base-node.execution-executing {
  border-color: var(--flora-color-accent);
  box-shadow: 0 0 0 2px var(--flora-color-accent), var(--flora-shadow-md);
}

.base-node.execution-completed {
  border-color: var(--flora-color-success);
}

.base-node.execution-error {
  border-color: var(--flora-color-danger);
}

.base-node.execution-skipped {
  opacity: 0.6;
}

@keyframes executingPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: var(--flora-shadow-md);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 12px var(--flora-color-accent);
  }
}
</style>
