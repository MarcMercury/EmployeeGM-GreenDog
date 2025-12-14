import type { SupabaseClient } from '@supabase/supabase-js'
import type { HireCandidatePayload } from '~/types/database.types'

interface HireCandidateOptions {
  candidateId: string
  startDate?: string
  notes?: string
}

interface HireCandidateResult {
  success: boolean
  employeeId?: string
  error?: string
}

/**
 * Converts a candidate to an employee using the database RPC function.
 * 
 * This calls the `promote_candidate_to_employee` database function which:
 * 1. Creates a new profile for the employee
 * 2. Creates the employee record with all candidate data
 * 3. Migrates candidate_skills → employee_skills
 * 4. Migrates candidate_documents → employee_documents
 * 5. Migrates candidate_notes → employee_notes
 * 6. Creates license records if applicable
 * 7. Sets up pay settings
 * 8. Updates candidate status to 'hired'
 * 
 * This is an atomic database transaction - if any step fails, all changes are rolled back.
 */
export async function hireCandidateWithPayload(
  client: SupabaseClient,
  payload: HireCandidatePayload
): Promise<HireCandidateResult> {
  try {
    const { data: newEmployeeId, error: rpcError } = await client
      .rpc('promote_candidate_to_employee', {
        p_candidate_id: payload.candidate_id,
        p_employment_type: payload.employment_type,
        p_job_title_id: payload.job_title_id,
        p_start_date: payload.start_date,
        p_starting_wage: payload.starting_wage,
        p_pay_type: payload.pay_type,
        p_department_id: payload.department_id || null,
        p_location_id: payload.location_id || null
      })

    if (rpcError) {
      throw new Error(rpcError.message || 'Failed to hire candidate')
    }

    return {
      success: true,
      employeeId: newEmployeeId
    }
  } catch (err: any) {
    console.error('Hire candidate error:', err)
    return {
      success: false,
      error: err.message || 'An unexpected error occurred'
    }
  }
}

/**
 * Legacy function - Converts a candidate to an employee by:
 * 1. Creating a new employee record from candidate data
 * 2. Copying all candidate_skills to employee_skills
 * 3. Marking the candidate as 'converted' with reference to new employee
 * 
 * @deprecated Use hireCandidateWithPayload for the full atomic transaction
 */
export async function hireCandidate(
  client: SupabaseClient,
  options: HireCandidateOptions
): Promise<HireCandidateResult> {
  const { candidateId, startDate, notes } = options
  
  try {
    // 1. Fetch candidate data
    const { data: candidate, error: fetchError } = await client
      .from('candidates')
      .select(`
        *,
        candidate_skills(skill_id, skill_level)
      `)
      .eq('id', candidateId)
      .single()
    
    if (fetchError || !candidate) {
      throw new Error('Candidate not found')
    }
    
    if (candidate.status === 'converted') {
      throw new Error('Candidate has already been converted to an employee')
    }
    
    // 2. Create employee record
    const { data: newEmployee, error: empError } = await client
      .from('employees')
      .insert({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone || null,
        position_id: candidate.target_position_id,
        hire_date: startDate || new Date().toISOString().split('T')[0],
        status: 'active',
        notes: notes || candidate.notes || null
      } as any)
      .select('id')
      .single()
    
    if (empError || !newEmployee) {
      console.error('Error creating employee:', empError)
      throw new Error('Failed to create employee record')
    }
    
    // 3. Copy skills to employee_skills table
    const candidateSkills = candidate.candidate_skills || []
    if (candidateSkills.length > 0) {
      const skillInserts = candidateSkills.map((skill: any) => ({
        employee_id: newEmployee.id,
        skill_id: skill.skill_id,
        skill_level: skill.skill_level,
        created_at: new Date().toISOString()
      }))
      
      const { error: skillError } = await client
        .from('employee_skills')
        .insert(skillInserts as any)
      
      if (skillError) {
        console.error('Error copying skills:', skillError)
        // Don't fail the whole operation for skill copy issues
      }
    }
    
    // 4. Update candidate status to 'converted'
    const { error: updateError } = await client
      .from('candidates')
      .update({
        status: 'converted',
        converted_employee_id: newEmployee.id,
        converted_at: new Date().toISOString()
      } as any)
      .eq('id', candidateId)
    
    if (updateError) {
      console.error('Error updating candidate status:', updateError)
      // Don't fail - employee was created successfully
    }
    
    return {
      success: true,
      employeeId: newEmployee.id
    }
  } catch (error) {
    console.error('hireCandidate error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Batch hire multiple candidates at once
 */
export async function hireCandidates(
  client: SupabaseClient,
  candidateIds: string[],
  options?: { startDate?: string }
): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const results = {
    success: [] as string[],
    failed: [] as { id: string; error: string }[]
  }
  
  for (const candidateId of candidateIds) {
    const result = await hireCandidate(client, {
      candidateId,
      startDate: options?.startDate
    })
    
    if (result.success && result.employeeId) {
      results.success.push(result.employeeId)
    } else {
      results.failed.push({
        id: candidateId,
        error: result.error || 'Unknown error'
      })
    }
  }
  
  return results
}
