/**
 * Update Employees from CSV
 * 
 * This script safely updates employee data from the CSV without:
 * - Deleting existing records
 * - Removing existing field data
 * - Duplicating employees
 * 
 * It will:
 * - Match employees by email (email_work in employees, email in profiles)
 * - Update employee fields with new data
 * - Create new employees if they don't exist
 * - Map job titles to job_positions
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Simple CSV parser (no external deps)
 */
function parseCSV(content) {
  const lines = content.split('\n')
  if (lines.length === 0) return []
  
  // Parse header
  const headers = parseCSVLine(lines[0])
  
  // Parse rows
  const records = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const values = parseCSVLine(line)
    const record = {}
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || ''
    }
    records.push(record)
  }
  
  return records
}

function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())
  
  return values
}

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL || 'https://uekumyupkhnpjpdcjfxb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// CSV file path
const csvPath = path.join(__dirname, '..', 'public', 'User and Emp Upload.csv')

// Stats tracking
const stats = {
  processed: 0,
  updated: 0,
  created: 0,
  skipped: 0,
  errors: []
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return null
  
  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    let fullYear = year
    if (year.length === 2) {
      // Assume 20xx for 2-digit years
      fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`
    }
    const date = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }
  
  return null
}

/**
 * Parse phone number - clean up formatting
 */
function parsePhone(phoneStr) {
  if (!phoneStr || phoneStr === 'N/A') return null
  
  // Remove common prefixes and clean
  const cleaned = phoneStr
    .replace(/^c:\s*/i, '')
    .replace(/^o:\s*/i, '')
    .replace(/[^\d]/g, '')
  
  if (cleaned.length >= 10) {
    return cleaned
  }
  return null
}

/**
 * Parse salary/wage - extract numeric value
 */
function parseMoney(moneyStr) {
  if (!moneyStr || moneyStr === 'N/A' || moneyStr === 'NEW' || moneyStr === 'Invoice') return null
  
  // Remove $ and commas, get just the number
  const cleaned = moneyStr.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse employment type from CSV
 * Valid values: 'full-time', 'part-time', 'contract', 'per-diem', 'intern'
 */
function parseEmploymentType(type) {
  if (!type) return null
  const lower = type.toLowerCase().trim()
  // Map CSV values to database valid values
  if (lower === 'non-exempt' || lower === 'exempt') return null // These are FLSA types, not employment types
  if (lower === '1099') return 'contract'
  if (lower === 'contractor') return 'contract'
  return null // Don't update if we can't map properly
}

/**
 * Parse employment status from CSV
 * Valid values: 'active', 'inactive', 'on-leave', 'terminated'
 */
function parseEmploymentStatus(status) {
  if (!status) return null
  const lower = status.toLowerCase().trim()
  if (lower === 'full-time' || lower === 'part-time') return 'active'
  if (lower === 'contractor' || lower === 'relief') return 'active'
  if (lower === 'active') return 'active'
  if (lower === 'inactive') return 'inactive'
  if (lower === 'terminated') return 'terminated'
  if (lower === 'on-leave' || lower === 'on leave') return 'on-leave'
  return null // Don't update if we can't map
}

/**
 * Normalize email
 */
function normalizeEmail(email) {
  if (!email) return null
  return email.toLowerCase().trim()
}

/**
 * Map ADP Job Title to job_positions id
 */
async function getJobPositionId(title, jobPositions) {
  if (!title || title === 'N/A') return null
  
  const normalizedTitle = title.toLowerCase().trim()
  
  // Try exact match first
  let match = jobPositions.find(jp => 
    jp.title.toLowerCase() === normalizedTitle
  )
  
  if (match) return match.id
  
  // Try partial match
  match = jobPositions.find(jp => 
    jp.title.toLowerCase().includes(normalizedTitle) ||
    normalizedTitle.includes(jp.title.toLowerCase())
  )
  
  if (match) return match.id
  
  // Map common variations
  const titleMappings = {
    'vet assistant': 'Veterinary Assistant',
    'veterinary assistant': 'Veterinary Assistant',
    'csr': 'Client Service Representative',
    'rcsr': 'Remote Client Service Representative',
    'remote csr': 'Remote Client Service Representative',
    'remote administrator': 'Remote Administrator',
    'rvt': 'Registered Veterinary Technician',
    'dvm': 'Doctor of Veterinary Medicine',
    'veterinarian': 'Doctor of Veterinary Medicine',
    'facilities': 'Facilities',
    'coo': 'Chief Operations Officer',
    'cmo': 'Chief Medical Officer',
    'cco': 'Chief Communications Officer',
    'practice director': 'Practice Director',
    'marketing director': 'Marketing Director',
    'cardiologist': 'Cardiologist',
    'veterinary intern': 'Veterinary Intern',
    'referral coordinator': 'Referral Coordinator',
    'assistant practice manager': 'Assistant Practice Manager',
    'clinical director': 'Clinical Director',
    'csr lead': 'CSR Lead',
    'in house administrator': 'In-House Administrator',
    'remote csr manager': 'Remote CSR Manager',
    'my pet admin': 'My Pet Admin',
    'chief legal counsel': 'Chief Legal Counsel',
    'director of veterinary education': 'Director of Veterinary Education',
    'chief of staff': 'Chief of Staff',
    'clinic supervisor': 'Clinic Supervisor',
    'videologist': 'Videologist',
    'mpmv csr / vet assistant': 'MPMV CSR / Vet Assistant',
    'pre- intern/vet assistant': 'Veterinary Intern'
  }
  
  const mappedTitle = titleMappings[normalizedTitle]
  if (mappedTitle) {
    match = jobPositions.find(jp => 
      jp.title.toLowerCase() === mappedTitle.toLowerCase()
    )
    if (match) return match.id
  }
  
  return null
}

/**
 * Main update function
 */
async function updateEmployees() {
  console.log('📊 Starting employee update from CSV...\n')
  
  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(csvContent)
  
  console.log(`📄 Found ${records.length} rows in CSV\n`)
  
  // Fetch existing data
  console.log('🔍 Fetching existing employees and profiles...')
  
  const { data: existingEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, email_work, email_personal, first_name, last_name, profile_id, position_id')
  
  if (empError) {
    console.error('Error fetching employees:', empError)
    return
  }
  
  const { data: existingProfiles, error: profError } = await supabase
    .from('profiles')
    .select('id, email, auth_user_id')
  
  if (profError) {
    console.error('Error fetching profiles:', profError)
    return
  }
  
  const { data: jobPositions, error: jpError } = await supabase
    .from('job_positions')
    .select('id, title')
  
  if (jpError) {
    console.error('Error fetching job positions:', jpError)
    return
  }
  
  console.log(`  ✓ ${existingEmployees.length} employees`)
  console.log(`  ✓ ${existingProfiles.length} profiles`)
  console.log(`  ✓ ${jobPositions.length} job positions\n`)
  
  // Create lookup maps
  const employeeByEmail = new Map()
  for (const emp of existingEmployees) {
    if (emp.email_work) employeeByEmail.set(emp.email_work.toLowerCase(), emp)
    if (emp.email_personal) employeeByEmail.set(emp.email_personal.toLowerCase(), emp)
  }
  
  const profileByEmail = new Map()
  for (const prof of existingProfiles) {
    if (prof.email) profileByEmail.set(prof.email.toLowerCase(), prof)
  }
  
  // Process each row
  for (const row of records) {
    const email = normalizeEmail(row['Email'])
    const firstName = row['First Name']?.trim()
    const lastName = row['Last Name']?.trim()
    
    // Skip empty rows
    if (!email || !firstName) {
      stats.skipped++
      continue
    }
    
    stats.processed++
    
    console.log(`\n👤 Processing: ${firstName} ${lastName} (${email})`)
    
    try {
      // Check if employee exists
      const existingEmployee = employeeByEmail.get(email)
      const existingProfile = profileByEmail.get(email)
      
      // Get position_id
      const positionId = await getJobPositionId(row['ADP Job Title'], jobPositions)
      
      // Build employee update data (only non-null values)
      const employeeData = {
        first_name: firstName,
        last_name: lastName,
        email_work: email,
        updated_at: new Date().toISOString()
      }
      
      // Add optional fields if they exist in CSV
      const phone = parsePhone(row['phone'])
      if (phone) employeeData.phone_mobile = phone
      
      const dob = parseDate(row['DOB'])
      if (dob) employeeData.date_of_birth = dob
      
      const zip = row['ZIP CODE']?.trim()
      if (zip && zip !== 'N/A' && zip !== '') {
        employeeData.address_zip = zip.replace(/^\./, '').replace(/\.$/, '')
      }
      
      const hireDate = parseDate(row['Hire Date'])
      if (hireDate) employeeData.hire_date = hireDate
      
      const empType = parseEmploymentType(row['Type'])
      if (empType) employeeData.employment_type = empType
      
      const empStatus = parseEmploymentStatus(row['Status'])
      if (empStatus) employeeData.employment_status = empStatus
      
      if (positionId) employeeData.position_id = positionId
      
      // Internal notes - append CSV job title for reference
      const offerTitle = row['Offer Letter/ Comp Adjustment Title']?.trim()
      if (offerTitle && offerTitle !== 'N/A') {
        // Don't overwrite notes, but we track the title in position_id mapping
      }
      
      if (existingEmployee) {
        // UPDATE existing employee
        console.log(`  📝 Updating existing employee (ID: ${existingEmployee.id})`)
        
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', existingEmployee.id)
        
        if (updateError) {
          console.error(`  ❌ Update error: ${updateError.message}`)
          stats.errors.push({ email, error: updateError.message })
        } else {
          console.log(`  ✅ Employee updated`)
          stats.updated++
        }
        
        // Update profile if exists
        if (existingProfile) {
          const profileUpdate = {
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          }
          if (phone) profileUpdate.phone = phone
          
          const { error: profUpdateError } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', existingProfile.id)
          
          if (profUpdateError) {
            console.log(`  ⚠️ Profile update skipped: ${profUpdateError.message}`)
          } else {
            console.log(`  ✅ Profile updated`)
          }
        }
        
      } else {
        // CREATE new employee
        console.log(`  🆕 Creating new employee...`)
        
        // First, check/create profile
        let profileId = existingProfile?.id
        
        if (!profileId) {
          // Create new profile
          const { data: newProfile, error: newProfError } = await supabase
            .from('profiles')
            .insert({
              email: email,
              first_name: firstName,
              last_name: lastName,
              phone: phone,
              role: 'user',
              is_active: true
            })
            .select('id')
            .single()
          
          if (newProfError) {
            console.error(`  ❌ Profile creation error: ${newProfError.message}`)
            stats.errors.push({ email, error: `Profile: ${newProfError.message}` })
            continue
          }
          
          profileId = newProfile.id
          console.log(`  ✅ Profile created (ID: ${profileId})`)
        }
        
        // Create employee
        employeeData.profile_id = profileId
        
        const { data: newEmployee, error: newEmpError } = await supabase
          .from('employees')
          .insert(employeeData)
          .select('id')
          .single()
        
        if (newEmpError) {
          console.error(`  ❌ Employee creation error: ${newEmpError.message}`)
          stats.errors.push({ email, error: `Employee: ${newEmpError.message}` })
        } else {
          console.log(`  ✅ Employee created (ID: ${newEmployee.id})`)
          stats.created++
        }
      }
      
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`)
      stats.errors.push({ email, error: err.message })
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY')
  console.log('='.repeat(50))
  console.log(`Processed: ${stats.processed}`)
  console.log(`Updated:   ${stats.updated}`)
  console.log(`Created:   ${stats.created}`)
  console.log(`Skipped:   ${stats.skipped}`)
  console.log(`Errors:    ${stats.errors.length}`)
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:')
    for (const err of stats.errors) {
      console.log(`  - ${err.email}: ${err.error}`)
    }
  }
  
  console.log('\n✨ Done!')
}

// Run
updateEmployees().catch(console.error)
