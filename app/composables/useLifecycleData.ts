/**
 * Sub-composable for Extension Table data operations
 *
 * Handles CRUD for person CRM, recruiting, and employee data,
 * plus the legacy-to-extension-table migration.
 */

import type {
  PersonCrmData,
  PersonRecruitingData,
  PersonEmployeeData,
} from '~/types/lifecycle.types'

export function useLifecycleData() {
  const toast = useToast()
  const supabase = useSupabaseClient()

  const loading = ref(false)

  // =====================================================
  // READ
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

  // =====================================================
  // UPDATE
  // =====================================================

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
        color: 'green',
      })

      return true
    } catch (err) {
      console.error('Error updating CRM data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update CRM data',
        color: 'red',
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
        color: 'green',
      })

      return true
    } catch (err) {
      console.error('Error updating recruiting data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update recruiting data',
        color: 'red',
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
        color: 'green',
      })

      return true
    } catch (err) {
      console.error('Error updating employee data:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to update employee data',
        color: 'red',
      })
      return false
    }
  }

  // =====================================================
  // MIGRATION
  // =====================================================

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
        color: 'green',
      })

      return data as Record<string, { created: number; updated: number }>
    } catch (err) {
      console.error('Error running migration:', err)
      toast.add({
        title: 'Migration Failed',
        description: 'Failed to populate extension tables',
        color: 'red',
      })
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,

    // Read
    getPersonCrmData,
    getPersonRecruitingData,
    getPersonEmployeeData,

    // Update
    updatePersonCrmData,
    updatePersonRecruitingData,
    updatePersonEmployeeData,

    // Migration
    runMigrationToExtensionTables,
  }
}
