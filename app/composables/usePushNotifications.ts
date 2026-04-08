/**
 * usePushNotifications - Composable
 * ====================================
 * Frontend composable for OneSignal push notifications.
 */
export function usePushNotifications() {
  const initialized = ref(false)
  const permission = ref<'default' | 'granted' | 'denied'>('default')
  const playerId = ref<string | null>(null)

  /** Initialize OneSignal on the client */
  async function init() {
    if (import.meta.server || initialized.value) return

    const config = useRuntimeConfig()
    const appId = config.public.onesignalAppId
    if (!appId) return

    try {
      // Load OneSignal SDK
      if (!(window as any).OneSignalDeferred) {
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || []
      }

      ;(window as any).OneSignalDeferred.push(async function(OneSignal: any) {
        await OneSignal.init({ appId })
        initialized.value = true
        permission.value = await OneSignal.Notifications.permission ? 'granted' : 'default'
        playerId.value = await OneSignal.User?.PushSubscription?.id || null
      })

      // Inject OneSignal script
      if (!document.getElementById('onesignal-sdk')) {
        const script = document.createElement('script')
        script.id = 'onesignal-sdk'
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
        script.async = true
        document.head.appendChild(script)
      }
    } catch (e) {
      console.warn('[OneSignal] Init failed:', e)
    }
  }

  /** Request notification permission */
  async function requestPermission() {
    if (!initialized.value) await init()
    try {
      const OneSignal = (window as any).OneSignal
      if (OneSignal) {
        await OneSignal.Notifications.requestPermission()
        permission.value = 'granted'
      }
    } catch {
      permission.value = 'denied'
    }
  }

  /** Set external user ID (link to your auth system) */
  async function setUserId(userId: string) {
    try {
      const OneSignal = (window as any).OneSignal
      if (OneSignal) {
        await OneSignal.login(userId)
      }
    } catch {
      console.warn('[OneSignal] Failed to set user ID')
    }
  }

  /** Add tags for segmentation */
  async function setTags(tags: Record<string, string>) {
    try {
      const OneSignal = (window as any).OneSignal
      if (OneSignal) {
        await OneSignal.User.addTags(tags)
      }
    } catch {
      console.warn('[OneSignal] Failed to set tags')
    }
  }

  return { initialized, permission, playerId, init, requestPermission, setUserId, setTags }
}
