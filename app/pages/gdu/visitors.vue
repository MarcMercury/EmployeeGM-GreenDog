<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const supabase = useSupabaseClient()
const route = useRoute()

// Types
interface Visitor {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  visitor_type: string
  organization_name: string | null
  school_of_origin: string | null
  program_name: string | null
  visit_start_date: string | null
  visit_end_date: string | null
  lead_source: string | null
  referral_name: string | null
  notes: string | null
  is_active: boolean
  ce_event_id: string | null
  created_at: string
}

// Filter state
const searchQuery = ref('')
const selectedType = ref<string | null>(null)
const showActiveOnly = ref(false)

const typeOptions = [
  { title: 'All Types', value: null },
  { title: 'Intern', value: 'intern' },
  { title: 'Extern', value: 'extern' },
  { title: 'Student', value: 'student' },
  { title: 'CE Attendee', value: 'ce_attendee' },
  { title: 'Shadow', value: 'shadow' },
  { title: 'Other', value: 'other' }
]

const leadSourceOptions = [
  'Website',
  'Referral',
  'University Partner',
  'CE Event',
  'Social Media',
  'Job Board',
  'Walk-in',
  'Other'
]

// Fetch visitors
const { data: visitors, pending, refresh } = await useAsyncData('visitors', async () => {
  const { data, error } = await supabase
    .from('education_visitors')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as Visitor[]
})

// Filtered visitors
const filteredVisitors = computed(() => {
  let result = visitors.value || []
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(v => 
      v.first_name.toLowerCase().includes(query) ||
      v.last_name.toLowerCase().includes(query) ||
      v.email?.toLowerCase().includes(query) ||
      v.organization_name?.toLowerCase().includes(query) ||
      v.school_of_origin?.toLowerCase().includes(query)
    )
  }
  
  if (selectedType.value) {
    result = result.filter(v => v.visitor_type === selectedType.value)
  }
  
  if (showActiveOnly.value) {
    result = result.filter(v => v.is_active)
  }
  
  return result
})

// Stats
const stats = computed(() => ({
  total: visitors.value?.length || 0,
  active: visitors.value?.filter(v => v.is_active).length || 0,
  byType: typeOptions.slice(1).map(t => ({
    type: t.title,
    count: visitors.value?.filter(v => v.visitor_type === t.value).length || 0
  }))
}))

// Dialog state
const dialogOpen = ref(false)
const editingVisitor = ref<Visitor | null>(null)
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  visitor_type: 'student',
  organization_name: '',
  school_of_origin: '',
  program_name: '',
  visit_start_date: '',
  visit_end_date: '',
  lead_source: '',
  referral_name: '',
  notes: '',
  is_active: true
})

// Handle URL params
onMounted(() => {
  if (route.query.action === 'add') {
    openAddDialog()
  }
  if (route.query.edit) {
    const visitor = visitors.value?.find(v => v.id === route.query.edit)
    if (visitor) openEditDialog(visitor)
  }
})

function openAddDialog() {
  editingVisitor.value = null
  formData.value = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    visitor_type: 'student',
    organization_name: '',
    school_of_origin: '',
    program_name: '',
    visit_start_date: '',
    visit_end_date: '',
    lead_source: '',
    referral_name: '',
    notes: '',
    is_active: true
  }
  dialogOpen.value = true
}

function openEditDialog(visitor: Visitor) {
  editingVisitor.value = visitor
  formData.value = {
    first_name: visitor.first_name,
    last_name: visitor.last_name,
    email: visitor.email || '',
    phone: visitor.phone || '',
    visitor_type: visitor.visitor_type,
    organization_name: visitor.organization_name || '',
    school_of_origin: visitor.school_of_origin || '',
    program_name: visitor.program_name || '',
    visit_start_date: visitor.visit_start_date || '',
    visit_end_date: visitor.visit_end_date || '',
    lead_source: visitor.lead_source || '',
    referral_name: visitor.referral_name || '',
    notes: visitor.notes || '',
    is_active: visitor.is_active
  }
  dialogOpen.value = true
}

async function saveVisitor() {
  const payload = {
    first_name: formData.value.first_name,
    last_name: formData.value.last_name,
    email: formData.value.email || null,
    phone: formData.value.phone || null,
    visitor_type: formData.value.visitor_type,
    organization_name: formData.value.organization_name || null,
    school_of_origin: formData.value.school_of_origin || null,
    program_name: formData.value.program_name || null,
    visit_start_date: formData.value.visit_start_date || null,
    visit_end_date: formData.value.visit_end_date || null,
    lead_source: formData.value.lead_source || null,
    referral_name: formData.value.referral_name || null,
    notes: formData.value.notes || null,
    is_active: formData.value.is_active
  }
  
  if (editingVisitor.value) {
    await supabase
      .from('education_visitors')
      .update(payload)
      .eq('id', editingVisitor.value.id)
  } else {
    await supabase
      .from('education_visitors')
      .insert(payload)
  }
  
  dialogOpen.value = false
  refresh()
}

async function deleteVisitor(id: string) {
  if (!confirm('Are you sure you want to delete this visitor?')) return
  
  await supabase
    .from('education_visitors')
    .delete()
    .eq('id', id)
  
  refresh()
}

async function toggleActive(visitor: Visitor) {
  await supabase
    .from('education_visitors')
    .update({ is_active: !visitor.is_active })
    .eq('id', visitor.id)
  
  refresh()
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    intern: 'blue',
    extern: 'purple',
    student: 'green',
    ce_attendee: 'amber',
    shadow: 'cyan',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    intern: 'mdi-briefcase-account',
    extern: 'mdi-school-outline',
    student: 'mdi-account-school',
    ce_attendee: 'mdi-certificate',
    shadow: 'mdi-account-eye',
    other: 'mdi-account'
  }
  return icons[type] || 'mdi-account'
}
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" to="/gdu" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Visitor CRM</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage interns, externs, students, and CE attendees
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus"
        @click="openAddDialog"
      >
        Add Visitor
      </v-btn>
    </div>

    <!-- Stats Row -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.total }}</div>
            <div class="text-caption">Total Visitors</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.active }}</div>
            <div class="text-caption">Active</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card variant="outlined">
          <v-card-text>
            <div class="text-subtitle-2 mb-2">By Type</div>
            <div class="d-flex flex-wrap gap-1">
              <v-chip
                v-for="stat in stats.byType.filter(s => s.count > 0)"
                :key="stat.type"
                size="small"
                :color="getTypeColor(stat.type.toLowerCase())"
                variant="tonal"
              >
                {{ stat.type }}: {{ stat.count }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="5">
            <v-text-field
              v-model="searchQuery"
              label="Search visitors..."
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
              :items="typeOptions"
              label="Visitor Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-switch
              v-model="showActiveOnly"
              label="Active Only"
              color="success"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-chip color="primary" variant="tonal">
              {{ filteredVisitors.length }} Visitors
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Visitors Table -->
    <v-card>
      <v-progress-linear v-if="pending" indeterminate color="primary" />
      
      <v-table v-if="filteredVisitors.length > 0" hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Organization</th>
            <th>Visit Dates</th>
            <th>Lead Source</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="visitor in filteredVisitors"
            :key="visitor.id"
            style="cursor: pointer;"
            @click="openEditDialog(visitor)"
          >
            <td>
              <div class="d-flex align-center py-2">
                <v-avatar :color="getTypeColor(visitor.visitor_type)" size="36" class="mr-3">
                  <v-icon size="small" color="white">{{ getTypeIcon(visitor.visitor_type) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ visitor.first_name }} {{ visitor.last_name }}</div>
                  <div class="text-caption text-medium-emphasis" v-if="visitor.email">
                    {{ visitor.email }}
                  </div>
                </div>
              </div>
            </td>
            
            <td>
              <v-chip size="small" :color="getTypeColor(visitor.visitor_type)" variant="tonal">
                {{ visitor.visitor_type.replace('_', ' ') }}
              </v-chip>
            </td>
            
            <td>
              <div v-if="visitor.organization_name || visitor.school_of_origin">
                <div>{{ visitor.organization_name || visitor.school_of_origin }}</div>
                <div class="text-caption text-medium-emphasis" v-if="visitor.program_name">
                  {{ visitor.program_name }}
                </div>
              </div>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            
            <td>
              <div v-if="visitor.visit_start_date">
                {{ new Date(visitor.visit_start_date).toLocaleDateString() }}
                <span v-if="visitor.visit_end_date">
                  - {{ new Date(visitor.visit_end_date).toLocaleDateString() }}
                </span>
              </div>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            
            <td>
              {{ visitor.lead_source || '—' }}
            </td>
            
            <td>
              <v-chip
                size="small"
                :color="visitor.is_active ? 'success' : 'grey'"
                variant="flat"
                @click.stop="toggleActive(visitor)"
              >
                {{ visitor.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </td>
            
            <td>
              <v-btn
                icon
                variant="text"
                size="small"
                color="error"
                @click.stop="deleteVisitor(visitor.id)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-account-group-outline</v-icon>
        <div class="text-h6 mt-4">No visitors found</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ searchQuery || selectedType ? 'Try adjusting your filters' : 'Add your first visitor to get started' }}
        </div>
        <v-btn
          v-if="!searchQuery && !selectedType"
          color="primary"
          class="mt-4"
          @click="openAddDialog"
        >
          Add Visitor
        </v-btn>
      </div>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="dialogOpen" max-width="700" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingVisitor ? 'mdi-pencil' : 'mdi-account-plus' }}</v-icon>
          {{ editingVisitor ? 'Edit Visitor' : 'Add Visitor' }}
          <v-spacer />
          <v-btn icon variant="text" @click="dialogOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <!-- Basic Info -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.first_name"
                label="First Name *"
                variant="outlined"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.last_name"
                label="Last Name *"
                variant="outlined"
                required
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email"
                variant="outlined"
                type="email"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.phone"
                label="Phone"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.visitor_type"
                :items="typeOptions.filter(t => t.value !== null)"
                label="Visitor Type *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.is_active"
                label="Active"
                color="success"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Organization Details</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.organization_name"
                label="Organization Name"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.school_of_origin"
                label="School of Origin"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="formData.program_name"
                label="Program Name"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Visit Details</div>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.visit_start_date"
                label="Visit Start Date"
                variant="outlined"
                type="date"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.visit_end_date"
                label="Visit End Date"
                variant="outlined"
                type="date"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-combobox
                v-model="formData.lead_source"
                :items="leadSourceOptions"
                label="Lead Source"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.referral_name"
                label="Referral Name"
                variant="outlined"
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
          <v-btn color="primary" @click="saveVisitor">
            {{ editingVisitor ? 'Save Changes' : 'Add Visitor' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
