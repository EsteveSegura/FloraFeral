<template>
  <Teleport to="body">
    <Transition name="side-panel">
      <aside
        v-if="modelValue"
        class="flora-side-panel"
        :style="{ width: `${width}px` }"
        role="complementary"
      >
        <!-- Header -->
        <div class="flora-side-panel-header">
          <slot name="header">
            <div class="flora-side-panel-titles">
              <h2 class="flora-side-panel-title">{{ title }}</h2>
              <p v-if="subtitle" class="flora-side-panel-subtitle">{{ subtitle }}</p>
            </div>
          </slot>

          <button
            class="side-panel-close"
            type="button"
            aria-label="Close panel"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="flora-side-panel-content">
          <slot />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
/**
 * Panel docked to the right edge of the viewport.
 *
 * Deliberately not a BaseModal variant: there is no overlay, so the canvas
 * stays interactive underneath. Panels that track a selection need that, or
 * the user could never deselect while the panel is up.
 */
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  width: {
    type: Number,
    default: 360
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.flora-side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: var(--flora-color-surface);
  border-left: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  box-shadow: var(--flora-shadow-xl);
  /* Below BaseModal (1000): a modal opened on top of a panel must win */
  z-index: 900;
  max-width: 100vw;
}

.flora-side-panel-header {
  display: flex;
  align-items: flex-start;
  gap: var(--flora-space-3);
  padding: var(--flora-space-4) var(--flora-space-5);
  border-bottom: var(--flora-border-width-thin) solid var(--flora-color-border-default);
  flex-shrink: 0;
}

.flora-side-panel-titles {
  flex: 1;
  min-width: 0;
}

.flora-side-panel-title {
  margin: 0;
  font-size: var(--flora-font-size-lg);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flora-side-panel-subtitle {
  margin: var(--flora-space-1) 0 0;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.side-panel-close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--flora-radius-md);
  cursor: pointer;
  font-size: var(--flora-font-size-lg);
  color: var(--flora-color-text-secondary);
  transition: all var(--flora-transition-fast);
  padding: 0;
}

.side-panel-close:hover {
  background: var(--flora-color-bg-secondary);
  color: var(--flora-color-text-primary);
}

.side-panel-close:active {
  background: var(--flora-color-bg-tertiary);
}

.flora-side-panel-content {
  padding: var(--flora-space-5);
  overflow-y: auto;
  flex: 1;
}

/* Transitions */
.side-panel-enter-active,
.side-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.side-panel-enter-from,
.side-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
