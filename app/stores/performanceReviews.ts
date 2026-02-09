import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type { ReviewCycle, ReviewTemplate, PerformanceReview, ReviewResponse, ReviewSignoff } from '~/types/performance.types'

interface PerformanceReviewsState {
  reviewCycles: ReviewCycle[]
  currentCycle: ReviewCycle | null
  myReviews: PerformanceReview[]
  directReportReviews: PerformanceReview[]
  currentReview: PerformanceReview | null
  templates: ReviewTemplate[]
  loading: boolean
  error: string | null
}

export const usePerformanceReviewsStore = defineStore('performance-reviews', {
  state: (): PerformanceReviewsState => ({
    reviewCycles: [],
    currentCycle: null,
    myReviews: [],
    directReportReviews: [],
    currentReview: null,
    templates: [],
    loading: false,
    error: null
  }),

  getters: {
    activeCycle: (state) =>
      state.reviewCycles.find(c => c.status === 'open' || c.status === 'in_review'),

    pendingReviews: (state) =>
      state.myReviews.filter(r => r.status !== 'completed' && r.status !== 'cancelled'),

    pendingDirectReportReviews: (state) =>
      state.directReportReviews.filter(r =>
        r.current_stage === 'manager_review' ||
        (r.status === 'submitted' && !r.manager_submitted_at)
      ),

    reviewNeedsSignoff: (state) => (reviewId: string) => {
      const review = state.myReviews.find(r => r.id === reviewId) ||
                     state.directReportReviews.find(r => r.id === reviewId)
      if (!review) return false
      return review.current_stage === 'delivery' || review.current_stage === 'acknowledged'
    }
  },

  actions: {
    // =====================================================
    // REVIEW CYCLES
    // =====================================================

    async fetchReviewCycles() {
      const supabase = useSupabaseClient()
      this.loading = true

      try {
        this.error = null
        const { data, error } = await supabase
          .from('review_cycles')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        this.reviewCycles = data as ReviewCycle[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch cycles'
        console.error('fetchReviewCycles error:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchTemplates() {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('review_templates')
          .select('*')
          .order('name')

        if (error) throw error
        this.templates = data as ReviewTemplate[]
      } catch (err) {
        console.error('fetchTemplates error:', err)
      }
    },

    // =====================================================
    // PERFORMANCE REVIEWS
    // =====================================================

    async fetchMyReviews() {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) return

      this.loading = true
      try {
        this.error = null
        const { data, error } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            cycle:review_cycles(*),
            template:review_templates(*),
            employee:employees!employee_id(id, first_name, last_name, position_title),
            manager:employees!manager_employee_id(id, first_name, last_name)
          `)
          .eq('employee_id', authStore.profile?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        this.myReviews = data as PerformanceReview[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch reviews'
        console.error('fetchMyReviews error:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchDirectReportReviews() {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) return

      this.loading = true
      try {
        this.error = null
        const { data, error } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            cycle:review_cycles(*),
            template:review_templates(*),
            employee:employees!employee_id(id, first_name, last_name, position_title),
            manager:employees!manager_employee_id(id, first_name, last_name)
          `)
          .eq('manager_employee_id', authStore.profile?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        this.directReportReviews = data as PerformanceReview[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch direct report reviews'
        console.error('fetchDirectReportReviews error:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchReviewWithResponses(reviewId: string) {
      const supabase = useSupabaseClient()
      this.loading = true

      try {
        this.error = null
        // Fetch review
        const { data: review, error: reviewError } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            cycle:review_cycles(*),
            template:review_templates(*),
            employee:employees!employee_id(id, first_name, last_name, position_title),
            manager:employees!manager_employee_id(id, first_name, last_name)
          `)
          .eq('id', reviewId)
          .single()

        if (reviewError) throw reviewError

        // Fetch responses
        const { data: responses, error: respError } = await supabase
          .from('review_responses')
          .select('*')
          .eq('performance_review_id', reviewId)

        if (respError) throw respError

        // Fetch signoffs
        const { data: signoffs, error: signError } = await supabase
          .from('review_signoffs')
          .select(`
            *,
            employee:employees(id, first_name, last_name)
          `)
          .eq('performance_review_id', reviewId)

        if (signError) throw signError

        this.currentReview = {
          ...review,
          responses: responses,
          signoffs: signoffs
        } as PerformanceReview

        return this.currentReview
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch review'
        console.error('fetchReviewWithResponses error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async saveReviewResponse(
      reviewId: string,
      questionKey: string,
      role: 'employee' | 'manager',
      answerText?: string,
      answerValue?: number
    ) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) throw new Error('Not authenticated')

      try {
        this.error = null
        const { data, error } = await supabase
          .from('review_responses')
          .upsert({
            performance_review_id: reviewId,
            question_key: questionKey,
            responder_role: role,
            responder_employee_id: authStore.profile?.id,
            answer_text: answerText || null,
            answer_value: answerValue ?? null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'performance_review_id,question_key,responder_role'
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        if (this.currentReview?.id === reviewId) {
          const existing = this.currentReview.responses?.findIndex(
            r => r.question_key === questionKey && r.responder_role === role
          )
          if (existing !== undefined && existing >= 0) {
            this.currentReview.responses![existing] = data as ReviewResponse
          } else {
            this.currentReview.responses = this.currentReview.responses || []
            this.currentReview.responses.push(data as ReviewResponse)
          }
        }

        return data as ReviewResponse
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to save response'
        throw err
      }
    },

    async submitSelfReview(reviewId: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('performance_reviews')
          .update({
            current_stage: 'manager_review',
            status: 'submitted',
            employee_submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewId)
          .select()
          .single()

        if (error) throw error

        // Update local state
        const review = this.myReviews.find(r => r.id === reviewId)
        if (review) {
          review.current_stage = 'manager_review'
          review.status = 'submitted'
          review.employee_submitted_at = data.employee_submitted_at
        }
        if (this.currentReview?.id === reviewId) {
          this.currentReview.current_stage = 'manager_review'
          this.currentReview.status = 'submitted'
          this.currentReview.employee_submitted_at = data.employee_submitted_at
        }

        return data as PerformanceReview
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to submit review'
        throw err
      }
    },

    async submitManagerReview(reviewId: string, overallRating?: number, summaryComment?: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('performance_reviews')
          .update({
            current_stage: 'delivery',
            manager_submitted_at: new Date().toISOString(),
            overall_rating: overallRating ?? null,
            summary_comment: summaryComment || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewId)
          .select()
          .single()

        if (error) throw error

        // Update local state
        const review = this.directReportReviews.find(r => r.id === reviewId)
        if (review) {
          review.current_stage = 'delivery'
          review.manager_submitted_at = data.manager_submitted_at
          review.overall_rating = overallRating ?? null
        }
        if (this.currentReview?.id === reviewId) {
          this.currentReview.current_stage = 'delivery'
          this.currentReview.manager_submitted_at = data.manager_submitted_at
          this.currentReview.overall_rating = overallRating ?? null
        }

        return data as PerformanceReview
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to submit manager review'
        throw err
      }
    },

    // =====================================================
    // SIGN-OFFS
    // =====================================================

    async signReview(reviewId: string, role: 'employee' | 'manager', comment?: string) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.profile?.id) throw new Error('Not authenticated')

      try {
        this.error = null
        // Create signoff
        const { data: signoff, error: signError } = await supabase
          .from('review_signoffs')
          .insert({
            performance_review_id: reviewId,
            employee_id: authStore.profile?.id,
            role,
            signed_at: new Date().toISOString(),
            comment: comment || null
          })
          .select(`
            *,
            employee:employees(id, first_name, last_name)
          `)
          .single()

        if (signError) throw signError

        // Update local state
        if (this.currentReview?.id === reviewId) {
          this.currentReview.signoffs = this.currentReview.signoffs || []
          this.currentReview.signoffs.push(signoff as ReviewSignoff)

          // Check if both parties have signed
          const hasEmployeeSign = this.currentReview.signoffs.some(s => s.role === 'employee')
          const hasManagerSign = this.currentReview.signoffs.some(s => s.role === 'manager')

          if (hasEmployeeSign && hasManagerSign) {
            // Mark review as completed
            await this.completeReview(reviewId)
          }
        }

        return signoff as ReviewSignoff
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to sign review'
        throw err
      }
    },

    async completeReview(reviewId: string) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('performance_reviews')
          .update({
            current_stage: 'acknowledged',
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewId)
          .select()
          .single()

        if (error) throw error

        // Update local states
        const myReview = this.myReviews.find(r => r.id === reviewId)
        if (myReview) {
          myReview.current_stage = 'acknowledged'
          myReview.status = 'completed'
        }

        const drReview = this.directReportReviews.find(r => r.id === reviewId)
        if (drReview) {
          drReview.current_stage = 'acknowledged'
          drReview.status = 'completed'
        }

        if (this.currentReview?.id === reviewId) {
          this.currentReview.current_stage = 'acknowledged'
          this.currentReview.status = 'completed'
        }

        return data as PerformanceReview
      } catch (err) {
        console.error('completeReview error:', err)
        throw err
      }
    },

    resetCurrentReview() {
      this.currentReview = null
    }
  }
})
