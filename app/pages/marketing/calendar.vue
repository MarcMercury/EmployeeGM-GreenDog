<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Marketing Calendar</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'Visualize your events and campaigns' : 'View upcoming events and campaigns' }}
        </p>
      </div>
      <div class="d-flex gap-2">
        <!-- View Toggle -->
        <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
          <v-btn value="month" size="small">
            <v-icon start size="18">mdi-calendar-month</v-icon>
            Month
          </v-btn>
          <v-btn value="week" size="small">
            <v-icon start size="18">mdi-calendar-week</v-icon>
            Week
          </v-btn>
        </v-btn-toggle>
        <template v-if="isAdmin">
          <v-btn variant="outlined" :to="'/growth/events'" prepend-icon="mdi-format-list-bulleted">
            List View
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-plus" :to="'/growth/events'" @click.prevent="createEventRedirect">
            Create Event
          </v-btn>
        </template>
      </div>
    </div>

    <!-- Calendar Navigation -->
    <v-card rounded="lg" class="mb-6">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between">
          <v-btn icon="mdi-chevron-left" variant="text" aria-label="Previous" @click="viewMode === 'month' ? previousMonth() : previousWeek()" />
          <div class="text-center">
            <h2 class="text-h5 font-weight-bold">{{ viewMode === 'month' ? currentMonthYear : currentWeekRange }}</h2>
            <v-btn variant="text" size="small" color="primary" @click="goToToday" class="mt-1">
              Today
            </v-btn>
          </div>
          <v-btn icon="mdi-chevron-right" variant="text" aria-label="Next" @click="viewMode === 'month' ? nextMonth() : nextWeek()" />
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Month View Calendar Grid -->
    <v-card v-else-if="viewMode === 'month'" rounded="lg">
      <!-- Day Headers -->
      <div class="calendar-header d-flex border-b">
        <div 
          v-for="day in weekDays" 
          :key="day" 
          class="calendar-header-cell flex-grow-1 text-center py-3 text-overline text-grey"
        >
          {{ day }}
        </div>
      </div>

      <!-- Calendar Weeks -->
      <div class="calendar-body">
        <div 
          v-for="(week, weekIndex) in calendarWeeks" 
          :key="weekIndex" 
          class="calendar-week d-flex border-b"
        >
          <template v-for="(day, dayIndex) in week" :key="`${weekIndex}-${dayIndex}`">
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
                    <v-chip
                      v-if="day.isToday"
                      color="primary"
                      size="x-small"
                      label
                    >
                      Today
                    </v-chip>
                  </div>

                  <!-- Events for this day -->
                  <div class="calendar-events" @click.stop>
                    <!-- Notes for this day -->
                    <div
                      v-for="note in getNotesForDate(day.date)"
                      :key="'note-' + note.id"
                      class="calendar-note mb-1 pa-1 rounded cursor-pointer"
                      :class="`bg-${note.color}-lighten-4 text-${note.color}-darken-3`"
                      @click.stop="openNoteDialog(day.date, note)"
                    >
                      <div class="d-flex align-center gap-1">
                        <v-icon size="10">mdi-note</v-icon>
                        <span class="text-caption font-weight-medium text-truncate">
                          {{ note.title }}
                        </span>
                      </div>
                    </div>
                    <!-- Events for this day -->
                    <div
                      v-for="event in getEventsForDate(day.date)"
                      :key="event.id"
                      class="calendar-event mb-1 pa-1 rounded"
                      :class="[getEventClass(event), { 'cursor-pointer': true }]"
                      @click.stop="openEventDrawer(event)"
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
                  @click="createEventOnDate(day.date)"
                />
                <v-list-item
                  prepend-icon="mdi-school"
                  title="CE Event"
                  subtitle="Continuing education event"
                  @click="createCEEventOnDate(day.date)"
                />
                <v-divider class="my-1" />
                <v-list-item
                  prepend-icon="mdi-note-plus"
                  title="Add Note"
                  subtitle="Add a colored note to this date"
                  @click="openNoteDialog(day.date)"
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
                <v-chip
                  v-if="day.isToday"
                  color="primary"
                  size="x-small"
                  label
                >
                  Today
                </v-chip>
              </div>

              <!-- Events for this day -->
              <div class="calendar-events">
                <!-- Notes for this day -->
                <div
                  v-for="note in getNotesForDate(day.date)"
                  :key="'note-' + note.id"
                  class="calendar-note mb-1 pa-1 rounded cursor-pointer"
                  :class="`bg-${note.color}-lighten-4 text-${note.color}-darken-3`"
                  @click="openNoteDialog(day.date, note)"
                >
                  <div class="d-flex align-center gap-1">
                    <v-icon size="10">mdi-note</v-icon>
                    <span class="text-caption font-weight-medium text-truncate">
                      {{ note.title }}
                    </span>
                  </div>
                </div>
                <!-- Events for this day -->
                <div
                  v-for="event in getEventsForDate(day.date)"
                  :key="event.id"
                  class="calendar-event mb-1 pa-1 rounded"
                  :class="[getEventClass(event), { 'cursor-pointer': true }]"
                  @click="openEventDrawer(event)"
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
        </div>
      </div>
    </v-card>

    <!-- Week View Calendar Grid -->
    <v-card v-else rounded="lg">
      <!-- Day Headers with Dates and Create Event Menu -->
      <div class="calendar-header d-flex border-b">
        <div 
          v-for="day in currentWeekDays" 
          :key="day.date.toISOString()" 
          class="calendar-header-cell flex-grow-1 text-center py-3"
          :class="{ 'bg-primary-lighten-5': day.isToday }"
          style="width: 14.28%;"
        >
          <div class="text-overline text-grey">{{ weekDays[day.date.getDay()] }}</div>
          <v-menu v-if="hasCreateAccess" location="bottom center">
            <template #activator="{ props: menuProps }">
              <div 
                v-bind="menuProps"
                class="text-h6 font-weight-bold day-number-clickable"
                :class="{ 'text-primary': day.isToday }"
              >
                {{ day.date.getDate() }}
              </div>
            </template>
            <v-list density="compact" class="create-event-menu">
              <v-list-subheader>Create on {{ formatShortDate(day.date) }}</v-list-subheader>
              <v-list-item
                prepend-icon="mdi-calendar-plus"
                title="Marketing Event"
                subtitle="Street fair, open house, etc."
                @click="createEventOnDate(day.date)"
              />
              <v-list-item
                prepend-icon="mdi-school"
                title="CE Event"
                subtitle="Continuing education event"
                @click="createCEEventOnDate(day.date)"
              />
              <v-divider class="my-1" />
              <v-list-item
                prepend-icon="mdi-note-plus"
                title="Add Note"
                subtitle="Add a colored note to this date"
                @click="openNoteDialog(day.date)"
              />
            </v-list>
          </v-menu>
          <div 
            v-else
            class="text-h6 font-weight-bold"
            :class="{ 'text-primary': day.isToday }"
          >
            {{ day.date.getDate() }}
          </div>
        </div>
      </div>

      <!-- Week Day Columns -->
      <div class="calendar-body d-flex min-h-400">
        <div 
          v-for="day in currentWeekDays" 
          :key="day.date.toISOString()" 
          class="calendar-day flex-grow-1 pa-2 border-e"
          :class="{ 'bg-primary-lighten-5': day.isToday }"
          style="width: 14.28%;"
        >
          <!-- Events and Notes for this day -->
          <div class="calendar-events">
            <!-- Notes for this day -->
            <div
              v-for="note in getNotesForDate(day.date)"
              :key="'note-' + note.id"
              class="calendar-note mb-2 pa-2 rounded cursor-pointer"
              :class="`bg-${note.color}-lighten-4 text-${note.color}-darken-3`"
              @click="openNoteDialog(day.date, note)"
            >
              <div class="d-flex align-center gap-1 mb-1">
                <v-icon size="14">mdi-note</v-icon>
                <span class="text-caption font-weight-bold text-truncate">
                  {{ note.title }}
                </span>
              </div>
              <div v-if="note.content" class="text-caption opacity-80 text-truncate">
                {{ note.content }}
              </div>
            </div>
            <!-- Events for this day -->
            <div
              v-for="event in getEventsForDate(day.date)"
              :key="event.id"
              class="calendar-event mb-2 pa-2 rounded"
              :class="[getEventClass(event), { 'cursor-pointer': true }]"
              @click="openEventDrawer(event)"
            >
              <div class="text-caption font-weight-bold text-truncate mb-1">
                {{ event.name }}
              </div>
              <div v-if="event.start_time" class="text-caption opacity-80">
                <v-icon size="12">mdi-clock-outline</v-icon>
                {{ formatTime(event.start_time) }}
                <template v-if="event.end_time"> - {{ formatTime(event.end_time) }}</template>
              </div>
              <div v-if="event.location" class="text-caption opacity-80 mt-1">
                <v-icon size="12">mdi-map-marker</v-icon>
                {{ event.location }}
              </div>
            </div>
            
            <!-- Empty state for day -->
            <div 
              v-if="getEventsForDate(day.date).length === 0 && getNotesForDate(day.date).length === 0" 
              class="text-center text-grey-lighten-1 py-8"
            >
              <v-icon size="24" color="grey-lighten-2">mdi-calendar-blank</v-icon>
              <div class="text-caption mt-1">No events</div>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Legend -->
    <v-card rounded="lg" class="mt-4">
      <v-card-text class="d-flex align-center gap-4 flex-wrap">
        <span class="text-caption text-grey mr-2">Legend:</span>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-info"></div>
          <span class="text-caption">Planned</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-success"></div>
          <span class="text-caption">Confirmed</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-grey"></div>
          <span class="text-caption">Completed</span>
        </div>
        <div class="d-flex align-center gap-2">
          <div class="legend-dot bg-error"></div>
          <span class="text-caption">Cancelled</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Event Quick View Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      location="right"
      width="400"
      temporary
    >
      <template v-if="selectedEvent">
        <v-toolbar color="primary">
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="drawer = false" />
          <v-toolbar-title>Event Details</v-toolbar-title>
          <v-spacer />
          <v-btn 
            v-if="isAdmin"
            icon="mdi-arrow-right" 
            variant="text" 
            :to="`/growth/events`" 
            title="Go to Events"
          />
        </v-toolbar>

        <div class="pa-4">
          <h2 class="text-h5 font-weight-bold mb-2">{{ selectedEvent.name }}</h2>
          
          <v-chip 
            :color="getStatusColor(selectedEvent.status)" 
            size="small" 
            label 
            class="mb-4"
          >
            {{ formatStatus(selectedEvent.status) }}
          </v-chip>

          <v-list density="compact" class="bg-transparent">
            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-calendar</v-icon>
              </template>
              <v-list-item-title>{{ formatDate(selectedEvent.event_date) }}</v-list-item-title>
              <v-list-item-subtitle v-if="selectedEvent.start_time">
                {{ selectedEvent.start_time }} - {{ selectedEvent.end_time || 'TBD' }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.location">
              <template #prepend>
                <v-icon color="primary">mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.location }}</v-list-item-title>
            </v-list-item>

            <v-list-item v-if="selectedEvent.description">
              <template #prepend>
                <v-icon color="primary">mdi-text</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.description }}</v-list-item-title>
            </v-list-item>

            <v-list-item>
              <template #prepend>
                <v-icon color="primary">mdi-account-group</v-icon>
              </template>
              <v-list-item-title>Staffing</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip 
                  :color="selectedEvent.staffing_status === 'confirmed' ? 'success' : 'warning'" 
                  size="x-small"
                  label
                >
                  {{ selectedEvent.staffing_status === 'confirmed' ? 'Ready' : 'Planning' }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.staffing_needs">
              <template #prepend>
                <v-icon color="primary">mdi-account-multiple-check</v-icon>
              </template>
              <v-list-item-title>{{ selectedEvent.staffing_needs }}</v-list-item-title>
              <v-list-item-subtitle>Staff Needed</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="selectedEvent.event_type">
              <template #prepend>
                <v-icon color="primary">mdi-tag</v-icon>
              </template>
              <v-list-item-title>{{ formatEventType(selectedEvent.event_type) }}</v-list-item-title>
              <v-list-item-subtitle>Event Type</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <!-- Notes Section -->
          <div v-if="selectedEvent.notes" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-note-text</v-icon>
              NOTES
            </p>
            <p class="text-body-2">{{ selectedEvent.notes }}</p>
          </div>

          <!-- Supplies Section -->
          <div v-if="selectedEvent.supplies_needed" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-package-variant</v-icon>
              SUPPLIES
            </p>
            <p class="text-body-2">{{ selectedEvent.supplies_needed }}</p>
          </div>

          <!-- Contact Information -->
          <div v-if="selectedEvent.contact_name || selectedEvent.contact_phone || selectedEvent.contact_email" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-account-circle</v-icon>
              CONTACT
            </p>
            <v-list density="compact" class="bg-transparent">
              <v-list-item v-if="selectedEvent.contact_name" class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-account</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ selectedEvent.contact_name }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="selectedEvent.contact_phone" class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-phone</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  <a :href="'tel:' + selectedEvent.contact_phone">{{ selectedEvent.contact_phone }}</a>
                </v-list-item-title>
              </v-list-item>
              <v-list-item v-if="selectedEvent.contact_email" class="px-0">
                <template #prepend>
                  <v-icon size="18" color="grey">mdi-email</v-icon>
                </template>
                <v-list-item-title class="text-body-2">
                  <a :href="'mailto:' + selectedEvent.contact_email">{{ selectedEvent.contact_email }}</a>
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </div>

          <!-- Event Details -->
          <div v-if="selectedEvent.expected_attendance || selectedEvent.budget" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-chart-bar</v-icon>
              DETAILS
            </p>
            <div class="d-flex gap-4">
              <div v-if="selectedEvent.expected_attendance">
                <span class="text-h6 font-weight-bold">{{ selectedEvent.expected_attendance }}</span>
                <span class="text-caption text-grey d-block">Expected</span>
              </div>
              <div v-if="selectedEvent.budget">
                <span class="text-h6 font-weight-bold">${{ selectedEvent.budget }}</span>
                <span class="text-caption text-grey d-block">Budget</span>
              </div>
            </div>
          </div>

          <!-- External Links Section -->
          <div v-if="selectedEvent.external_links && selectedEvent.external_links.length > 0" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-link</v-icon>
              LINKS
            </p>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="(link, idx) in selectedEvent.external_links"
                :key="idx"
                :href="link.url"
                target="_blank"
                color="primary"
                variant="tonal"
                size="small"
              >
                <v-icon start size="14">mdi-open-in-new</v-icon>
                {{ link.title }}
              </v-chip>
            </div>
          </div>

          <!-- Registration Link -->
          <div v-if="selectedEvent.registration_link" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-ticket</v-icon>
              REGISTRATION
            </p>
            <v-btn
              :href="selectedEvent.registration_link"
              target="_blank"
              color="success"
              variant="tonal"
              size="small"
              block
            >
              <v-icon start size="16">mdi-open-in-new</v-icon>
              Registration Link
            </v-btn>
          </div>

          <!-- Attachments/Flyers Section -->
          <div v-if="selectedEvent.attachments && selectedEvent.attachments.length > 0" class="mt-4">
            <p class="text-overline text-grey mb-2">
              <v-icon size="16" class="mr-1">mdi-file-document</v-icon>
              FLYERS & ATTACHMENTS
            </p>
            <div class="d-flex flex-column gap-2">
              <v-btn
                v-for="(att, idx) in selectedEvent.attachments"
                :key="idx"
                :href="att.url"
                target="_blank"
                color="secondary"
                variant="tonal"
                size="small"
                class="justify-start"
              >
                <v-icon start size="16">{{ getAttachmentIcon(att.type || att.name) }}</v-icon>
                {{ att.name }}
                <v-spacer />
                <v-icon end size="14">mdi-download</v-icon>
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4" />

          <div v-if="isAdmin" class="d-flex flex-column gap-2">
            <v-btn 
              color="primary" 
              :to="`/growth/events`"
              prepend-icon="mdi-arrow-right"
              block
            >
              View Full Details
            </v-btn>
            <v-btn 
              color="error" 
              variant="outlined"
              prepend-icon="mdi-delete"
              :loading="deletingEvent"
              block
              @click="confirmDeleteEvent"
            >
              Delete Event
            </v-btn>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Delete Event Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          Delete Event
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            Are you sure you want to delete <strong>"{{ selectedEvent?.name }}"</strong>?
          </p>
          <v-alert type="info" variant="tonal" density="compact" class="mb-0">
            <template #text>
              <p class="text-body-2 mb-0">
                This will permanently remove the event from the calendar. 
                Any inventory allocated to this event will be restored to its original location.
              </p>
            </template>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            variant="flat"
            :loading="deletingEvent"
            @click="deleteEvent"
          >
            Delete Event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Note Dialog -->
    <v-dialog v-model="noteDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start>mdi-note-edit</v-icon>
          {{ editingNote ? 'Edit Note' : 'Add Note' }}
          <v-spacer />
          <span class="text-body-2 text-grey">{{ noteFormData.note_date }}</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="noteFormData.title"
            label="Title"
            required
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />
          <v-textarea
            v-model="noteFormData.content"
            label="Content (optional)"
            variant="outlined"
            density="comfortable"
            rows="3"
            class="mb-3"
          />
          <div class="mb-2">
            <label class="text-body-2 text-grey-darken-1 mb-2 d-block">Note Color</label>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                v-for="colorOption in noteColorOptions"
                :key="colorOption.value"
                :color="colorOption.color"
                size="small"
                :variant="noteFormData.color === colorOption.value ? 'flat' : 'tonal'"
                rounded
                @click="noteFormData.color = colorOption.value"
              >
                <v-icon v-if="noteFormData.color === colorOption.value" start size="16">mdi-check</v-icon>
                {{ colorOption.label }}
              </v-btn>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            v-if="editingNote"
            color="error"
            variant="text"
            @click="deleteNote"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="noteDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingNote" @click="saveNote">
            {{ editingNote ? 'Update' : 'Add Note' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { ExternalLink, EventAttachment, MarketingEvent, CalendarNote } from '~/types/marketing.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

// Get admin status
const { isAdmin } = useAppData()

// Permission check for creating events (admin, manager, marketing_admin, hr_admin with manage access)
const { can } = usePermissions()
const hasCreateAccess = computed(() => can('manage:marketing'))

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

const router = useRouter()
const client = useSupabaseClient()

// State
const loading = ref(true)
const events = ref<MarketingEvent[]>([])
const notes = ref<CalendarNote[]>([])
const currentDate = ref(new Date())
const drawer = ref(false)
const selectedEvent = ref<MarketingEvent | null>(null)
const viewMode = ref<'month' | 'week'>('month')

// Delete event state
const deleteDialog = ref(false)
const deletingEvent = ref(false)

// Note dialog state
const noteDialog = ref(false)
const editingNote = ref<CalendarNote | null>(null)
const savingNote = ref(false)
const noteFormData = ref({
  note_date: '',
  title: '',
  content: '',
  color: 'blue'
})

const noteColorOptions = [
  { value: 'blue', label: 'Blue', color: 'blue' },
  { value: 'green', label: 'Green', color: 'green' },
  { value: 'red', label: 'Red', color: 'red' },
  { value: 'orange', label: 'Orange', color: 'orange' },
  { value: 'purple', label: 'Purple', color: 'purple' },
  { value: 'pink', label: 'Pink', color: 'pink' },
  { value: 'teal', label: 'Teal', color: 'teal' },
  { value: 'amber', label: 'Amber', color: 'amber' },
  { value: 'grey', label: 'Grey', color: 'grey' }
]

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Computed
const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
})

// Week view: get the start of the current week (Sunday)
const currentWeekStart = computed(() => {
  const date = new Date(currentDate.value)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
})

// Week view: get all 7 days of the current week
const currentWeekDays = computed((): CalendarDay[] => {
  const days: CalendarDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    days.push({
      date,
      isCurrentMonth: date.getMonth() === currentDate.value.getMonth(),
      isToday: isToday(date)
    })
  }
  return days
})

// Week view: display range like "Dec 8 - 14, 2025"
const currentWeekRange = computed(() => {
  const start = currentWeekDays.value[0]?.date
  const end = currentWeekDays.value[6]?.date
  if (!start || !end) return ''
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const year = end.getFullYear()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
  } else {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`
  }
})

const calendarWeeks = computed((): CalendarDay[][] => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const weeks: CalendarDay[][] = []
  let currentWeek: CalendarDay[] = []
  
  // Add days from previous month to fill first week
  const firstDayOfWeek = firstDay.getDay()
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    currentWeek.push({
      date,
      isCurrentMonth: false,
      isToday: isToday(date)
    })
  }
  
  // Add days of current month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day)
    currentWeek.push({
      date,
      isCurrentMonth: true,
      isToday: isToday(date)
    })
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Fill remaining days in last week
  if (currentWeek.length > 0) {
    let nextMonthDay = 1
    while (currentWeek.length < 7) {
      const date = new Date(year, month + 1, nextMonthDay++)
      currentWeek.push({
        date,
        isCurrentMonth: false,
        isToday: isToday(date)
      })
    }
    weeks.push(currentWeek)
  }
  
  return weeks
})

// Methods
const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

const previousWeek = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    currentDate.value.getDate() - 7
  )
}

const nextWeek = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth(),
    currentDate.value.getDate() + 7
  )
}

const goToToday = () => {
  currentDate.value = new Date()
}

const getEventsForDate = (date: Date): MarketingEvent[] => {
  const dateStr = date.toISOString().split('T')[0]
  return events.value.filter(event => event.event_date === dateStr)
}

const getEventClass = (event: MarketingEvent): string => {
  const classes: Record<string, string> = {
    planned: 'bg-info text-white',
    confirmed: 'bg-success text-white',
    completed: 'bg-grey text-white',
    cancelled: 'bg-error text-white'
  }
  return classes[event.status] || 'bg-grey text-white'
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    completed: 'grey',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatEventType = (eventType: string): string => {
  const types: Record<string, string> = {
    general: 'General Event',
    ce_event: 'CE Event',
    conference: 'Conference',
    community: 'Community Event',
    training: 'Training',
    networking: 'Networking',
    trade_show: 'Trade Show',
    other: 'Other'
  }
  return types[eventType] || eventType.charAt(0).toUpperCase() + eventType.slice(1).replace(/_/g, ' ')
}

const getAttachmentIcon = (fileInfo: string): string => {
  const lower = fileInfo.toLowerCase()
  if (lower.includes('pdf')) return 'mdi-file-pdf-box'
  if (lower.includes('doc') || lower.includes('word')) return 'mdi-file-word'
  if (lower.includes('xls') || lower.includes('excel') || lower.includes('spreadsheet')) return 'mdi-file-excel'
  if (lower.includes('ppt') || lower.includes('powerpoint')) return 'mdi-file-powerpoint'
  if (lower.includes('jpg') || lower.includes('jpeg') || lower.includes('png') || lower.includes('gif') || lower.includes('image')) return 'mdi-file-image'
  if (lower.includes('flyer')) return 'mdi-newspaper-variant-outline'
  return 'mdi-file-document'
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTime = (time: string): string => {
  if (!time) return ''
  const parts = time.split(':')
  if (parts.length < 2) return time
  const hours = parts[0] || '0'
  const minutes = parts[1] || '00'
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const openEventDrawer = (event: MarketingEvent) => {
  selectedEvent.value = event
  drawer.value = true
}

const createEventRedirect = () => {
  router.push('/growth/events')
}

// Delete event functions
const confirmDeleteEvent = () => {
  deleteDialog.value = true
}

const deleteEvent = async () => {
  if (!selectedEvent.value) return
  
  deletingEvent.value = true
  try {
    // Call the database function that handles inventory restoration
    const { data, error } = await client.rpc('delete_marketing_event', {
      p_event_id: selectedEvent.value.id
    })
    
    if (error) throw error
    
    // Check the result
    if (data && data.success) {
      // Close dialogs
      deleteDialog.value = false
      drawer.value = false
      selectedEvent.value = null
      
      // Refresh events
      await fetchEvents()
      
      // Show success message (if using a notification system)
      console.log(`Event deleted. ${data.inventory_items_restored} inventory items restored.`)
    } else {
      console.error('Delete failed:', data?.error || 'Unknown error')
    }
  } catch (err) {
    console.error('Error deleting event:', err)
  } finally {
    deletingEvent.value = false
  }
}

// Format date for menu display (e.g., "Feb 3")
const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Create marketing event on specific date
const createEventOnDate = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0]
  router.push(`/growth/events?action=add&date=${dateStr}`)
}

// Create CE event on specific date
const createCEEventOnDate = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0]
  router.push(`/gdu/events/new?date=${dateStr}`)
}

// Note functions
const openNoteDialog = (date: Date, note?: CalendarNote) => {
  const dateStr = date.toISOString().split('T')[0]
  if (note) {
    editingNote.value = note
    noteFormData.value = {
      note_date: note.note_date,
      title: note.title,
      content: note.content || '',
      color: note.color
    }
  } else {
    editingNote.value = null
    noteFormData.value = {
      note_date: dateStr,
      title: '',
      content: '',
      color: 'blue'
    }
  }
  noteDialog.value = true
}

const saveNote = async () => {
  if (!noteFormData.value.title.trim()) return
  
  savingNote.value = true
  try {
    if (editingNote.value) {
      // Update existing note
      const { error } = await client
        .from('marketing_calendar_notes')
        .update({
          title: noteFormData.value.title,
          content: noteFormData.value.content || null,
          color: noteFormData.value.color
        })
        .eq('id', editingNote.value.id)
      
      if (error) throw error
    } else {
      // Create new note
      const { error } = await client
        .from('marketing_calendar_notes')
        .insert({
          note_date: noteFormData.value.note_date,
          title: noteFormData.value.title,
          content: noteFormData.value.content || null,
          color: noteFormData.value.color
        })
      
      if (error) throw error
    }
    
    noteDialog.value = false
    await fetchNotes()
  } catch (err) {
    console.error('Error saving note:', err)
  } finally {
    savingNote.value = false
  }
}

const deleteNote = async () => {
  if (!editingNote.value) return
  if (!confirm('Are you sure you want to delete this note?')) return
  
  savingNote.value = true
  try {
    const { error } = await client
      .from('marketing_calendar_notes')
      .delete()
      .eq('id', editingNote.value.id)
    
    if (error) throw error
    
    noteDialog.value = false
    await fetchNotes()
  } catch (err) {
    console.error('Error deleting note:', err)
  } finally {
    savingNote.value = false
  }
}

const getNotesForDate = (date: Date): CalendarNote[] => {
  const dateStr = date.toISOString().split('T')[0]
  return notes.value.filter(n => n.note_date === dateStr)
}

const fetchNotes = async () => {
  try {
    const { data, error } = await client
      .from('marketing_calendar_notes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error
    notes.value = data || []
  } catch (err) {
    console.error('Error fetching notes:', err)
  }
}

// Fetch events
const fetchEvents = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('marketing_events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) throw error
    events.value = data || []
  } catch (err) {
    console.error('Error fetching events:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
  fetchNotes()
})
</script>

<style scoped>
.calendar-header-cell {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-header-cell:last-child {
  border-right: none;
}

.calendar-day {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.calendar-day:last-child {
  border-right: none;
}

.calendar-week:last-child {
  border-bottom: none;
}

.calendar-event {
  font-size: 11px;
  line-height: 1.2;
}

.calendar-event:hover {
  opacity: 0.9;
  transform: scale(1.02);
  transition: all 0.15s ease;
}

.calendar-note {
  font-size: 11px;
  line-height: 1.2;
  border-left: 3px solid currentColor;
}

.calendar-note:hover {
  opacity: 0.85;
  transform: scale(1.02);
  transition: all 0.15s ease;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

/* Clickable day cell styling - entire cell is clickable */
.day-cell-clickable {
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid transparent;
}

.day-cell-clickable:hover {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: inset 0 0 0 2px rgba(var(--v-theme-primary), 0.1);
}

/* Clickable day number styling */
.day-number-clickable {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.day-number-clickable:hover {
  background-color: rgba(var(--v-theme-primary), 0.15);
}

.create-event-menu {
  min-width: 220px;
}
</style>
