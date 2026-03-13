/**
 * useEmployeeSafetyLogs
 *
 * Fetches safety/compliance logs linked to a specific employee
 * via the safety_log_employees junction table. Used in the
 * employee profile History & Notes tab.
 */
import type { SafetyLog, SafetyLogType } from '~/types/safety-log.types'
import { getSafetyLogTypeConfig } from '~/types/safety-log.types'

export interface EmployeeSafetyLog extends SafetyLog {
  employee_roles: string[]
}

export function useEmployeeSafetyLogs(employeeId: Ref<string> | string) {
  const logs = ref<EmployeeSafetyLog[]>([])
  const loading = ref(false)
  const error = ref('')

  async function fetchLogs() {
    const id = typeof employeeId === 'string' ? employeeId : employeeId.value
    if (!id) return

    loading.value = true
    error.value = ''
    try {
      const result = await $fetch<{ data: EmployeeSafetyLog[]; total: number }>(
        `/api/safety-log/by-employee/${id}`
      )
      logs.value = result.data || []
    } catch (err: any) {
      console.warn('[useEmployeeSafetyLogs] Fetch failed:', err?.message || err)
      error.value = err?.data?.message || err?.message || 'Failed to load safety logs'
      logs.value = []
    } finally {
      loading.value = false
    }
  }

  /** Get display config for a log type (icon, color, label) */
  function getLogTypeDisplay(logType: SafetyLogType) {
    const config = getSafetyLogTypeConfig(logType)
    return {
      label: config?.label || logType.replace(/_/g, ' '),
      icon: config?.icon || 'mdi-file-document',
      color: config?.color || 'grey',
    }
  }

  /** Get a human-readable role label */
  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      subject: 'Subject',
      attendee: 'Attendee',
      reporter: 'Reporter',
      reviewer: 'Reviewer',
      witness: 'Witness',
    }
    return labels[role] || role
  }

  return {
    logs,
    loading,
    error,
    fetchLogs,
    getLogTypeDisplay,
    getRoleLabel,
  }
}
