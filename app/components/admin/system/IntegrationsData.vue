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
const integrations = ref<any[]>([])
const loadingIntegrations = ref(false)

async function loadIntegrations() {
  loadingIntegrations.value = true
  try {
    const results = await Promise.allSettled([
      checkSlack(),
      checkEzyVet(),
      checkOpenAI(),
      checkSupabase()
    ])

    integrations.value = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value)
  } catch (err) {
    console.error('Error loading integrations:', err)
  } finally {
    loadingIntegrations.value = false
  }
}

async function checkSlack(): Promise<any> {
  let connected = false
  let details = ''
  try {
    const health = await $fetch('/api/slack/health')
    connected = health?.status === 'healthy' || health?.status === 'degraded' || health?.connected === true
    details = health?.status === 'healthy' ? 'All channels active' : health?.message || 'Degraded'
  } catch { details = 'Not configured' }

  return {
    id: 'slack', name: 'Slack', description: 'Team communication and notifications',
    icon: 'mdi-slack', connected, details,
    configUrl: '/admin/slack', color: connected ? 'purple' : 'grey'
  }
}

async function checkEzyVet(): Promise<any> {
  let connected = false
  let details = ''
  try {
    const { count, error } = await supabase.from('ezyvet_contacts').select('*', { count: 'exact', head: true }).limit(1)
    connected = !error && count !== null && count > 0
    details = connected ? `${count} contacts synced` : 'No data'
  } catch { details = 'Not configured' }

  return {
    id: 'ezyvet', name: 'EzyVet', description: 'Veterinary practice management',
    icon: 'mdi-paw', connected, details,
    configUrl: null, color: connected ? 'teal' : 'grey'
  }
}

async function checkOpenAI(): Promise<any> {
  let connected = false
  let details = ''
  try {
    const health = await $fetch('/api/agents/health')
    connected = health?.openai === true || health?.status === 'ok'
    details = connected ? 'API connected' : 'Inactive'
  } catch {
    try {
      const { count } = await supabase.from('agent_runs').select('*', { count: 'exact', head: true })
        .eq('status', 'success').gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(1)
      connected = (count ?? 0) > 0
      details = connected ? `${count} runs (24h)` : 'No recent activity'
    } catch { details = 'Not configured' }
  }

  return {
    id: 'openai', name: 'OpenAI', description: 'AI agent intelligence & analysis',
    icon: 'mdi-brain', connected, details,
    configUrl: '/admin/agents', color: connected ? 'deep-purple' : 'grey'
  }
}

async function checkSupabase(): Promise<any> {
  let details = ''
  try {
    const start = Date.now()
    await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1)
    const latency = Date.now() - start
    details = `${latency}ms latency`
  } catch { details = 'Connection error' }

  return {
    id: 'supabase', name: 'Supabase', description: 'Database & authentication',
    icon: 'mdi-database', connected: true, details,
    configUrl: null, color: 'green'
  }
}

function openIntegration(integration: any) {
  if (integration.configUrl) {
    navigateTo(integration.configUrl)
  } else {
    toast.info(`${integration.name} configuration is managed externally`)
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
      <v-row v-else>
        <v-col v-for="int in integrations" :key="int.id" cols="12" sm="6" md="3">
          <v-card rounded="lg" :class="int.connected ? 'border-l-4' : ''" :style="int.connected ? `border-left-color: rgb(var(--v-theme-${int.color}))` : ''">
            <v-card-text class="text-center py-6">
              <v-avatar size="56" :color="int.connected ? int.color : 'grey-lighten-2'" class="mb-3">
                <v-icon size="28" :color="int.connected ? 'white' : 'grey'">{{ int.icon }}</v-icon>
              </v-avatar>
              <h3 class="text-subtitle-1 font-weight-bold">{{ int.name }}</h3>
              <p class="text-body-2 text-grey mb-2">{{ int.description }}</p>
              <v-chip :color="int.connected ? 'success' : 'grey'" size="small" variant="tonal" class="mb-1">
                <v-icon start size="12">{{ int.connected ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
                {{ int.connected ? 'Connected' : 'Disconnected' }}
              </v-chip>
              <p class="text-caption text-grey mt-1">{{ int.details }}</p>
            </v-card-text>
            <v-divider />
            <v-card-actions>
              <v-btn
                :color="int.configUrl ? 'primary' : 'grey'"
                variant="text"
                block
                :prepend-icon="int.configUrl ? 'mdi-cog' : 'mdi-open-in-new'"
                @click="openIntegration(int)"
              >
                {{ int.configUrl ? 'Configure' : 'External' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-btn class="mt-4" variant="outlined" prepend-icon="mdi-refresh" size="small" @click="loadIntegrations">
        Refresh Status
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
