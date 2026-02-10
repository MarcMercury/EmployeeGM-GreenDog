/**
 * Import appointment tracking CSVs into Supabase appointment_data table.
 * 
 * Usage: npx tsx scripts/import-appointment-data.ts
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

// Import the parser
import { parseWeeklyTrackingCSV, lookupAppointmentType } from '../server/utils/appointments/clinic-report-parser'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

async function supabaseInsert(table: string, rows: any[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert failed (${res.status}): ${text}`)
  }
  return rows.length
}

async function supabaseDelete(table: string, column: string, value: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    console.warn(`Delete warning: ${text}`)
  }
}

async function main() {
  const dataDir = join(process.cwd(), 'data', 'Appointments')
  
  console.log('📁 Reading CSV files from:', dataDir)
  const dirEntries = await fs.readdir(dataDir)
  const csvFiles = dirEntries.filter(f => f.endsWith('.csv') && f.includes('Appointment Tracking'))
  
  console.log(`📄 Found ${csvFiles.length} tracking files:`)
  csvFiles.forEach(f => console.log(`   - ${f}`))

  // Clear existing weekly_tracking data first
  console.log('\n🧹 Clearing existing weekly_tracking data...')
  await supabaseDelete('appointment_data', 'source', 'weekly_tracking')

  // Parse all files
  let totalRecords = 0
  let totalInserted = 0
  const batchId = crypto.randomUUID()
  const unmappedTypes = new Set<string>()

  for (const fileName of csvFiles) {
    const filePath = join(dataDir, fileName)
    const content = await fs.readFile(filePath, 'utf-8')
    
    try {
      const parsed = parseWeeklyTrackingCSV(content)
      console.log(`\n✅ ${fileName}`)
      console.log(`   Week: ${parsed.weekStart} to ${parsed.weekEnd}`)
      console.log(`   Raw records: ${parsed.appointments.length}`)

      // Convert to appointment_data rows
      const records: any[] = []
      for (const appt of parsed.appointments) {
        if (appt.is_availability) continue
        
        const typeInfo = lookupAppointmentType(appt.appointment_type)
        if (!typeInfo) unmappedTypes.add(appt.appointment_type)

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
          })
        }
      }

      // Insert in chunks of 500
      const CHUNK_SIZE = 500
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE)
        const count = await supabaseInsert('appointment_data', chunk)
        totalInserted += count
      }

      totalRecords += records.length
      console.log(`   Inserted: ${records.length} rows`)
    } catch (err: any) {
      console.error(`❌ ${fileName}: ${err.message}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`📊 Import Summary:`)
  console.log(`   Files processed: ${csvFiles.length}`)
  console.log(`   Total rows inserted: ${totalInserted}`)
  console.log(`   Batch ID: ${batchId}`)
  
  if (unmappedTypes.size > 0) {
    console.log(`\n⚠️  Unmapped types (${unmappedTypes.size}):`)
    for (const t of unmappedTypes) {
      console.log(`   - "${t}"`)
    }
  }

  // Verify
  const res = await fetch(`${SUPABASE_URL}/rest/v1/appointment_data?select=id&limit=0`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'count=exact',
    },
  })
  const range = res.headers.get('content-range')
  console.log(`\n✅ Verification - appointment_data count: ${range}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
