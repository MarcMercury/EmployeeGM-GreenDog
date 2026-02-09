<template>
  <div>
    <!-- Create User Dialog -->
    <v-dialog v-model="showDialog" max-width="600" persistent>
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
                <v-list-item-subtitle>{{ formatRoleLabel(createForm.role) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template #prepend>
                  <v-icon color="primary">mdi-key</v-icon>
                </template>
                <v-list-item-title>Initial Password</v-list-item-title>
                <v-list-item-subtitle>{{ createForm.password }}</v-list-item-subtitle>
                <template #append>
                  <v-btn icon size="small" aria-label="Copy" @click="copyCreatePassword">
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
          <v-btn variant="text" @click="close">Cancel</v-btn>
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
            :disabled="!canProceed"
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
  </div>
</template>

<script setup lang="ts">
import type { PendingEmployee } from '~/types/admin.types'

const props = defineProps<{
  roleOptions: { title: string; value: string }[]
  locations: { id: string; name: string }[]
}>()

const emit = defineEmits<{
  (e: 'created'): void
  (e: 'notify', payload: { message: string; color: string }): void
}>()

const supabase = useSupabaseClient()

const showDialog = ref(false)
const showSuccessDialog = ref(false)
const creating = ref(false)
const selectedEmployee = ref<PendingEmployee | null>(null)
const createdEmployee = ref<PendingEmployee | null>(null)
const createdCredentials = ref<{ email: string; password: string } | null>(null)
const createStep = ref(1)
const showCreatePassword = ref(false)
const createForm = ref({
  email: '',
  phone: '',
  role: 'user',
  location_id: null as string | null,
  password: ''
})

const canProceed = computed(() => {
  if (createStep.value === 1) {
    return createForm.value.email && /.+@.+/.test(createForm.value.email)
  }
  if (createStep.value === 2) {
    return createForm.value.password && createForm.value.password.length >= 8
  }
  return true
})

function formatRoleLabel(role: string): string {
  return props.roleOptions.find(r => r.value === role)?.title || role
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

function copyCreatePassword(): void {
  navigator.clipboard.writeText(createForm.value.password)
  emit('notify', { message: 'Password copied to clipboard', color: 'success' })
}

function open(employee: PendingEmployee): void {
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
  showDialog.value = true
}

function close(): void {
  showDialog.value = false
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

    if (!(response as any).success) {
      throw new Error('Failed to create user account')
    }

    createdEmployee.value = selectedEmployee.value
    createdCredentials.value = {
      email: createForm.value.email,
      password: createForm.value.password
    }

    showDialog.value = false
    showSuccessDialog.value = true

    emit('created')
  } catch (error: any) {
    console.error('Error creating user account:', error)
    emit('notify', { message: error.data?.message || error.message || 'Failed to create user account', color: 'error' })
  } finally {
    creating.value = false
  }
}

defineExpose({ open })
</script>
