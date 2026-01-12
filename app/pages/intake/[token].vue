<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mx-auto" />
        <p class="mt-4 text-gray-600">Loading form...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen px-4">
      <UCard class="max-w-md w-full">
        <template #header>
          <div class="text-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-red-500 mx-auto" />
            <h1 class="mt-4 text-2xl font-bold text-gray-900">Link Error</h1>
          </div>
        </template>
        <p class="text-center text-gray-600">{{ error }}</p>
        <template #footer>
          <div class="text-center">
            <UButton to="/" variant="soft">Return Home</UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Success State -->
    <div v-else-if="submitted" class="flex items-center justify-center min-h-screen px-4">
      <UCard class="max-w-md w-full">
        <template #header>
          <div class="text-center">
            <UIcon name="i-heroicons-check-circle" class="w-16 h-16 text-green-500 mx-auto" />
            <h1 class="mt-4 text-2xl font-bold text-gray-900">Submitted!</h1>
          </div>
        </template>
        <p class="text-center text-gray-600">{{ successMessage }}</p>
        <template #footer>
          <div class="text-center">
            <p class="text-sm text-gray-500">You may close this page.</p>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Form -->
    <div v-else-if="formConfig" class="max-w-3xl mx-auto py-12 px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 mb-4">
          <span class="text-4xl">🐕</span>
          <span class="text-2xl font-bold text-green-600">Green Dog</span>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">{{ formConfig.form.title }}</h1>
        <p class="mt-2 text-gray-600">{{ formConfig.form.description }}</p>
        
        <!-- Target info -->
        <div v-if="formConfig.target?.position" class="mt-4 p-4 bg-primary-50 rounded-lg">
          <p class="font-medium text-primary-800">{{ formConfig.target.position.title }}</p>
          <p v-if="formConfig.target.location" class="text-sm text-primary-600">
            {{ formConfig.target.location.name }}, {{ formConfig.target.location.state }}
          </p>
        </div>
      </div>

      <!-- Form Sections -->
      <form @submit.prevent="handleSubmit" class="space-y-8">
        <UCard 
          v-for="(section, sIndex) in formConfig.form.sections" 
          :key="sIndex"
        >
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900">{{ section.title }}</h2>
            <p v-if="section.description" class="mt-1 text-sm text-gray-500">{{ section.description }}</p>
          </template>

          <!-- Regular fields -->
          <div 
            v-if="!section.isRepeatable" 
            class="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div 
              v-for="field in section.fields"
              :key="field.name"
              :class="{ 'md:col-span-2': field.type === 'textarea' }"
            >
              <IntakeFormField 
                v-model="formData[field.name]"
                :field="field"
                :prefill="formConfig.prefill"
              />
            </div>
          </div>

          <!-- Repeatable fields -->
          <div v-else>
            <div 
              v-for="(item, itemIndex) in getRepeatableData(section.repeatKey!)"
              :key="itemIndex"
              class="border rounded-lg p-4 mb-4 relative"
            >
              <UButton
                v-if="itemIndex > 0"
                icon="i-heroicons-x-mark"
                size="xs"
                color="gray"
                variant="ghost"
                class="absolute top-2 right-2"
                @click="removeRepeatableItem(section.repeatKey!, itemIndex)"
              />
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  v-for="field in section.fields"
                  :key="`${itemIndex}-${field.name}`"
                  :class="{ 'md:col-span-2': field.type === 'textarea' }"
                >
                  <IntakeFormField 
                    v-model="item[field.name]"
                    :field="field"
                  />
                </div>
              </div>
            </div>
            <UButton
              v-if="!section.maxItems || getRepeatableData(section.repeatKey!).length < section.maxItems"
              icon="i-heroicons-plus"
              variant="soft"
              size="sm"
              @click="addRepeatableItem(section.repeatKey!, section.fields)"
            >
              Add {{ section.title.replace(/s$/, '') }}
            </UButton>
          </div>
        </UCard>

        <!-- Resume Upload (for job applications) -->
        <UCard v-if="formConfig.linkType === 'job_application'">
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900">Resume / CV</h2>
            <p class="mt-1 text-sm text-gray-500">Upload your resume or CV</p>
          </template>
          <IntakeFileUpload
            v-model="formData.resume_url"
            type="resume"
            :token="token"
            required
            @uploaded="handleResumeUpload"
            @error="handleUploadError"
          />
        </UCard>

        <!-- Consent -->
        <UCard>
          <div class="space-y-4">
            <UCheckbox
              v-model="consent.privacy"
              label="I agree to the privacy policy and consent to have my data processed"
              required
            />
            <UCheckbox
              v-model="consent.contact"
              label="I consent to be contacted regarding this submission"
              required
            />
          </div>
        </UCard>

        <!-- Submit -->
        <div class="flex justify-end">
          <UButton 
            type="submit" 
            size="lg"
            :loading="submitting"
            :disabled="!consent.privacy || !consent.contact"
          >
            Submit Application
          </UButton>
        </div>
      </form>

      <!-- Expiration Notice -->
      <p class="mt-8 text-center text-sm text-gray-500">
        This link expires on {{ formatDate(formConfig.expiresAt) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'public',
  middleware: [],
  auth: false
})

interface FormField {
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

interface FormSection {
  title: string
  description?: string
  fields: FormField[]
  isRepeatable?: boolean
  repeatKey?: string
  maxItems?: number
}

interface FormConfig {
  token: string
  linkType: string
  expiresAt: string
  form: {
    title: string
    description: string
    sections: FormSection[]
  }
  prefill: {
    email?: string
    first_name?: string
    last_name?: string
  }
  target?: {
    position?: { id: string; title: string }
    department?: { id: string; name: string }
    location?: { id: string; name: string; state: string }
  }
}

const route = useRoute()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref<string | null>(null)
const formConfig = ref<FormConfig | null>(null)
const formData = ref<Record<string, unknown>>({})
const repeatableData = ref<Record<string, Record<string, unknown>[]>>({})
const consent = ref({
  privacy: false,
  contact: false
})
const submitting = ref(false)
const submitted = ref(false)
const successMessage = ref('')

// Fetch form configuration
async function loadForm() {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{ success: boolean; data: FormConfig }>(`/api/intake/form/${token.value}`)
    
    if (response.success && response.data) {
      formConfig.value = response.data
      
      // Initialize form data with prefill values
      if (response.data.prefill) {
        if (response.data.prefill.email) formData.value.email = response.data.prefill.email
        if (response.data.prefill.first_name) formData.value.first_name = response.data.prefill.first_name
        if (response.data.prefill.last_name) formData.value.last_name = response.data.prefill.last_name
      }

      // Initialize repeatable sections
      for (const section of response.data.form.sections) {
        if (section.isRepeatable && section.repeatKey) {
          repeatableData.value[section.repeatKey] = [createEmptyItem(section.fields)]
        }
      }
    }
  } catch (err) {
    console.error('Error loading form:', err)
    error.value = err instanceof Error && 'data' in err 
      ? (err as any).data?.message || 'Failed to load form'
      : 'This link is invalid or has expired'
  } finally {
    loading.value = false
  }
}

// Handle form submission
async function handleSubmit() {
  if (submitting.value) return
  
  submitting.value = true

  try {
    // Combine regular form data with repeatable data
    const submitData = {
      ...formData.value,
      ...repeatableData.value
    }

    const response = await $fetch<{ success: boolean; message: string }>(`/api/intake/form/${token.value}`, {
      method: 'POST',
      body: submitData
    })

    if (response.success) {
      submitted.value = true
      successMessage.value = response.message
    }
  } catch (err) {
    console.error('Submission error:', err)
    const message = err instanceof Error && 'data' in err 
      ? (err as any).data?.message 
      : 'Failed to submit form'
    useToast().add({
      title: 'Error',
      description: message,
      color: 'red'
    })
  } finally {
    submitting.value = false
  }
}

// File upload handlers
function handleResumeUpload(data: { url: string; path: string; filename: string }) {
  formData.value.resume_url = data.url
  useToast().add({
    title: 'Resume Uploaded',
    description: `${data.filename} uploaded successfully`,
    color: 'green'
  })
}

function handleUploadError(errorMsg: string) {
  useToast().add({
    title: 'Upload Error',
    description: errorMsg,
    color: 'red'
  })
}

// Repeatable field helpers
function getRepeatableData(key: string) {
  if (!repeatableData.value[key]) {
    repeatableData.value[key] = []
  }
  return repeatableData.value[key]
}

function createEmptyItem(fields: FormField[]): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const field of fields) {
    item[field.name] = field.type === 'checkbox' ? false : ''
  }
  return item
}

function addRepeatableItem(key: string, fields: FormField[]) {
  if (!repeatableData.value[key]) {
    repeatableData.value[key] = []
  }
  repeatableData.value[key].push(createEmptyItem(fields))
}

function removeRepeatableItem(key: string, index: number) {
  if (repeatableData.value[key]) {
    repeatableData.value[key].splice(index, 1)
  }
}

// Format date for display
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load form on mount
onMounted(() => {
  loadForm()
})
</script>
