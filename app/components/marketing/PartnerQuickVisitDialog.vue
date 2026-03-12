<template>
  <v-dialog
    v-model="visible"
    :fullscreen="$vuetify.display.smAndDown"
    :max-width="$vuetify.display.smAndDown ? undefined : 650"
    persistent
    scrollable
  >
    <v-card>
      <v-toolbar color="teal" density="compact">
        <v-btn icon aria-label="Close" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title>
          <v-icon class="mr-2">mdi-map-marker-plus</v-icon>
          Log Partner Visit
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="text"
          :loading="saving"
          :disabled="!form.partner_id"
          @click="save"
        >
          Save
        </v-btn>
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Partner Selection -->
        <v-autocomplete
          v-if="!preselectedPartner"
          v-model="form.partner_id"
          :items="partners"
          item-title="name"
          item-value="id"
          label="Select Partner *"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-handshake"
          class="mb-3"
          hide-details
          @update:model-value="onPartnerSelected"
        />

        <v-chip
          v-else
          color="teal"
          variant="elevated"
          class="mb-3"
          prepend-icon="mdi-handshake"
        >
          {{ preselectedPartner.name }}
        </v-chip>

        <!-- Visit Date & Type -->
        <v-row dense class="mb-2">
          <v-col cols="6">
            <v-text-field
              v-model="form.visit_date"
              label="Visit Date"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6">
            <v-select
              v-model="form.visit_type"
              :items="visitTypeOptions"
              label="Visit Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
        </v-row>

        <!-- Spoke To -->
        <v-text-field
          v-model="form.spoke_to"
          label="Spoke With"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-account"
          placeholder="Name of person you met"
          class="mb-3"
          hide-details
        />

        <!-- Items Dropped Off -->
        <div class="text-subtitle-2 mb-2">Materials Dropped Off</div>
        <div class="d-flex flex-wrap gap-2 mb-4">
          <v-chip
            v-for="item in dropOffItems"
            :key="item.value"
            :color="form.items_dropped_off.includes(item.value) ? 'teal' : undefined"
            :variant="form.items_dropped_off.includes(item.value) ? 'elevated' : 'outlined'"
            size="small"
            @click="toggleDropOff(item.value)"
          >
            <v-icon start size="16">{{ item.icon }}</v-icon>
            {{ item.label }}
          </v-chip>
        </div>

        <!-- Items Discussed -->
        <div class="text-subtitle-2 mb-2">Topics Discussed</div>
        <div class="d-flex flex-wrap gap-2 mb-4">
          <v-chip
            v-for="item in discussionItems"
            :key="item.value"
            :color="form.items_discussed.includes(item.value) ? 'primary' : undefined"
            :variant="form.items_discussed.includes(item.value) ? 'elevated' : 'outlined'"
            size="small"
            @click="toggleDiscussed(item.value)"
          >
            <v-icon start size="16">{{ item.icon }}</v-icon>
            {{ item.label }}
          </v-chip>
        </div>

        <!-- Next Visit Date -->
        <v-text-field
          v-model="form.next_visit_date"
          label="Schedule Next Visit"
          type="date"
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-calendar-clock"
          class="mb-3"
          hide-details
        />

        <!-- Notes -->
        <v-textarea
          v-model="form.visit_notes"
          label="Visit Notes"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          placeholder="Detailed notes about the visit..."
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Partner, MarketingPartnerVisit } from '~/types/marketing.types'

const props = defineProps<{
  modelValue: boolean
  partners: Partner[]
  preselectedPartner?: Partner | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': []
  'notify': [payload: { message: string; color: string }]
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const authStore = useAuthStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const saving = ref(false)

function localDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const form = reactive({
  partner_id: null as string | null,
  partner_name: '',
  visit_date: localDateString(),
  visit_type: 'in_person' as string,
  spoke_to: '',
  items_dropped_off: [] as string[],
  items_discussed: [] as string[],
  next_visit_date: null as string | null,
  visit_notes: ''
})

const visitTypeOptions = [
  { title: 'In Person', value: 'in_person' },
  { title: 'Drop-off Only', value: 'drop_off' },
  { title: 'Phone Call', value: 'phone' },
  { title: 'Email', value: 'email' },
  { title: 'At Event', value: 'event' },
  { title: 'Other', value: 'other' }
]

const dropOffItems = [
  { value: 'brochures', label: 'Brochures', icon: 'mdi-file-document' },
  { value: 'business_cards', label: 'Business Cards', icon: 'mdi-card-account-details' },
  { value: 'flyers', label: 'Flyers', icon: 'mdi-newspaper' },
  { value: 'posters', label: 'Posters', icon: 'mdi-image-frame' },
  { value: 'swag', label: 'Swag / Promo Items', icon: 'mdi-gift' },
  { value: 'pet_treats', label: 'Pet Treats', icon: 'mdi-bone' },
  { value: 'coupons', label: 'Coupons / Offers', icon: 'mdi-ticket-percent' },
  { value: 'other', label: 'Other', icon: 'mdi-dots-horizontal' }
]

const discussionItems = [
  { value: 'adoption_event', label: 'Adoption Event', icon: 'mdi-paw' },
  { value: 'partnership', label: 'Partnership', icon: 'mdi-handshake' },
  { value: 'event_collab', label: 'Event Collab', icon: 'mdi-calendar-star' },
  { value: 'social_media', label: 'Social Media', icon: 'mdi-instagram' },
  { value: 'cross_promotion', label: 'Cross Promo', icon: 'mdi-swap-horizontal' },
  { value: 'community', label: 'Community', icon: 'mdi-account-group' },
  { value: 'services', label: 'Services', icon: 'mdi-cog' },
  { value: 'check_in', label: 'Check-in', icon: 'mdi-check-circle' },
  { value: 'other', label: 'Other', icon: 'mdi-dots-horizontal' }
]

function toggleDropOff(value: string) {
  const idx = form.items_dropped_off.indexOf(value)
  if (idx === -1) {
    form.items_dropped_off.push(value)
  } else {
    form.items_dropped_off.splice(idx, 1)
  }
}

function toggleDiscussed(value: string) {
  const idx = form.items_discussed.indexOf(value)
  if (idx === -1) {
    form.items_discussed.push(value)
  } else {
    form.items_discussed.splice(idx, 1)
  }
}

function onPartnerSelected(id: string) {
  const partner = props.partners.find(p => p.id === id)
  if (partner) {
    form.partner_name = partner.name
  }
}

// Pre-fill when preselectedPartner is set
watch(() => props.preselectedPartner, (p) => {
  if (p) {
    form.partner_id = p.id
    form.partner_name = p.name
  }
}, { immediate: true })

// Reset form on open
watch(visible, (v) => {
  if (v) {
    form.visit_date = localDateString()
    form.visit_type = 'in_person'
    form.spoke_to = ''
    form.items_dropped_off = []
    form.items_discussed = []
    form.next_visit_date = null
    form.visit_notes = ''
    if (props.preselectedPartner) {
      form.partner_id = props.preselectedPartner.id
      form.partner_name = props.preselectedPartner.name
    } else {
      form.partner_id = null
      form.partner_name = ''
    }
  }
})

function close() {
  visible.value = false
}

async function save() {
  if (!form.partner_id) {
    emit('notify', { message: 'Please select a partner', color: 'warning' })
    return
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData?.session?.user?.id || user.value?.id

  if (!userId) {
    emit('notify', { message: 'Session expired. Please refresh and try again.', color: 'error' })
    return
  }

  saving.value = true
  try {
    const profileId = authStore.profile?.id || null
    const partnerName = form.partner_name || props.partners.find(p => p.id === form.partner_id)?.name || 'Unknown'

    const { error } = await supabase.from('marketing_partner_visits').insert({
      user_id: userId,
      profile_id: profileId,
      partner_id: form.partner_id,
      partner_name: partnerName,
      visit_date: form.visit_date,
      spoke_to: form.spoke_to || null,
      visit_type: form.visit_type,
      items_dropped_off: form.items_dropped_off.length ? form.items_dropped_off : null,
      items_discussed: form.items_discussed.length ? form.items_discussed : null,
      next_visit_date: form.next_visit_date || null,
      visit_notes: form.visit_notes || null,
      logged_via: 'web'
    })

    if (error) throw error

    emit('notify', { message: 'Visit logged!', color: 'success' })
    close()
    emit('saved')
  } catch (err: any) {
    console.error('[PartnerQuickVisit] Save error:', err)
    emit('notify', { message: err.message || 'Failed to log visit', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
