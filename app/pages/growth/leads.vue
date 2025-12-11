<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Lead CRM</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track and manage your marketing leads
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-download"
          @click="exportCSV"
        >
          Export CSV
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
          Add Lead
        </v-btn>
      </div>
    </div>

    <!-- Filters -->
    <v-card class="mb-4" rounded="lg">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search leads..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="eventFilter"
              :items="eventOptions"
              label="Filter by Event Source"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="Filter by Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
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
        :loading="loading"
        hover
      >
        <template #item.lead_name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar color="primary" size="36" class="mr-3">
              <span class="text-white font-weight-bold text-caption">
                {{ getInitials(item.lead_name) }}
              </span>
            </v-avatar>
            <span class="font-weight-medium">{{ item.lead_name }}</span>
          </div>
        </template>

        <template #item.source="{ item }">
          <v-chip v-if="item.source" size="small" variant="tonal" color="secondary">
            {{ item.source }}
          </v-chip>
          <span v-else class="text-grey">-</span>
        </template>

        <template #item.contact="{ item }">
          <div class="d-flex align-center gap-2">
            <v-btn
              v-if="item.email"
              icon
              size="x-small"
              variant="text"
              color="primary"
              :href="`mailto:${item.email}`"
            >
              <v-icon size="16">mdi-email</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.email }}</v-tooltip>
            </v-btn>
            <v-btn
              v-if="item.phone"
              icon
              size="x-small"
              variant="text"
              color="success"
              :href="`tel:${item.phone}`"
            >
              <v-icon size="16">mdi-phone</v-icon>
              <v-tooltip activator="parent" location="top">{{ item.phone }}</v-tooltip>
            </v-btn>
            <span v-if="!item.email && !item.phone" class="text-grey">No contact info</span>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-select
            :model-value="item.status"
            :items="statusOptions"
            density="compact"
            variant="plain"
            hide-details
            style="max-width: 130px"
            @update:model-value="updateStatus(item, $event)"
          >
            <template #selection="{ item: statusItem }">
              <v-chip :color="getStatusColor(statusItem.value)" size="small" label>
                {{ statusItem.title }}
              </v-chip>
            </template>
          </v-select>
        </template>

        <template #item.created_at="{ item }">
          <span class="text-caption text-grey">{{ formatDate(item.created_at) }}</span>
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
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="text"
            color="error"
            @click="confirmDelete(item)"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-account-star</v-icon>
            <h3 class="text-h6 mt-4">No leads yet</h3>
            <p class="text-grey mb-4">Add your first lead to get started</p>
            <v-btn color="primary" @click="openAddDialog">Add Lead</v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Lead Dialog -->
    <v-dialog v-model="leadDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          {{ editMode ? 'Edit Lead' : 'Add Lead' }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="leadForm" v-model="formValid">
            <v-text-field
              v-model="leadFormData.lead_name"
              label="Name *"
              :rules="[v => !!v || 'Required']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.email"
              label="Email"
              type="email"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.phone"
              label="Phone"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-select
              v-model="leadFormData.event_id"
              :items="events"
              item-title="name"
              item-value="id"
              label="Event Source"
              variant="outlined"
              density="compact"
              clearable
              class="mb-3"
            />
            <v-select
              v-model="leadFormData.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="leadFormData.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="leadDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="saveLead">
            {{ editMode ? 'Update' : 'Add Lead' }}
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
          Are you sure you want to delete <strong>{{ leadToDelete?.lead_name }}</strong>?
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteLead">Delete</v-btn>
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
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface Lead {
  id: string
  event_id: string | null
  lead_name: string
  email: string | null
  phone: string | null
  source: string | null
  status: string
  notes: string | null
  created_at: string
}

interface Event {
  id: string
  name: string
}

const client = useSupabaseClient()

// State
const leads = ref<Lead[]>([])
const events = ref<Event[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const search = ref('')
const eventFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)
const leadDialog = ref(false)
const deleteDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)
const editingLead = ref<Lead | null>(null)
const leadToDelete = ref<Lead | null>(null)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const leadFormData = reactive({
  lead_name: '',
  email: '',
  phone: '',
  event_id: null as string | null,
  status: 'new',
  notes: ''
})

const statusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Contacted', value: 'contacted' },
  { title: 'Converted', value: 'converted' },
  { title: 'Lost', value: 'lost' }
]

const headers = [
  { title: 'Name', key: 'lead_name', sortable: true },
  { title: 'Source', key: 'source', sortable: true },
  { title: 'Contact', key: 'contact', sortable: false },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Added', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Computed
const eventOptions = computed(() => [
  ...events.value.map(e => ({ title: e.name, value: e.name })),
  { title: 'Website', value: 'Website' },
  { title: 'Referral', value: 'Referral' },
  { title: 'Walk-in', value: 'Walk-in' },
  { title: 'Social Media', value: 'Social Media' }
])

const filteredLeads = computed(() => {
  let result = leads.value

  if (eventFilter.value) {
    result = result.filter(l => l.source === eventFilter.value)
  }

  if (statusFilter.value) {
    result = result.filter(l => l.status === statusFilter.value)
  }

  return result
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getInitials = (name: string) => {
  const parts = name.split(' ')
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    contacted: 'warning',
    converted: 'success',
    lost: 'grey'
  }
  return colors[status] || 'grey'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const openAddDialog = () => {
  editMode.value = false
  editingLead.value = null
  Object.assign(leadFormData, {
    lead_name: '',
    email: '',
    phone: '',
    event_id: null,
    status: 'new',
    notes: ''
  })
  leadDialog.value = true
}

const openEditDialog = (lead: Lead) => {
  editMode.value = true
  editingLead.value = lead
  Object.assign(leadFormData, {
    lead_name: lead.lead_name,
    email: lead.email || '',
    phone: lead.phone || '',
    event_id: lead.event_id,
    status: lead.status,
    notes: lead.notes || ''
  })
  leadDialog.value = true
}

const saveLead = async () => {
  saving.value = true
  try {
    // Get source from event if selected
    let source = leadFormData.event_id
      ? events.value.find(e => e.id === leadFormData.event_id)?.name
      : null

    if (editMode.value && editingLead.value) {
      const { error } = await client
        .from('marketing_leads')
        .update({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })
        .eq('id', editingLead.value.id)

      if (error) throw error
      showNotification('Lead updated successfully')
    } else {
      const { error } = await client
        .from('marketing_leads')
        .insert({
          lead_name: leadFormData.lead_name,
          email: leadFormData.email || null,
          phone: leadFormData.phone || null,
          event_id: leadFormData.event_id,
          source: source,
          status: leadFormData.status,
          notes: leadFormData.notes || null
        })

      if (error) throw error
      showNotification('Lead added successfully')
    }

    leadDialog.value = false
    await fetchData()
  } catch (error) {
    console.error('Error saving lead:', error)
    showNotification('Failed to save lead', 'error')
  } finally {
    saving.value = false
  }
}

const updateStatus = async (lead: Lead, status: string) => {
  try {
    await client
      .from('marketing_leads')
      .update({ status })
      .eq('id', lead.id)

    lead.status = status
    showNotification('Status updated')
  } catch (error) {
    console.error('Error updating status:', error)
    showNotification('Failed to update status', 'error')
  }
}

const confirmDelete = (lead: Lead) => {
  leadToDelete.value = lead
  deleteDialog.value = true
}

const deleteLead = async () => {
  if (!leadToDelete.value) return

  deleting.value = true
  try {
    await client
      .from('marketing_leads')
      .delete()
      .eq('id', leadToDelete.value.id)

    deleteDialog.value = false
    showNotification('Lead deleted')
    await fetchData()
  } catch (error) {
    console.error('Error deleting lead:', error)
    showNotification('Failed to delete lead', 'error')
  } finally {
    deleting.value = false
  }
}

const exportCSV = () => {
  const data = filteredLeads.value
  if (data.length === 0) {
    showNotification('No leads to export', 'warning')
    return
  }

  // CSV headers
  const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Notes', 'Created']
  
  // CSV rows
  const rows = data.map(lead => [
    lead.lead_name,
    lead.email || '',
    lead.phone || '',
    lead.source || '',
    lead.status,
    (lead.notes || '').replace(/"/g, '""'),
    formatDate(lead.created_at)
  ])

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(link.href)

  showNotification(`Exported ${data.length} leads to CSV`)
}

const fetchData = async () => {
  loading.value = true
  try {
    const [leadsRes, eventsRes] = await Promise.all([
      client.from('marketing_leads').select('*').order('created_at', { ascending: false }),
      client.from('marketing_events').select('id, name').order('name')
    ])

    leads.value = leadsRes.data || []
    events.value = eventsRes.data || []
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
