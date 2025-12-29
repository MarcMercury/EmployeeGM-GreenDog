<template>
  <div class="payroll-review-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Payroll Review Workbench</h1>
        <p class="text-body-1 text-grey-darken-1">
          Review, correct, and approve payroll before export
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-chip color="warning" variant="flat">
          <v-icon start>mdi-shield-crown</v-icon>
          Admin Only
        </v-chip>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-download"
          :disabled="!payrollStore.allApproved"
          @click="goToExport"
        >
          Export to Payroll
        </v-btn>
      </div>
    </div>

    <!-- Period Selector & Summary Cards -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-card rounded="lg" class="pa-4">
          <div class="text-subtitle-2 text-grey mb-2">Pay Period</div>
          <v-row dense>
            <v-col cols="6">
              <v-text-field
                v-model="periodStart"
                label="Start Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
                @change="onPeriodChange"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="periodEnd"
                label="End Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
                @change="onPeriodChange"
              />
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <!-- Summary Cards -->
      <v-col cols="6" md="2">
        <v-card rounded="lg" class="pa-4 h-100">
          <div class="text-subtitle-2 text-grey mb-1">Total Payroll</div>
          <div class="text-h5 font-weight-bold text-primary">
            {{ formatCurrency(payrollStore.stats.totalPayroll) }}
          </div>
          <div class="text-caption text-grey">
            {{ payrollStore.stats.totalEmployees }} employees
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" md="2">
        <v-card rounded="lg" class="pa-4 h-100">
          <div class="text-subtitle-2 text-grey mb-1">Pending Review</div>
          <div class="text-h5 font-weight-bold" :class="payrollStore.stats.pendingReviews > 0 ? 'text-warning' : 'text-success'">
            {{ payrollStore.stats.pendingReviews }}
          </div>
          <div class="text-caption text-grey">
            {{ payrollStore.stats.approvedCount }} approved
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" md="2">
        <v-card rounded="lg" class="pa-4 h-100">
          <div class="text-subtitle-2 text-grey mb-1">Missing Punches</div>
          <div class="text-h5 font-weight-bold" :class="payrollStore.stats.missingPunches > 0 ? 'text-error' : 'text-success'">
            {{ payrollStore.stats.missingPunches }}
          </div>
          <div class="text-caption text-grey">
            issues to resolve
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" md="2">
        <v-card rounded="lg" class="pa-4 h-100">
          <div class="text-subtitle-2 text-grey mb-1">Total Hours</div>
          <div class="text-h5 font-weight-bold">
            {{ payrollStore.stats.totalRegularHours.toFixed(1) }}
          </div>
          <div class="text-caption text-grey">
            +{{ payrollStore.stats.totalOvertimeHours.toFixed(1) }} OT
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card rounded="lg" class="mb-4">
      <v-card-text class="py-3">
        <v-row align="center" dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search employees..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="issueFilter"
              :items="issueOptions"
              label="Issues"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-spacer />
          <v-col cols="auto">
            <v-btn
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="refreshData"
              :loading="payrollStore.loading"
            >
              Refresh
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Employee Grid -->
    <v-card rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredEmployees"
        :loading="payrollStore.loading"
        :search="searchQuery"
        hover
        class="payroll-table"
        @click:row="(_: any, { item }: any) => openEmployeeDetail(item)"
      >
        <!-- Employee Name -->
        <template #item.employee_name="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="32" color="grey-lighten-3" class="mr-3">
              <span class="text-caption">{{ getInitials(item.employee_name) }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.employee_name }}</div>
              <div class="text-caption text-grey">{{ item.department_name || 'No Dept' }}</div>
            </div>
          </div>
        </template>

        <!-- Pay Rate -->
        <template #item.pay_rate="{ item }">
          <span>{{ formatCurrency(item.pay_rate) }}/{{ item.pay_type === 'Salary' ? 'yr' : 'hr' }}</span>
        </template>

        <!-- Regular Hours -->
        <template #item.regular_hours="{ item }">
          <span class="font-weight-medium">{{ item.regular_hours.toFixed(2) }}</span>
        </template>

        <!-- OT Hours -->
        <template #item.overtime_hours="{ item }">
          <span :class="{ 'text-warning font-weight-medium': item.overtime_hours > 0 }">
            {{ (item.overtime_hours + item.double_time_hours).toFixed(2) }}
          </span>
          <v-tooltip v-if="item.double_time_hours > 0" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="14" color="warning" class="ml-1">mdi-clock-alert</v-icon>
            </template>
            {{ item.double_time_hours.toFixed(2) }}h double-time
          </v-tooltip>
        </template>

        <!-- PTO Hours -->
        <template #item.pto_hours="{ item }">
          <span :class="{ 'text-info': item.pto_hours > 0 }">
            {{ item.pto_hours.toFixed(2) }}
          </span>
        </template>

        <!-- Adjustments -->
        <template #item.adjustments_total="{ item }">
          <span v-if="item.adjustments_total !== 0" :class="item.adjustments_total > 0 ? 'text-success' : 'text-error'">
            {{ formatCurrency(item.adjustments_total) }}
          </span>
          <span v-else class="text-grey">—</span>
        </template>

        <!-- Gross Pay -->
        <template #item.gross_pay_estimate="{ item }">
          <span class="font-weight-bold">{{ formatCurrency(item.gross_pay_estimate) }}</span>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            size="small"
            variant="flat"
          >
            <v-icon start size="14">{{ getStatusIcon(item.status) }}</v-icon>
            {{ getStatusLabel(item.status) }}
          </v-chip>
        </template>

        <!-- Issues -->
        <template #item.has_issues="{ item }">
          <v-tooltip v-if="item.has_issues" location="top">
            <template #activator="{ props }">
              <v-icon v-bind="props" color="error">mdi-alert-circle</v-icon>
            </template>
            {{ item.issue_details || 'Has issues' }}
          </v-tooltip>
          <v-icon v-else color="success">mdi-check-circle</v-icon>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click.stop="openEmployeeDetail(item)"
          />
          <v-btn
            v-if="item.status !== 'approved'"
            icon="mdi-check"
            size="small"
            variant="text"
            color="success"
            @click.stop="quickApprove(item)"
            :loading="approvingId === item.employee_id"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Employee Detail Dialog -->
    <v-dialog
      v-model="detailDialog"
      fullscreen
      transition="dialog-bottom-transition"
    >
      <v-card v-if="selectedEmployee">
        <!-- Dialog Header -->
        <v-toolbar color="primary">
          <v-btn icon @click="closeDetailDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>
            {{ selectedEmployee.employee_name }} — Payroll Review
          </v-toolbar-title>
          <v-spacer />
          <div class="d-flex ga-2 mr-2">
            <v-chip :color="getStatusColor(selectedEmployee.status)" variant="flat">
              {{ getStatusLabel(selectedEmployee.status) }}
            </v-chip>
            <v-btn
              v-if="selectedEmployee.status !== 'approved'"
              color="success"
              variant="flat"
              prepend-icon="mdi-check"
              @click="approveEmployee"
              :loading="approving"
            >
              Approve
            </v-btn>
            <v-btn
              v-if="selectedEmployee.status !== 'needs_review'"
              color="warning"
              variant="outlined"
              prepend-icon="mdi-flag"
              @click="showFlagDialog = true"
            >
              Flag for Review
            </v-btn>
          </div>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-row>
            <!-- Left Panel: Timecard -->
            <v-col cols="12" md="8">
              <v-card rounded="lg" variant="outlined">
                <v-card-title class="d-flex align-center">
                  <v-icon start>mdi-clock-outline</v-icon>
                  Timecard
                  <v-spacer />
                  <v-chip size="small" color="primary" variant="tonal">
                    {{ periodStart }} to {{ periodEnd }}
                  </v-chip>
                </v-card-title>
                <v-divider />
                <v-data-table
                  :headers="timecardHeaders"
                  :items="payrollStore.selectedEmployeeTimecard"
                  :loading="payrollStore.loadingDetail"
                  density="compact"
                  class="timecard-table"
                >
                  <template #item.entry_date="{ item }">
                    <span class="font-weight-medium">{{ formatDate(item.entry_date) }}</span>
                  </template>

                  <template #item.clock_in_at="{ item }">
                    <span :class="{ 'text-info': item.is_corrected }">
                      {{ formatTime(item.clock_in_at) }}
                    </span>
                  </template>

                  <template #item.clock_out_at="{ item }">
                    <span v-if="item.clock_out_at" :class="{ 'text-info': item.is_corrected }">
                      {{ formatTime(item.clock_out_at) }}
                    </span>
                    <v-chip v-else size="x-small" color="error" variant="flat">
                      Missing
                    </v-chip>
                  </template>

                  <template #item.total_hours="{ item }">
                    <span class="font-weight-medium" :class="{ 'text-error': item.total_hours < 0 }">
                      {{ item.total_hours?.toFixed(2) || '—' }}h
                    </span>
                  </template>

                  <template #item.is_corrected="{ item }">
                    <v-tooltip v-if="item.is_corrected" location="top">
                      <template #activator="{ props }">
                        <v-icon v-bind="props" color="info" size="18">mdi-pencil-circle</v-icon>
                      </template>
                      {{ item.correction_reason }}
                    </v-tooltip>
                    <span v-else>—</span>
                  </template>

                  <template #item.actions="{ item }">
                    <v-btn
                      icon="mdi-pencil"
                      size="x-small"
                      variant="text"
                      @click="openEditEntry(item)"
                    />
                  </template>
                </v-data-table>

                <!-- Timecard Summary -->
                <v-divider />
                <v-card-text class="bg-grey-lighten-4">
                  <v-row dense>
                    <v-col cols="3" class="text-center">
                      <div class="text-caption text-grey">Regular</div>
                      <div class="text-h6 font-weight-bold">{{ payrollStore.selectedEmployeeTotals.regular.toFixed(2) }}h</div>
                    </v-col>
                    <v-col cols="3" class="text-center">
                      <div class="text-caption text-grey">Overtime (1.5x)</div>
                      <div class="text-h6 font-weight-bold text-warning">{{ payrollStore.selectedEmployeeTotals.overtime.toFixed(2) }}h</div>
                    </v-col>
                    <v-col cols="3" class="text-center">
                      <div class="text-caption text-grey">Double-time (2x)</div>
                      <div class="text-h6 font-weight-bold text-error">{{ payrollStore.selectedEmployeeTotals.doubleTime.toFixed(2) }}h</div>
                    </v-col>
                    <v-col cols="3" class="text-center">
                      <div class="text-caption text-grey">Total</div>
                      <div class="text-h6 font-weight-bold text-primary">{{ payrollStore.selectedEmployeeTotals.total.toFixed(2) }}h</div>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Right Panel: Adjustments & Summary -->
            <v-col cols="12" md="4">
              <!-- Pay Summary -->
              <v-card rounded="lg" variant="outlined" class="mb-4">
                <v-card-title>
                  <v-icon start>mdi-cash</v-icon>
                  Pay Summary
                </v-card-title>
                <v-divider />
                <v-list density="compact" class="bg-transparent">
                  <v-list-item>
                    <v-list-item-title>Pay Rate</v-list-item-title>
                    <template #append>
                      <span class="font-weight-medium">
                        {{ formatCurrency(selectedEmployee.pay_rate) }}/{{ selectedEmployee.pay_type === 'Salary' ? 'yr' : 'hr' }}
                      </span>
                    </template>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Regular Pay</v-list-item-title>
                    <template #append>
                      {{ formatCurrency(payrollStore.selectedEmployeeTotals.regular * selectedEmployee.pay_rate) }}
                    </template>
                  </v-list-item>
                  <v-list-item v-if="payrollStore.selectedEmployeeTotals.overtime > 0">
                    <v-list-item-title>Overtime Pay (1.5x)</v-list-item-title>
                    <template #append>
                      {{ formatCurrency(payrollStore.selectedEmployeeTotals.overtime * selectedEmployee.pay_rate * 1.5) }}
                    </template>
                  </v-list-item>
                  <v-list-item v-if="payrollStore.selectedEmployeeTotals.doubleTime > 0">
                    <v-list-item-title>Double-time Pay (2x)</v-list-item-title>
                    <template #append>
                      {{ formatCurrency(payrollStore.selectedEmployeeTotals.doubleTime * selectedEmployee.pay_rate * 2) }}
                    </template>
                  </v-list-item>
                  <v-list-item v-if="selectedEmployee.pto_hours > 0">
                    <v-list-item-title>PTO Pay</v-list-item-title>
                    <template #append>
                      {{ formatCurrency(selectedEmployee.pto_hours * selectedEmployee.pay_rate) }}
                    </template>
                  </v-list-item>
                  <v-divider />
                  <v-list-item>
                    <v-list-item-title class="font-weight-bold">Gross Pay Estimate</v-list-item-title>
                    <template #append>
                      <span class="text-h6 font-weight-bold text-success">
                        {{ formatCurrency(payrollStore.selectedEmployeeGrossPay) }}
                      </span>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>

              <!-- Adjustments Wallet -->
              <v-card rounded="lg" variant="outlined">
                <v-card-title class="d-flex align-center">
                  <v-icon start>mdi-wallet</v-icon>
                  Adjustments
                  <v-spacer />
                  <v-btn
                    icon="mdi-plus"
                    size="small"
                    color="primary"
                    variant="tonal"
                    @click="showAddAdjustment = true"
                  />
                </v-card-title>
                <v-divider />
                <v-list v-if="payrollStore.selectedEmployeeAdjustments.length" density="compact">
                  <v-list-item
                    v-for="adj in payrollStore.selectedEmployeeAdjustments"
                    :key="adj.id"
                    :class="{ 'bg-error-lighten-5': adj.type === 'deduction' }"
                  >
                    <template #prepend>
                      <v-icon :color="getAdjustmentColor(adj.type)" size="20">
                        {{ getAdjustmentIcon(adj.type) }}
                      </v-icon>
                    </template>
                    <v-list-item-title>{{ formatAdjustmentType(adj.type) }}</v-list-item-title>
                    <v-list-item-subtitle v-if="adj.note">{{ adj.note }}</v-list-item-subtitle>
                    <template #append>
                      <span class="font-weight-medium" :class="adj.type === 'deduction' ? 'text-error' : 'text-success'">
                        {{ adj.type === 'deduction' ? '-' : '+' }}{{ formatCurrency(adj.amount) }}
                      </span>
                      <v-btn
                        icon="mdi-close"
                        size="x-small"
                        variant="text"
                        @click="removeAdjustment(adj.id)"
                      />
                    </template>
                  </v-list-item>
                </v-list>
                <v-card-text v-else class="text-center py-6">
                  <v-icon size="32" color="grey-lighten-2">mdi-wallet-outline</v-icon>
                  <div class="text-body-2 text-grey mt-2">No adjustments</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Edit Time Entry Dialog -->
    <v-dialog v-model="editEntryDialog" max-width="500">
      <v-card>
        <v-card-title>Edit Time Entry</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editingEntry.clockIn"
            label="Clock In"
            type="datetime-local"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editingEntry.clockOut"
            label="Clock Out"
            type="datetime-local"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="editingEntry.reason"
            label="Reason for Correction"
            variant="outlined"
            rows="2"
            placeholder="e.g., Forgot to clock out, system error, etc."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editEntryDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveEntryCorrection" :loading="savingCorrection">
            Save Correction
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Adjustment Dialog -->
    <v-dialog v-model="showAddAdjustment" max-width="500">
      <v-card>
        <v-card-title>Add Adjustment</v-card-title>
        <v-card-text>
          <v-select
            v-model="newAdjustment.type"
            :items="adjustmentTypes"
            label="Type"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model.number="newAdjustment.amount"
            label="Amount"
            type="number"
            variant="outlined"
            prefix="$"
            class="mb-3"
          />
          <v-textarea
            v-model="newAdjustment.note"
            label="Note (optional)"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddAdjustment = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="addAdjustment" :loading="addingAdjustment">
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Flag for Review Dialog -->
    <v-dialog v-model="showFlagDialog" max-width="500">
      <v-card>
        <v-card-title>Flag for Review</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="flagReason"
            label="Reason"
            variant="outlined"
            rows="3"
            placeholder="Describe the issue that needs attention..."
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showFlagDialog = false">Cancel</v-btn>
          <v-btn color="warning" variant="flat" @click="flagEmployee" :loading="flagging">
            Flag
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import { usePayrollStore, type PayrollEmployee, type TimeEntry } from '~/stores/payroll'
import { useToast } from '~/composables/useToast'

definePageMeta({
  middleware: ['auth', 'admin'],
  layout: 'default'
})

const router = useRouter()
const payrollStore = usePayrollStore()
const { showSuccess, showError } = useToast()

// Period controls
const periodStart = ref(payrollStore.periodStart)
const periodEnd = ref(payrollStore.periodEnd)

// Filters
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const issueFilter = ref<string | null>(null)

const statusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Approved', value: 'approved' },
  { title: 'Needs Review', value: 'needs_review' },
  { title: 'Disputed', value: 'disputed' }
]

const issueOptions = [
  { title: 'Has Issues', value: 'true' },
  { title: 'No Issues', value: 'false' }
]

// Table headers
const tableHeaders = [
  { title: 'Employee', key: 'employee_name', width: '200px' },
  { title: 'Rate', key: 'pay_rate', width: '100px' },
  { title: 'Reg Hrs', key: 'regular_hours', width: '80px', align: 'center' as const },
  { title: 'OT Hrs', key: 'overtime_hours', width: '80px', align: 'center' as const },
  { title: 'PTO Hrs', key: 'pto_hours', width: '80px', align: 'center' as const },
  { title: 'Adjustments', key: 'adjustments_total', width: '100px', align: 'end' as const },
  { title: 'Gross Pay', key: 'gross_pay_estimate', width: '120px', align: 'end' as const },
  { title: 'Status', key: 'status', width: '120px', align: 'center' as const },
  { title: '', key: 'has_issues', width: '50px', align: 'center' as const, sortable: false },
  { title: '', key: 'actions', width: '100px', align: 'end' as const, sortable: false }
]

const timecardHeaders = [
  { title: 'Date', key: 'entry_date', width: '120px' },
  { title: 'Clock In', key: 'clock_in_at', width: '100px' },
  { title: 'Clock Out', key: 'clock_out_at', width: '100px' },
  { title: 'Hours', key: 'total_hours', width: '80px', align: 'end' as const },
  { title: 'Corrected', key: 'is_corrected', width: '80px', align: 'center' as const },
  { title: '', key: 'actions', width: '60px', sortable: false }
]

// Computed
const filteredEmployees = computed(() => {
  let employees = [...payrollStore.employees]

  if (statusFilter.value) {
    employees = employees.filter(e => e.status === statusFilter.value)
  }

  if (issueFilter.value === 'true') {
    employees = employees.filter(e => e.has_issues)
  } else if (issueFilter.value === 'false') {
    employees = employees.filter(e => !e.has_issues)
  }

  return employees
})

const selectedEmployee = computed(() => payrollStore.selectedEmployee)

// Detail Dialog
const detailDialog = ref(false)
const approving = ref(false)
const approvingId = ref<string | null>(null)

// Edit Entry Dialog
const editEntryDialog = ref(false)
const editingEntry = reactive({
  id: '',
  clockIn: '',
  clockOut: '',
  reason: ''
})
const savingCorrection = ref(false)

// Add Adjustment Dialog
const showAddAdjustment = ref(false)
const addingAdjustment = ref(false)
const newAdjustment = reactive({
  type: 'bonus',
  amount: 0,
  note: ''
})

const adjustmentTypes = [
  { title: 'Bonus', value: 'bonus' },
  { title: 'Reimbursement', value: 'reimbursement' },
  { title: 'Commission', value: 'commission' },
  { title: 'Deduction', value: 'deduction' },
  { title: 'PTO Payout', value: 'pto_payout' },
  { title: 'Holiday Pay', value: 'holiday_pay' },
  { title: 'Other', value: 'other' }
]

// Flag Dialog
const showFlagDialog = ref(false)
const flagReason = ref('')
const flagging = ref(false)

// Methods
function onPeriodChange() {
  payrollStore.setPeriod(periodStart.value, periodEnd.value)
  payrollStore.fetchPayrollSummary()
}

function refreshData() {
  payrollStore.fetchPayrollSummary()
}

function openEmployeeDetail(employee: PayrollEmployee) {
  payrollStore.selectEmployee(employee.employee_id)
  detailDialog.value = true
}

function closeDetailDialog() {
  detailDialog.value = false
  payrollStore.clearSelection()
}

async function quickApprove(employee: PayrollEmployee) {
  approvingId.value = employee.employee_id
  try {
    await payrollStore.approvePayroll(employee.employee_id)
    showSuccess(`Approved payroll for ${employee.employee_name}`)
  } catch (err: any) {
    showError(err.message || 'Failed to approve')
  } finally {
    approvingId.value = null
  }
}

async function approveEmployee() {
  if (!selectedEmployee.value) return
  approving.value = true
  try {
    await payrollStore.approvePayroll(selectedEmployee.value.employee_id)
    showSuccess(`Approved payroll for ${selectedEmployee.value.employee_name}`)
  } catch (err: any) {
    showError(err.message || 'Failed to approve')
  } finally {
    approving.value = false
  }
}

async function flagEmployee() {
  if (!selectedEmployee.value || !flagReason.value) return
  flagging.value = true
  try {
    await payrollStore.flagForReview(selectedEmployee.value.employee_id, flagReason.value)
    showSuccess('Flagged for review')
    showFlagDialog.value = false
    flagReason.value = ''
  } catch (err: any) {
    showError(err.message || 'Failed to flag')
  } finally {
    flagging.value = false
  }
}

function openEditEntry(entry: TimeEntry) {
  editingEntry.id = entry.entry_id
  editingEntry.clockIn = entry.clock_in_at?.replace('Z', '') || ''
  editingEntry.clockOut = entry.clock_out_at?.replace('Z', '') || ''
  editingEntry.reason = ''
  editEntryDialog.value = true
}

async function saveEntryCorrection() {
  if (!editingEntry.clockIn || !editingEntry.clockOut || !editingEntry.reason) {
    showError('Please fill in all fields')
    return
  }
  
  savingCorrection.value = true
  try {
    await payrollStore.correctTimeEntry(
      editingEntry.id,
      editingEntry.clockIn,
      editingEntry.clockOut,
      editingEntry.reason
    )
    showSuccess('Time entry corrected')
    editEntryDialog.value = false
  } catch (err: any) {
    showError(err.message || 'Failed to save correction')
  } finally {
    savingCorrection.value = false
  }
}

async function addAdjustment() {
  if (!selectedEmployee.value || !newAdjustment.amount) {
    showError('Please enter an amount')
    return
  }
  
  addingAdjustment.value = true
  try {
    await payrollStore.addAdjustment(
      selectedEmployee.value.employee_id,
      newAdjustment.type as any,
      newAdjustment.amount,
      newAdjustment.note
    )
    showSuccess('Adjustment added')
    showAddAdjustment.value = false
    newAdjustment.type = 'bonus'
    newAdjustment.amount = 0
    newAdjustment.note = ''
  } catch (err: any) {
    showError(err.message || 'Failed to add adjustment')
  } finally {
    addingAdjustment.value = false
  }
}

async function removeAdjustment(adjustmentId: string) {
  try {
    await payrollStore.removeAdjustment(adjustmentId)
    showSuccess('Adjustment removed')
  } catch (err: any) {
    showError(err.message || 'Failed to remove adjustment')
  }
}

function goToExport() {
  router.push('/export-payroll')
}

// Formatters
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEE, MMM d')
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a')
  } catch {
    return dateStr
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'disputed': return 'error'
    case 'needs_review': return 'error'
    default: return 'grey'
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'approved': return 'mdi-check-circle'
    case 'pending': return 'mdi-clock-outline'
    case 'disputed': return 'mdi-alert'
    case 'needs_review': return 'mdi-flag'
    default: return 'mdi-help-circle'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Approved'
    case 'pending': return 'Pending'
    case 'disputed': return 'Disputed'
    case 'needs_review': return 'Needs Review'
    default: return status
  }
}

function getAdjustmentIcon(type: string): string {
  switch (type) {
    case 'bonus': return 'mdi-gift'
    case 'reimbursement': return 'mdi-cash-refund'
    case 'commission': return 'mdi-chart-line'
    case 'deduction': return 'mdi-minus-circle'
    case 'pto_payout': return 'mdi-beach'
    case 'holiday_pay': return 'mdi-calendar-star'
    default: return 'mdi-cash'
  }
}

function getAdjustmentColor(type: string): string {
  return type === 'deduction' ? 'error' : 'success'
}

function formatAdjustmentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Load data on mount
onMounted(() => {
  payrollStore.fetchPayrollSummary()
})
</script>

<style scoped>
.payroll-review-page {
  max-width: 1600px;
  margin: 0 auto;
}

.payroll-table {
  cursor: pointer;
}

.payroll-table :deep(tr:hover) {
  background-color: rgb(var(--v-theme-primary), 0.04) !important;
}

.payroll-table :deep(.v-data-table__tr--has-issues) {
  background-color: rgb(var(--v-theme-error), 0.05);
}

.timecard-table :deep(.v-data-table__td) {
  padding: 8px 12px !important;
}
</style>
