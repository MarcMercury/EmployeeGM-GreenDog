<template>
  <div class="api-monitoring-page">
    <div class="page-header">
      <h1 class="text-h4 font-weight-bold">API Error Monitoring</h1>
      <p class="text-body-2 text-grey-darken-1">Real-time tracking of API errors and missing endpoints</p>
    </div>

    <v-container flat>
      <!-- Summary Cards -->
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="outlined">
            <v-card-text>
              <div class="text-caption text-grey">24h Errors</div>
              <div class="text-h4 font-weight-bold">{{ summary.lastErrors }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="outlined" :class="summary.missing404Endpoints > 0 ? 'border-red' : ''">
            <v-card-text>
              <div class="text-caption text-grey">Missing 404s</div>
              <div class="text-h4 font-weight-bold text-error">{{ summary.missing404Endpoints }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="outlined">
            <v-card-text>
              <div class="text-caption text-grey">Server Errors</div>
              <div class="text-h4 font-weight-bold">{{ serverErrorCount }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card variant="outlined">
            <v-card-text>
              <div class="text-caption text-grey">Last Updated</div>
              <div class="text-body-2">{{ lastUpdated }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="mt-6">
        <v-tab value="recent">Recent Errors</v-tab>
        <v-tab value="missing" :title="`Missing Endpoints (${summary.missing404Endpoints})`">
          Missing Endpoints
        </v-tab>
        <v-tab value="trends">7-Day Trends</v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="mt-4">
        <!-- Recent Errors Tab -->
        <v-window-item value="recent">
          <v-card variant="outlined">
            <v-card-text>
              <v-data-table
                :headers="errorHeaders"
                :items="summary.recentErrors"
                density="compact"
                class="elevation-0"
              >
                <template #item.status="{ item }">
                  <v-chip
                    :color="getStatusColor(item.status_code)"
                    size="small"
                    text-color="white"
                  >
                    {{ item.status_code }}
                  </v-chip>
                </template>
                <template #item.timestamp="{ item }">
                  {{ formatTime(item.timestamp) }}
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- Missing Endpoints Tab -->
        <v-window-item value="missing">
          <div v-if="summary.missingEndpoints.length === 0" class="py-12 text-center">
            <v-icon size="48" color="success" class="mb-4">mdi-check-circle</v-icon>
            <p class="text-h6">✅ No Missing Endpoints</p>
            <p class="text-body-2 text-grey">All called endpoints exist!</p>
          </div>

          <v-card v-else variant="outlined">
            <v-card-text>
              <div class="text-subtitle-2 font-weight-bold mb-4">⚠️ Action Required</div>
              <div class="space-y-3">
                <v-card
                  v-for="endpoint in summary.missingEndpoints"
                  :key="endpoint.endpoint"
                  variant="tonal"
                  color="error"
                  class="pa-4"
                >
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="font-mono text-body-2 font-weight-bold">
                        {{ endpoint.endpoint }}
                      </div>
                      <div class="text-caption text-grey mt-1">
                        {{ endpoint.error_count }} errors
                        • First seen: {{ formatDate(endpoint.first_seen) }}
                      </div>
                    </div>
                    <v-btn
                      size="small"
                      color="primary"
                      variant="tonal"
                      @click="copyEndpoint(endpoint.endpoint)"
                    >
                      Copy
                    </v-btn>
                  </div>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- Trends Tab -->
        <v-window-item value="trends">
          <v-card variant="outlined">
            <v-card-text>
              <v-data-table
                :headers="trendHeaders"
                :items="summary.trends"
                density="compact"
                class="elevation-0"
              >
                <template #item.status_code="{ item }">
                  <v-chip
                    :color="getStatusColor(item.status_code)"
                    size="small"
                    text-color="white"
                  >
                    {{ item.status_code }}
                  </v-chip>
                </template>
                <template #item.date="{ item }">
                  {{ formatDate(item.date) }}
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- Instructions -->
      <v-card variant="outlined" class="mt-8 bg-blue-lighten-5">
        <v-card-text>
          <div class="text-subtitle-2 font-weight-bold mb-2">📘 About This Dashboard</div>
          <p class="text-body-2 mb-2">
            This real-time monitoring system automatically tracks all API errors, detects missing endpoints,
            and alerts your team on Slack.
          </p>
          <ul class="text-body-2 ml-4">
            <li>✅ Automatic 404 detection</li>
            <li>✅ Daily health checks</li>
            <li>✅ Slack notifications for critical issues</li>
            <li>✅ 7-day trend analysis</li>
            <li>✅ Zero false positives</li>
          </ul>
          <p class="text-body-2 mt-3 font-weight-bold">
            Missing endpoint? Create the API handler and redeploy!
          </p>
        </v-card-text>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '#app'

const toast = useToast()
const activeTab = ref('recent')
const summary = ref<any>({
  lastErrors: 0,
  missing404Endpoints: 0,
  recentErrors: [],
  missingEndpoints: [],
  trends: [],
})

const errorHeaders = [
  { title: 'Endpoint', value: 'endpoint', width: '40%' },
  { title: 'Method', value: 'method', width: '10%' },
  { title: 'Status', value: 'status_code', width: '10%' },
  { title: 'Time', value: 'timestamp', width: '20%' },
  { title: 'Error', value: 'error_message', width: '20%' },
]

const trendHeaders = [
  { title: 'Date', value: 'date' },
  { title: 'Endpoint', value: 'endpoint' },
  { title: 'Method', value: 'method' },
  { title: 'Status', value: 'status_code' },
  { title: 'Count', value: 'error_count' },
  { title: 'Avg Duration', value: 'avg_duration_ms' },
]

const serverErrorCount = computed(() => {
  return summary.value.recentErrors?.filter((e: any) => e.status_code >= 500).length || 0
})

const lastUpdated = computed(() => {
  if (!summary.value.recentErrors || summary.value.recentErrors.length === 0) {
    return 'No data'
  }
  return formatTime(summary.value.recentErrors[0].timestamp)
})

async function loadData() {
  try {
    const response = await $fetch('/api/system/track-api-errors')
    summary.value = response
  } catch (err: any) {
    toast.error('Failed to load error data')
    console.error(err)
  }
}

function getStatusColor(status: number): string {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  return 'success'
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function copyEndpoint(endpoint: string) {
  navigator.clipboard.writeText(endpoint)
  toast.success('Endpoint copied!')
}

onMounted(async () => {
  await loadData()
  // Refresh every 30 seconds
  setInterval(loadData, 30000)
})

// Require admin access
definePageMeta({
  middleware: 'require-admin',
})
</script>

<style scoped>
.api-monitoring-page {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.border-red {
  border-color: rgb(244, 67, 54) !important;
  border-width: 2px;
}

.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.space-y-3 > * + * {
  margin-top: 1rem;
}

:deep(.text-grey) {
  color: rgb(158, 158, 158);
}
</style>
