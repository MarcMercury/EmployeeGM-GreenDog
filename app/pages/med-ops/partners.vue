<template>
  <div class="med-ops-partners-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Med Ops Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Directory of medical equipment manufacturers and suppliers
        </p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        @click="showAddPartner = true"
      >
        Add Partner
      </v-btn>
    </div>

    <!-- Search and Filters -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search partners..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="categoryFilter"
              :items="categories"
              label="Category"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn-toggle v-model="viewMode" mandatory density="compact">
              <v-btn value="grid" icon="mdi-view-grid" />
              <v-btn value="list" icon="mdi-view-list" />
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grid View -->
    <v-row v-if="viewMode === 'grid'">
      <v-col v-for="partner in filteredPartners" :key="partner.id" cols="12" sm="6" md="4" lg="3">
        <v-card rounded="lg" class="h-100 partner-card" @click="openPartner(partner)">
          <div class="pa-4 text-center">
            <v-avatar size="64" :color="partner.color || 'primary'" class="mb-3">
              <v-icon size="32" color="white">{{ partner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ partner.name }}</h3>
            <v-chip size="x-small" variant="tonal" color="primary" class="mb-2">
              {{ partner.category }}
            </v-chip>
            <p class="text-body-2 text-grey text-truncate">{{ partner.description }}</p>
          </div>
          <v-divider />
          <v-card-actions class="justify-center">
            <v-btn variant="text" size="small" prepend-icon="mdi-phone">
              Contact
            </v-btn>
            <v-btn variant="text" size="small" prepend-icon="mdi-web">
              Website
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-card v-else rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="filteredPartners"
        :search="search"
        hover
        @click:row="(_, { item }) => openPartner(item)"
      >
        <template #item.name="{ item }">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="item.color || 'primary'" size="36">
              <v-icon size="18" color="white">{{ item.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-grey">{{ item.category }}</div>
            </div>
          </div>
        </template>
        <template #item.contact="{ item }">
          <div class="text-body-2">{{ item.contact_name }}</div>
          <div class="text-caption text-grey">{{ item.phone }}</div>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-phone" size="small" variant="text" @click.stop="callPartner(item)" />
          <v-btn icon="mdi-email" size="small" variant="text" @click.stop="emailPartner(item)" />
          <v-btn icon="mdi-web" size="small" variant="text" @click.stop="visitWebsite(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Partner Detail Dialog -->
    <v-dialog v-model="partnerDialog" max-width="600">
      <v-card v-if="selectedPartner">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="selectedPartner.color || 'primary'" size="48">
              <v-icon size="24" color="white">{{ selectedPartner.icon || 'mdi-factory' }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedPartner.name }}</div>
              <v-chip size="x-small" variant="tonal">{{ selectedPartner.category }}</v-chip>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="partnerDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <div class="mb-4">{{ selectedPartner.description }}</div>
          
          <v-list density="compact" class="bg-transparent">
            <v-list-item v-if="selectedPartner.contact_name">
              <template #prepend>
                <v-icon>mdi-account</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
              <v-list-item-subtitle>Primary Contact</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.phone">
              <template #prepend>
                <v-icon>mdi-phone</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.phone }}</v-list-item-title>
              <v-list-item-subtitle>Phone</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.email">
              <template #prepend>
                <v-icon>mdi-email</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.email }}</v-list-item-title>
              <v-list-item-subtitle>Email</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.website">
              <template #prepend>
                <v-icon>mdi-web</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.website }}</v-list-item-title>
              <v-list-item-subtitle>Website</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedPartner.address">
              <template #prepend>
                <v-icon>mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
              <v-list-item-subtitle>Address</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 mb-2">Products & Services</div>
          <v-chip-group>
            <v-chip v-for="product in selectedPartner.products" :key="product" size="small" variant="outlined">
              {{ product }}
            </v-chip>
          </v-chip-group>
        </v-card-text>
        
        <v-card-actions>
          <v-btn variant="text" prepend-icon="mdi-pencil">Edit</v-btn>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-phone" @click="callPartner(selectedPartner)">
            Call
          </v-btn>
          <v-btn color="primary" variant="outlined" prepend-icon="mdi-email" @click="emailPartner(selectedPartner)">
            Email
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Partner Dialog -->
    <v-dialog v-model="showAddPartner" max-width="500">
      <v-card>
        <v-card-title>Add New Partner</v-card-title>
        <v-card-text>
          <v-form ref="addFormRef">
            <v-text-field
              v-model="newPartner.name"
              label="Company Name"
              variant="outlined"
              :rules="[v => !!v || 'Required']"
              class="mb-3"
            />
            <v-select
              v-model="newPartner.category"
              :items="categories"
              label="Category"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPartner.contact_name"
              label="Contact Name"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPartner.phone"
              label="Phone"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPartner.email"
              label="Email"
              type="email"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPartner.website"
              label="Website"
              variant="outlined"
              class="mb-3"
            />
            <v-textarea
              v-model="newPartner.description"
              label="Description"
              variant="outlined"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddPartner = false">Cancel</v-btn>
          <v-btn color="primary" @click="addPartner">Add Partner</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Med Ops Partners'
})

// State
const search = ref('')
const categoryFilter = ref<string | null>(null)
const viewMode = ref('grid')
const partnerDialog = ref(false)
const showAddPartner = ref(false)
const selectedPartner = ref<any>(null)
const addFormRef = ref()

const newPartner = reactive({
  name: '',
  category: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  description: ''
})

const categories = [
  'Imaging Equipment',
  'Surgical Instruments',
  'Laboratory',
  'Pharmaceuticals',
  'Anesthesia',
  'Dental',
  'Monitoring',
  'Consumables',
  'Software',
  'Other'
]

const tableHeaders = [
  { title: 'Partner', key: 'name' },
  { title: 'Contact', key: 'contact' },
  { title: 'Email', key: 'email' },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

// Sample partners data
const partners = ref([
  { id: '1', name: 'IDEXX Laboratories', category: 'Laboratory', description: 'Diagnostic testing and IT solutions for veterinary practices', contact_name: 'Sales Team', phone: '1-800-548-6733', email: 'info@idexx.com', website: 'www.idexx.com', icon: 'mdi-flask', color: 'blue', products: ['Blood Chemistry', 'Urinalysis', 'SNAP Tests', 'VetLab Station'] },
  { id: '2', name: 'Zoetis', category: 'Pharmaceuticals', description: 'Global animal health company with vaccines and medicines', contact_name: 'Vet Sales', phone: '1-888-963-8471', email: 'info@zoetis.com', website: 'www.zoetis.com', icon: 'mdi-pill', color: 'green', products: ['Vaccines', 'Parasiticides', 'Antibiotics', 'Pain Management'] },
  { id: '3', name: 'VetRay', category: 'Imaging Equipment', description: 'Digital radiography systems for veterinary clinics', contact_name: 'Technical Support', phone: '1-800-555-0199', email: 'support@vetray.com', website: 'www.vetray.com', icon: 'mdi-radiology-box', color: 'purple', products: ['Digital X-Ray', 'DR Panels', 'PACS Software'] },
  { id: '4', name: 'Midmark', category: 'Surgical Instruments', description: 'Surgical tables, lighting, and equipment', contact_name: 'Sales', phone: '1-800-643-6275', email: 'sales@midmark.com', website: 'www.midmark.com', icon: 'mdi-medical-bag', color: 'teal', products: ['Exam Tables', 'Surgical Lights', 'Autoclaves'] },
  { id: '5', name: 'VetEquip', category: 'Anesthesia', description: 'Anesthesia machines and monitoring equipment', contact_name: 'Orders', phone: '1-800-466-6463', email: 'orders@vetequip.com', website: 'www.vetequip.com', icon: 'mdi-gas-cylinder', color: 'orange', products: ['Anesthesia Machines', 'Ventilators', 'Vaporizers'] },
  { id: '6', name: 'iM3', category: 'Dental', description: 'Veterinary dental equipment and instruments', contact_name: 'Support', phone: '1-800-346-0444', email: 'info@im3vet.com', website: 'www.im3vet.com', icon: 'mdi-tooth', color: 'cyan', products: ['Dental Units', 'Ultrasonic Scalers', 'Dental X-Ray'] },
  { id: '7', name: 'Heska', category: 'Laboratory', description: 'Point-of-care diagnostics and specialty products', contact_name: 'Customer Care', phone: '1-800-464-3752', email: 'customercare@heska.com', website: 'www.heska.com', icon: 'mdi-test-tube', color: 'red', products: ['Element DC', 'HemaTrue', 'Allergy Testing'] },
  { id: '8', name: 'SurgiVet', category: 'Monitoring', description: 'Patient monitoring systems', contact_name: 'Tech Support', phone: '1-800-447-8433', email: 'support@surgivet.com', website: 'www.surgivet.com', icon: 'mdi-heart-pulse', color: 'pink', products: ['Multi-Parameter Monitors', 'Pulse Oximeters', 'Capnographs'] }
])

// Computed
const filteredPartners = computed(() => {
  return partners.value.filter(p => {
    const matchesSearch = !search.value || 
      p.name.toLowerCase().includes(search.value.toLowerCase()) ||
      p.description.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || p.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

// Methods
function openPartner(partner: any) {
  selectedPartner.value = partner
  partnerDialog.value = true
}

function callPartner(partner: any) {
  window.open(`tel:${partner.phone}`, '_self')
}

function emailPartner(partner: any) {
  window.open(`mailto:${partner.email}`, '_blank')
}

function visitWebsite(partner: any) {
  window.open(`https://${partner.website}`, '_blank')
}

async function addPartner() {
  const { valid } = await addFormRef.value?.validate()
  if (!valid) return

  partners.value.push({
    id: Date.now().toString(),
    ...newPartner,
    icon: 'mdi-factory',
    color: 'grey',
    products: []
  })

  showAddPartner.value = false
  Object.assign(newPartner, {
    name: '',
    category: '',
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    description: ''
  })
}
</script>

<style scoped>
.med-ops-partners-page {
  max-width: 1400px;
}

.partner-card {
  cursor: pointer;
  transition: all 0.2s;
}

.partner-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}
</style>
