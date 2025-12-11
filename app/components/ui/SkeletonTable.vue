<template>
  <div class="skeleton-table">
    <!-- Optional Header -->
    <div v-if="showHeader" class="skeleton-header d-flex align-center justify-space-between mb-4">
      <div>
        <div class="skeleton-pulse" style="width: 200px; height: 32px; border-radius: 4px;"></div>
        <div class="skeleton-pulse mt-2" style="width: 150px; height: 16px; border-radius: 4px;"></div>
      </div>
      <div class="skeleton-pulse" style="width: 120px; height: 36px; border-radius: 8px;"></div>
    </div>

    <!-- Filter Bar -->
    <div v-if="showFilters" class="skeleton-filters d-flex gap-3 mb-4">
      <div class="skeleton-pulse" style="flex: 1; max-width: 250px; height: 40px; border-radius: 8px;"></div>
      <div class="skeleton-pulse" style="width: 140px; height: 40px; border-radius: 8px;"></div>
      <div class="skeleton-pulse" style="width: 140px; height: 40px; border-radius: 8px;"></div>
    </div>

    <!-- Table Rows -->
    <v-card rounded="lg" elevation="1">
      <div class="skeleton-rows pa-2">
        <div 
          v-for="i in rows" 
          :key="i" 
          class="skeleton-row d-flex align-center gap-3 pa-3"
          :class="{ 'border-b': i < rows }"
        >
          <!-- Avatar -->
          <div v-if="showAvatar" class="skeleton-pulse rounded-circle" style="width: 40px; height: 40px; flex-shrink: 0;"></div>
          
          <!-- Primary Content -->
          <div class="flex-grow-1">
            <div class="skeleton-pulse mb-1" :style="{ width: getRandomWidth(140, 200) + 'px', height: '14px', borderRadius: '4px' }"></div>
            <div class="skeleton-pulse" :style="{ width: getRandomWidth(100, 160) + 'px', height: '12px', borderRadius: '4px' }"></div>
          </div>

          <!-- Secondary Columns -->
          <div v-for="col in columns" :key="col" class="d-none d-md-block">
            <div class="skeleton-pulse" :style="{ width: getRandomWidth(80, 120) + 'px', height: '14px', borderRadius: '4px' }"></div>
          </div>

          <!-- Actions -->
          <div v-if="showActions" class="skeleton-pulse" style="width: 60px; height: 24px; border-radius: 12px;"></div>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface Props {
  rows?: number
  columns?: number
  showHeader?: boolean
  showFilters?: boolean
  showAvatar?: boolean
  showActions?: boolean
}

withDefaults(defineProps<Props>(), {
  rows: 8,
  columns: 2,
  showHeader: true,
  showFilters: true,
  showAvatar: true,
  showActions: true
})

// Random widths to make it look more natural
const getRandomWidth = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
</script>

<style scoped>
.skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-surface-variant), 0.3) 0%,
    rgba(var(--v-theme-surface-variant), 0.5) 50%,
    rgba(var(--v-theme-surface-variant), 0.3) 100%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-row {
  transition: background-color 0.2s;
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}

/* Dark mode adjustments */
.v-theme--dark .skeleton-pulse {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
}
</style>
