import { defineStore } from 'pinia'
import type { MarketingEvent } from '~/types/marketing.types'

interface MarketingEventsState {
  events: MarketingEvent[]
  isLoading: boolean
  hasFetched: boolean
}

export const useMarketingEventsStore = defineStore('marketingEvents', {
  state: (): MarketingEventsState => ({
    events: [],
    isLoading: false,
    hasFetched: false,
  }),

  actions: {
    async fetchEvents(force = false) {
      if (this.hasFetched && !force) return
      this.isLoading = true
      try {
        const client = useSupabaseClient()
        const { data, error } = await client
          .from('marketing_events')
          .select('*')
          .order('event_date', { ascending: true })

        if (error) throw error
        this.events = (data as unknown as MarketingEvent[]) || []
        this.hasFetched = true
      } catch (err) {
        console.error('Error fetching marketing events:', err)
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteEvent(eventId: string) {
      const client = useSupabaseClient()
      const { data, error } = await client.rpc('delete_marketing_event' as any, {
        p_event_id: eventId,
      })

      if (error) throw error

      const result = data as any
      if (result && result.success) {
        this.events = this.events.filter((e) => e.id !== eventId)
        return result
      } else {
        throw new Error(result?.error || 'Failed to delete event')
      }
    },

    removeLocal(eventId: string) {
      this.events = this.events.filter((e) => e.id !== eventId)
    },

    updateLocal(event: MarketingEvent) {
      const idx = this.events.findIndex((e) => e.id === event.id)
      if (idx !== -1) {
        this.events[idx] = event
      } else {
        this.events.push(event)
      }
    },

    async refresh() {
      await this.fetchEvents(true)
    },
  },
})
