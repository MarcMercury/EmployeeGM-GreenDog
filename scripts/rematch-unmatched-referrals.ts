/**
 * Re-match Unmatched Referral Entries
 * 
 * This script reviews all unmatched clinic entries in referral_sync_history
 * and attempts to match them using the improved fuzzy matching logic.
 * Matched entries have their stats applied to the partner and are marked as matched.
 * 
 * Run with: npx tsx scripts/rematch-unmatched-referrals.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

// Check if a word is a "generic" term that shouldn't count as a unique identifier
function isGenericTerm(word: string): boolean {
  const generic = [
    'vet', 'veterinary', 'veterinarian', 'animal', 'hospital', 'clinic', 'center', 
    'pet', 'pets', 'care', 'medical', 'group', 'small', 'large', 'emergency',
    'specialty', 'specialists', 'associates', 'practice', 'doctors', 'doctor',
    'city', 'oaks', 'hills', 'beach', 'valley', 'heights', 'park', 'west', 'east',
    'north', 'south', 'los', 'la', 'angeles', 'santa', 'san'
  ]
  return generic.includes(word.toLowerCase())
}

// Stricter fuzzy match - requires unique identifying words to match
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  // Exact match
  if (s1 === s2) return 1.0
  
  // Contains match (full string)
  if (s1.includes(s2) || s2.includes(s1)) return 0.95
  
  // Word-based matching
  const stopWords = ['the', 'and', 'of', 'for', 'in', 'at', 'llc', 'inc', 'corp', 'pc', 'dvm']
  const words1 = s1.split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w))
  const words2 = s2.split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.includes(w))
  
  // Get unique words (non-generic identifiers) from each
  const unique1 = words1.filter(w => !isGenericTerm(w))
  const unique2 = words2.filter(w => !isGenericTerm(w))
  
  // Count matching unique words (these are the real identifiers)
  let uniqueMatches = 0
  for (const w1 of unique1) {
    for (const w2 of unique2) {
      // Require exact match for unique identifiers
      if (w1 === w2) {
        uniqueMatches++
        break
      }
    }
  }
  
  // STRICT: Require at least 1 unique word match if both have unique words
  // If one side has no unique words, we can't make a reliable match
  const minUnique = Math.min(unique1.length, unique2.length)
  if (minUnique > 0 && uniqueMatches === 0) {
    return 0 // No unique identifiers matched
  }
  
  // If neither has unique words (e.g., "Animal Hospital" vs "Pet Clinic"), no match
  if (unique1.length === 0 && unique2.length === 0) {
    return 0
  }
  
  // Calculate score based on unique word matches
  if (minUnique > 0) {
    const uniqueScore = uniqueMatches / minUnique
    // Require at least 50% of unique words to match
    if (uniqueScore < 0.5) {
      return 0
    }
    return uniqueScore * 0.9 // Cap at 0.9 for partial matches
  }
  
  return 0
}

// Find best matching partner from database - VERY STRICT
function findBestMatch(
  clinicName: string, 
  partners: Array<{ id: string; name: string }>
): { id: string; name: string; score: number } | null {
  // First clean the clinic name
  const cleanedName = cleanClinicName(clinicName)
  
  // Skip garbage entries
  if (cleanedName.length < 10 || 
      cleanedName.includes('Referring Vet Client') ||
      cleanedName.startsWith('Ordable') ||
      clinicName.toLowerCase().startsWith('ordable')) {
    return null
  }
  
  let bestMatch = null
  let bestScore = 0
  
  for (const partner of partners) {
    const partnerLower = partner.name.toLowerCase()
    const cleanedLower = cleanedName.toLowerCase()
    
    // Require the cleaned name to be contained in partner name or vice versa
    // This is very strict - only exact substring matches
    if (partnerLower === cleanedLower) {
      // Exact match
      return { ...partner, score: 1.0 }
    }
    
    if (partnerLower.includes(cleanedLower) || cleanedLower.includes(partnerLower)) {
      const score = 0.95
      if (score > bestScore) {
        bestScore = score
        bestMatch = { ...partner, score }
      }
    }
  }
  
  return bestMatch
}

async function main() {
  console.log('🔍 Starting re-matching of unmatched referral entries...\n')

  // Step 1: Fetch all referral partners
  const { data: partners, error: partnersError } = await supabase
    .from('referral_partners')
    .select('id, name, total_referrals_all_time, total_revenue_all_time')

  if (partnersError || !partners) {
    console.error('Failed to fetch partners:', partnersError)
    process.exit(1)
  }

  console.log(`📋 Found ${partners.length} referral partners in database\n`)

  // Step 2: Fetch all sync history records
  const { data: history, error: historyError } = await supabase
    .from('referral_sync_history')
    .select('*')
    .order('created_at', { ascending: false })

  if (historyError || !history) {
    console.error('Failed to fetch sync history:', historyError)
    process.exit(1)
  }

  console.log(`📁 Found ${history.length} sync history records\n`)

  // Aggregate updates by partner
  const partnerUpdates = new Map<string, { visitsToAdd: number; revenueToAdd: number }>()
  const syncUpdates: { syncId: string; details: any[] }[] = []
  
  let totalUnmatched = 0
  let totalNewMatches = 0
  let totalStillUnmatched = 0

  // Step 3: Process each sync record
  for (const sync of history) {
    const details = sync.sync_details?.clinicDetails || []
    let hasChanges = false
    const updatedDetails = [...details]
    
    for (let i = 0; i < updatedDetails.length; i++) {
      const detail = updatedDetails[i]
      
      // Only process unmatched and not-logged entries
      if (!detail.matched && !detail.logged) {
        totalUnmatched++
        
        // Try to find a match with new logic
        const match = findBestMatch(detail.clinicName, partners)
        
        if (match) {
          console.log(`✅ MATCHED: "${detail.clinicName}" → "${match.name}" (score: ${(match.score * 100).toFixed(0)}%)`)
          console.log(`   Adding: ${detail.visits || 0} visits, $${detail.revenue || 0} revenue\n`)
          
          // Mark as matched
          updatedDetails[i] = {
            ...detail,
            matched: true,
            matchedTo: match.name,
            matchScore: match.score
          }
          hasChanges = true
          totalNewMatches++
          
          // Aggregate updates for this partner
          const existing = partnerUpdates.get(match.id) || { visitsToAdd: 0, revenueToAdd: 0 }
          partnerUpdates.set(match.id, {
            visitsToAdd: existing.visitsToAdd + (detail.visits || 0),
            revenueToAdd: existing.revenueToAdd + (detail.revenue || 0)
          })
        } else {
          console.log(`❌ NO MATCH: "${detail.clinicName}" (cleaned: "${cleanClinicName(detail.clinicName)}")`)
          console.log(`   Visits: ${detail.visits || 0}, Revenue: $${detail.revenue || 0}\n`)
          totalStillUnmatched++
        }
      }
    }
    
    if (hasChanges) {
      syncUpdates.push({
        syncId: sync.id,
        details: updatedDetails
      })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total unmatched entries found: ${totalUnmatched}`)
  console.log(`New matches found: ${totalNewMatches}`)
  console.log(`Still unmatched: ${totalStillUnmatched}`)
  console.log(`Partners to update: ${partnerUpdates.size}`)
  console.log('='.repeat(60) + '\n')

  if (totalNewMatches === 0) {
    console.log('No new matches found. Exiting.')
    process.exit(0)
  }

  // Step 4: Apply updates
  console.log('💾 Applying updates...\n')

  // Update partner stats
  for (const [partnerId, updates] of partnerUpdates) {
    const partner = partners.find(p => p.id === partnerId)
    if (!partner) continue

    const newReferrals = (partner.total_referrals_all_time || 0) + updates.visitsToAdd
    const newRevenue = (Number(partner.total_revenue_all_time) || 0) + updates.revenueToAdd

    const { error } = await supabase
      .from('referral_partners')
      .update({
        total_referrals_all_time: newReferrals,
        total_revenue_all_time: newRevenue,
        last_sync_date: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (error) {
      console.error(`Failed to update partner ${partner.name}:`, error)
    } else {
      console.log(`✅ Updated "${partner.name}": +${updates.visitsToAdd} visits, +$${updates.revenueToAdd} revenue`)
    }
  }

  // Update sync history records
  for (const update of syncUpdates) {
    const { error } = await supabase
      .from('referral_sync_history')
      .update({
        sync_details: {
          clinicDetails: update.details
        }
      })
      .eq('id', update.syncId)

    if (error) {
      console.error(`Failed to update sync record ${update.syncId}:`, error)
    }
  }

  console.log('\n✨ Done! All updates applied.')
}

main().catch(console.error)
