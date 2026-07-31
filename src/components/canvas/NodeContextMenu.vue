<template>
  <aside class="node-context-menu" :style="positionStyle">
    <h3 class="header">{{ nodeLabel }}</h3>

    <div class="menu-item" @click="emit('rename')">
      <span class="menu-icon">✏️</span>
      <span class="menu-text">Rename</span>
    </div>

    <span class="section-label">Batch Run</span>

    <template v-if="supportsBatch">
      <div
        v-if="canBeInput"
        class="menu-item"
        :class="{ active: currentRole === BATCH_ROLES.INPUT }"
        @click="emit('set-role', BATCH_ROLES.INPUT)"
      >
        <span class="menu-icon">🟢</span>
        <span class="menu-text">Mark as batch input</span>
      </div>

      <div
        v-if="canBeOutput"
        class="menu-item"
        :class="{ active: currentRole === BATCH_ROLES.OUTPUT }"
        @click="emit('set-role', BATCH_ROLES.OUTPUT)"
      >
        <span class="menu-icon">🟣</span>
        <span class="menu-text">Mark as batch output</span>
      </div>

      <div
        v-if="currentRole"
        class="menu-item"
        @click="emit('set-role', null)"
      >
        <span class="menu-icon">✕</span>
        <span class="menu-text">Remove batch mark</span>
      </div>
    </template>

    <div v-else class="menu-item disabled">
      <span class="menu-icon">🚫</span>
      <span class="menu-text">Not usable in batch</span>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { BATCH_ROLES, canBeBatchInput, canBeBatchOutput, canTakeBatchRole } from '@/lib/batch-io'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  position: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['set-role', 'rename'])

const positionStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

const nodeLabel = computed(() => props.node.data?.label || props.node.type)

const canBeInput = computed(() => canBeBatchInput(props.node.type))
const canBeOutput = computed(() => canBeBatchOutput(props.node.type))
const supportsBatch = computed(() => canBeInput.value || canBeOutput.value)

const currentRole = computed(() => {
  const role = props.node.data?.batchRole
  return canTakeBatchRole(props.node.type, role) ? role : null
})
</script>

<style scoped>
.node-context-menu {
  position: absolute;
  width: 210px;
  background: #1e1e1e;
  border-radius: 12px;
  padding: 12px;
  z-index: 9;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.header {
  margin: 0 0 4px 0;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #666666;
  margin-top: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #3A3A3A;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.menu-item:hover {
  background: #4A4A4A;
}

.menu-item.active {
  background: #4A4A4A;
  box-shadow: inset 2px 0 0 var(--flora-color-accent);
}

.menu-item.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.menu-item.disabled:hover {
  background: #3A3A3A;
}

.menu-icon {
  font-size: 13px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: normal;
  color: white;
}
</style>
