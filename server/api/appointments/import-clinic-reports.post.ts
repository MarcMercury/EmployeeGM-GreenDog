/**
 * Import Clinic Reports API
 * 
 * POST /api/appointments/import-clinic-reports
 * 
 * Reads the weekly appointment tracking CSV files from data/Appointments/
 * and imports them into the appointment_data table.
 * Also reads any new files uploaded as part of the request.
 * 
 * Supports:
 * 1. Weekly tracking CSVs (matrix format with SO/VN/VE columns)
 * 2. Creates one appointment_data row per type per day per location (with count)
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  parseWeeklyTrackingCSV,
  lookupAppointmentType,
  type FlattenedAppointment,
} from '~/server/utils/appointments/clinic-report-parser'

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

  const body = await readBody(event) || {}
  const { csvTexts, replaceExisting = false } = body

  // Phase 1: Read files from data/Appointments/ directory
  const dataDir = join(process.cwd(), 'data', 'Appointments')
  const files: { name: string; content: string }[] = []

  try {
    const dirEntries = await fs.readdir(dataDir)
    const csvFiles = dirEntries.filter(f => f.endsWith('.csv') && f.includes('Appointment Tracking'))

    for (const fileName of csvFiles) {
      const filePath = join(dataDir, fileName)
      const content = await fs.readFile(filePath, 'utf-8')
      files.push({ name: fileName, content })
    }
  } catch (err: any) {
    console.warn('Could not read data/Appointments/ directory:', err.message)
  }

  // Phase 2: Also accept CSV texts passed directly (from frontend)
  if (csvTexts && Array.isArray(csvTexts)) {
    for (const item of csvTexts) {
      if (item.name && item.content) {
        files.push({ name: item.name, content: item.content })
      }
    }
  }

  if (files.length === 0) {
    throw createError({ statusCode: 400, message: 'No weekly tracking files found in public/Appointments/ and no files provided.' })
  }

  // Phase 3: Parse all files
  const allAppointments: FlattenedAppointment[] = []
  const parseResults: Array<{ file: string; weekStart: string; weekEnd: string; records: number; error?: string }> = []

  for (const file of files) {
    try {
      const parsed = parseWeeklyTrackingCSV(file.content)
      allAppointments.push(...parsed.appointments)
      parseResults.push({
        file: file.name,
        weekStart: parsed.weekStart,
        weekEnd: parsed.weekEnd,
        records: parsed.appointments.length,
      })
    } catch (err: any) {
      parseResults.push({
        file: file.name,
        weekStart: '',
        weekEnd: '',
        records: 0,
        error: err.message,
      })
    }
  }

  if (allAppointments.length === 0) {
    return {
      success: false,
      message: 'No appointment records could be parsed from the files.',
      parseResults,
    }
  }

  // Phase 4: Optionally clear existing weekly_tracking data
  if (replaceExisting) {
    const weekStarts = [...new Set(allAppointments.map(a => a.week_start))].filter(Boolean)
    for (const ws of weekStarts) {
      await supabase
        .from('appointment_data')
        .delete()
        .eq('source', 'weekly_tracking')
        .eq('appointment_date', ws) // Delete by matching batch dates
        .gte('appointment_date', ws)
    }
    // Broader cleanup: delete all weekly_tracking sourced data to avoid dupes
    await supabase
      .from('appointment_data')
      .delete()
      .eq('source', 'weekly_tracking')
  }

  // Phase 5: Insert into appointment_data table
  const batchId = crypto.randomUUID()
  const CHUNK_SIZE = 500
  let inserted = 0
  let errors = 0
  const unmappedTypes = new Set<string>()

  // Convert flattened appointments to appointment_data rows
  // For count > 1, we create individual rows (each "count" represents one appointment)  
  const records: any[] = []
  for (const appt of allAppointments) {
    if (appt.is_availability) continue // Skip availability slots, not actual appointments

    const typeInfo = lookupAppointmentType(appt.appointment_type)
    if (!typeInfo) unmappedTypes.add(appt.appointment_type)

    // Create `count` individual rows for this type/date/location
    const rowCount = Math.max(1, appt.count)
    for (let i = 0; i < rowCount; i++) {
      records.push({
        appointment_date: appt.appointment_date,
        appointment_type: appt.appointment_type,
        service_category: typeInfo?.serviceCode || appt.service_category || null,
        location_name: appt.location_name,
        status: 'scheduled',
        duration_minutes: typeInfo?.defaultDuration || null,
        source: 'weekly_tracking',
        batch_id: batchId,
        raw_data: {
          department: appt.department,
          location_code: appt.location_code,
          week_start: appt.week_start,
          original_count: appt.count,
          requires_dvm: typeInfo?.requiresDVM ?? null,
        },
        uploaded_by: profile.id,
      })
    }
  }

  // Insert in chunks
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)
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

  // Phase 6: Update appointment_service_mapping with any new types
  const typeSummary: Record<string, { serviceCode: string; department: string; count: number }> = {}
  for (const appt of allAppointments) {
    if (appt.is_availability) continue
    const typeInfo = lookupAppointmentType(appt.appointment_type)
    const key = appt.appointment_type
    if (!typeSummary[key]) {
      typeSummary[key] = {
        serviceCode: typeInfo?.serviceCode || 'UNMAPPED',
        department: typeInfo?.department || 'Unknown',
        count: 0,
      }
    }
    typeSummary[key].count += appt.count
  }

  // Upsert service mappings (if table exists)
  try {
    for (const [typeName, info] of Object.entries(typeSummary)) {
      if (info.serviceCode === 'UNMAPPED') continue
      await supabase
        .from('appointment_service_mapping')
        .upsert({
          appointment_type: typeName,
          service_code: info.serviceCode,
          confidence_score: 1.0,
          source: 'clinic_report_import',
        }, { onConflict: 'appointment_type' })
    }
  } catch {
    // Table may not exist yet (migration 202 not applied)
  }

  return {
    success: true,
    batchId,
    filesProcessed: parseResults.filter(r => !r.error).length,
    totalFiles: files.length,
    totalRecords: records.length,
    inserted,
    errors,
    unmappedTypes: [...unmappedTypes],
    typeSummary,
    parseResults,
  }
})
