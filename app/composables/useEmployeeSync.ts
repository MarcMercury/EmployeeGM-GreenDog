/**
 * Employee Sync Composable
 * 
 * Provides unified update functions that sync data across all related tables:
 * - employees
 * - profiles
 * - employee_compensation
 * 
 * This ensures data consistency when updates are made from any page or workflow.
 * 
 * SHARED FIELDS (synced between employees & profiles):
 * - first_name, last_name → profiles.first_name, profiles.last_name
 * - email_work → profiles.email (when updated from employees)
 * - phone_mobile → profiles.phone (when updated from employees)
 * 
 * Usage:
 *   const { updateEmployee, updateProfile, syncEmployeeEmail } = useEmployeeSync()
 *   await updateEmployee(employeeId, { first_name: 'John', last_name: 'Doe' })
 */

interface EmployeeUpdateData {
  // Basic Info
  first_name?: string
  last_name?: string
  preferred_name?: string
  employee_number?: string
  
  // Contact
  email_work?: string
  email_personal?: string
  phone_work?: string
  phone_mobile?: string
  
  // Address
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  
  // Emergency Contact
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  
  // Employment
  department_id?: string | null
  position_id?: string | null
  location_id?: string | null
  manager_employee_id?: string | null
  employment_type?: string
  employment_status?: string
  hire_date?: string | null
  termination_date?: string | null
  date_of_birth?: string | null
  notes_internal?: string
  
  // Slack
  slack_user_id?: string | null
  slack_username?: string | null
  slack_avatar_url?: string | null
}

interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  bio?: string
  avatar_url?: string
  role?: string
  is_active?: boolean
}

interface CompensationUpdateData {
  pay_type?: string
  pay_rate?: number
  employment_status?: string
  benefits_enrolled?: boolean
  bonus_plan_details?: string
  ce_budget_total?: number
  ce_budget_used?: number
  effective_date?: string
}

interface SyncResult {
  success: boolean
  error?: string
  updatedTables: string[]
}

export function useEmployeeSync() {
  const supabase = useSupabaseClient()

  /**
   * Get linked profile_id for an employee
   */
  async function getProfileIdForEmployee(employeeId: string): Promise<string | null> {
    const { data } = await supabase
      .from('employees')
      .select('profile_id')
      .eq('id', employeeId)
      .single()
    return data?.profile_id || null
  }

  /**
   * Get linked employee_id for a profile
   */
  async function getEmployeeIdForProfile(profileId: string): Promise<string | null> {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('profile_id', profileId)
      .single()
    return data?.id || null
  }

  /**
   * Update employee data and sync to related tables
   * This is the primary function for employee updates
   */
  async function updateEmployee(
    employeeId: string, 
    updates: EmployeeUpdateData,
    options?: { 
      skipProfileSync?: boolean
      logChange?: boolean 
    }
  ): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update employees table
      const { error: empError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId)
      
      if (empError) throw empError
      updatedTables.push('employees')

      // 2. Sync shared fields to profiles (if not skipped)
      if (!options?.skipProfileSync) {
        const profileId = await getProfileIdForEmployee(employeeId)
        
        if (profileId) {
          const profileUpdates: ProfileUpdateData = {}
          
          // Sync name fields
          if (updates.first_name !== undefined) profileUpdates.first_name = updates.first_name
          if (updates.last_name !== undefined) profileUpdates.last_name = updates.last_name
          
          // Sync contact fields (employees → profiles)
          if (updates.email_work !== undefined) profileUpdates.email = updates.email_work
          if (updates.phone_mobile !== undefined) profileUpdates.phone = updates.phone_mobile
          
          // Sync Slack avatar if provided
          if (updates.slack_avatar_url !== undefined) profileUpdates.avatar_url = updates.slack_avatar_url
          
          if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update(profileUpdates)
              .eq('id', profileId)
            
            if (profileError) {
              console.warn('[EmployeeSync] Profile sync warning:', profileError)
            } else {
              updatedTables.push('profiles')
            }
          }
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Update employee failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  /**
   * Update profile data and sync to related employee record
   */
  async function updateProfile(
    profileId: string, 
    updates: ProfileUpdateData,
    options?: { 
      skipEmployeeSync?: boolean 
    }
  ): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
      
      if (profileError) throw profileError
      updatedTables.push('profiles')

      // 2. Sync shared fields to employees (if not skipped)
      if (!options?.skipEmployeeSync) {
        const employeeId = await getEmployeeIdForProfile(profileId)
        
        if (employeeId) {
          const employeeUpdates: Partial<EmployeeUpdateData> = {}
          
          // Sync name fields
          if (updates.first_name !== undefined) employeeUpdates.first_name = updates.first_name
          if (updates.last_name !== undefined) employeeUpdates.last_name = updates.last_name
          
          // Sync contact fields (profiles → employees)
          if (updates.email !== undefined) employeeUpdates.email_work = updates.email
          if (updates.phone !== undefined) employeeUpdates.phone_mobile = updates.phone
          
          // Sync avatar
          if (updates.avatar_url !== undefined) employeeUpdates.slack_avatar_url = updates.avatar_url
          
          if (Object.keys(employeeUpdates).length > 0) {
            const { error: empError } = await supabase
              .from('employees')
              .update(employeeUpdates)
              .eq('id', employeeId)
            
            if (empError) {
              console.warn('[EmployeeSync] Employee sync warning:', empError)
            } else {
              updatedTables.push('employees')
            }
          }
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Update profile failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  /**
   * Update compensation data for an employee
   */
  async function updateCompensation(
    employeeId: string,
    updates: CompensationUpdateData
  ): Promise<SyncResult> {
    try {
      // Check if compensation record exists
      const { data: existing } = await supabase
        .from('employee_compensation')
        .select('id')
        .eq('employee_id', employeeId)
        .single()
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('employee_compensation')
          .update(updates)
          .eq('employee_id', employeeId)
        
        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('employee_compensation')
          .insert({ employee_id: employeeId, ...updates })
        
        if (error) throw error
      }
      
      return { success: true, updatedTables: ['employee_compensation'] }
    } catch (error: any) {
      console.error('[EmployeeSync] Update compensation failed:', error)
      return { success: false, error: error.message, updatedTables: [] }
    }
  }

  /**
   * Sync email across all related tables (employees, profiles, auth if needed)
   * This is used when email is the primary identifier being changed
   */
  async function syncEmail(
    employeeId: string,
    newEmail: string
  ): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update employees.email_work
      const { error: empError } = await supabase
        .from('employees')
        .update({ email_work: newEmail })
        .eq('id', employeeId)
      
      if (empError) throw empError
      updatedTables.push('employees')

      // 2. Get and update linked profile
      const profileId = await getProfileIdForEmployee(employeeId)
      if (profileId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: newEmail })
          .eq('id', profileId)
        
        if (profileError) {
          console.warn('[EmployeeSync] Profile email sync warning:', profileError)
        } else {
          updatedTables.push('profiles')
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Sync email failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  /**
   * Full employee update - handles employees, profiles, and compensation together
   * Use this for comprehensive edit forms like Master Roster
   */
  async function fullEmployeeUpdate(
    employeeId: string,
    employeeData: EmployeeUpdateData,
    compensationData?: CompensationUpdateData
  ): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update employee (will auto-sync to profile)
      const empResult = await updateEmployee(employeeId, employeeData)
      if (!empResult.success) throw new Error(empResult.error)
      updatedTables.push(...empResult.updatedTables)

      // 2. Update compensation if provided
      if (compensationData && Object.keys(compensationData).length > 0) {
        const compResult = await updateCompensation(employeeId, compensationData)
        if (!compResult.success) {
          console.warn('[EmployeeSync] Compensation update warning:', compResult.error)
        } else {
          updatedTables.push(...compResult.updatedTables)
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Full update failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  /**
   * Deactivate an employee - updates both employees and profiles
   */
  async function deactivateEmployee(employeeId: string): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update employee status
      const { error: empError } = await supabase
        .from('employees')
        .update({ 
          employment_status: 'terminated',
          termination_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', employeeId)
      
      if (empError) throw empError
      updatedTables.push('employees')

      // 2. Deactivate profile
      const profileId = await getProfileIdForEmployee(employeeId)
      if (profileId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_active: false })
          .eq('id', profileId)
        
        if (profileError) {
          console.warn('[EmployeeSync] Profile deactivation warning:', profileError)
        } else {
          updatedTables.push('profiles')
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Deactivate failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  /**
   * Reactivate a terminated employee
   */
  async function reactivateEmployee(employeeId: string): Promise<SyncResult> {
    const updatedTables: string[] = []
    
    try {
      // 1. Update employee status
      const { error: empError } = await supabase
        .from('employees')
        .update({ 
          employment_status: 'active',
          termination_date: null
        })
        .eq('id', employeeId)
      
      if (empError) throw empError
      updatedTables.push('employees')

      // 2. Reactivate profile
      const profileId = await getProfileIdForEmployee(employeeId)
      if (profileId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_active: true })
          .eq('id', profileId)
        
        if (profileError) {
          console.warn('[EmployeeSync] Profile reactivation warning:', profileError)
        } else {
          updatedTables.push('profiles')
        }
      }

      return { success: true, updatedTables }
    } catch (error: any) {
      console.error('[EmployeeSync] Reactivate failed:', error)
      return { success: false, error: error.message, updatedTables }
    }
  }

  return {
    // Core update functions
    updateEmployee,
    updateProfile,
    updateCompensation,
    
    // Specialized sync functions
    syncEmail,
    fullEmployeeUpdate,
    deactivateEmployee,
    reactivateEmployee,
    
    // Utility functions
    getProfileIdForEmployee,
    getEmployeeIdForProfile
  }
}
