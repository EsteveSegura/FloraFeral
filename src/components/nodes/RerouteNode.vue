<template>
  <!--
    Deliberately not a BaseNode: a reroute is only its two handles, and BaseNode
    brings a 200px minimum width, content padding, a header, handle labels and
    the execution and batch badges, all of which would have to be undone
  -->
  <div class="reroute-node" :class="{ selected }" :title="tooltip">
    <Handle
      id="input-0"
      type="target"
      :position="Position.Left"
      :style="handleStyle"
    />
    <Handle
      id="output-0"
      type="source"
      :position="Position.Right"
      :style="handleStyle"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import { getPortColor } from '@/lib/node-shapes'
import { resolveRerouteType } from '@/lib/upstream'

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
  selected: {
    type: Boolean,
    default: false
  }
})

const flowStore = useFlowStore()

/**
 * The port type is not stored anywhere: it is read off whatever feeds the
 * reroute, so the dots recolour on their own when the wire is repointed, and
 * nothing about a reroute ends up in the exported .json beyond its position
 */
const portType = computed(() =>
  resolveRerouteType(props.id, flowStore.nodes, flowStore.edges)
)

const handleStyle = computed(() => ({ background: getPortColor(portType.value) }))

// The node is too small for a label, so what it carries goes in the tooltip
const tooltip = computed(() =>
  portType.value ? `Reroute (${portType.value})` : 'Reroute (not connected)'
)
</script>

<style scoped>
.reroute-node {
  position: relative;
  /* Wide enough that the two handles do not read as a single blob, short
     enough that the node stays out of the way of the wire it is bending */
  width: 44px;
  height: 16px;
  background: var(--flora-color-surface);
  border: var(--flora-border-width-medium) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-full);
  box-shadow: var(--flora-shadow-md);
  transition:
    border-color var(--flora-transition-base),
    box-shadow var(--flora-transition-base);
}

.reroute-node.selected {
  border-color: var(--flora-color-accent);
  box-shadow: var(--flora-shadow-accent-lg);
}

.reroute-node:hover {
  box-shadow: var(--flora-shadow-lg);
}

/* BaseNode styles its handles inside its own scope, so a node that does not use
   it has to say this itself. Same sizes, so reroute handles feel like the rest */
:deep(.vue-flow__handle) {
  width: 14px;
  height: 14px;
  border: var(--flora-border-width-thick) solid var(--flora-color-surface);
  box-shadow: var(--flora-shadow-md);
  cursor: crosshair;
  transition:
    width var(--flora-transition-fast),
    height var(--flora-transition-fast),
    background-color var(--flora-transition-fast),
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
}
</style>
