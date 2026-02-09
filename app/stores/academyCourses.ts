import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import type { TrainingCourse, TrainingEnrollment, EmployeeCertification } from '~/types/academy.types'

// =====================================================
// STATE
// =====================================================

interface AcademyCoursesState {
  courses: TrainingCourse[]
  categories: string[]
  selectedCategory: string | null
  enrollments: TrainingEnrollment[]
  myEnrollments: TrainingEnrollment[]
  myCertifications: EmployeeCertification[]
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE — Course catalog, enrollment, assignments
// =====================================================

export const useAcademyCoursesStore = defineStore('academy-courses', {
  state: (): AcademyCoursesState => ({
    courses: [],
    categories: [],
    selectedCategory: null,
    enrollments: [],
    myEnrollments: [],
    myCertifications: [],
    isLoading: false,
    error: null
  }),

  getters: {
    filteredCourses: (state) => {
      if (!state.selectedCategory) return state.courses
      return state.courses.filter(c => c.category === state.selectedCategory)
    },

    enrolledCourses: (state) => {
      const enrolledIds = state.enrollments.map(e => e.course_id)
      return state.courses.filter(c => enrolledIds.includes(c.id))
    },

    inProgressCourses: (state) => {
      return state.courses.filter(c =>
        c.enrollment?.status === 'in_progress' ||
        (c.progress_percent && c.progress_percent > 0 && c.progress_percent < 100)
      )
    },

    completedCourses: (state) => {
      return state.courses.filter(c => c.enrollment?.status === 'completed')
    },

    mandatoryCourses: (state) => {
      return state.courses.filter(c => c.is_required_for_role)
    },

    dueCoursesCount: (state) => {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return state.enrollments.filter(e => {
        if (!e.due_date || e.status === 'completed') return false
        const dueDate = new Date(e.due_date)
        return dueDate <= weekFromNow
      }).length
    }
  },

  actions: {
    // =====================================================
    // COURSE CATALOG
    // =====================================================

    async fetchCourses(employeeId?: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true
      this.error = null

      try {
        const { data: courses, error } = await supabase
          .from('training_courses')
          .select(`
            *,
            lessons:training_lessons(count),
            skill:skill_library(id, name)
          `)
          .order('title')

        if (error) throw error

        let coursesData = (courses || []).map(c => ({
          ...c,
          lessons_count: c.lessons?.[0]?.count || 0,
          skill_name: c.skill?.name || null
        })) as TrainingCourse[]

        if (employeeId) {
          const { data: enrollments } = await supabase
            .from('training_enrollments')
            .select('*')
            .eq('employee_id', employeeId)

          const { data: progressData } = await supabase
            .from('training_progress')
            .select(`
              lesson:training_lessons!inner(course_id),
              completed_at
            `)
            .eq('employee_id', employeeId)
            .not('completed_at', 'is', null)

          coursesData = coursesData.map(course => {
            const enrollment = enrollments?.find(e => e.course_id === course.id) || null
            const completedForCourse = progressData?.filter(
              p => p.lesson?.course_id === course.id
            ).length || 0
            const progressPercent = course.lessons_count
              ? Math.round((completedForCourse / course.lessons_count) * 100)
              : 0

            return {
              ...course,
              enrollment,
              progress_percent: progressPercent
            }
          })

          this.myEnrollments = (enrollments || []) as TrainingEnrollment[]
        }

        this.courses = coursesData

        const cats = new Set(coursesData.map(c => c.category).filter(Boolean))
        this.categories = Array.from(cats) as string[]

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch courses'
        console.error('fetchCourses error:', err)
      } finally {
        this.isLoading = false
      }
    },

    // =====================================================
    // ENROLLMENT
    // =====================================================

    async enrollInCourse(employeeId: string, courseId: string) {
      const supabase = useSupabaseClient()

      try {
        this.error = null
        const { data, error } = await supabase
          .from('training_enrollments')
          .insert({
            employee_id: employeeId,
            course_id: courseId,
            status: 'enrolled'
          })
          .select()
          .single()

        if (error) throw error

        this.myEnrollments.push(data as TrainingEnrollment)

        const course = this.courses.find(c => c.id === courseId)
        if (course) {
          course.enrollment = data as TrainingEnrollment
        }

        return data
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to enroll'
        throw err
      }
    },

    async enrollInCourseSimple(courseId: string) {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) throw new Error('Not authenticated')

      return this.enrollInCourse(authStore.profile?.id, courseId)
    },

    async fetchEnrollments() {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) return

      const supabase = useSupabaseClient()
      try {
        const { data, error } = await supabase
          .from('training_enrollments')
          .select('*')
          .eq('employee_id', authStore.profile?.id)
          .order('enrolled_at', { ascending: false })

        if (error) throw error
        this.enrollments = data as TrainingEnrollment[]
        this.myEnrollments = data as TrainingEnrollment[]
      } catch (err) {
        console.error('fetchEnrollments error:', err)
      }
    },

    async fetchMyEnrollments(employeeId: string) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('training_enrollments')
          .select('*')
          .eq('employee_id', employeeId)
          .order('enrolled_at', { ascending: false })

        if (error) throw error
        this.myEnrollments = data as TrainingEnrollment[]

      } catch (err) {
        console.error('fetchMyEnrollments error:', err)
      }
    },

    // =====================================================
    // COURSE COMPLETION & CERTIFICATION
    // =====================================================

    async completeCourse(employeeId: string, courseId: string) {
      const supabase = useSupabaseClient()

      try {
        const { error: enrollError } = await supabase
          .from('training_enrollments')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)
          .eq('course_id', courseId)

        if (enrollError) throw enrollError

        const course = this.courses.find(c => c.id === courseId)
        if (course) {
          const { data: cert } = await supabase
            .from('certifications')
            .select('*')
            .eq('code', course.code)
            .single()

          if (cert) {
            await this.awardCertification(employeeId, cert.id)
          }
        }

        const enrollment = this.myEnrollments.find(e => e.course_id === courseId)
        if (enrollment) {
          enrollment.status = 'completed'
        }

        const courseInList = this.courses.find(c => c.id === courseId)
        if (courseInList?.enrollment) {
          courseInList.enrollment.status = 'completed'
        }

      } catch (err) {
        console.error('completeCourse error:', err)
        throw err
      }
    },

    async awardCertification(employeeId: string, certificationId: string): Promise<EmployeeCertification | null> {
      const supabase = useSupabaseClient()

      try {
        const { data: existing } = await supabase
          .from('employee_certifications')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('certification_id', certificationId)
          .single()

        if (existing) return existing as EmployeeCertification

        const { data: cert } = await supabase
          .from('certifications')
          .select('*')
          .eq('id', certificationId)
          .single()

        let expirationDate = null
        if (cert?.validity_months) {
          const exp = new Date()
          exp.setMonth(exp.getMonth() + cert.validity_months)
          expirationDate = exp.toISOString().split('T')[0]
        }

        const { data, error } = await supabase
          .from('employee_certifications')
          .insert({
            employee_id: employeeId,
            certification_id: certificationId,
            issued_date: new Date().toISOString().split('T')[0],
            expiration_date: expirationDate,
            status: 'active'
          })
          .select(`
            *,
            certification:certifications(*)
          `)
          .single()

        if (error) throw error

        this.myCertifications.push(data as EmployeeCertification)
        return data as EmployeeCertification

      } catch (err) {
        console.error('awardCertification error:', err)
        return null
      }
    },

    async fetchMyCertifications(employeeId: string) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('employee_certifications')
          .select(`
            *,
            certification:certifications(*)
          `)
          .eq('employee_id', employeeId)
          .order('issued_date', { ascending: false })

        if (error) throw error
        this.myCertifications = data as EmployeeCertification[]

      } catch (err) {
        console.error('fetchMyCertifications error:', err)
      }
    },

    // =====================================================
    // MANAGER SIGN-OFF FUNCTIONS
    // =====================================================

    async fetchPendingSignoffs() {
      const supabase = useSupabaseClient()
      try {
        const { data, error } = await supabase
          .from('pending_course_signoffs')
          .select('*')

        if (error) throw error
        return data || []
      } catch (err) {
        console.error('fetchPendingSignoffs error:', err)
        return []
      }
    },

    async signOffCompletion(enrollmentId: string, notes?: string): Promise<{ success: boolean; message: string; skillAwarded?: boolean }> {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) throw new Error('Not authenticated')

      const supabase = useSupabaseClient()
      try {
        const { data, error } = await supabase.rpc('signoff_course_completion', {
          p_enrollment_id: enrollmentId,
          p_signoff_by: authStore.profile.id,
          p_notes: notes || null
        })

        if (error) throw error

        return {
          success: data?.success || false,
          message: data?.message || 'Unknown error',
          skillAwarded: !!data?.skill_id
        }
      } catch (err) {
        console.error('signOffCompletion error:', err)
        return { success: false, message: err instanceof Error ? err.message : 'Failed to sign off' }
      }
    },

    // =====================================================
    // COURSE ASSIGNMENT FUNCTIONS
    // =====================================================

    async assignCourseToEmployee(courseId: string, employeeId: string, dueDate?: string, requiresSignoff = false): Promise<string | null> {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase.rpc('assign_training_course_to_employee', {
          p_course_id: courseId,
          p_employee_id: employeeId,
          p_due_date: dueDate || null,
          p_assigned_by: authStore.profile?.id || null,
          p_requires_signoff: requiresSignoff
        })

        if (error) throw error
        return data
      } catch (err) {
        console.error('assignCourseToEmployee error:', err)
        return null
      }
    },

    async assignCourseToAll(courseId: string, dueDays = 30, requiresSignoff = false): Promise<number> {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase.rpc('assign_training_course_to_all', {
          p_course_id: courseId,
          p_due_days: dueDays,
          p_assigned_by: authStore.profile?.id || null,
          p_requires_signoff: requiresSignoff
        })

        if (error) throw error
        return data || 0
      } catch (err) {
        console.error('assignCourseToAll error:', err)
        return 0
      }
    },

    async assignCourseToDepartment(courseId: string, department: string, dueDays = 30, requiresSignoff = false): Promise<number> {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase.rpc('assign_training_course_to_department', {
          p_course_id: courseId,
          p_department: department,
          p_due_days: dueDays,
          p_assigned_by: authStore.profile?.id || null,
          p_requires_signoff: requiresSignoff
        })

        if (error) throw error
        return data || 0
      } catch (err) {
        console.error('assignCourseToDepartment error:', err)
        return 0
      }
    },

    async smartAssignCourse(courseId: string, skillThreshold = 3, dueDays = 30, requiresSignoff = false): Promise<number> {
      const authStore = useAuthStore()
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase.rpc('smart_assign_training_course', {
          p_course_id: courseId,
          p_skill_threshold: skillThreshold,
          p_due_days: dueDays,
          p_assigned_by: authStore.profile?.id || null,
          p_requires_signoff: requiresSignoff
        })

        if (error) throw error
        return data || 0
      } catch (err) {
        console.error('smartAssignCourse error:', err)
        return 0
      }
    }
  }
})
