<template>
  <v-dialog v-model="dialogOpen" max-width="800" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-primary">
        <v-icon class="mr-3" color="white">mdi-account-plus</v-icon>
        <span class="text-white font-weight-bold">Add Candidate</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" aria-label="Close" @click="closeWizard" />
      </v-card-title>

      <!-- Step Indicator -->
      <v-stepper v-model="step" alt-labels flat>
        <v-stepper-header>
          <v-stepper-item :value="1" :complete="step > 1" title="Choose Method" />
          <v-divider />
          <v-stepper-item :value="2" :complete="step > 2" :title="stepTwoTitle" />
          <v-divider />
          <v-stepper-item :value="3" title="Complete" />
        </v-stepper-header>
      </v-stepper>

      <v-card-text class="pa-6">
        <!-- STEP 1: Choose Method -->
        <div v-if="step === 1">
          <p class="text-body-1 mb-6">How would you like to add candidates?</p>
          
          <v-row>
            <v-col cols="12" md="4">
              <v-card
                variant="outlined"
                hover
                class="text-center pa-6 cursor-pointer"
                :class="{ 'border-primary': selectedMethod === 'manual' }"
                @click="selectMethod('manual')"
              >
                <v-icon size="48" color="primary" class="mb-3">mdi-pencil</v-icon>
                <h3 class="text-h6 mb-2">Manual Entry</h3>
                <p class="text-body-2 text-grey">Add one candidate step-by-step</p>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card
                variant="outlined"
                hover
                class="text-center pa-6 cursor-pointer"
                :class="{ 'border-primary': selectedMethod === 'resume' }"
                @click="selectMethod('resume')"
              >
                <v-icon size="48" color="success" class="mb-3">mdi-file-document</v-icon>
                <h3 class="text-h6 mb-2">Upload Resume</h3>
                <p class="text-body-2 text-grey">AI extracts candidate info from PDF</p>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card
                variant="outlined"
                hover
                class="text-center pa-6 cursor-pointer"
                :class="{ 'border-primary': selectedMethod === 'bulk' }"
                @click="selectMethod('bulk')"
              >
                <v-icon size="48" color="warning" class="mb-3">mdi-file-delimited</v-icon>
                <h3 class="text-h6 mb-2">Bulk Import</h3>
                <p class="text-body-2 text-grey">Upload CSV with multiple candidates</p>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- STEP 2A: Manual Entry Form -->
        <div v-if="step === 2 && selectedMethod === 'manual'">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.first_name"
                label="First Name *"
                variant="outlined"
                density="compact"
                :error-messages="errors.first_name"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.last_name"
                label="Last Name *"
                variant="outlined"
                density="compact"
                :error-messages="errors.last_name"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="candidateForm.email"
                label="Email *"
                type="email"
                variant="outlined"
                density="compact"
                :error-messages="errors.email"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.phone"
                label="Phone"
                variant="outlined"
                density="compact"
                hint="Format: (555) 123-4567"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="candidateForm.target_position_id"
                :items="positions"
                item-title="title"
                item-value="id"
                label="Applying For *"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="candidateForm.source"
                :items="sourceOptions"
                label="Source *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.referral_source"
                label="Referred By"
                variant="outlined"
                density="compact"
                :disabled="candidateForm.source !== 'Referral'"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="candidateForm.city"
                label="City"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.state"
                label="State"
                variant="outlined"
                density="compact"
                hint="e.g., CA, TX, NY"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="candidateForm.postal_code"
                label="Zip Code"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="candidateForm.notes"
                label="Notes"
                variant="outlined"
                density="compact"
                rows="3"
              />
            </v-col>
          </v-row>
        </div>

        <!-- STEP 2B: Resume Upload -->
        <div v-if="step === 2 && selectedMethod === 'resume'">
          <div v-if="!parsedResume">
            <v-file-input
              v-model="resumeFile"
              label="Select Resume (PDF, DOCX, or TXT)"
              variant="outlined"
              accept=".pdf,.docx,.doc,.txt"
              prepend-icon="mdi-file-document"
              :loading="parsing"
              @update:model-value="parseResume"
            />
            
            <v-alert v-if="parsing" type="info" variant="tonal" class="mt-4">
              <template #prepend>
                <v-progress-circular indeterminate size="20" class="mr-2" />
              </template>
              Parsing resume with AI... This may take a few seconds.
            </v-alert>
            
            <v-alert v-if="parseError" type="error" variant="tonal" class="mt-4" closable>
              {{ parseError }}
            </v-alert>
          </div>
          
          <div v-else>
            <v-alert type="success" variant="tonal" class="mb-4">
              <strong>Resume parsed!</strong> Please review and verify the extracted information.
            </v-alert>
            
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="candidateForm.first_name"
                  label="First Name *"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="candidateForm.last_name"
                  label="Last Name *"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="candidateForm.email"
                  label="Email *"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="candidateForm.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="candidateForm.target_position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Applying For"
                  variant="outlined"
                  density="compact"
                  clearable
                  :hint="suggestedPosition ? `AI suggested: ${suggestedPosition}` : ''"
                  persistent-hint
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="candidateForm.city"
                  label="City"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="candidateForm.state"
                  label="State"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="candidateForm.notes"
                  label="Experience Summary / Notes"
                  variant="outlined"
                  density="compact"
                  rows="3"
                />
              </v-col>
            </v-row>
            
            <v-btn variant="text" size="small" @click="resetResumeUpload" class="mt-2">
              <v-icon left>mdi-refresh</v-icon>
              Upload Different Resume
            </v-btn>
          </div>
        </div>

        <!-- STEP 2C: Bulk CSV Import -->
        <div v-if="step === 2 && selectedMethod === 'bulk'">
          <div v-if="!csvData">
            <v-file-input
              v-model="csvFile"
              label="Select CSV File"
              variant="outlined"
              accept=".csv"
              prepend-icon="mdi-file-delimited"
              @update:model-value="parseCSV"
              @change="parseCSV(csvFile)"
            />
            
            <v-alert type="info" variant="tonal" class="mt-4">
              <strong>Required columns:</strong> First Name, Last Name, Email (or Full Name + Email)<br>
              <strong>Optional columns:</strong> Phone, City, State, Source, Notes, LinkedIn
            </v-alert>
          </div>
          
          <div v-else>
            <v-alert type="success" variant="tonal" class="mb-4">
              <strong>{{ csvData.rows.length }} rows</strong> found in CSV
            </v-alert>
            
            <!-- Show mapping status -->
            <v-alert v-if="!hasRequiredMappings" type="warning" variant="tonal" class="mb-4">
              <strong>Required mappings missing:</strong> Please map columns to Email and either (First Name + Last Name) or Full Name.
            </v-alert>
            <v-alert v-else type="success" variant="tonal" class="mb-4">
              <v-icon>mdi-check-circle</v-icon> Required fields mapped correctly
            </v-alert>
            
            <h4 class="text-subtitle-1 mb-2">Column Mapping</h4>
            <p class="text-body-2 text-grey mb-3">
              Verify the columns are mapped correctly:
            </p>
            
            <v-table density="compact" class="mb-4">
              <thead>
                <tr>
                  <th>CSV Column</th>
                  <th>Maps To</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="header in csvData.headers" :key="header">
                  <td>{{ header }}</td>
                  <td>
                    <v-select
                      v-model="csvMappings[header]"
                      :items="mappingOptions"
                      density="compact"
                      variant="plain"
                      hide-details
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
            
            <h4 class="text-subtitle-1 mb-2">Preview (first 3 rows)</h4>
            <v-table density="compact">
              <thead>
                <tr>
                  <th v-for="h in csvData.headers" :key="h">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in csvData.rows.slice(0, 3)" :key="i">
                  <td v-for="h in csvData.headers" :key="h">{{ row[h] || '-' }}</td>
                </tr>
              </tbody>
            </v-table>
            
            <v-btn variant="text" size="small" @click="resetCSV" class="mt-3">
              <v-icon left>mdi-refresh</v-icon>
              Upload Different CSV
            </v-btn>
          </div>
        </div>

        <!-- STEP 3: Complete -->
        <div v-if="step === 3">
          <div class="text-center py-6">
            <v-icon size="72" color="success">mdi-check-circle</v-icon>
            <h2 class="text-h5 mt-4 mb-2">{{ completionTitle }}</h2>
            <p class="text-body-1 text-grey">{{ completionMessage }}</p>
            
            <div v-if="bulkResult" class="mt-4 text-left">
              <v-alert v-if="bulkResult.success > 0" type="success" variant="tonal" class="mb-2">
                {{ bulkResult.success }} candidates imported successfully
              </v-alert>
              <v-alert v-if="bulkResult.duplicates > 0" type="warning" variant="tonal" class="mb-2">
                {{ bulkResult.duplicates }} duplicates skipped (already exist)
              </v-alert>
              <v-alert v-if="bulkResult.errors.length > 0" type="error" variant="tonal">
                {{ bulkResult.errors.length }} rows had errors
                <ul class="mt-2">
                  <li v-for="(err, i) in bulkResult.errors.slice(0, 5)" :key="i">
                    Row {{ err.row }}: {{ err.message }}
                  </li>
                </ul>
              </v-alert>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 bg-grey-lighten-4">
        <v-btn v-if="step > 1 && step < 3" variant="text" @click="goBack">
          Back
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="closeWizard">
          {{ step === 3 ? 'Close' : 'Cancel' }}
        </v-btn>
        <v-btn
          v-if="step === 1"
          color="primary"
          :disabled="!selectedMethod"
          @click="step = 2"
        >
          Continue
        </v-btn>
        <v-btn
          v-if="step === 2"
          color="primary"
          :loading="saving"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ selectedMethod === 'bulk' ? 'Import All' : 'Save Candidate' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { normalizePhone, normalizeState } from '~/schemas/candidate'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
}>()

const supabase = useSupabaseClient()
const toast = useToast()

// Computed for v-model on dialog
const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// State
const step = ref(1)
const selectedMethod = ref<'manual' | 'resume' | 'bulk' | null>(null)
const saving = ref(false)

// Positions
const positions = ref<{ id: string; title: string }[]>([])

// Source options
const sourceOptions = [
  'Indeed',
  'LinkedIn',
  'Referral',
  'Walk-in',
  'Website',
  'Job Fair',
  'Craigslist',
  'Facebook',
  'Other'
]

// Candidate form
const candidateForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  postal_code: '',
  target_position_id: null as string | null,
  source: 'Indeed',
  referral_source: '',
  notes: ''
})

const errors = ref<Record<string, string>>({})

// Resume parsing
const resumeFile = ref<File | File[] | null>(null)
const parsing = ref(false)
const parseError = ref<string | null>(null)
const parsedResume = ref<any>(null)
const suggestedPosition = ref<string | null>(null)

// CSV import
const csvFile = ref<File | File[] | null>(null)
const csvData = ref<{ headers: string[]; rows: Record<string, any>[] } | null>(null)
const csvMappings = ref<Record<string, string>>({})
const bulkResult = ref<any>(null)

// Watch for CSV file changes to ensure parsing happens
watch(csvFile, (newFiles) => {
  if (newFiles) {
    parseCSV(newFiles)
  }
})

const mappingOptions = [
  { title: '-- Skip --', value: '' },
  { title: 'First Name', value: 'first_name' },
  { title: 'Last Name', value: 'last_name' },
  { title: 'Full Name (First Last)', value: 'full_name' },
  { title: 'Email', value: 'email' },
  { title: 'Phone', value: 'phone' },
  { title: 'Mobile Phone', value: 'phone_mobile' },
  { title: 'City', value: 'city' },
  { title: 'State', value: 'state' },
  { title: 'Zip Code', value: 'postal_code' },
  { title: 'Address', value: 'address_line1' },
  { title: 'Source', value: 'source' },
  { title: 'Notes', value: 'notes' },
  { title: 'LinkedIn', value: 'linkedin_url' },
  { title: 'Position', value: 'target_position' }
]

// Computed
const stepTwoTitle = computed(() => {
  switch (selectedMethod.value) {
    case 'manual': return 'Enter Details'
    case 'resume': return 'Upload Resume'
    case 'bulk': return 'Upload CSV'
    default: return 'Details'
  }
})

// Check if required fields are mapped for bulk import
const hasRequiredMappings = computed(() => {
  if (!csvMappings.value) return false
  const mappedFields = Object.values(csvMappings.value)
  const hasEmail = mappedFields.includes('email')
  const hasNames = (mappedFields.includes('first_name') && mappedFields.includes('last_name')) || mappedFields.includes('full_name')
  return hasEmail && hasNames
})

const canSubmit = computed(() => {
  if (selectedMethod.value === 'bulk') {
    return csvData.value && csvData.value.rows.length > 0 && hasRequiredMappings.value
  }
  return candidateForm.value.first_name && 
         candidateForm.value.last_name && 
         candidateForm.value.email
})

const completionTitle = computed(() => {
  if (selectedMethod.value === 'bulk') {
    return 'Import Complete'
  }
  return 'Candidate Added!'
})

const completionMessage = computed(() => {
  if (selectedMethod.value === 'bulk') {
    return 'Your candidates have been processed.'
  }
  return `${candidateForm.value.first_name} ${candidateForm.value.last_name} has been added to your pipeline.`
})

// Load positions on mount
onMounted(async () => {
  const { data } = await supabase
    .from('job_positions')
    .select('id, title')
    .order('title')
  
  if (data) {
    positions.value = data
  }
})

// Methods
function selectMethod(method: 'manual' | 'resume' | 'bulk') {
  selectedMethod.value = method
  // Auto-advance to step 2 for better UX
  step.value = 2
}

function goBack() {
  if (step.value === 2) {
    if (selectedMethod.value === 'resume') {
      resetResumeUpload()
    } else if (selectedMethod.value === 'bulk') {
      resetCSV()
    }
    step.value = 1
  }
}

function closeWizard() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  step.value = 1
  selectedMethod.value = null
  candidateForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    postal_code: '',
    target_position_id: null,
    source: 'Indeed',
    referral_source: '',
    notes: ''
  }
  errors.value = {}
  resetResumeUpload()
  resetCSV()
  bulkResult.value = null
}

// Resume parsing
async function parseResume(files: File | File[] | null) {
  if (!files) return
  
  // Vuetify 3.11+ v-file-input without `multiple` emits a single File, not File[]
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  parsing.value = true
  parseError.value = null
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await $fetch<any>('/api/recruiting/parse-resume', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })
    
    if (response.success && response.data) {
      parsedResume.value = response.data
      suggestedPosition.value = response.data.suggested_position
      
      // Map AI data to form
      candidateForm.value = {
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone: normalizePhone(response.data.phone) || '',
        city: response.data.city || '',
        state: normalizeState(response.data.state) || '',
        postal_code: response.data.postal_code || '',
        target_position_id: findPositionByTitle(response.data.suggested_position),
        source: 'Resume Upload',
        referral_source: '',
        notes: response.data.experience_summary || ''
      }
    }
  } catch (err: any) {
    parseError.value = err.data?.message || err.message || 'Failed to parse resume'
    resumeFile.value = null
  } finally {
    parsing.value = false
  }
}

function findPositionByTitle(title: string | null): string | null {
  if (!title) return null
  const lower = title.toLowerCase()
  const match = positions.value.find(p => 
    p.title.toLowerCase().includes(lower) || 
    lower.includes(p.title.toLowerCase())
  )
  return match?.id || null
}

function resetResumeUpload() {
  resumeFile.value = null
  parsedResume.value = null
  parseError.value = null
  suggestedPosition.value = null
}

// CSV parsing
async function parseCSV(files: File | File[] | null) {
  if (!files) return
  
  // Vuetify 3.11+ v-file-input without `multiple` emits a single File, not File[]
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  const text = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  
  if (lines.length < 2) {
    toast.error('CSV must have at least a header row and one data row')
    csvFile.value = null
    return
  }
  
  // Parse headers
  const headers = parseCSVRow(lines[0])
  
  // Parse rows
  const rows: Record<string, any>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i])
    const row: Record<string, any> = {}
    headers.forEach((h, j) => {
      row[h] = values[j]?.trim() || ''
    })
    rows.push(row)
  }
  
  csvData.value = { headers, rows }
  
  // Auto-map headers
  csvMappings.value = {}
  for (const h of headers) {
    csvMappings.value[h] = guessMapping(h)
  }
}

function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes
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

function guessMapping(header: string): string {
  const h = header.toLowerCase().replace(/[_\s-]/g, '')
  
  // First Name variations
  if (h === 'firstname' || h === 'fname' || h === 'first' || h === 'givenname' || h === 'forename' || h.includes('firstname')) return 'first_name'
  
  // Last Name variations
  if (h === 'lastname' || h === 'lname' || h === 'last' || h === 'surname' || h === 'familyname' || h.includes('lastname')) return 'last_name'
  
  // Full Name - we'll handle this specially in the mapping
  if (h === 'name' || h === 'fullname' || h === 'candidatename' || h === 'contactname') return 'full_name'
  
  // Email variations
  if (h === 'email' || h === 'emailaddress' || h === 'mail' || h === 'emailid' || h === 'contactemail' || h.includes('email')) return 'email'
  
  // Phone variations
  if (h === 'mobile' || h === 'mobilephone' || h === 'cell' || h === 'cellphone') return 'phone_mobile'
  if (h === 'phone' || h === 'phonenumber' || h === 'telephone' || h === 'tel' || h === 'contact' || h === 'homephone' || h === 'workphone' || h.includes('phone')) return 'phone'
  
  // Location variations
  if (h === 'city' || h === 'town' || h.includes('city')) return 'city'
  if (h === 'state' || h === 'st' || h === 'province' || h === 'region' || h.includes('state')) return 'state'
  if (h === 'zip' || h === 'zipcode' || h === 'postalcode' || h === 'postal' || h === 'postcode' || h.includes('zip') || h.includes('postal')) return 'postal_code'
  if (h === 'address' || h === 'street' || h === 'address1' || h === 'streetaddress' || h.includes('address')) return 'address_line1'
  
  // Source variations
  if (h === 'source' || h === 'leadsource' || h === 'howhear' || h === 'referral' || h === 'referredby' || h === 'referralsource' || h.includes('source')) return 'source'
  
  // Notes variations
  if (h === 'notes' || h === 'note' || h === 'comments' || h === 'comment' || h === 'description' || h === 'summary' || h.includes('note') || h.includes('comment')) return 'notes'
  
  // LinkedIn variations
  if (h === 'linkedin' || h === 'linkedinurl' || h === 'linkedinprofile' || h.includes('linkedin')) return 'linkedin_url'
  
  // Position variations
  if (h === 'position' || h === 'role' || h === 'jobtitle' || h === 'title' || h === 'applyingfor' || h.includes('position')) return 'target_position'
  
  return ''
}

function resetCSV() {
  csvFile.value = null
  csvData.value = null
  csvMappings.value = {}
}

// Submit
async function submit() {
  console.log('[AddCandidateWizard] Submit called, method:', selectedMethod.value)
  saving.value = true
  errors.value = {}
  
  try {
    if (selectedMethod.value === 'bulk') {
      await submitBulk()
    } else {
      console.log('[AddCandidateWizard] Calling submitSingle...')
      await submitSingle()
    }
    
    console.log('[AddCandidateWizard] Success, moving to step 3')
    step.value = 3
    emit('saved')
    
  } catch (err: any) {
    console.error('[AddCandidateWizard] Error:', err)
    toast.error(err.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function submitSingle() {
  console.log('[AddCandidateWizard] submitSingle - form:', candidateForm.value)
  
  // Validate
  if (!candidateForm.value.first_name) {
    errors.value.first_name = 'First name is required'
    throw new Error('First name is required')
  }
  if (!candidateForm.value.last_name) {
    errors.value.last_name = 'Last name is required'
    throw new Error('Last name is required')
  }
  if (!candidateForm.value.email) {
    errors.value.email = 'Email is required'
    throw new Error('Email is required')
  }
  
  // Get session for auth header
  const { data: { session } } = await supabase.auth.getSession()
  
  // Call server API (bypasses RLS with service role)
  const response = await $fetch<any>('/api/recruiting/create-candidate', {
    method: 'POST',
    body: {
      first_name: candidateForm.value.first_name,
      last_name: candidateForm.value.last_name,
      email: candidateForm.value.email,
      phone: candidateForm.value.phone,
      city: candidateForm.value.city,
      state: candidateForm.value.state,
      postal_code: candidateForm.value.postal_code,
      target_position_id: candidateForm.value.target_position_id,
      source: candidateForm.value.source,
      referral_source: candidateForm.value.referral_source,
      notes: candidateForm.value.notes
    },
    headers: {
      'Authorization': `Bearer ${session?.access_token}`
    }
  })
  
  if (!response.success) {
    throw new Error(response.message || 'Failed to create candidate')
  }
  
  console.log('[AddCandidateWizard] Created candidate:', response.data)
  toast.success(`${candidateForm.value.first_name} ${candidateForm.value.last_name} added!`)
}

async function submitBulk() {
  if (!csvData.value) return
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Pass the user's mappings to the API
  const headerMapping: Record<string, string> = {}
  for (const [csvHeader, dbColumn] of Object.entries(csvMappings.value)) {
    if (dbColumn) {
      headerMapping[csvHeader] = dbColumn
    }
  }
  
  console.log('[AddCandidateWizard] Bulk import with mappings:', headerMapping)
  
  const response = await $fetch<any>('/api/recruiting/bulk-import', {
    method: 'POST',
    body: {
      headers: csvData.value.headers,
      rows: csvData.value.rows,
      headerMapping, // Pass the user's column mappings
      useAIMapping: false
    },
    headers: {
      'Authorization': `Bearer ${session?.access_token}`
    }
  })
  
  bulkResult.value = response
  
  if (response.success > 0) {
    toast.success(`${response.success} candidates imported!`)
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.border-primary {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px !important;
}
</style>
