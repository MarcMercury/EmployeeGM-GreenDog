<template>
  <div class="email-templates-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Email Templates</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage email templates for automated communications
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        New Template
      </v-btn>
    </div>

    <!-- Category Filter -->
    <v-card class="mb-6" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              prepend-inner-icon="mdi-magnify"
              label="Search templates..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="categoryFilter"
              :items="categoryOptions"
              label="Category"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-switch
              v-model="showInactive"
              label="Show inactive"
              density="compact"
              hide-details
              color="primary"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="mt-4 text-grey">Loading templates...</p>
    </div>

    <!-- Templates Grid -->
    <v-row v-else-if="filteredTemplates.length > 0">
      <v-col v-for="template in filteredTemplates" :key="template.id" cols="12" md="6" lg="4">
        <v-card class="template-card h-100" :class="{ 'opacity-60': !template.is_active }">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-2">
              <v-icon :color="getCategoryColor(template.category)">{{ getCategoryIcon(template.category) }}</v-icon>
              <span class="text-truncate" style="max-width: 200px">{{ template.name }}</span>
            </div>
            <v-chip :color="template.is_active ? 'success' : 'grey'" size="small" variant="tonal">
              {{ template.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
          </v-card-title>

          <v-card-subtitle>
            <v-chip size="x-small" variant="outlined" class="mr-2">{{ template.category }}</v-chip>
            <code class="text-caption">{{ template.id }}</code>
          </v-card-subtitle>

          <v-card-text>
            <div class="mb-2">
              <strong class="text-caption text-grey">Subject:</strong>
              <div class="text-body-2">{{ template.subject }}</div>
            </div>
            <div>
              <strong class="text-caption text-grey">Preview:</strong>
              <div class="template-preview text-body-2 text-grey-darken-1" v-html="truncateHtml(template.body, 100)" />
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions>
            <v-btn variant="text" size="small" @click="previewTemplate(template)">
              <v-icon start size="small">mdi-eye</v-icon>
              Preview
            </v-btn>
            <v-spacer />
            <v-btn variant="text" color="primary" size="small" @click="editTemplate(template)">
              <v-icon start size="small">mdi-pencil</v-icon>
              Edit
            </v-btn>
            <v-btn variant="text" color="error" size="small" @click="confirmDelete(template)">
              <v-icon size="small">mdi-delete</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else class="text-center py-12">
      <v-icon size="64" color="grey-lighten-1">mdi-email-outline</v-icon>
      <h3 class="text-h6 mt-4 mb-2">No templates found</h3>
      <p class="text-body-2 text-grey mb-4">
        {{ search || categoryFilter ? 'Try adjusting your filters' : 'Create your first email template to get started' }}
      </p>
      <v-btn v-if="!search && !categoryFilter" color="primary" @click="openCreateDialog">
        <v-icon start>mdi-plus</v-icon>
        Create Template
      </v-btn>
    </v-card>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="editDialog" max-width="900" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">{{ editingTemplate?.id ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ editingTemplate?.id ? 'Edit Template' : 'Create Template' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.id"
                label="Template ID"
                variant="outlined"
                density="compact"
                :disabled="!!editingTemplate?.id"
                hint="Unique identifier (e.g., welcome_email)"
                persistent-hint
                :rules="[v => !!v || 'Required', v => /^[a-z0-9_]+$/.test(v) || 'Only lowercase letters, numbers, and underscores']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="editForm.name"
                label="Template Name"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="editForm.category"
                :items="allCategories"
                label="Category"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="editForm.is_active"
                label="Active"
                color="success"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="editForm.subject"
                label="Email Subject"
                variant="outlined"
                density="compact"
                hint="Use {{variable}} for dynamic content"
                persistent-hint
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
            <v-col cols="12">
              <div class="mb-2 d-flex align-center justify-space-between">
                <label class="text-body-2 font-weight-medium">Email Body (HTML)</label>
                <v-btn-toggle v-model="editorMode" mandatory density="compact" variant="outlined">
                  <v-btn value="edit" size="small">Edit</v-btn>
                  <v-btn value="preview" size="small">Preview</v-btn>
                </v-btn-toggle>
              </div>
              <v-textarea
                v-if="editorMode === 'edit'"
                v-model="editForm.body"
                variant="outlined"
                rows="12"
                placeholder="<p>Hello {{first_name}},</p><p>Your content here...</p>"
                :rules="[v => !!v || 'Required']"
              />
              <v-card v-else variant="outlined" class="pa-4" style="min-height: 300px">
                <div v-html="editForm.body" class="email-preview" />
              </v-card>
            </v-col>
          </v-row>

          <!-- Variable Reference -->
          <v-expansion-panels class="mt-4">
            <v-expansion-panel title="Available Variables">
              <v-expansion-panel-text>
                <v-chip-group>
                  <v-chip v-for="v in commonVariables" :key="v" size="small" variant="outlined" @click="insertVariable(v)">
                    <span v-text="`{{${v}}}`" />
                  </v-chip>
                </v-chip-group>
                <p class="text-caption text-grey mt-2">Click a variable to copy it. Variables are replaced with actual values when the email is sent.</p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveTemplate">
            {{ editingTemplate?.id ? 'Save Changes' : 'Create Template' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Preview Dialog -->
    <v-dialog v-model="previewDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-eye</v-icon>
          Preview: {{ previewingTemplate?.name }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <div class="mb-4">
            <strong>Subject:</strong>
            <div class="text-body-1">{{ previewingTemplate?.subject }}</div>
          </div>
          <v-divider class="mb-4" />
          <div class="email-preview pa-4 bg-grey-lighten-4 rounded" v-html="previewingTemplate?.body" />
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="previewDialog = false">Close</v-btn>
          <v-btn color="primary" @click="editTemplate(previewingTemplate!)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-error">Delete Template?</v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ deletingTemplate?.name }}</strong>? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteTemplate">Delete</v-btn>
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
interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body: string
  is_active: boolean
  created_at: string
  updated_at: string
}

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin-only']
})

useHead({
  title: 'Email Templates'
})

const supabase = useSupabaseClient()

// State
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const templates = ref<EmailTemplate[]>([])
const search = ref('')
const categoryFilter = ref<string | null>(null)
const showInactive = ref(false)

// Dialogs
const editDialog = ref(false)
const previewDialog = ref(false)
const deleteDialog = ref(false)
const editingTemplate = ref<EmailTemplate | null>(null)
const previewingTemplate = ref<EmailTemplate | null>(null)
const deletingTemplate = ref<EmailTemplate | null>(null)
const editorMode = ref<'edit' | 'preview'>('edit')

// Form
const editForm = ref({
  id: '',
  name: '',
  category: '',
  subject: '',
  body: '',
  is_active: true
})

// Snackbar
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Constants
const allCategories = [
  'GDU Academy',
  'Recruiting',
  'HR',
  'Scheduling',
  'System',
  'Marketing',
  'Operations'
]

const commonVariables = [
  'first_name',
  'last_name',
  'full_name',
  'email',
  'position',
  'department',
  'date',
  'time',
  'location',
  'link',
  'program',
  'start_date',
  'end_date',
  'week',
  'type'
]

// Computed
const categoryOptions = computed(() => {
  const cats = new Set(templates.value.map(t => t.category))
  return Array.from(cats).sort()
})

const filteredTemplates = computed(() => {
  let result = templates.value

  if (!showInactive.value) {
    result = result.filter(t => t.is_active)
  }

  if (categoryFilter.value) {
    result = result.filter(t => t.category === categoryFilter.value)
  }

  if (search.value) {
    const query = search.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      t.subject.toLowerCase().includes(query)
    )
  }

  return result.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
})

// Methods
async function loadTemplates() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('category')
      .order('name')

    if (error) throw error
    templates.value = data || []
  } catch (err: any) {
    showNotification('Failed to load templates: ' + err.message, 'error')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingTemplate.value = null
  editForm.value = {
    id: '',
    name: '',
    category: '',
    subject: '',
    body: '<p>Hello {{first_name}},</p>\n\n<p>Your content here...</p>\n\n<p>Best regards,<br>Green Dog Dental Team</p>',
    is_active: true
  }
  editorMode.value = 'edit'
  editDialog.value = true
}

function editTemplate(template: EmailTemplate) {
  editingTemplate.value = template
  editForm.value = {
    id: template.id,
    name: template.name,
    category: template.category,
    subject: template.subject,
    body: template.body,
    is_active: template.is_active
  }
  editorMode.value = 'edit'
  previewDialog.value = false
  editDialog.value = true
}

function previewTemplate(template: EmailTemplate) {
  previewingTemplate.value = template
  previewDialog.value = true
}

function confirmDelete(template: EmailTemplate) {
  deletingTemplate.value = template
  deleteDialog.value = true
}

async function saveTemplate() {
  if (!editForm.value.id || !editForm.value.name || !editForm.value.category || !editForm.value.subject || !editForm.value.body) {
    showNotification('Please fill in all required fields', 'error')
    return
  }

  saving.value = true
  try {
    if (editingTemplate.value?.id) {
      // Update existing
      const { error } = await supabase
        .from('email_templates')
        .update({
          name: editForm.value.name,
          category: editForm.value.category,
          subject: editForm.value.subject,
          body: editForm.value.body,
          is_active: editForm.value.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTemplate.value.id)

      if (error) throw error
      showNotification('Template updated successfully')
    } else {
      // Create new
      const { error } = await supabase
        .from('email_templates')
        .insert({
          id: editForm.value.id,
          name: editForm.value.name,
          category: editForm.value.category,
          subject: editForm.value.subject,
          body: editForm.value.body,
          is_active: editForm.value.is_active
        })

      if (error) throw error
      showNotification('Template created successfully')
    }

    editDialog.value = false
    await loadTemplates()
  } catch (err: any) {
    showNotification('Failed to save template: ' + err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function deleteTemplate() {
  if (!deletingTemplate.value) return

  deleting.value = true
  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', deletingTemplate.value.id)

    if (error) throw error
    showNotification('Template deleted')
    deleteDialog.value = false
    await loadTemplates()
  } catch (err: any) {
    showNotification('Failed to delete template: ' + err.message, 'error')
  } finally {
    deleting.value = false
  }
}

function insertVariable(variable: string) {
  navigator.clipboard.writeText(`{{${variable}}}`)
  showNotification(`Copied {{${variable}}} to clipboard`, 'info')
}

function truncateHtml(html: string, maxLength: number): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'GDU Academy': 'mdi-school',
    'Recruiting': 'mdi-account-search',
    'HR': 'mdi-account-group',
    'Scheduling': 'mdi-calendar',
    'System': 'mdi-cog',
    'Marketing': 'mdi-bullhorn',
    'Operations': 'mdi-clipboard-check'
  }
  return icons[category] || 'mdi-email'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'GDU Academy': 'purple',
    'Recruiting': 'blue',
    'HR': 'green',
    'Scheduling': 'orange',
    'System': 'grey',
    'Marketing': 'pink',
    'Operations': 'teal'
  }
  return colors[category] || 'primary'
}

function showNotification(message: string, color = 'success') {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Load on mount
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.email-templates-page {
  max-width: 1400px;
}

.template-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.template-preview {
  max-height: 60px;
  overflow: hidden;
}

.email-preview {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.email-preview :deep(p) {
  margin-bottom: 1em;
}

.email-preview :deep(a) {
  color: #1976d2;
}
</style>
