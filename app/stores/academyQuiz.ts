import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useAcademyProgressStore } from './academyProgress'
import type { TrainingQuiz, TrainingQuizQuestion, TrainingQuizAttempt } from '~/types/academy.types'

// =====================================================
// STATE
// =====================================================

interface AcademyQuizState {
  currentQuiz: TrainingQuiz | null
  currentQuestions: TrainingQuizQuestion[]
  currentQuizQuestions: TrainingQuizQuestion[]
  quizAnswers: Record<string, string | string[]>
  quizStartTime: string | null
  lastAttempt: TrainingQuizAttempt | null
  quizzes: TrainingQuiz[]
  quizAttempts: TrainingQuizAttempt[]
  isLoading: boolean
  error: string | null
}

// =====================================================
// STORE — Quiz engine
// =====================================================

export const useAcademyQuizStore = defineStore('academy-quiz', {
  state: (): AcademyQuizState => ({
    currentQuiz: null,
    currentQuestions: [],
    currentQuizQuestions: [],
    quizAnswers: {},
    quizStartTime: null,
    lastAttempt: null,
    quizzes: [],
    quizAttempts: [],
    isLoading: false,
    error: null
  }),

  getters: {
    allQuestionsAnswered: (state) => {
      return state.currentQuestions.every(q =>
        state.quizAnswers[q.id] !== undefined && state.quizAnswers[q.id] !== ''
      )
    },

    quizProgress: (state) => {
      if (!state.currentQuestions.length) return 0
      const answered = Object.keys(state.quizAnswers).length
      return Math.round((answered / state.currentQuestions.length) * 100)
    }
  },

  actions: {
    // =====================================================
    // QUIZ ENGINE
    // =====================================================

    async loadQuiz(quizId: string) {
      const supabase = useSupabaseClient()
      this.isLoading = true

      try {
        this.error = null
        const { data: quiz, error: quizError } = await supabase
          .from('training_quizzes')
          .select('*')
          .eq('id', quizId)
          .single()

        if (quizError) throw quizError
        this.currentQuiz = quiz as TrainingQuiz

        const { data: questions, error: qError } = await supabase
          .from('training_quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('position')

        if (qError) throw qError
        this.currentQuestions = questions as TrainingQuizQuestion[]

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
        this.error = null
        let correctCount = 0

        for (const question of this.currentQuestions) {
          const userAnswer = this.quizAnswers[question.id]
          const correctAnswer = question.correct_answer

          if (Array.isArray(correctAnswer)) {
            if (Array.isArray(userAnswer)) {
              const sortedUser = [...userAnswer].sort()
              const sortedCorrect = [...correctAnswer].sort()
              if (JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect)) {
                correctCount++
              }
            }
          } else {
            if (userAnswer === correctAnswer) {
              correctCount++
            }
          }
        }

        const score = Math.round((correctCount / this.currentQuestions.length) * 100)
        const passed = score >= this.currentQuiz.passing_score

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
          const progressStore = useAcademyProgressStore()
          await progressStore.checkCourseCompletion(employeeId)
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

    /** Full reset of all quiz-related state (used by resetClassroom) */
    resetQuizState() {
      this.currentQuiz = null
      this.currentQuestions = []
      this.currentQuizQuestions = []
      this.quizAnswers = {}
      this.quizStartTime = null
      this.lastAttempt = null
    },

    async fetchQuizzes(courseId?: string) {
      const supabase = useSupabaseClient()

      try {
        let query = supabase
          .from('training_quizzes')
          .select('*')

        if (courseId) {
          query = query.eq('course_id', courseId)
        }

        const { data, error } = await query

        if (error) throw error
        this.quizzes = data as TrainingQuiz[]
      } catch (err) {
        console.error('fetchQuizzes error:', err)
      }
    },

    async startQuiz(quizId: string) {
      await this.loadQuiz(quizId)
      this.currentQuizQuestions = this.currentQuestions
    },

    async submitQuizAnswers(quizId: string, answers: Record<string, any>): Promise<{ score: number; passed: boolean; certificationAwarded?: boolean }> {
      const authStore = useAuthStore()
      if (!authStore.profile?.id) throw new Error('Not authenticated')
      if (!this.currentQuiz) throw new Error('No quiz loaded')

      this.quizAnswers = answers
      const attempt = await this.submitQuiz(authStore.profile?.id)

      let certificationAwarded = false
      if (attempt.passed && this.currentQuiz.course_id) {
        const progressStore = useAcademyProgressStore()
        const courseProgressVal = progressStore.courseProgress(this.currentQuiz.course_id)
        if (courseProgressVal === 100) {
          certificationAwarded = true
        }
      }

      this.quizAttempts.push(attempt)

      return {
        score: attempt.score || 0,
        passed: attempt.passed || false,
        certificationAwarded
      }
    }
  }
})
