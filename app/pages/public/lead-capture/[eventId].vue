<template>
  <NuxtLayout name="public">
    <div class="min-h-[calc(100vh-180px)] flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-lg">
        <!-- Event Header -->
        <div v-if="eventData" class="text-center mb-8">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
            <span>🎪</span>
            <span>{{ eventData.name }}</span>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">Welcome!</h1>
          <p class="text-slate-400">Fill out the form below and we'll be in touch.</p>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading" class="text-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p class="text-slate-400">Loading...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="!eventData && !loading" class="text-center py-20">
          <div class="text-6xl mb-4">🔗</div>
          <h2 class="text-2xl font-bold text-white mb-2">Invalid Link</h2>
          <p class="text-slate-400">This event link is invalid or has expired.</p>
        </div>

        <!-- Success State -->
        <div v-if="submitted" class="bg-slate-800/50 backdrop-blur border border-emerald-500/30 rounded-2xl p-8 text-center">
          <div class="text-6xl mb-4">🎉</div>
          <h2 class="text-2xl font-bold text-white mb-2">Thank You!</h2>
          <p class="text-slate-400 mb-6">We've received your information and will reach out soon.</p>
          <div class="text-sm text-slate-500">You can close this page now.</div>
        </div>

        <!-- Lead Capture Form -->
        <form 
          v-else-if="eventData" 
          @submit.prevent="submitForm"
          class="bg-slate-800/50 backdrop-blur border border-white/10 rounded-2xl p-8"
        >
          <!-- First Name -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              First Name <span class="text-red-400">*</span>
            </label>
            <input 
              v-model="form.first_name"
              type="text"
              required
              placeholder="Enter your first name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Last Name -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Last Name <span class="text-red-400">*</span>
            </label>
            <input 
              v-model="form.last_name"
              type="text"
              required
              placeholder="Enter your last name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Email -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Email <span class="text-red-400">*</span>
            </label>
            <input 
              v-model="form.email"
              type="email"
              required
              placeholder="you@example.com"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Phone (Optional) -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Phone <span class="text-slate-500">(optional)</span>
            </label>
            <input 
              v-model="form.phone"
              type="tel"
              placeholder="(555) 123-4567"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Pet Name -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Pet Name <span class="text-slate-500">(optional)</span>
            </label>
            <input 
              v-model="form.pet_name"
              type="text"
              placeholder="Your pet's name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Interested In (Service) -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Interested In
            </label>
            <select 
              v-model="form.interested_in"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="">Select a service...</option>
              <option value="wellness_exam">Wellness Exam</option>
              <option value="vaccinations">Vaccinations</option>
              <option value="dental_care">Dental Care</option>
              <option value="surgery">Surgery</option>
              <option value="grooming">Grooming</option>
              <option value="boarding">Boarding</option>
              <option value="emergency_care">Emergency Care</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Company (Optional) -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Company <span class="text-slate-500">(optional)</span>
            </label>
            <input 
              v-model="form.company"
              type="text"
              placeholder="Your company name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Interest Level -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Interest Level
            </label>
            <select 
              v-model="form.interest_level"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="just_curious">Just Curious</option>
              <option value="learning_more">Learning More</option>
              <option value="very_interested">Very Interested</option>
              <option value="ready_to_buy">Ready to Start</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Anything else you'd like us to know?
            </label>
            <textarea 
              v-model="form.notes"
              rows="3"
              placeholder="Tell us more..."
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition resize-none"
            ></textarea>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
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
              Submitting...
            </span>
            <span v-else>Submit</span>
          </button>

          <!-- Privacy note -->
          <p class="text-center text-slate-500 text-xs mt-4">
            Your information is safe with us. We never spam.
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
const supabase = useSupabaseClient()

const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const errorMessage = ref('')
const eventData = ref<any>(null)

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  pet_name: '',
  interested_in: '',
  company: '',
  interest_level: 'learning_more',
  notes: ''
})

// Get event ID from URL
const eventId = computed(() => route.params.eventId as string)

// Fetch event data on mount
onMounted(async () => {
  if (!eventId.value) {
    loading.value = false
    return
  }

  try {
    const { data, error } = await supabase
      .from('marketing_events')
      .select('id, name, event_date, status')
      .eq('id', eventId.value)
      .single()

    if (error) throw error
    eventData.value = data
  } catch (err) {
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
    // Create full name from first + last
    const leadName = `${form.value.first_name} ${form.value.last_name}`.trim()
    
    // Build notes with pet name and interested in service
    const noteParts = []
    if (form.value.pet_name) noteParts.push(`Pet: ${form.value.pet_name}`)
    if (form.value.interested_in) noteParts.push(`Interested In: ${form.value.interested_in.replace(/_/g, ' ')}`)
    if (form.value.notes) noteParts.push(form.value.notes)
    const combinedNotes = noteParts.join(' | ') || null
    
    const { error } = await supabase
      .from('marketing_leads')
      .insert({
        lead_name: leadName,
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        email: form.value.email,
        phone: form.value.phone || null,
        company: form.value.company || null,
        interest_level: form.value.interest_level,
        notes: combinedNotes,
        source_event_id: eventId.value,
        event_id: eventId.value, // Also set event_id for backwards compat
        source: 'event_qr',
        status: 'new'
      } as any) // Use 'as any' to bypass strict type checking for new columns

    if (error) throw error

    submitted.value = true
  } catch (err: any) {
    console.error('Error submitting lead:', err)
    errorMessage.value = err?.message || 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
