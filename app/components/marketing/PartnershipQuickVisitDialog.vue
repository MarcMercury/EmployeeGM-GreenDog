<template>
  <v-dialog
    v-model="visible"
    :fullscreen="$vuetify.display.smAndDown"
    :max-width="$vuetify.display.smAndDown ? undefined : 600"
    persistent
    scrollable
  >
    <v-card class="quick-visit-card">
      <v-toolbar color="success" density="compact">
        <v-btn icon aria-label="Close" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>
          <v-icon class="mr-2">mdi-map-marker-plus</v-icon>
          Log Clinic Visit
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          :loading="saving"
          :disabled="!form.clinic_name"
          @click="save"
        >
          Save
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4 quick-visit-form">
        <!-- Visit Date -->
        <v-text-field
          v-model="form.visit_date"
          label="Visit Date"
          type="date"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-calendar"
          class="mb-4"
        />

        <!-- Clinic Selection -->
        <v-autocomplete
          v-model="form.partner_id"
          :items="partnerOptions"
          item-title="name"
          item-value="id"
          label="Clinic / Partner"
          placeholder="Search or select clinic..."
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-hospital-building"
          clearable
          class="mb-4"
          @update:model-value="onClinicSelect"
        >
          <template #no-data>
            <v-list-item>
              <v-list-item-title>No matching clinics</v-list-item-title>
              <v-list-item-subtitle>Type a custom name below if needed</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-autocomplete>

        <!-- Custom clinic name if not in list -->
        <v-text-field
          v-if="!form.partner_id"
          v-model="form.clinic_name"
          label="Clinic Name (if not in list)"
          placeholder="Enter clinic name..."
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-domain"
          class="mb-4"
        />

        <!-- Who they spoke to -->
        <v-text-field
          v-model="form.spoke_to"
          label="Spoke With"
          placeholder="Who did you meet with?"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-account"
          class="mb-4"
        />

        <!-- Items Discussed - Toggleable Pills -->
        <div class="mb-4">
          <div class="text-body-2 text-grey-darken-1 mb-2">
            <v-icon size="small" class="mr-1">mdi-chat-processing</v-icon>
            Items Discussed
          </div>
          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-for="item in discussionItems"
              :key="item.value"
              :color="form.items_discussed.includes(item.value) ? 'success' : 'default'"
              :variant="form.items_discussed.includes(item.value) ? 'flat' : 'outlined'"
              size="large"
              class="discussion-chip"
              @click="toggleDiscussionItem(item.value)"
            >
              <v-icon start size="small">{{ item.icon }}</v-icon>
              {{ item.label }}
            </v-chip>
          </div>
        </div>

        <!-- Next Visit Date -->
        <v-text-field
          v-model="form.next_visit_date"
          label="Next Visit Date (Optional)"
          type="date"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-calendar-clock"
          clearable
          class="mb-4"
        />

        <!-- Voice-to-Text Notes Section -->
        <div class="mb-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-body-2 text-grey-darken-1">
              <v-icon size="small" class="mr-1">mdi-note-text</v-icon>
              Visit Notes
            </div>
            <v-btn
              :color="isListening ? 'error' : 'primary'"
              :variant="isListening ? 'flat' : 'tonal'"
              size="small"
              :class="{ 'pulse-animation': isListening }"
              @mousedown="startListening"
              @mouseup="stopListening"
              @mouseleave="stopListening"
              @touchstart.prevent="startListening"
              @touchend.prevent="stopListening"
            >
              <v-icon start>{{ isListening ? 'mdi-microphone' : 'mdi-microphone-outline' }}</v-icon>
              {{ isListening ? 'Listening...' : 'Hold to Speak' }}
            </v-btn>
          </div>
          <v-textarea
            v-model="form.visit_notes"
            placeholder="Tap the microphone and speak, or type your notes here..."
            variant="outlined"
            density="comfortable"
            rows="4"
            auto-grow
            :readonly="isListening"
            :class="{ 'listening-textarea': isListening }"
          />
          <div v-if="!speechSupported" class="text-caption text-warning">
            <v-icon size="small">mdi-alert</v-icon>
            Voice input not supported in this browser
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Partner } from '~/types/marketing.types'

const props = defineProps<{
  partners: Partner[]
}>()

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'notify', payload: { message: string; color: string }): void
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const authStore = useAuthStore()

// Dialog visibility
const visible = ref(false)
const saving = ref(false)

// Speech recognition
const isListening = ref(false)
const speechSupported = ref(false)
let recognition: any = null

const discussionItems = [
  { value: 'surgery', label: 'Surgery', icon: 'mdi-medical-bag' },
  { value: 'dental_surgery', label: 'Dental Surgery', icon: 'mdi-tooth' },
  { value: 'im', label: 'IM', icon: 'mdi-stethoscope' },
  { value: 'exotics', label: 'Exotics', icon: 'mdi-bird' },
  { value: 'urgent_care', label: 'Urgent Care', icon: 'mdi-ambulance' },
  { value: 'other', label: 'Other', icon: 'mdi-dots-horizontal' }
]

const form = reactive({
  partner_id: null as string | null,
  clinic_name: '',
  visit_date: new Date().toISOString().split('T')[0],
  spoke_to: '',
  items_discussed: [] as string[],
  next_visit_date: null as string | null,
  visit_notes: ''
})

const partnerOptions = computed(() => {
  return props.partners.map(p => ({
    id: p.id,
    name: p.name
  })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
})

// --- Public methods to open the dialog ---
function open() {
  form.partner_id = null
  form.clinic_name = ''
  form.visit_date = new Date().toISOString().split('T')[0]
  form.spoke_to = ''
  form.items_discussed = []
  form.next_visit_date = null
  form.visit_notes = ''
  initSpeechRecognition()
  visible.value = true
}

function openWithPartner(partner: { id: string; name: string; best_contact_person?: string; contact_name?: string }) {
  form.partner_id = partner.id
  form.clinic_name = partner.name
  form.visit_date = new Date().toISOString().split('T')[0]
  form.spoke_to = partner.best_contact_person || partner.contact_name || ''
  form.items_discussed = []
  form.next_visit_date = null
  form.visit_notes = ''
  initSpeechRecognition()
  visible.value = true
}

function close() {
  stopListening()
  visible.value = false
}

function onClinicSelect(partnerId: string | null) {
  if (partnerId) {
    const partner = props.partners.find(p => p.id === partnerId)
    if (partner) {
      form.clinic_name = partner.name
    }
  } else {
    form.clinic_name = ''
  }
}

function toggleDiscussionItem(item: string) {
  const idx = form.items_discussed.indexOf(item)
  if (idx >= 0) {
    form.items_discussed.splice(idx, 1)
  } else {
    form.items_discussed.push(item)
  }
}

// --- Speech Recognition ---
function initSpeechRecognition() {
  if (typeof window === 'undefined') return

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    speechSupported.value = false
    return
  }

  speechSupported.value = true
  recognition = new SpeechRecognition()
  recognition.continuous = false
  recognition.interimResults = false
  recognition.lang = 'en-US'
  recognition.maxAlternatives = 1

  recognition.onresult = (event: any) => {
    let newText = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        newText += event.results[i][0].transcript
      }
    }

    if (newText) {
      const currentNotes = form.visit_notes || ''
      if (currentNotes && !currentNotes.endsWith(' ') && !currentNotes.endsWith('.')) {
        form.visit_notes = currentNotes + ' ' + newText.trim()
      } else {
        form.visit_notes = currentNotes + newText.trim()
      }
    }
  }

  recognition.onerror = (event: any) => {
    console.error('[SpeechRecognition] Error:', event.error)
    isListening.value = false
  }

  recognition.onend = () => {
    if (isListening.value) {
      try {
        recognition.start()
      } catch (_e) {
        isListening.value = false
      }
    }
  }
}

function startListening() {
  if (!speechSupported.value || !recognition) {
    initSpeechRecognition()
    if (!recognition) return
  }

  try {
    recognition.start()
    isListening.value = true
  } catch (e) {
    console.error('[SpeechRecognition] Start error:', e)
  }
}

function stopListening() {
  if (recognition && isListening.value) {
    try {
      recognition.stop()
    } catch (e) {
      console.error('[SpeechRecognition] Stop error:', e)
    }
  }
  isListening.value = false
}

async function save() {
  if (!form.clinic_name && !form.partner_id) {
    emit('notify', { message: 'Please select or enter a clinic name', color: 'warning' })
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id || user.value?.id

  if (!userId) {
    emit('notify', { message: 'Session expired. Please refresh the page and try again.', color: 'error' })
    return
  }

  saving.value = true

  try {
    const profileId = authStore.profile?.id || null

    const { error } = await supabase.from('clinic_visits').insert({
      user_id: userId,
      profile_id: profileId,
      partner_id: form.partner_id,
      clinic_name: form.clinic_name ||
        props.partners.find(p => p.id === form.partner_id)?.name || 'Unknown',
      visit_date: form.visit_date,
      spoke_to: form.spoke_to || null,
      items_discussed: form.items_discussed,
      next_visit_date: form.next_visit_date || null,
      visit_notes: form.visit_notes || null,
      logged_via: 'web'
    })

    if (error) throw error

    if (form.next_visit_date && form.partner_id) {
      await supabase
        .from('referral_partners')
        .update({
          next_followup_date: form.next_visit_date,
          needs_followup: true
        })
        .eq('id', form.partner_id)
    }

    emit('notify', { message: 'Visit Logged ✓', color: 'success' })
    close()
    emit('saved')
  } catch (err: any) {
    console.error('[QuickVisit] Save error:', err)
    emit('notify', { message: err.message || 'Failed to log visit', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ open, openWithPartner })
</script>
