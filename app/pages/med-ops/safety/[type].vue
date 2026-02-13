<template>
  <div class="safety-form-page">
    <!-- Back link -->
    <div class="mb-4">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="router.push('/med-ops/safety')"
        class="text-none"
      >
        Back to Safety Logs
      </v-btn>
    </div>

    <!-- Emergency Contacts (static view — no form) -->
    <template v-if="logTypeKey === 'emergency_contacts'">
      <UiPageHeader
        title="Emergency Contacts & Shutoffs"
        subtitle="Read-only reference: emergency numbers and utility shutoff locations"
        icon="mdi-phone-alert"
      />
      <SafetyEmergencyContactsView :initial-location="initialLocation || 'venice'" />
    </template>

    <!-- Standard log form -->
    <template v-else-if="logTypeConfig">
      <UiPageHeader
        :title="logTypeConfig.label"
        :subtitle="logTypeConfig.description"
        :icon="logTypeConfig.icon"
      />

      <!-- Auto-filled user info banner -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
        icon="mdi-information"
      >
        Submitting as <strong>{{ userName }}</strong> on <strong>{{ todayFormatted }}</strong>.
        Date and User are auto-filled.
      </v-alert>

      <v-card variant="outlined" rounded="lg">
        <v-card-text class="pa-4 pa-sm-6">
          <SafetyLogFormRenderer
            :log-type="logTypeKey"
            :initial-location="initialLocation"
            :submitting="store.submitting"
            @submit="handleSubmit"
            @cancel="router.push('/med-ops/safety')"
          />
        </v-card-text>
      </v-card>
    </template>

    <!-- Invalid type -->
    <template v-else>
      <UiEmptyState
        type="generic"
        title="Unknown Log Type"
        description="The requested safety log type does not exist."
      >
        <template #action>
          <v-btn color="primary" @click="router.push('/med-ops/safety')">
            Back to Safety Logs
          </v-btn>
        </template>
      </UiEmptyState>
    </template>

    <!-- Success dialog -->
    <v-dialog v-model="showSuccess" max-width="420" persistent>
      <v-card rounded="lg">
        <v-card-text class="text-center pa-8">
          <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
          <h3 class="text-h6 font-weight-bold mb-2">Log Submitted!</h3>
          <p class="text-body-2 text-grey mb-6">
            Your {{ logTypeConfig?.label }} entry has been recorded.
          </p>
          <div class="d-flex flex-column gap-2">
            <v-btn
              color="primary"
              block
              @click="router.push('/med-ops/safety')"
            >
              Back to Dashboard
            </v-btn>
            <v-btn
              variant="outlined"
              block
              @click="resetAndStay"
            >
              Submit Another
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import {
  type SafetyLogType,
  type SafetyLogLocation,
  safetySlugToKey,
  getSafetyLogTypeConfig,
} from '~/types/safety-log.types'
import { useSafetyLogStore } from '~/stores/safetyLog'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const store = useSafetyLogStore()
const toast = useToast()
const authStore = useAuthStore()

// Resolve log type from URL slug: /med-ops/safety/radiation-dosimetry → radiation_dosimetry
const logTypeKey = computed<SafetyLogType>(() =>
  safetySlugToKey(route.params.type as string) as SafetyLogType
)

const logTypeConfig = computed(() => getSafetyLogTypeConfig(logTypeKey.value))

// QR deep-link: ?location=venice pre-selects location
const initialLocation = computed<SafetyLogLocation | null>(() => {
  const loc = route.query.location as string
  if (['venice', 'sherman_oaks', 'van_nuys'].includes(loc)) return loc as SafetyLogLocation
  return null
})

// Auto-fill user
const userName = computed(() => {
  const p = authStore.profile
  if (p?.first_name && p?.last_name) return `${p.first_name} ${p.last_name}`
  return authStore.user?.email || 'You'
})

const todayFormatted = computed(() => format(new Date(), 'MMMM d, yyyy'))

const showSuccess = ref(false)

async function handleSubmit(payload: { location: SafetyLogLocation; form_data: Record<string, unknown>; osha_recordable: boolean }) {
  try {
    await store.createLog({
      log_type: logTypeKey.value,
      location: payload.location,
      form_data: payload.form_data,
      submitted_by: authStore.profile?.id || '',
      osha_recordable: payload.osha_recordable,
      status: 'submitted',
    })
    showSuccess.value = true
    toast.success('Safety log submitted successfully')
  } catch (err: any) {
    toast.error(err?.message || 'Failed to submit safety log')
  }
}

function resetAndStay() {
  showSuccess.value = false
  // The form will re-mount with fresh state
  router.replace({ path: route.path, query: route.query })
}
</script>

<style scoped>
.safety-form-page {
  max-width: 900px;
}

@media (max-width: 599px) {
  .safety-form-page {
    padding: 0 4px;
  }
}
</style>
