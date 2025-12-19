<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { currentInitials, createNote, formatNoteTimestamp, formatNoteForDisplay } = useSignedNotes()
const { showSuccess, showError } = useToast()

const partnerId = computed(() => route.params.id as string)

// Tab state
const activeTab = ref('info')

// Partner data
const { data: partner, pending, refresh } = await useAsyncData(`partner-${partnerId.value}`, async () => {
  const { data, error } = await supabase
    .from('partner_details')
    .select('*')
    .eq('id', partnerId.value)
    .single()
  
  if (error) throw error
  return data
})

// Partner events
const { data: partnerEvents, refresh: refreshEvents } = await useAsyncData(`partner-events-${partnerId.value}`, async () => {
  const { data, error } = await supabase
    .from('partner_events')
    .select(`
      *,
      event:marketing_events(id, name, event_date, location)
    `)
    .eq('partner_id', partnerId.value)
    .order('event_date', { ascending: false, nullsFirst: false })
  
  if (error) throw error
  return data
})

// Partner notes
const { data: partnerNotes, refresh: refreshNotes } = await useAsyncData(`partner-notes-${partnerId.value}`, async () => {
  const { data, error } = await supabase
    .from('partner_notes')
    .select('*')
    .eq('partner_id', partnerId.value)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
})

// Partner visit logs
const { data: visitLogs, refresh: refreshVisits } = await useAsyncData(`partner-visits-${partnerId.value}`, async () => {
  const { data, error } = await supabase
    .from('partner_visit_logs')
    .select('*')
    .eq('partner_id', partnerId.value)
    .order('visit_date', { ascending: false })
  
  if (error) throw error
  return data
})

// Available marketing events for adding
const { data: upcomingEvents } = await useAsyncData('upcoming-events', async () => {
  const { data, error } = await supabase
    .from('marketing_events')
    .select('id, name, event_date, location')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date')
  
  if (error) return []
  return data
})

// Form states
const isEditing = ref(false)
const editForm = ref({
  name: '',
  partner_type: '',
  status: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  communication_preference: '',
  relationship_status: '',
  notes: '',
  instagram_handle: '',
  facebook_url: '',
  linkedin_url: ''
})

// New note form
const newNote = ref('')
const noteType = ref('general')
const savingNote = ref(false)

// Add event dialog
const addEventDialog = ref(false)
const selectedEventId = ref<string | null>(null)
const eventRole = ref('attendee')
const eventNotes = ref('')

// Role options
const roleOptions = [
  { title: 'Attendee', value: 'attendee' },
  { title: 'Sponsor', value: 'sponsor' },
  { title: 'Vendor', value: 'vendor' },
  { title: 'Rescue/Shelter', value: 'rescue' },
  { title: 'Food Vendor', value: 'food_vendor' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Donor', value: 'donor' },
  { title: 'Volunteer', value: 'volunteer' },
  { title: 'Host', value: 'host' },
  { title: 'Speaker', value: 'speaker' },
  { title: 'Exhibitor', value: 'exhibitor' }
]

// Note type options
const noteTypeOptions = [
  { title: 'General', value: 'general' },
  { title: 'Visit', value: 'visit' },
  { title: 'Call', value: 'call' },
  { title: 'Email', value: 'email' },
  { title: 'Meeting', value: 'meeting' },
  { title: 'Issue', value: 'issue' },
  { title: 'Opportunity', value: 'opportunity' },
  { title: 'Goal', value: 'goal' }
]

// Status options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Inactive', value: 'inactive' }
]

// Partner type options
const partnerTypeOptions = [
  { title: 'Clinic', value: 'clinic' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Vendor', value: 'vendor' },
  { title: 'Sponsor', value: 'sponsor' },
  { title: 'Donor', value: 'donor' },
  { title: 'Food & Beverage', value: 'food_beverage' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Other', value: 'other' }
]

// Relationship status options
const relationshipOptions = [
  { title: 'New', value: 'new' },
  { title: 'Developing', value: 'developing' },
  { title: 'Established', value: 'established' },
  { title: 'At Risk', value: 'at_risk' },
  { title: 'Churned', value: 'churned' }
]

// Communication preference options
const communicationOptions = [
  { title: 'Email', value: 'email' },
  { title: 'Phone', value: 'phone' },
  { title: 'Text', value: 'text' },
  { title: 'In Person', value: 'in_person' }
]

// Computed properties
const contactStatusColor = computed(() => {
  switch (partner.value?.contact_status) {
    case 'overdue': return 'error'
    case 'needs_attention': return 'warning'
    case 'upcoming': return 'info'
    case 'recent': return 'success'
    default: return 'grey'
  }
})

const contactStatusText = computed(() => {
  const days = partner.value?.days_since_contact
  if (!days && days !== 0) return 'Never contacted'
  if (days === 0) return 'Contacted today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
})

// Initialize edit form
function startEditing() {
  if (!partner.value) return
  editForm.value = {
    name: partner.value.name || '',
    partner_type: partner.value.partner_type || 'other',
    status: partner.value.status || 'active',
    contact_name: partner.value.contact_name || '',
    email: partner.value.email || '',
    phone: partner.value.phone || '',
    website: partner.value.website || '',
    address: partner.value.address || '',
    communication_preference: partner.value.communication_preference || 'email',
    relationship_status: partner.value.relationship_status || 'new',
    notes: partner.value.notes || '',
    instagram_handle: partner.value.instagram_handle || '',
    facebook_url: partner.value.facebook_url || '',
    linkedin_url: partner.value.linkedin_url || ''
  }
  isEditing.value = true
}

async function savePartner() {
  try {
    const { error } = await supabase
      .from('referral_partners')
      .update({
        ...editForm.value,
        last_contact_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId.value)
    
    if (error) throw error
    
    isEditing.value = false
    showSuccess('Partner updated successfully')
    refresh()
  } catch (err: any) {
    showError(err.message || 'Failed to update partner')
  }
}

function cancelEditing() {
  isEditing.value = false
}

// Add a new note
async function addNote() {
  if (!newNote.value.trim()) return
  
  savingNote.value = true
  try {
    const noteData = createNote(newNote.value.trim(), noteType.value)
    
    const { error } = await supabase
      .from('partner_notes')
      .insert({
        partner_id: partnerId.value,
        content: noteData.content,
        note_type: noteData.note_type,
        author_initials: noteData.author_initials,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
    
    if (error) throw error
    
    newNote.value = ''
    noteType.value = 'general'
    showSuccess('Note added')
    refreshNotes()
    
    // Update last contact date
    await supabase
      .from('referral_partners')
      .update({ last_contact_date: new Date().toISOString().split('T')[0] })
      .eq('id', partnerId.value)
    
    refresh()
  } catch (err: any) {
    showError(err.message || 'Failed to add note')
  } finally {
    savingNote.value = false
  }
}

// Delete a note
async function deleteNote(noteId: string) {
  if (!confirm('Are you sure you want to delete this note?')) return
  
  try {
    const { error } = await supabase
      .from('partner_notes')
      .delete()
      .eq('id', noteId)
    
    if (error) throw error
    showSuccess('Note deleted')
    refreshNotes()
  } catch (err: any) {
    showError(err.message || 'Failed to delete note')
  }
}

// Add partner to event
async function addToEvent() {
  if (!selectedEventId.value) return
  
  try {
    const selectedEvent = upcomingEvents.value?.find(e => e.id === selectedEventId.value)
    
    const { error } = await supabase
      .from('partner_events')
      .insert({
        partner_id: partnerId.value,
        event_id: selectedEventId.value,
        event_name: selectedEvent?.name,
        event_date: selectedEvent?.event_date,
        participation_role: eventRole.value,
        notes: eventNotes.value || null,
        is_confirmed: false
      })
    
    if (error) throw error
    
    addEventDialog.value = false
    selectedEventId.value = null
    eventRole.value = 'attendee'
    eventNotes.value = ''
    showSuccess('Partner added to event')
    refreshEvents()
  } catch (err: any) {
    showError(err.message || 'Failed to add partner to event')
  }
}

// Toggle event confirmation
async function toggleEventConfirmation(eventId: string, isConfirmed: boolean) {
  try {
    const { error } = await supabase
      .from('partner_events')
      .update({ 
        is_confirmed: !isConfirmed,
        confirmation_date: !isConfirmed ? new Date().toISOString() : null
      })
      .eq('id', eventId)
    
    if (error) throw error
    refreshEvents()
  } catch (err: any) {
    showError(err.message || 'Failed to update confirmation')
  }
}

// Remove from event
async function removeFromEvent(eventId: string) {
  if (!confirm('Remove partner from this event?')) return
  
  try {
    const { error } = await supabase
      .from('partner_events')
      .delete()
      .eq('id', eventId)
    
    if (error) throw error
    showSuccess('Removed from event')
    refreshEvents()
  } catch (err: any) {
    showError(err.message || 'Failed to remove from event')
  }
}

// Format date helper
function formatDate(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Get note type icon
function getNoteTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    general: 'mdi-note-text',
    visit: 'mdi-walk',
    call: 'mdi-phone',
    email: 'mdi-email',
    meeting: 'mdi-account-group',
    issue: 'mdi-alert-circle',
    opportunity: 'mdi-lightbulb',
    goal: 'mdi-target'
  }
  return icons[type] || 'mdi-note'
}

// Get note type color
function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    visit: 'blue',
    call: 'green',
    email: 'purple',
    meeting: 'indigo',
    issue: 'error',
    opportunity: 'warning',
    goal: 'success'
  }
  return colors[type] || 'grey'
}
</script>

<template>
  <div class="partner-details-page">
    <!-- Loading State -->
    <div v-if="pending" class="d-flex justify-center align-center" style="min-height: 400px">
      <v-progress-circular indeterminate size="64" />
    </div>
    
    <!-- Partner Not Found -->
    <v-alert v-else-if="!partner" type="error" class="ma-4">
      Partner not found
      <template #append>
        <v-btn variant="text" @click="router.push('/marketing/partners')">
          Back to Partners
        </v-btn>
      </template>
    </v-alert>
    
    <!-- Partner Details -->
    <template v-else>
      <!-- Header -->
      <v-card class="mb-4">
        <v-card-text>
          <div class="d-flex justify-space-between align-start flex-wrap gap-4">
            <div>
              <div class="d-flex align-center gap-2 mb-2">
                <v-btn icon size="small" variant="text" @click="router.push('/marketing/partners')">
                  <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <h1 class="text-h4">{{ partner.name }}</h1>
                <v-chip :color="partner.status === 'active' ? 'success' : 'grey'" size="small">
                  {{ partner.status }}
                </v-chip>
                <v-chip v-if="partner.partner_type" color="primary" size="small" variant="outlined">
                  {{ partner.partner_type }}
                </v-chip>
              </div>
              
              <div class="d-flex align-center gap-4 text-body-2 text-medium-emphasis">
                <span v-if="partner.contact_name">
                  <v-icon size="small">mdi-account</v-icon>
                  {{ partner.contact_name }}
                </span>
                <span v-if="partner.email">
                  <v-icon size="small">mdi-email</v-icon>
                  {{ partner.email }}
                </span>
                <span v-if="partner.phone">
                  <v-icon size="small">mdi-phone</v-icon>
                  {{ partner.phone }}
                </span>
              </div>
            </div>
            
            <div class="text-right">
              <!-- Last Contact Badge -->
              <v-chip :color="contactStatusColor" class="mb-2">
                <v-icon start size="small">mdi-clock-outline</v-icon>
                Last Contact: {{ contactStatusText }}
              </v-chip>
              
              <div class="d-flex gap-2 justify-end">
                <v-btn 
                  v-if="!isEditing" 
                  variant="outlined" 
                  @click="startEditing"
                >
                  <v-icon start>mdi-pencil</v-icon>
                  Edit
                </v-btn>
              </div>
            </div>
          </div>
          
          <!-- Quick Stats -->
          <v-row class="mt-4">
            <v-col cols="6" md="3">
              <div class="text-center pa-2 rounded bg-grey-lighten-4">
                <div class="text-h5 font-weight-bold text-primary">{{ partner.total_events || 0 }}</div>
                <div class="text-caption">Events</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center pa-2 rounded bg-grey-lighten-4">
                <div class="text-h5 font-weight-bold text-success">{{ partner.total_notes || 0 }}</div>
                <div class="text-caption">Notes</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center pa-2 rounded bg-grey-lighten-4">
                <div class="text-h5 font-weight-bold text-info">{{ partner.total_visits || 0 }}</div>
                <div class="text-caption">Visits</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center pa-2 rounded bg-grey-lighten-4">
                <div class="text-h5 font-weight-bold text-warning">{{ partner.relationship_score || 50 }}</div>
                <div class="text-caption">Score</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
      
      <!-- Tabs -->
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="info">
          <v-icon start>mdi-information</v-icon>
          Info
        </v-tab>
        <v-tab value="events">
          <v-icon start>mdi-calendar-star</v-icon>
          Events ({{ partnerEvents?.length || 0 }})
        </v-tab>
        <v-tab value="notes">
          <v-icon start>mdi-note-multiple</v-icon>
          History ({{ partnerNotes?.length || 0 }})
        </v-tab>
      </v-tabs>
      
      <v-window v-model="activeTab">
        <!-- INFO TAB -->
        <v-window-item value="info">
          <v-card>
            <v-card-text>
              <v-form v-if="isEditing">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.name"
                      label="Partner Name"
                      required
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="editForm.partner_type"
                      :items="partnerTypeOptions"
                      label="Type"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="editForm.status"
                      :items="statusOptions"
                      label="Status"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.contact_name"
                      label="Contact Name"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.email"
                      label="Email"
                      type="email"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.phone"
                      label="Phone"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.website"
                      label="Website"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-text-field
                      v-model="editForm.address"
                      label="Address"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="editForm.communication_preference"
                      :items="communicationOptions"
                      label="Preferred Contact Method"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="editForm.relationship_status"
                      :items="relationshipOptions"
                      label="Relationship Status"
                    />
                  </v-col>
                  
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.instagram_handle"
                      label="Instagram"
                      prepend-inner-icon="mdi-instagram"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.facebook_url"
                      label="Facebook URL"
                      prepend-inner-icon="mdi-facebook"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.linkedin_url"
                      label="LinkedIn URL"
                      prepend-inner-icon="mdi-linkedin"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-textarea
                      v-model="editForm.notes"
                      label="General Notes"
                      rows="3"
                    />
                  </v-col>
                </v-row>
                
                <div class="d-flex gap-2 mt-4">
                  <v-btn color="primary" @click="savePartner">
                    <v-icon start>mdi-check</v-icon>
                    Save Changes
                  </v-btn>
                  <v-btn variant="outlined" @click="cancelEditing">
                    Cancel
                  </v-btn>
                </div>
              </v-form>
              
              <!-- View Mode -->
              <div v-else>
                <v-row>
                  <v-col cols="12" md="6">
                    <h3 class="text-subtitle-1 font-weight-bold mb-3">Contact Information</h3>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item v-if="partner.contact_name">
                        <template #prepend>
                          <v-icon>mdi-account</v-icon>
                        </template>
                        <v-list-item-title>{{ partner.contact_name }}</v-list-item-title>
                        <v-list-item-subtitle>Primary Contact</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="partner.email">
                        <template #prepend>
                          <v-icon>mdi-email</v-icon>
                        </template>
                        <v-list-item-title>
                          <a :href="`mailto:${partner.email}`">{{ partner.email }}</a>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="partner.phone">
                        <template #prepend>
                          <v-icon>mdi-phone</v-icon>
                        </template>
                        <v-list-item-title>
                          <a :href="`tel:${partner.phone}`">{{ partner.phone }}</a>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="partner.website">
                        <template #prepend>
                          <v-icon>mdi-web</v-icon>
                        </template>
                        <v-list-item-title>
                          <a :href="partner.website" target="_blank">{{ partner.website }}</a>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="partner.address">
                        <template #prepend>
                          <v-icon>mdi-map-marker</v-icon>
                        </template>
                        <v-list-item-title>{{ partner.address }}</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-col>
                  
                  <v-col cols="12" md="6">
                    <h3 class="text-subtitle-1 font-weight-bold mb-3">Relationship Details</h3>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item>
                        <template #prepend>
                          <v-icon>mdi-heart</v-icon>
                        </template>
                        <v-list-item-title>{{ partner.relationship_status || 'New' }}</v-list-item-title>
                        <v-list-item-subtitle>Relationship Status</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item>
                        <template #prepend>
                          <v-icon>mdi-message</v-icon>
                        </template>
                        <v-list-item-title>{{ partner.communication_preference || 'Email' }}</v-list-item-title>
                        <v-list-item-subtitle>Preferred Contact</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="partner.tier">
                        <template #prepend>
                          <v-icon>mdi-medal</v-icon>
                        </template>
                        <v-list-item-title class="text-capitalize">{{ partner.tier }}</v-list-item-title>
                        <v-list-item-subtitle>Partner Tier</v-list-item-subtitle>
                      </v-list-item>
                      <v-list-item v-if="partner.last_contact_date">
                        <template #prepend>
                          <v-icon>mdi-calendar-check</v-icon>
                        </template>
                        <v-list-item-title>{{ formatDate(partner.last_contact_date) }}</v-list-item-title>
                        <v-list-item-subtitle>Last Contact</v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                    
                    <!-- Social Links -->
                    <div v-if="partner.instagram_handle || partner.facebook_url || partner.linkedin_url" class="mt-4">
                      <h3 class="text-subtitle-1 font-weight-bold mb-2">Social Media</h3>
                      <div class="d-flex gap-2">
                        <v-btn 
                          v-if="partner.instagram_handle"
                          icon
                          size="small"
                          :href="`https://instagram.com/${partner.instagram_handle}`"
                          target="_blank"
                        >
                          <v-icon>mdi-instagram</v-icon>
                        </v-btn>
                        <v-btn 
                          v-if="partner.facebook_url"
                          icon
                          size="small"
                          :href="partner.facebook_url"
                          target="_blank"
                        >
                          <v-icon>mdi-facebook</v-icon>
                        </v-btn>
                        <v-btn 
                          v-if="partner.linkedin_url"
                          icon
                          size="small"
                          :href="partner.linkedin_url"
                          target="_blank"
                        >
                          <v-icon>mdi-linkedin</v-icon>
                        </v-btn>
                      </div>
                    </div>
                  </v-col>
                </v-row>
                
                <!-- General Notes -->
                <div v-if="partner.notes" class="mt-4">
                  <h3 class="text-subtitle-1 font-weight-bold mb-2">General Notes</h3>
                  <v-card variant="outlined" class="bg-grey-lighten-5">
                    <v-card-text>
                      <pre class="text-body-2" style="white-space: pre-wrap; font-family: inherit;">{{ partner.notes }}</pre>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
        
        <!-- EVENTS TAB -->
        <v-window-item value="events">
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Event Participation</span>
              <v-btn color="primary" size="small" @click="addEventDialog = true">
                <v-icon start>mdi-plus</v-icon>
                Add to Event
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-alert v-if="!partnerEvents?.length" type="info" variant="tonal">
                No events recorded for this partner yet.
              </v-alert>
              
              <v-timeline v-else side="end" density="compact">
                <v-timeline-item
                  v-for="event in partnerEvents"
                  :key="event.id"
                  :dot-color="event.is_confirmed ? 'success' : 'warning'"
                  size="small"
                >
                  <template #opposite>
                    <span class="text-caption">
                      {{ formatDate(event.event?.event_date || event.event_date) }}
                    </span>
                  </template>
                  
                  <v-card variant="outlined">
                    <v-card-text class="py-2">
                      <div class="d-flex justify-space-between align-start">
                        <div>
                          <div class="font-weight-bold">
                            {{ event.event?.name || event.event_name }}
                          </div>
                          <div class="d-flex gap-2 mt-1">
                            <v-chip size="x-small" color="primary" variant="outlined">
                              {{ event.participation_role }}
                            </v-chip>
                            <v-chip 
                              size="x-small" 
                              :color="event.is_confirmed ? 'success' : 'warning'"
                            >
                              {{ event.is_confirmed ? 'Confirmed' : 'Pending' }}
                            </v-chip>
                            <v-chip v-if="event.booth_size" size="x-small" variant="outlined">
                              {{ event.booth_size }}
                            </v-chip>
                          </div>
                          <div v-if="event.notes" class="text-caption mt-1 text-medium-emphasis">
                            {{ event.notes }}
                          </div>
                        </div>
                        <div class="d-flex gap-1">
                          <v-btn 
                            icon 
                            size="x-small" 
                            variant="text"
                            :color="event.is_confirmed ? 'grey' : 'success'"
                            @click="toggleEventConfirmation(event.id, event.is_confirmed)"
                          >
                            <v-icon>{{ event.is_confirmed ? 'mdi-check-circle' : 'mdi-check-circle-outline' }}</v-icon>
                            <v-tooltip activator="parent">
                              {{ event.is_confirmed ? 'Mark as Pending' : 'Mark as Confirmed' }}
                            </v-tooltip>
                          </v-btn>
                          <v-btn 
                            icon 
                            size="x-small" 
                            variant="text"
                            color="error"
                            @click="removeFromEvent(event.id)"
                          >
                            <v-icon>mdi-close</v-icon>
                            <v-tooltip activator="parent">Remove from Event</v-tooltip>
                          </v-btn>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </v-window-item>
        
        <!-- NOTES/HISTORY TAB -->
        <v-window-item value="notes">
          <v-card>
            <v-card-text>
              <!-- Add Note Form -->
              <div class="mb-4">
                <h3 class="text-subtitle-1 font-weight-bold mb-2">Add Note</h3>
                <v-row>
                  <v-col cols="12" md="9">
                    <v-textarea
                      v-model="newNote"
                      placeholder="Type your note here..."
                      rows="2"
                      hide-details
                      variant="outlined"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="noteType"
                      :items="noteTypeOptions"
                      label="Type"
                      density="compact"
                      variant="outlined"
                      hide-details
                      class="mb-2"
                    />
                    <v-btn 
                      color="primary" 
                      block 
                      :loading="savingNote"
                      :disabled="!newNote.trim()"
                      @click="addNote"
                    >
                      <v-icon start>mdi-plus</v-icon>
                      Add Note
                    </v-btn>
                  </v-col>
                </v-row>
                <div class="text-caption text-medium-emphasis mt-1">
                  Note will be signed as: {{ currentInitials }} @ {{ formatNoteTimestamp(new Date()) }}
                </div>
              </div>
              
              <v-divider class="mb-4" />
              
              <!-- Notes Timeline -->
              <h3 class="text-subtitle-1 font-weight-bold mb-3">History</h3>
              
              <v-alert v-if="!partnerNotes?.length" type="info" variant="tonal">
                No notes recorded yet. Add your first note above.
              </v-alert>
              
              <div v-else class="notes-timeline">
                <v-card
                  v-for="note in partnerNotes"
                  :key="note.id"
                  variant="outlined"
                  class="mb-3"
                >
                  <v-card-text class="py-2">
                    <div class="d-flex justify-space-between align-start">
                      <div class="d-flex gap-2 align-start">
                        <v-icon 
                          :color="getNoteTypeColor(note.note_type)"
                          size="small"
                        >
                          {{ getNoteTypeIcon(note.note_type) }}
                        </v-icon>
                        <div>
                          <pre class="text-body-2" style="white-space: pre-wrap; font-family: inherit; margin: 0;">{{ note.content }}</pre>
                          <div class="text-caption text-medium-emphasis mt-1">
                            <v-chip size="x-small" :color="getNoteTypeColor(note.note_type)" variant="outlined" class="mr-2">
                              {{ note.note_type }}
                            </v-chip>
                            <strong>{{ note.author_initials || 'SY' }}</strong>
                            @ {{ formatNoteTimestamp(note.created_at) }}
                            <span v-if="note.edited_at" class="ml-2">
                              (edited by {{ note.edited_by_initials }} @ {{ formatNoteTimestamp(note.edited_at) }})
                            </span>
                          </div>
                        </div>
                      </div>
                      <v-btn 
                        icon 
                        size="x-small" 
                        variant="text"
                        color="error"
                        @click="deleteNote(note.id)"
                      >
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </template>
    
    <!-- Add to Event Dialog -->
    <v-dialog v-model="addEventDialog" max-width="500">
      <v-card>
        <v-card-title>Add Partner to Event</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedEventId"
            :items="upcomingEvents || []"
            item-title="name"
            item-value="id"
            label="Select Event"
            class="mb-2"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ formatDate(item.raw.event_date) }} - {{ item.raw.location }}
                </template>
              </v-list-item>
            </template>
          </v-select>
          
          <v-select
            v-model="eventRole"
            :items="roleOptions"
            label="Participation Role"
            class="mb-2"
          />
          
          <v-textarea
            v-model="eventNotes"
            label="Notes (optional)"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addEventDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!selectedEventId" @click="addToEvent">
            Add to Event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.partner-details-page {
  max-width: 1200px;
  margin: 0 auto;
}

.notes-timeline {
  max-height: 600px;
  overflow-y: auto;
}
</style>
