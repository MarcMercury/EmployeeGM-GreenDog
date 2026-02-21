<template>
  <div>
    <!-- Main Detail Dialog -->
    <v-dialog v-model="visible" max-width="900" scrollable>
      <v-card v-if="partner">
        <v-toolbar :color="getTierColor(partner.tier)" density="compact">
          <v-toolbar-title class="text-white">
            {{ partner.name }}
          </v-toolbar-title>
          <v-chip class="ml-2" size="small" variant="elevated">{{ partner.tier || 'bronze' }}</v-chip>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="visible = false" />
        </v-toolbar>

        <v-tabs v-model="detailTab" bg-color="grey-lighten-4">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="relationship">Relationship</v-tab>
          <v-tab value="contacts">Contacts</v-tab>
          <v-tab value="notes">Notes</v-tab>
          <v-tab value="visits">Visit Log</v-tab>
        </v-tabs>

        <v-card-text style="max-height: 500px; overflow-y: auto;">
          <v-window v-model="detailTab">
            <!-- Overview -->
            <v-window-item value="overview">
              <v-row class="mb-4">
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="primary" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">{{ partner.total_referrals_all_time || 0 }}</div>
                    <div class="text-caption">Total Referrals</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="success" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">${{ formatCompactNumber(partner.total_revenue_all_time) }}</div>
                    <div class="text-caption">Total Revenue</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="info" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">{{ partner.relationship_score || 50 }}%</div>
                    <div class="text-caption">Relationship Score</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" :color="partner.needs_followup ? 'warning' : 'grey'" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">
                      <v-icon v-if="partner.needs_followup">mdi-alert</v-icon>
                      <v-icon v-else>mdi-check</v-icon>
                    </div>
                    <div class="text-caption">{{ partner.needs_followup ? 'Needs Follow-up' : 'On Track' }}</div>
                  </v-card>
                </v-col>
              </v-row>

              <v-row>
                <!-- Contact Info -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-3 mb-3">
                    <h4 class="text-subtitle-2 mb-2 d-flex align-center">
                      <v-icon size="18" class="mr-2">mdi-office-building</v-icon>
                      Partner Info
                    </h4>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-map-marker</v-icon></template>
                        <v-list-item-title>{{ partner.address || 'No address' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-phone</v-icon></template>
                        <v-list-item-title>{{ partner.phone || 'No phone' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-email</v-icon></template>
                        <v-list-item-title>{{ partner.email || 'No email' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-web</v-icon></template>
                        <v-list-item-title>
                          <a v-if="partner.website" :href="partner.website" target="_blank">{{ partner.website }}</a>
                          <span v-else>No website</span>
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>

                    <div v-if="partner.instagram_handle || partner.facebook_url || partner.linkedin_url" class="mt-2 d-flex gap-2">
                      <v-btn v-if="partner.instagram_handle" icon size="small" variant="text" color="pink" aria-label="Instagram" :href="'https://instagram.com/' + partner.instagram_handle" target="_blank">
                        <v-icon>mdi-instagram</v-icon>
                      </v-btn>
                      <v-btn v-if="partner.facebook_url" icon size="small" variant="text" color="blue" aria-label="Facebook" :href="partner.facebook_url" target="_blank">
                        <v-icon>mdi-facebook</v-icon>
                      </v-btn>
                      <v-btn v-if="partner.linkedin_url" icon size="small" variant="text" color="indigo" aria-label="LinkedIn" :href="partner.linkedin_url" target="_blank">
                        <v-icon>mdi-linkedin</v-icon>
                      </v-btn>
                    </div>
                  </v-card>

                  <!-- Classification -->
                  <v-card variant="outlined" class="pa-3">
                    <h4 class="text-subtitle-2 mb-2 d-flex align-center">
                      <v-icon size="18" class="mr-2">mdi-tag-multiple</v-icon>
                      Classification
                    </h4>
                    <div class="d-flex flex-wrap gap-2 mb-2">
                      <v-chip size="small" :color="getTierColor(partner.tier)" variant="elevated">
                        {{ getTierLabel(partner.tier) }} - {{ partner.tier || 'Bronze' }}
                      </v-chip>
                      <v-chip size="small" :color="getPriorityColor(partner.priority)" variant="flat">
                        {{ partner.priority || 'Medium' }} priority
                      </v-chip>
                      <v-chip v-if="partner.visit_tier" size="small" variant="outlined" color="teal">
                        {{ partner.visit_tier }} frequency
                      </v-chip>
                      <v-chip size="small" variant="outlined">{{ getZoneDisplay(partner.zone) }}</v-chip>
                    </div>

                    <!-- Visit status summary aligned with Visit Schedule -->
                    <div class="mt-2 pa-2 rounded" :style="{ backgroundColor: partner.visit_overdue ? 'rgba(244,67,54,0.08)' : 'rgba(76,175,80,0.08)' }">
                      <div class="d-flex align-center justify-space-between">
                        <span class="text-caption font-weight-medium">
                          <v-icon size="14" :color="partner.visit_overdue ? 'error' : 'success'" class="mr-1">
                            {{ partner.visit_overdue ? 'mdi-alert-circle' : 'mdi-check-circle' }}
                          </v-icon>
                          {{ partner.visit_overdue ? 'Visit Overdue' : 'On Schedule' }}
                        </span>
                        <span class="text-caption text-grey-darken-1">
                          <template v-if="partner.days_since_last_visit != null">
                            {{ partner.days_since_last_visit }}d ago
                          </template>
                          <template v-else>Never visited</template>
                          <template v-if="partner.expected_visit_frequency_days">
                            / {{ partner.expected_visit_frequency_days }}d cycle
                          </template>
                        </span>
                      </div>
                    </div>

                    <div class="mt-3" v-if="partner.relationship_health !== null">
                      <div class="d-flex align-center justify-space-between mb-1">
                        <span class="text-caption">Relationship Health</span>
                        <v-chip size="x-small" :color="getRelationshipStatusColor(partner.relationship_status)">
                          {{ partner.relationship_status || 'Unknown' }}
                        </v-chip>
                      </div>
                      <v-progress-linear
                        :model-value="partner.relationship_health"
                        :color="getRelationshipHealthColor(partner.relationship_health)"
                        height="10"
                        rounded
                      >
                        <template #default>
                          <span class="text-caption font-weight-bold">{{ partner.relationship_health }}%</span>
                        </template>
                      </v-progress-linear>
                    </div>

                    <div class="text-body-2 mt-3">
                      <div class="mb-1"><strong>Clinic Type:</strong> {{ partner.clinic_type || 'general' }}</div>
                      <div class="mb-1"><strong>Size:</strong> {{ partner.size || 'Not set' }}</div>
                      <div class="mb-1"><strong>Organization:</strong> {{ partner.organization_type || 'Not set' }}</div>
                      <div v-if="partner.employee_count"><strong>Employees:</strong> {{ partner.employee_count }}</div>
                    </div>
                  </v-card>
                </v-col>

                <!-- CRM Details -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-3 mb-3">
                    <h4 class="text-subtitle-2 mb-2 d-flex align-center">
                      <v-icon size="18" class="mr-2">mdi-calendar-clock</v-icon>
                      Visit Schedule
                    </h4>
                    <div class="text-body-2">
                      <div class="mb-1">
                        <strong>Last Visit:</strong>
                        <span :class="partner.visit_overdue ? 'text-error font-weight-bold' : ''">
                          {{ partner.last_visit_date ? formatPartnerDate(partner.last_visit_date) : 'Never' }}
                        </span>
                        <v-chip v-if="partner.visit_overdue" size="x-small" color="error" class="ml-2">Overdue</v-chip>
                        <span v-if="partner.days_since_last_visit != null" class="text-caption text-grey ml-1">
                          ({{ partner.days_since_last_visit }} days ago)
                        </span>
                      </div>
                      <div class="mb-1">
                        <strong>Last Referral:</strong> {{ partner.last_referral_date ? formatPartnerDate(partner.last_referral_date) : 'Never' }}
                      </div>
                      <div class="mb-1"><strong>Last Contact:</strong> {{ partner.last_contact_date ? formatPartnerDate(partner.last_contact_date) : 'Never' }}</div>
                      <div class="mb-1"><strong>Next Follow-up:</strong> {{ partner.next_followup_date ? formatPartnerDate(partner.next_followup_date) : 'Not set' }}</div>
                      <div class="mb-1">
                        <strong>Visit Frequency:</strong> {{ partner.visit_frequency || 'monthly' }}
                        <span v-if="partner.expected_visit_frequency_days" class="text-caption text-grey">
                          (every {{ partner.expected_visit_frequency_days }} days)
                        </span>
                      </div>
                      <div class="mb-1"><strong>Preferred Day:</strong> {{ partner.preferred_visit_day || 'Any' }}</div>
                      <div><strong>Preferred Time:</strong> {{ partner.preferred_visit_time || partner.preferred_contact_time || 'Any' }}</div>
                    </div>
                    <div v-if="partner.best_contact_person" class="mt-2 pa-2 bg-grey-lighten-4 rounded">
                      <strong>Best Contact:</strong> {{ partner.best_contact_person }}
                    </div>
                  </v-card>

                  <!-- Agreements -->
                  <v-card variant="outlined" class="pa-3">
                    <h4 class="text-subtitle-2 mb-2 d-flex align-center">
                      <v-icon size="18" class="mr-2">mdi-handshake</v-icon>
                      Agreements & Eligibility
                    </h4>
                    <div class="text-body-2 mb-2">
                      <div class="mb-1"><strong>Referral Agreement:</strong> {{ partner.referral_agreement_type || 'none' }}</div>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <v-chip size="small" :color="partner.ce_event_host ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ partner.ce_event_host ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        CE Event Host
                      </v-chip>
                      <v-chip size="small" :color="partner.lunch_and_learn_eligible !== false ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ partner.lunch_and_learn_eligible !== false ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        Lunch & Learn
                      </v-chip>
                      <v-chip size="small" :color="partner.drop_off_materials !== false ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ partner.drop_off_materials !== false ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        Drop-off Materials
                      </v-chip>
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <v-row v-if="partner.description || partner.notes" class="mt-2">
                <v-col cols="12">
                  <v-card variant="outlined" class="pa-3">
                    <h4 class="text-subtitle-2 mb-2">Notes</h4>
                    <div class="text-body-2">{{ partner.description || partner.notes }}</div>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Relationship Tab -->
            <v-window-item value="relationship">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="primary">mdi-heart-pulse</v-icon>
                      Relationship Health
                    </h4>
                    <div class="d-flex align-center mb-3">
                      <div class="text-h3 font-weight-bold mr-3" :class="getRelationshipScoreColor(partner.relationship_score)">
                        {{ partner.relationship_score || 50 }}
                      </div>
                      <div>
                        <div class="text-body-2">out of 100</div>
                        <div class="text-caption text-grey">{{ getRelationshipScoreLabel(partner.relationship_score) }}</div>
                      </div>
                    </div>
                    <v-progress-linear
                      :model-value="partner.relationship_score || 50"
                      :color="getRelationshipScoreColorName(partner.relationship_score)"
                      height="12"
                      rounded
                    />
                    <div class="mt-3 text-body-2">
                      <div class="mb-1">
                        <v-icon size="16" :color="partner.last_visit_date ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Last Visit: {{ partner.last_visit_date ? formatPartnerDate(partner.last_visit_date) : 'Never' }}
                      </div>
                      <div class="mb-1">
                        <v-icon size="16" :color="partner.last_referral_date ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Last Referral: {{ partner.last_referral_date ? formatPartnerDate(partner.last_referral_date) : 'Never' }}
                      </div>
                      <div class="mb-1">
                        <v-icon size="16" :color="partner.last_contact_date ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Last Contact: {{ partner.last_contact_date ? formatPartnerDate(partner.last_contact_date) : 'Never' }}
                      </div>
                      <div>
                        <v-icon size="16" :color="partnerNotes.length ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Notes: {{ partnerNotes.length }} recorded
                      </div>
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="success">mdi-currency-usd</v-icon>
                      Revenue & Referrals
                    </h4>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Total Referrals (All Time)</span>
                          <strong>{{ partner.total_referrals_all_time || 0 }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Referrals YTD</span>
                          <strong>{{ partner.total_referrals_ytd || 0 }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-2" />
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Total Revenue (All Time)</span>
                          <strong class="text-success">${{ Number(partner.total_revenue_all_time || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Revenue YTD</span>
                          <strong>${{ Number(partner.revenue_ytd || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Revenue Last Year</span>
                          <strong>${{ Number(partner.revenue_last_year || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Avg Monthly Revenue</span>
                          <strong>${{ Number(partner.average_monthly_revenue || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                    <div v-if="partner.last_sync_date" class="mt-2 text-caption text-grey">
                      Last synced: {{ formatPartnerDate(partner.last_sync_date) }}
                    </div>
                  </v-card>
                </v-col>



                <v-col cols="12" md="6" v-if="partner.payment_status || partner.payment_amount">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="info">mdi-credit-card</v-icon>
                      Payment Status
                    </h4>
                    <div class="d-flex align-center gap-3">
                      <v-chip :color="getPaymentStatusColor(partner.payment_status)" variant="flat">
                        {{ partner.payment_status || 'N/A' }}
                      </v-chip>
                      <div v-if="partner.payment_amount" class="text-h6">
                        ${{ Number(partner.payment_amount).toLocaleString() }}
                      </div>
                    </div>
                    <div v-if="partner.payment_date" class="mt-2 text-caption">
                      Payment Date: {{ formatPartnerDate(partner.payment_date) }}
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Contacts -->
            <v-window-item value="contacts">
              <div class="d-flex justify-end mb-2">
                <v-btn size="small" color="primary" variant="tonal" @click="openAddContact">
                  <v-icon start>mdi-plus</v-icon> Add Contact
                </v-btn>
              </div>
              <v-table density="compact" v-if="partnerContacts.length">
                <thead>
                  <tr>
                    <th class="text-left">Name</th>
                    <th class="text-left">Role</th>
                    <th class="text-left">Email</th>
                    <th class="text-left">Phone</th>
                    <th class="text-center">Primary</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="contact in partnerContacts" :key="contact.id">
                    <td>{{ contact.name }}</td>
                    <td>{{ contact.title || '—' }}</td>
                    <td>
                      <a v-if="contact.email" :href="'mailto:' + contact.email" class="text-primary text-decoration-none">
                        {{ contact.email }}
                      </a>
                      <span v-else class="text-grey">—</span>
                    </td>
                    <td>
                      <a v-if="contact.phone" :href="'tel:' + contact.phone" class="text-primary text-decoration-none">
                        {{ contact.phone }}
                      </a>
                      <span v-else class="text-grey">—</span>
                    </td>
                    <td class="text-center">
                      <v-chip v-if="contact.is_primary" size="x-small" color="success">Primary</v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn icon size="x-small" variant="text" color="primary" @click="openEditContact(contact)" aria-label="Edit contact">
                        <v-icon size="16">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon size="x-small" variant="text" color="error" @click="deleteContact(contact)" aria-label="Delete contact">
                        <v-icon size="16">mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div v-else class="text-grey pa-4 text-center">No contacts added</div>
            </v-window-item>

            <!-- Notes -->
            <v-window-item value="notes">
              <div class="d-flex gap-2 mb-3">
                <v-textarea
                  v-model="newNote"
                  placeholder="Add a note..."
                  variant="outlined"
                  density="compact"
                  rows="2"
                  hide-details
                  class="flex-grow-1"
                />
                <v-btn color="primary" @click="addNote" :disabled="!newNote.trim()">Add</v-btn>
              </div>
              <v-list density="compact">
                <v-list-item v-for="note in partnerNotes" :key="note.id" class="mb-2">
                  <v-card variant="tonal" class="pa-3 w-100">
                    <div class="d-flex justify-space-between align-start mb-1">
                      <div class="d-flex align-center gap-2">
                        <v-chip size="x-small" variant="outlined">{{ note.note_type }}</v-chip>
                        <v-chip v-if="note.author_initials" size="x-small" color="primary" variant="flat">
                          {{ note.author_initials }}
                        </v-chip>
                      </div>
                      <div class="d-flex align-center gap-1">
                        <span class="text-caption text-grey mr-1">{{ formatPartnerDateTime(note.created_at) }}</span>
                        <v-btn icon size="x-small" variant="text" color="primary" @click="openEditNote(note)" aria-label="Edit note">
                          <v-icon size="14">mdi-pencil</v-icon>
                        </v-btn>
                        <v-btn icon size="x-small" variant="text" color="error" @click="deleteNote(note)" aria-label="Delete note">
                          <v-icon size="14">mdi-delete</v-icon>
                        </v-btn>
                      </div>
                    </div>
                    <div v-if="editingNoteId === note.id" class="my-2">
                      <v-textarea
                        v-model="editNoteContent"
                        variant="outlined"
                        density="compact"
                        rows="2"
                        hide-details
                      />
                      <div class="d-flex justify-end gap-2 mt-1">
                        <v-btn size="x-small" variant="text" @click="editingNoteId = null">Cancel</v-btn>
                        <v-btn size="x-small" color="primary" @click="saveEditedNote(note)">Save</v-btn>
                      </div>
                    </div>
                    <div v-else class="text-body-2 my-2">{{ note.content }}</div>
                    <div class="text-caption text-grey d-flex justify-space-between">
                      <span v-if="note.created_by_name">— {{ note.created_by_name }}</span>
                      <span v-if="note.edited_at" class="text-italic">
                        (edited {{ formatPartnerDateTime(note.edited_at) }}<span v-if="note.edited_by_initials"> by {{ note.edited_by_initials }}</span>)
                      </span>
                    </div>
                  </v-card>
                </v-list-item>
                <v-list-item v-if="!partnerNotes.length">
                  <v-list-item-title class="text-grey">No notes yet</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-window-item>

            <!-- Visits -->
            <v-window-item value="visits">
              <div class="d-flex justify-end mb-2">
                <v-btn size="small" color="success" variant="tonal" @click="emit('log-visit', partner)">
                  <v-icon start>mdi-map-marker-plus</v-icon> Log Visit
                </v-btn>
              </div>
              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="log in partnerVisits"
                  :key="log.id"
                  :dot-color="log.visit_type ? getVisitTypeColor(log.visit_type) : 'success'"
                  size="small"
                >
                  <div>
                    <div class="d-flex justify-space-between">
                      <strong>{{ log.visit_type || 'Clinic Visit' }}</strong>
                      <span class="text-caption">{{ formatPartnerDate(log.visit_date) }}</span>
                    </div>
                    <div v-if="log.spoke_to" class="text-body-2">Spoke with: {{ log.spoke_to }}</div>
                    <div v-if="log.items_discussed?.length" class="text-body-2">
                      Discussed / Dropped Off: {{ formatItemsDiscussed(log.items_discussed) }}
                    </div>
                    <div v-if="log.visit_notes" class="text-body-2">{{ log.visit_notes }}</div>
                    <div v-if="log.summary" class="text-body-2">{{ log.summary }}</div>
                    <div v-if="log.outcome" class="text-caption">Outcome: {{ log.outcome }}</div>
                    <div v-if="log.next_steps" class="text-caption text-primary">Next: {{ log.next_steps }}</div>
                    <div v-if="log.next_visit_date" class="text-caption text-info">
                      <v-icon size="12">mdi-calendar-clock</v-icon>
                      Next visit: {{ formatPartnerDate(log.next_visit_date) }}
                    </div>
                  </div>
                </v-timeline-item>
                <v-timeline-item v-if="!partnerVisits.length" dot-color="grey">
                  <div class="text-grey">No visits logged</div>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>


          </v-window>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-btn variant="outlined" color="success" prepend-icon="mdi-map-marker-plus" @click="emit('log-visit', partner)">
            Log Visit
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="visible = false">Close</v-btn>
          <v-btn color="primary" @click="emit('edit', partner)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Contact Sub-Dialog -->
    <v-dialog v-model="showContactDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingContactId ? 'Edit' : 'Add' }} Contact</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field v-model="contactForm.name" label="Name *" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="contactForm.title" label="Title" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="contactForm.email" label="Email" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="contactForm.phone" label="Phone" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-switch v-model="contactForm.is_primary" label="Primary Contact" color="primary" hide-details />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showContactDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveContact">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>



    <!-- Add Event Sub-Dialog -->
    <v-dialog v-model="showEventDialog" max-width="550">
      <v-card>
        <v-card-title>Add Event Participation</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-autocomplete
                v-model="eventForm.event_id"
                :items="marketingEvents"
                item-title="name"
                item-value="id"
                label="Select Marketing Event"
                variant="outlined"
                density="compact"
                clearable
                hint="Or enter custom event below"
                persistent-hint
              >
                <template #item="{ item, props: itemProps }">
                  <v-list-item v-bind="itemProps">
                    <template #subtitle>{{ formatPartnerDate(item.raw.event_date) }}</template>
                  </v-list-item>
                </template>
              </v-autocomplete>
            </v-col>
            <v-col cols="12" v-if="!eventForm.event_id">
              <v-text-field
                v-model="eventForm.event_name"
                label="Custom Event Name"
                variant="outlined"
                density="compact"
                hint="For historical/external events not in the system"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="eventForm.event_date"
                label="Event Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="!!eventForm.event_id"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="eventForm.participation_role"
                :items="participationRoles"
                label="Role"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="eventForm.notes" label="Notes" variant="outlined" density="compact" rows="2" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showEventDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveEvent">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  formatPartnerDate,
  formatPartnerDateTime,
  formatCompactNumber,
  getTierColor,
  getTierLabel,
  getPriorityColor,
  getRelationshipHealthColor,
  getRelationshipStatusColor,
  getRelationshipScoreColor,
  getRelationshipScoreColorName,
  getRelationshipScoreLabel,
  getPaymentStatusColor,
  getVisitTypeColor,
  isPartnerOverdue
} from '~/utils/partnershipHelpers'

const props = defineProps<{
  /** Zone display function from parent (uses zoneDefinitions) */
  getZoneDisplay: (zone: string | null) => string
}>()

const emit = defineEmits<{
  (e: 'edit', partner: any): void
  (e: 'log-visit', partner: any): void
  (e: 'partner-updated'): void
  (e: 'notify', payload: { message: string; color: string }): void
}>()

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Map raw items_discussed values to human-readable labels
const DISCUSSION_ITEM_LABELS: Record<string, string> = {
  surgery: 'Surgery',
  dental_surgery: 'Dental Surgery',
  im: 'IM',
  exotics: 'Exotics',
  urgent_care: 'Urgent Care',
  ce: 'CE',
  gdd_event: 'GDD Event',
  other: 'Other'
}

function formatItemsDiscussed(items: string[]): string {
  return items.map(v => DISCUSSION_ITEM_LABELS[v] || v).join(', ')
}

// Dialog state
const visible = ref(false)
const detailTab = ref('overview')
const saving = ref(false)
const partner = ref<any>(null)

// Detail data
const partnerContacts = ref<any[]>([])
const partnerNotes = ref<any[]>([])
const partnerVisits = ref<any[]>([])
const partnerEvents = ref<any[]>([])
const marketingEvents = ref<any[]>([])
const newNote = ref('')
const editNoteContent = ref('')

// Sub-dialog state
const showContactDialog = ref(false)
const showEventDialog = ref(false)
const editingContactId = ref<string | null>(null)
const editingNoteId = ref<string | null>(null)

// Forms
const contactForm = reactive({
  partner_id: '',
  name: '',
  title: '',
  email: '',
  phone: '',
  is_primary: false
})

const eventForm = reactive({
  partner_id: '',
  event_id: null as string | null,
  event_name: '',
  event_date: '',
  participation_role: 'attendee',
  notes: ''
})

const participationRoles = [
  { title: 'Attendee', value: 'attendee' },
  { title: 'Sponsor', value: 'sponsor' },
  { title: 'Vendor', value: 'vendor' },
  { title: 'Rescue Partner', value: 'rescue' },
  { title: 'Food Vendor', value: 'food_vendor' },
  { title: 'Entertainment', value: 'entertainment' },
  { title: 'Donor', value: 'donor' },
  { title: 'Exhibitor', value: 'exhibitor' }
]

// --- Public method ---
function open(p: any) {
  partner.value = p
  detailTab.value = 'overview'
  loadPartnerDetails(p.id)
  visible.value = true
}

// --- Data loading ---
async function loadPartnerDetails(partnerId: string) {
  try {
    const [contacts, notes, visits, events] = await Promise.all([
      supabase.from('partner_contacts').select('*').eq('partner_id', partnerId).order('is_primary', { ascending: false }),
      supabase.from('partner_notes').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('clinic_visits').select('*').eq('partner_id', partnerId).order('visit_date', { ascending: false }),
      supabase.from('partner_events').select('*, marketing_events(name, event_date)').eq('partner_id', partnerId).order('event_date', { ascending: false })
    ])
    partnerContacts.value = contacts.data || []
    partnerNotes.value = notes.data || []
    partnerVisits.value = visits.data || []
    partnerEvents.value = events.data || []
  } catch (e) {
    console.error('Error loading partner details:', e)
  }
}

async function loadMarketingEvents() {
  try {
    const { data } = await supabase
      .from('marketing_events')
      .select('id, name, event_date')
      .order('event_date', { ascending: false })
      .limit(50)
    marketingEvents.value = data || []
  } catch (e) {
    console.error('Error loading marketing events:', e)
  }
}

// --- Sub-dialog openers ---
function openAddContact() {
  if (!partner.value) return
  editingContactId.value = null
  contactForm.partner_id = partner.value.id
  contactForm.name = ''
  contactForm.title = ''
  contactForm.email = ''
  contactForm.phone = ''
  contactForm.is_primary = false
  showContactDialog.value = true
}

function openEditContact(contact: any) {
  editingContactId.value = contact.id
  contactForm.partner_id = contact.partner_id
  contactForm.name = contact.name || ''
  contactForm.title = contact.title || ''
  contactForm.email = contact.email || ''
  contactForm.phone = contact.phone || ''
  contactForm.is_primary = contact.is_primary || false
  showContactDialog.value = true
}

async function deleteContact(contact: any) {
  if (!confirm(`Delete contact "${contact.name}"?`)) return
  try {
    const { error } = await supabase.from('partner_contacts').delete().eq('id', contact.id)
    if (error) throw error
    emit('notify', { message: 'Contact deleted', color: 'success' })
    if (partner.value) await loadPartnerDetails(partner.value.id)
  } catch (e: any) {
    console.error('Error deleting contact:', e)
    emit('notify', { message: e.message || 'Error deleting contact', color: 'error' })
  }
}

function openAddEvent() {
  if (!partner.value) return
  loadMarketingEvents()
  eventForm.partner_id = partner.value.id
  eventForm.event_id = null
  eventForm.event_name = ''
  eventForm.event_date = ''
  eventForm.participation_role = 'attendee'
  eventForm.notes = ''
  showEventDialog.value = true
}

// --- Save handlers ---
async function saveContact() {
  if (!contactForm.name) {
    emit('notify', { message: 'Contact name is required', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const payload = {
      partner_id: contactForm.partner_id,
      name: contactForm.name,
      title: contactForm.title || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      is_primary: contactForm.is_primary
    }
    if (editingContactId.value) {
      const { error } = await supabase.from('partner_contacts').update(payload).eq('id', editingContactId.value)
      if (error) throw error
      emit('notify', { message: 'Contact updated', color: 'success' })
    } else {
      const { error } = await supabase.from('partner_contacts').insert(payload)
      if (error) throw error
      emit('notify', { message: 'Contact added', color: 'success' })
    }
    showContactDialog.value = false
    editingContactId.value = null
    if (partner.value) await loadPartnerDetails(partner.value.id)
  } catch (e: any) {
    console.error('Error saving contact:', e)
    emit('notify', { message: e.message || 'Error saving contact', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function saveEvent() {
  if (!eventForm.event_id && !eventForm.event_name) {
    emit('notify', { message: 'Please select an event or enter a custom event name', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const { error } = await supabase.from('partner_events').insert({
      partner_id: eventForm.partner_id,
      event_id: eventForm.event_id || null,
      event_name: eventForm.event_id ? null : eventForm.event_name,
      event_date: eventForm.event_id ? null : (eventForm.event_date || null),
      participation_role: eventForm.participation_role,
      notes: eventForm.notes || null,
      created_by: user.value?.id
    })
    if (error) throw error
    emit('notify', { message: 'Event added', color: 'success' })
    showEventDialog.value = false
    if (partner.value) await loadPartnerDetails(partner.value.id)
  } catch (e: any) {
    console.error('Error saving event:', e)
    emit('notify', { message: e.message || 'Error saving event', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function addNote() {
  if (!partner.value || !newNote.value.trim()) return
  saving.value = true
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('auth_user_id', user.value?.id)
      .single()

    const initials = profile
      ? (profile.first_name?.charAt(0) || '') + (profile.last_name?.charAt(0) || '')
      : 'SY'
    const fullName = profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      : 'System'

    const { error: noteError } = await supabase.from('partner_notes').insert({
      partner_id: partner.value.id,
      content: newNote.value.trim(),
      note_type: 'general',
      created_by: user.value?.id,
      author_initials: initials.toUpperCase(),
      created_by_name: fullName
    })
    if (noteError) throw noteError

    const { error: updateError } = await supabase
      .from('referral_partners')
      .update({
        last_contact_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', partner.value.id)
    if (updateError) console.warn('Could not update last_contact_date:', updateError)

    newNote.value = ''
    await loadPartnerDetails(partner.value.id)
    emit('partner-updated')
    emit('notify', { message: 'Note added', color: 'success' })
  } catch (e: any) {
    console.error('Error adding note:', e)
    emit('notify', { message: e.message || 'Error adding note', color: 'error' })
  } finally {
    saving.value = false
  }
}

function openEditNote(note: any) {
  editingNoteId.value = note.id
  editNoteContent.value = note.content || ''
}

async function saveEditedNote(note: any) {
  if (!editNoteContent.value.trim()) return
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('auth_user_id', user.value?.id)
      .single()

    const initials = profile
      ? (profile.first_name?.charAt(0) || '') + (profile.last_name?.charAt(0) || '')
      : 'SY'

    const { error } = await supabase.from('partner_notes').update({
      content: editNoteContent.value.trim(),
      edited_at: new Date().toISOString(),
      edited_by: user.value?.id,
      edited_by_initials: initials.toUpperCase()
    }).eq('id', note.id)
    if (error) throw error
    editingNoteId.value = null
    if (partner.value) await loadPartnerDetails(partner.value.id)
    emit('notify', { message: 'Note updated', color: 'success' })
  } catch (e: any) {
    console.error('Error updating note:', e)
    emit('notify', { message: e.message || 'Error updating note', color: 'error' })
  }
}

async function deleteNote(note: any) {
  if (!confirm('Delete this note?')) return
  try {
    const { error } = await supabase.from('partner_notes').delete().eq('id', note.id)
    if (error) throw error
    if (partner.value) await loadPartnerDetails(partner.value.id)
    emit('notify', { message: 'Note deleted', color: 'success' })
  } catch (e: any) {
    console.error('Error deleting note:', e)
    emit('notify', { message: e.message || 'Error deleting note', color: 'error' })
  }
}

defineExpose({ open })
</script>
