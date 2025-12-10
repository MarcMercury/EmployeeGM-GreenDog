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

      <!-- Location Status -->
      <div class="location-status mt-4" v-if="locationEnabled">
        <v-chip
          :color="locationStatus.color"
          size="small"
          variant="tonal"
        >
          <v-icon start size="14">{{ locationStatus.icon }}</v-icon>
          {{ locationStatus.text }}
        </v-chip>
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
            This app requires your location to verify clock-in/out from the workplace.
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
          <v-btn variant="text" @click="skipLocation">
            Skip (Not Recommended)
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="requestLocation">
            Allow Location
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

// Stores
const opsStore = useOperationsStore()
const userStore = useUserStore()

// State
const isPunching = ref(false)
const showGeofenceWarning = ref(false)
const geofenceWarningMessage = ref('')
const showLocationPrompt = ref(false)
const currentLocation = ref<{ latitude: number; longitude: number; accuracy: number } | null>(null)
const locationEnabled = ref(false)
const locationError = ref<string | null>(null)
const workedTimeInterval = ref<ReturnType<typeof setInterval> | null>(null)
const displayedWorkedMinutes = ref(0)

// Computed
const employeeId = computed(() => userStore.currentEmployee?.id)

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
      color: 'error',
      icon: 'mdi-map-marker-off',
      text: 'Location unavailable'
    }
  }
  if (currentLocation.value) {
    return {
      color: 'success',
      icon: 'mdi-map-marker-check',
      text: 'Location verified'
    }
  }
  return {
    color: 'grey',
    icon: 'mdi-map-marker-question',
    text: 'Location pending'
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
  if (!employeeId.value) {
    console.error('No employee ID found')
    return
  }

  // Check if we need location and don't have it
  if (opsStore.activeGeofences.length > 0 && !currentLocation.value && !locationError.value) {
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

    // Show geofence warning if applicable
    if (result.geofenceWarning) {
      geofenceWarningMessage.value = result.geofenceWarning
      showGeofenceWarning.value = true
    }
  } catch (err) {
    console.error('Punch failed:', err)
  } finally {
    isPunching.value = false
  }
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

// Lifecycle
onMounted(async () => {
  if (employeeId.value) {
    await Promise.all([
      opsStore.fetchTodayPunches(employeeId.value),
      opsStore.fetchGeofences()
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
