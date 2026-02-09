<template>
  <div>
    <!-- Internal Admin Notes -->
    <v-row v-if="employee.notes_internal" class="mb-4">
      <v-col cols="12">
        <v-card class="bg-amber-lighten-5 shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="amber-darken-2">mdi-note-alert</v-icon>
            Internal Admin Notes
            <v-chip size="x-small" variant="tonal" color="amber-darken-2" class="ml-2">
              Admin Only
            </v-chip>
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-0" style="white-space: pre-wrap;">{{ employee.notes_internal }}</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Notes Section -->
      <v-col cols="12" md="6">
        <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="primary">mdi-note-text</v-icon>
            HR Notes
            <v-spacer />
            <v-btn 
              v-if="isAdmin" 
              icon="mdi-plus" 
              size="x-small" 
              variant="tonal"
              color="primary"
              @click="emit('open-note-dialog')"
            />
          </v-card-title>
          <v-card-text v-if="notes.length > 0" style="max-height: 500px; overflow-y: auto;">
            <v-timeline density="compact" side="end">
              <v-timeline-item
                v-for="note in notes"
                :key="note.id"
                :dot-color="note.visibility === 'private' ? 'grey' : 'primary'"
                size="x-small"
              >
                <template #opposite>
                  <span class="text-caption text-grey">
                    {{ formatDate(note.created_at) }}
                  </span>
                </template>
                <v-card variant="tonal" class="pa-3">
                  <div class="d-flex align-center mb-2">
                    <span class="text-body-2 font-weight-medium">
                      {{ note.author?.preferred_name || note.author?.first_name || 'System' }}
                      {{ note.author?.last_name?.charAt(0) || '' }}.
                    </span>
                    <v-chip 
                      v-if="note.visibility === 'private'" 
                      size="x-small" 
                      variant="outlined" 
                      color="grey" 
                      class="ml-2"
                    >
                      <v-icon start size="10">mdi-lock</v-icon>
                      Private
                    </v-chip>
                  </div>
                  <p class="text-body-2 mb-0">{{ note.note }}</p>
                </v-card>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-2">mdi-note-off-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">No notes on file</p>
            <v-btn 
              v-if="isAdmin" 
              variant="tonal" 
              color="primary" 
              size="small" 
              class="mt-2"
              @click="emit('open-note-dialog')"
            >
              <v-icon start>mdi-plus</v-icon>
              Add First Note
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Audit Log / Activity Timeline -->
      <v-col cols="12" md="6">
        <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
          <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
            <v-icon start size="20" color="info">mdi-history</v-icon>
            Activity Log
            <v-spacer />
            <v-chip size="x-small" variant="tonal" color="info">
              Last 50
            </v-chip>
          </v-card-title>
          <v-card-text v-if="auditLogs.length > 0" style="max-height: 500px; overflow-y: auto;">
            <v-list density="compact" class="bg-transparent">
              <v-list-item
                v-for="log in auditLogs"
                :key="log.id"
                class="px-0 mb-2"
              >
                <template #prepend>
                  <v-avatar size="28" :color="getActionColor(log.action)" variant="tonal">
                    <v-icon size="14">{{ getActionIcon(log.action) }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">
                  <span class="font-weight-medium text-capitalize">{{ log.action?.toLowerCase() }}</span>
                  <span v-if="log.entity_type" class="text-grey"> • {{ log.entity_type }}</span>
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ log.actor?.email || 'System' }} • {{ formatDate(log.occurred_at) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-text v-else class="text-center py-8">
            <v-icon size="48" color="grey-lighten-2">mdi-history</v-icon>
            <p class="text-body-2 text-grey mt-2">No activity recorded</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/rosterFormatters'

defineProps<{
  employee: any
  notes: any[]
  auditLogs: any[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'open-note-dialog': []
}>()

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    'created': 'mdi-plus-circle', 'updated': 'mdi-pencil', 'deleted': 'mdi-delete',
    'INSERT': 'mdi-plus-circle', 'UPDATE': 'mdi-pencil', 'DELETE': 'mdi-delete',
    'note_added': 'mdi-note-plus', 'document_uploaded': 'mdi-file-upload',
    'asset_assigned': 'mdi-package-variant-plus', 'asset_returned': 'mdi-package-variant-closed'
  }
  return icons[action] || 'mdi-information'
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    'created': 'success', 'updated': 'info', 'deleted': 'error',
    'INSERT': 'success', 'UPDATE': 'info', 'DELETE': 'error',
    'note_added': 'primary', 'document_uploaded': 'teal',
    'asset_assigned': 'warning', 'asset_returned': 'success'
  }
  return colors[action] || 'grey'
}
</script>
