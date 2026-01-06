/**
 * useInlineEdit Composable
 * 
 * Provides inline editing functionality for table cells
 * Click-to-edit for common fields like phone, status, notes
 * 
 * SYNC BEHAVIOR:
 * When editing 'employees' table fields that are shared with 'profiles', 
 * updates are automatically synced to both tables via useEmployeeSync.
 * 
 * Usage:
 * const { editingCell, startEdit, saveEdit, cancelEdit, isEditing } = useInlineEdit()
 * 
 * In template:
 * <td @dblclick="startEdit(item.id, 'phone', item.phone)">
 *   <template v-if="isEditing(item.id, 'phone')">
 *     <v-text-field v-model="editingCell.value" @keyup.enter="saveEdit" @blur="saveEdit" />
 *   </template>
 *   <template v-else>{{ item.phone }}</template>
 * </td>
 */

// Fields that should be synced between employees and profiles
const SYNCED_EMPLOYEE_FIELDS = ['first_name', 'last_name', 'email_work', 'phone_mobile', 'slack_avatar_url']
const SYNCED_PROFILE_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'avatar_url']

interface EditingCell {
  itemId: string | number | null
  field: string | null
  value: any
  originalValue: any
}

interface SaveOptions {
  table: string
  idField?: string
}

export function useInlineEdit(options?: SaveOptions) {
  const client = useSupabaseClient()
  const toast = useToast()
  const { updateEmployee, updateProfile } = useEmployeeSync()
  
  // Current editing state
  const editingCell = ref<EditingCell>({
    itemId: null,
    field: null,
    value: null,
    originalValue: null
  })
  
  const isSaving = ref(false)
  const pendingSave = ref(false)
  
  // Start editing a cell
  function startEdit(itemId: string | number, field: string, currentValue: any) {
    // Save any pending edit first
    if (editingCell.value.itemId !== null && hasChanges.value) {
      saveEdit()
    }
    
    editingCell.value = {
      itemId,
      field,
      value: currentValue,
      originalValue: currentValue
    }
  }
  
  // Check if a specific cell is being edited
  function isEditing(itemId: string | number, field: string): boolean {
    return editingCell.value.itemId === itemId && editingCell.value.field === field
  }
  
  // Check if there are unsaved changes
  const hasChanges = computed(() => {
    return editingCell.value.value !== editingCell.value.originalValue
  })
  
  // Cancel editing
  function cancelEdit() {
    editingCell.value = {
      itemId: null,
      field: null,
      value: null,
      originalValue: null
    }
  }
  
  // Save the edit to database
  async function saveEdit(customHandler?: (itemId: string | number, field: string, value: any) => Promise<boolean>) {
    if (!editingCell.value.itemId || !editingCell.value.field) {
      cancelEdit()
      return true
    }
    
    // No changes, just close
    if (!hasChanges.value) {
      cancelEdit()
      return true
    }
    
    isSaving.value = true
    
    try {
      // Use custom handler if provided
      if (customHandler) {
        const success = await customHandler(
          editingCell.value.itemId,
          editingCell.value.field,
          editingCell.value.value
        )
        
        if (success) {
          toast.success('Updated successfully')
          cancelEdit()
          return true
        } else {
          toast.error('Failed to update')
          return false
        }
      }
      
      // Default: use options to save to Supabase
      if (options?.table) {
        const idField = options.idField || 'id'
        const fieldName = editingCell.value.field
        const fieldValue = editingCell.value.value
        const itemId = String(editingCell.value.itemId)
        
        // Check if this is a synced field that needs cross-table updates
        if (options.table === 'employees' && SYNCED_EMPLOYEE_FIELDS.includes(fieldName)) {
          // Use sync composable for employees
          const result = await updateEmployee(itemId, { [fieldName]: fieldValue })
          if (!result.success) throw new Error(result.error)
          
          toast.success(`Updated successfully (synced to ${result.updatedTables.length} tables)`)
          cancelEdit()
          return true
        } else if (options.table === 'profiles' && SYNCED_PROFILE_FIELDS.includes(fieldName)) {
          // Use sync composable for profiles
          const result = await updateProfile(itemId, { [fieldName]: fieldValue } as any)
          if (!result.success) throw new Error(result.error)
          
          toast.success(`Updated successfully (synced to ${result.updatedTables.length} tables)`)
          cancelEdit()
          return true
        }
        
        // Standard single-table update for non-synced fields
        const { error } = await client
          .from(options.table)
          .update({ 
            [fieldName]: fieldValue,
            updated_at: new Date().toISOString()
          })
          .eq(idField, editingCell.value.itemId)
        
        if (error) throw error
        
        toast.success('Updated successfully')
        cancelEdit()
        return true
      }
      
      // No handler and no options - just cancel
      cancelEdit()
      return true
      
    } catch (err: any) {
      console.error('[InlineEdit] Save error:', err)
      toast.error(err.message || 'Failed to save')
      return false
    } finally {
      isSaving.value = false
    }
  }
  
  // Handle keyboard navigation
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancelEdit()
    } else if (event.key === 'Enter' && !event.shiftKey) {
      saveEdit()
    }
  }
  
  // Validation helpers
  function validatePhone(value: string): boolean {
    const cleaned = value.replace(/\D/g, '')
    return cleaned.length >= 10
  }
  
  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }
  
  function formatPhone(value: string): string {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return value
  }
  
  return {
    // State
    editingCell,
    isSaving,
    hasChanges,
    
    // Methods
    startEdit,
    isEditing,
    saveEdit,
    cancelEdit,
    handleKeydown,
    
    // Validators
    validatePhone,
    validateEmail,
    formatPhone
  }
}
