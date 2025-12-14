<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Marketing Events</h1>
        <p class="text-body-1 text-grey-darken-1">
          Plan and manage your marketing events
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        Create Event
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Events</p>
            <p class="text-h4 font-weight-bold">{{ events.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Upcoming</p>
            <p class="text-h4 font-weight-bold">{{ upcomingCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Confirmed</p>
            <p class="text-h4 font-weight-bold">{{ confirmedCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="secondary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Leads</p>
            <p class="text-h4 font-weight-bold">{{ totalLeads }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Event List -->
    <v-card rounded="lg">
      <v-data-table
        :headers="headers"
        :items="sortedEvents"
        :loading="loading"
        hover
        @click:row="(_, { item }) => openDrawer(item)"
      >
        <template #item.event_date="{ item }">
          <div class="d-flex align-center">
            <v-chip
              v-if="isToday(item.event_date)"
              color="success"
              size="small"
              label
              class="mr-2"
            >
              Today
            </v-chip>
            <v-chip
              v-else-if="isUpcoming(item.event_date)"
              color="warning"
              size="small"
              label
              class="mr-2"
            >
              Upcoming
            </v-chip>
            <span>{{ formatDate(item.event_date) }}</span>
          </div>
        </template>

        <template #item.name="{ item }">
          <span class="font-weight-bold">{{ item.name }}</span>
        </template>

        <template #item.event_type="{ item }">
          <v-chip size="small" variant="tonal" :color="getEventTypeColor(item.event_type)">
            {{ formatEventType(item.event_type) }}
          </v-chip>
        </template>

        <template #item.location="{ item }">
          <div class="d-flex align-center">
            <v-icon size="16" color="grey" class="mr-1">mdi-map-marker</v-icon>
            {{ item.location || 'TBD' }}
          </div>
        </template>

        <template #item.staffing_status="{ item }">
          <v-chip
            :color="item.staffing_status === 'confirmed' ? 'success' : 'warning'"
            size="small"
            label
          >
            {{ item.staffing_status === 'confirmed' ? 'Ready' : 'Planning' }}
          </v-chip>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" label>
            {{ formatStatus(item.status) }}
          </v-chip>
        </template>

        <template #item.leads="{ item }">
          <v-chip color="secondary" size="small" variant="tonal">
            {{ getLeadCount(item.id) }} leads
          </v-chip>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-calendar-star</v-icon>
            <h3 class="text-h6 mt-4">No events yet</h3>
            <p class="text-grey mb-4">Create your first marketing event</p>
            <v-btn color="primary" @click="openCreateDialog">Create Event</v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Event Details Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      width="450"
      temporary
    >
      <template v-if="selectedEvent">
        <v-toolbar color="primary">
          <v-btn icon="mdi-close" variant="text" @click="drawer = false" />
          <v-toolbar-title>Event Details</v-toolbar-title>
          <v-spacer />
          <v-btn icon="mdi-pencil" variant="text" @click="openEditDialog" />
        </v-toolbar>

        <div class="pa-4">
          <div class="d-flex align-center gap-2 mb-2">
            <v-chip size="small" variant="tonal" :color="getEventTypeColor(selectedEvent.event_type || 'general')">
              {{ formatEventType(selectedEvent.event_type || 'general') }}
            </v-chip>
            <v-chip size="small" :color="getStatusColor(selectedEvent.status)">
              {{ formatStatus(selectedEvent.status) }}
            </v-chip>
          </div>
          <h2 class="text-h5 font-weight-bold mb-2">{{ selectedEvent.name }}</h2>
          <p class="text-body-2 text-grey mb-4">{{ selectedEvent.description }}</p>

          <v-list density="compact" class="bg-transparent">
            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-calendar</v-icon>
              </template>
              <v-list-item-title>{{ formatDate(selectedEvent.event_date) }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedEvent.start_time || 'TBD' }} - {{ selectedEvent.end_time || 'TBD' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.location || 'Location TBD' }}</v-list-item-title>
            </v-list-item>

            <v-list-item v-if="selectedEvent.contact_name">
              <template #prepend>
                <v-icon color="primary">mdi-account</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.contact_name }}</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.contact_phone || selectedEvent.contact_email }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-account-group</v-icon>
              </template>
              <v-list-item-title>Staffing Needs</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.staffing_needs || 'Not specified' }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.supplies_needed">
              <template #prepend>
                <v-icon color="primary">mdi-package-variant</v-icon>
              </template>
              <v-list-item-title>Supplies</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.supplies_needed }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.expected_attendance">
              <template #prepend>
                <v-icon color="primary">mdi-account-multiple</v-icon>
              </template>
              <v-list-item-title>Expected Attendance</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.expected_attendance }} people</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.budget">
              <template #prepend>
                <v-icon color="primary">mdi-currency-usd</v-icon>
              </template>
              <v-list-item-title>Budget</v-list-item-title>
              <v-list-item-subtitle>${{ selectedEvent.budget.toLocaleString() }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.notes">
              <template #prepend>
                <v-icon color="primary">mdi-note-text</v-icon>
              </template>
              <v-list-item-title>Notes</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEvent.notes }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <!-- Lead Capture QR Code Section -->
          <div class="mb-4 pa-4 bg-grey-lighten-4 rounded-lg">
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <p class="text-overline text-grey mb-0">Lead Capture Form</p>
                <p class="text-body-2 font-weight-medium">Share this QR code at your event</p>
              </div>
              <v-btn 
                icon="mdi-content-copy" 
                size="small" 
                variant="text"
                @click="copyLeadCaptureUrl"
              />
            </div>
            
            <!-- QR Code Display -->
            <div class="d-flex justify-center mb-3">
              <div class="bg-white pa-3 rounded-lg" style="width: fit-content;">
                <img 
                  :src="getQrCodeUrl(selectedEvent.id)" 
                  :alt="`QR code for ${selectedEvent.name}`"
                  width="150"
                  height="150"
                  class="d-block"
                />
              </div>
            </div>
            
            <!-- Lead Capture URL -->
            <div class="text-center">
              <v-text-field
                :model-value="getLeadCaptureUrl(selectedEvent.id)"
                readonly
                variant="outlined"
                density="compact"
                hide-details
                class="mb-2"
              >
                <template #append-inner>
                  <v-btn 
                    icon="mdi-open-in-new" 
                    size="x-small" 
                    variant="text"
                    :href="getLeadCaptureUrl(selectedEvent.id)"
                    target="_blank"
                  />
                </template>
              </v-text-field>
              <p class="text-caption text-grey">Visitors can scan or visit this link to submit their info</p>
            </div>
          </div>

          <v-divider class="my-4" />

          <!-- Lead Counter -->
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <p class="text-overline text-grey mb-0">Leads Generated</p>
              <p class="text-h4 font-weight-bold">{{ getLeadCount(selectedEvent.id) }}</p>
            </div>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openAddLeadDialog">
              Add Lead
            </v-btn>
          </div>

          <!-- Recent Leads from this Event -->
          <v-list v-if="getEventLeads(selectedEvent.id).length > 0" density="compact">
            <v-list-subheader>Recent Leads</v-list-subheader>
            <v-list-item
              v-for="lead in getEventLeads(selectedEvent.id).slice(0, 5)"
              :key="lead.id"
            >
              <v-list-item-title>{{ lead.lead_name }}</v-list-item-title>
              <v-list-item-subtitle>{{ lead.email || lead.phone }}</v-list-item-subtitle>
              <template #append>
                <v-chip :color="getLeadStatusColor(lead.status)" size="x-small">
                  {{ lead.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Create/Edit Event Dialog -->
    <v-dialog v-model="eventDialog" max-width="800" scrollable>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-calendar-star</v-icon>
          {{ editMode ? 'Edit Event' : 'Create Event' }}
        </v-card-title>
        <v-card-text class="pt-6" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="eventForm" v-model="formValid">
            <!-- Basic Info Section -->
            <p class="text-overline text-grey mb-2">BASIC INFORMATION</p>
            <v-row>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="eventFormData.name"
                  label="Event Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="eventFormData.event_type"
                  :items="eventTypes"
                  item-title="title"
                  item-value="value"
                  label="Event Type"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="eventFormData.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
            </v-row>

            <!-- Date & Time Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">DATE & LOCATION</p>
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.event_date"
                  label="Event Date *"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="4">
                <v-text-field
                  v-model="eventFormData.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="4">
                <v-text-field
                  v-model="eventFormData.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="eventFormData.location"
                  label="Location / Address"
                  prepend-inner-icon="mdi-map-marker"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Venue Contact Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">VENUE / ORGANIZER CONTACT</p>
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_name"
                  label="Contact Name"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_phone"
                  label="Contact Phone"
                  prepend-inner-icon="mdi-phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_email"
                  label="Contact Email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Staffing & Logistics Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">STAFFING & LOGISTICS</p>
            <v-row>
              <v-col cols="12" sm="6">
                <v-textarea
                  v-model="eventFormData.staffing_needs"
                  label="Staffing Needs"
                  placeholder="e.g., 2 technicians, 1 receptionist"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-textarea
                  v-model="eventFormData.supplies_needed"
                  label="Supplies & Materials"
                  placeholder="e.g., Brochures, banners, giveaways, dental models"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="eventFormData.budget"
                  label="Budget ($)"
                  type="number"
                  prepend-inner-icon="mdi-currency-usd"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="eventFormData.expected_attendance"
                  label="Expected Attendance"
                  type="number"
                  prepend-inner-icon="mdi-account-group"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-select
                  v-model="eventFormData.staffing_status"
                  :items="[{ title: 'Planning', value: 'planned' }, { title: 'Confirmed', value: 'confirmed' }]"
                  item-title="title"
                  item-value="value"
                  label="Staffing Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-select
                  v-model="eventFormData.status"
                  :items="[{ title: 'Planned', value: 'planned' }, { title: 'Confirmed', value: 'confirmed' }, { title: 'Cancelled', value: 'cancelled' }, { title: 'Completed', value: 'completed' }]"
                  item-title="title"
                  item-value="value"
                  label="Event Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Registration Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">REGISTRATION</p>
            <v-row>
              <v-col cols="12" sm="4" class="d-flex align-center">
                <v-switch
                  v-model="eventFormData.registration_required"
                  label="Registration Required"
                  color="primary"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="eventFormData.registration_link"
                  label="Registration URL"
                  placeholder="https://..."
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  density="compact"
                  :disabled="!eventFormData.registration_required"
                />
              </v-col>
            </v-row>

            <!-- Notes Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">NOTES & INSTRUCTIONS</p>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="eventFormData.notes"
                  label="Planning Notes / Special Instructions"
                  placeholder="Any special instructions, setup requirements, or important details..."
                  variant="outlined"
                  density="compact"
                  rows="3"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="eventDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="saveEvent">
            {{ editMode ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Lead Dialog -->
    <v-dialog v-model="leadDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-secondary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Add Lead
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="leadForm" v-model="leadFormValid">
            <v-text-field
              v-model="leadFormData.lead_name"
              label="Name *"
              :rules="[v => !!v || 'Required']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.email"
              label="Email"
              type="email"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.phone"
              label="Phone"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="leadFormData.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="leadDialog = false">Cancel</v-btn>
          <v-btn color="secondary" :loading="savingLead" :disabled="!leadFormValid" @click="saveLead">
            Add Lead
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

interface MarketingEvent {
  id: string
  name: string
  description: string | null
  event_type: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  staffing_needs: string | null
  supplies_needed: string | null
  budget: number | null
  expected_attendance: number | null
  staffing_status: string
  status: string
  registration_required: boolean
  registration_link: string | null
  notes: string | null
  post_event_notes: string | null
  actual_attendance: number | null
  leads_collected: number
}

interface Lead {
  id: string
  event_id: string | null
  lead_name: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
}

const client = useSupabaseClient()

// State
const events = ref<MarketingEvent[]>([])
const leads = ref<Lead[]>([])
const loading = ref(true)
const saving = ref(false)
const savingLead = ref(false)
const drawer = ref(false)
const selectedEvent = ref<MarketingEvent | null>(null)
const eventDialog = ref(false)
const leadDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)
const leadFormValid = ref(false)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Event types for dropdown
const eventTypes = [
  { title: 'General', value: 'general' },
  { title: 'CE Event', value: 'ce_event' },
  { title: 'Street Fair', value: 'street_fair' },
  { title: 'Open House', value: 'open_house' },
  { title: 'Adoption Event', value: 'adoption_event' },
  { title: 'Community Outreach', value: 'community_outreach' },
  { title: 'Health Fair', value: 'health_fair' },
  { title: 'School Visit', value: 'school_visit' },
  { title: 'Pet Expo', value: 'pet_expo' },
  { title: 'Fundraiser', value: 'fundraiser' },
  { title: 'Other', value: 'other' }
]

const eventFormData = reactive({
  name: '',
  description: '',
  event_type: 'general',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  staffing_needs: '',
  supplies_needed: '',
  budget: null as number | null,
  expected_attendance: null as number | null,
  staffing_status: 'planned',
  status: 'planned',
  registration_required: false,
  registration_link: '',
  notes: ''
})

const leadFormData = reactive({
  lead_name: '',
  email: '',
  phone: '',
  notes: ''
})

const headers = [
  { title: 'Date', key: 'event_date', sortable: true },
  { title: 'Event Name', key: 'name', sortable: true },
  { title: 'Type', key: 'event_type', sortable: true },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Staffing', key: 'staffing_status', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Leads', key: 'leads', sortable: false }
]

// Computed
const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )
})

const upcomingCount = computed(() =>
  events.value.filter(e => isUpcoming(e.event_date) && e.status !== 'completed').length
)

const confirmedCount = computed(() =>
  events.value.filter(e => e.staffing_status === 'confirmed').length
)

const totalLeads = computed(() => leads.value.length)

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

const isUpcoming = (dateStr: string) => {
  const eventDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventDate >= today
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1)

const formatEventType = (type: string) => {
  const labels: Record<string, string> = {
    general: 'General',
    ce_event: 'CE Event',
    street_fair: 'Street Fair',
    open_house: 'Open House',
    adoption_event: 'Adoption',
    community_outreach: 'Outreach',
    health_fair: 'Health Fair',
    school_visit: 'School Visit',
    pet_expo: 'Pet Expo',
    fundraiser: 'Fundraiser',
    other: 'Other'
  }
  return labels[type] || type
}

const getEventTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    general: 'grey',
    ce_event: 'purple',
    street_fair: 'orange',
    open_house: 'blue',
    adoption_event: 'pink',
    community_outreach: 'teal',
    health_fair: 'green',
    school_visit: 'cyan',
    pet_expo: 'amber',
    fundraiser: 'red',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    cancelled: 'error',
    completed: 'grey'
  }
  return colors[status] || 'grey'
}

const getLeadStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    contacted: 'warning',
    converted: 'success',
    lost: 'grey'
  }
  return colors[status] || 'grey'
}

const getLeadCount = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId).length

const getEventLeads = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId)

// QR Code and Lead Capture URL helpers
const getLeadCaptureUrl = (eventId: string) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/public/lead-capture/${eventId}`
}

const getQrCodeUrl = (eventId: string) => {
  const url = encodeURIComponent(getLeadCaptureUrl(eventId))
  // Using Google Charts API for QR code generation (free, no dependencies)
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${url}`
}

const copyLeadCaptureUrl = async () => {
  if (!selectedEvent.value) return
  const url = getLeadCaptureUrl(selectedEvent.value.id)
  try {
    await navigator.clipboard.writeText(url)
    showNotification('Lead capture URL copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
    showNotification('Failed to copy URL', 'error')
  }
}

const openDrawer = (event: MarketingEvent) => {
  selectedEvent.value = event
  drawer.value = true
}

const openCreateDialog = () => {
  editMode.value = false
  Object.assign(eventFormData, {
    name: '',
    description: '',
    event_type: 'general',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    staffing_needs: '',
    supplies_needed: '',
    budget: null,
    expected_attendance: null,
    staffing_status: 'planned',
    status: 'planned',
    registration_required: false,
    registration_link: '',
    notes: ''
  })
  eventDialog.value = true
}

const openEditDialog = () => {
  if (!selectedEvent.value) return
  editMode.value = true
  Object.assign(eventFormData, {
    name: selectedEvent.value.name,
    description: selectedEvent.value.description || '',
    event_type: selectedEvent.value.event_type || 'general',
    event_date: selectedEvent.value.event_date,
    start_time: selectedEvent.value.start_time || '',
    end_time: selectedEvent.value.end_time || '',
    location: selectedEvent.value.location || '',
    contact_name: selectedEvent.value.contact_name || '',
    contact_phone: selectedEvent.value.contact_phone || '',
    contact_email: selectedEvent.value.contact_email || '',
    staffing_needs: selectedEvent.value.staffing_needs || '',
    supplies_needed: selectedEvent.value.supplies_needed || '',
    budget: selectedEvent.value.budget,
    expected_attendance: selectedEvent.value.expected_attendance,
    staffing_status: selectedEvent.value.staffing_status,
    status: selectedEvent.value.status,
    registration_required: selectedEvent.value.registration_required || false,
    registration_link: selectedEvent.value.registration_link || '',
    notes: selectedEvent.value.notes || ''
  })
  eventDialog.value = true
}

const openAddLeadDialog = () => {
  Object.assign(leadFormData, {
    lead_name: '',
    email: '',
    phone: '',
    notes: ''
  })
  leadDialog.value = true
}

const saveEvent = async () => {
  saving.value = true
  try {
    const eventPayload = {
      name: eventFormData.name,
      description: eventFormData.description || null,
      event_type: eventFormData.event_type,
      event_date: eventFormData.event_date,
      start_time: eventFormData.start_time || null,
      end_time: eventFormData.end_time || null,
      location: eventFormData.location || null,
      contact_name: eventFormData.contact_name || null,
      contact_phone: eventFormData.contact_phone || null,
      contact_email: eventFormData.contact_email || null,
      staffing_needs: eventFormData.staffing_needs || null,
      supplies_needed: eventFormData.supplies_needed || null,
      budget: eventFormData.budget,
      expected_attendance: eventFormData.expected_attendance,
      staffing_status: eventFormData.staffing_status,
      status: eventFormData.status,
      registration_required: eventFormData.registration_required,
      registration_link: eventFormData.registration_link || null,
      notes: eventFormData.notes || null
    }

    if (editMode.value && selectedEvent.value) {
      const { error } = await client
        .from('marketing_events')
        .update(eventPayload)
        .eq('id', selectedEvent.value.id)

      if (error) throw error
      showNotification('Event updated successfully')
    } else {
      const { error } = await client
        .from('marketing_events')
        .insert(eventPayload)

      if (error) throw error
      showNotification('Event created successfully')
    }

    eventDialog.value = false
    drawer.value = false
    await fetchData()
  } catch (error) {
    console.error('Error saving event:', error)
    showNotification('Failed to save event', 'error')
  } finally {
    saving.value = false
  }
}

const saveLead = async () => {
  if (!selectedEvent.value) return

  savingLead.value = true
  try {
    const { error } = await client
      .from('marketing_leads')
      .insert({
        event_id: selectedEvent.value.id,
        lead_name: leadFormData.lead_name,
        email: leadFormData.email || null,
        phone: leadFormData.phone || null,
        source: selectedEvent.value.name,
        notes: leadFormData.notes || null,
        status: 'new'
      })

    if (error) throw error

    leadDialog.value = false
    showNotification('Lead added successfully')
    await fetchData()
  } catch (error) {
    console.error('Error adding lead:', error)
    showNotification('Failed to add lead', 'error')
  } finally {
    savingLead.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [eventsRes, leadsRes] = await Promise.all([
      client.from('marketing_events').select('*').order('event_date'),
      client.from('marketing_leads').select('*')
    ])

    events.value = eventsRes.data || []
    leads.value = leadsRes.data || []
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
