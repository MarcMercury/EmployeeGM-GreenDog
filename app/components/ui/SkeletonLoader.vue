<script setup lang="ts">
/**
 * SkeletonLoader Component
 * Flexible skeleton loading placeholders for various content types
 */

interface Props {
  type?: 'text' | 'avatar' | 'card' | 'table' | 'list' | 'custom'
  lines?: number
  avatarSize?: number
  width?: string
  height?: string
  animated?: boolean
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  lines: 3,
  avatarSize: 40,
  width: '100%',
  height: '16px',
  animated: true,
  rounded: 'md'
})

const roundedClass = computed(() => {
  if (props.rounded === true || props.rounded === 'md') return 'rounded'
  if (props.rounded === false) return ''
  return `rounded-${props.rounded}`
})

// Generate random widths for text lines to look more natural
const lineWidths = computed(() => {
  const widths = []
  for (let i = 0; i < props.lines; i++) {
    // Last line shorter, others vary between 60-100%
    if (i === props.lines - 1) {
      widths.push(40 + Math.random() * 30) // 40-70%
    } else {
      widths.push(70 + Math.random() * 30) // 70-100%
    }
  }
  return widths
})
</script>

<template>
  <div class="skeleton-wrapper">
    <!-- Text Skeleton -->
    <template v-if="type === 'text'">
      <div 
        v-for="(lineWidth, index) in lineWidths" 
        :key="index"
        class="skeleton-line"
        :class="[roundedClass, { 'skeleton-shimmer': animated }]"
        :style="{ 
          width: `${lineWidth}%`,
          height: height,
          marginBottom: index < lines - 1 ? '8px' : '0'
        }"
      />
    </template>
    
    <!-- Avatar Skeleton -->
    <template v-else-if="type === 'avatar'">
      <div 
        class="skeleton-avatar"
        :class="{ 'skeleton-shimmer': animated }"
        :style="{ 
          width: `${avatarSize}px`, 
          height: `${avatarSize}px` 
        }"
      />
    </template>
    
    <!-- Card Skeleton -->
    <template v-else-if="type === 'card'">
      <div class="skeleton-card" :class="{ 'skeleton-shimmer': animated }">
        <div class="skeleton-card-header">
          <div class="skeleton-avatar skeleton-shimmer" style="width: 48px; height: 48px;" />
          <div class="skeleton-card-title">
            <div class="skeleton-line skeleton-shimmer rounded" style="width: 60%; height: 16px;" />
            <div class="skeleton-line skeleton-shimmer rounded" style="width: 40%; height: 12px; margin-top: 6px;" />
          </div>
        </div>
        <div class="skeleton-card-body">
          <div 
            v-for="i in 3" 
            :key="i" 
            class="skeleton-line skeleton-shimmer rounded"
            :style="{ 
              width: `${70 + Math.random() * 30}%`,
              height: '14px',
              marginTop: '8px'
            }"
          />
        </div>
      </div>
    </template>
    
    <!-- Table Skeleton -->
    <template v-else-if="type === 'table'">
      <div class="skeleton-table">
        <!-- Header -->
        <div class="skeleton-table-row skeleton-table-header">
          <div v-for="i in 4" :key="i" class="skeleton-table-cell">
            <div class="skeleton-line skeleton-shimmer rounded" style="width: 60%; height: 14px;" />
          </div>
        </div>
        <!-- Rows -->
        <div v-for="row in lines" :key="row" class="skeleton-table-row">
          <div v-for="col in 4" :key="col" class="skeleton-table-cell">
            <div 
              class="skeleton-line skeleton-shimmer rounded" 
              :style="{ width: `${50 + Math.random() * 40}%`, height: '14px' }"
            />
          </div>
        </div>
      </div>
    </template>
    
    <!-- List Skeleton -->
    <template v-else-if="type === 'list'">
      <div v-for="i in lines" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar skeleton-shimmer" style="width: 40px; height: 40px;" />
        <div class="skeleton-list-content">
          <div class="skeleton-line skeleton-shimmer rounded" style="width: 50%; height: 14px;" />
          <div class="skeleton-line skeleton-shimmer rounded" style="width: 70%; height: 12px; margin-top: 6px;" />
        </div>
      </div>
    </template>
    
    <!-- Custom Skeleton (slot-based) -->
    <template v-else-if="type === 'custom'">
      <div 
        class="skeleton-custom"
        :class="[roundedClass, { 'skeleton-shimmer': animated }]"
        :style="{ width, height }"
      >
        <slot />
      </div>
    </template>
  </div>
</template>

<style scoped>
.skeleton-wrapper {
  width: 100%;
}

.skeleton-line {
  background: rgba(0, 0, 0, 0.08);
  display: block;
}

.skeleton-avatar {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-card {
  background: var(--color-surface, #fff);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.skeleton-card-title {
  flex: 1;
}

.skeleton-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.skeleton-table-row:last-child {
  border-bottom: none;
}

.skeleton-table-header {
  background: rgba(0, 0, 0, 0.02);
}

.skeleton-table-cell {
  display: flex;
  align-items: center;
}

.skeleton-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.skeleton-list-item:last-child {
  border-bottom: none;
}

.skeleton-list-content {
  flex: 1;
}

.skeleton-custom {
  background: rgba(0, 0, 0, 0.08);
}

/* Shimmer Animation */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.06) 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.06) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite ease-in-out;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
    background: rgba(0, 0, 0, 0.08);
  }
}
</style>
