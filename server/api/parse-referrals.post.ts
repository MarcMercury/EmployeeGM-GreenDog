/**
 * Referral Stats PDF Parser API
 * Parses EzyVet "Referrer Revenue" PDF reports and updates referral_partners stats
 */
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { PDFParse } from 'pdf-parse'

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

// Fuzzy match score - simple Levenshtein-based matching
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
  
  // Pattern to match date at start of line: MM-DD-YYYY
  const datePattern = /^(\d{2}-\d{2}-\d{4})/
  // Pattern to match amount at end of line (number with optional decimals)
  const amountPattern = /(\d+(?:\.\d{1,2})?)\s*$/
  
  let currentDate = ''
  let currentClinic = ''
  let skipRecord = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check if this is a date line (start of new record)
    const dateMatch = line.match(datePattern)
    if (dateMatch) {
      currentDate = dateMatch[1]
      skipRecord = false
      currentClinic = ''
      continue
    }
    
    // Skip header/footer lines
    if (line.includes('REVENUE PER REFERRER') || 
        line.includes('Sheet') ||
        line.includes('Date/Time') ||
        line.includes('Referring Vet Clinic') ||
        line.includes('TOTAL ALL') ||
        line.includes('START') ||
        line.includes('END') ||
        line.includes('PRINTED')) {
      continue
    }
    
    // Check for "Unknown Clinic" - skip these records
    if (line.toLowerCase().includes('unknown clinic')) {
      skipRecord = true
      continue
    }
    
    // If we have a date and no clinic yet, this might be the clinic name
    if (currentDate && !currentClinic && !skipRecord) {
      // Check if this looks like a clinic name (not a time, not an amount)
      const timePattern = /^\d{1,2}:\d{2}(am|pm)?$/i
      if (!timePattern.test(line) && !amountPattern.test(line)) {
        // Could be clinic name or "Unknown Vet" or client name
        // Clinic names often contain "Vet", "Animal", "Hospital", "Clinic", etc.
        if (line.includes('Vet') || 
            line.includes('Animal') || 
            line.includes('Hospital') || 
            line.includes('Clinic') ||
            line.includes('Care') ||
            line.includes('Center') ||
            line.includes('Southpaw') ||
            line.includes('VCA')) {
          currentClinic = line
        }
      }
    }
    
    // Check for amount at end of a line
    const amountMatch = line.match(amountPattern)
    if (amountMatch && currentDate && currentClinic && !skipRecord) {
      const amount = parseFloat(amountMatch[1])
      if (!isNaN(amount) && amount > 0) {
        referrals.push({
          clinicName: currentClinic,
          amount,
          date: currentDate
        })
        // Reset for next record
        currentDate = ''
        currentClinic = ''
      }
    }
  }
  
  return referrals
}

// Alternative parsing approach - look for clinic names followed by amounts
function parsePdfContentV2(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  // Known clinic name patterns
  const clinicPatterns = [
    /VCA\s+\w+/i,
    /\w+\s+Animal\s+Hospital/i,
    /\w+\s+Veterinary\s+(?:Care|Clinic|Center)/i,
    /\w+\s+Vet(?:erinarian|erinary)?(?:\s+\w+)?/i,
    /Southpaw\s+Vets?/i
  ]
  
  let currentClinic = ''
  let skipRecord = false
  let lastDate = ''
  
  // Date pattern
  const datePattern = /(\d{2}-\d{2}-\d{4})/
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Skip if this is an Unknown Clinic
    if (line.toLowerCase() === 'unknown clinic') {
      skipRecord = true
      currentClinic = ''
      continue
    }
    
    // Track dates
    const dateMatch = line.match(datePattern)
    if (dateMatch) {
      lastDate = dateMatch[1]
      skipRecord = false
    }
    
    // Check if line is just a number (amount)
    const amountOnly = /^(\d+(?:\.\d{1,2})?)$/.test(line)
    
    if (amountOnly && currentClinic && !skipRecord) {
      const amount = parseFloat(line)
      if (!isNaN(amount) && amount > 0) {
        referrals.push({
          clinicName: currentClinic,
          amount,
          date: lastDate
        })
      }
      currentClinic = ''
      continue
    }
    
    // Check if this is a clinic name line
    for (const pattern of clinicPatterns) {
      if (pattern.test(line) && !line.toLowerCase().includes('unknown clinic')) {
        currentClinic = line
        skipRecord = false
        break
      }
    }
  }
  
  return referrals
}

// Aggregate referrals by clinic
function aggregateByClinic(referrals: ParsedReferral[]): AggregatedStats[] {
  const clinicMap = new Map<string, { visits: number; revenue: number }>()
  
  for (const ref of referrals) {
    const existing = clinicMap.get(ref.clinicName) || { visits: 0, revenue: 0 }
    existing.visits++
    existing.revenue += ref.amount
    clinicMap.set(ref.clinicName, existing)
  }
  
  return Array.from(clinicMap.entries()).map(([clinicName, stats]) => ({
    clinicName,
    totalVisits: stats.visits,
    totalRevenue: Math.round(stats.revenue * 100) / 100
  }))
}

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = await serverSupabaseUser(event)
    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }
    
    // Get supabase client
    const supabase = await serverSupabaseClient(event)
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()
    
    if (!profile || profile.role !== 'admin') {
      throw createError({ statusCode: 403, message: 'Admin access required' })
    }
    
    // Read multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }
    
    const file = formData.find(f => f.name === 'file')
    if (!file || !file.data) {
      throw createError({ statusCode: 400, message: 'No PDF file found' })
    }
    
    // Parse PDF using pdf-parse v2 API
    const parser = new PDFParse({ data: file.data })
    const text = await parser.getText()
    
    // Extract date range from header
    const startMatch = text.match(/START\s+(\d{2}-\d{2}-\d{4})/)
    const endMatch = text.match(/END\s+(\d{2}-\d{2}-\d{4})/)
    
    // Parse referrals using both methods and combine
    const referrals1 = parsePdfContent(text)
    const referrals2 = parsePdfContentV2(text)
    
    // Use the method that found more records
    const referrals = referrals1.length >= referrals2.length ? referrals1 : referrals2
    
    // Aggregate by clinic
    const aggregated = aggregateByClinic(referrals)
    
    // Fetch all partners for matching
    const { data: partners } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time')
    
    if (!partners) {
      throw createError({ statusCode: 500, message: 'Failed to fetch partners' })
    }
    
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
    // Count lines with "Unknown Clinic"
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
    console.error('Error parsing referral PDF:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to parse PDF'
    })
  }
})
