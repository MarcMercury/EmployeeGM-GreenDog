/**
 * Invoice Parser
 *
 * Parses EzyVet invoice line-item exports (CSV / XLS / XLSX) into the
 * normalized `InvoiceRow` shape used by the bonus calculator.
 *
 * The source report has columns (roughly in order):
 *   Invoice #, Invoice Date, Last Modified By, Department, Business Name,
 *   Pet Name, Species, Breed, Product Name, Product Group, Staff Member,
 *   Case Owner, Qty, Standard Price(incl), Price After Discount(excl),
 *   Total Earned(incl)
 *
 * Column names vary slightly between exports so we do fuzzy header matching.
 */
import type { InvoiceRow, ContactRow } from '~/types/bonus'

/** Case/whitespace-insensitive header lookup helpers */
function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Match any of the provided header aliases, returning the column index or -1 */
function findCol(headers: string[], aliases: string[]): number {
  const norm = headers.map(normalize)
  for (const alias of aliases) {
    const key = normalize(alias)
    const i = norm.indexOf(key)
    if (i !== -1) return i
    // partial match (contains)
    const partial = norm.findIndex(h => h.includes(key))
    if (partial !== -1) return partial
  }
  return -1
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  const s = String(v).replace(/[$,]/g, '').trim()
  if (!s || s === '-') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

function toDate(v: unknown): string {
  if (!v) return ''
  // Excel date serial
  if (typeof v === 'number' && v > 20000 && v < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000)
    return d.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (!s) return ''
  // ISO yyyy-mm-dd or yyyy-m-d
  const iso = /^\d{4}-\d{1,2}-\d{1,2}$/
  if (iso.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  // mm-dd-yyyy or m-d-yyyy or mm/dd/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const mm = String(+m[1]!).padStart(2, '0')
    const dd = String(+m[2]!).padStart(2, '0')
    let yy = m[3]!
    if (yy.length === 2) yy = '20' + yy
    return `${yy}-${mm}-${dd}`
  }
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return s
}

export interface ParseResult {
  rows: InvoiceRow[]
  headers: string[]
  skipped: number
  warnings: string[]
}

/**
 * Parse a raw 2D array of invoice data (first row assumed to be the header)
 * into normalized `InvoiceRow` objects.
 */
export function parseInvoiceRows(data: unknown[][]): ParseResult {
  const warnings: string[] = []

  // Find the actual header row — some exports have title/summary rows above it.
  let headerIdx = 0
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = (data[i] || []).map(c => String(c || ''))
    const joined = row.join(' ').toLowerCase()
    if (joined.includes('invoice') && joined.includes('product') && joined.includes('price')) {
      headerIdx = i
      break
    }
  }

  const headers = (data[headerIdx] || []).map(h => String(h || '').trim())

  const COL = {
    invoice_no: findCol(headers, ['Invoice #', 'Invoice Number', 'Invoice No', 'Invoice']),
    invoice_date: findCol(headers, ['Invoice Date', 'Date']),
    department: findCol(headers, ['Department', 'Dept']),
    business_name: findCol(headers, ['Business Name', 'Business', 'Location']),
    pet_name: findCol(headers, ['Pet Name', 'Pet', 'Patient']),
    species: findCol(headers, ['Species']),
    breed: findCol(headers, ['Breed']),
    product_name: findCol(headers, ['Product Name', 'Product', 'Item']),
    product_group: findCol(headers, ['Product Group', 'Group', 'Category']),
    staff_member: findCol(headers, ['Staff Member', 'Staff', 'Provider']),
    case_owner: findCol(headers, ['Case Owner', 'Doctor', 'Owner']),
    qty: findCol(headers, ['Qty', 'Quantity']),
    standard_price: findCol(headers, ['Standard Price(incl)', 'Standard Price', 'Standard']),
    price_after_discount: findCol(headers, ['Price After Discount(excl)', 'Price After Discount', 'Discounted Price']),
    total_earned: findCol(headers, ['Total Earned(incl)', 'Total Earned', 'Total', 'Net']),
  }

  const required: (keyof typeof COL)[] = ['invoice_no', 'invoice_date', 'product_group', 'total_earned']
  const missing = required.filter(k => COL[k] === -1)
  if (missing.length) {
    warnings.push(`Could not find columns: ${missing.join(', ')}. Check the header row of your export.`)
  }

  const rows: InvoiceRow[] = []
  let skipped = 0

  for (let i = headerIdx + 1; i < data.length; i++) {
    const r = data[i]
    if (!r || r.length === 0) { skipped++; continue }
    const invNo = r[COL.invoice_no] ?? r[0]
    const totalEarnedRaw = r[COL.total_earned]
    // Skip obvious blanks / total lines
    if (!invNo && totalEarnedRaw == null) { skipped++; continue }
    const invoiceDate = toDate(r[COL.invoice_date])
    if (!invoiceDate) { skipped++; continue }

    rows.push({
      invoice_no: String(invNo || '').trim(),
      invoice_date: invoiceDate,
      department: String(r[COL.department] || '').trim(),
      business_name: String(r[COL.business_name] || '').trim(),
      pet_name: String(r[COL.pet_name] || '').trim(),
      species: String(r[COL.species] || '').trim(),
      breed: String(r[COL.breed] || '').trim(),
      product_name: String(r[COL.product_name] || '').trim(),
      product_group: String(r[COL.product_group] || '').trim(),
      staff_member: String(r[COL.staff_member] || '').trim(),
      case_owner: String(r[COL.case_owner] || '').trim(),
      qty: toNumber(r[COL.qty]) || 1,
      standard_price: toNumber(r[COL.standard_price]),
      price_after_discount: toNumber(r[COL.price_after_discount]),
      total_earned: toNumber(r[COL.total_earned]),
    })
  }

  return { rows, headers, skipped, warnings }
}

/** Parse a browser File (CSV or XLSX) using SheetJS. Dynamically imports to avoid SSR cost. */
export async function parseInvoiceFile(file: File): Promise<ParseResult> {
  const XLSX: typeof import('xlsx') = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], headers: [], skipped: 0, warnings: ['Workbook is empty'] }
  const sheet = workbook.Sheets[sheetName]!
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][]
  return parseInvoiceRows(raw)
}

// ────────────────────────────────────────────────────────────────────────────
// Contact file parsing (ezyVet "Contact Data" export)
// ────────────────────────────────────────────────────────────────────────────

export interface ContactParseResult {
  rows: ContactRow[]
  headers: string[]
  warnings: string[]
}

export function parseContactRows(data: unknown[][]): ContactParseResult {
  const warnings: string[] = []
  let headerIdx = 0
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = (data[i] || []).map(c => String(c || ''))
    const joined = row.join(' ').toLowerCase()
    if ((joined.includes('first name') || joined.includes('contact')) && (joined.includes('email') || joined.includes('phone') || joined.includes('business'))) {
      headerIdx = i; break
    }
  }
  const headers = (data[headerIdx] || []).map(h => String(h || '').trim())

  const COL = {
    contact_id:       findCol(headers, ['Contact ID','ID','Client ID']),
    business_name:    findCol(headers, ['Business Name','Account Name','Client Name']),
    first_name:       findCol(headers, ['First Name','Client First Name','Given Name']),
    last_name:        findCol(headers, ['Last Name','Client Last Name','Surname']),
    email:            findCol(headers, ['Email','Email Address']),
    phone:            findCol(headers, ['Phone','Mobile','Phone Number','Cell']),
    address:          findCol(headers, ['Address','Street','Address 1']),
    city:             findCol(headers, ['City','Town']),
    state:            findCol(headers, ['State','Province','Region']),
    postal_code:      findCol(headers, ['Postal Code','Zip','ZIP','Zip Code']),
    pet_name:         findCol(headers, ['Pet Name','Patient Name','Animal']),
    species:          findCol(headers, ['Species']),
    breed:            findCol(headers, ['Breed']),
    primary_doctor:   findCol(headers, ['Primary Doctor','Preferred Doctor','Primary Vet','Vet']),
    primary_location: findCol(headers, ['Primary Location','Default Location','Home Location','Clinic']),
    created_at:       findCol(headers, ['Created','Created Date','Signup']),
    last_visit:       findCol(headers, ['Last Visit','Last Seen','Most Recent Visit']),
  }

  const rows: ContactRow[] = []
  for (let i = headerIdx + 1; i < data.length; i++) {
    const r = data[i]
    if (!r || r.length === 0) continue
    const first = r[COL.first_name]
    const last = r[COL.last_name]
    const biz = r[COL.business_name]
    if (!first && !last && !biz) continue
    rows.push({
      contact_id:       String(r[COL.contact_id] || '').trim(),
      business_name:    String(r[COL.business_name] || '').trim(),
      first_name:       String(r[COL.first_name] || '').trim(),
      last_name:        String(r[COL.last_name] || '').trim(),
      email:            String(r[COL.email] || '').trim(),
      phone:            String(r[COL.phone] || '').trim(),
      address:          String(r[COL.address] || '').trim(),
      city:             String(r[COL.city] || '').trim(),
      state:            String(r[COL.state] || '').trim(),
      postal_code:      String(r[COL.postal_code] || '').trim(),
      pet_name:         String(r[COL.pet_name] || '').trim(),
      species:          String(r[COL.species] || '').trim(),
      breed:            String(r[COL.breed] || '').trim(),
      primary_doctor:   String(r[COL.primary_doctor] || '').trim(),
      primary_location: String(r[COL.primary_location] || '').trim(),
      created_at:       toDate(r[COL.created_at]),
      last_visit:       toDate(r[COL.last_visit]),
    })
  }
  if (!rows.length) warnings.push('No contact rows detected — confirm this is an ezyVet Contact Data export.')
  return { rows, headers, warnings }
}

export async function parseContactFile(file: File): Promise<ContactParseResult> {
  const XLSX: typeof import('xlsx') = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], headers: [], warnings: ['Workbook is empty'] }
  const sheet = workbook.Sheets[sheetName]!
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][]
  return parseContactRows(raw)
}

/**
 * Auto-detect whether a file is an invoice-lines export or a contact export
 * by inspecting the first ~15 rows for signature headers.
 * Returns 'invoice' | 'contact' | 'unknown'.
 */
export async function detectFileKind(file: File): Promise<'invoice' | 'contact' | 'unknown'> {
  const XLSX: typeof import('xlsx') = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return 'unknown'
  const sheet = workbook.Sheets[sheetName]!
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][]
  for (let i = 0; i < Math.min(15, raw.length); i++) {
    const joined = (raw[i] || []).map(c => String(c || '').toLowerCase()).join(' ')
    if (joined.includes('invoice') && joined.includes('product') && joined.includes('price')) return 'invoice'
    if ((joined.includes('first name') || joined.includes('contact id')) && (joined.includes('email') || joined.includes('phone'))) return 'contact'
  }
  return 'unknown'
}
