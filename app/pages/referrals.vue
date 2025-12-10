<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Referral Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage referring hospitals and track referral activity
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddDialog"
      >
        Add Partner
      </v-btn>
    </div>

    <!-- Stats Cards -->
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
        <v-card color="success" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Active Partners</p>
            <p class="text-h4 font-weight-bold">{{ activePartners }}</p>
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
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Platinum Partners</p>
            <p class="text-h4 font-weight-bold">{{ platinumPartners }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4" rounded="lg">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search partners..."
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="tierFilter"
              :items="tierOptions"
              label="Filter by Tier"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Partners Table -->
    <v-card rounded="lg">
      <v-data-table
        :headers="headers"
        :items="filteredPartners"
        :search="search"
        :loading="loading"
        hover
      >
        <template #item.hospital_name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="getTierColor(item.tier)" size="40" class="mr-3">
              <v-icon color="white">mdi-hospital-building</v-icon>
            </v-avatar>
            <div>
              <p class="font-weight-medium">{{ item.hospital_name }}</p>
              <p class="text-caption text-grey">{{ item.contact_person }}</p>
            </div>
          </div>
        </template>

        <template #item.tier="{ item }">
          <v-chip :color="getTierColor(item.tier)" size="small" label>
            <v-icon start size="14">{{ getTierIcon(item.tier) }}</v-icon>
            {{ item.tier.charAt(0).toUpperCase() + item.tier.slice(1) }}
          </v-chip>
        </template>

        <template #item.total_referrals="{ item }">
          <span class="font-weight-bold">{{ item.total_referrals }}</span>
        </template>

        <template #item.is_active="{ item }">
          <v-chip
            :color="item.is_active ? 'success' : 'grey'"
            size="small"
            label
          >
            {{ item.is_active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon
            size="small"
            variant="text"
            color="primary"
            @click="openEditDialog(item)"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit</v-tooltip>
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="text"
            color="success"
            @click="addReferral(item)"
          >
            <v-icon>mdi-plus-circle</v-icon>
            <v-tooltip activator="parent" location="top">Log Referral</v-tooltip>
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Delete</v-tooltip>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-handshake</v-icon>
            <h3 class="text-h6 mt-4">No referral partners yet</h3>
            <p class="text-grey">Add your first referring hospital partner</p>
            <v-btn
              color="primary"
              class="mt-4"
              @click="openAddDialog"
            >
              Add Partner
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="partnerDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-hospital-building</v-icon>
          {{ editingPartner ? 'Edit Partner' : 'Add New Partner' }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="partnerForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="partnerFormData.hospital_name"
                  label="Hospital / Practice Name *"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.contact_person"
                  label="Contact Person"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerFormData.tier"
                  :items="tierOptions"
                  label="Tier *"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.email"
                  label="Email"
                  type="email"
                  :rules="[rules.email]"
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
          <v-btn variant="text" @click="partnerDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!formValid"
            @click="savePartner"
          >
            {{ editingPartner ? 'Update' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-error text-white py-4">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pt-6">
          Are you sure you want to delete <strong>{{ partnerToDelete?.hospital_name }}</strong>? 
          This action cannot be undone.
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            :loading="deleting"
            @click="deletePartner"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" @click="snackbar = false">Close</v-btn>
      </template>
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
const search = ref('')
const tierFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)
const partnerDialog = ref(false)
const deleteDialog = ref(false)
const editingPartner = ref<ReferralPartner | null>(null)
const partnerToDelete = ref<ReferralPartner | null>(null)
const formValid = ref(false)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Form data
const initialFormData = {
  hospital_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tier: 'bronze' as ReferralTier,
  total_referrals: 0,
  notes: '',
  is_active: true
}

const partnerFormData = ref({ ...initialFormData })

// Validation rules
const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => !v || /.+@.+\..+/.test(v) || 'Invalid email format'
}

// Options
const tierOptions = ['bronze', 'silver', 'gold', 'platinum']
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' }
]

// Table headers
const headers = [
  { title: 'Hospital', key: 'hospital_name', sortable: true },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Phone', key: 'phone', sortable: false },
  { title: 'Tier', key: 'tier', sortable: true },
  { title: 'Referrals', key: 'total_referrals', sortable: true, align: 'center' as const },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const activePartners = computed(() => partners.value.filter(p => p.is_active).length)
const totalReferrals = computed(() => partners.value.reduce((sum, p) => sum + p.total_referrals, 0))
const platinumPartners = computed(() => partners.value.filter(p => p.tier === 'platinum').length)

const filteredPartners = computed(() => {
  let result = partners.value

  if (tierFilter.value) {
    result = result.filter(p => p.tier === tierFilter.value)
  }

  if (statusFilter.value) {
    result = result.filter(p => 
      statusFilter.value === 'active' ? p.is_active : !p.is_active
    )
  }

  return result
})

// Methods
const getTierColor = (tier: ReferralTier) => {
  const colors: Record<ReferralTier, string> = {
    bronze: 'brown',
    silver: 'grey',
    gold: 'amber',
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

const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
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
    showNotification('Failed to load partners', 'error')
  } finally {
    loading.value = false
  }
}

const openAddDialog = () => {
  editingPartner.value = null
  partnerFormData.value = { ...initialFormData }
  partnerDialog.value = true
}

const openEditDialog = (partner: ReferralPartner) => {
  editingPartner.value = partner
  partnerFormData.value = {
    hospital_name: partner.hospital_name,
    contact_person: partner.contact_person || '',
    email: partner.email || '',
    phone: partner.phone || '',
    address: partner.address || '',
    tier: partner.tier,
    total_referrals: partner.total_referrals,
    notes: partner.notes || '',
    is_active: partner.is_active
  }
  partnerDialog.value = true
}

const savePartner = async () => {
  saving.value = true
  try {
    if (editingPartner.value) {
      // Update existing partner
      const { error } = await client
        .from('referral_partners')
        .update({
          hospital_name: partnerFormData.value.hospital_name,
          contact_person: partnerFormData.value.contact_person || null,
          email: partnerFormData.value.email || null,
          phone: partnerFormData.value.phone || null,
          address: partnerFormData.value.address || null,
          tier: partnerFormData.value.tier,
          total_referrals: partnerFormData.value.total_referrals,
          notes: partnerFormData.value.notes || null,
          is_active: partnerFormData.value.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPartner.value.id)

      if (error) throw error
      showNotification('Partner updated successfully')
    } else {
      // Create new partner
      const { error } = await client
        .from('referral_partners')
        .insert({
          hospital_name: partnerFormData.value.hospital_name,
          contact_person: partnerFormData.value.contact_person || null,
          email: partnerFormData.value.email || null,
          phone: partnerFormData.value.phone || null,
          address: partnerFormData.value.address || null,
          tier: partnerFormData.value.tier,
          total_referrals: partnerFormData.value.total_referrals,
          notes: partnerFormData.value.notes || null,
          is_active: partnerFormData.value.is_active
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
  deleteDialog.value = true
}

const deletePartner = async () => {
  if (!partnerToDelete.value) return
  
  deleting.value = true
  try {
    const { error } = await client
      .from('referral_partners')
      .delete()
      .eq('id', partnerToDelete.value.id)

    if (error) throw error
    
    showNotification('Partner deleted successfully')
    deleteDialog.value = false
    await fetchPartners()
  } catch (error) {
    console.error('Error deleting partner:', error)
    showNotification('Failed to delete partner', 'error')
  } finally {
    deleting.value = false
  }
}

const addReferral = async (partner: ReferralPartner) => {
  try {
    const { error } = await client
      .from('referral_partners')
      .update({
        total_referrals: partner.total_referrals + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', partner.id)

    if (error) throw error
    
    // Update local state
    const idx = partners.value.findIndex(p => p.id === partner.id)
    if (idx !== -1) {
      partners.value[idx].total_referrals++
    }
    
    // Check for tier upgrade
    const newCount = partner.total_referrals + 1
    let newTier: ReferralTier | null = null
    if (newCount >= 100 && partner.tier !== 'platinum') newTier = 'platinum'
    else if (newCount >= 50 && partner.tier === 'bronze') newTier = 'gold'
    else if (newCount >= 25 && partner.tier === 'bronze') newTier = 'silver'

    if (newTier) {
      await client
        .from('referral_partners')
        .update({ tier: newTier })
        .eq('id', partner.id)
      
      if (idx !== -1) {
        partners.value[idx].tier = newTier
      }
      showNotification(`Referral logged! Partner upgraded to ${newTier} tier!`, 'success')
    } else {
      showNotification('Referral logged successfully')
    }
  } catch (error) {
    console.error('Error adding referral:', error)
    showNotification('Failed to log referral', 'error')
  }
}

// Lifecycle
onMounted(() => {
  fetchPartners()
})
</script>

<style scoped>
.v-data-table :deep(.v-data-table__th) {
  font-weight: 600 !important;
  background-color: rgb(var(--v-theme-surface-variant));
}
</style>
