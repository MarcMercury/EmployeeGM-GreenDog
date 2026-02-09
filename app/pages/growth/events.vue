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
      <v-btn color="primary" prepend-icon="mdi-plus" @click="eventFormRef?.openCreate()">
        Create Event
      </v-btn>
    </div>

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
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
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
        :headers="headers"
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
            <v-btn color="primary" @click="eventFormRef?.openCreate()">Create Event</v-btn>
          </div>
        </template>
      </v-data-table-virtual>
    </v-card>

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

// Component refs
const eventProfileRef = ref<{ open: (event: MarketingEvent) => void } | null>(null)
const eventFormRef = ref<{ openCreate: () => void; openEdit: (event: MarketingEvent) => void } | null>(null)

// State
const events = ref<MarketingEvent[]>([])
const leads = ref<Lead[]>([])
const loading = ref(true)

// Filters
const searchQuery = ref('')
const filterType = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterYear = ref<string | null>(null)
const filterTimeframe = ref('all')

// Filter options
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

const statusOptions = [
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

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

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

const sortedEvents = computed(() => filteredEvents.value)

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

const getStatusColor = (status: string) => {
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

// Bridge function for profile dialog edit emit
const openEditEvent = (event: MarketingEvent) => {
  eventFormRef.value?.openEdit(event)
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
  // Handle action query param from marketing pages
  const route = useRoute()
  if (route.query.action === 'add') {
    nextTick(() => {
      eventFormRef.value?.openCreate()
    })
  }
})
</script>
