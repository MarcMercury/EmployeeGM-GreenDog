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
  middleware: ['auth']
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
type MatchField = 'email' | 'phone'

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
const matchField = ref<MatchField>('email')  // Toggle between email and phone matching

// Processing State
const isProcessing = ref(false)
const processedData = ref<Record<string, any>[]>([])
const processingStats = ref({
  totalRows: 0,
  duplicatesRemoved: 0,
  finalCount: 0,
  multiEmailSplit: 0  // Count of extra rows created from multi-email cells
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
    subtitle: 'Return records in Target but NOT in Suppression list',
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
    subtitle: 'Return only records that appear in ALL files',
    icon: 'mdi-set-center',
    color: 'info'
  }
] as const

const showSuppressionZone = computed(() => operationType.value === 'find_new')

// Match field options for Find New Leads
const matchFieldOptions = [
  {
    value: 'email',
    title: 'Match by Email',
    icon: 'mdi-email',
    description: 'Compare and exclude based on email addresses'
  },
  {
    value: 'phone',
    title: 'Match by Phone',
    icon: 'mdi-phone',
    description: 'Compare and exclude based on phone numbers'
  }
] as const

// ============================================
// FILE PARSING & HEADER MAPPING
// ============================================

/**
 * Detect which line contains the actual headers
 * Looks for lines containing common header patterns like email, phone, name, etc.
 */
function detectHeaderRow(lines: string[]): number {
  // Common header patterns to look for
  const headerPatterns = [
    /e-?mail/i,
    /phone/i,
    /tel/i,
    /mobile/i,
    /first.?name/i,
    /last.?name/i,
    /^name$/i,
    /contact/i,
    /address/i,
    /city/i,
    /state/i,
    /zip/i,
  ]
  
  // Check first 10 lines (or less if file is shorter)
  const maxLinesToCheck = Math.min(10, lines.length)
  
  for (let i = 0; i < maxLinesToCheck; i++) {
    const parsed = parseCSVLine(lines[i])
    // Count how many cells match header patterns
    let matchCount = 0
    for (const cell of parsed) {
      for (const pattern of headerPatterns) {
        if (pattern.test(cell)) {
          matchCount++
          break
        }
      }
    }
    // If at least 2 cells look like headers, this is probably the header row
    if (matchCount >= 2) {
      console.log(`[List Hygiene] Detected header row at line ${i + 1}:`, parsed.slice(0, 5).join(', '))
      return i
    }
  }
  
  // Default to first line if no header row detected
  console.log('[List Hygiene] No header row detected, defaulting to line 1')
  return 0
}

/**
 * Parse CSV content into rows
 * Automatically detects header row (handles files with title rows)
 */
function parseCSV(content: string): { headers: string[], data: Record<string, any>[] } {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { headers: [], data: [] }
  }

  // Auto-detect header row (handles files with title rows at the top)
  const headerRowIndex = detectHeaderRow(lines)
  const headers = parseCSVLine(lines[headerRowIndex])
  
  console.log(`[List Hygiene] Using headers from line ${headerRowIndex + 1}:`, headers.slice(0, 5).join(', '))
  
  // Parse data rows (everything after the header row)
  const data = lines.slice(headerRowIndex + 1)
    .map(line => parseCSVLine(line))
    .filter(row => row.some(cell => cell.trim()))
    // Filter out rows that look like section headers or repeated header rows
    .filter(row => {
      const nonEmptyCells = row.filter(cell => cell.trim()).length
      const firstCell = row[0]?.trim() || ''
      const secondCell = row[1]?.trim() || ''
      
      // Skip rows that look like repeated header rows (contain "email", "phone" as values)
      if (/^e-?mail$/i.test(secondCell) || /^phone$/i.test(secondCell) || 
          /^new\s*clients?$/i.test(firstCell) || /^name$/i.test(firstCell)) {
        console.log(`[List Hygiene] Skipping repeated header row: "${firstCell}, ${secondCell}"`)
        return false
      }
      
      // Skip rows with only 1-2 non-empty cells that look like section headers
      if (nonEmptyCells <= 2) {
        // Check if it looks like a date or section header (e.g., "6/14/25 Fluffology")
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstCell) || 
            /^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(firstCell)) {
          console.log(`[List Hygiene] Skipping section header: "${firstCell}"`)
          return false
        }
      }
      return true
    })
    .map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, idx) => {
        obj[header] = row[idx] || ''
      })
      return obj
    })

  console.log(`[List Hygiene] Parsed ${data.length} data rows`)
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
    email: [/e-?mail/i, /email.?addr/i, /e.?mail/i, /correo/i, /email\s*address/i, /e-mail\s*address/i, /^email$/i, /email\s*addresses/i],
    first_name: [/first.?name/i, /f.?name/i, /given.?name/i, /nombre/i, /fname/i, /^first$/i, /contact\s*first\s*name/i, /new\s*clients?/i],
    last_name: [/last.?name/i, /l.?name/i, /surname/i, /family.?name/i, /apellido/i, /lname/i, /^last$/i, /contact\s*last\s*name/i],
    phone: [
      /phone/i, /tel/i, /mobile/i, /cell/i, /telefono/i,
      /phone\s*#/i, /phone\s*number/i, /telephone/i, /fax/i,
      /contact\s*number/i, /work\s*phone/i, /home\s*phone/i, /cell\s*phone/i,
      /mobile\s*phone/i, /primary\s*phone/i, /main\s*phone/i, /business\s*phone/i,
      /daytime\s*phone/i, /evening\s*phone/i, /^#$/i, /ph\.?/i
    ],
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
 * Extract all valid emails from a potentially multi-email string
 * Handles space-separated, comma-separated, and semicolon-separated emails
 */
function extractEmails(emailString: string): string[] {
  if (!emailString || typeof emailString !== 'string') return []
  
  // Split by common delimiters: space, comma, semicolon
  const parts = emailString.split(/[\s,;]+/).filter(s => s.trim())
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  return parts
    .map(p => p.trim().toLowerCase())
    .filter(p => emailRegex.test(p))
}

/**
 * Normalize a phone number to digits only for consistent matching
 * Strips all non-digit characters, handles various formats:
 * - (310) 555-1234 -> 3105551234
 * - 310-555-1234 -> 3105551234
 * - 310.555.1234 -> 3105551234
 * - +1 310 555 1234 -> 13105551234
 * - 3105551234 -> 3105551234
 */
function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Handle US numbers - if 11 digits starting with 1, keep as-is
  // If 10 digits, that's the standard format
  // If less than 10 or more than 11, might be invalid or international
  return digitsOnly
}

/**
 * Extract all valid phone numbers from a potentially multi-phone string
 * Handles various separators and formats
 */
function extractPhones(phoneString: string): string[] {
  if (!phoneString || typeof phoneString !== 'string') return []
  
  // First, try to split by obvious delimiters that separate multiple phones
  // Common separators: comma, semicolon, slash, "or", newline
  const parts = phoneString.split(/[,;\/]|\bor\b|\n/i).filter(s => s.trim())
  
  const validPhones: string[] = []
  
  for (const part of parts) {
    const normalized = normalizePhone(part)
    
    // Consider valid if 10 digits (US) or 11 digits (US with country code)
    // Also accept 7 digits (local) though less common
    if (normalized.length >= 7 && normalized.length <= 15) {
      // Avoid duplicates
      if (!validPhones.includes(normalized)) {
        validPhones.push(normalized)
      }
    }
  }
  
  return validPhones
}

/**
 * Get the match value (email or phone) from a normalized row based on matchField setting
 */
function getMatchValue(row: Record<string, any>): string | null {
  if (matchField.value === 'email') {
    return getEmail(row)
  } else {
    return getPhone(row)
  }
}

/**
 * Get phone from normalized row (normalized to digits only)
 */
function getPhone(row: Record<string, any>): string | null {
  const phone = row.phone
  if (!phone || typeof phone !== 'string') return null
  
  const normalized = normalizePhone(phone)
  
  // Valid if 7-15 digits
  return normalized.length >= 7 && normalized.length <= 15 ? normalized : null
}

/**
 * Normalize row to standard schema using mapped headers
 * Returns an ARRAY of rows (in case email/phone cell contains multiple values)
 * The expansion is based on the current matchField setting
 */
function normalizeRow(row: Record<string, any>, mappedHeaders: Record<string, string>): Record<string, any>[] {
  const baseNormalized: Record<string, any> = {}
  let rawEmailValue = ''
  let rawPhoneValue = ''
  
  for (const [original, mapped] of Object.entries(mappedHeaders)) {
    const value = row[original]
    if (value && typeof value === 'string' && value.trim()) {
      if (mapped === 'email') {
        // Store raw email for multi-email extraction
        rawEmailValue = value.trim()
      } else if (mapped === 'phone') {
        // Store raw phone for multi-phone extraction
        rawPhoneValue = value.trim()
      } else {
        // If we already have this field, check if new value is better
        if (baseNormalized[mapped]) {
          // Keep longer/more complete value
          if (value.trim().length > baseNormalized[mapped].length) {
            baseNormalized[mapped] = value.trim()
          }
        } else {
          baseNormalized[mapped] = value.trim()
        }
      }
    }
  }

  // Handle based on match field
  if (matchField.value === 'phone') {
    // Extract phones for phone-based matching
    const phones = extractPhones(rawPhoneValue)
    
    // Also extract email if present (for the record, not for matching)
    const emails = extractEmails(rawEmailValue)
    if (emails.length > 0) {
      baseNormalized.email = emails[0]
    }
    
    if (phones.length === 0) {
      // No valid phones - return empty array
      return []
    }
    
    if (phones.length === 1) {
      return [{ ...baseNormalized, phone: phones[0] }]
    }
    
    // Multiple phones - create a separate row for each
    return phones.map(phone => ({ ...baseNormalized, phone }))
  } else {
    // Extract emails for email-based matching (default)
    const emails = extractEmails(rawEmailValue)
    
    // Also extract phone if present (for the record, not for matching)
    const phones = extractPhones(rawPhoneValue)
    if (phones.length > 0) {
      baseNormalized.phone = phones[0]
    }
    
    if (emails.length === 0) {
      // No valid emails - return empty array
      return []
    }
    
    if (emails.length === 1) {
      return [{ ...baseNormalized, email: emails[0] }]
    }
    
    // Multiple emails - create a separate row for each
    return emails.map(email => ({ ...baseNormalized, email }))
  }
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
  console.log('[List Hygiene] processLists started')
  console.log('[List Hygiene] Operation type:', operationType.value)
  console.log('[List Hygiene] Target files:', targetFiles.value.length)
  console.log('[List Hygiene] Suppression files:', suppressionFiles.value.length)
  
  isProcessing.value = true
  processedData.value = []
  processingStats.value = { totalRows: 0, duplicatesRemoved: 0, finalCount: 0, multiEmailSplit: 0 }

  try {
    // Gather all normalized data from target files
    // Note: normalizeRow returns an array (handles multi-email cells)
    const allTargetRows: Record<string, any>[] = []
    let multiEmailCount = 0
    
    for (const file of targetFiles.value) {
      console.log('[List Hygiene] Processing target file:', file.name)
      console.log('[List Hygiene] Target file headers:', file.headers)
      console.log('[List Hygiene] Target file mappedHeaders:', file.mappedHeaders)
      console.log('[List Hygiene] Target file data rows:', file.data.length)
      
      // Log first row for debugging
      if (file.data.length > 0) {
        console.log('[List Hygiene] First raw row:', file.data[0])
      }
      
      for (const row of file.data) {
        const normalizedRows = normalizeRow(row, file.mappedHeaders)
        
        // Track when we split multi-email cells
        if (normalizedRows.length > 1) {
          multiEmailCount += normalizedRows.length - 1
        }
        
        for (const normalized of normalizedRows) {
          if (getEmail(normalized)) {
            allTargetRows.push(normalized)
          }
        }
      }
    }
    
    console.log('[List Hygiene] Total normalized target rows with emails:', allTargetRows.length)
    if (allTargetRows.length > 0) {
      console.log('[List Hygiene] Sample normalized row:', allTargetRows[0])
    }

    processingStats.value.totalRows = allTargetRows.length
    processingStats.value.multiEmailSplit = multiEmailCount

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
 * Return records in target that are NOT in suppression list
 * Matching is based on matchField setting (email or phone)
 */
async function processFindNew(targetRows: Record<string, any>[]): Promise<Record<string, any>[]> {
  const fieldName = matchField.value
  console.log('[List Hygiene] processFindNew started with', targetRows.length, 'target rows')
  console.log('[List Hygiene] Match field:', fieldName)
  console.log('[List Hygiene] Suppression files count:', suppressionFiles.value.length)
  
  // Build suppression set based on match field
  const suppressionValues = new Set<string>()
  
  for (const file of suppressionFiles.value) {
    console.log('[List Hygiene] Processing suppression file:', file.name, 'with', file.data.length, 'rows')
    console.log('[List Hygiene] Suppression file mappedHeaders:', file.mappedHeaders)
    
    for (const row of file.data) {
      const normalizedRows = normalizeRow(row, file.mappedHeaders)
      for (const normalized of normalizedRows) {
        const value = getMatchValue(normalized)
        if (value) {
          suppressionValues.add(value)
        }
      }
    }
  }
  
  console.log('[List Hygiene] Suppression set built with', suppressionValues.size, 'unique', fieldName + 's')
  
  // Log a sample of targetRows for debugging
  if (targetRows.length > 0) {
    console.log('[List Hygiene] Sample target row:', targetRows[0])
  }

  // Filter target rows, keeping most populated per match value
  const valueMap = new Map<string, Record<string, any>>()
  let noValueCount = 0
  let suppressedCount = 0
  
  for (const row of targetRows) {
    const value = getMatchValue(row)
    if (!value) {
      noValueCount++
      continue
    }
    if (suppressionValues.has(value)) {
      suppressedCount++
      continue
    }

    const existing = valueMap.get(value)
    if (!existing || countPopulatedFields(row) > countPopulatedFields(existing)) {
      valueMap.set(value, row)
    }
  }

  console.log('[List Hygiene] processFindNew results:', {
    matchField: fieldName,
    targetRowsProcessed: targetRows.length,
    noValueCount,
    suppressedCount,
    uniqueNewLeads: valueMap.size
  })

  return Array.from(valueMap.values())
}

/**
 * Master Merge (Union)
 * Combine all files, remove duplicates, keep most populated
 * Deduplication is based on matchField setting (email or phone)
 */
async function processMasterMerge(targetRows: Record<string, any>[]): Promise<Record<string, any>[]> {
  const valueMap = new Map<string, Record<string, any>>()
  
  for (const row of targetRows) {
    const value = getMatchValue(row)
    if (!value) continue

    const existing = valueMap.get(value)
    if (!existing) {
      valueMap.set(value, row)
    } else {
      // Merge: keep the most populated fields from both
      const merged = { ...existing }
      for (const [key, val] of Object.entries(row)) {
        if (val && (!merged[key] || String(val).length > String(merged[key]).length)) {
          merged[key] = val
        }
      }
      valueMap.set(value, merged)
    }
  }

  return Array.from(valueMap.values())
}

/**
 * Common Ground (Intersection)
 * Return only records that appear in ALL uploaded files
 * Matching is based on matchField setting (email or phone)
 */
async function processCommonGround(): Promise<Record<string, any>[]> {
  if (targetFiles.value.length === 0) return []
  if (targetFiles.value.length === 1) {
    // Single file - just dedupe
    const file = targetFiles.value[0]
    const valueMap = new Map<string, Record<string, any>>()
    
    for (const row of file.data) {
      const normalizedRows = normalizeRow(row, file.mappedHeaders)
      for (const normalized of normalizedRows) {
        const value = getMatchValue(normalized)
        if (value && !valueMap.has(value)) {
          valueMap.set(value, normalized)
        }
      }
    }
    
    return Array.from(valueMap.values())
  }

  // Build value sets for each file
  const fileSets: Set<string>[] = targetFiles.value.map(file => {
    const valueSet = new Set<string>()
    for (const row of file.data) {
      const normalizedRows = normalizeRow(row, file.mappedHeaders)
      for (const normalized of normalizedRows) {
        const value = getMatchValue(normalized)
        if (value) valueSet.add(value)
      }
    }
    return valueSet
  })

  // Find intersection
  const intersectionValues = fileSets.reduce((acc, set) => {
    return new Set([...acc].filter(value => set.has(value)))
  })

  // Get full data for intersection values (from first file that has it)
  const result: Record<string, any>[] = []
  const added = new Set<string>()

  for (const file of targetFiles.value) {
    for (const row of file.data) {
      const normalizedRows = normalizeRow(row, file.mappedHeaders)
      for (const normalized of normalizedRows) {
        const value = getMatchValue(normalized)
        if (value && intersectionValues.has(value) && !added.has(value)) {
          result.push(normalized)
          added.add(value)
        }
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

// Core fields that should appear in output when available (but not strictly required)
// Email or phone is the key identifier - names are nice to have but not mandatory
const CORE_OUTPUT_FIELDS = ['email', 'phone', 'first_name', 'last_name'] as const

// Count of records missing both email and phone (truly incomplete records)
const recordsMissingIdentifiers = computed(() => {
  return processedData.value.filter(row => !row.email && !row.phone).length
})

// Preview table headers - show core fields first (if they have data), then other populated fields
const previewHeaders = computed(() => {
  // Include core fields that have data in any row
  const coreHeaders = CORE_OUTPUT_FIELDS
    .filter(f => processedData.value.some(row => row[f]))
    .map(f => ({
      key: f,
      title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      required: f === 'email' || f === 'phone' // Only email/phone are truly required identifiers
    }))
  
  // Add other optional fields that have data
  const optionalFields = STANDARD_FIELDS.filter(f => 
    !CORE_OUTPUT_FIELDS.includes(f as any) && 
    processedData.value.some(row => row[f])
  )
  const optionalHeaders = optionalFields.map(f => ({
    key: f,
    title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    required: false
  }))
  
  return [...coreHeaders, ...optionalHeaders]
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
        
        <!-- Match Field Toggle - Only show for Find New Leads -->
        <v-expand-transition>
          <div v-if="showSuppressionZone" class="mt-4 pt-4" style="border-top: 1px solid rgba(0,0,0,0.1);">
            <div class="text-subtitle-2 mb-2 d-flex align-center">
              <v-icon size="18" class="mr-2">mdi-filter-check</v-icon>
              Match & Exclude By
            </div>
            <v-btn-toggle v-model="matchField" mandatory color="primary" variant="outlined" density="compact">
              <v-btn 
                v-for="opt in matchFieldOptions" 
                :key="opt.value" 
                :value="opt.value"
                size="small"
              >
                <v-icon start size="18">{{ opt.icon }}</v-icon>
                {{ opt.title }}
              </v-btn>
            </v-btn-toggle>
            <div class="text-caption text-grey mt-1">
              {{ matchFieldOptions.find(o => o.value === matchField)?.description }}
            </div>
          </div>
        </v-expand-transition>
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
          <div class="d-flex gap-2 flex-wrap">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="14">mdi-file-document</v-icon>
              {{ processingStats.totalRows }} input rows
            </v-chip>
            <v-chip v-if="processingStats.multiEmailSplit > 0" color="info" variant="tonal" size="small">
              <v-icon start size="14">mdi-email-multiple</v-icon>
              {{ processingStats.multiEmailSplit }} multi-email splits
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

        <!-- Warning for missing identifiers (email AND phone both missing) -->
        <v-alert
          v-if="recordsMissingIdentifiers > 0"
          type="error"
          variant="tonal"
          density="compact"
          class="mx-4 mt-4"
          icon="mdi-alert"
        >
          <strong>{{ recordsMissingIdentifiers }}</strong> of {{ processedData.length }} records are missing both email and phone.
          These records cannot be matched and will be excluded.
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
