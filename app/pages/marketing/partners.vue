<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const supabase = useSupabaseClient()
const route = useRoute()

// Type definitions
interface Partner {
  id: string
  name: string
  partner_type: string
  status: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  address: string | null
  membership_level: string | null
  membership_fee: number | null
  membership_end: string | null
  instagram_handle: string | null
  services_provided: string | null
  notes: string | null
  proximity_to_location: string | null
  created_at: string
  // Combined list flag
  _isInfluencer?: boolean
}

interface Influencer {
  id: string
  contact_name: string
  pet_name: string | null
  phone: string | null
  email: string | null
  status: string
  promo_code: string | null
  instagram_handle: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_handle: string | null
  youtube_url: string | null
  follower_count: number | null
  highest_platform: string | null
  location: string | null
  agreement_details: string | null
  notes: string | null
  posts_completed: number
  stories_completed: number
  reels_completed: number
  created_at: string
}

// Filter state
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const selectedService = ref<string | null>(null)

// Service options for pet businesses
const serviceOptions = [
  { title: 'All Services', value: null },
  { title: 'Groomer', value: 'Groomer' },
  { title: 'Daycare', value: 'Daycare' },
  { title: 'Retail', value: 'Retail' },
  { title: 'Hotel', value: 'Hotel' },
  { title: 'Rescue/Shelter', value: 'Rescue' },
  { title: 'Trainer', value: 'Trainer' },
  { title: 'Other', value: 'Other' }
]

// Partner type options
const partnerTypes = [
  { title: 'All Types', value: null },
  { title: 'Pet Business', value: 'pet_business' },
  { title: 'Exotic Shop', value: 'exotic_shop' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Influencer', value: 'influencer' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Print Vendor', value: 'print_vendor' },
  { title: 'Chamber of Commerce', value: 'chamber' },
  { title: 'Food & Beverage', value: 'food_vendor' },
  { title: 'Association', value: 'association' },
  { title: 'Spay & Neuter', value: 'spay_neuter' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'All Statuses', value: null },
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Expired', value: 'expired' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Completed', value: 'completed' }
]

// Fetch partners
const { data: partners, pending, refresh } = await useAsyncData('partners', async () => {
  const { data, error } = await supabase
    .from('marketing_partners')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as Partner[]
})

// Fetch influencers
const { data: influencers, pending: influencersPending, refresh: refreshInfluencers } = await useAsyncData('influencers', async () => {
  const { data, error } = await supabase
    .from('marketing_influencers')
    .select('*')
    .order('contact_name')
  
  if (error) throw error
  return data as Influencer[]
})

// Combined list: partners + influencers transformed to partner-like format
const combinedList = computed(() => {
  const partnerList = (partners.value || []).map(p => ({ ...p, _isInfluencer: false }))
  
  // Transform influencers to partner-like format for unified display
  const influencerList = (influencers.value || []).map(inf => ({
    id: inf.id,
    name: inf.contact_name + (inf.pet_name ? ` (${inf.pet_name})` : ''),
    partner_type: 'influencer',
    status: inf.status,
    contact_name: inf.contact_name,
    contact_phone: inf.phone,
    contact_email: inf.email,
    website: inf.instagram_url,
    address: inf.location,
    membership_level: null,
    membership_fee: null,
    membership_end: null,
    instagram_handle: inf.instagram_handle,
    services_provided: inf.promo_code ? `Promo: ${inf.promo_code}` : null,
    notes: inf.notes,
    proximity_to_location: null,
    created_at: inf.created_at,
    _isInfluencer: true,
    // Keep original influencer data for edit dialog
    _influencerData: inf
  })) as (Partner & { _influencerData?: Influencer })[]
  
  return [...partnerList, ...influencerList]
})

// Filtered partners (now uses combined list)
const filteredPartners = computed(() => {
  let result = combinedList.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.contact_name?.toLowerCase().includes(query) ||
      p.contact_email?.toLowerCase().includes(query) ||
      p.notes?.toLowerCase().includes(query) ||
      p.services_provided?.toLowerCase().includes(query) ||
      p.address?.toLowerCase().includes(query)
    )
  }
  
  if (selectedType.value) {
    result = result.filter(p => p.partner_type === selectedType.value)
  }
  
  if (selectedStatus.value) {
    result = result.filter(p => p.status === selectedStatus.value)
  }
  
  if (selectedService.value) {
    result = result.filter(p => 
      p.services_provided?.toLowerCase().includes(selectedService.value!.toLowerCase())
    )
  }
  
  return result
})

// Stats by type (includes influencers)
const statsByType = computed(() => {
  const stats: Record<string, number> = {}
  for (const p of combinedList.value || []) {
    stats[p.partner_type] = (stats[p.partner_type] || 0) + 1
  }
  return stats
})

// Dialog state
const dialogOpen = ref(false)
const editingPartner = ref<Partner | null>(null)
const formData = ref({
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
  services_provided: '',
  notes: ''
})

// Influencer dialog state
const influencerDialogOpen = ref(false)
const editingInfluencer = ref<Influencer | null>(null)
const influencerForm = ref({
  contact_name: '',
  pet_name: '',
  phone: '',
  email: '',
  status: 'prospect',
  promo_code: '',
  instagram_handle: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_handle: '',
  youtube_url: '',
  follower_count: null as number | null,
  highest_platform: 'IG',
  location: '',
  agreement_details: '',
  notes: ''
})

const influencerStatusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Prospect', value: 'prospect' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Completed', value: 'completed' }
]

// Check if we should open add dialog from URL
onMounted(() => {
  if (route.query.action === 'add') {
    openAddDialog()
  }
})

function openAddDialog() {
  editingPartner.value = null
  formData.value = {
    name: '',
    partner_type: 'other',
    status: 'prospect',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    website: '',
    address: '',
    membership_level: '',
    membership_fee: null,
    membership_end: '',
    instagram_handle: '',
    services_provided: '',
    notes: ''
  }
  dialogOpen.value = true
}

function openEditDialog(partner: Partner) {
  editingPartner.value = partner
  formData.value = {
    name: partner.name,
    partner_type: partner.partner_type,
    status: partner.status,
    contact_name: partner.contact_name || '',
    contact_phone: partner.contact_phone || '',
    contact_email: partner.contact_email || '',
    website: partner.website || '',
    address: partner.address || '',
    membership_level: partner.membership_level || '',
    membership_fee: partner.membership_fee,
    membership_end: partner.membership_end || '',
    instagram_handle: partner.instagram_handle || '',
    services_provided: partner.services_provided || '',
    notes: partner.notes || ''
  }
  dialogOpen.value = true
}

async function savePartner() {
  const payload = {
    name: formData.value.name,
    partner_type: formData.value.partner_type,
    status: formData.value.status,
    contact_name: formData.value.contact_name || null,
    contact_phone: formData.value.contact_phone || null,
    contact_email: formData.value.contact_email || null,
    website: formData.value.website || null,
    address: formData.value.address || null,
    membership_level: formData.value.membership_level || null,
    membership_fee: formData.value.membership_fee,
    membership_end: formData.value.membership_end || null,
    instagram_handle: formData.value.instagram_handle || null,
    services_provided: formData.value.services_provided || null,
    notes: formData.value.notes || null
  }
  
  if (editingPartner.value) {
    await supabase
      .from('marketing_partners')
      .update(payload)
      .eq('id', editingPartner.value.id)
  } else {
    await supabase
      .from('marketing_partners')
      .insert(payload)
  }
  
  dialogOpen.value = false
  refresh()
}

async function deletePartner(id: string) {
  if (!confirm('Are you sure you want to delete this partner?')) return
  
  await supabase
    .from('marketing_partners')
    .delete()
    .eq('id', id)
  
  refresh()
}

// Influencer functions
function openAddInfluencerDialog() {
  editingInfluencer.value = null
  influencerForm.value = {
    contact_name: '',
    pet_name: '',
    phone: '',
    email: '',
    status: 'prospect',
    promo_code: '',
    instagram_handle: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_handle: '',
    youtube_url: '',
    follower_count: null,
    highest_platform: 'IG',
    location: '',
    agreement_details: '',
    notes: ''
  }
  influencerDialogOpen.value = true
}

function openEditInfluencerDialog(influencer: Influencer) {
  editingInfluencer.value = influencer
  influencerForm.value = {
    contact_name: influencer.contact_name,
    pet_name: influencer.pet_name || '',
    phone: influencer.phone || '',
    email: influencer.email || '',
    status: influencer.status,
    promo_code: influencer.promo_code || '',
    instagram_handle: influencer.instagram_handle || '',
    instagram_url: influencer.instagram_url || '',
    facebook_url: influencer.facebook_url || '',
    tiktok_handle: influencer.tiktok_handle || '',
    youtube_url: influencer.youtube_url || '',
    follower_count: influencer.follower_count,
    highest_platform: influencer.highest_platform || 'IG',
    location: influencer.location || '',
    agreement_details: influencer.agreement_details || '',
    notes: influencer.notes || ''
  }
  influencerDialogOpen.value = true
}

async function saveInfluencer() {
  const payload = {
    contact_name: influencerForm.value.contact_name,
    pet_name: influencerForm.value.pet_name || null,
    phone: influencerForm.value.phone || null,
    email: influencerForm.value.email || null,
    status: influencerForm.value.status,
    promo_code: influencerForm.value.promo_code || null,
    instagram_handle: influencerForm.value.instagram_handle || null,
    instagram_url: influencerForm.value.instagram_url || null,
    facebook_url: influencerForm.value.facebook_url || null,
    tiktok_handle: influencerForm.value.tiktok_handle || null,
    youtube_url: influencerForm.value.youtube_url || null,
    follower_count: influencerForm.value.follower_count,
    highest_platform: influencerForm.value.highest_platform || null,
    location: influencerForm.value.location || null,
    agreement_details: influencerForm.value.agreement_details || null,
    notes: influencerForm.value.notes || null
  }
  
  if (editingInfluencer.value) {
    await supabase
      .from('marketing_influencers')
      .update(payload)
      .eq('id', editingInfluencer.value.id)
  } else {
    await supabase
      .from('marketing_influencers')
      .insert(payload)
  }
  
  influencerDialogOpen.value = false
  refreshInfluencers()
}

async function deleteInfluencer(id: string) {
  if (!confirm('Are you sure you want to delete this influencer?')) return
  
  await supabase
    .from('marketing_influencers')
    .delete()
    .eq('id', id)
  
  refreshInfluencers()
}

// Handle clicking on list item - route to correct dialog based on type
function handleItemClick(partner: Partner & { _influencerData?: Influencer }) {
  if (partner._isInfluencer && partner._influencerData) {
    openEditInfluencerDialog(partner._influencerData)
  } else {
    openEditDialog(partner)
  }
}

// Handle delete - route to correct function based on type
function handleDelete(partner: Partner & { _isInfluencer?: boolean }) {
  if (partner._isInfluencer) {
    deleteInfluencer(partner.id)
  } else {
    deletePartner(partner.id)
  }
}

// Influencer helper functions
function formatFollowers(count: number | null): string {
  if (!count) return ''
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
  return count.toString()
}

function getInfluencerFollowerCount(partner: Partner & { _influencerData?: Influencer }): number | null {
  return partner._influencerData?.follower_count || null
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    pet_business: 'teal',
    exotic_shop: 'lime',
    rescue: 'pink',
    influencer: 'secondary',
    entertainment: 'purple',
    print_vendor: 'brown',
    chamber: 'primary',
    food_vendor: 'orange',
    association: 'indigo',
    spay_neuter: 'cyan',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    pending: 'warning',
    expired: 'error',
    inactive: 'grey',
    prospect: 'info'
  }
  return colors[status] || 'grey'
}

function formatTypeName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" to="/marketing/command-center" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Partnership CRM Hub</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage chambers, vendors, rescues, influencers, and business partners
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="secondary"
        prepend-icon="mdi-star-circle"
        class="mr-2"
        @click="openAddInfluencerDialog"
      >
        Add Influencer
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddDialog"
      >
        Add Partner
      </v-btn>
    </div>

    <!-- Type Pills -->
    <div class="d-flex flex-wrap gap-2 mb-4">
      <v-chip
        v-for="(count, type) in statsByType"
        :key="type"
        :color="selectedType === type ? getTypeColor(type as string) : undefined"
        :variant="selectedType === type ? 'elevated' : 'outlined'"
        @click="selectedType = selectedType === type ? null : (type as string)"
      >
        {{ formatTypeName(type as string) }}
        <template #append>
          <v-avatar size="20" class="ml-1" :color="getTypeColor(type as string)">
            {{ count }}
          </v-avatar>
        </template>
      </v-chip>
    </div>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              label="Search partners..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="selectedType"
              :items="partnerTypes"
              label="Type"
              variant="outlined"
              density="compact"
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
        </v-row>
        <v-row v-if="selectedType === 'pet_business' || selectedType === 'rescue'" dense class="mt-2">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedService"
              :items="serviceOptions"
              label="Filter by Service"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="8" class="d-flex align-center">
            <span class="text-caption text-medium-emphasis">
              Showing {{ filteredPartners.length }} of {{ combinedList?.length || 0 }} contacts
            </span>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Partners List -->
    <v-card>
      <v-progress-linear v-if="pending || influencersPending" indeterminate color="primary" />
      
      <v-list v-if="filteredPartners.length > 0" lines="three">
        <template v-for="(partner, index) in filteredPartners" :key="partner.id">
          <v-list-item @click="handleItemClick(partner)">
            <template #prepend>
              <v-avatar :color="getTypeColor(partner.partner_type)" size="40">
                <v-icon color="white">
                  {{
                    partner.partner_type === 'pet_business' ? 'mdi-dog' :
                    partner.partner_type === 'exotic_shop' ? 'mdi-snake' :
                    partner.partner_type === 'rescue' ? 'mdi-paw' :
                    partner.partner_type === 'influencer' ? 'mdi-star-circle' :
                    partner.partner_type === 'entertainment' ? 'mdi-party-popper' :
                    partner.partner_type === 'print_vendor' ? 'mdi-printer' :
                    partner.partner_type === 'chamber' ? 'mdi-office-building' :
                    partner.partner_type === 'food_vendor' ? 'mdi-food' :
                    partner.partner_type === 'association' ? 'mdi-account-group' :
                    partner.partner_type === 'spay_neuter' ? 'mdi-medical-bag' :
                    'mdi-handshake'
                  }}
                </v-icon>
              </v-avatar>
            </template>
            
            <v-list-item-title class="font-weight-medium">
              {{ partner.name }}
              <v-chip v-if="partner._isInfluencer && getInfluencerFollowerCount(partner)" size="x-small" color="secondary" variant="tonal" class="ml-2">
                {{ formatFollowers(getInfluencerFollowerCount(partner)) }} followers
              </v-chip>
            </v-list-item-title>
            
            <v-list-item-subtitle>
              <div class="d-flex align-center flex-wrap gap-2 mt-1">
                <v-chip size="x-small" :color="getStatusColor(partner.status)" variant="flat">
                  {{ partner.status }}
                </v-chip>
                <v-chip v-if="partner.services_provided" size="x-small" color="info" variant="tonal">
                  {{ partner.services_provided }}
                </v-chip>
                <span v-if="partner.contact_phone">
                  <v-icon size="x-small">mdi-phone</v-icon>
                  {{ partner.contact_phone }}
                </span>
                <span v-if="partner.contact_email">
                  <v-icon size="x-small">mdi-email</v-icon>
                  {{ partner.contact_email }}
                </span>
              </div>
              <div v-if="partner.notes" class="text-truncate mt-1" style="max-width: 500px;">
                {{ partner.notes }}
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex flex-column align-end gap-1">
                <v-chip
                  v-if="partner.membership_end"
                  size="x-small"
                  :color="new Date(partner.membership_end) < new Date() ? 'error' : 'success'"
                  variant="tonal"
                >
                  {{ new Date(partner.membership_end) < new Date() ? 'Expired' : 'Expires' }}
                  {{ new Date(partner.membership_end).toLocaleDateString() }}
                </v-chip>
                <div v-if="partner.membership_fee" class="text-caption">
                  ${{ partner.membership_fee }}/year
                </div>
              </div>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                class="ml-2"
                @click.stop="handleDelete(partner)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </template>
          </v-list-item>
          <v-divider v-if="index < filteredPartners.length - 1" />
        </template>
      </v-list>

      <v-card-text v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-handshake-outline</v-icon>
        <div class="text-h6 mt-4">No contacts found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedType || selectedStatus ? 'Try adjusting your filters' : 'Add your first partner or influencer to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedType && !selectedStatus"
          color="primary"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Partner
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingPartner ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingPartner ? 'Edit Partner' : 'Add Partner' }}
          <v-spacer />
          <v-btn icon variant="text" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.name"
                label="Partner Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="formData.partner_type"
                :items="partnerTypes.filter(t => t.value !== null)"
                label="Type *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="formData.status"
                :items="statusOptions.filter(s => s.value !== null)"
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
                v-model="formData.contact_name"
                label="Contact Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_email"
                label="Email"
                variant="outlined"
                density="compact"
                type="email"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.website"
                label="Website"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-web"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
              />
            </v-col>
            
            <v-col cols="12">
              <v-text-field
                v-model="formData.address"
                label="Address"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Membership Details</div>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.membership_level"
                label="Membership Level"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.membership_fee"
                label="Annual Fee ($)"
                variant="outlined"
                density="compact"
                type="number"
                prefix="$"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.membership_end"
                label="Expiration Date"
                variant="outlined"
                density="compact"
                type="date"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.services_provided"
                label="Services Provided"
                variant="outlined"
                density="compact"
                rows="2"
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
          <v-btn variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" @click="savePartner">
            {{ editingPartner ? 'Save Changes' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Influencer Dialog -->
    <v-dialog v-model="influencerDialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingInfluencer ? 'mdi-pencil' : 'mdi-star-circle' }}</v-icon>
          {{ editingInfluencer ? 'Edit Influencer' : 'Add Influencer' }}
          <v-spacer />
          <v-btn icon variant="text" @click="influencerDialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.contact_name"
                label="Contact Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.pet_name"
                label="Pet Name"
                variant="outlined"
                prepend-inner-icon="mdi-paw"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-select
                v-model="influencerForm.status"
                :items="influencerStatusOptions"
                label="Status *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                v-model="influencerForm.promo_code"
                label="Promo Code"
                variant="outlined"
                placeholder="e.g., SAWYER20"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.location"
                label="Location"
                variant="outlined"
                prepend-inner-icon="mdi-map-marker"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Contact Information</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.email"
                label="Email"
                variant="outlined"
                density="compact"
                type="email"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Social Media</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.instagram_handle"
                label="Instagram Handle"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-instagram"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="influencerForm.instagram_url"
                label="Instagram URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.tiktok_handle"
                label="TikTok Handle"
                variant="outlined"
                density="compact"
                prefix="@"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.youtube_url"
                label="YouTube URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="influencerForm.facebook_url"
                label="Facebook URL"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="6" md="4">
              <v-text-field
                v-model.number="influencerForm.follower_count"
                label="Follower Count"
                variant="outlined"
                density="compact"
                type="number"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-select
                v-model="influencerForm.highest_platform"
                :items="['IG', 'TikTok', 'YouTube', 'Facebook', 'Twitter']"
                label="Primary Platform"
                variant="outlined"
                density="compact"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="influencerForm.agreement_details"
                label="Agreement Details"
                variant="outlined"
                rows="3"
                placeholder="e.g., Collaboration Reel with promo code, 2 IG Stories, Green Dog Experience filming..."
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="influencerForm.notes"
                label="Notes"
                variant="outlined"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="influencerDialogOpen = false">Cancel</v-btn>
          <v-btn color="secondary" @click="saveInfluencer">
            {{ editingInfluencer ? 'Save Changes' : 'Add Influencer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
