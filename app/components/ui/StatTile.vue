<template>
  <v-card
    :class="[
      'stat-tile',
      `stat-tile--${size}`,
      { 'stat-tile--clickable': clickable }
    ]"
    :variant="variant"
    :color="color"
    v-bind="clickable ? { ripple: true } : {}"
    @click="handleClick"
  >
    <v-card-text class="stat-tile__content">
      <!-- Icon (optional) -->
      <v-icon
        v-if="icon"
        :size="size === 'compact' ? 24 : 32"
        class="stat-tile__icon"
        :color="iconColor || color"
      >
        {{ icon }}
      </v-icon>

      <!-- Main Value -->
      <div :class="['stat-tile__value', `text-${valueSize}`]">
        {{ formattedValue }}
      </div>

      <!-- Label -->
      <div class="stat-tile__label text-caption">
        {{ label }}
      </div>

      <!-- Subtitle (optional) -->
      <div v-if="subtitle" class="stat-tile__subtitle text-caption" :class="subtitleColor ? `text-${subtitleColor}` : 'text-medium-emphasis'">
        {{ subtitle }}
      </div>

      <!-- Trend indicator (optional) -->
      <div v-if="trend !== undefined" class="stat-tile__trend" :class="trendClass">
        <v-icon size="14">{{ trendIcon }}</v-icon>
        <span class="text-caption">{{ Math.abs(trend) }}%</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  value: number | string
  label: string
  color?: string
  icon?: string
  iconColor?: string
  subtitle?: string
  subtitleColor?: string
  size?: 'compact' | 'standard' | 'tall'
  variant?: 'tonal' | 'outlined' | 'flat' | 'elevated'
  trend?: number
  clickable?: boolean
  format?: 'number' | 'currency' | 'percent' | 'compact' | 'none'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
  size: 'standard',
  variant: 'tonal',
  clickable: false,
  format: 'number'
})

const emit = defineEmits<{
  click: []
}>()

const formattedValue = computed(() => {
  if (typeof props.value === 'string' || props.format === 'none') {
    return props.value
  }
  
  const num = Number(props.value)
  
  switch (props.format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num)
    case 'percent':
      return `${num}%`
    case 'compact':
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
      return num.toLocaleString()
    default:
      return num.toLocaleString()
  }
})

const valueSize = computed(() => {
  switch (props.size) {
    case 'compact': return 'h5'
    case 'tall': return 'h4'
    default: return 'h5'
  }
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'text-success' : 'text-error'
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''
  return props.trend >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'
})

function handleClick() {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.stat-tile {
  text-align: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-tile--clickable {
  cursor: pointer;
}

.stat-tile--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-tile__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

/* Compact: Minimal padding, smaller text */
.stat-tile--compact .stat-tile__content {
  padding: 12px 8px;
  min-height: 72px;
}

/* Standard: Default size */
.stat-tile--standard .stat-tile__content {
  padding: 16px 12px;
  min-height: 88px;
}

/* Tall: More room for extra content */
.stat-tile--tall .stat-tile__content {
  padding: 20px 12px;
  min-height: 110px;
}

.stat-tile__icon {
  margin-bottom: 4px;
}

.stat-tile__value {
  font-weight: 700;
  line-height: 1.2;
}

.stat-tile__label {
  font-weight: 500;
  opacity: 0.85;
  line-height: 1.2;
}

.stat-tile__subtitle {
  margin-top: 2px;
  font-size: 11px;
}

.stat-tile__trend {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
}
</style>
