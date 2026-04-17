/**
 * EventsMapView Component
 * =========================
 * Interactive map showing all marketing events with:
 * - Event markers with type-based colors
 * - Click to view event details
 * - Drive time from clinics
 * - Filter by upcoming/past
 */
<script setup lang="ts">
import type { MarketingEvent } from '~/types/marketing.types'
import type { MapMarker } from '~/components/shared/GoogleMap.vue'

const props = defineProps<{
  events: MarketingEvent[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'event-click', event: MarketingEvent): void
}>()

const { geocode, getDistance, loading: geocoding, error: geocodeError } = useGoogleMaps()

// Clinic locations for distance calculations
const clinics = [
  { id: 'venice', name: 'Venice', address: '210 Main Street, Venice, CA 90291', lat: 33.9925, lng: -118.4695 },
  { id: 'sherman_oaks', name: 'Sherman Oaks', address: '13907 Ventura Blvd, Sherman Oaks, CA 91423', lat: 34.1536, lng: -118.4426 },
  { id: 'van_nuys', name: 'Van Nuys', address: '14661 Aetna St, Van Nuys, CA 91411', lat: 34.1948, lng: -118.4258 }
]

// Cache geocoded event locations
const geocodedEvents = ref<Map<string, { lat: number; lng: number }>>(new Map())
const selectedEvent = ref<MarketingEvent | null>(null)
const selectedEventDistances = ref<Array<{ clinic: string; distance: string; duration: string }>>([])
const loadingDistances = ref(false)
const showDirectionsDialog = ref(false)
const directionsRoute = ref<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number } } | null>(null)

// Filter state
const showUpcomingOnly = ref(false)
const showClinics = ref(true)

// Compute markers from events
const eventMarkers = computed<MapMarker[]>(() => {
  const markers: MapMarker[] = []

  // Add clinic markers
  if (showClinics.value) {
    clinics.forEach(clinic => {
      markers.push({
        id: `clinic-${clinic.id}`,
        lat: clinic.lat,
        lng: clinic.lng,
        title: `${clinic.name} Clinic`,
        color: '#2196F3',
        info: clinic.address
      })
    })
  }

  // Add event markers
  const filteredEvents = showUpcomingOnly.value
    ? props.events.filter(e => new Date(e.event_date) >= new Date())
    : props.events

  filteredEvents.forEach(event => {
    const cached = geocodedEvents.value.get(event.id)
    if (cached) {
      markers.push({
        id: event.id,
        lat: cached.lat,
        lng: cached.lng,
        title: event.name,
        color: getEventColor(event.event_type),
        info: `${formatDate(event.event_date)} • ${event.location || 'TBD'}`
      })
    }
  })

  return markers
})

// Color coding by event type
function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    general: '#9E9E9E',
    ce_event: '#9C27B0',
    street_fair: '#FF9800',
    open_house: '#2196F3',
    adoption_event: '#E91E63',
    community_outreach: '#009688',
    health_fair: '#4CAF50',
    school_visit: '#00BCD4',
    pet_expo: '#FFC107',
    fundraiser: '#F44336',
    other: '#607D8B'
  }
  return colors[type] || '#9E9E9E'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'TBD'
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Geocode event locations
async function geocodeEventLocations() {
  for (const event of props.events) {
    if (!event.location || geocodedEvents.value.has(event.id)) continue

    try {
      const result = await geocode(event.location)
      if (result) {
        geocodedEvents.value.set(event.id, { lat: result.lat, lng: result.lng })
      }
    } catch (e) {
      console.warn(`Could not geocode: ${event.location}`)
    }
  }
}

// Handle marker click
async function handleMarkerClick(marker: MapMarker) {
  // Check if it's an event marker (not a clinic)
  if (marker.id.startsWith('clinic-')) {
    return
  }

  const event = props.events.find(e => e.id === marker.id)
  if (!event) return

  selectedEvent.value = event
  emit('event-click', event)

  // Calculate distances from all clinics
  if (event.location) {
    loadingDistances.value = true
    selectedEventDistances.value = []

    for (const clinic of clinics) {
      const result = await getDistance(clinic.address, event.location)
      if (result) {
        selectedEventDistances.value.push({
          clinic: clinic.name,
          distance: result.distance.text,
          duration: result.duration.text
        })
      }
    }
    loadingDistances.value = false
  }
}

// Get directions to event
function showDirections(clinicId: string) {
  if (!selectedEvent.value) return

  const clinic = clinics.find(c => c.id === clinicId)
  const eventCoords = geocodedEvents.value.get(selectedEvent.value.id)
  
  if (clinic && eventCoords) {
    directionsRoute.value = {
      origin: { lat: clinic.lat, lng: clinic.lng },
      destination: eventCoords
    }
    showDirectionsDialog.value = true
  }
}

// Open in Google Maps
function openInGoogleMaps() {
  if (!selectedEvent.value?.location) return
  const encoded = encodeURIComponent(selectedEvent.value.location)
  window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
}

// Watch for new events and geocode them
watch(() => props.events, () => {
  geocodeEventLocations()
}, { immediate: true })

onMounted(() => {
  geocodeEventLocations()
})
</script>

<template>
  <div class="events-map-view">
    <!-- Map Controls -->
    <v-card class="mb-3" variant="outlined">
      <v-card-text class="py-2">
        <v-row align="center" dense>
          <v-col cols="auto">
            <v-switch
              v-model="showUpcomingOnly"
              label="Upcoming only"
              density="compact"
              hide-details
              color="warning"
            />
          </v-col>
          <v-col cols="auto">
            <v-switch
              v-model="showClinics"
              label="Show clinics"
              density="compact"
              hide-details
              color="primary"
            />
          </v-col>
          <v-col cols="auto">
            <v-chip size="small" color="primary" variant="tonal">
              <v-icon start size="14">mdi-map-marker</v-icon>
              {{ eventMarkers.length - (showClinics ? 3 : 0) }} events mapped
            </v-chip>
          </v-col>
          <v-spacer />
          <v-col cols="auto">
            <!-- Legend -->
            <div class="d-flex align-center gap-3 text-caption">
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #2196F3" />
                Clinic
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #4CAF50" />
                Health Fair
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #FF9800" />
                Street Fair
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #E91E63" />
                Adoption
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Map Display -->
    <v-row>
      <v-col :cols="selectedEvent ? 8 : 12">
        <SharedGoogleMap
          :markers="eventMarkers"
          :center="{ lat: 34.1, lng: -118.4 }"
          :zoom="10"
          height="500px"
          :route="directionsRoute"
          @marker-click="handleMarkerClick"
        />
      </v-col>

      <!-- Event Details Panel -->
      <v-col v-if="selectedEvent" cols="4">
        <v-card variant="outlined" class="event-details-panel">
          <v-card-title class="d-flex align-center">
            <v-icon color="primary" class="mr-2">mdi-calendar-star</v-icon>
            {{ selectedEvent.name }}
            <v-spacer />
            <v-btn icon size="small" variant="text" @click="selectedEvent = null">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon color="grey">mdi-calendar</v-icon>
                </template>
                <v-list-item-title>{{ formatDate(selectedEvent.event_date) }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ selectedEvent.start_time || 'Time TBD' }} - {{ selectedEvent.end_time || '' }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon color="grey">mdi-map-marker</v-icon>
                </template>
                <v-list-item-title>{{ selectedEvent.location || 'Location TBD' }}</v-list-item-title>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon color="grey">mdi-tag</v-icon>
                </template>
                <v-list-item-title>
                  <v-chip size="small" :color="getEventColor(selectedEvent.event_type)" variant="flat" class="text-white">
                    {{ selectedEvent.event_type?.replace(/_/g, ' ') || 'General' }}
                  </v-chip>
                </v-list-item-title>
              </v-list-item>

              <v-list-item v-if="selectedEvent.expected_attendance">
                <template #prepend>
                  <v-icon color="grey">mdi-account-group</v-icon>
                </template>
                <v-list-item-title>{{ selectedEvent.expected_attendance }} expected</v-list-item-title>
              </v-list-item>
            </v-list>

            <!-- Drive Times from Clinics -->
            <v-divider class="my-3" />
            <p class="text-subtitle-2 mb-2">
              <v-icon size="16" class="mr-1">mdi-car</v-icon>
              Drive Time from Clinics
            </p>

            <v-skeleton-loader v-if="loadingDistances" type="list-item@3" />

            <v-list v-else density="compact" class="bg-grey-lighten-5 rounded">
              <v-list-item 
                v-for="dist in selectedEventDistances" 
                :key="dist.clinic"
                class="px-2"
              >
                <template #prepend>
                  <v-avatar color="primary" size="28">
                    <span class="text-caption text-white">{{ dist.clinic[0] }}</span>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">{{ dist.clinic }}</v-list-item-title>
                <v-list-item-subtitle>{{ dist.distance }} • {{ dist.duration }}</v-list-item-subtitle>
                <template #append>
                  <v-btn 
                    icon 
                    size="x-small" 
                    variant="text" 
                    color="primary"
                    @click="showDirections(clinics.find(c => c.name === dist.clinic)?.id || '')"
                  >
                    <v-icon size="16">mdi-directions</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <!-- Actions -->
            <div class="mt-4 d-flex gap-2">
              <v-btn 
                color="primary" 
                variant="flat" 
                size="small" 
                prepend-icon="mdi-google-maps"
                @click="openInGoogleMaps"
              >
                Open in Maps
              </v-btn>
              <v-btn 
                variant="outlined" 
                size="small" 
                prepend-icon="mdi-eye"
                @click="$emit('event-click', selectedEvent)"
              >
                View Details
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Directions Dialog -->
    <v-dialog v-model="showDirectionsDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-directions</v-icon>
          Directions to {{ selectedEvent?.name }}
          <v-spacer />
          <v-btn icon variant="text" @click="showDirectionsDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <SharedGoogleMap
            v-if="directionsRoute"
            :route="directionsRoute"
            height="400px"
            :show-directions-panel="true"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.event-details-panel {
  height: 500px;
  overflow-y: auto;
}
</style>
