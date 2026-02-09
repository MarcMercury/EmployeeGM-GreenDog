import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useAcademyCoursesStore } from './academyCourses'
import { useAcademyQuizStore } from './academyQuiz'
import type { TrainingCourse, TrainingLesson, TrainingEnrollment, TrainingProgress } from '~/types/academy.types'

// =====================================================
// STATE
// =====================================================

interface AcademyProgressState {
  // Classroom / current course
  currentCourse: TrainingCourse | null
  currentLessons: TrainingLesson[]
  currentLessonIndex: number

  // All lessons & progress (for component access)
  lessons: TrainingLesson[]
  progress: TrainingProgress[]

  // UI state
  isLoading: boolean
  loading: boolean // alias for isLoading
  error: string | null
}

// =====================================================
// STORE — Classroom, lesson progress, course completion
// =====================================================

export const useAcademyProgressStore = defineStore('academy-progress', {
  state: (): AcademyProgressState => ({
    currentCourse: null,
    currentLessons: [],
    currentLessonIndex: 0,
    lessons: [],
    progress: [],
    isLoading: false,
    loading: false,
    error: null
  }),

  getters: {
    currentLesson: (state) => {
      return state.currentLessons[state.currentLessonIndex] || null
    },

    hasNextLesson: (state) => {
      return state.currentLessonIndex < state.currentLessons.length - 1
    },

    hasPreviousLesson: (state) => {
      return state.currentLessonIndex > 0
    },

    courseProgress: (state) => (courseId: string) => {
      const courseLessons = state.lessons.filter(l => l.course_id === courseId)
      if (!courseLessons.length) return 0
      const completed = state.progress.filter(p =>
        courseLessons.some(l => l.id === p.lesson_id) && p.completed_at
      ).length
      return Math.round((completed / courseLessons.length) * 100)
    },

    lessonProgress: (state) => (lessonId: string) => {
      const prog = state.progress.find(p => p.lesson_id === lessonId)
      return prog?.progress_percent || 0
    },

    completedLessonsCount: (state) => {
      return state.currentLessons.filter(l => l.progress?.completed_at).length
    }
  },

  actions: {
    // =====================================================
    // CLASSROOM / LESSON PLAYER
    // =====================================================

    async loadCourse(courseId: string, employeeId: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true

      try {
        this.error = null
        const { data: course, error: courseError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('id', courseId)
          .single()

        if (courseError) throw courseError
        this.currentCourse = course as TrainingCourse

        const { data: lessons, error: lessonsError } = await supabase
          .from('training_lessons')
          .select(`
            *,
            quiz:training_quizzes(*)
          `)
          .eq('course_id', courseId)
          .order('position')

        if (lessonsError) throw lessonsError

        const { data: progressData } = await supabase
          .from('training_progress')
          .select('*')
          .eq('employee_id', employeeId)
          .in('lesson_id', lessons?.map(l => l.id) || [])

        this.currentLessons = (lessons || []).map(lesson => ({
          ...lesson,
          quiz: lesson.quiz?.[0] || null,
          progress: progressData?.find(p => p.lesson_id === lesson.id) || null
        })) as TrainingLesson[]

        const lastIncompleteIndex = this.currentLessons.findIndex(
          l => !l.progress?.completed_at
        )
        this.currentLessonIndex = lastIncompleteIndex >= 0 ? lastIncompleteIndex : 0

        // Update enrollment status to in_progress if still enrolled
        const coursesStore = useAcademyCoursesStore()
        const enrollment = coursesStore.myEnrollments.find(e => e.course_id === courseId)
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

        const lesson = this.currentLessons.find(l => l.id === lessonId)
        if (lesson) {
          lesson.progress = data as TrainingProgress
        }

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
    // COURSE COMPLETION CHECK
    // =====================================================

    async checkCourseCompletion(employeeId: string) {
      if (!this.currentCourse) return

      const allLessonsComplete = this.currentLessons.every(
        l => l.progress?.completed_at
      )

      if (!allLessonsComplete) return

      const finalQuiz = this.currentLessons.find(l => l.quiz)?.quiz

      if (finalQuiz) {
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

      // All requirements met — delegate to courses store
      const coursesStore = useAcademyCoursesStore()
      await coursesStore.completeCourse(employeeId, this.currentCourse.id)
    },

    // =====================================================
    // SIMPLIFIED METHODS FOR COMPONENTS
    // =====================================================

    async fetchProgress() {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) return

      const supabase = useSupabaseClient()
      try {
        const { data, error } = await supabase
          .from('training_progress')
          .select('*')
          .eq('employee_id', authStore.profile?.id)

        if (error) throw error
        this.progress = data as TrainingProgress[]
      } catch (err) {
        console.error('fetchProgress error:', err)
      }
    },

    async fetchLessonsForCourse(courseId: string) {
      const supabase = useSupabaseClient()
      this.loading = true
      this.isLoading = true

      try {
        const { data: course, error: courseError } = await supabase
          .from('training_courses')
          .select('*')
          .eq('id', courseId)
          .single()

        if (courseError) throw courseError
        this.currentCourse = course as TrainingCourse

        const { data: lessons, error: lessonsError } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('position')

        if (lessonsError) throw lessonsError

        this.lessons = lessons as TrainingLesson[]
        this.currentLessons = lessons as TrainingLesson[]
      } catch (err) {
        console.error('fetchLessonsForCourse error:', err)
      } finally {
        this.loading = false
        this.isLoading = false
      }
    },

    async completeLesson(lessonId: string) {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) throw new Error('Not authenticated')

      await this.markLessonComplete(authStore.profile?.id, lessonId)

      const existing = this.progress.find(p => p.lesson_id === lessonId)
      if (existing) {
        existing.completed_at = new Date().toISOString()
        existing.progress_percent = 100
      } else {
        this.progress.push({
          id: crypto.randomUUID(),
          employee_id: authStore.profile?.id,
          lesson_id: lessonId,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          progress_percent: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    },

    setCurrentLesson(lesson: TrainingLesson | null) {
      if (lesson) {
        const index = this.currentLessons.findIndex(l => l.id === lesson.id)
        if (index >= 0) {
          this.currentLessonIndex = index
        }
      }
    },

    // Reset classroom state (including quiz state)
    resetClassroom() {
      this.currentCourse = null
      this.currentLessons = []
      this.currentLessonIndex = 0
      const quizStore = useAcademyQuizStore()
      quizStore.resetQuizState()
    }
  }
})
