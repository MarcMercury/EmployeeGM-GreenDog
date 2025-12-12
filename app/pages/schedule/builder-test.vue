<script setup lang="ts">
/**
 * Schedule Builder Test - Minimal version
 */
definePageMeta({
  middleware: ['auth', 'admin-only'],
  layout: 'default'
})

const { employees, locations, isAdmin } = useAppData()

console.log('[ScheduleBuilderTest] Loaded')
console.log('[ScheduleBuilderTest] isAdmin:', isAdmin.value)
console.log('[ScheduleBuilderTest] employees:', employees.value?.length)
console.log('[ScheduleBuilderTest] locations:', locations.value?.length)
</script>

<template>
  <div class="pa-6">
    <h1 class="text-h4 mb-4">Schedule Builder Test</h1>
    
    <v-alert type="info" class="mb-4">
      This is a test page to diagnose the blank page issue.
    </v-alert>
    
    <v-card class="pa-4 mb-4">
      <h3>Debug Info:</h3>
      <ul>
        <li>isAdmin: {{ isAdmin }}</li>
        <li>Employees count: {{ employees?.length || 0 }}</li>
        <li>Locations count: {{ locations?.length || 0 }}</li>
      </ul>
    </v-card>
    
    <v-card class="pa-4">
      <h3>Locations:</h3>
      <v-chip v-for="loc in locations" :key="loc.id" class="ma-1">
        {{ loc.name }}
      </v-chip>
    </v-card>
  </div>
</template>
