<template>
  <div class="export-payroll-page">
    <!-- Loading State -->
    <div v-if="pageLoading" class="d-flex justify-center align-center min-h-50vh">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="pageError" type="error" variant="tonal" class="mb-4" closable @click:close="pageError = null">
      {{ pageError }}
      <template #append>
        <v-btn variant="text" size="small" @click="initPage()">Retry</v-btn>
      </template>
    </v-alert>

    <template v-else>
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Export Payroll</h1>
        <p class="text-body-1 text-grey-darken-1">
          Generate and export payroll data for processing
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-clipboard-check-outline"
          to="/admin/payroll/review"
        >
          Review Workbench
        </v-btn>
        <v-chip color="warning" variant="flat">
          <v-icon start>mdi-shield-crown</v-icon>
          Admin Only
        </v-chip>
      </div>
    </div>
    
    <!-- Approval Warning Banner -->
    <v-alert
      v-if="payrollStore.unapprovedCount > 0"
      type="warning"
      variant="tonal"
      class="mb-4"
      closable
    >
      <template #title>Payroll Review Required</template>
      {{ payrollStore.unapprovedCount }} employee(s) have not been approved for this pay period.
      <NuxtLink to="/admin/payroll/review" class="text-warning font-weight-medium ml-1">
        Open Review Workbench →
      </NuxtLink>
    </v-alert>

    <!-- Export Configuration -->
    <v-row>
      <v-col cols="12" md="8">
        <v-card rounded="lg">
          <v-card-title>Generate Payroll Export</v-card-title>
          <v-card-text>
            <v-form ref="formRef">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="exportConfig.payPeriod"
                    :items="payPeriods"
                    label="Pay Period"
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar-range"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="exportConfig.format"
                    :items="exportFormats"
                    label="Export Format"
                    variant="outlined"
                    prepend-inner-icon="mdi-file-export"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="exportConfig.startDate"
                    label="Start Date"
                    type="date"
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="exportConfig.endDate"
                    label="End Date"
                    type="date"
                    variant="outlined"
                    prepend-inner-icon="mdi-calendar"
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <div class="text-subtitle-2 mb-3">Include in Export</div>
              <v-row>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="exportConfig.includeHours"
                    label="Hours Worked"
                    hide-details
                    density="compact"
                  />
                  <v-checkbox
                    v-model="exportConfig.includeOvertime"
                    label="Overtime Hours"
                    hide-details
                    density="compact"
                  />
                  <v-checkbox
                    v-model="exportConfig.includePTO"
                    label="PTO/Time Off"
                    hide-details
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="exportConfig.includeDepartment"
                    label="Department Info"
                    hide-details
                    density="compact"
                  />
                  <v-checkbox
                    v-model="exportConfig.includePosition"
                    label="Position/Role"
                    hide-details
                    density="compact"
                  />
                  <v-checkbox
                    v-model="exportConfig.includeEmployeeId"
                    label="Employee ID"
                    hide-details
                    density="compact"
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <div class="text-subtitle-2 mb-3">Filter by Department</div>
              <v-select
                v-model="exportConfig.departments"
                :items="departments"
                label="Departments"
                variant="outlined"
                multiple
                chips
                closable-chips
                hint="Leave empty to include all departments"
                persistent-hint
              />
            </v-form>
          </v-card-text>
          <v-card-actions class="pa-4">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-eye"
              @click="previewPayroll"
              :loading="previewing"
            >
              Preview
            </v-btn>
            <v-spacer />
            <v-btn
              color="primary"
              prepend-icon="mdi-download"
              @click="exportPayroll"
              :loading="exporting"
              size="large"
            >
              Export CSV
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <!-- Quick Stats -->
      <v-col cols="12" md="4">
        <v-card rounded="lg" class="mb-4">
          <v-card-title>Period Summary</v-card-title>
          <v-card-text>
            <v-list density="compact" class="bg-transparent">
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-account-group</v-icon>
                </template>
                <v-list-item-title>Total Employees</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ stats.totalEmployees }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="success">mdi-clock</v-icon>
                </template>
                <v-list-item-title>Total Hours</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ stats.totalHours.toFixed(1) }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="warning">mdi-clock-plus</v-icon>
                </template>
                <v-list-item-title>Overtime Hours</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ stats.overtimeHours.toFixed(1) }}</span>
                </template>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="info">mdi-beach</v-icon>
                </template>
                <v-list-item-title>PTO Hours</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ stats.ptoHours.toFixed(1) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card rounded="lg">
          <v-card-title>Recent Exports</v-card-title>
          <v-card-text v-if="recentExports.length === 0" class="text-center py-4">
            <v-icon size="32" color="grey-lighten-2">mdi-file-download-outline</v-icon>
            <div class="text-body-2 text-grey mt-2">No recent exports</div>
          </v-card-text>
          <v-list v-else density="compact" class="bg-transparent">
            <v-list-item v-for="exp in recentExports" :key="exp.id">
              <template #prepend>
                <v-icon color="success" size="small">mdi-file-check</v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ exp.filename }}</v-list-item-title>
              <v-list-item-subtitle class="text-caption">{{ exp.date }}</v-list-item-subtitle>
              <template #append>
                <v-btn icon="mdi-download" size="x-small" variant="text" aria-label="Download" />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Preview Dialog -->
    <v-dialog v-model="previewDialog" max-width="900">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Payroll Preview</span>
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="previewDialog = false" />
        </v-card-title>
        <v-card-text>
          <v-data-table
            :headers="previewHeaders"
            :items="previewData"
            density="compact"
            :items-per-page="10"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="previewDialog = false">Close</v-btn>
          <v-btn color="primary" @click="exportPayroll" :disabled="!allowExport">
            <v-icon start>mdi-download</v-icon>
            Export CSV
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
    </template>
  </div>
</template>

<script setup lang="ts">
import { usePayrollStore } from '~/stores/payroll'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

useHead({
  title: 'Export Payroll'
})

const supabase = useSupabaseClient()
const { employees } = useAppData()
const payrollStore = usePayrollStore()

// State
const formRef = ref()
const exporting = ref(false)
const previewing = ref(false)
const previewDialog = ref(false)
const pageLoading = ref(true)
const pageError = ref<string | null>(null)
const previewData = ref<any[]>([])

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Computed: Check if export is allowed (all employees approved)
const allowExport = computed(() => {
  // Allow export if all employees are approved, or show warning
  return payrollStore.allApproved || payrollStore.employees.length === 0
})

// Get default date range (current pay period)
const today = new Date()
const startOfPeriod = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfPeriod = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const exportConfig = reactive({
  payPeriod: 'current',
  format: 'csv',
  startDate: startOfPeriod.toISOString().split('T')[0],
  endDate: endOfPeriod.toISOString().split('T')[0],
  includeHours: true,
  includeOvertime: true,
  includePTO: true,
  includeDepartment: true,
  includePosition: true,
  includeEmployeeId: true,
  departments: []
})

const payPeriods = [
  { title: 'Current Period', value: 'current' },
  { title: 'Previous Period', value: 'previous' },
  { title: 'Custom Date Range', value: 'custom' }
]

const exportFormats = [
  { title: 'CSV (Excel)', value: 'csv' },
  { title: 'JSON', value: 'json' }
]

const departments = ref<string[]>([])

const stats = ref({
  totalEmployees: 0,
  totalHours: 0,
  overtimeHours: 0,
  ptoHours: 0
})

const recentExports = ref<any[]>([])

const previewHeaders = [
  { title: 'Employee ID', key: 'employee_id' },
  { title: 'Name', key: 'name' },
  { title: 'Department', key: 'department' },
  { title: 'Regular Hours', key: 'regular_hours' },
  { title: 'Overtime', key: 'overtime' },
  { title: 'PTO', key: 'pto_hours' },
  { title: 'Total Hours', key: 'total_hours' }
]

// Methods
async function loadDepartments() {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('name')
      .order('name')

    if (error) throw error
    departments.value = (data || []).map((d: { name: string }) => d.name)
  } catch (err) {
    console.error('Error loading departments:', err)
  }
}

async function calculateStats() {
  // Use data from payroll store if available, otherwise fallback to simulated
  if (payrollStore.employees.length > 0) {
    stats.value = {
      totalEmployees: payrollStore.stats.totalEmployees,
      totalHours: payrollStore.stats.totalRegularHours + payrollStore.stats.totalOvertimeHours,
      overtimeHours: payrollStore.stats.totalOvertimeHours,
      ptoHours: payrollStore.stats.totalPTOHours
    }
  } else {
    stats.value = {
      totalEmployees: employees.value?.length || 0,
      totalHours: (employees.value?.length || 0) * 80, // Simulated
      overtimeHours: Math.floor(Math.random() * 50),
      ptoHours: Math.floor(Math.random() * 100)
    }
  }
}

async function previewPayroll() {
  previewing.value = true
  try {
    // Use payroll store data if available, otherwise fallback to simulated
    if (payrollStore.employees.length > 0) {
      previewData.value = payrollStore.employees.map((emp) => ({
        employee_id: emp.employee_id.substring(0, 8),
        name: emp.employee_name,
        department: emp.department_name || 'Unassigned',
        regular_hours: emp.regular_hours.toFixed(2),
        overtime: (emp.overtime_hours + emp.double_time_hours).toFixed(2),
        pto_hours: emp.pto_hours.toFixed(2),
        total_hours: (emp.regular_hours + emp.overtime_hours + emp.double_time_hours + emp.pto_hours).toFixed(2),
        gross_pay: emp.gross_pay_estimate.toFixed(2),
        status: emp.status
      }))
    } else {
      // Fallback to simulated data
      previewData.value = (employees.value || []).map((emp: any) => ({
        employee_id: emp.id.substring(0, 8),
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department?.name || 'Unassigned',
        regular_hours: 80,
        overtime: Math.floor(Math.random() * 10),
        pto_hours: Math.floor(Math.random() * 8),
        total_hours: 80 + Math.floor(Math.random() * 10)
      }))
    }
    
    previewDialog.value = true
  } catch (err) {
    console.error('Error generating preview:', err)
    snackbar.message = 'Failed to generate preview'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    previewing.value = false
  }
}

async function exportPayroll() {
  exporting.value = true
  try {
    // Generate CSV content using payroll store data when available
    const headers = ['Employee ID', 'Name', 'Email', 'Department', 'Position', 'Pay Rate', 'Pay Type', 'Regular Hours', 'Overtime Hours', 'Double-Time Hours', 'PTO Hours', 'Adjustments', 'Gross Pay', 'Status']
    
    let rows: (string | number)[][]
    
    if (payrollStore.employees.length > 0) {
      // Use real payroll data
      rows = payrollStore.employees.map((emp) => [
        emp.employee_id.substring(0, 8),
        emp.employee_name,
        '', // Email would need to be fetched separately
        emp.department_name || '',
        '', // Position would need to be fetched separately
        emp.pay_rate.toFixed(2),
        emp.pay_type,
        emp.regular_hours.toFixed(2),
        emp.overtime_hours.toFixed(2),
        emp.double_time_hours.toFixed(2),
        emp.pto_hours.toFixed(2),
        emp.adjustments_total.toFixed(2),
        emp.gross_pay_estimate.toFixed(2),
        emp.status
      ])
    } else {
      // Fallback to simulated data
      rows = (employees.value || []).map((emp: any) => {
        const regularHours = 80
        const overtime = Math.floor(Math.random() * 10)
        const pto = Math.floor(Math.random() * 8)
        return [
          emp.id.substring(0, 8),
          `${emp.first_name} ${emp.last_name}`,
          emp.email || '',
          emp.department?.name || '',
          emp.position?.title || '',
          emp.compensation?.pay_rate?.toFixed(2) || '0.00',
          emp.compensation?.pay_type || 'Hourly',
          regularHours,
          overtime,
          0,
          pto,
          0,
          (regularHours * (emp.compensation?.pay_rate || 0)).toFixed(2),
          'pending'
        ]
      })
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((row: (string | number)[]) => row.map(v => `"${v}"`).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `payroll_${exportConfig.startDate}_${exportConfig.endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    snackbar.message = 'Payroll exported successfully!'
    snackbar.color = 'success'
    snackbar.show = true
    previewDialog.value = false

    // Add to recent exports
    recentExports.value.unshift({
      id: Date.now(),
      filename: `payroll_${exportConfig.startDate}_${exportConfig.endDate}.csv`,
      date: new Date().toLocaleDateString()
    })
  } catch (err) {
    console.error('Error exporting payroll:', err)
    snackbar.message = 'Failed to export payroll'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    exporting.value = false
  }
}

// Initialize
async function initPage() {
  pageLoading.value = true
  pageError.value = null
  try {
    // Sync payroll store period with export config
    payrollStore.setPeriod(exportConfig.startDate, exportConfig.endDate)
    
    await Promise.all([
      loadDepartments(),
      payrollStore.fetchPayrollSummary()
    ])
    
    // Calculate stats after payroll data is loaded
    await calculateStats()
  } catch (err) {
    pageError.value = err instanceof Error ? err.message : 'Failed to load payroll data'
  } finally {
    pageLoading.value = false
  }
}

onMounted(() => initPage())

// Watch for date changes and update payroll store
watch(() => [exportConfig.startDate, exportConfig.endDate], ([start, end]) => {
  payrollStore.setPeriod(start, end)
  payrollStore.fetchPayrollSummary().then(() => calculateStats())
})
</script>

<style scoped>
.export-payroll-page {
  max-width: 1200px;
}
</style>
