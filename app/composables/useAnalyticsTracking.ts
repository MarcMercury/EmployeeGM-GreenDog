/**
 * useAnalyticsTracking - Composable
 * ====================================
 * Frontend composable for GA4 + Mixpanel event tracking.
 * Sends events to both services in parallel.
 */
export function useAnalyticsTracking() {
  const { $supabase } = useNuxtApp()

  /** Track an event across all analytics services */
  async function track(eventName: string, properties?: Record<string, any>) {
    try {
      await $fetch('/api/integrations/analytics/track', {
        method: 'POST',
        body: {
          event: eventName,
          properties: {
            ...properties,
            timestamp: new Date().toISOString(),
            page: window?.location?.pathname,
          },
        },
      })
    } catch {
      // Analytics should never block the UI
    }
  }

  /** Track page view */
  function trackPageView(pageName?: string) {
    track('page_view', { page_title: pageName || document?.title })
  }

  /** Track feature usage */
  function trackFeatureUse(feature: string, action: string, details?: Record<string, any>) {
    track('feature_use', { feature, action, ...details })
  }

  /** Track user action */
  function trackAction(action: string, category: string, label?: string, value?: number) {
    track('user_action', { action, category, label, value })
  }

  return { track, trackPageView, trackFeatureUse, trackAction }
}
