<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Lead Management</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track and manage marketing leads
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="addLeadDialog = true"
      >
        Add Lead
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" color="info" variant="flat">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">New Leads</p>
            <p class="text-h4 font-weight-bold">{{ newLeadsCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" color="warning" variant="flat">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Contacted</p>
            <p class="text-h4 font-weight-bold">{{ contactedCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" color="primary" variant="flat">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Qualified</p>
            <p class="text-h4 font-weight-bold">{{ qualifiedCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" color="success" variant="flat">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Converted</p>
            <p class="text-h4 font-weight-bold">{{ convertedCount }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card rounded="lg" class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              label="Search leads"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="sourceFilter"
              :items="sourceOptions"
              label="Source"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-center">
            <v-btn variant="outlined" block @click="clearFilters">
              Clear
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Leads Table -->
    <v-card rounded="lg">
      <v-data-table
        :headers="headers"
        :items="filteredLeads"
        :search="search"
        hover
        @click:row="(_, { item }) => openLeadDetails(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3 py-2">
            <v-avatar color="primary" size="40">
              <span class="text-white font-weight-bold">
                {{ getInitials(item.first_name, item.last_name) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.first_name }} {{ item.last_name || '' }}</div>
              <div class="text-caption text-grey">{{ item.email || 'No email' }}</div>
            </div>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.source="{ item }">
          <span class="text-caption">{{ item.source || 'Unknown' }}</span>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-caption">{{ formatDate(item.created_at) }}</span>
        </template>

        <template #item.actions="{ item }">
          <v-menu>
            <template #activator="{ props }">
              <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="props" />
            </template>
            <v-list density="compact">
              <v-list-item @click="updateLeadStatus(item.id, 'contacted')">
                <v-list-item-title>Mark Contacted</v-list-item-title>
              </v-list-item>
              <v-list-item @click="updateLeadStatus(item.id, 'qualified')">
                <v-list-item-title>Mark Qualified</v-list-item-title>
              </v-list-item>
              <v-list-item @click="updateLeadStatus(item.id, 'converted')">
                <v-list-item-title>Mark Converted</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item @click="updateLeadStatus(item.id, 'lost')" class="text-error">
                <v-list-item-title>Mark Lost</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add Lead Dialog -->
    <v-dialog v-model="addLeadDialog" max-width="500">
      <v-card>
        <v-card-title>Add New Lead</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="leadForm.first_name"
                label="First Name"
                variant="outlined"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="leadForm.last_name"
                label="Last Name"
                variant="outlined"
              />
            </v-col>
          </v-row>
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
            :items="sourceOptions"
            label="Lead Source"
            variant="outlined"
          />
          <v-select
            v-model="leadForm.campaign_id"
            :items="campaignOptions"
            label="Campaign"
            variant="outlined"
            clearable
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
          <v-btn variant="text" @click="addLeadDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="createLead" :loading="isSubmitting">
            Add Lead
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Lead Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedLead">
        <v-card-title class="d-flex align-center gap-3">
          <v-avatar color="primary" size="48">
            <span class="text-white font-weight-bold">
              {{ getInitials(selectedLead.first_name, selectedLead.last_name) }}
            </span>
          </v-avatar>
          <div>
            <div>{{ selectedLead.first_name }} {{ selectedLead.last_name || '' }}</div>
            <v-chip :color="getStatusColor(selectedLead.status)" size="small" variant="tonal">
              {{ selectedLead.status }}
            </v-chip>
          </div>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item v-if="selectedLead.email" prepend-icon="mdi-email">
              <v-list-item-title>{{ selectedLead.email }}</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedLead.phone" prepend-icon="mdi-phone">
              <v-list-item-title>{{ selectedLead.phone }}</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-source-branch">
              <v-list-item-title>Source: {{ selectedLead.source || 'Unknown' }}</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-calendar">
              <v-list-item-title>Created: {{ formatDate(selectedLead.created_at) }}</v-list-item-title>
            </v-list-item>
          </v-list>
          
          <v-divider class="my-4" />
          
          <h4 class="text-subtitle-2 mb-2">Notes</h4>
          <p class="text-body-2 text-grey">{{ selectedLead.notes || 'No notes' }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">Close</v-btn>
          <v-btn color="primary" @click="editLead(selectedLead)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { MarketingLead, MarketingCampaign } from '~/types/database.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const uiStore = useUIStore()

const leads = ref<MarketingLead[]>([])
const campaigns = ref<MarketingCampaign[]>([])

const search = ref('')
const statusFilter = ref<string | null>(null)
const sourceFilter = ref<string | null>(null)

const addLeadDialog = ref(false)
const detailsDialog = ref(false)
const selectedLead = ref<MarketingLead | null>(null)
const isSubmitting = ref(false)

const leadForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  source: '',
  campaign_id: null as string | null,
  notes: ''
})

const headers = [
  { title: 'Lead', key: 'name' },
  { title: 'Phone', key: 'phone' },
  { title: 'Source', key: 'source' },
  { title: 'Status', key: 'status' },
  { title: 'Created', key: 'created_at' },
  { title: '', key: 'actions', sortable: false }
]

const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'lost']
const sourceOptions = ['Website', 'Referral', 'Social Media', 'Walk-in', 'Phone', 'Event', 'Other']

const campaignOptions = computed(() => 
  campaigns.value.map(c => ({ title: c.name, value: c.id }))
)

const filteredLeads = computed(() => {
  return leads.value.filter(lead => {
    if (statusFilter.value && lead.status !== statusFilter.value) return false
    if (sourceFilter.value && lead.source !== sourceFilter.value) return false
    return true
  })
})

const newLeadsCount = computed(() => leads.value.filter(l => l.status === 'new').length)
const contactedCount = computed(() => leads.value.filter(l => l.status === 'contacted').length)
const qualifiedCount = computed(() => leads.value.filter(l => l.status === 'qualified').length)
const convertedCount = computed(() => leads.value.filter(l => l.status === 'converted').length)

function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName?.[0] || ''
  const last = lastName?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'info',
    contacted: 'warning',
    qualified: 'primary',
    converted: 'success',
    lost: 'error'
  }
  return colors[status] || 'grey'
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function clearFilters() {
  search.value = ''
  statusFilter.value = null
  sourceFilter.value = null
}

function openLeadDetails(lead: MarketingLead) {
  selectedLead.value = lead
  detailsDialog.value = true
}

function editLead(lead: MarketingLead) {
  // Would implement edit functionality
  uiStore.showInfo('Edit feature coming soon')
}

async function updateLeadStatus(leadId: string, status: string) {
  try {
    const supabase = useSupabaseClient()
    const { error } = await supabase
      .from('marketing_leads')
      .update({ 
        status,
        converted_at: status === 'converted' ? new Date().toISOString() : null
      })
      .eq('id', leadId)
    
    if (error) throw error
    
    const lead = leads.value.find(l => l.id === leadId)
    if (lead) {
      lead.status = status as MarketingLead['status']
    }
    
    uiStore.showSuccess(`Lead marked as ${status}`)
  } catch {
    uiStore.showError('Failed to update lead status')
  }
}

async function createLead() {
  if (!leadForm.first_name) {
    uiStore.showError('First name is required')
    return
  }

  isSubmitting.value = true

  try {
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('marketing_leads')
      .insert({
        first_name: leadForm.first_name,
        last_name: leadForm.last_name || null,
        email: leadForm.email || null,
        phone: leadForm.phone || null,
        source: leadForm.source || null,
        campaign_id: leadForm.campaign_id,
        notes: leadForm.notes || null,
        status: 'new'
      })
      .select()
      .single()

    if (error) throw error
    leads.value.unshift(data as MarketingLead)
    addLeadDialog.value = false
    uiStore.showSuccess('Lead added')
    
    Object.assign(leadForm, {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: '',
      campaign_id: null,
      notes: ''
    })
  } catch {
    uiStore.showError('Failed to add lead')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  const supabase = useSupabaseClient()

  // Fetch leads
  const { data: leadsData } = await supabase
    .from('marketing_leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (leadsData) {
    leads.value = leadsData as MarketingLead[]
  }

  // Fetch campaigns for dropdown
  const { data: campaignsData } = await supabase
    .from('marketing_campaigns')
    .select('id, name')
    .eq('status', 'active')
  
  if (campaignsData) {
    campaigns.value = campaignsData as MarketingCampaign[]
  }
})
</script>
