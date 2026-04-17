<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-2">
      <h1 class="text-h4 font-weight-bold">Events</h1>
      <div class="d-flex gap-2">
        <template v-if="activeTab === 'leads'">
          <v-btn variant="outlined" prepend-icon="mdi-download" size="small" @click="exportCSV">
            Export CSV
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddLeadDialog">
            Add Lead
          </v-btn>
        </template>
        <template v-else>
          <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="eventFormRef?.openCreate()">
            Create Event
          </v-btn>
        </template>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" density="compact" class="mb-2">
      <v-tab value="events">Events</v-tab>
      <v-tab value="map">
        <v-icon start size="18">mdi-map</v-icon>
        Map View
      </v-tab>
      <v-tab value="leads">Event Leads</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- ============ EVENTS TAB ============ -->
      <v-window-item value="events">
        <!-- Stats -->
        <UiStatsRow
          :stats="[
            { value: filteredEvents.length, label: 'Filtered', color: 'primary' },
            { value: upcomingCount, label: 'Upcoming', color: 'warning' },
            { value: confirmedCount, label: 'Confirmed', color: 'success' },
            { value: totalLeads, label: 'Total Leads', color: 'secondary' }
          ]"
          layout="4-col"
        />

        <!-- Filters -->
        <v-card class="mb-2" variant="outlined">
          <v-card-text class="py-2">
            <v-row align="center" dense>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="searchQuery"
                  placeholder="Search events..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterType"
                  :items="eventTypeOptions"
                  label="Type"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterStatus"
                  :items="eventStatusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterYear"
                  :items="yearOptions"
                  label="Year"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-btn-toggle v-model="filterTimeframe" density="compact" variant="outlined">
                  <v-btn value="all" size="small">All</v-btn>
                  <v-btn value="upcoming" size="small" color="warning">Upcoming</v-btn>
                  <v-btn value="past" size="small" color="grey">Past</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Event List -->
        <v-card rounded="lg">
          <v-data-table-virtual
            :headers="eventHeaders"
            :items="filteredEvents"
            :loading="loading"
            hover
            height="calc(100vh - 340px)"
            @click:row="(_, { item }) => eventProfileRef?.open(item)"
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
              <v-chip :color="getEventStatusColor(item.status)" size="small" label>
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
                <v-btn color="primary" @click="eventFormRef?.openCreate()">Create Event</v-btn>
              </div>
            </template>
          </v-data-table-virtual>
        </v-card>
      </v-window-item>

      <!-- ============ MAP TAB ============ -->
      <v-window-item value="map">
        <GrowthEventsMapView
          :events="filteredEvents"
          :loading="loading"
          @event-click="eventProfileRef?.open($event)"
        />
      </v-window-item>

      <!-- ============ LEADS TAB ============ -->
      <v-window-item value="leads">
        <!-- Stats Row -->
        <UiStatsRow
          :stats="[
            { value: leads.length, label: 'Total Leads', color: 'primary' },
            { value: leadStatusCounts.new, label: 'New', color: 'success' },
            { value: leadStatusCounts.contacted, label: 'Contacted', color: 'warning' },
            { value: leadStatusCounts.converted, label: 'Converted', color: 'teal' },
            { value: leadStatusCounts.qualified || 0, label: 'Qualified', color: 'info' },
            { value: leadStatusCounts.lost || 0, label: 'Lost', color: 'secondary' }
          ]"
          layout="6-col"
        />

        <!-- Filters -->
        <v-card class="mb-2" rounded="lg" variant="outlined">
          <v-card-text class="py-2">
            <v-row dense align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="leadSearch"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Search leads..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="leadEventFilter"
                  :items="leadEventOptions"
                  label="Source"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="leadStatusFilter"
                  :items="leadStatusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex justify-end">
                <v-btn-toggle v-model="leadQuickFilter" density="compact" variant="outlined">
                  <v-btn value="all" size="small">All</v-btn>
                  <v-btn value="new" size="small" color="info">New</v-btn>
                  <v-btn value="contacted" size="small" color="warning">Contacted</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Leads Table -->
        <v-card variant="outlined">
          <v-data-table-virtual
            :headers="leadHeaders"
            :items="filteredLeads"
            :search="leadSearch"
            :loading="loading"
            hover
            height="calc(100vh - 340px)"
          >
            <template #item.lead_name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar color="primary" size="36" class="mr-3">
                  <span class="text-white font-weight-bold text-caption">
                    {{ getInitials(item.lead_name) }}
                  </span>
                </v-avatar>
                <span class="font-weight-medium">{{ item.lead_name }}</span>
              </div>
            </template>

            <template #item.event_source="{ item }">
              <v-chip
                v-if="item.source_event?.name"
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-calendar-star"
              >
                {{ item.source_event.name }}
              </v-chip>
              <span v-else class="text-grey text-caption">Direct</span>
            </template>

            <template #item.prize="{ item }">
              <div v-if="item.prize_item?.name" class="d-flex align-center">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="amber-darken-2"
                  prepend-icon="mdi-gift"
                >
                  {{ item.prize_item.name }}
                </v-chip>
                <v-tooltip activator="parent" location="top">
                  <div>Location: {{ formatLocation(item.prize_location) }}</div>
                  <div v-if="item.prize_quantity && item.prize_quantity > 1">Qty: {{ item.prize_quantity }}</div>
                </v-tooltip>
              </div>
              <span v-else class="text-grey text-caption">-</span>
            </template>

            <template #item.source="{ item }">
              <v-chip v-if="item.source" size="small" variant="tonal" color="secondary">
                {{ item.source }}
              </v-chip>
              <span v-else class="text-grey">-</span>
            </template>

            <template #item.contact="{ item }">
              <div class="d-flex align-center gap-2">
                <v-btn
                  v-if="item.email"
                  icon
                  size="x-small"
                  variant="text"
                  color="primary"
                  :href="`mailto:${item.email}`"
                >
                  <v-icon size="16">mdi-email</v-icon>
                  <v-tooltip activator="parent" location="top">{{ item.email }}</v-tooltip>
                </v-btn>
                <v-btn
                  v-if="item.phone"
                  icon
                  size="x-small"
                  variant="text"
                  color="success"
                  :href="`tel:${item.phone}`"
                >
                  <v-icon size="16">mdi-phone</v-icon>
                  <v-tooltip activator="parent" location="top">{{ item.phone }}</v-tooltip>
                </v-btn>
                <span v-if="!item.email && !item.phone" class="text-grey">No contact info</span>
              </div>
            </template>

            <template #item.lead_status="{ item }">
              <v-select
                :model-value="item.status"
                :items="leadStatusOptions"
                density="compact"
                variant="plain"
                hide-details
                style="max-width: 130px"
                @update:model-value="updateLeadStatus(item, $event)"
              >
                <template #selection="{ item: statusItem }">
                  <v-chip :color="getLeadStatusColor(statusItem.value)" size="small" label>
                    {{ statusItem.title }}
                  </v-chip>
                </template>
              </v-select>
            </template>

            <template #item.created_at="{ item }">
              <span class="text-caption text-grey">{{ formatLeadDate(item.created_at) }}</span>
            </template>

            <template #item.actions="{ item }">
              <v-btn icon size="small" variant="text" color="primary" @click="openEditLeadDialog(item)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" @click="confirmDeleteLead(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>

            <template #no-data>
              <UiEmptyState
                v-if="leadSearch || leadEventFilter || leadStatusFilter"
                type="search"
                title="No matches found"
                description="Try adjusting your search or filters"
                actionLabel="Clear filters"
                @action="leadSearch = ''; leadEventFilter = null; leadStatusFilter = null"
                class="py-8"
              />
              <UiEmptyState
                v-else
                type="candidates"
                title="No leads yet"
                description="Start growing your pipeline by adding your first lead"
                actionLabel="Add Lead"
                @action="openAddLeadDialog"
                class="py-8"
              />
            </template>
          </v-data-table-virtual>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Event Profile Dialog -->
    <GrowthEventProfileDialog
      ref="eventProfileRef"
      @edit="openEditEvent"
      @partner-updated="fetchData"
      @notify="showNotification($event.message, $event.color)"
    />

    <!-- Event Create/Edit Dialog -->
    <GrowthEventFormDialog
      ref="eventFormRef"
      @saved="fetchData"
      @notify="showNotification($event.message, $event.color)"
    />

    <!-- Add/Edit Lead Dialog -->
    <v-dialog v-model="leadDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          {{ leadEditMode ? 'Edit Lead' : 'Add Lead' }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form v-model="leadFormValid">
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
            <v-select
              v-model="leadFormData.event_id"
              :items="eventsList"
              item-title="name"
              item-value="id"
              label="Event Source"
              variant="outlined"
              density="compact"
              clearable
              class="mb-3"
            />
            <v-select
              v-model="leadFormData.status"
              :items="leadStatusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="leadFormData.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="leadDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="leadSaving" :disabled="!leadFormValid" @click="saveLead">
            {{ leadEditMode ? 'Update' : 'Add Lead' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="leadDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-error text-white py-4">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pt-6">
          Are you sure you want to delete <strong>{{ leadToDelete?.lead_name }}</strong>?
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="leadDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="leadDeleting" @click="deleteLead">Delete</v-btn>
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
import type { MarketingEvent, Lead } from '~/types/marketing.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const client = useSupabaseClient()
const route = useRoute()

// ==================== SHARED STATE ====================
const activeTab = ref(route.query.tab === 'leads' ? 'leads' : 'events')
const loading = ref(true)
const leads = ref<Lead[]>([])

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// ==================== EVENTS TAB ====================
const marketingEventsStore = useMarketingEventsStore()
const events = computed(() => marketingEventsStore.events)

const eventProfileRef = ref<{ open: (event: MarketingEvent) => void } | null>(null)
const eventFormRef = ref<{ openCreate: () => void; openEdit: (event: MarketingEvent) => void } | null>(null)

// Event filters
const searchQuery = ref('')
const filterType = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterYear = ref<string | null>(null)
const filterTimeframe = ref('all')

const eventTypeOptions = [
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

const eventStatusOptions = [
  { title: 'Planned', value: 'planned' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

const yearOptions = computed(() => {
  const years = new Set<string>()
  events.value.forEach(e => {
    if (e.event_date) {
      years.add(new Date(e.event_date).getFullYear().toString())
    }
  })
  return Array.from(years).sort().reverse().map(y => ({ title: y, value: y }))
})

const eventHeaders = [
  { title: 'Date', key: 'event_date', sortable: true },
  { title: 'Event Name', key: 'name', sortable: true },
  { title: 'Type', key: 'event_type', sortable: true },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Staffing', key: 'staffing_status', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Leads', key: 'leads', sortable: false }
]

const filteredEvents = computed(() => {
  let result = [...events.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    )
  }

  if (filterType.value) {
    result = result.filter(e => e.event_type === filterType.value)
  }

  if (filterStatus.value) {
    result = result.filter(e => e.status === filterStatus.value)
  }

  if (filterYear.value) {
    result = result.filter(e => {
      if (!e.event_date) return false
      return new Date(e.event_date).getFullYear().toString() === filterYear.value
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (filterTimeframe.value === 'upcoming') {
    result = result.filter(e => new Date(e.event_date) >= today)
  } else if (filterTimeframe.value === 'past') {
    result = result.filter(e => new Date(e.event_date) < today)
  }

  return result.sort((a, b) =>
    new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  )
})

const upcomingCount = computed(() =>
  events.value.filter(e => isUpcoming(e.event_date) && e.status !== 'completed').length
)

const confirmedCount = computed(() =>
  events.value.filter(e => e.staffing_status === 'confirmed').length
)

const totalLeads = computed(() => leads.value.length)

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
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = String(date.getFullYear()).slice(-2)
  return `${weekday}, ${month} ${day} '${year}`
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

const getEventStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    cancelled: 'error',
    completed: 'grey'
  }
  return colors[status] || 'grey'
}

const getLeadCount = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId).length

const openEditEvent = (event: MarketingEvent) => {
  eventFormRef.value?.openEdit(event)
}

// ==================== LEADS TAB ====================
const eventsList = ref<MarketingEvent[]>([])
const leadSaving = ref(false)
const leadDeleting = ref(false)
const leadSearch = ref('')
const leadEventFilter = ref<string | null>(null)
const leadStatusFilter = ref<string | null>(null)
const leadQuickFilter = ref('all')
const leadDialog = ref(false)
const leadDeleteDialog = ref(false)
const leadEditMode = ref(false)
const leadFormValid = ref(false)
const editingLead = ref<Lead | null>(null)
const leadToDelete = ref<Lead | null>(null)

const leadFormData = reactive({
  lead_name: '',
  email: '',
  phone: '',
  event_id: null as string | null,
  status: 'new',
  notes: ''
})

const leadStatusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Contacted', value: 'contacted' },
  { title: 'Qualified', value: 'qualified' },
  { title: 'Converted', value: 'converted' },
  { title: 'Lost', value: 'lost' }
]

const leadHeaders = [
  { title: 'Name', key: 'lead_name', sortable: true },
  { title: 'Event Source', key: 'event_source', sortable: true },
  { title: 'Prize Won', key: 'prize', sortable: true },
  { title: 'Source', key: 'source', sortable: true },
  { title: 'Contact', key: 'contact', sortable: false },
  { title: 'Status', key: 'lead_status', sortable: true },
  { title: 'Added', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

const leadEventOptions = computed(() => [
  ...eventsList.value.map(e => ({ title: e.name, value: e.name })),
  { title: 'Website', value: 'Website' },
  { title: 'Referral', value: 'Referral' },
  { title: 'Walk-in', value: 'Walk-in' },
  { title: 'Social Media', value: 'Social Media' }
])

const leadStatusCounts = computed(() => {
  const counts = { new: 0, contacted: 0, converted: 0, qualified: 0, lost: 0 }
  leads.value.forEach(l => {
    if (counts[l.status as keyof typeof counts] !== undefined) {
      counts[l.status as keyof typeof counts]++
    }
  })
  return counts
})

const filteredLeads = computed(() => {
  let result = leads.value

  if (leadQuickFilter.value !== 'all') {
    result = result.filter(l => l.status === leadQuickFilter.value)
  }

  if (leadEventFilter.value) {
    result = result.filter(l => l.source === leadEventFilter.value)
  }

  if (leadStatusFilter.value) {
    result = result.filter(l => l.status === leadStatusFilter.value)
  }

  return result
})

const getInitials = (name: string) => {
  const parts = name.split(' ')
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const formatLocation = (location: string | null) => {
  if (!location) return 'N/A'
  const locationMap: Record<string, string> = {
    'venice': 'Venice',
    'sherman_oaks': 'Sherman Oaks',
    'valley': 'Valley',
    'mpmv': 'MPMV',
    'offsite': 'Offsite'
  }
  return locationMap[location] || location
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

const formatLeadDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const openAddLeadDialog = () => {
  leadEditMode.value = false
  editingLead.value = null
  Object.assign(leadFormData, {
    lead_name: '',
    email: '',
    phone: '',
    event_id: null,
    status: 'new',
    notes: ''
  })
  leadDialog.value = true
}

const openEditLeadDialog = (lead: Lead) => {
  leadEditMode.value = true
  editingLead.value = lead
  Object.assign(leadFormData, {
    lead_name: lead.lead_name,
    email: lead.email || '',
    phone: lead.phone || '',
    event_id: lead.event_id,
    status: lead.status,
    notes: lead.notes || ''
  })
  leadDialog.value = true
}

const saveLead = async () => {
  leadSaving.value = true
  try {
    let source = leadFormData.event_id
      ? eventsList.value.find(e => e.id === leadFormData.event_id)?.name
      : null

    if (leadEditMode.value && editingLead.value) {
      const { error } = await client
        .from('marketing_leads')
        .update({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })
        .eq('id', editingLead.value.id)

      if (error) throw error
      showNotification('Lead updated successfully')
    } else {
      const { error } = await client
        .from('marketing_leads')
        .insert({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })

      if (error) throw error
      showNotification('Lead added successfully')
    }

    leadDialog.value = false
    await fetchData()
  } catch (error) {
    console.error('Error saving lead:', error)
    showNotification('Failed to save lead', 'error')
  } finally {
    leadSaving.value = false
  }
}

const updateLeadStatus = async (lead: Lead, status: string) => {
  try {
    await client
      .from('marketing_leads')
      .update({ status })
      .eq('id', lead.id)

    lead.status = status
    showNotification('Status updated')
  } catch (error) {
    console.error('Error updating status:', error)
    showNotification('Failed to update status', 'error')
  }
}

const confirmDeleteLead = (lead: Lead) => {
  leadToDelete.value = lead
  leadDeleteDialog.value = true
}

const deleteLead = async () => {
  if (!leadToDelete.value) return

  leadDeleting.value = true
  try {
    await client
      .from('marketing_leads')
      .delete()
      .eq('id', leadToDelete.value.id)

    leadDeleteDialog.value = false
    showNotification('Lead deleted')
    await fetchData()
  } catch (error) {
    console.error('Error deleting lead:', error)
    showNotification('Failed to delete lead', 'error')
  } finally {
    leadDeleting.value = false
  }
}

const exportCSV = () => {
  const data = filteredLeads.value
  if (data.length === 0) {
    showNotification('No leads to export', 'warning')
    return
  }

  const csvHeaders = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Notes', 'Created']
  const rows = data.map(lead => [
    lead.lead_name,
    lead.email || '',
    lead.phone || '',
    lead.source || '',
    lead.status,
    (lead.notes || '').replace(/"/g, '""'),
    formatLeadDate(lead.created_at)
  ])

  const csvContent = [
    csvHeaders.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)

  showNotification(`Exported ${data.length} leads to CSV`)
}

// ==================== DATA FETCHING ====================
const fetchData = async () => {
  loading.value = true
  try {
    const [, leadsRes, eventsListRes] = await Promise.all([
      marketingEventsStore.refresh(),
      client.from('marketing_leads').select(`
        *,
        source_event:source_event_id(id, name)
      `).order('created_at', { ascending: false }),
      client.from('marketing_events').select('id, name').order('name')
    ])

    leads.value = leadsRes.data || []
    eventsList.value = eventsListRes.data || []
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  if (route.query.action === 'add') {
    nextTick(() => {
      eventFormRef.value?.openCreate()
    })
  }
})
</script>
