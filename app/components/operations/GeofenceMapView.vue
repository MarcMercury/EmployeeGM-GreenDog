/**
 * GeofenceMapView Component
 * ===========================
 * Shows geofence boundaries on a map with current employee location.
 * Used for time clock visualization to help employees understand geofence areas.
 */
<script setup lang="ts">
import type { Geofence } from '~/types/operations.types'
import type { MapMarker, MapGeofence } from '~/components/shared/GoogleMap.vue'

const props = defineProps<{
  geofences: Geofence[]
  currentLocation?: { latitude: number; longitude: number; accuracy: number } | null
  employeeLocationId?: string | null
}>()

// Convert geofences to map format
const mapGeofences = computed<MapGeofence[]>(() => {
  return props.geofences
    .filter(g => g.latitude && g.longitude && g.is_active)
    .map(g => ({
      id: g.id,
      lat: g.latitude!,
      lng: g.longitude!,
      radius: g.radius_meters || 100,
      color: g.location_id === props.employeeLocationId ? '#4CAF50' : '#2196F3',
      fillOpacity: 0.15,
      strokeWeight: 2
    }))
})

// Create markers for geofence centers
const locationMarkers = computed<MapMarker[]>(() => {
  const markers: MapMarker[] = []

  // Add geofence center markers
  props.geofences
    .filter(g => g.latitude && g.longitude && g.is_active)
    .forEach(g => {
      markers.push({
        id: `geofence-${g.id}`,
        lat: g.latitude!,
        lng: g.longitude!,
        title: g.name,
        color: g.location_id === props.employeeLocationId ? '#4CAF50' : '#2196F3',
        info: `${g.name} (${g.radius_meters || 100}m radius)`
      })
    })

  return markers
})

// Calculate center of all geofences
const mapCenter = computed(() => {
  if (props.currentLocation) {
    return {
      lat: props.currentLocation.latitude,
      lng: props.currentLocation.longitude
    }
  }

  const active = props.geofences.filter(g => g.latitude && g.longitude)
  if (active.length === 0) {
    return { lat: 34.1536, lng: -118.4426 } // Default: Sherman Oaks
  }

  const avgLat = active.reduce((sum, g) => sum + (g.latitude || 0), 0) / active.length
  const avgLng = active.reduce((sum, g) => sum + (g.longitude || 0), 0) / active.length
  return { lat: avgLat, lng: avgLng }
})

// Check if user is within any geofence
const locationStatus = computed(() => {
  if (!props.currentLocation) {
    return { status: 'unknown', message: 'Location not available', color: 'grey' }
  }

  for (const g of props.geofences) {
    if (!g.latitude || !g.longitude || !g.is_active) continue

    const distance = calculateDistance(
      props.currentLocation.latitude,
      props.currentLocation.longitude,
      g.latitude,
      g.longitude
    )

    if (distance <= (g.radius_meters || 100)) {
      return {
        status: 'inside',
        message: `Inside ${g.name} geofence`,
        color: 'success',
        geofence: g
      }
    }
  }

  return {
    status: 'outside',
    message: 'Outside all geofences',
    color: 'warning'
  }
})

// Haversine distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
</script>

<template>
  <div class="geofence-map-view">
    <!-- Status Banner -->
    <v-alert
      :color="locationStatus.color"
      variant="tonal"
      density="compact"
      class="mb-3"
    >
      <template #prepend>
        <v-icon>
          {{ locationStatus.status === 'inside' ? 'mdi-check-circle' : 
             locationStatus.status === 'outside' ? 'mdi-alert-circle' : 'mdi-help-circle' }}
        </v-icon>
      </template>
      {{ locationStatus.message }}
      <template v-if="currentLocation" #append>
        <span class="text-caption">
          ± {{ Math.round(currentLocation.accuracy) }}m accuracy
        </span>
      </template>
    </v-alert>

    <!-- Map -->
    <SharedGoogleMap
      :markers="locationMarkers"
      :geofences="mapGeofences"
      :center="mapCenter"
      :zoom="15"
      height="300px"
      :show-current-location="true"
      :fit-bounds="mapGeofences.length > 0"
    />

    <!-- Legend -->
    <div class="d-flex align-center gap-4 mt-3 text-caption text-grey">
      <div class="d-flex align-center">
        <span class="legend-circle" style="background: #4CAF50" />
        Your assigned location
      </div>
      <div class="d-flex align-center">
        <span class="legend-circle" style="background: #2196F3" />
        Other locations
      </div>
      <div class="d-flex align-center">
        <span class="legend-dot" style="background: #2196F3" />
        Your position
      </div>
    </div>

    <!-- Geofence List -->
    <v-list density="compact" class="mt-3 bg-grey-lighten-5 rounded">
      <v-list-item
        v-for="g in geofences.filter(f => f.is_active)"
        :key="g.id"
        :class="{ 'text-success': g.location_id === employeeLocationId }"
      >
        <template #prepend>
          <v-icon 
            :color="g.location_id === employeeLocationId ? 'success' : 'grey'"
            size="18"
          >
            mdi-map-marker-radius
          </v-icon>
        </template>
        <v-list-item-title class="text-body-2">{{ g.name }}</v-list-item-title>
        <v-list-item-subtitle>{{ g.radius_meters || 100 }}m radius</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped>
.legend-circle {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 6px;
  opacity: 0.4;
  border: 2px solid currentColor;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  border: 2px solid white;
  box-shadow: 0 0 0 2px currentColor;
}
</style>
