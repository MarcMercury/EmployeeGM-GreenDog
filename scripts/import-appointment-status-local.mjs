#!/usr/bin/env node
/**
 * Import Appointment Status CSV files from data/Appointments/ into Supabase.
 * Replicates the exact logic of /api/appointments/upload-status.
 *
 * Usage: node scripts/import-appointment-status-local.mjs
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

// ── CSV parser (handles quoted fields with commas/newlines) ──────────────
function parseCsv(text) {
  const rows = []
  let i = 0
  const len = text.length

  function parseField() {
    if (i >= len) return ''
    if (text[i] === '"') {
      i++
      let field = ''
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') { field += '"'; i += 2 }
          else { i++; break }
        } else { field += text[i]; i++ }
      }
      return field
    } else {
      let field = ''
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') { field += text[i]; i++ }
      return field
    }
  }

  while (i < len) {
    const row = []
    while (true) {
      row.push(parseField())
      if (i < len && text[i] === ',') { i++ } else break
    }
    if (i < len && text[i] === '\r') i++
    if (i < len && text[i] === '\n') i++
    rows.push(row)
  }
  return rows
}

// ── Helpers (mirrored from server/api/appointments/upload-status.post.ts) ──
function parseOwnerName(raw) {
  if (!raw) return { first: '', last: '' }
  const parts = raw.split(',').map(s => s.trim())
  return { last: parts[0] || '', first: parts[1] || '' }
}

function secondsToMinutes(s) {
  return Math.round((s || 0) / 60)
}

function excelDateToISO(val) {
  if (!val) return null
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/)
    if (match) return { date: match[1], time: match[2] }
    const slashMatch = val.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)$/)
    if (slashMatch) {
      let [, a, b, y, time] = slashMatch
      let day = parseInt(a), month = parseInt(b)
      if (day > 12 && month <= 12) { /* DD/MM */ }
      else if (month > 12 && day <= 12) { [day, month] = [month, day] }
      const date = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (time.length === 5) time += ':00'
      return { date, time }
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) return { date: d.toISOString().split('T')[0], time: d.toTimeString().slice(0, 8) }
    return null
  }
  return null
}

function deriveStatus(row) {
  if (row.complete > 0 || row.departed > 0) return 'completed'
  if (row.inConsultation > 0 || row.inProcedure > 0 || row.inHospital > 0) return 'in_progress'
  if (row.confirmed > 0 || row.inWaitingRoom > 0 || row.inTransit > 0) return 'confirmed'
  return 'scheduled'
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const dataDir = join(process.cwd(), 'data', 'Appointments')
  const allFiles = readdirSync(dataDir)
    .filter(f => f.startsWith('Appointment Status-2026-03-04-') && f.endsWith('.csv'))
    .sort()

  console.log(`Found ${allFiles.length} Appointment Status files to import\n`)

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

    // Find header row
    let headerIdx = -1
    for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
      const row = rawRows[i].map(c => c.trim().toLowerCase())
      if (row.includes('division') && row.includes('animal') && row.includes('owner')) {
        headerIdx = i
        break
      }
    }

    if (headerIdx === -1) {
      console.log(`⏭️  ${fileName}: no valid header row found, skipping`)
      continue
    }

    const headers = rawRows[headerIdx].map(c => c.trim())
    const colIdx = {}
    headers.forEach((h, i) => { colIdx[h.toLowerCase()] = i })

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
      console.log(`⏭️  ${fileName}: missing required columns, skipping`)
      continue
    }

    // Parse rows
    const parsed = []
    for (let i = headerIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i]
      const division = (row[divCol] || '').trim()
      const animal = (row[animalCol] || '').trim()
      const owner = (row[ownerCol] || '').trim()

      if (!owner || owner === 'AVERAGE' || owner === 'TOTAL' || !animal) continue

      const dtVal = (row[dateTimeCol] || '').trim()
      const dt = excelDateToISO(dtVal)
      if (!dt) continue

      const { first, last } = parseOwnerName(owner)

      parsed.push({
        division, animal, owner,
        ownerFirst: first, ownerLast: last,
        appointmentDateTime: `${dt.date} ${dt.time}`,
        appointmentDate: dt.date, appointmentTime: dt.time,
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
      console.log(`⏭️  ${fileName}: 0 valid appointment rows, skipping`)
      continue
    }

    const batchId = randomUUID()

    // Build records for appointment_data table
    const records = parsed.map(row => ({
      location_name: row.division || null,
      appointment_date: row.appointmentDate,
      appointment_time: row.appointmentTime,
      appointment_type: row.division || 'General Appointment',
      service_category: null,
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
      uploaded_by: uploadedBy,
    }))

    // Duplicate detection — delete existing data for overlapping dates, then insert fresh
    const incomingDates = [...new Set(records.map(r => r.appointment_date))].sort()
    const minDate = incomingDates[0]
    const maxDate = incomingDates[incomingDates.length - 1]

    // Determine the location for this file from parsed data
    const fileLocation = parsed[0]?.division || ''

    const { data: existingRows } = await supabase
      .from('appointment_data')
      .select('appointment_date')
      .eq('source', 'appointment_status')
      .eq('location_name', fileLocation)
      .gte('appointment_date', minDate)
      .lte('appointment_date', maxDate)

    const existingDateSet = new Set()
    if (existingRows) {
      for (const r of existingRows) existingDateSet.add(r.appointment_date)
    }
    const duplicateDates = incomingDates.filter(d => existingDateSet.has(d))
    let skipped = 0

    if (duplicateDates.length > 0) {
      // Replace strategy: delete existing for THIS LOCATION only, then re-insert
      for (const date of duplicateDates) {
        await supabase.from('appointment_data').delete()
          .eq('source', 'appointment_status')
          .eq('location_name', fileLocation)
          .eq('appointment_date', date)
      }
      console.log(`  Replacing data for ${duplicateDates.length} overlapping dates for ${fileLocation}`)
    }

    // Insert in chunks
    const CHUNK_SIZE = 500
    let inserted = 0
    let errors = 0

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE)
      const { error } = await supabase.from('appointment_data').insert(chunk)
      if (error) {
        console.error(`  Chunk error: ${error.message}`)
        errors += chunk.length
      } else {
        inserted += chunk.length
      }

      const pct = Math.round(Math.min(i + CHUNK_SIZE, records.length) / records.length * 100)
      process.stdout.write(`\r  ${fileName}: ${pct}% (${Math.min(i + CHUNK_SIZE, records.length)}/${records.length})`)
    }

    console.log(`\n✅ ${fileName}: ${inserted} inserted, ${skipped} skipped, ${errors} errors | ${parsed.length} parsed rows | dates: ${minDate} → ${maxDate}`)

    grandTotalInserted += inserted
    grandTotalSkipped += skipped
    grandTotalErrors += errors
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`GRAND TOTAL: ${grandTotalInserted} inserted, ${grandTotalSkipped} skipped, ${grandTotalErrors} errors`)
  console.log(`${'═'.repeat(60)}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
