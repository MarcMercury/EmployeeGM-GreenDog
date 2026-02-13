<template>
  <div class="emergency-contacts-view">
    <!-- Location Tabs -->
    <v-tabs v-model="activeLocation" color="red-darken-1" class="mb-6">
      <v-tab
        v-for="loc in SAFETY_LOCATIONS"
        :key="loc.value"
        :value="loc.value"
      >
        <v-icon start>mdi-map-marker</v-icon>
        {{ loc.label }}
      </v-tab>
    </v-tabs>

    <v-row>
      <!-- Emergency Numbers -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center text-subtitle-1 pa-4">
            <v-icon color="red" class="mr-2">mdi-phone-alert</v-icon>
            Emergency Numbers
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              v-for="contact in currentContacts.emergencyNumbers"
              :key="contact.label"
              :title="contact.label"
              :subtitle="contact.number"
              :prepend-icon="contact.icon"
            >
              <template #append>
                <v-btn
                  :href="`tel:${contact.number.replace(/[^0-9+]/g, '')}`"
                  icon="mdi-phone"
                  color="success"
                  variant="tonal"
                  size="small"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Shutoff Locations -->
      <v-col cols="12" md="6">
        <v-card variant="outlined" rounded="lg">
          <v-card-title class="d-flex align-center text-subtitle-1 pa-4">
            <v-icon color="orange" class="mr-2">mdi-alert-octagon</v-icon>
            Shutoff Locations
          </v-card-title>
          <v-divider />
          <v-list density="comfortable">
            <v-list-item
              v-for="shutoff in currentContacts.shutoffs"
              :key="shutoff.type"
              :prepend-icon="shutoff.icon"
            >
              <v-list-item-title class="font-weight-medium">{{ shutoff.type }}</v-list-item-title>
              <v-list-item-subtitle>{{ shutoff.location }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <!-- Assembly Points -->
    <v-card variant="outlined" rounded="lg" class="mt-4">
      <v-card-title class="d-flex align-center text-subtitle-1 pa-4">
        <v-icon color="green" class="mr-2">mdi-map-marker-check</v-icon>
        Emergency Assembly Point
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="text-body-1">{{ currentContacts.assemblyPoint }}</div>
      </v-card-text>
    </v-card>

    <v-alert type="info" variant="tonal" density="compact" class="mt-6" icon="mdi-information">
      This is a <strong>read-only</strong> reference page. Contact your Safety Coordinator to update emergency information.
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { SAFETY_LOCATIONS, type SafetyLogLocation } from '~/types/safety-log.types'

interface Props {
  initialLocation?: SafetyLogLocation
}

const props = withDefaults(defineProps<Props>(), {
  initialLocation: 'venice',
})

const activeLocation = ref<SafetyLogLocation>(props.initialLocation)

interface EmergencyData {
  emergencyNumbers: { label: string; number: string; icon: string }[]
  shutoffs: { type: string; location: string; icon: string }[]
  assemblyPoint: string
}

const EMERGENCY_DATA: Record<SafetyLogLocation, EmergencyData> = {
  venice: {
    emergencyNumbers: [
      { label: 'Emergency (911)', number: '911', icon: 'mdi-ambulance' },
      { label: 'Poison Control', number: '1-800-222-1222', icon: 'mdi-bottle-tonic-skull' },
      { label: 'ASPCA Animal Poison Control', number: '1-888-426-4435', icon: 'mdi-paw' },
      { label: 'Building Manager', number: 'Contact Front Desk', icon: 'mdi-domain' },
      { label: 'Safety Coordinator', number: 'Contact Management', icon: 'mdi-shield-account' },
    ],
    shutoffs: [
      { type: 'Water Main', location: 'Utility room — rear of building, ground floor', icon: 'mdi-water' },
      { type: 'Gas Shutoff', location: 'Exterior wall — east side of building near meter', icon: 'mdi-gas-cylinder' },
      { type: 'Oxygen Supply', location: 'Surgery storage room — labeled manifold panel', icon: 'mdi-weather-windy' },
      { type: 'Electrical Panel', location: 'Utility closet — main hallway', icon: 'mdi-flash' },
    ],
    assemblyPoint: 'Front parking lot — east corner, away from building entrance.',
  },
  sherman_oaks: {
    emergencyNumbers: [
      { label: 'Emergency (911)', number: '911', icon: 'mdi-ambulance' },
      { label: 'Poison Control', number: '1-800-222-1222', icon: 'mdi-bottle-tonic-skull' },
      { label: 'ASPCA Animal Poison Control', number: '1-888-426-4435', icon: 'mdi-paw' },
      { label: 'Building Manager', number: 'Contact Front Desk', icon: 'mdi-domain' },
      { label: 'Safety Coordinator', number: 'Contact Management', icon: 'mdi-shield-account' },
    ],
    shutoffs: [
      { type: 'Water Main', location: 'Basement utility area — north wall', icon: 'mdi-water' },
      { type: 'Gas Shutoff', location: 'Exterior — south side near loading area', icon: 'mdi-gas-cylinder' },
      { type: 'Oxygen Supply', location: 'Surgical prep room — wall-mounted panel', icon: 'mdi-weather-windy' },
      { type: 'Electrical Panel', location: 'Storage room B — clearly labeled', icon: 'mdi-flash' },
    ],
    assemblyPoint: 'Sidewalk area — north side of building, past the parking structure.',
  },
  van_nuys: {
    emergencyNumbers: [
      { label: 'Emergency (911)', number: '911', icon: 'mdi-ambulance' },
      { label: 'Poison Control', number: '1-800-222-1222', icon: 'mdi-bottle-tonic-skull' },
      { label: 'ASPCA Animal Poison Control', number: '1-888-426-4435', icon: 'mdi-paw' },
      { label: 'Building Manager', number: 'Contact Front Desk', icon: 'mdi-domain' },
      { label: 'Safety Coordinator', number: 'Contact Management', icon: 'mdi-shield-account' },
    ],
    shutoffs: [
      { type: 'Water Main', location: 'Mechanical room — west corridor', icon: 'mdi-water' },
      { type: 'Gas Shutoff', location: 'Exterior — west side, near HVAC units', icon: 'mdi-gas-cylinder' },
      { type: 'Oxygen Supply', location: 'Treatment room — labeled valve box', icon: 'mdi-weather-windy' },
      { type: 'Electrical Panel', location: 'Front office — behind reception desk', icon: 'mdi-flash' },
    ],
    assemblyPoint: 'Rear parking lot — designated assembly area with signage.',
  },
}

const currentContacts = computed(() => EMERGENCY_DATA[activeLocation.value] || EMERGENCY_DATA.venice)
</script>
