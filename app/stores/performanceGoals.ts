import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useUserStore } from './user'
import type { Goal, GoalUpdate } from '~/types/performance.types'

interface PerformanceGoalsState {
  goals: Goal[]
  currentGoal: Goal | null
  goalUpdates: GoalUpdate[]
  loading: boolean
  error: string | null
}

export const usePerformanceGoalsStore = defineStore('performance-goals', {
  state: (): PerformanceGoalsState => ({
    goals: [],
    currentGoal: null,
    goalUpdates: [],
    loading: false,
    error: null
  }),

  getters: {
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
    })
  },

  actions: {
    async fetchGoals(employeeId?: string) {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()
      const targetId = employeeId || authStore.profile?.id

      if (!targetId) return

      this.loading = true
      try {
        this.error = null
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
        this.error = null
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
      const userStore = useUserStore()
      const supabase = useSupabaseClient()

      // Get employee ID from userStore, not authStore.profile?.id (which is profile ID)
      const employeeId = goal.owner_employee_id || userStore.employee?.id

      if (!employeeId) throw new Error('Not authenticated or no employee record found')

      try {
        this.error = null
        const { data, error } = await supabase
          .from('goals')
          .insert({
            ...goal,
            owner_employee_id: employeeId,
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
      const userStore = useUserStore()
      const supabase = useSupabaseClient()

      const employeeId = userStore.employee?.id
      if (!employeeId) throw new Error('Not authenticated or no employee record found')

      try {
        this.error = null
        // Create update record (audit trail)
        const { data: update, error: updateError } = await supabase
          .from('goal_updates')
          .insert({
            goal_id: goalId,
            employee_id: employeeId,
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
        this.error = null
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

    resetCurrentGoal() {
      this.currentGoal = null
      this.goalUpdates = []
    }
  }
})
