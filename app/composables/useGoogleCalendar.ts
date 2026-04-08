/**
 * useGoogleCalendar - Composable
 * ================================
 * Frontend composable for Google Calendar two-way sync.
 */
export function useGoogleCalendar() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const events = ref<any[]>([])

  async function fetchEvents(calendarId: string, timeMin?: string, timeMax?: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/google-calendar/events', {
        params: { calendarId, timeMin, timeMax },
      })
      events.value = result as any[]
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch calendar events'
    } finally {
      loading.value = false
    }
  }

  async function createEvent(calendarId: string, event: {
    summary: string; start: string; end: string; description?: string
  }) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/google-calendar/events', {
        method: 'POST',
        body: { calendarId, event },
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create event'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteEvent(calendarId: string, eventId: string) {
    try {
      await $fetch(`/api/integrations/google-calendar/events/${eventId}`, {
        method: 'DELETE',
        params: { calendarId },
      })
      events.value = events.value.filter(e => e.id !== eventId)
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to delete event'
    }
  }

  return { events, loading, error, fetchEvents, createEvent, deleteEvent }
}
