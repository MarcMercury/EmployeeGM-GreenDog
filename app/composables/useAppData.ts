/**
 * Global App Data Composable ("Omni-Present Hydration Layer")
 * 
 * Uses Nuxt's useState for SSR-compatible global state.
 * Fetches core data ONCE on app mount and makes it available everywhere.
 * 
 * Features:
 * - TTL-based caching to reduce unnecessary refetches
 * - Selective fetching for performance optimization
 * - Automatic cache invalidation on data changes
 * - Realtime subscriptions for live updates
 * 
 * This is the single source of truth for:
 * - Employees (with positions, departments, skills)
 * - Skill Library
 * - Departments
 * - Job Positions
 * - Locations
 */

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes default TTL
const STALE_WHILE_REVALIDATE_MS = 30 * 1000 // 30 seconds for background refresh

interface CacheMetadata {
  lastFetched: number
  isStale: boolean
}

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
  manager: {
    id: string
    first_name: string
    last_name: string
    full_name: string
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

// Selective fetch options for performance
export interface FetchOptions {
  employees?: boolean
  skills?: boolean
  departments?: boolean
  positions?: boolean
  locations?: boolean
  force?: boolean  // Bypass cache
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

  // Cache metadata for each data type
  const cacheMetadata = useState<Record<string, CacheMetadata>>('appCacheMetadata', () => ({
    employees: { lastFetched: 0, isStale: true },
    skills: { lastFetched: 0, isStale: true },
    departments: { lastFetched: 0, isStale: true },
    positions: { lastFetched: 0, isStale: true },
    locations: { lastFetched: 0, isStale: true }
  }))

  // Current user identity (the "God Mode" switch)
  const currentUserProfile = useState<AppUserProfile | null>('currentUserProfile', () => null)
  const isAdmin = useState<boolean>('isAdmin', () => false)

  // Realtime subscription state
  const realtimeSubscribed = useState<boolean>('realtimeSubscribed', () => false)

  /**
   * Check if cache is valid for a data type
   */
  const isCacheValid = (dataType: string, ttl = CACHE_TTL_MS): boolean => {
    const metadata = cacheMetadata.value[dataType]
    if (!metadata) return false
    return Date.now() - metadata.lastFetched < ttl
  }

  /**
   * Check if cache is stale but still usable (for stale-while-revalidate)
   */
  const isCacheStale = (dataType: string): boolean => {
    const metadata = cacheMetadata.value[dataType]
    if (!metadata) return true
    const age = Date.now() - metadata.lastFetched
    return age > STALE_WHILE_REVALIDATE_MS && age < CACHE_TTL_MS
  }

  /**
   * Update cache metadata after fetch
   */
  const updateCacheMetadata = (dataType: string) => {
    cacheMetadata.value[dataType] = {
      lastFetched: Date.now(),
      isStale: false
    }
  }

  /**
   * Invalidate cache for a specific data type
   * Call this after mutations to trigger refetch
   */
  const invalidateCache = (dataType: 'employees' | 'skills' | 'departments' | 'positions' | 'locations' | 'all') => {
    if (dataType === 'all') {
      Object.keys(cacheMetadata.value).forEach(key => {
        cacheMetadata.value[key] = { lastFetched: 0, isStale: true }
      })
    } else {
      cacheMetadata.value[dataType] = { lastFetched: 0, isStale: true }
    }
    console.log(`[useAppData] Cache invalidated for: ${dataType}`)
  }

  /**
   * Fetch all global data in parallel
   * Supports selective fetching and caching for performance
   * 
   * @param forceOrOptions - boolean (force all) or FetchOptions for selective fetch
   */
  const fetchGlobalData = async (forceOrOptions: boolean | FetchOptions = false) => {
    // Normalize options
    const options: FetchOptions = typeof forceOrOptions === 'boolean' 
      ? { force: forceOrOptions, employees: true, skills: true, departments: true, positions: true, locations: true }
      : { employees: true, skills: true, departments: true, positions: true, locations: true, ...forceOrOptions }

    const force = options.force || false

    // Skip if already initialized and not forcing (unless specific data requested)
    if (!force && initialized.value) {
      // Check if all requested data is in valid cache
      const allCached = [
        !options.employees || isCacheValid('employees'),
        !options.skills || isCacheValid('skills'),
        !options.departments || isCacheValid('departments'),
        !options.positions || isCacheValid('positions'),
        !options.locations || isCacheValid('locations')
      ].every(Boolean)

      if (allCached) {
        console.log('[useAppData] All requested data in cache, skipping fetch')
        return
      }
    }

    // Skip if already loading
    if (loading.value) {
      console.log('[useAppData] Already loading, skipping fetch')
      return
    }

    console.log('[useAppData] Starting data fetch...')
    loading.value = true
    error.value = null

    try {
      // 1. IDENTITY CHECK: Who am I?
      // Get session directly to avoid race condition with useSupabaseUser()
      const { data: { session } } = await client.auth.getSession()
      const authUserId = session?.user?.id
      
      if (authUserId) {
        console.log('[useAppData] Fetching profile for user:', authUserId)
        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('id, email, role, avatar_url, first_name, last_name, phone')
          .eq('auth_user_id', authUserId)
          .single()
        
        console.log('[useAppData] Profile result:', profile, 'Error:', profileError)
        
        if (profile) {
          currentUserProfile.value = profile as AppUserProfile
          // Check for admin roles (admin or super_admin)
          isAdmin.value = ['admin', 'super_admin'].includes((profile as { role?: string }).role || '')
          console.log('[useAppData] isAdmin set to:', isAdmin.value)
        }
      } else {
        console.log('[useAppData] No session/user, skipping profile fetch')
      }

      // 2. DATA HYDRATION: Fetch all data in parallel for maximum speed
      // Note: Using Promise.all for maximum parallelism - selective fetching would add complexity
      // Cache validation happens at entry point; individual refetch via invalidateCache()
      const [empResult, skillResult, deptResult, posResult, locResult] = await Promise.all([
        // Employees with relations - SINGLE SOURCE OF TRUTH
        // Note: Fetch employee_skills separately to avoid ambiguous relationship
        (options.employees && (force || !isCacheValid('employees')))
          ? client
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
            manager_employee_id,
            profiles:profile_id ( id, avatar_url, role ),
            job_positions:position_id ( id, title ),
            departments:department_id ( id, name ),
            locations:location_id ( id, name ),
            manager:manager_employee_id ( id, first_name, last_name )
          `)
          .order('last_name')
          : Promise.resolve({ data: null, error: null }),

        // Skill Library
        (options.skills && (force || !isCacheValid('skills')))
          ? client
              .from('skill_library')
              .select('id, name, category, description')
              .order('category, name')
          : Promise.resolve({ data: null, error: null }),

        // Departments
        (options.departments && (force || !isCacheValid('departments')))
          ? client
              .from('departments')
              .select('id, name, code')
              .order('name')
          : Promise.resolve({ data: null, error: null }),

        // Job Positions
        (options.positions && (force || !isCacheValid('positions')))
          ? client
              .from('job_positions')
              .select('id, title')
              .order('title')
          : Promise.resolve({ data: null, error: null }),

        // Locations
        (options.locations && (force || !isCacheValid('locations')))
          ? client
              .from('locations')
              .select('id, name, city, state')
              .order('name')
          : Promise.resolve({ data: null, error: null })
      ])

      console.log('[useAppData] Employees raw result:', empResult.data?.length || 0, 'Error:', empResult.error)
      console.log('[useAppData] Skills result:', skillResult.data?.length || 0)
      console.log('[useAppData] Departments result:', deptResult.data?.length || 0)

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
            manager: emp.manager ? {
              id: emp.manager.id,
              first_name: emp.manager.first_name || '',
              last_name: emp.manager.last_name || '',
              full_name: `${emp.manager.first_name || ''} ${emp.manager.last_name || ''}`.trim()
            } : null,
            skills: [], // Skills loaded separately if needed
            initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
            tenure_months: tenureMonths
          }
        })
        updateCacheMetadata('employees')
      }

      // Process Skills
      if (skillResult.data) {
        skills.value = skillResult.data.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category || 'General',
          description: s.description
        }))
        updateCacheMetadata('skills')
      }

      // Process Departments
      if (deptResult.data) {
        departments.value = deptResult.data.map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code
        }))
        updateCacheMetadata('departments')
      }

      // Process Positions
      if (posResult.data) {
        positions.value = posResult.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          department_id: p.department_id
        }))
        updateCacheMetadata('positions')
      }

      // Process Locations
      if (locResult.data) {
        locations.value = locResult.data.map((l: any) => ({
          id: l.id,
          name: l.name,
          address: l.address
        }))
        updateCacheMetadata('locations')
      }

      initialized.value = true
      console.log(`[AppData] Hydrated: ${employees.value.length} employees, ${skills.value.length} skills, isAdmin: ${isAdmin.value}`)

      // 3. LOAD EMPLOYEE SKILLS (separate query to avoid ambiguous relationship)
      if (employees.value.length > 0) {
        console.log('[useAppData] Loading employee skills...')
        try {
          const { data: empSkills, error: skillsError } = await client
            .from('employee_skills')
            .select(`
              employee_id,
              skill_id,
              level,
              skill_library:skill_id ( id, name, category )
            `)
          
          if (skillsError) {
            console.error('[useAppData] Error loading employee skills:', skillsError)
          } else if (empSkills) {
            // Map skills to employees
            const skillsByEmployee: Record<string, any[]> = {}
            empSkills.forEach((es: any) => {
              if (!skillsByEmployee[es.employee_id]) {
                skillsByEmployee[es.employee_id] = []
              }
              skillsByEmployee[es.employee_id]!.push({
                skill_id: es.skill_id,
                skill_name: es.skill_library?.name || 'Unknown',
                category: es.skill_library?.category || 'General',
                rating: es.level || 0, // Map 'level' column to 'rating' for component compatibility
                is_goal: false // Default value - migration may not be applied
              })
            })
            
            // Update employees with their skills
            employees.value = employees.value.map(emp => ({
              ...emp,
              skills: skillsByEmployee[emp.id] || []
            }))
            
            console.log('[useAppData] Skills loaded for employees')
          }
        } catch (skillErr) {
          console.error('[useAppData] Exception loading employee skills:', skillErr)
        }
      }

    } catch (e: unknown) {
      console.error('[AppData] Fetch Error:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load app data'
    } finally {
      loading.value = false
    }
  }

  /**
   * Force refresh all data
   */
  const refresh = () => fetchGlobalData(true)

  /**
   * Subscribe to Realtime changes on employees and marketing_leads
   * Automatically refreshes data when changes are detected
   */
  const subscribeToRealtime = () => {
    if (realtimeSubscribed.value) {
      console.log('[useAppData] Already subscribed to realtime')
      return
    }

    console.log('[useAppData] Setting up realtime subscriptions...')

    // Subscribe to employees table changes
    // Use targeted updates from payload instead of full refresh
    const employeesChannel = client
      .channel('employees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => {
          console.log('[Realtime] Employee change:', payload.eventType)
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === 'DELETE' && oldRow?.id) {
            employees.value = employees.value.filter(e => e.id !== oldRow.id)
          } else if (eventType === 'UPDATE' && newRow?.id) {
            // Patch the changed fields in-place
            const idx = employees.value.findIndex(e => e.id === newRow.id)
            if (idx !== -1) {
              const existing = employees.value[idx]
              employees.value[idx] = {
                ...existing,
                first_name: newRow.first_name ?? existing.first_name,
                last_name: newRow.last_name ?? existing.last_name,
                full_name: `${newRow.first_name || existing.first_name} ${newRow.last_name || existing.last_name}`.trim(),
                email: newRow.email_work ?? existing.email,
                phone: newRow.phone_mobile ?? existing.phone,
                hire_date: newRow.hire_date ?? existing.hire_date,
                employment_status: newRow.employment_status ?? existing.employment_status,
                is_active: (newRow.employment_status ?? existing.employment_status) === 'active'
              }
            } else {
              // New employee not in list — do a targeted fetch
              refresh()
            }
          } else if (eventType === 'INSERT') {
            // For new inserts, a targeted fetch is simpler than reconstructing joins
            refresh()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Employees subscription status:', status)
      })

    // Subscribe to marketing_leads table changes
    const leadsChannel = client
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_leads' },
        (payload) => {
          console.log('[Realtime] Marketing lead change:', payload.eventType, payload.new)
          // Emit event for components to handle
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('realtime:lead-change', { 
              detail: payload 
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Leads subscription status:', status)
      })

    // Subscribe to recruiting_candidates table changes  
    const candidatesChannel = client
      .channel('candidates-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recruiting_candidates' },
        (payload) => {
          console.log('[Realtime] Candidate change:', payload.eventType, payload.new)
          // Emit event for components to handle
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('realtime:candidate-change', { 
              detail: payload 
            }))
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Candidates subscription status:', status)
      })

    realtimeSubscribed.value = true
    console.log('[useAppData] Realtime subscriptions active')

    // Return cleanup function
    return () => {
      console.log('[useAppData] Cleaning up realtime subscriptions')
      client.removeChannel(employeesChannel)
      client.removeChannel(leadsChannel)
      client.removeChannel(candidatesChannel)
      realtimeSubscribed.value = false
    }
  }

  /**
   * Unsubscribe from all realtime channels
   */
  const unsubscribeFromRealtime = () => {
    if (!realtimeSubscribed.value) return
    client.removeAllChannels()
    realtimeSubscribed.value = false
    console.log('[useAppData] Unsubscribed from realtime')
  }

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

    // Realtime
    realtimeSubscribed,
    subscribeToRealtime,
    unsubscribeFromRealtime,

    // Actions
    fetchGlobalData,
    refresh,

    // Cache Management
    invalidateCache,
    isCacheValid,
    cacheMetadata,

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
