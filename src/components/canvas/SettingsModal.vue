<template>
  <BaseModal
    v-model="isOpen"
    title="Settings"
    :show-header="true"
    :show-footer="false"
    size="md"
  >
    <div class="settings-content">
      <!-- Node Appearance Section -->
      <div class="settings-section">
        <h3 class="settings-section-title">Node Appearance</h3>
        <div class="settings-option">
          <BaseCheckbox
            id="show-node-headers"
            v-model="settingsStore.showNodeHeaders"
            label="Show node headers"
          />
          <p class="settings-option-description">
            Display node headers with icons and labels
          </p>
        </div>
      </div>

      <!-- API Keys Section -->
      <div class="settings-section">
        <h3 class="settings-section-title">API Keys</h3>

        <!-- Replicate API Key -->
        <div class="settings-option">
          <label for="replicate-api-key" class="settings-label">
            Replicate API Key
          </label>
          <BaseInput
            id="replicate-api-key"
            v-model="replicateKey"
            type="password"
            placeholder="Enter your Replicate API key"
            @blur="saveReplicateKey"
          />
          <p class="settings-option-description">
            Used for AI image generation. Get your key at
            <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noopener">replicate.com</a>
          </p>
        </div>

        <!-- OpenAI API Key -->
        <div class="settings-option">
          <label for="openai-api-key" class="settings-label">
            OpenAI API Key
          </label>
          <BaseInput
            id="openai-api-key"
            v-model="openaiKey"
            type="password"
            placeholder="Enter your OpenAI API key"
            @blur="saveOpenaiKey"
          />
          <p class="settings-option-description">
            Used for text generation (GPT-5). Get your key at
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a>
          </p>
        </div>

        <!-- Clear Keys Button -->
        <div class="settings-actions">
          <button
            class="clear-keys-button"
            @click="handleClearKeys"
          >
            Clear All API Keys
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const settingsStore = useSettingsStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Local state for API keys
const replicateKey = ref(settingsStore.replicateApiKey)
const openaiKey = ref(settingsStore.openaiApiKey)

// Watch for external changes to the store
watch(() => settingsStore.replicateApiKey, (newValue) => {
  replicateKey.value = newValue
})

watch(() => settingsStore.openaiApiKey, (newValue) => {
  openaiKey.value = newValue
})

// Save functions
function saveReplicateKey() {
  settingsStore.setReplicateApiKey(replicateKey.value)
}

function saveOpenaiKey() {
  settingsStore.setOpenaiApiKey(openaiKey.value)
}

function handleClearKeys() {
  if (confirm('Are you sure you want to clear all API keys?')) {
    settingsStore.clearApiKeys()
    replicateKey.value = ''
    openaiKey.value = ''
  }
}
</script>

<style scoped>
.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-6);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-3);
}

.settings-section-title {
  margin: 0;
  font-size: var(--flora-font-size-base);
  font-weight: var(--flora-font-weight-semibold);
  color: var(--flora-color-text-primary);
  padding-bottom: var(--flora-space-2);
  border-bottom: var(--flora-border-width-thin) solid var(--flora-color-border-default);
}

.settings-option {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-1);
}

.settings-label {
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  color: var(--flora-color-text-secondary);
  margin: 0;
}

.settings-option-description {
  margin: 0;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  padding-left: calc(18px + var(--flora-space-2));
}

.settings-option-description a {
  color: var(--flora-color-primary);
  text-decoration: none;
}

.settings-option-description a:hover {
  text-decoration: underline;
}

.settings-actions {
  display: flex;
  gap: var(--flora-space-2);
  margin-top: var(--flora-space-2);
}

.clear-keys-button {
  padding: var(--flora-space-2) var(--flora-space-3);
  background: var(--flora-color-danger-subtle);
  color: var(--flora-color-danger);
  border: var(--flora-border-width-thin) solid var(--flora-color-danger);
  border-radius: var(--flora-radius-md);
  font-size: var(--flora-font-size-sm);
  font-weight: var(--flora-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-keys-button:hover {
  background: var(--flora-color-danger);
  color: white;
}

.clear-keys-button:active {
  transform: scale(0.98);
}
</style>
