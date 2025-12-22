<script setup lang="ts">
/**
 * MasterListTable Component
 * 
 * Standardized data table for list-based modules with:
 * - Consistent column headers
 * - Multi-sort capabilities
 * - Bulk selection
 * - Action button column (view, call, email, calendar, edit)
 * - Clickable phone/email links
 * - Truncated notes with hover/expand
 */

interface Column {
  key: string
  title: string
  sortable?: boolean
  width?: string
  align?: 'start' | 'center' | 'end'
}

interface ActionButton {
  icon: string
  color?: string
  tooltip?: string
  action: string
  show?: (item: any) => boolean
}

interface Props {
  items: any[]
  columns: Column[]
  itemKey?: string
  loading?: boolean
  hover?: boolean
  selectable?: boolean
  selected?: any[]
  actions?: ActionButton[]
  density?: 'default' | 'comfortable' | 'compact'
  itemsPerPage?: number
  showPagination?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  itemKey: 'id',
  loading: false,
  hover: true,
  selectable: false,
  selected: () => [],
  actions: () => [],
  density: 'comfortable',
  itemsPerPage: 25,
  showPagination: true
})

const emit = defineEmits<{
  (e: 'update:selected', value: any[]): void
  (e: 'action', action: string, item: any): void
  (e: 'row-click', item: any): void
}>()

// Build headers for v-data-table
const headers = computed(() => {
  const cols = props.columns.map(col => ({
    title: col.title,
    key: col.key,
    sortable: col.sortable !== false,
    width: col.width,
    align: col.align || 'start'
  }))
  
  if (props.actions.length > 0) {
    cols.push({
      title: 'Actions',
      key: 'actions',
      sortable: false,
      width: '140px',
      align: 'end'
    })
  }
  
  return cols
})

// Selected items for bulk actions
const selectedItems = computed({
  get: () => props.selected,
  set: (val) => emit('update:selected', val)
})

function handleAction(action: string, item: any) {
  emit('action', action, item)
}

function handleRowClick(event: Event, { item }: { item: any }) {
  emit('row-click', item)
}

// Check if action should be shown for item
function shouldShowAction(action: ActionButton, item: any): boolean {
  if (action.show) {
    return action.show(item)
  }
  return true
}

// Format phone for tel: link
function formatPhoneHref(phone: string | null): string {
  if (!phone) return ''
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// Format email for mailto: link
function formatEmailHref(email: string | null): string {
  if (!email) return ''
  return `mailto:${email}`
}
</script>

<template>
  <v-card rounded="lg" elevation="1">
    <v-data-table
      v-model="selectedItems"
      :headers="headers"
      :items="items"
      :item-value="itemKey"
      :loading="loading"
      :hover="hover"
      :show-select="selectable"
      :density="density"
      :items-per-page="itemsPerPage"
      :items-per-page-options="showPagination ? [10, 25, 50, 100] : undefined"
      class="master-list-table"
      @click:row="handleRowClick"
    >
      <!-- Allow custom column templates via slots -->
      <template v-for="col in columns" :key="col.key" #[`item.${col.key}`]="{ item, value }">
        <slot :name="`item.${col.key}`" :item="item" :value="value">
          <!-- Default rendering based on column key -->
          
          <!-- Phone column - clickable -->
          <template v-if="col.key === 'phone' || col.key === 'contact_phone'">
            <a 
              v-if="item[col.key]" 
              :href="formatPhoneHref(item[col.key])"
              class="text-success text-decoration-none d-inline-flex align-center"
              @click.stop
            >
              <v-icon size="14" class="mr-1">mdi-phone</v-icon>
              {{ item[col.key] }}
            </a>
            <span v-else class="text-grey">—</span>
          </template>
          
          <!-- Email column - clickable -->
          <template v-else-if="col.key === 'email' || col.key === 'contact_email'">
            <a 
              v-if="item[col.key]" 
              :href="formatEmailHref(item[col.key])"
              class="text-primary text-decoration-none d-inline-flex align-center"
              @click.stop
            >
              <v-icon size="14" class="mr-1">mdi-email</v-icon>
              {{ item[col.key] }}
            </a>
            <span v-else class="text-grey">—</span>
          </template>
          
          <!-- Notes column - truncated with tooltip -->
          <template v-else-if="col.key === 'notes'">
            <div v-if="item[col.key]" class="notes-cell">
              <span class="notes-truncated">{{ item[col.key] }}</span>
              <v-tooltip activator="parent" location="top" max-width="400">
                {{ item[col.key] }}
              </v-tooltip>
            </div>
            <span v-else class="text-grey">—</span>
          </template>
          
          <!-- Default: just show value -->
          <template v-else>
            <span v-if="value !== null && value !== undefined && value !== ''">{{ value }}</span>
            <span v-else class="text-grey">—</span>
          </template>
        </slot>
      </template>
      
      <!-- Actions column -->
      <template #item.actions="{ item }">
        <div class="actions-cell">
          <template v-for="action in actions" :key="action.action">
            <v-btn
              v-if="shouldShowAction(action, item)"
              :icon="action.icon"
              size="x-small"
              variant="text"
              :color="action.color || 'grey-darken-1'"
              @click.stop="handleAction(action.action, item)"
            >
              <v-icon size="18">{{ action.icon }}</v-icon>
              <v-tooltip v-if="action.tooltip" activator="parent" location="top">
                {{ action.tooltip }}
              </v-tooltip>
            </v-btn>
          </template>
        </div>
      </template>
      
      <!-- Empty state slot -->
      <template #no-data>
        <slot name="empty">
          <div class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-database-off</v-icon>
            <p class="text-grey mt-2">No data available</p>
          </div>
        </slot>
      </template>
      
      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row-divider@5" />
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
.master-list-table {
  --v-table-row-height: 56px;
}

.master-list-table :deep(tr) {
  cursor: pointer;
}

.actions-cell {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.notes-cell {
  max-width: 200px;
}

.notes-truncated {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Phone and email links */
a.text-success:hover,
a.text-primary:hover {
  text-decoration: underline !important;
}
</style>
