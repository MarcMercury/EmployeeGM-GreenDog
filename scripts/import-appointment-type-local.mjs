#!/usr/bin/env node
/**
 * Import Appointment Type CSV files from data/Appointments/ into Supabase.
 * Uses the server's clinic-report-parser logic (replicated here for node ESM).
 *
 * Usage: node scripts/import-appointment-type-local.mjs
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

// ── CSV cell parser (handles quoted fields) ──────────────────────────────
function parseCSVCells(line) {
  const cells = []
  let i = 0
  const len = line.length
  while (i <= len) {
    if (i === len) { cells.push(''); break }
    if (line[i] === '"') {
      i++ // skip opening quote
      let field = ''
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') { field += '"'; i += 2 }
          else { i++; break }
        } else { field += line[i]; i++ }
      }
      cells.push(field)
      if (i < len && line[i] === ',') i++ // skip comma after closing quote
    } else {
      let field = ''
      while (i < len && line[i] !== ',') { field += line[i]; i++ }
      cells.push(field)
      if (i < len && line[i] === ',') i++
      else break
    }
  }
  return cells
}

// ── Appointment Type lookup (from clinic-report-parser) ──────────────────
const GDD_APPOINTMENT_TYPE_MAP = {
  'NEAT New': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'NEAT Returning': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'NEAT (Nails.Ears.Anal Glands) Returning': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'NEAT (Nails.Ears.Anal Glands) New': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'NAD New': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'NAD Returning': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'GDD (New)': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'GDD (Returning)': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'OE New': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'OE Returning': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'Oral Exam (New)': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'Oral Exam (Returning)': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'Dental Avail': { serviceCode: 'DENTAL', department: 'Dentistry' },
  'AP': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'Advanced Procedure': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'Advanced Procedure ': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'OE/AP': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'OE Possible Same Day AP': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'AP Avail': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'Post AP Recheck': { serviceCode: 'AP', department: 'Advanced Procedures' },
  'VE New': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'VE Returning': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Veterinary Exam New': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Veterinary Exam New ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Veterinary Exam Returning': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'VE Avail': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Urgent Care (New)': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Urgent Care (New) ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Urgent Care (Returning)': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Urgent Care (Returning) ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Drop Off Urgent Care': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Drop Off Urgent Care ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Tech Services': { serviceCode: 'ADDON', department: 'Add-on Services' },
  'Tech Services (VX,AG,NT)': { serviceCode: 'ADDON', department: 'Add-on Services' },
  'Bloodwork': { serviceCode: 'ADDON', department: 'Add-on Services' },
  'Imaging': { serviceCode: 'IMAGING', department: 'Imaging' },
  'Surgery': { serviceCode: 'SURG', department: 'Surgery' },
  'Internal Medicine': { serviceCode: 'IM', department: 'Internal Medicine' },
  'IM - Consult - New': { serviceCode: 'IM', department: 'Internal Medicine' },
  'IM - Consult - New ': { serviceCode: 'IM', department: 'Internal Medicine' },
  'IM - Consult - Recheck': { serviceCode: 'IM', department: 'Internal Medicine' },
  'IM - Consult - Recheck ': { serviceCode: 'IM', department: 'Internal Medicine' },
  'IM - Procedure': { serviceCode: 'IM', department: 'Internal Medicine' },
  'Cardiology D\'Urso': { serviceCode: 'CARDIO', department: 'Cardiology' },
  'Telemedicine Consult': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Sick/Referral New': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Sick/Referral Returning': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Sick/Referral Returning ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Recheck': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Recheck ': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Same Day Urgent Care New': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Same Day Urgent Care Returning': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'EX - Tech Grooming': { serviceCode: 'ADDON', department: 'Add-on Services' },
  'EX - Tech Grooming ': { serviceCode: 'ADDON', department: 'Add-on Services' },
  'Post Surgical Recheck': { serviceCode: 'SURG', department: 'Surgery' },
  'Post Surgical Recheck ': { serviceCode: 'SURG', department: 'Surgery' },
  'VetFM Client': { serviceCode: 'WELLNESS', department: 'Wellness' },
  'Dog Ppl VE- Returning': { serviceCode: 'OTHER', department: 'DOG PPL' },
  'Dog Ppl VE- Returning ': { serviceCode: 'OTHER', department: 'DOG PPL' },
}

function lookupAppointmentType(typeName) {
  // Direct match (including with trailing space)
  if (GDD_APPOINTMENT_TYPE_MAP[typeName]) return GDD_APPOINTMENT_TYPE_MAP[typeName]
  // Trimmed match
  const trimmed = typeName.trim()
  if (GDD_APPOINTMENT_TYPE_MAP[trimmed]) return GDD_APPOINTMENT_TYPE_MAP[trimmed]
  // Fuzzy: case-insensitive
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(GDD_APPOINTMENT_TYPE_MAP)) {
    if (key.trim().toLowerCase() === lower) return val
  }
  return null
}

// ── Infer location from data rows ────────────────────────────────────────
function inferLocationFromRows(rows) {
  for (const row of rows) {
    const lower = row.type.toLowerCase()
    if (lower.includes('sherman oaks')) return { name: 'Sherman Oaks', code: 'SO' }
    if (lower.includes('van nuys')) return { name: 'Van Nuys', code: 'VN' }
    if (lower.includes('venice')) return { name: 'Venice', code: 'VE' }
  }
  return { name: 'Unknown', code: '??' }
}

function safeParseInt(val) {
  if (!val) return 0
  const cleaned = String(val).trim()
  if (cleaned === '' || cleaned === 'x' || cleaned === '-') return 0
  const n = parseInt(cleaned)
  return isNaN(n) ? 0 : n
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const dataDir = join(process.cwd(), 'data', 'Appointments')
  const allFiles = readdirSync(dataDir)
    .filter(f => f.startsWith('Appointment Type-2026-03-04-') && f.endsWith('.csv'))
    .sort()

  console.log(`Found ${allFiles.length} Appointment Type files to import\n`)

  // Get an admin profile for uploaded_by
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'super_admin'])
    .limit(1)
    .single()

  const uploadedBy = adminProfile?.id || null
  console.log(`Using profile ID: ${uploadedBy}\n`)

  let grandTotalInserted = 0
  let grandTotalSkipped = 0
  let grandTotalErrors = 0

  for (const fileName of allFiles) {
    const filePath = join(dataDir, fileName)
    const csvText = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = csvText.split('\n').map(l => l.trimEnd())

    // Extract metadata (may not exist in these files)
    let activeDivision = ''
    let reportStartDate = ''
    let reportEndDate = ''

    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const cells = parseCSVCells(lines[i])
      for (let c = 0; c < cells.length; c++) {
        const label = cells[c].trim().toLowerCase()
        const value = (cells[c + 1] || '').trim()
        if (label === 'active division' && value) activeDivision = value
        if (label === 'report start date' && value) reportStartDate = value
        if (label === 'report end date' && value) reportEndDate = value
      }
    }

    // Find header row with Type + Count
    let headerIdx = -1
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const cells = parseCSVCells(lines[i]).map(c => c.trim().toLowerCase())
      if (cells.includes('type') && cells.includes('count')) {
        headerIdx = i
        break
      }
    }

    if (headerIdx === -1) {
      console.log(`⏭️  ${fileName}: no header row found, skipping`)
      continue
    }

    const headers = parseCSVCells(lines[headerIdx]).map(c => c.trim().toLowerCase())
    const typeCol = headers.indexOf('type')
    const countCol = headers.indexOf('count')
    const avgTimeCol = headers.findIndex(h => h.includes('average time'))
    const totalTimeCol = headers.findIndex(h => h.includes('total time'))

    // Parse data rows
    const rows = []
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cells = parseCSVCells(lines[i])
      const typeName = (cells[typeCol] || '').trim()
      if (!typeName || typeName.toLowerCase() === 'totals') continue
      const count = safeParseInt(cells[countCol])
      if (count === 0) continue
      rows.push({
        type: typeName,
        count,
        averageTimeMins: avgTimeCol >= 0 ? safeParseInt(cells[avgTimeCol]) : 0,
        totalTimeMins: totalTimeCol >= 0 ? safeParseInt(cells[totalTimeCol]) : 0,
      })
    }

    if (rows.length === 0) {
      console.log(`⏭️  ${fileName}: 0 valid rows, skipping`)
      continue
    }

    // Infer location from rows (facility name rows) or metadata
    const location = activeDivision
      ? inferLocationFromRows([{ type: activeDivision }])
      : inferLocationFromRows(rows)

    // Use today's date if no reportStartDate in metadata
    const appointmentDate = reportStartDate || '2026-03-04'

    const batchId = randomUUID()

    // Build records — filter out facility rows and availability rows
    const facilityKeywords = ['facility', 'sherman oaks -', 'van nuys -', 'venice -']
    const isAvailOrFacility = (t) => {
      const lower = t.toLowerCase()
      return lower.includes('avail') || facilityKeywords.some(kw => lower.includes(kw))
    }

    const bookedRows = rows.filter(r => !isAvailOrFacility(r.type))
    // Also keep the zVET SERVICES ONLY row but mark differently
    const records = bookedRows.map(row => {
      const typeInfo = lookupAppointmentType(row.type)
      return {
        location_name: location.name,
        appointment_date: appointmentDate,
        appointment_type: row.type,
        service_category: typeInfo?.serviceCode || 'OTHER',
        status: 'completed',
        source: 'weekly_tracking',
        batch_id: batchId,
        raw_data: {
          count: row.count,
          location_code: location.code,
          department: typeInfo?.department || 'General',
          report_format: 'appointment_type',
          report_start_date: reportStartDate,
          report_end_date: reportEndDate,
          active_division: activeDivision,
          average_time_mins: row.averageTimeMins,
          total_time_mins: row.totalTimeMins,
          file_name: fileName,
        },
        uploaded_by: uploadedBy,
      }
    })

    // Duplicate detection — replace strategy for overlapping dates
    const { data: existingRows } = await supabase
      .from('appointment_data')
      .select('id')
      .eq('source', 'weekly_tracking')
      .eq('appointment_date', appointmentDate)
      .eq('location_name', location.name)

    let replaced = 0
    if (existingRows && existingRows.length > 0) {
      const { error: delErr } = await supabase
        .from('appointment_data')
        .delete()
        .eq('source', 'weekly_tracking')
        .eq('appointment_date', appointmentDate)
        .eq('location_name', location.name)
      if (!delErr) replaced = existingRows.length
      console.log(`  Replacing ${replaced} existing records for ${location.name} on ${appointmentDate}`)
    }

    // Insert
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
    }

    const totalAppts = rows.reduce((s, r) => s + r.count, 0)
    console.log(`✅ ${fileName}: ${inserted} type records inserted (${totalAppts} total appointments) | Location: ${location.name} | ${errors} errors`)

    grandTotalInserted += inserted
    grandTotalErrors += errors
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`GRAND TOTAL: ${grandTotalInserted} type records inserted, ${grandTotalErrors} errors`)
  console.log(`${'═'.repeat(60)}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
