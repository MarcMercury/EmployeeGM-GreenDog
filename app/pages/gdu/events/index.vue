<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const supabase = useSupabaseClient()

// Types
interface CEEvent {
  id: string
  title: string
  description: string | null
  event_date_start: string
  event_date_end: string | null
  location_name: string | null
  format: string
  status: string
  ce_hours_offered: number
  speaker_name: string | null
  race_provider_status: string
  race_course_number: string | null
  max_attendees: number | null
  current_attendees: number
  created_at: string
  task_stats?: {
    total: number
    completed: number
  }
}

// Filter state
const searchQuery = ref('')
const selectedStatus = ref<string | null>(null)
const showUpcomingOnly = ref(true)

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Draft', value: 'draft' },
  { title: 'Pending Approval', value: 'pending_approval' },
  { title: 'Approved', value: 'approved' },
  { title: 'In Progress', value: 'in_progress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

// Fetch events with task stats
const { data: events, pending, refresh } = await useAsyncData('ce-events', async () => {
  const { data: eventsData, error } = await supabase
    .from('ce_events')
    .select('*')
    .order('event_date_start', { ascending: true })
  
  if (error) throw error
  
  // Get task stats for each event
  const eventsWithStats = await Promise.all((eventsData || []).map(async (event) => {
    const { data: tasks } = await supabase
      .from('ce_event_tasks')
      .select('status')
      .eq('ce_event_id', event.id)
    
    return {
      ...event,
      task_stats: {
        total: tasks?.length || 0,
        completed: tasks?.filter(t => t.status === 'completed').length || 0
      }
    } as CEEvent
  }))
  
  return eventsWithStats
})

// Filtered events
const filteredEvents = computed(() => {
  let result = events.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      e.title.toLowerCase().includes(query) ||
      e.speaker_name?.toLowerCase().includes(query) ||
      e.location_name?.toLowerCase().includes(query)
    )
  }
  
  if (selectedStatus.value) {
    result = result.filter(e => e.status === selectedStatus.value)
  }
  
  if (showUpcomingOnly.value) {
    const today = new Date().toISOString().split('T')[0]
    result = result.filter(e => e.event_date_start >= today)
  }
  
  return result
})

// Stats
const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const allEvents = events.value || []
  
  return {
    total: allEvents.length,
    upcoming: allEvents.filter(e => e.event_date_start >= today).length,
    draft: allEvents.filter(e => e.status === 'draft').length,
    approved: allEvents.filter(e => e.status === 'approved').length,
    totalCEHours: allEvents.reduce((sum, e) => sum + (e.ce_hours_offered || 0), 0)
  }
})

async function deleteEvent(id: string) {
  if (!confirm('Are you sure you want to delete this event? This will also delete all associated tasks.')) return
  
  await supabase
    .from('ce_events')
    .delete()
    .eq('id', id)
  
  refresh()
}

async function duplicateEvent(event: CEEvent) {
  const { data, error } = await supabase
    .from('ce_events')
    .insert({
      title: `${event.title} (Copy)`,
      description: event.description,
      event_date_start: event.event_date_start,
      event_date_end: event.event_date_end,
      location_name: event.location_name,
      format: event.format,
      status: 'draft',
      ce_hours_offered: event.ce_hours_offered,
      speaker_name: event.speaker_name,
      race_provider_status: 'not_submitted',
      max_attendees: event.max_attendees
    })
    .select()
    .single()
  
  if (!error && data) {
    navigateTo(`/gdu/events/${data.id}`)
  }
  
  refresh()
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    pending_approval: 'warning',
    approved: 'success',
    in_progress: 'info',
    completed: 'primary',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getFormatIcon(format: string): string {
  const icons: Record<string, string> = {
    live: 'mdi-account-group',
    webinar: 'mdi-video',
    hybrid: 'mdi-monitor-account',
    recorded: 'mdi-video-vintage'
  }
  return icons[format] || 'mdi-calendar'
}

function getRaceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    not_submitted: 'grey',
    pending: 'warning',
    approved: 'success',
    denied: 'error',
    not_required: 'info'
  }
  return colors[status] || 'grey'
}

function getTaskProgress(event: CEEvent): number {
  if (!event.task_stats?.total) return 0
  return Math.round((event.task_stats.completed / event.task_stats.total) * 100)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" to="/gdu" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">CE Events</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage Continuing Education events and checklists
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        to="/gdu/events/new"
      >
        New CE Event
      </v-btn>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" sm="6" md="2">
        <UiStatTile :value="stats.total" label="Total Events" color="primary" />
      </v-col>
      <v-col cols="6" sm="6" md="2">
        <UiStatTile :value="stats.upcoming" label="Upcoming" color="success" />
      </v-col>
      <v-col cols="6" sm="6" md="2">
        <UiStatTile :value="stats.draft" label="Drafts" color="warning" />
      </v-col>
      <v-col cols="6" sm="6" md="2">
        <UiStatTile :value="stats.approved" label="Approved" color="info" />
      </v-col>
      <v-col cols="12" sm="12" md="4">
        <UiStatTile 
          :value="stats.totalCEHours" 
          label="Total CE Hours Offered" 
          color="primary" 
          variant="outlined"
        />
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="searchQuery"
              label="Search events..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-switch
              v-model="showUpcomingOnly"
              label="Upcoming Only"
              color="success"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-chip color="primary" variant="tonal">
              {{ filteredEvents.length }} Events
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Events List -->
    <v-row>
      <v-col
        v-for="event in filteredEvents"
        :key="event.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="h-100"
          :to="`/gdu/events/${event.id}`"
          hover
        >
          <v-card-title class="d-flex align-center">
            <v-icon :color="getStatusColor(event.status)" class="mr-2">
              {{ getFormatIcon(event.format) }}
            </v-icon>
            <span class="text-truncate flex-grow-1">{{ event.title }}</span>
          </v-card-title>
          
          <v-card-subtitle>
            <v-icon size="small" class="mr-1">mdi-calendar</v-icon>
            {{ new Date(event.event_date_start).toLocaleDateString() }}
            <span v-if="event.event_date_end && event.event_date_end !== event.event_date_start">
              - {{ new Date(event.event_date_end).toLocaleDateString() }}
            </span>
          </v-card-subtitle>
          
          <v-card-text>
            <!-- Event Info -->
            <div class="d-flex flex-wrap gap-2 mb-3">
              <v-chip size="small" :color="getStatusColor(event.status)" variant="flat">
                {{ event.status.replace('_', ' ') }}
              </v-chip>
              <v-chip size="small" variant="tonal">
                {{ event.ce_hours_offered }} CE hrs
              </v-chip>
              <v-chip size="small" variant="outlined">
                {{ event.format }}
              </v-chip>
            </div>
            
            <!-- Speaker -->
            <div v-if="event.speaker_name" class="text-body-2 mb-2">
              <v-icon size="small" class="mr-1">mdi-account-tie</v-icon>
              {{ event.speaker_name }}
            </div>
            
            <!-- Location -->
            <div v-if="event.location_name" class="text-body-2 mb-2">
              <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
              {{ event.location_name }}
            </div>
            
            <!-- RACE Status -->
            <div class="d-flex align-center mb-3">
              <v-chip
                size="x-small"
                :color="getRaceStatusColor(event.race_provider_status)"
                variant="tonal"
              >
                RACE: {{ event.race_provider_status.replace('_', ' ') }}
              </v-chip>
              <span v-if="event.race_course_number" class="text-caption ml-2">
                #{{ event.race_course_number }}
              </span>
            </div>
            
            <!-- Task Progress -->
            <div v-if="event.task_stats?.total">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span>Checklist Progress</span>
                <span>{{ event.task_stats.completed }}/{{ event.task_stats.total }}</span>
              </div>
              <v-progress-linear
                :model-value="getTaskProgress(event)"
                :color="getTaskProgress(event) === 100 ? 'success' : 'primary'"
                height="8"
                rounded
              />
            </div>
            
            <!-- Attendees -->
            <div v-if="event.max_attendees" class="text-caption mt-2">
              <v-icon size="small">mdi-account-group</v-icon>
              {{ event.current_attendees || 0 }}/{{ event.max_attendees }} attendees
            </div>
          </v-card-text>
          
          <v-card-actions>
            <v-btn
              variant="text"
              size="small"
              :to="`/gdu/events/${event.id}`"
            >
              View Details
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              variant="text"
              size="small"
              @click.prevent="duplicateEvent(event)"
              title="Duplicate Event"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              @click.prevent="deleteEvent(event.id)"
              title="Delete Event"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-if="filteredEvents.length === 0 && !pending" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-calendar-blank</v-icon>
      <div class="text-h6 mt-4">No CE events found</div>
      <div class="text-body-2 text-medium-emphasis">
        {{ searchQuery || selectedStatus ? 'Try adjusting your filters' : 'Create your first CE event to get started' }}
      </div>
      <v-btn
        v-if="!searchQuery && !selectedStatus"
        color="primary"
        class="mt-4"
        to="/gdu/events/new"
      >
        Create CE Event
      </v-btn>
    </v-card>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <div class="text-body-1 mt-4">Loading events...</div>
    </div>
  </div>
</template>
