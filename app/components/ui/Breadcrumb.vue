<script setup lang="ts">
/**
 * Breadcrumb Navigation Component
 * Provides hierarchical navigation with automatic route detection
 */

interface BreadcrumbItem {
  title: string
  to?: string
  icon?: string
  disabled?: boolean
}

interface Props {
  items?: BreadcrumbItem[]
  autoGenerate?: boolean
  homeIcon?: string
  separator?: string
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  autoGenerate: true,
  homeIcon: 'mdi-home',
  separator: 'mdi-chevron-right'
})

const route = useRoute()

// Auto-generate breadcrumbs from current route
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  if (props.items.length > 0) {
    return props.items
  }
  
  if (!props.autoGenerate) {
    return []
  }
  
  const pathSegments = route.path.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [
    { title: 'Home', to: '/', icon: props.homeIcon }
  ]
  
  // Route name mappings for better display
  const nameMap: Record<string, string> = {
    'admin': 'Admin',
    'employees': 'Employees',
    'schedule': 'Schedule',
    'roster': 'Roster',
    'marketing': 'Marketing',
    'med-ops': 'Med Ops',
    'wiki': 'Wiki',
    'academy': 'Academy',
    'training': 'Training',
    'recruiting': 'Recruiting',
    'gdu': 'GDU',
    'people': 'People',
    'growth': 'Growth',
    'partners': 'Partners',
    'facilities': 'Facilities',
    'courses': 'Courses',
    'profile': 'Profile',
    'settings': 'Settings',
    'time-off': 'Time Off',
    'reviews': 'Reviews',
    'goals': 'Goals',
    'mentorship': 'Mentorship',
    'activity': 'Activity',
    'my-schedule': 'My Schedule',
    'my-ops': 'My Ops',
    'development': 'Development',
    'export-payroll': 'Export Payroll',
    'leads': 'Leads'
  }
  
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === pathSegments.length - 1
    
    // Format segment for display
    let title = nameMap[segment] || segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    // Check if it's a dynamic segment (UUID or ID)
    if (segment.match(/^[0-9a-f-]{36}$/i) || /^\d+$/.test(segment)) {
      // Use route meta or fallback to generic title
      title = (route.meta?.title as string) || 'Details'
    }
    
    items.push({
      title,
      to: isLast ? undefined : currentPath,
      disabled: isLast
    })
  })
  
  return items
})
</script>

<template>
  <nav 
    aria-label="Breadcrumb" 
    class="breadcrumb-nav"
  >
    <ol class="breadcrumb-list">
      <li 
        v-for="(item, index) in breadcrumbs" 
        :key="index"
        class="breadcrumb-item"
      >
        <!-- Separator (not for first item) -->
        <v-icon 
          v-if="index > 0" 
          :icon="separator"
          size="18"
          class="breadcrumb-separator"
          aria-hidden="true"
        />
        
        <!-- Link or Text -->
        <NuxtLink
          v-if="item.to && !item.disabled"
          :to="item.to"
          class="breadcrumb-link"
        >
          <v-icon 
            v-if="item.icon" 
            :icon="item.icon" 
            size="18"
            class="mr-1"
          />
          <span>{{ item.title }}</span>
        </NuxtLink>
        
        <span 
          v-else 
          class="breadcrumb-current"
          aria-current="page"
        >
          <v-icon 
            v-if="item.icon" 
            :icon="item.icon" 
            size="18"
            class="mr-1"
          />
          {{ item.title }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb-nav {
  padding: 8px 0;
  margin-bottom: 16px;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.875rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-separator {
  color: var(--color-text-muted, #9ca3af);
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  color: var(--color-primary, #2E7D32);
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.breadcrumb-link:hover {
  background-color: rgba(46, 125, 50, 0.08);
}

.breadcrumb-link:focus-visible {
  outline: 2px solid var(--color-primary, #2E7D32);
  outline-offset: 2px;
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary, #666);
  padding: 4px 8px;
  font-weight: 500;
}

/* Mobile: Show only last 2 items */
@media (max-width: 600px) {
  .breadcrumb-list {
    font-size: 0.8125rem;
  }
  
  .breadcrumb-item:not(:nth-last-child(-n+3)) {
    display: none;
  }
  
  /* Show ellipsis before visible items */
  .breadcrumb-item:nth-last-child(3)::before {
    content: '...';
    margin-right: 4px;
    color: var(--color-text-muted, #9ca3af);
  }
}
</style>
