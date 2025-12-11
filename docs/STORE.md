# Pinia Store - Usage Guide

## Overview

The Pinia store (`useFlowStore`) is the centralized application state that stores nodes, edges, and UI state. It uses the Composition API and automatically synchronizes with VueFlow through `v-model`.

**File:** `src/stores/flow.js`

---

## Store Structure

```javascript
{
  // Data state
  nodes: ref([]),        // Array of canvas nodes
  edges: ref([]),        // Array of connections between nodes

  // UI state
  isLoading: ref(false), // Indicates if operations are in progress
  error: ref(null),      // Error messages to display to user

  // Actions
  reset(),               // Reset all state
  setLoading(boolean),   // Set loading state
  setError(string),      // Set an error message
  clearError()           // Clear current error
}
```

---

## ⚠️ IMPORTANT: Do Not Manipulate Directly

### ❌ DON'T DO:

```javascript
// DON'T assign directly - breaks reactivity with VueFlow
flowStore.nodes = [newNode]
flowStore.edges = [newEdge]

// DON'T use methods that no longer exist
flowStore.addNode(node)        // ❌ Removed
flowStore.updateNodeData(...)  // ❌ Removed
flowStore.getNodeById(id)      // ❌ Removed
```

### ✅ DO:

```javascript
import { useFlowStore } from '@/stores/flow'
import { useVueFlow } from '@vue-flow/core'

const flowStore = useFlowStore()
const { updateNodeData, addEdges } = useVueFlow()

// Add nodes - maintains array reference
flowStore.nodes.push(newNode)

// Update node data - use VueFlow composable
updateNodeData(nodeId, { prompt: 'new text' })

// Add edges - use VueFlow composable
addEdges([newEdge])
```

---

## Accessing the Store in Components

### In a Vue Component

```javascript
<script setup>
import { useFlowStore } from '@/stores/flow'

const flowStore = useFlowStore()

// Access data
console.log(flowStore.nodes)
console.log(flowStore.edges)

// Use actions
flowStore.setLoading(true)
flowStore.setError('Something went wrong')
flowStore.clearError()
</script>
```

### In Custom Nodes

Nodes should **NOT access the store directly** for their own data. Use VueFlow composables:

```javascript
<script setup>
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'

// To access current node data
const { node } = useNode()
const nodeData = computed(() => node.data)

// To update node data
const { updateNodeData } = useVueFlow()
updateNodeData(props.id, { prompt: 'new' })

// To access other nodes/edges (full reactivity)
const flowStore = useFlowStore()
const connectedNodes = computed(() => {
  return flowStore.edges
    .filter(edge => edge.target === props.id)
    .map(edge => flowStore.nodes.find(n => n.id === edge.source))
})
</script>
```

---

## Node Management

### Adding a Node

```javascript
import { createNode, NODE_TYPES, getNodeIOConfig } from '@/lib/node-shapes'

const newNode = createNode(
  `node_${Date.now()}`,           // Unique ID
  NODE_TYPES.IMAGE_GENERATOR,     // Node type
  { x: 100, y: 100 },             // Position
  { label: 'New Node' },          // Initial data
  getNodeIOConfig(NODE_TYPES.IMAGE_GENERATOR) // IO config
)

// Add to store - maintains reference
flowStore.nodes.push(newNode)
```

### Removing Nodes

Nodes are automatically removed with Delete/Backspace keys when selected. VueFlow synchronizes changes with the store automatically through `v-model`.

### Updating Node Data

```javascript
import { useVueFlow } from '@vue-flow/core'

const { updateNodeData } = useVueFlow()

// Updates the node in store reactively
updateNodeData(nodeId, {
  prompt: 'new prompt',
  model: 'seedream-4',
  lastOutputSrc: 'https://...'
})
```

---

## Edge Management

### Creating Connections

Connections are created automatically when the user drags from one handle to another. The event is handled in `FlowCanvasView.vue`:

```javascript
const { onConnect, addEdges } = useVueFlow()

// Register connection handler
onConnect((params) => {
  addEdges([params])  // VueFlow syncs with flowStore.edges
})
```

### Connection Validation

Before creating a connection, VueFlow validates through:

```javascript
function isValidConnection(connection) {
  const sourceNode = flowStore.nodes.find(n => n.id === connection.source)
  const targetNode = flowStore.nodes.find(n => n.id === connection.target)

  if (!sourceNode || !targetNode) return false

  const validation = validateConnection(
    connection,
    sourceNode,
    targetNode,
    flowStore.edges
  )

  return validation.valid
}
```

Validation rules (in `src/lib/connection.js`):
- ✅ Valid nodes exist
- ✅ No loops (node to itself)
- ✅ Compatible types (image → image, prompt → prompt)
- ✅ No duplicate connections
- ✅ Respect connection limits per handle

---

## Reactivity and VueFlow

### Automatic Synchronization

The store is bound to VueFlow through `v-model`:

```vue
<VueFlow
  v-model:nodes="flowStore.nodes"
  v-model:edges="flowStore.edges"
>
```

This means:
- ✅ Changes in `flowStore.nodes` are reflected in VueFlow
- ✅ Changes in VueFlow (drag, delete) are reflected in `flowStore.nodes`
- ✅ Reactivity works bidirectionally

### Maintaining Array References

**Critical:** Never replace array references:

```javascript
// ❌ BAD - Breaks v-model
flowStore.nodes = [...flowStore.nodes, newNode]
flowStore.edges = newEdges

// ✅ GOOD - Maintains reference
flowStore.nodes.push(newNode)
flowStore.nodes.splice(index, 1)
flowStore.edges.splice(0, flowStore.edges.length) // Empty
flowStore.edges.push(...newEdges)                // Fill
```

---

## Loading State and Errors

### Indicating Operations in Progress

```javascript
async function asyncOperation() {
  flowStore.setLoading(true)

  try {
    await someOperation()
  } catch (error) {
    flowStore.setError(error.message)

    // Clear error after 5 seconds
    setTimeout(() => flowStore.clearError(), 5000)
  } finally {
    flowStore.setLoading(false)
  }
}
```

### Displaying Errors in UI

```vue
<template>
  <div v-if="flowStore.error" class="error-banner">
    {{ flowStore.error }}
  </div>
</template>

<script setup>
import { useFlowStore } from '@/stores/flow'

const flowStore = useFlowStore()
</script>
```

---

## Resetting State

```javascript
// Clears all nodes, edges and state
flowStore.reset()
```

This is useful for:
- Creating a new flow from scratch
- Cleaning before importing a flow
- Resetting the application

---

## Flow Export/Import

### Export

```javascript
import { downloadFlow } from '@/lib/flow-io'

function handleExport() {
  downloadFlow(flowStore)
  // Downloads flow-{timestamp}.json
}
```

### Import

```javascript
import { loadFlowFromFile } from '@/lib/flow-io'
import { useVueFlow } from '@vue-flow/core'

const { addEdges } = useVueFlow()

async function handleImport(file) {
  // Pass addEdges for correct synchronization
  const result = await loadFlowFromFile(file, flowStore, { addEdges })

  if (!result.success) {
    flowStore.setError(result.error)
  }
}
```

**Important:** Import uses VueFlow's `addEdges` to maintain correct synchronization.

---

## Recommended Access Pattern

### In FlowCanvasView.vue (Main Canvas)

```javascript
import { useFlowStore } from '@/stores/flow'
import { useVueFlow } from '@vue-flow/core'

const flowStore = useFlowStore()
const { addEdges, updateNodeData } = useVueFlow()

// To add nodes
flowStore.nodes.push(newNode)

// For connections
onConnect((params) => addEdges([params]))
```

### In Custom Nodes

```javascript
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'

// Current node data
const { node } = useNode()
const nodeData = computed(() => node.data)

// Update current node
const { updateNodeData } = useVueFlow()
updateNodeData(props.id, { newData })

// Access other nodes (reactivity)
const flowStore = useFlowStore()
const otherNodes = computed(() => flowStore.nodes.filter(...))
```

---

## Debugging

### View Current State

```javascript
console.log('Nodes:', flowStore.nodes)
console.log('Edges:', flowStore.edges)
console.log('Loading:', flowStore.isLoading)
console.log('Error:', flowStore.error)
```

### Vue DevTools

The store is fully compatible with Vue DevTools:
1. Open Vue DevTools
2. Go to "Pinia" tab
3. Inspect `flow` store
4. See changes in real-time

---

## Best Practices Summary

✅ **DO:**
- Use `flowStore.nodes.push()` to add nodes
- Use `useVueFlow().updateNodeData()` to update nodes
- Use `useVueFlow().addEdges()` to add edges
- Maintain array references with splice/push
- Use `flowStore.nodes/edges` in computeds for reactivity

❌ **DON'T:**
- Directly assign `flowStore.nodes = [...]`
- Use removed store methods
- Modify nodes without `updateNodeData()`
- Add edges with direct `.push()` (use `addEdges()`)
- Access store directly in nodes for their own data

---

## Migration from Previous Version

If you had old code:

```javascript
// BEFORE (deprecated)
flowStore.addNode(node)
flowStore.updateNodeData(id, data)
flowStore.getNodeById(id)

// NOW (correct)
flowStore.nodes.push(node)
useVueFlow().updateNodeData(id, data)
flowStore.nodes.find(n => n.id === id)
```
