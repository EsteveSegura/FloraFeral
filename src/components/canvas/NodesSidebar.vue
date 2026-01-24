<template>
  <aside class="nodes-menu">
    <h3 class="header">Nodes</h3>

    <!-- AI Section -->
    <span class="section-label">AI</span>
    <div
      v-for="nodeDef in aiNodes"
      :key="nodeDef.type"
      class="node-item"
      draggable="true"
      @dragstart="emit('drag-start', $event, nodeDef.type)"
      @click="emit('node-click', nodeDef.type)"
    >
      <span class="node-icon">{{ getNodeIcon(nodeDef.type) }}</span>
      <span class="node-text">{{ nodeDef.label }}</span>
    </div>

    <!-- Separator -->
    <div class="separator"></div>

    <!-- Inputs Section -->
    <span class="section-label">Inputs</span>
    <div
      v-for="nodeDef in inputNodes"
      :key="nodeDef.type"
      class="node-item"
      draggable="true"
      @dragstart="emit('drag-start', $event, nodeDef.type)"
      @click="emit('node-click', nodeDef.type)"
    >
      <span class="node-icon">{{ getNodeIcon(nodeDef.type) }}</span>
      <span class="node-text">{{ nodeDef.label }}</span>
    </div>

    <!-- Separator -->
    <div class="separator"></div>

    <!-- Helpers Section -->
    <span class="section-label">Helpers</span>
    <div
      v-for="nodeDef in helperNodes"
      :key="nodeDef.type"
      class="node-item"
      draggable="true"
      @dragstart="emit('drag-start', $event, nodeDef.type)"
      @click="emit('node-click', nodeDef.type)"
    >
      <span class="node-icon">{{ getNodeIcon(nodeDef.type) }}</span>
      <span class="node-text">{{ nodeDef.label }}</span>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { NODE_TYPES } from '@/lib/node-shapes'

const props = defineProps({
  nodes: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['drag-start', 'node-click'])

// Categorize nodes
const aiNodes = computed(() =>
  props.nodes.filter(n =>
    n.type === NODE_TYPES.IMAGE_GENERATOR ||
    n.type === NODE_TYPES.TEXT_GENERATOR
  )
)

const inputNodes = computed(() =>
  props.nodes.filter(n =>
    n.type === NODE_TYPES.IMAGE ||
    n.type === NODE_TYPES.PROMPT
  )
)

const helperNodes = computed(() =>
  props.nodes.filter(n =>
    n.type === NODE_TYPES.PROMPT_TEMPLATE ||
    n.type === NODE_TYPES.DRAW ||
    n.type === NODE_TYPES.DIFF ||
    n.type === NODE_TYPES.COMPARE
  )
)

function getNodeIcon(type) {
  const icons = {
    [NODE_TYPES.IMAGE]: '📷',
    [NODE_TYPES.IMAGE_GENERATOR]: '✨',
    [NODE_TYPES.PROMPT]: '📝',
    [NODE_TYPES.DIFF]: '🔍',
    [NODE_TYPES.COMPARE]: '⚖️',
    [NODE_TYPES.TEXT_GENERATOR]: '💬',
    [NODE_TYPES.PROMPT_TEMPLATE]: '📋',
    [NODE_TYPES.DRAW]: '🖌️'
  }
  return icons[type] || '⚙️'
}
</script>

<style scoped>
.nodes-menu {
  position: absolute;
  top: 50%;
  left: 96px;
  transform: translateY(-50%);
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
}

.section-label {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #666666;
  margin-top: 4px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #3A3A3A;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.15s ease;
}

.node-item:hover {
  background: #4A4A4A;
}

.node-item:active {
  cursor: grabbing;
}

.node-icon {
  font-size: 16px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: normal;
  color: white;
}

.separator {
  height: 1px;
  background: #444444;
  margin: 4px 0;
}
</style>
