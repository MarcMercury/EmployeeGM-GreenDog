/**
 * Composable for Unified User Lifecycle operations
 * 
 * Provides reactive state and methods for:
 * - Managing intake links
 * - Viewing unified persons
 * - Promoting users through lifecycle stages
 * - Processing intake submissions
 */

import type {
  UnifiedPersonView,
  IntakeLink,
  IntakeSubmission,
  PersonLifecycleStage,
  IntakeLinkType,
  CreateIntakeLinkRequest,
  PromotePersonRequest,
  MasterProfileView,
  PersonCrmData,
  PersonRecruitingData,
  PersonEmployeeData,
  AddCrmHatRequest,
  AddRecruitingHatRequest,
  AddEmployeeHatRequest,
  GrantAccessRequest,
  RevokeAccessRequest
} from '~/types/lifecycle.types'

export function useLifecycle() {
  const toast = useToast()
  const supabase = useSupabaseClient()

  // State
  const persons = ref<UnifiedPersonView[]>([])
  const intakeLinks = ref<IntakeLink[]>([])
  const submissions = ref<IntakeSubmission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Stage statistics
  const stageStats = computed(() => {
    const stats: Record<PersonLifecycleStage, number> = {
      visitor: 0,
      lead: 0,
      student: 0,
      applicant: 0,
      hired: 0,
      employee: 0,
      alumni: 0,
      archived: 0
    }
    
    for (const person of persons.value) {
      if (stats[person.currentStage] !== undefined) {
        stats[person.currentStage]++
      }
    }
    
    return stats
  })

  /**
   * Fetch unified persons with optional filtering
   */
  async function fetchPersons(options?: {
    stage?: PersonLifecycleStage
    search?: string
    includeInactive?: boolean
    limit?: number
    offset?: number
  }) {
    loading.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams()
      if (options?.stage) params.set('stage', options.stage)
      if (options?.search) params.set('search', options.search)
      if (options?.includeInactive) params.set('includeInactive', 'true')
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())

      const response = await $fetch<{ success: boolean; data: UnifiedPersonView[] }>(
        `/api/intake/persons?${params}`
      )

      if (response.success) {
        // Convert snake_case to camelCase for frontend
        persons.value = response.data.map(p => ({
          ...p,
          currentStage: p.current_stage as PersonLifecycleStage,
          stageEnteredAt: p.stage_entered_at,
          // ... other field mappings as needed
        })) as unknown as UnifiedPersonView[]
      }

      return response
    } catch (err) {
      console.error('Error fetching persons:', err)
      error.value = 'Failed to fetch persons'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch intake links with optional filtering
   */
  async function fetchIntakeLinks(options?: {
    status?: string
    linkType?: IntakeLinkType
    limit?: number
    offset?: number
  }) {
    loading.value = true
    error.value = null
    
    try {
      const params = new URLSearchParams()
      if (options?.status) params.set('status', options.status)
      if (options?.linkType) params.set('linkType', options.linkType)
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.offset) params.set('offset', options.offset.toString())

      const response = await $fetch<{ success: boolean; data: IntakeLink[] }>(
        `/api/intake/links?${params}`
      )

      if (response.success) {
        intakeLinks.value = response.data
      }

      return response
    } catch (err) {
      console.error('Error fetching intake links:', err)
      error.value = 'Failed to fetch intake links'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new intake link
   */
  async function createIntakeLink(data: CreateIntakeLinkRequest) {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/intake/links', {
        method: 'POST',
        body: data
      })

      toast.add({
        title: 'Link Created',
        description: 'Intake link created successfully',
        color: 'green'
      })

      // Refresh the links list
      await fetchIntakeLinks()

      return response
    } catch (err) {
      console.error('Error creating intake link:', err)
      error.value = 'Failed to create intake link'
      toast.add({
        title: 'Error',
        description: 'Failed to create intake link',
        color: 'red'
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Revoke an intake link
   */
  async function revokeIntakeLink(linkId: string) {
    try {
      const { error: updateError } = await supabase
        .from('intake_links')
        .update({ status: 'revoked' })
        .eq('id', linkId)

      if (updateError) throw updateError

      toast.add({
        title: 'Link Revoked',
        description: 'The intake link has been revoked',
        color: 'green'
      })

      await fetchIntakeLinks()
    } catch (err) {
      console.error('Error revoking link:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to revoke link',
        color: 'red'
      })
      throw err
    }
  }

  /**
   * Promote a person to a new lifecycle stage
   */
  async function promotePerson(request: PromotePersonRequest) {
    loading.value = true
    error.value = null
    
    try {
      const response = await $fetch('/api/intake/promote', {
        method: 'POST',
        body: request
      })

      toast.add({
        title: 'Promotion Successful',
        description: (response as any).message,
        color: 'green'
      })

      // Refresh persons list
      await fetchPersons()

      return response
    } catch (err: any) {
      console.error('Error promoting person:', err)
      error.value = err.data?.message || 'Failed to promote person'
      toast.add({
        title: 'Promotion Failed',
        description: error.value,
        color: 'red'
      })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get person by ID
   */
  async function getPersonById(personId: string): Promise<UnifiedPersonView | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('unified_persons_view')
        .select('*')
        .eq('id', personId)
        .single()

      if (fetchError) throw fetchError

      return data as unknown as UnifiedPersonView
    } catch (err) {
      console.error('Error fetching person:', err)
      return null
    }
  }

  /**
   * Get lifecycle transitions for a person
   */
  async function getPersonTransitions(personId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('lifecycle_transitions')
        .select('*')
        .eq('person_id', personId)
        .order('transitioned_at', { ascending: false })

      if (fetchError) throw fetchError

      return data
    } catch (err) {
      console.error('Error fetching transitions:', err)
      return []
    }
  }

  /**
   * Get extended data for a person
   */
  async function getPersonExtendedData(personId: string, dataType?: string) {
    try {
      let query = supabase
        .from('person_extended_data')
        .select('*')
        .eq('person_id', personId)
        .eq('is_current', true)

      if (dataType) {
        query = query.eq('data_type', dataType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      return data
    } catch (err) {
      console.error('Error fetching extended data:', err)
      return []
    }
  }

  /**
   * Update extended data for a person
   */
  async function updatePersonExtendedData(
    personId: string,
    dataType: string,
    data: Record<string, unknown>
  ) {
    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('upsert_person_extended_data', {
          p_person_id: personId,
          p_data_type: dataType,
          p_data: data
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Data Updated',
        description: `${dataType} data has been updated`,
        color: 'green'
      })

      return result
    } catch (err) {
      console.error('Error updating extended data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update data',
        color: 'red'
      })
      throw err
    }
  }

  /**
   * Copy an intake link URL to clipboard
   */
  async function copyLinkToClipboard(link: IntakeLink) {
    try {
      await navigator.clipboard.writeText(link.url || '')
      toast.add({
        title: 'Copied!',
        description: 'Link copied to clipboard',
        color: 'green'
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to copy link',
        color: 'red'
      })
    }
  }

  /**
   * Get available promotion targets for a given stage
   */
  function getAvailablePromotions(currentStage: PersonLifecycleStage): Array<{
    stage: PersonLifecycleStage
    label: string
  }> {
    const promotionMap: Record<PersonLifecycleStage, Array<{ stage: PersonLifecycleStage; label: string }>> = {
      visitor: [
        { stage: 'applicant', label: 'Promote to Applicant' },
        { stage: 'student', label: 'Enroll as Student' }
      ],
      lead: [
        { stage: 'applicant', label: 'Promote to Applicant' },
        { stage: 'student', label: 'Enroll as Student' }
      ],
      student: [
        { stage: 'applicant', label: 'Promote to Applicant' }
      ],
      applicant: [
        { stage: 'hired', label: 'Mark as Hired' }
      ],
      hired: [
        { stage: 'employee', label: 'Complete Hire (Create Employee)' }
      ],
      employee: [],
      alumni: [],
      archived: []
    }

    return promotionMap[currentStage] || []
  }

  /**
   * Get stage display info (color, icon, label)
   */
  function getStageInfo(stage: PersonLifecycleStage) {
    const stageInfo: Record<PersonLifecycleStage, { color: string; icon: string; label: string }> = {
      visitor: { color: 'gray', icon: 'i-heroicons-user', label: 'Visitor' },
      lead: { color: 'yellow', icon: 'i-heroicons-star', label: 'Lead' },
      student: { color: 'purple', icon: 'i-heroicons-academic-cap', label: 'Student' },
      applicant: { color: 'blue', icon: 'i-heroicons-document-text', label: 'Applicant' },
      hired: { color: 'green', icon: 'i-heroicons-check-badge', label: 'Hired' },
      employee: { color: 'primary', icon: 'i-heroicons-user-group', label: 'Employee' },
      alumni: { color: 'gray', icon: 'i-heroicons-user-minus', label: 'Alumni' },
      archived: { color: 'gray', icon: 'i-heroicons-archive-box', label: 'Archived' }
    }

    return stageInfo[stage] || { color: 'gray', icon: 'i-heroicons-user', label: stage }
  }

  // =====================================================
  // MASTER PROFILE FUNCTIONS
  // =====================================================

  /**
   * Get the unified master profile view for a person
   */
  async function getMasterProfile(personId: string): Promise<MasterProfileView | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('master_profile_view')
        .select('*')
        .eq('id', personId)
        .single()

      if (fetchError) throw fetchError

      return data as unknown as MasterProfileView
    } catch (err) {
      console.error('Error fetching master profile:', err)
      return null
    }
  }

  /**
   * Search for a person by email (dedupe-safe)
   */
  async function findOrCreatePerson(
    email: string,
    firstName?: string,
    lastName?: string,
    sourceType?: string,
    sourceDetail?: string
  ): Promise<string | null> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('find_or_create_person', {
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_source_type: sourceType,
          p_source_detail: sourceDetail
        })

      if (rpcError) throw rpcError

      return data as string
    } catch (err) {
      console.error('Error finding/creating person:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to find or create person',
        color: 'red'
      })
      return null
    }
  }

  // =====================================================
  // "ADD HAT" FUNCTIONS
  // =====================================================

  /**
   * Add CRM data to a person (make them a lead)
   */
  async function addCrmHat(request: AddCrmHatRequest): Promise<string | null> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('add_crm_hat', {
          p_person_id: request.personId,
          p_acquisition_source: request.acquisitionSource,
          p_acquisition_detail: request.acquisitionDetail,
          p_tags: JSON.stringify(request.tags || []),
          p_notes: request.notes
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'CRM Data Added',
        description: 'Person is now a tracked lead',
        color: 'green'
      })

      return data as string
    } catch (err) {
      console.error('Error adding CRM hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to add CRM data',
        color: 'red'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Add recruiting data to a person (make them an applicant)
   */
  async function addRecruitingHat(request: AddRecruitingHatRequest): Promise<string | null> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('add_recruiting_hat', {
          p_person_id: request.personId,
          p_target_position_id: request.targetPositionId,
          p_target_department_id: request.targetDepartmentId,
          p_target_location_id: request.targetLocationId,
          p_candidate_type: request.candidateType || 'applicant',
          p_resume_url: request.resumeUrl
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Recruiting Data Added',
        description: 'Person is now an applicant',
        color: 'green'
      })

      return data as string
    } catch (err) {
      console.error('Error adding recruiting hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to add recruiting data',
        color: 'red'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Add employee data to a person (hire them)
   */
  async function addEmployeeHat(request: AddEmployeeHatRequest): Promise<string | null> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('add_employee_hat', {
          p_person_id: request.personId,
          p_position_id: request.positionId,
          p_department_id: request.departmentId,
          p_location_id: request.locationId,
          p_hire_date: request.hireDate,
          p_employment_type: request.employmentType || 'full_time',
          p_pay_rate: request.payRate,
          p_pay_type: request.payType || 'hourly'
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Employee Created',
        description: 'Person is now an employee',
        color: 'green'
      })

      return data as string
    } catch (err) {
      console.error('Error adding employee hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to create employee',
        color: 'red'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // ACCESS MANAGEMENT FUNCTIONS
  // =====================================================

  /**
   * Grant system access to a person (create login)
   */
  async function grantAccess(request: GrantAccessRequest): Promise<string | null> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('grant_person_access', {
          p_person_id: request.personId,
          p_role: request.role || 'employee',
          p_send_welcome_email: request.sendWelcomeEmail ?? true
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Access Granted',
        description: 'Person can now log into the system',
        color: 'green'
      })

      return data as string
    } catch (err: any) {
      console.error('Error granting access:', err)
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to grant access',
        color: 'red'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Revoke system access from a person (disable login)
   */
  async function revokeAccess(request: RevokeAccessRequest): Promise<boolean> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('revoke_person_access', {
          p_person_id: request.personId,
          p_reason: request.reason
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Access Revoked',
        description: 'Person can no longer log into the system',
        color: 'orange'
      })

      return true
    } catch (err: any) {
      console.error('Error revoking access:', err)
      toast.add({
        title: 'Error',
        description: err.message || 'Failed to revoke access',
        color: 'red'
      })
      return false
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // EXTENSION TABLE QUERIES
  // =====================================================

  /**
   * Get CRM data for a person
   */
  async function getPersonCrmData(personId: string): Promise<PersonCrmData | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('person_crm_data')
        .select('*')
        .eq('person_id', personId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return data as unknown as PersonCrmData
    } catch (err) {
      console.error('Error fetching CRM data:', err)
      return null
    }
  }

  /**
   * Get recruiting data for a person
   */
  async function getPersonRecruitingData(personId: string): Promise<PersonRecruitingData | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('person_recruiting_data')
        .select('*')
        .eq('person_id', personId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return data as unknown as PersonRecruitingData
    } catch (err) {
      console.error('Error fetching recruiting data:', err)
      return null
    }
  }

  /**
   * Get employee data for a person
   */
  async function getPersonEmployeeData(personId: string): Promise<PersonEmployeeData | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('person_employee_data')
        .select('*')
        .eq('person_id', personId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      return data as unknown as PersonEmployeeData
    } catch (err) {
      console.error('Error fetching employee data:', err)
      return null
    }
  }

  /**
   * Update CRM data for a person
   */
  async function updatePersonCrmData(personId: string, data: Partial<PersonCrmData>): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('person_crm_data')
        .update(data)
        .eq('person_id', personId)

      if (updateError) throw updateError

      toast.add({
        title: 'CRM Data Updated',
        color: 'green'
      })

      return true
    } catch (err) {
      console.error('Error updating CRM data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update CRM data',
        color: 'red'
      })
      return false
    }
  }

  /**
   * Update recruiting data for a person
   */
  async function updatePersonRecruitingData(personId: string, data: Partial<PersonRecruitingData>): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('person_recruiting_data')
        .update(data)
        .eq('person_id', personId)

      if (updateError) throw updateError

      toast.add({
        title: 'Recruiting Data Updated',
        color: 'green'
      })

      return true
    } catch (err) {
      console.error('Error updating recruiting data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update recruiting data',
        color: 'red'
      })
      return false
    }
  }

  /**
   * Update employee data for a person
   */
  async function updatePersonEmployeeData(personId: string, data: Partial<PersonEmployeeData>): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('person_employee_data')
        .update(data)
        .eq('person_id', personId)

      if (updateError) throw updateError

      toast.add({
        title: 'Employee Data Updated',
        color: 'green'
      })

      return true
    } catch (err) {
      console.error('Error updating employee data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update employee data',
        color: 'red'
      })
      return false
    }
  }

  /**
   * Run the migration to populate extension tables from legacy data
   */
  async function runMigrationToExtensionTables(): Promise<Record<string, { created: number; updated: number }> | null> {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('migrate_to_extension_tables')

      if (rpcError) throw rpcError

      toast.add({
        title: 'Migration Complete',
        description: 'Extension tables have been populated from legacy data',
        color: 'green'
      })

      return data as Record<string, { created: number; updated: number }>
    } catch (err) {
      console.error('Error running migration:', err)
      toast.add({
        title: 'Migration Failed',
        description: 'Failed to populate extension tables',
        color: 'red'
      })
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    persons,
    intakeLinks,
    submissions,
    loading,
    error,
    stageStats,

    // Methods
    fetchPersons,
    fetchIntakeLinks,
    createIntakeLink,
    revokeIntakeLink,
    promotePerson,
    getPersonById,
    getPersonTransitions,
    getPersonExtendedData,
    updatePersonExtendedData,
    copyLinkToClipboard,

    // Master Profile
    getMasterProfile,
    findOrCreatePerson,

    // Add Hats
    addCrmHat,
    addRecruitingHat,
    addEmployeeHat,

    // Access Management
    grantAccess,
    revokeAccess,

    // Extension Table Data
    getPersonCrmData,
    getPersonRecruitingData,
    getPersonEmployeeData,
    updatePersonCrmData,
    updatePersonRecruitingData,
    updatePersonEmployeeData,

    // Migration
    runMigrationToExtensionTables,

    // Helpers
    getAvailablePromotions,
    getStageInfo
  }
}
