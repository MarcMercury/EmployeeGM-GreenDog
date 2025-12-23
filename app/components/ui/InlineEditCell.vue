<script setup lang="ts">
/**
 * InlineEditCell Component
 * 
 * Click-to-edit table cell with support for different field types
 * Double-click to edit, Enter/blur to save, Escape to cancel
 */

type FieldType = 'text' | 'phone' | 'email' | 'select' | 'number' | 'textarea' | 'date'

interface SelectOption {
  value: string | number
  title: string
  color?: string
}

interface Props {
  modelValue: any
  type?: FieldType
  options?: SelectOption[]
  placeholder?: string
  editable?: boolean
  required?: boolean
  maxLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  editable: true,
  required: false,
  maxLength: 255
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'save', value: any): void
  (e: 'cancel'): void
}>()

const isEditing = ref(false)
const editValue = ref<any>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const hasError = ref(false)
const errorMessage = ref('')

// Display value formatting
const displayValue = computed(() => {
  const val = props.modelValue
  if (val === null || val === undefined || val === '') {
    return props.placeholder || '—'
  }
  
  if (props.type === 'phone') {
    return formatPhone(String(val))
  }
  
  if (props.type === 'select' && props.options) {
    const option = props.options.find(o => o.value === val)
    return option?.title || val
  }
  
  if (props.type === 'date' && val) {
    return new Date(val).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  return val
})

// Get color for select option
const displayColor = computed(() => {
  if (props.type === 'select' && props.options) {
    const option = props.options.find(o => o.value === props.modelValue)
    return option?.color
  }
  return undefined
})

// Phone formatting
function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return value
}

// Start editing
function startEdit() {
  if (!props.editable) return
  
  isEditing.value = true
  editValue.value = props.modelValue
  hasError.value = false
  errorMessage.value = ''
  
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

// Validate input
function validate(): boolean {
  hasError.value = false
  errorMessage.value = ''
  
  if (props.required && !editValue.value) {
    hasError.value = true
    errorMessage.value = 'This field is required'
    return false
  }
  
  if (props.type === 'email' && editValue.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(editValue.value)) {
      hasError.value = true
      errorMessage.value = 'Invalid email address'
      return false
    }
  }
  
  if (props.type === 'phone' && editValue.value) {
    const cleaned = editValue.value.replace(/\D/g, '')
    if (cleaned.length < 10) {
      hasError.value = true
      errorMessage.value = 'Phone number must be at least 10 digits'
      return false
    }
  }
  
  return true
}

// Save changes
function save() {
  if (!validate()) return
  
  const newValue = props.type === 'phone' 
    ? editValue.value?.replace(/\D/g, '') 
    : editValue.value
  
  isEditing.value = false
  emit('update:modelValue', newValue)
  emit('save', newValue)
}

// Cancel editing
function cancel() {
  isEditing.value = false
  editValue.value = null
  hasError.value = false
  emit('cancel')
}

// Handle keyboard
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && props.type !== 'textarea') {
    event.preventDefault()
    save()
  } else if (event.key === 'Escape') {
    cancel()
  }
}

// Handle blur - save on blur
function handleBlur() {
  // Small delay to allow click on other elements
  setTimeout(() => {
    if (isEditing.value) {
      save()
    }
  }, 150)
}
</script>

<template>
  <div class="inline-edit-cell" :class="{ 'is-editing': isEditing, 'is-editable': editable }">
    <!-- Display Mode -->
    <div
      v-if="!isEditing"
      class="display-value"
      :class="{ 'text-medium-emphasis': !modelValue }"
      @dblclick="startEdit"
    >
      <v-chip
        v-if="type === 'select' && modelValue && displayColor"
        :color="displayColor"
        size="x-small"
        variant="tonal"
      >
        {{ displayValue }}
      </v-chip>
      <template v-else>
        {{ displayValue }}
      </template>
      
      <v-icon
        v-if="editable"
        size="x-small"
        class="edit-icon ml-1"
        @click.stop="startEdit"
      >
        mdi-pencil
      </v-icon>
    </div>
    
    <!-- Edit Mode -->
    <template v-if="isEditing">
      <!-- Text/Phone/Email/Number -->
      <v-text-field
        v-if="['text', 'phone', 'email', 'number'].includes(type)"
        ref="inputRef"
        v-model="editValue"
        :type="type === 'number' ? 'number' : 'text'"
        :error="hasError"
        :error-messages="errorMessage"
        variant="outlined"
        density="compact"
        hide-details="auto"
        :maxlength="maxLength"
        class="edit-input"
        @keydown="handleKeydown"
        @blur="handleBlur"
      >
        <template #append-inner>
          <v-icon size="small" color="success" class="cursor-pointer" @mousedown.prevent="save">
            mdi-check
          </v-icon>
          <v-icon size="small" color="error" class="cursor-pointer ml-1" @mousedown.prevent="cancel">
            mdi-close
          </v-icon>
        </template>
      </v-text-field>
      
      <!-- Select -->
      <v-select
        v-else-if="type === 'select'"
        ref="inputRef"
        v-model="editValue"
        :items="options"
        item-title="title"
        item-value="value"
        variant="outlined"
        density="compact"
        hide-details
        class="edit-input"
        @update:model-value="save"
        @blur="handleBlur"
      />
      
      <!-- Textarea -->
      <v-textarea
        v-else-if="type === 'textarea'"
        ref="inputRef"
        v-model="editValue"
        variant="outlined"
        density="compact"
        rows="2"
        hide-details="auto"
        :error="hasError"
        :maxlength="maxLength"
        class="edit-input"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      
      <!-- Date -->
      <v-text-field
        v-else-if="type === 'date'"
        ref="inputRef"
        v-model="editValue"
        type="date"
        variant="outlined"
        density="compact"
        hide-details
        class="edit-input"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
    </template>
  </div>
</template>

<style scoped>
.inline-edit-cell {
  position: relative;
  min-height: 32px;
  display: flex;
  align-items: center;
}

.display-value {
  display: flex;
  align-items: center;
  padding: 4px 0;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.is-editable .display-value {
  cursor: pointer;
}

.is-editable .display-value:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
}

.is-editable:hover .edit-icon {
  opacity: 0.5;
}

.edit-icon:hover {
  opacity: 1 !important;
}

.edit-input {
  min-width: 150px;
  max-width: 250px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
