// =====================================================
// Academy Store — Backward-compatible re-export layer
// Split into focused sub-stores (audit item 5.1):
//   - academyCourses.ts  → Course catalog, enrollment, assignments, certifications
//   - academyProgress.ts → Classroom, lesson progress, completion
//   - academyQuiz.ts     → Quiz engine
// =====================================================

// Sub-stores are auto-imported by Nuxt from their own files.
// Do NOT re-export them here — it causes "Duplicated imports" warnings.

import { useAcademyCoursesStore } from './academyCourses'
import { useAcademyProgressStore } from './academyProgress'
import { useAcademyQuizStore } from './academyQuiz'

/**
 * Legacy facade — provides a combined $reset() so auth.ts logout
 * can continue to call `useAcademyStore().$reset()`.
 */
export function useAcademyStore() {
  const courses = useAcademyCoursesStore()
  const progress = useAcademyProgressStore()
  const quiz = useAcademyQuizStore()

  return {
    $reset() {
      courses.$reset()
      progress.$reset()
      quiz.$reset()
    }
  }
}
