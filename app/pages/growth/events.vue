<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Marketing Events</h1>
        <p class="text-body-1 text-grey-darken-1">
          Plan and manage your marketing events
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-file-import" size="small" @click="showImportWizard = true">
          Import
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-file-export" size="small" @click="showExportDialog = true">
          Export
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          Create Event
        </v-btn>
      </div>
    </div>

    <!-- Import Wizard -->
    <SharedCrmImportWizard
      v-model="showImportWizard"
      entity-label="Events"
      table-name="marketing_events"
      duplicate-check-field="name"
      :entity-fields="eventImportFields"
      @imported="fetchEvents"
    />

    <!-- Export Dialog -->
    <SharedCrmExportDialog
      v-model="showExportDialog"
      entity-label="Events"
      :columns="eventExportColumns"
      :data="filteredEvents"
      filename="events_export"
    />

    <!-- Stats -->
    <UiStatsRow
      :stats="[
        { value: filteredEvents.length, label: 'Filtered', color: 'primary' },
        { value: upcomingCount, label: 'Upcoming', color: 'warning' },
        { value: confirmedCount, label: 'Confirmed', color: 'success' },
        { value: totalLeads, label: 'Total Leads', color: 'secondary' }
      ]"
      layout="4-col"
    />

    <!-- Filters -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text class="py-3">
        <v-row align="center" dense>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="searchQuery"
              placeholder="Search events..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterType"
              :items="eventTypeOptions"
              label="Type"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterStatus"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filterYear"
              :items="yearOptions"
              label="Year"
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="6" md="3">
            <v-btn-toggle v-model="filterTimeframe" density="compact" variant="outlined">
              <v-btn value="all" size="small">All</v-btn>
              <v-btn value="upcoming" size="small" color="warning">Upcoming</v-btn>
              <v-btn value="past" size="small" color="grey">Past</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Event List -->
    <v-card rounded="lg">
      <v-data-table
        :headers="headers"
        :items="filteredEvents"
        :loading="loading"
        hover
        @click:row="(_, { item }) => openDrawer(item)"
      >
        <template #item.event_date="{ item }">
          <div class="d-flex align-center">
            <v-chip
              v-if="isToday(item.event_date)"
              color="success"
              size="small"
              label
              class="mr-2"
            >
              Today
            </v-chip>
            <v-chip
              v-else-if="isUpcoming(item.event_date)"
              color="warning"
              size="small"
              label
              class="mr-2"
            >
              Upcoming
            </v-chip>
            <span>{{ formatDate(item.event_date) }}</span>
          </div>
        </template>

        <template #item.name="{ item }">
          <span class="font-weight-bold">{{ item.name }}</span>
        </template>

        <template #item.event_type="{ item }">
          <v-chip size="small" variant="tonal" :color="getEventTypeColor(item.event_type)">
            {{ formatEventType(item.event_type) }}
          </v-chip>
        </template>

        <template #item.location="{ item }">
          <div class="d-flex align-center">
            <v-icon size="16" color="grey" class="mr-1">mdi-map-marker</v-icon>
            {{ item.location || 'TBD' }}
          </div>
        </template>

        <template #item.staffing_status="{ item }">
          <v-chip
            :color="item.staffing_status === 'confirmed' ? 'success' : 'warning'"
            size="small"
            label
          >
            {{ item.staffing_status === 'confirmed' ? 'Ready' : 'Planning' }}
          </v-chip>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" label>
            {{ formatStatus(item.status) }}
          </v-chip>
        </template>

        <template #item.leads="{ item }">
          <v-chip color="secondary" size="small" variant="tonal">
            {{ getLeadCount(item.id) }} leads
          </v-chip>
        </template>

        <template #no-data>
          <div class="text-center py-12">
            <v-icon size="64" color="grey-lighten-1">mdi-calendar-star</v-icon>
            <h3 class="text-h6 mt-4">No events yet</h3>
            <p class="text-grey mb-4">Create your first marketing event</p>
            <v-btn color="primary" @click="openCreateDialog">Create Event</v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Event Profile Dialog (Full-Featured) -->
    <v-dialog v-model="drawer" max-width="900" scrollable>
      <v-card v-if="selectedEvent" rounded="lg">
        <!-- Header with Event Type & Status -->
        <v-card-title class="bg-primary text-white py-4 d-flex align-center">
          <v-avatar :color="getEventTypeColor(selectedEvent.event_type || 'general')" class="mr-3">
            <v-icon>mdi-calendar-star</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="text-h5 font-weight-bold">{{ selectedEvent.name }}</div>
            <div class="text-caption opacity-80">
              {{ formatDate(selectedEvent.event_date) }} • {{ selectedEvent.location || 'Location TBD' }}
            </div>
          </div>
          <v-chip :color="getStatusColor(selectedEvent.status)" variant="elevated" class="mr-2">
            {{ formatStatus(selectedEvent.status) }}
          </v-chip>
          <v-btn icon variant="text" @click="drawer = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <!-- Tabs for organized content -->
        <v-tabs v-model="eventProfileTab" bg-color="grey-lighten-4">
          <v-tab value="details">
            <v-icon start>mdi-information</v-icon>
            Details
          </v-tab>
          <v-tab value="stats">
            <v-icon start>mdi-chart-bar</v-icon>
            Stats & Performance
          </v-tab>
          <v-tab value="leads">
            <v-icon start>mdi-account-multiple-plus</v-icon>
            Leads
            <v-badge v-if="getLeadCount(selectedEvent.id) > 0" :content="getLeadCount(selectedEvent.id)" color="secondary" inline class="ml-1" />
          </v-tab>
          <v-tab value="qrcode">
            <v-icon start>mdi-qrcode</v-icon>
            QR Code
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text style="min-height: 450px; max-height: 60vh; overflow-y: auto;">
          <v-tabs-window v-model="eventProfileTab">
            <!-- DETAILS TAB -->
            <v-tabs-window-item value="details">
              <v-row>
                <!-- Left Column - Basic Info -->
                <v-col cols="12" md="6">
                  <p class="text-overline text-grey mb-2">EVENT INFORMATION</p>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item>
                      <template #prepend><v-icon color="primary">mdi-calendar</v-icon></template>
                      <v-list-item-title>{{ formatDate(selectedEvent.event_date) }}</v-list-item-title>
                      <v-list-item-subtitle>{{ selectedEvent.start_time || 'TBD' }} - {{ selectedEvent.end_time || 'TBD' }}</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend><v-icon color="primary">mdi-map-marker</v-icon></template>
                      <v-list-item-title>{{ selectedEvent.location || 'Location TBD' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend><v-icon color="primary">mdi-tag</v-icon></template>
                      <v-list-item-title>{{ formatEventType(selectedEvent.event_type || 'general') }}</v-list-item-title>
                      <v-list-item-subtitle>Event Type</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item v-if="selectedEvent.budget">
                      <template #prepend><v-icon color="primary">mdi-currency-usd</v-icon></template>
                      <v-list-item-title>${{ selectedEvent.budget.toLocaleString() }}</v-list-item-title>
                      <v-list-item-subtitle>Budget</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item v-if="selectedEvent.expected_attendance">
                      <template #prepend><v-icon color="primary">mdi-account-multiple</v-icon></template>
                      <v-list-item-title>{{ selectedEvent.expected_attendance }} expected</v-list-item-title>
                      <v-list-item-subtitle>Attendance</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>

                  <v-divider class="my-3" />

                  <p class="text-overline text-grey mb-2">CONTACT INFORMATION</p>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item v-if="selectedEvent.contact_name">
                      <template #prepend><v-icon color="primary">mdi-account</v-icon></template>
                      <v-list-item-title>{{ selectedEvent.contact_name }}</v-list-item-title>
                      <v-list-item-subtitle>Contact Person</v-list-item-subtitle>
                    </v-list-item>
                    <v-list-item v-if="selectedEvent.contact_phone">
                      <template #prepend><v-icon color="primary">mdi-phone</v-icon></template>
                      <v-list-item-title>{{ selectedEvent.contact_phone }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedEvent.contact_email">
                      <template #prepend><v-icon color="primary">mdi-email</v-icon></template>
                      <v-list-item-title>{{ selectedEvent.contact_email }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="!selectedEvent.contact_name && !selectedEvent.contact_phone && !selectedEvent.contact_email">
                      <v-list-item-title class="text-grey">No contact info added</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>

                <!-- Right Column - Planning Details -->
                <v-col cols="12" md="6">
                  <p class="text-overline text-grey mb-2">PLANNING & LOGISTICS</p>
                  
                  <v-card variant="outlined" class="mb-3">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-1">Staffing Needs</div>
                      <p class="text-body-2 mb-0">{{ selectedEvent.staffing_needs || 'Not specified' }}</p>
                      <v-chip size="x-small" :color="selectedEvent.staffing_status === 'confirmed' ? 'success' : 'warning'" class="mt-2">
                        {{ selectedEvent.staffing_status === 'confirmed' ? 'Staffing Confirmed' : 'Staffing Planned' }}
                      </v-chip>
                    </v-card-text>
                  </v-card>

                  <!-- Event Supplies Component -->
                  <GrowthEventSupplies
                    v-if="selectedEvent.id"
                    :event-id="selectedEvent.id"
                    :event-budget="selectedEvent.budget || 0"
                    class="mb-3"
                  />

                  <v-card variant="outlined" class="mb-3">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-1">Supplies Notes</div>
                      <p class="text-body-2 mb-0">{{ selectedEvent.supplies_needed || 'No additional notes' }}</p>
                    </v-card-text>
                  </v-card>

                  <v-card variant="outlined" class="mb-3">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-1">Notes</div>
                      <p class="text-body-2 mb-0">{{ selectedEvent.notes || 'No notes' }}</p>
                    </v-card-text>
                  </v-card>

                  <v-card variant="outlined" v-if="selectedEvent.description">
                    <v-card-text>
                      <div class="text-subtitle-2 mb-1">Description</div>
                      <p class="text-body-2 mb-0">{{ selectedEvent.description }}</p>
                    </v-card-text>
                  </v-card>

                  <!-- External Links -->
                  <div v-if="selectedEvent.external_links && selectedEvent.external_links.length > 0" class="mt-4">
                    <p class="text-overline text-grey mb-2">EXTERNAL LINKS</p>
                    <v-chip
                      v-for="(link, idx) in selectedEvent.external_links"
                      :key="idx"
                      :href="link.url"
                      target="_blank"
                      color="primary"
                      variant="tonal"
                      class="mr-2 mb-2"
                    >
                      <v-icon start size="16">mdi-open-in-new</v-icon>
                      {{ link.title }}
                    </v-chip>
                  </div>

                  <!-- Attachments -->
                  <div v-if="selectedEvent.attachments && selectedEvent.attachments.length > 0" class="mt-4">
                    <p class="text-overline text-grey mb-2">ATTACHMENTS</p>
                    <v-chip
                      v-for="(att, idx) in selectedEvent.attachments"
                      :key="idx"
                      :href="att.url"
                      target="_blank"
                      color="secondary"
                      variant="tonal"
                      class="mr-2 mb-2"
                    >
                      <v-icon start size="16">mdi-file-document</v-icon>
                      {{ att.name }}
                    </v-chip>
                  </div>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- STATS & PERFORMANCE TAB -->
            <v-tabs-window-item value="stats">
              <v-row>
                <!-- Stats Cards Row -->
                <v-col cols="6" md="3">
                  <v-card color="info" variant="tonal" class="text-center pa-4">
                    <v-icon size="36" color="info">mdi-account-group</v-icon>
                    <div class="text-h4 font-weight-bold mt-2">{{ selectedEvent.visitors_count || 0 }}</div>
                    <div class="text-caption">Visitors</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card color="success" variant="tonal" class="text-center pa-4">
                    <v-icon size="36" color="success">mdi-currency-usd</v-icon>
                    <div class="text-h4 font-weight-bold mt-2">${{ (selectedEvent.revenue_generated || 0).toLocaleString() }}</div>
                    <div class="text-caption">Revenue</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card color="secondary" variant="tonal" class="text-center pa-4">
                    <v-icon size="36" color="secondary">mdi-account-plus</v-icon>
                    <div class="text-h4 font-weight-bold mt-2">{{ getLeadCount(selectedEvent.id) }}</div>
                    <div class="text-caption">Leads Captured</div>
                  </v-card>
                </v-col>
                <v-col cols="6" md="3">
                  <v-card color="warning" variant="tonal" class="text-center pa-4">
                    <v-icon size="36" color="warning">mdi-package-variant</v-icon>
                    <div class="text-h4 font-weight-bold mt-2">{{ (selectedEvent.inventory_used || []).length }}</div>
                    <div class="text-caption">Inventory Items</div>
                  </v-card>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- Editable Stats Section -->
              <v-row>
                <v-col cols="12" md="6">
                  <p class="text-overline text-grey mb-3">UPDATE PERFORMANCE METRICS</p>
                  <v-text-field
                    :model-value="selectedEvent.visitors_count || 0"
                    label="Visitors Count"
                    type="number"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-account-group"
                    min="0"
                    class="mb-3"
                    @update:model-value="updateEventStat('visitors_count', Number($event))"
                  />
                  <v-text-field
                    :model-value="selectedEvent.revenue_generated || 0"
                    label="Revenue Generated"
                    type="number"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-currency-usd"
                    prefix="$"
                    min="0"
                    class="mb-3"
                    @update:model-value="updateEventStat('revenue_generated', Number($event))"
                  />
                  <v-textarea
                    :model-value="selectedEvent.post_event_notes || ''"
                    label="Post-Event Notes"
                    variant="outlined"
                    density="compact"
                    rows="3"
                    placeholder="Notes and observations from after the event..."
                    @update:model-value="updateEventStat('post_event_notes', $event)"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <p class="text-overline text-grey mb-0">INVENTORY USED</p>
                    <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="openInventoryDialog">
                      Add Item
                    </v-btn>
                  </div>
                  
                  <v-card variant="outlined">
                    <v-list v-if="selectedEvent.inventory_used && selectedEvent.inventory_used.length > 0" density="compact">
                      <v-list-item
                        v-for="(item, idx) in selectedEvent.inventory_used"
                        :key="idx"
                      >
                        <template #prepend>
                          <v-icon color="warning">mdi-package-variant</v-icon>
                        </template>
                        <v-list-item-title>{{ item.item_name }}</v-list-item-title>
                        <v-list-item-subtitle>Quantity: {{ item.quantity_used }}</v-list-item-subtitle>
                        <template #append>
                          <v-btn icon size="x-small" variant="text" color="error" @click="removeInventoryItem(idx)">
                            <v-icon size="small">mdi-delete</v-icon>
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                    <v-card-text v-else class="text-center text-grey py-8">
                      <v-icon size="48" color="grey-lighten-2">mdi-package-variant-closed</v-icon>
                      <div class="mt-2">No inventory items tracked yet</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- LEADS TAB -->
            <v-tabs-window-item value="leads">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <p class="text-h6 mb-0">Leads from this Event</p>
                  <p class="text-caption text-grey">{{ getLeadCount(selectedEvent.id) }} total leads captured</p>
                </div>
                <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddLeadDialog">
                  Add Lead Manually
                </v-btn>
              </div>

              <v-card variant="outlined">
                <v-list v-if="getEventLeads(selectedEvent.id).length > 0" lines="two">
                  <v-list-item
                    v-for="lead in getEventLeads(selectedEvent.id)"
                    :key="lead.id"
                  >
                    <template #prepend>
                      <v-avatar color="secondary" size="40">
                        <span class="text-body-2">{{ lead.lead_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ lead.lead_name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      <span v-if="lead.email">{{ lead.email }}</span>
                      <span v-if="lead.phone" class="ml-2">• {{ lead.phone }}</span>
                    </v-list-item-subtitle>
                    <template #append>
                      <v-chip :color="getLeadStatusColor(lead.status)" size="small">
                        {{ lead.status }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <v-card-text v-else class="text-center py-12">
                  <v-icon size="64" color="grey-lighten-2">mdi-account-question</v-icon>
                  <div class="text-h6 mt-4 text-grey">No leads captured yet</div>
                  <div class="text-body-2 text-grey mb-4">Share the QR code at your event to capture leads</div>
                  <v-btn color="primary" variant="tonal" @click="eventProfileTab = 'qrcode'">
                    View QR Code
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-tabs-window-item>

            <!-- QR CODE TAB -->
            <v-tabs-window-item value="qrcode">
              <v-row>
                <v-col cols="12" md="6" class="text-center">
                  <p class="text-overline text-grey mb-3">LEAD CAPTURE QR CODE</p>
                  <v-card variant="outlined" class="pa-6">
                    <div class="bg-white pa-4 rounded-lg d-inline-block">
                      <QrcodeVue 
                        :value="getLeadCaptureUrl(selectedEvent.id)"
                        :size="250"
                        level="M"
                        render-as="canvas"
                        :id="`qr-canvas-${selectedEvent.id}`"
                      />
                    </div>
                    <div class="mt-4">
                      <v-btn color="primary" prepend-icon="mdi-download" class="mr-2" @click="downloadQrCode(selectedEvent)">
                        Download
                      </v-btn>
                      <v-btn variant="outlined" prepend-icon="mdi-content-copy" @click="copyLeadCaptureUrl">
                        Copy Link
                      </v-btn>
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <p class="text-overline text-grey mb-3">LEAD CAPTURE URL</p>
                  <v-text-field
                    :model-value="getLeadCaptureUrl(selectedEvent.id)"
                    readonly
                    variant="outlined"
                    density="compact"
                    class="mb-4"
                  >
                    <template #append-inner>
                      <v-btn icon size="small" variant="text" :href="getLeadCaptureUrl(selectedEvent.id)" target="_blank">
                        <v-icon>mdi-open-in-new</v-icon>
                      </v-btn>
                    </template>
                  </v-text-field>
                  
                  <v-alert type="info" variant="tonal" class="mb-4">
                    <div class="text-subtitle-2">How to use:</div>
                    <ol class="text-body-2 mt-2 mb-0">
                      <li>Print or display the QR code at your event booth</li>
                      <li>Visitors scan the code with their phone</li>
                      <li>They fill out the lead capture form</li>
                      <li>Leads appear automatically in this event's Leads tab</li>
                    </ol>
                  </v-alert>

                  <v-card variant="outlined">
                    <v-card-text class="text-center">
                      <div class="text-h4 font-weight-bold text-secondary">{{ getLeadCount(selectedEvent.id) }}</div>
                      <div class="text-caption">Leads captured via QR code</div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn variant="text" prepend-icon="mdi-pencil" @click="drawer = false; openEditDialog()">
            Edit Event
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="drawer = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create/Edit Event Dialog -->
    <v-dialog v-model="eventDialog" max-width="800" scrollable>
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-calendar-star</v-icon>
          {{ editMode ? 'Edit Event' : 'Create Event' }}
        </v-card-title>
        <v-card-text class="pt-6" style="max-height: 70vh; overflow-y: auto;">
          <v-form ref="eventForm" v-model="formValid">
            <!-- Basic Info Section -->
            <p class="text-overline text-grey mb-2">BASIC INFORMATION</p>
            <v-row>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="eventFormData.name"
                  label="Event Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="eventFormData.event_type"
                  :items="eventTypes"
                  item-title="title"
                  item-value="value"
                  label="Event Type"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="eventFormData.description"
                  label="Description"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
            </v-row>

            <!-- Date & Time Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">DATE & LOCATION</p>
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.event_date"
                  label="Event Date *"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="4">
                <v-text-field
                  v-model="eventFormData.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="4">
                <v-text-field
                  v-model="eventFormData.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="eventFormData.location"
                  label="Location / Address"
                  prepend-inner-icon="mdi-map-marker"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Venue Contact Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">VENUE / ORGANIZER CONTACT</p>
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_name"
                  label="Contact Name"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_phone"
                  label="Contact Phone"
                  prepend-inner-icon="mdi-phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="eventFormData.contact_email"
                  label="Contact Email"
                  prepend-inner-icon="mdi-email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Staffing & Logistics Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">STAFFING & LOGISTICS</p>
            <v-row>
              <v-col cols="12" sm="6">
                <v-textarea
                  v-model="eventFormData.staffing_needs"
                  label="Staffing Needs"
                  placeholder="e.g., 2 technicians, 1 receptionist"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-textarea
                  v-model="eventFormData.supplies_needed"
                  label="Supplies & Materials"
                  placeholder="e.g., Brochures, banners, giveaways, dental models"
                  variant="outlined"
                  density="compact"
                  rows="2"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="eventFormData.budget"
                  label="Anticipated Spend ($)"
                  type="number"
                  prepend-inner-icon="mdi-currency-usd"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-text-field
                  v-model.number="eventFormData.expected_attendance"
                  label="Expected Attendance"
                  type="number"
                  prepend-inner-icon="mdi-account-group"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-select
                  v-model="eventFormData.staffing_status"
                  :items="[{ title: 'Planning', value: 'planned' }, { title: 'Confirmed', value: 'confirmed' }]"
                  item-title="title"
                  item-value="value"
                  label="Staffing Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="6" sm="3">
                <v-select
                  v-model="eventFormData.status"
                  :items="[{ title: 'Planned', value: 'planned' }, { title: 'Confirmed', value: 'confirmed' }, { title: 'Cancelled', value: 'cancelled' }, { title: 'Completed', value: 'completed' }]"
                  item-title="title"
                  item-value="value"
                  label="Event Status"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <!-- Registration Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">REGISTRATION</p>
            <v-row>
              <v-col cols="12" sm="4" class="d-flex align-center">
                <v-switch
                  v-model="eventFormData.registration_required"
                  label="Registration Required"
                  color="primary"
                  hide-details
                />
              </v-col>
              <v-col cols="12" sm="8">
                <v-text-field
                  v-model="eventFormData.registration_link"
                  label="Registration URL"
                  placeholder="https://..."
                  prepend-inner-icon="mdi-link"
                  variant="outlined"
                  density="compact"
                  :disabled="!eventFormData.registration_required"
                />
              </v-col>
            </v-row>

            <!-- Inventory Items Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">INVENTORY ITEMS TO USE</p>
            <v-row>
              <v-col cols="12">
                <v-alert v-if="inventoryItems.length === 0" type="info" variant="tonal" density="compact" class="mb-3">
                  Select inventory items to bring to this event. Quantities will be deducted from stock when the event is saved.
                </v-alert>
                
                <!-- List of selected inventory items -->
                <v-card v-for="(item, idx) in selectedInventoryItems" :key="idx" variant="outlined" class="mb-2 pa-3">
                  <v-row dense align="center">
                    <v-col cols="12" sm="5">
                      <v-autocomplete
                        v-model="item.inventory_item_id"
                        :items="inventoryItems"
                        item-title="item_name"
                        item-value="id"
                        label="Inventory Item"
                        variant="outlined"
                        density="compact"
                        hide-details
                        @update:model-value="(val) => updateSelectedItemName(idx, val)"
                      >
                        <template #item="{ item: invItem, props }">
                          <v-list-item v-bind="props">
                            <template #prepend>
                              <v-avatar size="24" :color="getCategoryColorForInventory(invItem.raw.category)">
                                <v-icon size="14" color="white">mdi-package-variant</v-icon>
                              </v-avatar>
                            </template>
                            <template #subtitle>
                              <span class="text-caption">{{ invItem.raw.category }} • Total: {{ invItem.raw.total_quantity }}</span>
                            </template>
                          </v-list-item>
                        </template>
                      </v-autocomplete>
                    </v-col>
                    <v-col cols="6" sm="2">
                      <v-text-field
                        v-model.number="item.quantity_used"
                        label="Qty"
                        type="number"
                        min="1"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="6" sm="3">
                      <v-select
                        v-model="item.location"
                        :items="locationOptions"
                        label="From Location"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" sm="2" class="d-flex justify-center">
                      <v-btn icon variant="text" size="small" color="error" @click="removeSelectedInventoryItem(idx)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
                
                <v-btn variant="tonal" color="warning" size="small" prepend-icon="mdi-plus" @click="addInventoryItemLine">
                  Add Inventory Item
                </v-btn>
              </v-col>
            </v-row>

            <!-- Notes Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">NOTES & INSTRUCTIONS</p>
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="eventFormData.notes"
                  label="Planning Notes / Special Instructions"
                  placeholder="Any special instructions, setup requirements, or important details..."
                  variant="outlined"
                  density="compact"
                  rows="3"
                />
              </v-col>
            </v-row>

            <!-- External Links Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">EXTERNAL LINKS</p>
            <v-row>
              <v-col cols="12">
                <div v-for="(link, idx) in eventFormData.external_links" :key="idx" class="d-flex gap-2 mb-2">
                  <v-text-field
                    v-model="link.title"
                    label="Link Title"
                    variant="outlined"
                    density="compact"
                    style="flex: 1;"
                    hide-details
                  />
                  <v-text-field
                    v-model="link.url"
                    label="URL"
                    placeholder="https://..."
                    prepend-inner-icon="mdi-link"
                    variant="outlined"
                    density="compact"
                    style="flex: 2;"
                    hide-details
                  />
                  <v-btn icon="mdi-delete" color="error" variant="text" @click="removeExternalLink(idx)" />
                </div>
                <v-btn variant="tonal" color="primary" size="small" prepend-icon="mdi-plus" @click="addExternalLink">
                  Add Link
                </v-btn>
              </v-col>
            </v-row>

            <!-- Attachments Section -->
            <v-divider class="my-4" />
            <p class="text-overline text-grey mb-2">ATTACHMENTS</p>
            <v-row>
              <v-col cols="12">
                <!-- Existing Attachments -->
                <div v-if="eventFormData.attachments.length > 0" class="mb-3">
                  <v-chip
                    v-for="(att, idx) in eventFormData.attachments"
                    :key="idx"
                    closable
                    class="mr-2 mb-2"
                    color="primary"
                    variant="tonal"
                    @click:close="removeAttachment(idx)"
                  >
                    <v-icon start size="16">mdi-file-document</v-icon>
                    {{ att.name }}
                  </v-chip>
                </div>
                
                <!-- File Upload -->
                <v-file-input
                  v-model="newAttachments"
                  label="Upload Documents"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  show-size
                  prepend-icon=""
                  prepend-inner-icon="mdi-paperclip"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                  hint="Supported: PDF, Word, Excel, PowerPoint, Images"
                  persistent-hint
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="eventDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="saveEvent">
            {{ editMode ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Lead Dialog -->
    <v-dialog v-model="leadDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-secondary text-white py-4">
          <v-icon start>mdi-account-plus</v-icon>
          Add Lead
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="leadForm" v-model="leadFormValid">
            <v-text-field
              v-model="leadFormData.lead_name"
              label="Name *"
              :rules="[v => !!v || 'Required']"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.email"
              label="Email"
              type="email"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-text-field
              v-model="leadFormData.phone"
              label="Phone"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="leadFormData.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="leadDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingLead" :disabled="!leadFormValid" @click="saveLead">
            Add Lead
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Inventory Item Dialog -->
    <v-dialog v-model="inventoryDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-package-variant</v-icon>
          Add Inventory Item
        </v-card-title>
        <v-card-text class="pt-6">
          <v-text-field
            v-model="inventoryItemForm.item_name"
            label="Item Name *"
            variant="outlined"
            density="compact"
            placeholder="e.g., Flyers, Brochures, Swag Bags"
            class="mb-3"
          />
          <v-text-field
            v-model.number="inventoryItemForm.quantity_used"
            label="Quantity Used"
            type="number"
            variant="outlined"
            density="compact"
            min="1"
          />
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="inventoryDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            :disabled="!inventoryItemForm.item_name.trim()"
            @click="addInventoryItem"
          >
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

interface MarketingEvent {
  id: string
  name: string
  description: string | null
  event_type: string
  event_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  staffing_needs: string | null
  supplies_needed: string | null
  budget: number | null
  expected_attendance: number | null
  staffing_status: string
  status: string
  registration_required: boolean
  registration_link: string | null
  notes: string | null
  post_event_notes: string | null
  actual_attendance: number | null
  leads_collected: number
  attachments: EventAttachment[]
  external_links: ExternalLink[]
  // Event Stats
  visitors_count: number
  revenue_generated: number
  inventory_used: InventoryUsedItem[]
}

interface InventoryUsedItem {
  item_id: string
  item_name: string
  quantity_used: number
}

// Inventory item type for selection
interface InventoryItem {
  id: string
  item_name: string
  category: string
  total_quantity: number
  quantity_venice: number
  quantity_sherman_oaks: number
  quantity_valley: number
  quantity_mpmv: number
  quantity_offsite: number
}

// Selected inventory item for event
interface SelectedInventoryItem {
  inventory_item_id: string
  item_name: string
  quantity_used: number
  location: string
}

interface EventAttachment {
  name: string
  url: string
  file_type: string
  uploaded_at: string
}

interface ExternalLink {
  title: string
  url: string
  description?: string
}

interface Lead {
  id: string
  event_id: string | null
  lead_name: string
  email: string | null
  phone: string | null
  status: string
  notes: string | null
}

const client = useSupabaseClient()

// State
const events = ref<MarketingEvent[]>([])
const leads = ref<Lead[]>([])
const loading = ref(true)
const saving = ref(false)
const savingLead = ref(false)
const drawer = ref(false)
const selectedEvent = ref<MarketingEvent | null>(null)
const eventDialog = ref(false)
const leadDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)
const leadFormValid = ref(false)
const eventProfileTab = ref('details')
const showImportWizard = ref(false)
const showExportDialog = ref(false)

// Inventory selection state
const inventoryItems = ref<InventoryItem[]>([])
const selectedInventoryItems = ref<SelectedInventoryItem[]>([])

// Location options for inventory deduction
const locationOptions = [
  { title: 'Venice', value: 'venice' },
  { title: 'Sherman Oaks', value: 'sherman_oaks' },
  { title: 'Valley', value: 'valley' },
  { title: 'MPMV (Mobile)', value: 'mpmv' },
  { title: 'Off-Site', value: 'offsite' }
]

// Fetch inventory items for selection
const fetchInventoryItems = async () => {
  const { data, error } = await client
    .from('marketing_inventory')
    .select('id, item_name, category, total_quantity, quantity_venice, quantity_sherman_oaks, quantity_valley, quantity_mpmv, quantity_offsite')
    .order('item_name')
  
  if (!error && data) {
    inventoryItems.value = data
  }
}

// Add a new inventory line item
const addInventoryItemLine = () => {
  selectedInventoryItems.value.push({
    inventory_item_id: '',
    item_name: '',
    quantity_used: 1,
    location: 'venice'
  })
}

// Remove an inventory line item
const removeSelectedInventoryItem = (index: number) => {
  selectedInventoryItems.value.splice(index, 1)
}

// Update item name when selected from dropdown
const updateSelectedItemName = (index: number, itemId: string) => {
  const item = inventoryItems.value.find(i => i.id === itemId)
  if (item) {
    selectedInventoryItems.value[index].item_name = item.item_name
  }
}

// Get category color for inventory display
const getCategoryColorForInventory = (category: string): string => {
  const colors: Record<string, string> = {
    apparel: 'pink',
    emp_apparel: 'deep-purple',
    print: 'blue',
    prize: 'amber',
    product: 'green',
    supply: 'teal',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

// Import/Export field definitions
const eventImportFields = [
  { key: 'name', label: 'Event Name', required: true },
  { key: 'event_type', label: 'Event Type' },
  { key: 'event_date', label: 'Event Date' },
  { key: 'start_time', label: 'Start Time' },
  { key: 'end_time', label: 'End Time' },
  { key: 'location', label: 'Location' },
  { key: 'address', label: 'Address' },
  { key: 'status', label: 'Status' },
  { key: 'budget', label: 'Budget' },
  { key: 'expected_attendees', label: 'Expected Attendees' },
  { key: 'description', label: 'Description' },
  { key: 'notes', label: 'Notes' }
]

const eventExportColumns = [
  { key: 'name', title: 'Event Name' },
  { key: 'event_type', title: 'Event Type' },
  { key: 'event_date', title: 'Event Date' },
  { key: 'start_time', title: 'Start Time' },
  { key: 'end_time', title: 'End Time' },
  { key: 'location', title: 'Location' },
  { key: 'address', title: 'Address' },
  { key: 'status', title: 'Status' },
  { key: 'budget', title: 'Budget', format: (v: number) => v ? `$${v}` : '' },
  { key: 'expected_attendees', title: 'Expected Attendees' },
  { key: 'actual_attendees', title: 'Actual Attendees' },
  { key: 'leads_captured', title: 'Leads Captured' },
  { key: 'description', title: 'Description' },
  { key: 'notes', title: 'Notes' },
  { key: 'created_at', title: 'Created At' }
]

// Filters
const searchQuery = ref('')
const filterType = ref<string | null>(null)
const filterStatus = ref<string | null>(null)
const filterYear = ref<string | null>(null)
const filterTimeframe = ref('all')

// Filter options
const eventTypeOptions = [
  { title: 'General', value: 'general' },
  { title: 'CE Event', value: 'ce_event' },
  { title: 'Street Fair', value: 'street_fair' },
  { title: 'Open House', value: 'open_house' },
  { title: 'Adoption Event', value: 'adoption_event' },
  { title: 'Community Outreach', value: 'community_outreach' },
  { title: 'Health Fair', value: 'health_fair' },
  { title: 'School Visit', value: 'school_visit' },
  { title: 'Pet Expo', value: 'pet_expo' },
  { title: 'Fundraiser', value: 'fundraiser' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'Planned', value: 'planned' },
  { title: 'Confirmed', value: 'confirmed' },
  { title: 'Completed', value: 'completed' },
  { title: 'Cancelled', value: 'cancelled' }
]

const yearOptions = computed(() => {
  const years = new Set<string>()
  events.value.forEach(e => {
    if (e.event_date) {
      years.add(new Date(e.event_date).getFullYear().toString())
    }
  })
  return Array.from(years).sort().reverse().map(y => ({ title: y, value: y }))
})

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Event types for dropdown
const eventTypes = [
  { title: 'General', value: 'general' },
  { title: 'CE Event', value: 'ce_event' },
  { title: 'Street Fair', value: 'street_fair' },
  { title: 'Open House', value: 'open_house' },
  { title: 'Adoption Event', value: 'adoption_event' },
  { title: 'Community Outreach', value: 'community_outreach' },
  { title: 'Health Fair', value: 'health_fair' },
  { title: 'School Visit', value: 'school_visit' },
  { title: 'Pet Expo', value: 'pet_expo' },
  { title: 'Fundraiser', value: 'fundraiser' },
  { title: 'Other', value: 'other' }
]

const eventFormData = reactive({
  name: '',
  description: '',
  event_type: 'general',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  staffing_needs: '',
  supplies_needed: '',
  budget: null as number | null,
  expected_attendance: null as number | null,
  staffing_status: 'planned',
  status: 'planned',
  registration_required: false,
  registration_link: '',
  notes: '',
  attachments: [] as EventAttachment[],
  external_links: [] as ExternalLink[]
})

// New attachments for upload
const newAttachments = ref<File[]>([])

const leadFormData = reactive({
  lead_name: '',
  email: '',
  phone: '',
  notes: ''
})

const headers = [
  { title: 'Date', key: 'event_date', sortable: true },
  { title: 'Event Name', key: 'name', sortable: true },
  { title: 'Type', key: 'event_type', sortable: true },
  { title: 'Location', key: 'location', sortable: true },
  { title: 'Staffing', key: 'staffing_status', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Leads', key: 'leads', sortable: false }
]

// Computed
const filteredEvents = computed(() => {
  let result = [...events.value]
  
  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      e.name?.toLowerCase().includes(q) || 
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    )
  }
  
  // Type filter
  if (filterType.value) {
    result = result.filter(e => e.event_type === filterType.value)
  }
  
  // Status filter
  if (filterStatus.value) {
    result = result.filter(e => e.status === filterStatus.value)
  }
  
  // Year filter
  if (filterYear.value) {
    result = result.filter(e => {
      if (!e.event_date) return false
      return new Date(e.event_date).getFullYear().toString() === filterYear.value
    })
  }
  
  // Timeframe filter
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (filterTimeframe.value === 'upcoming') {
    result = result.filter(e => new Date(e.event_date) >= today)
  } else if (filterTimeframe.value === 'past') {
    result = result.filter(e => new Date(e.event_date) < today)
  }
  
  // Sort by date
  return result.sort((a, b) =>
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  )
})

const sortedEvents = computed(() => filteredEvents.value)

const upcomingCount = computed(() =>
  events.value.filter(e => isUpcoming(e.event_date) && e.status !== 'completed').length
)

const confirmedCount = computed(() =>
  events.value.filter(e => e.staffing_status === 'confirmed').length
)

const totalLeads = computed(() => leads.value.length)

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const isToday = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

const isUpcoming = (dateStr: string) => {
  const eventDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventDate >= today
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = String(date.getFullYear()).slice(-2)
  return `${weekday}, ${month} ${day} '${year}`
}

const formatStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1)

const formatEventType = (type: string) => {
  const labels: Record<string, string> = {
    general: 'General',
    ce_event: 'CE Event',
    street_fair: 'Street Fair',
    open_house: 'Open House',
    adoption_event: 'Adoption',
    community_outreach: 'Outreach',
    health_fair: 'Health Fair',
    school_visit: 'School Visit',
    pet_expo: 'Pet Expo',
    fundraiser: 'Fundraiser',
    other: 'Other'
  }
  return labels[type] || type
}

const getEventTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    general: 'grey',
    ce_event: 'purple',
    street_fair: 'orange',
    open_house: 'blue',
    adoption_event: 'pink',
    community_outreach: 'teal',
    health_fair: 'green',
    school_visit: 'cyan',
    pet_expo: 'amber',
    fundraiser: 'red',
    other: 'grey'
  }
  return colors[type] || 'grey'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    planned: 'info',
    confirmed: 'success',
    cancelled: 'error',
    completed: 'grey'
  }
  return colors[status] || 'grey'
}

const getLeadStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    contacted: 'warning',
    converted: 'success',
    lost: 'grey'
  }
  return colors[status] || 'grey'
}

const getLeadCount = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId).length

const getEventLeads = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId)

// QR Code and Lead Capture URL helpers
const getLeadCaptureUrl = (eventId: string) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/public/lead-capture/${eventId}`
}

const getQrCodeUrl = (eventId: string) => {
  const url = encodeURIComponent(getLeadCaptureUrl(eventId))
  // Using Google Charts API for QR code generation (free, no dependencies)
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${url}`
}

const copyLeadCaptureUrl = async () => {
  if (!selectedEvent.value) return
  const url = getLeadCaptureUrl(selectedEvent.value.id)
  try {
    await navigator.clipboard.writeText(url)
    showNotification('Lead capture URL copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
    showNotification('Failed to copy URL', 'error')
  }
}

const downloadQrCode = (event: MarketingEvent) => {
  const canvas = document.getElementById(`qr-canvas-${event.id}`) as HTMLCanvasElement
  if (!canvas) {
    showNotification('Could not generate QR code', 'error')
    return
  }
  
  // Create download link
  const link = document.createElement('a')
  link.download = `QR-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  showNotification('QR code downloaded!')
}

const openDrawer = (event: MarketingEvent) => {
  selectedEvent.value = event
  drawer.value = true
}

const openCreateDialog = () => {
  editMode.value = false
  newAttachments.value = []
  selectedInventoryItems.value = []
  Object.assign(eventFormData, {
    name: '',
    description: '',
    event_type: 'general',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    staffing_needs: '',
    supplies_needed: '',
    budget: null,
    expected_attendance: null,
    staffing_status: 'planned',
    status: 'planned',
    registration_required: false,
    registration_link: '',
    notes: '',
    attachments: [],
    external_links: []
  })
  eventDialog.value = true
}

const openEditDialog = () => {
  if (!selectedEvent.value) return
  editMode.value = true
  newAttachments.value = []
  Object.assign(eventFormData, {
    name: selectedEvent.value.name,
    description: selectedEvent.value.description || '',
    event_type: selectedEvent.value.event_type || 'general',
    event_date: selectedEvent.value.event_date,
    start_time: selectedEvent.value.start_time || '',
    end_time: selectedEvent.value.end_time || '',
    location: selectedEvent.value.location || '',
    contact_name: selectedEvent.value.contact_name || '',
    contact_phone: selectedEvent.value.contact_phone || '',
    contact_email: selectedEvent.value.contact_email || '',
    staffing_needs: selectedEvent.value.staffing_needs || '',
    supplies_needed: selectedEvent.value.supplies_needed || '',
    budget: selectedEvent.value.budget,
    expected_attendance: selectedEvent.value.expected_attendance,
    staffing_status: selectedEvent.value.staffing_status,
    status: selectedEvent.value.status,
    registration_required: selectedEvent.value.registration_required || false,
    registration_link: selectedEvent.value.registration_link || '',
    notes: selectedEvent.value.notes || '',
    attachments: selectedEvent.value.attachments || [],
    external_links: selectedEvent.value.external_links || []
  })
  eventDialog.value = true
}

const openAddLeadDialog = () => {
  Object.assign(leadFormData, {
    lead_name: '',
    email: '',
    phone: '',
    notes: ''
  })
  leadDialog.value = true
}

// =====================================================
// EVENT STATS FUNCTIONS
// =====================================================

// Inventory dialog state
const inventoryDialog = ref(false)
const inventoryItemForm = reactive({
  item_name: '',
  quantity_used: 1
})

// Update event stat field
const updateEventStat = async (field: string, value: any) => {
  if (!selectedEvent.value) return
  
  const { error } = await client
    .from('marketing_events')
    .update({ [field]: value })
    .eq('id', selectedEvent.value.id)
  
  if (error) {
    showNotification('Failed to update: ' + error.message, 'error')
    return
  }
  
  // Update local state
  ;(selectedEvent.value as any)[field] = value
  
  // Update in events array
  const idx = events.value.findIndex(e => e.id === selectedEvent.value?.id)
  if (idx !== -1) {
    ;(events.value[idx] as any)[field] = value
  }
}

// Open inventory dialog
const openInventoryDialog = () => {
  inventoryItemForm.item_name = ''
  inventoryItemForm.quantity_used = 1
  inventoryDialog.value = true
}

// Add inventory item
const addInventoryItem = async () => {
  if (!selectedEvent.value || !inventoryItemForm.item_name.trim()) return
  
  const newItem: InventoryUsedItem = {
    item_id: crypto.randomUUID(),
    item_name: inventoryItemForm.item_name.trim(),
    quantity_used: inventoryItemForm.quantity_used
  }
  
  const updatedInventory = [...(selectedEvent.value.inventory_used || []), newItem]
  
  const { error } = await client
    .from('marketing_events')
    .update({ inventory_used: updatedInventory })
    .eq('id', selectedEvent.value.id)
  
  if (error) {
    showNotification('Failed to add inventory item: ' + error.message, 'error')
    return
  }
  
  selectedEvent.value.inventory_used = updatedInventory
  inventoryDialog.value = false
  showNotification('Inventory item added')
}

// Remove inventory item
const removeInventoryItem = async (index: number) => {
  if (!selectedEvent.value) return
  
  const updatedInventory = [...(selectedEvent.value.inventory_used || [])]
  updatedInventory.splice(index, 1)
  
  const { error } = await client
    .from('marketing_events')
    .update({ inventory_used: updatedInventory })
    .eq('id', selectedEvent.value.id)
  
  if (error) {
    showNotification('Failed to remove inventory item: ' + error.message, 'error')
    return
  }
  
  selectedEvent.value.inventory_used = updatedInventory
  showNotification('Inventory item removed')
}

// External links management
const addExternalLink = () => {
  eventFormData.external_links.push({ title: '', url: '', description: '' })
}

const removeExternalLink = (index: number) => {
  eventFormData.external_links.splice(index, 1)
}

// Attachment management
const removeAttachment = (index: number) => {
  eventFormData.attachments.splice(index, 1)
}

const saveEvent = async () => {
  saving.value = true
  try {
    // Upload any new attachments first
    const uploadedAttachments: EventAttachment[] = [...eventFormData.attachments]
    
    if (newAttachments.value && newAttachments.value.length > 0) {
      for (const file of newAttachments.value) {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `events/${timestamp}_${safeName}`
        
        const { data: uploadData, error: uploadError } = await client.storage
          .from('marketing-events')
          .upload(filePath, file)
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }
        
        // Get public URL
        const { data: urlData } = client.storage
          .from('marketing-events')
          .getPublicUrl(filePath)
        
        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        })
      }
    }
    
    // Filter out empty links
    const validLinks = eventFormData.external_links.filter(
      link => link.title && link.url
    )
    
    const eventPayload = {
      name: eventFormData.name,
      description: eventFormData.description || null,
      event_type: eventFormData.event_type,
      event_date: eventFormData.event_date,
      start_time: eventFormData.start_time || null,
      end_time: eventFormData.end_time || null,
      location: eventFormData.location || null,
      contact_name: eventFormData.contact_name || null,
      contact_phone: eventFormData.contact_phone || null,
      contact_email: eventFormData.contact_email || null,
      staffing_needs: eventFormData.staffing_needs || null,
      supplies_needed: eventFormData.supplies_needed || null,
      budget: eventFormData.budget,
      expected_attendance: eventFormData.expected_attendance,
      staffing_status: eventFormData.staffing_status,
      status: eventFormData.status,
      registration_required: eventFormData.registration_required,
      registration_link: eventFormData.registration_link || null,
      notes: eventFormData.notes || null,
      attachments: uploadedAttachments,
      external_links: validLinks
    }

    if (editMode.value && selectedEvent.value) {
      const { error } = await client
        .from('marketing_events')
        .update(eventPayload)
        .eq('id', selectedEvent.value.id)

      if (error) throw error
      showNotification('Event updated successfully')
    } else {
      // Create new event
      const { data: newEvent, error } = await client
        .from('marketing_events')
        .insert(eventPayload)
        .select()
        .single()

      if (error) throw error
      
      // Deduct inventory items if any were selected
      if (newEvent && selectedInventoryItems.value.length > 0) {
        for (const item of selectedInventoryItems.value) {
          if (item.inventory_item_id && item.quantity_used > 0) {
            try {
              // Use the RPC function to deduct inventory
              await client.rpc('deduct_inventory_for_event', {
                p_event_id: newEvent.id,
                p_inventory_item_id: item.inventory_item_id,
                p_quantity: item.quantity_used,
                p_location: item.location,
                p_notes: `Used at event: ${eventFormData.name}`
              })
            } catch (invError) {
              console.error('Inventory deduction error:', invError)
              showNotification(`Warning: Could not deduct ${item.item_name} from inventory`, 'warning')
            }
          }
        }
      }
      
      showNotification('Event created successfully')
    }

    eventDialog.value = false
    drawer.value = false
    newAttachments.value = []
    selectedInventoryItems.value = []
    await fetchData()
  } catch (error) {
    console.error('Error saving event:', error)
    showNotification('Failed to save event', 'error')
  } finally {
    saving.value = false
  }
}

const saveLead = async () => {
  if (!selectedEvent.value) return

  savingLead.value = true
  try {
    const { error } = await client
      .from('marketing_leads')
      .insert({
        event_id: selectedEvent.value.id,
        lead_name: leadFormData.lead_name,
        email: leadFormData.email || null,
        phone: leadFormData.phone || null,
        source: selectedEvent.value.name,
        notes: leadFormData.notes || null,
        status: 'new'
      })

    if (error) throw error

    leadDialog.value = false
    showNotification('Lead added successfully')
    await fetchData()
  } catch (error) {
    console.error('Error adding lead:', error)
    showNotification('Failed to add lead', 'error')
  } finally {
    savingLead.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const [eventsRes, leadsRes] = await Promise.all([
      client.from('marketing_events').select('*').order('event_date'),
      client.from('marketing_leads').select('*')
    ])

    events.value = eventsRes.data || []
    leads.value = leadsRes.data || []
    
    // Also fetch inventory items for the dropdown
    await fetchInventoryItems()
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  // Handle action query param from marketing pages
  const route = useRoute()
  if (route.query.action === 'add') {
    openCreateDialog()
  }
})
</script>
