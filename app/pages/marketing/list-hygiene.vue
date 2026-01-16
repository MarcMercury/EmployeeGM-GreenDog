<script setup lang="ts">
/**
 * List Hygiene & Email Parse
 * 
 * A client-side utility to clean, merge, and filter external contact lists (CSVs)
 * before importing them into the CRM.
 * 
 * Features:
 * - Multi-file CSV dropzone with AI-powered header mapping
 * - Set operations: Find New Leads (A-B), Master Merge (Union), Common Ground (Intersection)
 * - Clean CSV export and direct CRM import with source tagging
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()
const toast = useToast()

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ParsedFile {
  id: string
  name: string
  rowCount: number
  headers: string[]
  mappedHeaders: Record<string, string>
  data: Record<string, any>[]
  isMapping: boolean
}

interface MappingCandidate {
  original: string
  suggested: string
  confidence: number
}

type OperationType = 'find_new' | 'master_merge' | 'common_ground'

// Standard schema fields
const STANDARD_FIELDS = ['email', 'first_name', 'last_name', 'phone', 'company', 'notes', 'source'] as const
type StandardField = typeof STANDARD_FIELDS[number]

// ============================================
// REACTIVE STATE
// ============================================

// File Management
const targetFiles = ref<ParsedFile[]>([])
const suppressionFiles = ref<ParsedFile[]>([])
const isDragging = ref(false)
const isDraggingSuppression = ref(false)
const activeDropzone = ref<'target' | 'suppression' | null>(null)

// Operation Mode
const operationType = ref<OperationType>('master_merge')

// Processing State
const isProcessing = ref(false)
const processedData = ref<Record<string, any>[]>([])
const processingStats = ref({
  totalRows: 0,
  duplicatesRemoved: 0,
  finalCount: 0
})

// Import State
const sourceTag = ref('')
const isImporting = ref(false)
const importProgress = ref(0)

// Mapping Dialog
const showMappingDialog = ref(false)
const currentMappingFile = ref<ParsedFile | null>(null)
const pendingMappings = ref<MappingCandidate[]>([])

// Template refs for file inputs
const targetFileInput = ref<HTMLInputElement | null>(null)
const suppressionFileInput = ref<HTMLInputElement | null>(null)

// Loading state for file parsing
const isLoadingFiles = ref(false)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique ID (with fallback for non-HTTPS contexts)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
}

// ============================================
// OPERATION OPTIONS
// ============================================

const operationOptions = [
  {
    value: 'find_new',
    title: 'Find New Leads (A minus B)',
    subtitle: 'Return emails in Target but NOT in Suppression list',
    icon: 'mdi-set-left',
    color: 'primary'
  },
  {
    value: 'master_merge',
    title: 'Master Merge (Union)',
    subtitle: 'Combine all files & remove duplicates (keeps most populated)',
    icon: 'mdi-set-all',
    color: 'success'
  },
  {
    value: 'common_ground',
    title: 'Common Ground (Intersection)',
    subtitle: 'Return only emails that appear in ALL files',
    icon: 'mdi-set-center',
    color: 'info'
  }
] as const

const showSuppressionZone = computed(() => operationType.value === 'find_new')

// ============================================
// FILE PARSING & HEADER MAPPING
// ============================================

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): { headers: string[], data: Record<string, any>[] } {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { headers: [], data: [] }
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0])
  
  // Parse data rows
  const data = lines.slice(1)
    .map(line => parseCSVLine(line))
    .filter(row => row.some(cell => cell.trim()))
    .map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || ''
      })
      return obj
    })

  return { headers, data }
}

/**
 * Parse a single CSV line handling quoted values
 */
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

/**
 * Read file content as text using FileReader (better browser compatibility)
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    reader.onerror = () => reject(new Error('FileReader error'))
    reader.readAsText(file)
  })
}

/**
 * AI-assisted header mapping
 * Maps ambiguous headers to our standard schema
 */
function mapHeaders(headers: string[]): { mapped: Record<string, string>, candidates: MappingCandidate[] } {
  const mapped: Record<string, string> = {}
  const candidates: MappingCandidate[] = []

  // Common variations for each field
  const fieldPatterns: Record<StandardField, RegExp[]> = {
    email: [/e-?mail/i, /email.?addr/i, /e.?mail/i, /correo/i],
    first_name: [/first.?name/i, /f.?name/i, /given.?name/i, /nombre/i, /fname/i],
    last_name: [/last.?name/i, /l.?name/i, /surname/i, /family.?name/i, /apellido/i, /lname/i],
    phone: [/phone/i, /tel/i, /mobile/i, /cell/i, /telefono/i],
    company: [/company/i, /org/i, /business/i, /employer/i, /empresa/i, /clinic/i, /hospital/i],
    notes: [/notes?/i, /comment/i, /remark/i, /notas/i, /description/i],
    source: [/source/i, /origin/i, /channel/i, /fuente/i, /how.?heard/i, /referr/i]
  }

  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim()
    let bestMatch: { field: StandardField, confidence: number } | null = null

    // Check for exact matches first
    for (const field of STANDARD_FIELDS) {
      if (headerLower === field) {
        mapped[header] = field
        return
      }
    }

    // Check patterns
    for (const [field, patterns] of Object.entries(fieldPatterns) as [StandardField, RegExp[]][]) {
      for (const pattern of patterns) {
        if (pattern.test(header)) {
          const confidence = pattern.toString().includes('^') ? 1 : 0.8
          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { field, confidence }
          }
        }
      }
    }

    if (bestMatch && bestMatch.confidence > 0.7) {
      mapped[header] = bestMatch.field
    } else if (bestMatch) {
      // Needs confirmation
      candidates.push({
        original: header,
        suggested: bestMatch.field,
        confidence: bestMatch.confidence
      })
    } else {
      // No match - keep as-is or skip
      mapped[header] = header
    }
  })

  return { mapped, candidates }
}

/**
 * Handle file drop
 */
async function handleFileDrop(event: DragEvent, zone: 'target' | 'suppression') {
  event.preventDefault()
  isDragging.value = false
  isDraggingSuppression.value = false
  activeDropzone.value = null

  const files = event.dataTransfer?.files
  if (!files) return

  await processFiles(Array.from(files), zone)
}

/**
 * Handle file input change
 */
async function handleFileInput(event: Event, zone: 'target' | 'suppression') {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  await processFiles(Array.from(files), zone)
  input.value = '' // Reset for re-upload of same file
}

/**
 * Process uploaded files
 */
async function processFiles(files: File[], zone: 'target' | 'suppression') {
  const targetList = zone === 'target' ? targetFiles : suppressionFiles
  isLoadingFiles.value = true

  for (const file of files) {
    // Accept CSV files (including .txt that might contain CSV data)
    const validExtensions = ['.csv', '.txt']
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!hasValidExt) {
      toast.warning(`Skipped ${file.name} - only CSV files are supported`)
      continue
    }

    try {
      const content = await readFileAsText(file)
      const { headers, data } = parseCSV(content)

      if (headers.length === 0) {
        toast.error(`${file.name} appears to be empty or invalid`)
        continue
      }

      const { mapped, candidates } = mapHeaders(headers)

      const parsedFile: ParsedFile = {
        id: generateId(),
        name: file.name,
        rowCount: data.length,
        headers,
        mappedHeaders: mapped,
        data,
        isMapping: candidates.length > 0
      }

      targetList.value.push(parsedFile)

      // If there are ambiguous mappings, show dialog
      if (candidates.length > 0) {
        currentMappingFile.value = parsedFile
        pendingMappings.value = candidates
        showMappingDialog.value = true
      }

      toast.success(`Loaded ${file.name} (${data.length} rows)`)
    } catch (err) {
      console.error('Error parsing file:', err)
      toast.error(`Failed to parse ${file.name}`)
    }
  }
  
  isLoadingFiles.value = false
}

/**
 * Confirm header mappings from dialog
 */
function confirmMappings() {
  if (currentMappingFile.value) {
    pendingMappings.value.forEach(mapping => {
      currentMappingFile.value!.mappedHeaders[mapping.original] = mapping.suggested
    })
    currentMappingFile.value.isMapping = false
  }
  showMappingDialog.value = false
  currentMappingFile.value = null
  pendingMappings.value = []
}

/**
 * Remove a file from the list
 */
function removeFile(fileId: string, zone: 'target' | 'suppression') {
  const targetList = zone === 'target' ? targetFiles : suppressionFiles
  targetList.value = targetList.value.filter(f => f.id !== fileId)
}

// ============================================
// SET OPERATIONS
// ============================================

/**
 * Normalize row to standard schema using mapped headers
 */
function normalizeRow(row: Record<string, any>, mappedHeaders: Record<string, string>): Record<string, any> {
  const normalized: Record<string, any> = {}
  
  for (const [original, mapped] of Object.entries(mappedHeaders)) {
    const value = row[original]
    if (value && typeof value === 'string' && value.trim()) {
      // If we already have this field, check if new value is better
      if (normalized[mapped]) {
        // Keep longer/more complete value
        if (value.trim().length > normalized[mapped].length) {
          normalized[mapped] = value.trim()
        }
      } else {
        normalized[mapped] = value.trim()
      }
    }
  }

  // Normalize email to lowercase
  if (normalized.email) {
    normalized.email = normalized.email.toLowerCase().trim()
  }

  return normalized
}

/**
 * Get email from normalized row
 */
function getEmail(row: Record<string, any>): string | null {
  const email = row.email
  if (!email || typeof email !== 'string') return null
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim()) ? email.trim().toLowerCase() : null
}

/**
 * Count populated fields in a row
 */
function countPopulatedFields(row: Record<string, any>): number {
  return Object.values(row).filter(v => v && String(v).trim()).length
}

/**
 * Process files based on selected operation
 */
async function processLists() {
  isProcessing.value = true
  processedData.value = []
  processingStats.value = { totalRows: 0, duplicatesRemoved: 0, finalCount: 0 }

  try {
    // Gather all normalized data from target files
    const allTargetRows: Record<string, any>[] = []
    for (const file of targetFiles.value) {
      for (const row of file.data) {
        const normalized = normalizeRow(row, file.mappedHeaders)
        if (getEmail(normalized)) {
          allTargetRows.push(normalized)
        }
      }
    }

    processingStats.value.totalRows = allTargetRows.length

    let result: Record<string, any>[] = []

    switch (operationType.value) {
      case 'find_new':
        result = await processFindNew(allTargetRows)
        break
      case 'master_merge':
        result = await processMasterMerge(allTargetRows)
        break
      case 'common_ground':
        result = await processCommonGround()
        break
    }

    processedData.value = result
    processingStats.value.finalCount = result.length
    processingStats.value.duplicatesRemoved = processingStats.value.totalRows - result.length

    if (result.length === 0) {
      toast.warning('No valid records found after processing')
    } else {
      toast.success(`Processed ${processingStats.value.totalRows} rows → ${result.length} unique records`)
    }
  } catch (err) {
    console.error('Processing error:', err)
    toast.error('An error occurred while processing')
  } finally {
    isProcessing.value = false
  }
}

/**
 * Find New Leads (A minus B)
 * Return emails in target that are NOT in suppression list
 */
async function processFindNew(targetRows: Record<string, any>[]): Promise<Record<string, any>[]> {
  // Build suppression set
  const suppressionEmails = new Set<string>()
  
  for (const file of suppressionFiles.value) {
    for (const row of file.data) {
      const normalized = normalizeRow(row, file.mappedHeaders)
      const email = getEmail(normalized)
      if (email) {
        suppressionEmails.add(email)
      }
    }
  }

  // Filter target rows, keeping most populated per email
  const emailMap = new Map<string, Record<string, any>>()
  
  for (const row of targetRows) {
    const email = getEmail(row)
    if (!email || suppressionEmails.has(email)) continue

    const existing = emailMap.get(email)
    if (!existing || countPopulatedFields(row) > countPopulatedFields(existing)) {
      emailMap.set(email, row)
    }
  }

  return Array.from(emailMap.values())
}

/**
 * Master Merge (Union)
 * Combine all files, remove duplicates, keep most populated
 */
async function processMasterMerge(targetRows: Record<string, any>[]): Promise<Record<string, any>[]> {
  const emailMap = new Map<string, Record<string, any>>()
  
  for (const row of targetRows) {
    const email = getEmail(row)
    if (!email) continue

    const existing = emailMap.get(email)
    if (!existing) {
      emailMap.set(email, row)
    } else {
      // Merge: keep the most populated fields from both
      const merged = { ...existing }
      for (const [key, value] of Object.entries(row)) {
        if (value && (!merged[key] || String(value).length > String(merged[key]).length)) {
          merged[key] = value
        }
      }
      emailMap.set(email, merged)
    }
  }

  return Array.from(emailMap.values())
}

/**
 * Common Ground (Intersection)
 * Return only emails that appear in ALL uploaded files
 */
async function processCommonGround(): Promise<Record<string, any>[]> {
  if (targetFiles.value.length === 0) return []
  if (targetFiles.value.length === 1) {
    // Single file - just dedupe
    const file = targetFiles.value[0]
    const emailMap = new Map<string, Record<string, any>>()
    
    for (const row of file.data) {
      const normalized = normalizeRow(row, file.mappedHeaders)
      const email = getEmail(normalized)
      if (email && !emailMap.has(email)) {
        emailMap.set(email, normalized)
      }
    }
    
    return Array.from(emailMap.values())
  }

  // Build email sets for each file
  const fileSets: Set<string>[] = targetFiles.value.map(file => {
    const emailSet = new Set<string>()
    for (const row of file.data) {
      const normalized = normalizeRow(row, file.mappedHeaders)
      const email = getEmail(normalized)
      if (email) emailSet.add(email)
    }
    return emailSet
  })

  // Find intersection
  const intersectionEmails = fileSets.reduce((acc, set) => {
    return new Set([...acc].filter(email => set.has(email)))
  })

  // Get full data for intersection emails (from first file that has it)
  const result: Record<string, any>[] = []
  const added = new Set<string>()

  for (const file of targetFiles.value) {
    for (const row of file.data) {
      const normalized = normalizeRow(row, file.mappedHeaders)
      const email = getEmail(normalized)
      if (email && intersectionEmails.has(email) && !added.has(email)) {
        result.push(normalized)
        added.add(email)
      }
    }
  }

  return result
}

// ============================================
// OUTPUT & EXPORT
// ============================================

/**
 * Generate and download clean CSV
 */
function downloadCleanCSV() {
  if (processedData.value.length === 0) {
    toast.warning('No data to export')
    return
  }

  // Build CSV content
  const headers = [...STANDARD_FIELDS]
  const csvLines = [
    headers.join(','),
    ...processedData.value.map(row => 
      headers.map(h => {
        const value = row[h] || ''
        // Escape quotes and wrap in quotes if contains comma
        if (String(value).includes(',') || String(value).includes('"')) {
          return `"${String(value).replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ]

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `clean-list-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  toast.success(`Exported ${processedData.value.length} records to CSV`)
}

/**
 * Import cleaned data to CRM (marketing_leads)
 */
async function importToCRM() {
  if (processedData.value.length === 0) {
    toast.warning('No data to import')
    return
  }

  if (!sourceTag.value.trim()) {
    toast.warning('Please enter a source tag to track where these leads came from')
    return
  }

  isImporting.value = true
  importProgress.value = 0

  try {
    const leads = processedData.value.map(row => ({
      lead_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || 'Unknown',
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      email: row.email || null,
      phone: row.phone || null,
      company: row.company || null,
      notes: row.notes || null,
      source: sourceTag.value.trim(),
      status: 'new'
    }))

    // Batch insert (Supabase handles conflicts via RLS)
    const batchSize = 100
    let imported = 0

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from('marketing_leads')
        .insert(batch)

      if (error) {
        console.error('Import batch error:', error)
        throw new Error(`Import failed at batch ${i / batchSize + 1}: ${error.message}`)
      }

      imported += batch.length
      importProgress.value = Math.round((imported / leads.length) * 100)
    }

    toast.success(`Successfully imported ${leads.length} leads to CRM with source "${sourceTag.value}"`)
    
    // Reset state
    processedData.value = []
    targetFiles.value = []
    suppressionFiles.value = []
    sourceTag.value = ''
    processingStats.value = { totalRows: 0, duplicatesRemoved: 0, finalCount: 0 }
  } catch (err: any) {
    console.error('CRM import error:', err)
    toast.error(err.message || 'Failed to import leads to CRM')
  } finally {
    isImporting.value = false
    importProgress.value = 0
  }
}

// ============================================
// DRAG & DROP HANDLERS
// ============================================

function handleDragEnter(event: DragEvent, zone: 'target' | 'suppression') {
  event.preventDefault()
  activeDropzone.value = zone
  if (zone === 'target') {
    isDragging.value = true
  } else {
    isDraggingSuppression.value = true
  }
}

function handleDragLeave(event: DragEvent, zone: 'target' | 'suppression') {
  event.preventDefault()
  // Only reset if we're leaving the dropzone completely
  const relatedTarget = event.relatedTarget as HTMLElement
  if (!relatedTarget || !event.currentTarget || !(event.currentTarget as HTMLElement).contains(relatedTarget)) {
    if (zone === 'target') {
      isDragging.value = false
    } else {
      isDraggingSuppression.value = false
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
}

// ============================================
// COMPUTED
// ============================================

const canProcess = computed(() => {
  if (operationType.value === 'find_new') {
    return targetFiles.value.length > 0 && suppressionFiles.value.length > 0
  }
  return targetFiles.value.length > 0
})

const hasProcessedData = computed(() => processedData.value.length > 0)

// Required fields that must always appear in output
const REQUIRED_OUTPUT_FIELDS = ['email', 'first_name', 'last_name'] as const

// Count of records missing required name fields
const recordsMissingNames = computed(() => {
  return processedData.value.filter(row => !row.first_name || !row.last_name).length
})

// Preview table headers - always show required fields first, then populated optional fields
const previewHeaders = computed(() => {
  // Always include required fields
  const requiredHeaders = REQUIRED_OUTPUT_FIELDS.map(f => ({
    key: f,
    title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    required: true
  }))
  
  // Add optional fields that have data
  const optionalFields = STANDARD_FIELDS.filter(f => 
    !REQUIRED_OUTPUT_FIELDS.includes(f as any) && 
    processedData.value.some(row => row[f])
  )
  const optionalHeaders = optionalFields.map(f => ({
    key: f,
    title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    required: false
  }))
  
  return [...requiredHeaders, ...optionalHeaders]
})
</script>

<template>
  <div class="list-hygiene-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          <v-icon class="mr-2" color="primary">mdi-filter-variant</v-icon>
          List Hygiene
        </h1>
        <p class="text-body-1 text-grey-darken-1">
          Clean, merge, and filter external contact lists before CRM import
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="targetFiles.length > 0 || suppressionFiles.length > 0"
          variant="outlined"
          color="error"
          prepend-icon="mdi-delete-sweep"
          @click="targetFiles = []; suppressionFiles = []; processedData = []"
        >
          Clear All
        </v-btn>
      </div>
    </div>

    <!-- Operation Selection -->
    <v-card class="mb-6" rounded="lg">
      <v-card-title class="pb-1">
        <v-icon class="mr-2" size="20">mdi-cog-outline</v-icon>
        Recipe Selection
      </v-card-title>
      <v-card-text>
        <v-radio-group v-model="operationType" inline hide-details class="mt-0">
          <v-radio
            v-for="op in operationOptions"
            :key="op.value"
            :value="op.value"
            :color="op.color"
            class="mr-6"
          >
            <template #label>
              <div class="d-flex align-center">
                <v-icon :icon="op.icon" :color="op.color" class="mr-2" size="20" />
                <div>
                  <div class="font-weight-medium">{{ op.title }}</div>
                  <div class="text-caption text-grey">{{ op.subtitle }}</div>
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
    </v-card>

    <!-- Dropzones Grid -->
    <v-row class="mb-6">
      <!-- Target List Dropzone -->
      <v-col :cols="showSuppressionZone ? 6 : 12">
        <v-card 
          class="dropzone-card" 
          :class="{ 'dropzone-active': isDragging }"
          rounded="lg"
          @dragenter="handleDragEnter($event, 'target')"
          @dragleave="handleDragLeave($event, 'target')"
          @dragover="handleDragOver"
          @drop="handleFileDrop($event, 'target')"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-file-upload</v-icon>
            {{ showSuppressionZone ? 'Target List (New Leads)' : 'Drop CSV Files Here' }}
            <v-chip class="ml-2" size="small" color="primary" variant="tonal">
              {{ targetFiles.length }} file{{ targetFiles.length !== 1 ? 's' : '' }}
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <!-- Loading Overlay -->
            <div v-if="isLoadingFiles" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
              <div class="text-body-1">Processing files...</div>
            </div>
            
            <!-- Upload Zone -->
            <div 
              v-else
              class="upload-zone text-center py-8 mb-4 rounded-lg"
              :class="{ 'upload-zone-active': isDragging }"
            >
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-cloud-upload</v-icon>
              <div class="text-body-1 mb-2">Drag & drop CSV files here</div>
              <div class="text-caption text-grey mb-4">or</div>
              <v-btn 
                color="primary" 
                variant="outlined"
                prepend-icon="mdi-folder-open"
                @click="targetFileInput?.click()"
              >
                Browse Files
              </v-btn>
              <input
                ref="targetFileInput"
                type="file"
                accept=".csv,text/csv,application/csv,text/plain"
                multiple
                hidden
                @change="handleFileInput($event, 'target')"
              />
            </div>

            <!-- File Chips -->
            <div v-if="targetFiles.length > 0 && !isLoadingFiles" class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="file in targetFiles"
                :key="file.id"
                closable
                :color="file.isMapping ? 'warning' : 'success'"
                variant="tonal"
                @click:close="removeFile(file.id, 'target')"
              >
                <v-icon start size="16">mdi-file-delimited</v-icon>
                {{ file.name }}
                <v-chip size="x-small" class="ml-2" color="grey-lighten-1">
                  {{ file.rowCount }} rows
                </v-chip>
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Suppression List Dropzone (only for Find New) -->
      <v-col v-if="showSuppressionZone" cols="6">
        <v-card 
          class="dropzone-card" 
          :class="{ 'dropzone-active': isDraggingSuppression }"
          rounded="lg"
          @dragenter="handleDragEnter($event, 'suppression')"
          @dragleave="handleDragLeave($event, 'suppression')"
          @dragover="handleDragOver"
          @drop="handleFileDrop($event, 'suppression')"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="error">mdi-file-remove</v-icon>
            Suppression List (Existing/Clients)
            <v-chip class="ml-2" size="small" color="error" variant="tonal">
              {{ suppressionFiles.length }} file{{ suppressionFiles.length !== 1 ? 's' : '' }}
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <!-- Upload Zone -->
            <div 
              class="upload-zone upload-zone-suppression text-center py-8 mb-4 rounded-lg"
              :class="{ 'upload-zone-active': isDraggingSuppression }"
            >
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-cloud-upload</v-icon>
              <div class="text-body-1 mb-2">Drop suppression list(s)</div>
              <div class="text-caption text-grey mb-4">Emails to exclude from target</div>
              <v-btn 
                color="error" 
                variant="outlined"
                prepend-icon="mdi-folder-open"
                @click="suppressionFileInput?.click()"
              >
                Browse Files
              </v-btn>
              <input
                ref="suppressionFileInput"
                type="file"
                accept=".csv,text/csv,application/csv,text/plain"
                multiple
                hidden
                @change="handleFileInput($event, 'suppression')"
              />
            </div>

            <!-- File Chips -->
            <div v-if="suppressionFiles.length > 0" class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="file in suppressionFiles"
                :key="file.id"
                closable
                color="error"
                variant="tonal"
                @click:close="removeFile(file.id, 'suppression')"
              >
                <v-icon start size="16">mdi-file-delimited</v-icon>
                {{ file.name }}
                <v-chip size="x-small" class="ml-2" color="grey-lighten-1">
                  {{ file.rowCount }} rows
                </v-chip>
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Process Button -->
    <div class="text-center mb-6">
      <v-btn
        size="large"
        color="primary"
        :disabled="!canProcess"
        :loading="isProcessing"
        prepend-icon="mdi-play-circle"
        @click="processLists"
      >
        Process Lists
      </v-btn>
      <div v-if="!canProcess" class="text-caption text-grey mt-2">
        <template v-if="operationType === 'find_new'">
          Add files to both Target and Suppression zones
        </template>
        <template v-else>
          Add at least one CSV file to process
        </template>
      </div>
    </div>

    <!-- Results Section -->
    <v-expand-transition>
      <v-card v-if="hasProcessedData" rounded="lg" class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
            Processing Complete
          </div>
          <div class="d-flex gap-2">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="14">mdi-file-document</v-icon>
              {{ processingStats.totalRows }} input rows
            </v-chip>
            <v-chip color="warning" variant="tonal" size="small">
              <v-icon start size="14">mdi-content-duplicate</v-icon>
              {{ processingStats.duplicatesRemoved }} removed
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="14">mdi-account-check</v-icon>
              {{ processingStats.finalCount }} unique
            </v-chip>
          </div>
        </v-card-title>

        <v-divider />

        <!-- Warning for missing names -->
        <v-alert
          v-if="recordsMissingNames > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="mx-4 mt-4"
          icon="mdi-alert"
        >
          <strong>{{ recordsMissingNames }}</strong> of {{ processedData.length }} records are missing first name or last name.
          Consider mapping name columns in your source files.
        </v-alert>

        <!-- Preview Table -->
        <v-card-text>
          <div class="text-subtitle-2 mb-2">Preview (first 10 rows)</div>
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th 
                  v-for="header in previewHeaders" 
                  :key="header.key"
                  :class="{ 'text-primary font-weight-bold': header.required }"
                >
                  {{ header.title }}
                  <span v-if="header.required" class="text-error">*</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in processedData.slice(0, 10)" :key="idx">
                <td 
                  v-for="header in previewHeaders" 
                  :key="header.key"
                  :class="{ 'text-error': header.required && !row[header.key] }"
                >
                  <template v-if="row[header.key]">
                    {{ row[header.key] }}
                  </template>
                  <span v-else class="text-grey-lighten-1">
                    {{ header.required ? '(missing)' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="processedData.length > 10" class="text-caption text-grey text-center mt-2">
            ... and {{ processedData.length - 10 }} more rows
          </div>
        </v-card-text>

        <v-divider />

        <!-- Actions -->
        <v-card-actions class="pa-4">
          <v-row align="center">
            <v-col cols="12" md="6">
              <v-btn
                color="secondary"
                variant="outlined"
                prepend-icon="mdi-download"
                @click="downloadCleanCSV"
              >
                Download Clean CSV
              </v-btn>
            </v-col>
            <v-col cols="12" md="6">
              <div class="d-flex align-center gap-3">
                <v-text-field
                  v-model="sourceTag"
                  label="Source Tag"
                  placeholder="e.g., Event_X_2026"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-tag"
                  style="max-width: 200px"
                />
                <v-btn
                  color="primary"
                  :loading="isImporting"
                  :disabled="!sourceTag.trim()"
                  prepend-icon="mdi-database-import"
                  @click="importToCRM"
                >
                  Import to CRM
                </v-btn>
              </div>
              <v-progress-linear
                v-if="isImporting"
                :model-value="importProgress"
                color="primary"
                class="mt-2"
                height="4"
                rounded
              />
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <!-- Header Mapping Dialog -->
    <v-dialog v-model="showMappingDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-head-question</v-icon>
          Confirm Header Mappings
        </v-card-title>
        <v-card-subtitle>
          Some column headers need confirmation for: {{ currentMappingFile?.name }}
        </v-card-subtitle>
        <v-card-text>
          <v-list>
            <v-list-item v-for="(mapping, idx) in pendingMappings" :key="idx">
              <template #prepend>
                <v-icon color="grey">mdi-table-column</v-icon>
              </template>
              <v-list-item-title>
                "{{ mapping.original }}"
              </v-list-item-title>
              <template #append>
                <v-select
                  v-model="mapping.suggested"
                  :items="STANDARD_FIELDS"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 150px"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showMappingDialog = false">Skip</v-btn>
          <v-btn color="primary" @click="confirmMappings">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.list-hygiene-page {
  max-width: 1400px;
  margin: 0 auto;
}

.dropzone-card {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  transition: all 0.3s ease;
}

.dropzone-card.dropzone-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.upload-zone {
  border: 2px dashed #e0e0e0;
  background-color: #fafafa;
  transition: all 0.3s ease;
}

.upload-zone.upload-zone-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.upload-zone-suppression.upload-zone-active {
  border-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.08);
}
</style>
