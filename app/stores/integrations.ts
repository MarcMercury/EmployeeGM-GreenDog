import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

// =====================================================
// TYPES
// =====================================================

export interface Notification {
  id: string
  profile_id: string
  type: string | null
  title: string | null
  body: string | null
  data: NotificationData | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface NotificationData {
  entity_type?: string
  entity_id?: string
  action_url?: string
  action_label?: string
  secondary_action_url?: string
  secondary_action_label?: string
  metadata?: Record<string, any>
}

export interface ActionItem {
  id: string
  type: 'shift_swap' | 'time_off' | 'review' | 'training' | 'mentorship' | 'timesheet' | 'promotion'
  title: string
  description: string
  entity_id: string
  entity_type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'completed' | 'dismissed'
  action_url?: string
  action_label?: string
  secondary_action_label?: string
  created_at: string
  due_date?: string
  from_employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface PromotionCriteria {
  employee_id: string
  employee_name: string
  current_position: string
  current_position_id: string
  recommended_position?: string
  recommended_position_id?: string
  current_hourly_rate?: number
  recommended_hourly_rate?: number
  rating: number
  meets_criteria: boolean
  criteria_details: {
    rating_met: boolean
    tenure_met: boolean
    skills_met: boolean
  }
}

export interface SkillRequirement {
  skill_id: string
  skill_name: string
  required_level: number
  current_level: number | null
  is_met: boolean
  course_id?: string
  course_title?: string
}

// =====================================================
// STATE
// =====================================================

interface IntegrationsState {
  notifications: Notification[]
  unreadCount: number
  actionItems: ActionItem[]
  loading: boolean
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useIntegrationsStore = defineStore('integrations', {
  state: (): IntegrationsState => ({
    notifications: [],
    unreadCount: 0,
    actionItems: [],
    loading: false,
    error: null
  }),

  getters: {
    pendingActions: (state) => state.actionItems.filter(a => a.status === 'pending'),
    
    actionsByType: (state) => (type: ActionItem['type']) => 
      state.actionItems.filter(a => a.type === type && a.status === 'pending'),
    
    urgentActions: (state) => 
      state.actionItems.filter(a => a.priority === 'urgent' && a.status === 'pending'),
    
    groupedNotifications: (state) => {
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      
      return {
        today: state.notifications.filter(n => new Date(n.created_at).toDateString() === today),
        yesterday: state.notifications.filter(n => new Date(n.created_at).toDateString() === yesterday),
        older: state.notifications.filter(n => {
          const date = new Date(n.created_at).toDateString()
          return date !== today && date !== yesterday
        })
      }
    }
  },

  actions: {
    // =====================================================
    // NOTIFICATIONS
    // =====================================================

    async fetchNotifications() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return

      const supabase = useSupabaseClient()
      this.loading = true

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('profile_id', authStore.user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        this.notifications = data as Notification[]
        this.unreadCount = data.filter(n => !n.is_read).length
      } catch (err) {
        console.error('fetchNotifications error:', err)
        this.error = err instanceof Error ? err.message : 'Failed to fetch notifications'
      } finally {
        this.loading = false
      }
    },

    async markAsRead(notificationId: string) {
      const supabase = useSupabaseClient()

      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', notificationId)

        if (error) throw error

        const notification = this.notifications.find(n => n.id === notificationId)
        if (notification && !notification.is_read) {
          notification.is_read = true
          notification.read_at = new Date().toISOString()
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      } catch (err) {
        console.error('markAsRead error:', err)
      }
    },

    async markAllAsRead() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return

      const supabase = useSupabaseClient()

      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('profile_id', authStore.user.id)
          .eq('is_read', false)

        if (error) throw error

        this.notifications.forEach(n => {
          if (!n.is_read) {
            n.is_read = true
            n.read_at = new Date().toISOString()
          }
        })
        this.unreadCount = 0
      } catch (err) {
        console.error('markAllAsRead error:', err)
      }
    },

    async createNotification(
      profileId: string,
      type: string,
      title: string,
      body: string,
      data?: NotificationData
    ) {
      const supabase = useSupabaseClient()

      try {
        const { data: notification, error } = await supabase
          .from('notifications')
          .insert({
            profile_id: profileId,
            type,
            title,
            body,
            data
          })
          .select()
          .single()

        if (error) throw error
        return notification as Notification
      } catch (err) {
        console.error('createNotification error:', err)
        return null
      }
    },

    // =====================================================
    // INTEGRATION 1: LEVEL UP LOOP (Performance → Roster → Payroll)
    // =====================================================

    async checkPromotionCriteria(reviewId: string): Promise<PromotionCriteria | null> {
      const supabase = useSupabaseClient()

      try {
        // Get the review with employee and ratings
        const { data: review, error: reviewError } = await supabase
          .from('performance_reviews')
          .select(`
            *,
            employee:employees!performance_reviews_employee_id_fkey(
              id,
              position_id,
              hire_date,
              profile:profiles(first_name, last_name),
              position:job_positions(id, title, level)
            )
          `)
          .eq('id', reviewId)
          .single()

        if (reviewError || !review) throw reviewError

        const rating = review.overall_rating || 0
        const employee = review.employee

        // Get current pay rate
        const { data: currentPay } = await supabase
          .from('employee_pay_settings')
          .select('hourly_rate')
          .eq('employee_id', employee.id)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single()

        // Check tenure (must be > 6 months for promotion)
        const hireDate = new Date(employee.hire_date)
        const monthsEmployed = Math.floor((Date.now() - hireDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
        const tenureMet = monthsEmployed >= 6

        // Check rating (must be >= 4 for promotion)
        const ratingMet = rating >= 4

        // Get next level position if available
        const currentLevel = employee.position?.level || 1
        const { data: nextPosition } = await supabase
          .from('job_positions')
          .select('id, title, level')
          .eq('level', currentLevel + 1)
          .ilike('title', `%${employee.position?.title?.replace(/\s*I+$/, '')}%`)
          .limit(1)
          .single()

        const meetsCriteria = ratingMet && tenureMet

        return {
          employee_id: employee.id,
          employee_name: `${employee.profile?.first_name} ${employee.profile?.last_name}`,
          current_position: employee.position?.title || 'Unknown',
          current_position_id: employee.position_id,
          recommended_position: nextPosition?.title,
          recommended_position_id: nextPosition?.id,
          current_hourly_rate: currentPay?.hourly_rate,
          recommended_hourly_rate: currentPay?.hourly_rate ? currentPay.hourly_rate + 2 : undefined,
          rating,
          meets_criteria: meetsCriteria,
          criteria_details: {
            rating_met: ratingMet,
            tenure_met: tenureMet,
            skills_met: true // Could add skill checks here
          }
        }
      } catch (err) {
        console.error('checkPromotionCriteria error:', err)
        return null
      }
    },

    async applyPromotion(
      employeeId: string,
      newPositionId: string,
      newHourlyRate: number,
      reviewId: string
    ) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      try {
        // 1. Update employee position
        const { error: positionError } = await supabase
          .from('employees')
          .update({ position_id: newPositionId, updated_at: new Date().toISOString() })
          .eq('id', employeeId)

        if (positionError) throw positionError

        // 2. Insert new pay rate with effective date
        const { error: payError } = await supabase
          .from('employee_pay_settings')
          .insert({
            employee_id: employeeId,
            hourly_rate: newHourlyRate,
            pay_type: 'hourly',
            effective_from: new Date().toISOString().split('T')[0]
          })

        if (payError) throw payError

        // 3. Get employee profile ID for notification
        const { data: employee } = await supabase
          .from('employees')
          .select('profile_id, position:job_positions(title), profile:profiles(first_name, last_name)')
          .eq('id', employeeId)
          .single()

        // 4. Add badge to profile (update profile badges JSONB)
        if (employee?.profile_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('badges')
            .eq('id', employee.profile_id)
            .single()

          const badges = profile?.badges || []
          badges.push({
            type: 'promotion',
            title: employee.position?.title || 'Level Up',
            awarded_at: new Date().toISOString()
          })

          await supabase
            .from('profiles')
            .update({ badges })
            .eq('id', employee.profile_id)
        }

        // 5. Create congratulations notification
        if (employee?.profile_id) {
          await this.createNotification(
            employee.profile_id,
            'promotion',
            '🎉 Congratulations on your promotion!',
            `You've been promoted to ${employee.position?.title}! Your new pay rate is $${newHourlyRate}/hr.`,
            {
              entity_type: 'review',
              entity_id: reviewId,
              action_url: '/profile',
              action_label: 'View Profile'
            }
          )
        }

        // 6. Log to audit
        await supabase.from('audit_logs').insert({
          actor_profile_id: authStore.user?.id,
          action: 'promotion_applied',
          entity_type: 'employee',
          entity_id: employeeId,
          metadata: {
            new_position_id: newPositionId,
            new_hourly_rate: newHourlyRate,
            review_id: reviewId
          }
        })

        return { success: true }
      } catch (err) {
        console.error('applyPromotion error:', err)
        return { success: false, error: err }
      }
    },

    // =====================================================
    // INTEGRATION 2: JUST-IN-TIME TRAINING (Ops → LMS → Skills)
    // =====================================================

    async checkShiftQualifications(employeeId: string, shiftDetails: {
      department_id?: string
      location_id?: string
      role_type?: string
    }): Promise<{ qualified: boolean; missing: SkillRequirement[] }> {
      const supabase = useSupabaseClient()

      try {
        // Get required skills for this shift type/department
        const { data: requiredSkills, error: skillsError } = await supabase
          .from('skill_definitions')
          .select('id, name, category')
          .or(`category.eq.${shiftDetails.role_type || 'general'},is_universal.eq.true`)

        if (skillsError) throw skillsError

        if (!requiredSkills || requiredSkills.length === 0) {
          return { qualified: true, missing: [] }
        }

        // Get employee's current skills
        const { data: employeeSkills } = await supabase
          .from('employee_skills')
          .select('skill_id, current_level')
          .eq('employee_id', employeeId)

        const employeeSkillMap = new Map(
          (employeeSkills || []).map(s => [s.skill_id, s.current_level])
        )

        // Check each required skill
        const missing: SkillRequirement[] = []
        
        for (const skill of requiredSkills) {
          const currentLevel = employeeSkillMap.get(skill.id) || null
          const requiredLevel = 2 // Default required level

          if (currentLevel === null || currentLevel < requiredLevel) {
            // Find a course that teaches this skill
            const { data: course } = await supabase
              .from('training_courses')
              .select('id, title')
              .contains('skill_ids', [skill.id])
              .limit(1)
              .single()

            missing.push({
              skill_id: skill.id,
              skill_name: skill.name,
              required_level: requiredLevel,
              current_level: currentLevel,
              is_met: false,
              course_id: course?.id,
              course_title: course?.title
            })
          }
        }

        return {
          qualified: missing.length === 0,
          missing
        }
      } catch (err) {
        console.error('checkShiftQualifications error:', err)
        return { qualified: true, missing: [] }
      }
    },

    async fastTrackTraining(employeeId: string, courseId: string, reason: string) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      try {
        // 1. Enroll in the course immediately
        const { data: enrollment, error: enrollError } = await supabase
          .from('training_enrollments')
          .insert({
            employee_id: employeeId,
            course_id: courseId,
            status: 'enrolled',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days
          })
          .select()
          .single()

        if (enrollError) throw enrollError

        // 2. Get employee profile and course info for notification
        const { data: employee } = await supabase
          .from('employees')
          .select('profile_id, profile:profiles(first_name, last_name)')
          .eq('id', employeeId)
          .single()

        const { data: course } = await supabase
          .from('training_courses')
          .select('title')
          .eq('id', courseId)
          .single()

        // 3. Create notification for employee
        if (employee?.profile_id) {
          await this.createNotification(
            employee.profile_id,
            'training_assigned',
            '📚 New Training Required',
            `You've been assigned "${course?.title}" to unlock new shift opportunities. Complete within 7 days.`,
            {
              entity_type: 'training_enrollment',
              entity_id: enrollment.id,
              action_url: `/training/${courseId}`,
              action_label: 'Start Training'
            }
          )
        }

        // 4. Log action
        await supabase.from('audit_logs').insert({
          actor_profile_id: authStore.user?.id,
          action: 'fast_track_training_assigned',
          entity_type: 'training_enrollment',
          entity_id: enrollment.id,
          metadata: {
            employee_id: employeeId,
            course_id: courseId,
            reason
          }
        })

        return { success: true, enrollment }
      } catch (err) {
        console.error('fastTrackTraining error:', err)
        return { success: false, error: err }
      }
    },

    // =====================================================
    // INTEGRATION 3: FEEDBACK FLOW (Time Clock → Performance)
    // =====================================================

    async addShiftFeedback(
      shiftId: string,
      employeeId: string,
      feedbackType: 'kudos' | 'incident',
      note?: string
    ) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      try {
        // 1. Get shift and manager info
        const { data: shift } = await supabase
          .from('shifts')
          .select('id, start_at, end_at, employee_id')
          .eq('id', shiftId)
          .single()

        if (!shift) throw new Error('Shift not found')

        // Get the from_employee (manager) ID from auth store
        const { data: managerEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.user?.id)
          .single()

        // 2. Insert feedback record
        const { data: feedback, error: feedbackError } = await supabase
          .from('feedback')
          .insert({
            from_employee_id: managerEmployee?.id,
            to_employee_id: employeeId,
            type: feedbackType,
            is_public: feedbackType === 'kudos', // Kudos visible to employee
            message: note || (feedbackType === 'kudos' ? 'Great work on this shift!' : 'Incident flagged'),
            context: {
              shift_id: shiftId,
              shift_date: shift.start_at,
              source: 'timesheet_approval'
            }
          })
          .select()
          .single()

        if (feedbackError) throw feedbackError

        // 3. If kudos, add gamification XP
        if (feedbackType === 'kudos') {
          // Add to points_log (gamification)
          await supabase.from('points_log').insert({
            employee_id: employeeId,
            action: 'shift_kudos',
            points: 10,
            awarded_by_employee_id: managerEmployee?.id,
            related_entity_type: 'feedback',
            related_entity_id: feedback.id
          })

          // Update total points on employee
          await supabase.rpc('increment_employee_points', {
            emp_id: employeeId,
            points_to_add: 10
          })
        }

        // 4. Notify employee (only for kudos)
        if (feedbackType === 'kudos') {
          const { data: employee } = await supabase
            .from('employees')
            .select('profile_id')
            .eq('id', employeeId)
            .single()

          if (employee?.profile_id) {
            await this.createNotification(
              employee.profile_id,
              'kudos',
              '👍 You received kudos!',
              `Your manager appreciated your work on ${new Date(shift.start_at).toLocaleDateString()}. +10 XP!`,
              {
                entity_type: 'feedback',
                entity_id: feedback.id,
                action_url: '/feedback',
                action_label: 'View Feedback'
              }
            )
          }
        }

        return { success: true, feedback }
      } catch (err) {
        console.error('addShiftFeedback error:', err)
        return { success: false, error: err }
      }
    },

    async getShiftFeedbackSummary(employeeId: string, sinceDate?: string) {
      const supabase = useSupabaseClient()

      try {
        let query = supabase
          .from('feedback')
          .select('*')
          .eq('to_employee_id', employeeId)
          .not('context->shift_id', 'is', null)

        if (sinceDate) {
          query = query.gte('created_at', sinceDate)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) throw error

        const kudosCount = data?.filter(f => f.type === 'kudos').length || 0
        const incidentCount = data?.filter(f => f.type === 'incident').length || 0

        return {
          items: data || [],
          kudosCount,
          incidentCount,
          totalFeedback: data?.length || 0
        }
      } catch (err) {
        console.error('getShiftFeedbackSummary error:', err)
        return { items: [], kudosCount: 0, incidentCount: 0, totalFeedback: 0 }
      }
    },

    // =====================================================
    // ACTION CENTER (Unified Task Inbox)
    // =====================================================

    async fetchActionItems() {
      const authStore = useAuthStore()
      if (!authStore.user?.id) return

      const supabase = useSupabaseClient()
      this.loading = true

      try {
        // Get manager's employee ID
        const { data: manager } = await supabase
          .from('employees')
          .select('id')
          .eq('profile_id', authStore.user.id)
          .single()

        if (!manager) {
          this.actionItems = []
          return
        }

        const items: ActionItem[] = []

        // 1. Pending shift swap requests
        const { data: shiftChanges } = await supabase
          .from('shift_changes')
          .select(`
            id, created_at, type,
            shift:shifts(id, start_at),
            from_employee:employees!shift_changes_from_employee_id_fkey(profile:profiles(first_name, last_name)),
            to_employee:employees!shift_changes_to_employee_id_fkey(profile:profiles(first_name, last_name))
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        shiftChanges?.forEach(sc => {
          items.push({
            id: `shift_${sc.id}`,
            type: 'shift_swap',
            title: 'Shift Swap Request',
            description: `${sc.from_employee?.profile?.first_name} wants to swap with ${sc.to_employee?.profile?.first_name || 'open'}`,
            entity_id: sc.id,
            entity_type: 'shift_change',
            priority: 'medium',
            status: 'pending',
            action_url: '/ops',
            action_label: 'Approve',
            secondary_action_label: 'Deny',
            created_at: sc.created_at,
            from_employee: sc.from_employee?.profile ? {
              id: '',
              first_name: sc.from_employee.profile.first_name || '',
              last_name: sc.from_employee.profile.last_name || ''
            } : undefined
          })
        })

        // 2. Pending time off requests
        const { data: timeOffRequests } = await supabase
          .from('time_off_requests')
          .select(`
            id, created_at, start_date, end_date,
            employee:employees(profile:profiles(first_name, last_name))
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        timeOffRequests?.forEach(tor => {
          items.push({
            id: `timeoff_${tor.id}`,
            type: 'time_off',
            title: 'Time Off Request',
            description: `${tor.employee?.profile?.first_name} ${tor.employee?.profile?.last_name} requested ${tor.start_date} - ${tor.end_date}`,
            entity_id: tor.id,
            entity_type: 'time_off_request',
            priority: 'medium',
            status: 'pending',
            action_url: '/time-off',
            action_label: 'Approve',
            secondary_action_label: 'Deny',
            created_at: tor.created_at,
            from_employee: tor.employee?.profile ? {
              id: '',
              first_name: tor.employee.profile.first_name || '',
              last_name: tor.employee.profile.last_name || ''
            } : undefined
          })
        })

        // 3. Reviews needing manager action
        const { data: reviews } = await supabase
          .from('performance_reviews')
          .select(`
            id, created_at, current_stage,
            employee:employees!performance_reviews_employee_id_fkey(profile:profiles(first_name, last_name))
          `)
          .eq('manager_employee_id', manager.id)
          .eq('current_stage', 'manager_review')
          .is('manager_submitted_at', null)

        reviews?.forEach(r => {
          items.push({
            id: `review_${r.id}`,
            type: 'review',
            title: 'Review Requires Sign-off',
            description: `Complete review for ${r.employee?.profile?.first_name} ${r.employee?.profile?.last_name}`,
            entity_id: r.id,
            entity_type: 'performance_review',
            priority: 'high',
            status: 'pending',
            action_url: '/reviews',
            action_label: 'Sign Now',
            created_at: r.created_at,
            from_employee: r.employee?.profile ? {
              id: '',
              first_name: r.employee.profile.first_name || '',
              last_name: r.employee.profile.last_name || ''
            } : undefined
          })
        })

        // 4. Pending mentorship requests
        const { data: mentorships } = await supabase
          .from('mentorships')
          .select(`
            id, created_at,
            mentee:employees!mentorships_mentee_employee_id_fkey(profile:profiles(first_name, last_name))
          `)
          .eq('mentor_employee_id', manager.id)
          .eq('status', 'pending')

        mentorships?.forEach(m => {
          items.push({
            id: `mentor_${m.id}`,
            type: 'mentorship',
            title: 'New Mentee Match',
            description: `${m.mentee?.profile?.first_name} ${m.mentee?.profile?.last_name} requested mentorship`,
            entity_id: m.id,
            entity_type: 'mentorship',
            priority: 'low',
            status: 'pending',
            action_url: '/mentorship',
            action_label: 'View Profile',
            created_at: m.created_at,
            from_employee: m.mentee?.profile ? {
              id: '',
              first_name: m.mentee.profile.first_name || '',
              last_name: m.mentee.profile.last_name || ''
            } : undefined
          })
        })

        // Sort by priority and date
        items.sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        this.actionItems = items
      } catch (err) {
        console.error('fetchActionItems error:', err)
        this.error = err instanceof Error ? err.message : 'Failed to fetch action items'
      } finally {
        this.loading = false
      }
    },

    async dismissActionItem(itemId: string) {
      const item = this.actionItems.find(a => a.id === itemId)
      if (item) {
        item.status = 'dismissed'
      }
    }
  }
})
