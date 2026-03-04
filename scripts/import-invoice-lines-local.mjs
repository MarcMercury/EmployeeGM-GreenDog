#!/usr/bin/env node
/**
 * Import Invoice Lines CSV files from data/Appointments/ into Supabase.
 * Replicates the exact logic of /api/invoices/upload — mapRow, dedup, upload history.
 *
 * Usage: node scripts/import-invoice-lines-local.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

// ── Supabase client ──────────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Parse helpers (mirrored from server/api/invoices/upload.post.ts) ─────
function parseDate(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    if (val > 1 && val < 200000) {
      const d = new Date((val - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    return null
  }
  const v = String(val).trim()
  if (!v) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  const slashMatch = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
  if (slashMatch) {
    let [, a, b, y] = slashMatch
    let day = parseInt(a), month = parseInt(b)
    if (day > 12 && month <= 12) { /* DD/MM */ }
    else if (month > 12 && day <= 12) { [day, month] = [month, day] }
    const d = new Date(parseInt(y), month - 1, day)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  const mMatch = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
  if (mMatch) {
    const d = new Date(`${mMatch[2]} ${mMatch[1]}, ${mMatch[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function parseTime(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number' && val >= 0 && val < 1) {
    const totalSeconds = Math.round(val * 86400)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  const str = String(val)
  const match = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`

  // Handle "5:06PM" style
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1])
    const m = ampmMatch[2]
    const period = ampmMatch[3].toUpperCase()
    if (period === 'PM' && h < 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${m}:00`
  }
  return null
}

function parseNumber(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  const cleaned = String(val).replace(/[$,\s]/g, '').replace(/^\(([^)]+)\)$/, '-$1')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function mapRow(row) {
  return {
    invoice_number: row['Invoice #'] || row['Invoice'] || row['invoice'] || row['Invoice Number'] || row['invoice_number'] || null,
    invoice_line_reference: row['Invoice Line Reference'] || row['invoice_line_reference'] || row['Line Reference'] || row['line_reference'] || null,
    invoice_date: parseDate(row['Invoice Line Date'] || row['Invoice Line Date Created'] || row['Invoice Line Date: Created'] || row['invoice_date'] || row['Invoice Date'] || row['Date'] || row['date']),
    invoice_date_modified: parseDate(row['Invoice Line Date: Last Modified'] || row['Invoice Line Date Last Modified'] || row['invoice_date_modified'] || row['Date Modified']),
    invoice_time: parseTime(row['Invoice Line Time'] || row['Invoice Line Time: Created'] || row['invoice_time'] || row['Time']),
    client_code: row['Client Contact Code'] || row['client_code'] || row['Contact Code'] || null,
    client_first_name: row['First Name'] || row['first_name'] || row['Client Name'] || null,
    client_email: row['Email'] || row['email'] || row['Client Email'] || null,
    pet_name: row['Pet Name'] || row['pet_name'] || row['Animal Name'] || null,
    breed: row['Breed'] || row['breed'] || null,
    product_name: row['Product Name'] || row['product_name'] || row['Item'] || row['Description'] || null,
    product_group: row['Product Group'] || row['product_group'] || row['Category'] || null,
    account: row['Account'] || row['account'] || row['Revenue Account'] || null,
    department: row['Department'] || row['department'] || null,
    standard_price: parseNumber(row['Standard Price(incl)'] || row['Standard Price'] || row['standard_price'] || row['Unit Price']),
    discount: parseNumber(row['Discount(%)'] || row['Discount($)'] || row['Discount'] || row['discount']),
    surcharge_adjustment: parseNumber(row['Surcharge Adjustment'] || row['surcharge_adjustment']),
    discount_adjustment: parseNumber(row['Discount Adjustment'] || row['discount_adjustment']),
    rounding_adjustment: parseNumber(row['Rounding Adjustment'] || row['rounding_adjustment']),
    price_after_discount: parseNumber(row['Price After Discount(incl)'] || row['Price After Discount(excl)'] || row['Price After Discount'] || row['price_after_discount'] || row['Net Price']),
    total_tax_amount: parseNumber(row['Total Tax Amount'] || row['total_tax_amount'] || row['Tax']),
    total_earned: parseNumber(row['Total Earned(incl)'] || row['Total Earned(excl)'] || row['Total Earned'] || row['total_earned'] || row['Total'] || row['Amount']),
    staff_member: row['Staff Member'] || row['staff_member'] || row['Provider'] || null,
    case_owner: row['Case Owner'] || row['case_owner'] || null,
    last_modified_by: row['Last Modified By'] || row['last_modified_by'] || null,
    division: row['Active Division'] || row['Division'] || row['division'] || null,
    invoice_type: row['Type'] || row['type'] || row['Invoice Type'] || null,
    payment_terms: row['Payment Terms'] || row['payment_terms'] || null,
    consult_id: row['Consult ID'] || row['consult_id'] || null,
  }
}

// ── CSV parser (handles quoted fields with commas/newlines) ──────────────
function parseCsv(text) {
  const rows = []
  let i = 0
  const len = text.length

  function parseField() {
    if (i >= len) return ''
    if (text[i] === '"') {
      i++ // skip opening quote
      let field = ''
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"'
            i += 2
          } else {
            i++ // skip closing quote
            break
          }
        } else {
          field += text[i]
          i++
        }
      }
      return field
    } else {
      let field = ''
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        field += text[i]
        i++
      }
      return field
    }
  }

  while (i < len) {
    const row = []
    while (true) {
      row.push(parseField())
      if (i < len && text[i] === ',') {
        i++ // skip comma
      } else {
        break
      }
    }
    // Skip line endings
    if (i < len && text[i] === '\r') i++
    if (i < len && text[i] === '\n') i++
    rows.push(row)
  }
  return rows
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const dataDir = join(process.cwd(), 'data', 'Appointments')
  const allFiles = readdirSync(dataDir)
    .filter(f => f.startsWith('Invoice Lines-2026-03-04-') && f.endsWith('.csv'))
    .sort()

  console.log(`Found ${allFiles.length} invoice line files to import\n`)

  // Get an admin profile for uploaded_by
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'super_admin'])
    .limit(1)
    .single()

  const uploadedBy = adminProfile?.id || null
  console.log(`Using profile ID for uploaded_by: ${uploadedBy}\n`)

  let grandTotalInserted = 0
  let grandTotalSkipped = 0
  let grandTotalErrors = 0

  for (const fileName of allFiles) {
    const filePath = join(dataDir, fileName)
    const raw = readFileSync(filePath, 'utf-8')
    const rawRows = parseCsv(raw)

    if (rawRows.length < 2) {
      console.log(`⏭️  ${fileName}: no data rows, skipping`)
      continue
    }

    // First row is the header
    const headers = rawRows[0].map(h => h.trim())

    // Build keyed objects
    const invoiceLines = []
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.every(c => !c.trim())) continue
      const obj = {}
      headers.forEach((h, idx) => { if (h) obj[h] = (row[idx] ?? '').trim() })
      invoiceLines.push(obj)
    }

    if (invoiceLines.length === 0) {
      console.log(`⏭️  ${fileName}: 0 valid rows after parsing, skipping`)
      continue
    }

    const batchId = randomUUID()

    // Map & prepare records
    const records = invoiceLines.map(row => {
      const mapped = mapRow(row)
      if (!mapped.invoice_line_reference) {
        const parts = [
          mapped.invoice_number || '',
          mapped.invoice_date || '',
          mapped.product_name || '',
          mapped.client_code || '',
          mapped.total_earned ?? '',
          mapped.staff_member || '',
        ]
        mapped.invoice_line_reference = `AUTO-${simpleHash(parts.join('|'))}`
      }
      return {
        ...mapped,
        source: 'csv_upload',
        batch_id: batchId,
        raw_data: row,
        uploaded_by: uploadedBy,
      }
    }).filter(r => r.invoice_number || r.invoice_line_reference || r.invoice_date)

    // Insert in chunks with dedup
    const CHUNK_SIZE = 500
    let inserted = 0
    let duplicatesSkipped = 0
    let errors = 0

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE)
      const { data: upsertData, error } = await supabase
        .from('invoice_lines')
        .upsert(chunk, {
          onConflict: 'invoice_number,invoice_line_reference',
          ignoreDuplicates: true,
        })
        .select('id')

      if (error) {
        // Fallback: one-by-one
        for (const record of chunk) {
          const { data: sd, error: se } = await supabase
            .from('invoice_lines')
            .upsert(record, {
              onConflict: 'invoice_number,invoice_line_reference',
              ignoreDuplicates: true,
            })
            .select('id')

          if (se) {
            if (se.code === '23505') duplicatesSkipped++
            else errors++
          } else if (sd && sd.length > 0) {
            inserted++
          } else {
            duplicatesSkipped++
          }
        }
      } else {
        const ic = upsertData?.length || 0
        inserted += ic
        duplicatesSkipped += chunk.length - ic
      }

      // Progress
      const pct = Math.round(Math.min(i + CHUNK_SIZE, records.length) / records.length * 100)
      process.stdout.write(`\r  ${fileName}: ${pct}% (${Math.min(i + CHUNK_SIZE, records.length)}/${records.length})`)
    }

    console.log(`\n✅ ${fileName}: ${inserted} inserted, ${duplicatesSkipped} dupes skipped, ${errors} errors (${records.length} total mapped)`)

    // Record upload history
    await supabase.from('invoice_upload_history').insert({
      batch_id: batchId,
      file_name: fileName,
      total_rows: invoiceLines.length,
      inserted,
      duplicates_skipped: duplicatesSkipped,
      errors,
      uploaded_by: uploadedBy,
    })

    grandTotalInserted += inserted
    grandTotalSkipped += duplicatesSkipped
    grandTotalErrors += errors
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`GRAND TOTAL: ${grandTotalInserted} inserted, ${grandTotalSkipped} duplicates skipped, ${grandTotalErrors} errors`)
  console.log(`${'═'.repeat(60)}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
