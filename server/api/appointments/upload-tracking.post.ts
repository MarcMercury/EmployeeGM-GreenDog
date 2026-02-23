/**
 * Appointment Tracking CSV Upload API
 *
 * POST /api/appointments/upload-tracking
 *
 * Accepts the weekly Appointment Tracking matrix-format CSV (same format
 * as the files in data/Appointments/) and flattens it into appointment_data rows
 * using the existing parseWeeklyTrackingCSV parser.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { parseWeeklyTrackingCSV } from '../../utils/appointments/clinic-report-parser'
import { createRequire } from 'module'
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
  const { csvText: rawCsvText, fileData, fileName, duplicateAction } = body

  // Accept either CSV text directly or base64-encoded file (CSV or XLS/XLSX)
  let csvText = rawCsvText
  if (!csvText && fileData) {
    const buffer = Buffer.from(fileData, 'base64')
    try {
      // Try parsing as XLS/XLSX binary
      // Use createRequire for CJS require — preserves xlsx's internal cpexcel.js resolution
      const _require = createRequire(import.meta.url)
      const XLSX = _require('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      csvText = XLSX.utils.sheet_to_csv(sheet)
    } catch {
      // Not a valid spreadsheet — treat as CSV text
      csvText = buffer.toString('utf-8')
    }
  }

  if (!csvText || typeof csvText !== 'string') {
    throw createError({ statusCode: 400, message: 'No file data provided. Send CSV text or base64-encoded CSV/XLS/XLSX.' })
  }

  // Parse the matrix-format CSV
  let parsed
  try {
    parsed = parseWeeklyTrackingCSV(csvText)
  } catch (err: any) {
    throw createError({ statusCode: 400, message: 'Failed to parse Appointment Tracking CSV: ' + (err.message || 'Invalid format') })
  }

  if (!parsed.appointments || parsed.appointments.length === 0) {
    throw createError({ statusCode: 400, message: 'No appointment data found in the CSV. Make sure it follows the weekly tracking matrix format.' })
  }

  // Filter out availability rows — only keep booked appointments
  const bookedOnly = parsed.appointments.filter(a => !a.is_availability && a.count > 0)

  if (bookedOnly.length === 0) {
    throw createError({ statusCode: 400, message: 'No booked appointments found (only availability rows detected).' })
  }

  const batchId = crypto.randomUUID()

  // Flatten: each parsed appointment with count > 1 becomes 'count' individual records
  // (Or store as count — the existing import-clinic-reports stores one row per type per day per location with raw_data.count)
  const records = bookedOnly.map(a => ({
    location_name: a.location_name,
    appointment_date: a.appointment_date,
    appointment_type: a.appointment_type,
    service_category: a.service_category || a.department || null,
    status: 'completed',
    source: 'weekly_tracking',
    batch_id: batchId,
    raw_data: {
      count: a.count,
      location_code: a.location_code,
      department: a.department,
      week_start: a.week_start,
      file_name: fileName,
    },
    uploaded_by: profile.id,
  }))

  // ── Duplicate detection ──
  const incomingDates = [...new Set(records.map(r => r.appointment_date))].sort()
  const minDate = incomingDates[0]
  const maxDate = incomingDates[incomingDates.length - 1]

  const { data: existingRows } = await supabase
    .from('appointment_data')
    .select('appointment_date')
    .eq('source', 'weekly_tracking')
    .gte('appointment_date', minDate)
    .lte('appointment_date', maxDate)

  const existingDateSet = new Set<string>()
  if (existingRows) for (const r of existingRows) existingDateSet.add(r.appointment_date)

  const duplicateDates = incomingDates.filter(d => existingDateSet.has(d))
  const duplicateRecordCount = records.filter(r => existingDateSet.has(r.appointment_date)).length

  if (duplicateAction === 'check') {
    return {
      success: true,
      mode: 'check',
      totalRows: parsed.appointments.length,
      bookedRows: bookedOnly.length,
      validRecords: records.length,
      duplicateDates,
      duplicateRecordCount,
      newRecordCount: records.length - duplicateRecordCount,
      weekTitle: parsed.weekTitle,
      weekStart: parsed.weekStart,
      weekEnd: parsed.weekEnd,
      sections: parsed.sections.map(s => s.category),
    }
  }

  let recordsToInsert = records
  let skippedDuplicates = 0
  let replacedDates: string[] = []

  if (duplicateDates.length > 0) {
    if (duplicateAction === 'skip') {
      recordsToInsert = records.filter(r => !existingDateSet.has(r.appointment_date))
      skippedDuplicates = records.length - recordsToInsert.length
    } else if (duplicateAction === 'replace') {
      for (const date of duplicateDates) {
        await supabase.from('appointment_data').delete().eq('source', 'weekly_tracking').eq('appointment_date', date)
      }
      replacedDates = [...duplicateDates]
    }
  }

  // Insert
  const CHUNK_SIZE = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('appointment_data').insert(chunk)
    if (error) { console.error(`Tracking upload chunk error:`, error.message); errors += chunk.length }
    else inserted += chunk.length
  }

  return {
    success: true,
    batchId,
    totalRows: parsed.appointments.length,
    bookedRows: bookedOnly.length,
    inserted,
    skippedDuplicates,
    replacedDates,
    duplicateDates,
    errors,
    weekTitle: parsed.weekTitle,
    weekStart: parsed.weekStart,
    weekEnd: parsed.weekEnd,
    sections: parsed.sections.map(s => s.category),
  }
})
