<script setup lang="ts">
/**
 * PageHeader Component
 * Consistent page header with breadcrumbs, title, subtitle, and actions
 */

interface BreadcrumbItem {
  title: string
  to?: string
  icon?: string
}

interface Props {
  title: string
  subtitle?: string
  icon?: string
  breadcrumbs?: BreadcrumbItem[]
  showBreadcrumbs?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBreadcrumbs: true,
  breadcrumbs: () => []
})

const slots = useSlots()
</script>

<template>
  <header class="page-header-wrapper">
    <!-- Breadcrumbs -->
    <UiBreadcrumb 
      v-if="showBreadcrumbs" 
      :items="breadcrumbs"
      class="page-breadcrumbs"
    />
    
    <!-- Main Header Row -->
    <div class="page-header-content">
      <div class="page-header-text">
        <!-- Icon + Title -->
        <div class="page-title-row">
          <v-icon 
            v-if="icon" 
            :icon="icon" 
            size="32"
            color="primary"
            class="page-icon"
          />
          <h1 class="page-title">{{ title }}</h1>
        </div>
        
        <!-- Subtitle -->
        <p v-if="subtitle" class="page-subtitle">
          {{ subtitle }}
        </p>
        
        <!-- Description Slot -->
        <div v-if="slots.description" class="page-description">
          <slot name="description" />
        </div>
      </div>
      
      <!-- Actions Slot -->
      <div v-if="slots.actions" class="page-actions">
        <slot name="actions" />
      </div>
    </div>
    
    <!-- Tabs Slot -->
    <div v-if="slots.tabs" class="page-tabs">
      <slot name="tabs" />
    </div>
    
    <!-- Filters Slot -->
    <div v-if="slots.filters" class="page-filters">
      <slot name="filters" />
    </div>
  </header>
</template>

<style scoped>
.page-header-wrapper {
  margin-bottom: 24px;
}

.page-breadcrumbs {
  margin-bottom: 8px;
}

.page-header-content {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-header-text {
  flex: 1;
  min-width: 200px;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.page-icon {
  flex-shrink: 0;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text-primary, #1a1a1a);
  line-height: 1.2;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9375rem;
  color: var(--color-text-secondary, #666);
  margin: 4px 0 0 0;
  line-height: 1.4;
}

.page-description {
  margin-top: 12px;
  color: var(--color-text-secondary, #666);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.page-tabs {
  margin-top: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.page-filters {
  margin-top: 16px;
}

/* Mobile Styles */
@media (max-width: 600px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .page-icon {
    display: none;
  }
  
  .page-header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .page-actions {
    width: 100%;
    justify-content: stretch;
  }
  
  .page-actions :deep(.v-btn) {
    flex: 1;
  }
}

/* Tablet */
@media (min-width: 601px) and (max-width: 960px) {
  .page-title {
    font-size: 1.625rem;
  }
}
</style>
