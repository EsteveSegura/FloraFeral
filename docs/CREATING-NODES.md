# Guide: Creating Custom Nodes

This guide explains step by step how to create a new node type in the Flora application.

---

## Table of Contents

1. [Overview](#overview)
2. [Step 1: Define Node Type](#step-1-define-node-type)
3. [Step 2: Create Vue Component](#step-2-create-vue-component)
4. [Step 3: Register Node](#step-3-register-node)
5. [Step 4: Add IO Configuration](#step-4-add-io-configuration)
6. [Step 5: Initialize in FlowCanvasView](#step-5-initialize-in-flowcanvasview)
7. [Complete Examples](#complete-examples)
8. [Best Practices](#best-practices)

---

## Overview

A node in Flora consists of:

1. **Node type** - Unique identifier (e.g., `'image'`, `'prompt'`)
2. **Vue component** - UI and node logic
3. **Registration** - Mapping between type and component
4. **IO configuration** - What inputs/outputs it accepts
5. **Initial data** - Default state when creating the node

---

## Step 1: Define Node Type

Add your new type to `src/lib/node-shapes.js`:

```javascript
export const NODE_TYPES = {
  IMAGE: 'image',
  IMAGE_GENERATOR: 'image-generator',
  PROMPT: 'prompt',
  DIFF: 'diff',
  // Add new type here
  TEXT_ANALYZER: 'text-analyzer'  // 👈 New
}
```

---

## Step 2: Create Vue Component

Create a file in `src/components/nodes/` (e.g., `TextAnalyzerNode.vue`).

### Base Node Structure

```vue
<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['text']"       <!-- Input types it accepts -->
    :outputs="['analysis']"  <!-- Output types it produces -->
    icon="📊"                 <!-- Emoji for header -->
    :selected="selected"
    @action:run="handleAnalyze"  <!-- Optional action button -->
  >
    <!-- Custom node content -->
    <div class="analyzer-node-content">
      <!-- Your UI here -->
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import BaseNode from '@/components/base/BaseNode.vue'

// Required props (always the same for all nodes)
const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

// VueFlow composables
const { node } = useNode()
const { updateNodeData } = useVueFlow()

// Local state
const isProcessing = ref(false)

// Node data (always use this pattern)
const nodeData = computed(() => node.data)

// Node logic
async function handleAnalyze() {
  isProcessing.value = true

  try {
    // Your logic here
    const result = await analyzeText(nodeData.value.text)

    // Update node data
    updateNodeData(props.id, {
      analysis: result
    })
  } catch (error) {
    updateNodeData(props.id, {
      error: error.message
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.analyzer-node-content {
  padding: 0.75rem;
  min-width: 250px;
}
</style>
```

### Pattern: Node with Connected Inputs

If your node receives data from other nodes:

```javascript
import { useFlowStore } from '@/stores/flow'

const flowStore = useFlowStore()

// Get data from connected nodes (reactive)
const connectedText = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    if (sourceNode && sourceNode.type === 'text' && sourceNode.data?.text) {
      return sourceNode.data.text
    }
  }

  return null
})
```

### Pattern: Node with Toolbar

For nodes with dynamic configuration:

```vue
<template>
  <div>
    <!-- Node Toolbar -->
    <NodeToolbar :is-visible="selected" :position="Position.Top" :offset="10">
      <div class="node-toolbar-content">
        <div class="toolbar-control">
          <label>Option:</label>
          <select :value="nodeData.option" @change="onOptionChange">
            <option value="a">Option A</option>
            <option value="b">Option B</option>
          </select>
        </div>
      </div>
    </NodeToolbar>

    <BaseNode ...>
      <!-- Node content -->
    </BaseNode>
  </div>
</template>

<script setup>
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { Position } from '@vue-flow/core'

function onOptionChange(event) {
  updateNodeData(props.id, {
    option: event.target.value
  })
}
</script>
```

---

## Step 3: Register Node

Edit `src/lib/node-registry.js` to register your component:

```javascript
import TextAnalyzerNode from '@/components/nodes/TextAnalyzerNode.vue'

const nodeDefinitions = [
  // ... existing nodes ...
  {
    type: NODE_TYPES.TEXT_ANALYZER,
    label: 'Text Analyzer',
    component: TextAnalyzerNode,
    category: 'analysis'  // Optional: for future grouping
  }
]
```

---

## Step 4: Add IO Configuration

In `src/lib/node-shapes.js`, define allowed inputs/outputs:

```javascript
export function getNodeIOConfig(nodeType) {
  const ioConfigs = {
    [NODE_TYPES.IMAGE]: {
      inputs: [],
      outputs: ['image']
    },
    [NODE_TYPES.PROMPT]: {
      inputs: [],
      outputs: ['prompt']
    },
    [NODE_TYPES.IMAGE_GENERATOR]: {
      inputs: ['image', 'prompt'],
      outputs: ['image']
    },
    // Add new
    [NODE_TYPES.TEXT_ANALYZER]: {
      inputs: ['text'],
      outputs: ['analysis']
    }
  }

  return ioConfigs[nodeType] || { inputs: [], outputs: [] }
}
```

### Available Port Types

Define types in `PORT_TYPES`:

```javascript
export const PORT_TYPES = {
  IMAGE: 'image',
  PROMPT: 'prompt',
  TEXT: 'text',       // 👈 New
  ANALYSIS: 'analysis' // 👈 New
}
```

---

## Step 5: Initialize in FlowCanvasView

In `src/views/FlowCanvasView.vue`, add data initialization if needed:

```javascript
function onDrop(event) {
  // ... existing code ...

  const data = {
    label: `New ${nodeDef.label}`
  }

  // Node type-specific data
  if (draggedNodeType === NODE_TYPES.TEXT_ANALYZER) {
    data.text = ''
    data.analysis = null
    data.options = {
      mode: 'sentiment',
      language: 'en'
    }
  }

  // Create node
  const newNode = createNode(
    `node_${Date.now()}`,
    draggedNodeType,
    position,
    data,
    ioConfig
  )

  flowStore.nodes.push(newNode)
}
```

---

## Complete Examples

### Example 1: Simple Node (No Inputs)

**TextInputNode.vue** - Node that only produces text:

```vue
<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="[]"
    :outputs="['text']"
    icon="📝"
    :selected="selected"
  >
    <div class="text-input-content">
      <textarea
        v-model="localText"
        placeholder="Enter text..."
        rows="4"
        @input="updateText"
      ></textarea>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import BaseNode from '@/components/base/BaseNode.vue'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

const { node } = useNode()
const { updateNodeData } = useVueFlow()

const localText = ref(props.data.text || '')
const nodeData = computed(() => node.data)

// Sync with external changes
watch(() => nodeData.value.text, (newText) => {
  if (newText !== localText.value) {
    localText.value = newText
  }
})

function updateText() {
  if (localText.value !== nodeData.value.text) {
    updateNodeData(props.id, {
      text: localText.value
    })
  }
}
</script>

<style scoped>
.text-input-content {
  padding: 0.5rem;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}
</style>
```

### Example 2: Processing Node (With Inputs)

**TextTransformNode.vue** - Receives text and transforms it:

```vue
<template>
  <BaseNode
    :id="id"
    :type="type"
    :data="nodeData"
    :label="nodeData.label"
    :inputs="['text']"
    :outputs="['text']"
    icon="🔄"
    :selected="selected"
    :loading="isProcessing"
    @action:run="handleTransform"
  >
    <div class="transform-content">
      <!-- Show connected text or local input -->
      <div v-if="connectedText" class="connected-info">
        <span class="label">📥 Input:</span>
        <div class="preview">{{ connectedText }}</div>
      </div>
      <div v-else class="no-connection">
        No text connected
      </div>

      <!-- Transform options -->
      <select v-model="transformMode" @change="updateMode">
        <option value="uppercase">UPPERCASE</option>
        <option value="lowercase">lowercase</option>
        <option value="reverse">Reverse</option>
      </select>

      <!-- Result -->
      <div v-if="nodeData.output" class="result">
        <span class="label">📤 Output:</span>
        <div class="preview">{{ nodeData.output }}</div>
      </div>

      <!-- Transform button -->
      <button
        class="transform-button"
        :disabled="!connectedText || isProcessing"
        @click="handleTransform"
      >
        {{ isProcessing ? 'Processing...' : 'Transform' }}
      </button>
    </div>
  </BaseNode>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'
import BaseNode from '@/components/base/BaseNode.vue'

const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

const flowStore = useFlowStore()
const { node } = useNode()
const { updateNodeData } = useVueFlow()

const isProcessing = ref(false)
const transformMode = ref(props.data.mode || 'uppercase')
const nodeData = computed(() => node.data)

// Get text from connected node
const connectedText = computed(() => {
  const incomingEdges = flowStore.edges.filter(edge => edge.target === props.id)

  for (const edge of incomingEdges) {
    const sourceNode = flowStore.nodes.find(n => n.id === edge.source)
    if (sourceNode && sourceNode.data?.text) {
      return sourceNode.data.text
    }
  }

  return null
})

function updateMode() {
  updateNodeData(props.id, {
    mode: transformMode.value
  })
}

async function handleTransform() {
  if (!connectedText.value) return

  isProcessing.value = true

  try {
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500))

    let result = connectedText.value

    switch (transformMode.value) {
      case 'uppercase':
        result = result.toUpperCase()
        break
      case 'lowercase':
        result = result.toLowerCase()
        break
      case 'reverse':
        result = result.split('').reverse().join('')
        break
    }

    updateNodeData(props.id, {
      output: result,
      mode: transformMode.value
    })
  } catch (error) {
    updateNodeData(props.id, {
      error: error.message
    })
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.transform-content {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 250px;
}

.connected-info {
  padding: 0.5rem;
  background: #f0f7ff;
  border-radius: 4px;
}

.no-connection {
  padding: 1rem;
  text-align: center;
  color: #999;
  border: 2px dashed #ddd;
  border-radius: 4px;
}

.label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  display: block;
  margin-bottom: 0.25rem;
}

.preview {
  font-size: 0.85rem;
  padding: 0.25rem;
  background: white;
  border-radius: 3px;
  max-height: 60px;
  overflow-y: auto;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.result {
  padding: 0.5rem;
  background: #f0fdf4;
  border-radius: 4px;
}

.transform-button {
  width: 100%;
  padding: 0.6rem;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.transform-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
```

---

## Best Practices

### ✅ Composables and Reactivity

```javascript
// ALWAYS use these composables
import { useNode, useVueFlow } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flow'

// For current node data
const { node } = useNode()
const nodeData = computed(() => node.data)

// To update node
const { updateNodeData } = useVueFlow()

// To access other nodes (full reactivity)
const flowStore = useFlowStore()
const otherNodes = computed(() => flowStore.nodes.filter(...))
```

### ✅ Props Structure

All nodes must accept these exact props:

```javascript
const props = defineProps({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})
```

### ✅ Error Handling

```javascript
try {
  const result = await asyncOperation()

  updateNodeData(props.id, {
    result: result,
    error: null  // Clear previous error
  })
} catch (error) {
  updateNodeData(props.id, {
    error: error.message
  })

  // Optional: clear error after some time
  setTimeout(() => {
    updateNodeData(props.id, { error: null })
  }, 5000)
}
```

### ✅ Loading State

```javascript
const isLoading = ref(false)

async function handleAction() {
  isLoading.value = true

  try {
    // operation
  } finally {
    isLoading.value = false
  }
}
```

Pass to BaseNode:

```vue
<BaseNode
  :loading="isLoading"
  ...
>
```

### ✅ Input Validation

```javascript
const canProcess = computed(() => {
  return connectedInput.value &&
         connectedInput.value.trim().length > 0 &&
         !isProcessing.value
})
```

```vue
<button :disabled="!canProcess" @click="process">
  Process
</button>
```

### ❌ Avoid

```javascript
// ❌ DON'T access store directly for current node
const nodeData = flowStore.nodes.find(n => n.id === props.id).data

// ❌ DON'T modify props.data directly
props.data.text = 'new'

// ❌ DON'T use deprecated methods
flowStore.updateNodeData(props.id, data)
flowStore.getNodeById(props.id)
```

---

## Available Icons

Useful emojis for BaseNode's `icon` prop:

```
📷 Image
✨ Generator
📝 Text/Prompt
🔍 Diff/Compare
📊 Analysis
🔄 Transform
⚙️ Settings
🎨 Color
📈 Chart
🔗 Link
💾 Save
📁 File
🎯 Target
🌟 Special
```

---

## New Node Checklist

- [ ] Type added to `NODE_TYPES` in `node-shapes.js`
- [ ] Vue component created in `src/components/nodes/`
- [ ] Correct props (id, type, data, selected)
- [ ] Composables used (`useNode`, `useVueFlow`)
- [ ] Node registered in `node-registry.js`
- [ ] IO configuration added in `getNodeIOConfig()`
- [ ] Data initialization in `FlowCanvasView.vue` (if needed)
- [ ] Error handling implemented
- [ ] Loading state implemented (if async)
- [ ] Scoped CSS styles added
- [ ] Tested: create, connect, delete node

---

## Testing the New Node

1. **Creation**: Drag node to canvas from menu
2. **Connections**: Connect inputs and outputs according to IO config
3. **Validation**: Try invalid connections (should be blocked)
4. **Functionality**: Execute the node's main action
5. **Reactivity**: Change data in connected nodes, verify update
6. **Errors**: Test error cases, verify they display
7. **Export/Import**: Export and import a flow with the node
8. **Deletion**: Delete node, verify edges are removed

---

## Resources

- **Existing examples**: Review `src/components/nodes/` for reference
- **BaseNode API**: See `src/components/base/BaseNode.vue`
- **VueFlow Docs**: https://vueflow.dev/
- **Validation**: See `src/lib/connection.js`
