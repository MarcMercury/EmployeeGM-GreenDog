<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-primary">
        <v-icon class="mr-3" color="white">mdi-upload</v-icon>
        <div class="text-white">
          <div class="font-weight-bold">Upload Candidates</div>
          <div class="text-caption">Bulk import from Indeed CSV or upload individual resume</div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="close" :disabled="uploading" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0" style="max-height: 70vh; overflow-y: auto;">
        <v-stepper v-model="step" flat>
          <v-stepper-header class="elevation-0 border-b">
            <v-stepper-item :value="1" :complete="step > 1" title="Upload Type" />
            <v-divider />
            <v-stepper-item :value="2" :complete="step > 2" title="Upload File" />
            <v-divider />
            <v-stepper-item :value="3" :complete="step > 3" title="Duplicates" />
            <v-divider />
            <v-stepper-item :value="4" :complete="step > 4" title="Review" />
            <v-divider />
            <v-stepper-item :value="5" title="Upload to CRM" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Choose Upload Type -->
            <v-stepper-window-item :value="1">
              <div class="pa-6">
                <h3 class="text-h6 mb-4">What would you like to upload?</h3>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-card
                      :color="uploadType === 'bulk' ? 'primary' : undefined"
                      :variant="uploadType === 'bulk' ? 'elevated' : 'outlined'"
                      class="pa-4 cursor-pointer h-100"
                      @click="uploadType = 'bulk'"
                    >
                      <div class="d-flex align-center mb-3">
                        <v-icon :color="uploadType === 'bulk' ? 'white' : 'primary'" size="40">mdi-file-table</v-icon>
                        <v-radio
                          v-model="uploadType"
                          value="bulk"
                          class="ml-auto"
                          :color="uploadType === 'bulk' ? 'white' : 'primary'"
                        />
                      </div>
                      <h4 :class="uploadType === 'bulk' ? 'text-white' : 'text-h6'" class="mb-2">Bulk Upload (CSV)</h4>
                      <p :class="uploadType === 'bulk' ? 'text-white-darken-1' : 'text-grey-darken-1'" class="text-body-2 mb-0">
                        Import multiple candidates from an Indeed.com export or similar CSV file.
                      </p>
                    </v-card>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-card
                      :color="uploadType === 'single' ? 'primary' : undefined"
                      :variant="uploadType === 'single' ? 'elevated' : 'outlined'"
                      class="pa-4 cursor-pointer h-100"
                      @click="uploadType = 'single'"
                    >
                      <div class="d-flex align-center mb-3">
                        <v-icon :color="uploadType === 'single' ? 'white' : 'primary'" size="40">mdi-file-document</v-icon>
                        <v-radio
                          v-model="uploadType"
                          value="single"
                          class="ml-auto"
                          :color="uploadType === 'single' ? 'white' : 'primary'"
                        />
                      </div>
                      <h4 :class="uploadType === 'single' ? 'text-white' : 'text-h6'" class="mb-2">Single Resume</h4>
                      <p :class="uploadType === 'single' ? 'text-white-darken-1' : 'text-grey-darken-1'" class="text-body-2 mb-0">
                        Upload an individual resume (PDF, DOC, DOCX) and use AI to extract candidate info.
                      </p>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
            </v-stepper-window-item>

            <!-- Step 2: Upload File -->
            <v-stepper-window-item :value="2">
              <div class="pa-6">
                <div v-if="uploadType === 'bulk'">
                  <h3 class="text-h6 mb-2">Upload Indeed CSV</h3>
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    Export your candidates from Indeed and upload the CSV file here.
                  </p>
                  
                  <v-file-input
                    v-model="csvFile"
                    accept=".csv"
                    label="Select CSV file"
                    prepend-icon="mdi-file-delimited"
                    variant="outlined"
                    :disabled="parsing"
                    show-size
                  />

                  <v-alert v-if="parseError" type="error" class="mt-4" closable @click:close="parseError = null">
                    {{ parseError }}
                  </v-alert>

                  <v-alert v-if="csvFile" type="info" variant="tonal" class="mt-4">
                    <strong>{{ csvFile?.name }}</strong> selected. Click "Import Candidates" to parse the file and review.
                  </v-alert>
                </div>

                <div v-else>
                  <h3 class="text-h6 mb-2">Upload Resume</h3>
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    Upload a resume file. AI will extract the candidate's information automatically.
                  </p>
                  
                  <v-file-input
                    v-model="resumeFile"
                    accept=".pdf,.doc,.docx"
                    label="Select resume file"
                    prepend-icon="mdi-file-document-outline"
                    variant="outlined"
                    :disabled="parsing"
                    show-size
                  />

                  <v-alert v-if="parseError" type="error" class="mt-4" closable @click:close="parseError = null">
                    {{ parseError }}
                  </v-alert>

                  <v-alert v-if="resumeFile && !parsedResume" type="info" variant="tonal" class="mt-4">
                    <strong>{{ resumeFile?.name }}</strong> selected. Click "Import Candidates" to parse the resume.
                  </v-alert>

                  <div v-if="parsedResume" class="mt-4">
                    <v-alert type="success" variant="tonal" class="mb-4">
                      Resume parsed successfully! Review the extracted information below.
                    </v-alert>
                    
                    <v-card variant="outlined" class="pa-4">
                      <v-row dense>
                        <v-col cols="6">
                          <div class="text-caption text-grey">Name</div>
                          <div class="font-weight-medium">{{ parsedResume.firstName }} {{ parsedResume.lastName }}</div>
                        </v-col>
                        <v-col cols="6">
                          <div class="text-caption text-grey">Email</div>
                          <div class="font-weight-medium">{{ parsedResume.email || 'Not found' }}</div>
                        </v-col>
                        <v-col cols="6">
                          <div class="text-caption text-grey">Phone</div>
                          <div class="font-weight-medium">{{ parsedResume.phone || 'Not found' }}</div>
                        </v-col>
                        <v-col cols="6">
                          <div class="text-caption text-grey">Experience</div>
                          <div class="font-weight-medium">{{ parsedResume.experienceYears || 0 }} years</div>
                        </v-col>
                      </v-row>
                    </v-card>
                  </div>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- Step 3: Duplicates Check -->
            <v-stepper-window-item :value="3">
              <div class="pa-6">
                <div v-if="uploadType === 'bulk'">
                  <h3 class="text-h6 mb-4">Duplicate Check Results</h3>
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    We've compared your upload against existing candidates in the recruiting pipeline.
                  </p>

                  <!-- Skipped (No Email) Section -->
                  <v-alert v-if="skippedNoEmailCount > 0" type="info" variant="tonal" class="mb-4">
                    <div class="d-flex align-center">
                      <v-icon start>mdi-account-remove</v-icon>
                      <div>
                        <strong>{{ skippedNoEmailCount }} records skipped</strong> - missing email address (required field)
                      </div>
                    </div>
                  </v-alert>

                  <!-- Summary Stats -->
                  <v-row class="mb-4">
                    <v-col cols="12" md="4">
                      <v-card variant="tonal" color="success" class="pa-4 text-center">
                        <v-icon size="32" class="mb-2">mdi-account-plus</v-icon>
                        <div class="text-h4 font-weight-bold">{{ newCandidatesCount }}</div>
                        <div class="text-body-2">New Candidates</div>
                      </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-card variant="tonal" color="warning" class="pa-4 text-center">
                        <v-icon size="32" class="mb-2">mdi-account-multiple-check</v-icon>
                        <div class="text-h4 font-weight-bold">{{ duplicateEmails.length }}</div>
                        <div class="text-body-2">Duplicates Found</div>
                      </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-card variant="tonal" color="grey" class="pa-4 text-center">
                        <v-icon size="32" class="mb-2">mdi-account-off</v-icon>
                        <div class="text-h4 font-weight-bold">{{ skippedNoEmailCount }}</div>
                        <div class="text-body-2">Skipped (No Email)</div>
                      </v-card>
                    </v-col>
                  </v-row>

                  <!-- Duplicates Detail Section -->
                  <div v-if="duplicateEmails.length > 0" class="mb-4">
                    <v-alert type="warning" variant="tonal" class="mb-4">
                      <div class="d-flex align-center">
                        <v-icon start size="large">mdi-account-multiple-check</v-icon>
                        <div>
                          <div class="font-weight-bold">{{ duplicateEmails.length }} Duplicate Candidates Found</div>
                          <div class="text-body-2">These emails already exist in your recruiting pipeline. They will be skipped during upload.</div>
                        </div>
                      </div>
                    </v-alert>
                    
                    <v-card variant="outlined">
                      <v-card-title class="text-subtitle-1 bg-warning-lighten-5">
                        <v-icon start color="warning">mdi-email-multiple</v-icon>
                        Duplicate Email Addresses
                      </v-card-title>
                      <v-card-text class="pa-0">
                        <v-list density="compact">
                          <v-list-item v-for="dup in duplicateCandidatesDetails.slice(0, 15)" :key="dup.email">
                            <template #prepend>
                              <v-icon color="warning" size="small">mdi-account</v-icon>
                            </template>
                            <v-list-item-title>
                              <span class="font-weight-medium">{{ dup.name }}</span>
                              <span class="text-grey-darken-1 ml-2">({{ dup.email }})</span>
                            </v-list-item-title>
                            <template #append>
                              <v-chip size="x-small" color="warning" variant="tonal">Already Exists</v-chip>
                            </template>
                          </v-list-item>
                          <v-list-item v-if="duplicateEmails.length > 15">
                            <v-list-item-title class="text-grey text-center">
                              ...and {{ duplicateEmails.length - 15 }} more duplicates
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-card-text>
                    </v-card>
                  </div>

                  <!-- No Duplicates Message -->
                  <v-alert v-else type="success" variant="tonal" class="mb-4">
                    <div class="d-flex align-center">
                      <v-icon start>mdi-check-circle</v-icon>
                      <div>
                        <strong>No duplicates found!</strong> All candidates are new and will be added to the pipeline.
                      </div>
                    </div>
                  </v-alert>

                  <!-- No Valid Candidates Warning -->
                  <v-alert v-if="newCandidatesCount === 0 && duplicateEmails.length === 0" type="error" class="mb-4">
                    <div class="d-flex align-center">
                      <v-icon start>mdi-alert</v-icon>
                      <div>
                        <strong>No valid candidates to upload.</strong> All records are either missing required fields (email, first name) or already exist in the system.
                      </div>
                    </div>
                  </v-alert>
                </div>

                <!-- For single resume - skip directly to review (step 4) -->
                <div v-else-if="parsedResume">
                  <v-alert type="info" variant="tonal">
                    <v-icon start>mdi-information</v-icon>
                    Single resume uploads skip the duplicates step. Click Next to review the candidate.
                  </v-alert>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- Step 4: Review -->
            <v-stepper-window-item :value="4">
              <div class="pa-6">
                <!-- Upload Error Alert -->
                <v-alert v-if="uploadError" type="error" class="mb-4" closable @click:close="uploadError = null">
                  {{ uploadError }}
                </v-alert>

                <div v-if="uploadType === 'bulk'">
                  <h3 class="text-h6 mb-2">New Candidates to Upload</h3>
                  <p class="text-body-2 text-grey-darken-1 mb-4">
                    Review the candidates below before uploading to your CRM.
                  </p>

                  <!-- Summary chips -->
                  <div class="d-flex align-center mb-4">
                    <v-chip class="mr-2" color="success" variant="tonal">
                      <v-icon start size="small">mdi-account-plus</v-icon>
                      {{ newCandidatesCount }} new candidates to add
                    </v-chip>
                    <v-chip v-if="duplicateEmails.length > 0" color="warning" variant="tonal">
                      <v-icon start size="small">mdi-account-multiple-check</v-icon>
                      {{ duplicateEmails.length }} duplicates skipped
                    </v-chip>
                  </div>
                  
                  <v-data-table
                    v-if="newCandidatesCount > 0"
                    :headers="previewHeaders"
                    :items="newCandidatesPreview"
                    :items-per-page="10"
                    density="compact"
                    class="elevation-0 border rounded"
                  >
                    <template #item.name="{ item }">
                      <span class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</span>
                    </template>
                    <template #item.status="{ item }">
                      <v-chip :color="getStatusColor(item.status)" size="x-small">
                        {{ item.status }}
                      </v-chip>
                    </template>
                    <template #item.location="{ item }">
                      {{ item.city }}<template v-if="item.state">, {{ item.state }}</template>
                    </template>
                    <template #bottom>
                      <div v-if="newCandidatesCount > 50" class="text-center pa-2 text-grey">
                        Showing first 50 of {{ newCandidatesCount }} new candidates
                      </div>
                    </template>
                  </v-data-table>

                  <v-card v-else variant="outlined" class="pa-4 text-center">
                    <v-icon color="warning" size="40" class="mb-2">mdi-alert</v-icon>
                    <p class="text-body-2 text-grey-darken-1 mb-0">
                      No new candidates to upload. All records are duplicates or missing required fields.
                    </p>
                  </v-card>
                </div>

                <div v-else-if="parsedResume">
                  <h3 class="text-h6 mb-4">Review Candidate Information</h3>
                  
                  <!-- Email required warning for resume upload -->
                  <v-alert v-if="!parsedResume.email" type="warning" class="mb-4">
                    <v-icon start>mdi-alert</v-icon>
                    Email is required. Please enter an email address below.
                  </v-alert>
                  
                  <v-card variant="outlined" class="pa-4">
                    <v-row>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.firstName"
                          label="First Name *"
                          :rules="[v => !!v || 'First name is required']"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.lastName"
                          label="Last Name"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.email"
                          label="Email *"
                          :rules="[v => !!v || 'Email is required', v => /.+@.+\..+/.test(v) || 'Must be a valid email']"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.phone"
                          label="Phone"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.city"
                          label="City"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          v-model="parsedResume.state"
                          label="State"
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                      <v-col cols="12">
                        <v-select
                          v-model="parsedResume.positionId"
                          :items="positionOptions"
                          label="Position Applied For"
                          variant="outlined"
                          density="compact"
                          clearable
                        />
                      </v-col>
                    </v-row>
                  </v-card>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- Step 5: Complete -->
            <v-stepper-window-item :value="5">
              <div class="pa-6 text-center">
                <v-icon color="success" size="80" class="mb-4">mdi-check-circle</v-icon>
                <h3 class="text-h5 mb-2">Upload Complete!</h3>
                <p class="text-body-1 text-grey-darken-1 mb-4">
                  <template v-if="uploadType === 'bulk'">
                    <strong>{{ uploadedCount }}</strong> new candidates added to the recruiting pipeline.
                    <span v-if="duplicateEmails.length > 0">
                      <br><span class="text-warning">{{ duplicateEmails.length }} duplicates were skipped.</span>
                    </span>
                  </template>
                  <template v-else>
                    <template v-if="mergedCount > 0">
                      Existing candidate record has been updated with new data.
                    </template>
                    <template v-else>
                      The candidate has been added to your recruiting pipeline.
                    </template>
                  </template>
                </p>
                <v-btn color="primary" @click="closeAndRefresh">
                  View Pipeline
                </v-btn>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4" v-if="step < 5">
        <v-btn
          v-if="step > 1"
          variant="text"
          @click="goBack"
          :disabled="uploading"
        >
          Back
        </v-btn>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
          :disabled="uploading"
        >
          Cancel
        </v-btn>
        <v-btn
          v-if="step === 1"
          color="primary"
          :disabled="!uploadType"
          @click="step = 2"
        >
          Next
        </v-btn>
        <v-btn
          v-else-if="step === 2"
          color="primary"
          :disabled="!canImport"
          :loading="parsing"
          @click="importCandidates"
        >
          <v-icon start>mdi-file-import</v-icon>
          Import & Check Duplicates
        </v-btn>
        <v-btn
          v-else-if="step === 3"
          color="primary"
          :disabled="!canProceedFromDuplicates"
          @click="proceedToReview"
        >
          <v-icon start>mdi-arrow-right</v-icon>
          Review Candidates
        </v-btn>
        <v-btn
          v-else-if="step === 4"
          color="success"
          :loading="uploading"
          :disabled="!canUpload"
          @click="submitUpload"
        >
          <v-icon start>mdi-cloud-upload</v-icon>
          {{ uploadButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database.types'

type CandidateInsert = Database['public']['Tables']['candidates']['Insert']

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'uploaded'): void
}>()

const supabase = useSupabaseClient<Database>()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const step = ref(1)
const uploadType = ref<'bulk' | 'single' | null>(null)
const csvFile = ref<File | null>(null)
const resumeFile = ref<File | null>(null)
const parsing = ref(false)
const parseError = ref<string | null>(null)
const uploading = ref(false)
const uploadedCount = ref(0)
const mergedCount = ref(0)

const parsedCandidates = ref<CandidateInsert[]>([])
const duplicateEmails = ref<string[]>([])
const existingCandidatesMap = ref<Map<string, { id: string; [key: string]: any }>>(new Map())
const skippedNoEmailCount = ref(0) // Track candidates skipped due to missing email
const uploadError = ref<string | null>(null) // Separate error for upload phase
const parsedResume = ref<{
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  state: string
  experienceYears: number
  positionId: string | null
  source: string
} | null>(null)

// Fetch positions for dropdown
const positionOptions = ref<{ title: string; value: string }[]>([])

onMounted(async () => {
  const { data } = await supabase
    .from('job_positions')
    .select('id, title')
    .order('title')
  
  if (data) {
    positionOptions.value = data.map(p => ({ title: p.title, value: p.id }))
  }
})

const previewHeaders = [
  { title: 'Name', key: 'name', width: '180px' },
  { title: 'Email', key: 'email', width: '200px' },
  { title: 'Phone', key: 'phone', width: '130px' },
  { title: 'Status', key: 'status', width: '100px' },
  { title: 'Location', key: 'location', width: '150px' },
  { title: 'Source', key: 'source', width: '120px' }
]

// Check if file is selected (for Import button)
const canImport = computed(() => {
  if (uploadType.value === 'bulk') {
    return csvFile.value !== null
  } else {
    return resumeFile.value !== null
  }
})

// Count of new candidates (not duplicates) - these have valid emails and are not duplicates
const newCandidatesCount = computed(() => {
  return parsedCandidates.value.filter(c => {
    const email = c.email?.toLowerCase()
    // Must have email and not be a duplicate
    return email && !duplicateEmails.value.includes(email)
  }).length
})

// New candidates only (for preview table) - only those with valid emails
const newCandidatesPreview = computed(() => {
  return parsedCandidates.value
    .filter(c => {
      const email = c.email?.toLowerCase()
      // Must have email and not be a duplicate
      return email && !duplicateEmails.value.includes(email)
    })
    .slice(0, 50)
})

// Candidates that can actually be uploaded (have valid required fields)
const validCandidatesForUpload = computed(() => {
  return parsedCandidates.value.filter(c => {
    return c.email && c.first_name && c.last_name
  })
})

// Check if upload button should be enabled
const canUpload = computed(() => {
  if (uploadType.value === 'bulk') {
    // Only allow upload if there are new candidates
    return newCandidatesCount.value > 0
  } else {
    // For single resume, require email and first name
    return parsedResume.value?.email && parsedResume.value?.firstName
  }
})

// Can proceed from duplicates step
const canProceedFromDuplicates = computed(() => {
  if (uploadType.value === 'bulk') {
    // Allow proceeding if there are new candidates or if we have any parsed candidates
    return newCandidatesCount.value > 0 || parsedCandidates.value.length > 0
  }
  return parsedResume.value !== null
})

// Get details about duplicate candidates for display
const duplicateCandidatesDetails = computed(() => {
  return parsedCandidates.value
    .filter(c => c.email && duplicateEmails.value.includes(c.email.toLowerCase()))
    .map(c => ({
      email: c.email,
      name: `${c.first_name} ${c.last_name || ''}`.trim()
    }))
})

// Dynamic upload button text
const uploadButtonText = computed(() => {
  if (uploadType.value === 'bulk') {
    const newCount = newCandidatesCount.value
    const mergeCount = duplicateEmails.value.length
    if (newCount > 0 && mergeCount > 0) {
      return `Upload ${newCount} new, merge ${mergeCount}`
    } else if (newCount > 0) {
      return `Upload ${newCount} to CRM`
    } else if (mergeCount > 0) {
      return `Merge ${mergeCount} existing`
    }
    return 'Upload to CRM'
  }
  return 'Upload to CRM'
})

const canProceedToReview = computed(() => {
  if (uploadType.value === 'bulk') {
    return parsedCandidates.value.length > 0
  } else {
    return parsedResume.value !== null
  }
})

function getStatusColor(status: string | null | undefined): string {
  const colors: Record<string, string> = {
    new: 'blue',
    screening: 'orange',
    interview: 'purple',
    offer: 'teal',
    hired: 'green',
    rejected: 'red'
  }
  return colors[status || ''] || 'grey'
}

// Navigate back in the wizard
function goBack() {
  if (uploadType.value === 'single' && step.value === 4) {
    // For single resume, skip duplicates step when going back
    step.value = 2
  } else {
    step.value--
  }
}

// Proceed from duplicates step to review
function proceedToReview() {
  if (uploadType.value === 'single') {
    // For single resume, just advance to step 4
    step.value = 4
  } else {
    // For bulk, advance to review step
    step.value = 4
  }
}

// Import Candidates button - parses file and advances to step 3
async function importCandidates() {
  if (uploadType.value === 'bulk') {
    await handleCsvUpload(csvFile.value)
    // Advance to step 3 even if no candidates, to show skipped count and allow re-upload
    if (parsedCandidates.value.length > 0 || skippedNoEmailCount.value > 0) {
      step.value = 3
    }
  } else {
    await handleResumeUpload(resumeFile.value)
    if (parsedResume.value) {
      step.value = 3
    }
  }
}

// Parse CSV from Indeed export
async function handleCsvUpload(file: File | File[] | null) {
  if (!file || Array.isArray(file)) {
    parsedCandidates.value = []
    return
  }

  parsing.value = true
  parseError.value = null
  skippedNoEmailCount.value = 0 // Reset skipped count

  try {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or missing data rows')
    }

    // Parse header to find column indices
    const headerLine = lines[0]
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())
    const emails: string[] = [] // Collect emails for duplicate checking
    
    // Map expected columns
    const colMap = {
      name: headers.indexOf('name'),
      email: headers.indexOf('email'),
      phone: headers.indexOf('phone'),
      status: headers.indexOf('status'),
      location: headers.findIndex(h => h.includes('candidate location') || h === 'location'),
      experience: headers.findIndex(h => h.includes('relevant experience') || h.includes('experience')),
      education: headers.indexOf('education'),
      jobTitle: headers.findIndex(h => h.includes('job title')),
      date: headers.indexOf('date'),
      source: headers.indexOf('source'),
      interestLevel: headers.findIndex(h => h.includes('interest level'))
    }

    if (colMap.name === -1) {
      throw new Error('CSV missing required "name" column')
    }

    const candidates: CandidateInsert[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 2) continue

      const fullName = values[colMap.name] || ''
      const nameParts = fullName.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const email = colMap.email >= 0 ? (values[colMap.email] || '').trim().toLowerCase() : ''
      if (email) emails.push(email)
      
      const phone = colMap.phone >= 0 ? (values[colMap.phone] || '').trim() : ''
      
      // Parse location (format: "City, State" or "City, ST")
      const locationRaw = colMap.location >= 0 ? (values[colMap.location] || '') : ''
      const locationParts = locationRaw.split(',').map(s => s.trim())
      const city = locationParts[0] || ''
      const state = locationParts[1] || ''
      
      // Parse experience years
      const expRaw = colMap.experience >= 0 ? (values[colMap.experience] || '') : ''
      const expMatch = expRaw.match(/(\d+)/)?.[1]
      const experienceYears = expMatch ? parseInt(expMatch, 10) : null
      
      // Map Indeed status to our status
      const indeedStatus = colMap.status >= 0 ? (values[colMap.status] || '').toLowerCase() : ''
      let status: CandidateInsert['status'] = 'new'
      if (indeedStatus.includes('reject')) {
        status = 'rejected'
      } else if (indeedStatus.includes('contact') || indeedStatus.includes('messaged')) {
        status = 'screening'
      } else if (indeedStatus.includes('interview')) {
        status = 'interview'
      } else if (indeedStatus.includes('offer')) {
        status = 'offer'
      } else if (indeedStatus.includes('hired')) {
        status = 'hired'
      } else if (indeedStatus.includes('awaiting') || indeedStatus.includes('new')) {
        status = 'new'
      } else if (indeedStatus.includes('review') || indeedStatus.includes('screen') || indeedStatus.includes('phone')) {
        status = 'screening'
      }
      
      // Parse applied date
      const dateRaw = colMap.date >= 0 ? (values[colMap.date] || '') : ''
      let appliedAt: string | null = null
      if (dateRaw) {
        const parsed = new Date(dateRaw)
        if (!isNaN(parsed.getTime())) {
          appliedAt = parsed.toISOString()
        }
      }
      
      const source = colMap.source >= 0 ? (values[colMap.source] || 'Indeed') : 'Indeed'
      
      // Collect qualification Q&A into notes
      const qualificationNotes: string[] = []
      headers.forEach((h, idx) => {
        if (h.startsWith('qualification') && !h.includes('answer') && !h.includes('match')) {
          const question = values[idx]
          const answerIdx = headers.findIndex((ah, ai) => ai > idx && ah.includes('answer'))
          const answer = answerIdx >= 0 ? values[answerIdx] : ''
          if (question && answer) {
            qualificationNotes.push(`Q: ${question}\nA: ${answer}`)
          }
        }
      })

      // CRITICAL: email is REQUIRED by the database schema
      // Only add candidates with valid emails - skip those without
      if (!email) {
        skippedNoEmailCount.value++
        continue // Skip this candidate - no email
      }

      // Also require first_name and last_name
      if (!firstName) {
        skippedNoEmailCount.value++ // Use same counter for all skipped
        continue
      }

      candidates.push({
        first_name: firstName,
        last_name: lastName || '', // Default to empty string if no last name
        email: email, // Now guaranteed to be non-null
        phone: phone || null,
        city: city || null,
        state: state || null,
        experience_years: experienceYears,
        status,
        source,
        applied_at: appliedAt,
        notes: qualificationNotes.length > 0 ? qualificationNotes.join('\n\n') : null
      })
    }

    parsedCandidates.value = candidates

    // Check for duplicates - fetch full records for merging
    const validEmails = candidates.map(c => c.email).filter((e): e is string => !!e)
    if (validEmails.length > 0) {
      const { data: existingCandidates } = await supabase
        .from('candidates')
        .select('*')
        .in('email', validEmails)

      if (existingCandidates) {
        duplicateEmails.value = existingCandidates.map(c => c.email).filter(Boolean) as string[]
        // Build map of existing candidates by email for merge operations
        existingCandidatesMap.value = new Map(
          existingCandidates
            .filter(c => c.email)
            .map(c => [c.email!.toLowerCase(), c])
        )
      }
    }
  } catch (err: any) {
    parseError.value = err.message || 'Failed to parse CSV file'
    parsedCandidates.value = []
  } finally {
    parsing.value = false
  }
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Handle resume upload via AI parsing
async function handleResumeUpload(file: File | File[] | null) {
  if (!file || Array.isArray(file)) {
    parsedResume.value = null
    return
  }

  parsing.value = true
  parseError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', 'resume')

    const response = await $fetch<{
      person: {
        firstName: string | null
        lastName: string | null
        email: string | null
        phone: string | null
      }
      experience: Array<{ 
        title: string
        company: string
        startDate: string | null
        endDate: string | null 
      }>
      summary: string | null
    }>('/api/ai/parse-document', {
      method: 'POST',
      body: formData
    })

    // Calculate experience years from work history dates
    let experienceYears = 0
    if (response.experience && response.experience.length > 0) {
      let totalMonths = 0
      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth() + 1
      
      for (const job of response.experience) {
        if (job.startDate) {
          // Parse YYYY-MM format
          const [startYear, startMonth] = job.startDate.split('-').map(Number)
          let endYear = currentYear
          let endMonth = currentMonth
          
          if (job.endDate && job.endDate.toLowerCase() !== 'present') {
            const [ey, em] = job.endDate.split('-').map(Number)
            if (ey && em) {
              endYear = ey
              endMonth = em
            }
          }
          
          if (startYear && startMonth) {
            const months = (endYear - startYear) * 12 + (endMonth - startMonth)
            if (months > 0) totalMonths += months
          }
        }
      }
      
      // Convert months to years, fallback to job count if parsing fails
      experienceYears = totalMonths > 0 ? Math.round(totalMonths / 12) : response.experience.length
    }

    parsedResume.value = {
      firstName: response.person.firstName || '',
      lastName: response.person.lastName || '',
      email: response.person.email || '',
      phone: response.person.phone || '',
      city: '',
      state: '',
      experienceYears,
      positionId: null,
      source: 'Resume Upload'
    }
  } catch (err: any) {
    parseError.value = err.data?.message || err.message || 'Failed to parse resume'
    parsedResume.value = null
  } finally {
    parsing.value = false
  }
}

// Helper to merge new data into existing record (only fills empty fields)
function mergeIntoEmptyFields(
  existing: Record<string, any>,
  newData: CandidateInsert
): Partial<CandidateInsert> {
  const updates: Partial<CandidateInsert> = {}
  const fieldsToCheck: (keyof CandidateInsert)[] = [
    'first_name', 'last_name', 'phone', 'city', 'state',
    'experience_years', 'source', 'applied_at', 'notes'
  ]

  for (const field of fieldsToCheck) {
    const existingVal = existing[field]
    const newVal = newData[field]
    // Only update if existing is empty/null and new has a value
    if ((existingVal === null || existingVal === undefined || existingVal === '') && 
        newVal !== null && newVal !== undefined && newVal !== '') {
      (updates as any)[field] = newVal
    }
  }

  return updates
}

// Submit the upload
async function submitUpload() {
  uploading.value = true
  uploadError.value = null

  try {
    if (uploadType.value === 'bulk') {
      // Only process NEW candidates (skip duplicates)
      // Filter to candidates with valid required fields AND not in duplicate list
      const candidatesToInsert = parsedCandidates.value.filter(c => {
        const hasRequiredFields = c.email && c.first_name && c.last_name
        const isDuplicate = c.email && duplicateEmails.value.includes(c.email.toLowerCase())
        return hasRequiredFields && !isDuplicate
      })

      if (candidatesToInsert.length === 0) {
        throw new Error('No valid candidates to upload. All candidates are either duplicates or missing required fields (email, first name, or last name).')
      }

      // Insert new candidates in chunks
      const chunkSize = 50 // Reduced chunk size for better error handling
      let inserted = 0
      const insertErrors: string[] = []

      for (let i = 0; i < candidatesToInsert.length; i += chunkSize) {
        const chunk = candidatesToInsert.slice(i, i + chunkSize)
        const { error } = await supabase.from('candidates').insert(chunk)
        
        if (error) {
          console.error('Batch insert error:', error)
          insertErrors.push(`Batch ${Math.floor(i / chunkSize) + 1}: ${error.message}`)
          // Continue with remaining batches instead of failing entirely
        } else {
          inserted += chunk.length
        }
      }

      uploadedCount.value = inserted
      mergedCount.value = 0 // No merging - duplicates are skipped

      // Show partial error if some batches failed
      if (insertErrors.length > 0 && inserted > 0) {
        uploadError.value = `Partially completed: ${inserted} added, but some batches failed. Check console for details.`
      } else if (insertErrors.length > 0 && inserted === 0) {
        throw new Error(`Failed to insert candidates: ${insertErrors.join('; ')}`)
      }
    } else if (parsedResume.value) {
      // Validate required fields for single resume upload
      if (!parsedResume.value.email) {
        throw new Error('Email is required. Please enter an email address for this candidate.')
      }
      if (!parsedResume.value.firstName) {
        throw new Error('First name is required.')
      }

      // Check if email exists for single resume upload
      const emailToCheck = parsedResume.value.email.toLowerCase()
      let existingCandidate: { id: string; [key: string]: any } | null = null

      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('email', emailToCheck)
        .maybeSingle()
      
      existingCandidate = data

      if (existingCandidate) {
        // Merge into existing candidate
        const newData: CandidateInsert = {
          first_name: parsedResume.value.firstName,
          last_name: parsedResume.value.lastName || '',
          email: parsedResume.value.email,
          phone: parsedResume.value.phone || null,
          city: parsedResume.value.city || null,
          state: parsedResume.value.state || null,
          experience_years: parsedResume.value.experienceYears || null,
          source: parsedResume.value.source
        }
        const updates = mergeIntoEmptyFields(existingCandidate, newData)

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('candidates')
            .update(updates)
            .eq('id', existingCandidate.id)

          if (error) {
            throw new Error(`Failed to update candidate: ${error.message}`)
          }
        }

        mergedCount.value = 1
        uploadedCount.value = 0
      } else {
        // Insert new candidate - email is now guaranteed to be non-null from validation above
        const { error } = await supabase.from('candidates').insert({
          first_name: parsedResume.value.firstName,
          last_name: parsedResume.value.lastName || '',
          email: parsedResume.value.email, // Required field, validated above
          phone: parsedResume.value.phone || null,
          city: parsedResume.value.city || null,
          state: parsedResume.value.state || null,
          experience_years: parsedResume.value.experienceYears || null,
          position_id: parsedResume.value.positionId || null,
          source: parsedResume.value.source,
          status: 'new'
        })

        if (error) {
          throw new Error(`Failed to add candidate: ${error.message}`)
        }

        uploadedCount.value = 1
        mergedCount.value = 0
      }
    }

    step.value = 5
  } catch (err: any) {
    uploadError.value = err.message || 'Upload failed'
    console.error('Upload error:', err)
  } finally {
    uploading.value = false
  }
}

function close() {
  dialogVisible.value = false
  resetWizard()
}

function closeAndRefresh() {
  emit('uploaded')
  close()
}

function resetWizard() {
  step.value = 1
  uploadType.value = null
  csvFile.value = null
  resumeFile.value = null
  parsedCandidates.value = []
  duplicateEmails.value = []
  existingCandidatesMap.value = new Map()
  parsedResume.value = null
  parseError.value = null
  uploadError.value = null
  skippedNoEmailCount.value = 0
  uploadedCount.value = 0
  mergedCount.value = 0
}

// Reset when dialog opens
watch(dialogVisible, (visible) => {
  if (visible) {
    resetWizard()
  }
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
