/**
 * Composable: useEzyVetIntegration
 *
 * Provides reactive state for the ezyVet API integration dashboard.
 * Manages clinics, sync triggers, dashboard data, and sync history.
 */

interface EzyVetDashboard {
  clinics: Array<{ id: string; label: string; site_uid: string; is_active: boolean }>
  appointments: { total: number; today: number; byStatus: Record<string, number> }
  users: { total: number; active: number; byRole: Record<string, number> }
  consults: { total: number; byStatus: Record<string, number> }
  lastSync: Record<string, unknown> | null
  recentSyncs: Array<Record<string, unknown>>
  webhooks: { last24h: number; processed: number; pending: number }
}

interface SyncResult {
  ok: boolean
  type: string
  clinic: string
  result: Record<string, unknown>
}

interface SyncLogEntry {
  id: string
  clinic_id: string
  sync_type: string
  status: string
  started_at: string
  completed_at: string | null
  records_fetched: number
  records_upserted: number
  records_errored: number
  triggered_by: string
}

export function useEzyVetIntegration() {
  const dashboard = ref<EzyVetDashboard | null>(null)
  const syncLogs = ref<SyncLogEntry[]>([])
  const selectedClinicId = ref<string | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)

  // ── Fetch dashboard data ──
  async function fetchDashboard(clinicId?: string) {
    loading.value = true
    error.value = null
    try {
      const params = clinicId ? `?clinicId=${clinicId}` : ''
      dashboard.value = await $fetch<EzyVetDashboard>(`/api/ezyvet/dashboard${params}`)

      // Auto-select first clinic if none selected
      if (!selectedClinicId.value && dashboard.value?.clinics?.length) {
        selectedClinicId.value = dashboard.value.clinics[0].id
      }
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Failed to load dashboard'
      console.error('[ezyVet] Dashboard fetch error:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Trigger sync ──
  async function triggerSync(
    type: 'users' | 'appointments' | 'consults' | 'full' = 'full',
    since?: string
  ): Promise<SyncResult | null> {
    if (!selectedClinicId.value) {
      error.value = 'No clinic selected'
      return null
    }

    syncing.value = true
    error.value = null
    try {
      const result = await $fetch<SyncResult>('/api/ezyvet/sync', {
        method: 'POST',
        body: {
          clinicId: selectedClinicId.value,
          type,
          since,
        },
      })

      // Refresh dashboard after sync
      await fetchDashboard(selectedClinicId.value)
      await fetchSyncLog()

      return result
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Sync failed'
      console.error('[ezyVet] Sync error:', err)
      return null
    } finally {
      syncing.value = false
    }
  }

  // ── Fetch sync log ──
  async function fetchSyncLog(limit = 20) {
    try {
      const params = new URLSearchParams({ limit: String(limit) })
      if (selectedClinicId.value) {
        params.set('clinicId', selectedClinicId.value)
      }
      const result = await $fetch<{ logs: SyncLogEntry[] }>(`/api/ezyvet/sync-log?${params}`)
      syncLogs.value = result.logs || []
    } catch (err) {
      console.error('[ezyVet] Sync log fetch error:', err)
    }
  }

  // ── Setup webhooks ──
  async function setupWebhooks() {
    if (!selectedClinicId.value) {
      error.value = 'No clinic selected'
      return null
    }

    try {
      const result = await $fetch('/api/ezyvet/setup-webhooks', {
        method: 'POST',
        body: { clinicId: selectedClinicId.value },
      })
      return result
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'Webhook setup failed'
      return null
    }
  }

  // ── Computed ──
  const clinics = computed(() => dashboard.value?.clinics || [])
  const selectedClinic = computed(() =>
    clinics.value.find((c) => c.id === selectedClinicId.value) || null
  )

  return {
    // State
    dashboard,
    syncLogs,
    selectedClinicId,
    loading,
    syncing,
    error,

    // Computed
    clinics,
    selectedClinic,

    // Actions
    fetchDashboard,
    triggerSync,
    fetchSyncLog,
    setupWebhooks,
  }
}
