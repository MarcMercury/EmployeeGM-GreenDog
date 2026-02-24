/**
 * Referral Stats CSV Parser API
 * Parses TWO types of EzyVet reports:
 * 
 * 1. "Referrer Revenue" CSV - Updates revenue totals
 *    Header: Date/Time,Referring Vet Clinic,Referring Vet,Client,Animal,Division,Amount
 *    Updates: total_revenue_all_time
 * 
 * 2. "Referral Statistics" CSV - Updates visit counts and last visit date
 *    Header: Clinic Name,Vet,Date of Last Referral,...,Total Referrals 12 Months,...
 *    Updates: total_referrals_all_time, last_contact_date (but NOT revenue)
 */
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createHash } from 'crypto'

// Report type detection
type ReportType = 'revenue' | 'statistics'

interface ParsedRevenueEntry {
  clinicName: string
  amount: number
  date: string
}

interface ParsedStatisticsEntry {
  clinicName: string
  lastReferralDate: string | null
  totalReferrals12Months: number
}

interface SyncResult {
  reportType: ReportType
  updated: number
  skipped: number
  notMatched: number
  revenueAdded: number
  visitorsAdded: number
  duplicateWarning?: string
  dateRange?: { start: string | null; end: string | null }
  overlapWarning?: string
  details: Array<{
    clinicName: string
    matched: boolean
    matchedTo?: string
    visits: number
    revenue: number
    lastVisitDate?: string
  }>
}

/**
 * Compute a SHA-256 content hash for duplicate detection.
 * Strips whitespace variations so minor formatting changes don't produce a new hash.
 */
function computeContentHash(csvText: string): string {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Extract the min/max date from revenue CSV entries.
 * Revenue CSV dates come from the Date/Time column (first field).
 */
function extractRevenueDateRange(entries: ParsedRevenueEntry[]): { start: string | null; end: string | null } {
  if (entries.length === 0) return { start: null, end: null }

  const dates = entries
    .map(e => {
      // Try parsing common date formats
      const d = new Date(e.date)
      return isNaN(d.getTime()) ? null : d
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  if (dates.length === 0) return { start: null, end: null }
  return {
    start: dates[0].toISOString().split('T')[0],
    end: dates[dates.length - 1].toISOString().split('T')[0]
  }
}

/**
 * Extract date range from statistics CSV (last referral dates).
 */
function extractStatisticsDateRange(entries: ParsedStatisticsEntry[]): { start: string | null; end: string | null } {
  const dates = entries
    .map(e => e.lastReferralDate)
    .filter((d): d is string => d !== null)
    .sort()

  if (dates.length === 0) return { start: null, end: null }
  return { start: dates[0], end: dates[dates.length - 1] }
}

/**
 * Detect which type of report this CSV is based on the header row
 */
function detectReportType(csvText: string): ReportType {
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const firstLine = normalizedText.split('\n')[0].toLowerCase()
  
  // Referral Statistics has "Clinic Name" and "Date of Last Referral" in header
  if (firstLine.includes('clinic name') && firstLine.includes('date of last referral')) {
    return 'statistics'
  }
  
  // Referrer Revenue has "Date/Time" and "Referring Vet Clinic" and "Amount"
  if (firstLine.includes('date/time') && firstLine.includes('referring vet clinic')) {
    return 'revenue'
  }
  
  // Default to revenue format
  return 'revenue'
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Push the last field
  fields.push(current.trim())
  
  return fields
}

/**
 * Parse "Referrer Revenue" CSV content
 * Header: Date/Time,Referring Vet Clinic,Referring Vet,Client,Animal,Division,Amount
 */
function parseRevenueCSV(csvText: string): ParsedRevenueEntry[] {
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')
  const entries: ParsedRevenueEntry[] = []
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = parseCSVLine(line)
    if (fields.length < 7) continue
    
    const dateTime = fields[0].trim()
    const clinicName = fields[1].trim()
    const amountStr = fields[6].trim()
    
    // Only count rows WITH a date (skip summary rows that have empty date)
    if (!dateTime) continue
    
    // Skip "Unknown Clinic" entries
    if (clinicName.toLowerCase() === 'unknown clinic') continue
    
    // Skip empty clinic names
    if (!clinicName) continue
    
    const amount = parseFloat(amountStr.replace(/[,$]/g, '')) || 0
    if (amount <= 0) continue
    
    entries.push({
      clinicName,
      amount,
      date: dateTime
    })
  }
  
  return entries
}

/**
 * Parse "Referral Statistics" CSV content
 * Header: Clinic Name,Vet,Date of Last Referral,Date of Second to Last Referral,Difference,
 *         Total Referrals 6 Months...,Total Referrals 12 Months...,Total Referrals 24 Months...,Monthly Average...
 */
function parseStatisticsCSV(csvText: string): ParsedStatisticsEntry[] {
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')
  const entries: ParsedStatisticsEntry[] = []
  
  // Parse header to find column indices (they may vary)
  const headerLine = lines[0]
  const headerFields = parseCSVLine(headerLine)
  
  // Find column indices
  let clinicNameIdx = headerFields.findIndex(h => h.toLowerCase().includes('clinic name'))
  let lastReferralIdx = headerFields.findIndex(h => h.toLowerCase().includes('date of last referral'))
  let total12MonthsIdx = headerFields.findIndex(h => h.toLowerCase().includes('total referrals 12 months'))
  
  // Fallback to fixed positions if headers not found
  if (clinicNameIdx === -1) clinicNameIdx = 0
  if (lastReferralIdx === -1) lastReferralIdx = 2
  if (total12MonthsIdx === -1) total12MonthsIdx = 6
  
  logger.debug('Statistics CSV columns', 'parse-referrals', { clinicNameIdx, lastReferralIdx, total12MonthsIdx })
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = parseCSVLine(line)
    if (fields.length < 7) continue
    
    const clinicName = fields[clinicNameIdx]?.trim() || ''
    const lastReferralStr = fields[lastReferralIdx]?.trim() || ''
    const total12MonthsStr = fields[total12MonthsIdx]?.trim() || ''
    
    // Skip empty or unknown clinics
    if (!clinicName || clinicName.toLowerCase() === 'unknown') continue
    
    // Parse date (format: MM-DD-YYYY or N/A)
    let lastReferralDate: string | null = null
    if (lastReferralStr && lastReferralStr.toLowerCase() !== 'n/a') {
      // Convert MM-DD-YYYY to YYYY-MM-DD for database
      const parts = lastReferralStr.split('-')
      if (parts.length === 3) {
        const [month, day, year] = parts
        lastReferralDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    
    // Parse referral count
    const totalReferrals12Months = parseInt(total12MonthsStr, 10) || 0
    
    entries.push({
      clinicName,
      lastReferralDate,
      totalReferrals12Months
    })
  }
  
  return entries
}

/**
 * Aggregate revenue entries by clinic name
 */
function aggregateRevenueByClinic(entries: ParsedRevenueEntry[]): Array<{ clinicName: string; totalVisits: number; totalRevenue: number }> {
  const clinicMap = new Map<string, { visits: number; revenue: number }>()
  
  for (const entry of entries) {
    const existing = clinicMap.get(entry.clinicName) || { visits: 0, revenue: 0 }
    existing.visits += 1
    existing.revenue += entry.amount
    clinicMap.set(entry.clinicName, existing)
  }
  
  return Array.from(clinicMap.entries()).map(([clinicName, stats]) => ({
    clinicName,
    totalVisits: stats.visits,
    totalRevenue: Math.round(stats.revenue * 100) / 100
  }))
}

/**
 * Normalize name for comparison — only strip punctuation and lowercase,
 * preserving distinguishing words like location names
 */
function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Extract significant keywords from a name (excluding generic vet terms)
 */
function extractKeywords(name: string): string[] {
  const genericWords = new Set([
    'the', 'and', 'for', 'of', 'at', 'in',
    'vet', 'vets', 'pet', 'pets', 'animal', 'animals',
    'clinic', 'clinics', 'hospital', 'hospitals',
    'center', 'centre', 'medical', 'veterinary',
    'care', 'health', 'wellness', 'group', 'practice',
    'dr', 'dvm', 'inc', 'llc', 'corp'
  ])
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !genericWords.has(w))
}

/**
 * Find best matching partner for a clinic name.
 * Uses tiered matching: exact → normalized exact → contains → keyword overlap.
 * Requires at least 2 keyword matches (or 1 if only 1 keyword exists) to avoid false positives.
 */
function findBestMatch(clinicName: string, partners: any[]): any | null {
  const normalizedInput = normalizeNameForComparison(clinicName)
  
  // 1. Try exact match (case-insensitive)
  let match = partners.find(p => 
    p.name.toLowerCase().trim() === clinicName.toLowerCase().trim()
  )
  if (match) return match
  
  // 2. Try normalized exact match
  match = partners.find(p => 
    normalizeNameForComparison(p.name) === normalizedInput
  )
  if (match) return match
  
  // 3. Try contains match (one fully contains the other after normalization)
  match = partners.find(p => {
    const normalizedPartner = normalizeNameForComparison(p.name)
    // Only match if the shorter string is substantial (>= 6 chars) to avoid trivial matches
    const shorter = normalizedInput.length < normalizedPartner.length ? normalizedInput : normalizedPartner
    if (shorter.length < 6) return false
    return normalizedInput.includes(normalizedPartner) || 
           normalizedPartner.includes(normalizedInput)
  })
  if (match) return match
  
  // 4. Try keyword overlap (require at least 2 matching keywords, or exact-match the only keyword)
  const inputKeywords = extractKeywords(clinicName)
  if (inputKeywords.length === 0) return null
  
  const minRequiredMatches = inputKeywords.length >= 2 ? 2 : 1
  
  let bestMatch: any = null
  let bestScore = 0
  
  for (const p of partners) {
    const partnerKeywords = extractKeywords(p.name)
    if (partnerKeywords.length === 0) continue
    
    // Count exact keyword matches (whole word only)
    let matchCount = 0
    for (const iw of inputKeywords) {
      if (partnerKeywords.some((pw: string) => pw === iw)) {
        matchCount++
      }
    }
    
    if (matchCount >= minRequiredMatches && matchCount > bestScore) {
      bestScore = matchCount
      bestMatch = p
    }
  }
  
  return bestMatch
}

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    const authHeader = event.headers.get('authorization')
    
    if (!authHeader) {
      throw createError({ statusCode: 401, message: 'No authorization header' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      throw createError({ statusCode: 401, message: 'Invalid or expired session' })
    }
    
    const userId = user.id
    
    // Get supabase client
    const supabase = await serverSupabaseClient(event)
    
    logger.debug('Looking up profile', 'parse-referrals', { authUserId: userId })
    
    // Check if user has appropriate role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, auth_user_id')
      .eq('auth_user_id', userId)
      .single()
    
    const allowedRoles = ['super_admin', 'admin', 'marketing_admin']
    if (profileError) {
      throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })
    }
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: `Admin or Marketing Admin access required. Your role: ${profile?.role || 'unknown'}` })
    }
    
    logger.info('Access granted', 'parse-referrals', { role: profile.role })
    
    // Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }
    
    const file = formData.find(f => f.name === 'file')
    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file found in upload' })
    }
    
    logger.info('File received', 'parse-referrals', { filename: file.filename, size: file.data.length })
    
    // Check file type - accept CSV
    const filename = file.filename?.toLowerCase() || ''
    if (!filename.endsWith('.csv')) {
      throw createError({ statusCode: 400, message: 'Please upload a CSV file.' })
    }
    
    // Parse CSV content
    const csvText = Buffer.from(file.data).toString('utf-8')
    logger.debug('Parsing CSV', 'parse-referrals', { totalChars: csvText.length })
    
    // Detect report type from header
    const reportType = detectReportType(csvText)
    logger.info('Detected report type', 'parse-referrals', { reportType })

    // ── Duplicate upload detection via content hash ──
    const contentHash = computeContentHash(csvText)
    logger.debug('Content hash computed', 'parse-referrals', { contentHash: contentHash.slice(0, 12) })

    const { data: existingUpload } = await supabase
      .from('referral_sync_history')
      .select('id, filename, created_at')
      .eq('content_hash', contentHash)
      .eq('report_type', reportType)
      .limit(1)
      .maybeSingle()

    if (existingUpload) {
      const uploadedAt = new Date(existingUpload.created_at).toLocaleDateString()
      throw createError({
        statusCode: 409,
        message: `Duplicate upload detected. This exact file was already uploaded on ${uploadedAt} ("${existingUpload.filename}"). Clear stats first if you intend to re-import.`
      })
    }

    // ── Check for date-range overlaps with previous uploads of same type ──
    const { data: previousUploads } = await supabase
      .from('referral_sync_history')
      .select('id, filename, date_range_start, date_range_end, created_at')
      .eq('report_type', reportType)
      .not('date_range_start', 'is', null)
      .not('date_range_end', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch all partners for matching
    // The table uses 'name' column (aliased from hospital_name in views/queries)
    const { data: partners } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time, last_contact_date, last_data_source')
    
    if (!partners) {
      throw createError({ statusCode: 500, message: 'Failed to fetch partners' })
    }
    
    logger.info('Found partners to match', 'parse-referrals', { count: partners.length })
    
    // Initialize result
    const result: SyncResult = {
      reportType,
      updated: 0,
      skipped: 0,
      notMatched: 0,
      revenueAdded: 0,
      visitorsAdded: 0,
      details: []
    }

    // Will be populated below based on report type
    let dateRange: { start: string | null; end: string | null } = { start: null, end: null }
    let overlapWarning: string | undefined
    
    if (reportType === 'revenue') {
      // ========================================
      // REVENUE REPORT - Update revenue totals
      // ========================================
      const entries = parseRevenueCSV(csvText)
      logger.info('Parsed revenue entries', 'parse-referrals', { count: entries.length })
      
      if (entries.length === 0) {
        throw createError({ 
          statusCode: 400, 
          message: 'No valid entries found in Revenue CSV. Make sure the file has Date/Time, Referring Vet Clinic, and Amount columns.' 
        })
      }
      
      // Aggregate by clinic
      const aggregated = aggregateRevenueByClinic(entries)
      logger.info('Aggregated to unique clinics', 'parse-referrals', { count: aggregated.length })

      // ── Extract date range from revenue entries ──
      dateRange = extractRevenueDateRange(entries)
      logger.info('Revenue date range', 'parse-referrals', dateRange)

      // ── Check for overlapping date ranges with past uploads ──
      if (dateRange.start && dateRange.end && previousUploads && previousUploads.length > 0) {
        const overlaps = previousUploads.filter(prev => {
          if (!prev.date_range_start || !prev.date_range_end) return false
          return prev.date_range_start <= dateRange.end! && prev.date_range_end >= dateRange.start!
        })
        if (overlaps.length > 0) {
          const overlapFiles = overlaps.map(o => `"${o.filename}" (${new Date(o.created_at).toLocaleDateString()})`).join(', ')
          overlapWarning = `Date range ${dateRange.start} to ${dateRange.end} overlaps with ${overlaps.length} previous upload(s): ${overlapFiles}. Revenue values have been REPLACED (not accumulated) to avoid double-counting.`
          logger.warn('Date range overlap detected', 'parse-referrals', { overlapWith: overlaps.map(o => o.id) })
        }
      }
      
      const csvTotalVisits = aggregated.reduce((sum, a) => sum + a.totalVisits, 0)
      const csvTotalRevenue = aggregated.reduce((sum, a) => sum + a.totalRevenue, 0)
      logger.info('Revenue CSV Totals', 'parse-referrals', { visits: csvTotalVisits, revenue: csvTotalRevenue.toFixed(2) })
      
      // Match and batch-update (ONLY revenue, not visit counts)
      // Uses REPLACEMENT semantics — the uploaded report is treated as the
      // canonical snapshot so that re-uploads of the same period don't double-count.
      const revenueUpdates: { id: string; total_revenue_all_time: number; last_sync_date: string; last_data_source: string }[] = []
      const syncDate = new Date().toISOString()

      for (const agg of aggregated) {
        const match = findBestMatch(agg.clinicName, partners)
        
        if (match) {
          revenueUpdates.push({
            id: match.id,
            total_revenue_all_time: agg.totalRevenue,
            last_sync_date: syncDate,
            last_data_source: 'csv_upload'
          })
          result.updated++
          result.revenueAdded += agg.totalRevenue
          result.details.push({
            clinicName: agg.clinicName,
            matched: true,
            matchedTo: match.name,
            visits: agg.totalVisits,
            revenue: agg.totalRevenue
          })
        } else {
          result.notMatched++
          result.details.push({
            clinicName: agg.clinicName,
            matched: false,
            visits: agg.totalVisits,
            revenue: agg.totalRevenue
          })
        }
      }

      // Batch upsert all matched revenue updates in one DB call
      if (revenueUpdates.length > 0) {
        const { error: batchError } = await supabase
          .from('referral_partners')
          .upsert(revenueUpdates, { onConflict: 'id' })

        if (batchError) {
          logger.error('Batch revenue update error', null, 'parse-referrals', { message: batchError.message })
        }
      }
      
    } else {
      // ========================================
      // STATISTICS REPORT - Update visit counts and last visit date (NOT revenue)
      // ========================================
      const entries = parseStatisticsCSV(csvText)
      logger.info('Parsed statistics entries', 'parse-referrals', { count: entries.length })
      
      if (entries.length === 0) {
        throw createError({ 
          statusCode: 400, 
          message: 'No valid entries found in Statistics CSV. Make sure the file has Clinic Name, Date of Last Referral, and Total Referrals columns.' 
        })
      }
      
      // ── Extract date range from statistics entries ──
      dateRange = extractStatisticsDateRange(entries)
      logger.info('Statistics date range', 'parse-referrals', dateRange)

      // ── Check for overlapping date ranges ──
      if (dateRange.start && dateRange.end && previousUploads && previousUploads.length > 0) {
        const overlaps = previousUploads.filter(prev => {
          if (!prev.date_range_start || !prev.date_range_end) return false
          return prev.date_range_start <= dateRange.end! && prev.date_range_end >= dateRange.start!
        })
        if (overlaps.length > 0) {
          const overlapFiles = overlaps.map(o => `"${o.filename}" (${new Date(o.created_at).toLocaleDateString()})`).join(', ')
          overlapWarning = `Date range ${dateRange.start} to ${dateRange.end} overlaps with ${overlaps.length} previous upload(s): ${overlapFiles}. Visit counts have been REPLACED (not accumulated) to avoid double-counting.`
          logger.warn('Date range overlap detected', 'parse-referrals', { overlapWith: overlaps.map(o => o.id) })
        }
      }

      const csvTotalVisits = entries.reduce((sum, e) => sum + e.totalReferrals12Months, 0)
      logger.info('Statistics CSV Total', 'parse-referrals', { visits: csvTotalVisits })
      
      // Match and batch-update (ONLY visit counts and last date, NOT revenue)
      // Uses REPLACEMENT semantics to avoid double-counting.
      const statsUpdates: Record<string, any>[] = []
      const syncDate = new Date().toISOString()

      for (const entry of entries) {
        const match = findBestMatch(entry.clinicName, partners)
        
        if (match) {
          // Build update object
          const updateData: any = {
            id: match.id,
            total_referrals_all_time: entry.totalReferrals12Months,
            last_sync_date: syncDate,
            last_data_source: 'csv_upload'
          }
          
          if (entry.lastReferralDate) {
            updateData.last_referral_date = entry.lastReferralDate
            updateData.last_contact_date = entry.lastReferralDate
          }

          statsUpdates.push(updateData)
          result.updated++
          result.visitorsAdded += entry.totalReferrals12Months
          result.details.push({
            clinicName: entry.clinicName,
            matched: true,
            matchedTo: match.name,
            visits: entry.totalReferrals12Months,
            revenue: 0,
            lastVisitDate: entry.lastReferralDate || undefined
          })
        } else {
          result.notMatched++
          result.details.push({
            clinicName: entry.clinicName,
            matched: false,
            visits: entry.totalReferrals12Months,
            revenue: 0,
            lastVisitDate: entry.lastReferralDate || undefined
          })
        }
      }

      // Batch upsert all matched statistics updates in one DB call
      if (statsUpdates.length > 0) {
        const { error: batchError } = await supabase
          .from('referral_partners')
          .upsert(statsUpdates, { onConflict: 'id' })

        if (batchError) {
          logger.error('Batch statistics update error', null, 'parse-referrals', { message: batchError.message })
        }
      }
    }
    
    // Log sync history with content hash, date range, and data source
    await supabase.from('referral_sync_history').insert({
      filename: file.filename || 'referral-report.csv',
      content_hash: contentHash,
      report_type: reportType,
      data_source: 'csv_upload',
      date_range_start: dateRange.start,
      date_range_end: dateRange.end,
      total_rows_parsed: result.details.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profile?.id,
      sync_details: {
        reportType,
        notMatched: result.notMatched,
        visitorsAdded: result.visitorsAdded,
        overlapWarning: overlapWarning || null,
        clinicDetails: result.details
      }
    })
    
    // Recalculate all partner metrics (Tier, Priority, Relationship Health, Overdue)
    logger.info('Recalculating partner metrics...', 'parse-referrals')
    const { error: recalcError } = await supabase.rpc('recalculate_partner_metrics')
    if (recalcError) {
      logger.warn('Failed to recalculate metrics', 'parse-referrals', { message: recalcError.message })
    } else {
      logger.info('Partner metrics recalculated successfully', 'parse-referrals')
    }
    
    logger.info('Sync complete', 'parse-referrals', { updated: result.updated, notMatched: result.notMatched })
    
    return {
      success: true,
      reportType,
      message: reportType === 'revenue' 
        ? `Revenue Report: Updated ${result.updated} partners with $${result.revenueAdded.toLocaleString()} revenue`
        : `Statistics Report: Updated ${result.updated} partners with ${result.visitorsAdded} visits`,
      updated: result.updated,
      skipped: result.skipped,
      notMatched: result.notMatched,
      revenueAdded: Math.round(result.revenueAdded * 100) / 100,
      visitorsAdded: result.visitorsAdded,
      dateRange,
      overlapWarning: overlapWarning || null,
      details: result.details
    }
    
  } catch (error: any) {
    logger.error('Error', error, 'parse-referrals')
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to parse CSV'
    })
  }
})
