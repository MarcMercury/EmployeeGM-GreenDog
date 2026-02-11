<script setup lang="ts">
/**
 * Audit & Activity Log
 * Real-time view of system audit trail from audit_log / audit_logs tables.
 * Shows who did what, when, and to which entity.
 * Also provides app settings (key-value) management.
 */

const supabase = useSupabaseClient()
const toast = useToast()

const activeSection = ref('audit')

// =====================================================
// AUDIT LOG
// =====================================================
const auditEntries = ref<any[]>([])
const loadingAudit = ref(false)
const auditPage = ref(1)
const auditTotal = ref(0)
const auditPerPage = 25
const auditFilter = reactive({
  search: '',
  action: '' as string,
  entity_type: '' as string,
  dateFrom: '',
  dateTo: ''
})

const actionOptions = ['INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CREATE', 'ARCHIVE', 'ROLE_CHANGE']
const entityOptions = ['employee', 'profile', 'department', 'job_position', 'location', 'shift', 'time_off_request', 'skill', 'notification', 'company_settings']

async function loadAuditLog() {
  loadingAudit.value = true
  try {
    // Try enhanced audit_log first, fallback to audit_logs
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((auditPage.value - 1) * auditPerPage, auditPage.value * auditPerPage - 1)

    if (auditFilter.action) query = query.eq('action', auditFilter.action)
    if (auditFilter.entity_type) query = query.eq('entity_type', auditFilter.entity_type)
    if (auditFilter.dateFrom) query = query.gte('created_at', auditFilter.dateFrom)
    if (auditFilter.dateTo) query = query.lte('created_at', auditFilter.dateTo + 'T23:59:59')
    if (auditFilter.search) query = query.or(`actor_email.ilike.%${auditFilter.search}%,entity_id.ilike.%${auditFilter.search}%,description.ilike.%${auditFilter.search}%`)

    const { data, error, count } = await query

    if (error) {
      // Fallback to legacy audit_logs table
      const fallbackQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((auditPage.value - 1) * auditPerPage, auditPage.value * auditPerPage - 1)

      const { data: fbData, count: fbCount } = await fallbackQuery
      auditEntries.value = (fbData || []).map((e: any) => ({
        id: e.id,
        action: e.action,
        entity_type: e.entity_type || e.entity,
        entity_id: e.entity_id,
        actor_email: e.actor_email || 'System',
        description: e.description || `${e.action} on ${e.entity_type || e.entity}`,
        changes: e.changes || e.metadata,
        created_at: e.created_at
      }))
      auditTotal.value = fbCount || 0
      return
    }

    auditEntries.value = (data || []).map((e: any) => ({
      id: e.id,
      action: e.action,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      actor_email: e.actor_email || e.actor_id || 'System',
      description: e.description || `${e.action} on ${e.entity_type}`,
      changes: e.changes || e.old_values || e.new_values,
      created_at: e.created_at
    }))
    auditTotal.value = count || 0
  } catch (err) {
    console.error('Error loading audit log:', err)
    auditEntries.value = []
  } finally {
    loadingAudit.value = false
  }
}

function clearFilters() {
  auditFilter.search = ''
  auditFilter.action = ''
  auditFilter.entity_type = ''
  auditFilter.dateFrom = ''
  auditFilter.dateTo = ''
  auditPage.value = 1
  loadAuditLog()
}

function applyFilters() {
  auditPage.value = 1
  loadAuditLog()
}

const totalPages = computed(() => Math.ceil(auditTotal.value / auditPerPage))

function changePage(page: number) {
  auditPage.value = page
  loadAuditLog()
}

function actionColor(action: string): string {
  const m: Record<string, string> = {
    INSERT: 'success', CREATE: 'success',
    UPDATE: 'info', ROLE_CHANGE: 'warning',
    DELETE: 'error', ARCHIVE: 'grey',
    LOGIN: 'primary', LOGOUT: 'grey'
  }
  return m[action?.toUpperCase()] || 'grey'
}

function formatDate(d: string): string {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}

const expandedRow = ref<string | null>(null)
function toggleRow(id: string) {
  expandedRow.value = expandedRow.value === id ? null : id
}

// =====================================================
// APP SETTINGS (Key-Value Store)
// =====================================================
const appSettings = ref<any[]>([])
const loadingSettings = ref(false)
const showSettingDialog = ref(false)
const editingSetting = ref<any>(null)
const settingForm = reactive({ key: '', value: '', category: '' })

const settingsSearch = ref('')
const settingsCategory = ref('')

async function loadAppSettings() {
  loadingSettings.value = true
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('key')

    if (error) throw error
    appSettings.value = data || []
  } catch (err) {
    console.error('Error loading app settings:', err)
    appSettings.value = []
  } finally {
    loadingSettings.value = false
  }
}

const filteredSettings = computed(() => {
  let items = appSettings.value
  if (settingsSearch.value) {
    const q = settingsSearch.value.toLowerCase()
    items = items.filter(s => s.key?.toLowerCase().includes(q) || s.value?.toLowerCase().includes(q))
  }
  if (settingsCategory.value) {
    items = items.filter(s => s.key?.startsWith(settingsCategory.value))
  }
  return items
})

const settingCategories = computed(() => {
  const prefixes = new Set<string>()
  appSettings.value.forEach(s => {
    const parts = s.key?.split('_') || []
    if (parts.length > 1) prefixes.add(parts[0])
  })
  return Array.from(prefixes).sort()
})

function openSettingDialog(setting?: any) {
  editingSetting.value = setting || null
  settingForm.key = setting?.key || ''
  settingForm.value = typeof setting?.value === 'object' ? JSON.stringify(setting.value, null, 2) : (setting?.value || '')
  settingForm.category = setting?.category || ''
  showSettingDialog.value = true
}

async function saveSetting() {
  if (!settingForm.key) { toast.error('Key is required'); return }
  try {
    let val = settingForm.value
    try { val = JSON.parse(val) } catch { /* keep as string */ }

    if (editingSetting.value) {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: val, updated_at: new Date().toISOString() })
        .eq('key', editingSetting.value.key)
      if (error) throw error
      toast.success('Setting updated')
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({ key: settingForm.key, value: val })
      if (error) throw error
      toast.success('Setting created')
    }
    showSettingDialog.value = false
    await loadAppSettings()
  } catch (err: any) {
    toast.error(err.message || 'Failed to save setting')
  }
}

async function deleteSetting(setting: any) {
  try {
    const { error } = await supabase.from('app_settings').delete().eq('key', setting.key)
    if (error) throw error
    appSettings.value = appSettings.value.filter(s => s.key !== setting.key)
    toast.info('Setting deleted')
  } catch { toast.error('Failed to delete setting') }
}

// =====================================================
// DATA EXPORT
// =====================================================
async function exportAuditLog() {
  try {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (!data?.length) { toast.info('No entries to export'); return }

    const headers = ['Date', 'Action', 'Entity Type', 'Entity ID', 'Actor', 'Description']
    const rows = data.map((e: any) => [
      new Date(e.created_at).toISOString(),
      e.action, e.entity_type, e.entity_id,
      e.actor_email || 'System', e.description || ''
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit log exported')
  } catch { toast.error('Failed to export') }
}

onMounted(() => {
  loadAuditLog()
  loadAppSettings()
})
</script>

<template>
  <div>
    <!-- Section Toggle -->
    <div class="flex flex-wrap gap-2 mb-6">
      <v-btn
        v-for="s in [
          { key: 'audit', icon: 'mdi-history', label: 'Audit Log' },
          { key: 'settings', icon: 'mdi-cog', label: 'App Settings' }
        ]"
        :key="s.key"
        :variant="activeSection === s.key ? 'flat' : 'outlined'"
        :color="activeSection === s.key ? 'primary' : undefined"
        size="small"
        :prepend-icon="s.icon"
        @click="activeSection = s.key"
      >
        {{ s.label }}
      </v-btn>
    </div>

    <!-- ===== AUDIT LOG ===== -->
    <div v-show="activeSection === 'audit'">
      <!-- Filters -->
      <v-card rounded="lg" class="mb-4">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="auditFilter.search"
                label="Search (email, entity, description)"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                prepend-inner-icon="mdi-magnify"
                @keyup.enter="applyFilters"
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="auditFilter.action"
                :items="actionOptions"
                label="Action"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                v-model="auditFilter.entity_type"
                :items="entityOptions"
                label="Entity"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-text-field
                v-model="auditFilter.dateFrom"
                label="From"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6" md="2">
              <div class="d-flex gap-2">
                <v-text-field
                  v-model="auditFilter.dateTo"
                  label="To"
                  type="date"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                />
              </div>
            </v-col>
          </v-row>
          <div class="d-flex justify-space-between mt-3">
            <div class="d-flex gap-2">
              <v-btn size="small" color="primary" prepend-icon="mdi-filter" @click="applyFilters">Filter</v-btn>
              <v-btn size="small" variant="text" @click="clearFilters">Clear</v-btn>
            </div>
            <v-btn size="small" variant="outlined" prepend-icon="mdi-download" @click="exportAuditLog">Export CSV</v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Results -->
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Audit Trail</span>
          <v-chip size="small" variant="tonal">{{ auditTotal }} entries</v-chip>
        </v-card-title>

        <v-progress-linear v-if="loadingAudit" indeterminate color="primary" />

        <div v-if="auditEntries.length === 0 && !loadingAudit" class="text-center py-12 text-grey">
          <v-icon size="48" color="grey-lighten-1">mdi-clipboard-text-clock-outline</v-icon>
          <p class="mt-2">No audit entries found</p>
          <p class="text-caption">Activity will appear here as users interact with the system</p>
        </div>

        <v-list v-else density="compact" class="pa-0">
          <template v-for="entry in auditEntries" :key="entry.id">
            <v-list-item class="px-4 cursor-pointer" @click="toggleRow(entry.id)">
              <template #prepend>
                <v-chip :color="actionColor(entry.action)" size="x-small" variant="flat" class="mr-3" style="min-width: 60px; justify-content: center;">
                  {{ entry.action }}
                </v-chip>
              </template>
              <v-list-item-title class="text-body-2">
                <span class="font-weight-medium">{{ entry.actor_email }}</span>
                <span class="text-grey mx-1">→</span>
                <span>{{ entry.entity_type }}</span>
                <span v-if="entry.entity_id" class="text-caption text-grey ml-1">({{ entry.entity_id.substring(0, 8) }}...)</span>
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ entry.description }}
              </v-list-item-subtitle>
              <template #append>
                <span class="text-caption text-grey">{{ formatDate(entry.created_at) }}</span>
                <v-icon size="16" class="ml-2">{{ expandedRow === entry.id ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              </template>
            </v-list-item>

            <!-- Expanded details -->
            <v-expand-transition>
              <div v-if="expandedRow === entry.id" class="px-4 pb-4 bg-grey-lighten-5">
                <div class="pa-3 rounded bg-slate-50 border">
                  <div class="text-caption font-weight-bold mb-1">Change Details</div>
                  <pre v-if="entry.changes" class="text-caption overflow-auto" style="max-height: 200px;">{{ typeof entry.changes === 'string' ? entry.changes : JSON.stringify(entry.changes, null, 2) }}</pre>
                  <span v-else class="text-caption text-grey">No change details recorded</span>
                </div>
              </div>
            </v-expand-transition>
            <v-divider />
          </template>
        </v-list>

        <!-- Pagination -->
        <v-card-actions v-if="totalPages > 1" class="justify-center">
          <v-pagination v-model="auditPage" :length="totalPages" :total-visible="5" density="compact" @update:model-value="changePage" />
        </v-card-actions>
      </v-card>
    </div>

    <!-- ===== APP SETTINGS ===== -->
    <div v-show="activeSection === 'settings'">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Application Settings</span>
          <div class="d-flex gap-2">
            <v-text-field
              v-model="settingsSearch"
              placeholder="Filter..."
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-magnify"
              style="max-width: 200px;"
            />
            <v-select
              v-model="settingsCategory"
              :items="settingCategories"
              label="Category"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              style="max-width: 140px;"
            />
            <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openSettingDialog()">Add</v-btn>
          </div>
        </v-card-title>

        <v-progress-linear v-if="loadingSettings" indeterminate color="primary" />

        <div v-if="filteredSettings.length === 0 && !loadingSettings" class="text-center py-12 text-grey">
          <v-icon size="48" color="grey-lighten-1">mdi-cog-outline</v-icon>
          <p class="mt-2">No settings found</p>
        </div>

        <v-table v-else density="compact">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Updated</th>
              <th style="width: 100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="setting in filteredSettings" :key="setting.key">
              <td class="font-mono text-caption">{{ setting.key }}</td>
              <td class="text-caption" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ typeof setting.value === 'object' ? JSON.stringify(setting.value) : setting.value }}
              </td>
              <td class="text-caption text-grey">{{ setting.updated_at ? formatDate(setting.updated_at) : '-' }}</td>
              <td>
                <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openSettingDialog(setting)" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteSetting(setting)" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-alert type="info" variant="tonal" class="mt-4">
        <v-icon start>mdi-information</v-icon>
        App settings are key-value pairs that control system behavior (Slack channels, integration config, feature flags, etc.)
        Changes take effect immediately.
      </v-alert>
    </div>

    <!-- ===== SETTING DIALOG ===== -->
    <v-dialog v-model="showSettingDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingSetting ? 'Edit Setting' : 'Add Setting' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="settingForm.key"
            label="Key"
            variant="outlined"
            class="mb-3"
            :disabled="!!editingSetting"
            placeholder="e.g. slack_default_channel"
            hint="Unique identifier (snake_case)"
            persistent-hint
          />
          <v-textarea
            v-model="settingForm.value"
            label="Value"
            variant="outlined"
            rows="4"
            placeholder="String or JSON value"
            hint="JSON objects/arrays are auto-parsed"
            persistent-hint
            class="font-mono"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSettingDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveSetting">{{ editingSetting ? 'Save' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
pre {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
