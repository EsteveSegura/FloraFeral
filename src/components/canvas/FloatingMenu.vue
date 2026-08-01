<template>
<div class="floating-menu-container">
  <div class="floating-menu">
    <button
      class="menu-icon-button"
      @click="emit('toggle-nodes')"
      :class="{ active: isNodesMenuOpen }"
      title="Add nodes"
    >
      <img src="@/assets/add.svg" alt="Add" />
    </button>
    <button
      class="menu-icon-button"
      @click="emit('export')"
      title="Export flow"
    >
      <img src="@/assets/floppy-disk.svg" alt="Export" />
    </button>
    <button
      class="menu-icon-button"
      @click="emit('import')"
      title="Import flow"
    >
      <img src="@/assets/folder.svg" alt="Import" />
    </button>

    <!-- Separator -->
    <div class="menu-separator"></div>

    <button
      class="menu-icon-button"
      @click="emit('open-batch')"
      title="Batch Run"
    >
      <img :src="BatchIcon" alt="Batch Run" />
    </button>

    <!-- Separator -->
    <div class="menu-separator"></div>

    <button
      class="menu-icon-button"
      @click="emit('lock-toggle')"
      :title="isLocked ? 'Unlock' : 'Lock'"
    >
      <img :src="isLocked ? LockIcon : UnlockIcon" :alt="isLocked ? 'Unlock' : 'Lock'" />
    </button>
    <button
      class="menu-icon-button"
      @click="emit('fit-view')"
      title="Fit View"
    >
      <img :src="ReframeIcon" alt="Fit View" />
    </button>
    <!-- Rearranging every node is a mass move, so the lock has to cover it too -->
    <button
      class="menu-icon-button"
      :disabled="isLocked"
      @click="emit('auto-layout')"
      title="Auto Layout"
    >
      <img :src="AutoLayoutIcon" alt="Auto Layout" />
    </button>

    <!-- Separator -->
    <div class="menu-separator"></div>

    <button
      class="menu-icon-button"
      @click="emit('open-settings')"
      title="Settings"
    >
      <img :src="GearIcon" alt="Settings" />
    </button>
  </div>
</div>
</template>

<script setup>
import LockIcon from '@/assets/lock.svg'
import UnlockIcon from '@/assets/unlock.svg'
import ReframeIcon from '@/assets/reframe.svg'
import AutoLayoutIcon from '@/assets/auto-layout.svg'
import GearIcon from '@/assets/gear.svg'
import BatchIcon from '@/assets/batch.svg'

defineProps({
  isLocked: {
    type: Boolean,
    required: true
  },
  isNodesMenuOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits([
  'toggle-nodes',
  'export',
  'import',
  'open-batch',
  'lock-toggle',
  'fit-view',
  'auto-layout',
  'open-settings'
])
</script>

<style scoped>
.floating-menu-container {
  position: absolute;
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 10;
}

.floating-menu {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--flora-color-surface);
  border: 1px solid var(--flora-color-border-default);
  border-radius: 50px;
  padding: 12px 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.menu-separator {
  height: 1px;
  background: var(--flora-color-border-default);
  margin: 0 8px;
}

.menu-icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--flora-color-surface);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--flora-transition-fast);
  padding: 0;
}

.menu-icon-button:hover {
  background: var(--flora-color-surface-hover);
  border-color: var(--flora-color-accent);
  transform: scale(1.05);
}

.menu-icon-button:active {
  transform: scale(0.95);
}

.menu-icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-icon-button:disabled:hover {
  background: var(--flora-color-surface);
  transform: none;
}

.menu-icon-button.active {
  background: var(--flora-color-accent);
  border-color: var(--flora-color-accent);
}

.menu-icon-button img {
  width: 24px;
  height: 24px;
  pointer-events: none;
  filter: brightness(0) invert(1);
}

.menu-icon-button.active img {
  filter: brightness(0) invert(1);
}
</style>
