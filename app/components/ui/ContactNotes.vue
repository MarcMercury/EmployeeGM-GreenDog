<script setup lang="ts">
/**
 * ContactNotes - Unified Notes Component
 * 
 * Provides consistent timestamped, initialed notes functionality
 * for all contact types: students, candidates, employees, partners, etc.
 * 
 * Usage:
 * <ContactNotes
 *   contact-type="student"
 *   :contact-id="student.person_id"
 *   :enrollment-id="student.enrollment_id"
 * />
 */

interface ContactNote {
  id: string
  contact_type: string
  contact_id: string
  enrollment_id?: string
  note: string
  note_type: string
  author_id?: string
  author_initials?: string
  author_name?: string
  visibility: string
  is_pinned: boolean
  created_at: string
  edited_at?: string
  edited_by_initials?: string
  transferred_from?: string
}

const props = defineProps<{
  contactType: 'student' | 'candidate' | 'employee' | 'partner' | 'visitor' | 'influencer' | 'referral'
  contactId: string
  enrollmentId?: string
  noteTypes?: string[]
  defaultVisibility?: string
  showVisibilityControl?: boolean
  readonly?: boolean
}>()

const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()

// State
const notes = ref<ContactNote[]>([])
const loading = ref(true)
const saving = ref(false)
const newNote = ref('')
const newNoteType = ref('general')
const newNoteVisibility = ref(props.defaultVisibility || 'internal')
const editingNote = ref<ContactNote | null>(null)
const editingContent = ref('')

// Note type options
const noteTypeOptions = computed(() => {
  if (props.noteTypes) {
    return props.noteTypes.map(t => ({ title: formatNoteType(t), value: t }))
  }
  return [
    { title: 'General', value: 'general' },
    { title: 'Progress', value: 'progress' },
    { title: 'Feedback', value: 'feedback' },
    { title: 'Interview', value: 'interview' },
    { title: 'HR', value: 'hr' },
    { title: 'Performance', value: 'performance' },
    { title: 'Training', value: 'training' }
  ]
})

const visibilityOptions = [
  { title: 'All Staff', value: 'internal' },
  { title: 'HR Only', value: 'hr_only' },
  { title: 'Management', value: 'management' }
]

// Load notes
async function loadNotes() {
  loading.value = true
  try {
    let query = supabase
      .from('contact_notes_view')
      .select('*')
      .eq('contact_type', props.contactType)
      .eq('contact_id', props.contactId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (props.enrollmentId) {
      query = query.eq('enrollment_id', props.enrollmentId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    notes.value = data || []
  } catch (err: any) {
    console.error('Error loading notes:', err)
    // Fallback: try without the view
    await loadNotesDirectly()
  } finally {
    loading.value = false
  }
}

async function loadNotesDirectly() {
  try {
    let query = supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_type', props.contactType)
      .eq('contact_id', props.contactId)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (props.enrollmentId) {
      query = query.eq('enrollment_id', props.enrollmentId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    notes.value = data || []
  } catch (err: any) {
    console.error('Error loading notes directly:', err)
  }
}

// Add new note
async function addNote() {
  if (!newNote.value.trim()) return
  
  saving.value = true
  try {
    const { data, error } = await supabase
      .from('contact_notes')
      .insert({
        contact_type: props.contactType,
        contact_id: props.contactId,
        enrollment_id: props.enrollmentId || null,
        note: newNote.value.trim(),
        note_type: newNoteType.value,
        visibility: newNoteVisibility.value
      })
      .select()
      .single()
    
    if (error) throw error
    
    notes.value.unshift(data)
    newNote.value = ''
    showSuccess('Note added')
  } catch (err: any) {
    console.error('Error adding note:', err)
    showError('Failed to add note: ' + err.message)
  } finally {
    saving.value = false
  }
}

// Update note
async function saveEdit() {
  if (!editingNote.value || !editingContent.value.trim()) return
  
  saving.value = true
  try {
    const { error } = await supabase
      .from('contact_notes')
      .update({ note: editingContent.value.trim() })
      .eq('id', editingNote.value.id)
    
    if (error) throw error
    
    const idx = notes.value.findIndex(n => n.id === editingNote.value?.id)
    if (idx !== -1) {
      notes.value[idx].note = editingContent.value.trim()
      notes.value[idx].edited_at = new Date().toISOString()
    }
    
    editingNote.value = null
    editingContent.value = ''
    showSuccess('Note updated')
  } catch (err: any) {
    console.error('Error updating note:', err)
    showError('Failed to update note')
  } finally {
    saving.value = false
  }
}

// Toggle pin
async function togglePin(note: ContactNote) {
  try {
    const { error } = await supabase
      .from('contact_notes')
      .update({ is_pinned: !note.is_pinned })
      .eq('id', note.id)
    
    if (error) throw error
    note.is_pinned = !note.is_pinned
    
    // Re-sort notes
    notes.value.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  } catch (err: any) {
    console.error('Error toggling pin:', err)
  }
}

// Delete note
async function deleteNote(note: ContactNote) {
  if (!confirm('Delete this note?')) return
  
  try {
    const { error } = await supabase
      .from('contact_notes')
      .update({ is_archived: true })
      .eq('id', note.id)
    
    if (error) throw error
    notes.value = notes.value.filter(n => n.id !== note.id)
    showSuccess('Note deleted')
  } catch (err: any) {
    console.error('Error deleting note:', err)
    showError('Failed to delete note')
  }
}

// Start editing
function startEdit(note: ContactNote) {
  editingNote.value = note
  editingContent.value = note.note
}

function cancelEdit() {
  editingNote.value = null
  editingContent.value = ''
}

// Format helpers
function formatNoteType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function getNoteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    general: 'grey',
    progress: 'blue',
    feedback: 'green',
    interview: 'purple',
    hr: 'red',
    performance: 'orange',
    training: 'teal',
    system: 'grey'
  }
  return colors[type] || 'grey'
}

function getVisibilityIcon(visibility: string): string {
  const icons: Record<string, string> = {
    internal: 'mdi-account-group',
    hr_only: 'mdi-lock',
    management: 'mdi-shield-account',
    self: 'mdi-account'
  }
  return icons[visibility] || 'mdi-eye'
}

// Load on mount
onMounted(() => {
  loadNotes()
})

// Reload when contact changes
watch(() => [props.contactId, props.enrollmentId], () => {
  loadNotes()
})
</script>

<template>
  <div class="contact-notes">
    <!-- Add Note Form -->
    <div v-if="!readonly" class="mb-4">
      <v-textarea
        v-model="newNote"
        placeholder="Add a note..."
        variant="outlined"
        density="compact"
        rows="2"
        auto-grow
        hide-details
      />
      <div class="d-flex align-center gap-2 mt-2">
        <v-select
          v-model="newNoteType"
          :items="noteTypeOptions"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <v-select
          v-if="showVisibilityControl"
          v-model="newNoteVisibility"
          :items="visibilityOptions"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <v-spacer />
        <v-btn
          color="primary"
          size="small"
          :loading="saving"
          :disabled="!newNote.trim()"
          @click="addNote"
        >
          <v-icon start>mdi-plus</v-icon>
          Add Note
        </v-btn>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <v-progress-circular indeterminate size="24" />
    </div>

    <!-- Notes List -->
    <div v-else-if="notes.length > 0" class="notes-list">
      <v-card
        v-for="note in notes"
        :key="note.id"
        variant="outlined"
        class="mb-2"
        :class="{ 'border-primary': note.is_pinned }"
      >
        <v-card-text class="py-2 px-3">
          <!-- Note Header -->
          <div class="d-flex align-center gap-2 mb-1">
            <v-chip
              :color="getNoteTypeColor(note.note_type)"
              size="x-small"
              variant="tonal"
            >
              {{ formatNoteType(note.note_type) }}
            </v-chip>
            
            <v-icon
              v-if="note.visibility !== 'internal'"
              size="x-small"
              :title="note.visibility"
            >
              {{ getVisibilityIcon(note.visibility) }}
            </v-icon>
            
            <v-icon
              v-if="note.is_pinned"
              size="x-small"
              color="warning"
              title="Pinned"
            >
              mdi-pin
            </v-icon>
            
            <v-chip
              v-if="note.transferred_from"
              size="x-small"
              variant="outlined"
              color="info"
            >
              From {{ note.transferred_from }}
            </v-chip>
            
            <v-spacer />
            
            <span class="text-caption text-grey">
              {{ note.author_initials || '??' }} · {{ formatDate(note.created_at) }}
              <template v-if="note.edited_at">
                · edited by {{ note.edited_by_initials }}
              </template>
            </span>
          </div>

          <!-- Note Content -->
          <div v-if="editingNote?.id === note.id" class="mt-2">
            <v-textarea
              v-model="editingContent"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
              hide-details
            />
            <div class="d-flex gap-2 mt-2">
              <v-btn size="x-small" variant="text" @click="cancelEdit">Cancel</v-btn>
              <v-btn size="x-small" color="primary" :loading="saving" @click="saveEdit">Save</v-btn>
            </div>
          </div>
          <div v-else class="text-body-2 note-content">
            {{ note.note }}
          </div>

          <!-- Note Actions -->
          <div v-if="!readonly && editingNote?.id !== note.id" class="d-flex gap-1 mt-1">
            <v-btn
              size="x-small"
              variant="text"
              density="compact"
              :icon="note.is_pinned ? 'mdi-pin-off' : 'mdi-pin'"
              @click="togglePin(note)"
            />
            <v-btn
              size="x-small"
              variant="text"
              density="compact"
              icon="mdi-pencil"
              @click="startEdit(note)"
            />
            <v-btn
              size="x-small"
              variant="text"
              density="compact"
              icon="mdi-delete"
              color="error"
              @click="deleteNote(note)"
            />
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-4 text-grey">
      <v-icon size="32" class="mb-2">mdi-note-text-outline</v-icon>
      <p class="text-body-2">No notes yet</p>
    </div>
  </div>
</template>

<style scoped>
.notes-list {
  max-height: 400px;
  overflow-y: auto;
}

.note-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.border-primary {
  border-color: rgb(var(--v-theme-primary)) !important;
  border-width: 2px;
}
</style>
