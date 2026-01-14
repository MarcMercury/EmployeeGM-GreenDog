<template>
  <v-card variant="outlined">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-map-marker-radius</v-icon>
      Time Clock Geo-Lock Settings
    </v-card-title>
    
    <v-divider />

    <v-card-text>
      <v-alert
        v-if="employee?.geo_lock_enabled"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        <strong>Geo-lock is enabled.</strong> This employee can only clock in/out from approved locations.
      </v-alert>

      <v-switch
        v-model="geoLockEnabled"
        label="Enable Geo-Lock for Time Clock"
        color="primary"
        hide-details
        class="mb-4"
        :loading="saving"
        @update:model-value="saveGeoLockEnabled"
      />

      <p class="text-body-2 text-grey mb-4">
        When enabled, this employee will only be able to clock in and out when at one of the approved work locations below.
      </p>

      <v-expand-transition>
        <div v-if="geoLockEnabled">
          <v-divider class="my-4" />

          <p class="text-subtitle-2 font-weight-bold mb-3">
            <v-icon start size="16">mdi-office-building-marker</v-icon>
            Approved Locations
          </p>

          <!-- Currently assigned locations -->
          <v-chip-group v-if="selectedLocationIds.length > 0" column class="mb-3">
            <v-chip
              v-for="locId in selectedLocationIds"
              :key="locId"
              closable
              @click:close="removeLocation(locId)"
            >
              <v-icon start size="16">mdi-map-marker</v-icon>
              {{ getLocationName(locId) }}
            </v-chip>
          </v-chip-group>

          <v-alert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            No locations assigned. Employee will be blocked from clocking in/out.
          </v-alert>

          <!-- Add location selector -->
          <v-autocomplete
            v-model="locationToAdd"
            :items="availableLocations"
            item-title="name"
            item-value="id"
            label="Add Approved Location"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @update:model-value="addLocation"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ [item.raw.address_line1, item.raw.city, item.raw.state].filter(Boolean).join(', ') }}
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>
        </div>
      </v-expand-transition>
    </v-card-text>

    <!-- Quick preset buttons -->
    <v-expand-transition>
      <v-card-actions v-if="geoLockEnabled" class="flex-wrap gap-2 px-4 pb-4">
        <v-btn
          size="small"
          variant="tonal"
          prepend-icon="mdi-map-marker-multiple"
          @click="assignAllLocations"
        >
          All Locations
        </v-btn>
        <v-btn
          v-if="employee?.location?.id"
          size="small"
          variant="tonal"
          prepend-icon="mdi-home"
          @click="assignPrimaryLocation"
        >
          Primary Location Only
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="error"
          prepend-icon="mdi-close-circle"
          @click="clearLocations"
        >
          Clear All
        </v-btn>
      </v-card-actions>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
interface Employee {
  id: string
  geo_lock_enabled?: boolean
  geo_lock_location_ids?: string[]
  location?: { id: string; name: string } | null
}

interface Location {
  id: string
  name: string
  address_line1: string | null
  city: string | null
  state: string | null
}

const props = defineProps<{
  employee: Employee
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const client = useSupabaseClient()
const toast = useToast()

const saving = ref(false)
const geoLockEnabled = ref(props.employee?.geo_lock_enabled || false)
const selectedLocationIds = ref<string[]>(props.employee?.geo_lock_location_ids || [])
const locations = ref<Location[]>([])
const locationToAdd = ref<string | null>(null)

const availableLocations = computed(() => {
  return locations.value.filter(loc => !selectedLocationIds.value.includes(loc.id))
})

const getLocationName = (id: string): string => {
  return locations.value.find(l => l.id === id)?.name || id
}

const fetchLocations = async () => {
  const { data } = await client
    .from('locations')
    .select('id, name, address_line1, city, state')
    .eq('is_active', true)
    .order('name')

  locations.value = data || []
}

const saveGeoLockEnabled = async () => {
  saving.value = true
  try {
    const { error } = await client
      .from('employees')
      .update({
        geo_lock_enabled: geoLockEnabled.value,
        geo_lock_location_ids: geoLockEnabled.value ? selectedLocationIds.value : []
      })
      .eq('id', props.employee.id)

    if (error) throw error
    toast.success(geoLockEnabled.value ? 'Geo-lock enabled' : 'Geo-lock disabled')
    emit('update')
  } catch (err) {
    console.error('Error saving geo-lock:', err)
    toast.error('Failed to save settings')
    geoLockEnabled.value = !geoLockEnabled.value
  } finally {
    saving.value = false
  }
}

const saveLocations = async () => {
  saving.value = true
  try {
    const { error } = await client
      .from('employees')
      .update({
        geo_lock_location_ids: selectedLocationIds.value
      })
      .eq('id', props.employee.id)

    if (error) throw error
    emit('update')
  } catch (err) {
    console.error('Error saving locations:', err)
    toast.error('Failed to save locations')
  } finally {
    saving.value = false
  }
}

const addLocation = async (locId: string | null) => {
  if (!locId) return
  selectedLocationIds.value.push(locId)
  locationToAdd.value = null
  await saveLocations()
  toast.success('Location added')
}

const removeLocation = async (locId: string) => {
  selectedLocationIds.value = selectedLocationIds.value.filter(id => id !== locId)
  await saveLocations()
  toast.success('Location removed')
}

const assignAllLocations = async () => {
  selectedLocationIds.value = locations.value.map(l => l.id)
  await saveLocations()
  toast.success('All locations assigned')
}

const assignPrimaryLocation = async () => {
  if (props.employee?.location?.id) {
    selectedLocationIds.value = [props.employee.location.id]
    await saveLocations()
    toast.success('Primary location assigned')
  }
}

const clearLocations = async () => {
  selectedLocationIds.value = []
  await saveLocations()
  toast.success('All locations cleared')
}

watch(() => props.employee, (newVal) => {
  geoLockEnabled.value = newVal?.geo_lock_enabled || false
  selectedLocationIds.value = newVal?.geo_lock_location_ids || []
}, { deep: true })

onMounted(() => {
  fetchLocations()
})
</script>
