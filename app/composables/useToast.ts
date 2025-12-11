/**
 * Global Toast Composable
 * 
 * Provides a simple, consistent API for showing toast notifications.
 * Uses the UI store under the hood but provides a cleaner interface.
 * 
 * Usage:
 *   const toast = useToast()
 *   toast.success('Saved successfully!')
 *   toast.error('Connection failed')
 *   toast.info('New message received')
 *   toast.warning('Are you sure?')
 */

export const useToast = () => {
  const uiStore = useUIStore()

  return {
    /**
     * Show a success toast (green)
     */
    success(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'success',
        timeout: options?.timeout ?? 3000
      })
    },

    /**
     * Show an error toast (red)
     */
    error(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'error',
        timeout: options?.timeout ?? 6000
      })
    },

    /**
     * Show an info toast (blue)
     */
    info(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'info',
        timeout: options?.timeout ?? 4000
      })
    },

    /**
     * Show a warning toast (orange)
     */
    warning(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'warning',
        timeout: options?.timeout ?? 5000
      })
    },

    /**
     * Show a custom toast
     */
    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', timeout?: number) {
      uiStore.showNotification({ message, type, timeout })
    },

    /**
     * Clear all toasts
     */
    clear() {
      uiStore.clearNotifications()
    }
  }
}
