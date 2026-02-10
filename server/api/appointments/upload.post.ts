/**
 * Appointment Data Upload API
 * 
 * POST /api/appointments/upload
 * 
 * Accepts parsed CSV data and inserts into appointment_data table.
 * Auto-maps appointment types to service categories using existing service codes.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

// Common appointment type → service code mappings
const SERVICE_CODE_MAP: Record<string, string> = {
  // Surgery
  'surgery': 'SURG', 'sx': 'SURG', 'spay': 'SURG', 'neuter': 'SURG',
  'mass removal': 'SURG', 'orthopedic': 'SURG', 'tplo': 'SURG',
  'fho': 'SURG', 'gastropexy': 'SURG', 'exploratory': 'SURG',
  'laparoscopic': 'SURG', 'abdominal': 'SURG',
  // Dental
  'dental': 'AP_DENTAL', 'dental cleaning': 'AP_DENTAL', 'dental prophylaxis': 'AP_DENTAL',
  'extraction': 'AP_DENTAL', 'tooth extraction': 'AP_DENTAL', 'oral surgery': 'AP_DENTAL',
  'dental radiograph': 'AP_DENTAL',
  // Internal Medicine
  'internal medicine': 'IM', 'endoscopy': 'IM', 'ultrasound': 'IM',
  'consultation': 'IM', 'referral consult': 'IM',
  // Exotic
  'exotic': 'EXOTIC', 'avian': 'EXOTIC', 'reptile': 'EXOTIC', 'small mammal': 'EXOTIC',
  // Cardiology
  'cardiology': 'CARDIO', 'echocardiogram': 'CARDIO', 'echo': 'CARDIO',
  'cardiac': 'CARDIO', 'heart': 'CARDIO',
  // General clinic (NAD = No Apparent Disease / wellness)
  'wellness': 'CLINIC_NAD', 'wellness exam': 'CLINIC_NAD', 'annual exam': 'CLINIC_NAD',
  'vaccine': 'CLINIC_NAD', 'vaccination': 'CLINIC_NAD', 'physical exam': 'CLINIC_NAD',
  'check up': 'CLINIC_NAD', 'checkup': 'CLINIC_NAD', 'sick visit': 'CLINIC_NAD',
  'recheck': 'CLINIC_NAD', 're-check': 'CLINIC_NAD',
  // Emergency / urgent
  'emergency': 'CLINIC_NAD', 'urgent care': 'CLINIC_NAD', 'er': 'CLINIC_NAD',
  // Imaging
  'imaging': 'IMAGING', 'radiograph': 'IMAGING', 'x-ray': 'IMAGING',
  'xray': 'IMAGING', 'ct scan': 'IMAGING', 'mri': 'IMAGING',
}

function mapToServiceCategory(appointmentType: string): string | null {
  if (!appointmentType) return null
  const lower = appointmentType.toLowerCase().trim()
  
  // Direct match
  if (SERVICE_CODE_MAP[lower]) return SERVICE_CODE_MAP[lower]
  
  // Partial match
  for (const [key, code] of Object.entries(SERVICE_CODE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return code
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
  const { appointments, locationId, locationName } = body

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

  // Insert in chunks
  const CHUNK_SIZE = 500
  let inserted = 0
  let errors = 0

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from('appointment_data')
      .insert(chunk)
    
    if (error) {
      logger.error(`Chunk ${i / CHUNK_SIZE + 1} failed`, error, 'appointment-upload')
      errors += chunk.length
    } else {
      inserted += chunk.length
    }
  }

  // Count unique appointment types for mapping stats
  const uniqueTypes = new Set(records.map((r: any) => r.appointment_type))
  const mappedTypes = records.filter((r: any) => r.service_category).length
  const unmappedTypes = [...uniqueTypes].filter(t => !mapToServiceCategory(t))

  return {
    success: true,
    batchId,
    totalRows: appointments.length,
    inserted,
    skipped: appointments.length - records.length,
    errors,
    mappingStats: {
      uniqueTypes: uniqueTypes.size,
      mappedCount: mappedTypes,
      unmappedTypes: unmappedTypes.slice(0, 20), // Return first 20 unmapped for user review
    }
  }
})
