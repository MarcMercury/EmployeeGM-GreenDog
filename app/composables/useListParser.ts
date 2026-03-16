/**
 * List Parser Composable — CSV parsing, header mapping, and file management
 *
 * Extracted from the List Hygiene page for testability and reuse.
 * Handles file reading, CSV parsing with auto-header detection,
 * and AI-heuristic header-to-schema mapping.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ParsedFile {
  id: string
  name: string
  rowCount: number
  headers: string[]
  mappedHeaders: Record<string, string>
  data: Record<string, any>[]
  isMapping: boolean
}

export interface MappingCandidate {
  original: string
  suggested: string
  confidence: number
}

export const STANDARD_FIELDS = ['email', 'first_name', 'last_name', 'phone', 'company', 'notes', 'source'] as const
export type StandardField = typeof STANDARD_FIELDS[number]

// ============================================
// COMPOSABLE
// ============================================

export function useListParser() {
  const toast = useToast()

  // Reactive state
  const targetFiles = ref<ParsedFile[]>([])
  const suppressionFiles = ref<ParsedFile[]>([])
  const isDragging = ref(false)
  const isDraggingSuppression = ref(false)
  const isLoadingFiles = ref(false)

  // Mapping dialog state
  const showMappingDialog = ref(false)
  const currentMappingFile = ref<ParsedFile | null>(null)
  const pendingMappings = ref<MappingCandidate[]>([])

  // Template refs for file inputs
  const targetFileInput = ref<HTMLInputElement | null>(null)
  const suppressionFileInput = ref<HTMLInputElement | null>(null)

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /** Generate a unique ID (with fallback for non-HTTPS contexts) */
  function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)
  }

  /**
   * Auto-detect the field delimiter used in a CSV/TSV file.
   * Checks the first few lines for tabs, semicolons, pipes, or commas.
   */
  function detectDelimiter(content: string): string {
    const sampleLines = content.split(/\r?\n/).slice(0, 5).filter(l => l.trim())
    const delimiters = ['\t', ';', '|', ',']

    let bestDelimiter = ','
    let bestScore = 0

    for (const d of delimiters) {
      // Count occurrences per line, then check consistency
      const counts = sampleLines.map(line => {
        let count = 0
        let inQuotes = false
        for (const ch of line) {
          if (ch === '"') inQuotes = !inQuotes
          else if (ch === d && !inQuotes) count++
        }
        return count
      })

      // Score: high if consistent non-zero count across lines
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length
      const allNonZero = counts.every(c => c > 0)
      const score = allNonZero ? avgCount * 10 : avgCount

      if (score > bestScore) {
        bestScore = score
        bestDelimiter = d
      }
    }

    if (bestDelimiter !== ',') {
      console.log(`[ListParser] Auto-detected delimiter: ${bestDelimiter === '\t' ? 'TAB' : `"${bestDelimiter}"`}`)
    }
    return bestDelimiter
  }

  /**
   * Parse a single CSV/TSV line handling quoted values.
   * Accepts a configurable delimiter (defaults to comma).
   */
  function parseCSVLine(line: string, delimiter: string = ','): string[] {
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
      } else if (char === delimiter && !inQuotes) {
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
   * Detect which line contains the actual headers.
   * Looks for lines containing common header patterns like email, phone, name, etc.
   */
  function detectHeaderRow(lines: string[]): number {
    const headerPatterns = [
      /e-?mail/i, /phone/i, /tel/i, /mobile/i,
      /first.?name/i, /last.?name/i, /^name$/i,
      /contact/i, /address/i, /city/i, /state/i, /zip/i,
    ]

    const maxLinesToCheck = Math.min(10, lines.length)

    for (let i = 0; i < maxLinesToCheck; i++) {
      const line: string | undefined = lines[i]
      if (line === undefined) continue
      const parsed = parseCSVLine(line)
      let matchCount = 0
      for (const cell of parsed) {
        for (const pattern of headerPatterns) {
          if (pattern.test(cell)) {
            matchCount++
            break
          }
        }
      }
      if (matchCount >= 2) {
        return i
      }
    }

    return 0
  }

  /**
   * Strip BOM (Byte Order Mark) from the beginning of file content.
   */
  function stripBOM(content: string): string {
    if (content.charCodeAt(0) === 0xFEFF) {
      console.log('[ListParser] Stripped UTF-8 BOM from file')
      return content.slice(1)
    }
    return content
  }

  /**
   * Parse CSV/TSV content into rows.
   * Automatically detects delimiter, header row, and handles BOM.
   */
  function parseCSV(content: string): { headers: string[]; data: Record<string, any>[] } {
    const cleanContent = stripBOM(content)
    const delimiter = detectDelimiter(cleanContent)
    const lines = cleanContent.trim().split(/\r?\n/)
    if (lines.length < 2) {
      return { headers: [], data: [] }
    }

    const headerRowIndex = detectHeaderRow(lines)
    const headerLine: string | undefined = lines[headerRowIndex]
    if (headerLine === undefined) return { headers: [], data: [] }
    const headers = parseCSVLine(headerLine, delimiter)

    const data = lines
      .slice(headerRowIndex + 1)
      .map(line => parseCSVLine(line, delimiter))
      .filter(row => row.some(cell => cell.trim()))
      .filter(row => {
        const nonEmptyCells = row.filter(cell => cell.trim()).length
        const firstCell = row[0]?.trim() || ''
        const secondCell = row[1]?.trim() || ''

        // Skip rows that look like repeated header rows
        if (
          /^e-?mail$/i.test(secondCell) || /^phone$/i.test(secondCell) ||
          /^new\s*clients?$/i.test(firstCell) || /^name$/i.test(firstCell)
        ) {
          return false
        }

        // Skip rows with only 1-2 non-empty cells that look like section headers
        if (nonEmptyCells <= 2) {
          if (
            /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(firstCell) ||
            /^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(firstCell)
          ) {
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

    return { headers, data }
  }

  /** Read file content as text using FileReader */
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
   * AI-assisted header mapping.
   * Maps ambiguous headers to our standard schema.
   */
  function mapHeaders(headers: string[]): { mapped: Record<string, string>; candidates: MappingCandidate[] } {
    const mapped: Record<string, string> = {}
    const candidates: MappingCandidate[] = []

    const fieldPatterns: Record<StandardField, RegExp[]> = {
      email: [/e-?mail/i, /email.?addr/i, /e.?mail/i, /correo/i, /email\s*address/i, /e-mail\s*address/i, /^email$/i, /email\s*addresses/i],
      first_name: [/first.?name/i, /f.?name/i, /given.?name/i, /nombre/i, /fname/i, /^first$/i, /contact\s*first\s*name/i, /new\s*clients?/i],
      last_name: [/last.?name/i, /l.?name/i, /surname/i, /family.?name/i, /apellido/i, /lname/i, /^last$/i, /contact\s*last\s*name/i],
      phone: [
        /phone/i, /tel/i, /mobile/i, /cell/i, /telefono/i,
        /phone\s*#/i, /phone\s*number/i, /telephone/i, /fax/i,
        /contact\s*number/i, /work\s*phone/i, /home\s*phone/i, /cell\s*phone/i,
        /mobile\s*phone/i, /primary\s*phone/i, /main\s*phone/i, /business\s*phone/i,
        /daytime\s*phone/i, /evening\s*phone/i, /^#$/i, /ph\.?/i,
      ],
      company: [/company/i, /org/i, /business/i, /employer/i, /empresa/i, /clinic/i, /hospital/i],
      notes: [/notes?/i, /comment/i, /remark/i, /notas/i, /description/i],
      source: [/source/i, /origin/i, /channel/i, /fuente/i, /how.?heard/i, /referr/i],
    }

    headers.forEach(header => {
      const headerLower = header.toLowerCase().trim()
      let bestMatch: { field: StandardField; confidence: number } | null = null

      for (const field of STANDARD_FIELDS) {
        if (headerLower === field) {
          mapped[header] = field
          return
        }
      }

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
        candidates.push({
          original: header,
          suggested: bestMatch.field,
          confidence: bestMatch.confidence,
        })
      } else {
        mapped[header] = header
      }
    })

    return { mapped, candidates }
  }

  // ============================================
  // FILE HANDLING
  // ============================================

  /** Handle file drop */
  async function handleFileDrop(event: DragEvent, zone: 'target' | 'suppression') {
    event.preventDefault()
    isDragging.value = false
    isDraggingSuppression.value = false

    const files = event.dataTransfer?.files
    if (!files) return

    await processFiles(Array.from(files), zone)
  }

  /** Handle file input change */
  async function handleFileInput(event: Event, zone: 'target' | 'suppression') {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files) return

    await processFiles(Array.from(files), zone)
    input.value = '' // Reset for re-upload of same file
  }

  /** Process uploaded files */
  async function processFiles(files: File[], zone: 'target' | 'suppression') {
    const targetList = zone === 'target' ? targetFiles : suppressionFiles
    isLoadingFiles.value = true

    for (const file of files) {
      const validExtensions = ['.csv', '.txt']
      const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

      if (!hasValidExt) {
        toast.warning(`Skipped ${file.name} - only CSV files are supported`)
        continue
      }

      try {
        const content = await readFileAsText(file)
        const { headers, data } = parseCSV(content)

        console.log(`[ListParser] ${file.name}: ${headers.length} headers, ${data.length} rows`)
        console.log(`[ListParser] Headers:`, headers)

        if (headers.length === 0) {
          toast.error(`${file.name} appears to be empty or invalid`)
          continue
        }

        if (headers.length === 1 && data.length > 0) {
          console.warn(`[ListParser] ${file.name}: Only 1 column detected — file may use an unsupported delimiter`)
          toast.warning(`${file.name}: Only 1 column detected. Check the file format.`)
        }

        const { mapped, candidates } = mapHeaders(headers)

        console.log(`[ListParser] ${file.name} mappings:`, mapped)
        if (candidates.length > 0) {
          console.log(`[ListParser] ${file.name} needs confirmation:`, candidates)
        }

        // Warn if no column mapped to email or phone
        const mappedFields = Object.values(mapped)
        if (!mappedFields.includes('email') && !mappedFields.includes('phone')) {
          console.warn(`[ListParser] ${file.name}: No email or phone column detected!`)
          toast.warning(`${file.name}: No email or phone column found — processing may produce 0 results`)
        }

        const parsedFile: ParsedFile = {
          id: generateId(),
          name: file.name,
          rowCount: data.length,
          headers,
          mappedHeaders: mapped,
          data,
          isMapping: candidates.length > 0,
        }

        targetList.value.push(parsedFile)

        if (candidates.length > 0) {
          currentMappingFile.value = parsedFile
          pendingMappings.value = candidates
          showMappingDialog.value = true
        }

        toast.success(`Loaded ${file.name} (${data.length} rows, ${headers.length} columns)`)
      } catch (err) {
        console.error('Error parsing file:', err)
        toast.error(`Failed to parse ${file.name}`)
      }
    }

    isLoadingFiles.value = false
  }

  /** Confirm header mappings from dialog */
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

  /** Skip mapping — apply suggested defaults and mark file as ready */
  function skipMappings() {
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

  /** Remove a file from the list */
  function removeFile(fileId: string, zone: 'target' | 'suppression') {
    const targetList = zone === 'target' ? targetFiles : suppressionFiles
    targetList.value = targetList.value.filter(f => f.id !== fileId)
  }

  // ============================================
  // DRAG & DROP HANDLERS
  // ============================================

  function handleDragEnter(event: DragEvent, zone: 'target' | 'suppression') {
    event.preventDefault()
    if (zone === 'target') {
      isDragging.value = true
    } else {
      isDraggingSuppression.value = true
    }
  }

  function handleDragLeave(event: DragEvent, zone: 'target' | 'suppression') {
    event.preventDefault()
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

  /** Reset all file state */
  function clearAll() {
    targetFiles.value = []
    suppressionFiles.value = []
  }

  return {
    // State
    targetFiles,
    suppressionFiles,
    isDragging,
    isDraggingSuppression,
    isLoadingFiles,
    showMappingDialog,
    currentMappingFile,
    pendingMappings,
    targetFileInput,
    suppressionFileInput,

    // Methods
    handleFileDrop,
    handleFileInput,
    confirmMappings,
    skipMappings,
    removeFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    clearAll,
  }
}
