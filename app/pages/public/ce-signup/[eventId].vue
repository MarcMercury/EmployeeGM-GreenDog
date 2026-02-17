<template>
  <NuxtLayout name="public">
    <div class="min-h-[calc(100vh-180px)] flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-lg">
        <!-- Event Header -->
        <div v-if="eventData && !submitted" class="text-center mb-8">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
            <span>🎓</span>
            <span>Continuing Education Event</span>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">{{ eventData.title }}</h1>
          <p class="text-slate-400 mb-1">{{ formatDate(eventData.event_date_start) }}</p>
          <p v-if="eventData.location_name" class="text-slate-500 text-sm">📍 {{ eventData.location_name }}</p>
          <div v-if="eventData.ce_hours_offered" class="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-xs font-medium">
            <span>⏱️ {{ eventData.ce_hours_offered }} CE Hours</span>
            <span v-if="eventData.format"> • {{ formatLabel(eventData.format) }}</span>
          </div>
          <p v-if="eventData.speaker_name" class="text-slate-500 text-sm mt-2">🎤 Speaker: {{ eventData.speaker_name }}</p>
          <p class="text-slate-400 text-sm mt-4">Register below to reserve your spot.</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p class="text-slate-400">Loading event...</p>
        </div>

        <!-- Error / Invalid State -->
        <div v-else-if="!eventData && !loading && !submitted" class="text-center py-20">
          <div class="text-6xl mb-4">🔗</div>
          <h2 class="text-2xl font-bold text-white mb-2">Invalid Link</h2>
          <p class="text-slate-400">This event registration link is invalid or the event is no longer accepting sign-ups.</p>
        </div>

        <!-- Capacity Full -->
        <div v-else-if="eventData && capacityFull && !submitted" class="text-center py-20">
          <div class="text-6xl mb-4">🚫</div>
          <h2 class="text-2xl font-bold text-white mb-2">Registration Full</h2>
          <p class="text-slate-400">This event has reached its maximum capacity. Please contact us if you'd like to be added to a waitlist.</p>
        </div>

        <!-- Success State -->
        <div v-if="submitted" class="bg-slate-800/50 backdrop-blur border border-emerald-500/30 rounded-2xl p-8 text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h2 class="text-2xl font-bold text-white mb-2">You're Registered!</h2>
          <p class="text-slate-400 mb-4">Thank you for signing up for <span class="text-white font-medium">{{ eventData?.title }}</span>.</p>
          <div class="bg-slate-900/50 rounded-xl p-4 mb-4 text-left">
            <p class="text-slate-300 text-sm mb-2">📅 {{ eventData ? formatDate(eventData.event_date_start) : '' }}</p>
            <p v-if="eventData?.location_name" class="text-slate-300 text-sm mb-2">📍 {{ eventData.location_name }}</p>
            <p v-if="eventData?.location_address" class="text-slate-400 text-xs">{{ eventData.location_address }}</p>
          </div>
          <p class="text-slate-500 text-sm">We'll send event details and reminders to your email. See you there!</p>
        </div>

        <!-- Registration Form -->
        <form
          v-else-if="eventData && !capacityFull"
          @submit.prevent="submitForm"
          class="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-8"
        >
          <h3 class="text-white font-semibold text-lg mb-6">Attendee Information</h3>

          <!-- First Name -->
          <div class="mb-5">
            <label for="ce-first-name" class="block text-slate-300 text-sm font-medium mb-2">
              First Name <span class="text-red-400">*</span>
            </label>
            <input
              id="ce-first-name"
              v-model="form.first_name"
              type="text"
              required
              maxlength="100"
              placeholder="Enter your first name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Last Name -->
          <div class="mb-5">
            <label for="ce-last-name" class="block text-slate-300 text-sm font-medium mb-2">
              Last Name <span class="text-red-400">*</span>
            </label>
            <input
              id="ce-last-name"
              v-model="form.last_name"
              type="text"
              required
              maxlength="100"
              placeholder="Enter your last name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Email -->
          <div class="mb-5">
            <label for="ce-email" class="block text-slate-300 text-sm font-medium mb-2">
              Email <span class="text-red-400">*</span>
            </label>
            <input
              id="ce-email"
              v-model="form.email"
              type="email"
              required
              maxlength="255"
              placeholder="you@example.com"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Phone -->
          <div class="mb-5">
            <label for="ce-phone" class="block text-slate-300 text-sm font-medium mb-2">
              Phone <span class="text-red-400">*</span>
            </label>
            <input
              id="ce-phone"
              v-model="form.phone"
              type="tel"
              required
              maxlength="20"
              placeholder="(555) 123-4567"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Organization / Practice Name -->
          <div class="mb-5">
            <label for="ce-org" class="block text-slate-300 text-sm font-medium mb-2">
              Practice / Organization Name <span class="text-red-400">*</span>
            </label>
            <input
              id="ce-org"
              v-model="form.organization_name"
              type="text"
              required
              maxlength="200"
              placeholder="e.g., ABC Veterinary Clinic"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Professional Role -->
          <div class="mb-5">
            <label for="ce-role" class="block text-slate-300 text-sm font-medium mb-2">
              Professional Role <span class="text-red-400">*</span>
            </label>
            <select
              id="ce-role"
              v-model="form.license_type"
              required
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="" disabled>Select your role...</option>
              <option value="DVM">DVM — Doctor of Veterinary Medicine</option>
              <option value="RVT">RVT — Registered Veterinary Technician</option>
              <option value="VTS">VTS — Veterinary Technician Specialist</option>
              <option value="VA">VA — Veterinary Assistant</option>
              <option value="Practice Manager">Practice Manager</option>
              <option value="Student">Student (Vet / Vet Tech)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- License Number -->
          <div class="mb-5">
            <label for="ce-license" class="block text-slate-300 text-sm font-medium mb-2">
              License Number <span class="text-slate-500">(required for CE credit)</span>
            </label>
            <input
              id="ce-license"
              v-model="form.license_number"
              type="text"
              maxlength="50"
              placeholder="e.g., VET-12345"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- License State -->
          <div class="mb-5">
            <label for="ce-state" class="block text-slate-300 text-sm font-medium mb-2">
              License State <span class="text-slate-500">(required for CE credit)</span>
            </label>
            <input
              id="ce-state"
              v-model="form.license_state"
              type="text"
              placeholder="e.g., CA"
              maxlength="2"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition uppercase"
            />
          </div>

          <!-- Dietary Restrictions / Accommodations -->
          <div class="mb-5">
            <label for="ce-accommodations" class="block text-slate-300 text-sm font-medium mb-2">
              Dietary Restrictions / Special Accommodations <span class="text-slate-500">(optional)</span>
            </label>
            <textarea
              id="ce-accommodations"
              v-model="form.special_accommodations"
              rows="2"
              maxlength="500"
              placeholder="Any dietary needs or accessibility requirements..."
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition resize-none"
            />
          </div>

          <!-- How Did You Hear About This Event -->
          <div class="mb-6">
            <label for="ce-source" class="block text-slate-300 text-sm font-medium mb-2">
              How did you hear about this event? <span class="text-slate-500">(optional)</span>
            </label>
            <select
              id="ce-source"
              v-model="form.lead_source"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="">Select one...</option>
              <option value="Email">Email</option>
              <option value="Social Media">Social Media</option>
              <option value="Website">Website</option>
              <option value="Colleague Referral">Colleague / Referral</option>
              <option value="Veterinary Association">Veterinary Association</option>
              <option value="Previous Event">Previous Event</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" role="alert" class="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {{ errorMessage }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="submitting"
            class="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="submitting" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Registering...
            </span>
            <span v-else>Register for This Event</span>
          </button>

          <!-- Privacy note -->
          <p class="text-center text-slate-500 text-xs mt-4">
            Your information is kept confidential and used solely for event administration and CE credit reporting.
          </p>
        </form>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  auth: false // Public page - no auth required
})

const route = useRoute()

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')
const eventData = ref<any>(null)
const capacityFull = ref(false)

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  organization_name: '',
  license_type: '',
  license_number: '',
  license_state: '',
  special_accommodations: '',
  lead_source: ''
})

const eventId = computed(() => route.params.eventId as string)

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatLabel(val: string) {
  const labels: Record<string, string> = {
    live: 'In-Person',
    webinar: 'Webinar',
    hybrid: 'Hybrid',
    recorded: 'Recorded'
  }
  return labels[val] || val
}

// Fetch event data via server API (bypasses RLS for public access)
onMounted(async () => {
  if (!eventId.value) {
    loading.value = false
    return
  }

  try {
    const data = await $fetch(`/api/public/ce-event/${eventId.value}`)

    eventData.value = data
    capacityFull.value = !!data.capacity_full
  } catch (err: any) {
    console.error('Error fetching event:', err)
    eventData.value = null
  } finally {
    loading.value = false
  }
})

async function submitForm() {
  if (submitting.value) return

  errorMessage.value = ''
  submitting.value = true

  try {
    await $fetch('/api/public/ce-signup', {
      method: 'POST',
      body: {
        event_id: eventId.value,
        first_name: form.value.first_name.trim(),
        last_name: form.value.last_name.trim(),
        email: form.value.email.trim().toLowerCase(),
        phone: form.value.phone.trim(),
        organization_name: form.value.organization_name.trim(),
        license_type: form.value.license_type || null,
        license_number: form.value.license_number.trim() || null,
        license_state: form.value.license_state.trim().toUpperCase() || null,
        special_accommodations: form.value.special_accommodations.trim() || null,
        lead_source: form.value.lead_source || null
      }
    })

    submitted.value = true
  } catch (err: any) {
    console.error('Error submitting registration:', err)
    const message = err?.data?.message || err?.message || 'Something went wrong. Please try again.'
    errorMessage.value = message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.uppercase {
  text-transform: uppercase;
}
</style>
