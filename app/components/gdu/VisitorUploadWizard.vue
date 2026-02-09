<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-teal">
        <v-icon class="mr-3" color="white">mdi-upload</v-icon>
        <div class="text-white">
          <div class="font-weight-bold">Import Visitors</div>
          <div class="text-caption">Bulk import visitors from CSV file</div>
        </div>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" aria-label="Close" @click="close" :disabled="uploading" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0 scrollable-70vh">
        <v-stepper v-model="step" flat>
          <v-stepper-header class="elevation-0 border-b">
            <v-stepper-item :value="1" :complete="step > 1" title="Upload File" />
            <v-divider />
            <v-stepper-item :value="2" :complete="step > 2" title="Duplicates" />
            <v-divider />
            <v-stepper-item :value="3" :complete="step > 3" title="Review" />
            <v-divider />
            <v-stepper-item :value="4" title="Import" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Upload File -->
            <v-stepper-window-item :value="1">
              <div class="pa-6">
                <h3 class="text-h6 mb-2">Upload Visitor CSV</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Upload a CSV file with visitor information. The file should contain columns for name, email, phone, visitor type, etc.
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
                  <strong>{{ csvFile?.name }}</strong> selected. Click "Import & Check Duplicates" to parse the file.
                </v-alert>

                <v-expansion-panels class="mt-4">
                  <v-expansion-panel>
                    <v-expansion-panel-title>
                      <v-icon class="mr-2">mdi-information</v-icon>
                      Expected CSV Format
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <p class="text-body-2 mb-2">Your CSV should include these columns:</p>
                      <v-chip-group>
                        <v-chip size="small" v-for="col in expectedColumns" :key="col">{{ col }}</v-chip>
                      </v-chip-group>
                      <p class="text-caption text-grey mt-2">* first_name and last_name are required</p>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-stepper-window-item>

            <!-- Step 2: Duplicates Check -->
            <v-stepper-window-item :value="2">
              <div class="pa-6">
                <h3 class="text-h6 mb-4">Duplicate Check Results</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  We've compared your upload against existing visitors in the CRM.
                </p>

                <!-- Summary Stats -->
                <v-row class="mb-4">
                  <v-col cols="12" md="4">
                    <v-card variant="tonal" color="success" class="pa-4 text-center">
                      <v-icon size="32" class="mb-2">mdi-account-plus</v-icon>
                      <div class="text-h4 font-weight-bold">{{ newVisitorsCount }}</div>
                      <div class="text-body-2">New Visitors</div>
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
                      <div class="text-h4 font-weight-bold">{{ skippedCount }}</div>
                      <div class="text-body-2">Skipped (Invalid)</div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Duplicates Detail Section -->
                <div v-if="duplicateEmails.length > 0" class="mb-4">
                  <v-alert type="warning" variant="tonal" class="mb-4">
                    <div class="d-flex align-center">
                      <v-icon start size="large">mdi-account-multiple-check</v-icon>
                      <div>
                        <div class="font-weight-bold">{{ duplicateEmails.length }} Duplicate Visitors Found</div>
                        <div class="text-body-2">These emails already exist in the Visitor CRM. They will be skipped during import.</div>
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
                        <v-list-item v-for="(dup, dupIndex) in duplicateDetails.slice(0, 15)" :key="dup.email || dupIndex">
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
                      <strong>No duplicates found!</strong> All visitors are new and will be added to the CRM.
                    </div>
                  </div>
                </v-alert>

                <!-- No Valid Visitors Warning -->
                <v-alert v-if="newVisitorsCount === 0 && duplicateEmails.length === 0" type="error" class="mb-4">
                  <div class="d-flex align-center">
                    <v-icon start>mdi-alert</v-icon>
                    <div>
                      <strong>No valid visitors to import.</strong> All records are either missing required fields or already exist.
                    </div>
                  </div>
                </v-alert>
              </div>
            </v-stepper-window-item>

            <!-- Step 3: Review -->
            <v-stepper-window-item :value="3">
              <div class="pa-6">
                <h3 class="text-h6 mb-2">New Visitors to Import</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Review the visitors below before importing to the CRM.
                </p>

                <!-- Summary chips -->
                <div class="d-flex align-center mb-4">
                  <v-chip class="mr-2" color="success" variant="tonal">
                    <v-icon start size="small">mdi-account-plus</v-icon>
                    {{ newVisitorsCount }} new visitors to add
                  </v-chip>
                  <v-chip v-if="duplicateEmails.length > 0" color="warning" variant="tonal">
                    <v-icon start size="small">mdi-account-multiple-check</v-icon>
                    {{ duplicateEmails.length }} duplicates skipped
                  </v-chip>
                </div>
                
                <v-data-table
                  v-if="newVisitorsCount > 0"
                  :headers="previewHeaders"
                  :items="newVisitorsPreview"
                  :items-per-page="10"
                  density="compact"
                  class="elevation-0 border rounded"
                >
                  <template #item.name="{ item }">
                    <span class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</span>
                  </template>
                  <template #item.visitor_type="{ item }">
                    <v-chip :color="getTypeColor(item.visitor_type || 'other')" size="x-small">
                      {{ item.visitor_type || 'other' }}
                    </v-chip>
                  </template>
                  <template #bottom>
                    <div v-if="newVisitorsCount > 50" class="text-center pa-2 text-grey">
                      Showing first 50 of {{ newVisitorsCount }} new visitors
                    </div>
                  </template>
                </v-data-table>

                <v-card v-else variant="outlined" class="pa-4 text-center">
                  <v-icon color="warning" size="40" class="mb-2">mdi-alert</v-icon>
                  <p class="text-body-2 text-grey-darken-1 mb-0">
                    No new visitors to import. All records are duplicates or missing required fields.
                  </p>
                </v-card>
              </div>
            </v-stepper-window-item>

            <!-- Step 4: Complete -->
            <v-stepper-window-item :value="4">
              <div class="pa-6 text-center">
                <v-icon color="success" size="80" class="mb-4">mdi-check-circle</v-icon>
                <h3 class="text-h5 mb-2">Import Complete!</h3>
                <p class="text-body-1 text-grey-darken-1 mb-4">
                  <strong>{{ uploadedCount }}</strong> new visitors added to the Visitor CRM.
                  <span v-if="duplicateEmails.length > 0">
                    <br><span class="text-warning">{{ duplicateEmails.length }} duplicates were skipped.</span>
                  </span>
                </p>
                <v-btn color="primary" @click="closeAndRefresh">
                  View Visitors
                </v-btn>
              </div>
            </v-stepper-window-item>
          </v-stepper-window>
        </v-stepper>
      </v-card-text>

      <v-divider />

      <!-- Footer Actions -->
      <v-card-actions class="pa-4" v-if="step < 4">
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
          :disabled="!csvFile"
          :loading="parsing"
          @click="importVisitors"
        >
          <v-icon start>mdi-file-import</v-icon>
          Import & Check Duplicates
        </v-btn>
        <v-btn
          v-else-if="step === 2"
          color="primary"
          :disabled="!canProceedFromDuplicates"
          @click="step = 3"
        >
          <v-icon start>mdi-arrow-right</v-icon>
          Review Visitors
        </v-btn>
        <v-btn
          v-else-if="step === 3"
          color="success"
          :loading="uploading"
          :disabled="newVisitorsCount === 0"
          @click="submitUpload"
        >
          <v-icon start>mdi-cloud-upload</v-icon>
          Import {{ newVisitorsCount }} Visitors
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { VisitorInsert } from '~/types/gdu.types'

// Define visitor interface locally since table may not be in typed client
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'uploaded'): void
}>()

const supabase = useSupabaseClient() as any

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const step = ref(1)
const csvFile = ref<File | null>(null)
const parsing = ref(false)
const parseError = ref<string | null>(null)
const uploading = ref(false)
const uploadedCount = ref(0)
const skippedCount = ref(0)

const parsedVisitors = ref<VisitorInsert[]>([])
const duplicateEmails = ref<string[]>([])

const expectedColumns = [
  'first_name', 'last_name', 'email', 'phone', 'visitor_type',
  'organization_name', 'school_of_origin', 'program_name',
  'visit_start_date', 'visit_end_date', 'location', 'visit_status',
  'coordinator', 'mentor', 'notes'
]

const previewHeaders = [
  { title: 'Name', key: 'name', width: '180px' },
  { title: 'Email', key: 'email', width: '200px' },
  { title: 'Phone', key: 'phone', width: '130px' },
  { title: 'Type', key: 'visitor_type', width: '100px' },
  { title: 'Organization', key: 'organization_name', width: '150px' },
  { title: 'Location', key: 'location', width: '120px' }
]

// Count of new visitors (not duplicates)
const newVisitorsCount = computed(() => {
  return parsedVisitors.value.filter(v => {
    const email = v.email?.toLowerCase()
    return !email || !duplicateEmails.value.includes(email)
  }).length
})

// New visitors only (for preview table)
const newVisitorsPreview = computed(() => {
  return parsedVisitors.value
    .filter(v => {
      const email = v.email?.toLowerCase()
      return !email || !duplicateEmails.value.includes(email)
    })
    .slice(0, 50)
})

// Get details about duplicate visitors for display
const duplicateDetails = computed(() => {
  return parsedVisitors.value
    .filter(v => v.email && duplicateEmails.value.includes(v.email.toLowerCase()))
    .map(v => ({
      email: v.email,
      name: `${v.first_name} ${v.last_name || ''}`.trim()
    }))
})

const canProceedFromDuplicates = computed(() => {
  return newVisitorsCount.value > 0 || parsedVisitors.value.length > 0
})

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    intern: 'blue',
    extern: 'purple',
    student: 'teal',
    ce_attendee: 'orange',
    shadow: 'pink',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function goBack() {
  step.value--
}

// Import Visitors - parse CSV and check duplicates
async function importVisitors() {
  if (!csvFile.value) return

  parsing.value = true
  parseError.value = null
  skippedCount.value = 0

  try {
    const text = await csvFile.value.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or missing data rows')
    }

    // Parse header to find column indices
    const headerLine = lines[0] || ''
    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim().replace(/\s+/g, '_'))
    const emails: string[] = []

    // Map expected columns with type safety
    const colMap: Record<string, number> = {
      first_name: -1,
      last_name: -1,
      email: -1,
      phone: -1,
      visitor_type: -1,
      organization_name: -1,
      school_of_origin: -1,
      program_name: -1,
      visit_start_date: -1,
      visit_end_date: -1,
      location: -1,
      visit_status: -1,
      coordinator: -1,
      mentor: -1,
      notes: -1
    }
    
    expectedColumns.forEach(col => {
      const idx = headers.findIndex(h => h.includes(col) || h === col)
      colMap[col] = idx
    })

    // Also look for common alternative column names
    if (colMap.first_name === -1) colMap.first_name = headers.findIndex(h => h.includes('first') && h.includes('name'))
    if (colMap.last_name === -1) colMap.last_name = headers.findIndex(h => h.includes('last') && h.includes('name'))
    if (colMap.visitor_type === -1) colMap.visitor_type = headers.findIndex(h => h.includes('type'))

    const visitors: VisitorInsert[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const values = parseCSVLine(line)
      if (values.length < 2) continue

      const firstNameIdx = colMap.first_name ?? -1
      const lastNameIdx = colMap.last_name ?? -1
      const emailIdx = colMap.email ?? -1
      const phoneIdx = colMap.phone ?? -1
      const visitorTypeIdx = colMap.visitor_type ?? -1
      const orgIdx = colMap.organization_name ?? -1
      const schoolIdx = colMap.school_of_origin ?? -1
      const programIdx = colMap.program_name ?? -1
      const startDateIdx = colMap.visit_start_date ?? -1
      const endDateIdx = colMap.visit_end_date ?? -1
      const locationIdx = colMap.location ?? -1
      const statusIdx = colMap.visit_status ?? -1
      const coordinatorIdx = colMap.coordinator ?? -1
      const mentorIdx = colMap.mentor ?? -1
      const notesIdx = colMap.notes ?? -1

      const firstName = firstNameIdx >= 0 ? (values[firstNameIdx] || '').trim() : ''
      const lastName = lastNameIdx >= 0 ? (values[lastNameIdx] || '').trim() : ''
      
      // Skip if no first name (required)
      if (!firstName) {
        skippedCount.value++
        continue
      }

      const email = emailIdx >= 0 ? (values[emailIdx] || '').trim().toLowerCase() : ''
      if (email) emails.push(email)

      const visitorType = visitorTypeIdx >= 0 ? (values[visitorTypeIdx] || '').trim().toLowerCase() : 'other'
      
      // Map visitor type to valid enum
      let mappedType: VisitorInsert['visitor_type'] = 'other'
      if (visitorType.includes('intern')) mappedType = 'intern'
      else if (visitorType.includes('extern')) mappedType = 'extern'
      else if (visitorType.includes('student')) mappedType = 'student'
      else if (visitorType.includes('ce') || visitorType.includes('attendee')) mappedType = 'ce_attendee'
      else if (visitorType.includes('shadow')) mappedType = 'shadow'

      visitors.push({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phoneIdx >= 0 ? (values[phoneIdx] || '').trim() || null : null,
        visitor_type: mappedType,
        organization_name: orgIdx >= 0 ? (values[orgIdx] || '').trim() || null : null,
        school_of_origin: schoolIdx >= 0 ? (values[schoolIdx] || '').trim() || null : null,
        program_name: programIdx >= 0 ? (values[programIdx] || '').trim() || null : null,
        visit_start_date: startDateIdx >= 0 ? parseDate(values[startDateIdx]) : null,
        visit_end_date: endDateIdx >= 0 ? parseDate(values[endDateIdx]) : null,
        location: locationIdx >= 0 ? (values[locationIdx] || '').trim() || null : null,
        visit_status: statusIdx >= 0 ? (values[statusIdx] || '').trim().toLowerCase() || 'upcoming' : 'upcoming',
        coordinator: coordinatorIdx >= 0 ? (values[coordinatorIdx] || '').trim() || null : null,
        mentor: mentorIdx >= 0 ? (values[mentorIdx] || '').trim() || null : null,
        notes: notesIdx >= 0 ? (values[notesIdx] || '').trim() || null : null,
        is_active: true
      })
    }

    parsedVisitors.value = visitors

    // Check for duplicates by email
    const validEmails = emails.filter(e => e)
    if (validEmails.length > 0) {
      const { data: existingVisitors } = await supabase
        .from('education_visitors')
        .select('email')
        .in('email', validEmails)

      if (existingVisitors) {
        duplicateEmails.value = existingVisitors.map((v: any) => v.email).filter(Boolean) as string[]
      }
    }

    step.value = 2
  } catch (err: any) {
    parseError.value = err.message || 'Failed to parse CSV file'
    parsedVisitors.value = []
  } finally {
    parsing.value = false
  }
}

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

function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  const trimmed = dateStr.trim()
  if (!trimmed) return null
  
  const parsed = new Date(trimmed)
  if (isNaN(parsed.getTime())) return null
  
  const dateOnly = parsed.toISOString().split('T')[0]
  return dateOnly || null
}

// Submit the upload
async function submitUpload() {
  uploading.value = true

  try {
    // Filter to only new visitors (not duplicates)
    const visitorsToInsert = parsedVisitors.value.filter(v => {
      const email = v.email?.toLowerCase()
      return !email || !duplicateEmails.value.includes(email)
    })

    if (visitorsToInsert.length === 0) {
      throw new Error('No valid visitors to import.')
    }

    // Insert in chunks
    const chunkSize = 50
    let inserted = 0

    for (let i = 0; i < visitorsToInsert.length; i += chunkSize) {
      const chunk = visitorsToInsert.slice(i, i + chunkSize)
      const { error } = await supabase.from('education_visitors').insert(chunk)
      
      if (error) {
        console.error('Batch insert error:', error)
        throw new Error(`Failed to insert visitors: ${error.message}`)
      }
      inserted += chunk.length
    }

    uploadedCount.value = inserted
    step.value = 4
  } catch (err: any) {
    parseError.value = err.message || 'Import failed'
    console.error('Import error:', err)
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
  csvFile.value = null
  parsedVisitors.value = []
  duplicateEmails.value = []
  parseError.value = null
  skippedCount.value = 0
  uploadedCount.value = 0
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
}
</style>
