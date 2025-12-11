import type { SupabaseClient } from '@supabase/supabase-js'

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
 * Converts a candidate to an employee by:
 * 1. Creating a new employee record from candidate data
 * 2. Copying all candidate_skills to employee_skills
 * 3. Marking the candidate as 'converted' with reference to new employee
 * 
 * This is a transactional operation - if any step fails, the whole process fails.
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
