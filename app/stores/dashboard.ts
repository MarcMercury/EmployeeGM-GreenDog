import { defineStore } from 'pinia'
import type { StoreDashboardStats, TeamHealth, MentorshipMatch, GrowthStats, UpcomingShift } from '~/types/admin.types'

interface DashboardState {
  stats: StoreDashboardStats
  teamHealth: TeamHealth
  pendingMentorships: MentorshipMatch[]
  growthStats: GrowthStats
  upcomingShifts: UpcomingShift[]
  openShiftsCount: number
  isLoading: boolean
  error: string | null
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    stats: {
      totalStaff: 0,
      onShiftToday: 0,
      pendingRequests: 0,
      activeMentorships: 0
    },
    teamHealth: {
      compliant: 0,
      expired: 0,
      percentage: 0
    },
    pendingMentorships: [],
    growthStats: {
      leadsThisWeek: 0,
      weeklyGoal: 10,
      conversionRate: 0,
      upcomingEvents: 0
    },
    upcomingShifts: [],
    openShiftsCount: 0,
    isLoading: false,
    error: null
  }),

  actions: {
    /**
     * Fetch all dashboard data in parallel
     */
    async fetchDashboardData() {
      const supabase = useSupabaseClient()
      this.isLoading = true
      this.error = null

      try {
        // Run all queries in parallel for efficiency
        const [
          staffResult,
          clockedInResult,
          timeOffResult,
          mentorshipResult,
          certResult,
          shiftsResult,
          leadsResult,
          eventsResult
        ] = await Promise.all([
          // Total active staff
          supabase
            .from('employees')
            .select('id', { count: 'exact' })
            .eq('employment_status', 'active'),
          
          // Staff currently clocked in (today's punches)
          this.getClockedInCount(supabase),
          
          // Pending time-off requests
          supabase
            .from('time_off_requests')
            .select('id', { count: 'exact' })
            .eq('status', 'pending'),
          
          // Active mentorships
          supabase
            .from('mentorships')
            .select(`
              id,
              status,
              skill:skill_library(name),
              mentor:employees!mentorships_mentor_employee_id_fkey(first_name, last_name),
              mentee:employees!mentorships_mentee_employee_id_fkey(first_name, last_name)
            `)
            .in('status', ['pending', 'active']),
          
          // Certification compliance
          this.getCertificationStats(supabase),
          
          // Upcoming shifts (next 48 hours)
          this.getUpcomingShifts(supabase),
          
          // Leads this week
          this.getLeadsThisWeek(supabase),
          
          // Upcoming marketing events
          supabase
            .from('marketing_campaigns')
            .select('id', { count: 'exact' })
            .eq('status', 'scheduled')
            .gte('start_date', new Date().toISOString().split('T')[0])
        ])

        // Update stats
        this.stats.totalStaff = staffResult.count || 0
        this.stats.onShiftToday = clockedInResult
        this.stats.pendingRequests = timeOffResult.count || 0
        
        // Process mentorships
        const mentorships = mentorshipResult.data || []
        this.stats.activeMentorships = mentorships.filter(m => m.status === 'active').length
        this.pendingMentorships = mentorships
          .filter(m => m.status === 'pending')
          .map(m => ({
            id: m.id,
            learnerName: `${m.mentee?.first_name || ''} ${m.mentee?.last_name?.charAt(0) || ''}.`.trim(),
            skillName: m.skill?.name || 'Unknown Skill',
            mentorName: `${m.mentor?.first_name || ''} ${m.mentor?.last_name?.charAt(0) || ''}.`.trim(),
            status: m.status
          }))

        // Team health (certification compliance)
        this.teamHealth = certResult

        // Upcoming shifts
        this.upcomingShifts = shiftsResult.shifts
        this.openShiftsCount = shiftsResult.openCount

        // Growth stats
        this.growthStats.leadsThisWeek = leadsResult
        this.growthStats.upcomingEvents = eventsResult.count || 0

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load dashboard data'
        console.error('Dashboard error:', err)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Get count of employees currently clocked in
     */
    async getClockedInCount(supabase: ReturnType<typeof useSupabaseClient>): Promise<number> {
      const today = new Date().toISOString().split('T')[0]
      
      const { data } = await supabase
        .from('time_punches')
        .select('employee_id, punch_type')
        .gte('punched_at', `${today}T00:00:00`)
        .order('punched_at', { ascending: false })

      if (!data) return 0

      // Get latest punch per employee
      const latestPunches = new Map<string, string>()
      for (const punch of data) {
        if (!latestPunches.has(punch.employee_id)) {
          latestPunches.set(punch.employee_id, punch.punch_type)
        }
      }

      // Count those with 'in' as latest
      let count = 0
      for (const [, punchType] of latestPunches) {
        if (punchType === 'in') count++
      }
      return count
    },

    /**
     * Get certification compliance stats
     */
    async getCertificationStats(supabase: ReturnType<typeof useSupabaseClient>): Promise<TeamHealth> {
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          employee_certifications(
            id,
            status,
            expiration_date
          )
        `)
        .eq('employment_status', 'active')

      if (!employees) {
        return { compliant: 0, expired: 0, percentage: 0 }
      }

      const today = new Date()
      let compliantCount = 0
      let expiredCount = 0

      for (const emp of employees) {
        const certs = emp.employee_certifications || []
        const hasExpired = certs.some((c: { status?: string; expiration_date?: string }) => {
          if (c.status === 'expired') return true
          if (c.expiration_date && new Date(c.expiration_date) < today) return true
          return false
        })

        if (hasExpired) {
          expiredCount++
        } else {
          compliantCount++
        }
      }

      const total = employees.length
      const percentage = total > 0 ? Math.round((compliantCount / total) * 100) : 100

      return { compliant: compliantCount, expired: expiredCount, percentage }
    },

    /**
     * Get upcoming shifts for next 48 hours
     */
    async getUpcomingShifts(supabase: ReturnType<typeof useSupabaseClient>): Promise<{ shifts: UpcomingShift[]; openCount: number }> {
      const now = new Date()
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      const { data } = await supabase
        .from('shifts')
        .select(`
          id,
          start_at,
          end_at,
          is_open_shift,
          employee:employees(first_name, last_name),
          location:locations(name),
          department:departments(name)
        `)
        .gte('start_at', now.toISOString())
        .lte('start_at', in48Hours.toISOString())
        .in('status', ['published', 'draft'])
        .order('start_at')
        .limit(10)

      if (!data) return { shifts: [], openCount: 0 }

      let openCount = 0
      const shifts: UpcomingShift[] = data.map((shift: Record<string, unknown>) => {
        const startDate = new Date(shift.start_at)
        const endDate = new Date(shift.end_at)
        const isToday = startDate.toDateString() === now.toDateString()
        const isTomorrow = startDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
        
        if (shift.is_open_shift || !shift.employee) {
          openCount++
        }

        const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

        return {
          id: shift.id,
          date: isToday ? 'Today' : isTomorrow ? 'Tomorrow' : startDate.toLocaleDateString('en-US', { weekday: 'short' }),
          time: `${formatTime(startDate)} - ${formatTime(endDate)}`,
          employee: shift.employee ? {
            name: `${shift.employee.first_name} ${shift.employee.last_name}`,
            initials: `${shift.employee.first_name?.[0] || ''}${shift.employee.last_name?.[0] || ''}`
          } : null,
          role: shift.department?.name || 'General',
          location: shift.location?.name || 'TBD'
        }
      })

      return { shifts, openCount }
    },

    /**
     * Get leads count for this week
     */
    async getLeadsThisWeek(supabase: ReturnType<typeof useSupabaseClient>): Promise<number> {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
      startOfWeek.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('leads')
        .select('id', { count: 'exact' })
        .gte('created_at', startOfWeek.toISOString())

      return count || 0
    },

    /**
     * Approve a mentorship request
     */
    async approveMentorship(mentorshipId: string) {
      const supabase = useSupabaseClient()
      
      const { error } = await supabase
        .from('mentorships')
        .update({ status: 'active' })
        .eq('id', mentorshipId)

      if (error) throw error

      // Update local state
      const index = this.pendingMentorships.findIndex(m => m.id === mentorshipId)
      if (index > -1) {
        this.pendingMentorships.splice(index, 1)
        this.stats.activeMentorships++
      }
    },

    /**
     * Decline a mentorship request
     */
    async declineMentorship(mentorshipId: string) {
      const supabase = useSupabaseClient()
      
      const { error } = await supabase
        .from('mentorships')
        .update({ status: 'cancelled' })
        .eq('id', mentorshipId)

      if (error) throw error

      // Update local state
      const index = this.pendingMentorships.findIndex(m => m.id === mentorshipId)
      if (index > -1) {
        this.pendingMentorships.splice(index, 1)
      }
    }
  }
})
