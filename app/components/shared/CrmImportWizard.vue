<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center py-4 bg-primary">
        <v-icon class="mr-3" color="white">mdi-file-import</v-icon>
        <div class="text-white">
          <div class="font-weight-bold">Import {{ entityLabel }}</div>
          <div class="text-caption">Bulk import from CSV or Excel file</div>
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
            <v-stepper-item :value="2" :complete="step > 2" title="Map Columns" />
            <v-divider />
            <v-stepper-item :value="3" :complete="step > 3" title="Review & Duplicates" />
            <v-divider />
            <v-stepper-item :value="4" title="Complete" />
          </v-stepper-header>

          <v-stepper-window>
            <!-- Step 1: Upload File -->
            <v-stepper-window-item :value="1">
              <div class="pa-6">
                <h3 class="text-h6 mb-2">Upload CSV or Excel File</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Select a CSV (.csv) or Excel (.xlsx, .xls) file to import {{ entityLabel.toLowerCase() }}.
                </p>
                
                <v-file-input
                  v-model="file"
                  accept=".csv,.xlsx,.xls"
                  label="Select file"
                  prepend-icon="mdi-file-delimited"
                  variant="outlined"
                  :disabled="parsing"
                  show-size
                  @update:model-value="handleFileSelect"
                />

                <v-alert v-if="parseError" type="error" class="mt-4" closable @click:close="parseError = null">
                  {{ parseError }}
                </v-alert>

                <v-alert v-if="file && !parseError" type="info" variant="tonal" class="mt-4">
                  <strong>{{ file?.name }}</strong> selected. Click "Parse File" to preview the data.
                </v-alert>

                <!-- Download Template -->
                <v-card variant="outlined" class="mt-6 pa-4">
                  <div class="d-flex align-center">
                    <v-icon color="primary" class="mr-3">mdi-file-download</v-icon>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">Download Template</div>
                      <div class="text-caption text-grey">Get a CSV template with all required columns</div>
                    </div>
                    <v-btn variant="outlined" color="primary" size="small" @click="downloadTemplate">
                      <v-icon start>mdi-download</v-icon>
                      Download
                    </v-btn>
                  </div>
                </v-card>
              </div>
            </v-stepper-window-item>

            <!-- Step 2: Map Columns -->
            <v-stepper-window-item :value="2">
              <div class="pa-6">
                <h3 class="text-h6 mb-2">Map Columns</h3>
                <p class="text-body-2 text-grey-darken-1 mb-4">
                  Match your file columns to the {{ entityLabel.toLowerCase() }} fields.
                </p>

                <v-alert v-if="autoMappedCount > 0" type="success" variant="tonal" class="mb-4" density="compact">
                  <v-icon start>mdi-check-circle</v-icon>
                  Auto-mapped {{ autoMappedCount }} columns. Review the mappings below.
                </v-alert>

                <v-card variant="outlined">
                  <v-list density="compact">
                    <v-list-item v-for="field in entityFields" :key="field.key" class="py-2">
                      <template #prepend>
                        <div style="width: 150px;">
                          <span class="font-weight-medium">{{ field.label }}</span>
                          <span v-if="field.required" class="text-error ml-1">*</span>
                        </div>
                      </template>
                      <v-select
                        v-model="columnMappings[field.key]"
                        :items="fileColumnOptions"
                        density="compact"
                        variant="outlined"
                        hide-details
                        placeholder="Select column..."
                        clearable
                        style="max-width: 300px;"
                      />
                      <template #append>
                        <v-chip 
                          v-if="columnMappings[field.key]" 
                          size="x-small" 
                          color="success" 
                          variant="tonal"
                        >
                          Mapped
                        </v-chip>
                        <v-chip 
                          v-else-if="field.required" 
                          size="x-small" 
                          color="error" 
                          variant="tonal"
                        >
                          Required
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-card>

                <!-- Preview of first few rows -->
                <div v-if="filePreview.length > 0" class="mt-6">
                  <h4 class="text-subtitle-1 mb-2">Data Preview (First 3 Rows)</h4>
                  <v-table density="compact" class="border rounded">
                    <thead>
                      <tr>
                        <th v-for="col in fileHeaders" :key="col" class="text-caption">{{ col }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in filePreview.slice(0, 3)" :key="idx">
                        <td v-for="col in fileHeaders" :key="col" class="text-caption">
                          {{ row[col] || '-' }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>
              </div>
            </v-stepper-window-item>

            <!-- Step 3: Review & Duplicates -->
            <v-stepper-window-item :value="3">
              <div class="pa-6">
                <!-- Duplicates Section -->
                <div v-if="duplicates.length > 0" class="mb-6">
                  <v-alert type="warning" variant="tonal" class="mb-4">
                    <div class="d-flex align-center">
                      <v-icon start size="large">mdi-account-multiple-check</v-icon>
                      <div>
                        <div class="font-weight-bold text-h6">{{ duplicates.length }} Potential Duplicates Found</div>
                        <div class="text-body-2">
                          These records match existing entries. Choose how to handle them:
                        </div>
                      </div>
                    </div>
                  </v-alert>

                  <v-card variant="outlined" class="mb-4">
                    <v-card-text class="py-2">
                      <v-radio-group v-model="duplicateAction" hide-details inline>
                        <v-radio value="skip" label="Skip duplicates (don't import)" />
                        <v-radio value="merge" label="Merge (fill empty fields only)" />
                        <v-radio value="update" label="Update (overwrite existing)" />
                      </v-radio-group>
                    </v-card-text>
                  </v-card>

                  <v-expansion-panels variant="accordion" class="mb-4">
                    <v-expansion-panel>
                      <v-expansion-panel-title>
                        <v-icon start color="warning">mdi-account-multiple</v-icon>
                        View {{ duplicates.length }} Duplicate Records
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-list density="compact">
                          <v-list-item v-for="dup in duplicates.slice(0, 20)" :key="dup.matchValue">
                            <template #prepend>
                              <v-icon color="warning" size="small">mdi-content-duplicate</v-icon>
                            </template>
                            <v-list-item-title>{{ dup.displayName }}</v-list-item-title>
                            <v-list-item-subtitle>Match: {{ dup.matchField }} = {{ dup.matchValue }}</v-list-item-subtitle>
                          </v-list-item>
                          <v-list-item v-if="duplicates.length > 20">
                            <v-list-item-title class="text-grey">
                              ...and {{ duplicates.length - 20 }} more duplicates
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>

                <!-- New Records Section -->
                <div class="d-flex align-center mb-3">
                  <h3 class="text-h6">Records to Import</h3>
                  <v-chip class="ml-3" color="success" variant="tonal">
                    {{ newRecordsCount }} new
                  </v-chip>
                  <v-chip v-if="duplicates.length > 0 && duplicateAction !== 'skip'" class="ml-2" color="warning" variant="tonal">
                    {{ duplicates.length }} {{ duplicateAction === 'merge' ? 'to merge' : 'to update' }}
                  </v-chip>
                </div>

                <v-data-table
                  :headers="previewHeaders"
                  :items="previewRecords"
                  :items-per-page="10"
                  density="compact"
                  class="elevation-0 border rounded"
                >
                  <template v-for="field in entityFields" :key="field.key" #[`item.${field.key}`]="{ item }">
                    <span v-if="field.format">{{ field.format(item[field.key]) }}</span>
                    <span v-else>{{ item[field.key] ?? '-' }}</span>
                  </template>
                  <template #bottom>
                    <div v-if="parsedRecords.length > 50" class="text-center pa-2 text-grey">
                      Showing first 50 of {{ parsedRecords.length }} records
                    </div>
                  </template>
                </v-data-table>

                <!-- Validation Errors -->
                <v-alert v-if="validationErrors.length > 0" type="error" variant="tonal" class="mt-4">
                  <div class="font-weight-bold mb-2">{{ validationErrors.length }} Validation Errors</div>
                  <ul class="mb-0 pl-4">
                    <li v-for="(err, idx) in validationErrors.slice(0, 5)" :key="idx">
                      Row {{ err.row }}: {{ err.message }}
                    </li>
                    <li v-if="validationErrors.length > 5">
                      ...and {{ validationErrors.length - 5 }} more errors
                    </li>
                  </ul>
                </v-alert>
              </div>
            </v-stepper-window-item>

            <!-- Step 4: Complete -->
            <v-stepper-window-item :value="4">
              <div class="pa-6 text-center">
                <v-icon color="success" size="80" class="mb-4">mdi-check-circle</v-icon>
                <h3 class="text-h5 mb-2">Import Complete!</h3>
                <p class="text-body-1 text-grey-darken-1 mb-4">
                  <strong>{{ importedCount }}</strong> {{ entityLabel.toLowerCase() }} imported successfully.
                  <span v-if="mergedCount > 0">
                    <br><strong>{{ mergedCount }}</strong> existing records updated.
                  </span>
                  <span v-if="skippedCount > 0">
                    <br><strong>{{ skippedCount }}</strong> duplicates skipped.
                  </span>
                </p>
                <v-btn color="primary" @click="closeAndRefresh">
                  Done
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
          @click="step--"
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
          :disabled="!file"
          :loading="parsing"
          @click="parseFile"
        >
          <v-icon start>mdi-file-search</v-icon>
          Parse File
        </v-btn>
        <v-btn
          v-else-if="step === 2"
          color="primary"
          :disabled="!canProceedToReview"
          :loading="checkingDuplicates"
          @click="checkDuplicates"
        >
          <v-icon start>mdi-check-all</v-icon>
          Check Duplicates
        </v-btn>
        <v-btn
          v-else-if="step === 3"
          color="success"
          :disabled="!canImport"
          :loading="uploading"
          @click="submitImport"
        >
          <v-icon start>mdi-cloud-upload</v-icon>
          Import {{ totalToImport }} Records
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface EntityField {
  key: string
  label: string
  required?: boolean
  format?: (value: any) => string
  validate?: (value: any) => string | null  // Returns error message or null
}

interface DuplicateInfo {
  matchField: string
  matchValue: string
  displayName: string
  existingId: string
  rowData: Record<string, any>
}

interface ValidationError {
  row: number
  message: string
}

const props = defineProps<{
  modelValue: boolean
  entityLabel: string
  entityFields: EntityField[]
  tableName: string
  duplicateCheckField?: string  // Field to check for duplicates (e.g., 'email')
  duplicateCheckFields?: string[] // Multiple fields to check (e.g., ['email', 'phone'])
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'imported', count: number): void
}>()

const supabase = useSupabaseClient()
const toast = useToast()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// State
const step = ref(1)
const file = ref<File | null>(null)
const parsing = ref(false)
const parseError = ref<string | null>(null)
const uploading = ref(false)
const checkingDuplicates = ref(false)

// File data
const fileHeaders = ref<string[]>([])
const filePreview = ref<Record<string, any>[]>([])
const parsedRecords = ref<Record<string, any>[]>([])

// Column mapping
const columnMappings = ref<Record<string, string | null>>({})

// Duplicate handling
const duplicates = ref<DuplicateInfo[]>([])
const existingRecordsMap = ref<Map<string, Record<string, any>>>(new Map())
const duplicateAction = ref<'skip' | 'merge' | 'update'>('skip')

// Results
const importedCount = ref(0)
const mergedCount = ref(0)
const skippedCount = ref(0)
const validationErrors = ref<ValidationError[]>([])

// Computed
const fileColumnOptions = computed(() => {
  return ['', ...fileHeaders.value].map(h => ({ title: h || '(None)', value: h }))
})

const autoMappedCount = computed(() => {
  return Object.values(columnMappings.value).filter(v => v).length
})

const canProceedToReview = computed(() => {
  // Check all required fields are mapped
  const requiredFields = props.entityFields.filter(f => f.required)
  return requiredFields.every(f => columnMappings.value[f.key])
})

const canImport = computed(() => {
  return parsedRecords.value.length > 0 && validationErrors.value.length === 0
})

const newRecordsCount = computed(() => {
  const dupValues = new Set(duplicates.value.map(d => d.matchValue.toLowerCase()))
  const checkField = props.duplicateCheckField || 'email'
  return parsedRecords.value.filter(r => {
    const val = r[checkField]?.toLowerCase?.()
    return !val || !dupValues.has(val)
  }).length
})

const totalToImport = computed(() => {
  if (duplicateAction.value === 'skip') {
    return newRecordsCount.value
  }
  return parsedRecords.value.length
})

const previewHeaders = computed(() => {
  return props.entityFields.slice(0, 6).map(f => ({
    title: f.label,
    key: f.key,
    width: '150px'
  }))
})

const previewRecords = computed(() => {
  return parsedRecords.value.slice(0, 50)
})

// Methods
function handleFileSelect() {
  // Reset state when new file selected
  fileHeaders.value = []
  filePreview.value = []
  parsedRecords.value = []
  columnMappings.value = {}
  duplicates.value = []
  parseError.value = null
}

function downloadTemplate() {
  // Generate CSV template with headers
  const headers = props.entityFields.map(f => f.label).join(',')
  const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${props.entityLabel.toLowerCase().replace(/\s+/g, '_')}_template.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

async function parseFile() {
  if (!file.value) return

  parsing.value = true
  parseError.value = null

  try {
    const text = await file.value.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      throw new Error('File appears to be empty or missing data rows')
    }

    // Parse header
    const headerLine = lines[0]
    fileHeaders.value = parseCSVLine(headerLine)

    // Parse data rows
    const dataRows: Record<string, any>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 2) continue

      const row: Record<string, any> = {}
      fileHeaders.value.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || null
      })
      dataRows.push(row)
    }

    filePreview.value = dataRows

    // Auto-map columns based on similarity
    autoMapColumns()

    step.value = 2
  } catch (err: any) {
    parseError.value = err.message || 'Failed to parse file'
  } finally {
    parsing.value = false
  }
}

function autoMapColumns() {
  // Reset mappings
  columnMappings.value = {}

  // Try to auto-map based on header similarity
  for (const field of props.entityFields) {
    const fieldLower = field.label.toLowerCase().replace(/[_\s]/g, '')
    const keyLower = field.key.toLowerCase().replace(/[_\s]/g, '')

    for (const header of fileHeaders.value) {
      const headerLower = header.toLowerCase().replace(/[_\s]/g, '')
      
      if (headerLower === fieldLower || 
          headerLower === keyLower ||
          headerLower.includes(fieldLower) ||
          fieldLower.includes(headerLower)) {
        columnMappings.value[field.key] = header
        break
      }
    }
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

async function checkDuplicates() {
  checkingDuplicates.value = true
  validationErrors.value = []
  duplicates.value = []

  try {
    // Map file data to entity fields
    parsedRecords.value = filePreview.value.map((row, idx) => {
      const record: Record<string, any> = {}
      
      for (const field of props.entityFields) {
        const mappedColumn = columnMappings.value[field.key]
        let value = mappedColumn ? row[mappedColumn] : null

        // Validate required fields
        if (field.required && !value) {
          validationErrors.value.push({
            row: idx + 2,  // +2 for header row and 0-indexing
            message: `Missing required field: ${field.label}`
          })
        }

        // Run custom validation
        if (field.validate && value) {
          const error = field.validate(value)
          if (error) {
            validationErrors.value.push({ row: idx + 2, message: error })
          }
        }

        record[field.key] = value
      }

      return record
    })

    // Check for duplicates
    const checkField = props.duplicateCheckField || 'email'
    const checkFields = props.duplicateCheckFields || [checkField]
    
    // Collect all values to check
    const valuesToCheck: string[] = []
    for (const record of parsedRecords.value) {
      for (const field of checkFields) {
        const val = record[field]
        if (val) valuesToCheck.push(val.toLowerCase())
      }
    }

    if (valuesToCheck.length > 0) {
      // Query existing records
      const uniqueValues = [...new Set(valuesToCheck)]
      
      for (const field of checkFields) {
        const fieldValues = parsedRecords.value
          .map(r => r[field])
          .filter(Boolean)
          .map(v => v.toLowerCase())
        
        if (fieldValues.length === 0) continue

        const { data: existing } = await supabase
          .from(props.tableName)
          .select('*')
          .in(field, [...new Set(fieldValues)])

        if (existing) {
          for (const record of existing) {
            const matchVal = record[field]?.toLowerCase()
            if (!matchVal) continue

            // Find matching import row
            const matchingRow = parsedRecords.value.find(
              r => r[field]?.toLowerCase() === matchVal
            )

            if (matchingRow) {
              duplicates.value.push({
                matchField: field,
                matchValue: record[field],
                displayName: record.name || record.contact_name || record.first_name || record[field],
                existingId: record.id,
                rowData: matchingRow
              })
              existingRecordsMap.value.set(matchVal, record)
            }
          }
        }
      }
    }

    step.value = 3
  } catch (err: any) {
    parseError.value = err.message || 'Failed to check duplicates'
  } finally {
    checkingDuplicates.value = false
  }
}

async function submitImport() {
  uploading.value = true
  importedCount.value = 0
  mergedCount.value = 0
  skippedCount.value = 0

  try {
    const checkField = props.duplicateCheckField || 'email'
    const dupValues = new Set(duplicates.value.map(d => d.matchValue.toLowerCase()))

    // Separate new records from duplicates
    const recordsToInsert: Record<string, any>[] = []
    const recordsToUpdate: { id: string; data: Record<string, any> }[] = []

    for (const record of parsedRecords.value) {
      const checkValue = record[checkField]?.toLowerCase()
      
      if (checkValue && dupValues.has(checkValue)) {
        // This is a duplicate
        if (duplicateAction.value === 'skip') {
          skippedCount.value++
          continue
        }

        const existing = existingRecordsMap.value.get(checkValue)
        if (existing) {
          if (duplicateAction.value === 'merge') {
            // Only fill empty fields
            const updates: Record<string, any> = {}
            for (const [key, value] of Object.entries(record)) {
              if (value !== null && value !== '' && 
                  (existing[key] === null || existing[key] === '')) {
                updates[key] = value
              }
            }
            if (Object.keys(updates).length > 0) {
              recordsToUpdate.push({ id: existing.id, data: updates })
            }
          } else {
            // Update - overwrite all fields
            recordsToUpdate.push({ id: existing.id, data: record })
          }
        }
      } else {
        // New record
        recordsToInsert.push(record)
      }
    }

    // Insert new records in chunks
    const chunkSize = 100
    for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
      const chunk = recordsToInsert.slice(i, i + chunkSize)
      const { error } = await supabase.from(props.tableName).insert(chunk)
      
      if (error) {
        console.error('Insert error:', error)
        throw new Error(`Failed to insert records: ${error.message}`)
      }
      
      importedCount.value += chunk.length
    }

    // Update existing records
    for (const { id, data } of recordsToUpdate) {
      const { error } = await supabase
        .from(props.tableName)
        .update(data)
        .eq('id', id)
      
      if (error) {
        console.error('Update error:', error)
      } else {
        mergedCount.value++
      }
    }

    step.value = 4
    toast.success(`Imported ${importedCount.value} ${props.entityLabel.toLowerCase()}`)
  } catch (err: any) {
    parseError.value = err.message || 'Import failed'
    toast.error(parseError.value)
  } finally {
    uploading.value = false
  }
}

function close() {
  dialogVisible.value = false
  resetWizard()
}

function closeAndRefresh() {
  emit('imported', importedCount.value + mergedCount.value)
  close()
}

function resetWizard() {
  step.value = 1
  file.value = null
  fileHeaders.value = []
  filePreview.value = []
  parsedRecords.value = []
  columnMappings.value = {}
  duplicates.value = []
  existingRecordsMap.value = new Map()
  duplicateAction.value = 'skip'
  parseError.value = null
  validationErrors.value = []
  importedCount.value = 0
  mergedCount.value = 0
  skippedCount.value = 0
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
