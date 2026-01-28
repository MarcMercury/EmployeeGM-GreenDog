/**
 * Referral Stats PDF Parser API
 * Parses EzyVet "Referrer Revenue" PDF reports and updates referral_partners stats
 * Uses pdf2json for reliable Node.js PDF parsing
 */
import { createError, defineEventHandler, readMultipartFormData, getHeader } from 'h3'
import { serverSupabaseClient, serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
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

// Parse PDF buffer and extract structured data using pdf2json
// Returns: { visits: [{date, clinicName, vetName}], amounts: [number] }
interface VisitEntry {
  date: string
  clinicName: string
  vetName: string
}

interface ExtractedPdfData {
  visits: VisitEntry[]
  amounts: number[]
  dateRangeStart?: string
  dateRangeEnd?: string
}

async function parsePdfToStructuredData(buffer: Buffer): Promise<ExtractedPdfData> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('[parse-referrals] pdf2json error:', errData.parserError)
      reject(new Error(errData.parserError || 'PDF parsing failed'))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const result: ExtractedPdfData = {
          visits: [],
          amounts: []
        }
        
        // Process each page
        let inAmountsSection = false
        let currentClinicName = ''
        let currentClinicParts: string[] = []
        let lastY = -1
        
        for (const page of pdfData.Pages || []) {
          // Extract all text items with positions for this page
          const pageItems: {text: string, y: number, x: number}[] = []
          
          for (const textItem of page.Texts || []) {
            for (const run of textItem.R || []) {
              if (run.T) {
                const decoded = decodeURIComponent(run.T).trim()
                if (decoded) {
                  pageItems.push({ 
                    text: decoded, 
                    y: textItem.y,
                    x: textItem.x || 0
                  })
                }
              }
            }
          }
          
          // Sort by Y position, then X position
          pageItems.sort((a, b) => a.y - b.y || a.x - b.x)
          
          // Group items by Y position (same line)
          const lines: {y: number, items: {text: string, x: number}[]}[] = []
          for (const item of pageItems) {
            const lastLine = lines[lines.length - 1]
            if (lastLine && Math.abs(lastLine.y - item.y) < 1.5) {
              lastLine.items.push({ text: item.text, x: item.x })
            } else {
              lines.push({ y: item.y, items: [{ text: item.text, x: item.x }] })
            }
          }
          
          // Process each line
          for (const line of lines) {
            // Sort items on the line by X position
            line.items.sort((a, b) => a.x - b.x)
            const lineText = line.items.map(i => i.text).join(' ')
            const lineLower = lineText.toLowerCase()
            
            // Check for Report End Date header (for date range)
            if (lineLower.includes('report end date')) {
              const dateMatch = lineText.match(/(\d{2}-\d{2}-\d{4})/)
              if (dateMatch) {
                result.dateRangeEnd = dateMatch[1]
              }
            }
            
            // Check for "Amount" header which signals start of amounts section
            if (lineText.trim() === 'Amount' || 
                (line.items.length === 1 && line.items[0].text === 'Amount')) {
              inAmountsSection = true
              continue
            }
            
            // If in amounts section, look for numbers
            if (inAmountsSection) {
              for (const item of line.items) {
                const numMatch = item.text.match(/^-?(\d+(?:\.\d{1,2})?)$/)
                if (numMatch) {
                  const val = parseFloat(numMatch[1])
                  if (!isNaN(val)) {
                    result.amounts.push(val)
                  }
                }
              }
              continue
            }
            
            // Check for date/time pattern at start of line (MM-DD-YYYY H:MMam/pm)
            const dateTimeMatch = lineText.match(/^(\d{2}-\d{2}-\d{4})\s+\d{1,2}:\d{2}[ap]m\s+(.*)$/)
            if (dateTimeMatch) {
              const date = dateTimeMatch[1]
              const rest = dateTimeMatch[2]
              
              // The rest contains clinic name and vet name
              // Format: "ClinicName VetName" where VetName is often "Unknown Vet" or clinic name repeated
              // We need to extract the clinic name
              
              // Check if this is Unknown Clinic
              if (rest.toLowerCase().includes('unknown clinic')) {
                continue // Skip unknown clinics
              }
              
              // Extract clinic name - it's before "Unknown Vet" or at the end
              let clinicName = rest
              const unknownVetIdx = rest.toLowerCase().indexOf('unknown vet')
              if (unknownVetIdx > 0) {
                clinicName = rest.substring(0, unknownVetIdx).trim()
              } else {
                // Vet name might be the clinic name repeated at the end
                // Try to find where the vet name starts
                const words = rest.split(/\s+/)
                if (words.length > 3) {
                  // Take first half as clinic name as a heuristic
                  clinicName = words.slice(0, Math.ceil(words.length / 2)).join(' ')
                }
              }
              
              if (clinicName && clinicName.length > 2) {
                result.visits.push({
                  date,
                  clinicName: clinicName.trim(),
                  vetName: 'Unknown'
                })
              }
              continue
            }
            
            // Check for standalone clinic name (header row before visits)
            // These appear as clinic name on its own line, followed by visit rows
            const isClinicHeader = (
              lineLower.includes('veterinary') ||
              lineLower.includes('animal hospital') ||
              lineLower.includes('animal clinic') ||
              lineLower.includes('pet hospital') ||
              lineLower.includes('pet clinic') ||
              lineLower.includes('pet medical') ||
              lineLower.includes('pet care') ||
              lineLower.includes('pet doctors') ||
              /\bvca\b/.test(lineLower) ||
              lineLower.includes('southpaw') ||
              lineLower.includes('modern animal')
            ) && !lineLower.includes('unknown clinic')
            
            if (isClinicHeader && !dateTimeMatch) {
              // This is a clinic name header - save for following visit rows
              currentClinicName = lineText.trim()
            }
          }
        }
        
        console.log('[parse-referrals] Extracted:', result.visits.length, 'visits,', result.amounts.length, 'amounts')
        resolve(result)
      } catch (err) {
        reject(err)
      }
    })
    
    pdfParser.parseBuffer(buffer)
  })
}

// Legacy function for backward compatibility  
async function parsePdfToText(buffer: Buffer): Promise<string> {
  const data = await parsePdfToStructuredData(buffer)
  // Convert to text format for legacy parsers
  const lines: string[] = []
  for (const visit of data.visits) {
    lines.push(`${visit.date} ${visit.clinicName} ${visit.vetName}`)
  }
  lines.push('Amount')
  for (const amount of data.amounts) {
    lines.push(amount.toString())
  }
  return lines.join('\n')
}

// NEW: Parse EzyVet Referrer Revenue PDF using position-based approach
// The PDF has:
// - Date/time items at x~4.8
// - Clinic name items at x~10.6 (on same y as date)
// - Vet name items at x~17.7 (on same y as date)
// - "Amount" header marks start of amounts section
// - Amount values at x~10-12 in amounts section
async function parseEzyVetPdfStructured(buffer: Buffer): Promise<ParsedReferral[]> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error(errData.parserError || 'PDF parsing failed'))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        const visits: {date: string, clinicName: string}[] = []
        const amounts: number[] = []
        let inAmountsSection = false
        let unknownClinicCount = 0
        
        for (const page of pdfData.Pages || []) {
          // Extract all text items with positions
          const pageItems: {text: string, y: number, x: number}[] = []
          
          for (const textItem of page.Texts || []) {
            for (const run of textItem.R || []) {
              if (run.T) {
                const decoded = decodeURIComponent(run.T).trim()
                if (decoded) {
                  pageItems.push({ 
                    text: decoded, 
                    y: textItem.y,
                    x: textItem.x || 0
                  })
                }
              }
            }
          }
          
          // Check if "Amount" header appears on this page (marks amounts section)
          for (const item of pageItems) {
            if (item.text === 'Amount' && item.x < 6) {
              inAmountsSection = true
              break
            }
          }
          
          if (inAmountsSection) {
            // In amounts section: extract numbers at x > 10
            for (const item of pageItems) {
              if (item.x > 10 && item.x < 15) {
                const val = parseFloat(item.text)
                if (!isNaN(val) && val > 0) {
                  amounts.push(val)
                }
              }
            }
          } else {
            // In visits section: look for date items at x < 6
            for (const item of pageItems) {
              // Check if this is a date/time item (at left side, x < 6)
              const dateMatch = item.text.match(/^(\d{2}-\d{2}-\d{4})\s+\d{1,2}:\d{2}[ap]m$/)
              if (dateMatch && item.x < 6) {
                const date = dateMatch[1]
                const y = item.y
                
                // Find clinic name on same line (x between 9 and 16)
                const clinicItems = pageItems.filter(i => 
                  Math.abs(i.y - y) < 0.5 && i.x > 9 && i.x < 16
                )
                
                if (clinicItems.length > 0) {
                  clinicItems.sort((a, b) => a.x - b.x)
                  const clinicName = clinicItems[0].text
                  
                  // Skip if it's "Unknown Clinic"
                  if (clinicName && clinicName.toLowerCase().includes('unknown clinic')) {
                    unknownClinicCount++
                  } else if (clinicName && clinicName.length > 2) {
                    visits.push({ 
                      date, 
                      clinicName: cleanClinicName(clinicName) 
                    })
                  }
                }
              }
            }
          }
        }
        
        const totalVisits = visits.length + unknownClinicCount
        const totalRevenue = amounts.reduce((sum, a) => sum + a, 0)
        
        console.log('[parseEzyVetPdfStructured] Known clinic visits:', visits.length)
        console.log('[parseEzyVetPdfStructured] Unknown clinic visits:', unknownClinicCount)
        console.log('[parseEzyVetPdfStructured] Total visits:', totalVisits)
        console.log('[parseEzyVetPdfStructured] Amount entries:', amounts.length)
        console.log('[parseEzyVetPdfStructured] Total revenue: $' + totalRevenue.toLocaleString())
        
        const referrals: ParsedReferral[] = []
        
        // Aggregate visits by clinic (case-insensitive)
        const visitCounts = new Map<string, {count: number, dates: string[], displayName: string}>()
        for (const visit of visits) {
          const key = visit.clinicName.toLowerCase()
          const existing = visitCounts.get(key) || {count: 0, dates: [], displayName: visit.clinicName}
          existing.count++
          existing.dates.push(visit.date)
          visitCounts.set(key, existing)
        }
        
        // Calculate average revenue per visit based on ALL visits (known + unknown)
        // This gives a fair estimate of revenue per referral
        const avgRevenuePerVisit = totalVisits > 0 ? totalRevenue / totalVisits : 0
        
        console.log('[parseEzyVetPdfStructured] Average revenue per visit: $' + avgRevenuePerVisit.toFixed(2))
        console.log('[parseEzyVetPdfStructured] Unique clinics:', visitCounts.size)
        
        // Create referral entries for each known clinic visit
        for (const [_, data] of visitCounts.entries()) {
          for (let i = 0; i < data.count; i++) {
            referrals.push({
              clinicName: data.displayName,
              amount: avgRevenuePerVisit,
              date: data.dates[i] || new Date().toISOString().split('T')[0]
            })
          }
        }
        
        console.log('[parseEzyVetPdfStructured] Created', referrals.length, 'referral entries')
        resolve(referrals)
      } catch (err) {
        reject(err)
      }
    })
    
    pdfParser.parseBuffer(buffer)
  })
}

// Helper to extract clinic name from a string that may have repeated vet name at end
function extractClinicName(str: string): string {
  // Common patterns:
  // "San Fernando Pet Hospital Unknown Vet" -> "San Fernando Pet Hospital"
  // "Van Nuys Veterinary Clinic Van Nuys Veterinary Clinic" -> "Van Nuys Veterinary Clinic"
  
  const words = str.split(/\s+/)
  if (words.length <= 3) return str
  
  // Check for "Unknown Vet" at end
  if (words.slice(-2).join(' ').toLowerCase() === 'unknown vet') {
    return words.slice(0, -2).join(' ')
  }
  
  // Check for repeated clinic name (vet = clinic)
  const halfLen = Math.ceil(words.length / 2)
  const firstHalf = words.slice(0, halfLen).join(' ').toLowerCase()
  const secondHalf = words.slice(halfLen).join(' ').toLowerCase()
  
  if (firstHalf === secondHalf || firstHalf.includes(secondHalf) || secondHalf.includes(firstHalf)) {
    return words.slice(0, halfLen).join(' ')
  }
  
  return str
}

// Known LA-area locations that may prefix clinic names in PDFs
const KNOWN_LOCATIONS = [
  'sherman oaks', 'studio city', 'encino', 'tarzana', 'woodland hills',
  'van nuys', 'north hollywood', 'burbank', 'glendale', 'pasadena',
  'los angeles', 'west hollywood', 'beverly hills', 'santa monica',
  'culver city', 'mar vista', 'playa vista', 'venice', 'marina del rey',
  'westchester', 'el segundo', 'manhattan beach', 'redondo beach',
  'torrance', 'palos verdes', 'san pedro', 'long beach', 'lakewood',
  'downey', 'whittier', 'la mirada', 'fullerton', 'anaheim', 'irvine',
  'costa mesa', 'newport beach', 'huntington beach', 'orange', 'tustin',
  'mission viejo', 'laguna', 'san clemente', 'oceanside', 'carlsbad',
  'la jolla', 'san diego', 'chula vista', 'north hills', 'reseda',
  'canoga park', 'chatsworth', 'northridge', 'granada hills', 'sylmar',
  'sun valley', 'arleta', 'pacoima', 'panorama city', 'lake balboa',
  'west hills', 'calabasas', 'agoura hills', 'thousand oaks', 'simi valley'
]

// Clean clinic name by removing location prefixes and stray numbers
// PDF format appears to be: "Location NumericID ActualClinicName"
function cleanClinicName(name: string): string {
  let cleaned = name.toLowerCase().trim()
  
  // Remove leading numbers only (like "33" or "226")
  cleaned = cleaned.replace(/^\d+\s+/, '')
  
  // Only strip location prefix if it's followed by a NUMBER
  // This indicates the location is metadata, not part of the clinic name
  // e.g., "Sherman Oaks 249 Glendale Hospital" → strip "Sherman Oaks 249"
  // but "Sherman Oaks Veterinary Group" → keep as is (no number after location)
  for (const location of KNOWN_LOCATIONS) {
    // Check if it starts with "location <number>"
    const pattern = new RegExp(`^${location}\\s+\\d+\\s+`, 'i')
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim()
      break
    }
  }
  
  // If the result still starts with a number, remove it
  cleaned = cleaned.replace(/^\d+\s+/, '')
  
  // Title case the result
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}

// Normalize words for better matching (e.g., "veterinarian" -> "vet")
function normalizeWord(word: string): string {
  const w = word.toLowerCase()
  // Normalize veterinary variations
  if (w.startsWith('veterinar') || w === 'vet') return 'vet'
  if (w === 'hosp' || w === 'hospital') return 'hospital'
  if (w === 'ctr' || w === 'center') return 'center'
  if (w === 'anim' || w === 'animal') return 'animal'
  return w
}

// Fuzzy match score - improved word overlap matching with normalization
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Word overlap matching with normalization
  const stopWords = ['the', 'and', 'of', 'for', 'in', 'at', 'llc', 'inc', 'corp', 'pc']
  const words1 = s1.split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w))
    .map(normalizeWord)
  const words2 = s2.split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w))
    .map(normalizeWord)
  
  let matchedWords = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      // Check exact match, partial match, or normalized match
      if (w1 === w2 || 
          (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1))) ||
          (w1.length >= 3 && w2.length >= 3 && w1.substring(0, 3) === w2.substring(0, 3))) {
        matchedWords++
        break
      }
    }
  }
  
  // Use the smaller word count as denominator for more lenient matching
  const minWords = Math.min(words1.length, words2.length)
  if (minWords === 0) return 0
  
  // Boost score if we matched most of the shorter name
  const baseScore = matchedWords / minWords
  
  // Penalize slightly if word counts differ significantly
  const lengthRatio = minWords / Math.max(words1.length, words2.length)
  
  return baseScore * (0.7 + 0.3 * lengthRatio)
}

// Find best matching partner from database
// IMPROVED: Prioritizes exact and near-exact matches before fuzzy matching
function findBestMatch(
  clinicName: string, 
  partners: Array<{ id: string; name: string }>
): { id: string; name: string; score: number } | null {
  const normalizedClinic = clinicName.toLowerCase().trim()
  
  // FIRST PASS: Check for exact match (case-insensitive)
  for (const partner of partners) {
    if (partner.name.toLowerCase().trim() === normalizedClinic) {
      return { ...partner, score: 1.0 }
    }
  }
  
  // SECOND PASS: Check for contains match (one contains the other)
  for (const partner of partners) {
    const normalizedPartner = partner.name.toLowerCase().trim()
    if (normalizedPartner.includes(normalizedClinic) || normalizedClinic.includes(normalizedPartner)) {
      return { ...partner, score: 0.95 }
    }
  }
  
  // THIRD PASS: Check for exact first word match (more specific than prefix)
  const clinicFirstWord = normalizedClinic.split(/\s+/)[0]
  for (const partner of partners) {
    const partnerFirstWord = partner.name.toLowerCase().trim().split(/\s+/)[0]
    // Both first words must match exactly (not just prefix)
    if (clinicFirstWord === partnerFirstWord && clinicFirstWord.length > 3) {
      // Now do full fuzzy match for ordering
      const score = fuzzyMatch(clinicName, partner.name)
      if (score >= 0.7) {
        return { ...partner, score }
      }
    }
  }
  
  // FOURTH PASS: Fuzzy matching with higher threshold
  let bestMatch = null
  let bestScore = 0
  const threshold = 0.7 // Increased from 0.6 for stricter matching
  
  for (const partner of partners) {
    const score = fuzzyMatch(clinicName, partner.name)
    if (score > bestScore && score >= threshold) {
      bestScore = score
      bestMatch = { ...partner, score }
    }
  }
  
  return bestMatch
}

// Common first/last name patterns that contain "Pet" but are NOT clinics
// e.g., Peter, Peterson, Petunia, Pete, Petrov, etc.
// This is a MODULE-LEVEL function used by both parsers
const petNamePatterns = [
  /^[A-Za-z]+,\s*Pet/i,        // "Smith, Peter" or "Abrahams, Peter"
  /^Pete\s+[A-Z]/,              // "Pete Maul" (first name Pete)
  /^Peter\s+[A-Z]/,             // "Peter Smith"
  /^Petunia\s/i,                // First name Petunia
  /^[A-Za-z]+\s+Pet[a-z]+$/i,   // "Sophia Petreca", "Murphy Petrella", "John Peterson"
  /^Pet[a-z]+\s+[A-Z]/i,        // "Petey Karp", "Petty Vigil"
  /Pet[a-z]+$/i,                // Ends with a Pet-like surname (Peterson, Petrov, Petrokubi, etc.)
  /^[A-Za-z]+\s+Pet[a-z]*$/i,   // "FirstName Pet*" pattern (Chunky Petrosyan, Daisy Peterson)
  /^Pet[a-z]+$/i,               // Single word starting with Pet (Petey, Peter, etc.)
]

// Check if a line looks like a person/pet name rather than a clinic name
function isLikelyPersonName(line: string): boolean {
  const trimmed = line.trim()
  
  // Check against known person name patterns
  for (const pattern of petNamePatterns) {
    if (pattern.test(trimmed)) return true
  }
  
  // Check for "LastName, FirstName" pattern without clinic keywords
  if (/^[A-Za-z]+,\s*[A-Za-z]+$/.test(trimmed)) {
    const lower = trimmed.toLowerCase()
    if (!lower.includes('vet') && !lower.includes('animal') && 
        !lower.includes('hospital') && !lower.includes('clinic')) {
      return true
    }
  }
  
  // Check for simple "FirstName LastName" pattern (2 words, both alphabetic only)
  // that doesn't contain clinic keywords
  const words = trimmed.split(/\s+/)
  if (words.length === 2 && 
      /^[A-Za-z]+$/.test(words[0]) && 
      /^[A-Za-z]+$/.test(words[1])) {
    const lower = trimmed.toLowerCase()
    if (!lower.includes('vet') && !lower.includes('animal') && 
        !lower.includes('hospital') && !lower.includes('clinic') &&
        !lower.includes('care') && !lower.includes('center') &&
        !lower.includes('medical') && !lower.includes('vca')) {
      // This looks like "FirstName LastName" without any clinic keywords
      return true
    }
  }
  
  return false
}

// Parse the PDF content and extract referral data
// Each row in the PDF represents one appointment/visit
// We need to count each row where the Partner (clinic) is NOT "Unknown"
function parsePdfContent(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  // Pattern to match date: MM-DD-YYYY
  const datePattern = /(\d{2}-\d{2}-\d{4})/
  // Pattern to match amount (standalone number or with decimals)
  const amountPattern = /^(\d+(?:\.\d{1,2})?)$/
  
  let currentDate = ''
  let currentClinic = ''
  let lastClinicLine = -1  // Track when we last saw a clinic name
  
  // Track all entries to help with debugging
  let totalAmountLines = 0
  let skippedUnknownClinic = 0
  
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
      continue
    }
    
    // Check for "Unknown Clinic" in the Partner column
    // This indicates the clinic/partner is unknown - skip these
    // BUT: "Unknown Vet" (referring vet person) is OK to count
    const lineLower = line.toLowerCase()
    if (lineLower.includes('unknown clinic') || 
        lineLower === 'unknown') {
      // This is an unknown partner - skip and clear clinic
      currentClinic = ''
      skippedUnknownClinic++
      continue
    }
    
    // Skip lines that look like person names (not clinics)
    if (isLikelyPersonName(line)) {
      continue
    }
    
    // Identify clinic names (Partner column)
    // Must have veterinary/hospital keywords - "Pet" alone is not enough
    const isClinicName = (
      // Strong clinic indicators
      line.includes('Veterinary') ||
      line.includes('Vet ') ||  // "Vet " with space, not "Peter"
      line.includes('Vets') ||  // "Southpaw Vets"
      line.includes('Animal Hospital') ||
      line.includes('Animal Clinic') ||
      line.includes('Animal Center') ||
      line.includes('Pet Hospital') ||
      line.includes('Pet Clinic') ||
      line.includes('Pet Medical') ||
      line.includes('Pet Care') ||
      line.includes('Pet Doctors') ||  // "The Pet Doctors of..."
      /\bVCA\b/.test(line) ||  // VCA prefix
      line.includes('Southpaw') ||
      line.includes('Modern Animal') ||
      // Looser matches that need to be combined with other keywords
      (line.includes('Hospital') && (line.includes('Animal') || line.includes('Pet'))) ||
      (line.includes('Clinic') && (line.includes('Animal') || line.includes('Pet') || line.includes('Vet'))) ||
      (line.includes('Center') && (line.includes('Animal') || line.includes('Vet') || line.includes('Medical')))
    ) && !lineLower.includes('unknown clinic')
    
    if (isClinicName) {
      // Clean the clinic name to remove location prefixes and stray numbers
      currentClinic = cleanClinicName(line.replace(/\s+/g, ' ').trim())
      lastClinicLine = i
    }
    
    // Check for amount (standalone number - this represents one appointment row)
    // Each amount = 1 visit
    const amountMatch = line.match(amountPattern)
    if (amountMatch) {
      totalAmountLines++
      const amount = parseFloat(amountMatch[1])
      
      // Only count if we have a valid clinic (not Unknown)
      if (!isNaN(amount) && amount > 0 && currentClinic) {
        referrals.push({
          clinicName: currentClinic,
          amount,
          date: currentDate || new Date().toISOString().split('T')[0]
        })
        // DON'T reset currentClinic - the next amount line may also belong to this clinic
        // The clinic name appears once, followed by multiple appointment amounts
      }
    }
  }
  
  console.log('[parse-referrals] Parsing stats: totalAmountLines=', totalAmountLines, 
              'skippedUnknownClinic=', skippedUnknownClinic, 
              'validReferrals=', referrals.length)
  
  return referrals
}

// Alternative parsing - regex based for robustness
// This method scans for patterns where clinic names are followed by amounts
function parsePdfContentV2(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  
  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim()
  
  // Skip if this appears to be the Unknown Clinic
  const unknownPattern = /unknown\s+clinic/gi
  
  // Known clinic name patterns with amounts following
  // This captures: ClinicName Amount
  // IMPORTANT: "Pet" alone is NOT enough - it must be followed by clinic keywords
  // to avoid matching person names like "Pete Maul" or "Daisy Peterson"
  // Pattern requires explicit clinic keywords: Veterinary, Vet, Animal, Hospital, Clinic, etc.
  const clinicAmountPattern = /((?:VCA|Southpaw|Modern Animal|[\w\s]+(?:Vet(?:erinary)?|Animal\s+(?:Hospital|Clinic|Center|Care)|Pet\s+(?:Hospital|Clinic|Medical|Care|Doctors)|Hospital|Clinic|Care\s+Center|Medical\s+Center))[\w\s]*?)\s+(\d+(?:\.\d{1,2})?)\s/gi
  
  let match
  
  while ((match = clinicAmountPattern.exec(cleanText)) !== null) {
    const rawClinicName = match[1].trim()
    
    // Skip Unknown Clinic entries (but NOT "Unknown Vet" which is just the vet person)
    if (rawClinicName.toLowerCase().includes('unknown clinic') ||
        rawClinicName.toLowerCase() === 'unknown') {
      continue
    }
    
    // CRITICAL: Filter out person/pet names that may have slipped through
    if (isLikelyPersonName(rawClinicName)) {
      continue
    }
    
    // Clean the clinic name to remove location prefixes
    const clinicName = cleanClinicName(rawClinicName)
    const amount = parseFloat(match[2])
    
    if (!isNaN(amount) && amount > 0 && clinicName.length > 3) {
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
    
    // Get the Authorization header with Bearer token
    const authHeader = getHeader(event, 'authorization')
    const config = useRuntimeConfig()
    
    let userId: string | undefined
    let userEmail: string | undefined
    
    // Try to get user from Authorization header first (more reliable)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      console.log('[parse-referrals] Found Bearer token, verifying...')
      
      // Create a client with the user's token to get their info
      const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL
      const supabaseKey = config.public.supabaseKey || process.env.SUPABASE_KEY
      
      if (!supabaseUrl || !supabaseKey) {
        throw createError({ statusCode: 500, message: 'Supabase configuration missing' })
      }
      
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      })
      
      const { data: { user }, error: userError } = await userClient.auth.getUser()
      
      if (userError || !user) {
        console.log('[parse-referrals] Token verification failed:', userError?.message)
        throw createError({ statusCode: 401, message: 'Invalid or expired token' })
      }
      
      userId = user.id
      userEmail = user.email
      console.log('[parse-referrals] User verified from token:', { userId, userEmail })
    } else {
      // Fallback to serverSupabaseUser
      const user = await serverSupabaseUser(event)
      userId = user?.id
      userEmail = user?.email
      console.log('[parse-referrals] User from serverSupabaseUser:', { userId, userEmail })
    }
    
    if (!userId) {
      throw createError({ statusCode: 401, message: 'Unauthorized - no user session found' })
    }
    
    // Get supabase clients
    const supabase = await serverSupabaseClient(event)
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    
    console.log('[parse-referrals] Looking up profile for auth_user_id:', userId)
    
    // Check if user is admin or marketing_admin using service role (bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, auth_user_id')
      .eq('auth_user_id', userId)
      .single()
    
    console.log('[parse-referrals] Profile lookup result:', { 
      profile, 
      error: profileError?.message,
      code: profileError?.code 
    })
    
    const allowedRoles = ['admin', 'marketing_admin']
    if (profileError) {
      console.log('[parse-referrals] Profile lookup error:', profileError)
      throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileError.message}` })
    }
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      console.log('[parse-referrals] Access denied for role:', profile?.role)
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
      throw createError({ statusCode: 400, message: 'No PDF file found' })
    }
    
    console.log('[parse-referrals] File received, size:', file.data.length, 'bytes')
    
    // Parse PDF using the new structured EzyVet parser
    let referrals: ParsedReferral[]
    let text: string = ''
    
    try {
      console.log('[parse-referrals] Parsing PDF with structured EzyVet parser...')
      const pdfBuffer = Buffer.from(file.data)
      
      // Try the new structured parser first
      referrals = await parseEzyVetPdfStructured(pdfBuffer)
      console.log('[parse-referrals] Structured parser found:', referrals.length, 'referrals')
      
      // Also get text for date range extraction
      text = await parsePdfToText(pdfBuffer)
      
      // If structured parser didn't find much, fall back to legacy parsers
      if (referrals.length < 10) {
        console.log('[parse-referrals] Structured parser found few results, trying legacy methods...')
        const referrals1 = parsePdfContent(text)
        const referrals2 = parsePdfContentV2(text)
        
        console.log('[parse-referrals] Legacy Method 1 found:', referrals1.length, 'entries')
        console.log('[parse-referrals] Legacy Method 2 found:', referrals2.length, 'entries')
        
        // Use whichever method found the most
        if (referrals1.length > referrals.length || referrals2.length > referrals.length) {
          referrals = referrals1.length >= referrals2.length ? referrals1 : referrals2
          console.log('[parse-referrals] Using legacy parser with', referrals.length, 'results')
        }
      }
      
    } catch (pdfError: any) {
      console.error('[parse-referrals] PDF parsing error:', pdfError)
      throw createError({ 
        statusCode: 500, 
        message: `Failed to parse PDF: ${pdfError.message || 'Unknown error'}` 
      })
    }
    
    console.log('[parse-referrals] Final referrals count:', referrals.length)
    
    // Extract date range from header
    const startMatch = text.match(/START\s+(\d{2}-\d{2}-\d{4})/)
    const endMatch = text.match(/END\s+(\d{2}-\d{2}-\d{4})|Report\s+End\s+Date\s+(\d{2}-\d{2}-\d{4})/)
    
    // Handle different date range formats
    const endDateStr = endMatch?.[1] || endMatch?.[2]
    console.log('[parse-referrals] Date range:', startMatch?.[1], 'to', endDateStr)
    
    // Parse dates for comparison
    let parsedStartDate: string | null = null
    let parsedEndDate: string | null = null
    
    if (startMatch?.[1]) {
      const [month, day, year] = startMatch[1].split('-')
      parsedStartDate = `${year}-${month}-${day}`
    }
    if (endDateStr) {
      const [month, day, year] = endDateStr.split('-')
      parsedEndDate = `${year}-${month}-${day}`
    }
    
    // Check if this date range has already been processed (prevent duplicate uploads)
    if (parsedStartDate && parsedEndDate) {
      const { data: existingSync } = await supabase
        .from('referral_sync_history')
        .select('id, created_at')
        .eq('date_range_start', parsedStartDate)
        .eq('date_range_end', parsedEndDate)
        .limit(1)
      
      if (existingSync && existingSync.length > 0) {
        const uploadedAt = new Date(existingSync[0].created_at).toLocaleDateString()
        console.log('[parse-referrals] Duplicate date range detected, already uploaded on:', uploadedAt)
        throw createError({
          statusCode: 409,
          message: `This report (${startMatch?.[1] || 'N/A'} to ${endDateStr || 'N/A'}) was already uploaded on ${uploadedAt}. Duplicate uploads are prevented to avoid double-counting data.`
        })
      }
    }
    
    // Aggregate by clinic - sum up visits and revenue per clinic
    const aggregated = aggregateByClinic(referrals)
    console.log('[parse-referrals] Aggregated to', aggregated.length, 'unique clinics')
    
    // Log some sample aggregated data for debugging
    for (const agg of aggregated.slice(0, 5)) {
      console.log(`  - ${agg.clinicName}: ${agg.totalVisits} visits, $${agg.totalRevenue}`)
    }
    
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
    
    // Calculate skipped (Unknown Clinic entries - where Partner is Unknown)
    // Count only "Unknown Clinic" patterns, NOT "Unknown Vet" (that's just the vet person name)
    const unknownClinicMatches = text.match(/unknown\s+clinic/gi) || []
    const unknownOnlyMatches = text.split('\n').filter(line => {
      const trimmed = line.trim().toLowerCase()
      // Count lines that are just "Unknown" (likely Partner column)
      return trimmed === 'unknown'
    })
    result.skipped = unknownClinicMatches.length + unknownOnlyMatches.length
    
    // Log sync history (for audit trail and duplicate prevention)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .single()
    
    await supabase.from('referral_sync_history').insert({
      filename: file.filename || 'referrer-revenue.pdf',
      date_range_start: parsedStartDate,
      date_range_end: parsedEndDate,
      total_rows_parsed: referrals.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profileData?.id,
      sync_details: {
        notMatched: result.notMatched,
        visitorsAdded: result.visitorsAdded,
        clinicDetails: result.details,
        dateRangeRaw: {
          start: startMatch?.[1],
          end: endMatch?.[1]
        }
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
