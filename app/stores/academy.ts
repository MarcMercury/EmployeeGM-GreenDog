import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

// =====================================================
// TYPES
// =====================================================

export interface TrainingCourse {
  id: string
  code: string | null
  title: string
  description: string | null
  category: string | null
  estimated_hours: number | null
  is_required_for_role: boolean
  required_for_position_ids: string[] | null
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
  // Computed/joined
  lessons_count?: number
  enrollment?: TrainingEnrollment | null
  progress_percent?: number
}

export interface TrainingLesson {
  id: string
  course_id: string
  title: string
  content: string | null
  video_url: string | null
  file_id: string | null
  position: number
  created_at: string
  updated_at: string
  // Computed/joined
  progress?: TrainingProgress | null
  quiz?: TrainingQuiz | null
}

export interface TrainingEnrollment {
  id: string
  employee_id: string
  course_id: string
  enrolled_at: string
  due_date: string | null
  status: 'enrolled' | 'in_progress' | 'completed' | 'expired' | 'dropped'
  created_at: string
  updated_at: string
}

export interface TrainingProgress {
  id: string
  employee_id: string
  lesson_id: string
  started_at: string | null
  completed_at: string | null
  progress_percent: number
  created_at: string
  updated_at: string
}

export interface TrainingQuiz {
  id: string
  course_id: string | null
  lesson_id: string | null
  title: string
  instructions: string | null
  passing_score: number
  created_at: string
  updated_at: string
}

export interface TrainingQuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_type: 'multiple_choice' | 'multi_select' | 'true_false'
  options: { id: string; text: string }[]
  correct_answer: string | string[] // Option ID(s)
  position: number
  created_at: string
}

export interface TrainingQuizAttempt {
  id: string
  quiz_id: string
  employee_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  passed: boolean | null
  answers: Record<string, string | string[]> // questionId -> answerId(s)
  created_at: string
}

export interface Certification {
  id: string
  name: string
  code: string | null
  description: string | null
  issuing_authority: string | null
  validity_months: number | null
  is_required: boolean
  created_at: string
}

export interface EmployeeCertification {
  id: string
  employee_id: string
  certification_id: string
  certification_number: string | null
  issued_date: string | null
  expiration_date: string | null
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'renewal_pending'
  created_at: string
  // Joined
  certification?: Certification
}

// =====================================================
// STATE
// =====================================================

interface AcademyState {
  // Course catalog
  courses: TrainingCourse[]
  categories: string[]
  selectedCategory: string | null
  
  // Current course/classroom
  currentCourse: TrainingCourse | null
  currentLessons: TrainingLesson[]
  currentLessonIndex: number
  
  // All data (for simpler component access)
  lessons: TrainingLesson[]
  enrollments: TrainingEnrollment[]
  progress: TrainingProgress[]
  quizzes: TrainingQuiz[]
  quizAttempts: TrainingQuizAttempt[]
  
  // Quiz state
  currentQuiz: TrainingQuiz | null
  currentQuestions: TrainingQuizQuestion[]
  currentQuizQuestions: TrainingQuizQuestion[]
  quizAnswers: Record<string, string | string[]>
  quizStartTime: string | null
  lastAttempt: TrainingQuizAttempt | null
  
  // My learning
  myEnrollments: TrainingEnrollment[]
  myCertifications: EmployeeCertification[]
  
  // UI state
  isLoading: boolean
  loading: boolean // alias for isLoading
  error: string | null
}

// =====================================================
// STORE
// =====================================================

export const useAcademyStore = defineStore('academy', {
  state: (): AcademyState => ({
    courses: [],
    categories: [],
    selectedCategory: null,
    currentCourse: null,
    currentLessons: [],
    currentLessonIndex: 0,
    lessons: [],
    enrollments: [],
    progress: [],
    quizzes: [],
    quizAttempts: [],
    currentQuiz: null,
    currentQuestions: [],
    currentQuizQuestions: [],
    quizAnswers: {},
    quizStartTime: null,
    lastAttempt: null,
    myEnrollments: [],
    myCertifications: [],
    isLoading: false,
    loading: false,
    error: null
  }),

  getters: {
    // Filter courses by category
    filteredCourses: (state) => {
      if (!state.selectedCategory) return state.courses
      return state.courses.filter(c => c.category === state.selectedCategory)
    },

    // Current lesson being viewed
    currentLesson: (state) => {
      return state.currentLessons[state.currentLessonIndex] || null
    },

    // Check if there's a next lesson
    hasNextLesson: (state) => {
      return state.currentLessonIndex < state.currentLessons.length - 1
    },

    // Check if there's a previous lesson
    hasPreviousLesson: (state) => {
      return state.currentLessonIndex > 0
    },

    // Calculate course progress - now a function getter for dynamic courseId
    courseProgress: (state) => (courseId: string) => {
      const courseLessons = state.lessons.filter(l => l.course_id === courseId)
      if (!courseLessons.length) return 0
      const completed = state.progress.filter(p => 
        courseLessons.some(l => l.id === p.lesson_id) && p.completed_at
      ).length
      return Math.round((completed / courseLessons.length) * 100)
    },

    // Lesson progress getter
    lessonProgress: (state) => (lessonId: string) => {
      const prog = state.progress.find(p => p.lesson_id === lessonId)
      return prog?.progress_percent || 0
    },

    // Lessons completed count
    completedLessonsCount: (state) => {
      return state.currentLessons.filter(l => l.progress?.completed_at).length
    },

    // Get my assigned courses (enrolled)
    enrolledCourses: (state) => {
      const enrolledIds = state.enrollments.map(e => e.course_id)
      return state.courses.filter(c => enrolledIds.includes(c.id))
    },

    // Get courses in progress
    inProgressCourses: (state) => {
      return state.courses.filter(c => 
        c.enrollment?.status === 'in_progress' ||
        (c.progress_percent && c.progress_percent > 0 && c.progress_percent < 100)
      )
    },

    // Get completed courses
    completedCourses: (state) => {
      return state.courses.filter(c => c.enrollment?.status === 'completed')
    },

    // Mandatory courses
    mandatoryCourses: (state) => {
      return state.courses.filter(c => c.is_required_for_role)
    },

    // Due courses count (enrollments with due_date approaching)
    dueCoursesCount: (state) => {
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return state.enrollments.filter(e => {
        if (!e.due_date || e.status === 'completed') return false
        const dueDate = new Date(e.due_date)
        return dueDate <= weekFromNow
      }).length
    },

    // Check if all questions answered
    allQuestionsAnswered: (state) => {
      return state.currentQuestions.every(q => 
        state.quizAnswers[q.id] !== undefined && state.quizAnswers[q.id] !== ''
      )
    },

    // Quiz progress
    quizProgress: (state) => {
      if (!state.currentQuestions.length) return 0
      const answered = Object.keys(state.quizAnswers).length
      return Math.round((answered / state.currentQuestions.length) * 100)
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
        // Fetch courses with lesson count
        const { data: courses, error } = await supabase
          .from('training_courses')
          .select(`
            *,
            lessons:training_lessons(count)
          `)
          .order('title')

        if (error) throw error

        // Map lesson count
        let coursesData = (courses || []).map(c => ({
          ...c,
          lessons_count: c.lessons?.[0]?.count || 0
        })) as TrainingCourse[]

        // If employee provided, fetch enrollments and progress
        if (employeeId) {
          // Fetch enrollments
          const { data: enrollments } = await supabase
            .from('training_enrollments')
            .select('*')
            .eq('employee_id', employeeId)

          // Fetch progress counts per course
          const { data: progressData } = await supabase
            .from('training_progress')
            .select(`
              lesson:training_lessons!inner(course_id),
              completed_at
            `)
            .eq('employee_id', employeeId)
            .not('completed_at', 'is', null)

          // Map enrollments and progress to courses
          coursesData = coursesData.map(course => {
            const enrollment = enrollments?.find(e => e.course_id === course.id) || null
            
            // Count completed lessons for this course
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

        // Extract unique categories
        const cats = new Set(coursesData.map(c => c.category).filter(Boolean))
        this.categories = Array.from(cats) as string[]

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to fetch courses'
        console.error('fetchCourses error:', err)
      } finally {
        this.isLoading = false
      }
    },

    async enrollInCourse(employeeId: string, courseId: string) {
      const supabase = useSupabaseClient()

      try {
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
        
        // Update course in list
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

    // =====================================================
    // CLASSROOM / LESSON PLAYER
    // =====================================================

    async loadCourse(courseId: string, employeeId: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true

      try {
        // Fetch course
        const { data: course, error: courseError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('id', courseId)
          .single()

        if (courseError) throw courseError
        this.currentCourse = course as TrainingCourse

        // Fetch lessons with quizzes
        const { data: lessons, error: lessonsError } = await supabase
          .from('training_lessons')
          .select(`
            *,
            quiz:training_quizzes(*)
          `)
          .eq('course_id', courseId)
          .order('position')

        if (lessonsError) throw lessonsError

        // Fetch progress for this employee
        const { data: progressData } = await supabase
          .from('training_progress')
          .select('*')
          .eq('employee_id', employeeId)
          .in('lesson_id', lessons?.map(l => l.id) || [])

        // Map progress to lessons
        this.currentLessons = (lessons || []).map(lesson => ({
          ...lesson,
          quiz: lesson.quiz?.[0] || null,
          progress: progressData?.find(p => p.lesson_id === lesson.id) || null
        })) as TrainingLesson[]

        // Find last incomplete lesson or start from beginning
        const lastIncompleteIndex = this.currentLessons.findIndex(
          l => !l.progress?.completed_at
        )
        this.currentLessonIndex = lastIncompleteIndex >= 0 ? lastIncompleteIndex : 0

        // Update enrollment status to in_progress if still enrolled
        const enrollment = this.myEnrollments.find(e => e.course_id === courseId)
        if (enrollment && enrollment.status === 'enrolled') {
          await supabase
            .from('training_enrollments')
            .update({ status: 'in_progress', updated_at: new Date().toISOString() })
            .eq('id', enrollment.id)
        }

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load course'
        console.error('loadCourse error:', err)
      } finally {
        this.isLoading = false
      }
    },

    async markLessonStarted(employeeId: string, lessonId: string) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('training_progress')
          .upsert({
            employee_id: employeeId,
            lesson_id: lessonId,
            started_at: new Date().toISOString(),
            progress_percent: 0
          }, { onConflict: 'employee_id,lesson_id' })
          .select()
          .single()

        if (error) throw error

        // Update local state
        const lesson = this.currentLessons.find(l => l.id === lessonId)
        if (lesson) {
          lesson.progress = data as TrainingProgress
        }
      } catch (err) {
        console.error('markLessonStarted error:', err)
      }
    },

    async markLessonComplete(employeeId: string, lessonId: string) {
      const supabase = useSupabaseClient()

      try {
        const { data, error } = await supabase
          .from('training_progress')
          .upsert({
            employee_id: employeeId,
            lesson_id: lessonId,
            completed_at: new Date().toISOString(),
            progress_percent: 100
          }, { onConflict: 'employee_id,lesson_id' })
          .select()
          .single()

        if (error) throw error

        // Update local state
        const lesson = this.currentLessons.find(l => l.id === lessonId)
        if (lesson) {
          lesson.progress = data as TrainingProgress
        }

        // Check for course completion
        await this.checkCourseCompletion(employeeId)

      } catch (err) {
        console.error('markLessonComplete error:', err)
        throw err
      }
    },

    goToNextLesson() {
      if (this.hasNextLesson) {
        this.currentLessonIndex++
      }
    },

    goToPreviousLesson() {
      if (this.hasPreviousLesson) {
        this.currentLessonIndex--
      }
    },

    goToLesson(index: number) {
      if (index >= 0 && index < this.currentLessons.length) {
        this.currentLessonIndex = index
      }
    },

    // =====================================================
    // QUIZ ENGINE
    // =====================================================

    async loadQuiz(quizId: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true

      try {
        // Fetch quiz
        const { data: quiz, error: quizError } = await supabase
          .from('training_quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError) throw quizError
        this.currentQuiz = quiz as TrainingQuiz

        // Fetch questions
        const { data: questions, error: qError } = await supabase
          .from('training_quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('position')

        if (qError) throw qError
        this.currentQuestions = questions as TrainingQuizQuestion[]

        // Reset answers
        this.quizAnswers = {}
        this.quizStartTime = new Date().toISOString()
        this.lastAttempt = null

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to load quiz'
        console.error('loadQuiz error:', err)
      } finally {
        this.isLoading = false
      }
    },

    setQuizAnswer(questionId: string, answer: string | string[]) {
      this.quizAnswers[questionId] = answer
    },

    async submitQuiz(employeeId: string): Promise<TrainingQuizAttempt> {
      const supabase = useSupabaseClient()

      if (!this.currentQuiz) throw new Error('No quiz loaded')

      try {
        // Calculate score
        let correctCount = 0
        
        for (const question of this.currentQuestions) {
          const userAnswer = this.quizAnswers[question.id]
          const correctAnswer = question.correct_answer

          if (Array.isArray(correctAnswer)) {
            // Multi-select: check if arrays match
            if (Array.isArray(userAnswer)) {
              const sortedUser = [...userAnswer].sort()
              const sortedCorrect = [...correctAnswer].sort()
              if (JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)) {
                correctCount++
              }
            }
          } else {
            // Single answer
            if (userAnswer === correctAnswer) {
              correctCount++
            }
          }
        }

        const score = Math.round((correctCount / this.currentQuestions.length) * 100)
        const passed = score >= this.currentQuiz.passing_score

        // Create attempt record
        const { data: attempt, error } = await supabase
          .from('training_quiz_attempts')
          .insert({
            quiz_id: this.currentQuiz.id,
            employee_id: employeeId,
            started_at: this.quizStartTime,
            completed_at: new Date().toISOString(),
            score,
            passed,
            answers: this.quizAnswers
          })
          .select()
          .single()

        if (error) throw error

        this.lastAttempt = attempt as TrainingQuizAttempt

        // If passed and this is a course quiz, check for course completion
        if (passed && this.currentQuiz.course_id) {
          await this.checkCourseCompletion(employeeId)
        }

        return attempt as TrainingQuizAttempt

      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to submit quiz'
        throw err
      }
    },

    resetQuiz() {
      this.quizAnswers = {}
      this.quizStartTime = new Date().toISOString()
      this.lastAttempt = null
    },

    // =====================================================
    // COURSE COMPLETION & CERTIFICATION
    // =====================================================

    async checkCourseCompletion(employeeId: string) {
      if (!this.currentCourse) return

      // Check if all lessons are complete
      const allLessonsComplete = this.currentLessons.every(
        l => l.progress?.completed_at
      )

      if (!allLessonsComplete) return

      // Check if there's a final quiz that needs to be passed
      const finalQuiz = this.currentLessons.find(l => l.quiz)?.quiz
      
      if (finalQuiz) {
        // Check if quiz was passed
        const supabase = useSupabaseClient()
        const { data: attempts } = await supabase
          .from('training_quiz_attempts')
          .select('*')
          .eq('quiz_id', finalQuiz.id)
          .eq('employee_id', employeeId)
          .eq('passed', true)
          .limit(1)

        if (!attempts || attempts.length === 0) return
      }

      // All requirements met - mark course complete
      await this.completeCourse(employeeId, this.currentCourse.id)
    },

    async completeCourse(employeeId: string, courseId: string) {
      const supabase = useSupabaseClient()

      try {
        // Update enrollment status
        const { error: enrollError } = await supabase
          .from('training_enrollments')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)
          .eq('course_id', courseId)

        if (enrollError) throw enrollError

        // Check if course has an associated certification
        const course = this.courses.find(c => c.id === courseId)
        if (course) {
          // Look for certification with matching code
          const { data: cert } = await supabase
            .from('certifications')
            .select('*')
            .eq('code', course.code)
            .single()

          if (cert) {
            await this.awardCertification(employeeId, cert.id)
          }
        }

        // Update local state
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
        // Check if already awarded
        const { data: existing } = await supabase
          .from('employee_certifications')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('certification_id', certificationId)
          .single()

        if (existing) return existing as EmployeeCertification

        // Get certification details for validity
        const { data: cert } = await supabase
          .from('certifications')
          .select('*')
          .eq('id', certificationId)
          .single()

        // Calculate expiration date
        let expirationDate = null
        if (cert?.validity_months) {
          const exp = new Date()
          exp.setMonth(exp.getMonth() + cert.validity_months)
          expirationDate = exp.toISOString().split('T')[0]
        }

        // Award certification
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

    // =====================================================
    // MY LEARNING
    // =====================================================

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

    // Reset classroom state
    resetClassroom() {
      this.currentCourse = null
      this.currentLessons = []
      this.currentLessonIndex = 0
      this.currentQuiz = null
      this.currentQuestions = []
      this.quizAnswers = {}
      this.quizStartTime = null
      this.lastAttempt = null
    }
  }
})
