/**
 * Referral Stats PDF Parser API
 * Parses EzyVet "Referrer Revenue" PDF reports and updates referral_partners stats
 * Uses pdf2json for reliable Node.js PDF parsing
 */
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import PDFParser from 'pdf2json'

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

// Parse PDF buffer to text using pdf2json
async function parsePdfToText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('[parse-referrals] pdf2json error:', errData.parserError)
      reject(new Error(errData.parserError || 'PDF parsing failed'))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from all pages
        let text = ''
        if (pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const run of textItem.R) {
                    if (run.T) {
                      text += decodeURIComponent(run.T) + ' '
                    }
                  }
                }
                text += '\n'
              }
            }
            text += '\n--- PAGE BREAK ---\n'
          }
        }
        resolve(text)
      } catch (err) {
        reject(err)
      }
    })
    
    // Parse the buffer
    pdfParser.parseBuffer(buffer)
  })
}

// Fuzzy match score - simple word overlap matching
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Word overlap matching
  const words1 = s1.split(/\s+/).filter(w => w.length > 2)
  const words2 = s2.split(/\s+/).filter(w => w.length > 2)
  
  let matchedWords = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchedWords++
        break
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length)
  if (maxWords === 0) return 0
  
  return matchedWords / maxWords
}

// Find best matching partner from database
function findBestMatch(
  clinicName: string, 
  partners: Array<{ id: string; name: string }>
): { id: string; name: string; score: number } | null {
  let bestMatch = null
  let bestScore = 0
  const threshold = 0.6 // Minimum 60% match required
  
  for (const partner of partners) {
    const score = fuzzyMatch(clinicName, partner.name)
    if (score > bestScore && score >= threshold) {
      bestScore = score
      bestMatch = { ...partner, score }
    }
  }
  
  return bestMatch
}

// Parse the PDF content and extract referral data
function parsePdfContent(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  // Pattern to match date: MM-DD-YYYY
  const datePattern = /(\d{2}-\d{2}-\d{4})/
  // Pattern to match amount (number with optional decimals)
  const amountPattern = /(\d+(?:\.\d{1,2})?)/
  
  let currentDate = ''
  let currentClinic = ''
  let skipRecord = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip page breaks and headers
    if (line.includes('PAGE BREAK') ||
        line.includes('REVENUE PER REFERRER') || 
        line.includes('Sheet') ||
        line.includes('Date/Time') ||
        line.includes('Referring Vet Clinic') ||
        line.includes('TOTAL ALL') ||
        line.includes('START') ||
        line.includes('END') ||
        line.includes('PRINTED')) {
      continue
    }
    
    // Check if this is a date line
    const dateMatch = line.match(datePattern)
    if (dateMatch && line.startsWith(dateMatch[1])) {
      currentDate = dateMatch[1]
      skipRecord = false
      currentClinic = ''
      continue
    }
    
    // Check for "Unknown Clinic" - skip these records
    if (line.toLowerCase().includes('unknown clinic') || 
        line.toLowerCase().includes('unknown vet')) {
      skipRecord = true
      continue
    }
    
    // Identify clinic names
    const isClinicName = (
      line.includes('Vet') || 
      line.includes('Animal') || 
      line.includes('Hospital') || 
      line.includes('Clinic') ||
      line.includes('Care') ||
      line.includes('Center') ||
      line.includes('Southpaw') ||
      line.includes('VCA') ||
      line.includes('Pet')
    ) && !line.toLowerCase().includes('unknown')
    
    if (isClinicName && !skipRecord) {
      currentClinic = line.replace(/\s+/g, ' ').trim()
    }
    
    // Check for amount (standalone number or at end of line)
    const amountMatch = line.match(/^(\d+(?:\.\d{1,2})?)$/)
    if (amountMatch && currentClinic && !skipRecord) {
      const amount = parseFloat(amountMatch[1])
      if (!isNaN(amount) && amount > 0) {
        referrals.push({
          clinicName: currentClinic,
          amount,
          date: currentDate || new Date().toISOString().split('T')[0]
        })
        // Don't reset clinic - same clinic may have multiple entries
      }
    }
  }
  
  return referrals
}

// Alternative parsing - regex based for robustness
function parsePdfContentV2(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  
  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  // Known clinic name patterns with amounts following
  const clinicAmountPattern = /((?:VCA|Southpaw|[\w\s]+(?:Vet(?:erinary)?|Animal|Hospital|Clinic|Care|Center|Pet))[\w\s]*?)\s+(\d+(?:\.\d{1,2})?)\s/gi
  
  let match
  const seen = new Map<string, number>()
  
  while ((match = clinicAmountPattern.exec(cleanText)) !== null) {
    const clinicName = match[1].trim()
    const amount = parseFloat(match[2])
    
    // Skip unknown clinics
    if (clinicName.toLowerCase().includes('unknown')) continue
    
    if (!isNaN(amount) && amount > 0 && clinicName.length > 3) {
      // Deduplicate by clinic name, keeping track of count
      const key = clinicName.toLowerCase()
      seen.set(key, (seen.get(key) || 0) + 1)
      
      referrals.push({
        clinicName,
        amount,
        date: new Date().toISOString().split('T')[0]
      })
    }
  }
  
  return referrals
}

// Aggregate referrals by clinic
function aggregateByClinic(referrals: ParsedReferral[]): AggregatedStats[] {
  const clinicMap = new Map<string, { visits: number; revenue: number }>()
  
  for (const ref of referrals) {
    // Normalize clinic name for grouping
    const normalizedName = ref.clinicName.trim()
    const existing = clinicMap.get(normalizedName) || { visits: 0, revenue: 0 }
    existing.visits++
    existing.revenue += ref.amount
    clinicMap.set(normalizedName, existing)
  }
  
  return Array.from(clinicMap.entries()).map(([clinicName, stats]) => ({
    clinicName,
    totalVisits: stats.visits,
    totalRevenue: Math.round(stats.revenue * 100) / 100
  }))
}

export default defineEventHandler(async (event) => {
  try {
    console.log('[parse-referrals] Starting PDF parse request')
    
    // Get authenticated user
    const user = await serverSupabaseUser(event)
    console.log('[parse-referrals] User from serverSupabaseUser:', user?.id, user?.email)
    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    
    // Get supabase client (regular for operations, service role for auth check)
    const supabase = await serverSupabaseClient(event)
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    
    // Check if user is admin or marketing_admin using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    
    console.log('[parse-referrals] Profile lookup result:', { profile, error: profileError?.message })
    
    const allowedRoles = ['admin', 'marketing_admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      console.log('[parse-referrals] Access denied for role:', profile?.role)
      throw createError({ statusCode: 403, message: 'Admin or Marketing Admin access required' })
    }
    
    console.log('[parse-referrals] Access granted for role:', profile.role)
    
    // Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }
    
    const file = formData.find(f => f.name === 'file')
    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No PDF file found' })
    }
    
    console.log('[parse-referrals] File received, size:', file.data.length, 'bytes')
    
    // Parse PDF to text using pdf2json
    let text: string
    try {
      console.log('[parse-referrals] Parsing PDF with pdf2json...')
      text = await parsePdfToText(Buffer.from(file.data))
      console.log('[parse-referrals] PDF parsed successfully, text length:', text.length)
    } catch (pdfError: any) {
      console.error('[parse-referrals] PDF parsing error:', pdfError)
      throw createError({ 
        statusCode: 500, 
        message: `Failed to parse PDF: ${pdfError.message || 'Unknown error'}` 
      })
    }
    
    // Extract date range from header
    const startMatch = text.match(/START\s+(\d{2}-\d{2}-\d{4})/)
    const endMatch = text.match(/END\s+(\d{2}-\d{2}-\d{4})/)
    
    console.log('[parse-referrals] Date range:', startMatch?.[1], 'to', endMatch?.[1])
    
    // Parse referrals using both methods
    const referrals1 = parsePdfContent(text)
    const referrals2 = parsePdfContentV2(text)
    
    console.log('[parse-referrals] Method 1 found:', referrals1.length, 'entries')
    console.log('[parse-referrals] Method 2 found:', referrals2.length, 'entries')
    
    // Use the method that found more records
    const referrals = referrals1.length >= referrals2.length ? referrals1 : referrals2
    
    // Aggregate by clinic
    const aggregated = aggregateByClinic(referrals)
    console.log('[parse-referrals] Aggregated to', aggregated.length, 'unique clinics')
    
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
        // Update partner stats
        const existingPartner = partners.find(p => p.id === match.id)
        const currentReferrals = existingPartner?.total_referrals_all_time || 0
        const currentRevenue = existingPartner?.total_revenue_all_time || 0
        
        const { error } = await supabase
          .from('referral_partners')
          .update({
            total_referrals_all_time: currentReferrals + agg.totalVisits,
            total_revenue_all_time: Math.round((currentRevenue + agg.totalRevenue) * 100) / 100,
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
    
    // Calculate skipped (Unknown Clinic entries)
    const unknownCount = (text.match(/unknown clinic/gi) || []).length
    result.skipped = unknownCount
    
    // Log sync history
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    
    await supabase.from('referral_sync_history').insert({
      filename: file.filename || 'referrer-revenue.pdf',
      date_range_start: startMatch ? new Date(startMatch[1].replace(/-/g, '/')).toISOString().split('T')[0] : null,
      date_range_end: endMatch ? new Date(endMatch[1].replace(/-/g, '/')).toISOString().split('T')[0] : null,
      total_rows_parsed: referrals.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profileData?.id,
      sync_details: {
        notMatched: result.notMatched,
        visitorsAdded: result.visitorsAdded,
        clinicDetails: result.details
      }
    })
    
    console.log('[parse-referrals] Sync complete:', result.updated, 'updated,', result.notMatched, 'not matched')
    
    return {
      success: true,
      message: `Processed ${aggregated.length} clinics from PDF`,
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
      message: error.message || 'Failed to parse PDF'
    })
  }
})
