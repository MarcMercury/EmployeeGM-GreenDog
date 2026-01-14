<template>
  <NuxtLayout name="public">
    <div class="max-w-4xl mx-auto px-4 py-12">
      <!-- Hero Section -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-white mb-4">Join Our Team</h1>
        <p class="text-xl text-slate-300 max-w-2xl mx-auto">
          We're looking for passionate individuals to join our growing team. 
          Explore our open positions and take the next step in your career.
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        <p class="text-slate-400 mt-4">Loading positions...</p>
      </div>

      <!-- Positions List -->
      <div v-else-if="positions.length > 0" class="space-y-6">
        <div
          v-for="position in positions"
          :key="position.id"
          class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 transition-all"
        >
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-white mb-2">{{ position.title }}</h2>
              <div class="flex flex-wrap gap-3 text-sm text-slate-400 mb-3">
                <span v-if="position.department" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  {{ position.department.name }}
                </span>
                <span v-if="position.location" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {{ position.location.name }}
                </span>
                <span v-if="position.employment_type" class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  {{ formatEmploymentType(position.employment_type) }}
                </span>
              </div>
              <p v-if="position.description" class="text-slate-300 text-sm line-clamp-3">
                {{ position.description }}
              </p>
            </div>
            <div class="flex-shrink-0">
              <button
                @click="openApplicationModal(position)"
                class="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25"
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- No Positions -->
      <div v-else class="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
        <svg class="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <h3 class="text-xl font-semibold text-white mb-2">No Open Positions</h3>
        <p class="text-slate-400 max-w-md mx-auto">
          We don't have any open positions at the moment, but we're always looking for talented people. 
          Please check back later or send us your resume.
        </p>
        <button
          @click="openGeneralApplication"
          class="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
        >
          Submit General Application
        </button>
      </div>

      <!-- Application Modal -->
      <Teleport to="body">
        <div v-if="showApplicationModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <div class="p-6 border-b border-white/10">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-white">
                  {{ selectedPosition ? `Apply for ${selectedPosition.title}` : 'General Application' }}
                </h2>
                <button @click="closeModal" class="text-slate-400 hover:text-white transition-colors">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            <form @submit.prevent="submitApplication" class="p-6 space-y-6">
              <!-- Name Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">First Name *</label>
                  <input
                    v-model="form.first_name"
                    type="text"
                    required
                    class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">Last Name *</label>
                  <input
                    v-model="form.last_name"
                    type="text"
                    required
                    class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <!-- Contact Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <!-- Resume Upload or URL -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Resume URL (optional)</label>
                <input
                  v-model="form.resume_url"
                  type="url"
                  class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/johndoe or Google Drive link"
                />
                <p class="text-xs text-slate-500 mt-1">Link to your LinkedIn profile, resume on Google Drive, or similar</p>
              </div>

              <!-- Experience -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Years of Experience</label>
                <select
                  v-model="form.experience_years"
                  class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="" class="bg-slate-800">Select...</option>
                  <option value="0" class="bg-slate-800">Less than 1 year</option>
                  <option value="1" class="bg-slate-800">1-2 years</option>
                  <option value="3" class="bg-slate-800">3-5 years</option>
                  <option value="5" class="bg-slate-800">5-10 years</option>
                  <option value="10" class="bg-slate-800">10+ years</option>
                </select>
              </div>

              <!-- Cover Letter / Notes -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">Tell us about yourself</label>
                <textarea
                  v-model="form.cover_letter"
                  rows="4"
                  class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Share your background, why you're interested in this role, and what makes you a great fit..."
                ></textarea>
              </div>

              <!-- How did you hear about us -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">How did you hear about us?</label>
                <select
                  v-model="form.source"
                  class="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="" class="bg-slate-800">Select...</option>
                  <option value="website" class="bg-slate-800">Company Website</option>
                  <option value="indeed" class="bg-slate-800">Indeed</option>
                  <option value="linkedin" class="bg-slate-800">LinkedIn</option>
                  <option value="referral" class="bg-slate-800">Employee Referral</option>
                  <option value="career_fair" class="bg-slate-800">Career Fair</option>
                  <option value="other" class="bg-slate-800">Other</option>
                </select>
              </div>

              <!-- Submit Button -->
              <div class="flex gap-4 pt-4">
                <button
                  type="button"
                  @click="closeModal"
                  class="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="submitting"
                  class="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="!submitting">Submit Application</span>
                  <span v-else class="flex items-center justify-center gap-2">
                    <span class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Submitting...
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Teleport>

      <!-- Success Message -->
      <Teleport to="body">
        <div v-if="showSuccess" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-slate-800 rounded-2xl max-w-md w-full p-8 text-center border border-white/10">
            <div class="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">Application Submitted!</h3>
            <p class="text-slate-300 mb-6">
              Thank you for your application. Our team will review it and get back to you soon.
            </p>
            <button
              @click="showSuccess = false"
              class="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </Teleport>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  auth: false
})

interface Position {
  id: string
  title: string
  description: string | null
  employment_type: string | null
  is_active: boolean
  department: { name: string } | null
  location: { name: string } | null
}

const loading = ref(true)
const positions = ref<Position[]>([])
const showApplicationModal = ref(false)
const selectedPosition = ref<Position | null>(null)
const submitting = ref(false)
const showSuccess = ref(false)

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  resume_url: '',
  experience_years: '',
  cover_letter: '',
  source: ''
})

const formatEmploymentType = (type: string) => {
  const types: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    intern: 'Internship',
    temporary: 'Temporary'
  }
  return types[type] || type
}

const openApplicationModal = (position: Position) => {
  selectedPosition.value = position
  showApplicationModal.value = true
}

const openGeneralApplication = () => {
  selectedPosition.value = null
  showApplicationModal.value = true
}

const closeModal = () => {
  showApplicationModal.value = false
  resetForm()
}

const resetForm = () => {
  form.first_name = ''
  form.last_name = ''
  form.email = ''
  form.phone = ''
  form.resume_url = ''
  form.experience_years = ''
  form.cover_letter = ''
  form.source = ''
}

const submitApplication = async () => {
  submitting.value = true
  
  try {
    // Submit directly to the candidates table via API
    const response = await $fetch('/api/public/apply', {
      method: 'POST',
      body: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || null,
        resume_url: form.resume_url || null,
        experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        notes: form.cover_letter || null,
        source: form.source || 'website',
        target_position_id: selectedPosition.value?.id || null
      }
    })

    if ((response as any).success) {
      closeModal()
      showSuccess.value = true
    }
  } catch (err: any) {
    console.error('Error submitting application:', err)
    alert(err.data?.message || 'Failed to submit application. Please try again.')
  } finally {
    submitting.value = false
  }
}

const fetchPositions = async () => {
  loading.value = true
  try {
    const response = await $fetch('/api/public/positions')
    positions.value = (response as any).data || []
  } catch (err) {
    console.error('Error fetching positions:', err)
    positions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPositions()
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
