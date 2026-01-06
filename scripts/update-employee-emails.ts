/**
 * Bulk Email Update Script
 * =========================
 * Updates employee emails across employees, profiles, and auth.users tables
 * 
 * Usage: npx tsx scripts/update-employee-emails.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// New email data from the provided list
const emailUpdates = [
  { firstName: 'Gladys', lastName: null, newEmail: 'mypetgladys@gmail.com' }, // First Gladys without last name
  { firstName: 'Cynthia', lastName: 'Garcia', newEmail: 'greendogcynthiag@gmail.com' },
  { firstName: 'Andrea', lastName: 'Rehrig', newEmail: 'greendogandrear@gmail.com' },
  { firstName: 'Marc', lastName: 'Mercury', newEmail: 'marcm@greendogdental.com' },
  { firstName: 'Michael', lastName: 'Geist', newEmail: 'drgeist@greendogdental.com' },
  { firstName: 'Heather', lastName: 'Rally', newEmail: 'greendogdrrally@gmail.com' },
  { firstName: 'Andre', lastName: 'Faro', newEmail: 'greendogdrfaro@gmail.com' },
  { firstName: 'Jessica', lastName: 'Robertson', newEmail: 'greendogdrrobertson@gmail.com' },
  { firstName: 'Candice', lastName: 'Habawel', newEmail: 'candicehdvm@gmail.com' },
  { firstName: 'Claudia', lastName: 'Lau', newEmail: 'greendogdrclau@gmail.com' },
  { firstName: 'Celestine', lastName: 'Hoh', newEmail: 'greendogcelestine@gmail.com' },
  { firstName: 'Sherry', lastName: 'Vartanian', newEmail: 'greendogsherry@gmail.com' },
  { firstName: 'Ella', lastName: 'Scott', newEmail: 'greendogdrscott@gmail.com' },
  { firstName: 'Niko', lastName: 'Alzate', newEmail: 'greendogdrniko@gmail.com' },
  { firstName: 'Deija', lastName: 'Lighon', newEmail: 'greendogdeija@gmail.com' },
  { firstName: 'Bianca', lastName: 'Alfonso', newEmail: 'mypetbianca@gmail.com' },
  { firstName: 'Angela', lastName: 'Lina', newEmail: 'greendogangelalina@gmail.com' }, // Angela Lina Perez
  { firstName: 'Laurence', lastName: 'Marai', newEmail: 'greendoglmarai@gmail.com' },
  { firstName: 'Sierra', lastName: 'Frasier', newEmail: 'mypetsierra@gmail.com' },
  { firstName: 'Taylor', lastName: 'Fox', newEmail: 'greendogtaylor@gmail.com' },
  { firstName: 'Sonora', lastName: 'Chavez', newEmail: 'greendogsonora@gmail.com' },
  { firstName: 'Christina', lastName: 'Earnest', newEmail: 'mypetchristina@gmail.com' },
  { firstName: 'Carlos', lastName: 'Alexei', newEmail: 'greendogalexei@gmail.com' }, // Carlos Alexei Marquez
  { firstName: 'Jessica', lastName: 'Lucra', newEmail: 'mypetjessica@gmail.com' },
  { firstName: 'Ken', lastName: 'Padilla', newEmail: 'greendogkpadilla@gmail.com' },
  { firstName: 'Ethan', lastName: 'Young', newEmail: 'greendogethan@gmail.com' },
  { firstName: 'Tiffany', lastName: 'Tesoro', newEmail: 'greendogtiffanyt@gmail.com' },
  { firstName: 'Alexandra', lastName: 'Martin', newEmail: 'greendogalexandra@gmail.com' },
  { firstName: 'Caitlin', lastName: 'Quinn', newEmail: 'greendogcaitlin@gmail.com' },
  { firstName: 'Shelby', lastName: 'Ackerman', newEmail: 'greendogshelby@gmail.com' },
  { firstName: 'Lisa', lastName: 'Girtain', newEmail: 'greendoglisa@gmail.com' },
  { firstName: 'Ashley', lastName: 'Paredes', newEmail: 'greendogashleyp@gmail.com' },
  { firstName: 'Nichole', lastName: 'Gibbs', newEmail: 'greendognichole@gmail.com' },
  { firstName: 'Sara', lastName: 'Drickman', newEmail: 'greendogsara@gmail.com' },
  { firstName: 'Sierra', lastName: 'Mendez', newEmail: 'greendogsmendez@gmail.com' },
  { firstName: 'Brandon', lastName: 'Orange', newEmail: 'greendogborange@gmail.com' },
  { firstName: 'Catherine', lastName: 'Ramirez', newEmail: 'greendogcatherine@gmail.com' },
  { firstName: 'Brittany', lastName: 'Finch', newEmail: 'greendogbrittany@gmail.com' },
  { firstName: 'Nauman', lastName: 'Ali', newEmail: 'greendogalinauman@gmail.com' },
  { firstName: 'Verenice', lastName: 'Mendoza', newEmail: 'greendogverenice@gmail.com' },
  { firstName: 'Zuleyka', lastName: 'Chuc', newEmail: 'greendogzuleyka@gmail.com' },
  { firstName: 'Aislinn', lastName: 'Dickey', newEmail: 'greendogaislinn@gmail.com' },
  { firstName: 'Kirtlynn', lastName: 'Moller', newEmail: 'greendogkirtlynn@gmail.com' },
  { firstName: 'Natalie', lastName: 'Ulloa', newEmail: 'greendognat@gmail.com' },
  { firstName: 'Victoria', lastName: 'Portillo', newEmail: 'greendogvictoria@gmail.com' }, // Ana Victoria Portillo
  { firstName: 'Jennifer', lastName: 'Velasquez', newEmail: 'greendogjennifer@gmail.com' },
  { firstName: 'Diana', lastName: 'Monterde', newEmail: 'greendogdiana@gmail.com' },
  { firstName: 'Carmen', lastName: 'Chan', newEmail: 'greendogcarmen@gmail.com' },
  { firstName: 'Markie', lastName: 'Perez', newEmail: 'greendogmarkie@gmail.com' },
  { firstName: 'Miguel', lastName: 'Antonio', newEmail: 'greendogmiguelan@gmail.com' }, // Miguel Antonio Gonzalez
  { firstName: 'Gladys', lastName: 'Castro', newEmail: 'greendoggcastro@gmail.com' },
  { firstName: 'Megan', lastName: 'Rolnik', newEmail: 'greendogrolnik@gmail.com' },
  { firstName: 'Jessica', lastName: 'Salazar', newEmail: 'greendogrvtjess@gmail.com' }, // Jessica Slazar -> Salazar
  { firstName: 'Angela', lastName: 'Fraga', newEmail: 'janinefp1520@gmail.com' },
  { firstName: 'Batia', lastName: 'Blank', newEmail: 'greendogbatia@gmail.com' },
  { firstName: 'Ana', lastName: 'Livia', newEmail: 'greendoganalivia@gmail.com' }, // Ana Livia Fraga
  { firstName: 'Adriana', lastName: 'Gutierrez', newEmail: 'greendogadriana@gmail.com' },
  { firstName: 'Rachel', lastName: 'Moreno', newEmail: 'greendograchel@gmail.com' },
  { firstName: 'Alysia', lastName: 'Sanford', newEmail: 'greendogalysias@gmail.com' },
  { firstName: 'Karen', lastName: 'Cuestas', newEmail: 'greendogkarenc@gmail.com' },
  { firstName: 'Crystal', lastName: 'Barrom', newEmail: 'greendogcrystalbarrom@gmail.com' },
  { firstName: 'Rachael', lastName: 'Banyasz', newEmail: 'greendograchaelb@gmail.com' },
  { firstName: 'Ervin', lastName: 'Tenorio', newEmail: 'greendogervin@gmail.com' },
  { firstName: 'Arron', lastName: 'Bryant', newEmail: 'greendogabryant@gmail.com' },
  { firstName: 'Raquel', lastName: 'Velez', newEmail: 'greendograq.velez@gmail.com' },
  { firstName: 'Marelyn', lastName: 'Ventura', newEmail: 'greendogmarelyn@gmail.com' },
  { firstName: 'Nicholas', lastName: 'Bermudez', newEmail: 'greendognickb@gmail.com' }, // Nick Bermudez
  { firstName: 'Fidel', lastName: 'Fraga', newEmail: 'fidelvettech@gmail.com' },
  { firstName: 'Joseph', lastName: 'Reyes', newEmail: 'greendogjoseph@gmail.com' },
  { firstName: 'Veronica', lastName: 'Rios', newEmail: 'greendogveronica@gmail.com' },
  { firstName: 'Maria', lastName: 'Portillo', newEmail: 'greendogmaria@gmail.com' }, // Maria M Portillo
  { firstName: 'Yasuko', lastName: 'Sano', newEmail: 'greendogyasuko@gmail.com' },
]

async function main() {
  console.log('\n📧 Bulk Email Update Script')
  console.log('============================\n')

  // Fetch all employees with profiles
  const { data: employees, error } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email_work,
      profile_id,
      profiles:profile_id (
        id,
        auth_user_id,
        email
      )
    `)

  if (error) {
    console.error('❌ Failed to fetch employees:', error.message)
    process.exit(1)
  }

  console.log(`📋 Found ${employees?.length || 0} employees in database\n`)

  let updated = 0
  let skipped = 0
  let notFound = 0
  let errors = 0

  for (const update of emailUpdates) {
    // Find matching employee
    let employee = employees?.find(e => {
      const firstMatch = e.first_name?.toLowerCase() === update.firstName.toLowerCase()
      
      if (!update.lastName) {
        // Only match by first name if no last name provided
        return firstMatch
      }
      
      // Try exact last name match first
      const lastMatch = e.last_name?.toLowerCase() === update.lastName.toLowerCase()
      if (firstMatch && lastMatch) return true
      
      // Try partial matches for compound names
      const lastNameLower = e.last_name?.toLowerCase() || ''
      const updateLastLower = update.lastName.toLowerCase()
      
      // Check if last name contains or starts with the update lastName
      if (firstMatch && (lastNameLower.includes(updateLastLower) || lastNameLower.startsWith(updateLastLower))) {
        return true
      }
      
      // Special case: first name might be in middle name
      // e.g., "Angela Lina Perez" matches "Angela Lina"
      if (firstMatch && lastNameLower.startsWith(updateLastLower)) {
        return true
      }
      
      return false
    })

    // Special handling for specific cases
    if (!employee) {
      // Try alternative matches
      if (update.firstName === 'Heather' && update.lastName === 'Rally') {
        employee = employees?.find(e => e.first_name === 'Heather' && e.last_name?.includes('Rally'))
      } else if (update.firstName === 'Nick' || update.firstName === 'Nicholas') {
        employee = employees?.find(e => 
          (e.first_name === 'Nick' || e.first_name === 'Nicholas') && 
          e.last_name?.toLowerCase().includes('bermudez')
        )
      } else if (update.firstName === 'Ana' && update.lastName === 'Livia') {
        employee = employees?.find(e => e.first_name === 'Ana Livia')
      } else if (update.firstName === 'Victoria' && update.lastName === 'Portillo') {
        employee = employees?.find(e => e.first_name === 'Ana Victoria')
      } else if (update.firstName === 'Carlos' && update.lastName === 'Alexei') {
        employee = employees?.find(e => e.first_name === 'Carlos Alexei')
      } else if (update.firstName === 'Miguel' && update.lastName === 'Antonio') {
        employee = employees?.find(e => e.first_name === 'Miguel Antonio')
      } else if (update.firstName === 'Maria' && update.lastName === 'Portillo') {
        employee = employees?.find(e => e.first_name === 'Maria' && e.last_name === 'Portillo')
      } else if (update.firstName === 'Angela' && update.lastName === 'Lina') {
        employee = employees?.find(e => e.first_name === 'Angela Lina')
      }
    }

    if (!employee) {
      console.log(`⚠️  NOT FOUND: ${update.firstName} ${update.lastName || ''}`)
      notFound++
      continue
    }

    const name = `${employee.first_name} ${employee.last_name}`
    const currentEmail = employee.email_work?.toLowerCase()
    const newEmail = update.newEmail.toLowerCase()
    const profile = (employee as any).profiles

    // Check if email is already correct
    if (currentEmail === newEmail) {
      console.log(`⏭️  SAME: ${name} (${newEmail})`)
      skipped++
      continue
    }

    console.log(`\n🔄 UPDATING: ${name}`)
    console.log(`   Old: ${currentEmail || 'null'}`)
    console.log(`   New: ${newEmail}`)

    try {
      // 1. Update employees.email_work
      const { error: empError } = await supabase
        .from('employees')
        .update({ email_work: newEmail })
        .eq('id', employee.id)

      if (empError) {
        console.log(`   ❌ Employee update failed: ${empError.message}`)
        errors++
        continue
      }
      console.log(`   ✅ employees.email_work updated`)

      // 2. Update profiles.email if profile exists
      if (profile?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: newEmail })
          .eq('id', profile.id)

        if (profileError) {
          console.log(`   ⚠️  Profile update warning: ${profileError.message}`)
        } else {
          console.log(`   ✅ profiles.email updated`)
        }

        // 3. Update auth.users.email if auth user exists
        if (profile.auth_user_id) {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            profile.auth_user_id,
            { email: newEmail }
          )

          if (authError) {
            console.log(`   ⚠️  Auth update warning: ${authError.message}`)
          } else {
            console.log(`   ✅ auth.users.email updated`)
          }
        }
      }

      updated++
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}`)
      errors++
    }
  }

  console.log('\n============================')
  console.log('📊 Summary:')
  console.log(`   ✅ Updated:   ${updated}`)
  console.log(`   ⏭️  Skipped:   ${skipped} (already correct)`)
  console.log(`   ⚠️  Not Found: ${notFound}`)
  console.log(`   ❌ Errors:    ${errors}`)
  console.log('============================\n')
}

main().catch(console.error)
