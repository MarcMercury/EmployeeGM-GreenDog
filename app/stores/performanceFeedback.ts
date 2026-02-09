import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type { Feedback } from '~/types/performance.types'

interface PerformanceFeedbackState {
  feedbackReceived: Feedback[]
  feedbackGiven: Feedback[]
  loading: boolean
  error: string | null
}

export const usePerformanceFeedbackStore = defineStore('performance-feedback', {
  state: (): PerformanceFeedbackState => ({
    feedbackReceived: [],
    feedbackGiven: [],
    loading: false,
    error: null
  }),

  getters: {
    recentFeedback: (state) =>
      [...state.feedbackReceived].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10),

    feedbackSinceDate: (state) => (date: string) =>
      state.feedbackReceived.filter(f => new Date(f.created_at) >= new Date(date))
  },

  actions: {
    async fetchFeedback() {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) return

      this.loading = true
      try {
        this.error = null
        // Fetch received feedback
        const { data: received, error: recError } = await supabase
          .from('feedback')
          .select(`
            *,
            from_employee:employees!from_employee_id(id, first_name, last_name)
          `)
          .eq('to_employee_id', authStore.profile?.id)
          .order('created_at', { ascending: false })

        if (recError) throw recError
        this.feedbackReceived = received as Feedback[]

        // Fetch given feedback
        const { data: given, error: giveError } = await supabase
          .from('feedback')
          .select(`
            *,
            to_employee:employees!to_employee_id(id, first_name, last_name)
          `)
          .eq('from_employee_id', authStore.profile?.id)
          .order('created_at', { ascending: false })

        if (giveError) throw giveError
        this.feedbackGiven = given as Feedback[]

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch feedback'
        console.error('fetchFeedback error:', err)
      } finally {
        this.loading = false
      }
    },

    async giveFeedback(
      toEmployeeId: string,
      message: string,
      type?: string,
      isPublic?: boolean
    ) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) throw new Error('Not authenticated')

      try {
        this.error = null
        const { data, error } = await supabase
          .from('feedback')
          .insert({
            from_employee_id: authStore.profile?.id,
            to_employee_id: toEmployeeId,
            message,
            type: type || 'general',
            is_public: isPublic ?? false
          })
          .select(`
            *,
            to_employee:employees!to_employee_id(id, first_name, last_name)
          `)
          .single()

        if (error) throw error
        this.feedbackGiven.unshift(data as Feedback)
        return data as Feedback
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to give feedback'
        throw err
      }
    },

    async fetchFeedbackForEmployee(employeeId: string, sinceDate?: string) {
      const supabase = useSupabaseClient()

      try {
        let query = supabase
          .from('feedback')
          .select(`
            *,
            from_employee:employees!from_employee_id(id, first_name, last_name)
          `)
          .eq('to_employee_id', employeeId)
          .order('created_at', { ascending: false })

        if (sinceDate) {
          query = query.gte('created_at', sinceDate)
        }

        const { data, error } = await query

        if (error) throw error
        return data as Feedback[]
      } catch (err) {
        console.error('fetchFeedbackForEmployee error:', err)
        return []
      }
    }
  }
})
