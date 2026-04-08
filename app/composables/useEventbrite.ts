/**
 * useEventbrite - Composable
 * ============================
 * Frontend composable for Eventbrite event management.
 */
export function useEventbrite() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const events = ref<any[]>([])
  const attendees = ref<any[]>([])

  async function fetchEvents(status?: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch('/api/integrations/eventbrite/events', {
        params: { status },
      })
      events.value = (result as any)?.events || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch events'
    } finally {
      loading.value = false
    }
  }

  async function createEvent(event: {
    name: string; description?: string; start: string; end: string; timezone: string; capacity?: number
  }) {
    loading.value = true
    error.value = null
    try {
      return await $fetch('/api/integrations/eventbrite/events', {
        method: 'POST',
        body: event,
      })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to create event'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchAttendees(eventId: string) {
    loading.value = true
    error.value = null
    try {
      const result = await $fetch(`/api/integrations/eventbrite/events/${eventId}/attendees`)
      attendees.value = (result as any)?.attendees || []
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to fetch attendees'
    } finally {
      loading.value = false
    }
  }

  return { events, attendees, loading, error, fetchEvents, createEvent, fetchAttendees }
}
