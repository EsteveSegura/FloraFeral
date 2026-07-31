# Flora Architecture

Architecture documentation for the visual node system for AI image generation.

---

## Overview

Flora is a Vue 3 application that allows creating visual workflows for image processing using a connectable node canvas. It uses:

- **Vue 3** - Frontend framework
- **VueFlow 1.48.0** - Node and edge system
- **Pinia** - State management
- **Replicate API** - AI image generation

---

## Project Structure

```
flora/
├── src/
│   ├── components/
│   │   ├── base/
│   │   │   └── BaseNode.vue          # Base component for all nodes
│   │   ├── canvas/
│   │   │   ├── FloatingMenu.vue      # Left sidebar menu with actions
│   │   │   ├── NodesSidebar.vue      # Draggable nodes list
│   │   │   ├── NodeContextMenu.vue   # Right-click menu on a node (batch marks)
│   │   │   └── SettingsModal.vue     # Settings configuration modal
│   │   ├── batch/
│   │   │   └── BatchRunModal.vue     # Batch Run panel
│   │   └── nodes/
│   │       ├── ImageNode.vue          # Image node
│   │       ├── PromptNode.vue         # Text/prompt node
│   │       ├── ImageGeneratorNode.vue # Image generator node
│   │       ├── GroupNode.vue          # Group container node
│   │       ├── TextGeneratorNode.vue  # Text generator node
│   │       └── DiffNode.vue           # Image comparison node
│   ├── composables/
│   │   ├── useFlowIO.js              # Import/export operations
│   │   ├── useViewportControls.js    # Lock/unlock and fit view
│   │   ├── useCopyPaste.js           # Copy/paste the selected nodes
│   │   ├── useNodeCreation.js        # Node creation helpers
│   │   ├── useDragAndDrop.js         # Drag & drop logic
│   │   ├── useGroupManagement.js     # Group/ungroup operations
│   │   └── useKeyboardShortcuts.js   # Global keyboard shortcuts
│   ├── views/
│   │   └── FlowCanvasView.vue        # Main app canvas (~177 lines)
│   ├── stores/
│   │   ├── flow.js                   # Pinia store (nodes/edges)
│   │   ├── settings.js               # Settings store (app config)
│   │   └── batch.js                  # Batch Run rows and progress
│   ├── lib/
│   │   ├── node-shapes.js            # Node schemas and types
│   │   ├── node-registry.js          # Node component registry
│   │   ├── connection.js             # Connection validation
│   │   ├── flow-io.js                # Flow export/import
│   │   ├── batch-io.js               # Batch input/output roles and IO
│   │   ├── prompt-template.js        # Shared {{VARIABLE}} handling
│   │   └── zip.js                    # ZIP writer for batch results
│   ├── services/
│   │   ├── replicate.js              # Replicate API integration
│   │   └── batch-executor.js         # Sequential batch orchestrator
│   └── styles/
│       └── FlowCanvasView.css        # Canvas styles
├── docs/
│   ├── STORE.md                      # Store guide
│   ├── CREATING-NODES.md             # Node creation guide
│   └── ARCHITECTURE.md               # This document
└── MODULARIZATION_PLAN.md            # Modularization documentation
```

---

## Data Flow

```
User interacts with Canvas
         ↓
   FlowCanvasView.vue
         ↓
    VueFlow Core (v-model)
         ↓
   flowStore (Pinia)
    ├── nodes[]
    └── edges[]
         ↓
    Individual nodes (useNode, useVueFlow)
         ↓
   External services (Replicate API)
```

### Flow Details

1. **User drags a node**: `FlowCanvasView.vue` → `flowStore.nodes.push()`
2. **User connects nodes**: VueFlow `onConnect` → `addEdges()` → `flowStore.edges`
3. **Node reads connections**: Computed over `flowStore.edges` + `flowStore.nodes`
4. **Node updates data**: `updateNodeData()` → VueFlow → `flowStore.nodes[i].data`
5. **Export**: `flowStore` → `exportFlow()` → JSON file
6. **Import**: JSON file → `importFlow()` → `flowStore.nodes/edges`

---

## Main Components

### 1. FlowCanvasView.vue

**Responsibility:** Main canvas coordinator (~177 lines after modularization)

**Modularization:** The view has been heavily refactored into reusable components and composables:

**UI Components:**
- `FloatingMenu.vue` - Left sidebar with action buttons
- `NodesSidebar.vue` - Draggable nodes list
- `SettingsModal.vue` - Settings configuration

**Composables used:**
```javascript
// VueFlow core
const { findNode, onConnect, addEdges, viewport, onNodeDragStop, fitView } = useVueFlow()

// Logic composables
const { fileInput, handleExport, handleImport, onFileSelected } = useFlowIO(flowStore, { addEdges })
const { isLocked, handleLockToggle, handleFitView } = useViewportControls(fitView)
const { copiedNodes, handleCopy, handlePaste } = useCopyPaste(flowStore, viewport, mousePosition, { addEdges })
const { createNodeAtPosition } = useNodeCreation(flowStore)

// Complex composables
const { onDragStart, onNodeItemClick, onDrop } = useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore)
const { handleGroup } = useGroupManagement(flowStore, onNodeDragStop)
useKeyboardShortcuts({ handleCopy, handlePaste, handleGroup, copiedNodes, flowStore })
```

**Features:**
- Available nodes sidebar with drag & drop
- Click node to create at viewport center
- Real-time connection validation
- Flow export/import
- Viewport controls (lock, fit view)
- Copy/paste the selection, keeping its layout and input connections (Ctrl+C, Ctrl+V)
- Group nodes (Ctrl+G)
- Settings modal
- Automatic group management

**Synchronization pattern:**
```vue
<VueFlow
  v-model:nodes="flowStore.nodes"
  v-model:edges="flowStore.edges"
>
```

**Modularization results:**
- Original: ~850 lines
- Current: ~177 lines
- Reduction: -79.2%

### 2. BaseNode.vue

**Responsibility:** Wrapper component for all nodes

**Props:**
- `id` - Unique node ID
- `type` - Node type
- `data` - Node data
- `label` - Fallback node title (the real one is read from `data.label`, see below)
- `inputs` - Array of input types
- `outputs` - Array of output types
- `icon` - Emoji for header
- `hideHeader` - Never show the header, even when the setting is on (used by `CommentNode`, whose content is already its text)
- `loading` - Loading state
- `error` - Error message
- `selected` - If selected

**Features:**
- Automatically renders handles (input/output ports)
- Manages visual state (selected, loading, error)
- Optional action button (`@action:run`)
- Consistent styles for all nodes
- Optional header display controlled by settings store
- **Renamable title:** double-clicking the header title turns it into an input (Enter confirms, Escape reverts, an empty name keeps the previous one). BaseNode owns the write — `updateNodeData(id, { label })` after `ensureUniqueLabel()` — so no node component duplicates it. Renaming with the header hidden goes through the right-click menu instead (`RenameNodeDialog`).

**The title comes from `data.label`, not from the `label` prop:**
```javascript
// VueFlow passes a top-level `label` down to every node component. Being
// undeclared there, that undefined value falls through $attrs into BaseNode and
// overrides the `:label="nodeData.label"` the node binds explicitly
const nodeLabel = computed(() => props.data?.label || props.label)
```

**Settings integration:**
```javascript
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

// Header visibility controlled by setting
<div v-if="settingsStore.showNodeHeaders" class="node-header">
  ...
</div>
```

### 3. Custom Nodes

Each node inherits from `BaseNode` and defines:

**ImageNode:**
- Inputs: none
- Outputs: `['image']`
- Features: Image upload, drag & drop, preview

**PromptNode:**
- Inputs: none
- Outputs: `['prompt']`
- Features: Text textarea, character counter

**ImageGeneratorNode:**
- Inputs: `['image', 'prompt']`
- Outputs: `['image']`
- Features: Replicate generation, model selection, configurable parameters, toolbar

**DiffNode:**
- Inputs: `['image', 'image']`
- Outputs: none
- Features: Pixel-by-pixel comparison, result canvas

---

## Type System and Validation

### Node Types (NODE_TYPES)

```javascript
export const NODE_TYPES = {
  IMAGE: 'image',
  IMAGE_GENERATOR: 'image-generator',
  PROMPT: 'prompt',
  DIFF: 'diff'
}
```

### Port Types (PORT_TYPES)

```javascript
export const PORT_TYPES = {
  IMAGE: 'image',
  PROMPT: 'prompt'
}
```

### IO Configuration

Each node defines what port types it has:

```javascript
function getNodeIOConfig(nodeType) {
  const configs = {
    'image': {
      inputs: [],
      outputs: ['image']
    },
    'image-generator': {
      inputs: ['image', 'prompt'],
      outputs: ['image']
    }
  }
  return configs[nodeType]
}
```

### Connection Validation

`src/lib/connection.js` validates:

1. **Valid nodes**: Source and target exist
2. **No loops**: Don't connect node to itself
3. **Compatible types**: `image → image`, `prompt → prompt`
4. **No duplicates**: Don't repeat same exact connection
5. **Limits**: Maximum connections per handle

```javascript
function validateConnection(connection, sourceNode, targetNode, existingEdges) {
  // Validations...
  return { valid: true/false, error: 'message' }
}
```

Executed at two moments:
- **Visual (preview)**: `isValidConnection()` in FlowCanvasView
- **On connect**: Automatic by VueFlow

---

## Composables Architecture

Flora uses Vue 3 composables pattern to separate and reuse logic. All composables are in `src/composables/`:

### Logic Composables

**useFlowIO.js** - Import/export operations
```javascript
export function useFlowIO(flowStore, { addEdges }) {
  const fileInput = ref(null)

  function handleExport() { /* ... */ }
  function handleImport() { /* ... */ }
  function onFileSelected(event) { /* ... */ }

  return { fileInput, handleExport, handleImport, onFileSelected }
}
```

**useViewportControls.js** - Lock/unlock and fit view
```javascript
export function useViewportControls(fitView) {
  const isLocked = ref(false)

  function handleLockToggle() { /* ... */ }
  function handleFitView() { /* ... */ }

  return { isLocked, handleLockToggle, handleFitView }
}
```

**useCopyPaste.js** - Copy/paste the whole selection
```javascript
export function useCopyPaste(flowStore, viewport, mousePosition, { addEdges }) {
  const copiedNodes = ref([])  // every selected node, group containers aside
  const copiedEdges = ref([])  // the edges feeding them

  function handleCopy() { /* ... */ }
  async function handlePaste() { /* ... */ }

  return { copiedNodes, handleCopy, handlePaste }
}
```
The paste anchors the bounding box of the snapshot at the mouse pointer, so the
relative layout survives. Edges between copied nodes are rewired to the clones
through an old-id → new-id map; input edges coming from outside the selection
keep their original source. Outgoing edges are never cloned: targets merge every
incoming edge, so a node the user did not copy would silently read two sources.
Group containers are skipped and their children are pasted as top-level nodes.

**useNodeCreation.js** - Node creation helpers
```javascript
export function useNodeCreation(flowStore) {
  function createNodeAtPosition(nodeType, position) { /* ... */ }

  return { createNodeAtPosition }
}
```

### Complex Composables

**useDragAndDrop.js** - Drag & drop logic for nodes and images
```javascript
export function useDragAndDrop(viewport, createNodeAtPosition, isNodesMenuOpen, flowStore) {
  function onDragStart(event, nodeType) { /* ... */ }
  function onNodeItemClick(nodeType) { /* ... */ }
  function onDrop(event) { /* ... */ }
  function handleImageFileDrop(file, position) { /* ... */ }

  return { onDragStart, onNodeItemClick, onDrop }
}
```

**useGroupManagement.js** - Group/ungroup operations
```javascript
export function useGroupManagement(flowStore, onNodeDragStop) {
  function setupDragStopHandler() { /* ... */ }
  async function handleGroup() { /* ... */ }

  setupDragStopHandler()

  return { handleGroup }
}
```

**useKeyboardShortcuts.js** - Global keyboard shortcuts
```javascript
export function useKeyboardShortcuts({ handleCopy, handlePaste, handleGroup, copiedNodes, flowStore }) {
  function handleKeyDown(event) { /* ... */ }

  onMounted(() => window.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))

  return {}
}
```

### Composables Benefits

- ✅ **Reusability** - Logic can be shared across components
- ✅ **Testability** - Each composable can be tested independently
- ✅ **Maintainability** - Single responsibility principle
- ✅ **Readability** - Main component stays focused and clean

---

## State Management (Pinia)

### Flow Store

The flow store (`useFlowStore`) maintains canvas state:

```javascript
{
  nodes: ref([]),      // Canvas nodes
  edges: ref([]),      // Connections
  isLoading: ref(false),
  error: ref(null),

  // Actions
  reset(),
  setLoading(),
  setError(),
  clearError()
}
```

### Settings Store

The settings store (`useSettingsStore`) maintains app configuration:

```javascript
{
  showNodeHeaders: ref(false),  // Show/hide node headers

  // Actions
  toggleNodeHeaders(),
  setNodeHeaders(value)
}
```

### Why so simple?

VueFlow handles internally:
- ❌ ~~Add/remove nodes~~ → v-model synchronizes it
- ❌ ~~Update positions~~ → v-model synchronizes it
- ❌ ~~Node getters~~ → `.find()` direct on arrays
- ❌ ~~Connection getters~~ → `.filter()` direct on arrays

We only need:
- ✅ Reactive arrays for v-model
- ✅ UI state (loading, error)
- ✅ Canvas reset
- ✅ App settings

---

## VueFlow Composables Pattern

### In FlowCanvasView (Main Canvas)

```javascript
import { useVueFlow } from '@vue-flow/core'

const {
  findNode,      // Find node by ID
  onConnect,     // Listen to connection event
  addEdges,      // Add edges programmatically
  updateNodeData // Update node data
} = useVueFlow()

// Register handler
onConnect((params) => {
  addEdges([params])  // VueFlow syncs with flowStore.edges
})
```

### In Custom Nodes

```javascript
import { useNode, useVueFlow } from '@vue-flow/core'

// Access current node data
const { node } = useNode()
const nodeData = computed(() => node.data)

// Update current node
const { updateNodeData } = useVueFlow()
updateNodeData(props.id, { newField: 'value' })

// Access other nodes/edges (reactivity)
import { useFlowStore } from '@/stores/flow'
const flowStore = useFlowStore()

const connectedNodes = computed(() => {
  return flowStore.edges
    .filter(edge => edge.target === props.id)
    .map(edge => flowStore.nodes.find(n => n.id === edge.source))
})
```

---

## Reactivity and Synchronization

### Bidirectional v-model

```vue
<VueFlow
  v-model:nodes="flowStore.nodes"
  v-model:edges="flowStore.edges"
>
```

**Synchronization flow:**

```
User drags node
    ↓
VueFlow updates internal position
    ↓
v-model syncs → flowStore.nodes[i].position
    ↓
Any component watching flowStore.nodes sees the change
```

### Maintaining Array References

**Critical:** Never replace references:

```javascript
// ❌ Breaks v-model
flowStore.nodes = [...flowStore.nodes, newNode]

// ✅ Maintains reference
flowStore.nodes.push(newNode)
```

### Reactive Computeds in Nodes

```javascript
// Automatically re-evaluates when edges or nodes change
const connectedData = computed(() => {
  const edges = flowStore.edges.filter(...)
  const nodes = flowStore.nodes.filter(...)
  // ...
})
```

---

## External API Integration

### Replicate Service

**File:** `src/services/replicate.js`

**Responsibility:**
- AI model configuration
- Image generation
- Dynamic parameter handling (UI schema)

**Usage:**
```javascript
import replicateService from '@/services/replicate'

// List available models
const models = replicateService.listModels()

// Get model UI schema
const uiSchema = replicateService.getModelUiSchema('seedream-4')

// Generate image
const result = await replicateService.generateImage({
  prompt: 'a cat',
  imageSrc: ['https://...'],
  model: 'seedream-4',
  params: { width: 2048, height: 2048 }
})
```

**Configured models:**
- `nano-banana-pro` - Fast model
- `seedream-4` - Advanced model with more options

Each model defines:
- Accepted parameters
- Default values
- UI Schema for toolbar (dynamic controls)

---

## Flow Export/Import

### JSON Format

```json
{
  "version": "1.0.0",
  "createdAt": "2025-12-11T...",
  "nodes": [
    {
      "id": "node_123",
      "type": "image",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "My Image", "src": "data:..." },
      "io": { "inputs": [], "outputs": ["image"] }
    }
  ],
  "edges": [
    {
      "id": "edge_456",
      "source": "node_123",
      "target": "node_789",
      "sourceHandle": "output-0",
      "targetHandle": "input-0"
    }
  ]
}
```

### Export Process

```javascript
import { downloadFlow } from '@/lib/flow-io'

downloadFlow(flowStore)
// → Serializes store to JSON
// → Creates blob
// → Downloads as flow-{timestamp}.json
```

### Import Process

```javascript
import { loadFlowFromFile } from '@/lib/flow-io'

await loadFlowFromFile(file, flowStore, { addEdges })
// → Reads and parses JSON
// → Validates structure
// → Clears current store (splice)
// → Adds nodes (push)
// → Waits 100ms (VueFlow processes nodes)
// → Adds edges with addEdges()
```

**Important:** Uses VueFlow's `addEdges()` for correct internal state synchronization.

---

## Code Patterns

### 1. Create a Node

```javascript
import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'

const newNode = createNode(
  `node_${Date.now()}`,
  NODE_TYPES.IMAGE,
  { x: 100, y: 100 },
  { label: 'New Image' },
  getNodeIOConfig(NODE_TYPES.IMAGE)
)

flowStore.nodes.push(newNode)
```

### 2. Update Node Data

```javascript
import { useVueFlow } from '@vue-flow/core'

const { updateNodeData } = useVueFlow()

updateNodeData(nodeId, {
  prompt: 'new prompt',
  lastOutputSrc: 'https://...'
})
```

### 3. Read Data from Connected Nodes

```javascript
import { useFlowStore } from '@/stores/flow'

const flowStore = useFlowStore()

const connectedImages = computed(() => {
  const incomingEdges = flowStore.edges.filter(e => e.target === props.id)

  return incomingEdges
    .map(edge => {
      const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
      return sourceNode?.data?.src || sourceNode?.data?.lastOutputSrc
    })
    .filter(Boolean)
})
```

### 4. Async Operation with Loading

```javascript
const isLoading = ref(false)

async function handleAction() {
  isLoading.value = true

  try {
    const result = await api.call()

    updateNodeData(props.id, {
      result: result,
      error: null
    })
  } catch (error) {
    updateNodeData(props.id, {
      error: error.message
    })
  } finally {
    isLoading.value = false
  }
}
```

---

## Node Lifecycle

1. **Creation**
   - User drags from sidebar
   - `onDrop()` creates node with `createNode()`
   - Node added to `flowStore.nodes`
   - VueFlow renders component

2. **Connection**
   - User drags from handle to handle
   - `isValidConnection()` validates on preview
   - `onConnect()` fires on release
   - `addEdges()` adds edge
   - Connected nodes detect change in computed

3. **Update**
   - User modifies data in node
   - Node calls `updateNodeData()`
   - VueFlow updates internal state
   - v-model syncs with `flowStore.nodes`
   - Other connected nodes see change (reactive computed)

4. **Deletion**
   - User presses Delete/Backspace
   - VueFlow removes node from internal state
   - v-model syncs with `flowStore.nodes`
   - VueFlow automatically removes connected edges

---

## Best Practices

### ✅ Do

1. **Use VueFlow composables**
   ```javascript
   const { node } = useNode()
   const { updateNodeData } = useVueFlow()
   ```

2. **Maintain array references**
   ```javascript
   flowStore.nodes.push(newNode)
   flowStore.nodes.splice(0, flowStore.nodes.length)
   ```

3. **Reactive computeds for connected data**
   ```javascript
   const connectedData = computed(() => {
     return flowStore.edges.filter(...)
   })
   ```

4. **Handle errors**
   ```javascript
   try {
     // operation
   } catch (error) {
     updateNodeData(props.id, { error: error.message })
   }
   ```

### ❌ Don't

1. **Don't replace arrays**
   ```javascript
   flowStore.nodes = [...] // ❌ Breaks v-model
   ```

2. **Don't use deprecated methods**
   ```javascript
   flowStore.addNode()         // ❌ Removed
   flowStore.updateNodeData()  // ❌ Removed
   ```

3. **Don't access props.data directly in nodes**
   ```javascript
   props.data.text = 'new' // ❌ Not reactive

   // ✅ Use composable
   updateNodeData(props.id, { text: 'new' })
   ```

4. **Don't modify store without composables for VueFlow operations**
   ```javascript
   flowStore.edges.push(newEdge) // ❌ Use addEdges()
   ```

---

## Performance

### Implemented Optimizations

1. **markRaw for components**
   ```javascript
   nodeTypes[type] = markRaw(component)
   ```
   Prevents Vue from making components reactive.

2. **Computeds instead of watches**
   ```javascript
   const data = computed(() => flowStore.nodes.find(...))
   ```
   Only recalculates when dependencies change.

3. **Direct mutations to add nodes**
   ```javascript
   flowStore.nodes.push(newNode)
   ```
   Faster than creating new array.

### Limits

- **Recommended max nodes:** ~100 nodes
- **Recommended max edges:** ~200 edges
- **Images:** Use data URLs or external URLs, avoid huge images

---

## Testing

### Recommended Manual Tests

1. **Create and connect nodes**
   - Drag each node type
   - Connect in different orders
   - Try invalid connections

2. **Reactivity**
   - Change data in source node
   - Verify connected nodes update
   - Test with multiple connected nodes

3. **Export/Import**
   - Export complex flow
   - Import in clean canvas
   - Verify everything works

4. **Errors**
   - Cause errors (e.g., invalid API key)
   - Verify they display correctly
   - Verify recovery is possible

---

## Troubleshooting

### Problem: Edges don't appear

**Cause:** Direct modification of `flowStore.edges`

**Solution:** Use VueFlow's `addEdges()`
```javascript
const { addEdges } = useVueFlow()
addEdges([newEdge])
```

### Problem: Nodes lose state when adding new node

**Cause:** Array replacement `flowStore.nodes = [...]`

**Solution:** Use `.push()`
```javascript
flowStore.nodes.push(newNode)
```

### Problem: Changes in connected nodes not detected

**Cause:** Not using reactive computed

**Solution:**
```javascript
const connectedData = computed(() => {
  return flowStore.edges.filter(...)  // Reactive
})
```

### Problem: "An edge needs a source and a target"

**Cause:** VueFlow can't find nodes when creating edge

**Solution:** Ensure nodes exist before adding edges. In import, use delay:
```javascript
flowStore.nodes.push(...nodes)
await new Promise(resolve => setTimeout(resolve, 100))
addEdges(edges)
```

---

## Extensibility

### Add New Node Type

See complete guide in `docs/CREATING-NODES.md`

Summary steps:
1. Define type in `NODE_TYPES`
2. Create Vue component
3. Register in `node-registry.js`
4. Add IO config
5. Add initialization (if needed)

### Add New AI Model

In `src/services/replicate.js`:

```javascript
const modelConfigs = {
  'new-model': {
    id: 'user/model',
    label: 'New Model',
    defaults: { /* parameters */ },
    uiSchema: {
      controls: [/* UI controls */]
    }
  }
}
```

### Add Custom Validation

In `src/lib/connection.js`:

```javascript
export function validateConnection(connection, sourceNode, targetNode, edges) {
  // Your custom validation
  if (customCondition) {
    return {
      valid: false,
      error: 'Error message'
    }
  }

  // Existing validations...
}
```

---

## Additional Resources

- **VueFlow Docs:** https://vueflow.dev/
- **Pinia Docs:** https://pinia.vuejs.org/
- **Vue 3 Docs:** https://vuejs.org/
- **Replicate API:** https://replicate.com/docs

---

## Batch Run

Runs the whole workflow N times, each run with a different set of inputs, and collects the outputs in a table.

**Files:**

| File | Responsibility |
|------|---------------|
| `src/lib/batch-io.js` | Which node types can be batch input/output, table column specs, input patches, output readers |
| `src/lib/prompt-template.js` | Shared `{{VARIABLE}}` extraction and substitution |
| `src/lib/zip.js` | Dependency-free ZIP writer (STORE + CRC32) for the results download |
| `src/lib/csv.js` | CSV serialize/parse for the input table round-trip (quoting, delimiter sniffing, BOM) |
| `src/services/batch-executor.js` | `runBatch()` — the sequential orchestrator |
| `src/stores/batch.js` | Rows, progress and unsaved-results flag |
| `src/components/canvas/NodeContextMenu.vue` | Right-click menu to mark a node |
| `src/components/batch/BatchRunModal.vue` | The panel |

Each row also has its own **Run / Retry** button, which executes only that row through the same `runBatch()` call (with a single-element list) and leaves every other row's result untouched. Useful for re-doing a failed generation or a bad output without paying for the whole batch again.

### CSV round-trip

The input table can be downloaded as CSV, filled in elsewhere (Excel, Sheets, a script) and imported back. The imported row count wins, so handing back 8 rows for a 4-row template is fine.

- **Headers are the human-readable column labels** (`Prompt Template · ANIMAL`), i.e. the node names the user can edit from the header. Import matches by exact header; a header that matches nothing is reported as ignored rather than silently landing in the wrong column. A header for a variable the canvas does not declare yet is resolved through its `<node label> · <VARIABLE>` prefix, since a row's own template may introduce it. This is why node names are kept unique (`src/lib/node-label.js`): two homonymous inputs would collapse into a single column on import, and the first one would silently never receive its values.
- **Quoting is handled properly** — prompts routinely contain commas, quotes and newlines. Export writes a UTF-8 BOM so Excel does not mangle accents, and import sniffs the delimiter (`,`, `;`, tab) because localized Excel writes `;`.
- **Images travel as filenames.** An image cell holds `{ name, src }`: the CSV carries only `name`, and the bytes arrive when the user drops the files on the panel's upload zone, where they are matched to every cell referencing that filename. A file used by several rows is applied to all of them.
- **A row missing its image is skipped, not blocking.** `Run batch` generates the complete rows and marks the rest `Missing image: <file>`; their per-row Run button stays disabled until the file is uploaded.

### Marking nodes

A node's role lives in `node.data.batchRole` (`'input' | 'output'`), set from the node's right-click menu. Since `flow-io.js` serializes `data` as a whole, the marks are saved and loaded with the flow — no format change.

| Role | Allowed types | Field |
|------|--------------|-------|
| `input` | `image` | `data.src` |
| `input` | `prompt` | `data.prompt` |
| `input` | `prompt-template` | `data.variables` |
| `output` | `image-generator` | `data.lastOutputSrc` |
| `output` | `text-generator` | `data.generatedText` |
| `output` | `video-generator` | `data.lastOutputVideoSrc` |

`BaseNode.vue` renders the IN/OUT badge from `data.batchRole`, so no individual node component needed changes.

### Why runs are sequential

`workflow-executor.js` does not execute nodes itself: it emits `workflow:node:execute:<id>` on the event bus and the **mounted node component** performs the API call. There is one component instance per node on the canvas, so parallel runs would collide. `runBatch()` therefore loops:

```javascript
for (const run of runs) {
  applyInputs(run)         // write data of the marked input nodes
  clearOutputs()           // so "empty" means "produced nothing"
  await waitForGraphSettled()
  await workflowExecutor.executeWorkflow({ forceRerun: true })
  collectOutputs(run)
}
restoreSnapshot()          // the canvas goes back to how the user left it
```

**Three non-obvious behaviours it has to work around:**

1. **Errors are invisible to the executor.** `handleGenerate()` in both generators catches its own API errors and never rethrows, so the bus reports `NODE_COMPLETE` even on failure and `executionStore.nodeErrors` stays empty. The batch subscribes to `NODE_COMPLETE`/`NODE_ERROR` and reads `data.error` **synchronously** in the callback — `ImageGeneratorNode` wipes it 5 seconds later.
2. **`result.success` is not trustworthy.** `executeWorkflow` reports success when nothing was executable and when the run was stopped. The batch decides per row from the outputs it captured.
3. **Inputs must be fully propagated before executing.** The executor emits synchronously and the generator reads its `connectedPrompt` computed right away. Chains like `prompt → prompt-template → generator` go through several watchers, so `waitForGraphSettled()` waits until the graph stops changing instead of counting ticks.

**Writing into a node that owns local state.** A node component that mirrors `data` into a local ref will fight an external write. `PromptTemplateNode` keeps `localVariables`, and its `watch(outputPrompt)` republishes **both** `prompt` and `variables` from that local state. When the batch wrote new `variables`, that watcher fired on the same flush and reverted them — the run silently used the value from the canvas. Two things keep this correct:

- The node's `data.variables → localVariables` watcher runs with `flush: 'sync'`, so the external value is adopted before any other watcher can republish stale local state.
- Inputs are applied **upstream first** (`topologicalSort` from `graph-utils.js`). A PromptTemplate resolves its template from the node feeding it, so if that node is also a batch input it must already hold this run's value.

When the upstream prompt is itself a batch input, each row can carry a different template, so the variable columns are the union of the canvas template's variables and those declared by any row.

While a batch runs, the Play button in `WorkflowControls` is disabled: `isExecuting` briefly drops to `false` between runs, and a concurrent execution would corrupt the executor singleton.

---

## Architecture Changelog

### v3.1 - Batch Run

- ✅ Mark nodes as batch input/output from a node context menu (serializable)
- ✅ Batch Run panel: N runs, per-run inputs, collected outputs, ZIP download
- ✅ Sequential batch executor with canvas snapshot/restore
- ✅ Dependency-free ZIP writer

### v3.0 - Modularization

- ✅ FlowCanvasView reduced from ~850 to ~177 lines (-79.2%)
- ✅ Extracted 3 UI components (FloatingMenu, NodesSidebar, SettingsModal)
- ✅ Created 7 composables for logic separation
- ✅ Added settings store for app configuration
- ✅ Implemented keyboard shortcuts (Ctrl+C/V/G)
- ✅ Added group management functionality
- ✅ Copy/paste nodes feature
- ✅ Viewport controls (lock/unlock, fit view)
- ✅ Optional node headers via settings
- ✅ Click node to create at viewport center

### v2.0 - VueFlow Composables Migration

- ✅ Simplified store (removed 6 actions, 2 getters)
- ✅ VueFlow composables in all nodes
- ✅ Bidirectional v-model with VueFlow
- ✅ Full reactivity with direct flowStore
- ✅ Export/Import with addEdges()

### v1.0 - Original Version

- Store with 9 actions, 2 getters
- Manual store access in all nodes
- Manual lookups in ~80 lines of code
- Direct store mutations
