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
  
  console.log('[parse-referrals] Statistics CSV columns - Clinic:', clinicNameIdx, 'LastRef:', lastReferralIdx, '12Mo:', total12MonthsIdx)
  
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
 * Normalize name for comparison
 */
function normalizeNameForComparison(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/veterinary|vet|clinic|hospital|animal|pet|center|medical/g, '')
    .trim()
}

/**
 * Find best matching partner for a clinic name
 */
function findBestMatch(clinicName: string, partners: any[]): any | null {
  const normalizedInput = normalizeNameForComparison(clinicName)
  
  // Try exact match first (case-insensitive)
  let match = partners.find(p => 
    p.name.toLowerCase() === clinicName.toLowerCase()
  )
  if (match) return match
  
  // Try contains match
  match = partners.find(p => {
    const normalizedPartner = normalizeNameForComparison(p.name)
    return normalizedInput.includes(normalizedPartner) || 
           normalizedPartner.includes(normalizedInput)
  })
  if (match) return match
  
  // Try key word match (first 2 significant words)
  const inputWords = clinicName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'vet', 'pet', 'animal', 'clinic', 'hospital', 'center', 'veterinary', 'medical'].includes(w))
    .slice(0, 2)
  
  if (inputWords.length > 0) {
    match = partners.find(p => {
      const partnerWords = p.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2)
      return inputWords.some(iw => partnerWords.some((pw: string) => pw.includes(iw) || iw.includes(pw)))
    })
  }
  
  return match || null
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
    
    console.log('[parse-referrals] Looking up profile for auth_user_id:', userId)
    
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
    
    console.log('[parse-referrals] Access granted for role:', profile.role)
    
    // Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }
    
    const file = formData.find(f => f.name === 'file')
    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No file found in upload' })
    }
    
    console.log('[parse-referrals] File received:', file.filename, 'size:', file.data.length, 'bytes')
    
    // Check file type - accept CSV
    const filename = file.filename?.toLowerCase() || ''
    if (!filename.endsWith('.csv')) {
      throw createError({ statusCode: 400, message: 'Please upload a CSV file.' })
    }
    
    // Parse CSV content
    const csvText = Buffer.from(file.data).toString('utf-8')
    console.log('[parse-referrals] Parsing CSV, total chars:', csvText.length)
    
    // Detect report type from header
    const reportType = detectReportType(csvText)
    console.log('[parse-referrals] Detected report type:', reportType)
    
    // Fetch all partners for matching
    // The table uses 'name' column (aliased from hospital_name in views/queries)
    const { data: partners } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time, last_contact_date')
    
    if (!partners) {
      throw createError({ statusCode: 500, message: 'Failed to fetch partners' })
    }
    
    console.log('[parse-referrals] Found', partners.length, 'partners to match against')
    
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
    
    if (reportType === 'revenue') {
      // ========================================
      // REVENUE REPORT - Update revenue totals
      // ========================================
      const entries = parseRevenueCSV(csvText)
      console.log('[parse-referrals] Parsed', entries.length, 'revenue entries')
      
      if (entries.length === 0) {
        throw createError({ 
          statusCode: 400, 
          message: 'No valid entries found in Revenue CSV. Make sure the file has Date/Time, Referring Vet Clinic, and Amount columns.' 
        })
      }
      
      // Aggregate by clinic
      const aggregated = aggregateRevenueByClinic(entries)
      console.log('[parse-referrals] Aggregated to', aggregated.length, 'unique clinics')
      
      const csvTotalVisits = aggregated.reduce((sum, a) => sum + a.totalVisits, 0)
      const csvTotalRevenue = aggregated.reduce((sum, a) => sum + a.totalRevenue, 0)
      console.log(`[parse-referrals] Revenue CSV Totals: ${csvTotalVisits} visits, $${csvTotalRevenue.toFixed(2)} revenue`)
      
      // Match and update (ONLY revenue, not visit counts)
      for (const agg of aggregated) {
        const match = findBestMatch(agg.clinicName, partners)
        
        if (match) {
          // Update ONLY revenue (replace, don't add)
          const { error } = await supabase
            .from('referral_partners')
            .update({
              total_revenue_all_time: agg.totalRevenue,
              last_sync_date: new Date().toISOString()
            })
            .eq('id', match.id)
          
          if (!error) {
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
            console.error('[parse-referrals] Update error for', match.name, ':', error.message)
          }
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
      
    } else {
      // ========================================
      // STATISTICS REPORT - Update visit counts and last visit date (NOT revenue)
      // ========================================
      const entries = parseStatisticsCSV(csvText)
      console.log('[parse-referrals] Parsed', entries.length, 'statistics entries')
      
      if (entries.length === 0) {
        throw createError({ 
          statusCode: 400, 
          message: 'No valid entries found in Statistics CSV. Make sure the file has Clinic Name, Date of Last Referral, and Total Referrals columns.' 
        })
      }
      
      const csvTotalVisits = entries.reduce((sum, e) => sum + e.totalReferrals12Months, 0)
      console.log(`[parse-referrals] Statistics CSV Total: ${csvTotalVisits} visits (12 months)`)
      
      // Match and update (ONLY visit counts and last date, NOT revenue)
      for (const entry of entries) {
        const match = findBestMatch(entry.clinicName, partners)
        
        if (match) {
          // Build update object - only update visit count and last date (NOT revenue)
          const updateData: any = {
            total_referrals_all_time: entry.totalReferrals12Months,
            last_sync_date: new Date().toISOString()
          }
          
          // Update last_contact_date with the last referral date from the report
          if (entry.lastReferralDate) {
            updateData.last_contact_date = entry.lastReferralDate
          }
          
          const { error } = await supabase
            .from('referral_partners')
            .update(updateData)
            .eq('id', match.id)
          
          if (!error) {
            result.updated++
            result.visitorsAdded += entry.totalReferrals12Months
            result.details.push({
              clinicName: entry.clinicName,
              matched: true,
              matchedTo: match.name,
              visits: entry.totalReferrals12Months,
              revenue: 0, // Not updating revenue
              lastVisitDate: entry.lastReferralDate || undefined
            })
          } else {
            console.error('[parse-referrals] Update error for', match.name, ':', error.message)
          }
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
    }
    
    // Log sync history
    await supabase.from('referral_sync_history').insert({
      filename: file.filename || 'referral-report.csv',
      date_range_start: null,
      date_range_end: null,
      total_rows_parsed: result.details.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profile?.id,
      sync_details: {
        reportType,
        notMatched: result.notMatched,
        visitorsAdded: result.visitorsAdded,
        clinicDetails: result.details
      }
    })
    
    console.log('[parse-referrals] Sync complete:', result.updated, 'updated,', result.notMatched, 'not matched')
    
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
      details: result.details
    }
    
  } catch (error: any) {
    console.error('[parse-referrals] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to parse CSV'
    })
  }
})
