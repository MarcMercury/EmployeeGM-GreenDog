<script setup lang="ts">
/**
 * DensityControl Component
 * Toggle for adjusting UI density (compact, default, comfortable)
 */

type Density = 'compact' | 'default' | 'comfortable'

interface Props {
  modelValue?: Density
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'default',
  showLabel: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Density): void
}>()

const densityOptions = [
  { value: 'compact' as Density, icon: 'mdi-view-compact', tooltip: 'Compact' },
  { value: 'default' as Density, icon: 'mdi-view-agenda', tooltip: 'Default' },
  { value: 'comfortable' as Density, icon: 'mdi-view-day', tooltip: 'Comfortable' }
]

const currentDensity = computed({
  get: () => props.modelValue,
  set: (val: Density) => emit('update:modelValue', val)
})
</script>

<template>
  <div class="density-control d-flex align-center gap-2">
    <span v-if="showLabel" class="text-caption text-medium-emphasis">Density:</span>
    <v-btn-toggle
      v-model="currentDensity"
      density="compact"
      mandatory
      variant="outlined"
      divided
    >
      <v-btn
        v-for="option in densityOptions"
        :key="option.value"
        :value="option.value"
        size="small"
      >
        <v-tooltip :text="option.tooltip" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-icon v-bind="tooltipProps" :icon="option.icon" size="18" />
          </template>
        </v-tooltip>
      </v-btn>
    </v-btn-toggle>
  </div>
</template>

<style scoped>
.density-control {
  flex-shrink: 0;
}
</style>
