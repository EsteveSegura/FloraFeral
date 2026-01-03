<template>
  <div class="drawing-canvas-container">
    <!-- Toolbar -->
    <div class="drawing-toolbar">
      <button
        :class="['tool-button', { active: currentTool === 'pencil' }]"
        @click="setTool('pencil')"
        title="Pencil"
      >
        ✏️
      </button>
      <button
        :class="['tool-button', { active: currentTool === 'eraser' }]"
        @click="setTool('eraser')"
        title="Eraser"
      >
        🧹
      </button>

      <div class="brush-size-control">
        <label for="brush-size">Size: {{ brushSize }}</label>
        <input
          id="brush-size"
          v-model.number="brushSize"
          type="range"
          min="1"
          max="50"
          step="1"
          @input="updateBrushSize"
        />
      </div>

      <div class="color-picker-control">
        <label for="brush-color">Color</label>
        <input
          id="brush-color"
          v-model="brushColor"
          type="color"
          @input="updateBrushColor"
        />
      </div>
    </div>

    <canvas
      ref="canvasRef"
      class="drawing-canvas"
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="stopDrawing"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  imageSrc: {
    type: String,
    required: true
  },
  strokesData: {
    type: String,
    default: null
  },
  width: {
    type: Number,
    default: 800
  },
  height: {
    type: Number,
    default: 600
  }
})

const emit = defineEmits(['update:canvas'])

const canvasRef = ref(null)
const isDrawing = ref(false)
const context = ref(null)
const backgroundImage = ref(null)
const currentTool = ref('pencil') // 'pencil' or 'eraser'
const brushSize = ref(5) // Brush/eraser size
const brushColor = ref('#000000') // Brush color

// Offscreen canvas for drawing strokes only
const drawingCanvas = ref(null)
const drawingContext = ref(null)

// Initialize canvas
onMounted(() => {
  if (!canvasRef.value) return

  const canvas = canvasRef.value
  context.value = canvas.getContext('2d')

  // Load background image
  loadBackgroundImage()
})

// Watch for image changes
watch(() => props.imageSrc, () => {
  loadBackgroundImage()
})

// Watch for strokes changes
watch(() => props.strokesData, () => {
  if (drawingCanvas.value && props.strokesData) {
    loadStrokes()
  }
})

function loadBackgroundImage() {
  if (!props.imageSrc || !canvasRef.value) return

  const img = new Image()
  img.crossOrigin = 'anonymous'

  img.onload = () => {
    backgroundImage.value = img

    // Set canvas size to match image
    canvasRef.value.width = img.width
    canvasRef.value.height = img.height

    // Create offscreen canvas for strokes
    drawingCanvas.value = document.createElement('canvas')
    drawingCanvas.value.width = img.width
    drawingCanvas.value.height = img.height
    drawingContext.value = drawingCanvas.value.getContext('2d')

    // Setup drawing context
    setupDrawingContext()

    // Load previous strokes if available
    if (props.strokesData) {
      loadStrokes()
    } else {
      // Just render the background
      renderCanvas()
    }
  }

  img.src = props.imageSrc
}

function loadStrokes() {
  if (!drawingCanvas.value) return

  // Clear strokes canvas first
  drawingContext.value.clearRect(0, 0, drawingCanvas.value.width, drawingCanvas.value.height)

  if (!props.strokesData) {
    renderCanvas()
    return
  }

  const strokesImg = new Image()
  strokesImg.crossOrigin = 'anonymous'

  strokesImg.onload = () => {
    // Draw previous strokes on the strokes canvas
    drawingContext.value.drawImage(strokesImg, 0, 0)
    // Render everything
    renderCanvas()
  }

  strokesImg.src = props.strokesData
}

function setupDrawingContext() {
  if (!drawingContext.value) return

  drawingContext.value.lineCap = 'round'
  drawingContext.value.lineJoin = 'round'
  drawingContext.value.lineWidth = brushSize.value

  if (currentTool.value === 'pencil') {
    drawingContext.value.globalCompositeOperation = 'source-over'
    drawingContext.value.strokeStyle = brushColor.value
  } else if (currentTool.value === 'eraser') {
    drawingContext.value.globalCompositeOperation = 'destination-out'
  }
}

function setTool(tool) {
  currentTool.value = tool
  setupDrawingContext()
}

function updateBrushSize() {
  setupDrawingContext()
}

function updateBrushColor() {
  setupDrawingContext()
}

// Composite background image + strokes on main canvas
function renderCanvas() {
  if (!context.value || !backgroundImage.value) return

  // Clear main canvas
  context.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // Draw background image
  context.value.drawImage(backgroundImage.value, 0, 0)

  // Draw strokes on top
  if (drawingCanvas.value) {
    context.value.drawImage(drawingCanvas.value, 0, 0)
  }
}

function getScaledCoordinates(event) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()

  // Calculate scale between displayed size and actual canvas size
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  // Get mouse position relative to canvas
  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  return { x, y }
}

function startDrawing(event) {
  isDrawing.value = true
  const { x, y } = getScaledCoordinates(event)

  drawingContext.value.beginPath()
  drawingContext.value.moveTo(x, y)
}

function draw(event) {
  if (!isDrawing.value) return

  const { x, y } = getScaledCoordinates(event)

  drawingContext.value.lineTo(x, y)
  drawingContext.value.stroke()

  // Update main canvas with background + strokes
  renderCanvas()
}

function stopDrawing() {
  if (!isDrawing.value) return

  isDrawing.value = false
  drawingContext.value.closePath()

  // Final render
  renderCanvas()

  // Emit updated canvas data
  emitCanvasData()
}

// Touch support
function handleTouchStart(event) {
  event.preventDefault()
  const touch = event.touches[0]

  // Create a mock event for getScaledCoordinates
  const mockEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY
  }

  isDrawing.value = true
  const { x, y } = getScaledCoordinates(mockEvent)

  drawingContext.value.beginPath()
  drawingContext.value.moveTo(x, y)
}

function handleTouchMove(event) {
  if (!isDrawing.value) return

  event.preventDefault()
  const touch = event.touches[0]

  // Create a mock event for getScaledCoordinates
  const mockEvent = {
    clientX: touch.clientX,
    clientY: touch.clientY
  }

  const { x, y } = getScaledCoordinates(mockEvent)

  drawingContext.value.lineTo(x, y)
  drawingContext.value.stroke()

  // Update main canvas with background + strokes
  renderCanvas()
}

function emitCanvasData() {
  if (!canvasRef.value || !drawingCanvas.value) return

  // Export both the complete canvas and the strokes layer
  const compositeData = canvasRef.value.toDataURL('image/png')
  const strokesData = drawingCanvas.value.toDataURL('image/png')

  emit('update:canvas', {
    composite: compositeData,
    strokes: strokesData
  })
}

// Expose method to get canvas data
defineExpose({
  getCanvasData: () => {
    if (!canvasRef.value || !drawingCanvas.value) return null
    return {
      composite: canvasRef.value.toDataURL('image/png'),
      strokes: drawingCanvas.value.toDataURL('image/png')
    }
  },
  clearCanvas: () => {
    if (!drawingCanvas.value || !backgroundImage.value) return
    // Clear only the strokes canvas
    drawingContext.value.clearRect(0, 0, drawingCanvas.value.width, drawingCanvas.value.height)
    // Re-render (background + empty strokes)
    renderCanvas()
    emitCanvasData()
  }
})
</script>

<style scoped>
.drawing-canvas-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--flora-color-bg-tertiary);
  padding: var(--flora-space-4);
  gap: var(--flora-space-3);
}

.drawing-toolbar {
  display: flex;
  align-items: center;
  gap: var(--flora-space-3);
  padding: var(--flora-space-2);
  background: var(--flora-color-bg-primary);
  border-radius: var(--flora-radius-md);
  box-shadow: var(--flora-shadow-sm);
}

.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 1.5rem;
  background: var(--flora-color-bg-secondary);
  border: 2px solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-sm);
  cursor: pointer;
  transition: all var(--flora-transition-fast);
}

.tool-button:hover {
  background: var(--flora-color-bg-tertiary);
  transform: scale(1.05);
}

.tool-button.active {
  background: var(--flora-color-primary);
  border-color: var(--flora-color-primary);
  box-shadow: var(--flora-shadow-md);
}

.brush-size-control {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
  padding: 0 var(--flora-space-2);
  border-left: 1px solid var(--flora-color-border-default);
  padding-left: var(--flora-space-3);
}

.brush-size-control label {
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
  white-space: nowrap;
}

.brush-size-control input[type="range"] {
  width: 150px;
  cursor: pointer;
  accent-color: var(--flora-color-primary);
}

.color-picker-control {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
  padding: 0 var(--flora-space-2);
  border-left: 1px solid var(--flora-color-border-default);
  padding-left: var(--flora-space-3);
}

.color-picker-control label {
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
  white-space: nowrap;
}

.color-picker-control input[type="color"] {
  width: 60px;
  height: 32px;
  cursor: pointer;
  border: 2px solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-sm);
  padding: 2px;
  background: var(--flora-color-bg-secondary);
}

.color-picker-control input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker-control input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: var(--flora-radius-xs);
}

.drawing-canvas {
  cursor: crosshair;
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  box-shadow: var(--flora-shadow-lg);
  object-fit: contain;
}
</style>
