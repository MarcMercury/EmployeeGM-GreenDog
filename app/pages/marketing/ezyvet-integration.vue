<template>
  <div class="ezyvet-integration-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">ezyVet API Integration</h1>
        <p class="text-subtitle-1 text-grey">
          Live data sync — Appointments, Staff, Consults from ezyVet
        </p>
        <div v-if="dashboard?.lastSync" class="text-caption text-grey mt-1">
          <v-icon size="14" class="mr-1">mdi-sync</v-icon>
          Last sync: {{ formatDateTime(dashboard.lastSync.completed_at) }}
          — {{ dashboard.lastSync.sync_type }} ({{ dashboard.lastSync.status }})
        </div>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="teal"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="refresh"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Clinic Selector + Sync Controls -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedClinicId"
              :items="clinicOptions"
              item-title="label"
              item-value="id"
              label="Clinic / Location"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-hospital-building"
              @update:model-value="refresh"
            />
          </v-col>
          <v-col cols="12" md="8">
            <div class="d-flex gap-2 flex-wrap">
              <v-btn
                color="teal"
                prepend-icon="mdi-cloud-sync"
                :loading="syncing"
                :disabled="!selectedClinicId"
                @click="runSync('full')"
              >
                Full Sync
              </v-btn>
              <v-btn
                color="blue"
                variant="outlined"
                prepend-icon="mdi-account-group"
                :loading="syncing"
                :disabled="!selectedClinicId"
                @click="runSync('users')"
              >
                Sync Users
              </v-btn>
              <v-btn
                color="purple"
                variant="outlined"
                prepend-icon="mdi-calendar-clock"
                :loading="syncing"
                :disabled="!selectedClinicId"
                @click="runSync('appointments')"
              >
                Sync Appointments
              </v-btn>
              <v-btn
                color="orange"
                variant="outlined"
                prepend-icon="mdi-stethoscope"
                :loading="syncing"
                :disabled="!selectedClinicId"
                @click="runSync('consults')"
              >
                Sync Consults
              </v-btn>
              <v-spacer />
              <v-btn
                color="deep-purple"
                variant="text"
                prepend-icon="mdi-webhook"
                :disabled="!selectedClinicId"
                @click="registerWebhooks"
              >
                Setup Webhooks
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Error Alert -->
    <v-alert v-if="error" type="error" closable class="mb-4" @click:close="error = null">
      {{ error }}
    </v-alert>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="teal" timeout="4000">
      {{ successMessage }}
      <template #actions>
        <v-btn variant="text" @click="showSuccess = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Loading -->
    <div v-if="loading && !dashboard" class="text-center py-12">
      <v-progress-circular indeterminate color="teal" size="64" />
      <p class="text-grey mt-4">Loading ezyVet data...</p>
    </div>

    <!-- No Clinics Configured -->
    <v-card v-else-if="dashboard && !dashboard.clinics?.length" class="mb-6 pa-8 text-center" elevation="2">
      <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-database-off</v-icon>
      <h3 class="text-h5 mb-2">No ezyVet Clinics Configured</h3>
      <p class="text-body-1 text-grey mb-4">
        Add your ezyVet API credentials to the <code>ezyvet_clinics</code> table in Supabase to get started.
      </p>
      <p class="text-body-2 text-grey">
        You'll need: <strong>partner_id</strong>, <strong>client_id</strong>, <strong>client_secret</strong>,
        and the <strong>site_uid</strong> for each location.
      </p>
    </v-card>

    <!-- Dashboard KPIs -->
    <template v-if="dashboard">
      <v-row class="mb-4">
        <!-- Appointments -->
        <v-col cols="12" md="3">
          <v-card elevation="2" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon color="purple" size="28" class="mr-2">mdi-calendar-clock</v-icon>
              <span class="text-subtitle-2 text-grey">Appointments</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ dashboard.appointments.total.toLocaleString() }}</div>
            <div class="text-caption text-grey">
              {{ dashboard.appointments.today }} today
            </div>
          </v-card>
        </v-col>

        <!-- Staff/Users -->
        <v-col cols="12" md="3">
          <v-card elevation="2" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon color="blue" size="28" class="mr-2">mdi-account-group</v-icon>
              <span class="text-subtitle-2 text-grey">Staff Synced</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ dashboard.users.total }}</div>
            <div class="text-caption text-grey">
              {{ dashboard.users.active }} active
            </div>
          </v-card>
        </v-col>

        <!-- Consults -->
        <v-col cols="12" md="3">
          <v-card elevation="2" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon color="orange" size="28" class="mr-2">mdi-stethoscope</v-icon>
              <span class="text-subtitle-2 text-grey">Consults</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ dashboard.consults.total.toLocaleString() }}</div>
            <div class="text-caption text-grey">
              {{ Object.keys(dashboard.consults.byStatus).length }} status types
            </div>
          </v-card>
        </v-col>

        <!-- Webhooks -->
        <v-col cols="12" md="3">
          <v-card elevation="2" class="pa-4">
            <div class="d-flex align-center mb-2">
              <v-icon color="deep-purple" size="28" class="mr-2">mdi-webhook</v-icon>
              <span class="text-subtitle-2 text-grey">Webhooks (24h)</span>
            </div>
            <div class="text-h4 font-weight-bold">{{ dashboard.webhooks.last24h }}</div>
            <div class="text-caption text-grey">
              {{ dashboard.webhooks.processed }} processed · {{ dashboard.webhooks.pending }} pending
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Appointment Status Breakdown & User Roles -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon class="mr-2" color="purple">mdi-chart-donut</v-icon>
              Appointments by Status
            </v-card-title>
            <v-card-text>
              <v-table v-if="Object.keys(dashboard.appointments.byStatus).length" density="compact">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th class="text-right">Count</th>
                    <th class="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(count, status) in dashboard.appointments.byStatus" :key="status">
                    <td>
                      <v-chip size="small" :color="statusColor(status as string)" variant="tonal">
                        {{ status }}
                      </v-chip>
                    </td>
                    <td class="text-right">{{ count.toLocaleString() }}</td>
                    <td class="text-right">
                      {{ dashboard.appointments.total ? ((count / dashboard.appointments.total) * 100).toFixed(1) : 0 }}%
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <p v-else class="text-grey text-center py-4">No appointment data yet. Run a sync to populate.</p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon class="mr-2" color="blue">mdi-badge-account</v-icon>
              Staff by Role
            </v-card-title>
            <v-card-text>
              <v-table v-if="Object.keys(dashboard.users.byRole).length" density="compact">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th class="text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(count, role) in dashboard.users.byRole" :key="role">
                    <td>{{ role }}</td>
                    <td class="text-right">{{ count }}</td>
                  </tr>
                </tbody>
              </v-table>
              <p v-else class="text-grey text-center py-4">No staff data yet. Run a sync to populate.</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Sync History -->
      <v-card elevation="2" class="mb-4">
        <v-card-title class="text-subtitle-1 d-flex align-center">
          <v-icon class="mr-2" color="teal">mdi-history</v-icon>
          Recent Sync History
          <v-spacer />
          <v-btn variant="text" size="small" prepend-icon="mdi-refresh" @click="fetchSyncLog()">
            Refresh
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-table v-if="syncLogs.length" density="compact" hover>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Started</th>
                <th class="text-right">Fetched</th>
                <th class="text-right">Upserted</th>
                <th class="text-right">Errors</th>
                <th>Duration</th>
                <th>Triggered By</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in syncLogs" :key="log.id">
                <td>
                  <v-chip size="x-small" :color="syncTypeColor(log.sync_type)">
                    {{ log.sync_type }}
                  </v-chip>
                </td>
                <td>
                  <v-chip size="x-small" :color="log.status === 'completed' ? 'green' : log.status === 'failed' ? 'red' : 'amber'" variant="tonal">
                    {{ log.status }}
                  </v-chip>
                </td>
                <td class="text-caption">{{ formatDateTime(log.started_at) }}</td>
                <td class="text-right">{{ log.records_fetched }}</td>
                <td class="text-right">{{ log.records_upserted }}</td>
                <td class="text-right">
                  <span :class="log.records_errored > 0 ? 'text-red' : ''">{{ log.records_errored }}</span>
                </td>
                <td class="text-caption">{{ log.completed_at ? duration(log.started_at, log.completed_at) : '—' }}</td>
                <td class="text-caption">{{ log.triggered_by === 'webhook' ? '🔔 Webhook' : '👤 Manual' }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="text-grey text-center py-4">No sync history yet.</p>
        </v-card-text>
      </v-card>

      <!-- Getting Started Guide -->
      <v-expansion-panels v-if="!dashboard.clinics?.length" class="mb-4">
        <v-expansion-panel title="🚀 Setup Guide — How to Connect ezyVet">
          <v-expansion-panel-text>
            <div class="text-body-2">
              <h4 class="mb-2">1. Obtain API Credentials</h4>
              <p class="mb-4">Contact ezyVet support or access your ezyVet admin panel to get:</p>
              <ul class="mb-4">
                <li><code>partner_id</code></li>
                <li><code>client_id</code></li>
                <li><code>client_secret</code></li>
                <li><code>site_uid</code> (unique per clinic location)</li>
              </ul>

              <h4 class="mb-2">2. Add Clinic to Database</h4>
              <p class="mb-4">Insert a row into <code>ezyvet_clinics</code> in Supabase with the credentials above, linking it to your <code>locations</code> table.</p>

              <h4 class="mb-2">3. Set Environment Variables</h4>
              <p class="mb-4">Add <code>EZYVET_WEBHOOK_SECRET</code> to your Vercel environment variables.</p>

              <h4 class="mb-2">4. Run Your First Sync</h4>
              <p class="mb-4">Select the clinic above and click "Full Sync" to pull all users, appointments, and consults.</p>

              <h4 class="mb-2">5. Register Webhooks</h4>
              <p>Click "Setup Webhooks" to have ezyVet push live updates to Employee GM.</p>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const {
  dashboard,
  syncLogs,
  selectedClinicId,
  loading,
  syncing,
  error,
  clinics,
  fetchDashboard,
  triggerSync,
  fetchSyncLog,
  setupWebhooks,
} = useEzyVetIntegration()

const showSuccess = ref(false)
const successMessage = ref('')

const clinicOptions = computed(() => clinics.value || [])

// ── Actions ──
async function refresh() {
  await Promise.all([
    fetchDashboard(selectedClinicId.value || undefined),
    fetchSyncLog(),
  ])
}

async function runSync(type: 'users' | 'appointments' | 'consults' | 'full') {
  const result = await triggerSync(type)
  if (result?.ok) {
    successMessage.value = `${type} sync completed for ${result.clinic}`
    showSuccess.value = true
  }
}

async function registerWebhooks() {
  const result = await setupWebhooks()
  if (result) {
    successMessage.value = 'Webhooks registered successfully'
    showSuccess.value = true
  }
}

// ── Helpers ──
function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function duration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'green',
    confirmed: 'blue',
    checked_in: 'teal',
    cancelled: 'red',
    no_show: 'orange',
    scheduled: 'indigo',
  }
  return map[status.toLowerCase()] || 'grey'
}

function syncTypeColor(type: string): string {
  const map: Record<string, string> = {
    users: 'blue',
    appointments: 'purple',
    consults: 'orange',
    full: 'teal',
    animals: 'green',
  }
  return map[type] || 'grey'
}

// ── Init ──
onMounted(() => refresh())
</script>

<style scoped>
.ezyvet-integration-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
</style>
