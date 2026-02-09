<template>
  <div class="responsive-table">
    <!-- Search and Filter Bar -->
    <div v-if="showFilters" class="filter-bar mb-4">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="internalSearch"
            :placeholder="searchPlaceholder"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            class="search-field"
          />
        </v-col>
        <v-col cols="12" md="8">
          <div class="d-flex gap-2 flex-wrap">
            <slot name="filters" />
            <!-- Density Toggle (desktop only) -->
            <v-btn-toggle 
              v-if="showDensityToggle" 
              v-model="density" 
              density="compact" 
              variant="outlined" 
              class="d-none d-md-flex"
            >
              <v-btn value="comfortable" size="small">
                <v-icon size="16">mdi-view-list</v-icon>
              </v-btn>
              <v-btn value="compact" size="small">
                <v-icon size="16">mdi-view-headline</v-icon>
              </v-btn>
            </v-btn-toggle>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Loading State -->
    <div v-if="loading">
      <SkeletonTable :rows="skeletonRows" :show-filters="false" />
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredItems.length === 0" class="empty-state text-center py-12">
      <v-icon size="64" color="grey-lighten-2" class="mb-4">{{ emptyIcon }}</v-icon>
      <h3 class="text-h6 text-grey-darken-1 mb-2">{{ emptyTitle }}</h3>
      <p class="text-body-2 text-grey mb-4">{{ emptyMessage }}</p>
      <slot name="empty-action" />
    </div>

    <!-- Desktop Table View -->
    <v-card v-else rounded="lg" class="d-none d-md-block">
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :items-per-page="itemsPerPage"
        :density="density"
        hover
        @click:row="onRowClick"
      >
        <!-- Pass through all slots -->
        <template v-for="(_, slotName) in $slots" :key="slotName" #[slotName]="slotProps">
          <slot :name="slotName" v-bind="slotProps" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Mobile Card View -->
    <div class="mobile-cards d-md-none">
      <div 
        v-for="(item, index) in paginatedItems" 
        :key="item.id || index"
        class="mobile-card"
        @click="$emit('row-click', { item })"
      >
        <slot name="mobile-card" :item="item" :index="index">
          <!-- Default mobile card layout -->
          <div class="d-flex align-center gap-3">
            <slot name="mobile-avatar" :item="item">
              <v-avatar color="primary" size="44">
                <span class="text-subtitle-2 text-white">{{ getInitials(item) }}</span>
              </v-avatar>
            </slot>
            <div class="flex-grow-1 min-width-0">
              <slot name="mobile-title" :item="item">
                <div class="text-subtitle-1 font-weight-medium text-truncate">
                  {{ item.name || item.title || 'Untitled' }}
                </div>
              </slot>
              <slot name="mobile-subtitle" :item="item">
                <div class="text-caption text-grey text-truncate">
                  {{ item.subtitle || item.description || '' }}
                </div>
              </slot>
            </div>
            <slot name="mobile-action" :item="item">
              <v-icon color="grey-lighten-1">mdi-chevron-right</v-icon>
            </slot>
          </div>
          <slot name="mobile-details" :item="item" />
        </slot>
      </div>

      <!-- Mobile Pagination -->
      <div v-if="totalPages > 1" class="mobile-pagination d-flex justify-center py-4 gap-2">
        <v-btn
          icon
          size="small"
          variant="tonal"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <span class="d-flex align-center text-body-2">
          {{ currentPage }} / {{ totalPages }}
        </span>
        <v-btn
          icon
          size="small"
          variant="tonal"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonTable from './SkeletonTable.vue'
import type { Header } from '~/types/ui.types'

interface Props {
  items: any[]
  headers: Header[]
  loading?: boolean
  searchPlaceholder?: string
  showFilters?: boolean
  showDensityToggle?: boolean
  itemsPerPage?: number
  mobileItemsPerPage?: number
  skeletonRows?: number
  emptyIcon?: string
  emptyTitle?: string
  emptyMessage?: string
  searchKeys?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchPlaceholder: 'Search...',
  showFilters: true,
  showDensityToggle: true,
  itemsPerPage: 15,
  mobileItemsPerPage: 10,
  skeletonRows: 8,
  emptyIcon: 'mdi-database-off',
  emptyTitle: 'No items found',
  emptyMessage: 'Try adjusting your search or filters',
  searchKeys: () => ['name', 'title', 'email']
})

const emit = defineEmits(['row-click', 'update:search'])

const internalSearch = ref('')
const density = ref<'comfortable' | 'compact'>('comfortable')
const currentPage = ref(1)

// Watch for external search updates
watch(internalSearch, (val) => {
  emit('update:search', val)
  currentPage.value = 1 // Reset to first page on search
})

// Filter items based on search
const filteredItems = computed(() => {
  if (!internalSearch.value) return props.items
  
  const query = internalSearch.value.toLowerCase()
  return props.items.filter(item => {
    return props.searchKeys.some(key => {
      const value = item[key]
      return value && String(value).toLowerCase().includes(query)
    })
  })
})

// Pagination for mobile
const totalPages = computed(() => 
  Math.ceil(filteredItems.value.length / props.mobileItemsPerPage)
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * props.mobileItemsPerPage
  return filteredItems.value.slice(start, start + props.mobileItemsPerPage)
})

// Helper functions
const getInitials = (item: any) => {
  const name = item.name || item.title || ''
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const onRowClick = (_: any, { item }: { item: any }) => {
  emit('row-click', { item })
}
</script>

<style scoped>
.responsive-table {
  width: 100%;
}

.filter-bar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.search-field :deep(.v-field) {
  border-radius: 10px;
}

.empty-state {
  background: linear-gradient(to bottom, #fafafa, #f5f5f5);
  border-radius: 16px;
  border: 2px dashed #e0e0e0;
}

/* Mobile Card Styles */
.mobile-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-card:active {
  transform: scale(0.98);
  background: #fafafa;
}

.mobile-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.min-width-0 {
  min-width: 0;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .filter-bar {
    padding: 8px 12px;
  }
}
</style>
