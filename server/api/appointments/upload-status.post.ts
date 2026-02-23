/**
 * Appointment Status Report Upload API
 *
 * POST /api/appointments/upload-status
 *
 * Parses the EzyVet "Appointment Status" XLS report.
 * This report contains per-appointment rows with:
 *   Division, Animal, Owner (Last, First), Appointment Date/Time,
 *   and timing columns for each status stage (in seconds).
 *
 * This data links to Invoice Lines via Owner name ↔ client name and Animal ↔ Pet Name.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import * as XLSX from 'xlsx'

interface StatusRow {
  division: string
  animal: string
  owner: string          // "Last, First" format
  ownerFirst: string
  ownerLast: string
  appointmentDateTime: string
  appointmentDate: string
  appointmentTime: string
  // Status timing (seconds)
  noStatus: number
  unconfirmed: number
  confirmed: number
  inTransit: number
  inWaitingRoom: number
  inConsultation: number
  inProcedure: number
  admitForSurgery: number
  inHospital: number
  inDischarge: number
  awaitingCollect: number
  departed: number
  interimReport: number
  referralDone: number
  complete: number
  timeToComplete: number
}

function parseOwnerName(raw: string): { first: string; last: string } {
  if (!raw) return { first: '', last: '' }
  const parts = raw.split(',').map(s => s.trim())
  return { last: parts[0] || '', first: parts[1] || '' }
}

function secondsToMinutes(s: number): number {
  return Math.round((s || 0) / 60)
}

function excelDateToISO(val: any): { date: string; time: string } | null {
  if (!val) return null

  // If it's a string like "2026-01-30 09:00:00"
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/)
    if (match) return { date: match[1], time: match[2] }
    // Try parsing as date
    const d = new Date(val)
    if (!isNaN(d.getTime())) return { date: d.toISOString().split('T')[0], time: d.toTimeString().slice(0, 8) }
    return null
  }

  // If it's an Excel serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) {
      const date = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
      const time = `${String(d.H).padStart(2, '0')}:${String(d.M).padStart(2, '0')}:${String(d.S).padStart(2, '0')}`
      return { date, time }
    }
    return null
  }

  return null
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

  if (!profile || !['admin', 'super_admin', 'manager', 'hr_admin', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { fileData, fileName, duplicateAction } = body
  // fileData: base64-encoded XLS/XLSX file content
  // duplicateAction: 'check' | 'skip' | 'replace' | undefined

  if (!fileData) {
    throw createError({ statusCode: 400, message: 'No file data provided. Send base64-encoded XLS content.' })
  }

  // Decode base64 → buffer → parse with xlsx (supports XLS, XLSX, and CSV)
  const buffer = Buffer.from(fileData, 'base64')
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    // Binary parse failed — try treating as CSV/TSV text
    try {
      const csvText = buffer.toString('utf-8')
      workbook = XLSX.read(csvText, { type: 'string' })
    } catch (err2: any) {
      throw createError({ statusCode: 400, message: 'Failed to parse file: ' + (err2.message || 'Unsupported format. Upload CSV, XLS, or XLSX.') })
    }
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw createError({ statusCode: 400, message: 'No sheets found in file' })
  const sheet = workbook.Sheets[sheetName]
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rawRows.length < 10) {
    throw createError({ statusCode: 400, message: 'File has too few rows to be a valid Appointment Status report' })
  }

  // Find the header row (contains "Division", "Animal", "Owner", "Appointment Date/Time")
  let headerIdx = -1
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i].map((c: any) => String(c).trim().toLowerCase())
    if (row.includes('division') && row.includes('animal') && row.includes('owner')) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    throw createError({ statusCode: 400, message: 'Could not find header row. Expected columns: Division, Animal, Owner, Appointment Date/Time' })
  }

  const headers = rawRows[headerIdx].map((c: any) => String(c).trim())

  // Map header names to indices
  const colIdx: Record<string, number> = {}
  headers.forEach((h: string, i: number) => { colIdx[h.toLowerCase()] = i })

  const divCol = colIdx['division'] ?? -1
  const animalCol = colIdx['animal'] ?? -1
  const ownerCol = colIdx['owner'] ?? -1
  const dateTimeCol = colIdx['appointment date/time'] ?? -1
  const noStatusCol = colIdx['no status'] ?? -1
  const unconfCol = colIdx['unconfirmed'] ?? -1
  const confCol = colIdx['confirmed'] ?? -1
  const transitCol = colIdx['in transit'] ?? -1
  const waitCol = colIdx['in waiting room'] ?? -1
  const consultCol = colIdx['in consultation'] ?? -1
  const procCol = colIdx['in procedure'] ?? -1
  const surgCol = colIdx['admit for surgery'] ?? -1
  const hospCol = colIdx['in hospital'] ?? -1
  const dischCol = colIdx['in discharge'] ?? -1
  const collectCol = colIdx['awaiting collect'] ?? -1
  const departCol = colIdx['departed'] ?? -1
  const interimCol = colIdx['interim report'] ?? -1
  const referralCol = colIdx['referral done'] ?? -1
  const completeCol = colIdx['complete'] ?? -1
  const ttcCol = colIdx['time to complete'] ?? -1

  if (divCol === -1 || animalCol === -1 || ownerCol === -1 || dateTimeCol === -1) {
    throw createError({ statusCode: 400, message: `Missing required columns. Found: ${headers.join(', ')}` })
  }

  // Extract the location from metadata rows (row 2 typically has "Active Division" → location name)
  let reportLocation = ''
  for (let i = 0; i < headerIdx; i++) {
    const row = rawRows[i]
    if (row.some((c: any) => String(c).toLowerCase().includes('active division'))) {
      // The value is typically in the next column
      const idx = row.findIndex((c: any) => String(c).toLowerCase().includes('active division'))
      reportLocation = String(row[idx + 1] || '').trim()
      break
    }
  }

  // Parse data rows (skip header, skip AVERAGE/summary rows at end)
  const parsed: StatusRow[] = []
  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    const division = String(row[divCol] || '').trim()
    const animal = String(row[animalCol] || '').trim()
    const owner = String(row[ownerCol] || '').trim()

    // Skip summary rows
    if (!owner || owner === 'AVERAGE' || owner === 'TOTAL' || !animal) continue

    const dtVal = row[dateTimeCol]
    const dt = excelDateToISO(dtVal)
    if (!dt) continue

    const { first, last } = parseOwnerName(owner)

    parsed.push({
      division,
      animal,
      owner,
      ownerFirst: first,
      ownerLast: last,
      appointmentDateTime: `${dt.date} ${dt.time}`,
      appointmentDate: dt.date,
      appointmentTime: dt.time,
      noStatus: Number(row[noStatusCol]) || 0,
      unconfirmed: Number(row[unconfCol]) || 0,
      confirmed: Number(row[confCol]) || 0,
      inTransit: Number(row[transitCol]) || 0,
      inWaitingRoom: Number(row[waitCol]) || 0,
      inConsultation: Number(row[consultCol]) || 0,
      inProcedure: Number(row[procCol]) || 0,
      admitForSurgery: Number(row[surgCol]) || 0,
      inHospital: Number(row[hospCol]) || 0,
      inDischarge: Number(row[dischCol]) || 0,
      awaitingCollect: Number(row[collectCol]) || 0,
      departed: Number(row[departCol]) || 0,
      interimReport: Number(row[interimCol]) || 0,
      referralDone: Number(row[referralCol]) || 0,
      complete: Number(row[completeCol]) || 0,
      timeToComplete: Number(row[ttcCol]) || 0,
    })
  }

  if (parsed.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid appointment rows found in the report' })
  }

  const batchId = crypto.randomUUID()

  // Determine appointment status from timing columns
  function deriveStatus(row: StatusRow): string {
    if (row.complete > 0 || row.departed > 0) return 'completed'
    if (row.inConsultation > 0 || row.inProcedure > 0 || row.inHospital > 0) return 'in_progress'
    if (row.confirmed > 0 || row.inWaitingRoom > 0 || row.inTransit > 0) return 'confirmed'
    return 'scheduled'
  }

  // Build records for appointment_data table
  const records = parsed.map(row => ({
    location_name: row.division || reportLocation || null,
    appointment_date: row.appointmentDate,
    appointment_time: row.appointmentTime,
    appointment_type: 'Appointment Status', // Generic — we don't know specific type from this report
    service_category: null, // Not available in status report
    species: null,
    status: deriveStatus(row),
    duration_minutes: secondsToMinutes(row.timeToComplete),
    revenue: null,
    provider_name: null,
    source: 'appointment_status',
    batch_id: batchId,
    raw_data: {
      animal: row.animal,
      owner: row.owner,
      owner_first: row.ownerFirst,
      owner_last: row.ownerLast,
      division: row.division,
      timing: {
        no_status_sec: row.noStatus,
        unconfirmed_sec: row.unconfirmed,
        confirmed_sec: row.confirmed,
        in_transit_sec: row.inTransit,
        in_waiting_room_sec: row.inWaitingRoom,
        in_consultation_sec: row.inConsultation,
        in_procedure_sec: row.inProcedure,
        admit_for_surgery_sec: row.admitForSurgery,
        in_hospital_sec: row.inHospital,
        in_discharge_sec: row.inDischarge,
        awaiting_collect_sec: row.awaitingCollect,
        departed_sec: row.departed,
        interim_report_sec: row.interimReport,
        referral_done_sec: row.referralDone,
        complete_sec: row.complete,
        time_to_complete_sec: row.timeToComplete,
      },
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
    .eq('source', 'appointment_status')
    .gte('appointment_date', minDate)
    .lte('appointment_date', maxDate)

  const existingDateSet = new Set<string>()
  if (existingRows) {
    for (const r of existingRows) existingDateSet.add(r.appointment_date)
  }
  const duplicateDates = incomingDates.filter(d => existingDateSet.has(d))
  const duplicateRecordCount = records.filter(r => existingDateSet.has(r.appointment_date)).length

  if (duplicateAction === 'check') {
    return {
      success: true,
      mode: 'check',
      totalRows: parsed.length,
      validRecords: records.length,
      duplicateDates,
      duplicateRecordCount,
      newRecordCount: records.length - duplicateRecordCount,
      reportLocation,
      dateRange: { start: minDate, end: maxDate },
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
        await supabase.from('appointment_data').delete().eq('source', 'appointment_status').eq('appointment_date', date)
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
    if (error) { console.error(`Status upload chunk error:`, error.message); errors += chunk.length }
    else inserted += chunk.length
  }

  // Unique owners for cross-reference stats
  const uniqueOwners = new Set(parsed.map(p => p.owner))
  const uniqueAnimals = new Set(parsed.map(p => p.animal))

  return {
    success: true,
    batchId,
    totalRows: parsed.length,
    inserted,
    skippedDuplicates,
    replacedDates,
    duplicateDates,
    errors,
    reportLocation,
    dateRange: { start: minDate, end: maxDate },
    stats: {
      uniqueOwners: uniqueOwners.size,
      uniqueAnimals: uniqueAnimals.size,
      locations: [...new Set(parsed.map(p => p.division))],
    },
  }
})
