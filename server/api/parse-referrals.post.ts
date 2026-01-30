/**
 * Referral Stats CSV Parser API
 * Parses EzyVet "Referrer Revenue" CSV reports and updates referral_partners stats
 */
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

interface ParsedReferral {
  clinicName: string
  amount: number
  date: string
}

interface AggregatedStats {
  clinicName: string
  totalVisits: number
  totalRevenue: number
}

interface SyncResult {
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
  }>
}

/**
 * Parse CSV content into referral entries
 * CSV Structure:
 * - Header: Date/Time,Referring Vet Clinic,Referring Vet,Client,Animal,Division,Amount
 * - Summary rows (empty Date/Time): clinic total summary - SKIP THESE
 * - Detail rows (with Date/Time): individual visits - COUNT THESE
 */
function parseCSVContent(csvText: string): ParsedReferral[] {
  // Normalize line endings (handle Windows CRLF)
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')
  const referrals: ParsedReferral[] = []
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Parse CSV line (handle quoted fields with commas)
    const fields = parseCSVLine(line)
    
    if (fields.length < 7) continue
    
    const dateTime = fields[0].trim()
    const clinicName = fields[1].trim()
    const amountStr = fields[6].trim()
    
    // Only count rows WITH a date (skip summary rows that have empty date)
    if (!dateTime) {
      continue
    }
    
    // Skip "Unknown Clinic" entries - we can't attribute these
    if (clinicName.toLowerCase() === 'unknown clinic') {
      continue
    }
    
    // Skip empty clinic names
    if (!clinicName) {
      continue
    }
    
    // Parse amount
    const amount = parseFloat(amountStr.replace(/[,$]/g, '')) || 0
    if (amount <= 0) continue
    
    referrals.push({
      clinicName,
      amount,
      date: dateTime
    })
  }
  
  return referrals
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
 * Aggregate referrals by clinic name
 */
function aggregateByClinic(referrals: ParsedReferral[]): AggregatedStats[] {
  const clinicMap = new Map<string, { visits: number; revenue: number }>()
  
  for (const ref of referrals) {
    const existing = clinicMap.get(ref.clinicName) || { visits: 0, revenue: 0 }
    existing.visits += 1
    existing.revenue += ref.amount
    clinicMap.set(ref.clinicName, existing)
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
      throw createError({ statusCode: 400, message: 'Please upload a CSV file. PDF parsing is no longer supported.' })
    }
    
    // Parse CSV content
    const csvText = Buffer.from(file.data).toString('utf-8')
    console.log('[parse-referrals] Parsing CSV, total chars:', csvText.length)
    
    const referrals = parseCSVContent(csvText)
    console.log('[parse-referrals] Parsed', referrals.length, 'valid referral entries')
    
    if (referrals.length === 0) {
      throw createError({ 
        statusCode: 400, 
        message: 'No valid referral entries found in CSV. Make sure the file has the correct format with Date/Time, Referring Vet Clinic, and Amount columns.' 
      })
    }
    
    // Log some sample entries
    for (const ref of referrals.slice(0, 5)) {
      console.log(`  - ${ref.clinicName}: $${ref.amount} on ${ref.date}`)
    }
    
    // Aggregate by clinic
    const aggregated = aggregateByClinic(referrals)
    console.log('[parse-referrals] Aggregated to', aggregated.length, 'unique clinics')
    
    // Log aggregated totals
    for (const agg of aggregated.slice(0, 10)) {
      console.log(`  - ${agg.clinicName}: ${agg.totalVisits} visits, $${agg.totalRevenue}`)
    }
    
    // Calculate total from CSV for verification
    const csvTotalVisits = aggregated.reduce((sum, a) => sum + a.totalVisits, 0)
    const csvTotalRevenue = aggregated.reduce((sum, a) => sum + a.totalRevenue, 0)
    console.log(`[parse-referrals] CSV Totals: ${csvTotalVisits} visits, $${csvTotalRevenue.toFixed(2)} revenue`)
    
    // Fetch all partners for matching
    const { data: partners } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time')
    
    if (!partners) {
      throw createError({ statusCode: 500, message: 'Failed to fetch partners' })
    }
    
    console.log('[parse-referrals] Found', partners.length, 'partners to match against')
    
    // Match and update
    const result: SyncResult = {
      updated: 0,
      skipped: 0,
      notMatched: 0,
      revenueAdded: 0,
      visitorsAdded: 0,
      details: []
    }
    
    for (const agg of aggregated) {
      const match = findBestMatch(agg.clinicName, partners)
      
      if (match) {
        // REPLACE existing values (not add to them) since we cleared the data
        const { error } = await supabase
          .from('referral_partners')
          .update({
            total_referrals_all_time: agg.totalVisits,
            total_revenue_all_time: agg.totalRevenue,
            last_sync_date: new Date().toISOString()
          })
          .eq('id', match.id)
        
        if (!error) {
          result.updated++
          result.revenueAdded += agg.totalRevenue
          result.visitorsAdded += agg.totalVisits
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
    
    // Log sync history
    await supabase.from('referral_sync_history').insert({
      filename: file.filename || 'referral-report.csv',
      date_range_start: null,
      date_range_end: null,
      total_rows_parsed: referrals.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profile?.id,
      sync_details: {
        notMatched: result.notMatched,
        visitorsAdded: result.visitorsAdded,
        clinicDetails: result.details,
        csvTotals: {
          visits: csvTotalVisits,
          revenue: csvTotalRevenue
        }
      }
    })
    
    console.log('[parse-referrals] Sync complete:', result.updated, 'updated,', result.notMatched, 'not matched')
    
    return {
      success: true,
      message: `Processed ${referrals.length} referral entries from ${aggregated.length} clinics`,
      updated: result.updated,
      skipped: result.skipped,
      notMatched: result.notMatched,
      revenueAdded: Math.round(result.revenueAdded * 100) / 100,
      visitorsAdded: result.visitorsAdded,
      details: result.details,
      totals: {
        csvVisits: csvTotalVisits,
        csvRevenue: Math.round(csvTotalRevenue * 100) / 100
      }
    }
    
  } catch (error: any) {
    console.error('[parse-referrals] Error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to parse CSV'
    })
  }
})
