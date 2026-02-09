/**
 * Global Toast Composable — CANONICAL toast API
 * 
 * Provides a simple, consistent API for showing toast notifications.
 * Uses the UI store under the hood but provides a cleaner interface.
 * 
 * PREFERRED usage (pages & composables):
 *   const toast = useToast()
 *   toast.success('Saved successfully!')
 *   toast.error('Connection failed')
 *   toast.info('New message received')
 *   toast.warning('Are you sure?')
 * 
 * Destructured usage (also fine):
 *   const { showSuccess, showError } = useToast()
 * 
 * Legacy .add() usage (compat — prefer .success()/.error() for new code):
 *   toast.add({ title: '...', description: '...', color: 'green' })
 * 
 * For child components that can't own toast rendering, emit('notify')
 * to the parent page which calls useToast() directly.
 * 
 * Stores should NOT call useToast(). They should set error/success
 * state and let the page/component layer handle display.
 */

export const useToast = () => {
  const uiStore = useUIStore()

  /** Map Nuxt UI-style color strings to our canonical type */
  const colorToType = (color?: string): 'success' | 'error' | 'info' | 'warning' => {
    switch (color) {
      case 'green': case 'success': return 'success'
      case 'red': case 'error': return 'error'
      case 'orange': case 'yellow': case 'warning': return 'warning'
      case 'blue': case 'info': return 'info'
      default: return 'info'
    }
  }

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
     * Compatibility bridge for Nuxt UI-style toast.add() calls.
     * Maps { title, description, color } → canonical showNotification().
     * Prefer .success()/.error()/.warning()/.info() for new code.
     */
    add(opts: { title?: string; description?: string; color?: string; timeout?: number }) {
      const message = [opts.title, opts.description].filter(Boolean).join(': ')
      uiStore.showNotification({
        message: message || 'Notification',
        type: colorToType(opts.color),
        timeout: opts.timeout,
      })
    },

    /**
     * Clear all toasts
     */
    clear() {
      uiStore.clearNotifications()
    },

    // Aliases for compatibility with existing code patterns
    // These use uiStore directly to avoid 'this' binding issues when destructured
    showSuccess(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'success',
        timeout: options?.timeout ?? 3000
      })
    },

    showError(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'error',
        timeout: options?.timeout ?? 6000
      })
    },

    showInfo(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'info',
        timeout: options?.timeout ?? 4000
      })
    },

    showWarning(message: string, options?: { timeout?: number }) {
      uiStore.showNotification({
        message,
        type: 'warning',
        timeout: options?.timeout ?? 5000
      })
    }
  }
}
