<template>
  <BaseModal
    v-model="isOpen"
    title="Batch Run"
    size="full"
    :close-on-overlay="false"
    :disable-drag-close="true"
    :show-footer="false"
  >
    <div class="batch-content">
      <!-- Toolbar -->
      <div class="batch-toolbar">
        <div class="toolbar-group">
          <BaseLabel for="run-count">Runs:</BaseLabel>
          <BaseInput
            id="run-count"
            type="number"
            size="sm"
            min="1"
            :max="MAX_RUNS"
            :model-value="runCount"
            :disabled="batchStore.isRunning"
            @input="onRunCountChange($event.target.value)"
          />
        </div>

        <div class="toolbar-group toolbar-actions">
          <BaseButton
            v-if="!batchStore.isRunning"
            variant="primary"
            size="md"
            :disabled="!canRun"
            @click="handleRun"
          >
            Run batch
          </BaseButton>
          <BaseButton
            v-else
            variant="danger"
            size="md"
            :disabled="batchStore.cancelRequested"
            @click="handleStop"
          >
            {{ batchStore.cancelRequested ? 'Stopping...' : 'Stop' }}
          </BaseButton>

          <BaseButton
            variant="success"
            size="md"
            :disabled="!batchStore.hasResults || batchStore.isRunning"
            @click="handleDownloadZip"
          >
            Download all (.zip)
          </BaseButton>
        </div>
      </div>

      <!-- Status line -->
      <div class="batch-status">
        <span v-if="batchStore.isRunning" class="status-running">
          Running {{ batchStore.currentRunIndex + 1 }}/{{ batchStore.runs.length }}
        </span>
        <span v-else-if="batchStore.runs.length">
          {{ batchStore.completedCount }} done · {{ batchStore.failedCount }} failed
        </span>
        <span v-if="batchStore.hasUnsavedResults" class="status-unsaved">
          ⚠ Results not downloaded yet
        </span>
      </div>

      <!-- Blocking warnings -->
      <div v-if="blockingMessages.length" class="batch-warning">
        <div v-for="message in blockingMessages" :key="message">{{ message }}</div>
      </div>

      <!-- Non-blocking warnings -->
      <div v-if="warningMessages.length" class="batch-warning batch-warning--soft">
        <div v-for="message in warningMessages" :key="message">⚠ {{ message }}</div>
      </div>

      <!-- Marked nodes summary -->
      <div class="batch-legend">
        <span class="legend-item">
          <span class="legend-dot legend-input"></span>
          Inputs: {{ inputNodes.length ? inputNodes.map(n => n.data?.label || n.type).join(', ') : 'none' }}
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-output"></span>
          Outputs: {{ outputNodes.length ? outputNodes.map(n => n.data?.label || n.type).join(', ') : 'none' }}
        </span>
      </div>

      <!-- Runs table -->
      <div class="table-wrapper">
        <table class="batch-table">
          <thead>
            <tr>
              <th class="col-index">#</th>
              <th v-for="column in inputColumns" :key="column.key" class="col-input">
                {{ column.label }}
              </th>
              <th v-for="node in outputNodes" :key="node.id" class="col-output">
                {{ node.data?.label || node.type }}
              </th>
              <th class="col-status">Status</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(run, runIndex) in batchStore.runs"
              :key="run.id"
              :class="{ 'row-running': run.status === 'running' }"
            >
              <td class="col-index">{{ runIndex + 1 }}</td>

              <!-- Input cells -->
              <td v-for="column in inputColumns" :key="column.key" class="col-input">
                <!-- Image input -->
                <div v-if="column.kind === BATCH_VALUE_KINDS.IMAGE" class="image-cell">
                  <img
                    v-if="run.inputs[column.nodeId]"
                    :src="run.inputs[column.nodeId]"
                    class="cell-thumb"
                    alt="Input"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    :disabled="batchStore.isRunning"
                    @change="onImageSelected($event, runIndex, column.nodeId)"
                  />
                </div>

                <!-- Template variable input -->
                <BaseInput
                  v-else-if="column.kind === BATCH_VALUE_KINDS.VARIABLES"
                  size="sm"
                  :model-value="run.inputs[column.nodeId]?.[column.variable] || ''"
                  :disabled="batchStore.isRunning"
                  @input="setVariableValue(runIndex, column.nodeId, column.variable, $event.target.value)"
                />

                <!-- Plain prompt input -->
                <div v-else class="text-cell">
                  <BaseTextarea
                    :rows="3"
                    :model-value="run.inputs[column.nodeId] || ''"
                    :disabled="batchStore.isRunning"
                    @input="setTextValue(runIndex, column.nodeId, $event.target.value)"
                  />
                  <span v-if="missingVariablesFor(run, column).length" class="cell-error">
                    {{ formatMissingVariables(missingVariablesFor(run, column)) }}
                  </span>
                </div>
              </td>

              <!-- Output cells -->
              <td v-for="node in outputNodes" :key="node.id" class="col-output">
                <template v-if="run.outputs?.[node.id]?.value">
                  <img
                    v-if="run.outputs[node.id].kind === BATCH_VALUE_KINDS.IMAGE"
                    :src="run.outputs[node.id].value"
                    class="cell-thumb output-thumb"
                    alt="Output"
                    @click="previewImage = run.outputs[node.id].value"
                  />
                  <div v-else class="output-text">
                    {{ run.outputs[node.id].value }}
                  </div>
                </template>
                <span v-else class="cell-empty">—</span>
              </td>

              <!-- Status -->
              <td class="col-status">
                <span class="status-pill" :class="`status-${run.status}`">{{ run.status }}</span>
                <div v-if="run.error" class="cell-error">{{ run.error }}</div>
              </td>

              <!-- Per-row action -->
              <td class="col-actions">
                <BaseButton
                  variant="primary"
                  size="sm"
                  :disabled="!canRunRow(run)"
                  :title="rowActionTitle(run)"
                  @click="handleRunRow(runIndex)"
                >
                  {{ run.status === 'pending' ? 'Run' : 'Retry' }}
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </BaseModal>

  <!-- Output preview -->
  <BaseModal
    v-if="previewImage"
    :model-value="true"
    :show-header="false"
    :show-footer="false"
    size="xl"
    @update:model-value="previewImage = null"
  >
    <div class="preview-modal">
      <img :src="previewImage" alt="Output preview" />
    </div>
  </BaseModal>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useFlowStore } from '@/stores/flow'
import { useBatchStore } from '@/stores/batch'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseLabel from '@/components/ui/BaseLabel.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import {
  BATCH_ROLES,
  BATCH_VALUE_KINDS,
  getBatchNodes,
  getBatchInputSpec,
  getBatchInputInitialValue,
  getMissingVariables,
  reachesAnyNode,
  resolveUpstreamPromptNode
} from '@/lib/batch-io'
import { extractVariables } from '@/lib/prompt-template'
import { runBatch } from '@/services/batch-executor'
import { dataUrlToBytes, extensionForMimeType, textToBytes, downloadZip, sanitizeFilename } from '@/lib/zip'

const MAX_RUNS = 100

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  // Injected from FlowCanvasView: calling useVueFlow() outside the canvas
  // context would create a detached store whose updates go nowhere
  updateNodeData: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const flowStore = useFlowStore()
const batchStore = useBatchStore()

const runCount = ref(3)
const previewImage = ref(null)

// Closing is guarded: results only live in this panel until downloaded
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!value && !confirmClose()) return
    emit('update:modelValue', value)
  }
})

const inputNodes = computed(() => getBatchNodes(flowStore.nodes, BATCH_ROLES.INPUT))
const outputNodes = computed(() => getBatchNodes(flowStore.nodes, BATCH_ROLES.OUTPUT))

const inputSpecs = computed(() =>
  inputNodes.value.map(node => {
    const upstream = resolveUpstreamPromptNode(node.id, flowStore.nodes, flowStore.edges)

    // When the upstream prompt is also a batch input, rows may declare template
    // variables that do not exist on the canvas yet — they still need a column
    const extraVariables = []
    if (upstream?.data?.batchRole === BATCH_ROLES.INPUT) {
      for (const run of batchStore.runs) {
        for (const variable of extractVariables(run.inputs?.[upstream.id])) {
          if (!extraVariables.includes(variable)) extraVariables.push(variable)
        }
      }
    }

    return getBatchInputSpec(node, flowStore.nodes, flowStore.edges, extraVariables)
  })
)

// Flattened table columns (a prompt-template contributes one column per variable)
const inputColumns = computed(() =>
  inputSpecs.value.flatMap(spec =>
    spec.columns.map(column => ({
      ...column,
      nodeId: spec.nodeId,
      kind: spec.kind,
      lockedVariables: spec.lockedVariables
    }))
  )
)

/**
 * Variables the user must keep in a prompt cell (they feed a downstream template)
 */
function missingVariablesFor(run, column) {
  if (column.kind !== BATCH_VALUE_KINDS.TEXT) return []
  return getMissingVariables(run.inputs[column.nodeId], column.lockedVariables)
}

/**
 * Human readable list of the placeholders a cell dropped
 * (built here because Vue interpolation cannot contain "{{")
 */
function formatMissingVariables(variables) {
  const open = '{'.repeat(2)
  const close = '}'.repeat(2)
  return `Missing: ${variables.map(name => `${open}${name}${close}`).join(', ')}`
}

const hasBrokenVariables = computed(() =>
  batchStore.runs.some(run =>
    inputColumns.value.some(column => missingVariablesFor(run, column).length > 0)
  )
)

// Inputs whose value cannot reach any marked output: editing them in the table
// would silently change nothing, which looks like "my value was ignored"
const orphanInputs = computed(() => {
  const outputIds = new Set(outputNodes.value.map(node => node.id))
  if (outputIds.size === 0) return []

  return inputNodes.value.filter(node => !reachesAnyNode(node.id, outputIds, flowStore.edges))
})

const blockingMessages = computed(() => {
  const messages = []

  if (outputNodes.value.length === 0) {
    messages.push('Mark at least one node as batch output (right-click a generator node).')
  }
  if (hasBrokenVariables.value) {
    messages.push('Some prompts dropped a placeholder needed by a connected Prompt Template.')
  }

  return messages
})

const warningMessages = computed(() => {
  if (!orphanInputs.value.length) return []

  const labels = orphanInputs.value.map(node => node.data?.label || node.type).join(', ')
  return [`Not connected to any batch output, so editing them has no effect: ${labels}.`]
})

const canRun = computed(() =>
  outputNodes.value.length > 0 &&
  !hasBrokenVariables.value &&
  batchStore.runs.length > 0 &&
  !batchStore.isRunning
)

/**
 * Build a fresh row seeded with the current node values
 */
function createRun(index) {
  const inputs = {}

  for (const node of inputNodes.value) {
    inputs[node.id] = getBatchInputInitialValue(node)
  }

  return {
    id: `run-${Date.now()}-${index}`,
    inputs,
    outputs: {},
    status: 'pending',
    error: null
  }
}

/**
 * Grow or shrink the table to match the requested number of runs
 */
function syncRuns() {
  const target = runCount.value
  const current = [...batchStore.runs]

  while (current.length < target) {
    current.push(createRun(current.length))
  }
  current.length = target

  // Make sure every row has an entry for every input node
  for (const run of current) {
    for (const node of inputNodes.value) {
      if (run.inputs[node.id] === undefined) {
        run.inputs[node.id] = getBatchInputInitialValue(node)
      }
    }
  }

  batchStore.setRuns(current)
}

function onRunCountChange(value) {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return

  runCount.value = Math.min(Math.max(parsed, 1), MAX_RUNS)
  syncRuns()
}

function setTextValue(runIndex, nodeId, value) {
  batchStore.runs[runIndex].inputs[nodeId] = value
}

function setVariableValue(runIndex, nodeId, variable, value) {
  const inputs = batchStore.runs[runIndex].inputs
  if (typeof inputs[nodeId] !== 'object' || inputs[nodeId] === null) {
    inputs[nodeId] = {}
  }
  inputs[nodeId][variable] = value
}

function onImageSelected(event, runIndex, nodeId) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    batchStore.runs[runIndex].inputs[nodeId] = reader.result
  }
  reader.readAsDataURL(file)
}

/**
 * Whether a single row can be executed on its own
 */
function canRunRow(run) {
  return (
    outputNodes.value.length > 0 &&
    !batchStore.isRunning &&
    !inputColumns.value.some(column => missingVariablesFor(run, column).length > 0)
  )
}

function rowActionTitle(run) {
  if (outputNodes.value.length === 0) return 'Mark a node as batch output first'
  if (batchStore.isRunning) return 'A run is already in progress'
  if (!canRunRow(run)) return 'Fix the highlighted inputs first'
  return run.status === 'pending' ? 'Run only this row' : 'Run this row again'
}

/**
 * Execute the given rows, mapping each result back to its row in the table
 * @param {Array<number>} indices - Row indices to execute, in order
 */
async function executeRows(indices) {
  batchStore.startBatch()

  try {
    await runBatch({
      runs: indices.map(index => batchStore.runs[index]),
      updateNodeData: props.updateNodeData,
      shouldCancel: () => batchStore.cancelRequested,
      onRunStart: (position) => {
        const index = indices[position]
        batchStore.currentRunIndex = index
        batchStore.updateRun(index, { status: 'running', error: null })
      },
      onRunFinish: (position, result) => {
        batchStore.updateRun(indices[position], {
          status: result.status,
          error: result.error,
          outputs: result.outputs
        })
        if (result.status === 'done') {
          batchStore.hasUnsavedResults = true
        }
      }
    })
  } catch (error) {
    console.error('[BatchRunModal] Batch failed:', error)
    window.alert(error.message || 'Batch run failed')
  } finally {
    batchStore.finishBatch()
  }
}

async function handleRun() {
  if (!canRun.value) return

  batchStore.clearResults()
  await executeRows(batchStore.runs.map((_, index) => index))
}

/**
 * Re-run a single row, keeping every other row's result untouched
 */
async function handleRunRow(runIndex) {
  if (!canRunRow(batchStore.runs[runIndex])) return

  batchStore.updateRun(runIndex, { outputs: {}, error: null })
  await executeRows([runIndex])
}

function handleStop() {
  batchStore.requestCancel()
}

/**
 * True while results could be lost by navigating away
 */
const needsCloseProtection = computed(() => batchStore.isRunning || batchStore.hasResults)

function confirmClose() {
  if (batchStore.isRunning) {
    window.alert('The batch is still running. Stop it before closing this panel.')
    return false
  }

  if (batchStore.hasUnsavedResults) {
    return window.confirm('You have batch results that have not been downloaded. Close anyway?')
  }

  return true
}

function onBeforeUnload(event) {
  if (!needsCloseProtection.value) return

  event.preventDefault()
  // Legacy browsers require a non-empty returnValue to show the dialog
  event.returnValue = ''
  return ''
}

watch(() => props.modelValue, (open) => {
  if (open) {
    // The panel is flushed on close, so opening always starts from the
    // current state of the canvas
    syncRuns()
    window.addEventListener('beforeunload', onBeforeUnload)
  } else {
    window.removeEventListener('beforeunload', onBeforeUnload)
    batchStore.reset()
  }
})

// Marking a node while the panel is open must seed the new column in every row,
// otherwise those rows would run with no value for it. Watching the id list
// (not the node objects) keeps this from firing on every canvas change.
watch(
  () => inputNodes.value.map(node => node.id).join('|'),
  () => {
    if (props.modelValue && !batchStore.isRunning) {
      syncRuns()
    }
  }
)

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})

/**
 * Package every produced output plus a results.json manifest
 */
function handleDownloadZip() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const root = `batch-${timestamp}`
  const entries = []

  const manifest = batchStore.runs.map((run, index) => {
    const runFolder = `${root}/run-${String(index + 1).padStart(2, '0')}`
    const outputs = {}

    for (const [nodeId, output] of Object.entries(run.outputs || {})) {
      if (!output?.value) continue

      const base = sanitizeFilename(output.label || nodeId)

      if (output.kind === BATCH_VALUE_KINDS.IMAGE) {
        try {
          const { bytes, mimeType } = dataUrlToBytes(output.value)
          const filename = `${base}${extensionForMimeType(mimeType)}`
          entries.push({ name: `${runFolder}/${filename}`, bytes })
          outputs[nodeId] = { kind: output.kind, file: filename }
        } catch (error) {
          // Remote URLs that never got converted to base64 cannot be packaged
          outputs[nodeId] = { kind: output.kind, url: output.value }
        }
      } else {
        const filename = `${base}.txt`
        entries.push({ name: `${runFolder}/${filename}`, bytes: textToBytes(output.value) })
        outputs[nodeId] = { kind: output.kind, file: filename, text: output.value }
      }
    }

    return {
      run: index + 1,
      status: run.status,
      error: run.error,
      inputs: run.inputs,
      outputs
    }
  })

  entries.push({
    name: `${root}/results.json`,
    bytes: textToBytes(JSON.stringify({ createdAt: new Date().toISOString(), runs: manifest }, null, 2))
  })

  downloadZip(entries, `${root}.zip`)
  batchStore.hasUnsavedResults = false
}
</script>

<style scoped>
.batch-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
  /* Fill the near-fullscreen modal so the table gets all the leftover room */
  height: 100%;
  min-height: 0;
}

.batch-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--flora-space-4);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
}

.toolbar-group :deep(input[type="number"]) {
  width: 80px;
}

.toolbar-actions {
  gap: var(--flora-space-3);
}

.batch-status {
  display: flex;
  gap: var(--flora-space-4);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-secondary);
}

.status-running {
  color: var(--flora-color-accent);
  font-weight: var(--flora-font-weight-semibold);
}

.status-unsaved {
  color: var(--flora-color-warning);
}

.batch-warning {
  padding: var(--flora-space-3);
  background: var(--flora-color-warning-bg);
  border: var(--flora-border-width-thin) solid var(--flora-color-warning-border);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-primary);
}

.batch-warning--soft {
  background: var(--flora-color-info-bg);
  border-color: var(--flora-color-info-border);
  color: var(--flora-color-text-secondary);
}

.batch-legend {
  display: flex;
  gap: var(--flora-space-4);
  flex-wrap: wrap;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--flora-radius-full);
}

.legend-input {
  background: var(--flora-color-port-image);
}

.legend-output {
  background: var(--flora-color-port-prompt);
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  min-height: 200px;
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
}

.batch-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--flora-font-size-sm);
}

.batch-table th,
.batch-table td {
  padding: var(--flora-space-2);
  border-bottom: var(--flora-border-width-thin) solid var(--flora-color-border-subtle);
  text-align: left;
  vertical-align: top;
}

.batch-table th {
  position: sticky;
  top: 0;
  background: var(--flora-color-bg-tertiary);
  color: var(--flora-color-text-secondary);
  font-size: var(--flora-font-size-xs);
  font-weight: var(--flora-font-weight-semibold);
  white-space: nowrap;
  z-index: 1;
}

.row-running {
  background: var(--flora-color-info-bg);
}

.col-index {
  width: 32px;
  color: var(--flora-color-text-tertiary);
}

.col-input {
  min-width: 180px;
  max-width: 320px;
}

.col-output {
  min-width: 160px;
  max-width: 260px;
}

.col-status {
  width: 140px;
}

.col-actions {
  width: 90px;
  text-align: right;
  white-space: nowrap;
}

.text-cell {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.image-cell {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.image-cell input[type="file"] {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  max-width: 160px;
}

.cell-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--flora-radius-sm);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
}

.output-thumb {
  cursor: pointer;
}

.output-thumb:hover {
  border-color: var(--flora-color-accent);
}

.output-text {
  max-height: 120px;
  overflow-y: auto;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-primary);
  white-space: pre-wrap;
}

.cell-empty {
  color: var(--flora-color-text-tertiary);
}

.cell-error {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-danger);
  word-break: break-word;
}

.status-pill {
  display: inline-block;
  padding: 2px var(--flora-space-2);
  border-radius: var(--flora-radius-full);
  font-size: var(--flora-font-size-xs);
  font-weight: var(--flora-font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-pending {
  background: var(--flora-color-bg-tertiary);
  color: var(--flora-color-text-tertiary);
}

.status-running {
  background: var(--flora-color-accent);
  color: white;
}

.status-done {
  background: var(--flora-color-success);
  color: white;
}

.status-error {
  background: var(--flora-color-danger);
  color: white;
}

.preview-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 400px;
  padding: var(--flora-space-4);
}

.preview-modal img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--flora-radius-md);
}
</style>
