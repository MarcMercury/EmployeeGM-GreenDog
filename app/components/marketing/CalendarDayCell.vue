<script setup lang="ts">
import type { MarketingEvent, CalendarNote } from '~/types/marketing.types'

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

const props = defineProps<{
  day: CalendarDay
  notes: CalendarNote[]
  events: MarketingEvent[]
  hasCreateAccess: boolean
  getEventClass: (event: MarketingEvent) => string
}>()

const emit = defineEmits<{
  'create-event': [date: Date]
  'create-ce-event': [date: Date]
  'open-note': [date: Date, note?: CalendarNote]
  'open-event': [event: MarketingEvent]
}>()
</script>

<template>
  <!-- Clickable day cell with menu for users with create access -->
  <v-menu v-if="hasCreateAccess" location="bottom start">
    <template #activator="{ props: menuProps }">
      <div
        v-bind="menuProps"
        class="calendar-day flex-grow-1 pa-2 cursor-pointer day-cell-clickable"
        :class="{
          'bg-grey-lighten-4': !day.isCurrentMonth,
          'bg-primary-lighten-5': day.isToday
        }"
        style="min-height: 120px; width: 14.28%;"
      >
        <!-- Day Number -->
        <div class="d-flex justify-space-between align-center mb-1">
          <span
            class="text-caption font-weight-medium"
            :class="{
              'text-grey': !day.isCurrentMonth,
              'text-primary font-weight-bold': day.isToday
            }"
          >
            {{ day.date.getDate() }}
          </span>
          <v-chip v-if="day.isToday" color="primary" size="x-small" label>
            Today
          </v-chip>
        </div>

        <!-- Events & Notes -->
        <div class="calendar-events" @click.stop>
          <div
            v-for="note in notes"
            :key="'note-' + note.id"
            class="calendar-note mb-1 pa-1 rounded cursor-pointer"
            :class="`bg-${note.color}-lighten-4 text-${note.color}-darken-3`"
            @click.stop="emit('open-note', day.date, note)"
          >
            <div class="d-flex align-center gap-1">
              <v-icon size="10">mdi-note</v-icon>
              <span class="text-caption font-weight-medium text-truncate">
                {{ note.title }}
              </span>
            </div>
          </div>

          <div
            v-for="event in events"
            :key="event.id"
            class="calendar-event mb-1 pa-1 rounded cursor-pointer"
            :class="getEventClass(event)"
            @click.stop="emit('open-event', event)"
          >
            <div class="d-flex align-center gap-1">
              <span class="text-caption font-weight-medium text-truncate">
                {{ event.name }}
              </span>
            </div>
            <div v-if="event.start_time" class="text-caption opacity-70">
              {{ formatTime(event.start_time) }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <v-list density="compact" class="create-event-menu">
      <v-list-subheader>Create on {{ formatShortDate(day.date) }}</v-list-subheader>
      <v-list-item
        prepend-icon="mdi-calendar-plus"
        title="Marketing Event"
        subtitle="Street fair, open house, etc."
        @click="emit('create-event', day.date)"
      />
      <v-list-item
        prepend-icon="mdi-school"
        title="CE Event"
        subtitle="Continuing education event"
        @click="emit('create-ce-event', day.date)"
      />
      <v-divider class="my-1" />
      <v-list-item
        prepend-icon="mdi-note-plus"
        title="Add Note"
        subtitle="Add a colored note to this date"
        @click="emit('open-note', day.date)"
      />
    </v-list>
  </v-menu>

  <!-- Non-clickable version for users without create access -->
  <div
    v-else
    class="calendar-day flex-grow-1 pa-2"
    :class="{
      'bg-grey-lighten-4': !day.isCurrentMonth,
      'bg-primary-lighten-5': day.isToday
    }"
    style="min-height: 120px; width: 14.28%;"
  >
    <div class="d-flex justify-space-between align-center mb-1">
      <span
        class="text-caption font-weight-medium"
        :class="{
          'text-grey': !day.isCurrentMonth,
          'text-primary font-weight-bold': day.isToday
        }"
      >
        {{ day.date.getDate() }}
      </span>
      <v-chip v-if="day.isToday" color="primary" size="x-small" label>
        Today
      </v-chip>
    </div>

    <div class="calendar-events">
      <div
        v-for="note in notes"
        :key="'note-' + note.id"
        class="calendar-note mb-1 pa-1 rounded cursor-pointer"
        :class="`bg-${note.color}-lighten-4 text-${note.color}-darken-3`"
        @click="emit('open-note', day.date, note)"
      >
        <div class="d-flex align-center gap-1">
          <v-icon size="10">mdi-note</v-icon>
          <span class="text-caption font-weight-medium text-truncate">
            {{ note.title }}
          </span>
        </div>
      </div>

      <div
        v-for="event in events"
        :key="event.id"
        class="calendar-event mb-1 pa-1 rounded cursor-pointer"
        :class="getEventClass(event)"
        @click="emit('open-event', event)"
      >
        <div class="d-flex align-center gap-1">
          <span class="text-caption font-weight-medium text-truncate">
            {{ event.name }}
          </span>
        </div>
        <div v-if="event.start_time" class="text-caption opacity-70">
          {{ formatTime(event.start_time) }}
        </div>
      </div>
    </div>
  </div>
</template>
