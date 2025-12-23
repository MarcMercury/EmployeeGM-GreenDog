<script setup lang="ts">
/**
 * BulkActions Component
 * 
 * Toolbar for bulk operations on selected table rows
 * - Bulk status change
 * - Bulk email
 * - Bulk delete
 * - Select all matching filter
 */

interface BulkAction {
  id: string
  label: string
  icon: string
  color?: string
  permission?: string
  confirm?: boolean
  confirmMessage?: string
}

interface Props {
  selectedCount: number
  totalCount: number
  allSelected?: boolean
  actions?: BulkAction[]
  showSelectAll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  allSelected: false,
  showSelectAll: true,
  actions: () => [
    { id: 'email', label: 'Send Email', icon: 'mdi-email-outline', color: 'primary' },
    { id: 'status', label: 'Change Status', icon: 'mdi-swap-horizontal', color: 'info' },
    { id: 'export', label: 'Export Selected', icon: 'mdi-download', color: 'success' },
    { id: 'delete', label: 'Delete', icon: 'mdi-delete-outline', color: 'error', confirm: true, confirmMessage: 'Are you sure you want to delete the selected items?' }
  ]
})

const emit = defineEmits<{
  (e: 'action', action: string): void
  (e: 'select-all'): void
  (e: 'clear-selection'): void
}>()

const { can } = usePermissions()

// Confirmation dialog
const confirmDialog = ref(false)
const pendingAction = ref<BulkAction | null>(null)

// Filter actions based on permissions
const availableActions = computed(() => {
  return props.actions.filter(action => {
    if (!action.permission) return true
    return can(action.permission)
  })
})

function handleAction(action: BulkAction) {
  if (action.confirm) {
    pendingAction.value = action
    confirmDialog.value = true
  } else {
    emit('action', action.id)
  }
}

function confirmAction() {
  if (pendingAction.value) {
    emit('action', pendingAction.value.id)
  }
  confirmDialog.value = false
  pendingAction.value = null
}

function cancelAction() {
  confirmDialog.value = false
  pendingAction.value = null
}
</script>

<template>
  <v-slide-y-transition>
    <v-toolbar
      v-if="selectedCount > 0"
      color="primary"
      dark
      density="compact"
      class="bulk-actions-toolbar rounded-lg mb-4"
    >
      <!-- Selection info -->
      <v-toolbar-title class="text-body-2">
        <v-icon start size="small">mdi-checkbox-marked</v-icon>
        <span class="font-weight-bold">{{ selectedCount }}</span>
        {{ selectedCount === 1 ? 'item' : 'items' }} selected
        <span v-if="!allSelected && showSelectAll" class="text-caption opacity-80">
          of {{ totalCount }}
        </span>
      </v-toolbar-title>
      
      <!-- Select All button -->
      <v-btn
        v-if="showSelectAll && !allSelected && selectedCount < totalCount"
        variant="text"
        size="small"
        class="ml-2"
        @click="emit('select-all')"
      >
        Select all {{ totalCount }}
      </v-btn>
      
      <v-spacer />
      
      <!-- Action buttons -->
      <div class="d-flex gap-1">
        <v-tooltip
          v-for="action in availableActions"
          :key="action.id"
          :text="action.label"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              :icon="action.icon"
              variant="text"
              size="small"
              @click="handleAction(action)"
            />
          </template>
        </v-tooltip>
        
        <v-divider vertical class="mx-1" />
        
        <!-- Clear selection -->
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="emit('clear-selection')"
        />
      </div>
    </v-toolbar>
  </v-slide-y-transition>
  
  <!-- Confirmation Dialog -->
  <v-dialog v-model="confirmDialog" max-width="400">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon :color="pendingAction?.color" class="mr-2">{{ pendingAction?.icon }}</v-icon>
        {{ pendingAction?.label }}
      </v-card-title>
      <v-card-text>
        {{ pendingAction?.confirmMessage || `Are you sure you want to ${pendingAction?.label?.toLowerCase()}?` }}
        <div class="mt-2 text-body-2 text-medium-emphasis">
          This will affect <strong>{{ selectedCount }}</strong> {{ selectedCount === 1 ? 'item' : 'items' }}.
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancelAction">Cancel</v-btn>
        <v-btn :color="pendingAction?.color || 'primary'" variant="flat" @click="confirmAction">
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.bulk-actions-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
