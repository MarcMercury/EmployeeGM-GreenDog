<template>
  <div class="facilities-resources-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Facilities Resources</h1>
        <p class="text-body-1 text-grey-darken-1">
          Directory of facility vendors and contractors for physical facility maintenance
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn-toggle v-model="showInactive" density="compact" variant="outlined">
          <v-btn :value="false">Active Only</v-btn>
          <v-btn :value="true">Show All</v-btn>
        </v-btn-toggle>
        <v-btn
          v-if="isAdmin"
          color="primary"
          prepend-icon="mdi-plus"
          @click="openAddDialog"
        >
          Add Resource
        </v-btn>
      </div>
    </div>

    <!-- Search and Filters -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search vendors..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="typeFilter"
              :items="resourceTypes"
              label="Service Type"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="locationFilter"
              :items="locationOptions"
              item-title="name"
              item-value="id"
              label="Location"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn-toggle v-model="viewMode" mandatory density="compact" class="h-100">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-view-list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="6" sm="3">
        <v-card rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="28" color="primary" class="mb-2">mdi-account-hard-hat</v-icon>
            <div class="text-h4 font-weight-bold">{{ resources.length }}</div>
            <div class="text-body-2 text-grey">Total Vendors</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="28" color="warning" class="mb-2">mdi-alert-circle</v-icon>
            <div class="text-h4 font-weight-bold">{{ emergencyCount }}</div>
            <div class="text-body-2 text-grey">Emergency Contacts</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="28" color="success" class="mb-2">mdi-star</v-icon>
            <div class="text-h4 font-weight-bold">{{ preferredCount }}</div>
            <div class="text-body-2 text-grey">Preferred Vendors</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card rounded="lg">
          <v-card-text class="text-center">
            <v-icon size="28" color="info" class="mb-2">mdi-view-grid</v-icon>
            <div class="text-h4 font-weight-bold">{{ uniqueTypes.length }}</div>
            <div class="text-body-2 text-grey">Service Types</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <v-card v-else-if="filteredResources.length === 0" rounded="lg" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-tools</v-icon>
      <h3 class="text-h6 mb-2">No Resources Found</h3>
      <p class="text-body-2 text-grey mb-4">
        {{ resources.length === 0 ? 'Get started by adding your first facility vendor.' : 'No vendors match your current filters.' }}
      </p>
      <v-btn v-if="resources.length === 0 && isAdmin" color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Resource
      </v-btn>
    </v-card>

    <!-- Grid View -->
    <v-row v-else-if="viewMode === 'grid'">
      <v-col v-for="resource in filteredResources" :key="resource.id" cols="12" sm="6" md="4" lg="3">
        <v-card 
          rounded="lg" 
          class="h-100 resource-card" 
          :class="{ 'inactive-card': !resource.is_active }"
          @click="openResource(resource)"
        >
          <div class="pa-4 text-center">
            <v-avatar size="64" :color="getTypeColor(resource.resource_type)" class="mb-3">
              <v-icon size="32" color="white">{{ getTypeIcon(resource.resource_type) }}</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ resource.name }}</h3>
            <div class="text-caption text-grey mb-2">{{ resource.company_name }}</div>
            <div class="d-flex justify-center gap-1 flex-wrap mb-2">
              <v-chip size="x-small" variant="tonal" :color="getTypeColor(resource.resource_type)">
                {{ formatType(resource.resource_type) }}
              </v-chip>
              <v-chip v-if="resource.emergency_contact" size="x-small" variant="flat" color="error">
                <v-icon size="12" start>mdi-alert</v-icon>
                Emergency
              </v-chip>
              <v-chip v-if="resource.is_preferred" size="x-small" variant="flat" color="success">
                <v-icon size="12" start>mdi-star</v-icon>
                Preferred
              </v-chip>
            </div>
            <p v-if="resource.phone" class="text-body-2 text-grey">{{ resource.phone }}</p>
          </div>
          <v-divider />
          <v-card-actions class="justify-center">
            <v-btn variant="text" size="small" prepend-icon="mdi-phone" @click.stop="callResource(resource)">
              Call
            </v-btn>
            <v-btn v-if="isAdmin" variant="text" size="small" prepend-icon="mdi-pencil" @click.stop="openEditDialog(resource)">
              Edit
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredResources"
        :search="search"
        hover
        @click:row="(_: any, { item }: { item: any }) => openResource(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="getTypeColor(item.resource_type)" size="36">
              <v-icon size="18" color="white">{{ getTypeIcon(item.resource_type) }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.company_name }}</div>
            </div>
          </div>
        </template>
        <template #item.resource_type="{ item }">
          <v-chip :color="getTypeColor(item.resource_type)" size="small" variant="tonal">
            {{ formatType(item.resource_type) }}
          </v-chip>
        </template>
        <template #item.flags="{ item }">
          <div class="d-flex gap-1">
            <v-chip v-if="item.emergency_contact" size="x-small" variant="flat" color="error">
              Emergency
            </v-chip>
            <v-chip v-if="item.is_preferred" size="x-small" variant="flat" color="success">
              Preferred
            </v-chip>
          </div>
        </template>
        <template #item.contact="{ item }">
          <div class="text-body-2">{{ item.phone }}</div>
          <div class="text-caption text-grey">{{ item.email }}</div>
        </template>
        <template #item.locations="{ item }">
          <div class="d-flex flex-wrap gap-1">
            <v-chip 
              v-for="loc in getResourceLocations(item.id)" 
              :key="loc.id" 
              size="x-small" 
              variant="outlined"
            >
              {{ loc.name }}
            </v-chip>
            <span v-if="getResourceLocations(item.id).length === 0" class="text-caption text-grey">
              All Locations
            </span>
          </div>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-phone" size="small" variant="text" @click.stop="callResource(item)" />
          <v-btn v-if="item.email" icon="mdi-email" size="small" variant="text" @click.stop="emailResource(item)" />
          <v-btn v-if="item.website" icon="mdi-web" size="small" variant="text" @click.stop="visitWebsite(item)" />
          <v-btn v-if="isAdmin" icon="mdi-pencil" size="small" variant="text" @click.stop="openEditDialog(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Resource Detail Dialog -->
    <v-dialog v-model="resourceDialog" max-width="700" scrollable>
      <v-card v-if="selectedResource">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="getTypeColor(selectedResource.resource_type)" size="48">
              <v-icon size="24" color="white">{{ getTypeIcon(selectedResource.resource_type) }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedResource.name }}</div>
              <div class="d-flex align-center gap-2">
                <v-chip size="x-small" variant="tonal" :color="getTypeColor(selectedResource.resource_type)">
                  {{ formatType(selectedResource.resource_type) }}
                </v-chip>
                <v-chip v-if="selectedResource.is_preferred" size="x-small" variant="flat" color="success">
                  <v-icon size="12" start>mdi-star</v-icon> Preferred
                </v-chip>
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="resourceDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <!-- Company Info -->
          <div v-if="selectedResource.company_name" class="mb-4">
            <div class="text-overline text-grey">Company</div>
            <div class="text-body-1">{{ selectedResource.company_name }}</div>
          </div>

          <!-- Contact Information -->
          <div class="text-overline text-grey mb-2">Contact Information</div>
          <v-list density="compact" class="bg-transparent mb-4">
            <v-list-item v-if="selectedResource.phone">
              <template #prepend><v-icon>mdi-phone</v-icon></template>
              <v-list-item-title>{{ selectedResource.phone }}</v-list-item-title>
              <v-list-item-subtitle>Primary Phone</v-list-item-subtitle>
              <template #append>
                <v-btn variant="text" size="small" @click="callResource(selectedResource)">Call</v-btn>
              </template>
            </v-list-item>
            <v-list-item v-if="selectedResource.phone_alt">
              <template #prepend><v-icon>mdi-phone-outline</v-icon></template>
              <v-list-item-title>{{ selectedResource.phone_alt }}</v-list-item-title>
              <v-list-item-subtitle>Alternate Phone</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedResource.emergency_phone">
              <template #prepend><v-icon color="error">mdi-phone-alert</v-icon></template>
              <v-list-item-title class="text-error">{{ selectedResource.emergency_phone }}</v-list-item-title>
              <v-list-item-subtitle>Emergency Line</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedResource.email">
              <template #prepend><v-icon>mdi-email</v-icon></template>
              <v-list-item-title>{{ selectedResource.email }}</v-list-item-title>
              <template #append>
                <v-btn variant="text" size="small" @click="emailResource(selectedResource)">Email</v-btn>
              </template>
            </v-list-item>
            <v-list-item v-if="selectedResource.website">
              <template #prepend><v-icon>mdi-web</v-icon></template>
              <v-list-item-title>{{ selectedResource.website }}</v-list-item-title>
              <template #append>
                <v-btn variant="text" size="small" @click="visitWebsite(selectedResource)">Visit</v-btn>
              </template>
            </v-list-item>
          </v-list>

          <!-- Address -->
          <div v-if="hasAddress(selectedResource)" class="mb-4">
            <div class="text-overline text-grey mb-2">Address</div>
            <div class="text-body-2">
              <div v-if="selectedResource.address_line1">{{ selectedResource.address_line1 }}</div>
              <div v-if="selectedResource.address_line2">{{ selectedResource.address_line2 }}</div>
              <div v-if="selectedResource.city || selectedResource.state || selectedResource.zip">
                {{ [selectedResource.city, selectedResource.state, selectedResource.zip].filter(Boolean).join(', ') }}
              </div>
            </div>
          </div>

          <!-- Service Details -->
          <div class="mb-4">
            <div class="text-overline text-grey mb-2">Service Details</div>
            <v-list density="compact" class="bg-transparent">
              <v-list-item v-if="selectedResource.service_area">
                <template #prepend><v-icon>mdi-map-marker-radius</v-icon></template>
                <v-list-item-title>{{ selectedResource.service_area }}</v-list-item-title>
                <v-list-item-subtitle>Service Area</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="selectedResource.hours_of_operation">
                <template #prepend><v-icon>mdi-clock-outline</v-icon></template>
                <v-list-item-title>{{ selectedResource.hours_of_operation }}</v-list-item-title>
                <v-list-item-subtitle>Hours of Operation</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="selectedResource.contract_start_date || selectedResource.contract_end_date">
                <template #prepend><v-icon>mdi-file-document-outline</v-icon></template>
                <v-list-item-title>
                  {{ formatDate(selectedResource.contract_start_date) }} 
                  <span v-if="selectedResource.contract_end_date"> - {{ formatDate(selectedResource.contract_end_date) }}</span>
                </v-list-item-title>
                <v-list-item-subtitle>Contract Period</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <!-- Assigned Locations -->
          <div class="mb-4">
            <div class="text-overline text-grey mb-2">Assigned Locations</div>
            <div v-if="getResourceLocations(selectedResource.id).length > 0" class="d-flex flex-wrap gap-2">
              <v-chip 
                v-for="loc in getResourceLocations(selectedResource.id)" 
                :key="loc.id"
                variant="outlined"
              >
                <v-icon start size="16">mdi-map-marker</v-icon>
                {{ loc.name }}
                <v-chip v-if="loc.is_primary" size="x-small" color="primary" class="ml-2">Primary</v-chip>
              </v-chip>
            </div>
            <div v-else class="text-body-2 text-grey">Available for all locations</div>
          </div>

          <!-- Rating -->
          <div v-if="selectedResource.internal_rating" class="mb-4">
            <div class="text-overline text-grey mb-2">Internal Rating</div>
            <v-rating
              :model-value="selectedResource.internal_rating"
              readonly
              color="amber"
              density="compact"
            />
          </div>

          <!-- Notes -->
          <div v-if="selectedResource.notes">
            <div class="text-overline text-grey mb-2">Notes</div>
            <div class="text-body-2" style="white-space: pre-wrap;">{{ selectedResource.notes }}</div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="resourceDialog = false">Close</v-btn>
          <v-btn v-if="isAdmin" color="primary" variant="flat" @click="openEditDialog(selectedResource); resourceDialog = false">
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="800" persistent scrollable>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ isEditing ? 'Edit Resource' : 'Add New Resource' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="closeEditDialog" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text style="max-height: 70vh;">
          <v-form ref="formRef" @submit.prevent="saveResource">
            <!-- Basic Info -->
            <div class="text-overline text-grey mb-2">Basic Information</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.name"
                  label="Contact Name *"
                  variant="outlined"
                  :rules="[v => !!v || 'Name is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.company_name"
                  label="Company Name"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.resource_type"
                  :items="resourceTypes"
                  label="Service Type *"
                  variant="outlined"
                  :rules="[v => !!v || 'Service type is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-rating
                  :model-value="form.internal_rating ?? undefined"
                  @update:model-value="form.internal_rating = $event || null"
                  color="amber"
                  hover
                  clearable
                  class="mt-2"
                />
                <div class="text-caption text-grey">Internal Rating</div>
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Contact Info -->
            <div class="text-overline text-grey mb-2">Contact Information</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone"
                  label="Primary Phone"
                  variant="outlined"
                  prepend-inner-icon="mdi-phone"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.phone_alt"
                  label="Alternate Phone"
                  variant="outlined"
                  prepend-inner-icon="mdi-phone-outline"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.email"
                  label="Email"
                  variant="outlined"
                  prepend-inner-icon="mdi-email"
                  type="email"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.website"
                  label="Website"
                  variant="outlined"
                  prepend-inner-icon="mdi-web"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Emergency Contact -->
            <div class="text-overline text-grey mb-2">Emergency Contact</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="form.emergency_contact"
                  label="Provides Emergency Service"
                  color="error"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-if="form.emergency_contact"
                  v-model="form.emergency_phone"
                  label="Emergency Phone"
                  variant="outlined"
                  prepend-inner-icon="mdi-phone-alert"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Address -->
            <div class="text-overline text-grey mb-2">Address</div>
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="form.address_line1"
                  label="Address Line 1"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.address_line2"
                  label="Address Line 2"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model="form.city"
                  label="City"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="form.state"
                  label="State"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="form.zip"
                  label="ZIP Code"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Service Details -->
            <div class="text-overline text-grey mb-2">Service Details</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.service_area"
                  label="Service Area"
                  variant="outlined"
                  placeholder="e.g., North Bay, All locations"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.hours_of_operation"
                  label="Hours of Operation"
                  variant="outlined"
                  placeholder="e.g., Mon-Fri 8am-5pm"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.contract_start_date"
                  label="Contract Start Date"
                  variant="outlined"
                  type="date"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="form.contract_end_date"
                  label="Contract End Date"
                  variant="outlined"
                  type="date"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Location Assignments -->
            <div class="text-overline text-grey mb-2">Assigned Locations</div>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="form.location_ids"
                  :items="locations"
                  item-title="name"
                  item-value="id"
                  label="Locations (leave empty for all locations)"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                  clearable
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- Status & Notes -->
            <div class="text-overline text-grey mb-2">Status & Notes</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="form.is_active"
                  label="Active"
                  color="success"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="form.is_preferred"
                  label="Preferred Vendor"
                  color="primary"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="form.notes"
                  label="Notes"
                  variant="outlined"
                  rows="3"
                  placeholder="Additional notes about this vendor..."
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-btn 
            v-if="isEditing" 
            color="error" 
            variant="text" 
            @click="confirmDelete"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="closeEditDialog">Cancel</v-btn>
          <v-btn 
            color="primary" 
            variant="flat" 
            :loading="saving" 
            @click="saveResource"
          >
            {{ isEditing ? 'Save Changes' : 'Add Resource' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Delete Resource?</v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ form.name }}</strong>? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="deleteResource">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const supabase = useSupabaseClient()
const { useToast } = await import('~/composables/useToast')
const toast = useToast()

// Auth Store
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

// State
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const resources = ref<any[]>([])
const resourceLocations = ref<any[]>([])
const locations = ref<any[]>([])
const search = ref('')
const typeFilter = ref<string | null>(null)
const locationFilter = ref<string | null>(null)
const showInactive = ref(false)
const viewMode = ref('grid')

// Dialogs
const resourceDialog = ref(false)
const editDialog = ref(false)
const deleteDialog = ref(false)
const selectedResource = ref<any>(null)
const isEditing = ref(false)

// Form
const formRef = ref()
const form = ref({
  id: null as string | null,
  name: '',
  company_name: '',
  resource_type: '',
  phone: '',
  phone_alt: '',
  email: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
  service_area: '',
  hours_of_operation: '',
  emergency_contact: false,
  emergency_phone: '',
  contract_start_date: '',
  contract_end_date: '',
  is_preferred: false,
  internal_rating: null as number | null,
  notes: '',
  is_active: true,
  location_ids: [] as string[]
})

// Resource Types
const resourceTypes = [
  { value: 'plumber', title: 'Plumber' },
  { value: 'electrician', title: 'Electrician' },
  { value: 'hvac', title: 'HVAC' },
  { value: 'handyman', title: 'Handyman' },
  { value: 'landlord', title: 'Landlord' },
  { value: 'cleaning', title: 'Cleaning' },
  { value: 'landscaping', title: 'Landscaping' },
  { value: 'pest_control', title: 'Pest Control' },
  { value: 'security', title: 'Security' },
  { value: 'it_support', title: 'IT Support' },
  { value: 'appliance_repair', title: 'Appliance Repair' },
  { value: 'roofing', title: 'Roofing' },
  { value: 'painting', title: 'Painting' },
  { value: 'design', title: 'Design / Signage' },
  { value: 'cabinetry', title: 'Cabinetry' },
  { value: 'countertops', title: 'Stone / Counters' },
  { value: 'general_contractor', title: 'General Contractor' },
  { value: 'other', title: 'Other' }
]

// Table Headers
const tableHeaders = [
  { title: 'Vendor', key: 'name', sortable: true },
  { title: 'Type', key: 'resource_type', sortable: true },
  { title: 'Flags', key: 'flags', sortable: false },
  { title: 'Contact', key: 'contact', sortable: false },
  { title: 'Locations', key: 'locations', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const locationOptions = computed(() => [
  { id: null, name: 'All Locations' },
  ...locations.value
])

const filteredResources = computed(() => {
  let filtered = resources.value

  // Filter by active status
  if (!showInactive.value) {
    filtered = filtered.filter(r => r.is_active)
  }

  // Filter by search
  if (search.value) {
    const searchLower = search.value.toLowerCase()
    filtered = filtered.filter(r => 
      r.name?.toLowerCase().includes(searchLower) ||
      r.company_name?.toLowerCase().includes(searchLower) ||
      r.phone?.includes(search.value) ||
      r.email?.toLowerCase().includes(searchLower)
    )
  }

  // Filter by type
  if (typeFilter.value) {
    filtered = filtered.filter(r => r.resource_type === typeFilter.value)
  }

  // Filter by location
  if (locationFilter.value) {
    const resourceIdsForLocation = resourceLocations.value
      .filter(rl => rl.location_id === locationFilter.value)
      .map(rl => rl.resource_id)
    filtered = filtered.filter(r => resourceIdsForLocation.includes(r.id))
  }

  return filtered
})

const emergencyCount = computed(() => 
  resources.value.filter(r => r.emergency_contact && r.is_active).length
)

const preferredCount = computed(() => 
  resources.value.filter(r => r.is_preferred && r.is_active).length
)

const uniqueTypes = computed(() => 
  [...new Set(resources.value.filter(r => r.is_active).map(r => r.resource_type))]
)

// Methods
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    plumber: 'blue',
    electrician: 'amber',
    hvac: 'cyan',
    handyman: 'brown',
    landlord: 'purple',
    cleaning: 'teal',
    landscaping: 'green',
    pest_control: 'orange',
    security: 'red',
    it_support: 'indigo',
    appliance_repair: 'blue-grey',
    roofing: 'deep-orange',
    painting: 'pink',
    design: 'lime',
    cabinetry: 'amber-darken-2',
    countertops: 'blue-grey-darken-1',
    general_contractor: 'deep-purple',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    plumber: 'mdi-pipe-wrench',
    electrician: 'mdi-flash',
    hvac: 'mdi-hvac',
    handyman: 'mdi-hammer-wrench',
    landlord: 'mdi-home-city',
    cleaning: 'mdi-spray-bottle',
    landscaping: 'mdi-flower',
    pest_control: 'mdi-bug',
    security: 'mdi-shield-check',
    it_support: 'mdi-desktop-classic',
    appliance_repair: 'mdi-washing-machine',
    roofing: 'mdi-home-roof',
    painting: 'mdi-format-paint',
    design: 'mdi-palette',
    cabinetry: 'mdi-cabinet',
    countertops: 'mdi-counter',
    general_contractor: 'mdi-account-hard-hat',
    other: 'mdi-tools'
  }
  return icons[type] || 'mdi-tools'
}

function formatType(type: string) {
  return resourceTypes.find(t => t.value === type)?.title || type
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

function hasAddress(resource: any) {
  return resource.address_line1 || resource.city || resource.state || resource.zip
}

function getResourceLocations(resourceId: string) {
  const locs = resourceLocations.value.filter(rl => rl.resource_id === resourceId)
  return locs.map(rl => {
    const loc = locations.value.find(l => l.id === rl.location_id)
    return { ...loc, is_primary: rl.is_primary }
  }).filter(Boolean)
}

function openResource(resource: any) {
  selectedResource.value = resource
  resourceDialog.value = true
}

function openAddDialog() {
  isEditing.value = false
  resetForm()
  editDialog.value = true
}

function openEditDialog(resource: any) {
  isEditing.value = true
  form.value = {
    id: resource.id,
    name: resource.name || '',
    company_name: resource.company_name || '',
    resource_type: resource.resource_type || '',
    phone: resource.phone || '',
    phone_alt: resource.phone_alt || '',
    email: resource.email || '',
    website: resource.website || '',
    address_line1: resource.address_line1 || '',
    address_line2: resource.address_line2 || '',
    city: resource.city || '',
    state: resource.state || '',
    zip: resource.zip || '',
    service_area: resource.service_area || '',
    hours_of_operation: resource.hours_of_operation || '',
    emergency_contact: resource.emergency_contact || false,
    emergency_phone: resource.emergency_phone || '',
    contract_start_date: resource.contract_start_date || '',
    contract_end_date: resource.contract_end_date || '',
    is_preferred: resource.is_preferred || false,
    internal_rating: resource.internal_rating || null,
    notes: resource.notes || '',
    is_active: resource.is_active ?? true,
    location_ids: getResourceLocations(resource.id).map((l: any) => l.id)
  }
  editDialog.value = true
}

function closeEditDialog() {
  editDialog.value = false
  resetForm()
}

function resetForm() {
  form.value = {
    id: null,
    name: '',
    company_name: '',
    resource_type: '',
    phone: '',
    phone_alt: '',
    email: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    service_area: '',
    hours_of_operation: '',
    emergency_contact: false,
    emergency_phone: '',
    contract_start_date: '',
    contract_end_date: '',
    is_preferred: false,
    internal_rating: null,
    notes: '',
    is_active: true,
    location_ids: []
  }
  formRef.value?.reset()
}

async function saveResource() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  saving.value = true
  try {
    const resourceData = {
      name: form.value.name,
      company_name: form.value.company_name || null,
      resource_type: form.value.resource_type,
      phone: form.value.phone || null,
      phone_alt: form.value.phone_alt || null,
      email: form.value.email || null,
      website: form.value.website || null,
      address_line1: form.value.address_line1 || null,
      address_line2: form.value.address_line2 || null,
      city: form.value.city || null,
      state: form.value.state || null,
      zip: form.value.zip || null,
      service_area: form.value.service_area || null,
      hours_of_operation: form.value.hours_of_operation || null,
      emergency_contact: form.value.emergency_contact,
      emergency_phone: form.value.emergency_phone || null,
      contract_start_date: form.value.contract_start_date || null,
      contract_end_date: form.value.contract_end_date || null,
      is_preferred: form.value.is_preferred,
      internal_rating: form.value.internal_rating,
      notes: form.value.notes || null,
      is_active: form.value.is_active
    }

    let resourceId = form.value.id

    if (isEditing.value && resourceId) {
      // Update existing
      const { error } = await supabase
        .from('facility_resources')
        .update(resourceData)
        .eq('id', resourceId)
      
      if (error) throw error
    } else {
      // Create new
      const { data, error } = await supabase
        .from('facility_resources')
        .insert(resourceData)
        .select()
        .single()
      
      if (error) throw error
      resourceId = data.id
    }

    // Update location assignments
    if (resourceId) {
      // Delete existing
      await supabase
        .from('facility_resource_locations')
        .delete()
        .eq('resource_id', resourceId)

      // Insert new
      if (form.value.location_ids.length > 0) {
        const locationInserts = form.value.location_ids.map((locId, idx) => ({
          resource_id: resourceId,
          location_id: locId,
          is_primary: idx === 0
        }))
        
        const { error: locError } = await supabase
          .from('facility_resource_locations')
          .insert(locationInserts)
        
        if (locError) throw locError
      }
    }

    toast.success(isEditing.value ? 'Resource updated' : 'Resource added')
    closeEditDialog()
    await loadData()
  } catch (error: any) {
    console.error('Error saving resource:', error)
    toast.error(error.message || 'Failed to save resource')
  } finally {
    saving.value = false
  }
}

function confirmDelete() {
  deleteDialog.value = true
}

async function deleteResource() {
  if (!form.value.id) return

  deleting.value = true
  try {
    const { error } = await supabase
      .from('facility_resources')
      .delete()
      .eq('id', form.value.id)

    if (error) throw error

    toast.success('Resource deleted')
    deleteDialog.value = false
    closeEditDialog()
    await loadData()
  } catch (error: any) {
    console.error('Error deleting resource:', error)
    toast.error(error.message || 'Failed to delete resource')
  } finally {
    deleting.value = false
  }
}

function callResource(resource: any) {
  if (resource.phone) {
    window.open(`tel:${resource.phone}`, '_self')
  }
}

function emailResource(resource: any) {
  if (resource.email) {
    window.open(`mailto:${resource.email}`, '_self')
  }
}

function visitWebsite(resource: any) {
  if (resource.website) {
    let url = resource.website
    if (!url.startsWith('http')) {
      url = 'https://' + url
    }
    window.open(url, '_blank')
  }
}

async function loadData() {
  loading.value = true
  try {
    const [resourcesRes, locationsRes, resourceLocsRes] = await Promise.all([
      supabase.from('facility_resources').select('*').order('name'),
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
      supabase.from('facility_resource_locations').select('*')
    ])

    if (resourcesRes.error) throw resourcesRes.error
    if (locationsRes.error) throw locationsRes.error
    if (resourceLocsRes.error) throw resourceLocsRes.error

    resources.value = resourcesRes.data || []
    locations.value = locationsRes.data || []
    resourceLocations.value = resourceLocsRes.data || []
  } catch (error: any) {
    console.error('Error loading data:', error)
    toast.error('Failed to load facility resources')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.resource-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.inactive-card {
  opacity: 0.6;
}
</style>
