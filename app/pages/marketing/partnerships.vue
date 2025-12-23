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
        <v-btn variant="outlined" prepend-icon="mdi-file-upload" size="small" @click="showUploadDialog = true">
          Upload EzyVet Report
        </v-btn>
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
          <v-col cols="6" sm="4" md="2">
            <v-card class="text-center pa-3" variant="tonal" color="primary">
              <div class="text-h5 font-weight-bold">{{ partners.length }}</div>
              <div class="text-caption">Total Partners</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-card class="text-center pa-3" variant="tonal" color="success">
              <div class="text-h5 font-weight-bold">{{ activeCount }}</div>
              <div class="text-caption">Active</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-card class="text-center pa-3" variant="tonal" color="secondary">
              <div class="text-h5 font-weight-bold">{{ totalReferrals.toLocaleString() }}</div>
              <div class="text-caption">Total Referrals</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-card class="text-center pa-3" variant="tonal" color="teal">
              <div class="text-h5 font-weight-bold">${{ formatCurrency(totalRevenue) }}</div>
              <div class="text-caption">Total Revenue</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-card class="text-center pa-3" variant="tonal" color="warning">
              <div class="text-h5 font-weight-bold">{{ needsFollowupCount }}</div>
              <div class="text-caption">Need Follow-up</div>
            </v-card>
          </v-col>
          <v-col cols="6" sm="4" md="2">
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

            <template #item.total_referrals_all_time="{ item }">
              <span v-if="item.total_referrals_all_time" class="font-weight-medium">
                {{ item.total_referrals_all_time.toLocaleString() }}
              </span>
              <span v-else class="text-grey">—</span>
            </template>

            <template #item.total_revenue_all_time="{ item }">
              <span v-if="item.total_revenue_all_time" class="font-weight-medium text-success">
                ${{ Number(item.total_revenue_all_time).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}
              </span>
              <span v-else class="text-grey">—</span>
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
              <v-btn icon="mdi-eye" size="x-small" variant="text" title="View Profile" @click.stop="openPartnerDetail(item)" />
              <v-btn icon="mdi-phone" size="x-small" variant="text" title="Log Call" @click.stop="openLogVisit(item, 'call')" />
              <v-btn icon="mdi-calendar-check" size="x-small" variant="text" title="Log Visit" @click.stop="openLogVisit(item, 'visit')" />
              <v-btn icon="mdi-pencil" size="x-small" variant="text" title="Edit" @click.stop="openEditPartner(item)" />
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
          <v-tab value="relationship">Relationship</v-tab>
          <v-tab value="contacts">Contacts</v-tab>
          <v-tab value="notes">Notes</v-tab>
          <v-tab value="visits">Visit Log</v-tab>
          <v-tab value="events">Events</v-tab>
          <v-tab value="goals">Goals</v-tab>
        </v-tabs>

        <v-card-text style="max-height: 500px; overflow-y: auto;">
          <v-window v-model="detailTab">
            <!-- Overview -->
            <v-window-item value="overview">
              <!-- Stats Summary Cards -->
              <v-row class="mb-4">
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="primary" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">{{ selectedPartner.total_referrals_all_time || 0 }}</div>
                    <div class="text-caption">Total Referrals</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="success" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">${{ formatCompactNumber(selectedPartner.total_revenue_all_time) }}</div>
                    <div class="text-caption">Total Revenue</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" color="info" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">{{ selectedPartner.relationship_score || 50 }}%</div>
                    <div class="text-caption">Relationship Score</div>
                  </v-card>
                </v-col>
                <v-col cols="6" sm="3">
                  <v-card variant="tonal" :color="selectedPartner.needs_followup ? 'warning' : 'grey'" class="pa-3 text-center">
                    <div class="text-h5 font-weight-bold">
                      <v-icon v-if="selectedPartner.needs_followup">mdi-alert</v-icon>
                      <v-icon v-else>mdi-check</v-icon>
                    </div>
                    <div class="text-caption">{{ selectedPartner.needs_followup ? 'Needs Follow-up' : 'On Track' }}</div>
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
                        <v-list-item-title>{{ selectedPartner.address || 'No address' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-phone</v-icon></template>
                        <v-list-item-title>{{ selectedPartner.phone || 'No phone' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-email</v-icon></template>
                        <v-list-item-title>{{ selectedPartner.email || 'No email' }}</v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <template #prepend><v-icon size="18" color="grey">mdi-web</v-icon></template>
                        <v-list-item-title>
                          <a v-if="selectedPartner.website" :href="selectedPartner.website" target="_blank">{{ selectedPartner.website }}</a>
                          <span v-else>No website</span>
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>

                    <!-- Social Media -->
                    <div v-if="selectedPartner.instagram_handle || selectedPartner.facebook_url || selectedPartner.linkedin_url" class="mt-2 d-flex gap-2">
                      <v-btn v-if="selectedPartner.instagram_handle" icon size="small" variant="text" color="pink" :href="'https://instagram.com/' + selectedPartner.instagram_handle" target="_blank">
                        <v-icon>mdi-instagram</v-icon>
                      </v-btn>
                      <v-btn v-if="selectedPartner.facebook_url" icon size="small" variant="text" color="blue" :href="selectedPartner.facebook_url" target="_blank">
                        <v-icon>mdi-facebook</v-icon>
                      </v-btn>
                      <v-btn v-if="selectedPartner.linkedin_url" icon size="small" variant="text" color="indigo" :href="selectedPartner.linkedin_url" target="_blank">
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
                      <v-chip size="small" :color="getTierColor(selectedPartner.tier)" variant="elevated">
                        {{ getTierLabel(selectedPartner.tier) }} - {{ selectedPartner.tier || 'bronze' }}
                      </v-chip>
                      <v-chip size="small" :color="getPriorityColor(selectedPartner.priority)" variant="flat">
                        {{ selectedPartner.priority || 'medium' }} priority
                      </v-chip>
                      <v-chip size="small" variant="outlined">{{ getZoneDisplay(selectedPartner.zone) }}</v-chip>
                    </div>
                    <div class="text-body-2">
                      <div class="mb-1"><strong>Clinic Type:</strong> {{ selectedPartner.clinic_type || 'general' }}</div>
                      <div class="mb-1"><strong>Size:</strong> {{ selectedPartner.size || 'Not set' }}</div>
                      <div class="mb-1"><strong>Organization:</strong> {{ selectedPartner.organization_type || 'Not set' }}</div>
                      <div v-if="selectedPartner.employee_count"><strong>Employees:</strong> {{ selectedPartner.employee_count }}</div>
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
                        <span :class="isOverdue(selectedPartner) ? 'text-error font-weight-bold' : ''">
                          {{ selectedPartner.last_visit_date ? formatDate(selectedPartner.last_visit_date) : 'Never' }}
                        </span>
                        <v-chip v-if="isOverdue(selectedPartner)" size="x-small" color="error" class="ml-2">Overdue</v-chip>
                      </div>
                      <div class="mb-1"><strong>Last Contact:</strong> {{ selectedPartner.last_contact_date ? formatDate(selectedPartner.last_contact_date) : 'Never' }}</div>
                      <div class="mb-1"><strong>Next Follow-up:</strong> {{ selectedPartner.next_followup_date ? formatDate(selectedPartner.next_followup_date) : 'Not set' }}</div>
                      <div class="mb-1"><strong>Visit Frequency:</strong> {{ selectedPartner.visit_frequency || 'monthly' }}</div>
                      <div class="mb-1"><strong>Preferred Day:</strong> {{ selectedPartner.preferred_visit_day || 'Any' }}</div>
                      <div><strong>Preferred Time:</strong> {{ selectedPartner.preferred_visit_time || selectedPartner.preferred_contact_time || 'Any' }}</div>
                    </div>
                    <div v-if="selectedPartner.best_contact_person" class="mt-2 pa-2 bg-grey-lighten-4 rounded">
                      <strong>Best Contact:</strong> {{ selectedPartner.best_contact_person }}
                    </div>
                  </v-card>

                  <!-- Agreements -->
                  <v-card variant="outlined" class="pa-3">
                    <h4 class="text-subtitle-2 mb-2 d-flex align-center">
                      <v-icon size="18" class="mr-2">mdi-handshake</v-icon>
                      Agreements & Eligibility
                    </h4>
                    <div class="text-body-2 mb-2">
                      <div class="mb-1"><strong>Referral Agreement:</strong> {{ selectedPartner.referral_agreement_type || 'none' }}</div>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <v-chip size="small" :color="selectedPartner.ce_event_host ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ selectedPartner.ce_event_host ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        CE Event Host
                      </v-chip>
                      <v-chip size="small" :color="selectedPartner.lunch_and_learn_eligible !== false ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ selectedPartner.lunch_and_learn_eligible !== false ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        Lunch & Learn
                      </v-chip>
                      <v-chip size="small" :color="selectedPartner.drop_off_materials !== false ? 'success' : 'grey'" variant="tonal">
                        <v-icon start size="14">{{ selectedPartner.drop_off_materials !== false ? 'mdi-check' : 'mdi-close' }}</v-icon>
                        Drop-off Materials
                      </v-chip>
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Description / Notes -->
              <v-row v-if="selectedPartner.description || selectedPartner.notes" class="mt-2">
                <v-col cols="12">
                  <v-card variant="outlined" class="pa-3">
                    <h4 class="text-subtitle-2 mb-2">Notes</h4>
                    <div class="text-body-2">{{ selectedPartner.description || selectedPartner.notes }}</div>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <!-- Relationship Tab -->
            <v-window-item value="relationship">
              <v-row>
                <!-- Relationship Health -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="primary">mdi-heart-pulse</v-icon>
                      Relationship Health
                    </h4>
                    <div class="d-flex align-center mb-3">
                      <div class="text-h3 font-weight-bold mr-3" :class="getRelationshipScoreColor(selectedPartner.relationship_score)">
                        {{ selectedPartner.relationship_score || 50 }}
                      </div>
                      <div>
                        <div class="text-body-2">out of 100</div>
                        <div class="text-caption text-grey">{{ getRelationshipScoreLabel(selectedPartner.relationship_score) }}</div>
                      </div>
                    </div>
                    <v-progress-linear
                      :model-value="selectedPartner.relationship_score || 50"
                      :color="getRelationshipScoreColorName(selectedPartner.relationship_score)"
                      height="12"
                      rounded
                    />
                    <div class="mt-3 text-body-2">
                      <div class="mb-1">
                        <v-icon size="16" :color="selectedPartner.last_visit_date ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Last Visit: {{ selectedPartner.last_visit_date ? formatDate(selectedPartner.last_visit_date) : 'Never' }}
                      </div>
                      <div class="mb-1">
                        <v-icon size="16" :color="selectedPartner.last_contact_date ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Last Contact: {{ selectedPartner.last_contact_date ? formatDate(selectedPartner.last_contact_date) : 'Never' }}
                      </div>
                      <div>
                        <v-icon size="16" :color="partnerNotes.length ? 'success' : 'grey'">mdi-check-circle</v-icon>
                        Notes: {{ partnerNotes.length }} recorded
                      </div>
                    </div>
                  </v-card>
                </v-col>

                <!-- Revenue Stats -->
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
                          <strong>{{ selectedPartner.total_referrals_all_time || 0 }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Referrals YTD</span>
                          <strong>{{ selectedPartner.total_referrals_ytd || 0 }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-divider class="my-2" />
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Total Revenue (All Time)</span>
                          <strong class="text-success">${{ Number(selectedPartner.total_revenue_all_time || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Revenue YTD</span>
                          <strong>${{ Number(selectedPartner.revenue_ytd || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Revenue Last Year</span>
                          <strong>${{ Number(selectedPartner.revenue_last_year || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item class="px-0">
                        <v-list-item-title class="d-flex justify-space-between">
                          <span>Avg Monthly Revenue</span>
                          <strong>${{ Number(selectedPartner.average_monthly_revenue || 0).toLocaleString() }}</strong>
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                    <div v-if="selectedPartner.last_sync_date" class="mt-2 text-caption text-grey">
                      Last synced: {{ formatDate(selectedPartner.last_sync_date) }}
                    </div>
                  </v-card>
                </v-col>

                <!-- Goals Progress -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="warning">mdi-target</v-icon>
                      Goals & Targets
                    </h4>
                    <div class="text-body-2">
                      <div class="mb-2">
                        <div class="d-flex justify-space-between mb-1">
                          <span>Monthly Referral Goal</span>
                          <span>{{ selectedPartner.current_month_referrals || 0 }} / {{ selectedPartner.monthly_referral_goal || 0 }}</span>
                        </div>
                        <v-progress-linear
                          :model-value="selectedPartner.monthly_referral_goal ? ((selectedPartner.current_month_referrals || 0) / selectedPartner.monthly_referral_goal) * 100 : 0"
                          color="primary"
                          height="8"
                          rounded
                        />
                      </div>
                      <div>
                        <div class="d-flex justify-space-between mb-1">
                          <span>Quarterly Revenue Goal</span>
                          <span>${{ Number(selectedPartner.current_quarter_revenue || 0).toLocaleString() }} / ${{ Number(selectedPartner.quarterly_revenue_goal || 0).toLocaleString() }}</span>
                        </div>
                        <v-progress-linear
                          :model-value="selectedPartner.quarterly_revenue_goal ? ((selectedPartner.current_quarter_revenue || 0) / selectedPartner.quarterly_revenue_goal) * 100 : 0"
                          color="success"
                          height="8"
                          rounded
                        />
                      </div>
                    </div>
                  </v-card>
                </v-col>

                <!-- Payment Status (for sponsors) -->
                <v-col cols="12" md="6" v-if="selectedPartner.payment_status || selectedPartner.payment_amount">
                  <v-card variant="outlined" class="pa-4">
                    <h4 class="text-subtitle-1 mb-3 d-flex align-center">
                      <v-icon class="mr-2" color="info">mdi-credit-card</v-icon>
                      Payment Status
                    </h4>
                    <div class="d-flex align-center gap-3">
                      <v-chip :color="getPaymentStatusColor(selectedPartner.payment_status)" variant="flat">
                        {{ selectedPartner.payment_status || 'N/A' }}
                      </v-chip>
                      <div v-if="selectedPartner.payment_amount" class="text-h6">
                        ${{ Number(selectedPartner.payment_amount).toLocaleString() }}
                      </div>
                    </div>
                    <div v-if="selectedPartner.payment_date" class="mt-2 text-caption">
                      Payment Date: {{ formatDate(selectedPartner.payment_date) }}
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
                      <div class="d-flex align-center gap-2">
                        <v-chip size="x-small" variant="outlined">{{ note.note_type }}</v-chip>
                        <v-chip v-if="note.author_initials" size="x-small" color="primary" variant="flat">
                          {{ note.author_initials }}
                        </v-chip>
                      </div>
                      <span class="text-caption text-grey">{{ formatDateTime(note.created_at) }}</span>
                    </div>
                    <div class="text-body-2 my-2">{{ note.content }}</div>
                    <div class="text-caption text-grey d-flex justify-space-between">
                      <span v-if="note.created_by_name">— {{ note.created_by_name }}</span>
                      <span v-if="note.edited_at" class="text-italic">
                        (edited {{ formatDateTime(note.edited_at) }}<span v-if="note.edited_by_initials"> by {{ note.edited_by_initials }}</span>)
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

            <!-- Events -->
            <v-window-item value="events">
              <div class="d-flex justify-end mb-2">
                <v-btn size="small" color="primary" variant="tonal" @click="openAddEvent">
                  <v-icon start>mdi-plus</v-icon> Add Event
                </v-btn>
              </div>
              <v-list density="compact">
                <v-list-item v-for="event in partnerEvents" :key="event.id" class="mb-2">
                  <template #prepend>
                    <v-icon color="primary">mdi-calendar-star</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ event.marketing_events?.name || event.event_name || 'Unknown Event' }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(event.marketing_events?.event_date || event.event_date) }}
                    • {{ event.participation_role?.replace('_', ' ') }}
                  </v-list-item-subtitle>
                  <template #append>
                    <v-chip size="x-small" :color="event.is_confirmed ? 'success' : 'warning'" variant="tonal">
                      {{ event.is_confirmed ? 'Confirmed' : 'Pending' }}
                    </v-chip>
                  </template>
                </v-list-item>
                <v-list-item v-if="!partnerEvents.length">
                  <v-list-item-title class="text-grey">No events recorded</v-list-item-title>
                </v-list-item>
              </v-list>
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

    <!-- ADD EVENT DIALOG -->
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
                <template #item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template #subtitle>{{ formatDate(item.raw.event_date) }}</template>
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

    <!-- UPLOAD EZYVET REPORT DIALOG -->
    <v-dialog v-model="showUploadDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-file-upload</v-icon>
          Upload EzyVet Referrer Revenue Report
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-grey-darken-1 mb-4">
            Upload a "Referrer Revenue" PDF from EzyVet to automatically update partner referral stats.
            Clinics will be matched by name and their visit counts and revenue totals will be updated.
          </p>
          
          <v-file-input
            v-model="uploadFile"
            accept=".pdf"
            label="Select PDF Report"
            variant="outlined"
            prepend-icon="mdi-file-pdf-box"
            :disabled="uploadProcessing"
            show-size
          />

          <!-- Processing indicator -->
          <div v-if="uploadProcessing" class="text-center my-4">
            <v-progress-circular indeterminate color="primary" size="48" class="mb-2" />
            <div class="text-body-2">Processing PDF... This may take a moment.</div>
          </div>

          <!-- Results -->
          <v-alert v-if="uploadResult" :type="uploadResult.success ? 'success' : 'error'" class="mt-4">
            <v-alert-title>{{ uploadResult.success ? 'Upload Successful' : 'Upload Failed' }}</v-alert-title>
            <div v-if="uploadResult.success">
              <div class="d-flex flex-wrap gap-4 my-2">
                <div>
                  <div class="text-h6 font-weight-bold">{{ uploadResult.updated }}</div>
                  <div class="text-caption">Partners Updated</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold">{{ uploadResult.visitorsAdded }}</div>
                  <div class="text-caption">Visits Added</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold">${{ uploadResult.revenueAdded?.toLocaleString() }}</div>
                  <div class="text-caption">Revenue Added</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold text-warning">{{ uploadResult.skipped }}</div>
                  <div class="text-caption">Unknown Clinics Skipped</div>
                </div>
                <div>
                  <div class="text-h6 font-weight-bold text-info">{{ uploadResult.notMatched }}</div>
                  <div class="text-caption">Not Matched</div>
                </div>
              </div>
              
              <!-- Show unmatched clinics -->
              <v-expansion-panels v-if="uploadResult.details?.length" variant="accordion" class="mt-2">
                <v-expansion-panel title="View Details">
                  <v-expansion-panel-text>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item v-for="(detail, idx) in uploadResult.details" :key="idx">
                        <template #prepend>
                          <v-icon :color="detail.matched ? 'success' : 'warning'" size="small">
                            {{ detail.matched ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                          </v-icon>
                        </template>
                        <v-list-item-title>{{ detail.clinicName }}</v-list-item-title>
                        <v-list-item-subtitle>
                          {{ detail.visits }} visits, ${{ detail.revenue.toLocaleString() }}
                          <span v-if="detail.matchedTo" class="text-success"> → {{ detail.matchedTo }}</span>
                          <span v-else class="text-warning"> (No match found)</span>
                        </v-list-item-subtitle>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
            <div v-else>{{ uploadResult.message }}</div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeUploadDialog">Close</v-btn>
          <v-btn 
            color="primary" 
            :loading="uploadProcessing" 
            :disabled="!hasUploadFile || uploadProcessing"
            @click="processUpload"
          >
            Process Report
          </v-btn>
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

// Upload EzyVet Report state
const showUploadDialog = ref(false)
const uploadFile = ref<File | File[] | null>(null)
const uploadProcessing = ref(false)
const uploadResult = ref<any>(null)

// Computed to check if file is selected
const hasUploadFile = computed(() => {
  if (!uploadFile.value) return false
  if (Array.isArray(uploadFile.value)) return uploadFile.value.length > 0
  return true
})

// Data
const partners = ref<any[]>([])
const partnerContacts = ref<any[]>([])
const partnerNotes = ref<any[]>([])
const partnerVisits = ref<any[]>([])
const partnerGoals = ref<any[]>([])
const partnerEvents = ref<any[]>([])
const recentActivity = ref<any[]>([])
const marketingEvents = ref<any[]>([]) // For event selection dropdown

// Dialog state
const showDetailDialog = ref(false)
const showPartnerDialog = ref(false)
const showVisitDialog = ref(false)
const showContactDialog = ref(false)
const showGoalDialog = ref(false)
const showEventDialog = ref(false)
const editMode = ref(false)
const selectedPartner = ref<any>(null)
const newNote = ref('')

const snackbar = reactive({ show: false, message: '', color: 'success' })

// Event form
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
  { title: 'Volunteer', value: 'volunteer' },
  { title: 'Host', value: 'host' },
  { title: 'Speaker', value: 'speaker' },
  { title: 'Exhibitor', value: 'exhibitor' }
]

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
  { title: 'Referrals', key: 'total_referrals_all_time', sortable: true },
  { title: 'Revenue', key: 'total_revenue_all_time', sortable: true },
  { title: 'Last Visit', key: 'last_visit_date', sortable: true },
  { title: 'Next Follow-up', key: 'next_followup_date', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Computed
const activeCount = computed(() => partners.value.filter(p => p.status === 'active').length)
const needsFollowupCount = computed(() => partners.value.filter(p => p.needs_followup).length)
const overdueCount = computed(() => overduePartners.value.length)
const totalReferrals = computed(() => partners.value.reduce((sum, p) => sum + (p.total_referrals_all_time || 0), 0))
const totalRevenue = computed(() => partners.value.reduce((sum, p) => sum + (Number(p.total_revenue_all_time) || 0), 0))

function formatCurrency(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M'
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K'
  return value.toFixed(0)
}

function formatCompactNumber(value: any): string {
  const num = Number(value) || 0
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

function getRelationshipScoreColor(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'text-success'
  if (s >= 60) return 'text-info'
  if (s >= 40) return 'text-warning'
  return 'text-error'
}

function getRelationshipScoreColorName(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'success'
  if (s >= 60) return 'info'
  if (s >= 40) return 'warning'
  return 'error'
}

function getRelationshipScoreLabel(score: number | null): string {
  const s = score || 50
  if (s >= 80) return 'Excellent'
  if (s >= 60) return 'Good'
  if (s >= 40) return 'Needs Attention'
  return 'At Risk'
}

function getPaymentStatusColor(status: string | null): string {
  const colors: Record<string, string> = { 
    paid: 'success', 
    pending: 'warning', 
    overdue: 'error', 
    waived: 'info' 
  }
  return colors[status || ''] || 'grey'
}

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
    const [contacts, notes, visits, goals, events] = await Promise.all([
      supabase.from('partner_contacts').select('*').eq('partner_id', partnerId).order('is_primary', { ascending: false }),
      supabase.from('partner_notes').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('partner_visit_logs').select('*').eq('partner_id', partnerId).order('visit_date', { ascending: false }),
      supabase.from('partner_goals').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }),
      supabase.from('partner_events').select('*, marketing_events(name, event_date)').eq('partner_id', partnerId).order('event_date', { ascending: false })
    ])
    partnerContacts.value = contacts.data || []
    partnerNotes.value = notes.data || []
    partnerVisits.value = visits.data || []
    partnerGoals.value = goals.data || []
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

function openAddEvent() {
  if (!selectedPartner.value) return
  loadMarketingEvents() // Load events for dropdown
  eventForm.partner_id = selectedPartner.value.id
  eventForm.event_id = null
  eventForm.event_name = ''
  eventForm.event_date = ''
  eventForm.participation_role = 'attendee'
  eventForm.notes = ''
  showEventDialog.value = true
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

async function saveEvent() {
  if (!eventForm.event_id && !eventForm.event_name) {
    snackbar.message = 'Please select an event or enter a custom event name'
    snackbar.color = 'warning'
    snackbar.show = true
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
    snackbar.message = 'Event added'
    snackbar.color = 'success'
    snackbar.show = true
    showEventDialog.value = false
    if (selectedPartner.value) await loadPartnerDetails(selectedPartner.value.id)
  } catch (e: any) {
    console.error('Error saving event:', e)
    snackbar.message = e.message || 'Error saving event'
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
    // Get user profile for initials and name
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

    // Insert note with author info
    const { error: noteError } = await supabase.from('partner_notes').insert({
      partner_id: selectedPartner.value.id,
      content: newNote.value.trim(),
      note_type: 'general',
      created_by: user.value?.id,
      author_initials: initials.toUpperCase(),
      created_by_name: fullName
    })
    if (noteError) throw noteError

    // Update partner's last_contact_date (note implies contact was made)
    const { error: updateError } = await supabase
      .from('referral_partners')
      .update({ 
        last_contact_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedPartner.value.id)
    if (updateError) console.warn('Could not update last_contact_date:', updateError)

    newNote.value = ''
    await loadPartnerDetails(selectedPartner.value.id)
    await loadPartners() // Refresh to show updated last_contact_date
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

// Upload EzyVet Report functions
async function processUpload() {
  if (!hasUploadFile.value || !uploadFile.value) return
  
  uploadProcessing.value = true
  uploadResult.value = null
  
  try {
    const formData = new FormData()
    const file = Array.isArray(uploadFile.value) ? uploadFile.value[0] : uploadFile.value
    if (file) {
      formData.append('file', file)
    }
    
    // Get the current session token to pass to the server
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session - please log in again')
    }
    
    const response = await $fetch<any>('/api/parse-referrals', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    uploadResult.value = response
    
    if (response.success) {
      // Refresh partners list to show updated stats
      await loadPartners()
      snackbar.message = `Updated ${response.updated} partners with $${response.revenueAdded?.toLocaleString()} revenue`
      snackbar.color = 'success'
      snackbar.show = true
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    uploadResult.value = {
      success: false,
      message: error.data?.message || error.message || 'Failed to process PDF'
    }
    snackbar.message = 'Failed to process PDF'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    uploadProcessing.value = false
  }
}

function closeUploadDialog() {
  showUploadDialog.value = false
  uploadFile.value = null
  uploadResult.value = null
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
