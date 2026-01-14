<template>
  <v-card class="time-clock" rounded="lg" elevation="2">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon color="primary">mdi-clock-outline</v-icon>
      Time Clock
    </v-card-title>
    
    <v-divider />

    <v-card-text class="text-center pa-6">
      <!-- Current Status Display -->
      <div class="status-display mb-4">
        <v-chip
          :color="isClockedIn ? 'success' : 'grey'"
          size="large"
          class="mb-2"
        >
          <v-icon start>{{ isClockedIn ? 'mdi-account-clock' : 'mdi-account-off' }}</v-icon>
          {{ isClockedIn ? 'On Clock' : 'Off Clock' }}
        </v-chip>
        
        <div class="text-h3 font-weight-bold my-4">
          {{ formattedWorkedTime }}
        </div>
        <p class="text-body-2 text-grey">Worked Today</p>
      </div>

      <!-- Clock In/Out Button -->
      <v-btn
        :color="isClockedIn ? 'error' : 'success'"
        size="x-large"
        class="clock-button mb-4"
        :loading="isPunching"
        @click="handlePunch"
      >
        <v-icon start size="28">
          {{ isClockedIn ? 'mdi-stop-circle' : 'mdi-play-circle' }}
        </v-icon>
        {{ isClockedIn ? 'Clock Out' : 'Clock In' }}
      </v-btn>

      <!-- Last Punch Info -->
      <div v-if="lastPunch" class="text-caption text-grey">
        Last {{ lastPunch.punch_type === 'in' ? 'clocked in' : 'clocked out' }}:
        {{ formatPunchTime(lastPunch.punched_at) }}
      </div>

      <!-- Location Status - always show -->
      <div class="location-status mt-4">
        <v-chip
          :color="locationStatus.color"
          size="small"
          variant="tonal"
        >
          <v-icon start size="14">{{ locationStatus.icon }}</v-icon>
          {{ locationStatus.text }}
        </v-chip>
      </div>
      
      <!-- Error Message -->
      <div v-if="punchError" class="text-caption text-error mt-2">
        {{ punchError }}
      </div>
    </v-card-text>

    <!-- Today's Punches Timeline -->
    <v-divider />
    
    <v-card-text v-if="punches.length > 0">
      <p class="text-overline text-grey mb-3">Today's Punches</p>
      
      <v-timeline density="compact" side="end">
        <v-timeline-item
          v-for="punch in punches"
          :key="punch.id"
          :dot-color="punch.punch_type === 'in' ? 'success' : 'error'"
          size="small"
        >
          <div class="d-flex justify-space-between align-center">
            <span class="font-weight-medium">
              {{ punch.punch_type === 'in' ? 'Clock In' : 'Clock Out' }}
            </span>
            <span class="text-caption text-grey">
              {{ formatPunchTime(punch.punched_at) }}
            </span>
          </div>
          
          <div v-if="punch.within_geofence === false" class="text-caption text-warning mt-1">
            <v-icon size="12" color="warning">mdi-alert</v-icon>
            {{ punch.violation_reason || 'Outside geofence' }}
          </div>
        </v-timeline-item>
      </v-timeline>
    </v-card-text>

    <v-card-text v-else class="text-center">
      <v-icon size="32" color="grey-lighten-1">mdi-clock-alert-outline</v-icon>
      <p class="text-body-2 text-grey mt-2">No punches recorded today</p>
    </v-card-text>

    <!-- Geofence Warning Dialog -->
    <v-dialog v-model="showGeofenceWarning" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-map-marker-alert</v-icon>
          Location Warning
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            {{ geofenceWarningMessage }}
          </v-alert>
          <p class="text-body-2">
            Your punch has been recorded, but please note that you are outside
            the expected work location. This has been logged for review.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showGeofenceWarning = false">
            I Understand
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Location Permission Dialog -->
    <v-dialog v-model="showLocationPrompt" max-width="400" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="primary">mdi-crosshairs-gps</v-icon>
          Location Required
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-4">
            {{ isGeoLocked ? 'Your account requires location verification to clock in/out.' : 'This app uses location to verify clock-in/out from the workplace.' }}
          </p>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-shield-check" title="Your privacy is protected">
              <v-list-item-subtitle>
                Location is only recorded at punch time
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-office-building-marker" title="Workplace verification">
              <v-list-item-subtitle>
                Ensures accurate attendance tracking
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="!isGeoLocked" variant="text" @click="skipLocation">
            Skip (Not Recommended)
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="requestLocation">
            Allow Location
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Geo-Lock Blocked Dialog -->
    <v-dialog v-model="showGeoLockBlocked" max-width="400">
      <v-card>
        <v-card-title class="d-flex align-center ga-2 text-error">
          <v-icon color="error">mdi-map-marker-off</v-icon>
          Location Restricted
        </v-card-title>
        <v-card-text>
          <v-alert type="error" variant="tonal" class="mb-4">
            You must be at an approved location to clock in/out.
          </v-alert>
          <p class="text-body-2 mb-3">
            Your account is geo-locked to specific work locations. You can only clock in/out from:
          </p>
          <v-list density="compact" class="bg-grey-lighten-4 rounded">
            <v-list-item v-for="loc in allowedLocations" :key="loc.id" prepend-icon="mdi-map-marker">
              <v-list-item-title>{{ loc.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ loc.address }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <p class="text-caption text-grey mt-3">
            If you believe this is an error, please contact your manager or HR.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showGeoLockBlocked = false">
            I Understand
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOperationsStore, type TimePunch } from '~/stores/operations'
import { useUserStore } from '~/stores/user'

interface AllowedLocation {
  id: string
  name: string
  address: string
}

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()
const client = useSupabaseClient()

// State
const isPunching = ref(false)
const showGeofenceWarning = ref(false)
const geofenceWarningMessage = ref('')
const showLocationPrompt = ref(false)
const showGeoLockBlocked = ref(false)
const currentLocation = ref<{ latitude: number; longitude: number; accuracy: number } | null>(null)
const locationEnabled = ref(false)
const locationError = ref<string | null>(null)
const workedTimeInterval = ref<ReturnType<typeof setInterval> | null>(null)
const displayedWorkedMinutes = ref(0)
const punchError = ref<string | null>(null)

// Geo-lock state
const isGeoLocked = ref(false)
const geoLockLocationIds = ref<string[]>([])
const allowedLocations = ref<AllowedLocation[]>([])

// Computed
const employeeId = computed(() => userStore.employee?.id)

const punches = computed(() => opsStore.todayPunches)

const lastPunch = computed(() => 
  punches.value.length > 0 ? punches.value[punches.value.length - 1] : null
)

const isClockedIn = computed(() => opsStore.currentPunchStatus === 'in')

const formattedWorkedTime = computed(() => {
  const minutes = displayedWorkedMinutes.value
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
})

const locationStatus = computed(() => {
  if (locationError.value) {
    return {
      color: 'warning',
      icon: 'mdi-map-marker-off',
      text: locationError.value
    }
  }
  if (currentLocation.value) {
    // Location verified means we have coordinates
    return {
      color: 'success',
      icon: 'mdi-map-marker-check',
      text: `Location verified (±${Math.round(currentLocation.value.accuracy)}m)`
    }
  }
  return {
    color: 'grey',
    icon: 'mdi-map-marker-question',
    text: 'Getting location...'
  }
})

// Methods
function formatPunchTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

async function handlePunch() {
  punchError.value = null
  
  if (!employeeId.value) {
    punchError.value = 'No employee record found. Please contact admin.'
    console.error('No employee ID found')
    return
  }

  // For geo-locked employees, location is mandatory
  if (isGeoLocked.value && !currentLocation.value) {
    showLocationPrompt.value = true
    return
  }

  // For geo-locked employees, verify they're at an allowed location
  if (isGeoLocked.value && currentLocation.value) {
    const isAtAllowedLocation = await checkGeoLockLocation()
    if (!isAtAllowedLocation) {
      showGeoLockBlocked.value = true
      return
    }
  }

  // Check if we need location and don't have it (non geo-locked)
  if (!isGeoLocked.value && opsStore.activeGeofences.length > 0 && !currentLocation.value && !locationError.value) {
    showLocationPrompt.value = true
    return
  }

  isPunching.value = true

  try {
    let result
    if (isClockedIn.value) {
      result = await opsStore.clockOut(employeeId.value, currentLocation.value || undefined)
    } else {
      result = await opsStore.clockIn(employeeId.value, currentLocation.value || undefined)
    }

    // Show geofence warning if applicable (for non-geo-locked employees)
    if (result.geofenceWarning && !isGeoLocked.value) {
      geofenceWarningMessage.value = result.geofenceWarning
      showGeofenceWarning.value = true
    }
    
    // Success - clear any previous error
    punchError.value = null
  } catch (err: any) {
    console.error('Punch failed:', err)
    punchError.value = err?.message || 'Failed to record punch. Please try again.'
  } finally {
    isPunching.value = false
  }
}

// Check if geo-locked employee is at an allowed location
async function checkGeoLockLocation(): Promise<boolean> {
  if (!currentLocation.value || geoLockLocationIds.value.length === 0) {
    return false
  }

  // Get geofences for allowed locations
  const allowedGeofences = opsStore.geofences.filter(g => 
    g.location_id && geoLockLocationIds.value.includes(g.location_id)
  )

  if (allowedGeofences.length === 0) {
    // No geofences defined for allowed locations - allow punch but log warning
    console.warn('No geofences defined for geo-locked employee locations')
    return true
  }

  // Check if current location is within any allowed geofence
  for (const fence of allowedGeofences) {
    if (fence.latitude && fence.longitude) {
      const distance = haversineDistance(
        currentLocation.value.latitude,
        currentLocation.value.longitude,
        fence.latitude,
        fence.longitude
      )
      
      if (distance <= (fence.radius_meters || 100)) {
        return true
      }
    }
  }

  return false
}

// Haversine distance calculation
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

async function requestLocation() {
  showLocationPrompt.value = false
  
  try {
    if (!navigator.geolocation) {
      locationError.value = 'Geolocation not supported'
      return
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      })
    })

    currentLocation.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    }
    locationEnabled.value = true
    
    // Proceed with punch
    await handlePunch()
  } catch (err) {
    console.error('Location error:', err)
    if (err instanceof GeolocationPositionError) {
      switch (err.code) {
        case err.PERMISSION_DENIED:
          locationError.value = 'Location permission denied'
          break
        case err.POSITION_UNAVAILABLE:
          locationError.value = 'Location unavailable'
          break
        case err.TIMEOUT:
          locationError.value = 'Location timeout'
          break
      }
    }
    locationEnabled.value = false
  }
}

function skipLocation() {
  showLocationPrompt.value = false
  locationEnabled.value = false
  handlePunch()
}

function updateWorkedTime() {
  opsStore.calculateWorkedMinutes()
  displayedWorkedMinutes.value = opsStore.todayWorkedMinutes
}

// Fetch employee geo-lock settings
async function fetchGeoLockSettings() {
  if (!employeeId.value) return

  try {
    const { data, error } = await client
      .from('employees')
      .select('geo_lock_enabled, geo_lock_location_ids')
      .eq('id', employeeId.value)
      .single()

    if (error) throw error

    isGeoLocked.value = data?.geo_lock_enabled || false
    geoLockLocationIds.value = data?.geo_lock_location_ids || []

    // Fetch allowed location details for display
    if (isGeoLocked.value && geoLockLocationIds.value.length > 0) {
      const { data: locations } = await client
        .from('locations')
        .select('id, name, address_line1, city, state')
        .in('id', geoLockLocationIds.value)

      allowedLocations.value = (locations || []).map(loc => ({
        id: loc.id,
        name: loc.name,
        address: [loc.address_line1, loc.city, loc.state].filter(Boolean).join(', ')
      }))
    }
  } catch (err) {
    console.error('Error fetching geo-lock settings:', err)
  }
}

// Lifecycle
onMounted(async () => {
  if (employeeId.value) {
    await Promise.all([
      opsStore.fetchTodayPunches(employeeId.value),
      opsStore.fetchGeofences(),
      fetchGeoLockSettings()
    ])
    displayedWorkedMinutes.value = opsStore.todayWorkedMinutes
  }

  // Try to get location silently
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLocation.value = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }
        locationEnabled.value = true
      },
      () => {
        // Silent fail - will prompt when needed
        locationEnabled.value = false
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    )
  }

  // Update worked time every minute
  workedTimeInterval.value = setInterval(updateWorkedTime, 60000)
})

onUnmounted(() => {
  if (workedTimeInterval.value) {
    clearInterval(workedTimeInterval.value)
  }
})
</script>

<style scoped>
.time-clock {
  max-width: 400px;
}

.status-display {
  padding: 16px;
}

.clock-button {
  min-width: 200px;
  height: 64px !important;
  font-size: 1.2rem;
  border-radius: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}

.clock-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.clock-button:active {
  transform: translateY(0);
}

.location-status {
  padding: 8px;
}
</style>
