<template>
  <div class="partnerships-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Medical Partnerships CRM</h1>
        <p class="text-body-2 text-grey-darken-1">
          Manage referral clinics, contacts, and relationship touchpoints
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-download" size="small" @click="exportPartners">
          Export
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" size="small" @click="openAddPartner">
          Add Partner
        </v-btn>
      </div>
    </div>

    <!-- Main Tabs -->
    <v-tabs v-model="mainTab" class="mb-4" color="primary">
      <v-tab value="list">
        <v-icon start>mdi-view-list</v-icon>
        Partners
      </v-tab>
      <v-tab value="targeting">
        <v-icon start>mdi-target</v-icon>
        Targeting
      </v-tab>
      <v-tab value="activity">
        <v-icon start>mdi-history</v-icon>
        Activity
      </v-tab>
    </v-tabs>

    <v-window v-model="mainTab">
      <!-- PARTNERS LIST TAB -->
      <v-window-item value="list">
        <!-- Stats Row -->
        <v-row class="mb-4">
          <v-col cols="6" sm="3">
            <v-card class="text-center pa-3" variant="tonal" color="primary">
              <div class="text-h5 font-weight-bold">{{ partners.length }}</div>
              <div class="text-caption">Total Partners</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card class="text-center pa-3" variant="tonal" color="success">
              <div class="text-h5 font-weight-bold">{{ activeCount }}</div>
              <div class="text-caption">Active</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card class="text-center pa-3" variant="tonal" color="warning">
              <div class="text-h5 font-weight-bold">{{ needsFollowupCount }}</div>
              <div class="text-caption">Need Follow-up</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="3">
            <v-card class="text-center pa-3" variant="tonal" color="info">
              <div class="text-h5 font-weight-bold">{{ overdueCount }}</div>
              <div class="text-caption">Overdue Visits</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-card class="mb-4" variant="outlined">
          <v-card-text class="py-3">
            <v-row align="center" dense>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="search"
                  placeholder="Search partners..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterTier"
                  :items="tierOptions"
                  label="Tier"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterZone"
                  :items="zoneOptions"
                  label="Zone"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="2">
                <v-select
                  v-model="filterPriority"
                  :items="priorityOptions"
                  label="Priority"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="6" md="3">
                <v-btn-toggle v-model="filterFollowup" density="compact" variant="outlined">
                  <v-btn value="all" size="small">All</v-btn>
                  <v-btn value="followup" size="small" color="warning">Follow-up</v-btn>
                  <v-btn value="overdue" size="small" color="error">Overdue</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Partners Table -->
        <v-card variant="outlined">
          <v-data-table
            :headers="tableHeaders"
            :items="filteredPartners"
            :loading="loading"
            hover
            @click:row="(_e: any, { item }: any) => openPartnerDetail(item)"
          >
            <template #item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar :color="getTierColor(item.tier)" size="36" class="mr-3">
                  <span class="text-white text-caption font-weight-bold">{{ getTierLabel(item.tier) }}</span>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ item.name }}</div>
                  <div class="text-caption text-grey">{{ getZoneDisplay(item.zone) }}</div>
                </div>
              </div>
            </template>

            <template #item.priority="{ item }">
              <v-chip :color="getPriorityColor(item.priority)" size="x-small" variant="flat">
                {{ item.priority || 'medium' }}
              </v-chip>
            </template>

            <template #item.status="{ item }">
              <v-chip :color="item.status === 'active' ? 'success' : 'grey'" size="x-small" variant="tonal">
                {{ item.status }}
              </v-chip>
            </template>

            <template #item.last_visit_date="{ item }">
              <div v-if="item.last_visit_date">
                {{ formatDate(item.last_visit_date) }}
                <div v-if="isOverdue(item)" class="text-caption text-error">
                  <v-icon size="10">mdi-alert</v-icon> Overdue
                </div>
              </div>
              <span v-else class="text-grey">Never</span>
            </template>

            <template #item.next_followup_date="{ item }">
              <div v-if="item.next_followup_date" :class="isPastDue(item.next_followup_date) ? 'text-error' : ''">
                {{ formatDate(item.next_followup_date) }}
              </div>
              <span v-else class="text-grey">—</span>
            </template>

            <template #item.actions="{ item }">
              <v-btn icon="mdi-phone" size="x-small" variant="text" @click.stop="openLogVisit(item, 'call')" />
              <v-btn icon="mdi-calendar-check" size="x-small" variant="text" @click.stop="openLogVisit(item, 'visit')" />
              <v-btn icon="mdi-pencil" size="x-small" variant="text" @click.stop="openEditPartner(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- TARGETING TAB -->
      <v-window-item value="targeting">
        <v-row>
          <!-- This Week's Visits -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-calendar-week</v-icon>
                This Week's Targets
              </v-card-title>
              <v-list density="compact">
                <v-list-item
                  v-for="partner in weeklyTargets"
                  :key="partner.id"
                  @click="openPartnerDetail(partner)"
                >
                  <template #prepend>
                    <v-avatar :color="getTierColor(partner.tier)" size="32">
                      <span class="text-white text-caption">{{ getTierLabel(partner.tier) }}</span>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ partner.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ getZoneDisplay(partner.zone) }} • {{ partner.preferred_visit_day || 'Any day' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip size="x-small" :color="getPriorityColor(partner.priority)">
                      {{ partner.priority }}
                    </v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!weeklyTargets.length">
                  <v-list-item-title class="text-grey text-center">No targets this week</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <!-- Overdue Partners -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title class="d-flex align-center text-error">
                <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                Overdue Visits
              </v-card-title>
              <v-list density="compact">
                <v-list-item
                  v-for="partner in overduePartners"
                  :key="partner.id"
                  @click="openPartnerDetail(partner)"
                >
                  <template #prepend>
                    <v-avatar color="error" size="32">
                      <v-icon size="18">mdi-clock-alert</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ partner.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    Last visit: {{ partner.last_visit_date ? formatDate(partner.last_visit_date) : 'Never' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-btn size="x-small" color="primary" variant="tonal" @click.stop="openLogVisit(partner, 'visit')">
                      Log Visit
                    </v-btn>
                  </template>
                </v-list-item>
                <v-list-item v-if="!overduePartners.length">
                  <v-list-item-title class="text-grey text-center">All caught up!</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <!-- By Zone -->
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title>Partners by Zone</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col v-for="zoneDef in zoneDefinitions" :key="zoneDef.value" cols="6" md="4">
                    <v-card variant="tonal" class="pa-3 text-center" @click="filterZone = zoneDef.value; mainTab = 'list'">
                      <div class="text-h5 font-weight-bold">{{ getZoneCount(zoneDef.value) }}</div>
                      <div class="text-body-2 font-weight-medium">{{ zoneDef.title }}</div>
                      <div class="text-caption text-grey mt-1" style="font-size: 0.7rem;">{{ zoneDef.description }}</div>
                    </v-card>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ACTIVITY TAB -->
      <v-window-item value="activity">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Recent Activity</span>
            <v-btn size="small" variant="text" @click="loadRecentActivity">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-timeline density="compact" side="end">
            <v-timeline-item
              v-for="log in recentActivity"
              :key="log.id"
              :dot-color="getVisitTypeColor(log.visit_type)"
              size="small"
            >
              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="font-weight-medium">{{ log.partner_name }}</div>
                  <div class="text-body-2">{{ log.visit_type }}: {{ log.summary }}</div>
                  <div v-if="log.outcome" class="text-caption text-grey">Outcome: {{ log.outcome }}</div>
                </div>
                <div class="text-caption text-grey">{{ formatDate(log.visit_date) }}</div>
              </div>
            </v-timeline-item>
            <v-timeline-item v-if="!recentActivity.length" dot-color="grey">
              <div class="text-grey">No recent activity</div>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- PARTNER DETAIL DIALOG -->
    <v-dialog v-model="showDetailDialog" max-width="900" scrollable>
      <v-card v-if="selectedPartner">
        <v-toolbar :color="getTierColor(selectedPartner.tier)" density="compact">
          <v-toolbar-title class="text-white">
            {{ selectedPartner.name }}
          </v-toolbar-title>
          <v-chip class="ml-2" size="small" variant="elevated">{{ selectedPartner.tier || 'bronze' }}</v-chip>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showDetailDialog = false" />
        </v-toolbar>

        <v-tabs v-model="detailTab" bg-color="grey-lighten-4">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="contacts">Contacts</v-tab>
          <v-tab value="notes">Notes</v-tab>
          <v-tab value="visits">Visit Log</v-tab>
          <v-tab value="goals">Goals</v-tab>
        </v-tabs>

        <v-card-text style="max-height: 500px; overflow-y: auto;">
          <v-window v-model="detailTab">
            <!-- Overview -->
            <v-window-item value="overview">
              <v-row>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 mb-2">Partner Info</h4>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item>
                      <template #prepend><v-icon size="18">mdi-map-marker</v-icon></template>
                      <v-list-item-title>{{ selectedPartner.address || 'No address' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend><v-icon size="18">mdi-phone</v-icon></template>
                      <v-list-item-title>{{ selectedPartner.phone || 'No phone' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend><v-icon size="18">mdi-email</v-icon></template>
                      <v-list-item-title>{{ selectedPartner.email || 'No email' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend><v-icon size="18">mdi-web</v-icon></template>
                      <v-list-item-title>{{ selectedPartner.website || 'No website' }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 mb-2">CRM Details</h4>
                  <div class="d-flex flex-wrap gap-2 mb-3">
                    <v-chip size="small" :color="getPriorityColor(selectedPartner.priority)">
                      {{ selectedPartner.priority }} priority
                    </v-chip>
                    <v-chip size="small" variant="outlined">{{ getZoneDisplay(selectedPartner.zone) }}</v-chip>
                    <v-chip size="small" variant="outlined">{{ selectedPartner.visit_frequency || 'monthly' }}</v-chip>
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Last Visit:</strong> {{ selectedPartner.last_visit_date ? formatDate(selectedPartner.last_visit_date) : 'Never' }}
                  </div>
                  <div class="text-body-2 mb-1">
                    <strong>Next Follow-up:</strong> {{ selectedPartner.next_followup_date ? formatDate(selectedPartner.next_followup_date) : 'Not set' }}
                  </div>
                  <div class="text-body-2">
                    <strong>Preferred Day:</strong> {{ selectedPartner.preferred_visit_day || 'Any' }}
                  </div>
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
              <v-list density="compact">
                <v-list-item v-for="contact in partnerContacts" :key="contact.id">
                  <template #prepend>
                    <v-avatar color="primary" size="36">
                      <span class="text-white">{{ contact.name?.charAt(0) || '?' }}</span>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ contact.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ contact.title }} • {{ contact.email }}</v-list-item-subtitle>
                  <template #append>
                    <v-chip v-if="contact.is_primary" size="x-small" color="success">Primary</v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!partnerContacts.length">
                  <v-list-item-title class="text-grey">No contacts added</v-list-item-title>
                </v-list-item>
              </v-list>
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
                      <v-chip size="x-small" variant="outlined">{{ note.note_type }}</v-chip>
                      <span class="text-caption text-grey">{{ formatDateTime(note.created_at) }}</span>
                    </div>
                    <div class="text-body-2">{{ note.content }}</div>
                    <div v-if="note.created_by_name" class="text-caption text-grey mt-1">
                      — {{ note.created_by_name }}
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
                <v-btn size="small" color="primary" variant="tonal" @click="openLogVisit(selectedPartner, 'visit')">
                  <v-icon start>mdi-plus</v-icon> Log Visit
                </v-btn>
              </div>
              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="log in partnerVisits"
                  :key="log.id"
                  :dot-color="getVisitTypeColor(log.visit_type)"
                  size="small"
                >
                  <div>
                    <div class="d-flex justify-space-between">
                      <strong>{{ log.visit_type }}</strong>
                      <span class="text-caption">{{ formatDate(log.visit_date) }}</span>
                    </div>
                    <div class="text-body-2">{{ log.summary }}</div>
                    <div v-if="log.outcome" class="text-caption">Outcome: {{ log.outcome }}</div>
                    <div v-if="log.next_steps" class="text-caption text-primary">Next: {{ log.next_steps }}</div>
                  </div>
                </v-timeline-item>
                <v-timeline-item v-if="!partnerVisits.length" dot-color="grey">
                  <div class="text-grey">No visits logged</div>
                </v-timeline-item>
              </v-timeline>
            </v-window-item>

            <!-- Goals -->
            <v-window-item value="goals">
              <div class="d-flex justify-end mb-2">
                <v-btn size="small" color="primary" variant="tonal" @click="openAddGoal">
                  <v-icon start>mdi-plus</v-icon> Add Goal
                </v-btn>
              </div>
              <v-list density="compact">
                <v-list-item v-for="goal in partnerGoals" :key="goal.id">
                  <template #prepend>
                    <v-icon :color="goal.status === 'completed' ? 'success' : 'warning'">
                      {{ goal.status === 'completed' ? 'mdi-check-circle' : 'mdi-target' }}
                    </v-icon>
                  </template>
                  <v-list-item-title>{{ goal.title }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ goal.goal_type }} • Target: {{ goal.target_date ? formatDate(goal.target_date) : 'No date' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip size="x-small" :color="goal.status === 'completed' ? 'success' : 'warning'">
                      {{ goal.status }}
                    </v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!partnerGoals.length">
                  <v-list-item-title class="text-grey">No goals set</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-window-item>
          </v-window>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-btn variant="outlined" prepend-icon="mdi-phone" @click="openLogVisit(selectedPartner, 'call')">
            Log Call
          </v-btn>
          <v-btn variant="outlined" prepend-icon="mdi-calendar-check" @click="openLogVisit(selectedPartner, 'visit')">
            Log Visit
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showDetailDialog = false">Close</v-btn>
          <v-btn color="primary" @click="openEditPartner(selectedPartner)">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD/EDIT PARTNER DIALOG -->
    <v-dialog v-model="showPartnerDialog" max-width="700">
      <v-card>
        <v-card-title>{{ editMode ? 'Edit Partner' : 'Add Partner' }}</v-card-title>
        <v-card-text>
          <v-tabs v-model="formTab" class="mb-4">
            <v-tab value="basic">Basic</v-tab>
            <v-tab value="crm">CRM</v-tab>
            <v-tab value="targeting">Targeting</v-tab>
          </v-tabs>

          <v-window v-model="formTab">
            <v-window-item value="basic">
              <v-row dense>
                <v-col cols="12" md="8">
                  <v-text-field v-model="form.name" label="Partner Name *" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-select v-model="form.status" :items="['active', 'inactive', 'prospect']" label="Status" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-text-field v-model="form.address" label="Address" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.phone" label="Phone" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.email" label="Email" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-text-field v-model="form.website" label="Website" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-textarea v-model="form.notes" label="Notes" variant="outlined" density="compact" rows="2" />
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="crm">
              <v-row dense>
                <v-col cols="6">
                  <v-select v-model="form.tier" :items="tierOptions" label="Tier" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.priority" :items="priorityOptions" label="Priority" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.zone" :items="zoneOptions" label="Zone" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.clinic_type" :items="clinicTypeOptions" label="Clinic Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.contact_name" label="Primary Contact" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.referral_agreement_type" :items="agreementOptions" label="Agreement" variant="outlined" density="compact" />
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="targeting">
              <v-row dense>
                <v-col cols="6">
                  <v-select v-model="form.visit_frequency" :items="frequencyOptions" label="Visit Frequency" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.preferred_visit_day" :items="dayOptions" label="Preferred Day" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.preferred_visit_time" :items="timeOptions" label="Preferred Time" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.best_contact_person" label="Best Contact Person" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-text-field v-model="form.next_followup_date" label="Next Follow-up" type="date" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="form.needs_followup" label="Needs Follow-up" color="warning" hide-details />
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showPartnerDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePartner">{{ editMode ? 'Update' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- LOG VISIT DIALOG -->
    <v-dialog v-model="showVisitDialog" max-width="500">
      <v-card>
        <v-card-title>Log {{ visitForm.visit_type }}</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="6">
              <v-text-field v-model="visitForm.visit_date" label="Date" type="date" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="visitForm.visit_type" :items="visitTypeOptions" label="Type" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="visitForm.contacted_person" label="Contacted Person" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="visitForm.summary" label="Summary *" variant="outlined" density="compact" rows="2" />
            </v-col>
            <v-col cols="12">
              <v-select v-model="visitForm.outcome" :items="outcomeOptions" label="Outcome" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="visitForm.next_steps" label="Next Steps" variant="outlined" density="compact" rows="2" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showVisitDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveVisitLog">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD CONTACT DIALOG -->
    <v-dialog v-model="showContactDialog" max-width="500">
      <v-card>
        <v-card-title>Add Contact</v-card-title>
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

    <!-- ADD GOAL DIALOG -->
    <v-dialog v-model="showGoalDialog" max-width="500">
      <v-card>
        <v-card-title>Add Goal</v-card-title>
        <v-card-text>
          <v-row dense>
            <v-col cols="12">
              <v-text-field v-model="goalForm.title" label="Goal Title *" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="goalForm.goal_type" :items="goalTypeOptions" label="Type" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="goalForm.target_date" label="Target Date" type="date" variant="outlined" density="compact" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="goalForm.description" label="Description" variant="outlined" density="compact" rows="2" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showGoalDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="saveGoal">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

useHead({ title: 'Medical Partnerships CRM' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// State
const loading = ref(false)
const saving = ref(false)
const mainTab = ref('list')
const detailTab = ref('overview')
const formTab = ref('basic')
const search = ref('')
const filterTier = ref<string | null>(null)
const filterZone = ref<string | null>(null)
const filterPriority = ref<string | null>(null)
const filterFollowup = ref('all')

// Data
const partners = ref<any[]>([])
const partnerContacts = ref<any[]>([])
const partnerNotes = ref<any[]>([])
const partnerVisits = ref<any[]>([])
const partnerGoals = ref<any[]>([])
const recentActivity = ref<any[]>([])

// Dialog state
const showDetailDialog = ref(false)
const showPartnerDialog = ref(false)
const showVisitDialog = ref(false)
const showContactDialog = ref(false)
const showGoalDialog = ref(false)
const editMode = ref(false)
const selectedPartner = ref<any>(null)
const newNote = ref('')

const snackbar = reactive({ show: false, message: '', color: 'success' })

// Options
const tierOptions = ['platinum', 'gold', 'silver', 'bronze', 'prospect']
const priorityOptions = ['high', 'medium', 'low']
const clinicTypeOptions = ['general', 'specialty', 'emergency', 'urgent_care', 'mobile', 'shelter', 'corporate', 'independent']
const frequencyOptions = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed']
const dayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const timeOptions = ['morning', 'midday', 'afternoon']
const agreementOptions = ['none', 'informal', 'formal', 'exclusive']
const visitTypeOptions = ['visit', 'call', 'email', 'meeting', 'lunch_and_learn', 'ce_event']
const outcomeOptions = ['successful', 'follow_up_needed', 'no_answer', 'voicemail', 'rescheduled', 'declined']
const goalTypeOptions = ['referral', 'revenue', 'relationship', 'event', 'custom']

// Zone definitions with descriptions
const zoneDefinitions = [
  { value: 'Westside & Coastal', title: 'Westside & Coastal 🌊', description: 'Santa Monica, Venice, Marina del Rey, Culver City, Beverly Hills, Westwood, Malibu, Pacific Palisades, Brentwood' },
  { value: 'South Valley', title: 'South Valley 🎬', description: 'Studio City, Sherman Oaks, Encino, Tarzana, Woodland Hills, Burbank, Toluca Lake, Universal City' },
  { value: 'North Valley', title: 'North Valley 🏘️', description: 'Northridge, Chatsworth, Granada Hills, Porter Ranch, Van Nuys, Reseda, Canoga Park, North Hollywood, Sun Valley, Sylmar' },
  { value: 'Central & Eastside', title: 'Central & Eastside 🏙️', description: 'DTLA, Silver Lake, Echo Park, Hollywood, West Hollywood, Los Feliz, Eagle Rock, Boyle Heights' },
  { value: 'South Bay', title: 'South Bay & Airport ✈️', description: 'El Segundo, Manhattan Beach, Torrance, Redondo Beach, Hawthorne, Inglewood, Gardena' },
  { value: 'San Gabriel Valley', title: 'San Gabriel Valley 🥡', description: 'Pasadena, Glendale, Arcadia, Alhambra, Monterey Park, San Marino' }
]

// Zone options for select dropdowns
const zoneOptions = zoneDefinitions.map(z => ({ title: z.title, value: z.value }))

// Get zone display name with emoji
const getZoneDisplay = (zone: string | null) => {
  if (!zone) return 'No zone'
  const def = zoneDefinitions.find(z => z.value === zone)
  return def ? def.title : zone
}

// Get zone description
const getZoneDescription = (zone: string | null) => {
  if (!zone) return ''
  const def = zoneDefinitions.find(z => z.value === zone)
  return def ? def.description : ''
}

// Forms
const form = reactive({
  id: '',
  name: '',
  status: 'active',
  address: '',
  phone: '',
  email: '',
  website: '',
  notes: '',
  tier: 'bronze',
  priority: 'medium',
  zone: '',
  clinic_type: 'general',
  contact_name: '',
  referral_agreement_type: 'none',
  visit_frequency: 'monthly',
  preferred_visit_day: null as string | null,
  preferred_visit_time: null as string | null,
  best_contact_person: '',
  next_followup_date: '',
  needs_followup: false
})

const visitForm = reactive({
  partner_id: '',
  visit_date: new Date().toISOString().split('T')[0],
  visit_type: 'visit',
  contacted_person: '',
  summary: '',
  outcome: '',
  next_steps: ''
})

const contactForm = reactive({
  partner_id: '',
  name: '',
  title: '',
  email: '',
  phone: '',
  is_primary: false
})

const goalForm = reactive({
  partner_id: '',
  goal_type: 'relationship',
  title: '',
  description: '',
  target_date: ''
})

// Table headers
const tableHeaders = [
  { title: 'Partner', key: 'name', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Last Visit', key: 'last_visit_date', sortable: true },
  { title: 'Next Follow-up', key: 'next_followup_date', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const activeCount = computed(() => partners.value.filter(p => p.status === 'active').length)
const needsFollowupCount = computed(() => partners.value.filter(p => p.needs_followup).length)
const overdueCount = computed(() => overduePartners.value.length)

const uniqueZones = computed(() => {
  return zoneDefinitions.map(z => z.value)
})

const filteredPartners = computed(() => {
  let result = partners.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(p => p.name?.toLowerCase().includes(q) || p.zone?.toLowerCase().includes(q))
  }
  if (filterTier.value) result = result.filter(p => p.tier === filterTier.value)
  if (filterZone.value) result = result.filter(p => p.zone === filterZone.value)
  if (filterPriority.value) result = result.filter(p => p.priority === filterPriority.value)
  if (filterFollowup.value === 'followup') result = result.filter(p => p.needs_followup)
  if (filterFollowup.value === 'overdue') result = result.filter(p => isOverdue(p))
  return result
})

const overduePartners = computed(() => {
  return partners.value.filter(p => isOverdue(p))
})

const weeklyTargets = computed(() => {
  return partners.value
    .filter(p => p.status === 'active' && (p.visit_frequency === 'weekly' || p.needs_followup))
    .sort((a, b) => (a.priority === 'high' ? -1 : 1))
    .slice(0, 10)
})

// Methods
function isOverdue(partner: any): boolean {
  if (!partner.last_visit_date || partner.visit_frequency === 'as_needed') return false
  const last = new Date(partner.last_visit_date)
  const now = new Date()
  const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  const thresholds: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, annually: 365 }
  return days > (thresholds[partner.visit_frequency] || 30)
}

function isPastDue(date: string): boolean {
  return new Date(date) < new Date()
}

function formatDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = { platinum: '#E5E4E2', gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32', prospect: '#9E9E9E' }
  return colors[tier] || '#9E9E9E'
}

function getTierLabel(tier: string): string {
  const labels: Record<string, string> = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B', prospect: '?' }
  return labels[tier] || '?'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = { high: 'error', medium: 'warning', low: 'info' }
  return colors[priority] || 'grey'
}

function getVisitTypeColor(type: string): string {
  const colors: Record<string, string> = { visit: 'success', call: 'info', email: 'purple', meeting: 'primary', lunch_and_learn: 'orange', ce_event: 'pink' }
  return colors[type] || 'grey'
}

function getZoneCount(zone: string): number {
  if (zone === 'Unassigned') return partners.value.filter(p => !p.zone).length
  return partners.value.filter(p => p.zone === zone).length
}

// Data loading
async function loadPartners() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('referral_partners')
      .select('*')
      .order('name')
    if (error) throw error
    partners.value = data || []
  } catch (e: any) {
    console.error('Error loading partners:', e)
    snackbar.message = 'Error loading partners'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loading.value = false
  }
}

async function loadPartnerDetails(partnerId: string) {
  try {
    const [contacts, notes, visits, goals] = await Promise.all([
      supabase.from('partner_contacts').select('*').eq('partner_id', partnerId).order('is_primary', { ascending: false }),
      supabase.from('partner_notes').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('partner_visit_logs').select('*').eq('partner_id', partnerId).order('visit_date', { ascending: false }),
      supabase.from('partner_goals').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false })
    ])
    partnerContacts.value = contacts.data || []
    partnerNotes.value = notes.data || []
    partnerVisits.value = visits.data || []
    partnerGoals.value = goals.data || []
  } catch (e) {
    console.error('Error loading partner details:', e)
  }
}

async function loadRecentActivity() {
  try {
    const { data, error } = await supabase
      .from('partner_visit_logs')
      .select('*, referral_partners(name)')
      .order('visit_date', { ascending: false })
      .limit(20)
    if (error) throw error
    recentActivity.value = (data || []).map(d => ({ ...d, partner_name: d.referral_partners?.name }))
  } catch (e) {
    console.error('Error loading activity:', e)
  }
}

// Dialog handlers
function openPartnerDetail(partner: any) {
  selectedPartner.value = partner
  detailTab.value = 'overview'
  loadPartnerDetails(partner.id)
  showDetailDialog.value = true
}

function openAddPartner() {
  editMode.value = false
  resetForm()
  formTab.value = 'basic'
  showPartnerDialog.value = true
}

function openEditPartner(partner: any) {
  editMode.value = true
  Object.assign(form, {
    id: partner.id,
    name: partner.name || '',
    status: partner.status || 'active',
    address: partner.address || '',
    phone: partner.phone || '',
    email: partner.email || '',
    website: partner.website || '',
    notes: partner.notes || '',
    tier: partner.tier || 'bronze',
    priority: partner.priority || 'medium',
    zone: partner.zone || '',
    clinic_type: partner.clinic_type || 'general',
    contact_name: partner.contact_name || '',
    referral_agreement_type: partner.referral_agreement_type || 'none',
    visit_frequency: partner.visit_frequency || 'monthly',
    preferred_visit_day: partner.preferred_visit_day || null,
    preferred_visit_time: partner.preferred_visit_time || null,
    best_contact_person: partner.best_contact_person || '',
    next_followup_date: partner.next_followup_date || '',
    needs_followup: partner.needs_followup || false
  })
  formTab.value = 'basic'
  showPartnerDialog.value = true
}

function openLogVisit(partner: any, type: string) {
  visitForm.partner_id = partner.id
  visitForm.visit_date = new Date().toISOString().split('T')[0]
  visitForm.visit_type = type
  visitForm.contacted_person = partner.best_contact_person || partner.contact_name || ''
  visitForm.summary = ''
  visitForm.outcome = ''
  visitForm.next_steps = ''
  showVisitDialog.value = true
}

function openAddContact() {
  if (!selectedPartner.value) return
  contactForm.partner_id = selectedPartner.value.id
  contactForm.name = ''
  contactForm.title = ''
  contactForm.email = ''
  contactForm.phone = ''
  contactForm.is_primary = false
  showContactDialog.value = true
}

function openAddGoal() {
  if (!selectedPartner.value) return
  goalForm.partner_id = selectedPartner.value.id
  goalForm.goal_type = 'relationship'
  goalForm.title = ''
  goalForm.description = ''
  goalForm.target_date = ''
  showGoalDialog.value = true
}

function resetForm() {
  Object.assign(form, {
    id: '',
    name: '',
    status: 'active',
    address: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    tier: 'bronze',
    priority: 'medium',
    zone: '',
    clinic_type: 'general',
    contact_name: '',
    referral_agreement_type: 'none',
    visit_frequency: 'monthly',
    preferred_visit_day: null,
    preferred_visit_time: null,
    best_contact_person: '',
    next_followup_date: '',
    needs_followup: false
  })
}

// Save handlers
async function savePartner() {
  if (!form.name) {
    snackbar.message = 'Partner name is required'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name,
      status: form.status,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      website: form.website || null,
      notes: form.notes || null,
      tier: form.tier,
      priority: form.priority,
      zone: form.zone || null,
      clinic_type: form.clinic_type,
      contact_name: form.contact_name || null,
      referral_agreement_type: form.referral_agreement_type,
      visit_frequency: form.visit_frequency,
      preferred_visit_day: form.preferred_visit_day,
      preferred_visit_time: form.preferred_visit_time,
      best_contact_person: form.best_contact_person || null,
      next_followup_date: form.next_followup_date || null,
      needs_followup: form.needs_followup
    }
    if (editMode.value) {
      const { error } = await supabase.from('referral_partners').update(payload).eq('id', form.id)
      if (error) throw error
      snackbar.message = 'Partner updated'
    } else {
      const { error } = await supabase.from('referral_partners').insert(payload)
      if (error) throw error
      snackbar.message = 'Partner added'
    }
    snackbar.color = 'success'
    snackbar.show = true
    showPartnerDialog.value = false
    await loadPartners()
  } catch (e: any) {
    console.error('Error saving partner:', e)
    snackbar.message = e.message || 'Error saving partner'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

async function saveVisitLog() {
  if (!visitForm.summary) {
    snackbar.message = 'Summary is required'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  saving.value = true
  try {
    const { error } = await supabase.from('partner_visit_logs').insert({
      partner_id: visitForm.partner_id,
      visit_date: visitForm.visit_date,
      visit_type: visitForm.visit_type,
      contacted_person: visitForm.contacted_person || null,
      summary: visitForm.summary,
      outcome: visitForm.outcome || null,
      next_steps: visitForm.next_steps || null,
      logged_by: user.value?.id
    })
    if (error) throw error
    snackbar.message = 'Visit logged'
    snackbar.color = 'success'
    snackbar.show = true
    showVisitDialog.value = false
    await loadPartners()
    if (selectedPartner.value?.id === visitForm.partner_id) {
      await loadPartnerDetails(visitForm.partner_id)
    }
  } catch (e: any) {
    console.error('Error logging visit:', e)
    snackbar.message = e.message || 'Error logging visit'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

async function saveContact() {
  if (!contactForm.name) {
    snackbar.message = 'Name is required'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  saving.value = true
  try {
    const { error } = await supabase.from('partner_contacts').insert({
      partner_id: contactForm.partner_id,
      name: contactForm.name,
      title: contactForm.title || null,
      email: contactForm.email || null,
      phone: contactForm.phone || null,
      is_primary: contactForm.is_primary
    })
    if (error) throw error
    snackbar.message = 'Contact added'
    snackbar.color = 'success'
    snackbar.show = true
    showContactDialog.value = false
    if (selectedPartner.value) await loadPartnerDetails(selectedPartner.value.id)
  } catch (e: any) {
    console.error('Error saving contact:', e)
    snackbar.message = e.message || 'Error saving contact'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

async function saveGoal() {
  if (!goalForm.title) {
    snackbar.message = 'Goal title is required'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  saving.value = true
  try {
    const { error } = await supabase.from('partner_goals').insert({
      partner_id: goalForm.partner_id,
      goal_type: goalForm.goal_type,
      title: goalForm.title,
      description: goalForm.description || null,
      target_date: goalForm.target_date || null,
      created_by: user.value?.id
    })
    if (error) throw error
    snackbar.message = 'Goal added'
    snackbar.color = 'success'
    snackbar.show = true
    showGoalDialog.value = false
    if (selectedPartner.value) await loadPartnerDetails(selectedPartner.value.id)
  } catch (e: any) {
    console.error('Error saving goal:', e)
    snackbar.message = e.message || 'Error saving goal'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

async function addNote() {
  if (!selectedPartner.value || !newNote.value.trim()) return
  saving.value = true
  try {
    const { error } = await supabase.from('partner_notes').insert({
      partner_id: selectedPartner.value.id,
      content: newNote.value.trim(),
      note_type: 'general',
      created_by: user.value?.id
    })
    if (error) throw error
    newNote.value = ''
    await loadPartnerDetails(selectedPartner.value.id)
    snackbar.message = 'Note added'
    snackbar.color = 'success'
    snackbar.show = true
  } catch (e: any) {
    console.error('Error adding note:', e)
    snackbar.message = e.message || 'Error adding note'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

function exportPartners() {
  const csv = [
    ['Name', 'Tier', 'Priority', 'Zone', 'Status', 'Phone', 'Email', 'Last Visit', 'Next Follow-up'].join(','),
    ...filteredPartners.value.map(p => [
      `"${p.name || ''}"`,
      p.tier || '',
      p.priority || '',
      `"${p.zone || ''}"`,
      p.status || '',
      p.phone || '',
      p.email || '',
      p.last_visit_date || '',
      p.next_followup_date || ''
    ].join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'medical-partnerships.csv'
  link.click()
  snackbar.message = 'Partners exported'
  snackbar.color = 'success'
  snackbar.show = true
}

// Init
onMounted(() => {
  loadPartners()
  loadRecentActivity()
})
</script>

<style scoped>
.partnerships-page {
  max-width: 1400px;
}
</style>
