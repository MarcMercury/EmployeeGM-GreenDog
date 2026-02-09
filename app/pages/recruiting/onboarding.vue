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
    <v-dialog v-model="confirmDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="bg-success text-white py-4">
          <v-icon start>mdi-account-check</v-icon>
          Finalize Hire
        </v-card-title>
        <v-card-text class="pt-6">
          <p class="text-body-1">
            You are about to finalize the hire for <strong>{{ candidateToFinalize?.first_name }} {{ candidateToFinalize?.last_name }}</strong>.
          </p>
          
          <!-- Hire Details Form -->
          <v-row class="mt-4" dense>
            <v-col cols="12" sm="6">
              <v-select
                v-model="hireForm.employment_type"
                :items="['full-time', 'part-time', 'contract', 'per-diem', 'intern']"
                label="Employment Type"
                variant="outlined"
                density="compact"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="hireForm.pay_type"
                :items="['hourly', 'salary']"
                label="Pay Type"
                variant="outlined"
                density="compact"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="hireForm.starting_wage"
                :label="hireForm.pay_type === 'salary' ? 'Annual Salary' : 'Hourly Rate'"
                type="number"
                prefix="$"
                variant="outlined"
                density="compact"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="hireForm.department_id"
                :items="departments"
                item-title="name"
                item-value="id"
                label="Department"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="hireForm.location_id"
                :items="locations"
                item-title="name"
                item-value="id"
                label="Location"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="hireForm.manager_id"
                :items="managers"
                :item-title="(m: any) => m.first_name + ' ' + m.last_name"
                item-value="id"
                label="Manager"
                variant="outlined"
                density="compact"
                clearable
              />
            </v-col>
          </v-row>
          
          <v-divider class="my-4" />
          
          <p class="text-body-2 text-grey">
            This will:
          </p>
          <v-list density="compact" class="mt-2">
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Create an employee record with proper profile</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Transfer all skills, documents, and notes</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Mark hiring notes as HR-only</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-check" class="px-0">
              <v-list-item-title>Notify HR to create user account</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
          <v-btn 
            color="success" 
            :loading="finalizing" 
            :disabled="!hireForm.employment_type || !hireForm.starting_wage"
            @click="executeFinalize"
          >
            Confirm Hire
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { OnboardingChecklist, Candidate } from '~/types/recruiting.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

const client = useSupabaseClient()

// State
const candidates = ref<Candidate[]>([])
const departments = ref<{ id: string; name: string }[]>([])
const locations = ref<{ id: string; name: string }[]>([])
const managers = ref<{ id: string; first_name: string; last_name: string }[]>([])
const loading = ref(true)
const finalizing = ref(false)
const finalizingId = ref<string | null>(null)
const confirmDialog = ref(false)
const candidateToFinalize = ref<Candidate | null>(null)

// Hire form
const hireForm = ref({
  employment_type: 'full-time',
  pay_type: 'hourly',
  starting_wage: null as number | null,
  department_id: null as string | null,
  location_id: null as string | null,
  manager_id: null as string | null
})

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
  // Pre-fill form from candidate data
  hireForm.value = {
    employment_type: 'full-time',
    pay_type: 'hourly',
    starting_wage: null,
    department_id: null,
    location_id: null,
    manager_id: null
  }
  confirmDialog.value = true
}

const executeFinalize = async () => {
  if (!candidateToFinalize.value) return

  const candidate = candidateToFinalize.value
  finalizing.value = true
  finalizingId.value = candidate.id

  try {
    // Use the database function for proper hire workflow
    const { data, error } = await client.rpc('promote_candidate_to_employee_v2', {
      p_candidate_id: candidate.id,
      p_employment_type: hireForm.value.employment_type,
      p_job_title_id: candidate.target_position_id,
      p_start_date: candidate.onboarding_checklist?.start_date || new Date().toISOString().split('T')[0],
      p_starting_wage: hireForm.value.starting_wage || 0,
      p_pay_type: hireForm.value.pay_type,
      p_department_id: hireForm.value.department_id,
      p_location_id: hireForm.value.location_id,
      p_manager_id: hireForm.value.manager_id
    })

    if (error) {
      // Fallback if v2 function doesn't exist yet
      if (error.code === 'PGRST202') {
        console.log('Using fallback hire method')
        await executeFallbackFinalize(candidate)
      } else {
        throw error
      }
    } else {
      // Mark onboarding complete
      await client
        .from('onboarding_checklist')
        .update({ start_date: candidate.onboarding_checklist?.start_date })
        .eq('candidate_id', candidate.id)
    }

    // Send notification for user account creation
    try {
      await $fetch('/api/slack/notifications/send-event', {
        method: 'POST',
        body: {
          eventType: 'candidate_hired',
          data: {
            employee_name: `${candidate.first_name} ${candidate.last_name}`,
            position: candidate.job_positions?.title || 'Team Member',
            start_date: candidate.onboarding_checklist?.start_date,
            message: `🎉 New hire! ${candidate.first_name} ${candidate.last_name} has been finalized. Please create their user account.`
          }
        }
      })
    } catch (notifError) {
      console.log('Notification not sent (non-critical):', notifError)
    }

    confirmDialog.value = false
    showNotification(`${candidate.first_name} ${candidate.last_name} has been hired successfully! HR has been notified to create their user account.`)

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

// Fallback method for when database function doesn't exist
const executeFallbackFinalize = async (candidate: Candidate) => {
  // 1. Create profile
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      email: candidate.email,
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      phone: candidate.phone,
      role: 'user',
      is_active: true
    })
    .select()
    .single()

  if (profileError) throw profileError

  // 2. Create employee record
  const { data: newEmployee, error: empError } = await client
    .from('employees')
    .insert({
      profile_id: profile.id,
      employee_number: 'EMP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email_work: candidate.email,
      phone_mobile: candidate.phone,
      position_id: candidate.target_position_id,
      department_id: hireForm.value.department_id,
      location_id: hireForm.value.location_id,
      manager_employee_id: hireForm.value.manager_id,
      hire_date: candidate.onboarding_checklist?.start_date || new Date().toISOString().split('T')[0],
      employment_type: hireForm.value.employment_type,
      employment_status: 'active',
      needs_user_account: true,
      onboarding_status: 'pending'
    })
    .select()
    .single()

  if (empError) throw empError

  // 3. Copy candidate skills to employee skills
  const { data: candidateSkills } = await client
    .from('candidate_skills')
    .select('*')
    .eq('candidate_id', candidate.id)

  if (candidateSkills && candidateSkills.length > 0) {
    const employeeSkills = candidateSkills.map(cs => ({
      employee_id: newEmployee.id,
      skill_id: cs.skill_id,
      rating: cs.rating,
      is_goal: false
    }))

    await client.from('employee_skills').insert(employeeSkills)
  }

  // 4. Copy candidate documents to employee documents
  const { data: candidateDocs } = await client
    .from('candidate_documents')
    .select('*')
    .eq('candidate_id', candidate.id)

  if (candidateDocs && candidateDocs.length > 0) {
    const employeeDocs = candidateDocs.map(cd => ({
      employee_id: newEmployee.id,
      uploader_id: cd.uploader_id,
      file_name: cd.file_name,
      file_url: cd.file_url,
      file_type: cd.file_type,
      file_size: cd.file_size,
      description: cd.description,
      category: cd.category === 'resume' || cd.category === 'cover_letter' ? 'general' : cd.category
    }))

    await client.from('employee_documents').insert(employeeDocs)
  }

  // 5. Copy candidate notes to employee notes (marked HR-only)
  const { data: candidateNotes } = await client
    .from('candidate_notes')
    .select('*')
    .eq('candidate_id', candidate.id)

  if (candidateNotes && candidateNotes.length > 0) {
    const employeeNotes = candidateNotes.map(cn => ({
      employee_id: newEmployee.id,
      author_id: cn.author_id,
      note: '[Hiring Note] ' + cn.note,
      note_type: 'hr',
      is_pinned: false,
      hr_only: true
    }))

    await client.from('employee_notes').insert(employeeNotes)
  }

  // 6. Create pay settings
  await client.from('employee_pay_settings').insert({
    employee_id: newEmployee.id,
    pay_type: hireForm.value.pay_type,
    hourly_rate: hireForm.value.pay_type === 'hourly' ? hireForm.value.starting_wage : null,
    annual_salary: hireForm.value.pay_type === 'salary' ? hireForm.value.starting_wage : null,
    effective_date: candidate.onboarding_checklist?.start_date || new Date().toISOString().split('T')[0]
  })

  // 7. Mark candidate as hired
  await client
    .from('candidates')
    .update({
      status: 'hired',
      onboarding_complete: true
    })
    .eq('id', candidate.id)
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

const fetchLookupData = async () => {
  // Fetch departments
  const { data: deptData } = await client
    .from('departments')
    .select('id, name')
    .order('name')
  departments.value = deptData || []

  // Fetch locations
  const { data: locData } = await client
    .from('locations')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  locations.value = locData || []

  // Fetch potential managers (active employees)
  const { data: mgrData } = await client
    .from('employees')
    .select('id, first_name, last_name')
    .eq('employment_status', 'active')
    .order('last_name')
  managers.value = mgrData || []
}

onMounted(() => {
  fetchCandidates()
  fetchLookupData()
})
</script>
