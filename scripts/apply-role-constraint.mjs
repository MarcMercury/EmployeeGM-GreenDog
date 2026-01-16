// Script to update the profiles_role_check constraint to include new RBAC roles
// Then re-run the role assignments

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Role assignments to apply
const roleAssignments = [
  // super_admin
  { name: 'Marc Mercury', role: 'super_admin' },
  
  // admin  
  { name: 'Gladys Juliette', role: 'admin' },
  { name: 'Cynthia Garcia', role: 'admin' },
  { name: 'Andrea Rehrig', role: 'admin' },
  
  // marketing_admin
  { name: 'Naomi Folta', role: 'marketing_admin' },
  { name: 'Laurence Marai', role: 'marketing_admin' },
  
  // manager
  { name: 'Bianca Alfonso', role: 'manager' },
  { name: 'Deija Lighon', role: 'manager' },
  { name: 'Jennifer Velasquez', role: 'manager' },
  { name: 'Tiffany Tesoro', role: 'manager' },
  
  // hr_admin
  { name: 'Ana Diaz', role: 'hr_admin' },
  { name: 'Angela', lastName: 'Perez', role: 'hr_admin' } // Angela L Perez - special handling
]

async function main() {
  console.log('=== Updating Role Constraint and Assigning Roles ===\n')
  
  // First, we need to check if the constraint allows the new roles
  // The constraint needs to be updated via Supabase Dashboard SQL Editor
  // But we can try updating profiles directly since some already succeeded
  
  console.log('Attempting to assign remaining roles...\n')
  
  let successCount = 0
  let errorCount = 0
  
  for (const assignment of roleAssignments) {
    const nameParts = assignment.name.split(' ')
    const firstName = nameParts[0]
    const lastName = assignment.lastName || nameParts.slice(1).join(' ')
    
    // Look up the profile by matching against employees table (first_name + last_name)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, profile_id, first_name, last_name')
      .ilike('first_name', `%${firstName}%`)
    
    if (empError) {
      console.log(`❌ Error finding ${assignment.name}: ${empError.message}`)
      errorCount++
      continue
    }
    
    // Find the best match using first_name and last_name
    const match = employees?.find(e => {
      const empFirstName = (e.first_name || '').toLowerCase()
      const empLastName = (e.last_name || '').toLowerCase()
      const lastNameToMatch = lastName.split(' ')[0].toLowerCase()
      return empFirstName.includes(firstName.toLowerCase()) && 
             (lastName === '' || empLastName.includes(lastNameToMatch))
    })
    
    if (!match?.profile_id) {
      console.log(`❌ No matching employee found for: ${assignment.name}`)
      errorCount++
      continue
    }
    
    // Check current role first
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', match.profile_id)
      .single()
    
    if (currentProfile?.role === assignment.role) {
      console.log(`✅ ${assignment.name} already has role: ${assignment.role}`)
      successCount++
      continue
    }
    
    // Update the profile role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: assignment.role })
      .eq('id', match.profile_id)
    
    if (updateError) {
      console.log(`❌ Failed to update ${assignment.name} (profile ${match.profile_id}): ${updateError.message}`)
      errorCount++
    } else {
      console.log(`✅ ${assignment.name} → ${assignment.role}`)
      successCount++
    }
  }
  
  console.log('\n=== Summary ===')
  console.log(`Success: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some roles could not be assigned.')
    console.log('If the error mentions "profiles_role_check", you need to run this SQL in Supabase Dashboard:')
    console.log('')
    console.log('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;')
    console.log("ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'manager', 'hr_admin', 'office_admin', 'marketing_admin', 'user'));")
    console.log('')
    console.log('URL: https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
  }
}

main().catch(console.error)
