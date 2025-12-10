<template>
  <v-list v-if="feedback.length > 0" :class="{ 'compact-list': compact }">
    <v-list-item
      v-for="item in feedback"
      :key="item.id"
      :class="{ 'mb-2': !compact }"
      class="feedback-item"
    >
      <template #prepend>
        <v-avatar :color="getTypeColor(item.type)" :size="compact ? 32 : 40">
          <v-icon :size="compact ? 16 : 20" color="white">
            {{ getTypeIcon(item.type) }}
          </v-icon>
        </v-avatar>
      </template>

      <v-list-item-title class="d-flex align-center gap-2">
        <span :class="compact ? 'text-body-2' : 'text-subtitle-2'">
          {{ getFullName(item.from_employee) }}
        </span>
        <v-chip
          v-if="item.type"
          size="x-small"
          :color="getTypeColor(item.type)"
          variant="tonal"
        >
          {{ item.type }}
        </v-chip>
        <v-chip
          v-if="item.is_public"
          size="x-small"
          color="primary"
          variant="outlined"
        >
          <v-icon start size="10">mdi-eye</v-icon>
          Visible
        </v-chip>
      </v-list-item-title>

      <v-list-item-subtitle>
        <p :class="compact ? 'text-caption' : 'text-body-2'" class="feedback-message">
          {{ item.message }}
        </p>
        <span class="text-caption text-grey">
          {{ formatDate(item.created_at) }}
        </span>
      </v-list-item-subtitle>
    </v-list-item>
  </v-list>

  <v-alert v-else type="info" variant="tonal" density="compact">
    No feedback to display
  </v-alert>
</template>

<script setup lang="ts">
import type { Feedback } from '~/stores/performance'

defineProps<{
  feedback: Feedback[]
  compact?: boolean
}>()

function getFullName(employee?: { first_name: string; last_name: string }): string {
  if (!employee) return 'Anonymous'
  return `${employee.first_name} ${employee.last_name}`
}

function getTypeColor(type: string | null): string {
  switch (type) {
    case 'praise': return 'success'
    case 'recognition': return 'primary'
    case 'suggestion': return 'info'
    case 'concern': return 'warning'
    default: return 'grey'
  }
}

function getTypeIcon(type: string | null): string {
  switch (type) {
    case 'praise': return 'mdi-thumb-up'
    case 'recognition': return 'mdi-star'
    case 'suggestion': return 'mdi-lightbulb'
    case 'concern': return 'mdi-alert-circle'
    default: return 'mdi-message-text'
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
</script>

<style scoped>
.feedback-item {
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.feedback-message {
  white-space: pre-wrap;
  margin-bottom: 4px;
}

.compact-list .feedback-item {
  padding: 8px 12px;
}
</style>
