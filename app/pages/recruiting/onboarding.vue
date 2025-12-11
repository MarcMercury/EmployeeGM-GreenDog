<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Onboarding</h1>
        <p class="text-body-1 text-grey-darken-1">
          Track new hire onboarding progress and finalize hiring
        </p>
      </div>
      <v-chip color="primary" size="large">
        {{ onboardingCandidates.length }} Pending
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading onboarding data...</p>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="onboardingCandidates.length === 0" rounded="lg" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-clipboard-check-multiple</v-icon>
      <h3 class="text-h6 mt-4">No pending onboarding</h3>
      <p class="text-grey mb-4">
        Candidates will appear here when they receive an offer
      </p>
      <v-btn color="primary" @click="navigateTo('/recruiting/candidates')">
        View Candidates
      </v-btn>
    </v-card>

    <!-- Onboarding Cards -->
    <v-row v-else>
      <v-col
        v-for="candidate in onboardingCandidates"
        :key="candidate.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card rounded="lg" class="h-100">
          <!-- Candidate Header -->
          <v-card-title class="d-flex align-center pa-4 pb-2">
            <v-avatar color="success" size="48" class="mr-3">
              <span class="text-white font-weight-bold">
                {{ candidate.first_name[0] }}{{ candidate.last_name[0] }}
              </span>
            </v-avatar>
            <div class="flex-grow-1">
              <h3 class="text-h6 font-weight-bold">
                {{ candidate.first_name }} {{ candidate.last_name }}
              </h3>
              <p class="text-body-2 text-grey mb-0">
                {{ candidate.job_positions?.title || 'General Position' }}
              </p>
            </div>
            <v-chip :color="candidate.status === 'offer' ? 'warning' : 'success'" size="small" label>
              {{ candidate.status === 'offer' ? 'Offer Sent' : 'Hired' }}
            </v-chip>
          </v-card-title>

          <!-- Progress Bar -->
          <v-card-text class="py-2">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption text-grey">Onboarding Progress</span>
              <span class="text-caption font-weight-bold">{{ getProgress(candidate) }}%</span>
            </div>
            <v-progress-linear
              :model-value="getProgress(candidate)"
              :color="getProgress(candidate) === 100 ? 'success' : 'primary'"
              height="8"
              rounded
            />
          </v-card-text>

          <v-divider />

          <!-- Checklist -->
          <v-card-text>
            <v-list density="compact" class="pa-0">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="candidate.onboarding_checklist?.contract_sent"
                    color="success"
                    @update:model-value="updateChecklist(candidate, 'contract_sent', $event)"
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': candidate.onboarding_checklist?.contract_sent }">
                  Contract Sent
                </v-list-item-title>
              </v-list-item>

              <v-list-item class="px-0">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="candidate.onboarding_checklist?.contract_signed"
                    color="success"
                    @update:model-value="updateChecklist(candidate, 'contract_signed', $event)"
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': candidate.onboarding_checklist?.contract_signed }">
                  Contract Signed
                </v-list-item-title>
              </v-list-item>

              <v-list-item class="px-0">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="candidate.onboarding_checklist?.background_check"
                    color="success"
                    @update:model-value="updateChecklist(candidate, 'background_check', $event)"
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': candidate.onboarding_checklist?.background_check }">
                  Background Check Complete
                </v-list-item-title>
              </v-list-item>

              <v-list-item class="px-0">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="candidate.onboarding_checklist?.uniform_ordered"
                    color="success"
                    @update:model-value="updateChecklist(candidate, 'uniform_ordered', $event)"
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': candidate.onboarding_checklist?.uniform_ordered }">
                  Uniform Ordered
                </v-list-item-title>
              </v-list-item>

              <v-list-item class="px-0">
                <template #prepend>
                  <v-checkbox-btn
                    :model-value="candidate.onboarding_checklist?.email_created"
                    color="success"
                    @update:model-value="updateChecklist(candidate, 'email_created', $event)"
                  />
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through text-grey': candidate.onboarding_checklist?.email_created }">
                  Work Email Created
                </v-list-item-title>
              </v-list-item>
            </v-list>

            <!-- Start Date -->
            <v-text-field
              :model-value="candidate.onboarding_checklist?.start_date"
              label="Start Date"
              type="date"
              variant="outlined"
              density="compact"
              class="mt-4"
              prepend-inner-icon="mdi-calendar"
              @update:model-value="updateStartDate(candidate, $event)"
            />
          </v-card-text>

          <v-divider />

          <!-- Actions -->
          <v-card-actions class="pa-4">
            <v-btn
              v-if="getProgress(candidate) === 100"
              color="success"
              block
              size="large"
              prepend-icon="mdi-account-check"
              :loading="finalizingId === candidate.id"
              @click="finalizeHire(candidate)"
            >
              Finalize Hire
            </v-btn>
            <v-btn
              v-else
              color="grey"
              variant="outlined"
              block
              disabled
            >
              Complete all tasks to finalize
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <!-- Finalize Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-success text-white py-4">
          <v-icon start>mdi-account-check</v-icon>
          Finalize Hire
        </v-card-title>
        <v-card-text class="pt-6">
          <p class="text-body-1">
            You are about to finalize the hire for <strong>{{ candidateToFinalize?.first_name }} {{ candidateToFinalize?.last_name }}</strong>.
          </p>
          <p class="text-body-2 text-grey mt-2">
            This will:
          </p>
          <v-list density="compact" class="mt-2">
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Create an employee record</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Copy interview skill ratings to employee skills</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Mark onboarding as complete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn color="success" :loading="finalizing" @click="executeFinalize">
            Confirm Hire
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

interface OnboardingChecklist {
  id: string
  candidate_id: string
  contract_sent: boolean
  contract_signed: boolean
  background_check: boolean
  uniform_ordered: boolean
  email_created: boolean
  start_date: string | null
}

interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  target_position_id: string | null
  status: string
  onboarding_complete: boolean
  job_positions?: { title: string }
  onboarding_checklist?: OnboardingChecklist
}

const client = useSupabaseClient()

// State
const candidates = ref<Candidate[]>([])
const loading = ref(true)
const finalizing = ref(false)
const finalizingId = ref<string | null>(null)
const confirmDialog = ref(false)
const candidateToFinalize = ref<Candidate | null>(null)

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Computed
const onboardingCandidates = computed(() => {
  return candidates.value.filter(c =>
    (c.status === 'offer' || c.status === 'hired') && !c.onboarding_complete
  )
})

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getProgress = (candidate: Candidate) => {
  if (!candidate.onboarding_checklist) return 0
  const checklist = candidate.onboarding_checklist
  const items = [
    checklist.contract_sent,
    checklist.contract_signed,
    checklist.background_check,
    checklist.uniform_ordered,
    checklist.email_created
  ]
  const completed = items.filter(Boolean).length
  return Math.round((completed / items.length) * 100)
}

const updateChecklist = async (candidate: Candidate, field: string, value: boolean) => {
  if (!candidate.onboarding_checklist) return

  try {
    await client
      .from('onboarding_checklist')
      .update({ [field]: value })
      .eq('candidate_id', candidate.id)

    // Update local state
    ;(candidate.onboarding_checklist as any)[field] = value
  } catch (error) {
    console.error('Error updating checklist:', error)
    showNotification('Failed to update checklist', 'error')
  }
}

const updateStartDate = async (candidate: Candidate, date: string) => {
  if (!candidate.onboarding_checklist) return

  try {
    await client
      .from('onboarding_checklist')
      .update({ start_date: date || null })
      .eq('candidate_id', candidate.id)

    candidate.onboarding_checklist.start_date = date || null
  } catch (error) {
    console.error('Error updating start date:', error)
  }
}

const finalizeHire = (candidate: Candidate) => {
  candidateToFinalize.value = candidate
  confirmDialog.value = true
}

const executeFinalize = async () => {
  if (!candidateToFinalize.value) return

  const candidate = candidateToFinalize.value
  finalizing.value = true
  finalizingId.value = candidate.id

  try {
    // 1. Create employee record
    const { data: newEmployee, error: empError } = await client
      .from('employees')
      .insert({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email_work: candidate.email,
        phone_mobile: candidate.phone,
        position_id: candidate.target_position_id,
        hire_date: candidate.onboarding_checklist?.start_date || new Date().toISOString().split('T')[0],
        employment_status: 'full_time',
        status: 'active'
      })
      .select()
      .single()

    if (empError) throw empError

    // 2. Copy candidate skills to employee skills
    const { data: candidateSkills } = await client
      .from('candidate_skills')
      .select('*')
      .eq('candidate_id', candidate.id)

    if (candidateSkills && candidateSkills.length > 0) {
      const employeeSkills = candidateSkills.map(cs => ({
        employee_id: newEmployee.id,
        skill_id: cs.skill_id,
        current_rating: cs.rating,
        target_rating: Math.min(cs.rating + 1, 5),
        is_goal: false
      }))

      await client.from('employee_skills').insert(employeeSkills)
    }

    // 3. Mark candidate as onboarding complete
    await client
      .from('candidates')
      .update({
        status: 'hired',
        onboarding_complete: true
      })
      .eq('id', candidate.id)

    // Update local state
    candidate.status = 'hired'
    candidate.onboarding_complete = true

    confirmDialog.value = false
    showNotification(`${candidate.first_name} ${candidate.last_name} has been hired successfully!`)

    // Refresh the list
    await fetchCandidates()
  } catch (error) {
    console.error('Error finalizing hire:', error)
    showNotification('Failed to finalize hire. Please try again.', 'error')
  } finally {
    finalizing.value = false
    finalizingId.value = null
  }
}

const fetchCandidates = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidates')
      .select(`
        *,
        job_positions:target_position_id(title),
        onboarding_checklist(*)
      `)
      .in('status', ['offer', 'hired'])
      .eq('onboarding_complete', false)
      .order('applied_at', { ascending: false })

    if (error) throw error

    // Ensure onboarding_checklist exists for each candidate
    for (const candidate of data || []) {
      if (!candidate.onboarding_checklist) {
        const { data: checklist } = await client
          .from('onboarding_checklist')
          .insert({ candidate_id: candidate.id })
          .select()
          .single()
        candidate.onboarding_checklist = checklist
      }
    }

    candidates.value = data || []
  } catch (error) {
    console.error('Error fetching candidates:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCandidates()
})
</script>
