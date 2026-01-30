/**
 * Import/Update Referral CRM Data from GDD Master List
 * 
 * This script imports data from the "GDD Referral Master Lists - MASTER" CSV
 * Only updates existing fields, does not create new ones.
 * 
 * Fields to update:
 * - contact_name (from Contact Name column)
 * - phone (from Phone Number)
 * - email (from Email)
 * - address (from Address)
 * - notes (append Notes column)
 * - clinic_type (from GP OR SPE)
 * - specialty_areas (from SPE SERVICES)
 * - last_visit_date (from Dates of Visits or date in Notes)
 * - last_contact_date (from Last Interaction Date or date in Notes)
 * - zone (from GDD Zone)
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

interface MasterRecord {
  cleanedUp: string
  clinicName: string
  notes: string
  referringClients: string
  dvmOpenHouse: string
  inEz: string
  gddZone: string
  whoAttended: string
  numReferrals: string
  visits: string
  datesOfVisits: string
  cookies: string
  contactName: string
  primaryVeterinarian: string
  phoneNumber: string
  email: string
  address: string
  mapLink: string
  lastInteractionDate: string
  gpOrSpe: string
  services: string
  speServices: string
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  
  // Normalize line endings
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
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
      } else if (char === '\n') {
        currentRow.push(currentField.trim())
        if (currentRow.some(f => f)) { // Only add non-empty rows
          rows.push(currentRow)
        }
        currentRow = []
        currentField = ''
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

function parseMasterList(csvPath: string): MasterRecord[] {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(content)
  
  // Find header row (contains "Clinic Name")
  let headerRowIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => cell === 'Clinic Name')) {
      headerRowIndex = i
      break
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('Could not find header row')
    return []
  }
  
  console.log(`Found header at row ${headerRowIndex}`)
  
  const records: MasterRecord[] = []
  
  // Process data rows after header
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    
    // Skip empty rows or section headers
    const clinicName = row[1]?.trim()
    if (!clinicName || clinicName.includes('COLOER') || clinicName.includes('greendoglmarai')) {
      continue
    }
    
    const record: MasterRecord = {
      cleanedUp: row[0] || '',
      clinicName: clinicName,
      notes: row[2] || '',
      referringClients: row[3] || '',
      dvmOpenHouse: row[4] || '',
      inEz: row[5] || '',
      gddZone: row[6] || '',
      whoAttended: row[7] || '',
      numReferrals: row[8] || '',
      visits: row[9] || '',
      datesOfVisits: row[10] || '',
      cookies: row[11] || '',
      contactName: row[12] || '',
      primaryVeterinarian: row[13] || '',
      phoneNumber: row[14] || '',
      email: row[15] || '',
      address: row[16] || '',
      mapLink: row[17] || '',
      lastInteractionDate: row[18] || '',
      gpOrSpe: row[19] || '',
      services: row[20] || '',
      speServices: row[21] || ''
    }
    
    records.push(record)
  }
  
  console.log(`Parsed ${records.length} records from GDD Master List`)
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
  
  dateStr = dateStr.trim()
  
  // Handle ISO format like "2023-06-01"
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10)
  }
  
  // Handle formats like "5/19/2023", "11/7", "9/12", "6/1/23"
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (slashMatch) {
    const month = parseInt(slashMatch[1])
    const day = parseInt(slashMatch[2])
    let year = slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear()
    
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

function extractDateFromNotes(notes: string): string | null {
  if (!notes) return null
  
  // Look for patterns like "6/25/25_", "2/5/25_", "3/1/22_", "8/4/22"
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,  // 6/25/25, 3/1/22
  ]
  
  let latestDate: string | null = null
  
  for (const pattern of datePatterns) {
    const matches = notes.match(pattern)
    if (matches) {
      for (const match of matches) {
        const parsed = parseDate(match)
        if (parsed && (!latestDate || parsed > latestDate)) {
          latestDate = parsed
        }
      }
    }
  }
  
  return latestDate
}

function extractDatesOfVisits(datesStr: string): string | null {
  if (!datesStr) return null
  
  // Handle formats like "6/25/26 _ DrRoberston,Gladys ,Dre", "unkown, 3/18/25"
  let latestDate: string | null = null
  
  // Split by common delimiters and look for dates
  const parts = datesStr.split(/[,;_]/)
  
  for (const part of parts) {
    const parsed = parseDate(part.trim())
    if (parsed && (!latestDate || parsed > latestDate)) {
      latestDate = parsed
    }
  }
  
  return latestDate
}

async function main() {
  console.log('=== GDD Master List Data Import ===\n')
  
  // Load existing referral partners
  console.log('Loading existing referral partners...')
  
  const { data: existingPartners, error: loadError } = await supabase
    .from('referral_partners')
    .select('id, hospital_name, name, phone, email, address, notes, contact_name, last_contact_date, last_visit_date, specialty_areas, clinic_type, zone')
  
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
  
  // Parse GDD Master List
  const masterPath = path.join(process.cwd(), 'public', 'GDD Referral Master Lists - MASTER - ALL CLINICS ON ONE SHEET .csv')
  const masterRecords = parseMasterList(masterPath)
  
  // Match and update
  console.log('\nMatching and updating records...')
  
  let matches = 0
  let updates = 0
  const unmatched: string[] = []
  
  for (const master of masterRecords) {
    const normalizedName = normalizeClinicName(master.clinicName)
    const partner = partnerMap.get(normalizedName)
    
    if (partner) {
      matches++
      
      const updateData: Record<string, any> = {}
      
      // Update contact_name if missing
      if (!partner.contact_name && master.contactName) {
        updateData.contact_name = master.contactName
      }
      
      // Update phone if missing
      if (!partner.phone && master.phoneNumber) {
        // Clean phone number
        const cleanPhone = master.phoneNumber.split('\n')[0].trim()
        if (cleanPhone) {
          updateData.phone = cleanPhone
        }
      }
      
      // Update email if missing
      if (!partner.email && master.email) {
        const cleanEmail = master.email.trim()
        if (cleanEmail && cleanEmail.includes('@')) {
          updateData.email = cleanEmail
        }
      }
      
      // Update address if missing
      if (!partner.address && master.address) {
        updateData.address = master.address
      }
      
      // Skip zone updates - there's a database constraint on valid values
      // Zone values in CSV like "Venice", "Aetna, SO" don't match DB constraint
      
      // Update clinic_type if missing
      if (!partner.clinic_type && master.gpOrSpe) {
        const gpOrSpe = master.gpOrSpe.toUpperCase()
        if (gpOrSpe === 'GP') {
          updateData.clinic_type = 'General Practice'
        } else if (gpOrSpe === 'SPE' || gpOrSpe === 'SPECIALTY') {
          updateData.clinic_type = 'Specialty'
        }
      }
      
      // Update specialty_areas if missing
      if ((!partner.specialty_areas || partner.specialty_areas.length === 0) && master.speServices) {
        const services = master.speServices.split(',').map(s => s.trim()).filter(s => s)
        if (services.length > 0) {
          updateData.specialty_areas = services
        }
      }
      
      // Determine last_visit_date
      // Priority: Dates of Visits > date from Notes > existing
      let visitDate = extractDatesOfVisits(master.datesOfVisits)
      if (!visitDate) {
        visitDate = extractDateFromNotes(master.notes)
      }
      
      if (visitDate && (!partner.last_visit_date || visitDate > partner.last_visit_date)) {
        updateData.last_visit_date = visitDate
      }
      
      // Determine last_contact_date
      // Priority: Last Interaction Date > date from Notes > existing
      let contactDate = parseDate(master.lastInteractionDate)
      if (!contactDate) {
        contactDate = extractDateFromNotes(master.notes)
      }
      
      if (contactDate && (!partner.last_contact_date || contactDate > partner.last_contact_date)) {
        updateData.last_contact_date = contactDate
      }
      
      // Append notes if we have new ones
      if (master.notes && master.notes.trim()) {
        const existingNotes = partner.notes || ''
        // Check if the note is already included
        const notePreview = master.notes.substring(0, 50)
        if (!existingNotes.includes(notePreview)) {
          updateData.notes = existingNotes 
            ? `${existingNotes}\n\n[From GDD Master]:\n${master.notes}`
            : master.notes
        }
      }
      
      // Add primary veterinarian info to notes if not already there
      if (master.primaryVeterinarian && master.primaryVeterinarian.trim()) {
        const existingNotes = updateData.notes || partner.notes || ''
        const vetInfo = master.primaryVeterinarian.replace(/\n/g, ', ').trim()
        if (!existingNotes.includes(vetInfo.substring(0, 30))) {
          // Only add if it's not already in notes
          updateData.notes = existingNotes
            ? `${existingNotes}\n\n[Primary DVMs]: ${vetInfo}`
            : `[Primary DVMs]: ${vetInfo}`
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('referral_partners')
          .update(updateData)
          .eq('id', partner.id)
        
        if (updateError) {
          console.error(`Error updating ${master.clinicName}:`, updateError)
        } else {
          updates++
          const fieldsUpdated = Object.keys(updateData).join(', ')
          console.log(`  Updated: ${master.clinicName} [${fieldsUpdated}]`)
        }
      }
    } else {
      unmatched.push(master.clinicName)
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Total records in CSV: ${masterRecords.length}`)
  console.log(`Matched to CRM: ${matches}`)
  console.log(`Updated: ${updates}`)
  console.log(`Unmatched: ${unmatched.length}`)
  
  if (unmatched.length > 0) {
    console.log(`\nUnmatched clinics (first 30):`)
    unmatched.slice(0, 30).forEach(n => console.log(`  - ${n}`))
    if (unmatched.length > 30) {
      console.log(`  ... and ${unmatched.length - 30} more`)
    }
  }
  
  console.log('\n=== Import Complete ===')
}

main().catch(console.error)
