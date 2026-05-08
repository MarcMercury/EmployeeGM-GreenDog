<script setup lang="ts">
/**
 * Integrations & Database Management
 * Shows live integration status with actionable links,
 * database backup/export, and migration tools.
 */

const supabase = useSupabaseClient()
const toast = useToast()

const activeSection = ref('integrations')

// =====================================================
// INTEGRATIONS
// =====================================================
interface IntegrationCheck {
  id: string
  name: string
  category: string
  status: 'connected' | 'misconfigured' | 'error' | 'not_configured'
  configured: boolean
  connected: boolean
  latencyMs?: number
  message: string
  envVars: string[]
  optional: boolean
}

interface IntegrationsResponse {
  timestamp: string
  summary: {
    total: number
    connected: number
    misconfigured: number
    error: number
    not_configured: number
  }
  checks: IntegrationCheck[]
}

const integrationsResponse = ref<IntegrationsResponse | null>(null)
const loadingIntegrations = ref(false)

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  core: { label: 'Core', icon: 'mdi-server' },
  ai: { label: 'AI / ML', icon: 'mdi-brain' },
  communications: { label: 'Communications', icon: 'mdi-message-text' },
  scheduling: { label: 'Scheduling & Workspace', icon: 'mdi-calendar' },
  observability: { label: 'Observability', icon: 'mdi-monitor-eye' },
  analytics: { label: 'Analytics', icon: 'mdi-chart-line' },
  finance: { label: 'Finance & Documents', icon: 'mdi-cash' },
  marketing: { label: 'Marketing & Maps', icon: 'mdi-bullhorn' },
  veterinary: { label: 'Veterinary', icon: 'mdi-paw' },
}

const CATEGORY_ORDER = ['core', 'ai', 'communications', 'scheduling', 'observability', 'analytics', 'finance', 'marketing', 'veterinary']

const groupedIntegrations = computed(() => {
  const checks = integrationsResponse.value?.checks ?? []
  const groups: { category: string; label: string; icon: string; items: IntegrationCheck[] }[] = []
  for (const cat of CATEGORY_ORDER) {
    const items = checks.filter(c => c.category === cat)
    if (!items.length) continue
    const meta = CATEGORY_META[cat] || { label: cat, icon: 'mdi-puzzle' }
    groups.push({ category: cat, label: meta.label, icon: meta.icon, items })
  }
  return groups
})

function statusColor(status: IntegrationCheck['status']) {
  switch (status) {
    case 'connected': return 'success'
    case 'misconfigured': return 'warning'
    case 'error': return 'error'
    case 'not_configured': return 'grey'
  }
}

function statusIcon(status: IntegrationCheck['status']) {
  switch (status) {
    case 'connected': return 'mdi-check-circle'
    case 'misconfigured': return 'mdi-alert'
    case 'error': return 'mdi-close-circle'
    case 'not_configured': return 'mdi-circle-outline'
  }
}

function statusLabel(status: IntegrationCheck['status']) {
  switch (status) {
    case 'connected': return 'Connected'
    case 'misconfigured': return 'Misconfigured'
    case 'error': return 'Error'
    case 'not_configured': return 'Not configured'
  }
}

async function loadIntegrations() {
  loadingIntegrations.value = true
  try {
    integrationsResponse.value = await $fetch<IntegrationsResponse>('/api/system/integrations-status')
  } catch (err: any) {
    toast.error(err?.data?.message || err?.message || 'Failed to load integrations')
  } finally {
    loadingIntegrations.value = false
  }
}

// =====================================================
// DATA MANAGEMENT
// =====================================================
const lastBackup = ref<string | null>(null)
const backingUp = ref(false)
const exporting = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

async function backupDatabase() {
  backingUp.value = true
  try {
    const [employeesRes, deptRes, shiftRes, companyRes, locRes, posRes, settingsRes] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('departments').select('*'),
      supabase.from('shifts').select('*'),
      supabase.from('company_settings').select('*'),
      supabase.from('locations').select('*'),
      supabase.from('job_positions').select('*'),
      supabase.from('app_settings').select('*')
    ])

    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.0',
      tables: {
        employees: employeesRes.data || [],
        departments: deptRes.data || [],
        shifts: shiftRes.data || [],
        company_settings: companyRes.data || [],
        locations: locRes.data || [],
        job_positions: posRes.data || [],
        app_settings: settingsRes.data || []
      },
      counts: {
        employees: employeesRes.data?.length || 0,
        departments: deptRes.data?.length || 0,
        shifts: shiftRes.data?.length || 0,
        locations: locRes.data?.length || 0,
        job_positions: posRes.data?.length || 0,
        app_settings: settingsRes.data?.length || 0
      }
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    lastBackup.value = new Date().toLocaleString()
    toast.success('Backup created successfully')
  } catch { toast.error('Failed to create backup') }
  finally { backingUp.value = false }
}

async function exportEmployeeData() {
  exporting.value = true
  try {
    const { data: employees } = await supabase
      .from('employees')
      .select('first_name, last_name, email_work, phone_mobile, hire_date, employment_status, position:job_positions(title), department:departments(name)')
      .eq('employment_status', 'active')

    if (!employees?.length) { toast.info('No data to export'); return }

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Hire Date', 'Department', 'Position']
    const rows = employees.map((e: any) => [
      e.first_name || '', e.last_name || '', e.email_work || '',
      e.phone_mobile || '', e.hire_date || '',
      e.department?.name || '', e.position?.title || ''
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported')
  } catch { toast.error('Failed to export') }
  finally { exporting.value = false }
}

function triggerImport() { importInput.value?.click() }

function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  toast.info(`File "${file.name}" loaded. Import processing coming soon.`)
  if (event.target) (event.target as HTMLInputElement).value = ''
}

// =====================================================
// MIGRATION TOOLS
// =====================================================
const migration = reactive({ name: '', sql: '' })

function copyMigration() {
  if (!migration.sql) { toast.warning('No SQL to copy'); return }
  navigator.clipboard.writeText(migration.sql)
  toast.success('Copied to clipboard')
}

function downloadMigration() {
  if (!migration.name || !migration.sql) { toast.warning('Enter name and SQL'); return }
  const blob = new Blob([migration.sql], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${migration.name}.sql`
  a.click()
  toast.success('Migration file downloaded')
}

onMounted(() => {
  loadIntegrations()
})
</script>

<template>
  <div>
    <!-- Section Toggle -->
    <div class="flex flex-wrap gap-2 mb-6">
      <v-btn
        v-for="s in [
          { key: 'integrations', icon: 'mdi-connection', label: 'Integrations' },
          { key: 'data', icon: 'mdi-database-export', label: 'Data Management' },
          { key: 'migrations', icon: 'mdi-database-cog', label: 'Migrations' }
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

    <!-- ===== INTEGRATIONS ===== -->
    <div v-show="activeSection === 'integrations'">
      <v-progress-circular v-if="loadingIntegrations" indeterminate color="primary" class="d-block mx-auto my-8" />
      <template v-else-if="integrationsResponse">
        <!-- Summary -->
        <v-row dense class="mb-2">
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="text-center pa-3">
              <div class="text-h5 font-weight-bold text-success">{{ integrationsResponse.summary.connected }}</div>
              <div class="text-caption text-grey">Connected</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="text-center pa-3">
              <div class="text-h5 font-weight-bold text-warning">{{ integrationsResponse.summary.misconfigured }}</div>
              <div class="text-caption text-grey">Misconfigured</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="text-center pa-3">
              <div class="text-h5 font-weight-bold text-error">{{ integrationsResponse.summary.error }}</div>
              <div class="text-caption text-grey">Errors</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card variant="outlined" class="text-center pa-3">
              <div class="text-h5 font-weight-bold text-grey">{{ integrationsResponse.summary.not_configured }}</div>
              <div class="text-caption text-grey">Not configured</div>
            </v-card>
          </v-col>
        </v-row>
        <p class="text-caption text-grey mb-4">
          Last checked {{ new Date(integrationsResponse.timestamp).toLocaleString() }}
        </p>

        <!-- Grouped checks -->
        <div v-for="group in groupedIntegrations" :key="group.category" class="mb-6">
          <h3 class="text-subtitle-1 font-weight-bold mb-2 d-flex align-center gap-2">
            <v-icon size="20">{{ group.icon }}</v-icon>
            {{ group.label }}
          </h3>
          <v-row dense>
            <v-col v-for="int in group.items" :key="int.id" cols="12" sm="6" md="4" lg="3">
              <v-card variant="outlined" class="fill-height">
                <v-card-text class="py-3">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <span class="text-subtitle-2 font-weight-bold">{{ int.name }}</span>
                    <v-chip
                      :color="statusColor(int.status)"
                      size="x-small"
                      variant="tonal"
                      :prepend-icon="statusIcon(int.status)"
                    >
                      {{ statusLabel(int.status) }}
                    </v-chip>
                  </div>
                  <p class="text-caption text-grey-darken-1 mb-1" style="min-height: 2.4em;">
                    {{ int.message }}
                  </p>
                  <div class="text-caption text-grey d-flex justify-space-between">
                    <span v-if="int.latencyMs != null">{{ int.latencyMs }}ms</span>
                    <span v-else></span>
                    <span v-if="!int.optional" class="text-error font-weight-medium">Required</span>
                  </div>
                  <div v-if="int.status !== 'connected'" class="mt-2">
                    <v-chip
                      v-for="v in int.envVars"
                      :key="v"
                      size="x-small"
                      variant="outlined"
                      class="mr-1 mb-1"
                    >
                      {{ v }}
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </template>

      <v-btn class="mt-2" variant="outlined" prepend-icon="mdi-refresh" size="small" @click="loadIntegrations">
        Re-run Checks
      </v-btn>
    </div>

    <!-- ===== DATA MANAGEMENT ===== -->
    <div v-show="activeSection === 'data'">
      <v-row>
        <v-col cols="12" md="4">
          <v-card rounded="lg" class="fill-height">
            <v-card-text class="text-center py-8">
              <v-icon size="48" color="warning" class="mb-3">mdi-database-refresh</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold">Full Backup</h3>
              <p class="text-body-2 text-grey mb-4">
                Download a JSON backup of all core tables (employees, departments, positions, locations, settings, shifts).
              </p>
              <p v-if="lastBackup" class="text-caption text-grey mb-2">Last: {{ lastBackup }}</p>
              <v-btn color="warning" variant="flat" :loading="backingUp" @click="backupDatabase">
                <v-icon start>mdi-download</v-icon>
                Create Backup
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card rounded="lg" class="fill-height">
            <v-card-text class="text-center py-8">
              <v-icon size="48" color="primary" class="mb-3">mdi-file-delimited</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold">Export Employees</h3>
              <p class="text-body-2 text-grey mb-4">
                Download active employee data as a CSV file with names, emails, positions, and departments.
              </p>
              <v-btn color="primary" variant="flat" :loading="exporting" @click="exportEmployeeData">
                <v-icon start>mdi-download</v-icon>
                Export CSV
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card rounded="lg" class="fill-height">
            <v-card-text class="text-center py-8">
              <v-icon size="48" color="info" class="mb-3">mdi-upload</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold">Import Data</h3>
              <p class="text-body-2 text-grey mb-4">
                Upload a CSV file to import employee, schedule, or other data into the system.
              </p>
              <v-btn color="info" variant="flat" @click="triggerImport">
                <v-icon start>mdi-upload</v-icon>
                Import CSV
              </v-btn>
              <input ref="importInput" type="file" accept=".csv" hidden @change="handleImport" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== MIGRATIONS ===== -->
    <div v-show="activeSection === 'migrations'">
      <v-alert type="warning" variant="tonal" class="mb-6">
        <v-icon start>mdi-alert</v-icon>
        Database operations require careful consideration. Changes may affect application functionality.
      </v-alert>

      <v-card rounded="lg">
        <v-card-title>Create Migration</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="migration.name"
            label="Migration Name"
            placeholder="e.g., add_employee_status_field"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="migration.sql"
            label="SQL Statement"
            placeholder="ALTER TABLE employees ADD COLUMN status VARCHAR(50);"
            variant="outlined"
            rows="8"
            style="font-family: 'Fira Code', monospace;"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-btn variant="outlined" prepend-icon="mdi-content-copy" @click="copyMigration">Copy</v-btn>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-download" @click="downloadMigration">Download .sql</v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>
