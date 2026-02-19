<template>
  <div class="skeleton-cards">
    <v-row>
      <v-col 
        v-for="i in count" 
        :key="i" 
        :cols="cols" 
        :sm="sm" 
        :md="md" 
        :lg="lg"
      >
        <v-card rounded="lg" elevation="1" class="skeleton-card pa-4">
          <!-- Card Header -->
          <div class="d-flex align-center gap-3 mb-4">
            <div class="skeleton-pulse rounded-circle" style="width: 48px; height: 48px;"></div>
            <div class="flex-grow-1">
              <div class="skeleton-pulse mb-2" style="width: 70%; height: 16px; border-radius: 4px;"></div>
              <div class="skeleton-pulse" style="width: 50%; height: 12px; border-radius: 4px;"></div>
            </div>
          </div>
          
          <!-- Card Body -->
          <div v-if="showStats" class="d-flex justify-space-around mb-4">
            <div v-for="j in 3" :key="j" class="text-center">
              <div class="skeleton-pulse mx-auto mb-1" style="width: 40px; height: 28px; border-radius: 4px;"></div>
              <div class="skeleton-pulse mx-auto" style="width: 50px; height: 10px; border-radius: 4px;"></div>
            </div>
          </div>

          <!-- Card Footer -->
          <div v-if="showActions" class="d-flex gap-2 justify-end mt-3">
            <div class="skeleton-pulse" style="width: 80px; height: 32px; border-radius: 8px;"></div>
            <div class="skeleton-pulse" style="width: 80px; height: 32px; border-radius: 8px;"></div>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
interface Props {
  count?: number
  cols?: number | string
  sm?: number | string
  md?: number | string
  lg?: number | string
  showStats?: boolean
  showActions?: boolean
}

withDefaults(defineProps<Props>(), {
  count: 6,
  cols: 12,
  sm: 6,
  md: 4,
  lg: 3,
  showStats: false,
  showActions: true
})
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
