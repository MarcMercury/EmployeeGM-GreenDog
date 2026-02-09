// =====================================================
// Performance Store — Backward-compatible re-export layer
// Split into focused sub-stores:
//   - performanceGoals.ts    → Goal CRUD, progress tracking, goal updates
//   - performanceReviews.ts  → Review cycles, templates, reviews, responses, signing
//   - performanceFeedback.ts → Feedback giving/receiving, 360 feedback
// =====================================================

import { reactive } from 'vue'

export { usePerformanceGoalsStore } from './performanceGoals'
export { usePerformanceReviewsStore } from './performanceReviews'
export { usePerformanceFeedbackStore } from './performanceFeedback'

// Re-export types so existing `import type { Goal } from '~/stores/performance'` keeps working
export type { Goal, GoalUpdate, ReviewCycle, ReviewTemplate, ReviewQuestion, PerformanceReview, ReviewResponse, ReviewSignoff, Feedback } from '~/types/performance.types'

import { usePerformanceGoalsStore } from './performanceGoals'
import { usePerformanceReviewsStore } from './performanceReviews'
import { usePerformanceFeedbackStore } from './performanceFeedback'

/**
 * Legacy facade — returns a reactive composite object that delegates to the
 * three sub-stores.  Existing callers (`const perf = usePerformanceStore()`)
 * continue to work unchanged.
 */
export function usePerformanceStore() {
  const goals = usePerformanceGoalsStore()
  const reviews = usePerformanceReviewsStore()
  const fb = usePerformanceFeedbackStore()

  return reactive({
    // ----- Goals state -----
    get goals() { return goals.goals },
    set goals(v) { goals.goals = v },
    get currentGoal() { return goals.currentGoal },
    set currentGoal(v) { goals.currentGoal = v },
    get goalUpdates() { return goals.goalUpdates },
    set goalUpdates(v) { goals.goalUpdates = v },

    // ----- Reviews state -----
    get reviewCycles() { return reviews.reviewCycles },
    set reviewCycles(v) { reviews.reviewCycles = v },
    get currentCycle() { return reviews.currentCycle },
    set currentCycle(v) { reviews.currentCycle = v },
    get myReviews() { return reviews.myReviews },
    set myReviews(v) { reviews.myReviews = v },
    get directReportReviews() { return reviews.directReportReviews },
    set directReportReviews(v) { reviews.directReportReviews = v },
    get currentReview() { return reviews.currentReview },
    set currentReview(v) { reviews.currentReview = v },
    get templates() { return reviews.templates },
    set templates(v) { reviews.templates = v },

    // ----- Feedback state -----
    get feedbackReceived() { return fb.feedbackReceived },
    set feedbackReceived(v) { fb.feedbackReceived = v },
    get feedbackGiven() { return fb.feedbackGiven },
    set feedbackGiven(v) { fb.feedbackGiven = v },

    // ----- Combined UI state -----
    get loading() { return goals.loading || reviews.loading || fb.loading },
    get error() { return goals.error || reviews.error || fb.error },

    // ----- Goal getters -----
    get activeGoals() { return goals.activeGoals },
    get completedGoals() { return goals.completedGoals },
    get goalsByStatus() { return goals.goalsByStatus },
    get onTrackGoals() { return goals.onTrackGoals },
    get atRiskGoals() { return goals.atRiskGoals },

    // ----- Review getters -----
    get activeCycle() { return reviews.activeCycle },
    get pendingReviews() { return reviews.pendingReviews },
    get pendingDirectReportReviews() { return reviews.pendingDirectReportReviews },
    get reviewNeedsSignoff() { return reviews.reviewNeedsSignoff },

    // ----- Feedback getters -----
    get recentFeedback() { return fb.recentFeedback },
    get feedbackSinceDate() { return fb.feedbackSinceDate },

    // ----- Goal actions -----
    fetchGoals: (...args: Parameters<typeof goals.fetchGoals>) => goals.fetchGoals(...args),
    fetchGoalWithUpdates: (...args: Parameters<typeof goals.fetchGoalWithUpdates>) => goals.fetchGoalWithUpdates(...args),
    createGoal: (...args: Parameters<typeof goals.createGoal>) => goals.createGoal(...args),
    updateGoalProgress: (...args: Parameters<typeof goals.updateGoalProgress>) => goals.updateGoalProgress(...args),
    updateGoal: (...args: Parameters<typeof goals.updateGoal>) => goals.updateGoal(...args),
    resetCurrentGoal: () => goals.resetCurrentGoal(),

    // ----- Review actions -----
    fetchReviewCycles: (...args: Parameters<typeof reviews.fetchReviewCycles>) => reviews.fetchReviewCycles(...args),
    fetchTemplates: (...args: Parameters<typeof reviews.fetchTemplates>) => reviews.fetchTemplates(...args),
    fetchMyReviews: (...args: Parameters<typeof reviews.fetchMyReviews>) => reviews.fetchMyReviews(...args),
    fetchDirectReportReviews: (...args: Parameters<typeof reviews.fetchDirectReportReviews>) => reviews.fetchDirectReportReviews(...args),
    fetchReviewWithResponses: (...args: Parameters<typeof reviews.fetchReviewWithResponses>) => reviews.fetchReviewWithResponses(...args),
    saveReviewResponse: (...args: Parameters<typeof reviews.saveReviewResponse>) => reviews.saveReviewResponse(...args),
    submitSelfReview: (...args: Parameters<typeof reviews.submitSelfReview>) => reviews.submitSelfReview(...args),
    submitManagerReview: (...args: Parameters<typeof reviews.submitManagerReview>) => reviews.submitManagerReview(...args),
    signReview: (...args: Parameters<typeof reviews.signReview>) => reviews.signReview(...args),
    completeReview: (...args: Parameters<typeof reviews.completeReview>) => reviews.completeReview(...args),
    resetCurrentReview: () => reviews.resetCurrentReview(),

    // ----- Feedback actions -----
    fetchFeedback: (...args: Parameters<typeof fb.fetchFeedback>) => fb.fetchFeedback(...args),
    giveFeedback: (...args: Parameters<typeof fb.giveFeedback>) => fb.giveFeedback(...args),
    fetchFeedbackForEmployee: (...args: Parameters<typeof fb.fetchFeedbackForEmployee>) => fb.fetchFeedbackForEmployee(...args),

    // ----- Reset -----
    $reset() {
      goals.$reset()
      reviews.$reset()
      fb.$reset()
    }
  })
}
