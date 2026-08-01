<template>
  <div class="group-node">
    <NodeResizer
      v-if="selected"
      :min-width="200"
      :min-height="150"
      @resize-start="onResizeStart"
      @resize="onResize"
      @resize-end="onResizeEnd"
    />

    <div
      ref="labelDiv"
      class="group-label"
      contenteditable="true"
      @mousedown.stop
      @click.stop
      @blur="updateLabel"
      @keydown.enter.prevent="blurOnEnter"
    >
      {{ data.label || 'Group' }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import '@vue-flow/node-resizer/dist/style.css'
import { ensureUniqueLabel } from '@/lib/node-label'
import { syncGroupMembership } from '@/lib/group-membership'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, default: () => ({}) },
  selected: { type: Boolean, default: false }
})

const { updateNodeData, getNodes, findNode } = useVueFlow()

const labelDiv = ref(null)

// Group origin at the last resize event, only used while a handle is dragged
let resizeOrigin = null

function onResizeStart({ params }) {
  resizeOrigin = { x: params.x, y: params.y }
}

/**
 * The top and left handles resize the group by moving its origin. Children are
 * positioned relative to that origin, so they would drift along with it unless
 * they are shifted back by the same amount.
 */
function onResize({ params }) {
  if (!resizeOrigin) return

  const deltaX = params.x - resizeOrigin.x
  const deltaY = params.y - resizeOrigin.y
  if (deltaX === 0 && deltaY === 0) return

  resizeOrigin = { x: params.x, y: params.y }

  for (const child of getNodes.value) {
    if (child.parentNode !== props.id) continue
    child.position = {
      x: child.position.x - deltaX,
      y: child.position.y - deltaY
    }
  }
}

/**
 * The new bounds decide who belongs to the group: nodes left outside are
 * released and nodes the group now covers are adopted.
 */
function onResizeEnd() {
  resizeOrigin = null

  const group = findNode(props.id)
  if (group) syncGroupMembership(group, getNodes.value)
}

function updateLabel(event) {
  const newLabel = event.target.textContent.trim() || 'Group'
  updateNodeData(props.id, { label: ensureUniqueLabel(newLabel, getNodes.value, props.id) })
}

function blurOnEnter(event) {
  event.target.blur()
}
</script>

<style scoped>
.group-node {
  width: 100%;
  height: 100%;
  pointer-events: none;
  position: relative;
}

.group-label {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  background-color: rgba(128, 128, 128, 0.9);
  border: 1px solid rgba(128, 128, 128, 0.5);
  border-radius: 4px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  pointer-events: auto;
  min-width: 120px;
  outline: none;
}

.group-label:focus {
  background-color: rgba(128, 128, 128, 1);
  box-shadow: 0 0 0 2px rgba(128, 128, 128, 0.7);
}

.group-label::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

/* Enable pointer events for NodeResizer controls */
.group-node :deep(.vue-flow__resize-control) {
  pointer-events: auto !important;
}

.group-node :deep(.vue-flow__resizer) {
  pointer-events: auto !important;
}
</style>
