<template>
  <div class="medical-boards-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Medical Boards</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track daily appointments and patient status across departments
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-refresh"
          @click="refreshBoards"
          :loading="loading"
        >
          Refresh
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="showAddPatient = true"
        >
          Add Patient
        </v-btn>
      </div>
    </div>

    <!-- Department Tabs -->
    <v-tabs v-model="selectedDepartment" color="primary" class="mb-6">
      <v-tab v-for="dept in departments" :key="dept.id" :value="dept.id">
        <v-icon start>{{ dept.icon }}</v-icon>
        {{ dept.name }}
        <v-badge
          v-if="getDepartmentCount(dept.id) > 0"
          :content="getDepartmentCount(dept.id)"
          color="primary"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <!-- Workflow Board -->
    <div class="workflow-board">
      <v-row>
        <v-col v-for="column in boardColumns" :key="column.id" cols="12" md="3">
          <v-card 
            variant="outlined" 
            rounded="lg" 
            class="h-100"
            :class="`column-${column.id}`"
          >
            <v-card-title class="d-flex align-center justify-space-between py-3">
              <div class="d-flex align-center">
                <v-icon :color="column.color" class="mr-2" size="small">{{ column.icon }}</v-icon>
                <span class="text-subtitle-1 font-weight-medium">{{ column.title }}</span>
              </div>
              <v-chip size="small" variant="tonal" :color="column.color">
                {{ getColumnPatients(column.id).length }}
              </v-chip>
            </v-card-title>
            
            <v-divider />
            
            <v-card-text class="pa-2 scrollable-lg">
              <!-- Patient Cards -->
              <div
                v-for="patient in getColumnPatients(column.id)"
                :key="patient.id"
                class="patient-card mb-2 pa-3 rounded-lg cursor-pointer"
                :class="{ 'patient-urgent': patient.urgent }"
                @click="openPatientDetail(patient)"
              >
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="d-flex align-center gap-2">
                    <v-avatar :color="getSpeciesColor(patient.species)" size="28">
                      <v-icon size="16" color="white">{{ getSpeciesIcon(patient.species) }}</v-icon>
                    </v-avatar>
                    <span class="font-weight-medium text-body-2">{{ patient.name }}</span>
                  </div>
                  <v-chip v-if="patient.urgent" size="x-small" color="error" variant="flat">
                    URGENT
                  </v-chip>
                </div>
                
                <div class="text-caption text-grey mb-1">
                  {{ patient.species }} • {{ patient.breed }}
                </div>
                
                <div class="text-caption mb-2">
                  <v-icon size="12" class="mr-1">mdi-stethoscope</v-icon>
                  {{ patient.reason }}
                </div>
                
                <div class="d-flex align-center justify-space-between">
                  <div class="text-caption text-grey">
                    <v-icon size="12">mdi-clock-outline</v-icon>
                    {{ formatTime(patient.appointment_time) }}
                  </div>
                  <v-avatar size="20" color="grey-lighten-2">
                    <span class="text-caption">{{ patient.veterinarian?.initials || '?' }}</span>
                  </v-avatar>
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="getColumnPatients(column.id).length === 0" class="text-center py-8">
                <v-icon size="32" color="grey-lighten-2">mdi-clipboard-text-outline</v-icon>
                <div class="text-caption text-grey mt-2">No patients</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Patient Detail Dialog -->
    <v-dialog v-model="patientDialog" max-width="600">
      <v-card v-if="selectedPatient">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar :color="getSpeciesColor(selectedPatient.species)" size="40">
              <v-icon color="white">{{ getSpeciesIcon(selectedPatient.species) }}</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6">{{ selectedPatient.name }}</div>
              <div class="text-caption text-grey">{{ selectedPatient.species }} • {{ selectedPatient.breed }}</div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="patientDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <div class="text-caption text-grey">Owner</div>
              <div class="text-body-2 font-weight-medium">{{ selectedPatient.owner_name }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Contact</div>
              <div class="text-body-2">{{ selectedPatient.owner_phone }}</div>
            </v-col>
            <v-col cols="12">
              <div class="text-caption text-grey">Reason for Visit</div>
              <div class="text-body-2">{{ selectedPatient.reason }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Appointment Time</div>
              <div class="text-body-2">{{ formatTime(selectedPatient.appointment_time) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Veterinarian</div>
              <div class="text-body-2">{{ selectedPatient.veterinarian?.name || 'Unassigned' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div class="text-caption text-grey mb-2">Notes</div>
          <v-textarea
            v-model="selectedPatient.notes"
            variant="outlined"
            rows="3"
            placeholder="Add notes..."
          />

          <div class="text-caption text-grey mb-2">Move to Status</div>
          <v-btn-toggle v-model="selectedPatient.status" mandatory color="primary">
            <v-btn v-for="col in boardColumns" :key="col.id" :value="col.id" size="small">
              {{ col.title }}
            </v-btn>
          </v-btn-toggle>
        </v-card-text>
        
        <v-card-actions>
          <v-btn variant="text" color="error" @click="cancelAppointment">Cancel Appointment</v-btn>
          <v-spacer />
          <v-btn variant="text" @click="patientDialog = false">Close</v-btn>
          <v-btn color="primary" @click="updatePatient">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Patient Dialog -->
    <v-dialog v-model="showAddPatient" max-width="500">
      <v-card>
        <v-card-title>Add New Patient</v-card-title>
        <v-card-text>
          <v-form ref="addFormRef">
            <v-text-field
              v-model="newPatient.name"
              label="Patient Name"
              variant="outlined"
              :rules="[v => !!v || 'Required']"
              class="mb-3"
            />
            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="newPatient.species"
                  :items="['Dog', 'Cat', 'Bird', 'Exotic']"
                  label="Species"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newPatient.breed"
                  label="Breed"
                  variant="outlined"
                />
              </v-col>
            </v-row>
            <v-text-field
              v-model="newPatient.owner_name"
              label="Owner Name"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPatient.owner_phone"
              label="Owner Phone"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPatient.reason"
              label="Reason for Visit"
              variant="outlined"
              class="mb-3"
            />
            <v-text-field
              v-model="newPatient.appointment_time"
              label="Appointment Time"
              type="time"
              variant="outlined"
              class="mb-3"
            />
            <v-checkbox
              v-model="newPatient.urgent"
              label="Mark as Urgent"
              color="error"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddPatient = false">Cancel</v-btn>
          <v-btn color="primary" @click="addPatient">Add Patient</v-btn>
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
interface Patient {
  id: string
  name: string
  species: string
  breed: string
  owner_name: string
  owner_phone: string
  reason: string
  appointment_time: string
  status: string
  urgent: boolean
  department: string
  veterinarian: { name: string; initials: string }
  notes?: string
}

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

useHead({
  title: 'Medical Boards'
})

// State
const loading = ref(false)
const selectedDepartment = ref('general')
const patientDialog = ref(false)
const showAddPatient = ref(false)
const selectedPatient = ref<Patient | null>(null)
const addFormRef = ref()

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

const newPatient = reactive({
  name: '',
  species: 'Dog',
  breed: '',
  owner_name: '',
  owner_phone: '',
  reason: '',
  appointment_time: '',
  urgent: false
})

const departments = [
  { id: 'general', name: 'General Practice', icon: 'mdi-hospital-box' },
  { id: 'surgery', name: 'Surgery', icon: 'mdi-medical-bag' },
  { id: 'emergency', name: 'Emergency', icon: 'mdi-ambulance' },
  { id: 'specialty', name: 'Specialty', icon: 'mdi-star-circle' }
]

const boardColumns = [
  { id: 'waiting', title: 'Waiting', icon: 'mdi-clock-outline', color: 'warning' },
  { id: 'in-exam', title: 'In Exam', icon: 'mdi-stethoscope', color: 'primary' },
  { id: 'treatment', title: 'Treatment', icon: 'mdi-needle', color: 'info' },
  { id: 'checkout', title: 'Checkout', icon: 'mdi-check-circle', color: 'success' }
]

// Sample patient data
const patients = ref<Patient[]>([
  { id: '1', name: 'Max', species: 'Dog', breed: 'Labrador', owner_name: 'John Smith', owner_phone: '555-1234', reason: 'Annual wellness exam', appointment_time: '09:00', status: 'waiting', urgent: false, department: 'general', veterinarian: { name: 'Dr. Johnson', initials: 'DJ' } },
  { id: '2', name: 'Luna', species: 'Cat', breed: 'Persian', owner_name: 'Sarah Davis', owner_phone: '555-5678', reason: 'Vaccinations', appointment_time: '09:30', status: 'in-exam', urgent: false, department: 'general', veterinarian: { name: 'Dr. Wilson', initials: 'DW' } },
  { id: '3', name: 'Rocky', species: 'Dog', breed: 'German Shepherd', owner_name: 'Mike Brown', owner_phone: '555-9012', reason: 'Limping - possible injury', appointment_time: '10:00', status: 'waiting', urgent: true, department: 'general', veterinarian: { name: 'Dr. Johnson', initials: 'DJ' } },
  { id: '4', name: 'Bella', species: 'Dog', breed: 'Golden Retriever', owner_name: 'Emily Wilson', owner_phone: '555-3456', reason: 'Post-surgery follow-up', appointment_time: '10:30', status: 'treatment', urgent: false, department: 'surgery', veterinarian: { name: 'Dr. Martinez', initials: 'DM' } },
  { id: '5', name: 'Whiskers', species: 'Cat', breed: 'Siamese', owner_name: 'Tom Clark', owner_phone: '555-7890', reason: 'Dental cleaning', appointment_time: '11:00', status: 'checkout', urgent: false, department: 'general', veterinarian: { name: 'Dr. Wilson', initials: 'DW' } }
])

// Computed
function getDepartmentCount(deptId: string) {
  return patients.value.filter(p => p.department === deptId).length
}

function getColumnPatients(columnId: string) {
  return patients.value.filter(p => 
    p.department === selectedDepartment.value && p.status === columnId
  )
}

function getSpeciesColor(species: string) {
  const colors: Record<string, string> = {
    'Dog': 'amber',
    'Cat': 'purple',
    'Bird': 'cyan',
    'Exotic': 'green'
  }
  return colors[species] || 'grey'
}

function getSpeciesIcon(species: string) {
  const icons: Record<string, string> = {
    'Dog': 'mdi-dog',
    'Cat': 'mdi-cat',
    'Bird': 'mdi-bird',
    'Exotic': 'mdi-paw'
  }
  return icons[species] || 'mdi-paw'
}

function formatTime(time: string | undefined) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours || '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function openPatientDetail(patient: any) {
  selectedPatient.value = { ...patient }
  patientDialog.value = true
}

function updatePatient() {
  if (!selectedPatient.value) return
  const index = patients.value.findIndex(p => p.id === selectedPatient.value!.id)
  if (index !== -1) {
    patients.value[index] = { ...selectedPatient.value } as Patient
  }
  patientDialog.value = false
  snackbar.message = 'Patient updated successfully'
  snackbar.color = 'success'
  snackbar.show = true
}

function cancelAppointment() {
  if (!selectedPatient.value) return
  
  if (confirm(`Are you sure you want to cancel the appointment for ${selectedPatient.value.name}?`)) {
    patients.value = patients.value.filter(p => p.id !== selectedPatient.value!.id)
    patientDialog.value = false
    snackbar.message = 'Appointment cancelled'
    snackbar.color = 'info'
    snackbar.show = true
  }
}

async function addPatient() {
  const { valid } = await addFormRef.value?.validate()
  if (!valid) return

  const patient: Patient = {
    id: Date.now().toString(),
    name: newPatient.name,
    species: newPatient.species,
    breed: newPatient.breed,
    owner_name: newPatient.owner_name,
    owner_phone: newPatient.owner_phone,
    reason: newPatient.reason,
    appointment_time: newPatient.appointment_time,
    urgent: newPatient.urgent,
    status: 'waiting',
    department: selectedDepartment.value,
    veterinarian: { name: '', initials: '' },
    notes: ''
  }
  patients.value.push(patient)

  showAddPatient.value = false
  Object.assign(newPatient, {
    name: '',
    species: 'Dog',
    breed: '',
    owner_name: '',
    owner_phone: '',
    reason: '',
    appointment_time: '',
    urgent: false
  })

  snackbar.message = 'Patient added successfully'
  snackbar.color = 'success'
  snackbar.show = true
}

function refreshBoards() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    snackbar.message = 'Boards refreshed'
    snackbar.color = 'info'
    snackbar.show = true
  }, 500)
}
</script>

<style scoped>
.medical-boards-page {
  max-width: 1600px;
}

.patient-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.2s;
}

.patient-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.patient-urgent {
  border-left: 4px solid rgb(var(--v-theme-error));
  background: #fff5f5;
}

.column-waiting {
  border-top: 3px solid rgb(var(--v-theme-warning));
}

.column-in-exam {
  border-top: 3px solid rgb(var(--v-theme-primary));
}

.column-treatment {
  border-top: 3px solid rgb(var(--v-theme-info));
}

.column-checkout {
  border-top: 3px solid rgb(var(--v-theme-success));
}
</style>
