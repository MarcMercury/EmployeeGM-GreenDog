<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">✅ Training Sign-Offs</h1>
        <p class="text-body-1 text-grey-darken-1">
          Approve employee course completions and skill advancements
        </p>
      </div>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-refresh"
        @click="fetchData"
        :loading="loading"
      >
        Refresh
      </v-btn>
    </div>

    <!-- Stats -->
    <v-row class="mb-6">
      <v-col cols="12" sm="4">
        <v-card rounded="lg" color="warning" variant="tonal">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="warning" size="48">
              <v-icon color="white">mdi-clock-alert</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ pendingSignoffs.length }}</p>
              <p class="text-caption">Pending Approval</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card rounded="lg" color="success" variant="tonal">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="success" size="48">
              <v-icon color="white">mdi-check-circle</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ signedOffToday }}</p>
              <p class="text-caption">Signed Off Today</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card rounded="lg" color="primary" variant="tonal">
          <v-card-text class="d-flex align-center gap-4">
            <v-avatar color="primary" size="48">
              <v-icon color="white">mdi-star</v-icon>
            </v-avatar>
            <div>
              <p class="text-h4 font-weight-bold mb-0">{{ skillsAwarded }}</p>
              <p class="text-caption">Skills Awarded</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pending Sign-Offs Table -->
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Pending Sign-Offs</span>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search..."
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 300px"
        />
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="filteredSignoffs"
        :loading="loading"
        hover
        class="elevation-0"
      >
        <template #item.employee_name="{ item }">
          <div class="d-flex align-center gap-2">
            <v-avatar size="32" color="primary">
              <span class="text-caption text-white">
                {{ getInitials(item.employee_name) }}
              </span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.employee_name }}</div>
              <div class="text-caption text-grey">{{ item.department }}</div>
            </div>
          </div>
        </template>

        <template #item.course_title="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.course_title }}</div>
            <v-chip 
              v-if="item.skill_name" 
              size="x-small" 
              color="purple" 
              variant="tonal"
              class="mt-1"
            >
              <v-icon start size="12">mdi-arrow-up</v-icon>
              {{ item.skill_name }} → Lv{{ item.skill_level_awarded }}
            </v-chip>
          </div>
        </template>

        <template #item.completed_at="{ item }">
          <div class="text-caption">
            {{ formatDate(item.completed_at) }}
          </div>
        </template>

        <template #item.progress_percent="{ item }">
          <v-progress-linear
            :model-value="item.progress_percent"
            color="success"
            height="8"
            rounded
          />
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <v-btn
              color="success"
              size="small"
              variant="flat"
              @click="openSignOffDialog(item)"
            >
              <v-icon start>mdi-check</v-icon>
              Approve
            </v-btn>
            <v-btn
              icon="mdi-eye"
              size="small"
              variant="text"
              @click="viewDetails(item)"
            />
          </div>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon size="64" color="success">mdi-check-circle</v-icon>
            <h3 class="text-h6 mt-4">All caught up!</h3>
            <p class="text-grey">No pending sign-offs at this time.</p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Sign-Off Dialog -->
    <v-dialog v-model="signOffDialog" max-width="500">
      <v-card v-if="selectedItem" rounded="lg">
        <v-card-title class="d-flex align-center gap-2">
          <v-icon color="success">mdi-check-decagram</v-icon>
          Approve Completion
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="py-4">
          <v-list density="compact" class="bg-grey-lighten-4 rounded mb-4">
            <v-list-item>
              <v-list-item-title class="font-weight-bold">
                {{ selectedItem.employee_name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ selectedItem.course_title }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert
            v-if="selectedItem.skill_name"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <strong>Skill Advancement:</strong> Approving this will award 
            <strong>{{ selectedItem.skill_name }}</strong> Level {{ selectedItem.skill_level_awarded }}
            to the employee.
          </v-alert>

          <v-textarea
            v-model="signOffNotes"
            label="Notes (optional)"
            placeholder="Add any comments about this approval..."
            variant="outlined"
            rows="3"
            hide-details
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="signOffDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            variant="flat"
            @click="submitSignOff"
            :loading="submitting"
          >
            <v-icon start>mdi-check</v-icon>
            Approve & Sign Off
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

useHead({
  title: 'Training Sign-Offs'
})

const academyStore = useAcademyStore()
const uiStore = useUIStore()

interface SignoffItem {
  enrollment_id: string
  course_id: string
  course_title: string
  skill_id: string | null
  skill_name: string | null
  skill_level_awarded: number | null
  employee_id: string
  employee_name: string
  completed_at: string
  progress_percent: number
  requires_signoff: boolean
  signoff_by: string | null
  signoff_at: string | null
  department: string | null
  manager_id: string | null
}

const loading = ref(true)
const pendingSignoffs = ref<SignoffItem[]>([])
const search = ref('')
const signOffDialog = ref(false)
const selectedItem = ref<SignoffItem | null>(null)
const signOffNotes = ref('')
const submitting = ref(false)
const signedOffToday = ref(0)
const skillsAwarded = ref(0)

const headers = [
  { title: 'Employee', key: 'employee_name', sortable: true },
  { title: 'Course', key: 'course_title', sortable: true },
  { title: 'Completed', key: 'completed_at', sortable: true },
  { title: 'Progress', key: 'progress_percent', width: 120 },
  { title: 'Actions', key: 'actions', sortable: false, width: 160 }
]

const filteredSignoffs = computed(() => {
  if (!search.value) return pendingSignoffs.value
  const s = search.value.toLowerCase()
  return pendingSignoffs.value.filter(item =>
    item.employee_name?.toLowerCase().includes(s) ||
    item.course_title?.toLowerCase().includes(s) ||
    item.department?.toLowerCase().includes(s)
  )
})

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.split(' ')
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function openSignOffDialog(item: SignoffItem) {
  selectedItem.value = item
  signOffNotes.value = ''
  signOffDialog.value = true
}

function viewDetails(item: SignoffItem) {
  // Navigate to employee training details
  navigateTo(`/people/${item.employee_id}?tab=training`)
}

async function fetchData() {
  loading.value = true
  try {
    const data = await academyStore.fetchPendingSignoffs()
    pendingSignoffs.value = data as SignoffItem[]
  } catch (err) {
    console.error('Failed to fetch signoffs:', err)
    uiStore.showError('Failed to load pending sign-offs')
  } finally {
    loading.value = false
  }
}

async function submitSignOff() {
  if (!selectedItem.value) return
  
  submitting.value = true
  try {
    const result = await academyStore.signOffCompletion(
      selectedItem.value.enrollment_id,
      signOffNotes.value || undefined
    )

    if (result.success) {
      uiStore.showSuccess(result.message)
      
      // Update stats
      signedOffToday.value++
      if (result.skillAwarded) {
        skillsAwarded.value++
      }

      // Remove from pending list
      pendingSignoffs.value = pendingSignoffs.value.filter(
        s => s.enrollment_id !== selectedItem.value!.enrollment_id
      )
      
      signOffDialog.value = false
    } else {
      uiStore.showError(result.message)
    }
  } catch (err) {
    console.error('Sign-off failed:', err)
    uiStore.showError('Failed to sign off completion')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
