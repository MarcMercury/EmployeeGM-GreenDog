<script setup lang="ts">
/**
 * Contact List - Simple Static Employee Directory
 * 
 * A basic list of all employees showing:
 * - Name, Email, Position, Reports To
 * - Accessible to ALL access levels
 * - No clickable profiles, just reference info
 */
definePageMeta({
  layout: 'default',
  middleware: ['auth']  // No special access required - all authenticated users
})

const supabase = useSupabaseClient()

interface ContactEmployee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  position_title: string | null
  department_name: string | null
  manager_first_name: string | null
  manager_last_name: string | null
  phone: string | null
  status: string
}

const employees = ref<ContactEmployee[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedDepartment = ref<string | null>(null)

// Fetch all employees with their manager info
async function fetchEmployees() {
  loading.value = true
  
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      status,
      position:position_id(title),
      department:department_id(name),
      manager:manager_id(first_name, last_name)
    `)
    .eq('status', 'active')
    .order('last_name')
    .order('first_name')
  
  if (error) {
    console.error('Error fetching employees:', error)
  } else {
    employees.value = (data || []).map(emp => ({
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone,
      status: emp.status,
      position_title: emp.position?.title || null,
      department_name: emp.department?.name || null,
      manager_first_name: emp.manager?.first_name || null,
      manager_last_name: emp.manager?.last_name || null
    }))
  }
  
  loading.value = false
}

// Get unique departments for filter
const departments = computed(() => {
  const depts = new Set<string>()
  employees.value.forEach(e => {
    if (e.department_name) depts.add(e.department_name)
  })
  return Array.from(depts).sort()
})

// Filtered employees
const filteredEmployees = computed(() => {
  let result = employees.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      e.first_name.toLowerCase().includes(query) ||
      e.last_name.toLowerCase().includes(query) ||
      (e.email && e.email.toLowerCase().includes(query)) ||
      (e.position_title && e.position_title.toLowerCase().includes(query))
    )
  }
  
  if (selectedDepartment.value) {
    result = result.filter(e => e.department_name === selectedDepartment.value)
  }
  
  return result
})

// Format manager name
function formatManager(emp: ContactEmployee): string {
  if (emp.manager_first_name && emp.manager_last_name) {
    return `${emp.manager_first_name} ${emp.manager_last_name}`
  }
  return '—'
}

onMounted(() => {
  fetchEmployees()
})
</script>

<template>
  <div class="contact-list-page pa-4">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">Contact List</h1>
      <p class="text-body-2 text-grey-darken-1">
        Quick reference directory for all team members
      </p>
    </div>

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              placeholder="Search by name, email, or position..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="4" md="3">
            <v-select
              v-model="selectedDepartment"
              :items="departments"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" sm="2" md="2">
            <div class="text-body-2 text-grey">
              {{ filteredEmployees.length }} contacts
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading contacts...</p>
    </div>

    <!-- Contact Table -->
    <v-card v-else variant="outlined">
      <v-table hover density="comfortable">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-left font-weight-bold">Name</th>
            <th class="text-left font-weight-bold">Email</th>
            <th class="text-left font-weight-bold">Position</th>
            <th class="text-left font-weight-bold">Department</th>
            <th class="text-left font-weight-bold">Reports To</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in filteredEmployees" :key="emp.id">
            <td>
              <div class="d-flex align-center py-2">
                <v-avatar size="32" color="primary" class="mr-3">
                  <span class="text-white text-caption font-weight-bold">
                    {{ emp.first_name.charAt(0) }}{{ emp.last_name.charAt(0) }}
                  </span>
                </v-avatar>
                <span class="font-weight-medium">{{ emp.first_name }} {{ emp.last_name }}</span>
              </div>
            </td>
            <td>
              <a v-if="emp.email" :href="`mailto:${emp.email}`" class="text-primary text-decoration-none">
                {{ emp.email }}
              </a>
              <span v-else class="text-grey">—</span>
            </td>
            <td>{{ emp.position_title || '—' }}</td>
            <td>
              <v-chip v-if="emp.department_name" size="small" variant="tonal" color="primary">
                {{ emp.department_name }}
              </v-chip>
              <span v-else class="text-grey">—</span>
            </td>
            <td>{{ formatManager(emp) }}</td>
          </tr>
        </tbody>
      </v-table>
      
      <!-- Empty State -->
      <div v-if="filteredEmployees.length === 0 && !loading" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-1">mdi-account-search</v-icon>
        <p class="text-grey mt-4">No contacts found matching your search</p>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.contact-list-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
