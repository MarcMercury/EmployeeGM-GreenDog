<script setup lang="ts">
/**
 * MasterListLayout Component
 * 
 * Standardized layout for all list-based modules including:
 * - Recruiting Pipeline, Leads, Visitor CRM, Partners, Employee Roster
 * 
 * Features:
 * - Consistent header with title, subtitle, and action buttons
 * - Stats cards row for key metrics
 * - Unified filter bar with search and category filters
 * - Tab navigation support
 * - Responsive design
 */

interface StatCard {
  label: string
  value: string | number
  color?: string
  icon?: string
  variant?: 'default' | 'warning' | 'success' | 'error'
}

interface TabItem {
  key: string
  label: string
  icon?: string
  count?: number
}

interface Props {
  // Header
  title: string
  subtitle?: string
  backTo?: string
  
  // Stats
  stats?: StatCard[]
  
  // Tabs
  tabs?: TabItem[]
  activeTab?: string
  
  // Search
  searchPlaceholder?: string
  modelValue?: string // for search v-model
  
  // Quick filters (toggle buttons like ALL, FOLLOW-UP, OVERDUE)
  quickFilters?: { key: string; label: string; active?: boolean }[]
  activeQuickFilter?: string
  
  // Loading state
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: 'Search...',
  loading: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:activeTab', value: string): void
  (e: 'update:activeQuickFilter', value: string): void
}>()

const searchValue = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val)
})

const currentTab = computed({
  get: () => props.activeTab,
  set: (val) => emit('update:activeTab', val || '')
})

const currentQuickFilter = computed({
  get: () => props.activeQuickFilter || 'all',
  set: (val) => emit('update:activeQuickFilter', val)
})

// Stat card color mapping
function getStatCardClasses(stat: StatCard) {
  const base = 'stat-card'
  const variants: Record<string, string> = {
    default: 'bg-primary',
    warning: 'bg-warning',
    success: 'bg-success',
    error: 'bg-error'
  }
  return `${base} ${stat.color ? `bg-${stat.color}` : variants[stat.variant || 'default']}`
}

function isLightBackground(stat: StatCard) {
  const lightColors = ['amber', 'yellow', 'lime', 'cyan', 'warning', 'grey-lighten-3', 'white']
  return lightColors.some(c => stat.color?.includes(c)) || stat.variant === 'warning'
}
</script>

<template>
  <div class="master-list-layout">
    <!-- Header Section -->
    <header class="master-list-header">
      <div class="header-left">
        <v-btn
          v-if="backTo"
          icon
          variant="text"
          size="small"
          :to="backTo"
          class="mr-2"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div>
          <h1 class="text-h4 font-weight-bold mb-0">{{ title }}</h1>
          <p v-if="subtitle" class="text-body-2 text-medium-emphasis mb-0">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <slot name="header-actions" />
      </div>
    </header>

    <!-- Tabs (if provided) -->
    <v-tabs
      v-if="tabs && tabs.length > 0"
      v-model="currentTab"
      color="primary"
      class="master-list-tabs mb-4"
    >
      <v-tab
        v-for="tab in tabs"
        :key="tab.key"
        :value="tab.key"
      >
        <v-icon v-if="tab.icon" start size="18">{{ tab.icon }}</v-icon>
        {{ tab.label }}
        <v-chip
          v-if="tab.count !== undefined"
          size="x-small"
          class="ml-2"
          color="grey-darken-1"
        >
          {{ tab.count }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Stats Cards Row -->
    <div v-if="stats && stats.length > 0" class="stats-row">
      <div
        v-for="(stat, index) in stats"
        :key="index"
        :class="[
          'stat-card',
          stat.variant ? `stat-card--${stat.variant}` : '',
          stat.color ? `bg-${stat.color}` : ''
        ]"
      >
        <div 
          class="stat-value" 
          :class="{ 'text-white': !isLightBackground(stat), 'text-grey-darken-4': isLightBackground(stat) }"
        >
          {{ stat.value }}
        </div>
        <div 
          class="stat-label"
          :class="{ 'text-white': !isLightBackground(stat), 'text-grey-darken-2': isLightBackground(stat) }"
        >
          {{ stat.label }}
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <v-card class="filter-bar mb-4" rounded="lg" elevation="1">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <!-- Search Field -->
          <v-col cols="12" sm="6" md="4" lg="3">
            <v-text-field
              v-model="searchValue"
              :placeholder="searchPlaceholder"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              class="search-field"
            />
          </v-col>
          
          <!-- Filter Slots -->
          <v-col cols="12" sm="6" md="8" lg="6">
            <div class="d-flex gap-2 flex-wrap">
              <slot name="filters" />
            </div>
          </v-col>
          
          <!-- Quick Filter Toggles -->
          <v-col 
            v-if="quickFilters && quickFilters.length > 0" 
            cols="12" 
            lg="3" 
            class="d-flex justify-end"
          >
            <v-btn-toggle
              v-model="currentQuickFilter"
              mandatory
              density="compact"
              color="primary"
              variant="outlined"
            >
              <v-btn
                v-for="filter in quickFilters"
                :key="filter.key"
                :value="filter.key"
                size="small"
              >
                {{ filter.label }}
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Content -->
    <div class="master-list-content">
      <v-progress-linear
        v-if="loading"
        indeterminate
        color="primary"
        class="mb-2"
      />
      <slot />
    </div>
  </div>
</template>

<style scoped>
.master-list-layout {
  padding: 0;
}

.master-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.master-list-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.stats-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.stat-card {
  flex: 1;
  min-width: 120px;
  max-width: 180px;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  background: rgb(var(--v-theme-primary));
}

.stat-card--default { background: rgb(var(--v-theme-primary)); }
.stat-card--success { background: rgb(var(--v-theme-success)); }
.stat-card--warning { background: rgb(var(--v-theme-warning)); }
.stat-card--error { background: rgb(var(--v-theme-error)); }

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  opacity: 0.9;
}

.filter-bar {
  background: rgb(var(--v-theme-surface));
}

.search-field {
  max-width: 280px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .stats-row {
    flex-wrap: nowrap;
  }
  
  .stat-card {
    min-width: 100px;
    padding: 0.75rem 0.5rem;
  }
  
  .stat-value {
    font-size: 1.25rem;
  }
  
  .stat-label {
    font-size: 0.65rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .search-field {
    max-width: 100%;
  }
}
</style>
