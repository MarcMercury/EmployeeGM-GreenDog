<template>
  <div class="event-scraper-dialog">
    <!-- Dialog Header -->
    <v-dialog v-model="open" max-width="800px">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          color="primary"
          variant="outlined"
          prepend-icon="mdi-cloud-download"
          size="small"
        >
          Import Events
        </v-btn>
      </template>

      <v-card>
        <v-card-title class="d-flex align-center gap-2 pa-6">
          <v-icon color="primary">mdi-cloud-download</v-icon>
          Import Events from External Calendars
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <!-- Instructions -->
          <div class="mb-6">
            <p class="text-body-2 text-gray-600 mb-4">
              Automatically scrape and import events from partner websites and community calendars.
            </p>

            <!-- Source Selection -->
            <v-card class="mb-6 bg-blue-lighten-5" variant="outlined">
              <v-card-text class="pa-4">
                <h3 class="text-subtitle-2 font-weight-bold mb-3">Select Sources</h3>
                <div class="d-grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))">
                  <v-checkbox
                    v-for="source in availableSources"
                    :key="source"
                    v-model="selectedSources"
                    :label="source"
                    :value="source"
                    dense
                    color="primary"
                  />
                </div>
                <v-btn
                  variant="text"
                  size="small"
                  color="primary"
                  class="mt-2"
                  @click="toggleAllSources"
                >
                  {{ selectedSources.length === availableSources.length ? 'Deselect All' : 'Select All' }}
                </v-btn>
              </v-card-text>
            </v-card>

            <!-- Options -->
            <v-card class="mb-6 bg-green-lighten-5" variant="outlined">
              <v-card-text class="pa-4">
                <h3 class="text-subtitle-2 font-weight-bold mb-3">Import Options</h3>
                <v-checkbox
                  v-model="autoInsert"
                  label="Automatically add events to calendar (uncheck to review first)"
                  color="primary"
                  density="compact"
                />
              </v-card-text>
            </v-card>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-4" />
            <p class="text-body-2">Scraping events from {{ selectedSources.length }} source(s)...</p>
          </div>

          <!-- Results -->
          <div v-else-if="scrapingResults.length > 0" class="mt-6">
            <h3 class="text-subtitle-2 font-weight-bold mb-4">Scraping Results</h3>

            <div class="space-y-3">
              <div
                v-for="result in scrapingResults"
                :key="result.source"
                class="d-flex align-center gap-3 pa-3 rounded border"
                :class="result.success ? 'bg-green-lighten-5 border-green' : 'bg-red-lighten-5 border-red'"
              >
                <v-icon :color="result.success ? 'green' : 'red'" size="large">
                  {{ result.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                </v-icon>
                <div class="flex-grow">
                  <p class="text-body-2 font-weight-bold">{{ result.source }}</p>
                  <p class="text-caption">
                    {{ result.success ? `Found ${result.events_found} events` : result.error }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Insertion Summary -->
            <v-card v-if="insertionResults" class="mt-6 bg-blue-lighten-5">
              <v-card-text class="pa-4">
                <h3 class="text-subtitle-2 font-weight-bold mb-3">Import Summary</h3>
                <div class="d-grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))">
                  <div class="text-center pa-2 bg-white rounded">
                    <p class="text-h6 font-weight-bold text-green">{{ insertionResults.created }}</p>
                    <p class="text-caption text-gray-600">Created</p>
                  </div>
                  <div class="text-center pa-2 bg-white rounded">
                    <p class="text-h6 font-weight-bold text-amber">{{ insertionResults.skipped }}</p>
                    <p class="text-caption text-gray-600">Skipped (Duplicates)</p>
                  </div>
                  <div class="text-center pa-2 bg-white rounded">
                    <p class="text-h6 font-weight-bold text-red">{{ insertionResults.failed }}</p>
                    <p class="text-caption text-gray-600">Failed</p>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Error State -->
          <v-alert v-if="error" type="error" class="mt-4 mb-4" closable @input="error = null">
            {{ error }}
          </v-alert>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="open = false">
            {{ loading ? 'Cancel' : 'Close' }}
          </v-btn>
          <v-btn
            v-if="!loading && scrapingResults.length === 0"
            color="primary"
            :disabled="selectedSources.length === 0"
            @click="handleScrape"
          >
            Start Import
          </v-btn>
          <v-btn v-else-if="!loading" color="primary" @click="handleScrape">
            Refresh Results
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const open = ref(false)
const selectedSources = ref<string[]>([])
const autoInsert = ref(true)

const { 
  triggerScraping, 
  getAvailableSources, 
  loading, 
  error, 
  scrapingResults, 
  insertionResults 
} = useEventScraping()

const availableSources = computed(() => getAvailableSources())

const toggleAllSources = () => {
  if (selectedSources.value.length === availableSources.value.length) {
    selectedSources.value = []
  } else {
    selectedSources.value = [...availableSources.value]
  }
}

const handleScrape = async () => {
  const result = await triggerScraping({
    sources: selectedSources.value,
    insert: autoInsert.value,
  })

  if (result.success && autoInsert.value) {
    // Emit event to refresh calendar
    emit('events-imported', result.data)
  }
}

const emit = defineEmits<{
  'events-imported': [data: any]
}>()
</script>

<style scoped lang="scss">
.event-scraper-dialog {
  .space-y-3 {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
