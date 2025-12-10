<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Marketing</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage campaigns and track leads
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="addLeadDialog = true"
        >
          Add Lead
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="addCampaignDialog = true"
        >
          New Campaign
        </v-btn>
      </div>
    </div>

    <!-- Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Campaigns</p>
            <p class="text-h4 font-weight-bold">{{ campaigns.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="secondary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Leads</p>
            <p class="text-h4 font-weight-bold">{{ leads.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Converted</p>
            <p class="text-h4 font-weight-bold">{{ convertedLeads }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Pending</p>
            <p class="text-h4 font-weight-bold">{{ pendingLeads }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="campaigns">Campaigns</v-tab>
      <v-tab value="leads">Leads</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- Campaigns Tab -->
      <v-window-item value="campaigns">
        <v-card rounded="lg">
          <v-card-text v-if="campaigns.length === 0" class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-bullhorn</v-icon>
            <h3 class="text-h6 mt-4">No campaigns yet</h3>
            <p class="text-grey">Create your first marketing campaign</p>
            <v-btn 
              color="primary" 
              class="mt-4"
              @click="addCampaignDialog = true"
            >
              Create Campaign
            </v-btn>
          </v-card-text>

          <v-list v-else>
            <v-list-item
              v-for="campaign in campaigns"
              :key="campaign.id"
              class="py-4"
            >
              <template #prepend>
                <v-avatar :color="getStatusColor(campaign.status)" size="48">
                  <v-icon color="white">mdi-bullhorn</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-bold">
                {{ campaign.name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ campaign.description || 'No description' }}
              </v-list-item-subtitle>
              <div class="text-caption text-grey mt-1">
                <span v-if="campaign.start_date">
                  {{ formatDate(campaign.start_date) }} - {{ campaign.end_date ? formatDate(campaign.end_date) : 'Ongoing' }}
                </span>
                <span v-if="campaign.budget" class="ml-4">
                  Budget: ${{ campaign.budget.toLocaleString() }}
                </span>
              </div>

              <template #append>
                <v-chip :color="getStatusColor(campaign.status)" size="small" variant="tonal">
                  {{ campaign.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-window-item>

      <!-- Leads Tab -->
      <v-window-item value="leads">
        <v-card rounded="lg">
          <v-card-text v-if="leads.length === 0" class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-account-multiple</v-icon>
            <h3 class="text-h6 mt-4">No leads yet</h3>
            <p class="text-grey">Add your first lead to track</p>
            <v-btn 
              color="primary" 
              class="mt-4"
              @click="addLeadDialog = true"
            >
              Add Lead
            </v-btn>
          </v-card-text>

          <v-data-table
            v-else
            :headers="leadHeaders"
            :items="leads"
            hover
          >
            <template #item.name="{ item }">
              <div class="font-weight-medium">{{ item.name }}</div>
            </template>

            <template #item.status="{ item }">
              <v-chip :color="getLeadStatusColor(item.status)" size="small" variant="tonal">
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="viewLead(item)" />
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="editLead(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Add Campaign Dialog -->
    <v-dialog v-model="addCampaignDialog" max-width="500">
      <v-card>
        <v-card-title>Create Campaign</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="campaignForm.name"
            label="Campaign Name"
            variant="outlined"
          />
          <v-textarea
            v-model="campaignForm.description"
            label="Description"
            variant="outlined"
            rows="2"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="campaignForm.start_date"
                label="Start Date"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="campaignForm.end_date"
                label="End Date"
                type="date"
                variant="outlined"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model.number="campaignForm.budget"
            label="Budget"
            type="number"
            prefix="$"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="addCampaignDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createCampaign">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Lead Dialog -->
    <v-dialog v-model="addLeadDialog" max-width="500">
      <v-card>
        <v-card-title>Add Lead</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="leadForm.name"
            label="Name"
            variant="outlined"
          />
          <v-text-field
            v-model="leadForm.email"
            label="Email"
            type="email"
            variant="outlined"
          />
          <v-text-field
            v-model="leadForm.phone"
            label="Phone"
            variant="outlined"
          />
          <v-select
            v-model="leadForm.source"
            :items="['Website', 'Referral', 'Social Media', 'Walk-in', 'Other']"
            label="Source"
            variant="outlined"
          />
          <v-textarea
            v-model="leadForm.notes"
            label="Notes"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeLeadDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveLead">{{ editingLead ? 'Update' : 'Add Lead' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Lead Dialog -->
    <v-dialog v-model="viewLeadDialog" max-width="500">
      <v-card v-if="selectedLead">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-account</v-icon>
          {{ selectedLead.name }}
          <v-spacer />
          <v-chip :color="getLeadStatusColor(selectedLead.status)" size="small" variant="tonal">
            {{ selectedLead.status }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item v-if="selectedLead.email">
              <template #prepend>
                <v-icon>mdi-email</v-icon>
              </template>
              <v-list-item-title>{{ selectedLead.email }}</v-list-item-title>
              <v-list-item-subtitle>Email</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLead.phone">
              <template #prepend>
                <v-icon>mdi-phone</v-icon>
              </template>
              <v-list-item-title>{{ selectedLead.phone }}</v-list-item-title>
              <v-list-item-subtitle>Phone</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLead.source">
              <template #prepend>
                <v-icon>mdi-source-branch</v-icon>
              </template>
              <v-list-item-title>{{ selectedLead.source }}</v-list-item-title>
              <v-list-item-subtitle>Source</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedLead.notes">
              <template #prepend>
                <v-icon>mdi-note-text</v-icon>
              </template>
              <v-list-item-title>{{ selectedLead.notes }}</v-list-item-title>
              <v-list-item-subtitle>Notes</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          
          <v-divider class="my-3" />
          
          <div class="text-subtitle-2 mb-2">Update Status</div>
          <v-chip-group v-model="selectedLead.status" mandatory @update:model-value="updateLeadStatus">
            <v-chip value="new" color="info" variant="outlined">New</v-chip>
            <v-chip value="contacted" color="warning" variant="outlined">Contacted</v-chip>
            <v-chip value="qualified" color="primary" variant="outlined">Qualified</v-chip>
            <v-chip value="converted" color="success" variant="outlined">Converted</v-chip>
            <v-chip value="lost" color="error" variant="outlined">Lost</v-chip>
          </v-chip-group>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" variant="text" @click="editLead(selectedLead)">
            <v-icon start>mdi-pencil</v-icon>
            Edit
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="viewLeadDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { MarketingCampaign, Lead } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const uiStore = useUIStore()

const tab = ref('campaigns')
const campaigns = ref<MarketingCampaign[]>([])
const leads = ref<Lead[]>([])

const addCampaignDialog = ref(false)
const addLeadDialog = ref(false)
const viewLeadDialog = ref(false)
const editingLead = ref<Lead | null>(null)
const selectedLead = ref<Lead | null>(null)

const campaignForm = reactive({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  budget: null as number | null
})

const leadForm = reactive({
  name: '',
  email: '',
  phone: '',
  source: '',
  notes: ''
})

const leadHeaders = [
  { title: 'Name', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Phone', key: 'phone' },
  { title: 'Source', key: 'source' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const convertedLeads = computed(() => 
  leads.value.filter(l => l.status === 'converted').length
)

const pendingLeads = computed(() => 
  leads.value.filter(l => l.status === 'new' || l.status === 'contacted').length
)

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    active: 'success',
    paused: 'warning',
    completed: 'info',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'info',
    contacted: 'warning',
    qualified: 'primary',
    converted: 'success',
    lost: 'error'
  }
  return colors[status] || 'grey'
}

async function createCampaign() {
  if (!campaignForm.name) {
    uiStore.showError('Campaign name is required')
    return
  }

  try {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        name: campaignForm.name,
        description: campaignForm.description || null,
        start_date: campaignForm.start_date || null,
        end_date: campaignForm.end_date || null,
        budget: campaignForm.budget,
        created_by: authStore.profile!.id
      })
      .select()
      .single()

    if (error) throw error
    campaigns.value.push(data as MarketingCampaign)
    addCampaignDialog.value = false
    uiStore.showSuccess('Campaign created')
    
    Object.assign(campaignForm, { name: '', description: '', start_date: '', end_date: '', budget: null })
  } catch {
    uiStore.showError('Failed to create campaign')
  }
}

function viewLead(lead: Lead) {
  selectedLead.value = { ...lead }
  viewLeadDialog.value = true
}

function editLead(lead: Lead) {
  editingLead.value = lead
  leadForm.name = lead.name
  leadForm.email = lead.email || ''
  leadForm.phone = lead.phone || ''
  leadForm.source = lead.source || ''
  leadForm.notes = lead.notes || ''
  viewLeadDialog.value = false
  addLeadDialog.value = true
}

function closeLeadDialog() {
  addLeadDialog.value = false
  editingLead.value = null
  Object.assign(leadForm, { name: '', email: '', phone: '', source: '', notes: '' })
}

async function saveLead() {
  if (!leadForm.name) {
    uiStore.showError('Lead name is required')
    return
  }

  try {
    const supabase = useSupabaseClient()
    
    if (editingLead.value) {
      // Update existing lead
      const { error } = await supabase
        .from('leads')
        .update({
          name: leadForm.name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          source: leadForm.source || null,
          notes: leadForm.notes || null
        })
        .eq('id', editingLead.value.id)

      if (error) throw error
      
      const idx = leads.value.findIndex(l => l.id === editingLead.value!.id)
      if (idx !== -1) {
        leads.value[idx] = { ...leads.value[idx], ...leadForm }
      }
      uiStore.showSuccess('Lead updated')
    } else {
      // Create new lead
      const { data, error } = await supabase
        .from('leads')
        .insert({
          name: leadForm.name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          source: leadForm.source || null,
          notes: leadForm.notes || null
        })
        .select()
        .single()

      if (error) throw error
      leads.value.push(data as Lead)
      uiStore.showSuccess('Lead added')
    }
    
    closeLeadDialog()
  } catch {
    uiStore.showError(editingLead.value ? 'Failed to update lead' : 'Failed to add lead')
  }
}

async function updateLeadStatus(newStatus: string) {
  if (!selectedLead.value) return
  
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', selectedLead.value.id)
    
    if (error) throw error
    
    const idx = leads.value.findIndex(l => l.id === selectedLead.value!.id)
    if (idx !== -1) {
      leads.value[idx].status = newStatus
    }
    uiStore.showSuccess('Status updated')
  } catch {
    uiStore.showError('Failed to update status')
  }
}

async function createLead() {
  // Redirect to saveLead for backward compatibility
  await saveLead()
}

onMounted(async () => {
  const supabase = useSupabaseClient()

  // Fetch campaigns
  const { data: campaignsData } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (campaignsData) {
    campaigns.value = campaignsData as MarketingCampaign[]
  }

  // Fetch leads
  const { data: leadsData } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (leadsData) {
    leads.value = leadsData as Lead[]
  }
})
</script>
