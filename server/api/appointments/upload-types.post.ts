/**
 * Appointment Type Report Upload API
 *
 * POST /api/appointments/upload-types
 *
 * Parses the EzyVet "Appointment Type" export — a pre-aggregated summary with
 * one row per appointment type:
 *
 *   Type, Count, Average Time(Mins), Total Time(Mins)
 *
 * The export itself contains NO location or month, so the caller supplies them
 * (the UI derives them from the chosen filters / file name). Rows are upserted
 * into `appointment_type_summary`, keyed by (period_month, location, type), so
 * re-uploading the same month/location refreshes the numbers instead of
 * duplicating them.
 *
 * Body: {
 *   fileData: base64 CSV/XLS/XLSX,   // required
 *   periodMonth: 'YYYY-MM' | 'YYYY-MM-DD', // required — reporting month
 *   location: string,                // required — e.g. "Green Dog - Venice"
 * }
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

function toNumber(v: any): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// Normalize 'YYYY-MM' or 'YYYY-MM-DD' (or a parseable date) to the first day
// of that month as an ISO date string.
function normalizeMonth(raw: string): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  const ym = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/)
  if (ym) return `${ym[1]}-${ym[2]}-01`
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  }
  return null
}

export default defineEventHandler(async (event) => {
  try {
    // ── Auth ──
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
    const { fileData, periodMonth, location } = body as {
      fileData?: string; periodMonth?: string; location?: string
    }

    if (!fileData) {
      throw createError({ statusCode: 400, message: 'No file data provided. Send base64-encoded report content.' })
    }
    const month = normalizeMonth(periodMonth || '')
    if (!month) {
      throw createError({ statusCode: 400, message: 'A reporting month (periodMonth) is required, e.g. "2026-01".' })
    }
    const locationName = (location || '').trim() || null

    // ── Parse file (CSV / XLS / XLSX) ──
    const XLSX = await import('xlsx').then(m => m.default || m)
    const buffer = Buffer.from(fileData, 'base64')
    let workbook: any
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch {
      try {
        workbook = XLSX.read(buffer.toString('utf-8'), { type: 'string' })
      } catch (err2: any) {
        throw createError({ statusCode: 400, message: 'Failed to parse file: ' + (err2.message || 'Unsupported format. Upload CSV, XLS, or XLSX.') })
      }
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw createError({ statusCode: 400, message: 'No sheets found in file' })
    const rawRows: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' })

    // ── Locate header row (contains "Type" and "Count") ──
    let headerIdx = -1
    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
      const row = rawRows[i].map((c: any) => String(c).trim().toLowerCase())
      if (row.includes('type') && row.includes('count')) { headerIdx = i; break }
    }
    if (headerIdx === -1) {
      throw createError({ statusCode: 400, message: 'Could not find header row. Expected columns: Type, Count, Average Time(Mins), Total Time(Mins)' })
    }

    const headers = rawRows[headerIdx].map((c: any) => String(c).trim().toLowerCase())
    const typeCol = headers.findIndex((h: string) => h === 'type')
    const countCol = headers.findIndex((h: string) => h === 'count')
    const avgCol = headers.findIndex((h: string) => h.startsWith('average time'))
    const totalCol = headers.findIndex((h: string) => h.startsWith('total time'))

    if (typeCol === -1 || countCol === -1) {
      throw createError({ statusCode: 400, message: `Missing required columns. Found: ${rawRows[headerIdx].join(', ')}` })
    }

    const batchId = crypto.randomUUID()
    const records: any[] = []
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i]
      const typeName = String(row[typeCol] || '').trim()
      // Skip blanks and the trailing TOTALS / AVERAGE summary row.
      if (!typeName) continue
      const upper = typeName.toUpperCase()
      if (upper === 'TOTALS' || upper === 'TOTAL' || upper === 'AVERAGE') continue

      records.push({
        location_name: locationName,
        period_month: month,
        type_name: typeName,
        appointment_count: Math.round(toNumber(row[countCol])),
        avg_time_mins: avgCol !== -1 ? toNumber(row[avgCol]) : 0,
        total_time_mins: totalCol !== -1 ? toNumber(row[totalCol]) : 0,
        source: 'appointment_type',
        batch_id: batchId,
        uploaded_by: profile.id,
      })
    }

    if (records.length === 0) {
      throw createError({ statusCode: 400, message: 'No valid appointment-type rows found in the report' })
    }

    // ── Replace any existing rows for this month + location, then insert ──
    // Clearing first removes stale types that are no longer in the report; the
    // upsert key then keeps the insert idempotent.
    const delQuery = supabase
      .from('appointment_type_summary')
      .delete()
      .eq('period_month', month)
      .eq('source', 'appointment_type')
    if (locationName) delQuery.eq('location_name', locationName)
    else delQuery.is('location_name', null)
    await delQuery

    const { error: insertErr } = await supabase
      .from('appointment_type_summary')
      .upsert(records, { onConflict: 'period_month,location_name,type_name' })

    if (insertErr) {
      throw createError({ statusCode: 500, message: 'Failed to save appointment types: ' + insertErr.message })
    }

    const totalAppointments = records.reduce((s, r) => s + r.appointment_count, 0)

    return {
      success: true,
      batchId,
      periodMonth: month,
      location: locationName,
      typesImported: records.length,
      totalAppointments,
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('upload-types unhandled error:', err)
    throw createError({ statusCode: 500, message: 'Upload failed: ' + (err.message || 'Unknown server error') })
  }
})
