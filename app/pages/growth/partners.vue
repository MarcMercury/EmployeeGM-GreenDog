<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Referral Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage relationships with referring hospitals
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Partner
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Partners</p>
            <p class="text-h4 font-weight-bold">{{ partners.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="amber-darken-2" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">High Volume</p>
            <p class="text-h4 font-weight-bold">{{ highVolumeCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Active</p>
            <p class="text-h4 font-weight-bold">{{ activeCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="secondary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Referrals</p>
            <p class="text-h4 font-weight-bold">{{ totalReferrals }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Partner Cards Grid -->
    <v-row v-if="!loading && partners.length > 0">
      <v-col
        v-for="partner in sortedPartners"
        :key="partner.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card rounded="lg" class="h-100 partner-card" hover @click="openDetails(partner)">
          <!-- Header with Tier Badge -->
          <v-card-title class="d-flex align-center pa-4 pb-2">
            <v-avatar :color="getTierColor(partner.tier)" size="48" class="mr-3">
              <v-icon color="white" size="24">mdi-hospital-building</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <h3 class="text-h6 font-weight-bold text-truncate">
                {{ partner.hospital_name }}
              </h3>
            </div>
            <v-chip :color="getTierColor(partner.tier)" size="small" label class="ml-2">
              <v-icon start size="14">{{ getTierIcon(partner.tier) }}</v-icon>
              {{ formatTier(partner.tier) }}
            </v-chip>
          </v-card-title>

          <v-card-text class="pb-2">
            <!-- Key Contact -->
            <div class="d-flex align-center mb-2">
              <v-icon size="18" color="grey" class="mr-2">mdi-account</v-icon>
              <span class="text-body-2">{{ partner.contact_person || 'No contact' }}</span>
            </div>

            <!-- Referral Count -->
            <div class="d-flex align-center mb-2">
              <v-icon size="18" color="grey" class="mr-2">mdi-handshake</v-icon>
              <span class="text-body-2">{{ partner.total_referrals }} referrals</span>
            </div>

            <!-- Notes Preview -->
            <p v-if="partner.notes" class="text-caption text-grey text-truncate mb-0">
              {{ partner.notes }}
            </p>
          </v-card-text>

          <v-card-actions class="pa-4 pt-0">
            <v-chip
              :color="partner.is_active ? 'success' : 'grey'"
              size="x-small"
              label
            >
              {{ partner.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
            <v-spacer />
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-note-plus"
              @click.stop="logVisit(partner)"
            >
              Log Visit
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else-if="!loading && partners.length === 0" rounded="lg" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-hospital-building</v-icon>
      <h3 class="text-h6 mt-4">No referral partners yet</h3>
      <p class="text-grey mb-4">Add your first referring hospital partner</p>
      <v-btn color="primary" @click="openAddDialog">Add Partner</v-btn>
    </v-card>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading partners...</p>
    </div>

    <!-- Partner Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedPartner" rounded="lg">
        <v-card-title class="d-flex align-center pa-4">
          <v-avatar :color="getTierColor(selectedPartner.tier)" size="48" class="mr-3">
            <v-icon color="white" size="24">mdi-hospital-building</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <h3 class="text-h6 font-weight-bold">{{ selectedPartner.hospital_name }}</h3>
            <p class="text-body-2 text-grey mb-0">{{ selectedPartner.contact_person }}</p>
          </div>
          <v-chip :color="getTierColor(selectedPartner.tier)" label>
            {{ formatTier(selectedPartner.tier) }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-list density="compact" class="bg-transparent">
            <v-list-item v-if="selectedPartner.email">
              <template #prepend>
                <v-icon color="primary">mdi-email</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.email }}</v-list-item-title>
            </v-list-item>

            <v-list-item v-if="selectedPartner.phone">
              <template #prepend>
                <v-icon color="primary">mdi-phone</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.phone }}</v-list-item-title>
            </v-list-item>

            <v-list-item v-if="selectedPartner.address">
              <template #prepend>
                <v-icon color="primary">mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-handshake</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.total_referrals }} total referrals</v-list-item-title>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <h4 class="text-subtitle-1 font-weight-bold mb-2">Notes & Visit Log</h4>
          <v-textarea
            v-model="editNotes"
            variant="outlined"
            rows="4"
            placeholder="Add notes about visits, conversations, etc."
          />
        </v-card-text>

        <v-card-actions class="px-4 pb-4">
          <v-btn variant="text" color="error" @click="confirmDelete(selectedPartner)">
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">Close</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveNotes">
            Save Notes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="partnerDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-hospital-building</v-icon>
          {{ editMode ? 'Edit Partner' : 'Add Partner' }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="partnerForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="partnerFormData.hospital_name"
                  label="Hospital / Practice Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.contact_person"
                  label="Key Contact"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerFormData.tier"
                  :items="tierOptions"
                  label="Volume Tier *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="partnerFormData.address"
                  label="Address"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="partnerFormData.total_referrals"
                  label="Total Referrals"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="partnerFormData.is_active"
                  label="Active Partner"
                  color="success"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="partnerFormData.notes"
                  label="Notes"
                  rows="3"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="partnerDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="savePartner">
            {{ editMode ? 'Update' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-error text-white py-4">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pt-6">
          Are you sure you want to delete <strong>{{ partnerToDelete?.hospital_name }}</strong>?
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deletePartner">Delete</v-btn>
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
import type { ReferralPartner, ReferralTier } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()

// State
const partners = ref<ReferralPartner[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const partnerDialog = ref(false)
const detailsDialog = ref(false)
const deleteDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)
const selectedPartner = ref<ReferralPartner | null>(null)
const partnerToDelete = ref<ReferralPartner | null>(null)
const editNotes = ref('')

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const partnerFormData = reactive({
  hospital_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tier: 'bronze' as ReferralTier,
  total_referrals: 0,
  notes: '',
  is_active: true
})

const tierOptions = [
  { title: 'Bronze (Low)', value: 'bronze' },
  { title: 'Silver (Medium)', value: 'silver' },
  { title: 'Gold (High)', value: 'gold' },
  { title: 'Platinum (VIP)', value: 'platinum' }
]

// Computed
const sortedPartners = computed(() => {
  const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 }
  return [...partners.value].sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
    if (tierDiff !== 0) return tierDiff
    return b.total_referrals - a.total_referrals
  })
})

const highVolumeCount = computed(() =>
  partners.value.filter(p => p.tier === 'gold' || p.tier === 'platinum').length
)

const activeCount = computed(() =>
  partners.value.filter(p => p.is_active).length
)

const totalReferrals = computed(() =>
  partners.value.reduce((sum, p) => sum + p.total_referrals, 0)
)

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getTierColor = (tier: ReferralTier) => {
  const colors: Record<ReferralTier, string> = {
    bronze: 'brown',
    silver: 'grey',
    gold: 'amber-darken-2',
    platinum: 'blue-grey'
  }
  return colors[tier]
}

const getTierIcon = (tier: ReferralTier) => {
  const icons: Record<ReferralTier, string> = {
    bronze: 'mdi-medal-outline',
    silver: 'mdi-medal',
    gold: 'mdi-trophy',
    platinum: 'mdi-crown'
  }
  return icons[tier]
}

const formatTier = (tier: ReferralTier) =>
  tier.charAt(0).toUpperCase() + tier.slice(1)

const openAddDialog = () => {
  editMode.value = false
  Object.assign(partnerFormData, {
    hospital_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tier: 'bronze',
    total_referrals: 0,
    notes: '',
    is_active: true
  })
  partnerDialog.value = true
}

const openDetails = (partner: ReferralPartner) => {
  selectedPartner.value = partner
  editNotes.value = partner.notes || ''
  detailsDialog.value = true
}

const logVisit = async (partner: ReferralPartner) => {
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
  
  const visitNote = `Visited on ${timestamp} - `
  const newNotes = partner.notes
    ? `${visitNote}\n\n${partner.notes}`
    : visitNote

  try {
    await client
      .from('referral_partners')
      .update({ notes: newNotes })
      .eq('id', partner.id)

    partner.notes = newNotes
    showNotification('Visit logged! Add details in the notes.')
    openDetails(partner)
  } catch (error) {
    console.error('Error logging visit:', error)
    showNotification('Failed to log visit', 'error')
  }
}

const saveNotes = async () => {
  if (!selectedPartner.value) return

  saving.value = true
  try {
    await client
      .from('referral_partners')
      .update({ notes: editNotes.value })
      .eq('id', selectedPartner.value.id)

    selectedPartner.value.notes = editNotes.value
    detailsDialog.value = false
    showNotification('Notes saved')
  } catch (error) {
    console.error('Error saving notes:', error)
    showNotification('Failed to save notes', 'error')
  } finally {
    saving.value = false
  }
}

const savePartner = async () => {
  saving.value = true
  try {
    if (editMode.value && selectedPartner.value) {
      const { error } = await client
        .from('referral_partners')
        .update({
          hospital_name: partnerFormData.hospital_name,
          contact_person: partnerFormData.contact_person || null,
          email: partnerFormData.email || null,
          phone: partnerFormData.phone || null,
          address: partnerFormData.address || null,
          tier: partnerFormData.tier,
          total_referrals: partnerFormData.total_referrals,
          notes: partnerFormData.notes || null,
          is_active: partnerFormData.is_active
        })
        .eq('id', selectedPartner.value.id)

      if (error) throw error
      showNotification('Partner updated successfully')
    } else {
      const { error } = await client
        .from('referral_partners')
        .insert({
          hospital_name: partnerFormData.hospital_name,
          contact_person: partnerFormData.contact_person || null,
          email: partnerFormData.email || null,
          phone: partnerFormData.phone || null,
          address: partnerFormData.address || null,
          tier: partnerFormData.tier,
          total_referrals: partnerFormData.total_referrals,
          notes: partnerFormData.notes || null,
          is_active: partnerFormData.is_active
        })

      if (error) throw error
      showNotification('Partner added successfully')
    }

    partnerDialog.value = false
    await fetchPartners()
  } catch (error) {
    console.error('Error saving partner:', error)
    showNotification('Failed to save partner', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (partner: ReferralPartner) => {
  partnerToDelete.value = partner
  detailsDialog.value = false
  deleteDialog.value = true
}

const deletePartner = async () => {
  if (!partnerToDelete.value) return

  deleting.value = true
  try {
    await client
      .from('referral_partners')
      .delete()
      .eq('id', partnerToDelete.value.id)

    deleteDialog.value = false
    showNotification('Partner deleted')
    await fetchPartners()
  } catch (error) {
    console.error('Error deleting partner:', error)
    showNotification('Failed to delete partner', 'error')
  } finally {
    deleting.value = false
  }
}

const fetchPartners = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('referral_partners')
      .select('*')
      .order('hospital_name')

    if (error) throw error
    partners.value = data || []
  } catch (error) {
    console.error('Error fetching partners:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPartners()
})
</script>

<style scoped>
.partner-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.partner-card:hover {
  transform: translateY(-4px);
}
</style>
