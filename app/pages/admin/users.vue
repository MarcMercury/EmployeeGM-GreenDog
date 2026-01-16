<template>
  <div class="users-management-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">User Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage all user accounts, access levels, and permissions
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
        <v-card rounded="lg" class="fill-height">
          <v-card-text class="d-flex align-center">
            <v-avatar color="error" size="48" class="mr-4">
              <v-icon color="white">mdi-account-off</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ stats.disabled }}</div>
              <div class="text-body-2 text-grey">Disabled</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="fill-height">
          <v-card-text class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-4">
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

    <!-- Filters & Search -->
    <v-card rounded="lg" class="mb-4">
      <v-card-text>
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
            <v-select
              v-model="filterStatus"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              label="Filter by Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn 
              color="primary" 
              variant="text" 
              prepend-icon="mdi-refresh"
              @click="fetchUsers"
              :loading="loading"
            >
              Refresh
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Users Table -->
    <v-card rounded="lg">
      <v-data-table
        :headers="headers"
        :items="filteredUsers"
        :loading="loading"
        :search="search"
        :items-per-page="25"
        class="elevation-0"
        hover
      >
        <!-- User Column -->
        <template #item.user="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="item.is_active ? 'primary' : 'grey'" size="40" class="mr-3">
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

        <!-- Role Column -->
        <template #item.role="{ item }">
          <v-chip 
            :color="getRoleColor(item.role)" 
            size="small" 
            variant="tonal"
            @click="openEditDialog(item, 'role')"
            class="cursor-pointer"
          >
            <v-icon start size="14">{{ getRoleIcon(item.role) }}</v-icon>
            {{ formatRole(item.role) }}
          </v-chip>
        </template>

        <!-- Status Column -->
        <template #item.is_active="{ item }">
          <v-chip 
            :color="item.is_active ? 'success' : 'error'" 
            size="small" 
            variant="flat"
          >
            <v-icon start size="14">{{ item.is_active ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
            {{ item.is_active ? 'Active' : 'Disabled' }}
          </v-chip>
        </template>

        <!-- Last Login Column -->
        <template #item.last_sign_in_at="{ item }">
          <span v-if="item.last_sign_in_at" class="text-body-2">
            {{ formatDate(item.last_sign_in_at) }}
          </span>
          <span v-else class="text-caption text-grey">Never</span>
        </template>

        <!-- Created Column -->
        <template #item.created_at="{ item }">
          <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
        </template>

        <!-- Actions Column -->
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
            
            <v-tooltip :text="item.is_active ? 'Disable Login' : 'Enable Login'" location="top">
              <template #activator="{ props }">
                <v-btn 
                  v-bind="props"
                  :icon="item.is_active ? 'mdi-account-off' : 'mdi-account-check'" 
                  size="small" 
                  variant="text" 
                  :color="item.is_active ? 'error' : 'success'"
                  @click="confirmToggleActive(item)"
                  :disabled="isCurrentUser(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>

        <!-- Empty State -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
            <h3 class="text-h6 mt-4">No Users Found</h3>
            <p class="text-body-2 text-grey">
              {{ search || filterRole || filterStatus ? 'Try adjusting your filters' : 'No user accounts exist yet' }}
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Edit User Dialog -->
    <v-dialog v-model="showEditDialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-edit</v-icon>
          Edit User
        </v-card-title>
        
        <v-card-text class="pt-6" v-if="editingUser">
          <!-- User Info Header -->
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
                  v-model="editForm.first_name"
                  label="First Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editForm.last_name"
                  label="Last Name"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="editForm.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="editForm.role"
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
            @click="generatePassword"
          >
            Generate Strong Password
          </v-btn>

          <div v-if="newPassword" class="mt-4">
            <v-btn 
              variant="text" 
              size="small" 
              prepend-icon="mdi-content-copy"
              @click="copyPassword"
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
            This user will no longer be able to log in. Their password will be changed.
          </v-alert>
          
          <v-alert v-else type="info" variant="tonal" class="mt-4" density="compact">
            This user will be able to log in again. You may need to reset their password.
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

// State
const loading = ref(true)
const saving = ref(false)
const resettingPassword = ref(false)
const togglingActive = ref(false)
const users = ref<UserAccount[]>([])
const search = ref('')
const filterRole = ref<string | null>(null)
const filterStatus = ref<string | null>(null)

// Edit Dialog
const showEditDialog = ref(false)
const editingUser = ref<UserAccount | null>(null)
const editForm = ref({
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
const headers = [
  { title: 'User', key: 'user', sortable: true },
  { title: 'Access Level', key: 'role', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Last Login', key: 'last_sign_in_at', sortable: true },
  { title: 'Created', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
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

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Disabled', value: 'disabled' }
]

// Computed
const stats = computed(() => {
  const total = users.value.length
  const active = users.value.filter(u => u.is_active).length
  const disabled = total - active
  const admins = users.value.filter(u => ['super_admin', 'admin'].includes(u.role)).length
  return { total, active, disabled, admins }
})

const filteredUsers = computed(() => {
  let result = [...users.value]
  
  if (filterRole.value) {
    result = result.filter(u => u.role === filterRole.value)
  }
  
  if (filterStatus.value) {
    if (filterStatus.value === 'active') {
      result = result.filter(u => u.is_active)
    } else {
      result = result.filter(u => !u.is_active)
    }
  }
  
  return result
})

// Methods
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
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

function isCurrentUser(user: UserAccount): boolean {
  return user.auth_user_id === authStore.profile?.auth_user_id
}

function generatePassword(): void {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '!@#$%&*'
  let password = 'GD'
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  password += special.charAt(Math.floor(Math.random() * special.length))
  newPassword.value = password
}

function copyPassword(): void {
  navigator.clipboard.writeText(newPassword.value)
  showNotification('Password copied to clipboard')
}

// Dialog Methods
function openEditDialog(user: UserAccount, focusField?: string): void {
  editingUser.value = user
  editForm.value = {
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

function openPasswordDialog(user: UserAccount): void {
  passwordUser.value = user
  newPassword.value = ''
  showPassword.value = false
  generatePassword()
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
      body: editForm.value
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
  fetchUsers()
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
</style>
