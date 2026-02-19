/**
 * @deprecated Use `useAppData()` instead for employee data.
 * This composable duplicates employee data that useAppData already provides.
 * Only one consumer remains: app/pages/employees/index.vue.
 * 
 * Global Employee Data Composable ("Hydration Layer")
 * 
 * This composable provides centralized, hydrated employee data across all views.
 * Fetches employee data once on app mount and exposes it via a reactive state.
 * 
 * Features:
 * - Single Supabase query joining all core tables
 * - Reactive state accessible from any component
 * - Helper methods for quick lookups
 * - Auto-refreshes on auth state changes
 */

import type { 
  ProfileWithSkills, 
  Skill,
  EmployeeSkill 
} from '~/types/database.types'

export interface HydratedEmployee {
  id: string
  profile_id: string | null
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  avatar_url: string | null
  phone: string | null
  hire_date: string | null
  tenure_months: number
  position: {
    id: string
    title: string
    department_id: string | null
  } | null
  department: {
    id: string
    name: string
  } | null
  location: {
    id: string
    name: string
  } | null
  skills: {
    id: string
    skill_id: string
    skill_name: string
    category: string
    level: number
    certified_at: string | null
    is_goal: boolean
  }[]
  certifications: {
    id: string
    name: string
    status: 'active' | 'pending' | 'expired'
    expires_at: string | null
  }[]
  role: 'admin' | 'user'
  is_active: boolean
  employment_status: string
  // Computed helpers
  initials: string
  avg_skill_level: number
  total_skills: number
  mentor_skills: number // Skills at level 5
}

interface EmployeeDataState {
  employees: HydratedEmployee[]
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  lastFetch: string | null
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000

export function useEmployeeData() {
  // SSR-safe shared state (replaces module-level reactive singleton)
  const state = useState<EmployeeDataState>('employeeData', () => ({
    employees: [],
    isLoading: false,
    isInitialized: false,
    error: null,
    lastFetch: null
  }))

  const supabase = useSupabaseClient()
  const authStore = useAuthStore()

  /**
   * Fetch all employee data with joined tables
   * This is the single source of truth for employee data across the app
   */
  async function fetchEmployees(force = false) {
    // Skip if already loading
    if (state.value.isLoading) return

    // Use cache if valid (unless forced)
    if (!force && state.value.isInitialized && state.value.lastFetch) {
      const elapsed = Date.now() - new Date(state.value.lastFetch).getTime()
      if (elapsed < CACHE_DURATION) {
        return
      }
    }

    state.value.isLoading = true
    state.value.error = null

    try {
      // Single comprehensive query joining all core tables
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          profile_id,
          first_name,
          last_name,
          email_work,
          phone_mobile,
          phone_work,
          hire_date,
          employment_status,
          profile:profiles!employees_profile_id_fkey (
            id,
            email,
            role,
            avatar_url,
            phone
          ),
          position:job_positions (
            id,
            title,
            department_id
          ),
          department:departments (
            id,
            name
          ),
          location:locations (
            id,
            name
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
          ),
          certifications (
            id,
            name,
            status,
            expires_at
          )
        `)
        .eq('employment_status', 'active')
        .order('last_name')

      if (error) throw error

      // Transform to HydratedEmployee format
      state.value.employees = (data || []).map(emp => {
        const skills = (emp.employee_skills || []).map((es: { id: string; skill_id: string; skill?: { name?: string; category?: string }; level?: number; certified_at?: string; is_goal?: boolean }) => ({
          id: es.id,
          skill_id: es.skill_id,
          skill_name: es.skill?.name || 'Unknown',
          category: es.skill?.category || 'General',
          level: es.level || 0,
          certified_at: es.certified_at,
          is_goal: es.is_goal || false
        }))

        const certifications = (emp.certifications || []).map((cert: { id: string; name: string; status?: string; expires_at?: string }) => ({
          id: cert.id,
          name: cert.name,
          status: cert.status || 'pending',
          expires_at: cert.expires_at
        }))

        const totalSkills = skills.length
        const avgSkillLevel = totalSkills > 0
          ? skills.reduce((sum: number, s: { level: number }) => sum + s.level, 0) / totalSkills
          : 0
        const mentorSkills = skills.filter((s: { level: number }) => s.level === 5).length

        // Calculate tenure in months
        const hireDate = emp.hire_date ? new Date(emp.hire_date) : null
        const tenureMonths = hireDate
          ? Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 0

        const firstName = emp.first_name || ''
        const lastName = emp.last_name || ''

        return {
          id: emp.profile?.id || emp.id,
          profile_id: emp.profile_id,
          employee_id: emp.id,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          email: emp.profile?.email || emp.email_work || '',
          avatar_url: emp.profile?.avatar_url || null,
          phone: emp.phone_mobile || emp.phone_work || emp.profile?.phone || null,
          hire_date: emp.hire_date,
          tenure_months: tenureMonths,
          position: emp.position ? {
            id: emp.position.id,
            title: emp.position.title,
            department_id: emp.position.department_id
          } : null,
          department: emp.department ? {
            id: emp.department.id,
            name: emp.department.name
          } : null,
          location: emp.location ? {
            id: emp.location.id,
            name: emp.location.name
          } : null,
          skills,
          certifications,
          role: (emp.profile?.role as 'admin' | 'user') || 'user',
          is_active: emp.employment_status === 'active',
          employment_status: emp.employment_status || 'active',
          initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
          avg_skill_level: Math.round(avgSkillLevel * 10) / 10,
          total_skills: totalSkills,
          mentor_skills: mentorSkills
        } as HydratedEmployee
      })

      state.value.lastFetch = new Date().toISOString()
      state.value.isInitialized = true
    } catch (err) {
      state.value.error = err instanceof Error ? err.message : 'Failed to fetch employees'
      console.error('useEmployeeData: Error fetching employees:', err)
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Get employee by ID (profile_id or employee_id)
   */
  function getEmployeeById(id: string): HydratedEmployee | undefined {
    return state.value.employees.find(e => e.id === id || e.employee_id === id || e.profile_id === id)
  }

  /**
   * Get employee by profile ID
   */
  function getEmployeeByProfileId(profileId: string): HydratedEmployee | undefined {
    return state.value.employees.find(e => e.profile_id === profileId || e.id === profileId)
  }

  /**
   * Get employees by department
   */
  function getEmployeesByDepartment(departmentId: string): HydratedEmployee[] {
    return state.value.employees.filter(e => e.department?.id === departmentId)
  }

  /**
   * Get employees with a specific skill
   */
  function getEmployeesWithSkill(skillId: string, minLevel = 1): HydratedEmployee[] {
    return state.value.employees.filter(e => 
      e.skills.some(s => s.skill_id === skillId && s.level >= minLevel)
    )
  }

  /**
   * Get mentors (employees with any skill at level 5)
   */
  function getMentors(): HydratedEmployee[] {
    return state.value.employees.filter(e => e.mentor_skills > 0)
  }

  /**
   * Get skill rating for an employee
   */
  function getEmployeeSkillRating(employeeId: string, skillId: string): number {
    const emp = getEmployeeById(employeeId)
    if (!emp) return 0
    const skill = emp.skills.find(s => s.skill_id === skillId)
    return skill?.level || 0
  }

  /**
   * Get average skill level for an employee
   */
  function getEmployeeAvgSkillLevel(employeeId: string): number {
    const emp = getEmployeeById(employeeId)
    return emp?.avg_skill_level || 0
  }

  /**
   * Create a name map for quick lookups (useful for schedules)
   */
  const employeeNameMap = computed(() => {
    const map: Record<string, string> = {}
    for (const emp of state.value.employees) {
      map[emp.id] = emp.full_name
      if (emp.profile_id) map[emp.profile_id] = emp.full_name
      map[emp.employee_id] = emp.full_name
    }
    return map
  })

  /**
   * Create avatar map for quick lookups
   */
  const employeeAvatarMap = computed(() => {
    const map: Record<string, string | null> = {}
    for (const emp of state.value.employees) {
      map[emp.id] = emp.avatar_url
      if (emp.profile_id) map[emp.profile_id] = emp.avatar_url
      map[emp.employee_id] = emp.avatar_url
    }
    return map
  })

  /**
   * Get all unique departments
   */
  const departments = computed(() => {
    const depts = new Map<string, { id: string; name: string }>()
    for (const emp of state.value.employees) {
      if (emp.department) {
        depts.set(emp.department.id, emp.department)
      }
    }
    return Array.from(depts.values())
  })

  /**
   * Get all unique positions
   */
  const positions = computed(() => {
    const pos = new Map<string, { id: string; title: string }>()
    for (const emp of state.value.employees) {
      if (emp.position) {
        pos.set(emp.position.id, { id: emp.position.id, title: emp.position.title })
      }
    }
    return Array.from(pos.values())
  })

  /**
   * Refresh data manually
   */
  async function refresh() {
    await fetchEmployees(true)
  }

  /**
   * Initialize on first use - call this from app.vue or default layout
   */
  async function initialize() {
    if (!state.value.isInitialized && !state.value.isLoading) {
      await fetchEmployees()
    }
  }

  // Computed getters
  const employees = computed(() => state.value.employees)
  const isLoading = computed(() => state.value.isLoading)
  const isInitialized = computed(() => state.value.isInitialized)
  const error = computed(() => state.value.error)
  const employeeCount = computed(() => state.value.employees.length)

  // Active employees only
  const activeEmployees = computed(() => 
    state.value.employees.filter(e => e.is_active)
  )

  // Employees sorted by name
  const employeesSortedByName = computed(() => 
    [...state.value.employees].sort((a, b) => a.full_name.localeCompare(b.full_name))
  )

  // Select options for dropdowns
  const employeeSelectOptions = computed(() => 
    state.value.employees.map(e => ({
      value: e.id,
      title: e.full_name,
      subtitle: e.position?.title || 'No position'
    }))
  )

  return {
    // State
    employees,
    activeEmployees,
    employeesSortedByName,
    isLoading,
    isInitialized,
    error,
    employeeCount,
    
    // Lookup maps
    employeeNameMap,
    employeeAvatarMap,
    departments,
    positions,
    employeeSelectOptions,
    
    // Methods
    fetchEmployees,
    initialize,
    refresh,
    getEmployeeById,
    getEmployeeByProfileId,
    getEmployeesByDepartment,
    getEmployeesWithSkill,
    getMentors,
    getEmployeeSkillRating,
    getEmployeeAvgSkillLevel
  }
}
