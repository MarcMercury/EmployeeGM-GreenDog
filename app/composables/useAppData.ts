/**
 * Global App Data Composable ("Omni-Present Hydration Layer")
 * 
 * Uses Nuxt's useState for SSR-compatible global state.
 * Fetches core data ONCE on app mount and makes it available everywhere.
 * 
 * This is the single source of truth for:
 * - Employees (with positions, departments, skills)
 * - Skill Library
 * - Departments
 * - Job Positions
 * - Locations
 */

export interface AppEmployee {
  id: string
  profile_id: string | null
  first_name: string
  last_name: string
  full_name: string
  email: string
  avatar_url: string | null
  phone: string | null
  hire_date: string | null
  employment_status: string
  is_active: boolean
  position: {
    id: string
    title: string
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
    skill_id: string
    skill_name: string
    category: string
    rating: number
    is_goal: boolean
  }[]
  // Computed helpers
  initials: string
  tenure_months: number
}

export interface AppSkill {
  id: string
  name: string
  category: string
  description: string | null
}

export interface AppDepartment {
  id: string
  name: string
  code: string | null
}

export interface AppPosition {
  id: string
  title: string
  department_id: string | null
}

export interface AppLocation {
  id: string
  name: string
  address: string | null
}

export interface AppUserProfile {
  id: string
  email: string
  role: 'admin' | 'user'
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

export const useAppData = () => {
  const user = useSupabaseUser()
  const client = useSupabaseClient()

  // Global state using useState (SSR-safe, singleton across app)
  const employees = useState<AppEmployee[]>('appEmployees', () => [])
  const skills = useState<AppSkill[]>('appSkills', () => [])
  const departments = useState<AppDepartment[]>('appDepartments', () => [])
  const positions = useState<AppPosition[]>('appPositions', () => [])
  const locations = useState<AppLocation[]>('appLocations', () => [])
  const loading = useState<boolean>('appLoading', () => false)
  const initialized = useState<boolean>('appInitialized', () => false)
  const error = useState<string | null>('appError', () => null)

  // Current user identity (the "God Mode" switch)
  const currentUserProfile = useState<AppUserProfile | null>('currentUserProfile', () => null)
  const isAdmin = useState<boolean>('isAdmin', () => false)

  /**
   * Fetch all global data in parallel
   * Called once on app mount
   */
  const fetchGlobalData = async (force = false) => {
    // Skip if already initialized (unless forced)
    if (!force && initialized.value) return

    // Skip if already loading
    if (loading.value) return

    loading.value = true
    error.value = null

    try {
      // 1. IDENTITY CHECK: Who am I?
      if (user.value) {
        const { data: profile } = await client
          .from('profiles')
          .select('id, email, role, avatar_url, first_name, last_name, phone')
          .eq('auth_user_id', user.value.id)
          .single()
        
        if (profile) {
          currentUserProfile.value = profile as AppUserProfile
          // Check explicitly for 'admin' role
          isAdmin.value = profile.role === 'admin'
        }
      }

      // 2. DATA HYDRATION: Fetch all data in parallel for maximum speed
      const [empResult, skillResult, deptResult, posResult, locResult] = await Promise.all([
        // Employees with relations - SINGLE SOURCE OF TRUTH
        client
          .from('employees')
          .select(`
            id,
            profile_id,
            first_name,
            last_name,
            email_work,
            phone_mobile,
            hire_date,
            employment_status,
            status,
            profiles:profile_id ( id, avatar_url, role ),
            job_positions:position_id ( id, title ),
            departments:department_id ( id, name ),
            locations:location_id ( id, name ),
            employee_skills ( 
              skill_id, 
              level, 
              is_goal,
              skill_library ( id, name, category )
            )
          `)
          .order('last_name'),

        // Skill Library
        client
          .from('skill_library')
          .select('id, name, category, description')
          .order('category, name'),

        // Departments
        client
          .from('departments')
          .select('id, name, code')
          .order('name'),

        // Job Positions
        client
          .from('job_positions')
          .select('id, title, department_id')
          .order('title'),

        // Locations
        client
          .from('locations')
          .select('id, name, address')
          .order('name')
      ])

      // Process Employees
      if (empResult.data) {
        employees.value = empResult.data.map((emp: any) => {
          const firstName = emp.first_name || ''
          const lastName = emp.last_name || ''
          const hireDate = emp.hire_date ? new Date(emp.hire_date) : null
          const tenureMonths = hireDate
            ? Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
            : 0

          return {
            id: emp.id,
            profile_id: emp.profile_id,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            email: emp.email_work || '',
            avatar_url: emp.profiles?.avatar_url || null,
            phone: emp.phone_mobile || null,
            hire_date: emp.hire_date,
            employment_status: emp.employment_status || emp.status || 'active',
            is_active: (emp.employment_status || emp.status) === 'active',
            position: emp.job_positions ? {
              id: emp.job_positions.id,
              title: emp.job_positions.title
            } : null,
            department: emp.departments ? {
              id: emp.departments.id,
              name: emp.departments.name
            } : null,
            location: emp.locations ? {
              id: emp.locations.id,
              name: emp.locations.name
            } : null,
            skills: (emp.employee_skills || []).map((es: any) => ({
              skill_id: es.skill_id,
              skill_name: es.skill_library?.name || 'Unknown',
              category: es.skill_library?.category || 'General',
              rating: es.level || 0,
              is_goal: es.is_goal || false
            })),
            initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
            tenure_months: tenureMonths
          }
        })
      }

      // Process Skills
      if (skillResult.data) {
        skills.value = skillResult.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description
        }))
      }

      // Process Departments
      if (deptResult.data) {
        departments.value = deptResult.data.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code
        }))
      }

      // Process Positions
      if (posResult.data) {
        positions.value = posResult.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          department_id: p.department_id
        }))
      }

      // Process Locations
      if (locResult.data) {
        locations.value = locResult.data.map((l: any) => ({
          id: l.id,
          name: l.name,
          address: l.address
        }))
      }

      initialized.value = true
      console.log(`[AppData] Hydrated: ${employees.value.length} employees, ${skills.value.length} skills, isAdmin: ${isAdmin.value}`)

    } catch (e: any) {
      console.error('[AppData] Fetch Error:', e)
      error.value = e.message || 'Failed to load app data'
    } finally {
      loading.value = false
    }
  }

  /**
   * Force refresh all data
   */
  const refresh = () => fetchGlobalData(true)

  // === HELPER METHODS ===

  /**
   * Get employee by ID
   */
  const getEmployee = (id: string) => 
    employees.value.find(e => e.id === id)

  /**
   * Get employee by profile ID
   */
  const getEmployeeByProfile = (profileId: string) =>
    employees.value.find(e => e.profile_id === profileId)

  /**
   * Get skill by ID
   */
  const getSkill = (id: string) =>
    skills.value.find(s => s.id === id)

  /**
   * Get skills by category
   */
  const getSkillsByCategory = (category: string) =>
    skills.value.filter(s => s.category === category)

  /**
   * Get all unique skill categories
   */
  const skillCategories = computed(() => 
    [...new Set(skills.value.map(s => s.category))].sort()
  )

  /**
   * Get employees by department
   */
  const getEmployeesByDepartment = (departmentId: string) =>
    employees.value.filter(e => e.department?.id === departmentId)

  /**
   * Get employees with a specific skill
   */
  const getEmployeesWithSkill = (skillId: string) =>
    employees.value.filter(e => 
      e.skills.some(s => s.skill_id === skillId)
    )

  /**
   * Get department by ID
   */
  const getDepartment = (id: string) =>
    departments.value.find(d => d.id === id)

  /**
   * Get position by ID
   */
  const getPosition = (id: string) =>
    positions.value.find(p => p.id === id)

  /**
   * Search employees by name
   */
  const searchEmployees = (query: string) => {
    const q = query.toLowerCase()
    return employees.value.filter(e => 
      e.full_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    )
  }

  return {
    // State
    employees,
    skills,
    departments,
    positions,
    locations,
    loading,
    initialized,
    error,

    // Current User Identity
    currentUserProfile,
    isAdmin,

    // Actions
    fetchGlobalData,
    refresh,

    // Getters
    getEmployee,
    getEmployeeByProfile,
    getSkill,
    getSkillsByCategory,
    skillCategories,
    getEmployeesByDepartment,
    getEmployeesWithSkill,
    getDepartment,
    getPosition,
    searchEmployees
  }
}
