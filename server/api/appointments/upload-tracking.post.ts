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
import { parseWeeklyTrackingCSV, detectReportFormat, parseAppointmentTypeReport } from '../../utils/appointments/clinic-report-parser'
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
    let parsedFromXLS = false
    try {
      // Try parsing as XLS/XLSX binary
      const XLSX = await import('xlsx').then(m => m.default || m)
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      // Use sheet_to_csv to preserve the matrix layout (title row, day headers, section rows)
      // blankrows: true ensures empty separator rows between sections are preserved
      csvText = XLSX.utils.sheet_to_csv(sheet, { blankrows: true })
      parsedFromXLS = true
    } catch {
      // Not a valid spreadsheet — treat as CSV text
      csvText = buffer.toString('utf-8')
    }
  }

  if (!csvText || typeof csvText !== 'string') {
    throw createError({ statusCode: 400, message: 'No file data provided. Send CSV text or base64-encoded CSV/XLS/XLSX.' })
  }

  // ── Auto-detect report format ──
  const format = detectReportFormat(csvText)
  const batchId = crypto.randomUUID()
  let records: any[] = []
  let reportMeta: any = {}

  if (format === 'appointment_type') {
    // ── EzyVet Appointment Type Report ──
    let report
    try {
      report = parseAppointmentTypeReport(csvText)
    } catch (err: any) {
      throw createError({ statusCode: 400, message: 'Failed to parse Appointment Type report: ' + (err.message || 'Invalid format') })
    }

    if (!report.appointments || report.appointments.length === 0) {
      throw createError({
        statusCode: 400,
        message: `No appointment data found in the Appointment Type report. Division: ${report.activeDivision || '(none)'}, Start: ${report.reportStartDate || '(none)'}, Rows found: ${report.rows.length}`,
      })
    }

    // Filter out availability rows
    const bookedOnly = report.appointments.filter(a => !a.is_availability && a.count > 0)
    if (bookedOnly.length === 0) {
      throw createError({ statusCode: 400, message: 'No booked appointments found (only availability rows detected).' })
    }

    records = bookedOnly.map(a => ({
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
        report_format: 'appointment_type',
        report_start_date: report.reportStartDate,
        report_end_date: report.reportEndDate,
        active_division: report.activeDivision,
        average_time_mins: report.rows.find(r => r.type === a.appointment_type)?.averageTimeMins || 0,
        total_time_mins: report.rows.find(r => r.type === a.appointment_type)?.totalTimeMins || 0,
        file_name: fileName,
      },
      uploaded_by: profile.id,
    }))

    reportMeta = {
      reportFormat: 'appointment_type',
      locationName: report.locationName,
      activeDivision: report.activeDivision,
      reportStartDate: report.reportStartDate,
      reportEndDate: report.reportEndDate,
      totalTypeRows: report.rows.length,
    }
  } else {
    // ── Weekly Tracking Matrix (existing behaviour) ──
    let parsed
    try {
      parsed = parseWeeklyTrackingCSV(csvText)
    } catch (err: any) {
      throw createError({ statusCode: 400, message: 'Failed to parse Appointment Tracking CSV: ' + (err.message || 'Invalid format') })
    }

    if (!parsed.appointments || parsed.appointments.length === 0) {
      const csvLines = csvText.split('\n')
      const diagnostics = {
        totalLines: csvLines.length,
        sectionsFound: parsed.sections?.length || 0,
        sectionNames: parsed.sections?.map((s: any) => s.category) || [],
        daysFound: parsed.days?.length || 0,
        weekTitle: parsed.weekTitle || '(none)',
        weekStart: parsed.weekStart || '(none)',
        firstLines: csvLines.slice(0, 5).map(l => l.substring(0, 120)),
      }
      throw createError({
        statusCode: 400,
        message: `No appointment data found in the CSV. Diagnostics: ${JSON.stringify(diagnostics)}`,
      })
    }

    const bookedOnly = parsed.appointments.filter(a => !a.is_availability && a.count > 0)
    if (bookedOnly.length === 0) {
      throw createError({ statusCode: 400, message: 'No booked appointments found (only availability rows detected).' })
    }

    records = bookedOnly.map(a => ({
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

    reportMeta = {
      reportFormat: 'weekly_tracking',
      weekTitle: parsed.weekTitle,
      weekStart: parsed.weekStart,
      weekEnd: parsed.weekEnd,
      sections: parsed.sections?.map(s => s.category),
    }
  }

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
      validRecords: records.length,
      duplicateDates,
      duplicateRecordCount,
      newRecordCount: records.length - duplicateRecordCount,
      ...reportMeta,
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
    inserted,
    skippedDuplicates,
    replacedDates,
    duplicateDates,
    errors,
    ...reportMeta,
  }
})
