<template>
  <div class="model-control">
    <!-- Checkbox: it carries its own inline label, on the right of the box -->
    <BaseCheckbox
      v-if="control.type === 'checkbox'"
      :id="controlId"
      :model-value="!!value"
      :label="control.label"
      @change="emitValue($event.target.checked)"
    />

    <BaseLabel v-else :for="controlId">{{ control.label }}</BaseLabel>

    <!-- Select -->
    <BaseSelect
      v-if="control.type === 'select'"
      :id="controlId"
      size="sm"
      :model-value="value"
      @change="emitValue(castSelect($event.target.value))"
    >
      <option
        v-for="option in control.enum"
        :key="option"
        :value="option"
      >
        {{ option }}
      </option>
    </BaseSelect>

    <!-- Multi-line text -->
    <BaseTextarea
      v-else-if="control.type === 'textarea'"
      :id="controlId"
      :model-value="value ?? ''"
      :rows="control.rows || 4"
      :placeholder="control.placeholder || ''"
      @input="emitValue($event.target.value)"
    />

    <!-- Number -->
    <BaseInput
      v-else-if="control.type === 'number'"
      :id="controlId"
      type="number"
      size="sm"
      :model-value="value ?? ''"
      :min="control.min"
      :max="control.max"
      :step="control.step"
      :placeholder="control.placeholder || ''"
      @input="emitValue(castNumber($event.target.value))"
    />

    <!-- Single-line text: the fallback for anything that is not a checkbox,
         which was already rendered above with its own label -->
    <BaseInput
      v-else-if="control.type !== 'checkbox'"
      :id="controlId"
      type="text"
      size="sm"
      :model-value="value ?? ''"
      :placeholder="control.placeholder || ''"
      @input="emitValue($event.target.value)"
    />

    <p v-if="control.description" class="model-control-description">
      {{ control.description }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BaseLabel from '@/components/ui/BaseLabel.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'

/**
 * Renders one uiSchema control descriptor, stacked label over field.
 *
 * The toolbars inside the generator nodes render the same descriptors inline;
 * this component exists for the places that need a vertical layout and every
 * control type in one go.
 */
const props = defineProps({
  control: {
    type: Object,
    required: true
  },
  // Current param value. Null/undefined means "never set", so the control
  // falls back to the default declared by the schema
  modelValue: {
    type: [String, Number, Boolean],
    default: null
  },
  idPrefix: {
    type: String,
    default: 'control'
  }
})

const emit = defineEmits(['change'])

const controlId = computed(() => `${props.idPrefix}-${props.control.key}`)

const value = computed(() => props.modelValue ?? props.control.default ?? null)

function emitValue(next) {
  emit('change', props.control.key, next)
}

/**
 * Selects always hand back strings. Numeric enums (fps, for one) must stay
 * numeric so the value survives serialization and reaches the API as a number
 */
function castSelect(raw) {
  if (typeof props.control.default !== 'number') return raw

  const parsed = Number(raw)
  return Number.isNaN(parsed) ? raw : parsed
}

/**
 * An empty field means "unset", not zero. A fractional step is what tells a
 * float control (temperature) from an integer one (max tokens)
 */
function castNumber(raw) {
  if (raw === '') return null

  const step = props.control.step
  const parsed = step && !Number.isInteger(step) ? parseFloat(raw) : parseInt(raw)
  return Number.isNaN(parsed) ? null : parsed
}
</script>

<style scoped>
.model-control {
  display: flex;
  flex-direction: column;
  gap: var(--flora-space-2);
}

.model-control-description {
  margin: 0;
  font-size: var(--flora-font-size-xs);
  color: var(--flora-color-text-tertiary);
  line-height: 1.4;
}
</style>
