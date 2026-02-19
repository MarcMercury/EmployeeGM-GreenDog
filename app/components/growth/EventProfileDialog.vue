<template>
  <!-- Main Event Profile Dialog -->
  <v-dialog v-model="showDialog" max-width="900" scrollable>
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
        <v-btn icon variant="text" aria-label="Close" @click="showDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- Tabs for organized content -->
      <v-tabs v-model="profileTab" bg-color="grey-lighten-4">
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
        <v-tab value="partners">
          <v-icon start>mdi-handshake</v-icon>
          Vendors/Partners
          <v-badge v-if="eventPartners.length > 0" :content="eventPartners.length" color="secondary" inline class="ml-1" />
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-card-text style="min-height: 450px; max-height: 60vh; overflow-y: auto;">
        <v-tabs-window v-model="profileTab">
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

                <p class="text-overline text-grey mb-2">EVENT HOST & COST</p>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item v-if="selectedEvent.hosted_by">
                    <template #prepend><v-icon color="primary">mdi-domain</v-icon></template>
                    <v-list-item-title>{{ selectedEvent.hosted_by }}</v-list-item-title>
                    <v-list-item-subtitle>Hosted By</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="selectedEvent.event_cost">
                    <template #prepend><v-icon color="primary">mdi-cash</v-icon></template>
                    <v-list-item-title>${{ selectedEvent.event_cost.toLocaleString() }}</v-list-item-title>
                    <v-list-item-subtitle>Event Cost (Booth Fee/Registration)</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="!selectedEvent.hosted_by && !selectedEvent.event_cost">
                    <v-list-item-title class="text-grey">No host/cost info added</v-list-item-title>
                  </v-list-item>
                </v-list>

                <v-divider class="my-3" />

                <p class="text-overline text-grey mb-2">PAYMENT STATUS</p>
                <v-list density="compact" class="bg-transparent">
                  <v-list-item>
                    <template #prepend><v-icon color="primary">mdi-credit-card</v-icon></template>
                    <v-list-item-title>
                      <v-chip :color="getPaymentStatusColor(selectedEvent.payment_status || 'pending')" size="small">
                        {{ formatPaymentStatus(selectedEvent.payment_status || 'pending') }}
                      </v-chip>
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item v-if="selectedEvent.payment_date">
                    <template #prepend><v-icon color="primary">mdi-calendar-check</v-icon></template>
                    <v-list-item-title>{{ formatDate(selectedEvent.payment_date) }}</v-list-item-title>
                    <v-list-item-subtitle>Payment Date</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="selectedEvent.vendor_status">
                    <template #prepend><v-icon color="primary">mdi-information</v-icon></template>
                    <v-list-item-title>{{ selectedEvent.vendor_status }}</v-list-item-title>
                    <v-list-item-subtitle>Vendor Status</v-list-item-subtitle>
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

                <v-card variant="outlined" v-if="selectedEvent.expectations" class="mb-3">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-1">Expectations / Our Involvement</div>
                    <p class="text-body-2 mb-0">{{ selectedEvent.expectations }}</p>
                  </v-card-text>
                </v-card>

                <v-card variant="outlined" v-if="selectedEvent.physical_setup" class="mb-3">
                  <v-card-text>
                    <div class="text-subtitle-2 mb-1">Physical Setup Details</div>
                    <p class="text-body-2 mb-0">{{ selectedEvent.physical_setup }}</p>
                  </v-card-text>
                </v-card>

                <!-- Communication Log -->
                <div v-if="selectedEvent.communication_log && selectedEvent.communication_log.length > 0" class="mt-4">
                  <p class="text-overline text-grey mb-2">COMMUNICATION LOG</p>
                  <v-timeline density="compact" side="end" class="px-0">
                    <v-timeline-item
                      v-for="(entry, idx) in selectedEvent.communication_log"
                      :key="idx"
                      :dot-color="getCommunicationTypeColor(entry.type)"
                      size="small"
                    >
                      <template #opposite>
                        <div class="text-caption text-grey">{{ formatDate(entry.date) }}</div>
                      </template>
                      <v-card variant="outlined">
                        <v-card-text class="py-2">
                          <div class="d-flex align-center mb-1">
                            <v-chip size="x-small" :color="getCommunicationTypeColor(entry.type)" class="mr-2">{{ entry.type }}</v-chip>
                            <span class="text-caption">{{ entry.contact }}</span>
                          </div>
                          <div class="text-body-2 font-weight-medium">{{ entry.summary }}</div>
                          <div v-if="entry.notes" class="text-caption text-grey mt-1">{{ entry.notes }}</div>
                        </v-card-text>
                      </v-card>
                    </v-timeline-item>
                  </v-timeline>
                </div>

                <!-- External Links -->
                <div class="mt-4">
                  <p class="text-overline text-grey mb-2">EXTERNAL LINKS</p>
                  <template v-if="selectedEvent.external_links && selectedEvent.external_links.length > 0">
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
                  </template>
                  <p v-else class="text-body-2 text-grey-darken-1">No external links added</p>
                </div>

                <!-- Attachments -->
                <div class="mt-4">
                  <p class="text-overline text-grey mb-2">ATTACHMENTS</p>
                  <template v-if="selectedEvent.attachments && selectedEvent.attachments.length > 0">
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
                  </template>
                  <p v-else class="text-body-2 text-grey-darken-1">No attachments uploaded</p>
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
                      <v-list-item-subtitle>
                        Qty: {{ item.quantity_used }}
                        <span v-if="item.location" class="ml-2">
                          • {{ item.location.replace('_', ' ') }}
                        </span>
                      </v-list-item-subtitle>
                      <template #append>
                        <v-btn icon size="x-small" variant="text" color="error" aria-label="Delete" @click="removeInventoryItem(idx)">
                          <v-icon size="small">mdi-delete</v-icon>
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                  <v-card-text v-else class="text-center text-grey py-8">
                    <v-icon size="48" color="grey-lighten-2">mdi-package-variant-closed</v-icon>
                    <div class="mt-2">No inventory items tracked yet</div>
                    <div class="text-caption mt-1">Click "Add Item" to assign inventory</div>
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
                <v-btn color="primary" variant="tonal" @click="profileTab = 'qrcode'">
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
                    <v-btn icon size="small" variant="text" aria-label="Open in new tab" :href="getLeadCaptureUrl(selectedEvent.id)" target="_blank">
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

          <!-- VENDORS/PARTNERS TAB -->
          <v-tabs-window-item value="partners">
            <div class="d-flex justify-space-between align-center mb-4">
              <p class="text-overline text-grey mb-0">EVENT VENDORS & PARTNERS</p>
              <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddPartnerDialog">
                Add Partner
              </v-btn>
            </div>
            
            <v-progress-linear v-if="eventPartnersLoading" indeterminate color="primary" class="mb-4" />
            
            <template v-if="eventPartners.length > 0">
              <v-data-table
                :items="eventPartners"
                :headers="[
                  { title: 'Partner', key: 'partner.name', sortable: true },
                  { title: 'Type', key: 'partner.partner_type', sortable: true },
                  { title: 'Role', key: 'role', sortable: true },
                  { title: 'Contact', key: 'partner.contact_name', sortable: false },
                  { title: 'Confirmed', key: 'is_confirmed', sortable: true },
                  { title: 'Actions', key: 'actions', sortable: false, align: 'end' }
                ]"
                density="comfortable"
                class="elevation-1 rounded-lg"
              >
                <template #item.partner.name="{ item }">
                  <div class="d-flex align-center py-2">
                    <v-avatar :color="getPartnerTypeColor(item.partner?.partner_type)" size="32" class="mr-2">
                      <v-icon size="16" color="white">{{ getPartnerTypeIcon(item.partner?.partner_type) }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="font-weight-medium">{{ item.partner?.name || 'Unknown' }}</div>
                      <div class="text-caption text-grey">{{ item.partner?.address || 'No address' }}</div>
                    </div>
                  </div>
                </template>
                <template #item.partner.partner_type="{ item }">
                  <v-chip size="small" :color="getPartnerTypeColor(item.partner?.partner_type)" variant="tonal">
                    {{ formatPartnerType(item.partner?.partner_type) }}
                  </v-chip>
                </template>
                <template #item.role="{ item }">
                  <v-chip size="small" color="primary" variant="outlined">
                    {{ formatPartnerRole(item.role) }}
                  </v-chip>
                </template>
                <template #item.partner.contact_name="{ item }">
                  <div v-if="item.partner?.contact_name || item.partner?.contact_phone">
                    <div class="text-body-2">{{ item.partner?.contact_name || '-' }}</div>
                    <div class="text-caption text-grey">{{ item.partner?.contact_phone || '' }}</div>
                  </div>
                  <span v-else class="text-grey">-</span>
                </template>
                <template #item.is_confirmed="{ item }">
                  <v-icon :color="item.is_confirmed ? 'success' : 'grey'" size="20">
                    {{ item.is_confirmed ? 'mdi-check-circle' : 'mdi-clock-outline' }}
                  </v-icon>
                </template>
                <template #item.actions="{ item }">
                  <v-btn icon size="small" variant="text" color="error" aria-label="Delete" @click="removeEventPartner(item.id)">
                    <v-icon size="18">mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="top">Remove from event</v-tooltip>
                  </v-btn>
                </template>
              </v-data-table>
            </template>
            
            <v-card v-else variant="outlined" class="text-center pa-8">
              <v-icon size="64" color="grey-lighten-2">mdi-handshake-outline</v-icon>
              <div class="text-h6 text-grey mt-4">No vendors or partners added</div>
              <div class="text-body-2 text-grey mb-4">Add partners from your partner database to this event</div>
              <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddPartnerDialog">
                Add Partner
              </v-btn>
            </v-card>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="text" prepend-icon="mdi-pencil" @click="editEvent">
          Edit Event
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="showDialog = false">Close</v-btn>
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
  <v-dialog v-model="inventoryDialog" max-width="500">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white py-4">
        <v-icon start>mdi-package-variant</v-icon>
        Add Inventory to Event
      </v-card-title>
      <v-card-text class="pt-6">
        <v-autocomplete
          v-model="inventoryItemForm.inventory_item_id"
          :items="inventoryItems"
          item-title="item_name"
          item-value="id"
          label="Select Inventory Item *"
          variant="outlined"
          density="compact"
          :loading="inventoryLoading"
          placeholder="Search inventory..."
          class="mb-3"
          @update:model-value="onInventoryItemSelect"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #subtitle>
                <span class="text-caption">
                  {{ item.raw.category }} • Total: {{ item.raw.total_quantity }}
                </span>
              </template>
            </v-list-item>
          </template>
        </v-autocomplete>
        
        <v-select
          v-model="inventoryItemForm.location"
          :items="locationOptions"
          label="Location *"
          variant="outlined"
          density="compact"
          class="mb-3"
        />
        
        <div v-if="inventoryItemForm.inventory_item_id" class="mb-3 pa-2 bg-grey-lighten-4 rounded">
          <span class="text-caption text-grey-darken-1">
            Available at {{ inventoryItemForm.location.replace('_', ' ') }}: 
            <strong :class="selectedItemAvailableQty > 0 ? 'text-success' : 'text-error'">
              {{ selectedItemAvailableQty }}
            </strong>
          </span>
        </div>
        
        <v-text-field
          v-model.number="inventoryItemForm.quantity_used"
          label="Quantity to Use *"
          type="number"
          variant="outlined"
          density="compact"
          min="1"
          :max="selectedItemAvailableQty"
          :rules="[v => v > 0 || 'Must be at least 1', v => v <= selectedItemAvailableQty || `Only ${selectedItemAvailableQty} available`]"
        />
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="inventoryDialog = false">Cancel</v-btn>
        <v-btn 
          color="primary" 
          :disabled="!inventoryItemForm.inventory_item_id || inventoryItemForm.quantity_used > selectedItemAvailableQty || inventoryItemForm.quantity_used < 1"
          @click="addInventoryItem"
        >
          Add & Deduct
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Add Partner to Event Dialog -->
  <v-dialog v-model="addPartnerDialog" max-width="600" scrollable>
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white py-4">
        <v-icon start>mdi-handshake</v-icon>
        Add Partner to Event
      </v-card-title>
      <v-card-text class="pt-6" style="max-height: 60vh;">
        <!-- Search Partners -->
        <v-text-field
          v-model="partnerSearchQuery"
          label="Search Partners"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hint="Search by name, type, or contact"
          persistent-hint
          class="mb-4"
        />
        
        <!-- Partners List -->
        <div v-if="filteredMarketingPartners.length > 0" class="partner-list">
          <v-list density="compact" class="rounded-lg border">
            <v-list-item
              v-for="partner in filteredMarketingPartners"
              :key="partner.id"
              :active="selectedPartnerToAdd?.id === partner.id"
              @click="selectedPartnerToAdd = partner"
              class="py-3"
            >
              <template #prepend>
                <v-avatar :color="getPartnerTypeColor(partner.partner_type)" size="40" class="mr-3">
                  <v-icon size="20" color="white">{{ getPartnerTypeIcon(partner.partner_type) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">{{ partner.name }}</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip size="x-small" :color="getPartnerTypeColor(partner.partner_type)" variant="tonal" class="mr-1">
                  {{ formatPartnerType(partner.partner_type) }}
                </v-chip>
                <span v-if="partner.contact_name" class="text-grey">{{ partner.contact_name }}</span>
              </v-list-item-subtitle>
              <template #append>
                <v-icon v-if="selectedPartnerToAdd?.id === partner.id" color="primary">mdi-check-circle</v-icon>
                <v-icon v-else-if="isPartnerAlreadyAdded(partner.id)" color="success" size="small">mdi-check</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>
        <v-alert v-else-if="partnerSearchQuery" type="info" variant="tonal" class="mt-2">
          No partners found matching "{{ partnerSearchQuery }}"
        </v-alert>
        <v-alert v-else type="info" variant="tonal" class="mt-2">
          Start typing to search for partners
        </v-alert>
        
        <!-- Selected Partner Details -->
        <v-expand-transition>
          <v-card v-if="selectedPartnerToAdd" variant="outlined" class="mt-4 pa-4">
            <div class="d-flex align-center mb-3">
              <v-avatar :color="getPartnerTypeColor(selectedPartnerToAdd.partner_type)" size="48" class="mr-3">
                <v-icon size="24" color="white">{{ getPartnerTypeIcon(selectedPartnerToAdd.partner_type) }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-h6">{{ selectedPartnerToAdd.name }}</div>
                <div class="text-caption text-grey">{{ formatPartnerType(selectedPartnerToAdd.partner_type) }}</div>
              </div>
            </div>
            
            <v-select
              v-model="newPartnerRole"
              :items="partnerRoleOptions"
              label="Role at Event *"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            
            <v-textarea
              v-model="newPartnerNotes"
              label="Notes (optional)"
              variant="outlined"
              density="compact"
              rows="2"
              placeholder="Booth location, special requirements, etc."
            />
          </v-card>
        </v-expand-transition>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="closeAddPartnerDialog">Cancel</v-btn>
        <v-btn 
          color="primary" 
          :loading="savingPartner" 
          :disabled="!selectedPartnerToAdd || isPartnerAlreadyAdded(selectedPartnerToAdd?.id)"
          @click="saveEventPartner"
        >
          {{ isPartnerAlreadyAdded(selectedPartnerToAdd?.id) ? 'Already Added' : 'Save Partner' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'
import type { MarketingEvent, InventoryUsedItem, InventoryItem, EventAttachment, ExternalLink, Lead, EventPartner, MarketingPartner } from '~/types/marketing.types'

// =====================================================
// COMPOSABLES & EMITS
// =====================================================

const client = useSupabaseClient()
const user = useSupabaseUser()

const emit = defineEmits<{
  edit: [event: MarketingEvent]
  'partner-updated': []
  notify: [payload: { message: string; color: string }]
}>()

// =====================================================
// STATE
// =====================================================

const showDialog = ref(false)
const selectedEvent = ref<MarketingEvent | null>(null)
const profileTab = ref('details')

// Leads
const leads = ref<Lead[]>([])

// Lead dialog
const leadDialog = ref(false)
const leadFormValid = ref(false)
const savingLead = ref(false)
const leadFormData = reactive({
  lead_name: '',
  email: '',
  phone: '',
  notes: ''
})

// Inventory dialog
const inventoryDialog = ref(false)
const inventoryItems = ref<InventoryItem[]>([])
const inventoryLoading = ref(false)
const inventoryItemForm = reactive({
  inventory_item_id: '' as string,
  item_name: '',
  quantity_used: 1,
  location: 'venice' as string
})

const locationOptions = [
  { title: 'Venice', value: 'venice' },
  { title: 'Sherman Oaks', value: 'sherman_oaks' },
  { title: 'Valley', value: 'valley' },
  { title: 'MPMV (Mobile)', value: 'mpmv' },
  { title: 'Off-Site', value: 'offsite' }
]

// Event Partners State
const eventPartners = ref<EventPartner[]>([])
const eventPartnersLoading = ref(false)
const addPartnerDialog = ref(false)
const allMarketingPartners = ref<MarketingPartner[]>([])
const partnerSearchQuery = ref('')
const selectedPartnerToAdd = ref<MarketingPartner | null>(null)
const savingPartner = ref(false)
const newPartnerRole = ref('vendor')
const newPartnerNotes = ref('')

const partnerRoleOptions = [
  { title: 'Vendor', value: 'vendor' },
  { title: 'Sponsor', value: 'sponsor' },
  { title: 'Rescue', value: 'rescue' },
  { title: 'Food Vendor', value: 'food_vendor' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Donor', value: 'donor' },
  { title: 'Volunteer', value: 'volunteer' },
  { title: 'Host', value: 'host' },
  { title: 'Speaker', value: 'speaker' },
  { title: 'Exhibitor', value: 'exhibitor' },
  { title: 'Chamber', value: 'chamber' },
  { title: 'Other', value: 'other' }
]

// =====================================================
// COMPUTED
// =====================================================

const selectedItemAvailableQty = computed(() => {
  if (!inventoryItemForm.inventory_item_id || !inventoryItemForm.location) return 0
  return getAvailableQuantity(inventoryItemForm.inventory_item_id, inventoryItemForm.location)
})

const filteredMarketingPartners = computed(() => {
  if (!partnerSearchQuery.value) return []
  const query = partnerSearchQuery.value.toLowerCase()
  return allMarketingPartners.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.partner_type?.toLowerCase().includes(query) ||
    p.contact_name?.toLowerCase().includes(query) ||
    p.address?.toLowerCase().includes(query)
  ).slice(0, 20)
})

// =====================================================
// NOTIFICATION HELPER
// =====================================================

const showNotification = (message: string, color = 'success') => {
  emit('notify', { message, color })
}

// =====================================================
// FORMAT / HELPER FUNCTIONS
// =====================================================

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

const getPartnerTypeColor = (type: string | undefined) => {
  const colors: Record<string, string> = {
    vendor: 'blue',
    rescue: 'pink',
    chamber: 'purple',
    pet_store: 'orange',
    veterinary: 'teal',
    grooming: 'cyan',
    training: 'amber',
    boarding: 'indigo',
    exotic: 'green',
    other: 'grey'
  }
  return colors[type || 'other'] || 'grey'
}

const formatPaymentStatus = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    refunded: 'Refunded',
    waived: 'Waived'
  }
  return labels[status] || status
}

const getPaymentStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    paid: 'success',
    refunded: 'error',
    waived: 'grey'
  }
  return colors[status] || 'grey'
}

const getCommunicationTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    Email: 'blue',
    'Phone Call': 'green',
    Meeting: 'purple',
    Payment: 'success',
    Other: 'grey'
  }
  return colors[type] || 'grey'
}

const getPartnerTypeIcon = (type: string | undefined) => {
  const icons: Record<string, string> = {
    vendor: 'mdi-store',
    rescue: 'mdi-heart',
    chamber: 'mdi-domain',
    pet_store: 'mdi-shopping',
    veterinary: 'mdi-hospital-box',
    grooming: 'mdi-scissors-cutting',
    training: 'mdi-school',
    boarding: 'mdi-home-heart',
    exotic: 'mdi-snake',
    other: 'mdi-handshake'
  }
  return icons[type || 'other'] || 'mdi-handshake'
}

const formatPartnerType = (type: string | undefined) => {
  const labels: Record<string, string> = {
    vendor: 'Vendor',
    rescue: 'Rescue',
    chamber: 'Chamber',
    pet_store: 'Pet Store',
    veterinary: 'Veterinary',
    grooming: 'Grooming',
    training: 'Training',
    boarding: 'Boarding',
    exotic: 'Exotic',
    other: 'Other'
  }
  return labels[type || 'other'] || type || 'Other'
}

const formatPartnerRole = (role: string | undefined) => {
  const labels: Record<string, string> = {
    vendor: 'Vendor',
    sponsor: 'Sponsor',
    rescue: 'Rescue',
    food_vendor: 'Food Vendor',
    entertainment: 'Entertainment',
    donor: 'Donor',
    volunteer: 'Volunteer',
    host: 'Host',
    speaker: 'Speaker',
    exhibitor: 'Exhibitor',
    chamber: 'Chamber',
    other: 'Other'
  }
  return labels[role || 'other'] || role || 'Other'
}

const formatCurrency = (amount: number) => {
  return '$' + amount.toLocaleString()
}

const isPartnerAlreadyAdded = (partnerId: string | undefined): boolean => {
  if (!partnerId) return false
  return eventPartners.value.some(ep => ep.partner_id === partnerId)
}

const getLeadCount = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId).length

const getEventLeads = (eventId: string) =>
  leads.value.filter(l => l.event_id === eventId)

const getLeadCaptureUrl = (eventId: string) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/public/lead-capture/${eventId}`
}

const getAvailableQuantity = (itemId: string, location: string): number => {
  const item = inventoryItems.value.find(i => i.id === itemId)
  if (!item) return 0
  const locationKey = `quantity_${location}` as keyof InventoryItem
  return (item[locationKey] as number) || 0
}

// =====================================================
// DATA FETCHING
// =====================================================

const fetchEventLeads = async () => {
  if (!selectedEvent.value) return
  try {
    const { data, error } = await client
      .from('marketing_leads')
      .select('*')
      .eq('event_id', selectedEvent.value.id)
    if (error) throw error
    leads.value = data || []
  } catch (err) {
    console.error('Error fetching event leads:', err)
  }
}

const fetchEventPartners = async () => {
  if (!selectedEvent.value) return

  eventPartnersLoading.value = true
  try {
    const { data, error } = await client
      .from('event_marketing_partners')
      .select(`
        *,
        partner:marketing_partners (
          id, name, partner_type, status,
          contact_name, contact_phone, contact_email, address
        )
      `)
      .eq('event_id', selectedEvent.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    eventPartners.value = data || []
  } catch (error) {
    console.error('Error fetching event partners:', error)
    showNotification('Failed to load event partners', 'error')
  } finally {
    eventPartnersLoading.value = false
  }
}

const fetchAllMarketingPartners = async () => {
  try {
    const { data, error } = await client
      .from('marketing_partners')
      .select('id, name, partner_type, status, contact_name, contact_phone, contact_email, address')
      .order('name')

    if (error) throw error
    allMarketingPartners.value = data || []
  } catch (error) {
    console.error('Error fetching marketing partners:', error)
  }
}

const fetchInventoryItems = async () => {
  inventoryLoading.value = true
  try {
    const { data, error } = await client
      .from('marketing_inventory')
      .select('id, item_name, category, quantity_venice, quantity_sherman_oaks, quantity_valley, quantity_mpmv, quantity_offsite, total_quantity')
      .order('item_name')

    if (error) throw error
    inventoryItems.value = data || []
  } catch (err) {
    console.error('Error fetching inventory:', err)
  } finally {
    inventoryLoading.value = false
  }
}

// =====================================================
// DIALOG ACTIONS
// =====================================================

const editEvent = () => {
  showDialog.value = false
  if (selectedEvent.value) {
    emit('edit', selectedEvent.value)
  }
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
    await fetchEventLeads()
  } catch (error) {
    console.error('Error adding lead:', error)
    showNotification('Failed to add lead', 'error')
  } finally {
    savingLead.value = false
  }
}

// =====================================================
// EVENT STATS FUNCTIONS
// =====================================================

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
}

const openInventoryDialog = async () => {
  inventoryItemForm.inventory_item_id = ''
  inventoryItemForm.item_name = ''
  inventoryItemForm.quantity_used = 1
  inventoryItemForm.location = 'venice'

  if (inventoryItems.value.length === 0) {
    await fetchInventoryItems()
  }

  inventoryDialog.value = true
}

const onInventoryItemSelect = (itemId: string) => {
  const item = inventoryItems.value.find(i => i.id === itemId)
  if (item) {
    inventoryItemForm.item_name = item.item_name
  }
}

const addInventoryItem = async () => {
  if (!selectedEvent.value || !inventoryItemForm.inventory_item_id) {
    showNotification('Please select an inventory item', 'warning')
    return
  }

  const available = selectedItemAvailableQty.value
  if (inventoryItemForm.quantity_used > available) {
    showNotification(`Only ${available} available at this location`, 'warning')
    return
  }

  try {
    const { data, error } = await client.rpc('deduct_inventory_for_event', {
      p_event_id: selectedEvent.value.id,
      p_inventory_item_id: inventoryItemForm.inventory_item_id,
      p_quantity: inventoryItemForm.quantity_used,
      p_location: inventoryItemForm.location,
      p_notes: null
    })

    if (error) throw error

    const newItem: InventoryUsedItem = {
      item_id: data || crypto.randomUUID(),
      item_name: inventoryItemForm.item_name,
      quantity_used: inventoryItemForm.quantity_used,
      location: inventoryItemForm.location,
      inventory_item_id: inventoryItemForm.inventory_item_id
    }

    const updatedInventory = [...(selectedEvent.value.inventory_used || []), newItem]

    await client
      .from('marketing_events')
      .update({ inventory_used: updatedInventory })
      .eq('id', selectedEvent.value.id)

    selectedEvent.value.inventory_used = updatedInventory
    inventoryDialog.value = false

    await fetchInventoryItems()

    showNotification('Inventory item added and deducted from stock')
  } catch (err: any) {
    showNotification('Failed to add inventory: ' + err.message, 'error')
  }
}

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

// =====================================================
// PARTNER MANAGEMENT
// =====================================================

const openAddPartnerDialog = async () => {
  selectedPartnerToAdd.value = null
  partnerSearchQuery.value = ''
  newPartnerRole.value = 'vendor'
  newPartnerNotes.value = ''

  if (allMarketingPartners.value.length === 0) {
    await fetchAllMarketingPartners()
  }

  addPartnerDialog.value = true
}

const closeAddPartnerDialog = () => {
  addPartnerDialog.value = false
  selectedPartnerToAdd.value = null
  partnerSearchQuery.value = ''
}

const saveEventPartner = async () => {
  if (!selectedEvent.value || !selectedPartnerToAdd.value) return

  savingPartner.value = true
  try {
    const { error } = await client
      .from('event_marketing_partners')
      .insert({
        event_id: selectedEvent.value.id,
        partner_id: selectedPartnerToAdd.value.id,
        role: newPartnerRole.value,
        notes: newPartnerNotes.value || null,
        is_confirmed: false
      })

    if (error) {
      if (error.code === '23505') {
        showNotification('This partner is already added to this event', 'warning')
      } else {
        throw error
      }
    } else {
      showNotification(`${selectedPartnerToAdd.value.name} added to event`)
      closeAddPartnerDialog()
      await fetchEventPartners()
      emit('partner-updated')
    }
  } catch (error: any) {
    console.error('Error adding partner to event:', error)
    showNotification('Failed to add partner: ' + error.message, 'error')
  } finally {
    savingPartner.value = false
  }
}

const removeEventPartner = async (eventPartnerId: string) => {
  try {
    const { error } = await client
      .from('event_marketing_partners')
      .delete()
      .eq('id', eventPartnerId)

    if (error) throw error

    showNotification('Partner removed from event')
    await fetchEventPartners()
    emit('partner-updated')
  } catch (error: any) {
    console.error('Error removing partner:', error)
    showNotification('Failed to remove partner: ' + error.message, 'error')
  }
}

// =====================================================
// QR CODE
// =====================================================

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

  const link = document.createElement('a')
  link.download = `QR-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  showNotification('QR code downloaded!')
}

// =====================================================
// EXPOSED open() METHOD
// =====================================================

const open = async (event: MarketingEvent) => {
  console.log('[EventProfileDialog] Opening event details:', {
    name: event.name,
    external_links: event.external_links,
    attachments: event.attachments
  })
  selectedEvent.value = event
  eventPartners.value = []
  profileTab.value = 'details'
  showDialog.value = true

  // Load event data in parallel
  await Promise.all([
    fetchEventLeads(),
    fetchEventPartners()
  ])
}

defineExpose({ open })
</script>
