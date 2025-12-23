/**
 * Import Contacts from Excel file
 * Parses the contacts Excel file and adds new clinics to referral_partners
 * Only adds clinics that don't already exist (no duplicates)
 * 
 * Run with: npx tsx scripts/import-contacts-to-referrals.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'
import { existsSync } from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Normalize clinic name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')        // Normalize whitespace
    .trim()
}

async function main() {
  const filePath = path.join(process.cwd(), 'public', 'Contacts-2025-12-22-17-38-04.xls')
  
  if (!existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  console.log('📂 Reading Excel file...\n')
  
  // Read the Excel file
  const fileBuffer = readFileSync(filePath)
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  // Get raw data - this file has headers in row 9, data starts row 10
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
  
  // Column indices based on header row 9:
  // 0 = Business Name
  // 10 = Contact Is Business
  // 12 = Contact Is Vet
  // 13 = Contact Physical Street Line 1
  // 16 = Contact Physical City
  // 17 = Contact Physical Post Code
  // 19 = Contact Physical State
  // 30 = Email Addresses
  // 34 = Phone Numbers
  // 37 = Contact Website Address
  // 39 = Contact Notes
  
  const COL = {
    BUSINESS_NAME: 0,
    IS_BUSINESS: 10,
    IS_VET: 12,
    STREET: 13,
    CITY: 16,
    ZIP: 17,
    STATE: 19,
    EMAIL: 30,
    PHONE: 34,
    WEBSITE: 37,
    NOTES: 39
  }
  
  // Filter for clinic-like entries (skip personal contacts)
  const clinicKeywords = ['vet', 'animal', 'hospital', 'clinic', 'pet', 'care', 'medical']
  const clinics: any[] = []
  
  for (let i = 10; i < rows.length; i++) {
    const row = rows[i]
    const businessName = String(row[COL.BUSINESS_NAME] || '').trim()
    const isBusiness = row[COL.IS_BUSINESS]
    const isVet = row[COL.IS_VET]
    
    // Skip empty or non-business entries
    if (!businessName) continue
    
    // Check if this looks like a veterinary clinic
    const nameLower = businessName.toLowerCase()
    const isClinic = clinicKeywords.some(kw => nameLower.includes(kw)) || 
                     isBusiness === 'YES' || isVet === 'YES'
    
    // Skip TEST entries
    if (nameLower.includes('test')) continue
    
    if (isClinic) {
      const street = String(row[COL.STREET] || '').trim()
      const city = String(row[COL.CITY] || '').trim()
      const zip = String(row[COL.ZIP] || '').trim()
      const state = String(row[COL.STATE] || '').trim()
      
      let address = street
      if (city || state || zip) {
        const parts = [street, city, state, zip].filter(p => p)
        address = parts.join(', ')
      }
      
      clinics.push({
        name: businessName,
        address: address || null,
        phone: String(row[COL.PHONE] || '').trim() || null,
        email: String(row[COL.EMAIL] || '').trim() || null,
        website: String(row[COL.WEBSITE] || '').trim() || null,
        notes: String(row[COL.NOTES] || '').trim() || null
      })
    }
  }
  
  console.log(`📊 Found ${clinics.length} clinic entries in Excel file\n`)

  // Fetch existing partners
  const { data: existingPartners, error: fetchError } = await supabase
    .from('referral_partners')
    .select('id, name, address, phone, email')

  if (fetchError) {
    console.error('Failed to fetch existing partners:', fetchError)
    process.exit(1)
  }

  console.log(`📋 Found ${existingPartners?.length || 0} existing partners in database\n`)

  // Create a map of normalized names for duplicate detection
  const existingNamesMap = new Map<string, any>()
  for (const partner of existingPartners || []) {
    existingNamesMap.set(normalizeName(partner.name), partner)
  }

  // Process each clinic from the parsed data
  const toInsert: any[] = []
  const duplicates: string[] = []

  for (const clinic of clinics) {
    const normalizedName = normalizeName(clinic.name)
    
    // Check for duplicates against existing database
    if (existingNamesMap.has(normalizedName)) {
      duplicates.push(clinic.name)
      continue
    }

    // Also check if we're about to insert a duplicate from this file
    if (toInsert.some(p => normalizeName(p.name) === normalizedName)) {
      duplicates.push(clinic.name + ' (duplicate in file)')
      continue
    }

    toInsert.push({
      name: clinic.name,
      hospital_name: clinic.name,  // Required field, same as name
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      website: clinic.website,
      notes: clinic.notes,
      status: 'pending',  // Valid values: 'active', 'inactive', 'pending'
      tier: 'bronze',
      priority: 'medium',
      clinic_type: 'general',
      partner_type: 'clinic'
    })

    // Add to our map to prevent duplicates within the file
    existingNamesMap.set(normalizedName, { name: clinic.name })
  }

  console.log('='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total clinics in file: ${clinics.length}`)
  console.log(`Duplicates (already exist): ${duplicates.length}`)
  console.log(`New clinics to add: ${toInsert.length}`)
  console.log('='.repeat(60))
  console.log('')

  if (duplicates.length > 0 && duplicates.length <= 20) {
    console.log('Duplicates found:')
    for (const d of duplicates) {
      console.log(`  - ${d}`)
    }
    console.log('')
  } else if (duplicates.length > 20) {
    console.log(`Duplicates found: ${duplicates.length} (showing first 20)`)
    for (const d of duplicates.slice(0, 20)) {
      console.log(`  - ${d}`)
    }
    console.log('  ...')
    console.log('')
  }

  if (toInsert.length === 0) {
    console.log('✅ No new clinics to add - all entries already exist!')
    return
  }

  console.log('New clinics to add:')
  for (const p of toInsert) {
    console.log(`  + ${p.name}`)
  }
  console.log('')

  // Insert new records
  console.log('💾 Inserting new records...\n')
  
  const { data: inserted, error: insertError } = await supabase
    .from('referral_partners')
    .insert(toInsert)
    .select()

  if (insertError) {
    console.error('❌ Failed to insert:', insertError)
    process.exit(1)
  }

  console.log(`✅ Successfully added ${toInsert.length} new clinics to referral_partners!`)
}

main().catch(console.error)
