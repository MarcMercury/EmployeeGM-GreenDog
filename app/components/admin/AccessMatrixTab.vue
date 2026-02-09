<template>
  <div>
    <v-card-text>
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <h3 class="text-h6">Role-Based Access Matrix</h3>
          <p class="text-body-2 text-grey">Configure page access for each role. Click cells to toggle access levels.</p>
        </div>
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-shield-plus"
            @click="showCreateRoleDialog = true"
          >
            Create Role
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-refresh"
            @click="loadAccessMatrixData"
            :loading="matrixLoading"
          >
            Refresh
          </v-btn>
        </div>
      </div>

      <!-- Role Cards -->
      <div class="d-flex flex-wrap gap-2 mb-4">
        <v-chip
          v-for="role in matrixRoles"
          :key="role.role_key"
          :color="getRoleChipColor(role.color)"
          size="small"
          variant="flat"
          class="cursor-pointer"
          @click="openEditRoleDialog(role)"
        >
          <v-icon start size="14">{{ role.icon || 'mdi-account' }}</v-icon>
          {{ role.display_name }}
          <v-icon end size="12" class="ml-1">mdi-pencil</v-icon>
        </v-chip>
      </div>

      <!-- Loading State -->
      <div v-if="matrixLoading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-grey mt-4">Loading access matrix...</p>
      </div>

      <!-- Access Matrix Table -->
      <v-table v-else density="compact" class="access-matrix-table" fixed-header height="500">
        <thead>
          <tr>
            <th class="text-left" style="width: 250px; position: sticky; left: 0; z-index: 2; background: rgb(var(--v-theme-surface));">
              Navigation Page
            </th>
            <th
              v-for="role in matrixRoles"
              :key="role.role_key"
              class="text-center"
              style="min-width: 90px;"
            >
              <v-tooltip :text="role.description || role.display_name" location="top">
                <template #activator="{ props }">
                  <div v-bind="props" class="cursor-help d-flex flex-column align-center">
                    <v-icon :icon="role.icon || 'mdi-account'" size="16" :color="getRoleChipColor(role.color)" />
                    <span class="text-caption">{{ role.display_name.replace(' Admin', '').replace(' Member', '') }}</span>
                  </div>
                </template>
              </v-tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="section in matrixSections" :key="section.name">
            <!-- Section Header -->
            <tr class="bg-grey-lighten-4">
              <td :colspan="matrixRoles.length + 1" class="font-weight-bold py-2">
                <v-icon :icon="section.icon" size="small" class="mr-2" />
                {{ section.name }}
              </td>
            </tr>
            <!-- Section Pages -->
            <tr v-for="page in section.pages" :key="page.id">
              <td style="position: sticky; left: 0; z-index: 1; background: rgb(var(--v-theme-surface));">
                <div class="d-flex align-center">
                  <v-icon :icon="page.icon" size="small" class="mr-2 text-grey" />
                  <div>
                    <div class="text-body-2">{{ page.name }}</div>
                    <div class="text-caption text-grey">{{ page.path }}</div>
                  </div>
                </div>
              </td>
              <td
                v-for="role in matrixRoles"
                :key="role.role_key"
                class="text-center access-cell"
                :class="{ 'access-cell-disabled': role.role_key === 'super_admin' }"
                @click="togglePageAccess(page.id, role.role_key)"
              >
                <v-tooltip :text="getAccessTooltipText(page.id, role.role_key)" location="top">
                  <template #activator="{ props }">
                    <span
                      v-bind="props"
                      :class="getAccessCellClass(page.id, role.role_key)"
                    >
                      {{ getAccessCellIcon(page.id, role.role_key) }}
                    </span>
                  </template>
                </v-tooltip>
              </td>
            </tr>
          </template>
        </tbody>
      </v-table>

      <!-- Summary Statistics -->
      <v-row class="mt-4">
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="text-subtitle-1">
              <v-icon start color="primary">mdi-chart-pie</v-icon>
              Access by Role
            </v-card-title>
            <v-card-text class="pt-0">
              <v-list density="compact">
                <v-list-item v-for="role in matrixRoles" :key="role.role_key" class="px-0">
                  <template #prepend>
                    <v-avatar :color="getRoleChipColor(role.color)" size="24" class="mr-2">
                      <v-icon size="12" color="white">{{ role.icon || 'mdi-account' }}</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="text-body-2">{{ role.display_name }}</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" variant="tonal">
                      {{ getMatrixRolePageCount(role.role_key) }} / {{ matrixPages.length }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="text-subtitle-1">
              <v-icon start color="warning">mdi-key</v-icon>
              Access Levels
            </v-card-title>
            <v-card-text class="pt-0">
              <v-list density="compact">
                <v-list-item class="px-0">
                  <template #prepend>
                    <span class="text-success font-weight-bold mr-3" style="width: 24px;">✓</span>
                  </template>
                  <v-list-item-title class="text-body-2">Full Access</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">View and edit</v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0">
                  <template #prepend>
                    <span class="text-info font-weight-bold mr-3" style="width: 24px;">👁</span>
                  </template>
                  <v-list-item-title class="text-body-2">View Only</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">Read-only access</v-list-item-subtitle>
                </v-list-item>
                <v-list-item class="px-0">
                  <template #prepend>
                    <span class="text-grey mr-3" style="width: 24px;">—</span>
                  </template>
                  <v-list-item-title class="text-body-2">No Access</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">Hidden from nav</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="outlined" rounded="lg">
            <v-card-title class="text-subtitle-1">
              <v-icon start color="success">mdi-database-check</v-icon>
              Database Status
            </v-card-title>
            <v-card-text class="pt-0">
              <v-list density="compact">
                <v-list-item class="px-0">
                  <v-list-item-title class="text-body-2">Roles Defined</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" color="primary">{{ matrixRoles.length }}</v-chip>
                  </template>
                </v-list-item>
                <v-list-item class="px-0">
                  <v-list-item-title class="text-body-2">Pages Configured</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" color="primary">{{ matrixPages.length }}</v-chip>
                  </template>
                </v-list-item>
                <v-list-item class="px-0">
                  <v-list-item-title class="text-body-2">Access Rules</v-list-item-title>
                  <template #append>
                    <v-chip size="x-small" color="primary">{{ matrixAccessRecords.length }}</v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Create/Edit Role Dialog -->
    <v-dialog v-model="showCreateRoleDialog" max-width="600" persistent>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>{{ editingRole ? 'mdi-shield-edit' : 'mdi-shield-plus' }}</v-icon>
          {{ editingRole ? 'Edit Role' : 'Create New Role' }}
        </v-card-title>

        <v-card-text class="pt-6">
          <v-form ref="roleForm" @submit.prevent="saveRoleChanges">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="roleFormData.display_name"
                  label="Display Name"
                  variant="outlined"
                  density="compact"
                  placeholder="e.g., Project Manager"
                  :rules="[v => !!v || 'Name required']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="roleFormData.role_key"
                  label="Role Key"
                  variant="outlined"
                  density="compact"
                  placeholder="e.g., project_manager"
                  :disabled="!!editingRole && isBuiltInRoleCheck(editingRole.role_key)"
                  hint="Lowercase with underscores only"
                  persistent-hint
                  :rules="[v => !!v || 'Key required', v => /^[a-z_]+$/.test(v) || 'Lowercase and underscores only']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="roleFormData.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                  placeholder="Describe what this role can access..."
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="roleFormData.tier"
                  label="Access Tier"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hint="Higher = more access (1-200)"
                  persistent-hint
                  :rules="[v => v >= 1 && v <= 200 || 'Must be 1-200']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="roleFormData.color"
                  :items="colorOptions"
                  label="Color"
                  variant="outlined"
                  density="compact"
                >
                  <template #item="{ item, props: itemProps }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <v-avatar :color="item.value" size="24" />
                      </template>
                    </v-list-item>
                  </template>
                  <template #selection="{ item }">
                    <v-avatar :color="item.value" size="20" class="mr-2" />
                    {{ item.title }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12">
                <v-combobox
                  v-model="roleFormData.icon"
                  :items="iconOptions"
                  label="Icon"
                  variant="outlined"
                  density="compact"
                  hint="Material Design Icon name (mdi-*)"
                  persistent-hint
                >
                  <template #prepend-inner>
                    <v-icon :icon="roleFormData.icon || 'mdi-account'" />
                  </template>
                </v-combobox>
              </v-col>
            </v-row>
          </v-form>

          <!-- Copy Access From Existing Role -->
          <v-alert v-if="!editingRole" type="info" variant="tonal" class="mt-4" density="compact">
            <v-icon start>mdi-content-copy</v-icon>
            New roles start with the same access as <strong>User</strong>. You can modify after creation.
          </v-alert>

          <!-- Warning for built-in roles -->
          <v-alert v-if="editingRole && isBuiltInRoleCheck(editingRole.role_key)" type="warning" variant="tonal" class="mt-4" density="compact">
            <v-icon start>mdi-shield-lock</v-icon>
            This is a built-in role. The role key cannot be changed.
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn
            v-if="editingRole && !isBuiltInRoleCheck(editingRole.role_key)"
            color="error"
            variant="text"
            @click="confirmDeleteRole"
          >
            Delete Role
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeRoleDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            :loading="matrixSaving"
            @click="saveRoleChanges"
          >
            {{ editingRole ? 'Save Changes' : 'Create Role' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Role Confirmation -->
    <v-dialog v-model="showDeleteRoleDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-error text-white py-4">
          <v-icon start>mdi-shield-remove</v-icon>
          Delete Role
        </v-card-title>
        <v-card-text class="pt-6">
          <p class="text-body-1">
            Are you sure you want to delete the role <strong>{{ editingRole?.display_name }}</strong>?
          </p>
          <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
            This will also remove all access permissions for this role.
          </v-alert>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showDeleteRoleDialog = false">Cancel</v-btn>
          <v-spacer />
          <v-btn color="error" :loading="matrixSaving" @click="deleteRoleConfirmed">
            Delete Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const {
  roles: composableRoles,
  pages: composablePages,
  accessRecords: composableAccessRecords,
  pageSections: composablePageSections,
  sortedRoles: composableSortedRoles,
  loading: composableLoading,
  saving: composableSaving,
  getAccess: composableGetAccess,
  loadAccessMatrix,
  loadFromDatabase,
  updateAccess,
  saveRole,
  deleteRole,
  getRolePageCount,
  isBuiltInRole,
  initializeRoleAccess
} = useAccessMatrix()

const emit = defineEmits<{
  (e: 'notify', payload: { message: string; color: string }): void
}>()

// Matrix State (database-backed)
const matrixRoles = computed(() => composableSortedRoles.value)
const matrixPages = computed(() => composablePages.value)
const matrixAccessRecords = computed(() => composableAccessRecords.value)
const matrixSections = computed(() => composablePageSections.value)
const matrixLoading = computed(() => composableLoading.value)
const matrixSaving = computed(() => composableSaving.value)

// Role Dialog State
const showCreateRoleDialog = ref(false)
const showDeleteRoleDialog = ref(false)
const editingRole = ref<{
  id?: string
  role_key: string
  display_name: string
  description: string
  tier: number
  icon: string
  color: string
} | null>(null)

const roleFormData = reactive({
  role_key: '',
  display_name: '',
  description: '',
  tier: 50,
  icon: 'mdi-account',
  color: 'grey'
})

const colorOptions = [
  { title: 'Red', value: 'red' },
  { title: 'Orange', value: 'orange' },
  { title: 'Yellow', value: 'warning' },
  { title: 'Green', value: 'green' },
  { title: 'Teal', value: 'teal' },
  { title: 'Blue', value: 'info' },
  { title: 'Indigo', value: 'indigo' },
  { title: 'Purple', value: 'purple' },
  { title: 'Pink', value: 'pink' },
  { title: 'Grey', value: 'grey' }
]

const iconOptions = [
  'mdi-account',
  'mdi-account-tie',
  'mdi-account-group',
  'mdi-shield-account',
  'mdi-shield-crown',
  'mdi-office-building',
  'mdi-bullhorn',
  'mdi-school',
  'mdi-briefcase',
  'mdi-cog',
  'mdi-star',
  'mdi-key',
  'mdi-lock',
  'mdi-eye'
]

function notify(message: string, color: string) {
  emit('notify', { message, color })
}

async function loadAccessMatrixData() {
  await loadAccessMatrix()
}

function getAccessLevel(pageId: string, roleKey: string): 'full' | 'view' | 'none' {
  if (roleKey === 'super_admin') return 'full'
  const record = matrixAccessRecords.value.find(
    r => r.page_id === pageId && r.role_key === roleKey
  )
  return (record?.access_level as 'full' | 'view' | 'none') || 'none'
}

function getAccessCellIcon(pageId: string, roleKey: string): string {
  const access = getAccessLevel(pageId, roleKey)
  switch (access) {
    case 'full': return '✓'
    case 'view': return '👁'
    case 'none': return '—'
  }
}

function getAccessCellClass(pageId: string, roleKey: string): string {
  const access = getAccessLevel(pageId, roleKey)
  switch (access) {
    case 'full': return 'text-success font-weight-bold cursor-pointer'
    case 'view': return 'text-info cursor-pointer'
    case 'none': return 'text-grey-lighten-1 cursor-pointer'
  }
}

function getAccessTooltipText(pageId: string, roleKey: string): string {
  if (roleKey === 'super_admin') {
    return 'Super Admin always has full access'
  }
  const access = getAccessLevel(pageId, roleKey)
  const clickHint = ' (click to change)'
  switch (access) {
    case 'full': return 'Full access' + clickHint
    case 'view': return 'View only' + clickHint
    case 'none': return 'No access' + clickHint
  }
}

async function togglePageAccess(pageId: string, roleKey: string) {
  if (roleKey === 'super_admin') {
    notify('Super Admin access cannot be modified', 'warning')
    return
  }
  const currentAccess = getAccessLevel(pageId, roleKey)
  let newAccess: 'full' | 'view' | 'none'
  switch (currentAccess) {
    case 'none': newAccess = 'view'; break
    case 'view': newAccess = 'full'; break
    case 'full': newAccess = 'none'; break
  }
  const success = await updateAccess(pageId, roleKey, newAccess)
  if (success) {
    notify(`Access updated to ${newAccess}`, 'success')
  } else {
    notify('Failed to update access', 'error')
  }
}

function getRoleChipColor(color: string): string {
  const colorMap: Record<string, string> = {
    'red': 'error',
    'amber': 'warning',
    'slate': 'grey',
    'cyan': 'info'
  }
  return colorMap[color] || color
}

function getMatrixRolePageCount(roleKey: string): number {
  if (roleKey === 'super_admin') {
    return matrixPages.value.length
  }
  return matrixAccessRecords.value.filter(
    r => r.role_key === roleKey && r.access_level !== 'none'
  ).length
}

function isBuiltInRoleCheck(roleKey: string): boolean {
  return ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin', 'user'].includes(roleKey)
}

function openEditRoleDialog(role: any) {
  editingRole.value = {
    id: role.id,
    role_key: role.role_key,
    display_name: role.display_name,
    description: role.description || '',
    tier: role.tier,
    icon: role.icon || 'mdi-account',
    color: role.color || 'grey'
  }
  roleFormData.role_key = role.role_key
  roleFormData.display_name = role.display_name
  roleFormData.description = role.description || ''
  roleFormData.tier = role.tier
  roleFormData.icon = role.icon || 'mdi-account'
  roleFormData.color = role.color || 'grey'
  showCreateRoleDialog.value = true
}

function closeRoleDialog() {
  showCreateRoleDialog.value = false
  editingRole.value = null
  roleFormData.role_key = ''
  roleFormData.display_name = ''
  roleFormData.description = ''
  roleFormData.tier = 50
  roleFormData.icon = 'mdi-account'
  roleFormData.color = 'grey'
}

async function saveRoleChanges() {
  if (!roleFormData.display_name || !roleFormData.role_key) {
    notify('Please fill in required fields', 'error')
    return
  }
  const roleData = {
    role_key: roleFormData.role_key,
    display_name: roleFormData.display_name,
    description: roleFormData.description,
    tier: roleFormData.tier,
    icon: roleFormData.icon,
    color: roleFormData.color
  }
  const success = await saveRole(roleData)
  if (success) {
    if (!editingRole.value) {
      await initializeRoleAccess(roleFormData.role_key)
    }
    notify(editingRole.value ? 'Role updated' : 'Role created', 'success')
    closeRoleDialog()
    await loadAccessMatrixData()
  } else {
    notify('Failed to save role', 'error')
  }
}

function confirmDeleteRole() {
  showDeleteRoleDialog.value = true
}

async function deleteRoleConfirmed() {
  if (!editingRole.value) return
  const success = await deleteRole(editingRole.value.role_key)
  if (success) {
    notify('Role deleted', 'success')
    showDeleteRoleDialog.value = false
    closeRoleDialog()
    await loadAccessMatrixData()
  } else {
    notify('Failed to delete role', 'error')
  }
}

// Load data on mount
onMounted(async () => {
  await loadAccessMatrixData()
})

defineExpose({ loadAccessMatrixData })
</script>
