<template>
  <div class="campaigns-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Campaigns</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track marketing campaigns, ROI, and client acquisition goals
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        New Campaign
      </v-btn>
    </div>

    <!-- Stats Overview -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Active Campaigns</p>
            <p class="text-h4 font-weight-bold">{{ activeCampaigns.length }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Leads</p>
            <p class="text-h4 font-weight-bold">{{ totalLeadsGenerated }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="info" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Total Spend</p>
            <p class="text-h4 font-weight-bold">${{ totalSpend.toLocaleString() }}</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="flat" rounded="lg">
          <v-card-text class="text-white">
            <p class="text-overline opacity-80">Avg Cost/Lead</p>
            <p class="text-h4 font-weight-bold">${{ avgCostPerLead.toFixed(0) }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Campaigns Grid -->
    <v-row v-else-if="campaigns.length > 0">
      <v-col v-for="campaign in campaigns" :key="campaign.id" cols="12" md="6" lg="4">
        <v-card rounded="lg" class="h-100">
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-truncate">{{ campaign.name }}</span>
            <v-chip 
              :color="getStatusColor(campaign.status)" 
              size="small" 
              variant="flat"
            >
              {{ campaign.status }}
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <p class="text-body-2 text-grey mb-4">{{ campaign.description }}</p>
            
            <!-- Date Range -->
            <div class="d-flex align-center gap-2 mb-3">
              <v-icon size="small" color="grey">mdi-calendar</v-icon>
              <span class="text-body-2">
                {{ formatDate(campaign.start_date) }} - {{ formatDate(campaign.end_date) }}
              </span>
            </div>
            
            <!-- Goal Progress -->
            <div class="mb-3">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span>Client Goal</span>
                <span>{{ campaign.leads_generated || 0 }} / {{ campaign.goal_clients }}</span>
              </div>
              <v-progress-linear
                :model-value="getGoalProgress(campaign)"
                :color="getGoalProgress(campaign) >= 100 ? 'success' : 'primary'"
                height="8"
                rounded
              />
            </div>
            
            <!-- Budget Progress -->
            <div class="mb-3">
              <div class="d-flex justify-space-between text-caption mb-1">
                <span>Budget</span>
                <span>${{ campaign.spend_actual || 0 }} / ${{ campaign.budget }}</span>
              </div>
              <v-progress-linear
                :model-value="getBudgetProgress(campaign)"
                :color="getBudgetProgress(campaign) > 100 ? 'error' : 'info'"
                height="8"
                rounded
              />
            </div>
            
            <!-- Attached Events -->
            <div class="d-flex align-center gap-2">
              <v-chip size="x-small" variant="tonal" prepend-icon="mdi-calendar-star">
                {{ campaign.events_count || 0 }} Events
              </v-chip>
              <v-chip size="x-small" variant="tonal" prepend-icon="mdi-account-plus">
                {{ campaign.leads_generated || 0 }} Leads
              </v-chip>
            </div>
          </v-card-text>
          
          <v-divider />
          
          <v-card-actions>
            <v-btn size="small" variant="text" @click="viewCampaign(campaign)">
              Details
            </v-btn>
            <v-spacer />
            <v-btn size="small" variant="text" icon="mdi-pencil" @click="editCampaign(campaign)" />
            <v-btn size="small" variant="text" icon="mdi-delete" color="error" @click="confirmDelete(campaign)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else rounded="lg" class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-bullseye-arrow</v-icon>
      <h3 class="text-h6 mt-4">No campaigns yet</h3>
      <p class="text-grey mb-4">Create your first marketing campaign to start tracking ROI</p>
      <v-btn color="primary" @click="openCreateDialog">Create Campaign</v-btn>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="600">
      <v-card>
        <v-card-title>{{ editMode ? 'Edit Campaign' : 'Create Campaign' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="form.name"
                label="Campaign Name *"
                variant="outlined"
                :rules="[v => !!v || 'Name is required']"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Description"
                variant="outlined"
                rows="2"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.start_date"
                label="Start Date *"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.end_date"
                label="End Date *"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="form.budget"
                label="Budget ($)"
                type="number"
                variant="outlined"
                prefix="$"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="form.goal_clients"
                label="Goal (New Clients)"
                type="number"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.status"
                :items="['Planning', 'Active', 'Paused', 'Completed']"
                label="Status"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="form.spend_actual"
                label="Actual Spend ($)"
                type="number"
                variant="outlined"
                prefix="$"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveCampaign">
            {{ editMode ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Details Dialog -->
    <v-dialog v-model="showViewDialog" max-width="700">
      <v-card v-if="selectedCampaign">
        <v-toolbar color="primary">
          <v-btn icon="mdi-close" variant="text" @click="showViewDialog = false" />
          <v-toolbar-title>{{ selectedCampaign.name }}</v-toolbar-title>
          <v-spacer />
          <v-chip :color="getStatusColor(selectedCampaign.status)" variant="flat" size="small">
            {{ selectedCampaign.status }}
          </v-chip>
        </v-toolbar>
        
        <v-card-text class="pa-6">
          <p class="text-body-1 mb-4">{{ selectedCampaign.description }}</p>
          
          <v-row class="mb-6">
            <v-col cols="6" md="3" class="text-center">
              <div class="text-h5 font-weight-bold text-primary">{{ selectedCampaign.leads_generated || 0 }}</div>
              <div class="text-caption text-grey">Leads Generated</div>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <div class="text-h5 font-weight-bold text-success">{{ selectedCampaign.clients_converted || 0 }}</div>
              <div class="text-caption text-grey">Clients Converted</div>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <div class="text-h5 font-weight-bold text-info">${{ selectedCampaign.spend_actual || 0 }}</div>
              <div class="text-caption text-grey">Actual Spend</div>
            </v-col>
            <v-col cols="6" md="3" class="text-center">
              <div class="text-h5 font-weight-bold text-warning">${{ getCostPerLead(selectedCampaign) }}</div>
              <div class="text-caption text-grey">Cost per Lead</div>
            </v-col>
          </v-row>
          
          <!-- Goal Progress -->
          <div class="mb-4">
            <h4 class="text-subtitle-2 mb-2">Goal Progress</h4>
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>{{ selectedCampaign.leads_generated || 0 }} of {{ selectedCampaign.goal_clients }} clients</span>
              <span>{{ getGoalProgress(selectedCampaign).toFixed(0) }}%</span>
            </div>
            <v-progress-linear
              :model-value="getGoalProgress(selectedCampaign)"
              :color="getGoalProgress(selectedCampaign) >= 100 ? 'success' : 'primary'"
              height="12"
              rounded
            />
          </div>
          
          <!-- Budget Usage -->
          <div>
            <h4 class="text-subtitle-2 mb-2">Budget Usage</h4>
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>${{ selectedCampaign.spend_actual || 0 }} of ${{ selectedCampaign.budget }}</span>
              <span>{{ getBudgetProgress(selectedCampaign).toFixed(0) }}%</span>
            </div>
            <v-progress-linear
              :model-value="getBudgetProgress(selectedCampaign)"
              :color="getBudgetProgress(selectedCampaign) > 100 ? 'error' : 'info'"
              height="12"
              rounded
            />
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-btn variant="outlined" prepend-icon="mdi-calendar-star" :to="'/growth/events'">
            View Events
          </v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-account-plus" :to="'/growth/leads'">
            View Leads
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showViewDialog = false">Close</v-btn>
          <v-btn color="primary" @click="editCampaign(selectedCampaign); showViewDialog = false">
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Delete Campaign?</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ campaignToDelete?.name }}"? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteCampaign">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

useHead({
  title: 'Campaigns'
})

interface Campaign {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  budget: number
  spend_actual: number
  goal_clients: number
  leads_generated: number
  clients_converted: number
  events_count: number
  status: string
  created_at: string
}

const client = useSupabaseClient()

// State
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const campaigns = ref<Campaign[]>([])
const showDialog = ref(false)
const showViewDialog = ref(false)
const showDeleteDialog = ref(false)
const editMode = ref(false)
const selectedCampaign = ref<Campaign | null>(null)
const campaignToDelete = ref<Campaign | null>(null)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const form = reactive({
  id: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  budget: 0,
  spend_actual: 0,
  goal_clients: 0,
  status: 'Planning'
})

// Computed
const activeCampaigns = computed(() => 
  campaigns.value.filter(c => c.status === 'Active')
)

const totalLeadsGenerated = computed(() => 
  campaigns.value.reduce((sum, c) => sum + (c.leads_generated || 0), 0)
)

const totalSpend = computed(() => 
  campaigns.value.reduce((sum, c) => sum + (c.spend_actual || 0), 0)
)

const avgCostPerLead = computed(() => {
  if (totalLeadsGenerated.value === 0) return 0
  return totalSpend.value / totalLeadsGenerated.value
})

// Methods
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    Planning: 'info',
    Active: 'success',
    Paused: 'warning',
    Completed: 'grey'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const getGoalProgress = (campaign: Campaign): number => {
  if (!campaign.goal_clients || campaign.goal_clients === 0) return 0
  return Math.min(((campaign.leads_generated || 0) / campaign.goal_clients) * 100, 100)
}

const getBudgetProgress = (campaign: Campaign): number => {
  if (!campaign.budget || campaign.budget === 0) return 0
  return ((campaign.spend_actual || 0) / campaign.budget) * 100
}

const getCostPerLead = (campaign: Campaign): string => {
  if (!campaign.leads_generated || campaign.leads_generated === 0) return '0'
  return ((campaign.spend_actual || 0) / campaign.leads_generated).toFixed(0)
}

const openCreateDialog = () => {
  editMode.value = false
  Object.assign(form, {
    id: '',
    name: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0,
    spend_actual: 0,
    goal_clients: 10,
    status: 'Planning'
  })
  showDialog.value = true
}

const editCampaign = (campaign: Campaign) => {
  editMode.value = true
  Object.assign(form, {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description || '',
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    budget: campaign.budget,
    spend_actual: campaign.spend_actual,
    goal_clients: campaign.goal_clients,
    status: campaign.status
  })
  showDialog.value = true
}

const viewCampaign = (campaign: Campaign) => {
  selectedCampaign.value = campaign
  showViewDialog.value = true
}

const confirmDelete = (campaign: Campaign) => {
  campaignToDelete.value = campaign
  showDeleteDialog.value = true
}

const showNotification = (message: string, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

const saveCampaign = async () => {
  if (!form.name) {
    showNotification('Campaign name is required', 'error')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: form.name,
      description: form.description,
      start_date: form.start_date,
      end_date: form.end_date,
      budget: form.budget,
      spend_actual: form.spend_actual,
      goal_clients: form.goal_clients,
      status: form.status
    }
    
    if (editMode.value) {
      const { error } = await client
        .from('marketing_campaigns' as any)
        .update(data as any)
        .eq('id', form.id)
      
      if (error) throw error
      showNotification('Campaign updated successfully')
    } else {
      const { error } = await client
        .from('marketing_campaigns' as any)
        .insert(data as any)
      
      if (error) throw error
      showNotification('Campaign created successfully')
    }
    
    showDialog.value = false
    await fetchCampaigns()
  } catch (err) {
    console.error('Error saving campaign:', err)
    showNotification('Failed to save campaign', 'error')
  } finally {
    saving.value = false
  }
}

const deleteCampaign = async () => {
  if (!campaignToDelete.value) return
  
  deleting.value = true
  try {
    const { error } = await client
      .from('marketing_campaigns' as any)
      .delete()
      .eq('id', campaignToDelete.value.id)
    
    if (error) throw error
    
    showDeleteDialog.value = false
    showNotification('Campaign deleted')
    await fetchCampaigns()
  } catch (err) {
    console.error('Error deleting campaign:', err)
    showNotification('Failed to delete campaign', 'error')
  } finally {
    deleting.value = false
  }
}

const fetchCampaigns = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('marketing_campaigns' as any)
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    campaigns.value = data || []
  } catch (err) {
    console.error('Error fetching campaigns:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCampaigns()
})
</script>

<style scoped>
.campaigns-page {
  max-width: 1400px;
}
</style>
