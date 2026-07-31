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

      <!-- CSV round-trip -->
      <div class="csv-bar">
        <BaseButton
          variant="primary"
          size="sm"
          :disabled="!inputColumns.length || batchStore.isRunning"
          title="Download the input table as a CSV to fill in elsewhere"
          @click="handleDownloadCsv"
        >
          Download CSV
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          :disabled="!inputColumns.length || batchStore.isRunning"
          title="Load a filled CSV — it replaces the rows below"
          @click="csvInput?.click()"
        >
          Import CSV
        </BaseButton>
        <input
          ref="csvInput"
          type="file"
          accept=".csv,text/csv"
          style="display: none"
          @change="onCsvSelected"
        />
        <span v-if="csvMessage" class="csv-message" :class="{ 'csv-message--error': csvIsError }">
          {{ csvMessage }}
        </span>
      </div>

      <!-- Pending images referenced by the CSV -->
      <div v-if="requiredImages.length" class="image-inbox">
        <div class="image-inbox-header">
          <strong>Images referenced by the table</strong>
          <span v-if="missingImages.length" class="image-inbox-count">
            {{ missingImages.length }} missing
          </span>
          <span v-else class="image-inbox-count image-inbox-count--ok">all uploaded</span>
        </div>

        <div
          class="image-dropzone"
          :class="{ 'image-dropzone--over': isDraggingImages }"
          @dragover.prevent="isDraggingImages = true"
          @dragleave.prevent="isDraggingImages = false"
          @drop.prevent="onImagesDropped"
        >
          <BaseButton
            variant="primary"
            size="sm"
            :disabled="batchStore.isRunning"
            @click="imagesInput?.click()"
          >
            Select files…
          </BaseButton>
          <span>or drag them here — matched by filename</span>
          <input
            ref="imagesInput"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="onImagesSelected"
          />
        </div>

        <ul class="image-list">
          <li
            v-for="image in requiredImages"
            :key="image.name"
            :class="{ 'image-missing': !image.uploaded }"
          >
            <span class="image-check">{{ image.uploaded ? '✓' : '✗' }}</span>
            <span class="image-name">{{ image.name }}</span>
            <span class="image-rows">{{ formatRowList(image.rows) }}</span>
          </li>
        </ul>
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
                    v-if="run.inputs[column.nodeId]?.src"
                    :src="run.inputs[column.nodeId].src"
                    class="cell-thumb"
                    alt="Input"
                  />
                  <span v-else-if="run.inputs[column.nodeId]?.name" class="cell-error">
                    Missing file: {{ run.inputs[column.nodeId].name }}
                  </span>
                  <span v-if="run.inputs[column.nodeId]?.name" class="image-filename">
                    {{ run.inputs[column.nodeId].name }}
                  </span>
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
                    @click="openPreview(run.outputs[node.id])"
                  />
                  <video
                    v-else-if="run.outputs[node.id].kind === BATCH_VALUE_KINDS.VIDEO"
                    :src="run.outputs[node.id].value"
                    class="cell-thumb output-thumb"
                    muted
                    playsinline
                    preload="metadata"
                    @click="openPreview(run.outputs[node.id])"
                  ></video>
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
    v-if="preview"
    :model-value="true"
    :show-header="false"
    :show-footer="false"
    size="xl"
    @update:model-value="preview = null"
  >
    <div class="preview-modal">
      <video
        v-if="preview.kind === BATCH_VALUE_KINDS.VIDEO"
        :src="preview.value"
        controls
        autoplay
        loop
        playsinline
      ></video>
      <img v-else :src="preview.value" alt="Output preview" />
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
  isBinaryValueKind,
  reachesAnyNode,
  resolveUpstreamPromptNode
} from '@/lib/batch-io'
import { extractVariables } from '@/lib/prompt-template'
import { runBatch } from '@/services/batch-executor'
import { dataUrlToBytes, extensionForMimeType, textToBytes, downloadZip, sanitizeFilename } from '@/lib/zip'
import { toCsv, parseCsv, downloadCsv } from '@/lib/csv'

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
// Output cell opened in the large preview modal: { kind, value }
const preview = ref(null)
const csvInput = ref(null)
const imagesInput = ref(null)
const csvMessage = ref('')
const csvIsError = ref(false)
const isDraggingImages = ref(false)

// Monotonic counter so CSV-imported rows always get unique keys
let runSeq = 0

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

/**
 * Open an output cell in the large preview modal
 * @param {Object} output - Cell from run.outputs: { kind, value }
 */
function openPreview(output) {
  preview.value = { kind: output.kind, value: output.value }
}

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

  readFileAsDataUrl(file).then(src => {
    batchStore.runs[runIndex].inputs[nodeId] = { name: file.name, src }
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/**
 * Every filename referenced by an image cell, with the rows using it
 */
const requiredImages = computed(() => {
  const byName = new Map()

  batchStore.runs.forEach((run, index) => {
    for (const column of inputColumns.value) {
      if (column.kind !== BATCH_VALUE_KINDS.IMAGE) continue

      const value = run.inputs?.[column.nodeId]
      if (!value?.name) continue

      const entry = byName.get(value.name) || { name: value.name, rows: [], uploaded: true }
      entry.rows.push(index + 1)
      if (!value.src) entry.uploaded = false
      byName.set(value.name, entry)
    }
  })

  return [...byName.values()]
})

const missingImages = computed(() => requiredImages.value.filter(image => !image.uploaded))

function formatRowList(rows) {
  return rows.length === 1 ? `row ${rows[0]}` : `rows ${rows.join(', ')}`
}

/**
 * Assign uploaded files to every cell referencing them by name
 */
async function absorbImageFiles(files) {
  const wanted = new Set(requiredImages.value.map(image => image.name))
  let matched = 0
  let ignored = 0

  for (const file of files) {
    if (!wanted.has(file.name)) {
      ignored++
      continue
    }

    const src = await readFileAsDataUrl(file)

    for (const run of batchStore.runs) {
      for (const column of inputColumns.value) {
        if (column.kind !== BATCH_VALUE_KINDS.IMAGE) continue

        const value = run.inputs?.[column.nodeId]
        if (value?.name === file.name) {
          run.inputs[column.nodeId] = { name: file.name, src }
        }
      }
    }
    matched++
  }

  setCsvMessage(
    `${matched} image${matched === 1 ? '' : 's'} matched` +
      (ignored ? `, ${ignored} ignored (no cell references them)` : ''),
    ignored > 0 && matched === 0
  )
}

function onImagesSelected(event) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  if (files.length) absorbImageFiles(files)
}

function onImagesDropped(event) {
  isDraggingImages.value = false
  const files = [...(event.dataTransfer?.files || [])]
  if (files.length) absorbImageFiles(files)
}

/**
 * Read the value a column holds for a row, as plain CSV text
 */
function cellToText(run, column) {
  const value = run.inputs?.[column.nodeId]

  if (column.kind === BATCH_VALUE_KINDS.IMAGE) return value?.name || ''
  if (column.kind === BATCH_VALUE_KINDS.VARIABLES) return value?.[column.variable] || ''
  return value || ''
}

function handleDownloadCsv() {
  const headers = ['run', ...inputColumns.value.map(column => column.label)]
  const rows = batchStore.runs.map((run, index) => [
    index + 1,
    ...inputColumns.value.map(column => cellToText(run, column))
  ])

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  downloadCsv(toCsv(headers, rows), `batch-inputs-${timestamp}.csv`)
  setCsvMessage(`Downloaded ${rows.length} row${rows.length === 1 ? '' : 's'}.`)
}

/**
 * Map each CSV header to the column it feeds.
 * Headers are the human-readable labels, so a renamed node simply fails to
 * match and is reported instead of silently landing in the wrong column.
 * @returns {Array<Object|null>} aligned with the header row
 */
function mapHeaders(headers) {
  const byLabel = new Map(inputColumns.value.map(column => [column.label.trim(), column]))

  return headers.map(rawHeader => {
    const header = rawHeader.trim()
    if (!header || header.toLowerCase() === 'run') return null

    const known = byLabel.get(header)
    if (known) return known

    // A variable the canvas does not declare yet (a row's own template may).
    // Resolve it through the node label prefix: "<node label> · <VARIABLE>"
    const separator = header.lastIndexOf(' · ')
    if (separator === -1) return null

    const nodeLabel = header.slice(0, separator).trim()
    const variable = header.slice(separator + 3).trim()

    const spec = inputSpecs.value.find(
      item => item.kind === BATCH_VALUE_KINDS.VARIABLES && item.label === nodeLabel
    )
    if (!spec || !variable) return null

    return { nodeId: spec.nodeId, kind: BATCH_VALUE_KINDS.VARIABLES, variable }
  })
}

function onCsvSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => importCsv(String(reader.result))
  reader.onerror = () => setCsvMessage('Could not read the file.', true)
  reader.readAsText(file)
}

/**
 * Replace the table with the contents of a filled CSV.
 * Row count comes from the file, so importing more (or fewer) rows than were
 * downloaded is fine.
 */
function importCsv(text) {
  const matrix = parseCsv(text)

  if (matrix.length < 2) {
    setCsvMessage('The CSV needs a header row and at least one data row.', true)
    return
  }

  const [headerRow, ...dataRows] = matrix
  const mapping = mapHeaders(headerRow)

  if (mapping.every(entry => entry === null)) {
    setCsvMessage('No column header matched the current inputs. Download the CSV again.', true)
    return
  }

  const unmatched = headerRow.filter(
    (header, index) => mapping[index] === null && header.trim() && header.trim().toLowerCase() !== 'run'
  )

  // Keep already uploaded images so re-importing does not lose them
  const knownImages = new Map()
  for (const run of batchStore.runs) {
    for (const value of Object.values(run.inputs || {})) {
      if (value?.name && value?.src) knownImages.set(value.name, value.src)
    }
  }

  const runs = dataRows.map((cells, rowIndex) => {
    const inputs = {}

    // Seed with the canvas values so columns absent from the CSV keep working
    for (const node of inputNodes.value) {
      inputs[node.id] = getBatchInputInitialValue(node)
    }

    mapping.forEach((column, columnIndex) => {
      if (!column) return
      const cell = (cells[columnIndex] ?? '').trim()

      if (column.kind === BATCH_VALUE_KINDS.IMAGE) {
        inputs[column.nodeId] = { name: cell, src: cell ? knownImages.get(cell) || null : null }
      } else if (column.kind === BATCH_VALUE_KINDS.VARIABLES) {
        if (typeof inputs[column.nodeId] !== 'object' || inputs[column.nodeId] === null) {
          inputs[column.nodeId] = {}
        }
        inputs[column.nodeId][column.variable] = cell
      } else {
        inputs[column.nodeId] = cells[columnIndex] ?? ''
      }
    })

    return { id: `run-csv-${rowIndex}-${runSeq++}`, inputs, outputs: {}, status: 'pending', error: null }
  })

  batchStore.setRuns(runs)
  runCount.value = runs.length

  const details = unmatched.length ? ` Ignored unknown column(s): ${unmatched.join(', ')}.` : ''
  setCsvMessage(`Imported ${runs.length} row${runs.length === 1 ? '' : 's'}.${details}`, unmatched.length > 0)
}

function setCsvMessage(message, isError = false) {
  csvMessage.value = message
  csvIsError.value = isError
}

/**
 * Whether a single row can be executed on its own
 */
function canRunRow(run) {
  return (
    outputNodes.value.length > 0 &&
    !batchStore.isRunning &&
    !rowMissingImages(run).length &&
    !inputColumns.value.some(column => missingVariablesFor(run, column).length > 0)
  )
}

/**
 * Filenames a row references but whose bytes have not been uploaded yet
 */
function rowMissingImages(run) {
  return inputColumns.value
    .filter(column => column.kind === BATCH_VALUE_KINDS.IMAGE)
    .map(column => run.inputs?.[column.nodeId])
    .filter(value => value?.name && !value.src)
    .map(value => value.name)
}

function rowActionTitle(run) {
  if (outputNodes.value.length === 0) return 'Mark a node as batch output first'
  if (batchStore.isRunning) return 'A run is already in progress'

  const missing = rowMissingImages(run)
  if (missing.length) return `Upload ${missing.join(', ')} first`
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

  // Rows still waiting for an image are skipped, not blocking: a partial
  // upload should still get the complete rows generated
  const runnable = []
  batchStore.runs.forEach((run, index) => {
    const missing = rowMissingImages(run)
    if (missing.length) {
      batchStore.updateRun(index, { status: 'error', error: `Missing image: ${missing.join(', ')}` })
    } else {
      runnable.push(index)
    }
  })

  if (!runnable.length) {
    setCsvMessage('Every row is waiting for an image upload.', true)
    return
  }

  await executeRows(runnable)
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
    setCsvMessage('')
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

      if (isBinaryValueKind(output.kind)) {
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

    // Serialize inputs by column label, keeping image cells as filenames so
    // the manifest does not balloon with base64 payloads
    const inputs = {}
    for (const column of inputColumns.value) {
      inputs[column.label] = cellToText(run, column)
    }

    return {
      run: index + 1,
      status: run.status,
      error: run.error,
      inputs,
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

.csv-bar {
  display: flex;
  align-items: center;
  gap: var(--flora-space-3);
  flex-wrap: wrap;
}

.csv-message {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
}

.csv-message--error {
  color: var(--flora-color-warning);
}

.image-inbox {
  padding: var(--flora-space-3);
  background: var(--flora-color-bg-tertiary);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
  max-height: 180px;
  overflow-y: auto;
  flex-shrink: 0;
}

.image-inbox-header {
  display: flex;
  align-items: center;
  gap: var(--flora-space-3);
  font-size: var(--flora-font-size-sm);
  color: var(--flora-color-text-secondary);
}

.image-inbox-count {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-warning);
}

.image-inbox-count--ok {
  color: var(--flora-color-success);
}

.image-dropzone {
  display: flex;
  align-items: center;
  gap: var(--flora-space-3);
  padding: var(--flora-space-3);
  border: var(--flora-border-width-medium) dashed var(--flora-color-border-default);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  transition: all var(--flora-transition-fast);
}

.image-dropzone--over {
  border-color: var(--flora-color-accent);
  background: var(--flora-color-info-bg);
}

.image-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--flora-font-size-xs);
}

.image-list li {
  display: flex;
  align-items: center;
  gap: var(--flora-space-2);
  color: var(--flora-color-text-secondary);
}

.image-list li.image-missing {
  color: var(--flora-color-danger);
}

.image-check {
  width: 12px;
}

.image-name {
  font-family: var(--flora-font-family-mono);
  min-width: 140px;
}

.image-rows {
  color: var(--flora-color-text-tertiary);
}

.image-filename {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  font-family: var(--flora-font-family-mono);
  word-break: break-all;
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
  display: block;
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--flora-radius-sm);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  background: var(--flora-color-bg-tertiary);
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

.preview-modal img,
.preview-modal video {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: var(--flora-radius-md);
}
</style>
