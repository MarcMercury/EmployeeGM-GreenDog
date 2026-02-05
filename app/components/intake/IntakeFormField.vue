<template>
  <div class="w-full">
    <!-- Text Input -->
    <UFormGroup v-if="isTextType" :label="field.label" :required="field.required">
      <UInput
        :model-value="modelValue as string"
        :type="field.type"
        :placeholder="placeholder"
        :required="field.required"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Textarea -->
    <UFormGroup v-else-if="field.type === 'textarea'" :label="field.label" :required="field.required">
      <UTextarea
        :model-value="modelValue as string"
        :placeholder="placeholder"
        :required="field.required"
        rows="4"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Select -->
    <UFormGroup v-else-if="field.type === 'select'" :label="field.label" :required="field.required">
      <USelect
        :model-value="modelValue as string"
        :options="selectOptions"
        :placeholder="`Select ${field.label}`"
        :required="field.required"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Multi-select -->
    <UFormGroup v-else-if="field.type === 'multiselect'" :label="field.label" :required="field.required">
      <USelectMenu
        :model-value="(modelValue as string[]) || []"
        :options="field.options || []"
        multiple
        :placeholder="`Select ${field.label}`"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Checkbox -->
    <UCheckbox
      v-else-if="field.type === 'checkbox'"
      :model-value="modelValue as boolean"
      :label="field.label"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <!-- File Upload -->
    <UFormGroup v-else-if="field.type === 'file'" :label="field.label" :required="field.required">
      <div class="flex items-center gap-4">
        <input
          type="file"
          :accept="field.accept"
          :required="field.required && !modelValue"
          class="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-primary-50 file:text-primary-700
            hover:file:bg-primary-100"
          @change="handleFileUpload"
        />
        <span v-if="modelValue" class="text-sm text-green-600">
          <UIcon name="i-heroicons-check-circle" class="w-4 h-4 inline" />
          Uploaded
        </span>
      </div>
      <p class="mt-1 text-xs text-gray-500">
        {{ field.accept?.replace(/\./g, '').toUpperCase() || 'PDF, DOC, DOCX' }} accepted
      </p>
    </UFormGroup>

    <!-- Date -->
    <UFormGroup v-else-if="field.type === 'date'" :label="field.label" :required="field.required">
      <UInput
        :model-value="modelValue as string"
        type="date"
        :required="field.required"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Month picker -->
    <UFormGroup v-else-if="field.type === 'month'" :label="field.label" :required="field.required">
      <UInput
        :model-value="modelValue as string"
        type="month"
        :required="field.required"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>

    <!-- Number -->
    <UFormGroup v-else-if="field.type === 'number'" :label="field.label" :required="field.required">
      <UInput
        :model-value="modelValue as number"
        type="number"
        :step="field.step"
        :min="field.min"
        :max="field.max"
        :required="field.required"
        @update:model-value="emit('update:modelValue', parseFloat($event as string))"
      />
    </UFormGroup>

    <!-- Default: Text -->
    <UFormGroup v-else :label="field.label" :required="field.required">
      <UInput
        :model-value="modelValue as string"
        type="text"
        :placeholder="placeholder"
        :required="field.required"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </UFormGroup>
  </div>
</template>

<script setup lang="ts">
interface FormField {
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
  accept?: string
  step?: string
  min?: number
  max?: number
}

interface Props {
  field: FormField
  modelValue?: unknown
  prefill?: {
    email?: string
    first_name?: string
    last_name?: string
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

// Determine if this is a text-type input
const isTextType = computed(() => {
  return ['text', 'email', 'tel', 'url', 'password'].includes(props.field.type)
})

// Generate placeholder based on field type and prefill
const placeholder = computed(() => {
  if (props.prefill) {
    if (props.field.name === 'email' && props.prefill.email) {
      return props.prefill.email
    }
    if (props.field.name === 'first_name' && props.prefill.first_name) {
      return props.prefill.first_name
    }
    if (props.field.name === 'last_name' && props.prefill.last_name) {
      return props.prefill.last_name
    }
  }
  return `Enter ${props.field.label.toLowerCase()}`
})

// Convert options array to select format
const selectOptions = computed(() => {
  return (props.field.options || []).map(opt => ({
    label: opt,
    value: opt
  }))
})

// Handle file upload
async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  // Upload to Supabase Storage
  try {
    const supabase = useSupabaseClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `intake/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('intake-uploads')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Upload error:', error)
      // Fallback to file info if storage bucket doesn't exist
      emit('update:modelValue', JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        error: 'Storage bucket not configured'
      }))
      return
    }
    
    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('intake-uploads')
      .getPublicUrl(data.path)
    
    emit('update:modelValue', JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      path: data.path,
      url: urlData.publicUrl,
      uploadedAt: new Date().toISOString()
    }))
  } catch (err) {
    console.error('Failed to upload file:', err)
    // Fallback to file info
    emit('update:modelValue', JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    }))
  }
}
</script>
