<template>
  <v-row :class="['stats-row', `stats-row--${layout}`]" :dense="dense">
    <v-col
      v-for="(stat, index) in stats"
      :key="stat.id || index"
      :cols="colConfig.cols"
      :sm="colConfig.sm"
      :md="colConfig.md"
      :lg="colConfig.lg"
    >
      <UiStatTile
        :value="stat.value"
        :label="stat.label"
        :color="stat.color || 'primary'"
        :icon="stat.icon"
        :subtitle="stat.subtitle"
        :subtitle-color="stat.subtitleColor"
        :size="tileSize"
        :variant="variant"
        :trend="stat.trend"
        :format="stat.format"
        :clickable="!!stat.onClick"
        @click="stat.onClick?.()"
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import type { StatItem } from '~/types/ui.types'

interface Props {
  stats: StatItem[]
  /** Layout preset: 4-col, 5-col, 6-col based on how many tiles fit on desktop */
  layout?: '4-col' | '5-col' | '6-col' | 'auto'
  /** Tile size: compact (smaller), standard, tall (more content) */
  tileSize?: 'compact' | 'standard' | 'tall'
  variant?: 'tonal' | 'outlined' | 'flat' | 'elevated'
  dense?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'auto',
  tileSize: 'standard',
  variant: 'tonal',
  dense: false
})

// Column configuration based on layout
const colConfig = computed(() => {
  const count = props.stats.length
  
  // Auto-detect best layout based on stat count
  if (props.layout === 'auto') {
    if (count <= 4) {
      return { cols: 6, sm: 6, md: 3, lg: 3 } // 4 across
    } else if (count <= 5) {
      return { cols: 6, sm: 4, md: 4, lg: 'auto' } // 5 across (use flex)
    } else {
      return { cols: 6, sm: 4, md: 2, lg: 2 } // 6 across
    }
  }
  
  switch (props.layout) {
    case '4-col':
      return { cols: 6, sm: 6, md: 3, lg: 3 }
    case '5-col':
      return { cols: 6, sm: 4, md: 'auto', lg: 'auto' }
    case '6-col':
      return { cols: 6, sm: 4, md: 2, lg: 2 }
    default:
      return { cols: 6, sm: 4, md: 3, lg: 3 }
  }
})
</script>

<style scoped>
.stats-row {
  margin-bottom: 16px;
}

/* 5-column layout uses flexbox for even distribution */
.stats-row--5-col {
  display: flex;
  flex-wrap: wrap;
}

.stats-row--5-col > .v-col {
  flex: 1 1 auto;
  max-width: 20%;
}

@media (max-width: 960px) {
  .stats-row--5-col > .v-col {
    max-width: 33.333%;
  }
}

@media (max-width: 600px) {
  .stats-row--5-col > .v-col {
    max-width: 50%;
  }
}
</style>
