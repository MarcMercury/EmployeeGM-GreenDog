<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const route = useRoute()
const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()
const eventId = route.params.id as string

// Tabs
const tab = ref('overview')

// Fetch event data
const { data: event, refresh: refreshEvent, error: eventError } = await useAsyncData(`ce-event-${eventId}`, async () => {
  const { data, error } = await supabase
    .from('ce_events')
    .select('*')
    .eq('id', eventId)
    .single()
  
  if (error) throw error
  return data
})

// Fetch checklist tasks
const { data: tasks, refresh: refreshTasks } = await useAsyncData(`ce-tasks-${eventId}`, async () => {
  const { data, error } = await supabase
    .from('ce_event_tasks')
    .select('*')
    .eq('ce_event_id', eventId)
    .order('category')
    .order('sort_order')
  
  if (error) throw error
  return data || []
})

// Fetch attendees
const { data: attendees, refresh: refreshAttendees } = await useAsyncData(`ce-attendees-${eventId}`, async () => {
  const { data, error } = await supabase
    .from('ce_event_attendees')
    .select('*, education_visitors(*)')
    .eq('ce_event_id', eventId)
  
  if (error) throw error
  return data || []
})

// Task categories
const taskCategories = computed(() => {
  if (!tasks.value) return []
  const cats = [...new Set(tasks.value.map(t => t.category))]
  return cats.sort()
})

// Task stats
const taskStats = computed(() => {
  if (!tasks.value) return { total: 0, completed: 0, inProgress: 0, notStarted: 0 }
  return {
    total: tasks.value.length,
    completed: tasks.value.filter(t => t.status === 'completed').length,
    inProgress: tasks.value.filter(t => t.status === 'in_progress').length,
    notStarted: tasks.value.filter(t => t.status === 'not_started').length
  }
})

const completionPercent = computed(() => {
  if (taskStats.value.total === 0) return 0
  return Math.round((taskStats.value.completed / taskStats.value.total) * 100)
})

// Task filtering
const filterCategory = ref<string | null>(null)
const filterStatus = ref<string | null>(null)

const filteredTasks = computed(() => {
  if (!tasks.value) return []
  return tasks.value.filter(t => {
    if (filterCategory.value && t.category !== filterCategory.value) return false
    if (filterStatus.value && t.status !== filterStatus.value) return false
    return true
  })
})

const groupedTasks = computed(() => {
  const grouped: Record<string, typeof tasks.value> = {}
  for (const task of filteredTasks.value) {
    if (!grouped[task.category]) grouped[task.category] = []
    grouped[task.category]!.push(task)
  }
  return grouped
})

// Status options
const statusOptions = [
  { title: 'Not Started', value: 'not_started' },
  { title: 'In Progress', value: 'in_progress' },
  { title: 'Completed', value: 'completed' },
  { title: 'Skipped', value: 'skipped' }
]

const eventStatusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Planned', value: 'planned' },
  { title: 'Scheduled', value: 'scheduled' },
  { title: 'Active', value: 'active' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

// Category display helpers
const categoryIcons: Record<string, string> = {
  'pre_event_admin': 'mdi-file-document-edit',
  'av_tech_setup': 'mdi-projector',
  'attendee_materials': 'mdi-package-variant',
  'lab_setup': 'mdi-flask',
  'food_beverage': 'mdi-food',
  'event_day_operations': 'mdi-calendar-check',
  'post_event': 'mdi-archive',
  'marketing_followup': 'mdi-bullhorn'
}

const categoryLabels: Record<string, string> = {
  'pre_event_admin': 'Pre-Event Administration',
  'av_tech_setup': 'A/V & Tech Setup',
  'attendee_materials': 'Attendee Materials',
  'lab_setup': 'Lab Setup',
  'food_beverage': 'Food & Beverage',
  'event_day_operations': 'Event Day Operations',
  'post_event': 'Post-Event',
  'marketing_followup': 'Marketing & Follow-up'
}

// Update task status
async function updateTaskStatus(task: any, newStatus: string) {
  const { error } = await supabase
    .from('ce_event_tasks')
    .update({ 
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', task.id)
  
  if (!error) {
    await refreshTasks()
  }
}

// Quick toggle task complete
async function toggleTaskComplete(task: any) {
  const newStatus = task.status === 'completed' ? 'not_started' : 'completed'
  await updateTaskStatus(task, newStatus)
}

// Update task notes
async function updateTaskNotes(task: any) {
  const { error } = await supabase
    .from('ce_event_tasks')
    .update({ notes: task.notes })
    .eq('id', task.id)
}

// Update event status
async function updateEventStatus(newStatus: string) {
  const { error } = await supabase
    .from('ce_events')
    .update({ status: newStatus })
    .eq('id', eventId)
  
  if (!error) {
    await refreshEvent()
  }
}

// Edit mode
const editing = ref(false)
const editForm = ref<any>({})

function startEdit() {
  editForm.value = { ...event.value }
  editing.value = true
}

async function saveEdit() {
  const { error } = await supabase
    .from('ce_events')
    .update({
      title: editForm.value.title,
      description: editForm.value.description,
      event_date_start: editForm.value.event_date_start,
      event_date_end: editForm.value.event_date_end,
      location_name: editForm.value.location_name,
      location_address: editForm.value.location_address,
      format: editForm.value.format,
      ce_hours_offered: editForm.value.ce_hours_offered,
      speaker_name: editForm.value.speaker_name,
      speaker_credentials: editForm.value.speaker_credentials,
      max_attendees: editForm.value.max_attendees,
      registration_fee: editForm.value.registration_fee,
      registration_url: editForm.value.registration_url
    })
    .eq('id', eventId)
  
  if (error) {
    console.error('Failed to save event:', error)
    showError('Failed to save changes. Please try again.')
  } else {
    showSuccess('Event updated successfully')
    editing.value = false
    await refreshEvent()
  }
}

// Attendee management
const addAttendeeDialog = ref(false)
const attendeeTab = ref('existing')
const newAttendee = ref({
  visitor_id: null as string | null,
  name: '',
  email: '',
  license_number: '',
  state: ''
})

// Fetch available visitors for attendee dropdown
const { data: visitors } = await useAsyncData('ce-visitors', async () => {
  const { data } = await supabase
    .from('education_visitors')
    .select('id, first_name, last_name, email')
    .order('last_name')
  return data || []
})

async function addAttendee() {
  const payload: any = {
    ce_event_id: eventId,
    checked_in: false,
    certificate_issued: false
  }
  
  if (newAttendee.value.visitor_id) {
    payload.visitor_id = newAttendee.value.visitor_id
  } else {
    payload.first_name = newAttendee.value.name?.split(' ')[0] || ''
    payload.last_name = newAttendee.value.name?.split(' ').slice(1).join(' ') || ''
    payload.email = newAttendee.value.email
    payload.license_number = newAttendee.value.license_number || null
  }
  
  const { error } = await supabase
    .from('ce_event_attendees')
    .insert(payload)
  
  if (!error) {
    addAttendeeDialog.value = false
    newAttendee.value = { visitor_id: null, name: '', email: '', license_number: '', state: '' }
    await refreshAttendees()
  }
}

async function toggleAttendance(attendee: any) {
  const newCheckedIn = !attendee.checked_in
  const { error } = await supabase
    .from('ce_event_attendees')
    .update({ 
      checked_in: newCheckedIn,
      check_in_time: newCheckedIn ? new Date().toISOString() : null
    })
    .eq('id', attendee.id)
  
  if (!error) await refreshAttendees()
}

async function toggleCertificate(attendee: any) {
  const { error } = await supabase
    .from('ce_event_attendees')
    .update({ 
      certificate_issued: !attendee.certificate_issued,
      certificate_issued_at: !attendee.certificate_issued ? new Date().toISOString() : null
    })
    .eq('id', attendee.id)
  
  if (!error) await refreshAttendees()
}

async function removeAttendee(attendee: any) {
  if (!confirm('Remove this attendee?')) return
  
  const { error } = await supabase
    .from('ce_event_attendees')
    .delete()
    .eq('id', attendee.id)
  
  if (!error) await refreshAttendees()
}

// Format date
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Status colors
function statusColor(status: string) {
  const colors: Record<string, string> = {
    'draft': 'grey',
    'planned': 'blue',
    'scheduled': 'purple',
    'active': 'orange',
    'completed': 'success',
    'cancelled': 'error'
  }
  return colors[status] || 'grey'
}

function taskStatusColor(status: string) {
  const colors: Record<string, string> = {
    'not_started': 'grey',
    'in_progress': 'warning',
    'completed': 'success',
    'skipped': 'info'
  }
  return colors[status] || 'grey'
}

// Expanded categories for accordion
const expandedCategories = ref<string[]>(taskCategories.value.slice(0, 2))
</script>

<template>
  <div>
    <div v-if="eventError">
      <v-alert type="error" class="mb-4">Failed to load event. {{ eventError.message }}</v-alert>
      <v-btn to="/gdu/events">Back to Events</v-btn>
    </div>
    <div v-else-if="!event">
      <v-alert type="error">Event not found</v-alert>
    </div>
    
    <template v-else>
      <!-- Header -->
      <div class="d-flex align-center mb-4">
        <v-btn icon variant="text" aria-label="Go back" to="/gdu/events" class="mr-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="flex-grow-1">
          <div class="d-flex align-center gap-2">
            <h1 class="text-h4 font-weight-bold">{{ event.title }}</h1>
            <v-chip :color="statusColor(event.status)" size="small">
              {{ event.status }}
            </v-chip>
          </div>
          <p class="text-subtitle-1 text-medium-emphasis">
            {{ formatDate(event.event_date_start) }}
            <span v-if="event.event_date_end && event.event_date_end !== event.event_date_start">
              - {{ formatDate(event.event_date_end) }}
            </span>
          </p>
        </div>
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="outlined" class="mr-2">
              Status: {{ event.status }}
              <v-icon end>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item 
              v-for="s in eventStatusOptions" 
              :key="s.value"
              @click="updateEventStatus(s.value)"
            >
              {{ s.title }}
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn v-if="!editing" color="primary" @click="startEdit">
          <v-icon start>mdi-pencil</v-icon> Edit
        </v-btn>
      </div>

      <!-- Progress Bar -->
      <v-card class="mb-4" variant="outlined">
        <v-card-text>
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-subtitle-2">Checklist Progress</span>
            <span class="text-subtitle-2">{{ taskStats.completed }}/{{ taskStats.total }} tasks ({{ completionPercent }}%)</span>
          </div>
          <v-progress-linear
            :model-value="completionPercent"
            height="12"
            rounded
            :color="completionPercent === 100 ? 'success' : 'primary'"
          />
          <div class="d-flex gap-4 mt-2 text-caption">
            <span><v-icon size="x-small" color="success">mdi-check-circle</v-icon> {{ taskStats.completed }} Completed</span>
            <span><v-icon size="x-small" color="warning">mdi-progress-clock</v-icon> {{ taskStats.inProgress }} In Progress</span>
            <span><v-icon size="x-small" color="grey">mdi-circle-outline</v-icon> {{ taskStats.notStarted }} Not Started</span>
          </div>
        </v-card-text>
      </v-card>

      <!-- Tabs -->
      <v-tabs v-model="tab" class="mb-4">
        <v-tab value="overview">Overview</v-tab>
        <v-tab value="checklist">
          Checklist
          <v-chip size="x-small" class="ml-2">{{ taskStats.total }}</v-chip>
        </v-tab>
        <v-tab value="attendees">
          Attendees
          <v-chip size="x-small" class="ml-2">{{ attendees?.length || 0 }}</v-chip>
        </v-tab>
      </v-tabs>

      <!-- Overview Tab -->
      <div v-if="tab === 'overview'">
        <v-row>
          <!-- Event Details Card -->
          <v-col cols="12" md="8">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon start>mdi-information</v-icon>
                Event Details
              </v-card-title>
              <v-card-text v-if="!editing">
                <v-list lines="two">
                  <v-list-item>
                    <template #prepend><v-icon>mdi-calendar</v-icon></template>
                    <v-list-item-title>Date</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatDate(event.event_date_start) }}
                      <span v-if="event.event_date_end && event.event_date_end !== event.event_date_start">
                        - {{ formatDate(event.event_date_end) }}
                      </span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item>
                    <template #prepend><v-icon>mdi-map-marker</v-icon></template>
                    <v-list-item-title>Location</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ event.location_name || 'TBD' }}
                      <span v-if="event.location_address" class="text-caption d-block">{{ event.location_address }}</span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item>
                    <template #prepend><v-icon>mdi-presentation</v-icon></template>
                    <v-list-item-title>Format</v-list-item-title>
                    <v-list-item-subtitle>
                      <v-chip size="small" variant="outlined">{{ event.format }}</v-chip>
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item>
                    <template #prepend><v-icon>mdi-school</v-icon></template>
                    <v-list-item-title>CE Hours</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ event.ce_hours_offered }} hours
                      <span v-if="event.ce_hours_lecture || event.ce_hours_lab" class="text-caption">
                        ({{ event.ce_hours_lecture || 0 }} lecture, {{ event.ce_hours_lab || 0 }} lab)
                      </span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item v-if="event.speaker_name">
                    <template #prepend><v-icon>mdi-account-tie</v-icon></template>
                    <v-list-item-title>Speaker</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ event.speaker_name }}
                      <span v-if="event.speaker_credentials" class="text-caption d-block">{{ event.speaker_credentials }}</span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item>
                    <template #prepend><v-icon>mdi-account-group</v-icon></template>
                    <v-list-item-title>Capacity</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ attendees?.length || 0 }} / {{ event.max_attendees || 'Unlimited' }} attendees
                    </v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item v-if="event.registration_fee">
                    <template #prepend><v-icon>mdi-currency-usd</v-icon></template>
                    <v-list-item-title>Registration Fee</v-list-item-title>
                    <v-list-item-subtitle>${{ event.registration_fee }}</v-list-item-subtitle>
                  </v-list-item>
                  
                  <v-list-item v-if="event.description">
                    <template #prepend><v-icon>mdi-text</v-icon></template>
                    <v-list-item-title>Description</v-list-item-title>
                    <v-list-item-subtitle class="text-wrap">{{ event.description }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
              
              <!-- Edit Form -->
              <v-card-text v-else>
                <v-row>
                  <v-col cols="12">
                    <v-text-field v-model="editForm.title" label="Title" variant="outlined" />
                  </v-col>
                  <v-col cols="12">
                    <v-textarea v-model="editForm.description" label="Description" variant="outlined" rows="2" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.event_date_start" label="Start Date" variant="outlined" type="date" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.event_date_end" label="End Date" variant="outlined" type="date" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.location_name" label="Location" variant="outlined" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.location_address" label="Address" variant="outlined" />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model.number="editForm.ce_hours_offered" label="CE Hours" variant="outlined" type="number" />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model.number="editForm.max_attendees" label="Max Attendees" variant="outlined" type="number" />
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model.number="editForm.registration_fee" label="Fee ($)" variant="outlined" type="number" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.speaker_name" label="Speaker Name" variant="outlined" />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="editForm.speaker_credentials" label="Speaker Credentials" variant="outlined" />
                  </v-col>
                </v-row>
              </v-card-text>
              
              <v-card-actions v-if="editing">
                <v-spacer />
                <v-btn variant="text" @click="editing = false">Cancel</v-btn>
                <v-btn color="primary" @click="saveEdit">Save Changes</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          
          <!-- Side Panel -->
          <v-col cols="12" md="4">
            <!-- CE Approval Status -->
            <v-card class="mb-4">
              <v-card-title class="d-flex align-center">
                <v-icon start>mdi-certificate</v-icon>
                CE Approval Status
              </v-card-title>
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-2">
                  <span>RACE Provider</span>
                  <v-chip :color="event.race_provider_status === 'approved' ? 'success' : 'grey'" size="small">
                    {{ event.race_provider_status }}
                  </v-chip>
                </div>
                <div v-if="event.race_provider_number" class="text-caption mb-2">
                  Number: {{ event.race_provider_number }}
                </div>
                <div class="d-flex align-center justify-space-between">
                  <span>CA VMB</span>
                  <v-chip :color="event.vmb_approval_status === 'approved' ? 'success' : 'grey'" size="small">
                    {{ event.vmb_approval_status }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
            
            <!-- Learning Objectives -->
            <v-card v-if="event.learning_objectives?.length" class="mb-4">
              <v-card-title class="d-flex align-center">
                <v-icon start>mdi-target</v-icon>
                Learning Objectives
              </v-card-title>
              <v-card-text>
                <ul class="ml-4">
                  <li v-for="(obj, i) in event.learning_objectives" :key="i" class="mb-1">
                    {{ obj }}
                  </li>
                </ul>
              </v-card-text>
            </v-card>
            
            <!-- Quick Actions -->
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon start>mdi-lightning-bolt</v-icon>
                Quick Actions
              </v-card-title>
              <v-card-text>
                <v-btn block variant="outlined" class="mb-2" @click="tab = 'checklist'">
                  <v-icon start>mdi-clipboard-list</v-icon>
                  View Checklist
                </v-btn>
                <v-btn block variant="outlined" class="mb-2" @click="tab = 'attendees'">
                  <v-icon start>mdi-account-plus</v-icon>
                  Manage Attendees
                </v-btn>
                <v-btn 
                  v-if="event.registration_url" 
                  block 
                  variant="outlined"
                  :href="event.registration_url"
                  target="_blank"
                >
                  <v-icon start>mdi-open-in-new</v-icon>
                  Registration Page
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Checklist Tab -->
      <div v-if="tab === 'checklist'">
        <!-- Filters -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-select
                  v-model="filterCategory"
                  :items="[{ title: 'All Categories', value: null }, ...taskCategories.map(c => ({ title: categoryLabels[c] || c, value: c }))]"
                  label="Filter by Category"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="filterStatus"
                  :items="[{ title: 'All Statuses', value: null }, ...statusOptions]"
                  label="Filter by Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="4" class="text-right">
                <span class="text-body-2">
                  Showing {{ filteredTasks.length }} of {{ tasks?.length || 0 }} tasks
                </span>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Tasks grouped by category -->
        <v-expansion-panels v-model="expandedCategories" multiple>
          <v-expansion-panel
            v-for="category in Object.keys(groupedTasks)"
            :key="category"
            :value="category"
          >
            <v-expansion-panel-title>
              <div class="d-flex align-center gap-2 flex-grow-1">
                <v-icon>{{ categoryIcons[category] || 'mdi-checkbox-marked' }}</v-icon>
                <span class="font-weight-medium">{{ categoryLabels[category] || category }}</span>
                <v-spacer />
                <v-chip size="x-small" color="success" class="mr-2">
                  {{ groupedTasks[category]?.filter(t => t.status === 'completed').length }}/{{ groupedTasks[category]?.length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list lines="two" class="py-0">
                <v-list-item
                  v-for="task in groupedTasks[category]"
                  :key="task.id"
                  class="px-0"
                >
                  <template #prepend>
                    <v-checkbox
                      :model-value="task.status === 'completed'"
                      hide-details
                      color="success"
                      @update:model-value="toggleTaskComplete(task)"
                    />
                  </template>
                  
                  <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': task.status === 'completed' }">
                    {{ task.title }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="task.description">
                    {{ task.description }}
                  </v-list-item-subtitle>
                  
                  <template #append>
                    <div class="d-flex align-center gap-2">
                      <v-select
                        :model-value="task.status"
                        :items="statusOptions"
                        variant="outlined"
                        density="compact"
                        hide-details
                        style="width: 130px;"
                        @update:model-value="updateTaskStatus(task, $event)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Attendees Tab -->
      <div v-if="tab === 'attendees'">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-account-group</v-icon>
            Registered Attendees
            <v-spacer />
            <v-btn color="primary" @click="addAttendeeDialog = true">
              <v-icon start>mdi-plus</v-icon>
              Add Attendee
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table v-if="attendees?.length">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>License #</th>
                  <th>Attended</th>
                  <th>Certificate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="att in attendees" :key="att.id">
                  <td>
                    {{ att.education_visitors ? `${att.education_visitors.first_name} ${att.education_visitors.last_name}` : `${att.first_name || ''} ${att.last_name || ''}`.trim() }}
                  </td>
                  <td>{{ att.education_visitors?.email || att.email }}</td>
                  <td>{{ att.license_number || '-' }}</td>
                  <td>
                    <v-checkbox
                      :model-value="att.checked_in"
                      hide-details
                      color="success"
                      @update:model-value="toggleAttendance(att)"
                    />
                  </td>
                  <td>
                    <v-checkbox
                      :model-value="att.certificate_issued"
                      hide-details
                      color="success"
                      :disabled="!att.checked_in"
                      @update:model-value="toggleCertificate(att)"
                    />
                  </td>
                  <td>
                    <v-btn icon variant="text" size="small" color="error" aria-label="Delete" @click="removeAttendee(att)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            
            <v-alert v-else type="info" variant="tonal">
              No attendees registered yet. Click "Add Attendee" to start adding registrations.
            </v-alert>
          </v-card-text>
        </v-card>
      </div>

      <!-- Add Attendee Dialog -->
      <v-dialog v-model="addAttendeeDialog" max-width="500">
        <v-card>
          <v-card-title>Add Attendee</v-card-title>
          <v-card-text>
            <v-tabs v-model="attendeeTab" class="mb-4">
              <v-tab value="existing">Select from Visitors</v-tab>
              <v-tab value="new">New Attendee</v-tab>
            </v-tabs>
            
            <div v-if="attendeeTab === 'existing' && visitors?.length">
              <v-autocomplete
                v-model="newAttendee.visitor_id"
                :items="visitors?.map(v => ({ title: `${v.first_name} ${v.last_name} (${v.email})`, value: v.id })) || []"
                label="Select Visitor"
                variant="outlined"
                clearable
              />
            </div>
            
            <div v-if="attendeeTab === 'new'">
              <v-text-field
                v-model="newAttendee.name"
                label="Full Name"
                variant="outlined"
                class="mb-3"
              />
              <v-text-field
                v-model="newAttendee.email"
                label="Email"
                variant="outlined"
                type="email"
                class="mb-3"
              />
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="newAttendee.license_number"
                    label="License Number"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="newAttendee.state"
                    label="State"
                    variant="outlined"
                    placeholder="CA"
                  />
                </v-col>
              </v-row>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="addAttendeeDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="addAttendee">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </div>
</template>
