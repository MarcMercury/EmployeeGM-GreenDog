/**
 * PartnerMapView Component
 * ==========================
 * Interactive map showing referral partners with:
 * - Partner markers with tier-based colors
 * - Clinic locations for reference
 * - Route planning for visits
 * - Drive time calculations
 */
<script setup lang="ts">
import type { ReferralPartner } from '~/types/marketing.types'
import type { MapMarker } from '~/components/shared/GoogleMap.vue'

const props = defineProps<{
  partners: ReferralPartner[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'partner-click', partner: ReferralPartner): void
}>()

const { geocode, getDistance, loading: geocoding } = useGoogleMaps()

// Clinic locations
const clinics = [
  { id: 'venice', name: 'Venice', address: '210 Main Street, Venice, CA 90291', lat: 33.9925, lng: -118.4695 },
  { id: 'sherman_oaks', name: 'Sherman Oaks', address: '13907 Ventura Blvd, Sherman Oaks, CA 91423', lat: 34.1536, lng: -118.4426 },
  { id: 'van_nuys', name: 'Van Nuys', address: '14661 Aetna St, Van Nuys, CA 91411', lat: 34.1948, lng: -118.4258 }
]

// Cache geocoded partner locations
const geocodedPartners = ref<Map<string, { lat: number; lng: number }>>(new Map())
const selectedPartner = ref<ReferralPartner | null>(null)
const selectedPartnerDistances = ref<Array<{ clinic: string; clinicId: string; distance: string; duration: string }>>([])
const loadingDistances = ref(false)
const showRouteDialog = ref(false)
const routePlan = ref<{ origin: { lat: number; lng: number }; destination: { lat: number; lng: number }; waypoints?: string[] } | null>(null)

// Filter state
const showClinics = ref(true)
const filterTier = ref<string | null>(null)
const filterZone = ref<string | null>(null)
const showNeedsFollowup = ref(false)

// Available tiers and zones from partners
const tierOptions = computed(() => {
  const tiers = new Set(props.partners.map(p => p.tier).filter(Boolean))
  return Array.from(tiers).sort()
})

const zoneOptions = computed(() => {
  const zones = new Set(props.partners.map(p => p.zone).filter(Boolean))
  return Array.from(zones).sort()
})

// Filtered partners
const filteredPartners = computed(() => {
  let result = props.partners

  if (filterTier.value) {
    result = result.filter(p => p.tier === filterTier.value)
  }
  if (filterZone.value) {
    result = result.filter(p => p.zone === filterZone.value)
  }
  if (showNeedsFollowup.value) {
    result = result.filter(p => p.needs_followup)
  }

  return result
})

// Compute markers from partners
const partnerMarkers = computed<MapMarker[]>(() => {
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

  // Add partner markers
  filteredPartners.value.forEach(partner => {
    const cached = geocodedPartners.value.get(partner.id)
    if (cached) {
      markers.push({
        id: partner.id,
        lat: cached.lat,
        lng: cached.lng,
        title: partner.name,
        color: getTierColor(partner.tier),
        info: `${partner.tier || 'Unranked'} • ${partner.zone || 'No zone'}`
      })
    }
  })

  return markers
})

// Color coding by tier
function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    'S': '#FFD700',      // Gold
    'A': '#4CAF50',      // Green
    'B': '#FF9800',      // Orange
    'C': '#9E9E9E',      // Grey
    'D': '#795548',      // Brown
    'New': '#03A9F4',    // Light Blue
    'Prospect': '#9C27B0' // Purple
  }
  return colors[tier] || '#607D8B'
}

function getTierLabel(tier: string): string {
  return tier || '?'
}

// Geocode partner addresses
async function geocodePartnerLocations() {
  for (const partner of props.partners) {
    if (!partner.address || geocodedPartners.value.has(partner.id)) continue

    try {
      const result = await geocode(partner.address)
      if (result) {
        geocodedPartners.value.set(partner.id, { lat: result.lat, lng: result.lng })
      }
    } catch (e) {
      console.warn(`Could not geocode: ${partner.address}`)
    }
  }
}

// Handle marker click
async function handleMarkerClick(marker: MapMarker) {
  // Check if it's a partner marker (not a clinic)
  if (marker.id.startsWith('clinic-')) {
    return
  }

  const partner = props.partners.find(p => p.id === marker.id)
  if (!partner) return

  selectedPartner.value = partner
  emit('partner-click', partner)

  // Calculate distances from all clinics
  if (partner.address) {
    loadingDistances.value = true
    selectedPartnerDistances.value = []

    for (const clinic of clinics) {
      const result = await getDistance(clinic.address, partner.address)
      if (result) {
        selectedPartnerDistances.value.push({
          clinic: clinic.name,
          clinicId: clinic.id,
          distance: result.distance.text,
          duration: result.duration.text
        })
      }
    }
    loadingDistances.value = false
  }
}

// Plan route to multiple partners
const selectedPartnersForRoute = ref<string[]>([])

function togglePartnerForRoute(partnerId: string) {
  const idx = selectedPartnersForRoute.value.indexOf(partnerId)
  if (idx >= 0) {
    selectedPartnersForRoute.value.splice(idx, 1)
  } else {
    selectedPartnersForRoute.value.push(partnerId)
  }
}

async function planRoute(startClinicId: string) {
  if (selectedPartnersForRoute.value.length === 0) return

  const clinic = clinics.find(c => c.id === startClinicId)
  if (!clinic) return

  const partnerAddresses = selectedPartnersForRoute.value
    .map(id => props.partners.find(p => p.id === id)?.address)
    .filter(Boolean) as string[]

  if (partnerAddresses.length === 0) return

  // For single destination
  if (partnerAddresses.length === 1) {
    const destCoords = geocodedPartners.value.get(selectedPartnersForRoute.value[0])
    if (destCoords) {
      routePlan.value = {
        origin: { lat: clinic.lat, lng: clinic.lng },
        destination: destCoords
      }
      showRouteDialog.value = true
    }
    return
  }

  // For multiple destinations, use waypoints
  const lastPartnerCoords = geocodedPartners.value.get(selectedPartnersForRoute.value[selectedPartnersForRoute.value.length - 1])
  if (!lastPartnerCoords) return

  routePlan.value = {
    origin: { lat: clinic.lat, lng: clinic.lng },
    destination: lastPartnerCoords,
    waypoints: partnerAddresses.slice(0, -1)
  }
  showRouteDialog.value = true
}

// Open partner in Google Maps
function openInGoogleMaps(partner: ReferralPartner) {
  if (!partner.address) return
  const encoded = encodeURIComponent(partner.address)
  window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank')
}

// Watch for new partners and geocode them
watch(() => props.partners, () => {
  geocodePartnerLocations()
}, { immediate: true })

onMounted(() => {
  geocodePartnerLocations()
})
</script>

<template>
  <div class="partner-map-view">
    <!-- Map Controls -->
    <v-card class="mb-3" variant="outlined">
      <v-card-text class="py-2">
        <v-row align="center" dense>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterTier"
              :items="tierOptions"
              label="Tier"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterZone"
              :items="zoneOptions"
              label="Zone"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="auto">
            <v-switch
              v-model="showNeedsFollowup"
              label="Needs follow-up"
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
          <v-spacer />
          <v-col cols="auto">
            <v-chip size="small" color="primary" variant="tonal">
              <v-icon start size="14">mdi-map-marker</v-icon>
              {{ partnerMarkers.length - (showClinics ? 3 : 0) }} partners mapped
            </v-chip>
          </v-col>
        </v-row>

        <!-- Legend -->
        <v-row class="mt-2" dense>
          <v-col cols="12">
            <div class="d-flex align-center gap-4 text-caption">
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #2196F3" />
                Clinic
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #FFD700" />
                Tier S
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #4CAF50" />
                Tier A
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #FF9800" />
                Tier B
              </div>
              <div class="d-flex align-center">
                <span class="legend-dot" style="background: #9E9E9E" />
                Tier C/D
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Map Display -->
    <v-row>
      <v-col :cols="selectedPartner ? 8 : 12">
        <SharedGoogleMap
          :markers="partnerMarkers"
          :center="{ lat: 34.1, lng: -118.4 }"
          :zoom="10"
          height="500px"
          :route="routePlan"
          @marker-click="handleMarkerClick"
        />
      </v-col>

      <!-- Partner Details Panel -->
      <v-col v-if="selectedPartner" cols="4">
        <v-card variant="outlined" class="partner-details-panel">
          <v-card-title class="d-flex align-center">
            <v-avatar :color="getTierColor(selectedPartner.tier)" size="28" class="mr-2">
              <span class="text-white text-caption font-weight-bold">{{ getTierLabel(selectedPartner.tier) }}</span>
            </v-avatar>
            {{ selectedPartner.name }}
            <v-spacer />
            <v-btn icon size="small" variant="text" @click="selectedPartner = null">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>

          <v-card-text>
            <v-list density="compact">
              <v-list-item v-if="selectedPartner.address">
                <template #prepend>
                  <v-icon color="grey">mdi-map-marker</v-icon>
                </template>
                <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
              </v-list-item>

              <v-list-item v-if="selectedPartner.contact_name">
                <template #prepend>
                  <v-icon color="grey">mdi-account</v-icon>
                </template>
                <v-list-item-title>{{ selectedPartner.contact_name }}</v-list-item-title>
              </v-list-item>

              <v-list-item v-if="selectedPartner.phone">
                <template #prepend>
                  <v-icon color="grey">mdi-phone</v-icon>
                </template>
                <v-list-item-title>
                  <a :href="`tel:${selectedPartner.phone}`">{{ selectedPartner.phone }}</a>
                </v-list-item-title>
              </v-list-item>

              <v-list-item v-if="selectedPartner.zone">
                <template #prepend>
                  <v-icon color="grey">mdi-map</v-icon>
                </template>
                <v-list-item-title>Zone: {{ selectedPartner.zone }}</v-list-item-title>
              </v-list-item>

              <v-list-item v-if="selectedPartner.needs_followup">
                <template #prepend>
                  <v-icon color="warning">mdi-alert</v-icon>
                </template>
                <v-list-item-title class="text-warning">Needs Follow-up</v-list-item-title>
                <v-list-item-subtitle v-if="selectedPartner.followup_reason">
                  {{ selectedPartner.followup_reason }}
                </v-list-item-subtitle>
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
                v-for="dist in selectedPartnerDistances" 
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
                    @click="selectedPartnersForRoute = [selectedPartner!.id]; planRoute(dist.clinicId)"
                  >
                    <v-icon size="16">mdi-directions</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>

            <!-- Actions -->
            <div class="mt-4 d-flex gap-2 flex-wrap">
              <v-btn 
                color="primary" 
                variant="flat" 
                size="small" 
                prepend-icon="mdi-google-maps"
                @click="openInGoogleMaps(selectedPartner)"
              >
                Open in Maps
              </v-btn>
              <v-btn 
                variant="outlined" 
                size="small" 
                prepend-icon="mdi-eye"
                @click="$emit('partner-click', selectedPartner)"
              >
                View Profile
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Route Planning Dialog -->
    <v-dialog v-model="showRouteDialog" max-width="900">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-directions</v-icon>
          Route to Partner{{ selectedPartnersForRoute.length > 1 ? 's' : '' }}
          <v-spacer />
          <v-btn icon variant="text" @click="showRouteDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <SharedGoogleMap
            v-if="routePlan"
            :route="routePlan"
            height="450px"
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

.partner-details-panel {
  height: 500px;
  overflow-y: auto;
}
</style>
