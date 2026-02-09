<template>
  <v-row>
    <!-- Basic Information Card -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="primary">mdi-account</v-icon>
          Basic Information
          <v-spacer />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-badge-account</v-icon></template>
              <v-list-item-title class="text-body-2">Employee Number</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.employee_number || 'Not Set' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account</v-icon></template>
              <v-list-item-title class="text-body-2">First Name</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.first_name }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account</v-icon></template>
              <v-list-item-title class="text-body-2">Last Name</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.last_name }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-card-account-details</v-icon></template>
              <v-list-item-title class="text-body-2">Preferred Name</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.preferred_name || 'Not Set' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-cake-variant</v-icon></template>
              <v-list-item-title class="text-body-2">Date of Birth</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ formatDate(employee.date_of_birth) }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-calendar-check</v-icon></template>
              <v-list-item-title class="text-body-2">Hire Date</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ formatDate(employee.hire_date) }}</span>
              </template>
            </v-list-item>
            <v-list-item v-if="employee.termination_date" class="px-0">
              <template #prepend><v-icon size="18" color="error">mdi-calendar-remove</v-icon></template>
              <v-list-item-title class="text-body-2 text-error">Termination Date</v-list-item-title>
              <template #append>
                <span class="text-body-2 text-error">{{ formatDate(employee.termination_date) }}</span>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Contact Information Card -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="info">mdi-phone</v-icon>
          Contact Information
          <v-spacer />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-email-outline</v-icon></template>
              <v-list-item-title class="text-body-2">Work Email</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ employee.email_work || profileEmail || 'Not Set' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-email</v-icon></template>
              <v-list-item-title class="text-body-2">Personal Email</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ employee.email_personal || 'Not Set' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-cellphone</v-icon></template>
              <v-list-item-title class="text-body-2">Mobile Phone</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ employee.phone_mobile || 'Not Set' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-phone-outline</v-icon></template>
              <v-list-item-title class="text-body-2">Work Phone</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ employee.phone_work || 'Not Set' }}</span>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Address Card -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="teal">mdi-map-marker</v-icon>
          Address
          <v-spacer />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <div v-if="employee.address_street">
            <p class="text-body-2 mb-1">{{ employee.address_street }}</p>
            <p class="text-body-2 text-grey">
              {{ [employee.address_city, employee.address_state, employee.address_zip].filter(Boolean).join(', ') }}
            </p>
          </div>
          <div v-else class="text-center py-4">
            <v-icon size="40" color="grey-lighten-2">mdi-map-marker-outline</v-icon>
            <p class="text-caption text-grey mt-2">No address on file</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Emergency Contact Card -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="error">mdi-alert-circle</v-icon>
          Emergency Contact
          <v-spacer />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <div v-if="emergencyContact.name">
            <v-list density="compact" class="bg-transparent">
              <v-list-item class="px-0">
                <template #prepend><v-icon size="18" color="grey">mdi-account</v-icon></template>
                <v-list-item-title class="text-body-2">Name</v-list-item-title>
                <template #append>
                  <span class="text-body-2 font-weight-medium">{{ emergencyContact.name }}</span>
                </template>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend><v-icon size="18" color="grey">mdi-phone</v-icon></template>
                <v-list-item-title class="text-body-2">Phone</v-list-item-title>
                <template #append>
                  <span class="text-body-2">{{ emergencyContact.phone }}</span>
                </template>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend><v-icon size="18" color="grey">mdi-account-group</v-icon></template>
                <v-list-item-title class="text-body-2">Relationship</v-list-item-title>
                <template #append>
                  <span class="text-body-2">{{ emergencyContact.relationship }}</span>
                </template>
              </v-list-item>
            </v-list>
          </div>
          <div v-else class="text-center py-4">
            <v-icon size="40" color="grey-lighten-2">mdi-account-alert-outline</v-icon>
            <p class="text-caption text-grey mt-2">No emergency contact on file</p>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Employment Details Card -->
    <v-col cols="12" md="6">
      <v-card class="bg-white shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="purple">mdi-briefcase</v-icon>
          Employment Details
          <v-spacer />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-domain</v-icon></template>
              <v-list-item-title class="text-body-2">Department</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.department?.name || 'Not Assigned' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account-tie</v-icon></template>
              <v-list-item-title class="text-body-2">Position</v-list-item-title>
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ employee.position?.title || 'Not Assigned' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-map-marker</v-icon></template>
              <v-list-item-title class="text-body-2">Location</v-list-item-title>
              <template #append>
                <span class="text-body-2">{{ employee.location?.name || 'Not Assigned' }}</span>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-briefcase-clock</v-icon></template>
              <v-list-item-title class="text-body-2">Employment Type</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="tonal" color="primary">
                  {{ formatEmploymentType(employee.employment_type) }}
                </v-chip>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account-check</v-icon></template>
              <v-list-item-title class="text-body-2">Status</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="flat" :color="getStatusColor(employee.employment_status)">
                  {{ employee.employment_status || 'Unknown' }}
                </v-chip>
              </template>
            </v-list-item>
            <v-list-item v-if="employee.manager" class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account-supervisor</v-icon></template>
              <v-list-item-title class="text-body-2">Reports To</v-list-item-title>
              <template #append>
                <NuxtLink :to="`/roster/${employee.manager.id}`" class="text-body-2 text-primary text-decoration-none">
                  {{ employee.manager.preferred_name || employee.manager.first_name }} {{ employee.manager.last_name }}
                </NuxtLink>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Admin Settings Card (Admin Only) -->
    <v-col v-if="isAdmin" cols="12" md="6">
      <v-card class="bg-amber-lighten-5 shadow-sm rounded-xl h-100" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="amber-darken-2">mdi-shield-account</v-icon>
          Admin Settings
          <v-chip size="x-small" variant="tonal" color="amber-darken-2" class="ml-2">Admin Only</v-chip>
          <v-spacer />
          <v-btn icon="mdi-pencil" size="x-small" variant="text" aria-label="Edit" @click="emit('open-personal-info-dialog')" />
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-shield</v-icon></template>
              <v-list-item-title class="text-body-2">Profile Role</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="tonal" :color="employee.profile?.role === 'admin' ? 'error' : 'primary'">
                  {{ employee.profile?.role || 'No Profile' }}
                </v-chip>
              </template>
            </v-list-item>
            <v-list-item class="px-0">
              <template #prepend><v-icon size="18" color="grey">mdi-account-check</v-icon></template>
              <v-list-item-title class="text-body-2">Profile Active</v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="flat" :color="employee.profile?.is_active ? 'success' : 'error'">
                  {{ employee.profile?.is_active ? 'Yes' : 'No' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-divider class="my-3" />
          <div class="text-overline text-grey mb-2">INTERNAL NOTES</div>
          <p v-if="employee.notes_internal" class="text-body-2" style="white-space: pre-wrap;">{{ employee.notes_internal }}</p>
          <p v-else class="text-caption text-grey font-italic">No internal notes</p>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { formatDate, formatEmploymentType, getStatusColor } from '~/utils/rosterFormatters'

defineProps<{
  employee: any
  profileEmail: string
  emergencyContact: { name: string; phone: string; relationship: string }
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'open-personal-info-dialog': []
}>()
</script>
