import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

// =====================================================
// TYPES
// =====================================================

export interface Goal {
  id: string
  title: string
  description: string | null
  owner_employee_id: string | null
  aligns_to_goal_id: string | null
  visibility: 'private' | 'team' | 'company'
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold'
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  progress_percent: number
  metrics: Record<string, any> | null
  created_at: string
  updated_at: string
  // Joined
  owner?: {
    id: string
    first_name: string
    last_name: string
  }
  updates?: GoalUpdate[]
}

export interface GoalUpdate {
  id: string
  goal_id: string
  employee_id: string | null
  comment: string | null
  progress_percent: number | null
  created_at: string
  // Joined
  employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface ReviewCycle {
  id: string
  name: string
  description: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  status: 'draft' | 'open' | 'in_review' | 'calibration' | 'closed'
  created_at: string
  updated_at: string
}

export interface ReviewTemplate {
  id: string
  name: string
  description: string | null
  form_schema: ReviewQuestion[]
  workflow_config: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface ReviewQuestion {
  key: string
  label: string
  type: 'text' | 'textarea' | 'rating' | 'select' | 'multiselect'
  required?: boolean
  options?: string[]
  helpText?: string
  section?: string
  forRoles?: ('employee' | 'manager')[]
}

export interface PerformanceReview {
  id: string
  review_cycle_id: string | null
  employee_id: string
  manager_employee_id: string | null
  template_id: string | null
  current_stage: 'self_review' | 'manager_review' | 'calibration' | 'delivery' | 'acknowledged' | null
  status: 'draft' | 'in_progress' | 'submitted' | 'completed' | 'cancelled'
  employee_submitted_at: string | null
  manager_submitted_at: string | null
  calibrated_rating: number | null
  overall_rating: number | null
  summary_comment: string | null
  created_at: string
  updated_at: string
  // Joined
  employee?: {
    id: string
    first_name: string
    last_name: string
    position_title?: string
  }
  manager?: {
    id: string
    first_name: string
    last_name: string
  }
  cycle?: ReviewCycle
  template?: ReviewTemplate
  responses?: ReviewResponse[]
  signoffs?: ReviewSignoff[]
}

export interface ReviewResponse {
  id: string
  performance_review_id: string
  question_key: string | null
  responder_role: string | null
  responder_employee_id: string | null
  answer_text: string | null
  answer_value: number | null
  visibility: string
  created_at: string
  updated_at: string
}

export interface ReviewSignoff {
  id: string
  performance_review_id: string
  employee_id: string
  role: string | null
  signed_at: string | null
  comment: string | null
  created_at: string
  // Joined
  employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface Feedback {
  id: string
  from_employee_id: string | null
  to_employee_id: string
  type: string | null
  is_public: boolean
  message: string | null
  context: Record<string, any> | null
  created_at: string
  // Joined
  from_employee?: {
    id: string
    first_name: string
    last_name: string
  }
  to_employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

// =====================================================
// STATE
// =====================================================

interface PerformanceState {
  // Goals
  goals: Goal[]
  currentGoal: Goal | null
  goalUpdates: GoalUpdate[]

  // Reviews
  reviewCycles: ReviewCycle[]
  currentCycle: ReviewCycle | null
  myReviews: PerformanceReview[]
  directReportReviews: PerformanceReview[]
  currentReview: PerformanceReview | null
  templates: ReviewTemplate[]

  // Feedback
  feedbackReceived: Feedback[]
  feedbackGiven: Feedback[]
  
  // UI
  loading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const usePerformanceStore = defineStore('performance', {
  state: (): PerformanceState => ({
    goals: [],
    currentGoal: null,
    goalUpdates: [],
    reviewCycles: [],
    currentCycle: null,
    myReviews: [],
    directReportReviews: [],
    currentReview: null,
    templates: [],
    feedbackReceived: [],
    feedbackGiven: [],
    loading: false,
    error: null
  }),

  getters: {
    // Goal getters
    activeGoals: (state) => state.goals.filter(g => g.status === 'active'),
    completedGoals: (state) => state.goals.filter(g => g.status === 'completed'),
    
    goalsByStatus: (state) => (status: Goal['status']) => 
      state.goals.filter(g => g.status === status),

    onTrackGoals: (state) => state.goals.filter(g => {
      if (g.status !== 'active' || !g.target_date) return true
      const now = new Date()
      const target = new Date(g.target_date)
      const start = g.start_date ? new Date(g.start_date) : new Date(g.created_at)
      const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
      return g.progress_percent >= expectedProgress - 10 // 10% grace
    }),

    atRiskGoals: (state) => state.goals.filter(g => {
      if (g.status !== 'active' || !g.target_date) return false
      const now = new Date()
      const target = new Date(g.target_date)
      const start = g.start_date ? new Date(g.start_date) : new Date(g.created_at)
      const totalDays = (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      const daysElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      const expectedProgress = Math.min((daysElapsed / totalDays) * 100, 100)
      return g.progress_percent < expectedProgress - 10
    }),

    // Review getters
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
    },

    // Feedback getters
    recentFeedback: (state) => 
      [...state.feedbackReceived].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10),

    feedbackSinceDate: (state) => (date: string) =>
      state.feedbackReceived.filter(f => new Date(f.created_at) >= new Date(date))
  },

  actions: {
    // =====================================================
    // GOALS
    // =====================================================

    async fetchGoals(employeeId?: string) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()
      const targetId = employeeId || authStore.user?.id
      
      if (!targetId) return

      this.loading = true
      try {
        const { data, error } = await supabase
          .from('goals')
          .select(`
            *,
            owner:employees!owner_employee_id(id, first_name, last_name)
          `)
          .eq('owner_employee_id', targetId)
          .order('created_at', { ascending: false })

        if (error) throw error
        this.goals = data as Goal[]
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch goals'
        console.error('fetchGoals error:', err)
      } finally {
        this.loading = false
      }
    },

    async fetchGoalWithUpdates(goalId: string) {
      const supabase = useSupabaseClient()
      this.loading = true

      try {
        // Fetch goal
        const { data: goal, error: goalError } = await supabase
          .from('goals')
          .select(`
            *,
            owner:employees!owner_employee_id(id, first_name, last_name)
          `)
          .eq('id', goalId)
          .single()

        if (goalError) throw goalError
        this.currentGoal = goal as Goal

        // Fetch updates
        const { data: updates, error: updatesError } = await supabase
          .from('goal_updates')
          .select(`
            *,
            employee:employees(id, first_name, last_name)
          `)
          .eq('goal_id', goalId)
          .order('created_at', { ascending: false })

        if (updatesError) throw updatesError
        this.goalUpdates = updates as GoalUpdate[]
        this.currentGoal.updates = updates as GoalUpdate[]

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch goal'
        console.error('fetchGoalWithUpdates error:', err)
      } finally {
        this.loading = false
      }
    },

    async createGoal(goal: Partial<Goal>) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.user?.id) throw new Error('Not authenticated')

      try {
        const { data, error } = await supabase
          .from('goals')
          .insert({
            ...goal,
            owner_employee_id: goal.owner_employee_id || authStore.user.id,
            status: goal.status || 'active',
            progress_percent: goal.progress_percent || 0
          })
          .select(`
            *,
            owner:employees!owner_employee_id(id, first_name, last_name)
          `)
          .single()

        if (error) throw error
        this.goals.unshift(data as Goal)
        return data as Goal
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create goal'
        throw err
      }
    },

    async updateGoalProgress(goalId: string, progressPercent: number, comment?: string) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.user?.id) throw new Error('Not authenticated')

      try {
        // Create update record (audit trail)
        const { data: update, error: updateError } = await supabase
          .from('goal_updates')
          .insert({
            goal_id: goalId,
            employee_id: authStore.user.id,
            progress_percent: progressPercent,
            comment: comment || null
          })
          .select(`
            *,
            employee:employees(id, first_name, last_name)
          `)
          .single()

        if (updateError) throw updateError

        // Update goal progress
        const updates: Partial<Goal> = {
          progress_percent: progressPercent,
          updated_at: new Date().toISOString()
        }

        // Auto-complete if 100%
        if (progressPercent >= 100) {
          updates.status = 'completed'
          updates.completed_at = new Date().toISOString()
        }

        const { error: goalError } = await supabase
          .from('goals')
          .update(updates)
          .eq('id', goalId)

        if (goalError) throw goalError

        // Update local state
        const goal = this.goals.find(g => g.id === goalId)
        if (goal) {
          goal.progress_percent = progressPercent
          if (progressPercent >= 100) {
            goal.status = 'completed'
            goal.completed_at = updates.completed_at!
          }
        }

        if (this.currentGoal?.id === goalId) {
          this.currentGoal.progress_percent = progressPercent
          this.goalUpdates.unshift(update as GoalUpdate)
        }

        return update as GoalUpdate
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update goal'
        throw err
      }
    },

    async updateGoal(goalId: string, updates: Partial<Goal>) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('goals')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', goalId)
          .select(`
            *,
            owner:employees!owner_employee_id(id, first_name, last_name)
          `)
          .single()

        if (error) throw error

        const index = this.goals.findIndex(g => g.id === goalId)
        if (index >= 0) {
          this.goals[index] = data as Goal
        }
        if (this.currentGoal?.id === goalId) {
          this.currentGoal = data as Goal
        }

        return data as Goal
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to update goal'
        throw err
      }
    },

    // =====================================================
    // REVIEW CYCLES
    // =====================================================

    async fetchReviewCycles() {
      const supabase = useSupabaseClient()
      this.loading = true

      try {
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

      if (!authStore.user?.id) return

      this.loading = true
      try {
        const { data, error } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            cycle:review_cycles(*),
            template:review_templates(*),
            employee:employees!employee_id(id, first_name, last_name, position_title),
            manager:employees!manager_employee_id(id, first_name, last_name)
          `)
          .eq('employee_id', authStore.user.id)
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

      if (!authStore.user?.id) return

      this.loading = true
      try {
        const { data, error } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            cycle:review_cycles(*),
            template:review_templates(*),
            employee:employees!employee_id(id, first_name, last_name, position_title),
            manager:employees!manager_employee_id(id, first_name, last_name)
          `)
          .eq('manager_employee_id', authStore.user.id)
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

      if (!authStore.user?.id) throw new Error('Not authenticated')

      try {
        const { data, error } = await supabase
          .from('review_responses')
          .upsert({
            performance_review_id: reviewId,
            question_key: questionKey,
            responder_role: role,
            responder_employee_id: authStore.user.id,
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

      if (!authStore.user?.id) throw new Error('Not authenticated')

      try {
        // Create signoff
        const { data: signoff, error: signError } = await supabase
          .from('review_signoffs')
          .insert({
            performance_review_id: reviewId,
            employee_id: authStore.user.id,
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

    // =====================================================
    // FEEDBACK
    // =====================================================

    async fetchFeedback() {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      if (!authStore.user?.id) return

      try {
        // Fetch received feedback
        const { data: received, error: recError } = await supabase
          .from('feedback')
          .select(`
            *,
            from_employee:employees!from_employee_id(id, first_name, last_name)
          `)
          .eq('to_employee_id', authStore.user.id)
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
          .eq('from_employee_id', authStore.user.id)
          .order('created_at', { ascending: false })

        if (giveError) throw giveError
        this.feedbackGiven = given as Feedback[]

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch feedback'
        console.error('fetchFeedback error:', err)
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

      if (!authStore.user?.id) throw new Error('Not authenticated')

      try {
        const { data, error } = await supabase
          .from('feedback')
          .insert({
            from_employee_id: authStore.user.id,
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
    },

    // =====================================================
    // RESET
    // =====================================================

    resetCurrentReview() {
      this.currentReview = null
    },

    resetCurrentGoal() {
      this.currentGoal = null
      this.goalUpdates = []
    }
  }
})
