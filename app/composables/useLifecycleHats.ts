/**
 * Sub-composable for "Add Hat" and Access Management operations
 *
 * Handles adding CRM / Recruiting / Employee roles ("hats") to a person,
 * and granting or revoking system access.
 */

import type {
  AddCrmHatRequest,
  AddRecruitingHatRequest,
  AddEmployeeHatRequest,
  GrantAccessRequest,
  RevokeAccessRequest,
} from '~/types/lifecycle.types'

export function useLifecycleHats() {
  const toast = useToast()
  const supabase = useSupabaseClient()

  const loading = ref(false)

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
          p_notes: request.notes,
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'CRM Data Added',
        description: 'Person is now a tracked lead',
        color: 'green',
      })

      return data as string
    } catch (err) {
      console.error('Error adding CRM hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to add CRM data',
        color: 'red',
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
          p_resume_url: request.resumeUrl,
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Recruiting Data Added',
        description: 'Person is now an applicant',
        color: 'green',
      })

      return data as string
    } catch (err) {
      console.error('Error adding recruiting hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to add recruiting data',
        color: 'red',
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
          p_pay_type: request.payType || 'hourly',
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Employee Created',
        description: 'Person is now an employee',
        color: 'green',
      })

      return data as string
    } catch (err) {
      console.error('Error adding employee hat:', err)
      toast.add({
        title: 'Error',
        description: 'Failed to create employee',
        color: 'red',
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
          p_send_welcome_email: request.sendWelcomeEmail ?? true,
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Access Granted',
        description: 'Person can now log into the system',
        color: 'green',
      })

      return data as string
    } catch (err: unknown) {
      console.error('Error granting access:', err)
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to grant access',
        color: 'red',
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
          p_reason: request.reason,
        })

      if (rpcError) throw rpcError

      toast.add({
        title: 'Access Revoked',
        description: 'Person can no longer log into the system',
        color: 'orange',
      })

      return true
    } catch (err: unknown) {
      console.error('Error revoking access:', err)
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to revoke access',
        color: 'red',
      })
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    loading,

    // Add Hats
    addCrmHat,
    addRecruitingHat,
    addEmployeeHat,

    // Access Management
    grantAccess,
    revokeAccess,
  }
}
