<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()

const partnerId = computed(() => route.params.id as string)

// Tab state
const activeTab = ref('info')

// Partner data - query from marketing_partners table
const { data: partner, pending, refresh } = await useAsyncData(`partner-${partnerId.value}`, async () => {
  const { data, error } = await supabase
    .from('marketing_partners')
    .select('*')
    .eq('id', partnerId.value)
    .single()
  
  if (error) {
    console.error('Error fetching partner:', error)
    return null
  }
  return data
}, { watch: [partnerId] })

// Form state
const isEditing = ref(false)
const isSaving = ref(false)
const editForm = ref({
  name: '',
  partner_type: 'other',
  status: 'prospect',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  website: '',
  address: '',
  membership_level: '',
  membership_fee: null as number | null,
  membership_end: '',
  instagram_handle: '',
  facebook_url: '',
  tiktok_handle: '',
  services_provided: '',
  notes: '',
  proximity_to_location: ''
})

// Partner type options (from marketing_hubs schema)
const partnerTypes = [
  { title: 'Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Influencer', value: 'influencer' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber of Commerce', value: 'chamber' },
  { title: 'Food Vendor', value: 'food_vendor' },
  { title: 'Association', value: 'association' },
  { title: 'Spay & Neuter', value: 'spay_neuter' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Expired', value: 'expired' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Prospect', value: 'prospect' }
]

// Initialize edit form from partner data
function startEditing() {
  if (!partner.value) return
  editForm.value = {
    name: partner.value.name || '',
    partner_type: partner.value.partner_type || 'other',
    status: partner.value.status || 'prospect',
    contact_name: partner.value.contact_name || '',
    contact_phone: partner.value.contact_phone || '',
    contact_email: partner.value.contact_email || '',
    website: partner.value.website || '',
    address: partner.value.address || '',
    membership_level: partner.value.membership_level || '',
    membership_fee: partner.value.membership_fee,
    membership_end: partner.value.membership_end || '',
    instagram_handle: partner.value.instagram_handle || '',
    facebook_url: partner.value.facebook_url || '',
    tiktok_handle: partner.value.tiktok_handle || '',
    services_provided: partner.value.services_provided || '',
    notes: partner.value.notes || '',
    proximity_to_location: partner.value.proximity_to_location || ''
  }
  isEditing.value = true
}

async function savePartner() {
  isSaving.value = true
  try {
    const { error } = await supabase
      .from('marketing_partners')
      .update({
        name: editForm.value.name,
        partner_type: editForm.value.partner_type,
        status: editForm.value.status,
        contact_name: editForm.value.contact_name || null,
        contact_phone: editForm.value.contact_phone || null,
        contact_email: editForm.value.contact_email || null,
        website: editForm.value.website || null,
        address: editForm.value.address || null,
        membership_level: editForm.value.membership_level || null,
        membership_fee: editForm.value.membership_fee,
        membership_end: editForm.value.membership_end || null,
        instagram_handle: editForm.value.instagram_handle || null,
        facebook_url: editForm.value.facebook_url || null,
        tiktok_handle: editForm.value.tiktok_handle || null,
        services_provided: editForm.value.services_provided || null,
        notes: editForm.value.notes || null,
        proximity_to_location: editForm.value.proximity_to_location || null,
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
  } finally {
    isSaving.value = false
  }
}

function cancelEditing() {
  isEditing.value = false
}

function goBack() {
  router.push('/marketing/partners')
}

// getPartnerTypeColor, getPartnerStatusColor, formatTypeName auto-imported from shared utils
// formatPartnerDate auto-imported from partnershipHelpers.ts

// =====================================================
// VISIT LOG
// =====================================================
const partnerVisits = ref<any[]>([])
const loadingVisits = ref(false)
const showQuickVisitDialog = ref(false)

async function loadVisits() {
  loadingVisits.value = true
  try {
    const { data, error } = await supabase
      .from('marketing_partner_visits')
      .select('*')
      .eq('partner_id', partnerId.value)
      .order('visit_date', { ascending: false })
      .limit(50)
    if (error) throw error
    partnerVisits.value = data || []
  } catch (err) {
    console.error('Error loading visits:', err)
  } finally {
    loadingVisits.value = false
  }
}

function getVisitTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    in_person: 'mdi-walk', drop_off: 'mdi-package-variant', phone: 'mdi-phone',
    email: 'mdi-email', event: 'mdi-calendar-star', other: 'mdi-dots-horizontal'
  }
  return icons[type] || 'mdi-map-marker'
}

function getVisitTypeColor(type: string): string {
  const colors: Record<string, string> = {
    in_person: 'success', drop_off: 'teal', phone: 'info',
    email: 'primary', event: 'purple', other: 'grey'
  }
  return colors[type] || 'success'
}

function formatVisitType(type: string): string {
  const labels: Record<string, string> = {
    in_person: 'In Person', drop_off: 'Drop-off', phone: 'Phone Call',
    email: 'Email', event: 'At Event', other: 'Other'
  }
  return labels[type] || type
}

// =====================================================
// EVENT PARTICIPATION
// =====================================================
const partnerEvents = ref<any[]>([])
const loadingEvents = ref(false)
const showAddEventDialog = ref(false)
const eventForm = ref({
  event_id: null as string | null,
  role: 'vendor',
  booth_info: '',
  notes: '',
  is_confirmed: false
})
const availableEvents = ref<any[]>([])

const eventRoleOptions = [
  { title: 'Vendor', value: 'vendor' },
  { title: 'Sponsor', value: 'sponsor' },
  { title: 'Rescue Partner', value: 'rescue' },
  { title: 'Food Vendor', value: 'food_vendor' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Donor', value: 'donor' },
  { title: 'Volunteer', value: 'volunteer' },
  { title: 'Host', value: 'host' },
  { title: 'Speaker', value: 'speaker' },
  { title: 'Exhibitor', value: 'exhibitor' },
  { title: 'Chamber', value: 'chamber' },
  { title: 'Other', value: 'other' }
]

async function loadEvents() {
  loadingEvents.value = true
  try {
    const { data, error } = await supabase
      .from('event_marketing_partners')
      .select('*, marketing_events(id, name, event_date, event_type, location, status)')
      .eq('partner_id', partnerId.value)
      .order('created_at', { ascending: false })
    if (error) throw error
    partnerEvents.value = data || []
  } catch (err) {
    console.error('Error loading events:', err)
  } finally {
    loadingEvents.value = false
  }
}

async function loadAvailableEvents() {
  const { data } = await supabase
    .from('marketing_events')
    .select('id, name, event_date, event_type, location, status')
    .gte('event_date', new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
    .order('event_date', { ascending: true })
  availableEvents.value = data || []
}

async function openAddEventDialog() {
  await loadAvailableEvents()
  eventForm.value = { event_id: null, role: 'vendor', booth_info: '', notes: '', is_confirmed: false }
  showAddEventDialog.value = true
}

async function saveEventParticipation() {
  if (!eventForm.value.event_id) return
  try {
    const { error } = await supabase
      .from('event_marketing_partners')
      .insert({
        event_id: eventForm.value.event_id,
        partner_id: partnerId.value,
        role: eventForm.value.role,
        booth_info: eventForm.value.booth_info || null,
        notes: eventForm.value.notes || null,
        is_confirmed: eventForm.value.is_confirmed
      })
    if (error) throw error
    showSuccess('Event participation added')
    showAddEventDialog.value = false
    await loadEvents()
  } catch (err: any) {
    if (err.code === '23505') {
      showError('Already linked to that event')
    } else {
      showError(err.message || 'Failed to add')
    }
  }
}

async function removeEventParticipation(id: string) {
  if (!confirm('Remove this event participation?')) return
  const { error } = await supabase.from('event_marketing_partners').delete().eq('id', id)
  if (error) { showError('Failed to remove'); return }
  showSuccess('Removed')
  await loadEvents()
}

function getEventRoleColor(role: string): string {
  const colors: Record<string, string> = {
    vendor: 'teal', sponsor: 'amber', rescue: 'pink', food_vendor: 'orange',
    entertainment: 'purple', donor: 'green', volunteer: 'blue',
    host: 'indigo', speaker: 'cyan', exhibitor: 'lime', chamber: 'brown'
  }
  return colors[role] || 'grey'
}

// Load visits and events on mount
onMounted(async () => {
  await Promise.all([loadVisits(), loadEvents()])
})

function handleVisitSaved() {
  refresh()
  loadVisits()
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" aria-label="Go back" @click="goBack" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="flex-grow-1">
        <div class="d-flex align-center gap-3">
          <h1 class="text-h4 font-weight-bold">
            {{ partner?.name || 'Partner Details' }}
          </h1>
          <v-chip v-if="partner" :color="getPartnerTypeColor(partner.partner_type)" size="small">
            {{ formatTypeName(partner.partner_type) }}
          </v-chip>
          <v-chip v-if="partner" :color="getPartnerStatusColor(partner.status)" size="small" variant="tonal">
            {{ partner.status }}
          </v-chip>
        </div>
        <p v-if="partner?.contact_name" class="text-subtitle-1 text-medium-emphasis mt-1">
          Contact: {{ partner.contact_name }}
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="!isEditing"
          color="teal"
          prepend-icon="mdi-map-marker-plus"
          variant="tonal"
          @click="showQuickVisitDialog = true"
        >
          Log Visit
        </v-btn>
        <v-btn
          v-if="!isEditing"
          color="primary"
          prepend-icon="mdi-pencil"
          @click="startEditing"
        >
          Edit
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <v-progress-linear v-if="pending" indeterminate color="primary" class="mb-4" />

    <!-- Not Found -->
    <v-alert v-if="!pending && !partner" type="error" class="mb-4">
      <v-alert-title>Partner Not Found</v-alert-title>
      This partner could not be found. It may have been deleted.
      <template #append>
        <v-btn variant="text" @click="goBack">Go Back</v-btn>
      </template>
    </v-alert>

    <!-- Partner Details -->
    <template v-if="partner">
      <!-- View Mode -->
      <v-card v-if="!isEditing">
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="info">
            <v-icon start>mdi-information</v-icon>
            Info
          </v-tab>
          <v-tab value="contact">
            <v-icon start>mdi-account-box</v-icon>
            Contact
          </v-tab>
          <v-tab value="visits">
            <v-icon start>mdi-map-marker-check</v-icon>
            Visits
            <v-badge v-if="partnerVisits.length" :content="partnerVisits.length" color="teal" inline class="ml-1" />
          </v-tab>
          <v-tab value="events">
            <v-icon start>mdi-calendar-star</v-icon>
            Events
            <v-badge v-if="partnerEvents.length" :content="partnerEvents.length" color="purple" inline class="ml-1" />
          </v-tab>
          <v-tab value="membership">
            <v-icon start>mdi-card-account-details</v-icon>
            Membership
          </v-tab>
        </v-tabs>

        <v-card-text>
          <v-window v-model="activeTab">
            <!-- Info Tab -->
            <v-window-item value="info">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Partner Type</div>
                  <div class="text-body-1">{{ formatTypeName(partner.partner_type) }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Status</div>
                  <v-chip :color="getPartnerStatusColor(partner.status)" size="small">
                    {{ partner.status }}
                  </v-chip>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Services Provided</div>
                  <div class="text-body-1">{{ partner.services_provided || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Proximity</div>
                  <div class="text-body-1">{{ partner.proximity_to_location || 'N/A' }}</div>
                </v-col>
                <v-col cols="12">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Notes</div>
                  <div class="text-body-1" style="white-space: pre-wrap;">{{ partner.notes || 'No notes' }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Last Contact</div>
                  <div class="text-body-1">{{ formatPartnerDate(partner.last_contact_date) || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Created</div>
                  <div class="text-body-1">{{ formatPartnerDate(partner.created_at) || 'N/A' }}</div>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Contact Tab -->
            <v-window-item value="contact">
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Contact Name</div>
                  <div class="text-body-1">{{ partner.contact_name || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Phone</div>
                  <div class="text-body-1">
                    <a v-if="partner.contact_phone" :href="`tel:${partner.contact_phone}`">
                      {{ partner.contact_phone }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Email</div>
                  <div class="text-body-1">
                    <a v-if="partner.contact_email" :href="`mailto:${partner.contact_email}`">
                      {{ partner.contact_email }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Website</div>
                  <div class="text-body-1">
                    <a v-if="partner.website" :href="partner.website" target="_blank" rel="noopener noreferrer">
                      {{ partner.website }}
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Address</div>
                  <div class="text-body-1">{{ partner.address || 'N/A' }}</div>
                </v-col>
                <v-col cols="12">
                  <v-divider class="my-2" />
                  <div class="text-subtitle-2 text-medium-emphasis mb-2">Social Media</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">
                    <v-icon size="small" class="mr-1">mdi-instagram</v-icon>Instagram
                  </div>
                  <div class="text-body-1">{{ partner.instagram_handle || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">
                    <v-icon size="small" class="mr-1">mdi-facebook</v-icon>Facebook
                  </div>
                  <div class="text-body-1">
                    <a v-if="partner.facebook_url" :href="partner.facebook_url" target="_blank" rel="noopener noreferrer">
                      View Profile
                    </a>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">
                    <v-icon size="small" class="mr-1">mdi-music-note</v-icon>TikTok
                  </div>
                  <div class="text-body-1">{{ partner.tiktok_handle || 'N/A' }}</div>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Visits Tab -->
            <v-window-item value="visits">
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-subtitle-2">Visit History</div>
                <v-btn color="teal" size="small" variant="tonal" prepend-icon="mdi-map-marker-plus" @click="showQuickVisitDialog = true">
                  Log Visit
                </v-btn>
              </div>

              <v-progress-linear v-if="loadingVisits" indeterminate color="teal" class="mb-3" />

              <v-timeline v-if="partnerVisits.length" density="compact" side="end">
                <v-timeline-item
                  v-for="visit in partnerVisits"
                  :key="visit.id"
                  :dot-color="getVisitTypeColor(visit.visit_type)"
                  size="small"
                >
                  <div>
                    <div class="d-flex justify-space-between align-center flex-wrap">
                      <v-chip size="x-small" :color="getVisitTypeColor(visit.visit_type)" variant="tonal">
                        <v-icon start size="12">{{ getVisitTypeIcon(visit.visit_type) }}</v-icon>
                        {{ formatVisitType(visit.visit_type) }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">
                        {{ new Date(visit.visit_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) }}
                      </span>
                    </div>
                    <div v-if="visit.spoke_to" class="text-body-2 mt-1">
                      <v-icon size="14">mdi-account</v-icon> Spoke with: <strong>{{ visit.spoke_to }}</strong>
                    </div>
                    <div v-if="visit.items_dropped_off?.length" class="mt-1">
                      <v-icon size="14" color="teal">mdi-package-variant</v-icon>
                      Dropped off:
                      <v-chip v-for="item in visit.items_dropped_off" :key="item" size="x-small" color="teal" variant="tonal" class="mr-1">
                        {{ item.replace(/_/g, ' ') }}
                      </v-chip>
                    </div>
                    <div v-if="visit.items_discussed?.length" class="mt-1">
                      <v-icon size="14" color="primary">mdi-chat</v-icon>
                      Discussed:
                      <v-chip v-for="item in visit.items_discussed" :key="item" size="x-small" color="primary" variant="tonal" class="mr-1">
                        {{ item.replace(/_/g, ' ') }}
                      </v-chip>
                    </div>
                    <div v-if="visit.visit_notes" class="text-body-2 mt-1" style="white-space: pre-wrap;">{{ visit.visit_notes }}</div>
                    <div v-if="visit.outcome" class="text-caption mt-1"><strong>Outcome:</strong> {{ visit.outcome }}</div>
                    <div v-if="visit.next_steps" class="text-caption text-primary"><strong>Next:</strong> {{ visit.next_steps }}</div>
                    <div v-if="visit.next_visit_date" class="text-caption text-info mt-1">
                      <v-icon size="12">mdi-calendar-clock</v-icon>
                      Next visit: {{ new Date(visit.next_visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>

              <div v-else-if="!loadingVisits" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-map-marker-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No visits logged yet</div>
                <v-btn color="teal" class="mt-3" size="small" variant="tonal" @click="showQuickVisitDialog = true">
                  Log First Visit
                </v-btn>
              </div>
            </v-window-item>

            <!-- Events Tab -->
            <v-window-item value="events">
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-subtitle-2">Event Participation</div>
                <v-btn color="purple" size="small" variant="tonal" prepend-icon="mdi-calendar-plus" @click="openAddEventDialog">
                  Link to Event
                </v-btn>
              </div>

              <v-progress-linear v-if="loadingEvents" indeterminate color="purple" class="mb-3" />

              <div v-if="partnerEvents.length">
                <v-card v-for="ep in partnerEvents" :key="ep.id" variant="outlined" class="mb-3">
                  <v-card-text class="d-flex align-center">
                    <v-avatar color="purple" size="40" class="mr-3" variant="tonal">
                      <v-icon>mdi-calendar-star</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <div class="font-weight-medium">
                        {{ ep.marketing_events?.name || 'Unknown Event' }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ ep.marketing_events?.event_date ? new Date(ep.marketing_events.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '' }}
                        <span v-if="ep.marketing_events?.location"> — {{ ep.marketing_events.location }}</span>
                      </div>
                      <div class="d-flex gap-2 mt-1">
                        <v-chip :color="getEventRoleColor(ep.role)" size="x-small" variant="flat">
                          {{ ep.role }}
                        </v-chip>
                        <v-chip v-if="ep.is_confirmed" color="success" size="x-small" variant="tonal">
                          <v-icon start size="10">mdi-check</v-icon> Confirmed
                        </v-chip>
                        <v-chip v-else color="warning" size="x-small" variant="tonal">Pending</v-chip>
                      </div>
                      <div v-if="ep.booth_info" class="text-caption mt-1">
                        <v-icon size="12">mdi-tent</v-icon> {{ ep.booth_info }}
                      </div>
                      <div v-if="ep.notes" class="text-caption mt-1">{{ ep.notes }}</div>
                    </div>
                    <v-btn icon variant="text" size="small" color="error" @click="removeEventParticipation(ep.id)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </v-card-text>
                </v-card>
              </div>

              <div v-else-if="!loadingEvents" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-calendar-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis mt-2">No event participation recorded</div>
                <v-btn color="purple" class="mt-3" size="small" variant="tonal" @click="openAddEventDialog">
                  Link to Event
                </v-btn>
              </div>
            </v-window-item>

            <!-- Membership Tab -->
            <v-window-item value="membership">
              <v-row>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Membership Level</div>
                  <div class="text-body-1">{{ partner.membership_level || 'N/A' }}</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Annual Fee</div>
                  <div class="text-body-1">
                    {{ partner.membership_fee ? `$${partner.membership_fee}` : 'N/A' }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Expiration</div>
                  <div class="text-body-1">
                    <v-chip 
                      v-if="partner.membership_end" 
                      :color="new Date(partner.membership_end) < new Date() ? 'error' : 'success'"
                      size="small"
                    >
                      {{ formatPartnerDate(partner.membership_end) }}
                    </v-chip>
                    <span v-else>N/A</span>
                  </div>
                </v-col>
                <v-col cols="12" v-if="partner.events_attended?.length">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Events Attended</div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip 
                      v-for="event in partner.events_attended" 
                      :key="event" 
                      size="small"
                      color="primary"
                      variant="tonal"
                    >
                      {{ event }}
                    </v-chip>
                  </div>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>

      <!-- Edit Mode -->
      <v-card v-else>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-pencil</v-icon>
          Edit Partner
          <v-spacer />
          <v-btn icon variant="text" aria-label="Close" @click="cancelEditing" :disabled="isSaving">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="editForm.name"
                label="Partner Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="editForm.partner_type"
                :items="partnerTypes"
                label="Type *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="editForm.status"
                :items="statusOptions"
                label="Status *"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Contact Information</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.contact_name"
                label="Contact Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.contact_phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.contact_email"
                label="Email"
                variant="outlined"
                density="compact"
                type="email"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.website"
                label="Website"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-web"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.address"
                label="Address"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-map-marker"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Social Media</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.facebook_url"
                label="Facebook URL"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-facebook"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.tiktok_handle"
                label="TikTok Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-music-note"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Membership</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.membership_level"
                label="Membership Level"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="editForm.membership_fee"
                label="Annual Fee ($)"
                variant="outlined"
                density="compact"
                type="number"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="editForm.membership_end"
                label="Expiration Date"
                variant="outlined"
                density="compact"
                type="date"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Additional Info</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.services_provided"
                label="Services Provided"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.proximity_to_location"
                label="Proximity to Location"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="editForm.notes"
                label="Notes"
                variant="outlined"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="cancelEditing" :disabled="isSaving">
            Cancel
          </v-btn>
          <v-btn 
            color="primary" 
            @click="savePartner" 
            :loading="isSaving"
            :disabled="!editForm.name"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>

    <!-- Quick Visit Dialog -->
    <MarketingPartnerQuickVisitDialog
      v-if="partner"
      v-model="showQuickVisitDialog"
      :partners="partner ? [partner] : []"
      :preselected-partner="partner"
      @saved="handleVisitSaved"
      @notify="({ message, color }) => color === 'success' ? showSuccess(message) : showError(message)"
    />

    <!-- Add Event Participation Dialog -->
    <v-dialog v-model="showAddEventDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-calendar-plus</v-icon>
          Link to Event
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-autocomplete
            v-model="eventForm.event_id"
            :items="availableEvents"
            item-title="name"
            item-value="id"
            label="Select Event *"
            variant="outlined"
            density="compact"
            class="mb-3"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #subtitle>
                  {{ item.raw.event_date ? new Date(item.raw.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '' }}
                  {{ item.raw.location ? ` — ${item.raw.location}` : '' }}
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
          <v-select
            v-model="eventForm.role"
            :items="eventRoleOptions"
            label="Role"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model="eventForm.booth_info"
            label="Booth / Setup Info"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-textarea
            v-model="eventForm.notes"
            label="Notes"
            variant="outlined"
            density="compact"
            rows="2"
            class="mb-3"
          />
          <v-switch v-model="eventForm.is_confirmed" label="Confirmed?" color="success" hide-details />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddEventDialog = false">Cancel</v-btn>
          <v-btn color="purple" :disabled="!eventForm.event_id" @click="saveEventParticipation">
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
