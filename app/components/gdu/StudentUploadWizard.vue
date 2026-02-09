<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-indigo">
        <v-icon class="mr-3" color="white">mdi-upload</v-icon>
        <div class="text-white">
          <div class="font-weight-bold">Import Students</div>
          <div class="text-caption">Bulk import students from CSV file</div>
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
                <h3 class="text-h6 mb-2">Upload Student CSV</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Upload a CSV file with student information. The file should contain columns for name, email, program type, etc.
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
                      <p class="text-caption text-grey mt-2">* first_name, last_name, and email are required</p>
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
                  We've compared your upload against existing students in the CRM.
                </p>

                <!-- Summary Stats -->
                <v-row class="mb-4">
                  <v-col cols="12" md="4">
                    <v-card variant="tonal" color="success" class="pa-4 text-center">
                      <v-icon size="32" class="mb-2">mdi-account-plus</v-icon>
                      <div class="text-h4 font-weight-bold">{{ newStudentsCount }}</div>
                      <div class="text-body-2">New Students</div>
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
                        <div class="font-weight-bold">{{ duplicateEmails.length }} Duplicate Students Found</div>
                        <div class="text-body-2">These emails already exist in the Student CRM. They will be skipped during import.</div>
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
                        <v-list-item v-for="dup in duplicateDetails.slice(0, 15)" :key="dup.email">
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
                      <strong>No duplicates found!</strong> All students are new and will be added to the CRM.
                    </div>
                  </div>
                </v-alert>

                <!-- No Valid Students Warning -->
                <v-alert v-if="newStudentsCount === 0 && duplicateEmails.length === 0" type="error" class="mb-4">
                  <div class="d-flex align-center">
                    <v-icon start>mdi-alert</v-icon>
                    <div>
                      <strong>No valid students to import.</strong> All records are either missing required fields (email, first name) or already exist.
                    </div>
                  </div>
                </v-alert>
              </div>
            </v-stepper-window-item>

            <!-- Step 3: Review -->
            <v-stepper-window-item :value="3">
              <div class="pa-6">
                <h3 class="text-h6 mb-2">New Students to Import</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Review the students below before importing to the CRM.
                </p>

                <!-- Summary chips -->
                <div class="d-flex align-center mb-4">
                  <v-chip class="mr-2" color="success" variant="tonal">
                    <v-icon start size="small">mdi-account-plus</v-icon>
                    {{ newStudentsCount }} new students to add
                  </v-chip>
                  <v-chip v-if="duplicateEmails.length > 0" color="warning" variant="tonal">
                    <v-icon start size="small">mdi-account-multiple-check</v-icon>
                    {{ duplicateEmails.length }} duplicates skipped
                  </v-chip>
                </div>
                
                <v-data-table
                  v-if="newStudentsCount > 0"
                  :headers="previewHeaders"
                  :items="newStudentsPreview"
                  :items-per-page="10"
                  density="compact"
                  class="elevation-0 border rounded"
                >
                  <template #item.name="{ item }">
                    <span class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</span>
                  </template>
                  <template #item.program_type="{ item }">
                    <v-chip :color="getProgramColor(item.program_type)" size="x-small">
                      {{ formatProgramType(item.program_type) }}
                    </v-chip>
                  </template>
                  <template #item.enrollment_status="{ item }">
                    <v-chip :color="getStatusColor(item.enrollment_status)" size="x-small">
                      {{ formatStatus(item.enrollment_status) }}
                    </v-chip>
                  </template>
                  <template #bottom>
                    <div v-if="newStudentsCount > 50" class="text-center pa-2 text-grey">
                      Showing first 50 of {{ newStudentsCount }} new students
                    </div>
                  </template>
                </v-data-table>

                <v-card v-else variant="outlined" class="pa-4 text-center">
                  <v-icon color="warning" size="40" class="mb-2">mdi-alert</v-icon>
                  <p class="text-body-2 text-grey-darken-1 mb-0">
                    No new students to import. All records are duplicates or missing required fields.
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
                  <strong>{{ uploadedCount }}</strong> new students added to the Student CRM.
                  <span v-if="duplicateEmails.length > 0">
                    <br><span class="text-warning">{{ duplicateEmails.length }} duplicates were skipped.</span>
                  </span>
                </p>
                <v-btn color="primary" @click="closeAndRefresh">
                  View Students
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
          @click="importStudents"
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
          Review Students
        </v-btn>
        <v-btn
          v-else-if="step === 3"
          color="success"
          :loading="uploading"
          :disabled="newStudentsCount === 0"
          @click="submitUpload"
        >
          <v-icon start>mdi-cloud-upload</v-icon>
          Import {{ newStudentsCount }} Students
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Database } from '~/types/database.types'
import type { ParsedStudent } from '~/types/gdu.types'

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

const parsedStudents = ref<ParsedStudent[]>([])
const duplicateEmails = ref<string[]>([])

const expectedColumns = [
  'first_name', 'last_name', 'email', 'phone', 'program_type',
  'enrollment_status', 'program_name', 'cohort', 'school_of_origin',
  'start_date', 'end_date'
]

const previewHeaders = [
  { title: 'Name', key: 'name', width: '180px' },
  { title: 'Email', key: 'email', width: '200px' },
  { title: 'Phone', key: 'phone_mobile', width: '130px' },
  { title: 'Program', key: 'program_type', width: '120px' },
  { title: 'Status', key: 'enrollment_status', width: '100px' },
  { title: 'School', key: 'school_of_origin', width: '150px' }
]

// Count of new students (not duplicates)
const newStudentsCount = computed(() => {
  return parsedStudents.value.filter(s => {
    const email = s.email?.toLowerCase()
    return email && !duplicateEmails.value.includes(email)
  }).length
})

// New students only (for preview table)
const newStudentsPreview = computed(() => {
  return parsedStudents.value
    .filter(s => {
      const email = s.email?.toLowerCase()
      return email && !duplicateEmails.value.includes(email)
    })
    .slice(0, 50)
})

// Get details about duplicate students for display
const duplicateDetails = computed(() => {
  return parsedStudents.value
    .filter(s => s.email && duplicateEmails.value.includes(s.email.toLowerCase()))
    .map(s => ({
      email: s.email,
      name: `${s.first_name} ${s.last_name || ''}`.trim()
    }))
})

const canProceedFromDuplicates = computed(() => {
  return newStudentsCount.value > 0 || parsedStudents.value.length > 0
})

function getProgramColor(type: string): string {
  const colors: Record<string, string> = {
    internship: 'indigo',
    externship: 'purple',
    paid_cohort: 'teal',
    intensive: 'orange',
    shadow: 'pink',
    ce_course: 'blue'
  }
  return colors[type] || 'grey'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    enrolled: 'success',
    pending: 'warning',
    completed: 'info',
    withdrawn: 'error',
    graduated: 'primary'
  }
  return colors[status] || 'grey'
}

function formatProgramType(type: string): string {
  const labels: Record<string, string> = {
    internship: 'Internship',
    externship: 'Externship',
    paid_cohort: 'Paid Cohort',
    intensive: 'Intensive',
    shadow: 'Shadow',
    ce_course: 'CE Course'
  }
  return labels[type] || type
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function goBack() {
  step.value--
}

// Import Students - parse CSV and check duplicates
async function importStudents() {
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

    // Map expected columns with explicit defaults
    const colMap: Record<string, number> = {
      first_name: -1,
      last_name: -1,
      email: -1,
      phone: -1,
      program_type: -1,
      enrollment_status: -1,
      program_name: -1,
      cohort: -1,
      school_of_origin: -1,
      start_date: -1,
      end_date: -1
    }
    
    expectedColumns.forEach(col => {
      const idx = headers.findIndex(h => h.includes(col) || h === col)
      colMap[col] = idx
    })

    // Also look for common alternative column names
    if (colMap.first_name === -1) colMap.first_name = headers.findIndex(h => h.includes('first') && h.includes('name'))
    if (colMap.last_name === -1) colMap.last_name = headers.findIndex(h => h.includes('last') && h.includes('name'))
    if (colMap.phone === -1) colMap.phone = headers.findIndex(h => h.includes('phone') || h.includes('mobile'))
    if (colMap.cohort === -1) colMap.cohort = headers.findIndex(h => h.includes('cohort'))

    const students: ParsedStudent[] = []
    
    const firstNameIdx = colMap.first_name ?? -1
    const lastNameIdx = colMap.last_name ?? -1
    const emailIdx = colMap.email ?? -1
    const phoneIdx = colMap.phone ?? -1
    const programTypeIdx = colMap.program_type ?? -1
    const enrollmentStatusIdx = colMap.enrollment_status ?? -1
    const programNameIdx = colMap.program_name ?? -1
    const cohortIdx = colMap.cohort ?? -1
    const schoolIdx = colMap.school_of_origin ?? -1
    const startDateIdx = colMap.start_date ?? -1
    const endDateIdx = colMap.end_date ?? -1

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const values = parseCSVLine(line)
      if (values.length < 2) continue

      const firstName = firstNameIdx >= 0 ? (values[firstNameIdx] || '').trim() : ''
      const lastName = lastNameIdx >= 0 ? (values[lastNameIdx] || '').trim() : ''
      const email = emailIdx >= 0 ? (values[emailIdx] || '').trim().toLowerCase() : ''
      
      // Skip if missing required fields
      if (!firstName || !email) {
        skippedCount.value++
        continue
      }

      emails.push(email)

      const programTypeRaw = programTypeIdx >= 0 ? (values[programTypeIdx] || '').trim().toLowerCase() : 'internship'
      
      // Map program type to valid enum
      let programType = 'internship'
      if (programTypeRaw.includes('extern')) programType = 'externship'
      else if (programTypeRaw.includes('paid') || programTypeRaw.includes('cohort')) programType = 'paid_cohort'
      else if (programTypeRaw.includes('intensive')) programType = 'intensive'
      else if (programTypeRaw.includes('shadow')) programType = 'shadow'
      else if (programTypeRaw.includes('ce') || programTypeRaw.includes('course')) programType = 'ce_course'

      const statusRaw = enrollmentStatusIdx >= 0 ? (values[enrollmentStatusIdx] || '').trim().toLowerCase() : 'enrolled'
      
      // Map status to valid enum
      let enrollmentStatus = 'enrolled'
      if (statusRaw.includes('active')) enrollmentStatus = 'active'
      else if (statusRaw.includes('pending')) enrollmentStatus = 'pending'
      else if (statusRaw.includes('complete')) enrollmentStatus = 'completed'
      else if (statusRaw.includes('withdraw')) enrollmentStatus = 'withdrawn'
      else if (statusRaw.includes('graduat')) enrollmentStatus = 'graduated'

      students.push({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_mobile: phoneIdx >= 0 ? (values[phoneIdx] || '').trim() || null : null,
        program_type: programType,
        enrollment_status: enrollmentStatus,
        program_name: programNameIdx >= 0 ? (values[programNameIdx] || '').trim() || null : null,
        cohort_identifier: cohortIdx >= 0 ? (values[cohortIdx] || '').trim() || null : null,
        school_of_origin: schoolIdx >= 0 ? (values[schoolIdx] || '').trim() || null : null,
        start_date: startDateIdx >= 0 ? parseDate(values[startDateIdx]) : null,
        end_date: endDateIdx >= 0 ? parseDate(values[endDateIdx]) : null
      })
    }

    parsedStudents.value = students

    // Check for duplicates by email in unified_persons (students are linked through this)
    const validEmails = emails.filter(e => e)
    if (validEmails.length > 0) {
      const { data: existingPersons } = await supabase
        .from('unified_persons')
        .select('email')
        .in('email', validEmails)

      if (existingPersons) {
        duplicateEmails.value = existingPersons.map((p: any) => p.email).filter(Boolean) as string[]
      }
    }

    step.value = 2
  } catch (err: any) {
    parseError.value = err.message || 'Failed to parse CSV file'
    parsedStudents.value = []
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

// Submit the upload - creates unified_persons and person_program_data records
async function submitUpload() {
  uploading.value = true

  try {
    // Filter to only new students (not duplicates)
    const studentsToInsert = parsedStudents.value.filter(s => {
      const email = s.email?.toLowerCase()
      return email && !duplicateEmails.value.includes(email)
    })

    if (studentsToInsert.length === 0) {
      throw new Error('No valid students to import.')
    }

    let inserted = 0

    // Process each student - create unified_person then person_program_data
    for (const student of studentsToInsert) {
      try {
        // 1. Create unified_person record
        const { data: person, error: personError } = await supabase
          .from('unified_persons')
          .insert({
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            phone_mobile: student.phone_mobile,
            current_stage: 'student',
            source_type: 'csv_import'
          })
          .select('id')
          .single()

        if (personError) {
          console.error('Error creating person:', personError)
          continue
        }

        // 2. Create person_program_data record
        const { error: programError } = await supabase
          .from('person_program_data')
          .insert({
            person_id: person.id,
            program_type: student.program_type as any,
            enrollment_status: student.enrollment_status as any,
            program_name: student.program_name,
            cohort_identifier: student.cohort_identifier,
            school_of_origin: student.school_of_origin,
            start_date: student.start_date,
            end_date: student.end_date
          })

        if (programError) {
          console.error('Error creating program data:', programError)
          // Still count as inserted since person was created
        }

        inserted++
      } catch (err) {
        console.error('Error processing student:', err)
      }
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
  parsedStudents.value = []
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
