<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const supabase = useSupabaseClient()
const router = useRouter()

// Wizard step
const currentStep = ref(1)
const totalSteps = 5
const saving = ref(false)

// Form data based on RACE application structure
const formData = ref({
  // Step 1: Event Information
  title: '',
  description: '',
  event_date_start: '',
  event_date_end: '',
  location_name: 'GreenDog Dental Veterinary Center',
  location_address: '14661 Aetna St, Van Nuys, CA',
  format: 'live',
  
  // Step 2: Provider Information
  provider_name: 'GreenDog Dental Veterinary Center',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  organization_type: 'Private Veterinary Clinic',
  website: 'www.greendogdental.com',
  race_provider_status: 'not_submitted',
  race_provider_number: '',
  vmb_approval_status: 'not_submitted',
  
  // Step 3: Course Content
  ce_hours_offered: 8,
  ce_hours_lecture: 4,
  ce_hours_lab: 4,
  learning_objectives: [''],
  instructional_methods: ['lecture'],
  has_exam: false,
  has_quiz: false,
  provides_certificate: true,
  attendance_tracking_method: 'sign_in_sheet',
  course_outline: [
    { time: '9:00 AM - 10:30 AM', title: '', description: '' }
  ],
  
  // Step 4: Speaker Information
  speaker_name: '',
  speaker_credentials: '',
  speaker_biography: '',
  speaker_cv_url: '',
  speaker_travel_confirmed: false,
  speaker_lodging_confirmed: false,
  speaker_honorarium: null as number | null,
  additional_speakers: [] as { name: string; credentials: string }[],
  
  // Step 5: Logistics
  max_attendees: 20,
  registration_url: '',
  registration_fee: 0,
  sponsors: [] as { name: string; contribution: string }[]
})

const formatOptions = [
  { title: 'Live (In-person)', value: 'live' },
  { title: 'Webinar (Online)', value: 'webinar' },
  { title: 'Hybrid', value: 'hybrid' },
  { title: 'Recorded', value: 'recorded' }
]

const raceStatusOptions = [
  { title: 'Not Submitted', value: 'not_submitted' },
  { title: 'Pending', value: 'pending' },
  { title: 'Approved', value: 'approved' },
  { title: 'Denied', value: 'denied' },
  { title: 'Not Required', value: 'not_required' }
]

const instructionalMethods = [
  { title: 'Lecture Presentations', value: 'lecture' },
  { title: 'Hands-on Lab', value: 'lab' },
  { title: 'Interactive Case Discussions', value: 'case_discussion' },
  { title: 'Q&A Sessions', value: 'q_and_a' },
  { title: 'Demonstrations', value: 'demonstration' },
  { title: 'Group Learning', value: 'group_learning' }
]

const attendanceTrackingOptions = [
  { title: 'Sign-in Sheet', value: 'sign_in_sheet' },
  { title: 'Online Registration Check-in', value: 'online_tracking' },
  { title: 'QR Code Scan', value: 'qr_code' },
  { title: 'Badge Scan', value: 'badge_scan' }
]

// Objective management
function addObjective() {
  formData.value.learning_objectives.push('')
}

function removeObjective(index: number) {
  formData.value.learning_objectives.splice(index, 1)
}

// Outline management
function addOutlineItem() {
  formData.value.course_outline.push({ time: '', title: '', description: '' })
}

function removeOutlineItem(index: number) {
  formData.value.course_outline.splice(index, 1)
}

// Speaker management
function addSpeaker() {
  formData.value.additional_speakers.push({ name: '', credentials: '' })
}

function removeSpeaker(index: number) {
  formData.value.additional_speakers.splice(index, 1)
}

// Sponsor management
function addSponsor() {
  formData.value.sponsors.push({ name: '', contribution: '' })
}

function removeSponsor(index: number) {
  formData.value.sponsors.splice(index, 1)
}

// Navigation
function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
    window.scrollTo(0, 0)
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
    window.scrollTo(0, 0)
  }
}

// Check if marketing_events table exists and create dual-write
async function createMarketingEvent(ceEventId: string) {
  try {
    // Check if marketing_events table exists
    const { data: tables } = await supabase
      .from('marketing_events')
      .select('id')
      .limit(1)
    
    if (tables !== null) {
      // Create linked marketing event
      await supabase
        .from('marketing_events')
        .insert({
          title: `[CE] ${formData.value.title}`,
          description: formData.value.description,
          event_date: formData.value.event_date_start,
          event_type: 'ce_event',
          location: formData.value.location_name,
          notes: `CE Event - ${formData.value.ce_hours_offered} CE Hours. Speaker: ${formData.value.speaker_name}`,
          ce_event_id: ceEventId
        })
    }
  } catch (e) {
    // Marketing events table may not exist, skip silently
    console.log('Marketing events dual-write skipped:', e)
  }
}

// Save event
async function saveEvent() {
  saving.value = true
  
  try {
    // Filter out empty objectives
    const objectives = formData.value.learning_objectives.filter(o => o.trim())
    
    // Filter out empty outline items
    const outline = formData.value.course_outline.filter(o => o.title.trim())
    
    const payload = {
      title: formData.value.title,
      description: formData.value.description || null,
      event_date_start: formData.value.event_date_start,
      event_date_end: formData.value.event_date_end || formData.value.event_date_start,
      location_name: formData.value.location_name || null,
      location_address: formData.value.location_address || null,
      format: formData.value.format,
      status: 'draft',
      
      provider_name: formData.value.provider_name,
      contact_person: formData.value.contact_person || null,
      contact_email: formData.value.contact_email || null,
      contact_phone: formData.value.contact_phone || null,
      organization_type: formData.value.organization_type || null,
      website: formData.value.website || null,
      race_provider_status: formData.value.race_provider_status,
      race_provider_number: formData.value.race_provider_number || null,
      vmb_approval_status: formData.value.vmb_approval_status,
      
      ce_hours_offered: formData.value.ce_hours_offered,
      ce_hours_lecture: formData.value.ce_hours_lecture || null,
      ce_hours_lab: formData.value.ce_hours_lab || null,
      learning_objectives: objectives.length ? objectives : null,
      instructional_methods: formData.value.instructional_methods,
      course_outline: outline.length ? outline : null,
      has_exam: formData.value.has_exam,
      has_quiz: formData.value.has_quiz,
      provides_certificate: formData.value.provides_certificate,
      attendance_tracking_method: formData.value.attendance_tracking_method,
      
      speaker_name: formData.value.speaker_name || null,
      speaker_credentials: formData.value.speaker_credentials || null,
      speaker_biography: formData.value.speaker_biography || null,
      speaker_cv_url: formData.value.speaker_cv_url || null,
      speaker_travel_confirmed: formData.value.speaker_travel_confirmed,
      speaker_lodging_confirmed: formData.value.speaker_lodging_confirmed,
      speaker_honorarium: formData.value.speaker_honorarium,
      additional_speakers: formData.value.additional_speakers.filter(s => s.name.trim()),
      
      max_attendees: formData.value.max_attendees || null,
      registration_url: formData.value.registration_url || null,
      registration_fee: formData.value.registration_fee,
      sponsors: formData.value.sponsors.filter(s => s.name.trim())
    }
    
    const { data, error } = await supabase
      .from('ce_events')
      .insert(payload)
      .select()
      .single()
    
    if (error) throw error
    
    // Checklist is auto-generated by database trigger!
    
    // Try dual-write to marketing calendar
    await createMarketingEvent(data.id)
    
    // Navigate to the event detail page
    router.push(`/gdu/events/${data.id}`)
  } catch (e) {
    console.error('Error saving event:', e)
    alert('Error saving event. Please try again.')
  } finally {
    saving.value = false
  }
}

// Step validation
const stepValid = computed(() => ({
  1: formData.value.title.trim() !== '' && formData.value.event_date_start !== '',
  2: true, // Provider info is optional
  3: formData.value.ce_hours_offered > 0,
  4: true, // Speaker info is optional
  5: true  // Logistics are optional
}))

const canProceed = computed(() => stepValid.value[currentStep.value as keyof typeof stepValid.value])
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <v-btn icon variant="text" to="/gdu/events" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Create CE Event</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Step {{ currentStep }} of {{ totalSteps }}: 
          {{ ['Event Information', 'Provider Information', 'Course Content', 'Speaker Information', 'Logistics & Review'][currentStep - 1] }}
        </p>
      </div>
    </div>

    <!-- Progress Stepper -->
    <v-stepper
      v-model="currentStep"
      alt-labels
      flat
      class="mb-6"
      style="background: transparent;"
    >
      <v-stepper-header>
        <v-stepper-item
          :complete="currentStep > 1"
          :value="1"
          title="Event Info"
          icon="mdi-calendar"
        />
        <v-divider />
        <v-stepper-item
          :complete="currentStep > 2"
          :value="2"
          title="Provider"
          icon="mdi-domain"
        />
        <v-divider />
        <v-stepper-item
          :complete="currentStep > 3"
          :value="3"
          title="Course Content"
          icon="mdi-book-open"
        />
        <v-divider />
        <v-stepper-item
          :complete="currentStep > 4"
          :value="4"
          title="Speaker"
          icon="mdi-account-tie"
        />
        <v-divider />
        <v-stepper-item
          :value="5"
          title="Logistics"
          icon="mdi-clipboard-check"
        />
      </v-stepper-header>
    </v-stepper>

    <!-- Step Content -->
    <v-card>
      <v-card-text class="pa-6">
        <!-- Step 1: Event Information -->
        <div v-if="currentStep === 1">
          <h3 class="text-h6 mb-4">Event Details</h3>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="formData.title"
                label="Event Title *"
                variant="outlined"
                placeholder="e.g., Advancements in Veterinary Dentistry: A Hands-on Workshop"
                required
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Event Description"
                variant="outlined"
                rows="3"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.event_date_start"
                label="Start Date *"
                variant="outlined"
                type="date"
                required
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.event_date_end"
                label="End Date"
                variant="outlined"
                type="date"
                hint="Leave blank for single-day events"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.location_name"
                label="Location Name"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.location_address"
                label="Location Address"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.format"
                :items="formatOptions"
                label="Event Format *"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Step 2: Provider Information -->
        <div v-if="currentStep === 2">
          <h3 class="text-h6 mb-4">Provider Information</h3>
          <v-alert type="info" variant="tonal" class="mb-4">
            To offer CE credits in California, your event must be approved by RACE (AAVSB) or the California Veterinary Medical Board.
          </v-alert>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.provider_name"
                label="Clinic/Provider Name"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.organization_type"
                label="Organization Type"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_person"
                label="Contact Person"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_email"
                label="Contact Email"
                variant="outlined"
                type="email"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.contact_phone"
                label="Contact Phone"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.website"
                label="Website"
                variant="outlined"
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-4" />
              <h4 class="text-subtitle-1 mb-3">CE Approval Status</h4>
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.race_provider_status"
                :items="raceStatusOptions"
                label="RACE Provider Status"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.race_provider_number"
                label="RACE Provider/Course Number"
                variant="outlined"
                :disabled="formData.race_provider_status !== 'approved'"
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.vmb_approval_status"
                :items="raceStatusOptions"
                label="California VMB Status"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Step 3: Course Content -->
        <div v-if="currentStep === 3">
          <h3 class="text-h6 mb-4">Course Content & Structure</h3>
          
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.ce_hours_offered"
                label="Total CE Hours *"
                variant="outlined"
                type="number"
                min="1"
                hint="1 CE credit = 1 contact hour (50-60 min)"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.ce_hours_lecture"
                label="Lecture Hours"
                variant="outlined"
                type="number"
                min="0"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.ce_hours_lab"
                label="Lab/Hands-on Hours"
                variant="outlined"
                type="number"
                min="0"
              />
            </v-col>
            
            <v-col cols="12">
              <v-select
                v-model="formData.instructional_methods"
                :items="instructionalMethods"
                label="Instructional Methods"
                variant="outlined"
                multiple
                chips
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="d-flex align-center mb-3">
                <h4 class="text-subtitle-1">Learning Objectives</h4>
                <v-spacer />
                <v-btn size="small" variant="text" @click="addObjective">
                  <v-icon start>mdi-plus</v-icon> Add Objective
                </v-btn>
              </div>
              <div v-for="(obj, index) in formData.learning_objectives" :key="index" class="d-flex gap-2 mb-2">
                <v-text-field
                  v-model="formData.learning_objectives[index]"
                  :label="`Objective ${index + 1}`"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
                <v-btn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeObjective(index)"
                  :disabled="formData.learning_objectives.length === 1"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <div class="d-flex align-center mb-3">
                <h4 class="text-subtitle-1">Course Outline / Agenda</h4>
                <v-spacer />
                <v-btn size="small" variant="text" @click="addOutlineItem">
                  <v-icon start>mdi-plus</v-icon> Add Session
                </v-btn>
              </div>
              <v-card v-for="(item, index) in formData.course_outline" :key="index" variant="outlined" class="mb-2 pa-3">
                <v-row dense>
                  <v-col cols="12" md="3">
                    <v-text-field
                      v-model="item.time"
                      label="Time"
                      variant="outlined"
                      density="compact"
                      placeholder="9:00 AM - 10:30 AM"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="item.title"
                      label="Session Title"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="item.description"
                      label="Description"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-center">
                    <v-btn
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      @click="removeOutlineItem(index)"
                      :disabled="formData.course_outline.length === 1"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-2" />
              <h4 class="text-subtitle-1 mb-3">Assessment & Documentation</h4>
            </v-col>
            
            <v-col cols="6" md="3">
              <v-checkbox v-model="formData.has_exam" label="Exam Required" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-checkbox v-model="formData.has_quiz" label="Quiz Included" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-checkbox v-model="formData.provides_certificate" label="Certificate Provided" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.attendance_tracking_method"
                :items="attendanceTrackingOptions"
                label="Attendance Tracking Method"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Step 4: Speaker Information -->
        <div v-if="currentStep === 4">
          <h3 class="text-h6 mb-4">Speaker Information</h3>
          <v-alert type="info" variant="tonal" class="mb-4">
            Speakers must be qualified professionals: licensed DVMs, board-certified specialists, or recognized veterinary educators.
          </v-alert>
          
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.speaker_name"
                label="Primary Speaker Name"
                variant="outlined"
                placeholder="e.g., Dr. Loïc Legendre, DVM, AVDC, EVDC"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.speaker_credentials"
                label="Credentials"
                variant="outlined"
                placeholder="e.g., Diplomate AVDC, Diplomate EVDC"
              />
            </v-col>
            
            <v-col cols="12">
              <v-textarea
                v-model="formData.speaker_biography"
                label="Speaker Biography"
                variant="outlined"
                rows="4"
                placeholder="Brief professional biography..."
              />
            </v-col>
            
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.speaker_cv_url"
                label="CV/Resume URL"
                variant="outlined"
                placeholder="Link to speaker CV"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.speaker_honorarium"
                label="Speaker Honorarium ($)"
                variant="outlined"
                type="number"
                prefix="$"
              />
            </v-col>
            
            <v-col cols="6" md="3">
              <v-checkbox v-model="formData.speaker_travel_confirmed" label="Travel Confirmed" hide-details />
            </v-col>
            <v-col cols="6" md="3">
              <v-checkbox v-model="formData.speaker_lodging_confirmed" label="Lodging Confirmed" hide-details />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-4" />
              <div class="d-flex align-center mb-3">
                <h4 class="text-subtitle-1">Additional Speakers</h4>
                <v-spacer />
                <v-btn size="small" variant="text" @click="addSpeaker">
                  <v-icon start>mdi-plus</v-icon> Add Speaker
                </v-btn>
              </div>
              <v-card v-for="(speaker, index) in formData.additional_speakers" :key="index" variant="outlined" class="mb-2 pa-3">
                <v-row dense>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="speaker.name"
                      label="Name"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="speaker.credentials"
                      label="Credentials"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="2" class="d-flex align-center justify-center">
                    <v-btn icon variant="text" size="small" color="error" @click="removeSpeaker(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Step 5: Logistics & Review -->
        <div v-if="currentStep === 5">
          <h3 class="text-h6 mb-4">Logistics & Registration</h3>
          
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.max_attendees"
                label="Maximum Attendees"
                variant="outlined"
                type="number"
                min="1"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.registration_fee"
                label="Registration Fee"
                variant="outlined"
                type="number"
                prefix="$"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.registration_url"
                label="Registration URL"
                variant="outlined"
                placeholder="Eventbrite, Google Form, etc."
              />
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-4" />
              <div class="d-flex align-center mb-3">
                <h4 class="text-subtitle-1">Sponsors</h4>
                <v-spacer />
                <v-btn size="small" variant="text" @click="addSponsor">
                  <v-icon start>mdi-plus</v-icon> Add Sponsor
                </v-btn>
              </div>
              <v-card v-for="(sponsor, index) in formData.sponsors" :key="index" variant="outlined" class="mb-2 pa-3">
                <v-row dense>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="sponsor.name"
                      label="Sponsor Name"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="sponsor.contribution"
                      label="Contribution"
                      variant="outlined"
                      density="compact"
                      hide-details
                      placeholder="e.g., $500, Food sponsor"
                    />
                  </v-col>
                  <v-col cols="12" md="2" class="d-flex align-center justify-center">
                    <v-btn icon variant="text" size="small" color="error" @click="removeSponsor(index)">
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </v-col>
            
            <v-col cols="12">
              <v-divider class="my-4" />
              <h4 class="text-subtitle-1 mb-3">Event Summary</h4>
              <v-alert type="success" variant="tonal">
                <div class="font-weight-bold mb-2">{{ formData.title || 'Untitled Event' }}</div>
                <div class="text-body-2">
                  📅 {{ formData.event_date_start ? new Date(formData.event_date_start).toLocaleDateString() : 'No date set' }}
                  {{ formData.event_date_end && formData.event_date_end !== formData.event_date_start ? ` - ${new Date(formData.event_date_end).toLocaleDateString()}` : '' }}
                </div>
                <div class="text-body-2">📍 {{ formData.location_name || 'No location' }}</div>
                <div class="text-body-2">🎓 {{ formData.ce_hours_offered }} CE Hours</div>
                <div class="text-body-2" v-if="formData.speaker_name">🎤 {{ formData.speaker_name }}</div>
                <div class="text-body-2">👥 Max {{ formData.max_attendees }} attendees</div>
                <div class="mt-2 text-caption">
                  ✅ Upon saving, a comprehensive operations checklist will be auto-generated based on the GDU CE Event Checklist.
                </div>
              </v-alert>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      
      <v-divider />
      
      <v-card-actions class="pa-4">
        <v-btn
          v-if="currentStep > 1"
          variant="outlined"
          @click="prevStep"
        >
          <v-icon start>mdi-arrow-left</v-icon>
          Previous
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="currentStep < totalSteps"
          color="primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Next
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
        <v-btn
          v-else
          color="success"
          :loading="saving"
          :disabled="!stepValid[1]"
          @click="saveEvent"
        >
          <v-icon start>mdi-check</v-icon>
          Create Event
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>
