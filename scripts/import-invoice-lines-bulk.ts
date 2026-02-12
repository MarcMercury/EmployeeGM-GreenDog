/**
 * Bulk Import Invoice Lines from CSV files in public/ folder
 *
 * Reads CSV files directly, maps columns to DB schema, and upserts
 * in chunks via Supabase service-role key (bypasses RLS + API body limits).
 *
 * Usage:  npx tsx scripts/import-invoice-lines-bulk.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// The admin profile id to attribute uploads to
const ADMIN_PROFILE_ID = '7f91892e-7a1a-447c-9f03-27fc47f093dc' // Marc

// ── CSV files to import (in order) ───────────────────────────────────────
const CSV_FILES = [
  'public/Invoice Lines-2026-02-11-15-04-38.csv',
  'public/Invoice Lines-2026-02-11-15-06-00.csv',
  'public/Invoice Lines-2026-02-11-15-20-05.csv',
]

// ── Helpers ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseDate(val: string | undefined): string | null {
  if (!val || !val.trim()) return null
  const trimmed = val.trim()
  // Handle MM-DD-YYYY and MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Fallback
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0]
}

function parseTime(val: string | undefined): string | null {
  if (!val || !val.trim()) return null
  const trimmed = val.trim()
  // Handle "2:33PM" style
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let h = parseInt(match12[1])
    const m = match12[2]
    const ampm = match12[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}:00`
  }
  // Handle HH:MM:SS
  const match24 = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match24) return `${match24[1].padStart(2, '0')}:${match24[2]}:${match24[3] || '00'}`
  return null
}

function parseNumber(val: string | undefined): number | null {
  if (!val || !val.trim()) return null
  const cleaned = val.trim().replace(/[$,\s]/g, '').replace(/\((.+)\)/, '-$1')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

/**
 * Map an EzyVet Invoice Lines CSV row to our DB schema.
 * Column names come from the exact EzyVet export format.
 */
function mapRow(row: Record<string, string>): Record<string, any> {
  return {
    invoice_number: row['Invoice #'] || row['Invoice'] || null,
    invoice_line_reference: row['Invoice Line Reference'] || null,
    invoice_date: parseDate(row['Invoice Line Date'] || row['Invoice Date']),
    invoice_date_modified: parseDate(row['Invoice Line Date: Last Modified']),
    invoice_time: parseTime(row['Invoice Line Time'] || row['Invoice Line Time: Created']),
    client_code: row['Client Contact Code'] || null,
    client_first_name: row['First Name'] || null,
    client_email: row['Email'] || null,
    pet_name: row['Pet Name'] || null,
    breed: row['Breed'] || null,
    product_name: row['Product Name'] || null,
    product_group: row['Product Group'] || null,
    account: row['Account'] || null,
    department: row['Department'] || null,
    standard_price: parseNumber(row['Standard Price(incl)']),
    discount: parseNumber(row['Discount(%)'] || row['Discount($)']),
    surcharge_adjustment: parseNumber(row['Surcharge Adjustment']),
    discount_adjustment: parseNumber(row['Discount Adjustment']),
    rounding_adjustment: parseNumber(row['Rounding Adjustment']),
    price_after_discount: parseNumber(row['Price After Discount(incl)'] || row['Price After Discount(excl)']),
    total_tax_amount: parseNumber(row['Total Tax Amount']),
    total_earned: parseNumber(row['Total Earned(incl)'] || row['Total Earned(excl)']),
    staff_member: row['Staff Member'] || null,
    case_owner: row['Case Owner'] || null,
    last_modified_by: row['Last Modified By'] || null,
    division: row['Active Division'] || row['Division'] || null,
    invoice_type: row['Type'] || null,
    payment_terms: row['Payment Terms'] || null,
    consult_id: row['Consult ID'] || null,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function importFile(filePath: string) {
  const fullPath = resolve(filePath)
  console.log(`\n══════════════════════════════════════════`)
  console.log(`📄 Importing: ${filePath}`)
  console.log(`══════════════════════════════════════════`)

  const text = readFileSync(fullPath, 'utf-8')
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    console.warn('  ⚠ File has no data rows, skipping.')
    return { inserted: 0, duplicatesSkipped: 0, errors: 0 }
  }

  const headers = parseCSVLine(lines[0])
  console.log(`  Columns: ${headers.length}`)
  console.log(`  Data rows: ${lines.length - 1}`)

  const batchId = crypto.randomUUID()
  const records: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length < 3) continue

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim() })

    const mapped = mapRow(row)
    // Must have at least one identifier
    if (!mapped.invoice_number && !mapped.invoice_line_reference && !mapped.invoice_date) continue

    records.push({
      ...mapped,
      source: 'csv_upload',
      batch_id: batchId,
      uploaded_by: ADMIN_PROFILE_ID,
    })
  }

  console.log(`  Valid records: ${records.length}`)

  // Upsert in chunks
  const CHUNK = 500
  let inserted = 0
  let duplicatesSkipped = 0
  let errors = 0

  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const chunkNum = Math.floor(i / CHUNK) + 1
    const totalChunks = Math.ceil(records.length / CHUNK)

    const { data, error } = await supabase
      .from('invoice_lines')
      .upsert(chunk, {
        onConflict: 'invoice_number,invoice_line_reference',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      // Fallback: insert individually
      console.log(`  ⚠ Chunk ${chunkNum}/${totalChunks} bulk error: ${error.message} — retrying row-by-row`)
      for (const record of chunk) {
        const { data: singleData, error: singleError } = await supabase
          .from('invoice_lines')
          .upsert(record, {
            onConflict: 'invoice_number,invoice_line_reference',
            ignoreDuplicates: true,
          })
          .select('id')

        if (singleError) {
          if (singleError.code === '23505') {
            duplicatesSkipped++
          } else {
            errors++
            if (errors <= 5) console.error(`    Row error: ${singleError.message}`)
          }
        } else if (singleData && singleData.length > 0) {
          inserted++
        } else {
          duplicatesSkipped++
        }
      }
    } else {
      const count = data?.length || 0
      inserted += count
      duplicatesSkipped += chunk.length - count

      if (chunkNum % 20 === 0 || chunkNum === totalChunks) {
        console.log(`  Chunk ${chunkNum}/${totalChunks}: +${count} inserted, ${chunk.length - count} dupes`)
      }
    }
  }

  // Record upload history
  await supabase.from('invoice_upload_history').insert({
    batch_id: batchId,
    file_name: filePath.split('/').pop(),
    total_rows: lines.length - 1,
    inserted,
    duplicates_skipped: duplicatesSkipped,
    errors,
    uploaded_by: ADMIN_PROFILE_ID,
  })

  console.log(`  ✅ Done: ${inserted} inserted, ${duplicatesSkipped} dupes skipped, ${errors} errors`)
  return { inserted, duplicatesSkipped, errors }
}

async function main() {
  console.log('🚀 Bulk Invoice Lines Import')
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Files: ${CSV_FILES.length}`)

  let totalInserted = 0
  let totalDupes = 0
  let totalErrors = 0

  for (const file of CSV_FILES) {
    const result = await importFile(file)
    totalInserted += result.inserted
    totalDupes += result.duplicatesSkipped
    totalErrors += result.errors
  }

  console.log(`\n════════════════════════════════════════`)
  console.log(`🏁 TOTAL: ${totalInserted} inserted, ${totalDupes} dupes skipped, ${totalErrors} errors`)
  console.log(`════════════════════════════════════════`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
