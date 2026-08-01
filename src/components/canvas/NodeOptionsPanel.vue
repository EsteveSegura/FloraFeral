<template>
  <BaseSidePanel
    :model-value="true"
    :title="panelTitle"
    :subtitle="modelLabel"
    @close="closePanelOfType(PANEL_TYPES.NODE_OPTIONS)"
  >
    <div class="node-options-panel">
      <div v-if="controls.length" class="node-options-list">
        <ModelControl
          v-for="control in controls"
          :key="control.key"
          :control="control"
          :model-value="getParamValue(control.key)"
          id-prefix="panel-control"
          @change="onParamChange"
        />
      </div>

      <p v-else class="node-options-empty">
        This model has no extra options.
      </p>
    </div>
  </BaseSidePanel>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { useSidePanel, PANEL_TYPES } from '@/composables/useSidePanel'
import BaseSidePanel from '@/components/ui/BaseSidePanel.vue'
import ModelControl from '@/components/ui/ModelControl.vue'
import replicateService from '@/services/replicate'

/**
 * Advanced model options for the node the panel was opened from.
 *
 * The toolbar above a node only fits a handful of controls, so every model
 * declares the rest under `uiSchema.advancedControls` and they are rendered
 * here. Values land in the same `data.params` the toolbar writes to.
 */
const props = defineProps({
  nodeId: {
    type: String,
    required: true
  }
})

const { findNode, updateNodeData, getSelectedNodes } = useVueFlow()
const { closePanelOfType } = useSidePanel()

/**
 * Read through VueFlow rather than through the store: `selected` is only kept
 * up to date on VueFlow's own node objects, and the panel lives and dies by it
 */
const targetNode = computed(() => findNode(props.nodeId))

const currentModel = computed(() => targetNode.value?.data?.model || null)

const uiSchema = computed(() => {
  if (!currentModel.value) return null
  return replicateService.getModelUiSchema(currentModel.value)
})

const controls = computed(() => uiSchema.value?.advancedControls || [])

const modelLabel = computed(() => uiSchema.value?.label || currentModel.value || '')

const panelTitle = computed(() => targetNode.value?.data?.label || 'Options')

function getParamValue(key) {
  return targetNode.value?.data?.params?.[key] ?? null
}

function onParamChange(key, value) {
  const currentParams = targetNode.value?.data?.params || {}

  updateNodeData(props.nodeId, {
    params: {
      ...currentParams,
      [key]: value
    }
  })
}

/**
 * The panel belongs to one node, so it goes away as soon as that node stops
 * being the selected one. Covers deselecting, selecting a different node and
 * deleting this one, which drops it out of the selection as well
 */
const isTargetSelected = computed(
  () => getSelectedNodes.value.some(n => n.id === props.nodeId)
)

watch(isTargetSelected, (selected) => {
  if (!selected) closePanelOfType(PANEL_TYPES.NODE_OPTIONS)
})
</script>

<style scoped>
.node-options-panel {
  display: flex;
  flex-direction: column;
}

.node-options-list {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-4);
}

.node-options-empty {
  margin: 0;
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-tertiary);
}
</style>
