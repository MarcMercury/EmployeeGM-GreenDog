<template>
  <div class="skill-hexagon">
    <!-- SVG Radar Chart -->
    <svg 
      :viewBox="`0 0 ${size} ${size}`" 
      class="radar-svg"
    >
      <!-- Background hexagon rings -->
      <g class="radar-rings">
        <polygon
          v-for="ring in 5"
          :key="`ring-${ring}`"
          :points="getHexagonPoints(ring / 5)"
          class="radar-ring"
          :style="{ opacity: ring * 0.15 }"
        />
      </g>
      
      <!-- Category labels and lines -->
      <g class="radar-axes">
        <g 
          v-for="(category, index) in categories" 
          :key="`axis-${index}`"
        >
          <line
            :x1="center"
            :y1="center"
            :x2="getAxisPoint(index).x"
            :y2="getAxisPoint(index).y"
            class="axis-line"
          />
          <text
            :x="getLabelPoint(index).x"
            :y="getLabelPoint(index).y"
            :text-anchor="getTextAnchor(index)"
            class="axis-label"
          >
            {{ category.category }}
          </text>
        </g>
      </g>
      
      <!-- Data polygon -->
      <polygon
        v-if="dataPoints.length > 0"
        :points="dataPointsString"
        class="data-polygon"
      />
      
      <!-- Data points -->
      <g class="data-points">
        <circle
          v-for="(point, index) in dataPointsCoords"
          :key="`point-${index}`"
          :cx="point.x"
          :cy="point.y"
          r="6"
          class="data-point"
          @mouseenter="hoveredCategory = categories[index]"
          @mouseleave="hoveredCategory = null"
        />
      </g>
    </svg>
    
    <!-- Hover tooltip -->
    <Transition name="fade">
      <div 
        v-if="hoveredCategory" 
        class="radar-tooltip"
      >
        <div class="tooltip-title">{{ hoveredCategory.category }}</div>
        <div class="tooltip-value">
          Level: {{ hoveredCategory.value.toFixed(1) }} / 5
        </div>
      </div>
    </Transition>
    
    <!-- Legend -->
    <div class="radar-legend">
      <div 
        v-for="(category, index) in categories" 
        :key="`legend-${index}`"
        class="legend-item"
        :class="{ 'legend-item--active': hoveredCategory?.category === category.category }"
        @mouseenter="hoveredCategory = category"
        @mouseleave="hoveredCategory = null"
      >
        <div class="legend-dot" :style="{ backgroundColor: getColor(index) }" />
        <span class="legend-label">{{ category.category }}</span>
        <span class="legend-value">{{ category.value.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RadarCategory } from '~/types/skill.types'

interface Props {
  categories: RadarCategory[]
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 300
})

const hoveredCategory = ref<RadarCategory | null>(null)

// Computed values
const center = computed(() => props.size / 2)
const radius = computed(() => (props.size / 2) * 0.65) // Leave room for labels

const dataPoints = computed(() => props.categories.map(c => c.value / c.fullMark))

/**
 * Get hexagon points for a given scale (0-1)
 */
function getHexagonPoints(scale: number): string {
  const n = props.categories.length || 6
  const points: string[] = []
  
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const x = center.value + radius.value * scale * Math.cos(angle)
    const y = center.value + radius.value * scale * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  
  return points.join(' ')
}

/**
 * Get axis endpoint for a category
 */
function getAxisPoint(index: number): { x: number; y: number } {
  const n = props.categories.length || 6
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  return {
    x: center.value + radius.value * Math.cos(angle),
    y: center.value + radius.value * Math.sin(angle)
  }
}

/**
 * Get label position for a category (outside the chart)
 */
function getLabelPoint(index: number): { x: number; y: number } {
  const n = props.categories.length || 6
  const angle = (Math.PI * 2 * index) / n - Math.PI / 2
  const labelRadius = radius.value * 1.25
  return {
    x: center.value + labelRadius * Math.cos(angle),
    y: center.value + labelRadius * Math.sin(angle) + 4
  }
}

/**
 * Get text anchor for label positioning
 */
function getTextAnchor(index: number): string {
  const n = props.categories.length || 6
  const angle = (Math.PI * 2 * index) / n
  
  if (angle < Math.PI * 0.25 || angle > Math.PI * 1.75) return 'middle'
  if (angle < Math.PI * 0.75) return 'start'
  if (angle < Math.PI * 1.25) return 'middle'
  return 'end'
}

/**
 * Get data points as coordinates
 */
const dataPointsCoords = computed(() => {
  const n = props.categories.length || 6
  return dataPoints.value.map((value, index) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return {
      x: center.value + radius.value * value * Math.cos(angle),
      y: center.value + radius.value * value * Math.sin(angle)
    }
  })
})

/**
 * Get data points as SVG polygon string
 */
const dataPointsString = computed(() => {
  return dataPointsCoords.value.map(p => `${p.x},${p.y}`).join(' ')
})

/**
 * Get color for a category (used for legend dots)
 */
function getColor(index: number): string {
  const colors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#E91E63', // Pink
    '#FFEB3B'  // Yellow
  ]
  return colors[index % colors.length]
}
</script>

<style scoped>
.skill-hexagon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.radar-svg {
  max-width: 100%;
  height: auto;
}

.radar-ring {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.1);
  stroke-width: 1;
}

.axis-line {
  stroke: rgba(var(--v-theme-on-surface), 0.15);
  stroke-width: 1;
}

.axis-label {
  font-size: 10px;
  fill: rgba(var(--v-theme-on-surface), 0.7);
  font-weight: 500;
}

.data-polygon {
  fill: rgba(46, 125, 50, 0.3);
  stroke: #2E7D32;
  stroke-width: 2;
  transition: all 0.3s ease;
}

.data-point {
  fill: #2E7D32;
  stroke: white;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-point:hover {
  r: 8;
  fill: #1B5E20;
}

.radar-tooltip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(var(--v-theme-surface), 0.95);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  text-align: center;
  pointer-events: none;
}

.tooltip-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface));
}

.tooltip-value {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}

.radar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 100%;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(var(--v-theme-surface-variant), 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.legend-item:hover,
.legend-item--active {
  background: rgba(var(--v-theme-primary), 0.1);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-label {
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.legend-value {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
