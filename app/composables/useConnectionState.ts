/**
 * Connection State & Offline Resilience Composable
 * 
 * Handles:
 * - Online/offline detection
 * - Action queuing when offline
 * - Cross-tab synchronization
 * - Stale data warnings
 */

export interface QueuedAction {
  id: string
  action: () => Promise<void>
  description: string
  timestamp: number
  retryCount: number
}

export function useConnectionState() {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const lastOnlineAt = ref(Date.now())
  const lastOfflineAt = ref<number | null>(null)
  const queuedActions = ref<QueuedAction[]>([])
  const isProcessingQueue = ref(false)
  const connectionQuality = ref<'good' | 'slow' | 'offline'>('good')

  // Track response times for quality estimation
  const recentLatencies: number[] = []
  const MAX_LATENCY_SAMPLES = 5
  const SLOW_THRESHOLD_MS = 2000

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      // Periodic connectivity check
      const interval = setInterval(checkConnectivity, 30000)
      onUnmounted(() => clearInterval(interval))
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })

  function handleOnline() {
    isOnline.value = true
    lastOnlineAt.value = Date.now()
    connectionQuality.value = 'good'
    
    // Process queued actions
    processQueue()
  }

  function handleOffline() {
    isOnline.value = false
    lastOfflineAt.value = Date.now()
    connectionQuality.value = 'offline'
  }

  async function checkConnectivity() {
    if (!isOnline.value) return
    
    const start = Date.now()
    try {
      // Use a lightweight health check
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store'
      })
      
      const latency = Date.now() - start
      recordLatency(latency)
      
      if (!response.ok) {
        connectionQuality.value = 'slow'
      }
    } catch {
      // Network error but navigator says online - slow/unreliable
      connectionQuality.value = 'slow'
    }
  }

  function recordLatency(latency: number) {
    recentLatencies.push(latency)
    if (recentLatencies.length > MAX_LATENCY_SAMPLES) {
      recentLatencies.shift()
    }
    
    const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length
    connectionQuality.value = avgLatency > SLOW_THRESHOLD_MS ? 'slow' : 'good'
  }

  async function processQueue() {
    if (isProcessingQueue.value || queuedActions.value.length === 0) return
    
    isProcessingQueue.value = true
    const toast = useToast()
    
    try {
      while (queuedActions.value.length > 0 && isOnline.value) {
        const action = queuedActions.value[0]
        
        try {
          await action.action()
          // Success - remove from queue
          queuedActions.value.shift()
          toast.success(`Synced: ${action.description}`)
        } catch (err) {
          action.retryCount++
          
          if (action.retryCount >= 3) {
            // Too many retries - remove and notify
            queuedActions.value.shift()
            toast.error(`Failed to sync: ${action.description}`)
          } else {
            // Move to end of queue for retry
            queuedActions.value.shift()
            queuedActions.value.push(action)
          }
        }
        
        // Small delay between actions
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } finally {
      isProcessingQueue.value = false
    }
  }

  function queueAction(description: string, action: () => Promise<void>): boolean {
    if (isOnline.value && connectionQuality.value === 'good') {
      // Execute immediately
      action().catch(console.error)
      return true
    }
    
    // Queue for later
    queuedActions.value.push({
      id: crypto.randomUUID(),
      action,
      description,
      timestamp: Date.now(),
      retryCount: 0
    })
    
    const toast = useToast()
    toast.info(`Queued for sync: ${description}`)
    
    return false
  }

  function removeQueuedAction(id: string) {
    queuedActions.value = queuedActions.value.filter(a => a.id !== id)
  }

  const offlineDuration = computed(() => {
    if (!lastOfflineAt.value || isOnline.value) return 0
    return Date.now() - lastOfflineAt.value
  })

  const hasQueuedActions = computed(() => queuedActions.value.length > 0)

  return {
    isOnline: readonly(isOnline),
    connectionQuality: readonly(connectionQuality),
    lastOnlineAt: readonly(lastOnlineAt),
    offlineDuration,
    queuedActions: readonly(queuedActions),
    hasQueuedActions,
    isProcessingQueue: readonly(isProcessingQueue),
    queueAction,
    removeQueuedAction,
    processQueue,
    recordLatency
  }
}

/**
 * Stale Data Warning Composable
 * 
 * Shows warnings when data may be stale due to:
 * - Long time since last fetch
 * - Realtime subscription disconnection
 * - Known data changes from other sessions
 */

export interface StaleDataConfig {
  maxAge: number // milliseconds before data is considered stale
  warningThreshold: number // show warning at this percentage of maxAge
}

export function useStaleDataWarning(config: StaleDataConfig = { maxAge: 300000, warningThreshold: 0.8 }) {
  const lastFetchTime = ref(Date.now())
  const isStale = ref(false)
  const staleDuration = ref(0)

  const checkInterval = setInterval(() => {
    const age = Date.now() - lastFetchTime.value
    staleDuration.value = age
    isStale.value = age > config.maxAge * config.warningThreshold
  }, 10000)

  onUnmounted(() => clearInterval(checkInterval))

  function markFresh() {
    lastFetchTime.value = Date.now()
    isStale.value = false
    staleDuration.value = 0
  }

  function markStale() {
    isStale.value = true
  }

  const staleMessage = computed(() => {
    if (!isStale.value) return null
    
    const minutes = Math.floor(staleDuration.value / 60000)
    if (minutes < 1) return 'Data may be outdated. Refresh for latest.'
    if (minutes === 1) return 'Data is 1 minute old. Refresh for latest.'
    return `Data is ${minutes} minutes old. Refresh for latest.`
  })

  return {
    isStale: readonly(isStale),
    staleDuration: readonly(staleDuration),
    staleMessage,
    markFresh,
    markStale
  }
}
