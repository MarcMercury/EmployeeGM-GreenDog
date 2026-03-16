/**
 * Set Operations Composable — dedup, find-new, merge, intersection
 *
 * Extracted from the List Hygiene page for testability and reuse.
 * Handles email/phone normalization, multi-value expansion,
 * and the three list operations (Find New, Master Merge, Common Ground).
 */
import type { ParsedFile } from './useListParser'
import { STANDARD_FIELDS } from './useListParser'

export type OperationType = 'find_new' | 'master_merge' | 'common_ground'
export type MatchField = 'email' | 'phone'

export interface ProcessingStats {
  totalRows: number
  duplicatesRemoved: number
  finalCount: number
  multiEmailSplit: number
}

// ============================================
// COMPOSABLE
// ============================================

export function useSetOperations() {
  const toast = useToast()

  // Operation state
  const operationType = ref<OperationType>('master_merge')
  const matchField = ref<MatchField>('email')
  const isProcessing = ref(false)
  const processedData = ref<Record<string, any>[]>([])
  const removedRecords = ref<Record<string, any>[]>([])
  const processingStats = ref<ProcessingStats>({
    totalRows: 0,
    duplicatesRemoved: 0,
    finalCount: 0,
    multiEmailSplit: 0,
  })

  // Removed records dialog
  const showRemovedDialog = ref(false)

  // ============================================
  // OPERATION OPTIONS
  // ============================================

  const operationOptions = [
    {
      value: 'find_new' as const,
      title: 'Find New Leads (A minus B)',
      subtitle: 'Return records in Target but NOT in Suppression list',
      icon: 'mdi-set-left',
      color: 'primary',
    },
    {
      value: 'master_merge' as const,
      title: 'Master Merge (Union)',
      subtitle: 'Combine all files & remove duplicates (keeps most populated)',
      icon: 'mdi-set-all',
      color: 'success',
    },
    {
      value: 'common_ground' as const,
      title: 'Common Ground (Intersection)',
      subtitle: 'Return only records that appear in ALL files',
      icon: 'mdi-set-center',
      color: 'info',
    },
  ] as const

  const matchFieldOptions = [
    {
      value: 'email' as const,
      title: 'Match by Email',
      icon: 'mdi-email',
      description: 'Compare and deduplicate based on email addresses',
    },
    {
      value: 'phone' as const,
      title: 'Match by Phone',
      icon: 'mdi-phone',
      description: 'Compare and deduplicate based on phone numbers',
    },
  ] as const

  const showSuppressionZone = computed(() => operationType.value === 'find_new')

  // Reset match field to email when switching away from find_new
  watch(operationType, (newVal) => {
    if (newVal !== 'find_new') {
      matchField.value = 'email'
    }
  })

  // ============================================
  // NORMALIZATION UTILITIES
  // ============================================

  /** Extract all valid emails from a potentially multi-email string */
  function extractEmails(emailString: string): string[] {
    if (!emailString || typeof emailString !== 'string') return []
    const parts = emailString.split(/[\s,;]+/).filter(s => s.trim())
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return parts.map(p => p.trim().toLowerCase()).filter(p => emailRegex.test(p))
  }

  /**
   * Normalize a phone number to 10-digit US format for consistent matching.
   * Strips non-digit chars, then normalizes 11-digit US numbers (leading 1) to 10 digits.
   */
  function normalizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return ''
    const digitsOnly = phone.replace(/\D/g, '')

    // Normalize 11-digit US numbers: strip leading '1'
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return digitsOnly.slice(1)
    }

    return digitsOnly
  }

  /** Extract all valid phone numbers from a potentially multi-phone string */
  function extractPhones(phoneString: string): string[] {
    if (!phoneString || typeof phoneString !== 'string') return []
    const parts = phoneString.split(/[,;\/]|\bor\b|\n/i).filter(s => s.trim())
    const validPhones: string[] = []

    for (const part of parts) {
      const normalized = normalizePhone(part)
      if (normalized.length >= 7 && normalized.length <= 15) {
        if (!validPhones.includes(normalized)) {
          validPhones.push(normalized)
        }
      }
    }

    return validPhones
  }

  /** Get the match value (email or phone) from a normalized row */
  function getMatchValue(row: Record<string, any>): string | null {
    return matchField.value === 'email' ? getEmail(row) : getPhone(row)
  }

  /** Get email from normalized row */
  function getEmail(row: Record<string, any>): string | null {
    const email = row.email
    if (!email || typeof email !== 'string') return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim()) ? email.trim().toLowerCase() : null
  }

  /** Get phone from normalized row (digits only) */
  function getPhone(row: Record<string, any>): string | null {
    const phone = row.phone
    if (!phone || typeof phone !== 'string') return null
    const normalized = normalizePhone(phone)
    return normalized.length >= 7 && normalized.length <= 15 ? normalized : null
  }

  /**
   * Normalize row to standard schema using mapped headers.
   * Returns an ARRAY of rows (multi-email/phone cells expand to separate rows).
   */
  function normalizeRow(row: Record<string, any>, mappedHeaders: Record<string, string>): Record<string, any>[] {
    const baseNormalized: Record<string, any> = {}
    let rawEmailValue = ''
    let rawPhoneValue = ''

    for (const [original, mapped] of Object.entries(mappedHeaders)) {
      const value = row[original]
      if (value && typeof value === 'string' && value.trim()) {
        if (mapped === 'email') {
          rawEmailValue = value.trim()
        } else if (mapped === 'phone') {
          rawPhoneValue = value.trim()
        } else {
          if (baseNormalized[mapped]) {
            if (value.trim().length > baseNormalized[mapped].length) {
              baseNormalized[mapped] = value.trim()
            }
          } else {
            baseNormalized[mapped] = value.trim()
          }
        }
      }
    }

    if (matchField.value === 'phone') {
      const phones = extractPhones(rawPhoneValue)
      const emails = extractEmails(rawEmailValue)
      if (emails.length > 0) baseNormalized.email = emails[0]
      if (phones.length === 0) return []
      if (phones.length === 1) return [{ ...baseNormalized, phone: phones[0] }]
      return phones.map(phone => ({ ...baseNormalized, phone }))
    } else {
      const emails = extractEmails(rawEmailValue)
      const phones = extractPhones(rawPhoneValue)
      if (phones.length > 0) baseNormalized.phone = phones[0]
      if (emails.length === 0) return []
      if (emails.length === 1) return [{ ...baseNormalized, email: emails[0] }]
      return emails.map(email => ({ ...baseNormalized, email }))
    }
  }

  /** Count populated fields in a row */
  function countPopulatedFields(row: Record<string, any>): number {
    return Object.values(row).filter(v => v && String(v).trim()).length
  }

  // ============================================
  // SET OPERATIONS
  // ============================================

  /** Main entry — process lists based on selected operation */
  async function processLists(
    targetFiles: Ref<ParsedFile[]>,
    suppressionFiles: Ref<ParsedFile[]>,
  ) {
    isProcessing.value = true
    processedData.value = []
    removedRecords.value = []
    processingStats.value = { totalRows: 0, duplicatesRemoved: 0, finalCount: 0, multiEmailSplit: 0 }

    try {
      const allTargetRows: Record<string, any>[] = []
      let multiEmailCount = 0
      let skippedNoMatch = 0

      console.log(`[SetOps] Processing ${targetFiles.value.length} file(s) with operation: ${operationType.value}, match: ${matchField.value}`)

      for (const file of targetFiles.value) {
        let fileRows = 0
        let fileSkipped = 0
        for (const row of file.data) {
          const normalizedRows = normalizeRow(row, file.mappedHeaders)
          if (normalizedRows.length > 1) {
            multiEmailCount += normalizedRows.length - 1
          }
          if (normalizedRows.length === 0) {
            fileSkipped++
          }
          for (const normalized of normalizedRows) {
            if (getMatchValue(normalized)) {
              allTargetRows.push(normalized)
              fileRows++
            } else {
              skippedNoMatch++
            }
          }
        }
        console.log(`[SetOps] File "${file.name}": ${file.data.length} raw → ${fileRows} valid rows (${fileSkipped} had no ${matchField.value}, ${skippedNoMatch} failed match)`)
      }

      console.log(`[SetOps] Total valid rows: ${allTargetRows.length} (${skippedNoMatch} skipped, ${multiEmailCount} multi-splits)`)

      processingStats.value.totalRows = allTargetRows.length
      processingStats.value.multiEmailSplit = multiEmailCount

      let result: Record<string, any>[] = []

      switch (operationType.value) {
        case 'find_new':
          result = processFindNew(allTargetRows, suppressionFiles)
          break
        case 'master_merge':
          result = processMasterMerge(allTargetRows)
          break
        case 'common_ground':
          result = processCommonGround(targetFiles)
          break
      }

      processedData.value = result
      processingStats.value.finalCount = result.length
      processingStats.value.duplicatesRemoved = processingStats.value.totalRows - result.length

      console.log(`[SetOps] Result: ${result.length} unique records (${processingStats.value.duplicatesRemoved} removed)`)

      if (result.length === 0) {
        if (allTargetRows.length === 0) {
          toast.warning(`No records had a valid ${matchField.value}. Check that the CSV has an ${matchField.value} column.`)
        } else if (operationType.value === 'find_new') {
          toast.warning('All records matched the suppression list — 0 new leads found')
        } else if (operationType.value === 'common_ground') {
          toast.warning('No records appeared in all files — 0 common matches')
        } else {
          toast.warning('No valid records found after processing')
        }
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

  /** Find New Leads (A minus B) */
  function processFindNew(
    targetRows: Record<string, any>[],
    suppressionFiles: Ref<ParsedFile[]>,
  ): Record<string, any>[] {
    const suppressionValues = new Set<string>()

    for (const file of suppressionFiles.value) {
      for (const row of file.data) {
        const normalizedRows = normalizeRow(row, file.mappedHeaders)
        for (const normalized of normalizedRows) {
          const value = getMatchValue(normalized)
          if (value) suppressionValues.add(value)
        }
      }
    }

    const valueMap = new Map<string, Record<string, any>>()
    const removed: Array<Record<string, any> & { _removeReason?: string }> = []
    const internalDupes: Array<Record<string, any> & { _removeReason?: string }> = []

    for (const row of targetRows) {
      const value = getMatchValue(row)
      if (!value) continue

      if (suppressionValues.has(value)) {
        removed.push({ ...row, _removeReason: 'Suppression List Match' })
        continue
      }

      const existing = valueMap.get(value)
      if (!existing) {
        valueMap.set(value, row)
      } else {
        if (countPopulatedFields(row) > countPopulatedFields(existing)) {
          internalDupes.push({ ...existing, _removeReason: 'Internal Duplicate' })
          valueMap.set(value, row)
        } else {
          internalDupes.push({ ...row, _removeReason: 'Internal Duplicate' })
        }
      }
    }

    removedRecords.value = [...removed, ...internalDupes]
    return Array.from(valueMap.values())
  }

  /** Master Merge (Union) — combine all, deduplicate, keep most populated */
  function processMasterMerge(targetRows: Record<string, any>[]): Record<string, any>[] {
    const valueMap = new Map<string, Record<string, any>>()

    for (const row of targetRows) {
      const value = getMatchValue(row)
      if (!value) continue

      const existing = valueMap.get(value)
      if (!existing) {
        valueMap.set(value, row)
      } else {
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

  /** Common Ground (Intersection) — only records present in ALL files */
  function processCommonGround(targetFiles: Ref<ParsedFile[]>): Record<string, any>[] {
    if (targetFiles.value.length === 0) return []

    if (targetFiles.value.length === 1) {
      const singleFile = targetFiles.value[0]
      if (!singleFile) return []
      const valueMap = new Map<string, Record<string, any>>()
      for (const row of singleFile.data) {
        const normalizedRows = normalizeRow(row, singleFile.mappedHeaders)
        for (const normalized of normalizedRows) {
          const value = getMatchValue(normalized)
          if (value && !valueMap.has(value)) {
            valueMap.set(value, normalized)
          }
        }
      }
      return Array.from(valueMap.values())
    }

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

    const intersectionValues = fileSets.reduce((acc, set) => {
      return new Set([...acc].filter(value => set.has(value)))
    })

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
  // EXPORT
  // ============================================

  /** Generate and download clean CSV */
  function downloadCleanCSV() {
    if (processedData.value.length === 0) {
      toast.warning('No data to export')
      return
    }

    const headers = [...STANDARD_FIELDS]
    const csvLines = [
      headers.join(','),
      ...processedData.value.map(row =>
        headers
          .map(h => {
            const value = row[h] || ''
            if (String(value).includes(',') || String(value).includes('"') || String(value).includes('\n') || String(value).includes('\r')) {
              return `"${String(value).replace(/"/g, '""')}"`
            }
            return value
          })
          .join(','),
      ),
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

  // ============================================
  // COMPUTED
  // ============================================

  const hasProcessedData = computed(() => processedData.value.length > 0)

  const CORE_OUTPUT_FIELDS = ['email', 'phone', 'first_name', 'last_name'] as const

  const recordsMissingIdentifiers = computed(() => {
    return processedData.value.filter(row => !row.email && !row.phone).length
  })

  const previewHeaders = computed(() => {
    const coreHeaders = CORE_OUTPUT_FIELDS
      .filter(f => processedData.value.some(row => row[f]))
      .map(f => ({
        key: f,
        title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        required: f === 'email' || f === 'phone',
      }))

    const optionalFields = STANDARD_FIELDS.filter(
      f => !CORE_OUTPUT_FIELDS.includes(f as any) && processedData.value.some(row => row[f]),
    )
    const optionalHeaders = optionalFields.map(f => ({
      key: f,
      title: f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      required: false,
    }))

    return [...coreHeaders, ...optionalHeaders]
  })

  return {
    // State
    operationType,
    matchField,
    isProcessing,
    processedData,
    removedRecords,
    processingStats,
    showRemovedDialog,

    // Options
    operationOptions,
    matchFieldOptions,
    showSuppressionZone,

    // Computed
    hasProcessedData,
    recordsMissingIdentifiers,
    previewHeaders,

    // Methods
    processLists,
    downloadCleanCSV,
  }
}
