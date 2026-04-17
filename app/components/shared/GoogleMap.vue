/**
 * GoogleMap Component
 * =====================
 * Reusable map component for displaying locations, markers, geofences, and routes.
 * 
 * Props:
 * - center: { lat, lng } - Initial center of the map
 * - zoom: number - Initial zoom level (default: 12)
 * - markers: Array of marker objects with lat, lng, title, icon, etc.
 * - geofences: Array of geofence circles { lat, lng, radius, color }
 * - showDirections: boolean - Show direction controls
 * - height: string - Map height (default: 400px)
 * 
 * Events:
 * - @marker-click: Emitted when a marker is clicked
 * - @map-click: Emitted when the map is clicked (for adding markers)
 */
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title?: string
  label?: string
  icon?: string
  color?: string
  info?: string
  draggable?: boolean
}

export interface MapGeofence {
  id: string
  lat: number
  lng: number
  radius: number // meters
  color?: string
  fillOpacity?: number
  strokeWeight?: number
}

export interface MapRoute {
  origin: string | { lat: number; lng: number }
  destination: string | { lat: number; lng: number }
  waypoints?: string[]
}

const props = withDefaults(defineProps<{
  center?: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  geofences?: MapGeofence[]
  route?: MapRoute
  showDirectionsPanel?: boolean
  height?: string
  clickable?: boolean
  showCurrentLocation?: boolean
  fitBounds?: boolean
}>(), {
  zoom: 12,
  markers: () => [],
  geofences: () => [],
  height: '400px',
  clickable: false,
  showCurrentLocation: false,
  fitBounds: true
})

const emit = defineEmits<{
  (e: 'marker-click', marker: MapMarker): void
  (e: 'map-click', location: { lat: number; lng: number }): void
  (e: 'directions-result', result: any): void
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const directionsPanel = ref<HTMLElement | null>(null)
const map = ref<google.maps.Map | null>(null)
const markerInstances = ref<google.maps.Marker[]>([])
const geofenceInstances = ref<google.maps.Circle[]>([])
const directionsRenderer = ref<google.maps.DirectionsRenderer | null>(null)
const infoWindow = ref<google.maps.InfoWindow | null>(null)
const currentLocationMarker = ref<google.maps.Marker | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// LA clinic locations as default center
const defaultCenter = { lat: 34.1536, lng: -118.4426 } // Sherman Oaks

const effectiveCenter = computed(() => props.center || defaultCenter)

// Load Google Maps API script
async function loadGoogleMapsScript(): Promise<void> {
  if (window.google?.maps) return

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.public.googleMapsApiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })
}

// Initialize map
async function initMap(): Promise<void> {
  if (!mapContainer.value) return
  
  loading.value = true
  error.value = null

  try {
    await loadGoogleMapsScript()

    map.value = new google.maps.Map(mapContainer.value, {
      center: effectiveCenter.value,
      zoom: props.zoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }]
        }
      ]
    })

    infoWindow.value = new google.maps.InfoWindow()

    // Click handler for adding markers
    if (props.clickable) {
      map.value.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          emit('map-click', {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          })
        }
      })
    }

    // Initialize directions renderer if needed
    if (props.route || props.showDirectionsPanel) {
      directionsRenderer.value = new google.maps.DirectionsRenderer({
        map: map.value,
        panel: directionsPanel.value || undefined,
        suppressMarkers: false
      })
    }

    // Render initial content
    renderMarkers()
    renderGeofences()
    
    if (props.route) {
      await calculateRoute()
    }

    if (props.showCurrentLocation) {
      showCurrentLocation()
    }

    if (props.fitBounds && (props.markers.length > 0 || props.geofences.length > 0)) {
      fitMapBounds()
    }

    loading.value = false
  } catch (e: any) {
    console.error('Failed to initialize map:', e)
    error.value = e.message || 'Failed to load map'
    loading.value = false
  }
}

// Render markers on the map
function renderMarkers(): void {
  if (!map.value) return

  // Clear existing markers
  markerInstances.value.forEach(m => m.setMap(null))
  markerInstances.value = []

  props.markers.forEach(marker => {
    const markerOptions: google.maps.MarkerOptions = {
      position: { lat: marker.lat, lng: marker.lng },
      map: map.value!,
      title: marker.title,
      draggable: marker.draggable
    }

    // Custom label
    if (marker.label) {
      markerOptions.label = {
        text: marker.label,
        color: '#fff',
        fontWeight: 'bold'
      }
    }

    // Custom icon based on color
    if (marker.color) {
      markerOptions.icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: marker.color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      }
    }

    const gMarker = new google.maps.Marker(markerOptions)

    // Click handler
    gMarker.addListener('click', () => {
      emit('marker-click', marker)
      
      if (marker.info && infoWindow.value) {
        infoWindow.value.setContent(`
          <div style="padding: 8px; max-width: 200px;">
            <strong>${marker.title || ''}</strong>
            <p style="margin: 4px 0 0 0; color: #666;">${marker.info}</p>
          </div>
        `)
        infoWindow.value.open(map.value!, gMarker)
      }
    })

    markerInstances.value.push(gMarker)
  })
}

// Render geofence circles
function renderGeofences(): void {
  if (!map.value) return

  // Clear existing circles
  geofenceInstances.value.forEach(c => c.setMap(null))
  geofenceInstances.value = []

  props.geofences.forEach(fence => {
    const circle = new google.maps.Circle({
      map: map.value!,
      center: { lat: fence.lat, lng: fence.lng },
      radius: fence.radius,
      fillColor: fence.color || '#4CAF50',
      fillOpacity: fence.fillOpacity ?? 0.2,
      strokeColor: fence.color || '#4CAF50',
      strokeWeight: fence.strokeWeight ?? 2,
      strokeOpacity: 0.8
    })

    geofenceInstances.value.push(circle)
  })
}

// Calculate and display route
async function calculateRoute(): Promise<void> {
  if (!map.value || !props.route || !directionsRenderer.value) return

  const directionsService = new google.maps.DirectionsService()
  
  const origin = typeof props.route.origin === 'string'
    ? props.route.origin
    : new google.maps.LatLng(props.route.origin.lat, props.route.origin.lng)
    
  const destination = typeof props.route.destination === 'string'
    ? props.route.destination
    : new google.maps.LatLng(props.route.destination.lat, props.route.destination.lng)

  const waypoints = props.route.waypoints?.map(wp => ({
    location: wp,
    stopover: true
  }))

  try {
    const result = await directionsService.route({
      origin,
      destination,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    })

    directionsRenderer.value.setDirections(result)
    emit('directions-result', result)
  } catch (e) {
    console.error('Directions request failed:', e)
  }
}

// Show current location on map
function showCurrentLocation(): void {
  if (!map.value || !navigator.geolocation) return

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }

      // Remove existing current location marker
      currentLocationMarker.value?.setMap(null)

      currentLocationMarker.value = new google.maps.Marker({
        position: pos,
        map: map.value!,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2196F3',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3
        },
        title: 'Your Location'
      })

      // Add accuracy circle
      new google.maps.Circle({
        map: map.value!,
        center: pos,
        radius: position.coords.accuracy,
        fillColor: '#2196F3',
        fillOpacity: 0.1,
        strokeColor: '#2196F3',
        strokeWeight: 1
      })
    },
    (error) => {
      console.warn('Could not get current location:', error.message)
    },
    { enableHighAccuracy: true }
  )
}

// Fit map to show all markers and geofences
function fitMapBounds(): void {
  if (!map.value) return

  const bounds = new google.maps.LatLngBounds()
  let hasContent = false

  props.markers.forEach(m => {
    bounds.extend({ lat: m.lat, lng: m.lng })
    hasContent = true
  })

  props.geofences.forEach(f => {
    bounds.extend({ lat: f.lat, lng: f.lng })
    // Extend to include geofence radius
    const degreesPerMeter = 1 / 111320
    bounds.extend({ 
      lat: f.lat + (f.radius * degreesPerMeter), 
      lng: f.lng + (f.radius * degreesPerMeter * Math.cos(f.lat * Math.PI / 180))
    })
    bounds.extend({ 
      lat: f.lat - (f.radius * degreesPerMeter), 
      lng: f.lng - (f.radius * degreesPerMeter * Math.cos(f.lat * Math.PI / 180))
    })
    hasContent = true
  })

  if (hasContent) {
    map.value.fitBounds(bounds, 50)
  }
}

// Public methods exposed to parent
function panTo(lat: number, lng: number, zoom?: number): void {
  if (!map.value) return
  map.value.panTo({ lat, lng })
  if (zoom !== undefined) {
    map.value.setZoom(zoom)
  }
}

function addMarker(marker: MapMarker): void {
  // This would add to the reactive markers array
  renderMarkers()
}

// Watch for prop changes
watch(() => props.markers, renderMarkers, { deep: true })
watch(() => props.geofences, renderGeofences, { deep: true })
watch(() => props.route, calculateRoute, { deep: true })
watch(() => props.center, (newCenter) => {
  if (map.value && newCenter) {
    map.value.panTo(newCenter)
  }
})

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  // Cleanup
  markerInstances.value.forEach(m => m.setMap(null))
  geofenceInstances.value.forEach(c => c.setMap(null))
  currentLocationMarker.value?.setMap(null)
})

// Expose public methods
defineExpose({
  panTo,
  addMarker,
  fitMapBounds,
  showCurrentLocation
})
</script>

<template>
  <div class="google-map-wrapper">
    <!-- Loading state -->
    <div v-if="loading" class="map-loading" :style="{ height }">
      <v-progress-circular indeterminate color="primary" />
      <p class="text-body-2 mt-2">Loading map...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="map-error" :style="{ height }">
      <v-icon color="error" size="48">mdi-map-marker-off</v-icon>
      <p class="text-body-2 mt-2 text-error">{{ error }}</p>
    </div>

    <!-- Map container -->
    <div 
      v-show="!loading && !error"
      ref="mapContainer" 
      class="map-container" 
      :style="{ height }"
    />

    <!-- Directions panel (optional) -->
    <div 
      v-if="showDirectionsPanel && route" 
      ref="directionsPanel" 
      class="directions-panel mt-4"
    />
  </div>
</template>

<style scoped>
.google-map-wrapper {
  width: 100%;
}

.map-container {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.map-loading,
.map-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
}

.directions-panel {
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}

.directions-panel :deep(.adp-directions) {
  font-family: inherit;
}
</style>
