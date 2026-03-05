#!/usr/bin/env node
/**
 * Populate Referral Stats from 5 Referrer Revenue XLS files
 * 
 * Steps:
 * 1. Parse all 5 XLS files and extract detail rows (rows with dates = actual referrals)
 * 2. Aggregate by clinic name: total referrals, total revenue, divisions, last referral date
 * 3. Clear all existing referral stats on all partners
 * 4. Match each clinic to existing partners (or create new ones)
 * 5. Update with correct totals
 */

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const FILES = [
  'data/Appointments/Referrer Revenue-2026-03-05-13-23-51.xls',   // GDD & MPMV Sherman Oaks 2024-2026
  'data/Appointments/Referrer Revenue-2026-03-05-13-29-21.xls',   // GDD & MPMV Sherman Oaks 2014-2024
  'data/Appointments/Referrer Revenue-2026-03-05-13-55-57.xls',   // Venice 2023-2026
  'data/Appointments/Referrer Revenue-2026-03-05-13-56-07.xls',   // Van Nuys 2014-2023
  'data/Appointments/Referrer Revenue-2026-03-05-13-56-36.xls',   // Van Nuys 2024-2026
]

// ─── Parsing ──────────────────────────────────────────────────

function parseEzyVetDate(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  const match = s.match(/(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (match) {
    const [, month, day, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return null
}

function parseXLS(filepath) {
  const buffer = readFileSync(filepath)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  
  const entries = []
  
  // Data rows start after row 9 (column headers)
  for (let i = 10; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue
    
    const dateTime = row[0]
    const clinicName = (row[1] || '').toString().trim()
    const division = (row[5] || '').toString().trim()
    const rawAmount = row[6]
    
    // Only process detail rows (ones that have a date) - skip summary/subtotal rows
    if (!dateTime) continue
    
    // Skip unknown clinics, empty names, and total rows
    if (!clinicName) continue
    if (clinicName.toLowerCase() === 'unknown clinic') continue
    if (clinicName.toLowerCase().startsWith('total')) continue
    
    const amount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(String(rawAmount).replace(/[,$]/g, '')) || 0)
    if (amount <= 0) continue
    
    entries.push({
      clinicName,
      amount,
      date: String(dateTime).trim(),
      division,
    })
  }
  
  return entries
}

// ─── Aggregation ──────────────────────────────────────────────

function aggregateByClinic(allEntries) {
  const clinicMap = new Map()
  
  for (const entry of allEntries) {
    const key = entry.clinicName
    const existing = clinicMap.get(key) || {
      clinicName: entry.clinicName,
      referralCount: 0,
      totalRevenue: 0,
      lastReferralDate: null,
      divisions: new Set(),
    }
    
    existing.referralCount += 1
    existing.totalRevenue += entry.amount
    
    if (entry.division) {
      existing.divisions.add(entry.division)
    }
    
    const parsedDate = parseEzyVetDate(entry.date)
    if (parsedDate) {
      if (!existing.lastReferralDate || parsedDate > existing.lastReferralDate) {
        existing.lastReferralDate = parsedDate
      }
    }
    
    clinicMap.set(key, existing)
  }
  
  return Array.from(clinicMap.values()).map(c => ({
    ...c,
    totalRevenue: Math.round(c.totalRevenue * 100) / 100,
    divisions: [...c.divisions].sort(),
  }))
}

// ─── Matching ──────────────────────────────────────────────────

function normalizeNameForComparison(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractKeywords(name) {
  const genericWords = new Set([
    'the', 'and', 'for', 'of', 'at', 'in',
    'vet', 'vets', 'pet', 'pets', 'animal', 'animals',
    'clinic', 'clinics', 'hospital', 'hospitals',
    'center', 'centre', 'medical', 'veterinary',
    'care', 'health', 'wellness', 'group', 'practice',
    'dr', 'dvm', 'inc', 'llc', 'corp',
  ])
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !genericWords.has(w))
}

function findBestMatch(clinicName, partners) {
  const normalizedInput = normalizeNameForComparison(clinicName)
  
  // 1. Exact match (case-insensitive)
  let match = partners.find(p => p.name.toLowerCase().trim() === clinicName.toLowerCase().trim())
  if (match) return match
  
  // 2. Normalized exact
  match = partners.find(p => normalizeNameForComparison(p.name) === normalizedInput)
  if (match) return match
  
  // 3. Contains
  match = partners.find(p => {
    const np = normalizeNameForComparison(p.name)
    const shorter = normalizedInput.length < np.length ? normalizedInput : np
    if (shorter.length < 6) return false
    return normalizedInput.includes(np) || np.includes(normalizedInput)
  })
  if (match) return match
  
  // 4. Keyword overlap
  const inputKeywords = extractKeywords(clinicName)
  if (inputKeywords.length === 0) return null
  const minRequired = inputKeywords.length >= 2 ? 2 : 1
  let bestMatch = null
  let bestScore = 0
  for (const p of partners) {
    const pk = extractKeywords(p.name)
    if (pk.length === 0) continue
    let matchCount = 0
    for (const iw of inputKeywords) {
      if (pk.some(pw => pw === iw)) matchCount++
    }
    if (matchCount >= minRequired && matchCount > bestScore) {
      bestScore = matchCount
      bestMatch = p
    }
  }
  return bestMatch
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('=== Referral Stats Population Script ===\n')
  
  // Step 1: Parse all 5 XLS files
  console.log('Step 1: Parsing XLS files...')
  let allEntries = []
  for (const file of FILES) {
    const entries = parseXLS(file)
    console.log(`  ${file.split('/').pop()}: ${entries.length} referral entries`)
    allEntries = allEntries.concat(entries)
  }
  console.log(`  Total entries (excluding Unknown Clinic): ${allEntries.length}\n`)
  
  // Step 2: Aggregate by clinic
  console.log('Step 2: Aggregating by clinic...')
  const aggregated = aggregateByClinic(allEntries)
  console.log(`  Unique clinics: ${aggregated.length}`)
  const csvTotalRev = aggregated.reduce((s, a) => s + a.totalRevenue, 0)
  const csvTotalRefs = aggregated.reduce((s, a) => s + a.referralCount, 0)
  console.log(`  Total referrals: ${csvTotalRefs.toLocaleString()}`)
  console.log(`  Total revenue: $${csvTotalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`)
  
  // Step 3: Fetch all existing partners
  console.log('Step 3: Fetching existing partners...')
  const { data: partners, error: fetchErr } = await supabase
    .from('referral_partners')
    .select('id, name, referral_divisions')
    .order('name')
  
  if (fetchErr) {
    console.error('Failed to fetch partners:', fetchErr)
    process.exit(1)
  }
  console.log(`  Found ${partners.length} existing partners\n`)
  
  // Step 4: Clear ALL existing referral stats
  console.log('Step 4: Clearing all existing referral stats...')
  let clearErrors = 0
  // Batch clear in chunks of 50
  for (let i = 0; i < partners.length; i += 50) {
    const chunk = partners.slice(i, i + 50)
    const ids = chunk.map(p => p.id)
    const { error: clearErr } = await supabase
      .from('referral_partners')
      .update({
        total_referrals_all_time: 0,
        total_revenue_all_time: 0,
        last_referral_date: null,
        referral_divisions: [],
        last_sync_date: new Date().toISOString(),
        last_data_source: null,
      })
      .in('id', ids)
    
    if (clearErr) {
      console.error('  Clear error for batch:', clearErr.message)
      clearErrors++
    }
  }
  console.log(`  Cleared stats for ${partners.length} partners (errors: ${clearErrors})\n`)
  
  // Step 5: Match and update
  console.log('Step 5: Matching clinics to partners and updating...')
  const syncDate = new Date().toISOString()
  let matched = 0
  let created = 0
  let updateErrors = 0
  const unmatched = []
  
  // Track which partner IDs have been updated (for multi-match aggregation)
  const partnerUpdates = new Map() // partnerId -> { refs, rev, lastDate, divisions }
  
  for (const agg of aggregated) {
    const match = findBestMatch(agg.clinicName, partners)
    
    if (match) {
      // Accumulate if same partner matched by multiple clinic names
      const existing = partnerUpdates.get(match.id) || {
        name: match.name,
        refs: 0,
        rev: 0,
        lastDate: null,
        divisions: new Set(match.referral_divisions || []),
      }
      existing.refs += agg.referralCount
      existing.rev += agg.totalRevenue
      if (agg.lastReferralDate) {
        if (!existing.lastDate || agg.lastReferralDate > existing.lastDate) {
          existing.lastDate = agg.lastReferralDate
        }
      }
      for (const d of agg.divisions) existing.divisions.add(d)
      partnerUpdates.set(match.id, existing)
      matched++
    } else {
      unmatched.push(agg)
    }
  }
  
  // Apply all updates to matched partners
  for (const [partnerId, upd] of partnerUpdates) {
    const { error: updErr } = await supabase
      .from('referral_partners')
      .update({
        total_referrals_all_time: upd.refs,
        total_revenue_all_time: Math.round(upd.rev * 100) / 100,
        last_referral_date: upd.lastDate,
        referral_divisions: [...upd.divisions].sort(),
        last_sync_date: syncDate,
        last_data_source: 'csv_upload',
      })
      .eq('id', partnerId)
    
    if (updErr) {
      console.error(`  Update error for ${upd.name}:`, updErr.message)
      updateErrors++
    }
  }
  
  console.log(`  Matched: ${matched} clinic names -> ${partnerUpdates.size} unique partners`)
  console.log(`  Update errors: ${updateErrors}`)
  console.log(`  Unmatched clinics: ${unmatched.length}\n`)
  
  // Step 6: Create new partners for unmatched clinics
  if (unmatched.length > 0) {
    console.log('Step 6: Creating new partners for unmatched clinics...')
    for (const agg of unmatched) {
      const payload = {
        name: agg.clinicName,
        status: 'active',
        tier: 'prospect',
        priority: 'medium',
        clinic_type: 'general',
        total_referrals_all_time: agg.referralCount,
        total_revenue_all_time: agg.totalRevenue,
        last_referral_date: agg.lastReferralDate,
        referral_divisions: agg.divisions,
        last_sync_date: syncDate,
        last_data_source: 'csv_upload',
        referral_agreement_type: 'none',
        lunch_and_learn_eligible: true,
        drop_off_materials: true,
      }
      
      const { error: insertErr } = await supabase
        .from('referral_partners')
        .insert(payload)
      
      if (insertErr) {
        console.error(`  Create error for "${agg.clinicName}":`, insertErr.message)
      } else {
        created++
        console.log(`  Created: ${agg.clinicName} (${agg.referralCount} refs, $${agg.totalRevenue.toFixed(2)})`)
      }
    }
    console.log(`  Created ${created} new partners\n`)
  }
  
  // Step 7: Verification
  console.log('Step 7: Verifying final database state...')
  const { data: final, error: finalErr } = await supabase
    .from('referral_partners')
    .select('id, name, total_referrals_all_time, total_revenue_all_time')
    .order('total_revenue_all_time', { ascending: false })
  
  if (finalErr) {
    console.error('Verification fetch error:', finalErr)
    return
  }
  
  let dbTotalRev = 0
  let dbTotalRefs = 0
  let withData = 0
  for (const p of final) {
    const rev = Number(p.total_revenue_all_time) || 0
    const refs = p.total_referrals_all_time || 0
    dbTotalRev += rev
    dbTotalRefs += refs
    if (rev > 0 || refs > 0) withData++
  }
  
  console.log(`  Total partners: ${final.length}`)
  console.log(`  Partners with data: ${withData}`)
  console.log(`  DB Total Revenue: $${dbTotalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  DB Total Referrals: ${dbTotalRefs.toLocaleString()}`)
  console.log(`  CSV Total Revenue: $${csvTotalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  CSV Total Referrals: ${csvTotalRefs.toLocaleString()}`)
  
  const revDiff = Math.abs(dbTotalRev - csvTotalRev)
  if (revDiff < 1) {
    console.log('  ✅ Revenue matches perfectly!')
  } else {
    console.log(`  ⚠️ Revenue difference: $${revDiff.toFixed(2)}`)
  }
  
  if (dbTotalRefs === csvTotalRefs) {
    console.log('  ✅ Referral count matches perfectly!')
  } else {
    console.log(`  ⚠️ Referral count difference: ${Math.abs(dbTotalRefs - csvTotalRefs)}`)
  }
  
  console.log('\nTop 15 partners by revenue:')
  for (const p of final.slice(0, 15)) {
    console.log(`  ${p.name}: ${p.total_referrals_all_time} referrals, $${Number(p.total_revenue_all_time).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  }
  
  console.log('\n=== Done ===')
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
