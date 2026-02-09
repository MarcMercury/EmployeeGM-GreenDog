/**
 * Skill Operations Tool
 *
 * Reusable CRUD utilities for agents that interact with skill-related tables:
 * skill_library, employee_skills, role_skill_expectations, employee_skill_gaps
 */

/** Get all skills from the skill library */
export async function getAllSkills(): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('skill_library')
    .select('id, name, category, description, subcategory, level_descriptors')
    .order('category')
    .order('name')

  return data ?? []
}

/** Get skills by category */
export async function getSkillsByCategory(category: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('skill_library')
    .select('id, name, category, description, subcategory')
    .eq('category', category)
    .order('name')

  return data ?? []
}

/** Get all distinct skill categories */
export async function getSkillCategories(): Promise<string[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('skill_library')
    .select('category')
    .not('category', 'is', null)

  const cats = new Set((data ?? []).map((d: any) => d.category as string))
  return Array.from(cats).sort()
}

/** Get an employee's current skills with levels */
export async function getEmployeeSkills(employeeId: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employee_skills')
    .select(`
      id, skill_id, current_level, verified, verified_at,
      skill_library:skill_id (name, category, description)
    `)
    .eq('employee_id', employeeId)

  return data ?? []
}

/** Get skill expectations for a position */
export async function getPositionExpectations(positionId: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('role_skill_expectations')
    .select(`
      id, skill_id, expected_level, importance, notes,
      skill_library:skill_id (name, category)
    `)
    .eq('job_position_id', positionId)

  return data ?? []
}

/** Get all skill gaps for an employee */
export async function getEmployeeGaps(employeeId: string): Promise<any[]> {
  const client = createAdminClient() as any
  const { data } = await client
    .from('employee_skill_gaps')
    .select('*')
    .eq('employee_id', employeeId)
    .order('gap', { ascending: false })

  return data ?? []
}

/** Upsert an employee's skill level */
export async function upsertEmployeeSkill(
  employeeId: string,
  skillId: string,
  level: number,
  source: 'self' | 'manager' | 'agent' | 'quiz' = 'agent',
): Promise<boolean> {
  const client = createAdminClient() as any
  const { error } = await client
    .from('employee_skills')
    .upsert(
      {
        employee_id: employeeId,
        skill_id: skillId,
        current_level: level,
        assessment_source: source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id,skill_id' },
    )

  if (error) {
    logger.warn('[SkillOps] Failed to upsert employee skill', 'agent', {
      employeeId,
      skillId,
      error: error.message,
    })
    return false
  }
  return true
}

/** Check if a skill name already exists */
export async function skillExists(name: string): Promise<boolean> {
  const client = createAdminClient() as any
  const { count } = await client
    .from('skill_library')
    .select('id', { count: 'exact', head: true })
    .ilike('name', name)

  return (count ?? 0) > 0
}

/** Get skills that have no expectations mapped for a given position */
export async function getUnmappedSkillsForPosition(positionId: string): Promise<any[]> {
  const client = createAdminClient() as any

  // Get all skills
  const { data: allSkills } = await client
    .from('skill_library')
    .select('id, name, category')

  // Get mapped skills
  const { data: mapped } = await client
    .from('role_skill_expectations')
    .select('skill_id')
    .eq('job_position_id', positionId)

  const mappedIds = new Set((mapped ?? []).map((m: any) => m.skill_id))
  return (allSkills ?? []).filter((s: any) => !mappedIds.has(s.id))
}
