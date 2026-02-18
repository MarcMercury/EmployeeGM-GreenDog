<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const supabase = useSupabaseClient()
const route = useRoute()
const { showSuccess, showError } = useToast()

// Export dialog
const showExportDialog = ref(false)
const showUploadWizard = ref(false)
const exportColumns = [
  { key: 'first_name', title: 'First Name' },
  { key: 'last_name', title: 'Last Name' },
  { key: 'email', title: 'Email' },
  { key: 'phone', title: 'Phone' },
  { key: 'visitor_type', title: 'Visitor Type' },
  { key: 'organization_name', title: 'Organization' },
  { key: 'school_of_origin', title: 'School' },
  { key: 'program_name', title: 'Program' },
  { key: 'visit_start_date', title: 'Visit Start' },
  { key: 'visit_end_date', title: 'Visit End' },
  { key: 'location', title: 'Location' },
  { key: 'visit_status', title: 'Status' },
  { key: 'coordinator', title: 'Coordinator' },
  { key: 'mentor', title: 'Mentor' },
  { key: 'lead_source', title: 'Lead Source' },
  { key: 'notes', title: 'Notes' }
]

// Loading states
const saving = ref(false)
const deleting = ref<string | null>(null)

import type { Visitor } from '~/types/gdu.types'

// Filter state
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedLocation = ref<string | null>(null)
const showActiveOnly = ref(false)
const quickFilter = ref('all')

const typeOptions = [
  { title: 'All Types', value: null },
  { title: 'Intern', value: 'intern' },
  { title: 'Extern', value: 'extern' },
  { title: 'Student', value: 'student' },
  { title: 'CE Attendee', value: 'ce_attendee' },
  { title: 'Shadow', value: 'shadow' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Upcoming', value: 'upcoming' },
  { title: 'Currently Here', value: 'current' },
  { title: 'Done', value: 'done' },
  { title: 'No Show', value: 'no_show' }
]

const locationOptions = [
  { title: 'All Locations', value: null },
  { title: 'Venice', value: 'Venice' },
  { title: 'The Valley', value: 'The Valley' },
  { title: 'Sherman Oaks', value: 'Sherman Oaks' },
  { title: 'Aetna', value: 'Aetna' },
  { title: 'MPMV (Mobile)', value: 'MPMV' },
  { title: 'Off-Site', value: 'Off-Site' }
]

const leadSourceOptions = [
  'Website',
  'Referral',
  'University Partner',
  'CE Event',
  'Social Media',
  'Job Board',
  'Walk-in',
  'Other'
]

// Fetch visitors
const { data: visitors, pending, refresh } = await useAsyncData('visitors', async () => {
  const { data, error } = await supabase
    .from('education_visitors')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Visitor[]
})

// Filtered visitors
const filteredVisitors = computed(() => {
  let result = visitors.value || []
  
  // Apply quick filter
  if (quickFilter.value === 'active') {
    result = result.filter(v => v.is_active)
  } else if (quickFilter.value === 'upcoming') {
    result = result.filter(v => v.visit_status === 'upcoming')
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.first_name.toLowerCase().includes(query) ||
      v.last_name.toLowerCase().includes(query) ||
      v.email?.toLowerCase().includes(query) ||
      v.organization_name?.toLowerCase().includes(query) ||
      v.school_of_origin?.toLowerCase().includes(query) ||
      v.coordinator?.toLowerCase().includes(query) ||
      v.mentor?.toLowerCase().includes(query) ||
      v.program_name?.toLowerCase().includes(query)
    )
  }
  
  if (selectedType.value) {
    result = result.filter(v => v.visitor_type === selectedType.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(v => v.visit_status === selectedStatus.value)
  }
  
  if (selectedLocation.value) {
    result = result.filter(v => v.location === selectedLocation.value)
  }
  
  return result
})

// Stats
const stats = computed(() => ({
  total: visitors.value?.length || 0,
  active: visitors.value?.filter(v => v.is_active).length || 0,
  upcoming: visitors.value?.filter(v => v.visit_status === 'upcoming').length || 0,
  current: visitors.value?.filter(v => v.visit_status === 'current').length || 0,
  byType: typeOptions.slice(1).map(t => ({
    type: t.title,
    count: visitors.value?.filter(v => v.visitor_type === t.value).length || 0
  }))
}))

// Dialog state
const dialogOpen = ref(false)
const editingVisitor = ref<Visitor | null>(null)
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  visitor_type: 'student',
  organization_name: '',
  school_of_origin: '',
  program_name: '',
  visit_start_date: '',
  visit_end_date: '',
  lead_source: '',
  referral_name: '',
  notes: '',
  is_active: true,
  // New fields
  coordinator: '',
  first_greeter: '',
  mentor: '',
  location: '',
  visit_status: 'upcoming',
  recruitment_announced: false,
  recruitment_channel: '',
  reason_for_visit: ''
})

// State for copy to clipboard success dialog
const showCopySuccess = ref(false)
const lastSavedVisitor = ref<any>(null)

// Slack integration
const slackChannels = ref<Array<{ id: string; name: string; displayName: string }>>([])
const selectedSlackChannel = ref('')
const postingToSlack = ref(false)
const slackChannelsLoading = ref(false)

// Fetch Slack channels on mount
onMounted(async () => {
  if (route.query.action === 'add') {
    openAddDialog()
  }
  if (route.query.edit) {
    const visitor = visitors.value?.find(v => v.id === route.query.edit)
    if (visitor) openEditDialog(visitor)
  }
  
  // Load Slack channels
  try {
    slackChannelsLoading.value = true
    const response = await $fetch<{ ok: boolean; channels: any[] }>('/api/slack/channels')
    if (response.ok) {
      slackChannels.value = response.channels
      // Default to a visitor-related channel if it exists
      const defaultChannel = response.channels.find(
        (c: any) => c.name.includes('visitor') || c.name.includes('gdu') || c.name.includes('announcement')
      )
      if (defaultChannel) {
        selectedSlackChannel.value = defaultChannel.id
      }
    }
  } catch (error) {
    console.error('Failed to load Slack channels:', error)
  } finally {
    slackChannelsLoading.value = false
  }
})

function openAddDialog() {
  editingVisitor.value = null
  formData.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    visitor_type: 'student',
    organization_name: '',
    school_of_origin: '',
    program_name: '',
    visit_start_date: '',
    visit_end_date: '',
    lead_source: '',
    referral_name: '',
    notes: '',
    is_active: true,
    coordinator: '',
    first_greeter: '',
    mentor: '',
    location: '',
    visit_status: 'upcoming',
    recruitment_announced: false,
    recruitment_channel: '',
    reason_for_visit: ''
  }
  dialogOpen.value = true
}

function openEditDialog(visitor: Visitor) {
  editingVisitor.value = visitor
  formData.value = {
    first_name: visitor.first_name,
    last_name: visitor.last_name,
    email: visitor.email || '',
    phone: visitor.phone || '',
    visitor_type: visitor.visitor_type,
    organization_name: visitor.organization_name || '',
    school_of_origin: visitor.school_of_origin || '',
    program_name: visitor.program_name || '',
    visit_start_date: visitor.visit_start_date || '',
    visit_end_date: visitor.visit_end_date || '',
    lead_source: visitor.lead_source || '',
    referral_name: visitor.referral_name || '',
    notes: visitor.notes || '',
    is_active: visitor.is_active,
    coordinator: visitor.coordinator || '',
    first_greeter: visitor.first_greeter || '',
    mentor: visitor.mentor || '',
    location: visitor.location || '',
    visit_status: visitor.visit_status || 'upcoming',
    recruitment_announced: visitor.recruitment_announced || false,
    recruitment_channel: visitor.recruitment_channel || '',
    reason_for_visit: visitor.reason_for_visit || ''
  }
  dialogOpen.value = true
}

async function saveVisitor() {
  if (!formData.value.first_name || !formData.value.last_name) {
    showError('First and last name are required')
    return
  }
  
  saving.value = true
  
  try {
    const payload = {
      first_name: formData.value.first_name,
      last_name: formData.value.last_name,
      email: formData.value.email || null,
      phone: formData.value.phone || null,
      visitor_type: formData.value.visitor_type,
      organization_name: formData.value.organization_name || null,
      school_of_origin: formData.value.school_of_origin || null,
      program_name: formData.value.program_name || null,
      visit_start_date: formData.value.visit_start_date || null,
      visit_end_date: formData.value.visit_end_date || null,
    lead_source: formData.value.lead_source || null,
    referral_name: formData.value.referral_name || null,
    notes: formData.value.notes || null,
    is_active: formData.value.is_active,
    coordinator: formData.value.coordinator || null,
    first_greeter: formData.value.first_greeter || null,
    mentor: formData.value.mentor || null,
    location: formData.value.location || null,
    visit_status: formData.value.visit_status || 'upcoming',
    recruitment_announced: formData.value.recruitment_announced,
    recruitment_channel: formData.value.recruitment_channel || null,
    reason_for_visit: formData.value.reason_for_visit || null
  }
  
    if (editingVisitor.value) {
      const { error } = await supabase
        .from('education_visitors')
        .update(payload)
        .eq('id', editingVisitor.value.id)
      
      if (error) throw error
      showSuccess('Visitor updated successfully')
    } else {
      const { error } = await supabase
        .from('education_visitors')
        .insert(payload)
      
      if (error) throw error
      showSuccess('Visitor added successfully')
      
      // Store the visitor data for copy-to-clipboard feature
      lastSavedVisitor.value = { ...payload }
      showCopySuccess.value = true
    }
    
    dialogOpen.value = false
    refresh()
  } catch (error: any) {
    console.error('Error saving visitor:', error)
    showError(error.message || 'Failed to save visitor')
  } finally {
    saving.value = false
  }
}

async function deleteVisitor(id: string) {
  if (!confirm('Are you sure you want to delete this visitor?')) return
  
  deleting.value = id
  
  try {
    const { error } = await supabase
      .from('education_visitors')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    showSuccess('Visitor deleted')
    refresh()
  } catch (error: any) {
    console.error('Error deleting visitor:', error)
    showError(error.message || 'Failed to delete visitor')
  } finally {
    deleting.value = null
  }
}

async function toggleActive(visitor: Visitor) {
  try {
    const { error } = await supabase
      .from('education_visitors')
      .update({ is_active: !visitor.is_active })
      .eq('id', visitor.id)
    
    if (error) throw error
    showSuccess(visitor.is_active ? 'Visitor marked inactive' : 'Visitor marked active')
    refresh()
  } catch (error: any) {
    console.error('Error toggling visitor status:', error)
    showError(error.message || 'Failed to update status')
  }
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    intern: 'blue',
    extern: 'purple',
    student: 'green',
    ce_attendee: 'amber',
    shadow: 'cyan',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    intern: 'mdi-briefcase-account',
    extern: 'mdi-school-outline',
    student: 'mdi-account-school',
    ce_attendee: 'mdi-certificate',
    shadow: 'mdi-account-eye',
    other: 'mdi-account'
  }
  return icons[type] || 'mdi-account'
}

function getStatusColor(status: string | null): string {
  const colors: Record<string, string> = {
    upcoming: 'blue',
    current: 'success',
    done: 'grey',
    no_show: 'error'
  }
  return colors[status || ''] || 'grey'
}

function getStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    upcoming: 'Upcoming',
    current: 'Currently Here',
    done: 'Done',
    no_show: 'No Show'
  }
  return labels[status || ''] || 'Unknown'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    intern: 'Intern',
    extern: 'Extern',
    student: 'Student',
    ce_attendee: 'CE Attendee',
    shadow: 'Shadow',
    other: 'Other'
  }
  return labels[type] || type
}

function formatDateForSlack(dateStr: string | null): string {
  if (!dateStr) return 'TBD'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

function generateSlackMessage(visitor: any): string {
  const visitorType = getTypeLabel(visitor.visitor_type || 'student')
  const name = `${visitor.first_name} ${visitor.last_name}`.trim()
  const school = visitor.school_of_origin || visitor.organization_name || 'N/A'
  const email = visitor.email || 'N/A'
  const program = visitor.program_name || 'N/A'
  const location = visitor.location || 'TBD'
  const arriving = formatDateForSlack(visitor.visit_start_date)
  const leaving = formatDateForSlack(visitor.visit_end_date)
  const contact = visitor.coordinator ? `@${visitor.coordinator}` : 'TBD'
  const shadowing = visitor.mentor || 'Any DVM'
  const reason = visitor.reason_for_visit || ''
  
  return `NEW ${visitorType.toUpperCase()} ANNOUNCEMENT
0. Visiting From: ${school}
1. NAME: ${name}
2. E-Mail: ${email}
3. Level: ${program}
4. Clinic Location: ${location}
5. Arriving: ${arriving}
5. Leaving: ${leaving}
6. GDD Contact: ${contact}
7. Shadowing: ${shadowing}
8. Reason for Visit: ${reason}`
}

async function copyVisitorToClipboard() {
  if (!lastSavedVisitor.value) return
  
  try {
    const message = generateSlackMessage(lastSavedVisitor.value)
    await navigator.clipboard.writeText(message)
    showSuccess('Visitor details copied to clipboard!')
    showCopySuccess.value = false
  } catch (error) {
    console.error('Failed to copy:', error)
    showError('Failed to copy to clipboard')
  }
}

async function postVisitorToSlack() {
  if (!lastSavedVisitor.value || !selectedSlackChannel.value) {
    showError('Please select a Slack channel')
    return
  }
  
  postingToSlack.value = true
  
  try {
    const message = generateSlackMessage(lastSavedVisitor.value)
    const response = await $fetch<{ ok: boolean; error?: string }>('/api/slack/send', {
      method: 'POST',
      body: {
        type: 'channel',
        channel: selectedSlackChannel.value,
        text: message
      }
    })
    
    if (response.ok) {
      showSuccess('Posted to Slack successfully!')
      showCopySuccess.value = false
    } else {
      showError(response.error || 'Failed to post to Slack')
    }
  } catch (error: any) {
    console.error('Failed to post to Slack:', error)
    showError(error.message || 'Failed to post to Slack')
  } finally {
    postingToSlack.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" aria-label="Go back" to="/gdu/students" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">CE Course Contacts</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage CE event attendees and continuing education participants
        </p>
      </div>
      <v-spacer />
      <v-btn
        variant="outlined"
        prepend-icon="mdi-file-import-outline"
        class="mr-2"
        @click="showUploadWizard = true"
      >
        Import
      </v-btn>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-file-export-outline"
        class="mr-2"
        @click="showExportDialog = true"
      >
        Export
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus"
        @click="openAddDialog"
      >
        Add Contact
      </v-btn>
    </div>

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: stats.total, label: 'Total Visitors', color: 'primary' },
        { value: stats.active, label: 'Active', color: 'success' },
        { value: stats.upcoming, label: 'Upcoming', color: 'info' },
        { value: stats.current, label: 'Currently Here', color: 'teal' },
        { value: stats.byType.find(s => s.type === 'Intern')?.count || 0, label: 'Interns', color: 'secondary' },
        { value: stats.byType.find(s => s.type === 'Extern')?.count || 0, label: 'Externs', color: 'warning' }
      ]"
      layout="6-col"
    />

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-text-field
              v-model="searchQuery"
              label="Search visitors..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="selectedType"
              :items="typeOptions"
              label="Visitor Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
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
            <v-select
              v-model="selectedLocation"
              :items="locationOptions"
              label="Location"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3" class="d-flex justify-end align-center">
            <v-btn-toggle
              v-model="quickFilter"
              density="compact"
              variant="outlined"
            >
              <v-btn value="all" size="small">All</v-btn>
              <v-btn value="active" size="small" color="success">Active</v-btn>
              <v-btn value="upcoming" size="small" color="info">Upcoming</v-btn>
            </v-btn-toggle>
            <v-chip color="primary" variant="tonal" size="small">
              {{ filteredVisitors.length }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Visitors Table -->
    <v-card variant="outlined">
      <v-progress-linear v-if="pending" indeterminate color="primary" />
      
      <v-table v-if="filteredVisitors.length > 0" hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Program</th>
            <th>Visit Dates</th>
            <th>Status</th>
            <th>Coordinator</th>
            <th>Mentor</th>
            <th>Location</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="visitor in filteredVisitors"
            :key="visitor.id"
            style="cursor: pointer;"
            @click="openEditDialog(visitor)"
          >
            <td>
              <div class="d-flex align-center py-1">
                <v-avatar :color="getTypeColor(visitor.visitor_type)" size="32" class="mr-2">
                  <v-icon size="x-small" color="white">{{ getTypeIcon(visitor.visitor_type) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-medium text-body-2">{{ visitor.first_name }} {{ visitor.last_name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ visitor.visitor_type.replace('_', ' ') }}
                  </div>
                </div>
              </div>
            </td>
            
            <td>
              <div v-if="visitor.program_name">
                <div class="font-weight-medium">{{ visitor.program_name }}</div>
              </div>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            
            <td>
              <div v-if="visitor.visit_start_date">
                <div>{{ new Date(visitor.visit_start_date).toLocaleDateString() }}</div>
                <div class="text-caption text-medium-emphasis" v-if="visitor.visit_end_date">
                  to {{ new Date(visitor.visit_end_date).toLocaleDateString() }}
                </div>
              </div>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            
            <td>
              <v-chip
                size="small"
                :color="getStatusColor(visitor.visit_status)"
                variant="flat"
              >
                {{ getStatusLabel(visitor.visit_status) }}
              </v-chip>
            </td>
            
            <td>
              {{ visitor.coordinator || '—' }}
            </td>
            
            <td>
              {{ visitor.mentor || '—' }}
            </td>
            
            <td>
              {{ visitor.location || '—' }}
            </td>
            
            <td class="text-right" style="white-space: nowrap;">
              <v-btn
                v-if="visitor.phone"
                icon
                variant="text"
                size="x-small"
                color="success"
                :href="`tel:${visitor.phone}`"
                @click.stop
              >
                <v-icon size="small">mdi-phone</v-icon>
                <v-tooltip activator="parent" location="top">Call</v-tooltip>
              </v-btn>
              <v-btn
                v-if="visitor.email"
                icon
                variant="text"
                size="x-small"
                color="info"
                :href="`mailto:${visitor.email}`"
                @click.stop
              >
                <v-icon size="small">mdi-email</v-icon>
                <v-tooltip activator="parent" location="top">Email</v-tooltip>
              </v-btn>
              <v-btn
                icon
                variant="text"
                size="x-small"
                color="error"
                :loading="deleting === visitor.id"
                @click.stop="deleteVisitor(visitor.id)"
              >
                <v-icon size="small">mdi-delete</v-icon>
                <v-tooltip activator="parent" location="top">Delete</v-tooltip>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
        <div class="text-h6 mt-4">No visitors found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedType || selectedStatus || selectedLocation ? 'Try adjusting your filters' : 'Add your first visitor to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedType && !selectedStatus && !selectedLocation"
          color="primary"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Visitor
        </v-btn>
      </div>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingVisitor ? 'mdi-pencil' : 'mdi-account-plus' }}</v-icon>
          {{ editingVisitor ? 'Edit Visitor' : 'Add Visitor' }}
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <!-- Basic Info -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.first_name"
                label="First Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.last_name"
                label="Last Name *"
                variant="outlined"
                required
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email"
                variant="outlined"
                type="email"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.phone"
                label="Phone"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.visitor_type"
                :items="typeOptions.filter(t => t.value !== null)"
                label="Visitor Type *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.is_active"
                label="Active"
                color="success"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Organization Details</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.organization_name"
                label="Organization Name"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.school_of_origin"
                label="School of Origin"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="formData.program_name"
                label="Program Name"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Visit Details</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.visit_start_date"
                label="Visit Start Date"
                variant="outlined"
                type="date"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.visit_end_date"
                label="Visit End Date"
                variant="outlined"
                type="date"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.visit_status"
                :items="statusOptions.filter(s => s.value !== null)"
                label="Visit Status"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.location"
                :items="locationOptions.filter(l => l.value !== null)"
                label="Location"
                variant="outlined"
                clearable
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Staff Assignments</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.coordinator"
                label="Coordinator"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.first_greeter"
                label="First Greeter"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.mentor"
                label="Mentor"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Recruitment & Source</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-combobox
                v-model="formData.lead_source"
                :items="leadSourceOptions"
                label="Lead Source"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.referral_name"
                label="Referral Name"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.recruitment_channel"
                label="Recruitment Channel"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.recruitment_announced"
                label="Recruitment Announced"
                color="success"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.reason_for_visit"
                label="Reason for Visit"
                variant="outlined"
                rows="2"
                placeholder="e.g., Shadowing for career exploration, externship requirement, etc."
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="Notes"
                variant="outlined"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formData.first_name || !formData.last_name" @click="saveVisitor">
            {{ editingVisitor ? 'Save Changes' : 'Add Visitor' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    
    <!-- Copy to Clipboard / Post to Slack Dialog -->
    <v-dialog v-model="showCopySuccess" max-width="550" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
          Visitor Added Successfully!
        </v-card-title>
        
        <v-card-text>
          <p class="mb-4">Share this visitor announcement with your team:</p>
          
          <v-card variant="outlined" class="pa-3 bg-grey-lighten-4 mb-4">
            <pre class="text-body-2" style="white-space: pre-wrap; font-family: monospace;">{{ lastSavedVisitor ? generateSlackMessage(lastSavedVisitor) : '' }}</pre>
          </v-card>
          
          <!-- Slack Channel Picker -->
          <v-select
            v-model="selectedSlackChannel"
            :items="slackChannels"
            item-title="displayName"
            item-value="id"
            label="Post to Slack Channel"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-slack"
            :loading="slackChannelsLoading"
            :disabled="slackChannels.length === 0"
            class="mb-2"
          >
            <template #no-data>
              <v-list-item>
                <v-list-item-title>No channels available</v-list-item-title>
              </v-list-item>
            </template>
          </v-select>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showCopySuccess = false">
            Skip
          </v-btn>
          <v-spacer />
          <v-btn variant="outlined" prepend-icon="mdi-content-copy" @click="copyVisitorToClipboard">
            Copy
          </v-btn>
          <v-btn 
            color="primary" 
            prepend-icon="mdi-slack" 
            :loading="postingToSlack"
            :disabled="!selectedSlackChannel || slackChannels.length === 0"
            @click="postVisitorToSlack"
          >
            Post to Slack
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Export Dialog -->
    <UiExportDialog
      v-model="showExportDialog"
      :data="filteredVisitors"
      :columns="exportColumns"
      default-file-name="ce-visitors-export"
      title="CE Course Contacts Export"
    />

    <!-- Import Wizard -->
    <GduVisitorUploadWizard
      v-model="showUploadWizard"
      @uploaded="refresh"
    />
  </div>
</template>
