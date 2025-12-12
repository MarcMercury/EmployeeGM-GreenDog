import { defineStore } from 'pinia'
import type { 
  RosterCardProps, 
  RosterDetailProps,
  RosterSkillPill,
  RosterCertification,
  RosterShift,
  RosterTimePunch,
  SkillLevel
} from '~/types/database.types'

interface RosterState {
  employees: RosterCardProps[]
  selectedEmployee: RosterDetailProps | null
  departments: { id: string; name: string; code: string | null }[]
  positions: { id: string; title: string }[]
  isLoading: boolean
  isLoadingDetail: boolean
  error: string | null
}

export const useRosterStore = defineStore('roster', {
  state: (): RosterState => ({
    employees: [],
    selectedEmployee: null,
    departments: [],
    positions: [],
    isLoading: false,
    isLoadingDetail: false,
    error: null
  }),

  getters: {
    activeEmployees: (state) => state.employees.filter(e => e.is_active),
    
    clockedInCount: (state) => state.employees.filter(e => e.clock_status === 'clocked_in').length,
    
    getEmployeeById: (state) => (id: string) => 
      state.employees.find(e => e.id === id || e.employee_id === id),
    
    employeesByDepartment: (state) => (departmentName: string) => 
      state.employees.filter(e => e.department?.name === departmentName),
    
    mentors: (state) => 
      state.employees.filter(e => e.skill_stats.mastered_count > 0),
    
    newHires: (state) => {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      return state.employees.filter(e => 
        e.hire_date && new Date(e.hire_date) > threeMonthsAgo
      )
    }
  },

  actions: {
    /**
     * Fetch all employees for the roster grid
     * Efficient single query with all joins
     */
    async fetchRoster() {
      const supabase = useSupabaseClient()
      
      this.isLoading = true
      this.error = null

      try {
        // Main roster query - efficient single request
        const { data, error } = await supabase
          .from('employees')
          .select(`
            id,
            profile_id,
            first_name,
            last_name,
            preferred_name,
            email_work,
            phone_mobile,
            hire_date,
            employment_status,
            profile:profiles!employees_profile_id_fkey (
              id,
              email,
              avatar_url,
              bio,
              role
            ),
            department:departments (
              id,
              name,
              code
            ),
            position:job_positions (
              id,
              title,
              is_manager
            ),
            location:locations (
              id,
              name,
              code
            ),
            employee_skills!employee_id (
              id,
              skill_id,
              level,
              certified_at,
              skill:skill_library (
                id,
                name,
                category
              )
            )
          `)
          .in('employment_status', ['active', 'on-leave'])
          .order('last_name')

        if (error) throw error

        // Fetch latest clock status for all employees
        const employeeIds = (data || []).map(e => e.id)
        const clockStatusMap = await this.fetchClockStatuses(employeeIds)
        
        // Fetch certification counts
        const certCountMap = await this.fetchCertificationCounts(employeeIds)

        // Transform to RosterCardProps
        this.employees = (data || []).map(emp => {
          const skills = (emp.employee_skills || []).map(es => ({
            id: es.id,
            skill_id: es.skill_id,
            name: es.skill?.name || 'Unknown',
            category: es.skill?.category || 'General',
            level: es.level as SkillLevel,
            certified_at: es.certified_at
          }))
          
          // Sort skills by level descending for top skills
          const sortedSkills = [...skills].sort((a, b) => b.level - a.level)
          
          // Calculate skill stats
          const totalSkills = skills.length
          const avgLevel = totalSkills > 0 
            ? skills.reduce((sum, s) => sum + s.level, 0) / totalSkills 
            : 0
          const masteredCount = skills.filter(s => s.level === 5).length
          
          // Calculate player level (Madden-style)
          const playerLevel = this.calculatePlayerLevel(totalSkills, avgLevel, masteredCount)
          
          return {
            id: emp.profile?.id || emp.id,
            employee_id: emp.id,
            profile_id: emp.profile_id,
            first_name: emp.first_name,
            last_name: emp.last_name,
            preferred_name: emp.preferred_name,
            email: emp.profile?.email || emp.email_work || '',
            phone: emp.phone_mobile,
            hire_date: emp.hire_date,
            employment_status: emp.employment_status,
            avatar_url: emp.profile?.avatar_url || null,
            bio: emp.profile?.bio || null,
            role: emp.profile?.role || 'user',
            position: emp.position ? {
              id: emp.position.id,
              title: emp.position.title,
              is_manager: emp.position.is_manager
            } : null,
            department: emp.department ? {
              id: emp.department.id,
              name: emp.department.name,
              code: emp.department.code
            } : null,
            location: emp.location ? {
              id: emp.location.id,
              name: emp.location.name,
              code: emp.location.code
            } : null,
            top_skills: sortedSkills.slice(0, 3),
            all_skills: sortedSkills,
            skill_stats: {
              total: totalSkills,
              average_level: Math.round(avgLevel * 10) / 10,
              mastered_count: masteredCount
            },
            player_level: playerLevel,
            clock_status: clockStatusMap.get(emp.id) || 'unknown',
            is_active: emp.employment_status === 'active',
            certifications_count: certCountMap.get(emp.id)?.total || 0,
            certifications_expiring_soon: certCountMap.get(emp.id)?.expiring || 0
          } as RosterCardProps
        })

        // Also fetch departments and positions for filters
        await this.fetchFilterOptions()

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch roster'
        console.error('Error fetching roster:', err)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch detailed employee data for the drawer
     */
    async fetchEmployeeDetail(employeeId: string) {
      const supabase = useSupabaseClient()
      
      this.isLoadingDetail = true

      try {
        // Get full employee data
        const { data: emp, error } = await supabase
          .from('employees')
          .select(`
            *,
            profile:profiles!employees_profile_id_fkey (*),
            department:departments (*),
            position:job_positions (*),
            location:locations (*),
            manager:employees!employees_manager_employee_id_fkey (
              id,
              first_name,
              last_name,
              position:job_positions (title)
            ),
            employee_skills!employee_id (
              id,
              skill_id,
              level,
              certified_at,
              notes,
              skill:skill_library (
                id,
                name,
                category
              )
            )
          `)
          .eq('id', employeeId)
          .single()

        if (error) throw error

        // Fetch certifications
        const certifications = await this.fetchEmployeeCertifications(employeeId)
        
        // Fetch upcoming shifts
        const upcomingShifts = await this.fetchUpcomingShifts(employeeId)
        
        // Fetch recent time punches
        const recentPunches = await this.fetchRecentPunches(employeeId)

        // Get clock status
        const clockStatusMap = await this.fetchClockStatuses([employeeId])

        // Transform skills
        const skills = (emp.employee_skills || []).map(es => ({
          id: es.id,
          skill_id: es.skill_id,
          name: es.skill?.name || 'Unknown',
          category: es.skill?.category || 'General',
          level: es.level as SkillLevel,
          certified_at: es.certified_at
        }))
        
        const sortedSkills = [...skills].sort((a, b) => b.level - a.level)
        const totalSkills = skills.length
        const avgLevel = totalSkills > 0 
          ? skills.reduce((sum, s) => sum + s.level, 0) / totalSkills 
          : 0
        const masteredCount = skills.filter(s => s.level === 5).length

        this.selectedEmployee = {
          id: emp.profile?.id || emp.id,
          employee_id: emp.id,
          profile_id: emp.profile_id,
          first_name: emp.first_name,
          last_name: emp.last_name,
          preferred_name: emp.preferred_name,
          email: emp.profile?.email || emp.email_work || '',
          phone: emp.phone_mobile,
          hire_date: emp.hire_date,
          employment_status: emp.employment_status,
          avatar_url: emp.profile?.avatar_url || null,
          bio: emp.profile?.bio || null,
          role: emp.profile?.role || 'user',
          position: emp.position ? {
            id: emp.position.id,
            title: emp.position.title,
            is_manager: emp.position.is_manager
          } : null,
          department: emp.department ? {
            id: emp.department.id,
            name: emp.department.name,
            code: emp.department.code
          } : null,
          location: emp.location ? {
            id: emp.location.id,
            name: emp.location.name,
            code: emp.location.code
          } : null,
          top_skills: sortedSkills.slice(0, 3),
          all_skills: sortedSkills,
          skill_stats: {
            total: totalSkills,
            average_level: Math.round(avgLevel * 10) / 10,
            mastered_count: masteredCount
          },
          player_level: this.calculatePlayerLevel(totalSkills, avgLevel, masteredCount),
          clock_status: clockStatusMap.get(employeeId) || 'unknown',
          is_active: emp.employment_status === 'active',
          certifications_count: certifications.length,
          certifications_expiring_soon: certifications.filter(c => {
            if (!c.expiration_date) return false
            const exp = new Date(c.expiration_date)
            const thirtyDays = new Date()
            thirtyDays.setDate(thirtyDays.getDate() + 30)
            return exp <= thirtyDays && exp >= new Date()
          }).length,
          // Extended detail fields
          date_of_birth: emp.date_of_birth,
          notes_internal: emp.notes_internal,
          manager: emp.manager ? {
            id: emp.manager.id,
            first_name: emp.manager.first_name,
            last_name: emp.manager.last_name,
            position_title: emp.manager.position?.title || null
          } : null,
          certifications,
          upcoming_shifts: upcomingShifts,
          recent_punches: recentPunches
        } as RosterDetailProps

        return this.selectedEmployee
      } catch (err) {
        console.error('Error fetching employee detail:', err)
        throw err
      } finally {
        this.isLoadingDetail = false
      }
    },

    /**
     * Fetch clock status for employees
     */
    async fetchClockStatuses(employeeIds: string[]): Promise<Map<string, 'clocked_in' | 'clocked_out' | 'unknown'>> {
      const supabase = useSupabaseClient()
      const statusMap = new Map<string, 'clocked_in' | 'clocked_out' | 'unknown'>()

      if (employeeIds.length === 0) return statusMap

      try {
        // Get latest punch for each employee today
        const today = new Date().toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('time_punches')
          .select('employee_id, punch_type, punched_at')
          .in('employee_id', employeeIds)
          .gte('punched_at', `${today}T00:00:00`)
          .order('punched_at', { ascending: false })

        if (error) throw error

        // Group by employee and get latest
        const latestPunches = new Map<string, { punch_type: string; punched_at: string }>()
        for (const punch of data || []) {
          if (!latestPunches.has(punch.employee_id)) {
            latestPunches.set(punch.employee_id, punch)
          }
        }

        // Set status based on latest punch
        for (const empId of employeeIds) {
          const latest = latestPunches.get(empId)
          if (latest) {
            statusMap.set(empId, latest.punch_type === 'in' ? 'clocked_in' : 'clocked_out')
          } else {
            statusMap.set(empId, 'unknown')
          }
        }
      } catch (err) {
        console.error('Error fetching clock statuses:', err)
        // Set all to unknown on error
        for (const empId of employeeIds) {
          statusMap.set(empId, 'unknown')
        }
      }

      return statusMap
    },

    /**
     * Fetch certification counts for employees
     */
    async fetchCertificationCounts(employeeIds: string[]): Promise<Map<string, { total: number; expiring: number }>> {
      const supabase = useSupabaseClient()
      const countMap = new Map<string, { total: number; expiring: number }>()

      if (employeeIds.length === 0) return countMap

      try {
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        const today = new Date().toISOString().split('T')[0]
        const thirtyDays = thirtyDaysFromNow.toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('employee_certifications')
          .select('employee_id, status, expiration_date')
          .in('employee_id', employeeIds)
          .eq('status', 'active')

        if (error) throw error

        // Count per employee
        for (const cert of data || []) {
          const existing = countMap.get(cert.employee_id) || { total: 0, expiring: 0 }
          existing.total++
          
          if (cert.expiration_date) {
            const exp = cert.expiration_date
            if (exp >= today && exp <= thirtyDays) {
              existing.expiring++
            }
          }
          
          countMap.set(cert.employee_id, existing)
        }
      } catch (err) {
        console.error('Error fetching certification counts:', err)
      }

      return countMap
    },

    /**
     * Fetch employee certifications for detail view
     */
    async fetchEmployeeCertifications(employeeId: string): Promise<RosterCertification[]> {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('employee_certifications')
          .select(`
            id,
            certification_number,
            issued_date,
            expiration_date,
            status,
            certification:certifications (
              name
            )
          `)
          .eq('employee_id', employeeId)
          .order('expiration_date', { ascending: true })

        if (error) throw error

        return (data || []).map(c => ({
          id: c.id,
          name: c.certification?.name || 'Unknown',
          certification_number: c.certification_number,
          issued_date: c.issued_date,
          expiration_date: c.expiration_date,
          status: c.status as RosterCertification['status']
        }))
      } catch (err) {
        console.error('Error fetching certifications:', err)
        return []
      }
    },

    /**
     * Fetch upcoming shifts for detail view
     */
    async fetchUpcomingShifts(employeeId: string): Promise<RosterShift[]> {
      const supabase = useSupabaseClient()

      try {
        const today = new Date().toISOString().split('T')[0]
        
        const { data, error } = await supabase
          .from('shifts')
          .select(`
            id,
            shift_date,
            start_time,
            end_time,
            status,
            location:locations (name),
            role_name
          `)
          .eq('employee_id', employeeId)
          .gte('shift_date', today)
          .order('shift_date', { ascending: true })
          .limit(5)

        if (error) throw error

        return (data || []).map(s => ({
          id: s.id,
          date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          location_name: s.location?.name || null,
          role_name: s.role_name,
          status: s.status
        }))
      } catch (err) {
        console.error('Error fetching upcoming shifts:', err)
        return []
      }
    },

    /**
     * Fetch recent time punches for detail view
     */
    async fetchRecentPunches(employeeId: string): Promise<RosterTimePunch[]> {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('time_punches')
          .select(`
            id,
            punch_type,
            punched_at,
            geofence:geofences (name)
          `)
          .eq('employee_id', employeeId)
          .order('punched_at', { ascending: false })
          .limit(10)

        if (error) throw error

        return (data || []).map(p => ({
          id: p.id,
          punch_type: p.punch_type as 'in' | 'out',
          punched_at: p.punched_at,
          location_name: p.geofence?.name || null
        }))
      } catch (err) {
        console.error('Error fetching recent punches:', err)
        return []
      }
    },

    /**
     * Fetch filter options (departments and positions)
     */
    async fetchFilterOptions() {
      const supabase = useSupabaseClient()

      try {
        const [deptResult, posResult] = await Promise.all([
          supabase.from('departments').select('id, name, code').order('name'),
          supabase.from('job_positions').select('id, title').order('title')
        ])

        this.departments = deptResult.data || []
        this.positions = posResult.data || []
      } catch (err) {
        console.error('Error fetching filter options:', err)
      }
    },

    /**
     * Endorse/upgrade an employee's skill (Admin action)
     */
    async endorseSkill(employeeId: string, skillId: string) {
      const supabase = useSupabaseClient()
      const authStore = useAuthStore()

      try {
        // Get current skill level
        const { data: current, error: fetchError } = await supabase
          .from('employee_skills')
          .select('id, level')
          .eq('employee_id', employeeId)
          .eq('skill_id', skillId)
          .single()

        if (fetchError) throw fetchError

        const newLevel = Math.min(5, (current.level || 0) + 1)

        // Update skill
        const { error: updateError } = await supabase
          .from('employee_skills')
          .update({
            level: newLevel,
            certified_at: newLevel === 5 ? new Date().toISOString() : null,
            certified_by_employee_id: newLevel === 5 ? authStore.profile?.id : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', current.id)

        if (updateError) throw updateError

        // Refresh data
        await this.fetchEmployeeDetail(employeeId)

        return true
      } catch (err) {
        console.error('Error endorsing skill:', err)
        throw err
      }
    },

    /**
     * Calculate player level (Madden-style overall rating)
     */
    calculatePlayerLevel(totalSkills: number, avgLevel: number, masteredCount: number): number {
      if (totalSkills === 0) return 50 // Base level
      
      // Base: 50
      // +2 per skill (max +20 for 10 skills)
      // +5 per mastered skill (max +25 for 5 mastered)
      // +2 per average level point (max +10 for avg 5)
      
      const skillBonus = Math.min(totalSkills * 2, 20)
      const masteryBonus = Math.min(masteredCount * 5, 25)
      const avgBonus = Math.round(avgLevel * 2)
      
      return Math.min(99, 50 + skillBonus + masteryBonus + avgBonus)
    },

    /**
     * Clear selected employee
     */
    clearSelectedEmployee() {
      this.selectedEmployee = null
    }
  }
})
