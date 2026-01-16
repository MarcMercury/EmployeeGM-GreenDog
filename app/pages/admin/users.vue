<template>
  <div class="users-management-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">User Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage user accounts, create new users, and control access
        </p>
      </div>
      <v-chip color="error" variant="flat">
        <v-icon start>mdi-shield-crown</v-icon>
        Super Admin Only
      </v-chip>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="fill-height">
          <v-card-text class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-4">
              <v-icon color="white">mdi-account-group</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
              <div class="text-body-2 text-grey">Total Users</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="fill-height">
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-4">
              <v-icon color="white">mdi-account-check</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.active }}</div>
              <div class="text-body-2 text-grey">Active</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="fill-height" :class="{ 'border-warning': stats.pending > 0 }">
          <v-card-text class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-4">
              <v-icon color="white">mdi-account-clock</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.pending }}</div>
              <div class="text-body-2 text-grey">Pending</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="fill-height">
          <v-card-text class="d-flex align-center">
            <v-avatar color="info" size="48" class="mr-4">
              <v-icon color="white">mdi-shield-account</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.admins }}</div>
              <div class="text-body-2 text-grey">Admins</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- View Tabs -->
    <v-card rounded="lg">
      <v-tabs v-model="currentTab" bg-color="primary" slider-color="white">
        <v-tab value="active">
          <v-icon start>mdi-account-check</v-icon>
          Active Users
          <v-chip class="ml-2" size="x-small" color="white" variant="flat">{{ activeUsers.length }}</v-chip>
        </v-tab>
        <v-tab value="pending">
          <v-icon start>mdi-account-clock</v-icon>
          Pending Accounts
          <v-chip v-if="pendingEmployees.length > 0" class="ml-2" size="x-small" color="warning" variant="flat">{{ pendingEmployees.length }}</v-chip>
        </v-tab>
        <v-tab value="disabled">
          <v-icon start>mdi-account-off</v-icon>
          Disabled
          <v-chip class="ml-2" size="x-small" color="grey" variant="flat">{{ disabledUsers.length }}</v-chip>
        </v-tab>
      </v-tabs>

      <v-divider />

      <!-- Active Users Tab -->
      <v-window v-model="currentTab">
        <v-window-item value="active">
          <!-- Filters -->
          <v-card-text class="pb-0">
            <v-row dense>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="search"
                  prepend-inner-icon="mdi-magnify"
                  label="Search users..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filterRole"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  label="Filter by Role"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn 
                  color="primary" 
                  variant="text" 
                  prepend-icon="mdi-refresh"
                  @click="fetchAllData"
                  :loading="loading"
                >
                  Refresh
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>

          <!-- Users Table -->
          <v-data-table
            :headers="userHeaders"
            :items="filteredActiveUsers"
            :loading="loading"
            :items-per-page="25"
            class="elevation-0"
            hover
          >
            <template #item.user="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="primary" size="40" class="mr-3">
                  <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                  <span v-else class="text-white font-weight-bold text-body-2">
                    {{ getInitials(item) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ getFullName(item) }}</div>
                  <div class="text-caption text-grey">{{ item.email }}</div>
                </div>
              </div>
            </template>

            <template #item.role="{ item }">
              <v-chip 
                :color="getRoleColor(item.role)" 
                size="small" 
                variant="tonal"
                @click="openEditDialog(item)"
                class="cursor-pointer"
              >
                <v-icon start size="14">{{ getRoleIcon(item.role) }}</v-icon>
                {{ formatRole(item.role) }}
              </v-chip>
            </template>

            <template #item.last_sign_in_at="{ item }">
              <span v-if="item.last_sign_in_at" class="text-body-2">
                {{ formatRelativeDate(item.last_sign_in_at) }}
              </span>
              <span v-else class="text-caption text-grey">Never</span>
            </template>

            <template #item.created_at="{ item }">
              <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex align-center gap-1">
                <v-tooltip text="Edit User" location="top">
                  <template #activator="{ props }">
                    <v-btn 
                      v-bind="props"
                      icon="mdi-pencil" 
                      size="small" 
                      variant="text" 
                      @click="openEditDialog(item)"
                    />
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Reset Password" location="top">
                  <template #activator="{ props }">
                    <v-btn 
                      v-bind="props"
                      icon="mdi-lock-reset" 
                      size="small" 
                      variant="text" 
                      color="warning"
                      @click="openPasswordDialog(item)"
                    />
                  </template>
                </v-tooltip>
                
                <v-tooltip text="Disable Login" location="top">
                  <template #activator="{ props }">
                    <v-btn 
                      v-bind="props"
                      icon="mdi-account-off" 
                      size="small" 
                      variant="text" 
                      color="error"
                      @click="confirmToggleActive(item)"
                      :disabled="isCurrentUser(item)"
                    />
                  </template>
                </v-tooltip>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
                <h3 class="text-h6 mt-4">No Users Found</h3>
                <p class="text-body-2 text-grey">
                  {{ search || filterRole ? 'Try adjusting your filters' : 'No active users' }}
                </p>
              </div>
            </template>
          </v-data-table>
        </v-window-item>

        <!-- Pending Accounts Tab -->
        <v-window-item value="pending">
          <!-- Audit Banner -->
          <v-alert
            v-if="auditResults && auditResults.summary.issues > 0"
            type="warning"
            variant="tonal"
            class="ma-4"
            closable
          >
            <div class="d-flex align-center justify-space-between">
              <div>
                <strong>{{ auditResults.summary.issues }} data issue(s) found</strong>
                <span class="text-body-2 ml-2">Some pending accounts have conflicting data</span>
              </div>
              <v-btn size="small" variant="text" @click="showAuditDialog = true">
                View Details
              </v-btn>
            </div>
          </v-alert>

          <v-card-text class="pb-0">
            <v-btn 
              color="info" 
              variant="tonal" 
              prepend-icon="mdi-magnify-scan"
              @click="runAudit"
              :loading="auditLoading"
              size="small"
            >
              Audit Pending Accounts
            </v-btn>
          </v-card-text>

          <v-card-text v-if="pendingLoading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="text-grey mt-4">Loading pending accounts...</p>
          </v-card-text>

          <div v-else-if="pendingEmployees.length === 0" class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-account-check</v-icon>
            <h3 class="text-h6 mt-4">All Caught Up!</h3>
            <p class="text-body-2 text-grey mb-4">
              No employees are waiting for user account creation
            </p>
          </div>

          <v-data-table
            v-else
            :headers="pendingHeaders"
            :items="pendingEmployees"
            :loading="pendingLoading"
            class="elevation-0"
          >
            <template #item.display_name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="warning" size="40" class="mr-3">
                  <span class="text-white font-weight-bold text-body-2">
                    {{ item.first_name[0] }}{{ item.last_name[0] }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ item.display_name }}</div>
                  <div class="text-caption text-grey">{{ item.employee_number }}</div>
                </div>
              </div>
            </template>

            <template #item.position_title="{ item }">
              <div>
                <div>{{ item.position_title || 'Not assigned' }}</div>
                <div class="text-caption text-grey">{{ item.department_name || '' }}</div>
              </div>
            </template>

            <template #item.email_work="{ item }">
              <div class="text-body-2">{{ item.email_work }}</div>
            </template>

            <template #item.hire_date="{ item }">
              <v-chip size="small" :color="isStartingSoon(item.hire_date) ? 'warning' : 'default'">
                {{ formatDate(item.hire_date) }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-account-plus"
                @click="openCreateDialog(item)"
              >
                Create User
              </v-btn>
            </template>
          </v-data-table>
        </v-window-item>

        <!-- Disabled Users Tab -->
        <v-window-item value="disabled">
          <v-data-table
            :headers="userHeaders"
            :items="disabledUsers"
            :loading="loading"
            :items-per-page="25"
            class="elevation-0"
            hover
          >
            <template #item.user="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="grey" size="40" class="mr-3">
                  <v-img v-if="item.avatar_url" :src="item.avatar_url" />
                  <span v-else class="text-white font-weight-bold text-body-2">
                    {{ getInitials(item) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium text-grey">{{ getFullName(item) }}</div>
                  <div class="text-caption text-grey">{{ item.email }}</div>
                </div>
              </div>
            </template>

            <template #item.role="{ item }">
              <v-chip size="small" variant="outlined" color="grey">
                {{ formatRole(item.role) }}
              </v-chip>
            </template>

            <template #item.last_sign_in_at="{ item }">
              <span v-if="item.last_sign_in_at" class="text-body-2 text-grey">
                {{ formatRelativeDate(item.last_sign_in_at) }}
              </span>
              <span v-else class="text-caption text-grey">Never</span>
            </template>

            <template #item.created_at="{ item }">
              <span class="text-body-2 text-grey">{{ formatDate(item.created_at) }}</span>
            </template>

            <template #item.actions="{ item }">
              <v-btn
                color="success"
                size="small"
                variant="tonal"
                prepend-icon="mdi-account-check"
                @click="confirmToggleActive(item)"
              >
                Re-enable
              </v-btn>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="64" color="success">mdi-account-check</v-icon>
                <h3 class="text-h6 mt-4">No Disabled Users</h3>
                <p class="text-body-2 text-grey">All user accounts are active</p>
              </div>
            </template>
          </v-data-table>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Create User Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Create User Account
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="selectedEmployee">
          <!-- Employee Info -->
          <v-alert type="info" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-avatar color="primary" size="48" class="mr-4">
                <span class="text-white font-weight-bold">
                  {{ selectedEmployee.first_name[0] }}{{ selectedEmployee.last_name[0] }}
                </span>
              </v-avatar>
              <div>
                <div class="font-weight-bold">{{ selectedEmployee.display_name }}</div>
                <div class="text-body-2">{{ selectedEmployee.position_title }} • {{ selectedEmployee.location_name }}</div>
                <div class="text-caption">{{ selectedEmployee.email_work }}</div>
              </div>
            </div>
          </v-alert>

          <!-- Step 1: Verify Information -->
          <div v-if="createStep === 1">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 1: Verify Information</h4>
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.email"
                  label="Login Email"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Email required', v => /.+@.+/.test(v) || 'Valid email required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="createForm.phone"
                  label="Mobile Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="createForm.role"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  label="User Role"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="createForm.location_id"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Primary Location"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>
          </div>

          <!-- Step 2: Set Password -->
          <div v-if="createStep === 2">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 2: Set Initial Password</h4>
            <v-row dense>
              <v-col cols="12">
                <v-text-field
                  v-model="createForm.password"
                  :type="showCreatePassword ? 'text' : 'password'"
                  label="Initial Password"
                  variant="outlined"
                  density="compact"
                  :append-inner-icon="showCreatePassword ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showCreatePassword = !showCreatePassword"
                  hint="Minimum 8 characters"
                  persistent-hint
                />
              </v-col>
              <v-col cols="12">
                <v-btn 
                  variant="outlined" 
                  size="small" 
                  @click="generateCreatePassword"
                  prepend-icon="mdi-refresh"
                >
                  Generate Strong Password
                </v-btn>
              </v-col>
            </v-row>
          </div>

          <!-- Step 3: Confirm -->
          <div v-if="createStep === 3">
            <h4 class="text-subtitle-1 font-weight-bold mb-3">Step 3: Confirm & Create</h4>
            
            <v-list lines="two" class="bg-grey-lighten-4 rounded">
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-email</v-icon>
                </template>
                <v-list-item-title>Login Email</v-list-item-title>
                <v-list-item-subtitle>{{ createForm.email }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-shield-account</v-icon>
                </template>
                <v-list-item-title>Role</v-list-item-title>
                <v-list-item-subtitle>{{ roleOptions.find(r => r.value === createForm.role)?.title }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-key</v-icon>
                </template>
                <v-list-item-title>Initial Password</v-list-item-title>
                <v-list-item-subtitle>{{ createForm.password }}</v-list-item-subtitle>
                <template #append>
                  <v-btn icon size="small" @click="copyCreatePassword">
                    <v-icon>mdi-content-copy</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
              <strong>Important:</strong> Save the password before creating the account.
            </v-alert>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closeCreateDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            v-if="createStep > 1" 
            variant="outlined" 
            @click="createStep--"
          >
            Back
          </v-btn>
          <v-btn 
            v-if="createStep < 3" 
            color="primary" 
            @click="createStep++"
            :disabled="!canProceedCreate"
          >
            Next
          </v-btn>
          <v-btn 
            v-if="createStep === 3" 
            color="success" 
            :loading="creating"
            @click="createUserAccount"
          >
            <v-icon start>mdi-account-check</v-icon>
            Create Account
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Dialog -->
    <v-dialog v-model="showSuccessDialog" max-width="500">
      <v-card rounded="lg" class="text-center pa-6">
        <v-icon size="80" color="success">mdi-check-circle</v-icon>
        <h2 class="text-h5 mt-4">Account Created!</h2>
        <p class="text-body-1 text-grey mt-2">
          User account for {{ createdEmployee?.display_name }} has been created.
        </p>
        
        <v-alert type="info" variant="tonal" class="mt-4 text-left">
          <div class="text-body-2">
            <strong>Login Email:</strong> {{ createdCredentials?.email }}<br>
            <strong>Password:</strong> {{ createdCredentials?.password }}
          </div>
        </v-alert>

        <v-btn 
          color="primary" 
          class="mt-4" 
          @click="showSuccessDialog = false"
        >
          Done
        </v-btn>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-edit</v-icon>
          Edit User
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="editingUser">
          <div class="d-flex align-center mb-6 pb-4 border-b">
            <v-avatar :color="editingUser.is_active ? 'primary' : 'grey'" size="56" class="mr-4">
              <v-img v-if="editingUser.avatar_url" :src="editingUser.avatar_url" />
              <span v-else class="text-white font-weight-bold">
                {{ getInitials(editingUser) }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ getFullName(editingUser) }}</div>
              <div class="text-body-2 text-grey">{{ editingUser.email }}</div>
            </div>
          </div>

          <v-form ref="editForm" @submit.prevent="saveUser">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editFormData.first_name"
                  label="First Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editFormData.last_name"
                  label="Last Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editFormData.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="editFormData.role"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  label="Access Level"
                  variant="outlined"
                  density="compact"
                  :disabled="isCurrentUser(editingUser)"
                  :hint="isCurrentUser(editingUser) ? 'Cannot change your own role' : ''"
                  persistent-hint
                >
                  <template #item="{ item, props: itemProps }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-icon :color="getRoleColor(item.value)" size="20">{{ getRoleIcon(item.value) }}</v-icon>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="primary" 
            :loading="saving"
            @click="saveUser"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reset Password Dialog -->
    <v-dialog v-model="showPasswordDialog" max-width="450" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-warning text-white py-4">
          <v-icon start>mdi-lock-reset</v-icon>
          Reset Password
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="passwordUser">
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>Warning:</strong> This will immediately change the password for 
            <strong>{{ getFullName(passwordUser) }}</strong>
          </v-alert>

          <v-text-field
            v-model="newPassword"
            :type="showPassword ? 'text' : 'password'"
            label="New Password"
            variant="outlined"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            hint="Minimum 8 characters"
            persistent-hint
            :rules="[(v: string) => !!v || 'Password required', (v: string) => v.length >= 8 || 'Min 8 characters']"
          />

          <v-btn 
            variant="outlined" 
            size="small" 
            class="mt-3"
            prepend-icon="mdi-refresh"
            @click="generateResetPassword"
          >
            Generate Strong Password
          </v-btn>

          <div v-if="newPassword" class="mt-4">
            <v-btn 
              variant="text" 
              size="small" 
              prepend-icon="mdi-content-copy"
              @click="copyResetPassword"
            >
              Copy Password
            </v-btn>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="closePasswordDialog">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            color="warning" 
            :loading="resettingPassword"
            :disabled="!newPassword || newPassword.length < 8"
            @click="resetPassword"
          >
            Reset Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm Toggle Active Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="py-4" :class="confirmUser?.is_active ? 'bg-error text-white' : 'bg-success text-white'">
          <v-icon start>{{ confirmUser?.is_active ? 'mdi-account-off' : 'mdi-account-check' }}</v-icon>
          {{ confirmUser?.is_active ? 'Disable User' : 'Enable User' }}
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="confirmUser">
          <p class="text-body-1">
            Are you sure you want to <strong>{{ confirmUser.is_active ? 'disable' : 'enable' }}</strong> 
            the account for <strong>{{ getFullName(confirmUser) }}</strong>?
          </p>
          
          <v-alert v-if="confirmUser.is_active" type="warning" variant="tonal" class="mt-4" density="compact">
            This user will no longer be able to log in.
          </v-alert>
          
          <v-alert v-else type="info" variant="tonal" class="mt-4" density="compact">
            This user will be able to log in again.
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showConfirmDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn 
            :color="confirmUser?.is_active ? 'error' : 'success'" 
            :loading="togglingActive"
            @click="toggleActive"
          >
            {{ confirmUser?.is_active ? 'Disable' : 'Enable' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Audit Results Dialog -->
    <v-dialog v-model="showAuditDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center bg-info">
          <v-icon start color="white">mdi-magnify-scan</v-icon>
          <span class="text-white">Pending Accounts Audit</span>
        </v-card-title>
        <v-card-text v-if="auditResults" class="pa-4">
          <!-- Summary -->
          <v-row class="mb-4">
            <v-col cols="4">
              <v-card color="success" variant="tonal">
                <v-card-text class="text-center">
                  <div class="text-h4">{{ auditResults.summary.clean }}</div>
                  <div class="text-body-2">Clean</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card color="warning" variant="tonal">
                <v-card-text class="text-center">
                  <div class="text-h4">{{ auditResults.summary.orphan }}</div>
                  <div class="text-body-2">Orphaned Auth</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="4">
              <v-card color="error" variant="tonal">
                <v-card-text class="text-center">
                  <div class="text-h4">{{ auditResults.summary.issues }}</div>
                  <div class="text-body-2">Issues</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Results List -->
          <v-list density="compact">
            <v-list-item
              v-for="result in auditResults.results"
              :key="result.employee_id"
              :class="{
                'bg-success-lighten-5': result.status === 'clean',
                'bg-warning-lighten-5': result.status === 'orphan',
                'bg-error-lighten-5': result.status === 'issue'
              }"
            >
              <template #prepend>
                <v-icon 
                  :color="result.status === 'clean' ? 'success' : result.status === 'orphan' ? 'warning' : 'error'"
                >
                  {{ result.status === 'clean' ? 'mdi-check-circle' : result.status === 'orphan' ? 'mdi-link' : 'mdi-alert-circle' }}
                </v-icon>
              </template>
              <v-list-item-title>{{ result.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <span v-if="result.status === 'clean'">Ready to create account</span>
                <span v-else>{{ result.issue }}</span>
              </v-list-item-subtitle>
              <v-list-item-subtitle v-if="result.fix" class="text-info">
                Fix: {{ result.fix }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAuditDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'super-admin-only']
})

const supabase = useSupabaseClient()
const authStore = useAuthStore()

// Types
interface UserAccount {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  auth_user_id: string
  avatar_url: string | null
  phone: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  auth_email?: string
  email_confirmed?: boolean
  last_sign_in_at?: string
  is_banned?: boolean
}

interface PendingEmployee {
  employee_id: string
  employee_number: string
  first_name: string
  last_name: string
  display_name: string
  email_work: string
  email_personal: string | null
  phone_mobile: string | null
  hire_date: string
  employment_status: string
  onboarding_status: string
  needs_user_account: boolean
  profile_id: string
  auth_user_id: string | null
  profile_role: string
  position_title: string | null
  department_name: string | null
  location_name: string | null
}

// State
const currentTab = ref('active')
const loading = ref(true)
const pendingLoading = ref(true)
const saving = ref(false)
const creating = ref(false)
const resettingPassword = ref(false)
const togglingActive = ref(false)
const auditLoading = ref(false)
const showAuditDialog = ref(false)
const auditResults = ref<{
  summary: { total: number; clean: number; orphan: number; issues: number }
  results: Array<{
    name: string
    employee_id: string
    profile_id: string
    email_work: string | null
    email_personal: string | null
    status: 'clean' | 'orphan' | 'issue'
    issue?: string
    fix?: string
  }>
} | null>(null)

const users = ref<UserAccount[]>([])
const pendingEmployees = ref<PendingEmployee[]>([])
const locations = ref<{ id: string; name: string }[]>([])

const search = ref('')
const filterRole = ref<string | null>(null)

// Create User Dialog
const showCreateDialog = ref(false)
const selectedEmployee = ref<PendingEmployee | null>(null)
const createdEmployee = ref<PendingEmployee | null>(null)
const createdCredentials = ref<{ email: string; password: string } | null>(null)
const createStep = ref(1)
const showCreatePassword = ref(false)
const showSuccessDialog = ref(false)

const createForm = ref({
  email: '',
  phone: '',
  role: 'user',
  location_id: null as string | null,
  password: ''
})

// Edit Dialog
const showEditDialog = ref(false)
const editingUser = ref<UserAccount | null>(null)
const editFormData = ref({
  first_name: '',
  last_name: '',
  phone: '',
  role: 'user'
})

// Password Dialog
const showPasswordDialog = ref(false)
const passwordUser = ref<UserAccount | null>(null)
const newPassword = ref('')
const showPassword = ref(false)

// Confirm Dialog
const showConfirmDialog = ref(false)
const confirmUser = ref<UserAccount | null>(null)

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Table Headers
const userHeaders = [
  { title: 'User', key: 'user', sortable: true },
  { title: 'Access Level', key: 'role', sortable: true },
  { title: 'Last Login', key: 'last_sign_in_at', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

const pendingHeaders = [
  { title: 'Employee', key: 'display_name', sortable: true },
  { title: 'Position', key: 'position_title', sortable: true },
  { title: 'Email', key: 'email_work', sortable: true },
  { title: 'Start Date', key: 'hire_date', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end' as const }
]

// Options
const roleOptions = [
  { title: 'Super Admin', value: 'super_admin' },
  { title: 'Admin', value: 'admin' },
  { title: 'Manager', value: 'manager' },
  { title: 'HR Admin', value: 'hr_admin' },
  { title: 'Office Admin', value: 'office_admin' },
  { title: 'Marketing Admin', value: 'marketing_admin' },
  { title: 'User', value: 'user' }
]

// Computed
const stats = computed(() => {
  const total = users.value.length
  const active = users.value.filter(u => u.is_active).length
  const pending = pendingEmployees.value.length
  const admins = users.value.filter(u => ['super_admin', 'admin'].includes(u.role)).length
  return { total, active, pending, admins }
})

const activeUsers = computed(() => users.value.filter(u => u.is_active))

const filteredActiveUsers = computed(() => {
  let result = activeUsers.value
  
  // Filter by search term
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    result = result.filter(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
      const email = (u.email || '').toLowerCase()
      return fullName.includes(searchLower) || email.includes(searchLower)
    })
  }
  
  // Filter by role
  if (filterRole.value) {
    result = result.filter(u => u.role === filterRole.value)
  }
  
  return result
})

const disabledUsers = computed(() => users.value.filter(u => !u.is_active))

const canProceedCreate = computed(() => {
  if (createStep.value === 1) {
    return createForm.value.email && createForm.value.role
  }
  if (createStep.value === 2) {
    return createForm.value.password && createForm.value.password.length >= 8
  }
  return true
})

// Helper Methods
function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

function getInitials(user: UserAccount): string {
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last).toUpperCase() || user.email[0].toUpperCase()
}

function getFullName(user: UserAccount): string {
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim()
  }
  return user.email
}

function formatRole(role: string): string {
  return roleOptions.find(r => r.value === role)?.title || role
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'error',
    admin: 'warning',
    manager: 'primary',
    hr_admin: 'info',
    office_admin: 'teal',
    marketing_admin: 'purple',
    user: 'grey'
  }
  return colors[role] || 'grey'
}

function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    super_admin: 'mdi-shield-crown',
    admin: 'mdi-shield-account',
    manager: 'mdi-account-tie',
    hr_admin: 'mdi-badge-account',
    office_admin: 'mdi-office-building',
    marketing_admin: 'mdi-bullhorn',
    user: 'mdi-account'
  }
  return icons[role] || 'mdi-account'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

function isStartingSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const startDate = new Date(dateStr)
  const today = new Date()
  const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilStart <= 7 && daysUntilStart >= 0
}

function isCurrentUser(user: UserAccount): boolean {
  return user.auth_user_id === authStore.profile?.auth_user_id
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%&*'
  let password = 'GD'
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  password += special.charAt(Math.floor(Math.random() * special.length))
  return password
}

function generateCreatePassword(): void {
  createForm.value.password = generatePassword()
}

function generateResetPassword(): void {
  newPassword.value = generatePassword()
}

function copyCreatePassword(): void {
  navigator.clipboard.writeText(createForm.value.password)
  showNotification('Password copied to clipboard')
}

function copyResetPassword(): void {
  navigator.clipboard.writeText(newPassword.value)
  showNotification('Password copied to clipboard')
}

// Create User Dialog Methods
function openCreateDialog(employee: PendingEmployee): void {
  selectedEmployee.value = employee
  createStep.value = 1
  createForm.value = {
    email: employee.email_work,
    phone: employee.phone_mobile || '',
    role: 'user',
    location_id: null,
    password: ''
  }
  generateCreatePassword()
  showCreateDialog.value = true
}

function closeCreateDialog(): void {
  showCreateDialog.value = false
  selectedEmployee.value = null
  createStep.value = 1
}

async function createUserAccount(): Promise<void> {
  if (!selectedEmployee.value) return
  
  creating.value = true
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await $fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        email: createForm.value.email,
        password: createForm.value.password,
        role: createForm.value.role,
        phone: createForm.value.phone || null,
        first_name: selectedEmployee.value.first_name,
        last_name: selectedEmployee.value.last_name,
        profile_id: selectedEmployee.value.profile_id,
        employee_id: selectedEmployee.value.employee_id,
        location_id: createForm.value.location_id || null
      }
    })

    if (!response.success) {
      throw new Error('Failed to create user account')
    }
    
    createdEmployee.value = selectedEmployee.value
    createdCredentials.value = {
      email: createForm.value.email,
      password: createForm.value.password
    }
    
    showCreateDialog.value = false
    showSuccessDialog.value = true
    
    await fetchAllData()
    
  } catch (error: any) {
    console.error('Error creating user account:', error)
    showNotification(error.data?.message || error.message || 'Failed to create user account', 'error')
  } finally {
    creating.value = false
  }
}

// Edit Dialog Methods
function openEditDialog(user: UserAccount): void {
  editingUser.value = user
  editFormData.value = {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    role: user.role
  }
  showEditDialog.value = true
}

function closeEditDialog(): void {
  showEditDialog.value = false
  editingUser.value = null
}

// Password Dialog Methods
function openPasswordDialog(user: UserAccount): void {
  passwordUser.value = user
  newPassword.value = ''
  showPassword.value = false
  generateResetPassword()
  showPasswordDialog.value = true
}

function closePasswordDialog(): void {
  showPasswordDialog.value = false
  passwordUser.value = null
  newPassword.value = ''
}

function confirmToggleActive(user: UserAccount): void {
  confirmUser.value = user
  showConfirmDialog.value = true
}

// API Methods
async function fetchUsers(): Promise<void> {
  loading.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.access_token) {
      throw new Error('No session')
    }

    const response = await $fetch('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    })

    if (response.success) {
      users.value = response.users
    }
  } catch (error: any) {
    console.error('Error fetching users:', error)
    showNotification(error.data?.message || 'Failed to load users', 'error')
  } finally {
    loading.value = false
  }
}

async function runAudit(): Promise<void> {
  auditLoading.value = true
  try {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Not authenticated')
    }

    const response = await $fetch('/api/admin/pending-audit', {
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`
      }
    })

    if (response.success) {
      auditResults.value = response as any
      if (response.summary?.issues > 0) {
        showAuditDialog.value = true
      } else {
        showNotification(`Audit complete: ${response.summary?.clean || 0} pending accounts ready, no issues found`, 'success')
      }
    }
  } catch (error: any) {
    console.error('Audit error:', error)
    showNotification(error.data?.message || 'Failed to run audit', 'error')
  } finally {
    auditLoading.value = false
  }
}

async function fetchPendingEmployees(): Promise<void> {
  pendingLoading.value = true
  try {
    let { data, error } = await supabase
      .from('pending_user_accounts')
      .select('*')
      .order('hire_date', { ascending: false })
    
    if (error) {
      console.log('View not available, using fallback query')
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          first_name,
          last_name,
          email_work,
          email_personal,
          phone_mobile,
          hire_date,
          employment_status,
          onboarding_status,
          needs_user_account,
          profile_id,
          profiles:profile_id(id, auth_user_id, role),
          job_positions:position_id(title),
          departments:department_id(name),
          locations:location_id(name)
        `)
        .eq('needs_user_account', true)
        .eq('employment_status', 'active')
        .order('hire_date', { ascending: false })
      
      if (fallbackError) throw fallbackError
      
      data = (fallbackData || [])
        .filter((e: any) => !e.profiles?.auth_user_id)
        .map((e: any) => ({
          employee_id: e.id,
          employee_number: e.employee_number,
          first_name: e.first_name,
          last_name: e.last_name,
          display_name: `${e.first_name} ${e.last_name}`,
          email_work: e.email_work,
          email_personal: e.email_personal,
          phone_mobile: e.phone_mobile,
          hire_date: e.hire_date,
          employment_status: e.employment_status,
          onboarding_status: e.onboarding_status || 'pending',
          needs_user_account: e.needs_user_account,
          profile_id: e.profile_id,
          auth_user_id: e.profiles?.auth_user_id,
          profile_role: e.profiles?.role,
          position_title: e.job_positions?.title,
          department_name: e.departments?.name,
          location_name: e.locations?.name
        }))
    }
    
    pendingEmployees.value = data || []
  } catch (error) {
    console.error('Error fetching pending employees:', error)
    showNotification('Failed to load pending accounts', 'error')
  } finally {
    pendingLoading.value = false
  }
}

async function fetchLocations(): Promise<void> {
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  locations.value = data || []
}

async function fetchAllData(): Promise<void> {
  await Promise.all([
    fetchUsers(),
    fetchPendingEmployees(),
    fetchLocations()
  ])
}

async function saveUser(): Promise<void> {
  if (!editingUser.value) return
  
  saving.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.access_token) {
      throw new Error('No session')
    }

    const response = await $fetch(`/api/admin/users/${editingUser.value.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: editFormData.value
    })

    if (response.success) {
      showNotification('User updated successfully')
      closeEditDialog()
      await fetchUsers()
    }
  } catch (error: any) {
    console.error('Error saving user:', error)
    showNotification(error.data?.message || 'Failed to save user', 'error')
  } finally {
    saving.value = false
  }
}

async function resetPassword(): Promise<void> {
  if (!passwordUser.value || !newPassword.value) return
  
  resettingPassword.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.access_token) {
      throw new Error('No session')
    }

    const response = await $fetch(`/api/admin/users/${passwordUser.value.id}/reset-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: { password: newPassword.value }
    })

    if (response.success) {
      showNotification('Password reset successfully')
      closePasswordDialog()
    }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    showNotification(error.data?.message || 'Failed to reset password', 'error')
  } finally {
    resettingPassword.value = false
  }
}

async function toggleActive(): Promise<void> {
  if (!confirmUser.value) return
  
  togglingActive.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session?.access_token) {
      throw new Error('No session')
    }

    const newActiveState = !confirmUser.value.is_active
    
    const response = await $fetch(`/api/admin/users/${confirmUser.value.id}/toggle-active`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: { is_active: newActiveState }
    })

    if (response.success) {
      showNotification(`User ${newActiveState ? 'enabled' : 'disabled'} successfully`)
      showConfirmDialog.value = false
      confirmUser.value = null
      await fetchUsers()
    }
  } catch (error: any) {
    console.error('Error toggling user status:', error)
    showNotification(error.data?.message || 'Failed to update user status', 'error')
  } finally {
    togglingActive.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.users-management-page {
  max-width: 1400px;
}

.cursor-pointer {
  cursor: pointer;
}

.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.border-warning {
  border: 2px solid rgb(var(--v-theme-warning)) !important;
}
</style>
