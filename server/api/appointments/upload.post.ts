/**
 * Appointment Data Upload API
 * 
 * POST /api/appointments/upload
 * 
 * Accepts parsed CSV data and inserts into appointment_data table.
 * Auto-maps appointment types to service categories using existing service codes.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { lookupAppointmentType } from '../../utils/appointments/clinic-report-parser'

// Common appointment type → service code mappings
// Extended with actual GreenDog/EzyVet appointment types
const SERVICE_CODE_MAP: Record<string, string> = {
  // ─── Surgery ───
  'surgery': 'SURG', 'sx': 'SURG', 'spay': 'SURG', 'neuter': 'SURG',
  'mass removal': 'SURG', 'orthopedic': 'SURG', 'tplo': 'SURG',
  'fho': 'SURG', 'gastropexy': 'SURG', 'exploratory': 'SURG',
  'laparoscopic': 'SURG', 'abdominal': 'SURG',
  'surgery consult new': 'SURG', 'surgery consult returning': 'SURG',

  // ─── Dental / Oral ───
  'dental': 'DENTAL', 'dental cleaning': 'DENTAL', 'dental prophylaxis': 'DENTAL',
  'extraction': 'DENTAL', 'tooth extraction': 'DENTAL', 'oral surgery': 'DENTAL',
  'dental radiograph': 'DENTAL',
  'neat new': 'DENTAL', 'neat returning': 'DENTAL',
  'neat (nails.ears.anal glands) returning': 'DENTAL',
  'nad new': 'DENTAL', 'nad returning': 'DENTAL',
  'oe new': 'DENTAL', 'oe returning': 'DENTAL',
  'oral exam (new)': 'DENTAL', 'oral exam (returning)': 'DENTAL',
  'gdd (new)': 'DENTAL', 'gdd (returning)': 'DENTAL',

  // ─── Advanced Procedures ───
  'advanced procedure': 'AP', 'ap': 'AP', 'oe/ap': 'AP',
  'oe possible same day ap': 'AP', 'post ap recheck': 'AP',

  // ─── Internal Medicine ───
  'internal medicine': 'IM', 'endoscopy': 'IM', 'ultrasound': 'IM',
  'consultation': 'IM', 'referral consult': 'IM',
  'im consult new': 'IM', 'im consult returning': 'IM',
  'im - consult - recheck': 'IM', 'im recheck': 'IM',
  'im tech': 'IM', 'im procedure': 'IM',

  // ─── Exotics ───
  'exotic': 'EXOTIC', 'avian': 'EXOTIC', 'reptile': 'EXOTIC', 'small mammal': 'EXOTIC',
  'ex wellness new': 'EXOTIC', 'ex wellness returning': 'EXOTIC',
  'ex- veterinary exam- new': 'EXOTIC', 'ex recheck': 'EXOTIC',
  'ex tech': 'EXOTIC', 'ex sick new': 'EXOTIC', 'ex sick returning': 'EXOTIC',
  'ex surgery': 'EXOTIC',

  // ─── Cardiology ───
  'cardiology': 'CARDIO', 'echocardiogram': 'CARDIO', 'echo': 'CARDIO',
  'cardiac': 'CARDIO', 'heart': 'CARDIO',

  // ─── Wellness / Veterinary Exams ───
  'wellness': 'WELLNESS', 'wellness exam': 'WELLNESS', 'annual exam': 'WELLNESS',
  'vaccine': 'WELLNESS', 'vaccination': 'WELLNESS', 'physical exam': 'WELLNESS',
  'check up': 'WELLNESS', 'checkup': 'WELLNESS', 'sick visit': 'WELLNESS',
  'recheck': 'WELLNESS', 're-check': 'WELLNESS',
  've new': 'WELLNESS', 've returning': 'WELLNESS',
  'veterinary exam new': 'WELLNESS', 'veterinary exam returning': 'WELLNESS',
  'urgent care (new)': 'WELLNESS', 'urgent care (returning)': 'WELLNESS',
  'drop off urgent care': 'WELLNESS',

  // ─── Urgent Care ───
  'emergency': 'WELLNESS', 'urgent care': 'WELLNESS', 'er': 'WELLNESS',

  // ─── Add-on / Tech Services ───
  'tech services': 'ADDON', 'tech services (vx,ag,nt)': 'ADDON',
  'bloodwork': 'ADDON',

  // ─── Imaging ───
  'imaging': 'IMAGING', 'radiograph': 'IMAGING', 'x-ray': 'IMAGING',
  'xray': 'IMAGING', 'ct scan': 'IMAGING', 'mri': 'IMAGING',

  // ─── Mobile/MPMV ───
  'mp - pickup': 'MPMV', 'mp - shipment': 'MPMV', 'mp - meds done': 'MPMV',

  // ─── Other ───
  'vetfm client': 'WELLNESS',
}

function mapToServiceCategory(appointmentType: string): string | null {
  if (!appointmentType) return null
  const lower = appointmentType.toLowerCase().trim()
  
  // Direct match in local map
  if (SERVICE_CODE_MAP[lower]) return SERVICE_CODE_MAP[lower]
  
  // Partial match in local map
  for (const [key, code] of Object.entries(SERVICE_CODE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code
  }

  // Fall back to the comprehensive GDD type lookup
  const gddMatch = lookupAppointmentType(appointmentType)
  if (gddMatch) return gddMatch.serviceCode
  
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
  
  if (!profile || !['admin', 'super_admin', 'manager', 'sup_admin', 'marketing_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const body = await readBody(event)
  const { appointments, locationId, locationName, duplicateAction } = body
  // duplicateAction: 'check' = detect only, 'skip' = omit duplicate days, 'replace' = delete & re-insert, undefined = legacy insert-all

  if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
    throw createError({ statusCode: 400, message: 'No appointment data provided' })
  }

  if (appointments.length > 50000) {
    throw createError({ statusCode: 400, message: `Too many rows: ${appointments.length}. Maximum 50,000 per upload.` })
  }

  const batchId = crypto.randomUUID()
  
  // Map and insert appointment data
  const records = appointments.map((appt: any) => ({
    location_id: locationId || null,
    location_name: locationName || appt.location || appt.Location || appt.clinic || appt.Clinic || null,
    appointment_date: appt.date || appt.Date || appt.appointment_date || appt['Appointment Date'] || null,
    appointment_time: appt.time || appt.Time || appt.appointment_time || appt['Appointment Time'] || null,
    appointment_type: appt.type || appt.Type || appt.appointment_type || appt['Appointment Type'] || appt.service || appt.Service || appt.reason || appt.Reason || 'Unknown',
    service_category: mapToServiceCategory(
      appt.type || appt.Type || appt.appointment_type || appt['Appointment Type'] || appt.service || appt.Service || appt.reason || appt.Reason || ''
    ),
    species: appt.species || appt.Species || appt.animal_type || appt['Animal Type'] || null,
    status: (appt.status || appt.Status || 'scheduled').toLowerCase(),
    duration_minutes: parseInt(appt.duration || appt.Duration || appt.duration_minutes || '0') || null,
    revenue: parseFloat(appt.revenue || appt.Revenue || appt.amount || appt.Amount || '0') || null,
    provider_name: appt.provider || appt.Provider || appt.vet || appt.Vet || appt.veterinarian || appt.doctor || appt.Doctor || null,
    source: 'csv_upload',
    batch_id: batchId,
    raw_data: appt,
    uploaded_by: profile.id,
  })).filter((r: any) => r.appointment_date) // Must have a date

  if (records.length === 0) {
    throw createError({ statusCode: 400, message: 'No valid appointment records found. Each row must have a date field.' })
  }

  // ── Duplicate day detection ──────────────────────────────────────────────
  // Extract unique dates from the incoming records
  const incomingDates = [...new Set(records.map((r: any) => r.appointment_date as string))].filter(Boolean).sort()
  const minDate = incomingDates[0]
  const maxDate = incomingDates[incomingDates.length - 1]

  // Query existing appointment_data rows for these dates (csv_upload source)
  const { data: existingRows } = await supabase
    .from('appointment_data')
    .select('appointment_date')
    .eq('source', 'csv_upload')
    .gte('appointment_date', minDate)
    .lte('appointment_date', maxDate)

  // Build a set of dates that already have data
  const existingDateSet = new Set<string>()
  if (existingRows) {
    for (const row of existingRows) {
      existingDateSet.add(row.appointment_date)
    }
  }

  // Find which incoming dates overlap with existing data
  const duplicateDates = incomingDates.filter(d => existingDateSet.has(d))
  const duplicateRecordCount = duplicateDates.length > 0
    ? records.filter((r: any) => existingDateSet.has(r.appointment_date)).length
    : 0

  // If duplicateAction === 'check', return duplicate info without inserting
  if (duplicateAction === 'check') {
    return {
      success: true,
      mode: 'check',
      totalRows: appointments.length,
      validRecords: records.length,
      duplicateDates,
      duplicateRecordCount,
      newDates: incomingDates.filter(d => !existingDateSet.has(d)),
      newRecordCount: records.length - duplicateRecordCount,
    }
  }

  // Determine which records to insert based on duplicateAction
  let recordsToInsert = records
  let skippedDuplicates = 0
  let replacedDates: string[] = []

  if (duplicateDates.length > 0) {
    if (duplicateAction === 'skip') {
      // Filter out records for dates that already exist
      recordsToInsert = records.filter((r: any) => !existingDateSet.has(r.appointment_date))
      skippedDuplicates = records.length - recordsToInsert.length
    } else if (duplicateAction === 'replace') {
      // Delete existing csv_upload rows for the overlapping dates, then insert all
      for (const date of duplicateDates) {
        await supabase
          .from('appointment_data')
          .delete()
          .eq('source', 'csv_upload')
          .eq('appointment_date', date)
      }
      replacedDates = [...duplicateDates]
    }
    // If duplicateAction is not set (legacy), all records are inserted (original behavior)
  }

  // Insert in chunks
  const CHUNK_SIZE = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
    const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('appointment_data')
      .insert(chunk)
    
    if (error) {
      console.error(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1} failed:`, error.message)
      errors += chunk.length
    } else {
      inserted += chunk.length
    }
  }

  // Count unique appointment types for mapping stats
  const uniqueTypes = new Set(recordsToInsert.map((r: any) => r.appointment_type))
  const mappedTypes = recordsToInsert.filter((r: any) => r.service_category).length
  const unmappedTypes = [...uniqueTypes].filter(t => !mapToServiceCategory(t))

  return {
    success: true,
    batchId,
    totalRows: appointments.length,
    inserted,
    skipped: (appointments.length - records.length) + skippedDuplicates,
    skippedDuplicates,
    replacedDates,
    duplicateDates,
    errors,
    mappingStats: {
      uniqueTypes: uniqueTypes.size,
      mappedCount: mappedTypes,
      unmappedTypes: unmappedTypes.slice(0, 20), // Return first 20 unmapped for user review
    }
  }
})
