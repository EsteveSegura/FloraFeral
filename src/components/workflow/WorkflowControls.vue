<template>
  <div class="workflow-controls">
    <!-- Collapsed state: just the play button -->
    <button
      v-if="!isExpanded && !isExecuting"
      class="play-button-collapsed"
      @click="handlePlay"
      title="Execute Workflow (Ctrl+Enter)"
    >
      <span class="play-icon-collapsed">▶</span>
    </button>

    <!-- Expanded state: horizontal panel -->
    <div v-else class="controls-panel">
      <!-- Play button -->
      <button
        class="play-btn"
        @click="handlePlay"
        :disabled="isExecuting"
        title="Execute Workflow (Ctrl+Enter)"
      >
        <svg class="play-icon" viewBox="0 0 8 8" fill="currentColor">
          <polygon points="0,0 8,4 0,8" />
        </svg>
        <span class="play-text">Play</span>
      </button>

      <!-- Info section -->
      <div class="info-section">
        <span class="title">{{ statusText }}</span>
        <span class="nodes-text">{{ progress.completed }}/{{ progress.total }} nodes</span>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar-container">
        <div
          class="progress-bar-fill"
          :style="{ width: `${progressPercentage}%` }"
          :class="progressClass"
        ></div>
      </div>

      <!-- Duration -->
      <span v-if="executionDuration > 0" class="duration">{{ formatDuration(executionDuration) }}</span>

      <!-- Close button -->
      <button
        v-if="!isExecuting"
        class="close-btn"
        @click="collapse"
        title="Collapse"
      >
        ×
      </button>

      <!-- Stop button (when executing) -->
      <button
        v-if="isExecuting"
        class="stop-btn"
        @click="stopExecution"
        title="Stop Execution"
      >
        ⏹
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWorkflowExecution } from '@/composables/useWorkflowExecution'

const {
  isExecuting,
  progress,
  hasErrors,
  wasStopped,
  executionDuration,
  canExecute,
  progressPercentage,
  statusText,
  executeWorkflow,
  stopExecution,
  resetExecution
} = useWorkflowExecution()

const isExpanded = ref(false)

// Computed progress bar class
const progressClass = computed(() => {
  if (hasErrors.value || wasStopped.value) return 'has-errors'
  if (progress.value.percentage === 100) return 'complete'
  return 'running'
})

// Handlers
async function handlePlay() {
  isExpanded.value = true
  try {
    // Reset previous execution state before starting
    resetExecution()
    // Always force re-run to execute all generator nodes
    await executeWorkflow({ forceRerun: true })
  } catch (error) {
    console.error('Workflow execution failed:', error)
  }
}

function collapse() {
  if (!isExecuting.value) {
    isExpanded.value = false
  }
}

// Format duration as mm:ss or hh:mm:ss
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) {
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}

// Keyboard shortcut: Ctrl+Enter to execute
function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    if (canExecute.value) {
      event.preventDefault()
      handlePlay()
    }
  }
  // Escape to stop
  if (event.key === 'Escape' && isExecuting.value) {
    event.preventDefault()
    stopExecution()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.workflow-controls {
  display: inline-block;
  width: fit-content;
}

/* Collapsed play button */
.play-button-collapsed {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1ac460;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.play-button-collapsed:hover {
  background: #15a352;
  transform: scale(1.05);
}

.play-button-collapsed:active {
  transform: scale(0.95);
}

.play-icon-collapsed {
  color: white;
  font-size: 18px;
  margin-left: 2px;
}

/* Expanded panel */
.controls-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* Play button inside panel */
.play-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #1ac460;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.play-btn:hover:not(:disabled) {
  background: #15a352;
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-icon {
  width: 8px;
  height: 8px;
  color: white;
}

.play-text {
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
}

/* Info section */
.info-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
}

.nodes-text {
  color: #888888;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
}

/* Progress bar */
.progress-bar-container {
  width: 120px;
  height: 6px;
  background: #333333;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar-fill.running {
  background: #1ac460;
}

.progress-bar-fill.complete {
  background: #1ac460;
}

.progress-bar-fill.has-errors {
  background: #ef4444;
}

/* Duration */
.duration {
  color: #888888;
  font-family: 'Inter', sans-serif;
  font-size: 12px;
}

/* Close button */
.close-btn {
  background: transparent;
  border: none;
  color: #888888;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s ease;
}

.close-btn:hover {
  color: white;
}

/* Stop button */
.stop-btn {
  background: #ef4444;
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.stop-btn:hover {
  background: #dc2626;
}
</style>
