/**
 * Invoice Lines Upload API (Add-To with Dedup)
 *
 * POST /api/invoices/upload
 *
 * Accepts parsed CSV/XLS data and inserts into invoice_lines table.
 * Skips duplicates based on (invoice_number, invoice_line_reference).
 * Purges records older than 24 months on each upload.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

function parseDate(val: string | undefined): string | null {
  if (!val) return null
  const v = val.trim()

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // DD/MM/YYYY or DD-MM-YYYY (day > 12 disambiguates, else assume DD/MM — EzyVet convention)
  const slashMatch = v.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/)
  if (slashMatch) {
    let [, a, b, y] = slashMatch
    let day = parseInt(a), month = parseInt(b)
    // If first number > 12, it must be day; otherwise assume DD/MM (AU/UK format)
    if (day > 12 && month <= 12) { /* already DD/MM */ }
    else if (month > 12 && day <= 12) { [day, month] = [month, day] } // swap to DD/MM
    // else both ≤ 12 — assume DD/MM (EzyVet is Australian)
    const d = new Date(parseInt(y), month - 1, day)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // DD-MMM-YYYY (e.g., 15-Jan-2026)
  const monthNames = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})/
  const mMatch = v.match(monthNames)
  if (mMatch) {
    const d = new Date(`${mMatch[2]} ${mMatch[1]}, ${mMatch[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // Fallback
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

function parseTime(val: string | undefined): string | null {
  if (!val) return null
  // Try to extract HH:MM from various formats
  const match = val.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`
  return null
}

function parseNumber(val: string | undefined): number | null {
  if (!val) return null
  const cleaned = val.replace(/[$,\s]/g, '').replace(/^\(([^)]+)\)$/, '-$1')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

// Deterministic hash for generating dedup keys when invoice_line_reference is missing
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// Map CSV column names to our DB columns (handles various EzyVet export formats)
function mapRow(row: Record<string, any>): Record<string, any> {
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

export default defineEventHandler(async (event) => {
  // Auth
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin', 'manager', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { invoiceLines: rawInvoiceLines, fileData, fileName } = body

  // Accept either pre-parsed JSON rows OR raw base64 file data (CSV/XLS/XLSX)
  let invoiceLines = rawInvoiceLines
  if ((!invoiceLines || !Array.isArray(invoiceLines) || invoiceLines.length === 0) && fileData) {
    const XLSX = await import('xlsx')
    const buffer = Buffer.from(fileData, 'base64')
    let workbook: any
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch {
      // Binary parse failed — try as CSV text
      try {
        const csvText = buffer.toString('utf-8')
        workbook = XLSX.read(csvText, { type: 'string' })
      } catch (err2: any) {
        throw createError({ statusCode: 400, message: 'Failed to parse file: ' + (err2.message || 'Unsupported format') })
      }
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw createError({ statusCode: 400, message: 'No sheets found in file' })
    invoiceLines = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  }

  if (!invoiceLines || !Array.isArray(invoiceLines) || invoiceLines.length === 0) {
    throw createError({ statusCode: 400, message: 'No invoice line data provided' })
  }

  if (invoiceLines.length > 100000) {
    throw createError({ statusCode: 400, message: `Too many rows: ${invoiceLines.length}. Maximum 100,000 per upload.` })
  }

  const batchId = crypto.randomUUID()

  // Map rows
  const records = invoiceLines.map((row: any) => {
    const mapped = mapRow(row)

    // Ensure invoice_line_reference is never NULL — PostgreSQL UNIQUE constraints
    // treat NULLs as distinct, so (INV-123, NULL) and (INV-123, NULL) would both insert.
    // Generate a deterministic reference from key fields when missing.
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
      uploaded_by: profile.id,
    }
  }).filter((r: any) => r.invoice_number || r.invoice_line_reference || r.invoice_date) // Must have at least one identifier

  if (records.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid invoice line records found. Each row must have an invoice number, line reference, or date.' })
  }

  // Insert in chunks with ON CONFLICT skip (deduplication)
  const CHUNK_SIZE = 500
  let inserted = 0
  let duplicatesSkipped = 0
  let errors = 0

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)

    // Use upsert with ignoreDuplicates to skip existing records
    const { data: upsertData, error } = await supabase
      .from('invoice_lines')
      .upsert(chunk, {
        onConflict: 'invoice_number,invoice_line_reference',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      // If it's a conflict-related error, try individual inserts
      console.error(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1} upsert error:`, error.message)
      
      // Fallback: insert one by one to handle duplicates gracefully
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
          }
        } else if (singleData && singleData.length > 0) {
          inserted++
        } else {
          duplicatesSkipped++
        }
      }
    } else {
      const insertedCount = upsertData?.length || 0
      inserted += insertedCount
      duplicatesSkipped += chunk.length - insertedCount
    }
  }

  // Record upload history
  await supabase.from('invoice_upload_history').insert({
    batch_id: batchId,
    file_name: fileName || 'unknown',
    total_rows: invoiceLines.length,
    inserted,
    duplicates_skipped: duplicatesSkipped,
    errors,
    uploaded_by: profile.id,
  })

  // Auto-purge records older than 24 months
  let purged = 0
  try {
    const { data: purgeResult } = await supabase.rpc('purge_old_invoice_lines')
    purged = purgeResult || 0
  } catch (purgeErr) {
    console.warn('Auto-purge failed (non-critical):', purgeErr)
  }

  return {
    success: true,
    batchId,
    totalRows: invoiceLines.length,
    validRows: records.length,
    inserted,
    duplicatesSkipped,
    errors,
    purged,
  }
})
