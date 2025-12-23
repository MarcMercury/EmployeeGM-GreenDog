/**
 * Reset and Parse Referral PDFs
 * 
 * This script:
 * 1. Clears all referral statistics from referral_partners (clean slate)
 * 2. Parses the 2023-2024 and 2024-2025 referral PDFs from public folder
 * 3. Updates referral_partners with aggregated stats
 * 
 * PDF Structure:
 * - Each clinic section starts with: [Clinic Name (multiline)] [TOTAL]
 * - Individual appointments follow: [Date] [Time] [Clinic] [Vet] [Client] [Animal] [Division] [Amount]
 * - We capture individual appointment amounts, not clinic totals
 * 
 * Run with: npx tsx scripts/reset-and-parse-referrals.ts
 */

import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'
import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ParsedReferral {
  clinicName: string
  amount: number
  visits: number
  date: string
}

interface AggregatedStats {
  clinicName: string
  totalVisits: number
  totalRevenue: number
}

// Parse PDF buffer to text using pdf2json
async function parsePdfToText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('pdf2json error:', errData.parserError)
      reject(new Error(errData.parserError || 'PDF parsing failed'))
    })
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
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
    
    pdfParser.parseBuffer(buffer)
  })
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
function cleanClinicName(name: string): string {
  let cleaned = name.toLowerCase().trim()
  
  // Remove leading numbers only (like "33" or "226")
  cleaned = cleaned.replace(/^\d+\s+/, '')
  
  // Only strip location prefix if it's followed by a NUMBER
  for (const location of KNOWN_LOCATIONS) {
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

// Normalize words for better matching
function normalizeWord(word: string): string {
  const w = word.toLowerCase()
  if (w.startsWith('veterinar') || w === 'vet') return 'vet'
  if (w === 'hosp' || w === 'hospital') return 'hospital'
  if (w === 'ctr' || w === 'center') return 'center'
  if (w === 'anim' || w === 'animal') return 'animal'
  return w
}

// Fuzzy match score
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
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
      if (w1 === w2 || 
          (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1))) ||
          (w1.length >= 3 && w2.length >= 3 && w1.substring(0, 3) === w2.substring(0, 3))) {
        matchedWords++
        break
      }
    }
  }
  
  const minWords = Math.min(words1.length, words2.length)
  if (minWords === 0) return 0
  
  const baseScore = matchedWords / minWords
  const lengthRatio = minWords / Math.max(words1.length, words2.length)
  
  return baseScore * (0.7 + 0.3 * lengthRatio)
}

// Find best matching partner
function findBestMatch(
  clinicName: string, 
  partners: Array<{ id: string; name: string }>
): { id: string; name: string; score: number } | null {
  let bestMatch = null
  let bestScore = 0
  const threshold = 0.6
  
  for (const partner of partners) {
    const score = fuzzyMatch(clinicName, partner.name)
    if (score > bestScore && score >= threshold) {
      bestScore = score
      bestMatch = { ...partner, score }
    }
  }
  
  return bestMatch
}

// Keywords that indicate a line is part of a clinic name
const clinicKeywords = [
  'veterinary', 'vet', 'vets', 'animal', 'hospital', 'clinic', 
  'center', 'pet', 'care', 'medical', 'specialty', 'specialists', 'southpaw', 
  'modern', 'vca', 'access', 'affordable', 'angels', 'balboa',
  'beverly', 'calabasas', 'centinela', 'encino', 'emerald', 
  'glendale', 'granada', 'holistika', 'larchmont', 'los altos',
  'los feliz', 'mar vista', 'marina', 'mcgrath', 'metropolitan',
  'mid valley', 'miller', 'mohawk', 'overland', 'pacific', 'palms',
  'palisades', 'park la brea', 'rancho', 'robertson', 'san fernando',
  'santa monica', 'serenity', 'shane', 'sherman oaks', 'sinai',
  'studio city', 'tarzana', 'the pet doctors', 'tlc', 'townsgate',
  'true care', 'truecare', 'valley', 'van nuys', 'village', 
  'warner', 'west la', 'west los angeles', 'westchester', 'winnetka',
  'cahuenga', 'party', 'partyanimals', 'altos'
]

const datePattern = /^(\d{2}-\d{2}-\d{4})/
const timePattern = /^\d{1,2}:\d{2}(am|pm)?$/i
const amountPattern = /^(\d+(?:\.\d{1,2})?)$/

function isClinicPart(line: string): boolean {
  const lower = line.toLowerCase()
  if (datePattern.test(line)) return false
  if (amountPattern.test(line)) return false
  if (timePattern.test(line)) return false
  if (lower === 'unknown' || lower === 'unknown vet') return false
  if (lower.includes('green dog')) return false
  if (/^[A-Za-z]+,\s+[A-Za-z]+$/.test(line)) return false // "Last, First" pattern
  if (line.length < 3) return false
  return clinicKeywords.some(kw => lower.includes(kw))
}

function isValidClinic(combined: string): boolean {
  const lower = combined.toLowerCase()
  return (
    lower.includes('veterinary') ||
    lower.includes('veterinarian') ||   // "Beverly Robertson Veterinarian"
    lower.includes(' vet ') ||
    lower.includes(' vets') ||
    lower.endsWith(' vet') ||           // "Larchmont Village Vet"
    lower.includes('animal hospital') ||
    lower.includes('animal clinic') ||
    lower.includes('pet hospital') ||
    lower.includes('pet clinic') ||
    lower.includes('pet medical') ||
    lower.includes('pet care') ||
    lower.includes('pet doctors') ||
    lower.includes('dog and cat') ||    // "Dog and Cat Hospital"
    /\bvca\b/.test(lower) ||
    lower.includes('southpaw') ||
    lower.includes('modern animal') ||
    lower.includes('partyanimals') ||
    lower.includes('larchmont') ||      // Known clinic
    lower.includes('access specialty') || // ACCESS Specialty Animal Hospitals
    (lower.includes('hospital') && (lower.includes('animal') || lower.includes('cat') || lower.includes('dog'))) ||
    (lower.includes('clinic') && (lower.includes('animal') || lower.includes('pet'))) ||
    (lower.includes('center') && (lower.includes('animal') || lower.includes('medical') || lower.includes('veterinary')))
  )
}

/**
 * Parse PDF content - Two-phase approach
 * 
 * Phase 1: Scan for section headers (clinic totals) which have [Clinic Name] [Amount] [Date] 
 *          WITHOUT "Green Dog" before the amount. These establish the clinic boundaries.
 * 
 * Phase 2: Scan for appointments which have [Green Dog - Sherman Oaks] [Amount] pattern.
 *          Each appointment belongs to the most recent section header before it.
 */
function parsePdfContent(text: string): ParsedReferral[] {
  const referrals: ParsedReferral[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(l => l)
  
  const datePattern = /^\d{2}-\d{2}-\d{4}$/
  const amountPattern = /^\d+(?:\.\d{1,2})?$/
  const timePattern = /^\d{1,2}:\d{2}(am|pm)?$/i
  
  interface ClinicSection {
    clinicName: string
    totalAmount: number
    headerLine: number
  }
  
  interface AppointmentRecord {
    clinicName: string
    amount: number
    lineNum: number
  }
  
  const sectionHeaders: ClinicSection[] = []
  const appointments: AppointmentRecord[] = []
  let unknownSectionLine = -1  // Track where Unknown Clinic section starts
  
  // Phase 1: Find section headers - [Clinic Name] [Amount] [Date] without Green Dog
  let i = 0
  while (i < lines.length - 1) {
    // Check if current line is an amount and next line is a date (section header pattern)
    if (amountPattern.test(lines[i]) && datePattern.test(lines[i + 1])) {
      const amount = parseFloat(lines[i])
      
      // Look back to check if Green Dog appears (would make this an appointment, not header)
      let hasGreenDog = false
      const clinicLines: string[] = []
      
      for (let j = i - 1; j >= 0 && j >= i - 8; j--) {
        const testLine = lines[j]
        const testLower = testLine.toLowerCase()
        
        if (testLower.includes('green dog')) {
          hasGreenDog = true
          break
        }
        if (testLower === 'sherman oaks' || testLower === 'oaks') continue
        if (amountPattern.test(testLine) || datePattern.test(testLine) || timePattern.test(testLine)) break
        if (testLower === 'amount' || testLower === 'division' || testLower === 'client' ||
            testLower === 'referring vet' || testLower === 'date/time' || 
            testLine.includes('PRINTED') || testLine.includes('Sheet')) continue
        if (testLower === 'unknown vet') continue
        if (/^[A-Za-z]+,\s*[A-Za-z]*$/.test(testLine)) continue
        
        clinicLines.unshift(testLine)
      }
      
      // This is a section header if no Green Dog found
      if (!hasGreenDog && clinicLines.length > 0) {
        const clinicName = clinicLines.join(' ')
        const lowerClinic = clinicName.toLowerCase()
        
        if (lowerClinic === 'unknown' || lowerClinic === 'unknown clinic' || 
            lowerClinic.includes('unknown clinic')) {
          unknownSectionLine = i
        } else if (isValidClinic(clinicName)) {
          sectionHeaders.push({
            clinicName: cleanClinicName(clinicName),
            totalAmount: amount,
            headerLine: i
          })
        }
      }
    }
    i++
  }
  
  // Phase 2: Find ALL appointments by scanning for [Green Dog] [Sherman Oaks] [Amount] pattern
  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i].toLowerCase()
    
    // Look for "Green Dog" marker
    if (line.includes('green dog')) {
      // Pattern 1: "Sherman Oaks" on one line, then amount
      // Pattern 2: "Sherman" on line+1, "Oaks" on line+2, then amount on line+3
      let amountLine = -1
      
      if (lines[i + 1]?.toLowerCase() === 'sherman oaks' && amountPattern.test(lines[i + 2])) {
        amountLine = i + 2
      } else if (lines[i + 1]?.toLowerCase() === 'sherman' && 
                 lines[i + 2]?.toLowerCase() === 'oaks' && 
                 amountPattern.test(lines[i + 3])) {
        amountLine = i + 3
      }
      
      if (amountLine !== -1) {
        const amount = parseFloat(lines[amountLine])
        
        // Skip if after Unknown section
        if (unknownSectionLine !== -1 && amountLine >= unknownSectionLine) continue
        
        // Find the clinic from the most recent section header
        let closestClinic = ''
        for (let s = sectionHeaders.length - 1; s >= 0; s--) {
          if (sectionHeaders[s].headerLine < amountLine) {
            closestClinic = sectionHeaders[s].clinicName
            break
          }
        }
        
        if (closestClinic) {
          appointments.push({
            clinicName: closestClinic,
            amount: amount,
            lineNum: amountLine
          })
        }
      }
    }
  }
  
  // Aggregate appointments by clinic
  const clinicStats = new Map<string, { visits: number; revenue: number }>()
  
  for (const appt of appointments) {
    const existing = clinicStats.get(appt.clinicName) || { visits: 0, revenue: 0 }
    existing.visits += 1
    existing.revenue += appt.amount
    clinicStats.set(appt.clinicName, existing)
  }
  
  // Convert to referrals
  for (const [clinicName, stats] of clinicStats) {
    referrals.push({
      clinicName,
      amount: Math.round(stats.revenue * 100) / 100,
      visits: stats.visits,
      date: new Date().toISOString().split('T')[0]
    })
  }
  
  console.log(`  Parsing stats: sectionHeaders=${sectionHeaders.length}, appointments=${appointments.length}`)
  
  return referrals
}

// Aggregate referrals by clinic
function aggregateByClinic(referrals: ParsedReferral[]): AggregatedStats[] {
  const clinicMap = new Map<string, { visits: number; revenue: number }>()
  
  for (const ref of referrals) {
    const normalizedName = ref.clinicName.trim()
    const existing = clinicMap.get(normalizedName) || { visits: 0, revenue: 0 }
    existing.visits += ref.visits  // Use the visit count from parsing
    existing.revenue += ref.amount
    clinicMap.set(normalizedName, existing)
  }
  
  return Array.from(clinicMap.entries()).map(([clinicName, stats]) => ({
    clinicName,
    totalVisits: stats.visits,
    totalRevenue: Math.round(stats.revenue * 100) / 100
  }))
}

async function main() {
  console.log('='.repeat(70))
  console.log('REFERRAL STATISTICS RESET AND PARSE')
  console.log('='.repeat(70))
  console.log('')
  
  // Step 1: Clear all referral statistics
  console.log('📊 Step 1: Clearing all referral statistics (clean slate)...')
  
  const { error: resetError } = await supabase
    .from('referral_partners')
    .update({
      total_referrals_all_time: 0,
      total_revenue_all_time: 0,
      last_sync_date: null
    })
    .gte('id', '00000000-0000-0000-0000-000000000000') // Match all rows
  
  if (resetError) {
    console.error('Failed to reset statistics:', resetError)
    process.exit(1)
  }
  
  console.log('✅ All referral statistics reset to 0\n')
  
  // Step 2: Parse both PDF files
  const pdfFiles = [
    '2023-2024 Ref.pdf',
    '2024-2025 Ref.pdf'
  ]
  
  // Fetch all partners for matching
  const { data: partners, error: partnersError } = await supabase
    .from('referral_partners')
    .select('id, name, total_referrals_all_time, total_revenue_all_time')
  
  if (partnersError || !partners) {
    console.error('Failed to fetch partners:', partnersError)
    process.exit(1)
  }
  
  console.log(`📋 Found ${partners.length} partners in database to match against\n`)
  
  // Track cumulative stats for each partner
  const partnerStats = new Map<string, { visits: number; revenue: number }>()
  
  // Track all unmatched clinics
  const allUnmatched: Array<{ name: string; visits: number; revenue: number }> = []
  
  // Process each PDF
  for (const filename of pdfFiles) {
    const filePath = path.join(process.cwd(), 'public', filename)
    
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      continue
    }
    
    console.log('='.repeat(70))
    console.log(`📄 Processing: ${filename}`)
    console.log('='.repeat(70))
    
    // Read and parse PDF
    const buffer = readFileSync(filePath)
    console.log(`  File size: ${buffer.length} bytes`)
    
    let text: string
    try {
      text = await parsePdfToText(buffer)
      console.log(`  Extracted text length: ${text.length} characters`)
    } catch (err) {
      console.error(`  Failed to parse PDF: ${err}`)
      continue
    }
    
    // Extract date range
    const startMatch = text.match(/START\s+(\d{2}-\d{2}-\d{4})/)
    const endMatch = text.match(/END\s+(\d{2}-\d{2}-\d{4})/)
    console.log(`  Date range: ${startMatch?.[1] || 'N/A'} to ${endMatch?.[1] || 'N/A'}`)
    
    // Parse referrals
    const referrals = parsePdfContent(text)
    console.log(`  Found ${referrals.length} individual referral entries`)
    
    // Aggregate by clinic
    const aggregated = aggregateByClinic(referrals)
    console.log(`  Aggregated to ${aggregated.length} unique clinics`)
    
    // Match and accumulate stats
    let matched = 0
    let notMatched = 0
    
    for (const agg of aggregated) {
      const match = findBestMatch(agg.clinicName, partners)
      
      if (match) {
        // Accumulate stats for this partner
        const existing = partnerStats.get(match.id) || { visits: 0, revenue: 0 }
        existing.visits += agg.totalVisits
        existing.revenue += agg.totalRevenue
        partnerStats.set(match.id, existing)
        matched++
      } else {
        notMatched++
        allUnmatched.push({
          name: agg.clinicName,
          visits: agg.totalVisits,
          revenue: agg.totalRevenue
        })
      }
    }
    
    console.log(`  Matched: ${matched}, Not matched: ${notMatched}`)
    console.log('')
  }
  
  // Step 3: Update all partners with accumulated stats
  console.log('='.repeat(70))
  console.log('📊 Step 3: Updating partner statistics...')
  console.log('='.repeat(70))
  
  let updatedCount = 0
  let totalVisits = 0
  let totalRevenue = 0
  
  for (const [partnerId, stats] of partnerStats) {
    const partner = partners.find(p => p.id === partnerId)
    
    const { error } = await supabase
      .from('referral_partners')
      .update({
        total_referrals_all_time: stats.visits,
        total_revenue_all_time: Math.round(stats.revenue * 100) / 100,
        last_sync_date: new Date().toISOString()
      })
      .eq('id', partnerId)
    
    if (!error) {
      updatedCount++
      totalVisits += stats.visits
      totalRevenue += stats.revenue
      console.log(`  ✓ ${partner?.name}: ${stats.visits} visits, $${stats.revenue.toFixed(2)}`)
    } else {
      console.error(`  ✗ Failed to update ${partner?.name}:`, error.message)
    }
  }
  
  // Show unmatched clinics
  if (allUnmatched.length > 0) {
    console.log('')
    console.log('='.repeat(70))
    console.log('❓ Unmatched clinics (need to add to database or improve matching):')
    console.log('='.repeat(70))
    for (const c of allUnmatched.slice(0, 30)) {
      console.log(`  - ${c.name} (${c.visits} visits, $${c.revenue.toFixed(2)})`)
    }
    if (allUnmatched.length > 30) {
      console.log(`  ... and ${allUnmatched.length - 30} more`)
    }
  }
  
  console.log('')
  console.log('='.repeat(70))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(70))
  console.log(`Partners updated: ${updatedCount}`)
  console.log(`Total visits recorded: ${totalVisits}`)
  console.log(`Total revenue recorded: $${totalRevenue.toFixed(2)}`)
  console.log(`Unmatched clinics: ${allUnmatched.length}`)
  console.log('='.repeat(70))
}

main().catch(console.error)
