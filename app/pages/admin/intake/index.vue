<template>
  <div>
    <UPageHeader 
      title="Intake Management"
      description="Manage magic links, submissions, and person lifecycle"
    >
      <template #actions>
        <UButton
          icon="i-heroicons-plus"
          @click="showCreateModal = true"
        >
          Create Intake Link
        </UButton>
      </template>
    </UPageHeader>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <UCard v-for="stat in stageStats" :key="stat.stage">
        <div class="flex items-center gap-4">
          <div 
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :class="stat.bgClass"
          >
            <UIcon :name="stat.icon" class="w-6 h-6" :class="stat.iconClass" />
          </div>
          <div>
            <p class="text-2xl font-bold">{{ stat.count }}</p>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Tabs -->
    <UTabs :items="tabs" class="mb-8">
      <!-- Intake Links Tab -->
      <template #links>
        <div class="mt-4">
          <!-- Filters -->
          <div class="flex gap-4 mb-4">
            <USelect
              v-model="linkFilters.status"
              :options="statusOptions"
              placeholder="Filter by status"
              class="w-48"
            />
            <USelect
              v-model="linkFilters.linkType"
              :options="linkTypeOptions"
              placeholder="Filter by type"
              class="w-48"
            />
          </div>

          <!-- Links Table -->
          <UTable
            :columns="linkColumns"
            :rows="intakeLinks"
            :loading="loadingLinks"
          >
            <template #status-data="{ row }">
              <UBadge :color="getStatusColor(row.status)">
                {{ row.status }}
              </UBadge>
            </template>

            <template #link_type-data="{ row }">
              <span class="capitalize">{{ row.link_type.replace(/_/g, ' ') }}</span>
            </template>

            <template #expires_at-data="{ row }">
              <span :class="{ 'text-red-500': row.isExpired }">
                {{ formatDate(row.expires_at) }}
              </span>
            </template>

            <template #actions-data="{ row }">
              <div class="flex gap-2">
                <UButton
                  icon="i-heroicons-clipboard-document"
                  size="xs"
                  variant="ghost"
                  @click="copyLink(row.url)"
                />
                <UButton
                  icon="i-heroicons-envelope"
                  size="xs"
                  variant="ghost"
                  :disabled="!row.prefill_email"
                  @click="resendEmail(row)"
                />
                <UButton
                  icon="i-heroicons-trash"
                  size="xs"
                  variant="ghost"
                  color="red"
                  @click="revokeLink(row)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </template>

      <!-- Persons Tab -->
      <template #persons>
        <div class="mt-4">
          <!-- Filters -->
          <div class="flex gap-4 mb-4">
            <UInput
              v-model="personSearch"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search by name or email..."
              class="w-64"
            />
            <USelect
              v-model="selectedStage"
              :options="stageOptions"
              placeholder="Filter by stage"
              class="w-48"
            />
          </div>

          <!-- Persons Table -->
          <UTable
            :columns="personColumns"
            :rows="persons"
            :loading="loadingPersons"
            @row-click="openPersonDetail"
          >
            <template #current_stage-data="{ row }">
              <UBadge :color="getStageColor(row.current_stage)">
                {{ row.current_stage }}
              </UBadge>
            </template>

            <template #name-data="{ row }">
              <div>
                <p class="font-medium">{{ row.first_name }} {{ row.last_name }}</p>
                <p class="text-sm text-gray-500">{{ row.email }}</p>
              </div>
            </template>

            <template #actions-data="{ row }">
              <UButton
                v-if="canPromote(row)"
                size="xs"
                @click.stop="openPromoteModal(row)"
              >
                Promote
              </UButton>
            </template>
          </UTable>
        </div>
      </template>

      <!-- Submissions Tab -->
      <template #submissions>
        <div class="mt-4">
          <UTable
            :columns="submissionColumns"
            :rows="submissions"
            :loading="loadingSubmissions"
          >
            <template #processing_status-data="{ row }">
              <UBadge :color="getProcessingStatusColor(row.processing_status)">
                {{ row.processing_status }}
              </UBadge>
            </template>

            <template #submitted_at-data="{ row }">
              {{ formatDateTime(row.submitted_at) }}
            </template>

            <template #actions-data="{ row }">
              <UButton
                v-if="row.processing_status === 'needs_review'"
                size="xs"
                @click="reviewSubmission(row)"
              >
                Review
              </UButton>
            </template>
          </UTable>
        </div>
      </template>
    </UTabs>

    <!-- Create Link Modal -->
    <UModal v-model="showCreateModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Create Intake Link</h3>
        </template>

        <form @submit.prevent="createLink" class="space-y-4">
          <UFormGroup label="Link Type" required>
            <USelect
              v-model="newLink.linkType"
              :options="linkTypeOptions.slice(1)"
            />
          </UFormGroup>

          <UFormGroup label="Prefill Email">
            <UInput v-model="newLink.prefillEmail" type="email" />
          </UFormGroup>

          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="First Name">
              <UInput v-model="newLink.prefillFirstName" />
            </UFormGroup>
            <UFormGroup label="Last Name">
              <UInput v-model="newLink.prefillLastName" />
            </UFormGroup>
          </div>

          <UFormGroup 
            v-if="newLink.linkType === 'job_application'"
            label="Target Position"
          >
            <USelect
              v-model="newLink.targetPositionId"
              :options="positionOptions"
              placeholder="Select position"
            />
          </UFormGroup>

          <UFormGroup label="Expires In">
            <USelect
              v-model="newLink.expiresInDays"
              :options="expiryOptions"
            />
          </UFormGroup>

          <UFormGroup label="Internal Notes">
            <UTextarea v-model="newLink.internalNotes" rows="2" />
          </UFormGroup>

          <UCheckbox
            v-model="newLink.sendEmail"
            label="Send invitation email"
            :disabled="!newLink.prefillEmail"
          />
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showCreateModal = false">Cancel</UButton>
            <UButton :loading="creating" @click="createLink">Create Link</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Promote Modal -->
    <UModal v-model="showPromoteModal">
      <UCard v-if="selectedPerson">
        <template #header>
          <h3 class="text-lg font-semibold">
            Promote {{ selectedPerson.first_name }} {{ selectedPerson.last_name }}
          </h3>
          <p class="text-sm text-gray-500">
            Current Stage: {{ selectedPerson.current_stage }}
          </p>
        </template>

        <form @submit.prevent="promotePerson" class="space-y-4">
          <UFormGroup label="Target Stage" required>
            <USelect
              v-model="promoteOptions.targetStage"
              :options="getAvailablePromotions(selectedPerson)"
            />
          </UFormGroup>

          <!-- Applicant options -->
          <template v-if="promoteOptions.targetStage === 'applicant'">
            <UFormGroup label="Target Position">
              <USelect
                v-model="promoteOptions.targetPositionId"
                :options="positionOptions"
                placeholder="Select position"
              />
            </UFormGroup>
            <UFormGroup label="Notes">
              <UTextarea v-model="promoteOptions.notes" rows="2" />
            </UFormGroup>
          </template>

          <!-- Student options -->
          <template v-if="promoteOptions.targetStage === 'student'">
            <UFormGroup label="Program Name" required>
              <UInput v-model="promoteOptions.programName" />
            </UFormGroup>
            <UFormGroup label="School">
              <UInput v-model="promoteOptions.schoolOfOrigin" />
            </UFormGroup>
            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="Start Date">
                <UInput v-model="promoteOptions.visitStartDate" type="date" />
              </UFormGroup>
              <UFormGroup label="End Date">
                <UInput v-model="promoteOptions.visitEndDate" type="date" />
              </UFormGroup>
            </div>
          </template>

          <!-- Hired options -->
          <template v-if="promoteOptions.targetStage === 'hired'">
            <UFormGroup label="Target Start Date">
              <UInput v-model="promoteOptions.targetStartDate" type="date" />
            </UFormGroup>
          </template>

          <!-- Employee options -->
          <template v-if="promoteOptions.targetStage === 'employee'">
            <UFormGroup label="Position" required>
              <USelect
                v-model="promoteOptions.jobTitleId"
                :options="positionOptions"
              />
            </UFormGroup>
            <UFormGroup label="Employment Type" required>
              <USelect
                v-model="promoteOptions.employmentType"
                :options="['full_time', 'part_time', 'contract']"
              />
            </UFormGroup>
            <UFormGroup label="Start Date" required>
              <UInput v-model="promoteOptions.startDate" type="date" required />
            </UFormGroup>
            <div class="grid grid-cols-2 gap-4">
              <UFormGroup label="Starting Wage" required>
                <UInput v-model="promoteOptions.startingWage" type="number" step="0.01" required />
              </UFormGroup>
              <UFormGroup label="Pay Type">
                <USelect
                  v-model="promoteOptions.payType"
                  :options="['hourly', 'salary']"
                />
              </UFormGroup>
            </div>
          </template>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showPromoteModal = false">Cancel</UButton>
            <UButton :loading="promoting" @click="promotePerson">
              Promote to {{ promoteOptions.targetStage }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const toast = useToast()

// State
const showCreateModal = ref(false)
const showPromoteModal = ref(false)
const loadingLinks = ref(false)
const loadingPersons = ref(false)
const loadingSubmissions = ref(false)
const creating = ref(false)
const promoting = ref(false)

const intakeLinks = ref<any[]>([])
const persons = ref<any[]>([])
const submissions = ref<any[]>([])
const positions = ref<any[]>([])

const selectedPerson = ref<any>(null)
const personSearch = ref('')
const selectedStage = ref('')

const linkFilters = ref({
  status: '',
  linkType: ''
})

const newLink = ref({
  linkType: 'job_application',
  prefillEmail: '',
  prefillFirstName: '',
  prefillLastName: '',
  targetPositionId: '',
  expiresInDays: 7,
  internalNotes: '',
  sendEmail: false
})

const promoteOptions = ref<any>({
  targetStage: '',
  targetPositionId: '',
  notes: '',
  programName: '',
  schoolOfOrigin: '',
  visitStartDate: '',
  visitEndDate: '',
  targetStartDate: '',
  jobTitleId: '',
  employmentType: 'full_time',
  startDate: '',
  startingWage: null,
  payType: 'hourly'
})

// Computed
const tabs = computed(() => [
  { key: 'links', label: 'Intake Links', slot: 'links' },
  { key: 'persons', label: 'Unified Persons', slot: 'persons' },
  { key: 'submissions', label: 'Submissions', slot: 'submissions' }
])

const stageStats = computed(() => {
  const stages = ['visitor', 'lead', 'applicant', 'student', 'hired', 'employee']
  const icons: Record<string, string> = {
    visitor: 'i-heroicons-user',
    lead: 'i-heroicons-star',
    applicant: 'i-heroicons-document-text',
    student: 'i-heroicons-academic-cap',
    hired: 'i-heroicons-check-badge',
    employee: 'i-heroicons-user-group'
  }
  const colors: Record<string, { bg: string; icon: string }> = {
    visitor: { bg: 'bg-gray-100', icon: 'text-gray-600' },
    lead: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
    applicant: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    student: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    hired: { bg: 'bg-green-100', icon: 'text-green-600' },
    employee: { bg: 'bg-primary-100', icon: 'text-primary-600' }
  }

  return stages.map(stage => ({
    stage,
    label: stage.charAt(0).toUpperCase() + stage.slice(1) + 's',
    icon: icons[stage],
    bgClass: colors[stage].bg,
    iconClass: colors[stage].icon,
    count: persons.value.filter(p => p.current_stage === stage).length
  }))
})

const statusOptions = computed(() => [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'sent' },
  { label: 'Opened', value: 'opened' },
  { label: 'Completed', value: 'completed' },
  { label: 'Expired', value: 'expired' },
  { label: 'Revoked', value: 'revoked' }
])

const linkTypeOptions = computed(() => [
  { label: 'All Types', value: '' },
  { label: 'Job Application', value: 'job_application' },
  { label: 'Student Enrollment', value: 'student_enrollment' },
  { label: 'Externship Signup', value: 'externship_signup' },
  { label: 'General Intake', value: 'general_intake' },
  { label: 'Referral Partner', value: 'referral_partner' },
  { label: 'Event Registration', value: 'event_registration' }
])

const stageOptions = computed(() => [
  { label: 'All Stages', value: '' },
  { label: 'Visitor', value: 'visitor' },
  { label: 'Lead', value: 'lead' },
  { label: 'Applicant', value: 'applicant' },
  { label: 'Student', value: 'student' },
  { label: 'Hired', value: 'hired' },
  { label: 'Employee', value: 'employee' },
  { label: 'Alumni', value: 'alumni' }
])

const positionOptions = computed(() => 
  positions.value.map(p => ({ label: p.title, value: p.id }))
)

const expiryOptions = [
  { label: '1 day', value: 1 },
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 }
]

const linkColumns = [
  { key: 'link_type', label: 'Type' },
  { key: 'prefill_email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'expires_at', label: 'Expires' },
  { key: 'actions', label: '' }
]

const personColumns = [
  { key: 'name', label: 'Name' },
  { key: 'current_stage', label: 'Stage' },
  { key: 'source_type', label: 'Source' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: '' }
]

const submissionColumns = [
  { key: 'intake_link_id', label: 'Link ID' },
  { key: 'processing_status', label: 'Status' },
  { key: 'submitted_at', label: 'Submitted' },
  { key: 'is_duplicate', label: 'Duplicate' },
  { key: 'actions', label: '' }
]

// Methods
async function loadData() {
  await Promise.all([
    loadLinks(),
    loadPersons(),
    loadPositions()
  ])
}

async function loadLinks() {
  loadingLinks.value = true
  try {
    const params = new URLSearchParams()
    if (linkFilters.value.status) params.set('status', linkFilters.value.status)
    if (linkFilters.value.linkType) params.set('linkType', linkFilters.value.linkType)

    const response = await $fetch(`/api/intake/links?${params}`)
    intakeLinks.value = (response as any).data || []
  } catch (err) {
    console.error('Error loading links:', err)
  } finally {
    loadingLinks.value = false
  }
}

async function loadPersons() {
  loadingPersons.value = true
  try {
    const params = new URLSearchParams()
    if (selectedStage.value) params.set('stage', selectedStage.value)
    if (personSearch.value) params.set('search', personSearch.value)

    const response = await $fetch(`/api/intake/persons?${params}`)
    persons.value = (response as any).data || []
  } catch (err) {
    console.error('Error loading persons:', err)
  } finally {
    loadingPersons.value = false
  }
}

async function loadPositions() {
  const supabase = useSupabaseClient()
  const { data } = await supabase
    .from('job_positions')
    .select('id, title')
    .eq('is_active', true)
    .order('title')
  positions.value = data || []
}

async function createLink() {
  creating.value = true
  try {
    const response = await $fetch('/api/intake/links', {
      method: 'POST',
      body: newLink.value
    })
    
    toast.add({
      title: 'Link Created',
      description: `Intake link created successfully`,
      color: 'green'
    })

    // Copy to clipboard
    await navigator.clipboard.writeText((response as any).data.url)
    toast.add({
      title: 'Copied!',
      description: 'Link copied to clipboard',
      color: 'green'
    })

    showCreateModal.value = false
    await loadLinks()
  } catch (err) {
    console.error('Error creating link:', err)
    toast.add({
      title: 'Error',
      description: 'Failed to create link',
      color: 'red'
    })
  } finally {
    creating.value = false
  }
}

async function copyLink(url: string) {
  await navigator.clipboard.writeText(url)
  toast.add({
    title: 'Copied!',
    description: 'Link copied to clipboard',
    color: 'green'
  })
}

async function revokeLink(link: any) {
  const supabase = useSupabaseClient()
  await supabase
    .from('intake_links')
    .update({ status: 'revoked' })
    .eq('id', link.id)
  await loadLinks()
}

async function resendEmail(link: any) {
  if (!link.prefill_email) {
    toast.add({
      title: 'No Email',
      description: 'This link has no email address associated with it',
      color: 'yellow'
    })
    return
  }
  
  try {
    const result = await $fetch('/api/intake/links/resend', {
      method: 'POST',
      body: {
        linkId: link.id
      }
    })
    
    toast.add({
      title: 'Email Sent',
      description: `Invitation resent to ${link.prefill_email}`,
      color: 'green'
    })
    
    await loadLinks()
  } catch (err: any) {
    toast.add({
      title: 'Failed to Resend',
      description: err.data?.message || err.message || 'Could not resend email',
      color: 'red'
    })
  }
}

function openPersonDetail(row: any) {
  // Show person details in toast (detail page not implemented)
  toast.add({
    title: 'Person Details',
    description: `Viewing ${row.first_name} ${row.last_name} (${row.email})\nStage: ${row.current_stage}\nCreated: ${formatDate(row.created_at)}`,
    color: 'blue',
    timeout: 8000
  })
}

function openPromoteModal(person: any) {
  selectedPerson.value = person
  promoteOptions.value = {
    targetStage: getNextStage(person.current_stage),
    targetPositionId: '',
    notes: '',
    programName: '',
    schoolOfOrigin: '',
    visitStartDate: '',
    visitEndDate: '',
    targetStartDate: '',
    jobTitleId: '',
    employmentType: 'full_time',
    startDate: '',
    startingWage: null,
    payType: 'hourly'
  }
  showPromoteModal.value = true
}

async function promotePerson() {
  if (!selectedPerson.value) return
  
  promoting.value = true
  try {
    const response = await $fetch('/api/intake/promote', {
      method: 'POST',
      body: {
        personId: selectedPerson.value.id,
        targetStage: promoteOptions.value.targetStage,
        options: promoteOptions.value
      }
    })

    toast.add({
      title: 'Success!',
      description: (response as any).message,
      color: 'green'
    })

    showPromoteModal.value = false
    await loadPersons()
  } catch (err: any) {
    console.error('Promotion error:', err)
    toast.add({
      title: 'Error',
      description: err.data?.message || 'Promotion failed',
      color: 'red'
    })
  } finally {
    promoting.value = false
  }
}

function canPromote(person: any): boolean {
  const promotableStages = ['visitor', 'lead', 'applicant', 'student', 'hired']
  return promotableStages.includes(person.current_stage)
}

function getNextStage(currentStage: string): string {
  const transitions: Record<string, string> = {
    visitor: 'applicant',
    lead: 'applicant',
    applicant: 'hired',
    student: 'applicant',
    hired: 'employee'
  }
  return transitions[currentStage] || ''
}

function getAvailablePromotions(person: any) {
  const stage = person.current_stage
  const options: { label: string; value: string }[] = []

  if (['visitor', 'lead'].includes(stage)) {
    options.push({ label: 'Applicant', value: 'applicant' })
    options.push({ label: 'Student', value: 'student' })
  }
  if (stage === 'student') {
    options.push({ label: 'Applicant', value: 'applicant' })
  }
  if (stage === 'applicant') {
    options.push({ label: 'Hired', value: 'hired' })
  }
  if (stage === 'hired') {
    options.push({ label: 'Employee', value: 'employee' })
  }

  return options
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'gray',
    sent: 'blue',
    opened: 'yellow',
    completed: 'green',
    expired: 'red',
    revoked: 'red'
  }
  return colors[status] || 'gray'
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    visitor: 'gray',
    lead: 'yellow',
    applicant: 'blue',
    student: 'purple',
    hired: 'green',
    employee: 'primary',
    alumni: 'gray'
  }
  return colors[stage] || 'gray'
}

function getProcessingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'yellow',
    processing: 'blue',
    completed: 'green',
    failed: 'red',
    needs_review: 'orange'
  }
  return colors[status] || 'gray'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function reviewSubmission(submission: any) {
  // Show submission details in toast (review page not implemented)
  toast.add({
    title: 'Submission Details',
    description: `Submission from ${submission.email}\nStatus: ${submission.status}\nSubmitted: ${formatDate(submission.submitted_at)}`,
    color: 'blue',
    timeout: 8000
  })
}

// Watchers
watch([linkFilters, personSearch, selectedStage], () => {
  if (linkFilters.value) loadLinks()
  if (personSearch.value !== undefined || selectedStage.value !== undefined) loadPersons()
}, { deep: true })

// Load data on mount
onMounted(() => {
  loadData()
})
</script>
