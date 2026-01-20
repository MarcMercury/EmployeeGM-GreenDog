/**
 * Sync Employee Data from CSV
 * 
 * This script synchronizes employee data from the master CSV file to the database.
 * It updates:
 * - Employee table (personal info, hire date, status, etc.)
 * - Profile table (email, phone, name sync)
 * - Compensation table (pay rate, pay type, benefits, CE budget)
 * - Time Off Balances (PTO allotment and usage)
 * 
 * Matching is done by email (email_work in employees, email in profiles)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Robust CSV parser that handles multi-line cells
 */
function parseCSV(content) {
  const records = []
  let headers = []
  let current = ''
  let inQuotes = false
  let currentRow = []
  let isFirstRow = true
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      currentRow.push(current.trim())
      current = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row (skip \r in CRLF)
      if (char === '\r' && content[i + 1] === '\n') {
        i++ // Skip the \n
      }
      
      // Only process if we have content
      if (currentRow.length > 0 || current.trim()) {
        currentRow.push(current.trim())
        
        if (isFirstRow) {
          headers = currentRow
          isFirstRow = false
        } else {
          // Create record object
          const record = {}
          for (let j = 0; j < headers.length; j++) {
            record[headers[j]] = currentRow[j] || ''
          }
          records.push(record)
        }
        
        currentRow = []
        current = ''
      }
    } else {
      current += char
    }
  }
  
  // Handle last row if no trailing newline
  if (currentRow.length > 0 || current.trim()) {
    currentRow.push(current.trim())
    const record = {}
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = currentRow[j] || ''
    }
    records.push(record)
  }
  
  return records
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
  employeesUpdated: 0,
  employeesCreated: 0,
  compensationUpdated: 0,
  compensationCreated: 0,
  ptoUpdated: 0,
  ptoCreated: 0,
  skipped: 0,
  errors: []
}

// Current year for PTO
const CURRENT_YEAR = new Date().getFullYear()

/**
 * Parse date from various formats (MM/DD/YYYY, MM/DD/YY)
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === '' || dateStr === 'NEW') return null
  
  // Handle MM/DD/YYYY or MM/DD/YY format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    let fullYear = year.trim()
    if (fullYear.length === 2) {
      // For years: 00-30 = 2000s, 31-99 = 1900s
      const y = parseInt(fullYear)
      fullYear = y > 30 ? `19${fullYear}` : `20${fullYear}`
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
    .replace(/[\s\-\(\)\.]/g, '')
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
  if (!moneyStr || moneyStr === 'N/A' || moneyStr === 'NEW' || moneyStr === 'Invoice' || moneyStr.includes('echo')) return null
  
  // Remove $ and commas, get just the number
  const cleaned = moneyStr.replace(/[$,]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Parse PTO hours from string (e.g., "8", "14", "N/A")
 * CSV has PTO in days, but DB stores hours (8 hours per day)
 */
function parsePTODays(ptoStr) {
  if (!ptoStr || ptoStr === 'N/A' || ptoStr === '') return null
  
  const num = parseFloat(ptoStr.trim())
  if (isNaN(num)) return null
  
  return num // Return days as-is, we'll convert to hours when saving
}

/**
 * Parse employment status from Status column
 * Valid values: 'active', 'inactive', 'on-leave', 'terminated'
 */
function parseEmploymentStatus(status) {
  if (!status) return 'active'
  const lower = status.toLowerCase().trim()
  if (lower === 'full-time' || lower === 'part-time') return 'active'
  if (lower === 'contractor' || lower === 'relief') return 'active'
  if (lower === 'active') return 'active'
  if (lower === 'inactive') return 'inactive'
  if (lower === 'terminated') return 'terminated'
  if (lower === 'on-leave' || lower === 'on leave') return 'on-leave'
  return 'active'
}

/**
 * Parse employment type from Status column
 * Valid values: 'full-time', 'part-time', 'contract', 'per-diem', 'intern'
 */
function parseEmploymentType(status, type) {
  const statusLower = (status || '').toLowerCase().trim()
  const typeLower = (type || '').toLowerCase().trim()
  
  if (statusLower === 'part-time') return 'part-time'
  if (statusLower === 'full-time') return 'full-time'
  if (statusLower === 'contractor' || typeLower === '1099') return 'contract'
  if (statusLower === 'relief') return 'per-diem'
  if (statusLower.includes('intern')) return 'intern'
  
  return 'full-time' // Default
}

/**
 * Normalize email
 */
function normalizeEmail(email) {
  if (!email) return null
  return email.toLowerCase().trim()
}

/**
 * Determine pay type (Salary vs Hourly) from rate value
 * Generally: rates under $100 are hourly, above are salary
 */
function determinePayType(rate, type) {
  if (!rate) return 'Hourly'
  const typeLower = (type || '').toLowerCase()
  if (typeLower === 'exempt' || rate > 100) return 'Salary'
  return 'Hourly'
}

/**
 * Map compensation employment status from Type column
 * Values like "Non-Exempt", "Exempt", "1099"
 */
function parseCompEmploymentStatus(typeStr, statusStr) {
  const typeLower = (typeStr || '').toLowerCase().trim()
  const statusLower = (statusStr || '').toLowerCase().trim()
  
  if (statusLower === 'part-time') return 'Part Time'
  if (statusLower === 'contractor' || typeLower === '1099') return 'Contractor'
  return 'Full Time'
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
  
  // Map common variations
  const titleMappings = {
    'vet assistant': 'Veterinary Assistant',
    'veterinary assistant': 'Veterinary Assistant',
    'csr': 'Client Service Representative',
    'rcsr': 'Remote Client Service Representative',
    'remote csr': 'Remote Client Service Representative',
    'remote administrator': 'Remote Administrator',
    'remote hr': 'Remote Administrator',
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
    'pre- intern/vet assistant': 'Veterinary Intern',
    'vet assistant ': 'Veterinary Assistant'
  }
  
  const mappedTitle = titleMappings[normalizedTitle]
  if (mappedTitle) {
    match = jobPositions.find(jp => 
      jp.title.toLowerCase() === mappedTitle.toLowerCase()
    )
    if (match) return match.id
  }
  
  // Try partial match
  match = jobPositions.find(jp => 
    jp.title.toLowerCase().includes(normalizedTitle) ||
    normalizedTitle.includes(jp.title.toLowerCase())
  )
  
  return match?.id || null
}

/**
 * Main sync function
 */
async function syncEmployeeData() {
  console.log('📊 Starting employee data sync from CSV...\n')
  console.log(`   Current Year for PTO: ${CURRENT_YEAR}\n`)
  
  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const records = parseCSV(csvContent)
  
  // Filter out empty rows
  const validRecords = records.filter(r => r['Email'] && r['First Name'])
  
  console.log(`📄 Found ${validRecords.length} valid employee rows in CSV\n`)
  
  // Fetch existing data
  console.log('🔍 Fetching existing data from database...')
  
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
  
  const { data: existingCompensation, error: compError } = await supabase
    .from('employee_compensation')
    .select('id, employee_id')
  
  if (compError) {
    console.error('Error fetching compensation:', compError)
    return
  }
  
  const { data: timeOffTypes, error: totError } = await supabase
    .from('time_off_types')
    .select('id, name, code')
  
  if (totError) {
    console.error('Error fetching time off types:', totError)
    return
  }
  
  const { data: existingBalances, error: balError } = await supabase
    .from('employee_time_off_balances')
    .select('id, employee_id, time_off_type_id, period_year')
    .eq('period_year', CURRENT_YEAR)
  
  if (balError) {
    console.error('Error fetching time off balances:', balError)
    return
  }
  
  console.log(`  ✓ ${existingEmployees.length} employees`)
  console.log(`  ✓ ${existingProfiles.length} profiles`)
  console.log(`  ✓ ${jobPositions.length} job positions`)
  console.log(`  ✓ ${existingCompensation.length} compensation records`)
  console.log(`  ✓ ${timeOffTypes.length} time off types`)
  console.log(`  ✓ ${existingBalances.length} time off balances (${CURRENT_YEAR})\n`)
  
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
  
  const compensationByEmployeeId = new Map()
  for (const comp of existingCompensation) {
    compensationByEmployeeId.set(comp.employee_id, comp)
  }
  
  // Find PTO type (could be "PTO", "Paid Time Off", etc.)
  const ptoType = timeOffTypes.find(t => 
    t.code === 'PTO' || 
    t.name === 'PTO' || 
    t.name === 'Paid Time Off'
  )
  
  if (!ptoType) {
    console.log('⚠️ Warning: No PTO time off type found. PTO balances will be skipped.')
  } else {
    console.log(`✓ Using PTO type: "${ptoType.name}" (${ptoType.id})`)
  }
  
  const balancesByKey = new Map()
  for (const bal of existingBalances) {
    const key = `${bal.employee_id}_${bal.time_off_type_id}`
    balancesByKey.set(key, bal)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('Processing employees...')
  console.log('='.repeat(60) + '\n')
  
  // Process each row
  for (const row of validRecords) {
    const email = normalizeEmail(row['Email'])
    const firstName = row['First Name']?.trim()
    const lastName = row['Last Name']?.trim()
    
    if (!email || !firstName) {
      stats.skipped++
      continue
    }
    
    stats.processed++
    
    console.log(`\n👤 ${firstName} ${lastName} (${email})`)
    
    try {
      // Check if employee exists
      let employee = employeeByEmail.get(email)
      const existingProfile = profileByEmail.get(email)
      
      // Get position_id
      const positionId = await getJobPositionId(row['ADP Job Title'], jobPositions)
      
      // Parse all data from CSV
      const phone = parsePhone(row['phone'])
      const dob = parseDate(row['DOB'])
      const hireDate = parseDate(row['Hire Date'])
      const empStatus = parseEmploymentStatus(row['Status'])
      const empType = parseEmploymentType(row['Status'], row['Type'])
      
      // Clean ZIP code
      let zip = row['ZIP CODE']?.trim()
      if (zip && zip !== 'N/A') {
        zip = zip.replace(/^\./, '').replace(/\.$/, '').trim()
        if (zip.length < 5) zip = null
      } else {
        zip = null
      }
      
      // Parse compensation data
      const payRate = parseMoney(row['Current Hourly Rate or Annual Salary According to Contract'])
      const payType = determinePayType(payRate, row['Type'])
      const compStatus = parseCompEmploymentStatus(row['Type'], row['Status'])
      const benefitsCompleted = row['Benefits Completed\n\nBenefits Tracker']?.toLowerCase() === 'true'
      const ceTotal = parseMoney(row['CE Budget $'])
      const ceUsed = parseMoney(row['CE Used'])
      const wageChangeDate = parseDate(row['Latest Wage Change Date'])
      
      // Parse PTO data (in days)
      // Try both with and without trailing space since CSV headers vary
      const ptoAllotment = parsePTODays(row['PTO Allotment '] || row['PTO Allotment'])
      const ptoUsed = parsePTODays(row['2026 PTO Used'])
      
      // ========== EMPLOYEE ==========
      const employeeData = {
        first_name: firstName,
        last_name: lastName,
        email_work: email,
        updated_at: new Date().toISOString()
      }
      
      if (phone) employeeData.phone_mobile = phone
      if (dob) employeeData.date_of_birth = dob
      if (zip) employeeData.address_zip = zip
      if (hireDate) employeeData.hire_date = hireDate
      if (empType) employeeData.employment_type = empType
      if (empStatus) employeeData.employment_status = empStatus
      if (positionId) employeeData.position_id = positionId
      
      if (employee) {
        // UPDATE existing employee
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', employee.id)
        
        if (updateError) {
          console.error(`  ❌ Employee update error: ${updateError.message}`)
          stats.errors.push({ email, error: updateError.message })
        } else {
          console.log(`  ✅ Employee updated`)
          stats.employeesUpdated++
        }
        
        // Update profile if exists
        if (existingProfile) {
          const profileUpdate = {
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString()
          }
          if (phone) profileUpdate.phone = phone
          
          await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', existingProfile.id)
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
              is_active: empStatus === 'active'
            })
            .select('id')
            .single()
          
          if (newProfError) {
            console.error(`  ❌ Profile creation error: ${newProfError.message}`)
            stats.errors.push({ email, error: `Profile: ${newProfError.message}` })
            continue
          }
          
          profileId = newProfile.id
          console.log(`  ✅ Profile created`)
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
          continue
        } else {
          console.log(`  ✅ Employee created (ID: ${newEmployee.id})`)
          stats.employeesCreated++
          employee = newEmployee
          employeeByEmail.set(email, employee)
        }
      }
      
      // ========== COMPENSATION ==========
      if (payRate !== null && employee) {
        const compData = {
          employee_id: employee.id,
          pay_rate: payRate,
          pay_type: payType,
          employment_status: compStatus,
          benefits_enrolled: benefitsCompleted,
          ce_budget_total: ceTotal || 0,
          ce_budget_used: ceUsed || 0,
          effective_date: wageChangeDate || hireDate || new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }
        
        const existingComp = compensationByEmployeeId.get(employee.id)
        
        if (existingComp) {
          // UPDATE compensation
          const { error: compUpdateError } = await supabase
            .from('employee_compensation')
            .update(compData)
            .eq('id', existingComp.id)
          
          if (compUpdateError) {
            console.error(`  ❌ Compensation update error: ${compUpdateError.message}`)
          } else {
            console.log(`  ✅ Compensation updated (${payType}: $${payRate})`)
            stats.compensationUpdated++
          }
        } else {
          // INSERT compensation
          const { error: compInsertError } = await supabase
            .from('employee_compensation')
            .insert(compData)
          
          if (compInsertError) {
            console.error(`  ❌ Compensation insert error: ${compInsertError.message}`)
          } else {
            console.log(`  ✅ Compensation created (${payType}: $${payRate})`)
            stats.compensationCreated++
            compensationByEmployeeId.set(employee.id, { id: 'new', employee_id: employee.id })
          }
        }
      }
      
      // ========== PTO BALANCE ==========
      if (ptoType && ptoAllotment !== null && employee) {
        // Convert days to hours (8 hours per day)
        const accruedHours = ptoAllotment * 8
        const usedHours = (ptoUsed || 0) * 8
        
        const balanceKey = `${employee.id}_${ptoType.id}`
        const existingBalance = balancesByKey.get(balanceKey)
        
        const balanceData = {
          employee_id: employee.id,
          time_off_type_id: ptoType.id,
          period_year: CURRENT_YEAR,
          accrued_hours: accruedHours,
          used_hours: usedHours,
          pending_hours: 0,
          carryover_hours: 0,
          updated_at: new Date().toISOString()
        }
        
        if (existingBalance) {
          // UPDATE balance
          const { error: balUpdateError } = await supabase
            .from('employee_time_off_balances')
            .update({
              accrued_hours: accruedHours,
              used_hours: usedHours,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBalance.id)
          
          if (balUpdateError) {
            console.error(`  ❌ PTO balance update error: ${balUpdateError.message}`)
          } else {
            console.log(`  ✅ PTO balance updated (${ptoAllotment} days allotted, ${ptoUsed || 0} used)`)
            stats.ptoUpdated++
          }
        } else {
          // INSERT balance
          const { error: balInsertError } = await supabase
            .from('employee_time_off_balances')
            .insert(balanceData)
          
          if (balInsertError) {
            console.error(`  ❌ PTO balance insert error: ${balInsertError.message}`)
          } else {
            console.log(`  ✅ PTO balance created (${ptoAllotment} days allotted, ${ptoUsed || 0} used)`)
            stats.ptoCreated++
            balancesByKey.set(balanceKey, { ...balanceData, id: 'new' })
          }
        }
      }
      
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`)
      stats.errors.push({ email, error: err.message })
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SYNC SUMMARY')
  console.log('='.repeat(60))
  console.log(`Processed:              ${stats.processed}`)
  console.log(`Employees Updated:      ${stats.employeesUpdated}`)
  console.log(`Employees Created:      ${stats.employeesCreated}`)
  console.log(`Compensation Updated:   ${stats.compensationUpdated}`)
  console.log(`Compensation Created:   ${stats.compensationCreated}`)
  console.log(`PTO Balances Updated:   ${stats.ptoUpdated}`)
  console.log(`PTO Balances Created:   ${stats.ptoCreated}`)
  console.log(`Skipped:                ${stats.skipped}`)
  console.log(`Errors:                 ${stats.errors.length}`)
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:')
    for (const err of stats.errors) {
      console.log(`  - ${err.email}: ${err.error}`)
    }
  }
  
  console.log('\n✨ Sync complete!')
}

// Run
syncEmployeeData().catch(console.error)
