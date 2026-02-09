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
          <h1 class="text-3xl font-bold text-white mb-2">Welcome to Green Dog!</h1>
          <p class="text-slate-400">Fill out the form below to claim your prize.</p>
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
          <p class="text-slate-400 mb-6">Congratulations on your prize! We've received your information.</p>
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

          <!-- Pet Name -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Pet Name <span class="text-red-400">*</span>
            </label>
            <input 
              v-model="form.pet_name"
              type="text"
              required
              placeholder="Your pet's name"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
          </div>

          <!-- Species -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Species <span class="text-red-400">*</span>
            </label>
            <select 
              v-model="form.species"
              required
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="" disabled>Select species...</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Reptile">Reptile</option>
              <option value="Rabbit">Rabbit</option>
              <option value="Other">Other</option>
            </select>
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

          <!-- Current Client of Greendog (Optional) -->
          <div class="mb-5">
            <label class="flex items-center gap-3 cursor-pointer">
              <input 
                v-model="form.is_current_client"
                type="checkbox"
                class="w-5 h-5 rounded border-white/20 bg-slate-900/50 text-emerald-500 focus:ring-emerald-500/50 focus:ring-offset-0"
              />
              <span class="text-slate-300 text-sm font-medium">
                I'm a current client of Green Dog <span class="text-slate-500">(optional)</span>
              </span>
            </label>
          </div>

          <!-- What did you win? -->
          <div class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              What did you win? <span class="text-red-400">*</span>
            </label>
            <div v-if="prizesLoading" class="text-slate-400 text-sm py-3">Loading prizes...</div>
            <select 
              v-else
              v-model="form.prize_item_id"
              required
              @change="onPrizeSelect"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="" disabled>Select your prize...</option>
              <option 
                v-for="prize in prizeItems" 
                :key="prize.id" 
                :value="prize.id"
              >
                {{ prize.name }}
              </option>
              <option value="other">Other / Not Listed</option>
            </select>
          </div>

          <!-- Prize Location (only shown when prize selected) -->
          <div v-if="form.prize_item_id && form.prize_item_id !== 'other'" class="mb-5">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Which location gave you the prize? <span class="text-red-400">*</span>
            </label>
            <select 
              v-model="form.prize_location"
              required
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition appearance-none"
            >
              <option value="" disabled>Select location...</option>
              <option value="venice">Venice</option>
              <option value="sherman_oaks">Sherman Oaks</option>
              <option value="valley">Valley</option>
              <option value="mpmv">MPMV</option>
              <option value="offsite">Offsite / Event</option>
            </select>
          </div>

          <!-- Other Prize Description (shown when "Other" selected) -->
          <div v-if="form.prize_item_id === 'other'" class="mb-6">
            <label class="block text-slate-300 text-sm font-medium mb-2">
              Describe your prize <span class="text-red-400">*</span>
            </label>
            <input 
              v-model="form.other_prize_description"
              type="text"
              :required="form.prize_item_id === 'other'"
              placeholder="Enter prize description"
              class="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
            />
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
            <span v-else>Claim My Prize!</span>
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
import type { PrizeItem } from '~/types/marketing.types'

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
const prizeItems = ref<PrizeItem[]>([])
const prizesLoading = ref(true)

const form = ref({
  first_name: '',
  last_name: '',
  pet_name: '',
  species: '',
  email: '',
  phone: '',
  is_current_client: false,
  prize_item_id: '',
  prize_location: '',
  other_prize_description: ''
})

// Get event ID from URL
const eventId = computed(() => route.params.eventId as string)

// Handle prize selection change
function onPrizeSelect() {
  // Reset location when prize changes
  if (form.value.prize_item_id === 'other') {
    form.value.prize_location = ''
  }
}

// Fetch prize inventory items
async function fetchPrizeItems() {
  prizesLoading.value = true
  try {
    // Fetch all inventory items that could be prizes (category = 'prize' or 'swag' or all items)
    const { data, error } = await supabase
      .from('marketing_inventory')
      .select('id, name, category')
      .order('name')
    
    if (error) throw error
    prizeItems.value = data || []
  } catch (err) {
    console.error('Error fetching prize items:', err)
    prizeItems.value = []
  } finally {
    prizesLoading.value = false
  }
}

// Fetch event data on mount
onMounted(async () => {
  // Start fetching prizes in parallel
  fetchPrizeItems()
  
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
    
    // Build notes with pet info and prize
    const noteParts = []
    if (form.value.pet_name) noteParts.push(`Pet: ${form.value.pet_name}`)
    if (form.value.species) noteParts.push(`Species: ${form.value.species}`)
    if (form.value.is_current_client) noteParts.push('Current Client: Yes')
    
    // Add prize info to notes
    const selectedPrize = prizeItems.value.find(p => p.id === form.value.prize_item_id)
    if (selectedPrize) {
      noteParts.push(`Prize Won: ${selectedPrize.name}`)
    } else if (form.value.prize_item_id === 'other' && form.value.other_prize_description) {
      noteParts.push(`Prize Won: ${form.value.other_prize_description}`)
    }
    
    const combinedNotes = noteParts.join(' | ') || null
    
    // Determine if we should use the RPC function (has valid prize item + location)
    const hasValidPrize = form.value.prize_item_id && 
                          form.value.prize_item_id !== 'other' && 
                          form.value.prize_location
    
    if (hasValidPrize) {
      // Use the create_lead_with_prize RPC to create lead AND deduct inventory
      const { error } = await supabase.rpc('create_lead_with_prize', {
        p_lead_name: leadName,
        p_first_name: form.value.first_name,
        p_last_name: form.value.last_name,
        p_email: form.value.email,
        p_phone: form.value.phone || null,
        p_notes: combinedNotes,
        p_source_event_id: eventId.value,
        p_source: 'event_qr',
        p_interest_level: form.value.is_current_client ? 'current_client' : 'new_prospect',
        p_prize_item_id: form.value.prize_item_id,
        p_prize_quantity: 1,
        p_prize_location: form.value.prize_location
      })

      if (error) throw error
    } else {
      // Fallback to regular insert for "other" prizes or no prize
      const { error } = await supabase
        .from('marketing_leads')
        .insert({
          lead_name: leadName,
          first_name: form.value.first_name,
          last_name: form.value.last_name,
          email: form.value.email,
          phone: form.value.phone || null,
          notes: combinedNotes,
          source_event_id: eventId.value,
          event_id: eventId.value,
          source: 'event_qr',
          status: 'new',
          interest_level: form.value.is_current_client ? 'current_client' : 'new_prospect'
        } as any)

      if (error) throw error
    }

    submitted.value = true
  } catch (err: any) {
    console.error('Error submitting lead:', err)
    errorMessage.value = err?.message || 'Something went wrong. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>
