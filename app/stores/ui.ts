import { defineStore } from 'pinia'
import type { ToastNotification } from '~/types'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: ToastNotification[]
  isPageLoading: boolean
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    sidebarOpen: true,
    theme: 'light',
    notifications: [],
    isPageLoading: false
  }),

  getters: {
    isDarkMode: (state) => state.theme === 'dark'
  },

  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },

    setSidebarOpen(open: boolean) {
      this.sidebarOpen = open
    },

    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
    },

    showNotification(notification: Omit<ToastNotification, 'id'>) {
      const id = Date.now().toString()
      this.notifications.push({
        ...notification,
        id,
        timeout: notification.timeout ?? 5000
      })

      // Auto-remove after timeout
      if (notification.timeout !== 0) {
        setTimeout(() => {
          this.removeNotification(id)
        }, notification.timeout ?? 5000)
      }
    },

    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },

    showSuccess(message: string) {
      this.showNotification({ message, type: 'success' })
    },

    showError(message: string) {
      this.showNotification({ message, type: 'error', timeout: 8000 })
    },

    showWarning(message: string) {
      this.showNotification({ message, type: 'warning' })
    },

    showInfo(message: string) {
      this.showNotification({ message, type: 'info' })
    },

    setPageLoading(loading: boolean) {
      this.isPageLoading = loading
    },

    clearNotifications() {
      this.notifications = []
    }
  },

  persist: {
    pick: ['theme', 'sidebarOpen']
  }
})
