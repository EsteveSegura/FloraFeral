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
│   │   └── nodes/
│   │       ├── ImageNode.vue          # Image node
│   │       ├── PromptNode.vue         # Text/prompt node
│   │       ├── ImageGeneratorNode.vue # Image generator node
│   │       └── DiffNode.vue           # Image comparison node
│   ├── views/
│   │   └── FlowCanvasView.vue        # Main app canvas
│   ├── stores/
│   │   └── flow.js                   # Pinia store (global state)
│   ├── lib/
│   │   ├── node-shapes.js            # Node schemas and types
│   │   ├── node-registry.js          # Node component registry
│   │   ├── connection.js             # Connection validation
│   │   └── flow-io.js                # Flow export/import
│   ├── services/
│   │   └── replicate.js              # Replicate API integration
│   └── styles/
│       └── FlowCanvasView.css        # Canvas styles
├── docs/
│   ├── STORE.md                      # Store guide
│   ├── CREATING-NODES.md             # Node creation guide
│   └── ARCHITECTURE.md               # This document
└── TASK-*.md                         # Migration documentation
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

**Responsibility:** Main canvas, drag & drop, node/edge management

**Composables used:**
```javascript
const { findNode, onConnect, addEdges } = useVueFlow()
```

**Features:**
- Available nodes sidebar
- Drag & drop nodes to canvas
- Real-time connection validation
- Flow export/import
- Node type registration

**Synchronization pattern:**
```vue
<VueFlow
  v-model:nodes="flowStore.nodes"
  v-model:edges="flowStore.edges"
>
```

### 2. BaseNode.vue

**Responsibility:** Wrapper component for all nodes

**Props:**
- `id` - Unique node ID
- `type` - Node type
- `data` - Node data
- `label` - Node title
- `inputs` - Array of input types
- `outputs` - Array of output types
- `icon` - Emoji for header
- `loading` - Loading state
- `error` - Error message
- `selected` - If selected

**Features:**
- Automatically renders handles (input/output ports)
- Manages visual state (selected, loading, error)
- Optional action button (`@action:run`)
- Consistent styles for all nodes

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

## State Management (Pinia)

### Minimalist Store

The store only maintains essential state:

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

## Architecture Changelog

### v2.0 - VueFlow Composables Migration (Current)

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
