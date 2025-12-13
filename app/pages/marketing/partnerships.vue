<template>
  <div class="partnerships-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Partnerships</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'CRM for referral clinics, businesses, and independent doctors' : 'Directory of our partner businesses and referral contacts' }}
        </p>
      </div>
      <div v-if="isAdmin" class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-download" @click="exportPartners">
          Export
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddDialog = true">
          Add Partner
        </v-btn>
      </div>
    </div>

    <!-- Stats Cards (Admin Only) -->
    <v-row v-if="isAdmin" class="mb-6">
      <v-col cols="6" md="3">
        <v-card rounded="lg" class="text-center pa-4">
          <div class="text-h4 font-weight-bold text-primary">{{ partners.length }}</div>
          <div class="text-body-2 text-grey">Total Partners</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="lg" class="text-center pa-4">
          <div class="text-h4 font-weight-bold text-success">{{ activePartners }}</div>
          <div class="text-body-2 text-grey">Active</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="lg" class="text-center pa-4">
          <div class="text-h4 font-weight-bold text-info">{{ referralCount }}</div>
          <div class="text-body-2 text-grey">Referrals This Month</div>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card rounded="lg" class="text-center pa-4">
          <div class="text-h4 font-weight-bold text-warning">{{ needsFollowUp }}</div>
          <div class="text-body-2 text-grey">Needs Follow-up</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" :md="isAdmin ? 4 : 6">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search partners..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" :md="isAdmin ? 2 : 6">
            <v-select
              v-model="filterType"
              :items="partnerTypes"
              label="Type"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <template v-if="isAdmin">
            <v-col cols="12" md="2">
              <v-select
                v-model="filterStatus"
                :items="['All', 'Active', 'Inactive', 'Prospect']"
                label="Status"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-select
                v-model="filterPriority"
                :items="['All', 'High', 'Medium', 'Low']"
                label="Priority"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-switch
                v-model="showNeedsFollowUp"
                label="Needs Follow-up"
                color="warning"
                hide-details
              density="compact"
            />
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Partners Table -->
    <v-card rounded="lg">
      <v-data-table
        :headers="visibleTableHeaders"
        :items="filteredPartners"
        :search="searchQuery"
        hover
        @click:row="(_event: any, { item }: { item: any }) => viewPartner(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar :color="getTypeColor(item.type)" size="40" class="mr-3">
              <v-icon color="white">{{ getTypeIcon(item.type) }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.type }}</div>
            </div>
          </div>
        </template>
        
        <template #item.priority="{ item }">
          <v-chip :color="getPriorityColor(item.priority)" size="small" variant="flat">
            {{ item.priority }}
          </v-chip>
        </template>
        
        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
            {{ item.status }}
          </v-chip>
        </template>
        
        <template #item.referrals="{ item }">
          <v-chip variant="outlined" size="small">
            <v-icon start size="small">mdi-account-arrow-right</v-icon>
            {{ item.referral_count || 0 }}
          </v-chip>
        </template>
        
        <template #item.last_contact="{ item }">
          <div>
            <div class="text-body-2">{{ item.last_contact || 'Never' }}</div>
            <div v-if="item.needs_followup" class="text-caption text-warning">
              <v-icon size="12" color="warning">mdi-alert</v-icon>
              Follow-up needed
            </div>
          </div>
        </template>
        
        <template #item.actions="{ item }">
          <template v-if="isAdmin">
            <v-btn icon="mdi-phone" size="small" variant="text" @click.stop="logCall(item)" />
            <v-btn icon="mdi-email" size="small" variant="text" @click.stop="sendEmail(item)" />
            <v-btn icon="mdi-pencil" size="small" variant="text" @click.stop="editPartner(item)" />
          </template>
          <v-btn v-else icon="mdi-eye" size="small" variant="text" @click.stop="viewPartner(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="showAddDialog" max-width="700">
      <v-card>
        <v-card-title>{{ editMode ? 'Edit Partner' : 'Add Partner' }}</v-card-title>
        <v-card-text>
          <v-tabs v-model="formTab" class="mb-4">
            <v-tab value="basic">Basic Info</v-tab>
            <v-tab value="contact">Contact Details</v-tab>
            <v-tab value="crm">CRM Info</v-tab>
          </v-tabs>

          <v-window v-model="formTab">
            <!-- Basic Info -->
            <v-window-item value="basic">
              <v-row>
                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="form.name"
                    label="Partner Name *"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="form.type"
                    :items="partnerTypes"
                    label="Partner Type *"
                    variant="outlined"
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
                  <v-select
                    v-model="form.status"
                    :items="['Active', 'Inactive', 'Prospect']"
                    label="Status"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.priority"
                    :items="['High', 'Medium', 'Low']"
                    label="Priority"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Contact Details -->
            <v-window-item value="contact">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.contact_name"
                    label="Primary Contact Name"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.contact_title"
                    label="Contact Title"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.email"
                    label="Email"
                    type="email"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.phone"
                    label="Phone"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="form.address"
                    label="Address"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.website"
                    label="Website"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </v-window-item>

            <!-- CRM Info -->
            <v-window-item value="crm">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.referral_count"
                    label="Total Referrals"
                    type="number"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.last_contact"
                    label="Last Contact Date"
                    type="date"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="form.next_followup"
                    label="Next Follow-up Date"
                    type="date"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="form.referral_agreement"
                    :items="['None', 'Informal', 'Formal Contract']"
                    label="Referral Agreement"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12">
                  <v-textarea
                    v-model="form.notes"
                    label="Internal Notes"
                    variant="outlined"
                    rows="3"
                  />
                </v-col>
                <v-col cols="12">
                  <v-combobox
                    v-model="form.tags"
                    :items="availableTags"
                    label="Tags"
                    variant="outlined"
                    multiple
                    chips
                    closable-chips
                  />
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="savePartner">{{ editMode ? 'Update' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Partner Dialog -->
    <v-dialog v-model="showViewDialog" max-width="700">
      <v-card v-if="selectedPartner">
        <div class="pa-6" :style="{ backgroundColor: getTypeColor(selectedPartner.type) + '22' }">
          <div class="d-flex align-center">
            <v-avatar :color="getTypeColor(selectedPartner.type)" size="64" class="mr-4">
              <v-icon size="32" color="white">{{ getTypeIcon(selectedPartner.type) }}</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <h2 class="text-h5 font-weight-bold">{{ selectedPartner.name }}</h2>
              <div class="d-flex align-center gap-2 mt-1">
                <v-chip size="small" variant="outlined">{{ selectedPartner.type }}</v-chip>
                <v-chip :color="getStatusColor(selectedPartner.status)" size="small" variant="tonal">
                  {{ selectedPartner.status }}
                </v-chip>
                <v-chip :color="getPriorityColor(selectedPartner.priority)" size="small" variant="flat">
                  {{ selectedPartner.priority }} Priority
                </v-chip>
              </div>
            </div>
          </div>
        </div>
        
        <v-card-text>
          <p v-if="selectedPartner.description" class="text-body-1 mb-4">
            {{ selectedPartner.description }}
          </p>
          
          <v-row>
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Contact Information</h4>
              <v-list density="compact" class="bg-transparent">
                <v-list-item v-if="selectedPartner.contact_name">
                  <template #prepend>
                    <v-icon color="primary">mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ selectedPartner.contact_title }}</v-list-item-subtitle>
                </v-list-item>
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
              </v-list>
            </v-col>
            
            <!-- CRM Metrics (Admin Only) -->
            <v-col v-if="isAdmin" cols="12" md="6">
              <h4 class="text-subtitle-2 mb-2">Relationship Metrics</h4>
              <div class="d-flex align-center mb-3">
                <v-icon color="success" class="mr-2">mdi-account-arrow-right</v-icon>
                <div>
                  <div class="text-h5 font-weight-bold">{{ selectedPartner.referral_count || 0 }}</div>
                  <div class="text-caption text-grey">Total Referrals</div>
                </div>
              </div>
              <div class="text-body-2 mb-1">
                <strong>Last Contact:</strong> {{ selectedPartner.last_contact || 'Never' }}
              </div>
              <div class="text-body-2 mb-1">
                <strong>Next Follow-up:</strong> {{ selectedPartner.next_followup || 'Not scheduled' }}
              </div>
              <div class="text-body-2">
                <strong>Agreement:</strong> {{ selectedPartner.referral_agreement || 'None' }}
              </div>
            </v-col>
          </v-row>
          
          <div v-if="selectedPartner.tags?.length" class="mt-4">
            <h4 class="text-subtitle-2 mb-2">Tags</h4>
            <div class="d-flex flex-wrap gap-1">
              <v-chip v-for="tag in selectedPartner.tags" :key="tag" size="small" variant="tonal">
                {{ tag }}
              </v-chip>
            </div>
          </div>
          
          <!-- Notes (Admin Only) -->
          <div v-if="isAdmin && selectedPartner.notes" class="mt-4">
            <h4 class="text-subtitle-2 mb-2">Notes</h4>
            <v-alert variant="tonal" type="info" density="compact">
              {{ selectedPartner.notes }}
            </v-alert>
          </div>

          <!-- Activity Log (Admin Only) -->
          <div v-if="isAdmin" class="mt-6">
            <h4 class="text-subtitle-2 mb-2">Recent Activity</h4>
            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="activity in selectedPartner.activities?.slice(0, 5)"
                :key="activity.id"
                :dot-color="activity.type === 'call' ? 'success' : 'info'"
                size="small"
              >
                <div class="d-flex justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ activity.title }}</div>
                    <div class="text-caption text-grey">{{ activity.description }}</div>
                  </div>
                  <div class="text-caption text-grey">{{ activity.date }}</div>
                </div>
              </v-timeline-item>
            </v-timeline>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <template v-if="isAdmin">
            <v-btn variant="outlined" prepend-icon="mdi-phone" @click="logCall(selectedPartner)">
              Log Call
            </v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-email" @click="sendEmail(selectedPartner)">
              Send Email
            </v-btn>
          </template>
          <v-spacer />
          <v-btn variant="text" @click="showViewDialog = false">Close</v-btn>
          <v-btn v-if="isAdmin" color="primary" @click="editPartner(selectedPartner); showViewDialog = false">
            Edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Log Call Dialog -->
    <v-dialog v-model="showCallDialog" max-width="400">
      <v-card>
        <v-card-title>Log Call</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="callLog.date"
            label="Date"
            type="date"
            variant="outlined"
            class="mb-3"
          />
          <v-select
            v-model="callLog.outcome"
            :items="['Successful', 'No Answer', 'Left Voicemail', 'Callback Requested']"
            label="Outcome"
            variant="outlined"
            class="mb-3"
          />
          <v-textarea
            v-model="callLog.notes"
            label="Notes"
            variant="outlined"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCallDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveCallLog">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

// Get admin status
const { isAdmin } = useAppData()

useHead({
  title: 'Partnerships'
})

// State
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('All')
const filterPriority = ref('All')
const showNeedsFollowUp = ref(false)
const showAddDialog = ref(false)
const showViewDialog = ref(false)
const showCallDialog = ref(false)
const editMode = ref(false)
const selectedPartner = ref<any>(null)
const formTab = ref('basic')

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const callLog = reactive({
  date: new Date().toISOString().split('T')[0],
  outcome: '',
  notes: ''
})

const partnerTypes = [
  'Referral Clinic',
  'Specialty Hospital',
  'Emergency Clinic',
  'Independent Veterinarian',
  'Pet Store',
  'Grooming Salon',
  'Boarding Facility',
  'Training Center',
  'Rescue Organization',
  'Other Business'
]

const availableTags = [
  'High Volume',
  'Local',
  'Regional',
  'Specialty Care',
  'Emergency Services',
  'Same Owner',
  'Competitor',
  'New Relationship',
  'Long-term Partner',
  'VIP'
]

const tableHeaders = [
  { title: 'Partner', key: 'name', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true, adminOnly: true },
  { title: 'Status', key: 'status', sortable: true, adminOnly: true },
  { title: 'Referrals', key: 'referrals', sortable: true, adminOnly: true },
  { title: 'Last Contact', key: 'last_contact', sortable: true, adminOnly: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed headers based on role
const visibleTableHeaders = computed(() => {
  if (isAdmin.value) {
    return tableHeaders
  }
  // Non-admins see simplified view: Partner name, contact info, and view button
  return tableHeaders.filter(h => !h.adminOnly)
})

const form = reactive({
  id: '',
  name: '',
  type: '',
  description: '',
  status: 'Active',
  priority: 'Medium',
  contact_name: '',
  contact_title: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  referral_count: 0,
  last_contact: '',
  next_followup: '',
  referral_agreement: 'None',
  notes: '',
  tags: [] as string[]
})

// Sample partners data
const partners = ref([
  {
    id: '1',
    name: 'Animal Emergency Clinic',
    type: 'Emergency Clinic',
    description: 'Primary emergency referral partner for after-hours cases.',
    status: 'Active',
    priority: 'High',
    contact_name: 'Dr. Sarah Mitchell',
    contact_title: 'Medical Director',
    email: 'smitchell@animalemergency.com',
    phone: '555-0301',
    address: '789 Emergency Way',
    website: 'https://animalemergency.com',
    referral_count: 45,
    last_contact: 'Dec 10, 2024',
    next_followup: 'Dec 20, 2024',
    referral_agreement: 'Formal Contract',
    needs_followup: false,
    notes: 'Great relationship. Monthly referral meeting scheduled.',
    tags: ['High Volume', 'Long-term Partner', 'Emergency Services'],
    activities: [
      { id: 1, type: 'call', title: 'Monthly Check-in', description: 'Discussed referral process updates', date: 'Dec 10' },
      { id: 2, type: 'email', title: 'Referral Report Sent', description: 'November referral summary', date: 'Dec 1' }
    ]
  },
  {
    id: '2',
    name: 'Specialty Veterinary Center',
    type: 'Specialty Hospital',
    description: 'Referral partner for specialized surgeries and oncology.',
    status: 'Active',
    priority: 'High',
    contact_name: 'Dr. James Wong',
    contact_title: 'Chief of Surgery',
    email: 'jwong@specialtyvet.com',
    phone: '555-0302',
    address: '456 Specialty Drive',
    website: 'https://specialtyvet.com',
    referral_count: 32,
    last_contact: 'Dec 5, 2024',
    next_followup: 'Dec 15, 2024',
    referral_agreement: 'Formal Contract',
    needs_followup: true,
    notes: 'Excellent surgical outcomes. Need to schedule quarterly review.',
    tags: ['High Volume', 'Specialty Care', 'VIP'],
    activities: []
  },
  {
    id: '3',
    name: 'Happy Paws Pet Store',
    type: 'Pet Store',
    description: 'Local pet store that refers new pet owners for first exams.',
    status: 'Active',
    priority: 'Medium',
    contact_name: 'Mike Johnson',
    contact_title: 'Store Manager',
    email: 'mike@happypaws.com',
    phone: '555-0303',
    address: '123 Pet Lane',
    website: '',
    referral_count: 18,
    last_contact: 'Nov 28, 2024',
    next_followup: '',
    referral_agreement: 'Informal',
    needs_followup: true,
    notes: 'Provide brochures monthly. Good source of new puppy/kitten clients.',
    tags: ['Local', 'New Relationship'],
    activities: []
  },
  {
    id: '4',
    name: 'Dr. Emily Richards',
    type: 'Independent Veterinarian',
    description: 'Retired vet who refers complex cases.',
    status: 'Active',
    priority: 'Low',
    contact_name: 'Dr. Emily Richards',
    contact_title: 'DVM (Retired)',
    email: 'emily.richards@email.com',
    phone: '555-0304',
    address: '',
    website: '',
    referral_count: 8,
    last_contact: 'Nov 15, 2024',
    next_followup: '',
    referral_agreement: 'None',
    needs_followup: false,
    notes: 'Occasional referrals from former clients.',
    tags: ['Local'],
    activities: []
  },
  {
    id: '5',
    name: 'City Animal Rescue',
    type: 'Rescue Organization',
    description: 'Local rescue that refers adopted animals for initial checkups.',
    status: 'Active',
    priority: 'Medium',
    contact_name: 'Lisa Thompson',
    contact_title: 'Executive Director',
    email: 'lisa@cityanimalrescue.org',
    phone: '555-0305',
    address: '321 Rescue Road',
    website: 'https://cityanimalrescue.org',
    referral_count: 24,
    last_contact: 'Dec 8, 2024',
    next_followup: 'Jan 5, 2025',
    referral_agreement: 'Informal',
    needs_followup: false,
    notes: 'Provide discounted services for rescue animals.',
    tags: ['Local', 'Long-term Partner'],
    activities: []
  }
])

// Computed
const activePartners = computed(() => partners.value.filter(p => p.status === 'Active').length)
const referralCount = computed(() => partners.value.reduce((sum, p) => sum + (p.referral_count || 0), 0))
const needsFollowUp = computed(() => partners.value.filter(p => p.needs_followup).length)

const filteredPartners = computed(() => {
  let result = partners.value
  
  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value)
  }
  
  if (filterStatus.value !== 'All') {
    result = result.filter(p => p.status === filterStatus.value)
  }
  
  if (filterPriority.value !== 'All') {
    result = result.filter(p => p.priority === filterPriority.value)
  }
  
  if (showNeedsFollowUp.value) {
    result = result.filter(p => p.needs_followup)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query) ||
      p.contact_name?.toLowerCase().includes(query)
    )
  }
  
  return result
})

// Methods
function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    'Referral Clinic': '#4CAF50',
    'Specialty Hospital': '#2196F3',
    'Emergency Clinic': '#F44336',
    'Independent Veterinarian': '#9C27B0',
    'Pet Store': '#FF9800',
    'Grooming Salon': '#E91E63',
    'Boarding Facility': '#00BCD4',
    'Training Center': '#795548',
    'Rescue Organization': '#4CAF50',
    'Other Business': '#607D8B'
  }
  return colors[type] || '#9E9E9E'
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    'Referral Clinic': 'mdi-hospital-building',
    'Specialty Hospital': 'mdi-hospital',
    'Emergency Clinic': 'mdi-ambulance',
    'Independent Veterinarian': 'mdi-doctor',
    'Pet Store': 'mdi-store',
    'Grooming Salon': 'mdi-content-cut',
    'Boarding Facility': 'mdi-home-heart',
    'Training Center': 'mdi-school',
    'Rescue Organization': 'mdi-heart',
    'Other Business': 'mdi-briefcase'
  }
  return icons[type] || 'mdi-briefcase'
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    'High': 'error',
    'Medium': 'warning',
    'Low': 'info'
  }
  return colors[priority] || 'grey'
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'Active': 'success',
    'Inactive': 'grey',
    'Prospect': 'info'
  }
  return colors[status] || 'grey'
}

function viewPartner(partner: any) {
  selectedPartner.value = partner
  showViewDialog.value = true
}

function editPartner(partner: any) {
  Object.assign(form, partner)
  editMode.value = true
  formTab.value = 'basic'
  showAddDialog.value = true
}

function closeDialog() {
  showAddDialog.value = false
  editMode.value = false
  formTab.value = 'basic'
  resetForm()
}

function resetForm() {
  Object.assign(form, {
    id: '',
    name: '',
    type: '',
    description: '',
    status: 'Active',
    priority: 'Medium',
    contact_name: '',
    contact_title: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    referral_count: 0,
    last_contact: '',
    next_followup: '',
    referral_agreement: 'None',
    notes: '',
    tags: []
  })
}

function savePartner() {
  if (!form.name || !form.type) {
    snackbar.message = 'Please fill in required fields'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  
  if (editMode.value) {
    const index = partners.value.findIndex(p => p.id === form.id)
    if (index !== -1) {
      const existing = partners.value[index]
      if (existing) {
        partners.value[index] = { ...form, needs_followup: existing.needs_followup, activities: existing.activities }
      }
    }
    snackbar.message = 'Partner updated'
  } else {
    partners.value.push({
      ...form,
      id: Date.now().toString(),
      needs_followup: false,
      activities: []
    })
    snackbar.message = 'Partner added'
  }
  
  snackbar.color = 'success'
  snackbar.show = true
  closeDialog()
}

function logCall(partner: any) {
  selectedPartner.value = partner
  callLog.date = new Date().toISOString().split('T')[0]
  callLog.outcome = ''
  callLog.notes = ''
  showCallDialog.value = true
}

function saveCallLog() {
  if (selectedPartner.value) {
    selectedPartner.value.last_contact = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    selectedPartner.value.needs_followup = false
    
    if (!selectedPartner.value.activities) {
      selectedPartner.value.activities = []
    }
    selectedPartner.value.activities.unshift({
      id: Date.now(),
      type: 'call',
      title: `Phone Call - ${callLog.outcome}`,
      description: callLog.notes,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  
  showCallDialog.value = false
  snackbar.message = 'Call logged successfully'
  snackbar.color = 'success'
  snackbar.show = true
}

function sendEmail(partner: any) {
  window.location.href = `mailto:${partner.email}`
}

function exportPartners() {
  const csv = [
    ['Name', 'Type', 'Status', 'Priority', 'Contact', 'Email', 'Phone', 'Referrals', 'Last Contact'].join(','),
    ...filteredPartners.value.map(p => [
      `"${p.name}"`,
      p.type,
      p.status,
      p.priority,
      `"${p.contact_name || ''}"`,
      p.email || '',
      p.phone || '',
      p.referral_count || 0,
      p.last_contact || ''
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'partnerships.csv'
  link.click()
  
  snackbar.message = 'Partners exported'
  snackbar.color = 'success'
  snackbar.show = true
}
</script>

<style scoped>
.partnerships-page {
  max-width: 1400px;
}
</style>
