<template>
  <Teleport to="body">
    <Transition :name="isDraggingFile ? '' : 'modal'">
      <div
        v-if="modelValue"
        class="flora-modal-overlay"
        :class="{ 'dragging-file': isDraggingFile }"
        @click="handleOverlayClick"
        @dragover="handleDragOver"
      >
        <div
          class="flora-modal-container"
          :class="[`flora-modal--${size}`]"
          @click.stop
          role="dialog"
          aria-modal="true"
        >
          <!-- Close Button -->
          <button
            class="flora-modal-close"
            @click="close"
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>

          <!-- Header -->
          <div v-if="showHeader" class="flora-modal-header">
            <slot name="header">
              <h2 v-if="title" class="flora-modal-title">{{ title }}</h2>
            </slot>
          </div>

          <!-- Content -->
          <div class="flora-modal-content" :class="{ 'no-header': !showHeader, 'no-footer': !showFooter }">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="showFooter && $slots.footer" class="flora-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  },
  showHeader: {
    type: Boolean,
    default: true
  },
  showFooter: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const isDraggingFile = ref(false)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    close()
  }
}

function handleDragOver(event) {
  // Check if dragging files
  if (event.dataTransfer && event.dataTransfer.types.includes('Files')) {
    // Make overlay transparent to events immediately
    isDraggingFile.value = true
    // Close modal when dragging files over it
    close()
  }
}
</script>

<style scoped>
/* Overlay */
.flora-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--flora-space-4);
}

.flora-modal-overlay.dragging-file {
  pointer-events: none;
}

/* Modal Container */
.flora-modal-container {
  position: relative;
  background: var(--flora-color-surface);
  border: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  border-radius: var(--flora-radius-lg);
  box-shadow: var(--flora-shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
}

/* Sizes */
.flora-modal--sm {
  max-width: 400px;
}

.flora-modal--md {
  max-width: 600px;
}

.flora-modal--lg {
  max-width: 800px;
}

.flora-modal--xl {
  max-width: 1000px;
}

/* Header */
.flora-modal-header {
  display: flex;
  align-items: center;
  padding: var(--flora-space-4) var(--flora-space-5);
  padding-right: 56px; /* Space for close button */
  border-bottom: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  flex-shrink: 0;
}

.flora-modal-title {
  margin: 0;
  font-size: var(--flora-font-size-xl);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
}

.flora-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  font-size: var(--flora-font-size-xl);
  color: var(--flora-color-text-secondary);
  transition: all var(--flora-transition-fast);
  z-index: 1001;
  padding: 0;
}

.flora-modal-close:hover {
  background: var(--flora-color-bg-secondary);
  color: var(--flora-color-text-primary);
}

.flora-modal-close:active {
  background: var(--flora-color-bg-tertiary);
}

/* Content */
.flora-modal-content {
  padding: var(--flora-space-5);
  overflow-y: auto;
  flex: 1;
}

.flora-modal-content.no-header {
  border-top-left-radius: var(--flora-radius-lg);
  border-top-right-radius: var(--flora-radius-lg);
}

.flora-modal-content.no-footer {
  border-bottom-left-radius: var(--flora-radius-lg);
  border-bottom-right-radius: var(--flora-radius-lg);
}

/* Footer */
.flora-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--flora-space-3);
  padding: var(--flora-space-4) var(--flora-space-5);
  border-top: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  flex-shrink: 0;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .flora-modal-container,
.modal-leave-active .flora-modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .flora-modal-container,
.modal-leave-to .flora-modal-container {
  transform: scale(0.95);
  opacity: 0;
}
</style>
