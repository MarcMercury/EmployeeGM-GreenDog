<template>
  <v-card class="page-toolbar mb-4" variant="outlined">
    <v-card-text class="py-3">
      <v-row dense align="center">
        <!-- Search Field -->
        <v-col :cols="12" :sm="searchWidth.sm" :md="searchWidth.md">
          <v-text-field
            :model-value="search"
            @update:model-value="$emit('update:search', $event)"
            :prepend-inner-icon="searchIcon"
            :placeholder="searchPlaceholder"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <!-- Filter Slots -->
        <slot name="filters" />

        <!-- Right Side: View Toggle + Actions -->
        <v-col cols="12" :md="actionsWidth" class="d-flex justify-end align-center gap-2 flex-wrap">
          <!-- Quick Filters Slot -->
          <slot name="quick-filters" />

          <!-- View Mode Toggle -->
          <v-btn-toggle
            v-if="showViewToggle"
            :model-value="viewMode"
            @update:model-value="$emit('update:viewMode', $event)"
            mandatory
            density="compact"
            color="primary"
          >
            <v-btn :value="tableValue" size="small">
              <v-icon size="18">mdi-table</v-icon>
            </v-btn>
            <v-btn :value="gridValue" size="small">
              <v-icon size="18">mdi-view-grid</v-icon>
            </v-btn>
          </v-btn-toggle>

          <!-- Refresh Button -->
          <v-btn
            v-if="showRefresh"
            icon="mdi-refresh"
            size="small"
            variant="text"
            :loading="loading"
            @click="$emit('refresh')"
          />

          <!-- Additional Actions Slot -->
          <slot name="actions" />
        </v-col>
      </v-row>

      <!-- Additional Row for Extra Filters -->
      <slot name="extra-filters" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  search?: string
  searchPlaceholder?: string
  searchIcon?: string
  viewMode?: string
  showViewToggle?: boolean
  showRefresh?: boolean
  loading?: boolean
  tableValue?: string
  gridValue?: string
}

withDefaults(defineProps<Props>(), {
  search: '',
  searchPlaceholder: 'Search...',
  searchIcon: 'mdi-magnify',
  showViewToggle: false,
  showRefresh: true,
  loading: false,
  tableValue: 'table',
  gridValue: 'grid'
})

defineEmits<{
  'update:search': [value: string]
  'update:viewMode': [value: string]
  refresh: []
}>()

// Compute widths based on content
const searchWidth = computed(() => ({
  sm: 6,
  md: 4
}))

const actionsWidth = computed(() => 4)
</script>

<style scoped>
.page-toolbar {
  border-color: rgba(0, 0, 0, 0.08);
}
</style>
