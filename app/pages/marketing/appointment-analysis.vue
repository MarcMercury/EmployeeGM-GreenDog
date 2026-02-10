<template>
  <div class="appointment-analysis-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Appointment Analysis</h1>
        <p class="text-subtitle-1 text-grey">
          Analyze appointment demand to optimize service scheduling and staffing
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-history"
          @click="showHistory = true"
        >
          Analysis History
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-upload"
          @click="showUploadDialog = true"
        >
          Upload Appointments
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-3">
              <v-icon color="white">mdi-calendar-check</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.totalAppointments) }}</div>
              <div class="text-caption text-grey">Total Appointments</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-3">
              <v-icon color="white">mdi-clipboard-list</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.uniqueTypes }}</div>
              <div class="text-caption text-grey">Appointment Types</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-3">
              <v-icon color="white">mdi-map-marker</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.uniqueLocations }}</div>
              <div class="text-caption text-grey">Locations</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="info" size="48" class="mr-3">
              <v-icon color="white">mdi-brain</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.analysisRuns }}</div>
              <div class="text-caption text-grey">Analyses Run</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.locationId"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="Location"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-map-marker"
              @update:model-value="loadAppointmentData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="filters.startDate"
              type="date"
              label="From Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-start"
              @update:model-value="loadAppointmentData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model="filters.endDate"
              type="date"
              label="To Date"
              variant="outlined"
              density="compact"
              hide-details
              prepend-inner-icon="mdi-calendar-end"
              @update:model-value="loadAppointmentData"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.serviceCategory"
              :items="serviceCategoryOptions"
              label="Service Category"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-medical-bag"
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex gap-2 align-center">
            <v-btn
              color="deep-purple"
              prepend-icon="mdi-brain"
              :loading="analyzing"
              :disabled="stats.totalAppointments === 0"
              @click="runAnalysis"
            >
              AI Analysis
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="loadAppointmentData"
            >
              Refresh
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-body-2 text-grey mt-4">Loading appointment data...</p>
    </div>

    <!-- No Data State -->
    <v-card v-else-if="stats.totalAppointments === 0" class="mb-6 pa-8 text-center" elevation="2">
      <v-icon size="72" color="grey-lighten-1" class="mb-4">mdi-calendar-blank</v-icon>
      <h3 class="text-h6 mb-2">No Appointment Data Yet</h3>
      <p class="text-body-2 text-grey mb-4">Upload appointment data from your practice management system (CSV export) to get started with demand analysis.</p>
      <v-btn color="primary" prepend-icon="mdi-upload" @click="showUploadDialog = true">
        Upload Appointments
      </v-btn>
    </v-card>

    <!-- Main Content -->
    <template v-else>
      <!-- Charts Row -->
      <v-row class="mb-6">
        <!-- Weekly Volume Trend -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-chart-line</v-icon>
              Weekly Appointment Volume
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="area"
                  height="280"
                  :options="weeklyTrendOptions"
                  :series="weeklyTrendSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Appointments by Type -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-chart-donut</v-icon>
              Appointment Types
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="donut"
                  height="280"
                  :options="typeBreakdownOptions"
                  :series="typeBreakdownSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-6">
        <!-- Day of Week Heatmap -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-calendar-week</v-icon>
              Demand by Day of Week
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="280"
                  :options="dayOfWeekOptions"
                  :series="dayOfWeekSeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Service Category Distribution -->
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon start size="20">mdi-medical-bag</v-icon>
              Service Category Distribution
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <apexchart
                  type="bar"
                  height="280"
                  :options="serviceCategoryOptions_chart"
                  :series="serviceCategorySeries"
                />
              </ClientOnly>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- AI Analysis Results -->
      <template v-if="analysisResult">
        <h2 class="text-h5 font-weight-bold mb-4">
          <v-icon start color="deep-purple">mdi-brain</v-icon>
          AI Analysis Results
        </h2>

        <!-- Insights -->
        <v-row class="mb-4" v-if="analysisResult.insights?.length">
          <v-col cols="12">
            <v-card elevation="2">
              <v-card-title class="text-subtitle-1">
                <v-icon start size="20">mdi-lightbulb</v-icon>
                Key Insights
              </v-card-title>
              <v-card-text>
                <v-alert
                  v-for="(insight, i) in analysisResult.insights"
                  :key="i"
                  :type="insight.severity === 'error' ? 'error' : insight.severity === 'warning' ? 'warning' : 'info'"
                  variant="tonal"
                  class="mb-2"
                  density="compact"
                >
                  <div class="d-flex align-center gap-2">
                    <v-chip size="x-small" :color="insightTypeColor(insight.type)">{{ insight.type }}</v-chip>
                    {{ insight.message }}
                  </div>
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Demand Summary Cards -->
        <v-row class="mb-4" v-if="analysisResult.demandSummary">
          <v-col
            v-for="(demand, code) in analysisResult.demandSummary"
            :key="code"
            cols="12" sm="6" md="4" lg="3"
          >
            <v-card elevation="2" class="pa-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-subtitle-2 font-weight-bold">{{ code }}</span>
                <v-chip
                  size="x-small"
                  :color="demand.trend === 'increasing' ? 'success' : demand.trend === 'decreasing' ? 'error' : 'grey'"
                >
                  {{ demand.trend === 'increasing' ? '↑' : demand.trend === 'decreasing' ? '↓' : '→' }}
                  {{ demand.trend }}
                </v-chip>
              </div>
              <div class="text-h6">{{ demand.avgPerWeek || 0 }}/week</div>
              <div class="text-caption text-grey">
                Peak: {{ (demand.peakDays || []).join(', ') || 'N/A' }}
              </div>
              <div class="text-caption text-grey">
                Avg duration: {{ demand.avgDuration || 0 }}min | Completion: {{ Math.round((demand.completionRate || 0) * 100) }}%
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Service Recommendations -->
        <v-card class="mb-6" elevation="2" v-if="analysisResult.serviceRecommendations?.length">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-star</v-icon>
            Service Scheduling Recommendations
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Recommended Days</th>
                  <th>Daily Volume</th>
                  <th>Staff Needed</th>
                  <th>Priority</th>
                  <th>Reasoning</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rec in analysisResult.serviceRecommendations" :key="rec.serviceCode">
                  <td>
                    <span class="font-weight-bold">{{ rec.serviceName || rec.serviceCode }}</span>
                    <div class="text-caption text-grey">{{ rec.serviceCode }}</div>
                  </td>
                  <td>
                    <v-chip
                      v-for="day in formatDays(rec.recommendedDays)"
                      :key="day"
                      size="x-small"
                      class="ma-1"
                      color="primary"
                      variant="tonal"
                    >{{ day }}</v-chip>
                  </td>
                  <td class="text-center">{{ rec.dailyVolume }}</td>
                  <td>
                    <div v-if="rec.staffNeeded" class="text-caption">
                      <span v-for="(count, role) in rec.staffNeeded" :key="role" class="mr-2">
                        {{ role }}: {{ count }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'grey'"
                    >{{ rec.priority }}</v-chip>
                  </td>
                  <td class="text-caption" style="max-width: 300px;">{{ rec.reasoning }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- Weekly Plan -->
        <v-card class="mb-6" elevation="2" v-if="analysisResult.weeklyPlan">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-calendar-month</v-icon>
            Recommended Weekly Plan
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col
                v-for="(plan, day) in analysisResult.weeklyPlan"
                :key="day"
                cols="12" sm="6" md="4" lg="auto"
                class="flex-grow-1"
              >
                <v-card variant="outlined" class="pa-3 h-100">
                  <div class="text-subtitle-2 font-weight-bold mb-2">
                    {{ day }}
                    <v-chip size="x-small" class="ml-1" color="grey">{{ plan.totalStaff }} staff</v-chip>
                  </div>
                  <div v-if="plan.services?.length">
                    <div
                      v-for="svc in plan.services"
                      :key="svc.code"
                      class="d-flex justify-space-between align-center mb-1"
                    >
                      <span class="text-caption">{{ svc.code }}</span>
                      <v-chip size="x-small" color="primary" variant="tonal">{{ svc.slots }} slots</v-chip>
                    </div>
                  </div>
                  <div v-else class="text-caption text-grey">No services recommended</div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Staffing Suggestions -->
        <v-card class="mb-6" elevation="2" v-if="analysisResult.staffingSuggestions?.length">
          <v-card-title class="text-subtitle-1">
            <v-icon start size="20">mdi-account-group</v-icon>
            Staffing Suggestions
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Role</th>
                  <th>Recommended</th>
                  <th>Capacity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(sug, i) in analysisResult.staffingSuggestions" :key="i">
                  <td class="font-weight-bold">{{ sug.serviceCode }}</td>
                  <td>{{ sug.role }}</td>
                  <td class="text-center">{{ sug.recommendedCount }}</td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="sug.currentCapacity === 'understaffed' ? 'error' : sug.currentCapacity === 'overstaffed' ? 'warning' : 'success'"
                    >{{ sug.currentCapacity }}</v-chip>
                  </td>
                  <td class="text-caption">{{ sug.notes }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </template>

      <!-- Recent Appointments Table -->
      <v-card elevation="2">
        <v-card-title class="text-subtitle-1">
          <v-icon start size="20">mdi-table</v-icon>
          Appointment Data 
          <v-chip size="x-small" class="ml-2" color="grey">{{ filteredAppointments.length }} records</v-chip>
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="tableHeaders"
            :items="filteredAppointments"
            :items-per-page="25"
            :search="tableSearch"
            density="compact"
            class="elevation-0"
          >
            <template #top>
              <v-text-field
                v-model="tableSearch"
                prepend-inner-icon="mdi-magnify"
                label="Search appointments..."
                variant="outlined"
                density="compact"
                clearable
                hide-details
                class="mb-4"
                style="max-width: 400px;"
              />
            </template>
            <template #item.appointment_date="{ item }">
              {{ formatDate(item.appointment_date) }}
            </template>
            <template #item.service_category="{ item }">
              <v-chip size="x-small" :color="item.service_category ? 'primary' : 'grey'" variant="tonal">
                {{ item.service_category || 'Unmapped' }}
              </v-chip>
            </template>
            <template #item.status="{ item }">
              <v-chip
                size="x-small"
                :color="item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'error' : item.status === 'no_show' ? 'warning' : 'grey'"
              >{{ item.status || 'Unknown' }}</v-chip>
            </template>
            <template #item.revenue="{ item }">
              {{ item.revenue ? `$${parseFloat(item.revenue).toFixed(0)}` : '-' }}
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </template>

    <!-- Upload Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="640" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-upload</v-icon>
          Upload Appointment Data
          <v-spacer />
          <v-btn icon variant="text" @click="showUploadDialog = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            Upload a CSV export from your practice management system (EzyVet, etc).
            Include columns like: Date, Type, Species, Status, Duration, Provider, Location.
          </v-alert>

          <v-select
            v-model="uploadForm.locationId"
            :items="locationOptions"
            item-title="name"
            item-value="id"
            label="Location (optional - overrides CSV location)"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            class="mb-4"
          />

          <v-file-input
            v-model="uploadForm.file"
            label="Select CSV File"
            accept=".csv"
            variant="outlined"
            density="compact"
            prepend-icon="mdi-file-delimited"
            :rules="[v => !!v || 'File is required']"
            @update:model-value="previewCsv"
          />

          <!-- Preview -->
          <template v-if="csvPreview.rows.length">
            <div class="text-caption text-grey mb-1">
              Preview: {{ csvPreview.totalRows }} rows, {{ csvPreview.columns.length }} columns
            </div>
            <v-table density="compact" class="mb-4" style="max-height: 200px; overflow-y: auto;">
              <thead>
                <tr>
                  <th v-for="col in csvPreview.columns" :key="col" class="text-caption">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in csvPreview.rows.slice(0, 5)" :key="i">
                  <td v-for="col in csvPreview.columns" :key="col" class="text-caption">
                    {{ row[col] || '' }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </template>

          <v-checkbox
            v-model="uploadForm.autoAnalyze"
            label="Run AI analysis after upload"
            density="compact"
            hide-details
            color="deep-purple"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUploadDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="uploading"
            :disabled="!uploadForm.file"
            @click="uploadAppointments"
          >
            Upload & Process
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Analysis History Dialog -->
    <v-dialog v-model="showHistory" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-history</v-icon>
          Analysis History
          <v-spacer />
          <v-btn icon variant="text" @click="showHistory = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-data-table
            :headers="historyHeaders"
            :items="analysisHistory"
            density="compact"
            :items-per-page="10"
          >
            <template #item.status="{ item }">
              <v-chip
                size="x-small"
                :color="item.status === 'completed' ? 'success' : item.status === 'failed' ? 'error' : 'warning'"
              >{{ item.status }}</v-chip>
            </template>
            <template #item.created_at="{ item }">{{ formatDateTime(item.created_at) }}</template>
            <template #item.actions="{ item }">
              <v-btn
                v-if="item.status === 'completed'"
                size="small"
                variant="text"
                color="primary"
                @click="loadHistoricalAnalysis(item)"
              >View</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// ── State ────────────────────────────────────────────────────────────────

const loading = ref(false)
const analyzing = ref(false)
const uploading = ref(false)
const showUploadDialog = ref(false)
const showHistory = ref(false)
const tableSearch = ref('')

const filters = reactive({
  locationId: null as string | null,
  startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  serviceCategory: null as string | null,
})

const uploadForm = reactive({
  file: null as File | null,
  locationId: null as string | null,
  autoAnalyze: true,
})

const csvPreview = reactive({
  columns: [] as string[],
  rows: [] as Record<string, string>[],
  totalRows: 0,
})

const stats = reactive({
  totalAppointments: 0,
  uniqueTypes: 0,
  uniqueLocations: 0,
  analysisRuns: 0,
})

const appointments = ref<any[]>([])
const analysisResult = ref<any>(null)
const analysisHistory = ref<any[]>([])
const locationOptions = ref<{ id: string; name: string }[]>([])

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success',
})

// ── Table headers ────────────────────────────────────────────────────────

const tableHeaders = [
  { title: 'Date', key: 'appointment_date', sortable: true },
  { title: 'Type', key: 'appointment_type', sortable: true },
  { title: 'Service', key: 'service_category', sortable: true },
  { title: 'Species', key: 'species', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Duration', key: 'duration_minutes', sortable: true },
  { title: 'Revenue', key: 'revenue', sortable: true },
  { title: 'Provider', key: 'provider_name', sortable: true },
  { title: 'Location', key: 'location_name', sortable: true },
]

const historyHeaders = [
  { title: 'Date', key: 'created_at', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Appointments', key: 'total_appointments_analyzed', sortable: true },
  { title: 'Weeks', key: 'date_range_weeks', sortable: true },
  { title: 'Model', key: 'ai_model' },
  { title: '', key: 'actions', sortable: false },
]

const serviceCategoryOptions = [
  'SURG', 'AP_DENTAL', 'CLINIC_NAD', 'IM', 'EXOTIC', 'CARDIO',
  'DENTAL', 'IMAGING', 'MOBILE', 'CSR', 'ADMIN', 'FLOAT',
]

// ── Chart data ───────────────────────────────────────────────────────────

const filteredAppointments = computed(() => {
  let list = appointments.value
  if (filters.serviceCategory) {
    list = list.filter(a => a.service_category === filters.serviceCategory)
  }
  return list
})

const weeklyTrendSeries = computed(() => {
  const weekMap: Record<string, number> = {}
  for (const appt of filteredAppointments.value) {
    const d = new Date(appt.appointment_date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    const weekKey = d.toISOString().split('T')[0]
    weekMap[weekKey] = (weekMap[weekKey] || 0) + 1
  }
  const sorted = Object.entries(weekMap).sort((a, b) => a[0].localeCompare(b[0]))
  return [{ name: 'Appointments', data: sorted.map(([, v]) => v) }]
})

const weeklyTrendOptions = computed(() => ({
  chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#7C3AED'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: {
    categories: getWeekLabels(),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Appointments' } },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark' },
}))

const typeBreakdownSeries = computed(() => {
  const typeMap: Record<string, number> = {}
  for (const appt of filteredAppointments.value) {
    const type = appt.appointment_type || 'Unknown'
    typeMap[type] = (typeMap[type] || 0) + 1
  }
  const sorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
  return sorted.map(([, v]) => v)
})

const typeBreakdownOptions = computed(() => ({
  chart: { type: 'donut', fontFamily: 'inherit' },
  labels: getTopTypes(),
  colors: ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316'],
  legend: { position: 'bottom', fontSize: '11px' },
  dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  tooltip: { theme: 'dark' },
}))

const dayOfWeekSeries = computed(() => {
  const days = [0, 0, 0, 0, 0, 0, 0]
  for (const appt of filteredAppointments.value) {
    const dow = new Date(appt.appointment_date).getDay()
    days[dow]++
  }
  return [{ name: 'Appointments', data: days }]
})

const dayOfWeekOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#3B82F6'],
  xaxis: { categories: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  yaxis: { title: { text: 'Count' } },
  dataLabels: { enabled: true, style: { fontSize: '11px' } },
  plotOptions: { bar: { borderRadius: 4 } },
  tooltip: { theme: 'dark' },
}))

const serviceCategorySeries = computed(() => {
  const catMap: Record<string, number> = {}
  for (const appt of filteredAppointments.value) {
    const cat = appt.service_category || 'Unmapped'
    catMap[cat] = (catMap[cat] || 0) + 1
  }
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1])
  return [{ name: 'Appointments', data: sorted.map(([, v]) => v) }]
})

const serviceCategoryOptions_chart = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
  colors: ['#10B981'],
  xaxis: {
    categories: (() => {
      const catMap: Record<string, number> = {}
      for (const appt of filteredAppointments.value) {
        const cat = appt.service_category || 'Unmapped'
        catMap[cat] = (catMap[cat] || 0) + 1
      }
      return Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    })(),
    labels: { rotate: -45, style: { fontSize: '10px' } },
  },
  yaxis: { title: { text: 'Count' } },
  plotOptions: { bar: { borderRadius: 4, horizontal: true } },
  dataLabels: { enabled: true, style: { fontSize: '11px' } },
  tooltip: { theme: 'dark' },
}))

// ── Helpers ──────────────────────────────────────────────────────────────

function getWeekLabels(): string[] {
  const weekMap: Record<string, number> = {}
  for (const appt of filteredAppointments.value) {
    const d = new Date(appt.appointment_date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    const weekKey = d.toISOString().split('T')[0]
    weekMap[weekKey] = (weekMap[weekKey] || 0) + 1
  }
  return Object.keys(weekMap).sort()
}

function getTopTypes(): string[] {
  const typeMap: Record<string, number> = {}
  for (const appt of filteredAppointments.value) {
    const type = appt.appointment_type || 'Unknown'
    typeMap[type] = (typeMap[type] || 0) + 1
  }
  return Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k)
}

function formatNumber(n: number): string {
  return n?.toLocaleString() ?? '0'
}

function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatDays(days: number[]): string[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (days || []).map(d => names[d] || String(d))
}

function insightTypeColor(type: string): string {
  switch (type) {
    case 'trend': return 'blue'
    case 'opportunity': return 'amber'
    case 'staffing': return 'deep-purple'
    case 'risk': return 'red'
    default: return 'grey'
  }
}

function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// ── Data Loading ─────────────────────────────────────────────────────────

async function loadAppointmentData() {
  loading.value = true
  try {
    // Load locations
    const { data: locs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    locationOptions.value = locs || []

    // Load appointments
    let query = supabase
      .from('appointment_data')
      .select('*')
      .gte('appointment_date', filters.startDate)
      .lte('appointment_date', filters.endDate)
      .order('appointment_date', { ascending: false })

    if (filters.locationId) {
      query = query.eq('location_id', filters.locationId)
    }

    const { data, error } = await query.limit(5000)
    if (error) throw error
    appointments.value = data || []

    // Stats
    stats.totalAppointments = appointments.value.length
    stats.uniqueTypes = new Set(appointments.value.map(a => a.appointment_type)).size
    stats.uniqueLocations = new Set(appointments.value.map(a => a.location_id || a.location_name).filter(Boolean)).size

    // Analysis run count
    const { count } = await supabase
      .from('appointment_analysis_runs')
      .select('*', { count: 'exact', head: true })
    stats.analysisRuns = count || 0

    // Load latest completed analysis
    const { data: latestRun } = await supabase
      .from('appointment_analysis_runs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (latestRun) {
      analysisResult.value = {
        demandSummary: latestRun.demand_summary,
        serviceRecommendations: latestRun.service_recommendations,
        staffingSuggestions: latestRun.staffing_suggestions,
        weeklyPlan: latestRun.weekly_plan,
        insights: latestRun.insights,
      }
    }

    // Load history
    const { data: history } = await supabase
      .from('appointment_analysis_runs')
      .select('id, status, created_at, total_appointments_analyzed, date_range_weeks, ai_model')
      .order('created_at', { ascending: false })
      .limit(20)
    analysisHistory.value = history || []
  } catch (err: any) {
    console.error('Failed to load appointment data:', err)
    showNotification('Failed to load data: ' + (err.message || 'Unknown error'), 'error')
  } finally {
    loading.value = false
  }
}

// ── CSV Upload ───────────────────────────────────────────────────────────

function previewCsv(file: File | File[] | null) {
  csvPreview.columns = []
  csvPreview.rows = []
  csvPreview.totalRows = 0

  const f = Array.isArray(file) ? file[0] : file
  if (!f) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return

    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return

    const headers = parseCSVLine(lines[0])
    csvPreview.columns = headers
    csvPreview.totalRows = lines.length - 1

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      csvPreview.rows.push(row)
    }
  }
  reader.readAsText(f)
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

async function uploadAppointments() {
  if (!uploadForm.file) return
  uploading.value = true

  try {
    const text = await uploadForm.file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

    const headers = parseCSVLine(lines[0])
    const rows: Record<string, any>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, any> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      rows.push(row)
    }

    const { data, error } = await $fetch('/api/appointments/upload', {
      method: 'POST',
      body: {
        appointments: rows,
        locationId: uploadForm.locationId,
      },
    })

    if (error) throw new Error(error as string)

    const result = data as any
    showNotification(
      `Uploaded ${result?.inserted || 0} appointments. ${result?.mappingStats?.unmappedTypes?.length || 0} unmapped types.`,
      'success'
    )

    showUploadDialog.value = false
    uploadForm.file = null
    csvPreview.columns = []
    csvPreview.rows = []

    await loadAppointmentData()

    if (uploadForm.autoAnalyze && stats.totalAppointments > 0) {
      await runAnalysis()
    }
  } catch (err: any) {
    console.error('Upload failed:', err)
    showNotification('Upload failed: ' + (err.message || 'Unknown error'), 'error')
  } finally {
    uploading.value = false
  }
}

// ── AI Analysis ──────────────────────────────────────────────────────────

async function runAnalysis() {
  analyzing.value = true
  try {
    const result = await $fetch('/api/appointments/analyze', {
      method: 'POST',
      body: {
        locationId: filters.locationId,
        weeksBack: Math.ceil(
          (new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (7 * 86400000)
        ) || 12,
      },
    })

    analysisResult.value = result
    showNotification(`Analysis complete! ${(result as any)?.totalAppointments || 0} appointments analyzed.`)

    // Refresh history
    const { data: history } = await supabase
      .from('appointment_analysis_runs')
      .select('id, status, created_at, total_appointments_analyzed, date_range_weeks, ai_model')
      .order('created_at', { ascending: false })
      .limit(20)
    analysisHistory.value = history || []
    stats.analysisRuns = (history || []).length
  } catch (err: any) {
    console.error('Analysis failed:', err)
    showNotification('Analysis failed: ' + (err.message || 'Unknown error'), 'error')
  } finally {
    analyzing.value = false
  }
}

function loadHistoricalAnalysis(run: any) {
  // Load full run data
  supabase
    .from('appointment_analysis_runs')
    .select('*')
    .eq('id', run.id)
    .single()
    .then(({ data }) => {
      if (data) {
        analysisResult.value = {
          demandSummary: data.demand_summary,
          serviceRecommendations: data.service_recommendations,
          staffingSuggestions: data.staffing_suggestions,
          weeklyPlan: data.weekly_plan,
          insights: data.insights,
        }
        showHistory.value = false
        showNotification('Loaded analysis from ' + formatDateTime(data.created_at))
      }
    })
}

// ── Init ─────────────────────────────────────────────────────────────────

onMounted(() => {
  loadAppointmentData()
})
</script>

<style scoped>
.appointment-analysis-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
