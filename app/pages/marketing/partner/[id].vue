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
})

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

// Helper functions
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

function formatDate(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" @click="goBack" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="flex-grow-1">
        <div class="d-flex align-center gap-3">
          <h1 class="text-h4 font-weight-bold">
            {{ partner?.name || 'Partner Details' }}
          </h1>
          <v-chip v-if="partner" :color="getTypeColor(partner.partner_type)" size="small">
            {{ formatTypeName(partner.partner_type) }}
          </v-chip>
          <v-chip v-if="partner" :color="getStatusColor(partner.status)" size="small" variant="tonal">
            {{ partner.status }}
          </v-chip>
        </div>
        <p v-if="partner?.contact_name" class="text-subtitle-1 text-medium-emphasis mt-1">
          Contact: {{ partner.contact_name }}
        </p>
      </div>
      <v-btn
        v-if="!isEditing"
        color="primary"
        prepend-icon="mdi-pencil"
        @click="startEditing"
      >
        Edit
      </v-btn>
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
                  <v-chip :color="getStatusColor(partner.status)" size="small">
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
                  <div class="text-body-1">{{ formatDate(partner.last_contact_date) }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis mb-1">Created</div>
                  <div class="text-body-1">{{ formatDate(partner.created_at) }}</div>
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
                    <a v-if="partner.website" :href="partner.website" target="_blank" rel="noopener">
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
                    <a v-if="partner.facebook_url" :href="partner.facebook_url" target="_blank" rel="noopener">
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
                      {{ formatDate(partner.membership_end) }}
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
          <v-btn icon variant="text" @click="cancelEditing" :disabled="isSaving">
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
  </div>
</template>
