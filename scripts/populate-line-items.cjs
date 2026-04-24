#!/usr/bin/env node
/**
 * Populate referral_revenue_line_items table from 5 Referrer Revenue XLS files.
 * 
 * Each detail row (with a date) from the XLS becomes a line item.
 * Includes ALL rows (even Unknown Clinic) for complete reporting.
 * Uses dedup_hash to prevent duplicates on re-runs.
 */

const { createClient } = require('@supabase/supabase-js')
const XLSX = require('xlsx')
const { readFileSync } = require('fs')
const crypto = require('crypto')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const FILES = [
  'data/Appointments/Referrer Revenue-2026-03-05-13-23-51.xls',
  'data/Appointments/Referrer Revenue-2026-03-05-13-29-21.xls',
  'data/Appointments/Referrer Revenue-2026-03-05-13-55-57.xls',
  'data/Appointments/Referrer Revenue-2026-03-05-13-56-07.xls',
  'data/Appointments/Referrer Revenue-2026-03-05-13-56-36.xls',
]

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

function normalizeNameForComparison(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
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
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !genericWords.has(w))
}

function findBestMatch(clinicName, partners) {
  const normalizedInput = normalizeNameForComparison(clinicName)
  let match = partners.find(p => p.name.toLowerCase().trim() === clinicName.toLowerCase().trim())
  if (match) return match
  match = partners.find(p => normalizeNameForComparison(p.name) === normalizedInput)
  if (match) return match
  match = partners.find(p => {
    const np = normalizeNameForComparison(p.name)
    const shorter = normalizedInput.length < np.length ? normalizedInput : np
    if (shorter.length < 6) return false
    return normalizedInput.includes(np) || np.includes(normalizedInput)
  })
  if (match) return match
  const inputKeywords = extractKeywords(clinicName)
  if (inputKeywords.length === 0) return null
  const minRequired = inputKeywords.length >= 2 ? 2 : 1
  let bestMatch = null, bestScore = 0
  for (const p of partners) {
    const pk = extractKeywords(p.name)
    if (pk.length === 0) continue
    let matchCount = 0
    for (const iw of inputKeywords) { if (pk.some(pw => pw === iw)) matchCount++ }
    if (matchCount >= minRequired && matchCount > bestScore) { bestScore = matchCount; bestMatch = p }
  }
  return bestMatch
}

function parseXLS(filepath) {
  const buffer = readFileSync(filepath)
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  const entries = []
  for (let i = 10; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 2) continue
    const dateTime = row[0]
    const clinicName = (row[1] || '').toString().trim()
    const referringVet = (row[2] || '').toString().trim()
    const clientName = (row[3] || '').toString().trim()
    const animalName = (row[4] || '').toString().trim()
    const division = (row[5] || '').toString().trim()
    const rawAmount = row[6]
    // Only detail rows (with date)
    if (!dateTime) continue
    if (!clinicName) continue
    if (clinicName.toLowerCase().startsWith('total')) continue
    const amount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(String(rawAmount).replace(/[,$]/g, '')) || 0)
    entries.push({
      clinicName,
      referringVet,
      clientName,
      animalName,
      division,
      amount,
      dateRaw: String(dateTime).trim(),
      dateParsed: parseEzyVetDate(String(dateTime)),
    })
  }
  return entries
}

async function main() {
  console.log('=== Populate referral_revenue_line_items ===\n')

  // Step 1: Parse all XLS files
  console.log('Step 1: Parsing XLS files...')
  let allEntries = []
  for (const file of FILES) {
    const entries = parseXLS(file)
    console.log(`  ${file.split('/').pop()}: ${entries.length} rows`)
    allEntries = allEntries.concat(entries)
  }
  console.log(`  Total entries: ${allEntries.length}\n`)

  // Step 2: Fetch partners for matching
  console.log('Step 2: Fetching partners...')
  const { data: partners, error: fetchErr } = await supabase
    .from('referral_partners')
    .select('id, name')
    .order('name')
  if (fetchErr) { console.error('Failed:', fetchErr); process.exit(1) }
  console.log(`  Found ${partners.length} partners\n`)

  // Build a cache of clinic name -> partner_id
  const matchCache = new Map()

  // Step 3: Build line items
  console.log('Step 3: Building line items...')
  const rows = []
  let matched = 0, unmatched = 0

  for (const entry of allEntries) {
    // Resolve partner_id
    let partnerId = null
    if (entry.clinicName.toLowerCase() !== 'unknown clinic') {
      if (matchCache.has(entry.clinicName)) {
        partnerId = matchCache.get(entry.clinicName)
      } else {
        const match = findBestMatch(entry.clinicName, partners)
        partnerId = match ? match.id : null
        matchCache.set(entry.clinicName, partnerId)
      }
    }
    if (partnerId) matched++; else unmatched++

    // Dedup hash: date + clinic + vet + client + animal + amount
    const hashInput = [
      entry.dateParsed || entry.dateRaw,
      entry.clinicName,
      entry.referringVet,
      entry.clientName,
      entry.animalName,
      entry.amount.toFixed(2),
    ].join('|')
    const dedupHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 40)

    rows.push({
      partner_id: partnerId,
      transaction_date: entry.dateParsed || entry.dateRaw,
      csv_clinic_name: entry.clinicName,
      referring_vet: entry.referringVet || null,
      client_name: entry.clientName || null,
      animal_name: entry.animalName || null,
      division: entry.division || null,
      amount: Math.round(entry.amount * 100) / 100,
      dedup_hash: dedupHash,
    })
  }
  console.log(`  Matched to partners: ${matched}`)
  console.log(`  Unmatched (Unknown Clinic etc): ${unmatched}`)
  console.log(`  Total line items to insert: ${rows.length}\n`)

  // Step 4: Upsert in batches
  console.log('Step 4: Upserting line items (batches of 500)...')
  let inserted = 0, errors = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error: upsertErr } = await supabase
      .from('referral_revenue_line_items')
      .upsert(batch, { onConflict: 'dedup_hash' })
    if (upsertErr) {
      console.error(`  Batch ${i}-${i + batch.length} error:`, upsertErr.message)
      errors++
    } else {
      inserted += batch.length
    }
    if ((i + 500) % 5000 === 0 || i + 500 >= rows.length) {
      console.log(`  Progress: ${Math.min(i + 500, rows.length)} / ${rows.length}`)
    }
  }
  console.log(`  Inserted/updated: ${inserted}, errors: ${errors}\n`)

  // Step 5: Verify
  console.log('Step 5: Verifying...')
  const { count: totalCount } = await supabase
    .from('referral_revenue_line_items')
    .select('*', { count: 'exact', head: true })
  console.log(`  Total rows in table: ${totalCount}`)

  // Check count with partner_id (matched clinic referrals)
  const { count: matchedCount } = await supabase
    .from('referral_revenue_line_items')
    .select('*', { count: 'exact', head: true })
    .not('partner_id', 'is', null)
  console.log(`  Rows with partner_id: ${matchedCount}`)

  // Revenue totals
  const { data: allItems } = await supabase
    .from('referral_revenue_line_items')
    .select('amount, transaction_date, partner_id')
  
  let total = 0, withPartner = 0, dateRange = { min: '9999', max: '0000' }
  for (const item of (allItems || [])) {
    total += Number(item.amount) || 0
    if (item.partner_id) withPartner += Number(item.amount) || 0
    const d = item.transaction_date
    if (d && d < dateRange.min) dateRange.min = d
    if (d && d > dateRange.max) dateRange.max = d
  }
  console.log(`  Total revenue (all): $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Revenue (matched partners only): $${withPartner.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Date range: ${dateRange.min} to ${dateRange.max}`)

  // Spot-check: count by year
  const byyear = {}
  for (const item of (allItems || [])) {
    const y = (item.transaction_date || '').slice(0, 4)
    if (y) byyear[y] = (byyear[y] || 0) + 1
  }
  console.log(`  Rows by year:`, JSON.stringify(byyear))
  
  console.log('\n=== Done ===')
}

main().catch(err => { console.error('Script failed:', err); process.exit(1) })
