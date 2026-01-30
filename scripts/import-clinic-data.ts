/**
 * Import/Update Referral CRM Data from CSV Files
 * 
 * This script:
 * 1. Clears last_visit_date column (contains lingering referral data)
 * 2. Imports data from CLINIC MASTER LIST (contacts, notes, last contact date)
 * 3. Imports data from CLINIC VISITS (visit dates, notes, contacts)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ClinicMasterRecord {
  location: string
  group: string
  businessName: string
  contact: string
  phone: string
  address: string
  email: string
  lastContactDate: string
  lastContactPerson: string
  notes: string
  partnerStatus: boolean
}

interface ClinicVisitRecord {
  clinicName: string
  phone: string
  email: string
  address: string
  dvms: string
  gpOrSpecialty: string
  specialtyServices: string
  visits: {
    date: string
    time: string
    contactName: string
    contactTitle: string
    materialGiven: string
    swag: boolean
    notes: string
    referred: boolean
  }[]
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentField.trim())
        currentField = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim())
        if (currentRow.some(f => f)) { // Only add non-empty rows
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
        if (char === '\r') i++ // Skip \n
      } else {
        currentField += char
      }
    }
  }
  
  // Handle last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(f => f)) {
      rows.push(currentRow)
    }
  }
  
  return rows
}

function parseClinicMaster(csvPath: string): ClinicMasterRecord[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)
  
  // Skip header rows (first 2 rows are headers)
  const dataRows = rows.slice(2)
  const records: ClinicMasterRecord[] = []
  
  for (const row of dataRows) {
    if (!row[2] || row[2].trim() === '') continue // Skip rows without business name
    
    const record: ClinicMasterRecord = {
      location: row[0] || '',
      group: row[1] || '',
      businessName: row[2] || '',
      contact: row[3] || '',
      phone: row[4] || '',
      address: row[5] || '',
      email: row[6] || '',
      lastContactDate: row[8] || '',
      lastContactPerson: row[9] || '',
      notes: row[10] || '',
      partnerStatus: row[11]?.toLowerCase() === 'true'
    }
    
    if (record.businessName) {
      records.push(record)
    }
  }
  
  console.log(`Parsed ${records.length} records from CLINIC MASTER LIST`)
  return records
}

function parseClinicVisits(csvPath: string): ClinicVisitRecord[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)
  
  const records: ClinicVisitRecord[] = []
  
  // Find header row (contains "CLINIC NAME")
  let headerRowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => cell.includes('CLINIC NAME'))) {
      headerRowIndex = i
      break
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('Could not find header row in CLINIC VISITS')
    return records
  }
  
  // Process data rows after header
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    
    // Skip section headers and empty rows
    if (!row[1] || row[1].includes('TERRITORY') || row[1].includes('CLINICS') || row[1].includes('MOVE') || row[1] === 'Banner Ads') {
      continue
    }
    
    const clinicName = row[1]?.trim()
    if (!clinicName) continue
    
    const record: ClinicVisitRecord = {
      clinicName,
      phone: row[3] || '',
      email: row[4] || '',
      address: row[5] || '',
      dvms: row[8] || '',
      gpOrSpecialty: row[11] || '',
      specialtyServices: row[13] || '',
      visits: []
    }
    
    // Parse first visit (columns 15-27)
    if (row[15] || row[19]) {
      record.visits.push({
        date: row[15] || '',
        time: row[18] || '',
        contactName: row[19] || '',
        contactTitle: row[22] || '',
        materialGiven: row[23] || '',
        swag: row[26]?.toLowerCase() === 'y' || row[26]?.toLowerCase() === 'yes',
        notes: row[27] || '',
        referred: row[28]?.toLowerCase() === 'y' || row[28]?.toLowerCase() === 'yes'
      })
    }
    
    // Parse second visit (columns 32-44)
    if (row[32] || row[36]) {
      record.visits.push({
        date: row[32] || '',
        time: row[35] || '',
        contactName: row[36] || '',
        contactTitle: row[39] || '',
        materialGiven: row[40] || '',
        swag: row[43]?.toLowerCase() === 'y' || row[43]?.toLowerCase() === 'yes',
        notes: row[44] || '',
        referred: row[45]?.toLowerCase() === 'y' || row[45]?.toLowerCase() === 'yes'
      })
    }
    
    // Parse third visit (columns 49-61)
    if (row[49] || row[53]) {
      record.visits.push({
        date: row[49] || '',
        time: row[52] || '',
        contactName: row[53] || '',
        contactTitle: row[56] || '',
        materialGiven: row[57] || '',
        swag: row[60]?.toLowerCase() === 'y' || row[60]?.toLowerCase() === 'yes',
        notes: row[61] || '',
        referred: row[62]?.toLowerCase() === 'y' || row[62]?.toLowerCase() === 'yes'
      })
    }
    
    if (record.clinicName && !record.clinicName.includes('Banner Ads')) {
      records.push(record)
    }
  }
  
  console.log(`Parsed ${records.length} records from CLINIC VISITS`)
  return records
}

function normalizeClinicName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/vca/g, '')
    .replace(/veterinary|vet|animal|hospital|clinic|center|centre|pet/g, '')
    .trim()
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  // Clean up the date string
  dateStr = dateStr.trim()
  
  // Handle formats like "5/19/2023", "11/7", "9/12"
  const parts = dateStr.split('/')
  if (parts.length >= 2) {
    const month = parseInt(parts[0])
    const day = parseInt(parts[1])
    let year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear()
    
    // Handle 2-digit years
    if (year < 100) {
      year += 2000
    }
    
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    }
  }
  
  return null
}

async function main() {
  console.log('=== Referral CRM Data Import ===\n')
  
  // Step 1: Clear last_visit_date column (contains lingering referral data)
  console.log('Step 1: Clearing last_visit_date column (contains old referral data)...')
  
  const { data: partnersWithVisitDate, error: fetchError } = await supabase
    .from('referral_partners')
    .select('id, hospital_name, last_visit_date')
    .not('last_visit_date', 'is', null)
  
  if (fetchError) {
    console.error('Error fetching partners:', fetchError)
    return
  }
  
  console.log(`Found ${partnersWithVisitDate?.length || 0} partners with last_visit_date set`)
  
  if (partnersWithVisitDate && partnersWithVisitDate.length > 0) {
    const { error: clearError } = await supabase
      .from('referral_partners')
      .update({ last_visit_date: null })
      .not('last_visit_date', 'is', null)
    
    if (clearError) {
      console.error('Error clearing last_visit_date:', clearError)
    } else {
      console.log(`Cleared last_visit_date for ${partnersWithVisitDate.length} partners`)
    }
  }
  
  // Step 2: Load existing referral partners
  console.log('\nStep 2: Loading existing referral partners...')
  
  const { data: existingPartners, error: loadError } = await supabase
    .from('referral_partners')
    .select('id, hospital_name, name, phone, email, address, notes, contact_name, last_contact_date, last_visit_date, specialty_areas, clinic_type')
  
  if (loadError) {
    console.error('Error loading partners:', loadError)
    return
  }
  
  console.log(`Loaded ${existingPartners?.length || 0} existing partners`)
  
  // Create lookup map by normalized name
  const partnerMap = new Map<string, typeof existingPartners[0]>()
  for (const partner of existingPartners || []) {
    const normalizedName = normalizeClinicName(partner.hospital_name)
    partnerMap.set(normalizedName, partner)
    
    // Also index by name field
    if (partner.name) {
      partnerMap.set(normalizeClinicName(partner.name), partner)
    }
  }
  
  // Step 3: Parse CSV files
  console.log('\nStep 3: Parsing CSV files...')
  
  const masterPath = path.join(process.cwd(), 'public', 'Referral Clinics Tracker - CLINIC MASTER LIST.csv')
  const visitsPath = path.join(process.cwd(), 'public', 'Referral Clinics Tracker - CLINIC VISITS .csv')
  
  const masterRecords = parseClinicMaster(masterPath)
  const visitRecords = parseClinicVisits(visitsPath)
  
  // Step 4: Match and update from CLINIC MASTER
  console.log('\nStep 4: Matching and updating from CLINIC MASTER...')
  
  let masterMatches = 0
  let masterUpdates = 0
  
  for (const master of masterRecords) {
    const normalizedName = normalizeClinicName(master.businessName)
    const partner = partnerMap.get(normalizedName)
    
    if (partner) {
      masterMatches++
      
      // Build update object
      const updates: Record<string, any> = {}
      
      // Update contact info if missing
      if (!partner.contact_name && master.contact) {
        updates.contact_name = master.contact
      }
      
      if (!partner.phone && master.phone) {
        updates.phone = master.phone
      }
      
      if (!partner.email && master.email) {
        updates.email = master.email
      }
      
      if (!partner.address && master.address) {
        updates.address = master.address
      }
      
      // Update last_contact_date if we have a newer or missing one
      const parsedDate = parseDate(master.lastContactDate)
      if (parsedDate && (!partner.last_contact_date || parsedDate > partner.last_contact_date)) {
        updates.last_contact_date = parsedDate
      }
      
      // Append notes if we have new ones
      if (master.notes && master.notes.trim()) {
        const existingNotes = partner.notes || ''
        if (!existingNotes.includes(master.notes.substring(0, 50))) {
          updates.notes = existingNotes 
            ? `${existingNotes}\n\n[From Master List]:\n${master.notes}`
            : master.notes
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('referral_partners')
          .update(updates)
          .eq('id', partner.id)
        
        if (updateError) {
          console.error(`Error updating ${master.businessName}:`, updateError)
        } else {
          masterUpdates++
          console.log(`  Updated: ${master.businessName}`)
        }
      }
    }
  }
  
  console.log(`CLINIC MASTER: ${masterMatches} matches, ${masterUpdates} updates`)
  
  // Step 5: Match and update from CLINIC VISITS
  console.log('\nStep 5: Matching and updating from CLINIC VISITS...')
  
  let visitMatches = 0
  let visitUpdates = 0
  
  for (const visit of visitRecords) {
    const normalizedName = normalizeClinicName(visit.clinicName)
    const partner = partnerMap.get(normalizedName)
    
    if (partner) {
      visitMatches++
      
      const updates: Record<string, any> = {}
      
      // Update contact info if missing
      if (!partner.phone && visit.phone) {
        updates.phone = visit.phone
      }
      
      if (!partner.email && visit.email) {
        updates.email = visit.email
      }
      
      if (!partner.address && visit.address) {
        updates.address = visit.address
      }
      
      // Update specialty areas from services offered
      if (visit.specialtyServices && !partner.specialty_areas?.length) {
        const services = visit.specialtyServices.split(',').map(s => s.trim()).filter(s => s)
        if (services.length > 0) {
          updates.specialty_areas = services
        }
      }
      
      // Update clinic_type
      if (!partner.clinic_type && visit.gpOrSpecialty) {
        updates.clinic_type = visit.gpOrSpecialty.toUpperCase() === 'GP' ? 'General Practice' : 'Specialty'
      }
      
      // Find the most recent visit date
      let latestVisitDate: string | null = null
      const visitNotes: string[] = []
      
      for (const v of visit.visits) {
        const parsedDate = parseDate(v.date)
        if (parsedDate) {
          if (!latestVisitDate || parsedDate > latestVisitDate) {
            latestVisitDate = parsedDate
          }
        }
        
        // Collect visit notes
        if (v.contactName || v.notes) {
          const noteLines: string[] = []
          if (v.date) noteLines.push(`Date: ${v.date}`)
          if (v.contactName) noteLines.push(`Contact: ${v.contactName}${v.contactTitle ? ` (${v.contactTitle})` : ''}`)
          if (v.materialGiven) noteLines.push(`Materials: ${v.materialGiven}`)
          if (v.notes) noteLines.push(`Notes: ${v.notes}`)
          if (v.referred) noteLines.push('Referred: Yes')
          
          if (noteLines.length > 0) {
            visitNotes.push(noteLines.join('\n'))
          }
        }
      }
      
      // Update last_visit_date with the most recent actual visit
      if (latestVisitDate && (!partner.last_visit_date || latestVisitDate > partner.last_visit_date)) {
        updates.last_visit_date = latestVisitDate
      }
      
      // Append visit notes
      if (visitNotes.length > 0) {
        const existingNotes = partner.notes || ''
        const newNotes = visitNotes.join('\n---\n')
        if (!existingNotes.includes(newNotes.substring(0, 50))) {
          updates.notes = existingNotes 
            ? `${existingNotes}\n\n[Visit History]:\n${newNotes}`
            : `[Visit History]:\n${newNotes}`
        }
      }
      
      // Update DVMs list as notes if we have them
      if (visit.dvms && visit.dvms.trim()) {
        const existingNotes = updates.notes || partner.notes || ''
        if (!existingNotes.includes(visit.dvms.substring(0, 30))) {
          updates.notes = existingNotes
            ? `${existingNotes}\n\n[DVMs at Practice]:\n${visit.dvms}`
            : `[DVMs at Practice]:\n${visit.dvms}`
        }
      }
      
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('referral_partners')
          .update(updates)
          .eq('id', partner.id)
        
        if (updateError) {
          console.error(`Error updating ${visit.clinicName}:`, updateError)
        } else {
          visitUpdates++
          console.log(`  Updated: ${visit.clinicName}`)
        }
      }
    }
  }
  
  console.log(`CLINIC VISITS: ${visitMatches} matches, ${visitUpdates} updates`)
  
  // Step 6: Log unmatched records for manual review
  console.log('\n=== Unmatched Records (may need manual import) ===')
  
  const unmatchedMaster: string[] = []
  for (const master of masterRecords) {
    const normalizedName = normalizeClinicName(master.businessName)
    if (!partnerMap.has(normalizedName)) {
      unmatchedMaster.push(master.businessName)
    }
  }
  
  const unmatchedVisits: string[] = []
  for (const visit of visitRecords) {
    const normalizedName = normalizeClinicName(visit.clinicName)
    if (!partnerMap.has(normalizedName)) {
      unmatchedVisits.push(visit.clinicName)
    }
  }
  
  if (unmatchedMaster.length > 0) {
    console.log(`\nUnmatched from CLINIC MASTER (${unmatchedMaster.length}):`)
    unmatchedMaster.slice(0, 20).forEach(n => console.log(`  - ${n}`))
    if (unmatchedMaster.length > 20) console.log(`  ... and ${unmatchedMaster.length - 20} more`)
  }
  
  if (unmatchedVisits.length > 0) {
    console.log(`\nUnmatched from CLINIC VISITS (${unmatchedVisits.length}):`)
    unmatchedVisits.slice(0, 20).forEach(n => console.log(`  - ${n}`))
    if (unmatchedVisits.length > 20) console.log(`  ... and ${unmatchedVisits.length - 20} more`)
  }
  
  console.log('\n=== Import Complete ===')
}

main().catch(console.error)
