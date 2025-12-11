<template>
  <div class="resources-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Resources</h1>
        <p class="text-body-1 text-grey-darken-1">
          Comprehensive directory of vendors, agencies, photographers, and resources
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-download" @click="exportResources">
          Export
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddDialog = true">
          Add Resource
        </v-btn>
      </div>
    </div>

    <!-- Filters & Search -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search resources..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filterCategory"
              :items="categories"
              label="Category"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filterStatus"
              :items="['All', 'Active', 'Inactive', 'Preferred']"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn-toggle v-model="viewMode" mandatory variant="outlined">
              <v-btn icon="mdi-view-grid" value="grid" />
              <v-btn icon="mdi-view-list" value="list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Category Quick Filters -->
    <div class="d-flex flex-wrap gap-2 mb-6">
      <v-chip
        v-for="cat in categoryChips"
        :key="cat.value"
        :color="filterCategory === cat.value ? 'primary' : 'grey'"
        :variant="filterCategory === cat.value ? 'flat' : 'outlined'"
        :prepend-icon="cat.icon"
        @click="filterCategory = filterCategory === cat.value ? '' : cat.value"
      >
        {{ cat.label }} ({{ getCategoryCount(cat.value) }})
      </v-chip>
    </div>

    <!-- Grid View -->
    <v-row v-if="viewMode === 'grid'">
      <v-col v-for="resource in filteredResources" :key="resource.id" cols="12" sm="6" md="4" lg="3">
        <v-card rounded="lg" class="resource-card h-100" @click="viewResource(resource)">
          <div class="resource-header" :style="{ backgroundColor: getCategoryColor(resource.category) }">
            <v-avatar size="48" color="white">
              <v-icon :color="getCategoryColor(resource.category)">{{ getCategoryIcon(resource.category) }}</v-icon>
            </v-avatar>
            <v-chip
              v-if="resource.preferred"
              color="warning"
              size="x-small"
              class="preferred-badge"
            >
              <v-icon size="12">mdi-star</v-icon>
            </v-chip>
          </div>
          
          <v-card-text>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ resource.name }}</h3>
            <v-chip size="x-small" variant="outlined" class="mb-2">{{ resource.category }}</v-chip>
            <p class="text-body-2 text-grey-darken-1 mb-3 description-text">
              {{ resource.description }}
            </p>
            <div class="d-flex align-center gap-1 flex-wrap">
              <v-chip v-for="tag in resource.tags?.slice(0, 2)" :key="tag" size="x-small" variant="tonal">
                {{ tag }}
              </v-chip>
              <v-chip v-if="resource.tags?.length > 2" size="x-small" variant="text">
                +{{ resource.tags.length - 2 }}
              </v-chip>
            </div>
          </v-card-text>
          
          <v-divider />
          
          <v-card-actions>
            <v-btn size="small" variant="text" :href="`mailto:${resource.email}`" @click.stop>
              <v-icon>mdi-email</v-icon>
            </v-btn>
            <v-btn size="small" variant="text" :href="`tel:${resource.phone}`" @click.stop>
              <v-icon>mdi-phone</v-icon>
            </v-btn>
            <v-btn v-if="resource.website" size="small" variant="text" :href="resource.website" target="_blank" @click.stop>
              <v-icon>mdi-open-in-new</v-icon>
            </v-btn>
            <v-spacer />
            <v-btn size="small" variant="text" icon="mdi-pencil" @click.stop="editResource(resource)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredResources"
        :search="searchQuery"
        hover
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar size="36" :color="getCategoryColor(item.category)" class="mr-3">
              <v-icon color="white" size="small">{{ getCategoryIcon(item.category) }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.description?.substring(0, 50) }}...</div>
            </div>
            <v-icon v-if="item.preferred" color="warning" size="small" class="ml-2">mdi-star</v-icon>
          </div>
        </template>
        
        <template #item.category="{ item }">
          <v-chip size="small" variant="outlined">{{ item.category }}</v-chip>
        </template>
        
        <template #item.contact="{ item }">
          <div class="text-body-2">{{ item.contact_name }}</div>
          <div class="text-caption text-grey">{{ item.email }}</div>
        </template>
        
        <template #item.status="{ item }">
          <v-chip :color="item.active ? 'success' : 'grey'" size="small" variant="flat">
            {{ item.active ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>
        
        <template #item.actions="{ item }">
          <v-btn icon="mdi-eye" size="small" variant="text" @click="viewResource(item)" />
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="editResource(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="deleteResource(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Add/Edit Dialog -->
    <v-dialog v-model="showAddDialog" max-width="600">
      <v-card>
        <v-card-title>{{ editMode ? 'Edit Resource' : 'Add Resource' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.name"
                label="Resource Name *"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="form.category"
                :items="categories"
                label="Category *"
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
              <v-text-field
                v-model="form.contact_name"
                label="Contact Name"
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
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.website"
                label="Website"
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
            <v-col cols="12" md="6">
              <div class="d-flex gap-4 pt-4">
                <v-switch v-model="form.active" label="Active" color="success" hide-details />
                <v-switch v-model="form.preferred" label="Preferred" color="warning" hide-details />
              </div>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Internal Notes"
                variant="outlined"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveResource">{{ editMode ? 'Update' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Dialog -->
    <v-dialog v-model="showViewDialog" max-width="600">
      <v-card v-if="selectedResource">
        <div class="pa-6 text-center" :style="{ backgroundColor: getCategoryColor(selectedResource.category) + '22' }">
          <v-avatar size="80" :color="getCategoryColor(selectedResource.category)">
            <v-icon size="40" color="white">{{ getCategoryIcon(selectedResource.category) }}</v-icon>
          </v-avatar>
          <h2 class="text-h5 font-weight-bold mt-4">{{ selectedResource.name }}</h2>
          <v-chip size="small" variant="outlined" class="mt-2">{{ selectedResource.category }}</v-chip>
        </div>
        
        <v-card-text>
          <p class="text-body-1 mb-4">{{ selectedResource.description }}</p>
          
          <v-list density="compact">
            <v-list-item v-if="selectedResource.contact_name" prepend-icon="mdi-account">
              <v-list-item-title>{{ selectedResource.contact_name }}</v-list-item-title>
              <v-list-item-subtitle>Contact Person</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedResource.email" prepend-icon="mdi-email">
              <v-list-item-title>{{ selectedResource.email }}</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedResource.phone" prepend-icon="mdi-phone">
              <v-list-item-title>{{ selectedResource.phone }}</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedResource.website" prepend-icon="mdi-web">
              <v-list-item-title>
                <a :href="selectedResource.website" target="_blank">{{ selectedResource.website }}</a>
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedResource.address" prepend-icon="mdi-map-marker">
              <v-list-item-title>{{ selectedResource.address }}</v-list-item-title>
            </v-list-item>
          </v-list>
          
          <div v-if="selectedResource.tags?.length" class="mt-4">
            <div class="text-caption text-grey mb-2">Tags</div>
            <div class="d-flex flex-wrap gap-1">
              <v-chip v-for="tag in selectedResource.tags" :key="tag" size="small" variant="tonal">
                {{ tag }}
              </v-chip>
            </div>
          </div>
          
          <div v-if="selectedResource.notes" class="mt-4">
            <div class="text-caption text-grey mb-1">Internal Notes</div>
            <v-alert type="info" variant="tonal" density="compact">
              {{ selectedResource.notes }}
            </v-alert>
          </div>
        </v-card-text>
        
        <v-card-actions>
          <v-btn variant="text" @click="showViewDialog = false">Close</v-btn>
          <v-spacer />
          <v-btn color="primary" @click="editResource(selectedResource); showViewDialog = false">
            Edit Resource
          </v-btn>
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
  middleware: ['auth', 'admin']
})

useHead({
  title: 'Resources'
})

// State
const searchQuery = ref('')
const filterCategory = ref('')
const filterStatus = ref('All')
const viewMode = ref('grid')
const showAddDialog = ref(false)
const showViewDialog = ref(false)
const editMode = ref(false)
const selectedResource = ref<any>(null)

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const categories = [
  'Photography',
  'Videography',
  'Graphic Design',
  'Marketing Agency',
  'Printing Services',
  'Web Development',
  'Social Media',
  'PR Agency',
  'Event Planning',
  'Promotional Products',
  'Signage',
  'Other'
]

const categoryChips = [
  { label: 'Photography', value: 'Photography', icon: 'mdi-camera' },
  { label: 'Videography', value: 'Videography', icon: 'mdi-video' },
  { label: 'Marketing', value: 'Marketing Agency', icon: 'mdi-bullhorn' },
  { label: 'Design', value: 'Graphic Design', icon: 'mdi-palette' },
  { label: 'Printing', value: 'Printing Services', icon: 'mdi-printer' },
  { label: 'Events', value: 'Event Planning', icon: 'mdi-party-popper' }
]

const availableTags = [
  'Local',
  'National',
  'Premium',
  'Budget-Friendly',
  'Fast Turnaround',
  'Pet Specialty',
  'Veterinary Focus',
  'Digital',
  'Print',
  'Video Production',
  'Social Media Expert',
  'SEO',
  'PPC',
  'Content Creation'
]

const tableHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Contact', key: 'contact' },
  { title: 'Phone', key: 'phone' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false }
]

const form = reactive({
  id: '',
  name: '',
  category: '',
  description: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  tags: [] as string[],
  active: true,
  preferred: false,
  notes: ''
})

// Sample resources data
const resources = ref([
  {
    id: '1',
    name: 'PetLens Photography',
    category: 'Photography',
    description: 'Specialized in pet and veterinary clinic photography. Excellent at capturing natural moments with animals.',
    contact_name: 'Jennifer Adams',
    email: 'hello@petlens.com',
    phone: '555-0201',
    website: 'https://petlens.com',
    address: '456 Photo Lane, Animal City',
    tags: ['Pet Specialty', 'Local', 'Premium'],
    active: true,
    preferred: true,
    notes: 'Great for social media content and website updates'
  },
  {
    id: '2',
    name: 'Vet Marketing Pro',
    category: 'Marketing Agency',
    description: 'Full-service marketing agency specializing in veterinary practices. Digital and traditional marketing services.',
    contact_name: 'David Miller',
    email: 'david@vetmarketingpro.com',
    phone: '555-0202',
    website: 'https://vetmarketingpro.com',
    address: '789 Marketing Blvd',
    tags: ['Veterinary Focus', 'Digital', 'SEO', 'PPC'],
    active: true,
    preferred: true,
    notes: 'Running our Google Ads campaigns'
  },
  {
    id: '3',
    name: 'Creative Paws Design',
    category: 'Graphic Design',
    description: 'Boutique design studio focusing on pet industry branding and marketing materials.',
    contact_name: 'Sarah Chen',
    email: 'sarah@creativepaws.design',
    phone: '555-0203',
    website: 'https://creativepaws.design',
    address: '',
    tags: ['Pet Specialty', 'Premium', 'Content Creation'],
    active: true,
    preferred: false,
    notes: ''
  },
  {
    id: '4',
    name: 'Quick Print Solutions',
    category: 'Printing Services',
    description: 'Local printing company with fast turnaround. Business cards, brochures, and large format printing.',
    contact_name: 'Tom Roberts',
    email: 'orders@quickprint.com',
    phone: '555-0204',
    website: 'https://quickprint.com',
    address: '321 Print Ave',
    tags: ['Local', 'Fast Turnaround', 'Budget-Friendly'],
    active: true,
    preferred: false,
    notes: 'Use for standard print jobs'
  },
  {
    id: '5',
    name: 'Animal Tales Video',
    category: 'Videography',
    description: 'Video production company specializing in pet-related content. Testimonials, commercials, and educational videos.',
    contact_name: 'Mike Johnson',
    email: 'mike@animaltalesvideo.com',
    phone: '555-0205',
    website: 'https://animaltalesvideo.com',
    address: '555 Film Street',
    tags: ['Pet Specialty', 'Video Production', 'Premium'],
    active: true,
    preferred: true,
    notes: 'Created our clinic tour video'
  },
  {
    id: '6',
    name: 'Social Paw Media',
    category: 'Social Media',
    description: 'Social media management and content creation focused on the veterinary and pet care industry.',
    contact_name: 'Emma White',
    email: 'hello@socialpaw.com',
    phone: '555-0206',
    website: 'https://socialpaw.com',
    address: '',
    tags: ['Pet Specialty', 'Social Media Expert', 'Content Creation'],
    active: true,
    preferred: false,
    notes: ''
  }
])

// Computed
const filteredResources = computed(() => {
  let result = resources.value
  
  if (filterCategory.value) {
    result = result.filter(r => r.category === filterCategory.value)
  }
  
  if (filterStatus.value !== 'All') {
    if (filterStatus.value === 'Active') {
      result = result.filter(r => r.active)
    } else if (filterStatus.value === 'Inactive') {
      result = result.filter(r => !r.active)
    } else if (filterStatus.value === 'Preferred') {
      result = result.filter(r => r.preferred)
    }
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      r.tags?.some(t => t.toLowerCase().includes(query))
    )
  }
  
  return result
})

// Methods
function getCategoryCount(category: string) {
  return resources.value.filter(r => r.category === category).length
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Photography': '#E91E63',
    'Videography': '#9C27B0',
    'Graphic Design': '#673AB7',
    'Marketing Agency': '#2196F3',
    'Printing Services': '#00BCD4',
    'Web Development': '#4CAF50',
    'Social Media': '#FF9800',
    'PR Agency': '#795548',
    'Event Planning': '#F44336',
    'Promotional Products': '#607D8B',
    'Signage': '#FFEB3B',
    'Other': '#9E9E9E'
  }
  return colors[category] || '#9E9E9E'
}

function getCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    'Photography': 'mdi-camera',
    'Videography': 'mdi-video',
    'Graphic Design': 'mdi-palette',
    'Marketing Agency': 'mdi-bullhorn',
    'Printing Services': 'mdi-printer',
    'Web Development': 'mdi-web',
    'Social Media': 'mdi-instagram',
    'PR Agency': 'mdi-newspaper',
    'Event Planning': 'mdi-party-popper',
    'Promotional Products': 'mdi-gift',
    'Signage': 'mdi-sign-real-estate',
    'Other': 'mdi-dots-horizontal'
  }
  return icons[category] || 'mdi-dots-horizontal'
}

function viewResource(resource: any) {
  selectedResource.value = resource
  showViewDialog.value = true
}

function editResource(resource: any) {
  Object.assign(form, resource)
  editMode.value = true
  showAddDialog.value = true
}

function deleteResource(resource: any) {
  resources.value = resources.value.filter(r => r.id !== resource.id)
  snackbar.message = 'Resource deleted'
  snackbar.color = 'info'
  snackbar.show = true
}

function closeDialog() {
  showAddDialog.value = false
  editMode.value = false
  resetForm()
}

function resetForm() {
  Object.assign(form, {
    id: '',
    name: '',
    category: '',
    description: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    tags: [],
    active: true,
    preferred: false,
    notes: ''
  })
}

function saveResource() {
  if (!form.name || !form.category) {
    snackbar.message = 'Please fill in required fields'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  
  if (editMode.value) {
    const index = resources.value.findIndex(r => r.id === form.id)
    if (index !== -1) {
      resources.value[index] = { ...form }
    }
    snackbar.message = 'Resource updated'
  } else {
    resources.value.push({
      ...form,
      id: Date.now().toString()
    })
    snackbar.message = 'Resource added'
  }
  
  snackbar.color = 'success'
  snackbar.show = true
  closeDialog()
}

function exportResources() {
  const csv = [
    ['Name', 'Category', 'Contact', 'Email', 'Phone', 'Website', 'Status'].join(','),
    ...filteredResources.value.map(r => [
      `"${r.name}"`,
      r.category,
      `"${r.contact_name || ''}"`,
      r.email || '',
      r.phone || '',
      r.website || '',
      r.active ? 'Active' : 'Inactive'
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'resources.csv'
  link.click()
  
  snackbar.message = 'Resources exported'
  snackbar.color = 'success'
  snackbar.show = true
}
</script>

<style scoped>
.resources-page {
  max-width: 1400px;
}

.resource-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.resource-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preferred-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.description-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
