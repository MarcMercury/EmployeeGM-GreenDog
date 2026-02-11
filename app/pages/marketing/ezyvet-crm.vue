<template>
  <div class="ezyvet-crm-page">
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">EzyVet CRM</h1>
        <p class="text-subtitle-1 text-grey">
          Import and synchronize client data from EzyVet exports
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-chart-line"
          :to="'/marketing/ezyvet-analytics'"
        >
          View Analytics
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-upload"
          @click="showUploadDialog = true"
        >
          Import CSV
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-3">
              <v-icon color="white">mdi-account-group</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.totalContacts) }}</div>
              <div class="text-caption text-grey">Total Clients</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-3">
              <v-icon color="white">mdi-account-check</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ formatNumber(stats.activeContacts) }}</div>
              <div class="text-caption text-grey">Active Clients (12 Months)</div>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-3">
              <v-icon color="white">mdi-calendar-sync</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ lastSyncDateDisplay }}</div>
              <div class="text-caption text-grey">Last Sync</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters & Search -->
    <v-card class="mb-6" elevation="2">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search contacts..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.division"
              :items="divisionOptions"
              label="Division"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.isActive"
              :items="activeOptions"
              label="Status"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.revenueRange"
              :items="revenueRangeOptions"
              label="Revenue Range"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn
              variant="text"
              size="small"
              @click="resetFilters"
              :disabled="!hasActiveFilters"
            >
              Reset Filters
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card elevation="2">
      <v-data-table
        :headers="headers"
        :items="filteredContacts"
        :loading="loading"
        :items-per-page="25"
        :search="search"
        class="elevation-0"
        hover
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar size="36" :color="item.is_active ? 'primary' : 'grey'" class="mr-3">
              <span class="text-white text-caption">
                {{ getInitials(item.first_name, item.last_name) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">
                {{ item.first_name }} {{ item.last_name }}
              </div>
              <div class="text-caption text-grey">{{ item.ezyvet_contact_code }}</div>
            </div>
          </div>
        </template>

        <template #item.email="{ item }">
          <a v-if="item.email" :href="`mailto:${item.email}`" class="text-primary">
            {{ item.email }}
          </a>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.phone_mobile="{ item }">
          <span v-if="item.phone_mobile">{{ item.phone_mobile }}</span>
          <span v-else class="text-grey">—</span>
        </template>

        <template #item.revenue_ytd="{ item }">
          <span :class="getRevenueClass(item.revenue_ytd)">
            {{ formatCurrency(item.revenue_ytd) }}
          </span>
        </template>

        <template #item.last_visit="{ item }">
          <div v-if="item.last_visit">
            <div>{{ formatDate(item.last_visit) }}</div>
            <div class="text-caption" :class="getRecencyClass(item.last_visit)">
              {{ getRecencyLabel(item.last_visit) }}
            </div>
          </div>
          <span v-else class="text-grey">Never</span>
        </template>

        <template #item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" size="small" label>
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.division="{ item }">
          <v-chip v-if="item.division" size="small" variant="outlined">
            {{ item.division }}
          </v-chip>
          <span v-else class="text-grey">—</span>
        </template>
      </v-data-table>
    </v-card>

    <!-- Sync History Card -->
    <v-card class="mt-6" elevation="2">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-history</v-icon>
        Sync History
        <v-spacer />
        <v-btn variant="text" size="small" @click="loadSyncHistory">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="syncHeaders"
          :items="syncHistory"
          :loading="syncLoading"
          density="compact"
          :items-per-page="5"
        >
          <template #item.status="{ item }">
            <v-chip
              :color="getSyncStatusColor(item.status)"
              size="small"
              label
            >
              {{ item.status }}
            </v-chip>
          </template>
          <template #item.started_at="{ item }">
            {{ formatDateTime(item.started_at) }}
          </template>
          <template #item.counts="{ item }">
            <span class="text-success">+{{ item.inserted_count }}</span>
            <span class="mx-1">/</span>
            <span class="text-info">~{{ item.updated_count }}</span>
            <span v-if="item.error_count > 0" class="mx-1">/</span>
            <span v-if="item.error_count > 0" class="text-error">✗{{ item.error_count }}</span>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Upload Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-upload</v-icon>
          Import EzyVet CSV
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="closeUploadDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text>
          <!-- Upload State -->
          <div v-if="!uploadState.processing && !uploadState.complete">
            <v-alert type="info" variant="tonal" class="mb-4">
              <div class="font-weight-bold mb-1">Expected CSV Headers:</div>
              <code class="text-caption">
                Contact Code, Contact First Name, Contact Last Name, Email Addresses,
                Mobile Numbers, Contact Physical City, Contact Physical Post Code,
                Revenue Spend YTD, Last Invoiced, Contact Division, Contact Hear About Option,
                Contact Is Active
              </code>
            </v-alert>

            <v-file-input
              v-model="uploadFile"
              accept=".csv"
              label="Select CSV file"
              prepend-icon="mdi-file-delimited"
              variant="outlined"
              show-size
              :disabled="uploadState.processing"
              @update:model-value="handleFileSelect"
            />

            <div v-if="previewData.length > 0" class="mt-4">
              <div class="text-subtitle-2 mb-2">
                Preview (first 5 rows of {{ totalPreviewRows }}):
              </div>
              <v-table density="compact" class="preview-table">
                <thead>
                  <tr>
                    <th v-for="header in previewHeaders" :key="header" class="text-caption">
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in previewData" :key="idx">
                    <td v-for="header in previewHeaders" :key="header" class="text-caption">
                      {{ row[header] || '—' }}
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <!-- Data Quality Warnings -->
              <div v-if="dataQualityWarnings.length > 0" class="mt-4">
                <div class="text-subtitle-2 mb-2">Data Quality Summary</div>
                <v-alert
                  v-for="(warning, idx) in dataQualityWarnings"
                  :key="idx"
                  :type="warning.severity"
                  variant="tonal"
                  density="compact"
                  class="mb-1"
                >
                  {{ warning.message }}
                </v-alert>
              </div>
            </div>
          </div>

          <!-- Processing State -->
          <div v-if="uploadState.processing" class="text-center py-6">
            <v-progress-circular
              :model-value="uploadState.progress"
              :size="80"
              :width="8"
              color="primary"
            >
              {{ uploadState.progress }}%
            </v-progress-circular>
            <div class="text-h6 mt-4">{{ uploadState.message }}</div>
            <div class="text-caption text-grey">
              Batch {{ uploadState.currentBatch }} of {{ uploadState.totalBatches }}
            </div>
            <div class="text-caption text-grey mt-1">
              {{ uploadState.processedRows }} / {{ uploadState.totalRows }} rows
            </div>
          </div>

          <!-- Complete State -->
          <div v-if="uploadState.complete" class="text-center py-6">
            <v-icon
              :color="uploadState.error ? 'error' : 'success'"
              size="80"
            >
              {{ uploadState.error ? 'mdi-alert-circle' : 'mdi-check-circle' }}
            </v-icon>
            <div class="text-h6 mt-4">
              {{ uploadState.error ? 'Import Failed' : 'Import Complete!' }}
            </div>
            <div v-if="!uploadState.error" class="mt-2">
              <v-chip color="success" class="mx-1">
                {{ uploadState.inserted }} inserted
              </v-chip>
              <v-chip color="info" class="mx-1">
                {{ uploadState.updated }} updated
              </v-chip>
              <v-chip v-if="uploadState.errors > 0" color="error" class="mx-1">
                {{ uploadState.errors }} errors
              </v-chip>
            </div>
            <div v-if="uploadState.error" class="text-error mt-2">
              {{ uploadState.errorMessage }}
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="!uploadState.processing && !uploadState.complete"
            variant="text"
            @click="closeUploadDialog"
          >
            Cancel
          </v-btn>
          <v-btn
            v-if="!uploadState.processing && !uploadState.complete"
            color="primary"
            :disabled="!uploadFile || previewData.length === 0"
            @click="startImport"
          >
            Start Import
          </v-btn>
          <v-btn
            v-if="uploadState.complete"
            color="primary"
            @click="closeUploadDialog"
          >
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const supabase = useSupabaseClient()

// State
const loading = ref(false)
const syncLoading = ref(false)
const contacts = ref<any[]>([])
const syncHistory = ref<any[]>([])
const search = ref('')
const showUploadDialog = ref(false)
const uploadFile = ref<File | null>(null)

// Filters
const filters = ref({
  division: null as string | null,
  isActive: null as boolean | null,
  revenueRange: null as string | null
})

// Stats - Active = activity within last 12 months
const stats = computed(() => {
  const total = contacts.value.length
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  
  const active = contacts.value.filter(c => {
    if (!c.last_visit) return false
    return new Date(c.last_visit) >= oneYearAgo
  }).length
  
  return {
    totalContacts: total,
    activeContacts: active
  }
})

const lastSyncDateDisplay = computed(() => {
  if (syncHistory.value.length === 0) return 'Never'
  const last = syncHistory.value[0]
  if (!last.completed_at) return 'In Progress'
  // Show the actual date
  return new Date(last.completed_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

// Filter options
const divisionOptions = computed(() => {
  const divisions = [...new Set(contacts.value.map(c => c.division).filter(Boolean))]
  return divisions.sort()
})

const activeOptions = [
  { title: 'Active', value: true },
  { title: 'Inactive', value: false }
]

const revenueRangeOptions = [
  { title: 'Under $500', value: '0-500' },
  { title: '$500 - $1,000', value: '500-1000' },
  { title: '$1,000 - $5,000', value: '1000-5000' },
  { title: 'Over $5,000', value: '5000+' }
]

const hasActiveFilters = computed(() => {
  return filters.value.division || filters.value.isActive !== null || filters.value.revenueRange
})

// Filtered contacts
const filteredContacts = computed(() => {
  let result = [...contacts.value]

  if (filters.value.division) {
    result = result.filter(c => c.division === filters.value.division)
  }

  if (filters.value.isActive !== null) {
    result = result.filter(c => c.is_active === filters.value.isActive)
  }

  if (filters.value.revenueRange) {
    const [min, max] = filters.value.revenueRange.split('-').map(v => v === '+' ? Infinity : parseFloat(v) || 0)
    result = result.filter(c => {
      const rev = parseFloat(c.revenue_ytd) || 0
      if (max === undefined) return rev >= min
      return rev >= min && rev < max
    })
  }

  return result
})

// Table headers
const headers = [
  { title: 'Contact', key: 'name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Phone', key: 'phone_mobile', sortable: false },
  { title: 'City', key: 'address_city', sortable: true },
  { title: 'Revenue YTD', key: 'revenue_ytd', sortable: true },
  { title: 'Last Visit', key: 'last_visit', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Division', key: 'division', sortable: true }
]

const syncHeaders = [
  { title: 'Status', key: 'status' },
  { title: 'Started', key: 'started_at' },
  { title: 'File', key: 'file_name' },
  { title: 'Total', key: 'total_rows' },
  { title: 'Results', key: 'counts' },
  { title: 'By', key: 'triggered_by' }
]

// Upload state
const uploadState = ref({
  processing: false,
  complete: false,
  error: false,
  errorMessage: '',
  progress: 0,
  message: '',
  currentBatch: 0,
  totalBatches: 0,
  processedRows: 0,
  totalRows: 0,
  inserted: 0,
  updated: 0,
  errors: 0
})

const previewData = ref<any[]>([])
const previewHeaders = ref<string[]>([])
const totalPreviewRows = ref(0)
const parsedRows = ref<any[]>([])

// Data quality warnings computed from parsed rows
const dataQualityWarnings = computed(() => {
  if (parsedRows.value.length === 0) return []
  const warnings: { severity: 'warning' | 'info' | 'error'; message: string }[] = []
  const total = parsedRows.value.length

  const missingEmail = parsedRows.value.filter(r => !r.email).length
  const missingPhone = parsedRows.value.filter(r => !r.phone_mobile).length
  const missingCity = parsedRows.value.filter(r => !r.address_city).length
  const missingRevenue = parsedRows.value.filter(r => !r.revenue_ytd || r.revenue_ytd === 0).length
  const missingLastVisit = parsedRows.value.filter(r => !r.last_visit).length
  const missingBreed = parsedRows.value.filter(r => !r.breed).length
  const noDivision = parsedRows.value.filter(r => !r.division).length

  if (missingEmail > 0) warnings.push({ severity: missingEmail > total * 0.3 ? 'warning' : 'info', message: `${missingEmail} of ${total} contacts (${Math.round(missingEmail / total * 100)}%) missing email address` })
  if (missingPhone > 0) warnings.push({ severity: missingPhone > total * 0.3 ? 'warning' : 'info', message: `${missingPhone} of ${total} contacts (${Math.round(missingPhone / total * 100)}%) missing phone number` })
  if (missingCity > 0) warnings.push({ severity: 'info', message: `${missingCity} of ${total} contacts (${Math.round(missingCity / total * 100)}%) missing city` })
  if (missingLastVisit > 0) warnings.push({ severity: missingLastVisit > total * 0.2 ? 'warning' : 'info', message: `${missingLastVisit} of ${total} contacts (${Math.round(missingLastVisit / total * 100)}%) have no last visit date` })
  if (missingRevenue > total * 0.5) warnings.push({ severity: 'warning', message: `${missingRevenue} contacts have $0 revenue — may indicate stale or incomplete records` })

  return warnings
})

// CSV Header mapping
const CSV_HEADER_MAP: Record<string, string> = {
  'Contact Code': 'ezyvet_contact_code',
  'Contact First Name': 'first_name',
  'Contact Last Name': 'last_name',
  'Email Addresses': 'email',
  'Mobile Numbers': 'phone_mobile',
  'Contact Physical City': 'address_city',
  'Contact Physical Post Code': 'address_zip',
  'Revenue Spend YTD': 'revenue_ytd',
  'Last Invoiced': 'last_visit',
  'Contact Division': 'division',
  'Contact Hear About Option': 'referral_source',
  'Contact Is Active': 'is_active',
  'Breed': 'breed',
  'Pet Breed': 'breed',
  'Department': 'department',
  'Service Department': 'department'
}

// Load data - paginated to get all contacts (bypassing 1000 row limit)
async function loadContacts() {
  loading.value = true
  try {
    let allContacts: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1
      
      const { data, error } = await supabase
        .from('ezyvet_crm_contacts')
        .select('*')
        .order('revenue_ytd', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      if (data && data.length > 0) {
        allContacts = allContacts.concat(data)
        hasMore = data.length === pageSize
        page++
      } else {
        hasMore = false
      }
    }

    contacts.value = allContacts
    console.log(`[EzyVet CRM] Loaded ${allContacts.length} contacts`)
  } catch (err: any) {
    console.error('Error loading contacts:', err)
  } finally {
    loading.value = false
  }
}

async function loadSyncHistory() {
  syncLoading.value = true
  try {
    const { data, error } = await supabase
      .from('ezyvet_sync_history')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) throw error
    syncHistory.value = data || []
  } catch (err: any) {
    console.error('Error loading sync history:', err)
  } finally {
    syncLoading.value = false
  }
}

// CSV Parsing
function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0])
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue

    const row: Record<string, any> = {}
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || ''
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function transformRow(csvRow: Record<string, any>): Record<string, any> {
  const dbRow: Record<string, any> = {}

  for (const [csvHeader, dbField] of Object.entries(CSV_HEADER_MAP)) {
    let value = csvRow[csvHeader]

    if (value === undefined || value === '') {
      value = null
    } else if (dbField === 'is_active') {
      value = value?.toUpperCase() === 'YES'
    } else if (dbField === 'revenue_ytd') {
      value = parseFloat(value?.replace(/[$,]/g, '')) || 0
    } else if (dbField === 'last_visit' && value) {
      // Parse date - handle various formats
      const parsed = new Date(value)
      value = isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0]
    }

    dbRow[dbField] = value
  }

  return dbRow
}

async function handleFileSelect(fileInput: File | File[] | null) {
  // Handle v-file-input which returns an array in Vuetify 3
  const file = Array.isArray(fileInput) ? fileInput[0] : fileInput
  
  if (!file) {
    previewData.value = []
    previewHeaders.value = []
    parsedRows.value = []
    return
  }

  const text = await file.text()
  const rows = parseCSV(text)
  totalPreviewRows.value = rows.length

  if (rows.length > 0) {
    previewHeaders.value = Object.keys(CSV_HEADER_MAP)
    previewData.value = rows.slice(0, 5)
    parsedRows.value = rows.map(transformRow)
  }
}

async function startImport() {
  if (parsedRows.value.length === 0) return

  const BATCH_SIZE = 500
  const batches: any[][] = []

  for (let i = 0; i < parsedRows.value.length; i += BATCH_SIZE) {
    batches.push(parsedRows.value.slice(i, i + BATCH_SIZE))
  }

  uploadState.value = {
    processing: true,
    complete: false,
    error: false,
    errorMessage: '',
    progress: 0,
    message: 'Starting import...',
    currentBatch: 0,
    totalBatches: batches.length,
    processedRows: 0,
    totalRows: parsedRows.value.length,
    inserted: 0,
    updated: 0,
    errors: 0
  }

  try {
    // Create sync history record
    const { data: syncRecord, error: syncError } = await supabase
      .from('ezyvet_sync_history')
      .insert({
        sync_type: 'csv_import',
        status: 'running',
        total_rows: parsedRows.value.length,
        file_name: uploadFile.value?.name,
        triggered_by: 'user'
      })
      .select()
      .single()

    if (syncError) console.warn('Could not create sync record:', syncError)

    // Process batches
    for (let i = 0; i < batches.length; i++) {
      uploadState.value.currentBatch = i + 1
      uploadState.value.message = `Processing batch ${i + 1} of ${batches.length}...`

      const batch = batches[i]
      
      try {
        // $fetch returns the response directly, throws on error
        const result = await $fetch('/api/marketing/ezyvet-upsert', {
          method: 'POST',
          body: { contacts: batch }
        })

        if (result) {
          uploadState.value.inserted += result.inserted || 0
          uploadState.value.updated += result.updated || 0
          uploadState.value.errors += result.errors || 0
        }
      } catch (fetchErr: any) {
        console.error('[EzyVet Import] Batch error:', fetchErr)
        uploadState.value.errors += batch.length
        // Continue with next batch even if one fails
      }

      uploadState.value.processedRows += batch.length
      uploadState.value.progress = Math.round((uploadState.value.processedRows / uploadState.value.totalRows) * 100)
    }

    // Update sync history
    if (syncRecord) {
      await supabase
        .from('ezyvet_sync_history')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          inserted_count: uploadState.value.inserted,
          updated_count: uploadState.value.updated,
          error_count: uploadState.value.errors
        })
        .eq('id', syncRecord.id)
    }

    uploadState.value.complete = true
    uploadState.value.processing = false

    // Reload data
    await loadContacts()
    await loadSyncHistory()

  } catch (err: any) {
    uploadState.value.error = true
    uploadState.value.errorMessage = err.message || 'Import failed'
    uploadState.value.processing = false
    uploadState.value.complete = true
  }
}

function closeUploadDialog() {
  showUploadDialog.value = false
  uploadFile.value = null
  previewData.value = []
  previewHeaders.value = []
  parsedRows.value = []
  uploadState.value = {
    processing: false,
    complete: false,
    error: false,
    errorMessage: '',
    progress: 0,
    message: '',
    currentBatch: 0,
    totalBatches: 0,
    processedRows: 0,
    totalRows: 0,
    inserted: 0,
    updated: 0,
    errors: 0
  }
}

function resetFilters() {
  filters.value = {
    division: null,
    isActive: null,
    revenueRange: null
  }
}

// Formatting helpers
function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatCurrency(value: number | string | null): string {
  const num = parseFloat(String(value)) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

function getInitials(first: string, last: string): string {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?'
}

function getRevenueClass(value: number | string | null): string {
  const num = parseFloat(String(value)) || 0
  if (num >= 5000) return 'text-success font-weight-bold'
  if (num >= 1000) return 'text-info'
  return ''
}

function getRecencyClass(dateStr: string): string {
  if (!dateStr) return 'text-grey'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 30) return 'text-success'
  if (diffDays <= 90) return 'text-warning'
  return 'text-error'
}

function getRecencyLabel(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 30) return 'Recent'
  if (diffDays <= 90) return `${diffDays} days ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function getSyncStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'success'
    case 'running': return 'warning'
    case 'failed': return 'error'
    default: return 'grey'
  }
}

// Initialize
onMounted(() => {
  loadContacts()
  loadSyncHistory()
})
</script>

<style scoped>
.preview-table {
  max-height: 200px;
  overflow: auto;
}

.preview-table th,
.preview-table td {
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gap-2 {
  gap: 8px;
}
</style>
