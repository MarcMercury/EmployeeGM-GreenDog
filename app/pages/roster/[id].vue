<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh;">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle</v-icon>
      <h3 class="text-h6 mt-4">Employee Not Found</h3>
      <p class="text-grey mb-4">The employee you're looking for doesn't exist or you don't have access.</p>
      <v-btn color="primary" to="/roster">Back to Roster</v-btn>
    </div>

    <!-- Main Profile Content -->
    <template v-else-if="employee">
      <!-- Page Header -->
      <div class="d-flex align-center gap-2 mb-6">
        <v-btn icon="mdi-arrow-left" variant="text" to="/roster" />
        <div>
          <h1 class="text-h5 font-weight-bold">Employee Profile</h1>
          <p class="text-body-2 text-grey">Deep view of {{ employee.full_name }}</p>
        </div>
      </div>

      <!-- 3-Column Layout -->
      <v-row>
        <!-- Column 1: Vitals (Sticky Sidebar) -->
        <v-col cols="12" md="3">
          <div class="profile-sidebar">
            <v-card rounded="lg" class="vitals-card">
              <!-- Profile Header -->
              <div class="vitals-header pa-4 text-center">
                <v-avatar size="96" :color="employee.avatar_url ? undefined : 'primary'" class="mb-3 elevation-4">
                  <v-img v-if="employee.avatar_url" :src="employee.avatar_url" />
                  <span v-else class="text-h4 text-white font-weight-bold">{{ employee.initials }}</span>
                </v-avatar>
                <h2 class="text-h6 font-weight-bold mb-1">{{ employee.full_name }}</h2>
                <p class="text-body-2 text-grey mb-2">{{ employee.position?.title || 'Unassigned' }}</p>
                
                <!-- Level Badge -->
                <v-chip color="primary" variant="flat" size="small" class="mb-3">
                  <v-icon start size="16">mdi-star</v-icon>
                  Level {{ employeeLevel }}
                </v-chip>

                <!-- Status -->
                <v-chip 
                  :color="getStatusColor(employee.employment_status)" 
                  variant="flat" 
                  size="small"
                >
                  {{ getStatusLabel(employee.employment_status) }}
                </v-chip>
              </div>

              <v-divider />

              <!-- Contact Info -->
              <v-list density="compact" class="pa-2">
                <v-list-item v-if="employee.email" density="compact">
                  <template #prepend>
                    <v-icon size="18" color="grey">mdi-email</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ employee.email }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="employee.phone" density="compact">
                  <template #prepend>
                    <v-icon size="18" color="grey">mdi-phone</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ employee.phone }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="employee.hire_date" density="compact">
                  <template #prepend>
                    <v-icon size="18" color="grey">mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">Hired {{ formatDate(employee.hire_date) }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="employee.department" density="compact">
                  <template #prepend>
                    <v-icon size="18" color="grey">mdi-domain</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ employee.department.name }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="employee.location" density="compact">
                  <template #prepend>
                    <v-icon size="18" color="grey">mdi-map-marker</v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ employee.location.name }}</v-list-item-title>
                </v-list-item>
              </v-list>

              <v-divider />

              <!-- Admin Actions -->
              <div v-if="isAdmin" class="pa-3">
                <v-btn 
                  block 
                  color="primary" 
                  variant="tonal" 
                  prepend-icon="mdi-pencil" 
                  class="mb-2"
                  @click="showEditDialog = true"
                >
                  Edit Profile
                </v-btn>
                <v-btn 
                  block 
                  :color="employee.employment_status === 'active' ? 'warning' : 'success'"
                  variant="outlined"
                  :prepend-icon="employee.employment_status === 'active' ? 'mdi-account-off' : 'mdi-account-check'"
                  @click="toggleEmployeeStatus"
                >
                  {{ employee.employment_status === 'active' ? 'Deactivate' : 'Reactivate' }}
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-col>

        <!-- Column 2: Timeline (Notes & History) -->
        <v-col cols="12" md="5">
          <v-card rounded="lg">
            <v-tabs v-model="timelineTab" color="primary" grow>
              <v-tab value="notes">
                <v-icon start size="18">mdi-note-text</v-icon>
                Notes
              </v-tab>
              <v-tab value="history">
                <v-icon start size="18">mdi-history</v-icon>
                History
              </v-tab>
            </v-tabs>

            <v-window v-model="timelineTab">
              <!-- Notes Tab -->
              <v-window-item value="notes">
                <div class="pa-4">
                  <!-- Add Note Input (Admin only) -->
                  <div v-if="isAdmin" class="mb-4">
                    <v-textarea
                      v-model="newNote"
                      placeholder="Add a note about this employee..."
                      variant="outlined"
                      rows="3"
                      hide-details
                      class="mb-2"
                    />
                    <div class="d-flex justify-end">
                      <v-btn 
                        color="primary" 
                        :disabled="!newNote.trim()" 
                        :loading="savingNote"
                        @click="addNote"
                      >
                        Post Note
                      </v-btn>
                    </div>
                  </div>

                  <v-divider v-if="isAdmin" class="mb-4" />

                  <!-- Notes Feed -->
                  <div v-if="notes.length === 0" class="text-center py-8">
                    <v-icon size="48" color="grey-lighten-1">mdi-note-text-outline</v-icon>
                    <p class="text-grey mt-2">No notes yet</p>
                  </div>

                  <div v-else class="notes-feed">
                    <div 
                      v-for="note in notes" 
                      :key="note.id" 
                      class="note-item pa-3 mb-3 bg-grey-lighten-5 rounded-lg"
                    >
                      <div class="d-flex align-center gap-2 mb-2">
                        <v-avatar size="28" color="primary">
                          <span class="text-caption text-white">{{ getInitials(note.author_name) }}</span>
                        </v-avatar>
                        <span class="text-body-2 font-weight-medium">{{ note.author_name || 'Admin' }}</span>
                        <span class="text-caption text-grey">{{ formatRelativeTime(note.created_at) }}</span>
                      </div>
                      <p class="text-body-2 mb-0">{{ note.content }}</p>
                    </div>
                  </div>
                </div>
              </v-window-item>

              <!-- History Tab -->
              <v-window-item value="history">
                <div class="pa-4">
                  <v-timeline density="compact" side="end">
                    <v-timeline-item
                      v-for="event in history"
                      :key="event.id"
                      :dot-color="getEventColor(event.event_type)"
                      size="small"
                    >
                      <template #opposite>
                        <span class="text-caption text-grey">{{ formatDate(event.created_at) }}</span>
                      </template>
                      <div class="text-body-2">
                        <strong>{{ event.title }}</strong>
                        <p v-if="event.description" class="text-caption text-grey mb-0">{{ event.description }}</p>
                      </div>
                    </v-timeline-item>

                    <v-timeline-item v-if="history.length === 0" dot-color="grey" size="small">
                      <span class="text-grey">No history recorded yet</span>
                    </v-timeline-item>
                  </v-timeline>
                </div>
              </v-window-item>
            </v-window>
          </v-card>
        </v-col>

        <!-- Column 3: Stats & Files -->
        <v-col cols="12" md="4">
          <!-- Skill Radar Widget -->
          <v-card rounded="lg" class="mb-4">
            <v-card-title class="text-subtitle-1 font-weight-bold pb-0">
              <v-icon start color="primary">mdi-radar</v-icon>
              Skill Profile
            </v-card-title>
            <v-card-text>
              <ClientOnly>
                <SkillHexagon 
                  v-if="skillCategories.length > 0"
                  :categories="skillCategories" 
                  :size="280"
                />
                <div v-else class="text-center py-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-chart-radar</v-icon>
                  <p class="text-grey mt-2">No skills recorded</p>
                </div>
              </ClientOnly>
            </v-card-text>
          </v-card>

          <!-- Document Vault Widget -->
          <v-card rounded="lg">
            <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
              <v-icon start color="primary">mdi-folder-open</v-icon>
              Document Vault
              <v-spacer />
              <v-btn 
                v-if="isAdmin"
                icon="mdi-plus" 
                size="small" 
                variant="text"
                @click="showUploadDialog = true"
              />
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <v-list v-if="documents.length > 0" density="compact">
                <v-list-item 
                  v-for="doc in documents" 
                  :key="doc.id"
                  :href="doc.file_url"
                  target="_blank"
                >
                  <template #prepend>
                    <v-icon :color="getFileTypeColor(doc.file_type)">
                      {{ getFileTypeIcon(doc.file_type) }}
                    </v-icon>
                  </template>
                  <v-list-item-title class="text-body-2">{{ doc.file_name }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    Added {{ formatDate(doc.created_at) }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn 
                      v-if="isAdmin"
                      icon="mdi-delete" 
                      size="x-small" 
                      variant="text" 
                      color="error"
                      @click.prevent="deleteDocument(doc)"
                    />
                  </template>
                </v-list-item>
              </v-list>
              <div v-else class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-file-document-outline</v-icon>
                <p class="text-grey mt-2">No documents</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Upload Document Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card>
        <v-card-title>Upload Document</v-card-title>
        <v-card-text>
          <v-file-input
            v-model="uploadFile"
            label="Select file"
            prepend-icon="mdi-paperclip"
            variant="outlined"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            show-size
            class="mb-3"
          />
          <v-text-field
            v-model="uploadFileName"
            label="Document name"
            variant="outlined"
            density="compact"
            class="mb-3"
          />
          <v-select
            v-model="uploadCategory"
            :items="documentCategories"
            label="Category"
            variant="outlined"
            density="compact"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showUploadDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :loading="uploading" 
            :disabled="!uploadFile"
            @click="uploadDocument"
          >
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Profile Dialog -->
    <v-dialog v-model="showEditDialog" max-width="600">
      <v-card v-if="employee">
        <v-card-title>Edit Profile</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="editForm.first_name" label="First Name" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editForm.last_name" label="Last Name" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="editForm.email" label="Email" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editForm.phone" label="Phone" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="editForm.hire_date" label="Hire Date" type="date" variant="outlined" density="compact" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveProfile">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import SkillHexagon from '~/components/skill/SkillHexagon.vue'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const client = useSupabaseClient()
const authStore = useAuthStore()
const user = useSupabaseUser()

const employeeId = computed(() => route.params.id as string)
const isAdmin = computed(() => authStore.isAdmin)

// State
const loading = ref(true)
const error = ref(false)
const employee = ref<any>(null)
const notes = ref<any[]>([])
const history = ref<any[]>([])
const documents = ref<any[]>([])
const timelineTab = ref('notes')
const newNote = ref('')
const savingNote = ref(false)
const saving = ref(false)

// Upload state
const showUploadDialog = ref(false)
const uploadFile = ref<File | null>(null)
const uploadFileName = ref('')
const uploadCategory = ref('general')
const uploading = ref(false)

// Edit state
const showEditDialog = ref(false)
const editForm = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  hire_date: ''
})

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const documentCategories = [
  { title: 'General', value: 'general' },
  { title: 'Offer Letter', value: 'offer_letter' },
  { title: 'Contract', value: 'contract' },
  { title: 'Performance Review', value: 'performance_review' },
  { title: 'Certification', value: 'certification' },
  { title: 'License', value: 'license' },
  { title: 'Training', value: 'training' },
  { title: 'Other', value: 'other' }
]

// Computed
const employeeLevel = computed(() => {
  // Calculate level from skills
  const skillCount = employee.value?.skills?.length || 0
  const avgLevel = employee.value?.skills?.reduce((sum: number, s: any) => sum + (s.level || 0), 0) / (skillCount || 1)
  return Math.max(1, Math.floor(avgLevel))
})

const skillCategories = computed(() => {
  if (!employee.value?.skills) return []
  
  // Group skills by category and calculate averages
  const categoryMap = new Map<string, { total: number; count: number }>()
  
  employee.value.skills.forEach((skill: any) => {
    const cat = skill.category || 'General'
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { total: 0, count: 0 })
    }
    const current = categoryMap.get(cat)!
    current.total += skill.level || 0
    current.count++
  })
  
  return Array.from(categoryMap.entries()).map(([name, data]) => ({
    category: name,
    value: data.total / data.count, // Average level (1-5 scale)
    fullMark: 5
  }))
})

// Methods
function showNotification(message: string, color = 'success') {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'success'
    case 'on_leave': return 'warning'
    case 'terminated': return 'error'
    default: return 'grey'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active'
    case 'on_leave': return 'On Leave'
    case 'terminated': return 'Inactive'
    default: return status
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getEventColor(type: string): string {
  switch (type) {
    case 'promotion': return 'success'
    case 'training': return 'info'
    case 'review': return 'warning'
    case 'incident': return 'error'
    default: return 'grey'
  }
}

function getFileTypeIcon(type: string): string {
  switch (type?.toLowerCase()) {
    case 'pdf': return 'mdi-file-pdf-box'
    case 'doc':
    case 'docx': return 'mdi-file-word'
    case 'png':
    case 'jpg':
    case 'jpeg': return 'mdi-file-image'
    default: return 'mdi-file-document'
  }
}

function getFileTypeColor(type: string): string {
  switch (type?.toLowerCase()) {
    case 'pdf': return 'red'
    case 'doc':
    case 'docx': return 'blue'
    case 'png':
    case 'jpg':
    case 'jpeg': return 'green'
    default: return 'grey'
  }
}

async function fetchEmployee() {
  loading.value = true
  error.value = false
  
  try {
    console.log('[Profile] Fetching employee ID:', employeeId.value)
    
    const { data, error: fetchError } = await client
      .from('employees')
      .select(`
        *,
        department:departments(id, name),
        position:job_positions(id, title),
        location:locations(id, name),
        skills:employee_skills(
          id,
          level,
          skill_id,
          skill:skill_library(id, name, category)
        )
      `)
      .eq('id', employeeId.value)
      .single()
    
    console.log('[Profile] Query result:', data, 'Error:', fetchError)
    
    if (fetchError) throw fetchError
    if (!data) throw new Error('Employee not found')
    
    // Cast to any for dynamic property access
    const emp = data as any
    
    // Transform skills
    if (emp.skills) {
      emp.skills = emp.skills.map((s: any) => ({
        ...s,
        skill_name: s.skill?.name,
        category: s.skill?.category
      }))
    }
    
    // Add computed fields
    emp.full_name = `${emp.first_name} ${emp.last_name}`
    emp.initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase()
    emp.email = emp.email_work || emp.email_personal
    emp.phone = emp.phone_mobile || emp.phone_work
    
    employee.value = emp
    
    // Initialize edit form
    Object.assign(editForm, {
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      hire_date: emp.hire_date || ''
    })
    
  } catch (err) {
    console.error('Error fetching employee:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

async function fetchNotes() {
  try {
    const { data } = await client
      .from('employee_notes' as any)
      .select('*, author:profiles(first_name, last_name)')
      .eq('employee_id', employeeId.value)
      .order('created_at', { ascending: false })
    
    notes.value = (data || []).map((n: any) => ({
      ...n,
      author_name: n.author ? `${n.author.first_name} ${n.author.last_name}` : 'Admin'
    }))
  } catch (err) {
    console.error('Error fetching notes:', err)
  }
}

async function fetchDocuments() {
  try {
    const { data } = await client
      .from('employee_documents' as any)
      .select('*')
      .eq('employee_id', employeeId.value)
      .order('created_at', { ascending: false })
    
    documents.value = data || []
  } catch (err) {
    console.error('Error fetching documents:', err)
  }
}

async function fetchHistory() {
  // Mock history for now - could be from audit_logs or events table
  history.value = [
    { id: 1, event_type: 'hire', title: 'Joined the team', description: 'Started as ' + (employee.value?.position?.title || 'Employee'), created_at: employee.value?.hire_date || employee.value?.created_at },
  ]
}

async function addNote() {
  if (!newNote.value.trim()) return
  
  savingNote.value = true
  try {
    const { error } = await client
      .from('employee_notes' as any)
      .insert({
        employee_id: employeeId.value,
        content: newNote.value.trim(),
        author_id: user.value?.id
      } as any)
    
    if (error) throw error
    
    newNote.value = ''
    await fetchNotes()
    showNotification('Note added')
  } catch (err: any) {
    showNotification(err.message || 'Failed to add note', 'error')
  } finally {
    savingNote.value = false
  }
}

async function toggleEmployeeStatus() {
  const newStatus = employee.value.employment_status === 'active' ? 'terminated' : 'active'
  
  try {
    const { error } = await (client as any)
      .from('employees')
      .update({ employment_status: newStatus })
      .eq('id', employeeId.value)
    
    if (error) throw error
    
    employee.value.employment_status = newStatus
    showNotification(`Employee ${newStatus === 'active' ? 'reactivated' : 'deactivated'}`)
  } catch (err: any) {
    showNotification(err.message || 'Failed to update status', 'error')
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const { error } = await (client as any)
      .from('employees')
      .update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email_work: editForm.email,
        phone_mobile: editForm.phone,
        hire_date: editForm.hire_date || null
      })
      .eq('id', employeeId.value)
    
    if (error) throw error
    
    showEditDialog.value = false
    await fetchEmployee()
    showNotification('Profile updated')
  } catch (err: any) {
    showNotification(err.message || 'Failed to update profile', 'error')
  } finally {
    saving.value = false
  }
}

async function uploadDocument() {
  if (!uploadFile.value) return
  
  uploading.value = true
  try {
    const file = uploadFile.value
    const fileExt = file.name.split('.').pop()
    const fileName = `${employeeId.value}/${Date.now()}.${fileExt}`
    
    // Upload to storage
    const { error: uploadError } = await client.storage
      .from('employee-docs')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError
    
    // Get public URL
    const { data: urlData } = client.storage
      .from('employee-docs')
      .getPublicUrl(fileName)
    
    // Insert document record
    const { error: insertError } = await client
      .from('employee_documents' as any)
      .insert({
        employee_id: employeeId.value,
        uploader_id: user.value?.id,
        file_name: uploadFileName.value || file.name,
        file_url: urlData.publicUrl,
        file_type: fileExt,
        file_size: file.size,
        category: uploadCategory.value
      } as any)
    
    if (insertError) throw insertError
    
    showUploadDialog.value = false
    uploadFile.value = null
    uploadFileName.value = ''
    uploadCategory.value = 'general'
    await fetchDocuments()
    showNotification('Document uploaded')
  } catch (err: any) {
    showNotification(err.message || 'Failed to upload document', 'error')
  } finally {
    uploading.value = false
  }
}

async function deleteDocument(doc: any) {
  if (!confirm(`Delete "${doc.file_name}"?`)) return
  
  try {
    // Delete from storage
    const path = doc.file_url.split('/employee-docs/')[1]
    if (path) {
      await client.storage.from('employee-docs').remove([path])
    }
    
    // Delete record
    await client.from('employee_documents' as any).delete().eq('id', doc.id)
    
    await fetchDocuments()
    showNotification('Document deleted')
  } catch (err: any) {
    showNotification(err.message || 'Failed to delete document', 'error')
  }
}

// Initialize
onMounted(async () => {
  await fetchEmployee()
  if (!error.value) {
    await Promise.all([fetchNotes(), fetchDocuments(), fetchHistory()])
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100%;
}

.profile-sidebar {
  position: sticky;
  top: 80px;
}

.vitals-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.1) 0%, rgba(var(--v-theme-primary), 0.05) 100%);
}

.vitals-card {
  overflow: hidden;
}

.notes-feed {
  max-height: 500px;
  overflow-y: auto;
}

.note-item {
  border-left: 3px solid rgb(var(--v-theme-primary));
}
</style>
