<template>
  <div class="workflow-controls" :class="{ expanded: isExpanded }">
    <!-- Collapsed state: just the play button -->
    <button
      v-if="!isExpanded && !isExecuting"
      class="play-button"
      @click="handlePlay"
      title="Execute Workflow (Ctrl+Enter)"
    >
      <span class="play-icon">▶</span>
    </button>

    <!-- Expanded state: full controls -->
    <div v-else class="controls-panel">
      <!-- Header with status -->
      <div class="panel-header">
        <span class="status-text">{{ statusText }}</span>
        <button
          v-if="!isExecuting"
          class="close-button"
          @click="collapse"
          title="Collapse"
        >
          ×
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="isExecuting || progress.total > 0" class="progress-section">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progressPercentage}%` }"
            :class="progressClass"
          ></div>
        </div>
        <div class="progress-text">
          {{ progress.completed }}/{{ progress.total }} nodes
        </div>
      </div>

      <!-- Control buttons -->
      <div class="button-group">
        <!-- Play/Resume button -->
        <button
          v-if="canExecute || canResume"
          class="control-button primary"
          @click="canResume ? resumeExecution() : handlePlay()"
          :title="canResume ? 'Resume Execution' : 'Execute Workflow (Ctrl+Enter)'"
        >
          <span class="button-icon">▶</span>
          <span class="button-label">{{ canResume ? 'Resume' : 'Play' }}</span>
        </button>

        <!-- Pause button -->
        <button
          v-if="canPause"
          class="control-button warning"
          @click="pauseExecution"
          title="Pause Execution"
        >
          <span class="button-icon">⏸</span>
          <span class="button-label">Pause</span>
        </button>

        <!-- Stop button -->
        <button
          v-if="canStop"
          class="control-button danger"
          @click="stopExecution"
          title="Stop Execution"
        >
          <span class="button-icon">⏹</span>
          <span class="button-label">Stop</span>
        </button>
      </div>

      <!-- Duration -->
      <div v-if="executionDuration > 0" class="duration-text">
        Duration: {{ formatDuration(executionDuration) }}
      </div>
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
  executionDuration,
  canExecute,
  canPause,
  canResume,
  canStop,
  progressPercentage,
  statusText,
  executeWorkflow,
  pauseExecution,
  resumeExecution,
  stopExecution,
  resetExecution
} = useWorkflowExecution()

const isExpanded = ref(false)

// Computed progress bar class
const progressClass = computed(() => {
  if (hasErrors.value) return 'has-errors'
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
  position: relative;
  display: inline-block;
  width: fit-content;
}

/* Collapsed play button */
.play-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--flora-color-success);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--flora-transition-fast);
  box-shadow: var(--flora-shadow-md);
}

.play-button:hover {
  background: var(--flora-color-success-hover, #15803d);
  transform: scale(1.05);
  box-shadow: var(--flora-shadow-lg);
}

.play-button:active {
  transform: scale(0.95);
}

.play-icon {
  color: white;
  font-size: 18px;
  margin-left: 2px; /* Visual centering for play icon */
}

/* Expanded panel */
.controls-panel {
  min-width: 200px;
  background: var(--flora-color-surface);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-lg);
  padding: var(--flora-space-3);
  box-shadow: var(--flora-shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-text {
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
}

.close-button {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--flora-radius-sm);
  cursor: pointer;
  color: var(--flora-color-text-tertiary);
  font-size: 18px;
  transition: all var(--flora-transition-fast);
}

.close-button:hover {
  background: var(--flora-color-bg-tertiary);
  color: var(--flora-color-text-primary);
}

/* Progress section */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.progress-bar {
  height: 6px;
  background: var(--flora-color-bg-tertiary);
  border-radius: var(--flora-radius-full);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: var(--flora-radius-full);
}

.progress-fill.running {
  background: var(--flora-color-accent);
}

.progress-fill.complete {
  background: var(--flora-color-success);
}

.progress-fill.has-errors {
  background: var(--flora-color-warning);
}

.progress-text {
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
}

/* Button group */
.button-group {
  display: flex;
  gap: var(--flora-space-2);
  flex-wrap: wrap;
}

.control-button {
  display: flex;
  align-items: center;
  gap: var(--flora-space-1);
  padding: var(--flora-space-2) var(--flora-space-3);
  border: none;
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  transition: all var(--flora-transition-fast);
}

.control-button.primary {
  background: var(--flora-color-success);
  color: white;
}

.control-button.primary:hover {
  background: var(--flora-color-success-hover, #15803d);
}

.control-button.warning {
  background: var(--flora-color-warning);
  color: white;
}

.control-button.warning:hover {
  filter: brightness(0.9);
}

.control-button.danger {
  background: var(--flora-color-danger);
  color: white;
}

.control-button.danger:hover {
  filter: brightness(0.9);
}

.button-icon {
  font-size: 12px;
}

.button-label {
  font-size: var(--flora-font-size-xs);
}

/* Duration */
.duration-text {
  font-size: var(--flora-font-size-xs);
  color: white;
  text-align: center;
}
</style>
