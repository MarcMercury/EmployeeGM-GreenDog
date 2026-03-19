<script setup lang="ts">
/**
 * IntakeFileUpload - File upload component for intake forms
 * Supports resume, cover letter, certifications, and other documents
 */

const props = defineProps<{
  modelValue?: string
  label?: string
  type?: 'resume' | 'cover_letter' | 'certification' | 'other'
  token?: string
  personId?: string
  required?: boolean
  accept?: string
  maxSize?: number // in bytes
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'uploaded', data: { url: string; path: string; filename: string }): void
  (e: 'error', error: string): void
}>()

const uploading = ref(false)
const progress = ref(0)
const uploadedFile = ref<{ url: string; filename: string; size: number } | null>(null)
const errorMessage = ref('')

const fileInputRef = ref<HTMLInputElement>()

const acceptTypes = computed(() => {
  return props.accept || '.pdf,.doc,.docx,.jpg,.jpeg,.png'
})

const maxSizeFormatted = computed(() => {
  const bytes = props.maxSize || 10 * 1024 * 1024
  return `${Math.round(bytes / (1024 * 1024))}MB`
})

const displayLabel = computed(() => {
  if (props.label) return props.label
  switch (props.type) {
    case 'resume': return 'Resume / CV'
    case 'cover_letter': return 'Cover Letter'
    case 'certification': return 'Certification'
    default: return 'Document'
  }
})

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  errorMessage.value = ''
  
  // Validate file size
  const maxSize = props.maxSize || 10 * 1024 * 1024
  if (file.size > maxSize) {
    errorMessage.value = `File too large. Maximum size: ${maxSizeFormatted.value}`
    emit('error', errorMessage.value)
    return
  }
  
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'File type not allowed. Please upload PDF, DOC, DOCX, JPEG, or PNG.'
    emit('error', errorMessage.value)
    return
  }
  
  await uploadFile(file)
}

async function uploadFile(file: File) {
  uploading.value = true
  progress.value = 0
  errorMessage.value = ''
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // Build query params
    const params = new URLSearchParams()
    if (props.token) params.append('token', props.token)
    if (props.type) params.append('type', props.type)
    if (props.personId) params.append('personId', props.personId)
    
    const queryString = params.toString()
    const url = `/api/intake/upload${queryString ? `?${queryString}` : ''}`
    
    // Use XMLHttpRequest for progress tracking
    const result = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          progress.value = Math.round((e.loaded / e.total) * 100)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.statusMessage || error.message || 'Upload failed'))
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })
      
      xhr.open('POST', url)
      xhr.send(formData)
    })
    
    if (result.success && result.data) {
      uploadedFile.value = {
        url: result.data.url,
        filename: result.data.filename || file.name,
        size: result.data.size
      }
      
      emit('update:modelValue', result.data.url)
      emit('uploaded', {
        url: result.data.url,
        path: result.data.path,
        filename: result.data.filename || file.name
      })
    }
  } catch (err: any) {
    errorMessage.value = err.message || 'Failed to upload file'
    emit('error', errorMessage.value)
  } finally {
    uploading.value = false
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

function removeFile() {
  uploadedFile.value = null
  emit('update:modelValue', '')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

// Initialize with existing value
onMounted(() => {
  if (props.modelValue) {
    const filename = props.modelValue.split('/').pop() || 'Uploaded file'
    uploadedFile.value = {
      url: props.modelValue,
      filename,
      size: 0
    }
  }
})
</script>

<template>
  <div class="intake-file-upload">
    <label v-if="displayLabel" class="block text-sm font-medium text-gray-700 mb-1">
      {{ displayLabel }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      :accept="acceptTypes"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <!-- Upload area -->
    <div
      v-if="!uploadedFile && !uploading"
      class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer"
      @click="triggerFileInput"
      @dragover.prevent
      @drop.prevent="(e) => e.dataTransfer?.files[0] && uploadFile(e.dataTransfer.files[0])"
    >
      <div class="text-gray-500">
        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="mt-2 text-sm">
          <span class="font-medium text-green-600 hover:text-green-500">Click to upload</span>
          or drag and drop
        </p>
        <p class="mt-1 text-xs text-gray-400">
          PDF, DOC, DOCX, JPEG, PNG up to {{ maxSizeFormatted }}
        </p>
      </div>
    </div>
    
    <!-- Uploading state -->
    <div v-if="uploading" class="border border-gray-200 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
        <span class="text-sm text-gray-600">Uploading... {{ progress }}%</span>
      </div>
      <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-green-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
    </div>
    
    <!-- Uploaded file display -->
    <div v-if="uploadedFile && !uploading" class="border border-green-200 bg-green-50 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-100 rounded">
            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 truncate max-w-xs">
              {{ uploadedFile.filename }}
            </p>
            <p v-if="uploadedFile.size" class="text-xs text-gray-500">
              {{ formatFileSize(uploadedFile.size) }}
            </p>
          </div>
        </div>
        <button
          type="button"
          class="text-gray-400 hover:text-red-500 transition-colors"
          @click="removeFile"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Error message -->
    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">
      {{ errorMessage }}
    </p>
  </div>
</template>
