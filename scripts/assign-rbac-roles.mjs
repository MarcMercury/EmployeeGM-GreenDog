/**
 * Assign RBAC Roles to Specified Users
 * 
 * This script assigns the following roles:
 * 
 * ADMIN (super_admin): Marc Mercury
 * ADMIN (admin): Gladys Juliette, Cynthia Garcia, Andrea Rehrig
 * MARKETING_ADMIN: Naomi Folta, Laurence Marai
 * MANAGER: Bianca Alfonso, Deija Lighon, Jennifer Velasquez, Tiffany Tesoro
 * HR_ADMIN: Ana Diaz, Angela L Perez
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

// Role assignments
const roleAssignments = [
  // Super Admin
  { name: 'Marc Mercury', role: 'super_admin' },
  
  // Admins
  { name: 'Gladys Juliette', role: 'admin' },
  { name: 'Cynthia Garcia', role: 'admin' },
  { name: 'Andrea Rehrig', role: 'admin' },
  
  // Marketing Admin
  { name: 'Naomi Folta', role: 'marketing_admin' },
  { name: 'Laurence Marai', role: 'marketing_admin' },
  
  // Managers
  { name: 'Bianca Alfonso', role: 'manager' },
  { name: 'Deija Lighon', role: 'manager' },
  { name: 'Jennifer Velasquez', role: 'manager' },
  { name: 'Tiffany Tesoro', role: 'manager' },
  
  // HR Admin
  { name: 'Ana Diaz', role: 'hr_admin' },
  { name: 'Angela L Perez', role: 'hr_admin' },
]

async function assignRoles() {
  console.log('🔐 Starting RBAC Role Assignment...\n')
  
  // Get all employees with their profiles
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email_work, profile_id')
  
  if (empError) {
    console.error('Error fetching employees:', empError)
    return
  }
  
  // Get all profiles
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
  
  if (profError) {
    console.error('Error fetching profiles:', profError)
    return
  }
  
  console.log(`Found ${employees.length} employees and ${profiles.length} profiles\n`)
  
  const results = {
    success: [],
    notFound: [],
    errors: []
  }
  
  for (const assignment of roleAssignments) {
    const { name, role } = assignment
    const parts = name.toLowerCase().split(' ')
    const firstName = parts[0]
    const lastName = parts.slice(-1)[0]
    
    console.log(`\n👤 Assigning ${role} to ${name}...`)
    
    // Find employee by name
    const employee = employees.find(e => {
      const empFullName = `${e.first_name} ${e.last_name}`.toLowerCase()
      const empFirstLower = e.first_name?.toLowerCase() || ''
      const empLastLower = e.last_name?.toLowerCase() || ''
      
      return empFullName.includes(name.toLowerCase()) ||
        (empFirstLower.includes(firstName) && empLastLower.includes(lastName))
    })
    
    if (!employee) {
      console.log(`  ⚠️ Employee not found for: ${name}`)
      results.notFound.push(name)
      continue
    }
    
    console.log(`  Found employee: ${employee.first_name} ${employee.last_name}`)
    
    // Find or use linked profile
    let profile = employee.profile_id 
      ? profiles.find(p => p.id === employee.profile_id)
      : profiles.find(p => p.email?.toLowerCase() === employee.email_work?.toLowerCase())
    
    if (!profile) {
      // Try to find by name in profiles
      profile = profiles.find(p => {
        const profFullName = `${p.first_name} ${p.last_name}`.toLowerCase()
        return profFullName.includes(name.toLowerCase())
      })
    }
    
    if (!profile) {
      console.log(`  ⚠️ Profile not found - creating new profile for ${name}`)
      
      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          email: employee.email_work,
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: role,
          is_active: true
        })
        .select('id')
        .single()
      
      if (createError) {
        console.log(`  ❌ Error creating profile: ${createError.message}`)
        results.errors.push({ name, error: createError.message })
        continue
      }
      
      // Link profile to employee
      await supabase
        .from('employees')
        .update({ profile_id: newProfile.id })
        .eq('id', employee.id)
      
      console.log(`  ✅ Created profile and assigned ${role}`)
      results.success.push({ name, role, profileId: newProfile.id })
      continue
    }
    
    // Update profile role
    console.log(`  Found profile: ${profile.email} (current role: ${profile.role})`)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: role, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    
    if (updateError) {
      console.log(`  ❌ Error updating role: ${updateError.message}`)
      results.errors.push({ name, error: updateError.message })
      continue
    }
    
    console.log(`  ✅ Updated role to ${role}`)
    results.success.push({ name, role, profileId: profile.id })
    
    // Ensure employee is linked to profile
    if (!employee.profile_id) {
      await supabase
        .from('employees')
        .update({ profile_id: profile.id })
        .eq('id', employee.id)
      console.log(`  📎 Linked employee to profile`)
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 ROLE ASSIGNMENT SUMMARY')
  console.log('='.repeat(50))
  
  console.log(`\n✅ Successful: ${results.success.length}`)
  for (const s of results.success) {
    console.log(`   - ${s.name}: ${s.role}`)
  }
  
  if (results.notFound.length > 0) {
    console.log(`\n⚠️ Not Found: ${results.notFound.length}`)
    for (const n of results.notFound) {
      console.log(`   - ${n}`)
    }
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length}`)
    for (const e of results.errors) {
      console.log(`   - ${e.name}: ${e.error}`)
    }
  }
  
  console.log('\n✨ Done!')
}

assignRoles()
