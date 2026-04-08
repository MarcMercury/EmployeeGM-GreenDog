/**
 * useClockify - Composable
 * ==========================
 * Frontend composable for Clockify time tracking.
 */
export function useClockify() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeTimer = ref<any | null>(null)
  const timeEntries = ref<any[]>([])

  async function fetchTimeEntries(options?: { start?: string; end?: string }) {
    loading.value = true
    error.value = null
    try {
      timeEntries.value = await $fetch('/api/integrations/clockify/time-entries', {
        params: options,
      }) as any[]
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch time entries'
    } finally {
      loading.value = false
    }
  }

  async function startTimer(description?: string, projectId?: string) {
    error.value = null
    try {
      activeTimer.value = await $fetch('/api/integrations/clockify/timer', {
        method: 'POST',
        body: { description, projectId },
      })
      return activeTimer.value
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to start timer'
      return null
    }
  }

  async function stopTimer() {
    error.value = null
    try {
      const result = await $fetch('/api/integrations/clockify/timer', { method: 'PATCH' })
      activeTimer.value = null
      return result
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to stop timer'
      return null
    }
  }

  async function getReport(startDate: string, endDate: string) {
    loading.value = true
    try {
      return await $fetch('/api/integrations/clockify/report', {
        params: { startDate, endDate },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to get report'
      return null
    } finally {
      loading.value = false
    }
  }

  return { timeEntries, activeTimer, loading, error, fetchTimeEntries, startTimer, stopTimer, getReport }
}
