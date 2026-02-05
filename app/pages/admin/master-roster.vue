<template>
  <div>
    <!-- DEPRECATION NOTICE -->
    <v-alert
      type="warning"
      variant="tonal"
      class="mb-4"
      prominent
      closable
    >
      <template #prepend>
        <v-icon size="32">mdi-alert-circle</v-icon>
      </template>
      <div class="text-subtitle-1 font-weight-bold mb-1">This page is being deprecated</div>
      <div class="text-body-2">
        All employee data management has been consolidated into the 
        <NuxtLink to="/roster" class="text-primary font-weight-medium">Team Roster</NuxtLink> 
        page. Click on any employee profile to view and edit their complete information 
        including Personal Info, Compensation, and PTO Balances.
      </div>
    </v-alert>

    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Master Roster</h1>
        <p class="text-body-2 text-grey-darken-1 mb-0">
          All employee data in one place • {{ employees.length }} records
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-download"
          @click="exportCSV"
        >
          Export CSV
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAllData"
        >
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Global Search -->
    <v-card class="mb-3" rounded="lg" elevation="0" border>
      <v-card-text class="pa-3">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search by name, email, employee #, phone..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
              single-line
            />
          </v-col>
          <v-col cols="6" md="3">
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
          <v-col cols="6" md="3">
            <v-select
              v-model="deptFilter"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-card rounded="lg" elevation="0" border>
      <v-data-table
        :headers="headers"
        :items="filteredEmployees"
        :search="search"
        :loading="loading"
        :items-per-page="50"
        :items-per-page-options="[25, 50, 100, -1]"
        density="compact"
        hover
        fixed-header
        height="calc(100vh - 320px)"
        class="master-roster-table"
        @click:row="(_, { item }) => openEditDialog(item)"
      >
        <!-- Employee Number -->
        <template #item.employee_number="{ item }">
          <code class="text-caption bg-grey-lighten-4 px-1 rounded">
            {{ item.employee_number || '—' }}
          </code>
        </template>

        <!-- Name -->
        <template #item.full_name="{ item }">
          <span class="font-weight-medium">{{ item.full_name }}</span>
        </template>

        <!-- Email -->
        <template #item.email="{ item }">
          <span class="text-caption">{{ item.email_work || item.email_personal || '—' }}</span>
        </template>

        <!-- Phone -->
        <template #item.phone="{ item }">
          <span class="text-caption">{{ item.phone_mobile || item.phone_work || '—' }}</span>
        </template>

        <!-- Department -->
        <template #item.department="{ item }">
          <span class="text-caption">{{ item.department?.name || '—' }}</span>
        </template>

        <!-- Position -->
        <template #item.position="{ item }">
          <span class="text-caption">{{ item.position?.title || '—' }}</span>
        </template>

        <!-- Status -->
        <template #item.employment_status="{ item }">
          <v-chip
            :color="getStatusColor(item.employment_status)"
            size="x-small"
            label
            density="compact"
          >
            {{ item.employment_status || 'active' }}
          </v-chip>
        </template>

        <!-- Pay -->
        <template #item.pay="{ item }">
          <span v-if="item.compensation" class="text-caption">
            {{ formatPay(item.compensation) }}
          </span>
          <span v-else class="text-grey text-caption">—</span>
        </template>

        <!-- DOB -->
        <template #item.date_of_birth="{ item }">
          <span class="text-caption">{{ formatDate(item.date_of_birth) }}</span>
        </template>

        <!-- Hire Date -->
        <template #item.hire_date="{ item }">
          <span class="text-caption">{{ formatDate(item.hire_date) }}</span>
        </template>

        <!-- Location -->
        <template #item.location="{ item }">
          <span class="text-caption">{{ item.location?.name || '—' }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <v-btn
            icon
            size="x-small"
            variant="text"
            color="primary"
            @click.stop="openEditDialog(item)"
          >
            <v-icon size="16">mdi-pencil</v-icon>
          </v-btn>
        </template>

        <!-- Loading -->
        <template #loading>
          <v-skeleton-loader type="table-row@10" />
        </template>

        <!-- No Data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="48" color="grey-lighten-1">mdi-account-group</v-icon>
            <p class="text-body-2 text-grey mt-2">No employees found</p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Master Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="1000" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center bg-primary text-white">
          <v-icon start>mdi-account-edit</v-icon>
          Edit Employee: {{ editingEmployee?.full_name }}
          <v-spacer />
          <v-btn icon variant="text" color="white" @click="editDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <!-- Tabs -->
        <v-tabs v-model="editDialogTab" bg-color="grey-lighten-4">
          <v-tab value="info">
            <v-icon start size="small">mdi-account</v-icon>
            Personal Info
          </v-tab>
          <v-tab value="compensation">
            <v-icon start size="small">mdi-cash</v-icon>
            Compensation
          </v-tab>
          <v-tab value="pto">
            <v-icon start size="small">mdi-beach</v-icon>
            PTO Balances
          </v-tab>
          <v-tab value="history">
            <v-icon start size="small">mdi-history</v-icon>
            Change History
            <v-badge v-if="changeHistory.length" :content="changeHistory.length" color="info" inline class="ml-1" />
          </v-tab>
        </v-tabs>

        <v-card-text class="pa-4" style="max-height: 65vh; overflow-y: auto;">
          <v-window v-model="editDialogTab">
            <!-- PERSONAL INFO TAB -->
            <v-window-item value="info">
              <v-form ref="editFormRef" v-model="formValid">
                <!-- Personal Information -->
                <p class="text-overline text-grey mb-2">PERSONAL INFORMATION</p>
                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.first_name"
                      label="First Name"
                      variant="outlined"
                      density="compact"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.last_name"
                      label="Last Name"
                      variant="outlined"
                      density="compact"
                      :rules="[v => !!v || 'Required']"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.preferred_name"
                      label="Preferred Name"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.employee_number"
                      label="Employee #"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.date_of_birth"
                      label="Date of Birth"
                      type="date"
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.hire_date"
                      label="Hire Date"
                      type="date"
                      variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Contact Information -->
            <p class="text-overline text-grey mb-2">CONTACT INFORMATION</p>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.email_work"
                  label="Work Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.email_personal"
                  label="Personal Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.phone_mobile"
                  label="Mobile Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="editForm.phone_work"
                  label="Work Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Address -->
            <p class="text-overline text-grey mb-2">ADDRESS</p>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="editForm.address_street"
                  label="Street Address"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model="editForm.address_city"
                  label="City"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-text-field
                  v-model="editForm.address_state"
                  label="State"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" md="4">
                <v-text-field
                  v-model="editForm.address_zip"
                  label="ZIP Code"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Emergency Contact -->
            <p class="text-overline text-grey mb-2">EMERGENCY CONTACT</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.emergency_contact_name"
                  label="Contact Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.emergency_contact_phone"
                  label="Contact Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.emergency_contact_relationship"
                  label="Relationship"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Employment Information -->
            <p class="text-overline text-grey mb-2">EMPLOYMENT INFORMATION</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.department_id"
                  :items="departments"
                  item-title="name"
                  item-value="id"
                  label="Department"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.position_id"
                  :items="positions"
                  item-title="title"
                  item-value="id"
                  label="Position"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Location"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.employment_type"
                  :items="employmentTypes"
                  label="Employment Type"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.employment_status"
                  :items="employmentStatuses"
                  label="Employment Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.manager_employee_id"
                  :items="managerOptions"
                  item-title="full_name"
                  item-value="id"
                  label="Manager"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editForm.termination_date"
                  label="Termination Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Profile / Auth -->
            <p class="text-overline text-grey mb-2">PROFILE & ACCESS</p>
            <v-row dense>
              <v-col cols="12" md="4">
                <v-select
                  v-model="editForm.profile_role"
                  :items="['super_admin', 'admin', 'office_admin', 'marketing_admin', 'user']"
                  label="System Role"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-checkbox
                  v-model="editForm.profile_is_active"
                  label="Profile Active"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <!-- Internal Notes -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">INTERNAL NOTES</p>
            <v-textarea
              v-model="editForm.notes_internal"
              label="Admin Notes"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
            />
              </v-form>
            </v-window-item>

            <!-- COMPENSATION TAB -->
            <v-window-item value="compensation">
              <p class="text-overline text-grey mb-2">COMPENSATION DETAILS</p>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="editForm.pay_type"
                    :items="['Hourly', 'Salary']"
                    label="Pay Type"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="editForm.pay_rate"
                    label="Pay Rate"
                    type="number"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="editForm.comp_employment_status"
                    :items="['Full Time', 'Part Time', 'Contractor', 'Per Diem']"
                    label="Comp Status"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="editForm.effective_date"
                    label="Effective Date"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-checkbox
                    v-model="editForm.benefits_enrolled"
                    label="Benefits Enrolled"
                    density="compact"
                    hide-details
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <p class="text-overline text-grey mb-2">CE BUDGET</p>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="editForm.ce_budget_total"
                    label="CE Budget Total"
                    type="number"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="editForm.ce_budget_used"
                    label="CE Budget Used"
                    type="number"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="(editForm.ce_budget_total || 0) - (editForm.ce_budget_used || 0)"
                    label="CE Budget Remaining"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                    readonly
                    bg-color="grey-lighten-4"
                  />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- PTO BALANCES TAB -->
            <v-window-item value="pto">
              <p class="text-overline text-grey mb-2">TIME OFF BALANCES ({{ new Date().getFullYear() }})</p>
              <v-row dense>
                <v-col v-for="tot in timeOffTypes" :key="tot.id" cols="12" md="4">
                  <v-text-field
                    v-model.number="editForm.pto_balances[tot.id]"
                    :label="`${tot.name} (${tot.code})`"
                    type="number"
                    suffix="hrs"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>

              <v-alert type="info" variant="tonal" class="mt-4">
                <v-icon start>mdi-information</v-icon>
                Changes to PTO balances will be logged in the Change History tab.
              </v-alert>
            </v-window-item>

            <!-- CHANGE HISTORY TAB -->
            <v-window-item value="history">
              <div v-if="loadingHistory" class="text-center py-8">
                <v-progress-circular indeterminate color="primary" />
                <p class="text-body-2 text-grey mt-2">Loading change history...</p>
              </div>

              <div v-else-if="changeHistory.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-history</v-icon>
                <p class="text-body-2 text-grey mt-2">No changes logged yet</p>
              </div>

              <v-timeline v-else density="compact" side="end">
                <v-timeline-item
                  v-for="change in changeHistory"
                  :key="change.id"
                  size="small"
                  :dot-color="getChangeColor(change.table_name)"
                >
                  <template #opposite>
                    <span class="text-caption text-grey">
                      {{ formatChangeDate(change.created_at) }}
                    </span>
                  </template>
                  <v-card variant="tonal" density="compact" class="pa-2">
                    <div class="d-flex align-center gap-2">
                      <v-chip size="x-small" :color="getChangeColor(change.table_name)" label>
                        {{ change.field_label || change.field_name }}
                      </v-chip>
                      <span class="text-caption">by {{ change.changed_by_name }}</span>
                    </div>
                    <div class="text-body-2 mt-1">
                      <span class="text-decoration-line-through text-grey">{{ change.old_value || '(empty)' }}</span>
                      <v-icon size="x-small" class="mx-1">mdi-arrow-right</v-icon>
                      <span class="font-weight-medium">{{ change.new_value || '(empty)' }}</span>
                    </div>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-chip size="small" variant="tonal" color="grey">
            ID: {{ editingEmployee?.id?.slice(0, 8) }}...
          </v-chip>
          <v-btn
            v-if="editingEmployee?.profile?.id && canDisableLogin(editingEmployee)"
            color="error"
            variant="outlined"
            size="small"
            prepend-icon="mdi-lock-off"
            :loading="disablingLogin"
            class="ml-2"
            @click="confirmDisableLogin"
          >
            Disable Login
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!formValid && editDialogTab === 'info'"
            @click="saveChanges"
          >
            Save All Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <!-- Disable Login Confirmation Dialog -->
    <v-dialog v-model="disableLoginDialog" max-width="450">
      <v-card>
        <v-card-title class="bg-error text-white d-flex align-center">
          <v-icon start>mdi-lock-off</v-icon>
          Disable Login Access
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>This action takes effect immediately.</strong>
          </v-alert>
          <p class="text-body-1 mb-2">
            You are about to disable login access for:
          </p>
          <p class="text-h6 font-weight-bold text-error mb-4">
            {{ editingEmployee?.full_name }}
          </p>
          <p class="text-body-2 text-grey-darken-1">
            Their password will be changed and they will be unable to access the system. 
            This is typically done when terminating an employee.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="disableLoginDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="disablingLogin"
            @click="executeDisableLogin"
          >
            Disable Login Now
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

interface Employee {
  id: string
  profile_id: string | null
  employee_number: string | null
  first_name: string
  last_name: string
  preferred_name: string | null
  full_name: string
  email_work: string | null
  email_personal: string | null
  phone_work: string | null
  phone_mobile: string | null
  department_id: string | null
  position_id: string | null
  manager_employee_id: string | null
  location_id: string | null
  employment_type: string | null
  employment_status: string | null
  hire_date: string | null
  termination_date: string | null
  date_of_birth: string | null
  notes_internal: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  department: { id: string; name: string } | null
  position: { id: string; title: string } | null
  location: { id: string; name: string } | null
  compensation: {
    id: string
    pay_type: string | null
    pay_rate: number | null
    employment_status: string | null
    benefits_enrolled: boolean
    ce_budget_total: number | null
    ce_budget_used: number | null
    effective_date: string | null
  } | null
  profile: {
    id: string
    role: string
    is_active: boolean
    email: string
    auth_user_id: string | null
  } | null
  time_off_balances: {
    id: string
    time_off_type_id: string
    accrued_hours: number
    used_hours: number
    pending_hours: number
    carryover_hours: number
    period_year: number
  }[] | null
}

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  title: string
}

interface Location {
  id: string
  name: string
}

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const { invalidateCache: invalidateAppDataCache } = useAppData()

// State
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const statusFilter = ref<string | null>(null)
const deptFilter = ref<string | null>(null)
const employees = ref<Employee[]>([])
const departments = ref<Department[]>([])
const positions = ref<Position[]>([])
const locations = ref<Location[]>([])
const timeOffTypes = ref<{ id: string; name: string; code: string }[]>([])

// Dialog
const editDialog = ref(false)
const editDialogTab = ref('info') // 'info' | 'compensation' | 'pto' | 'history'
const editingEmployee = ref<Employee | null>(null)
const originalFormData = ref<any>(null) // For change tracking
const formValid = ref(false)

// Edit form - using reactive for better pre-population
const editForm = reactive({
  // Employee fields
  first_name: '',
  last_name: '',
  preferred_name: '',
  employee_number: '',
  date_of_birth: '',
  hire_date: '',
  termination_date: '',
  email_work: '',
  email_personal: '',
  phone_mobile: '',
  phone_work: '',
  address_street: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  department_id: null as string | null,
  position_id: null as string | null,
  location_id: null as string | null,
  employment_type: 'full-time',
  employment_status: 'active',
  manager_employee_id: null as string | null,
  notes_internal: '',
  // Compensation fields
  pay_type: 'Hourly',
  pay_rate: 0,
  comp_employment_status: 'Full Time',
  benefits_enrolled: false,
  ce_budget_total: 0,
  ce_budget_used: 0,
  effective_date: '',
  // Profile fields
  profile_role: 'user',
  profile_is_active: true,
  // PTO balances (keyed by time_off_type_id)
  pto_balances: {} as Record<string, number>
})

// Change History
const changeHistory = ref<any[]>([])
const loadingHistory = ref(false)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Disable Login
const disableLoginDialog = ref(false)
const disablingLogin = ref(false)

// Static options
const headers = [
  { title: 'Emp #', key: 'employee_number', sortable: true, width: '80px' },
  { title: 'Name', key: 'full_name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Dept', key: 'department', sortable: true },
  { title: 'Position', key: 'position', sortable: true },
  { title: 'Status', key: 'employment_status', sortable: true, width: '100px' },
  { title: 'Pay', key: 'pay', sortable: true, width: '100px' },
  { title: 'DOB', key: 'date_of_birth', sortable: true, width: '100px' },
  { title: 'Hired', key: 'hire_date', sortable: true, width: '100px' },
  { title: 'Location', key: 'location', sortable: true },
  { title: '', key: 'actions', sortable: false, width: '50px', align: 'end' as const }
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'On Leave', value: 'on-leave' },
  { title: 'Terminated', value: 'terminated' }
]

const employmentTypes = [
  { title: 'Full-Time', value: 'full-time' },
  { title: 'Part-Time', value: 'part-time' },
  { title: 'Contract', value: 'contract' },
  { title: 'Per Diem', value: 'per-diem' },
  { title: 'Intern', value: 'intern' }
]

const employmentStatuses = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'On Leave', value: 'on-leave' },
  { title: 'Terminated', value: 'terminated' }
]

// Computed
const departmentOptions = computed(() => 
  departments.value.map(d => ({ title: d.name, value: d.id }))
)

const managerOptions = computed(() =>
  employees.value
    .filter(e => e.id !== editingEmployee.value?.id)
    .map(e => ({ id: e.id, full_name: e.full_name }))
)

const filteredEmployees = computed(() => {
  let result = employees.value

  if (statusFilter.value) {
    result = result.filter(e => e.employment_status === statusFilter.value)
  }

  if (deptFilter.value) {
    result = result.filter(e => e.department_id === deptFilter.value)
  }

  return result
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getStatusColor = (status: string | null) => {
  const colors: Record<string, string> = {
    active: 'success',
    inactive: 'grey',
    'on-leave': 'warning',
    terminated: 'error'
  }
  return colors[status || 'active'] || 'grey'
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  })
}

const formatChangeDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const getChangeColor = (tableName: string) => {
  const colors: Record<string, string> = {
    employees: 'primary',
    employee_compensation: 'success',
    profiles: 'warning',
    employee_time_off_balances: 'info'
  }
  return colors[tableName] || 'grey'
}

const formatPay = (comp: Employee['compensation']) => {
  if (!comp?.pay_rate) return '—'
  const rate = comp.pay_rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return comp.pay_type === 'Salary' ? `$${rate}/yr` : `$${rate}/hr`
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [empRes, deptRes, posRes, locRes, typeRes, ptoRes, profileRes] = await Promise.all([
      supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name),
          position:job_positions(id, title),
          location:locations(id, name),
          compensation:employee_compensation(*)
        `)
        .order('last_name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('job_positions').select('id, title').order('title'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('time_off_types').select('id, name, code').order('name'),
      // Fetch PTO balances separately to avoid PostgREST relationship issues
      supabase.from('employee_time_off_balances').select('id, employee_id, time_off_type_id, accrued_hours, used_hours, pending_hours, carryover_hours, period_year'),
      // Fetch profiles separately
      supabase.from('profiles').select('id, role, is_active, email, auth_user_id')
    ])

    if (empRes.error) throw empRes.error

    // Build a map of employee_id -> time_off_balances
    const ptoByEmployee = new Map<string, any[]>()
    if (ptoRes.data) {
      for (const bal of ptoRes.data) {
        if (!ptoByEmployee.has(bal.employee_id)) {
          ptoByEmployee.set(bal.employee_id, [])
        }
        ptoByEmployee.get(bal.employee_id)!.push(bal)
      }
    }

    // Build a map of profile_id -> profile
    const profilesById = new Map<string, any>()
    if (profileRes.data) {
      for (const p of profileRes.data) {
        profilesById.set(p.id, p)
      }
    }

    employees.value = (empRes.data || []).map((e: any) => ({
      ...e,
      full_name: `${e.first_name} ${e.last_name}`,
      time_off_balances: ptoByEmployee.get(e.id) || [],
      profile: e.profile_id ? profilesById.get(e.profile_id) || null : null
    }))
    departments.value = deptRes.data || []
    positions.value = posRes.data || []
    locations.value = locRes.data || []
    timeOffTypes.value = typeRes.data || []
  } catch (err) {
    console.error('Error fetching data:', err)
    showNotification('Failed to load data', 'error')
  } finally {
    loading.value = false
  }
}

const openEditDialog = async (employee: Employee) => {
  editingEmployee.value = employee
  editDialogTab.value = 'info'
  
  // Build PTO balances object keyed by time_off_type_id
  const ptoBalances: Record<string, number> = {}
  const currentYear = new Date().getFullYear()
  if (employee.time_off_balances) {
    for (const bal of employee.time_off_balances) {
      if (bal.period_year === currentYear) {
        // Calculate available hours: accrued + carryover - used - pending
        const available = (bal.accrued_hours || 0) + (bal.carryover_hours || 0) - (bal.used_hours || 0) - (bal.pending_hours || 0)
        ptoBalances[bal.time_off_type_id] = available
      }
    }
  }
  // Ensure all time off types have an entry
  for (const tot of timeOffTypes.value) {
    if (!(tot.id in ptoBalances)) {
      ptoBalances[tot.id] = 0
    }
  }
  
  // Populate form with employee data using Object.assign for reactive
  Object.assign(editForm, {
    first_name: employee.first_name || '',
    last_name: employee.last_name || '',
    preferred_name: employee.preferred_name || '',
    employee_number: employee.employee_number || '',
    date_of_birth: employee.date_of_birth || '',
    hire_date: employee.hire_date || '',
    termination_date: employee.termination_date || '',
    email_work: employee.email_work || '',
    email_personal: employee.email_personal || '',
    phone_mobile: employee.phone_mobile || '',
    phone_work: employee.phone_work || '',
    address_street: employee.address_street || '',
    address_city: employee.address_city || '',
    address_state: employee.address_state || '',
    address_zip: employee.address_zip || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
    emergency_contact_relationship: employee.emergency_contact_relationship || '',
    department_id: employee.department_id,
    position_id: employee.position_id,
    location_id: employee.location_id,
    employment_type: employee.employment_type || 'full-time',
    employment_status: employee.employment_status || 'active',
    manager_employee_id: employee.manager_employee_id,
    notes_internal: employee.notes_internal || '',
    // Compensation
    pay_type: employee.compensation?.pay_type || 'Hourly',
    pay_rate: employee.compensation?.pay_rate || 0,
    comp_employment_status: employee.compensation?.employment_status || 'Full Time',
    benefits_enrolled: employee.compensation?.benefits_enrolled || false,
    ce_budget_total: employee.compensation?.ce_budget_total || 0,
    ce_budget_used: employee.compensation?.ce_budget_used || 0,
    effective_date: employee.compensation?.effective_date || new Date().toISOString().split('T')[0],
    // Profile
    profile_role: employee.profile?.role || 'user',
    profile_is_active: employee.profile?.is_active ?? true,
    // PTO
    pto_balances: ptoBalances
  })
  
  // Store original data for change tracking
  originalFormData.value = JSON.parse(JSON.stringify(editForm))
  
  // Load change history for this employee
  loadChangeHistory(employee.id)
  
  editDialog.value = true
}

// Load change history for an employee
const loadChangeHistory = async (employeeId: string) => {
  loadingHistory.value = true
  try {
    const { data, error } = await supabase
      .from('employee_change_log')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    changeHistory.value = data || []
  } catch (err) {
    console.error('Error loading change history:', err)
    changeHistory.value = []
  } finally {
    loadingHistory.value = false
  }
}

// Field labels for change log
const fieldLabels: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  preferred_name: 'Preferred Name',
  employee_number: 'Employee Number',
  date_of_birth: 'Date of Birth',
  hire_date: 'Hire Date',
  termination_date: 'Termination Date',
  email_work: 'Work Email',
  email_personal: 'Personal Email',
  phone_mobile: 'Mobile Phone',
  phone_work: 'Work Phone',
  address_street: 'Street Address',
  address_city: 'City',
  address_state: 'State',
  address_zip: 'ZIP Code',
  emergency_contact_name: 'Emergency Contact Name',
  emergency_contact_phone: 'Emergency Contact Phone',
  emergency_contact_relationship: 'Emergency Contact Relationship',
  department_id: 'Department',
  position_id: 'Position',
  location_id: 'Location',
  employment_type: 'Employment Type',
  employment_status: 'Employment Status',
  manager_employee_id: 'Manager',
  notes_internal: 'Internal Notes',
  pay_type: 'Pay Type',
  pay_rate: 'Pay Rate',
  comp_employment_status: 'Compensation Status',
  benefits_enrolled: 'Benefits Enrolled',
  ce_budget_total: 'CE Budget Total',
  ce_budget_used: 'CE Budget Used',
  effective_date: 'Effective Date',
  profile_role: 'System Role',
  profile_is_active: 'Profile Active'
}

// Log changes to the change log
const logChanges = async (employeeId: string, employeeName: string, changes: Array<{table: string, field: string, oldValue: any, newValue: any}>) => {
  if (changes.length === 0) return
  
  const user = await supabase.auth.getUser()
  if (!user.data.user) return
  
  const changerName = authStore.profile 
    ? `${authStore.profile.first_name || ''} ${authStore.profile.last_name || ''}`.trim()
    : user.data.user.email || 'Unknown'
  
  const changeRecords = changes.map(c => ({
    changed_by_user_id: user.data.user!.id,
    changed_by_profile_id: authStore.profile?.id || null,
    changed_by_name: changerName,
    employee_id: employeeId,
    employee_name: employeeName,
    table_name: c.table,
    field_name: c.field,
    field_label: fieldLabels[c.field] || c.field,
    old_value: c.oldValue?.toString() || null,
    new_value: c.newValue?.toString() || null,
    change_source: 'master_roster'
  }))
  
  try {
    await supabase.from('employee_change_log').insert(changeRecords)
  } catch (err) {
    console.error('Failed to log changes:', err)
  }
}

// Detect changes between original and current form
const detectChanges = (original: any, current: any, tableName: string, fields: string[]): Array<{table: string, field: string, oldValue: any, newValue: any}> => {
  const changes: Array<{table: string, field: string, oldValue: any, newValue: any}> = []
  
  for (const field of fields) {
    const oldVal = original[field]
    const newVal = current[field]
    
    // Compare values (handle null/undefined/empty string as equivalent)
    const oldNorm = oldVal === null || oldVal === undefined || oldVal === '' ? null : oldVal
    const newNorm = newVal === null || newVal === undefined || newVal === '' ? null : newVal
    
    if (oldNorm !== newNorm) {
      changes.push({ table: tableName, field, oldValue: oldVal, newValue: newVal })
    }
  }
  
  return changes
}

const saveChanges = async () => {
  if (!editingEmployee.value) return
  
  saving.value = true
  const allChanges: Array<{table: string, field: string, oldValue: any, newValue: any}> = []
  
  try {
    // Detect employee field changes
    const employeeFields = [
      'first_name', 'last_name', 'preferred_name', 'employee_number',
      'date_of_birth', 'hire_date', 'termination_date',
      'email_work', 'email_personal', 'phone_mobile', 'phone_work',
      'address_street', 'address_city', 'address_state', 'address_zip',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'department_id', 'position_id', 'location_id',
      'employment_type', 'employment_status', 'manager_employee_id', 'notes_internal'
    ]
    allChanges.push(...detectChanges(originalFormData.value, editForm, 'employees', employeeFields))
    
    // Detect compensation changes
    const compFields = ['pay_type', 'pay_rate', 'comp_employment_status', 'benefits_enrolled', 'ce_budget_total', 'ce_budget_used', 'effective_date']
    allChanges.push(...detectChanges(originalFormData.value, editForm, 'employee_compensation', compFields))
    
    // Detect profile changes
    const profileFields = ['profile_role', 'profile_is_active']
    allChanges.push(...detectChanges(originalFormData.value, editForm, 'profiles', profileFields))

    // 1. Update employees table
    const { error: empError } = await supabase
      .from('employees')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        preferred_name: editForm.preferred_name || null,
        employee_number: editForm.employee_number || null,
        date_of_birth: editForm.date_of_birth || null,
        hire_date: editForm.hire_date || null,
        termination_date: editForm.termination_date || null,
        email_work: editForm.email_work || null,
        email_personal: editForm.email_personal || null,
        phone_mobile: editForm.phone_mobile || null,
        phone_work: editForm.phone_work || null,
        address_street: editForm.address_street || null,
        address_city: editForm.address_city || null,
        address_state: editForm.address_state || null,
        address_zip: editForm.address_zip || null,
        emergency_contact_name: editForm.emergency_contact_name || null,
        emergency_contact_phone: editForm.emergency_contact_phone || null,
        emergency_contact_relationship: editForm.emergency_contact_relationship || null,
        department_id: editForm.department_id,
        position_id: editForm.position_id,
        location_id: editForm.location_id,
        employment_type: editForm.employment_type,
        employment_status: editForm.employment_status,
        manager_employee_id: editForm.manager_employee_id,
        notes_internal: editForm.notes_internal || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingEmployee.value.id)

    if (empError) throw empError

    // 2. Update or insert compensation
    const compData = {
      employee_id: editingEmployee.value.id,
      pay_type: editForm.pay_type,
      pay_rate: editForm.pay_rate || null,
      employment_status: editForm.comp_employment_status,
      benefits_enrolled: editForm.benefits_enrolled,
      ce_budget_total: editForm.ce_budget_total || 0,
      ce_budget_used: editForm.ce_budget_used || 0,
      effective_date: editForm.effective_date || null
    }

    if (editingEmployee.value.compensation?.id) {
      const { error: compError } = await supabase
        .from('employee_compensation')
        .update(compData)
        .eq('id', editingEmployee.value.compensation.id)
      if (compError) throw compError
    } else {
      const { error: compError } = await supabase
        .from('employee_compensation')
        .insert(compData)
      if (compError) throw compError
    }

    // 3. Update profile if exists (sync name, email, phone, role, active status)
    if (editingEmployee.value.profile_id) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email_work || undefined,
          phone: editForm.phone_mobile || undefined,
          role: editForm.profile_role,
          is_active: editForm.profile_is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEmployee.value.profile_id)
      
      if (profileError) throw profileError
    }

    // 4. Update PTO balances
    const currentYear = new Date().getFullYear()
    for (const [typeId, hours] of Object.entries(editForm.pto_balances)) {
      // Check if old value was different
      const oldHours = originalFormData.value?.pto_balances?.[typeId] || 0
      if (hours !== oldHours) {
        const typeName = timeOffTypes.value.find(t => t.id === typeId)?.name || typeId
        allChanges.push({
          table: 'employee_time_off_balances',
          field: `pto_${typeName.toLowerCase().replace(/\s+/g, '_')}`,
          oldValue: oldHours,
          newValue: hours
        })
      }
      
      // Upsert the balance
      await supabase
        .from('employee_time_off_balances')
        .upsert({
          employee_id: editingEmployee.value.id,
          time_off_type_id: typeId,
          accrued_hours: hours,
          used_hours: 0,
          pending_hours: 0,
          carryover_hours: 0,
          period_year: currentYear
        }, { onConflict: 'employee_id,time_off_type_id,period_year' })
    }

    // 5. Log all changes
    if (allChanges.length > 0) {
      await logChanges(
        editingEmployee.value.id,
        `${editingEmployee.value.first_name} ${editingEmployee.value.last_name}`,
        allChanges
      )
    }

    showNotification(`Employee updated successfully${allChanges.length > 0 ? ` (${allChanges.length} changes logged)` : ''}`)
    editDialog.value = false
    
    // Refresh local data and invalidate shared app data cache for cross-page sync
    await fetchAllData()
    invalidateAppDataCache('employees')
  } catch (err: any) {
    console.error('Error saving:', err)
    showNotification(err.message || 'Failed to save changes', 'error')
  } finally {
    saving.value = false
  }
}

const exportCSV = () => {
  const headers = ['Employee #', 'Name', 'Email', 'Phone', 'Department', 'Position', 'Status', 'Pay Type', 'Pay Rate', 'DOB', 'Hire Date', 'Location']
  const rows = filteredEmployees.value.map(e => [
    e.employee_number || '',
    e.full_name,
    e.email_work || e.email_personal || '',
    e.phone_mobile || e.phone_work || '',
    e.department?.name || '',
    e.position?.title || '',
    e.employment_status || '',
    e.compensation?.pay_type || '',
    e.compensation?.pay_rate || '',
    e.date_of_birth || '',
    e.hire_date || '',
    e.location?.name || ''
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `master-roster-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showNotification('CSV exported')
}

// Disable Login Functions
const canDisableLogin = (employee: Employee) => {
  // Can disable if employee has a profile with auth_user_id linked
  // Don't show for current user (handled in API too)
  return employee.profile?.id
}

const confirmDisableLogin = () => {
  disableLoginDialog.value = true
}

const executeDisableLogin = async () => {
  if (!editingEmployee.value?.profile) return
  
  disablingLogin.value = true
  try {
    // Get the auth_user_id from the profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('auth_user_id')
      .eq('id', editingEmployee.value.profile.id)
      .single()
    
    if (fetchError || !profile?.auth_user_id) {
      throw new Error('Could not find auth user for this employee')
    }

    // Get current session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session')
    }

    // Call the API to disable login
    const response = await $fetch('/api/admin/disable-login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: {
        authUserId: profile.auth_user_id
      }
    })

    showNotification(`Login disabled for ${editingEmployee.value.full_name}`, 'success')
    disableLoginDialog.value = false
    editDialog.value = false
  } catch (err: any) {
    console.error('Error disabling login:', err)
    showNotification(err.data?.message || err.message || 'Failed to disable login', 'error')
  } finally {
    disablingLogin.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.master-roster-table :deep(table) {
  font-size: 0.8125rem;
}

.master-roster-table :deep(th) {
  font-weight: 600 !important;
  white-space: nowrap;
  background: #f5f5f5 !important;
}

.master-roster-table :deep(td) {
  white-space: nowrap;
}

.master-roster-table :deep(tr:hover) {
  cursor: pointer;
}
</style>

