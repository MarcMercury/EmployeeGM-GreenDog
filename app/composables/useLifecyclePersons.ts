/**
 * Sub-composable for Person lifecycle operations
 *
 * Handles unified person fetching, stage management, promotions,
 * master profiles, extended data, and stage helpers.
 */

import type {
  UnifiedPersonView,
  PersonLifecycleStage,
  PromotePersonRequest,
  MasterProfileView,
} from '~/types/lifecycle.types'

export function useLifecyclePersons() {
  const toast = useToast()
  const supabase = useSupabaseClient()

  // State
  const persons = ref<UnifiedPersonView[]>([])
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
      archived: 0,
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
        `/api/intake/persons?${params}`,
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
   * Promote a person to a new lifecycle stage
   */
  async function promotePerson(request: PromotePersonRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/intake/promote', {
        method: 'POST',
        body: request,
      })

      toast.add({
        title: 'Promotion Successful',
        description: (response as { message?: string }).message,
        color: 'green',
      })

      // Refresh persons list
      await fetchPersons()

      return response
    } catch (err: unknown) {
      console.error('Error promoting person:', err)
      error.value = (err as Record<string, unknown> & { data?: { message?: string } })?.data?.message as string || 'Failed to promote person'
      toast.add({
        title: 'Promotion Failed',
        description: error.value,
        color: 'red',
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
    data: Record<string, unknown>,
  ) {
    try {
      const { data: result, error: rpcError } = await supabase
        .rpc('upsert_person_extended_data', {
          p_person_id: personId,
          p_data_type: dataType,
          p_data: data,
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Data Updated',
        description: `${dataType} data has been updated`,
        color: 'green',
      })

      return result
    } catch (err) {
      console.error('Error updating extended data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update data',
        color: 'red',
      })
      throw err
    }
  }

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
    sourceDetail?: string,
  ): Promise<string | null> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('find_or_create_person', {
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_source_type: sourceType,
          p_source_detail: sourceDetail,
        })

      if (rpcError) throw rpcError

      return data as string
    } catch (err) {
      console.error('Error finding/creating person:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to find or create person',
        color: 'red',
      })
      return null
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
        { stage: 'student', label: 'Enroll as Student' },
      ],
      lead: [
        { stage: 'applicant', label: 'Promote to Applicant' },
        { stage: 'student', label: 'Enroll as Student' },
      ],
      student: [
        { stage: 'applicant', label: 'Promote to Applicant' },
      ],
      applicant: [
        { stage: 'hired', label: 'Mark as Hired' },
      ],
      hired: [
        { stage: 'employee', label: 'Complete Hire (Create Employee)' },
      ],
      employee: [],
      alumni: [],
      archived: [],
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
      archived: { color: 'gray', icon: 'i-heroicons-archive-box', label: 'Archived' },
    }

    return stageInfo[stage] || { color: 'gray', icon: 'i-heroicons-user', label: stage }
  }

  return {
    // State
    persons,
    loading,
    error,
    stageStats,

    // Methods
    fetchPersons,
    promotePerson,
    getPersonById,
    getPersonTransitions,
    getPersonExtendedData,
    updatePersonExtendedData,

    // Master Profile
    getMasterProfile,
    findOrCreatePerson,

    // Helpers
    getAvailablePromotions,
    getStageInfo,
  }
}
