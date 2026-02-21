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
      <div class="d-flex gap-2 flex-wrap">
        <v-btn color="success" variant="flat" prepend-icon="mdi-map-marker-plus" size="small" class="quick-visit-btn" @click="quickVisitRef?.open()">
          Quick Visit
        </v-btn>
        <v-btn color="teal" variant="flat" prepend-icon="mdi-cloud-sync" size="small" :loading="syncingReferrals" @click="syncReferralsFromEzyVet">
          Sync from ezyVet
        </v-btn>
        <v-btn 
          variant="outlined" 
          prepend-icon="mdi-refresh" 
          size="small" 
          :loading="recalculating"
          @click="recalculateMetrics"
        >
          Recalculate Metrics
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-file-export-outline" size="small" @click="showExportDialog = true">
          Export
        </v-btn>
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="small" icon="mdi-dots-vertical" />
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-file-upload" @click="showUploadDialog = true">
              <v-list-item-title>Upload EzyVet Report (Manual)</v-list-item-title>
            </v-list-item>
            <v-list-item prepend-icon="mdi-file-import-outline" @click="showImportWizard = true">
              <v-list-item-title>Import CSV</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
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
      <v-tab value="upload-log">
        <v-icon start>mdi-file-alert-outline</v-icon>
        Upload Log
        <v-badge v-if="unmatchedEntries.length" :content="unmatchedEntries.length" color="warning" inline class="ml-1" />
      </v-tab>
    </v-tabs>

    <v-window v-model="mainTab">
      <!-- PARTNERS LIST TAB -->
      <v-window-item value="list">
        <!-- Stats Row -->
        <UiStatsRow
          :stats="[
            { value: partners.length, label: 'Total Partners', color: 'primary' },
            { value: activeCount, label: 'Active', color: 'success' },
            { value: totalReferrals.toLocaleString(), label: 'Total Referrals', color: 'secondary', format: 'none' },
            { value: '$' + formatCurrency(totalRevenue), label: 'Total Revenue', color: 'teal', format: 'none' },
            { value: needsFollowupCount, label: 'Need Follow-up', color: 'warning' },
            { value: overdueCount, label: 'Overdue Visits', color: 'info' }
          ]"
          layout="6-col"
        />

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
          <v-data-table-virtual
            :headers="tableHeaders"
            :items="filteredPartners"
            :loading="loading"
            hover
            height="calc(100vh - 340px)"
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
                {{ item.priority || 'Medium' }}
              </v-chip>
            </template>

            <template #item.relationship_health="{ item }">
              <div v-if="item.relationship_health !== null" class="d-flex align-center" style="min-width: 80px;">
                <v-progress-linear 
                  :model-value="item.relationship_health" 
                  :color="getRelationshipHealthColor(item.relationship_health)"
                  height="8"
                  rounded
                  style="width: 60px;"
                />
                <span class="text-caption ml-2">{{ item.relationship_health }}%</span>
              </div>
              <span v-else class="text-grey">—</span>
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

            <template #item.last_referral_date="{ item }">
              <div v-if="item.last_referral_date">
                {{ formatPartnerDate(item.last_referral_date) }}
              </div>
              <span v-else class="text-grey">Never</span>
            </template>

            <template #item.last_visit_date="{ item }">
              <div v-if="item.last_visit_date">
                {{ formatPartnerDate(item.last_visit_date) }}
                <div v-if="isPartnerOverdue(item)" class="text-caption text-error">
                  <v-icon size="10">mdi-alert</v-icon> Overdue
                </div>
              </div>
              <span v-else class="text-grey">Never</span>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex align-center" style="white-space: nowrap;">
                <v-btn icon="mdi-eye" size="x-small" variant="text" title="View Profile" aria-label="View partner profile" @click.stop="openPartnerDetail(item)" />
                <v-btn icon="mdi-map-marker-plus" size="x-small" variant="text" color="success" title="Log Visit" aria-label="Log visit" @click.stop="openLogVisit(item)" />
                <v-btn icon="mdi-pencil" size="x-small" variant="text" title="Edit" aria-label="Edit partner" @click.stop="openEditPartner(item)" />
                <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" title="Delete" aria-label="Delete partner" @click.stop="confirmDeletePartner(item)" />
              </div>
            </template>
          </v-data-table-virtual>
        </v-card>
      </v-window-item>

      <!-- TARGETING TAB -->
      <v-window-item value="targeting">
        <!-- Summary Stats Row -->
        <UiStatsRow
          :stats="[
            { value: partners.filter(p => p.status === 'active').length, label: 'Active Partners', color: 'primary' },
            { value: weeklyTargets.length, label: 'This Week\'s Targets', color: 'info' },
            { value: overduePartners.length, label: 'Overdue Visits', color: 'error' },
            { value: partners.filter(p => p.needs_followup).length, label: 'Follow-ups', color: 'warning' }
          ]"
          layout="4-col"
          class="mb-4"
        />

        <!-- Region/Area Collapsible List -->
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="primary" class="mr-2">mdi-map-marker-radius</v-icon>
              Target Clinics by Region
            </div>
            <div class="d-flex align-center gap-2">
              <v-btn size="small" variant="text" @click="expandAllZones">Expand All</v-btn>
              <v-btn size="small" variant="text" @click="collapseAllZones">Collapse All</v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-0">
            <v-expansion-panels v-model="expandedZones" multiple variant="accordion">
              <v-expansion-panel
                v-for="zoneDef in zoneDefinitions"
                :key="zoneDef.value"
                :value="zoneDef.value"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100 pr-2">
                    <div class="d-flex align-center">
                      <span class="text-subtitle-1 font-weight-medium">{{ zoneDef.title }}</span>
                      <v-chip size="x-small" color="primary" variant="tonal" class="ml-2">{{ getZoneCount(zoneDef.value) }}</v-chip>
                    </div>
                    <div class="d-flex align-center gap-2">
                      <v-chip v-if="getZoneOverdueCount(zoneDef.value)" size="x-small" color="error" variant="flat">
                        {{ getZoneOverdueCount(zoneDef.value) }} overdue
                      </v-chip>
                      <v-chip v-if="getZoneFollowupCount(zoneDef.value)" size="x-small" color="warning" variant="flat">
                        {{ getZoneFollowupCount(zoneDef.value) }} follow-up
                      </v-chip>
                      <span class="text-caption text-grey">{{ zoneDef.description }}</span>
                    </div>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <v-list density="compact" class="py-0">
                    <v-list-item
                      v-for="partner in getPartnersByZone(zoneDef.value)"
                      :key="partner.id"
                      :class="{ 'bg-red-lighten-5': partner.visit_overdue }"
                      @click="openPartnerDetail(partner)"
                    >
                      <template #prepend>
                        <v-avatar :color="getTierColor(partner.tier)" size="32">
                          <span class="text-white text-caption">{{ getTierLabel(partner.tier) }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title class="d-flex align-center">
                        {{ partner.name }}
                        <v-icon v-if="partner.visit_overdue" color="error" size="16" class="ml-1">mdi-clock-alert</v-icon>
                        <v-icon v-if="partner.needs_followup" color="warning" size="16" class="ml-1">mdi-flag</v-icon>
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        {{ partner.clinic_type || 'General' }} •
                        Last visit: {{ partner.last_visit_date ? formatPartnerDate(partner.last_visit_date) : 'Never' }} •
                        {{ partner.preferred_visit_day || 'Any day' }}
                      </v-list-item-subtitle>
                      <template #append>
                        <div class="d-flex align-center gap-1">
                          <v-chip size="x-small" :color="getPriorityColor(partner.priority)" variant="flat">
                            {{ partner.priority }}
                          </v-chip>
                          <v-btn size="x-small" color="success" variant="tonal" icon="mdi-map-marker-plus" @click.stop="openLogVisit(partner)" title="Log Visit" />
                        </div>
                      </template>
                    </v-list-item>
                    <v-list-item v-if="!getPartnersByZone(zoneDef.value).length">
                      <v-list-item-title class="text-grey text-center text-caption">No partners in this region</v-list-item-title>
                    </v-list-item>
                  </v-list>

                  <!-- Zone quick actions -->
                  <div class="d-flex justify-end mt-2 mb-1">
                    <v-btn size="x-small" variant="text" color="primary" @click="filterZone = zoneDef.value; mainTab = 'list'">
                      View all in Partners tab
                      <v-icon end size="14">mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Unassigned Zone -->
              <v-expansion-panel v-if="getZoneCount('Unassigned')" value="Unassigned">
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100 pr-2">
                    <div class="d-flex align-center">
                      <span class="text-subtitle-1 font-weight-medium text-grey">Unassigned Region</span>
                      <v-chip size="x-small" color="grey" variant="tonal" class="ml-2">{{ getZoneCount('Unassigned') }}</v-chip>
                    </div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list density="compact" class="py-0">
                    <v-list-item
                      v-for="partner in getPartnersByZone(null)"
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
                        {{ partner.clinic_type || 'General' }} •
                        Last visit: {{ partner.last_visit_date ? formatPartnerDate(partner.last_visit_date) : 'Never' }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-chip size="x-small" :color="getPriorityColor(partner.priority)" variant="flat">
                          {{ partner.priority }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>

        <!-- Overdue Visits by Region (Collapsible) -->
        <v-card variant="outlined" class="mt-4" v-if="overduePartners.length">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
              Overdue Visits
              <v-chip size="small" color="error" variant="flat" class="ml-2">{{ overduePartners.length }}</v-chip>
            </div>
            <div class="d-flex align-center gap-2">
              <v-btn size="small" variant="text" @click="expandAllOverdueZones">Expand All</v-btn>
              <v-btn size="small" variant="text" @click="expandedOverdueZones = []">Collapse All</v-btn>
            </div>
          </v-card-title>

          <v-card-text class="pt-0">
            <v-expansion-panels v-model="expandedOverdueZones" multiple variant="accordion">
              <template v-for="zoneDef in overdueZoneDefinitions" :key="zoneDef.value">
                <v-expansion-panel
                  v-if="getOverduePartnersByZone(zoneDef.value).length"
                  :value="zoneDef.value"
                >
                  <v-expansion-panel-title>
                    <div class="d-flex align-center justify-space-between w-100 pr-2">
                      <div class="d-flex align-center">
                        <span class="text-subtitle-1 font-weight-medium">{{ zoneDef.title }}</span>
                        <v-chip size="x-small" color="error" variant="tonal" class="ml-2">{{ getOverduePartnersByZone(zoneDef.value).length }}</v-chip>
                      </div>
                      <span class="text-caption text-grey">{{ zoneDef.description }}</span>
                    </div>
                  </v-expansion-panel-title>

                  <v-expansion-panel-text>
                    <v-list density="compact" class="py-0">
                      <v-list-item
                        v-for="partner in getOverduePartnersByZone(zoneDef.value)"
                        :key="partner.id"
                        class="bg-red-lighten-5"
                        @click="openPartnerDetail(partner)"
                      >
                        <template #prepend>
                          <v-avatar color="error" size="32">
                            <v-icon size="18">mdi-clock-alert</v-icon>
                          </v-avatar>
                        </template>
                        <v-list-item-title>{{ partner.name }}</v-list-item-title>
                        <v-list-item-subtitle>
                          Last visit: {{ partner.last_visit_date ? formatPartnerDate(partner.last_visit_date) : 'Never' }} •
                          {{ partner.preferred_visit_day || 'Any day' }}
                        </v-list-item-subtitle>
                        <template #append>
                          <div class="d-flex align-center gap-1">
                            <v-chip size="x-small" :color="getPriorityColor(partner.priority)" variant="flat">
                              {{ partner.priority }}
                            </v-chip>
                            <v-btn size="x-small" color="success" variant="tonal" @click.stop="openLogVisit(partner)">
                              Log Visit
                            </v-btn>
                          </div>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </template>
            </v-expansion-panels>
          </v-card-text>
        </v-card>

        <!-- All caught up message -->
        <v-card variant="outlined" class="mt-4" v-else>
          <v-card-text class="text-center py-6">
            <v-icon color="success" size="48" class="mb-2">mdi-check-circle-outline</v-icon>
            <div class="text-h6 text-success">All caught up!</div>
            <div class="text-body-2 text-grey">No overdue visits right now.</div>
          </v-card-text>
        </v-card>
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
              dot-color="success"
              size="small"
            >
              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="font-weight-medium">{{ log.clinic_name }}</div>
                  <div v-if="log.spoke_to" class="text-body-2">Spoke with: {{ log.spoke_to }}</div>
                  <div v-if="log.items_discussed?.length" class="text-body-2">
                    Discussed / Dropped Off: {{ formatItemsDiscussed(log.items_discussed) }}
                  </div>
                  <div v-if="log.visit_notes" class="text-body-2 text-grey-darken-1">{{ log.visit_notes }}</div>
                </div>
                <div class="text-caption text-grey text-no-wrap ml-2">{{ formatPartnerDate(log.visit_date) }}</div>
              </div>
            </v-timeline-item>
            <v-timeline-item v-if="!recentActivity.length" dot-color="grey">
              <div class="text-grey">No recent activity</div>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-window-item>

      <!-- UPLOAD LOG TAB -->
      <v-window-item value="upload-log">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <span>Unmatched Upload Entries</span>
              <div class="text-caption text-grey">Clinics from PDF uploads that didn't match existing partners</div>
            </div>
            <v-btn size="small" variant="text" :loading="loadingUploadLog" @click="loadUploadLog">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          
          <v-card-text v-if="loadingUploadLog">
            <v-skeleton-loader type="table-row@5" />
          </v-card-text>
          
          <v-card-text v-else-if="unmatchedEntries.length === 0">
            <v-alert type="success" variant="tonal" class="mb-0">
              <v-icon start>mdi-check-circle</v-icon>
              All uploaded entries have been matched or logged. Great job!
            </v-alert>
          </v-card-text>
          
          <v-data-table
            v-else
            :headers="uploadLogHeaders"
            :items="unmatchedEntries"
            :items-per-page="25"
            class="elevation-0"
          >
            <template #item.clinicName="{ item }">
              <div class="font-weight-medium">{{ item.clinicName }}</div>
            </template>
            
            <template #item.visits="{ item }">
              <v-chip size="small" color="info" variant="tonal">{{ item.visits }}</v-chip>
            </template>
            
            <template #item.revenue="{ item }">
              <span class="font-weight-medium text-success">${{ item.revenue?.toLocaleString() || 0 }}</span>
            </template>
            
            <template #item.uploadDate="{ item }">
              <span class="text-caption">{{ formatPartnerDate(item.uploadDate) }}</span>
            </template>
            
            <template #item.dateRange="{ item }">
              <span class="text-caption">{{ item.dateRange || 'Unknown' }}</span>
            </template>
            
            <template #item.actions="{ item }">
              <v-btn
                size="small"
                variant="tonal"
                color="success"
                prepend-icon="mdi-check"
                :loading="item.logging"
                @click="markAsLogged(item)"
              >
                Logged
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
        
        <!-- Upload History Summary -->
        <v-card variant="outlined" class="mt-4">
          <v-card-title>Upload History</v-card-title>
          <v-data-table
            :headers="uploadHistoryHeaders"
            :items="uploadHistory"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #item.created_at="{ item }">
              {{ formatPartnerDate(item.created_at) }}
            </template>
            <template #item.date_range_start="{ item }">
              {{ item.date_range_start }} - {{ item.date_range_end }}
            </template>
            <template #item.total_revenue_added="{ item }">
              <span class="text-success">${{ item.total_revenue_added?.toLocaleString() || 0 }}</span>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Partner Detail Dialog -->
    <MarketingPartnershipDetailDialog
      ref="detailDialogRef"
      :get-zone-display="getZoneDisplay"
      @edit="openEditPartner"
      @log-visit="openLogVisit"
      @partner-updated="onPartnerUpdated"
      @notify="(p: { message: string; color: string }) => { snackbar.message = p.message; snackbar.color = p.color; snackbar.show = true }"
    />

    <!-- DELETE CONFIRMATION DIALOG -->
    <v-dialog v-model="showDeleteDialog" max-width="460">
      <v-card>
        <v-card-title class="d-flex align-center text-error">
          <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
          Delete Partner
        </v-card-title>
        <v-card-text>
          <p>Are you sure you want to permanently delete <strong>{{ partnerToDelete?.name }}</strong>?</p>
          <p class="text-caption text-grey mt-2">This will also remove all associated visit logs and activity records. This action cannot be undone.</p>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="deletePartner">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ADD/EDIT PARTNER DIALOG -->
    <v-dialog v-model="showPartnerDialog" max-width="750">
      <v-card>
        <v-card-title>{{ editMode ? 'Edit Partner' : 'Add Partner' }}</v-card-title>
        <v-card-text>
          <v-tabs v-model="formTab" class="mb-4">
            <v-tab value="basic">Basic</v-tab>
            <v-tab value="crm">Classification</v-tab>
            <v-tab value="targeting">Visit Schedule</v-tab>
            <v-tab value="agreements">Agreements</v-tab>
            <v-tab value="stats">Stats</v-tab>
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
                
                <!-- Social Media -->
                <v-col cols="12" class="mt-2">
                  <div class="text-subtitle-2 mb-2 d-flex align-center">
                    <v-icon size="18" class="mr-2">mdi-share-variant</v-icon>
                    Social Media
                  </div>
                </v-col>
                <v-col cols="4">
                  <v-text-field 
                    v-model="form.instagram_handle" 
                    label="Instagram" 
                    variant="outlined" 
                    density="compact"
                    prepend-inner-icon="mdi-instagram"
                    placeholder="@handle"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field 
                    v-model="form.facebook_url" 
                    label="Facebook URL" 
                    variant="outlined" 
                    density="compact"
                    prepend-inner-icon="mdi-facebook"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field 
                    v-model="form.linkedin_url" 
                    label="LinkedIn URL" 
                    variant="outlined" 
                    density="compact"
                    prepend-inner-icon="mdi-linkedin"
                  />
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
                  <v-select v-model="form.size" :items="sizeOptions" label="Size" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="6">
                  <v-select v-model="form.organization_type" :items="organizationTypeOptions" label="Organization Type" variant="outlined" density="compact" clearable />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model.number="form.employee_count" label="Employee Count" type="number" variant="outlined" density="compact" min="0" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.contact_name" label="Primary Contact" variant="outlined" density="compact" />
                </v-col>
                
                <!-- Relationship Health -->
                <v-col cols="12" class="mt-2">
                  <v-alert type="info" variant="tonal" density="compact" class="mb-2">
                    <strong>Relationship Health</strong> is auto-calculated from Tier + Priority + Visit Recency.
                    Use "Recalculate Metrics" to refresh all scores.
                  </v-alert>
                  <div class="d-flex align-center gap-3" v-if="form.relationship_health != null">
                    <span class="text-body-2">Current Score:</span>
                    <v-progress-linear
                      :model-value="form.relationship_health"
                      :color="getRelationshipHealthColor(form.relationship_health)"
                      height="12"
                      rounded
                      style="max-width: 200px;"
                    />
                    <span class="text-body-2 font-weight-medium">{{ form.relationship_health }}%</span>
                  </div>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="targeting">
              <v-row dense>
                <v-col cols="6">
                  <v-select v-model="form.visit_frequency" :items="frequencyOptions" label="Visit Frequency" variant="outlined" density="compact" @update:model-value="syncVisitFrequencyDays" />
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model.number="form.expected_visit_frequency_days" label="Expected Days Between Visits" type="number" variant="outlined" density="compact" min="1" hint="Auto-set from frequency, or override manually" persistent-hint />
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
                <v-col cols="6">
                  <v-text-field v-model="form.next_followup_date" label="Next Follow-up" type="date" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12">
                  <v-switch v-model="form.needs_followup" label="Needs Follow-up" color="warning" hide-details />
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="agreements">
              <v-row dense>
                <v-col cols="12">
                  <v-select v-model="form.referral_agreement_type" :items="agreementOptions" label="Referral Agreement Type" variant="outlined" density="compact" />
                </v-col>
                <v-col cols="12" class="mt-2">
                  <div class="text-subtitle-2 mb-3">Eligibility & Permissions</div>
                </v-col>
                <v-col cols="12">
                  <v-switch 
                    v-model="form.ce_event_host" 
                    label="CE Event Host" 
                    color="success" 
                    hide-details
                    hint="Can host Continuing Education events"
                  />
                </v-col>
                <v-col cols="12">
                  <v-switch 
                    v-model="form.lunch_and_learn_eligible" 
                    label="Lunch & Learn Eligible" 
                    color="success" 
                    hide-details
                    hint="Eligible for lunch and learn sessions"
                  />
                </v-col>
                <v-col cols="12">
                  <v-switch 
                    v-model="form.drop_off_materials" 
                    label="Drop-off Materials" 
                    color="success" 
                    hide-details
                    hint="Can receive drop-off marketing materials"
                  />
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="stats">
              <v-row dense>
                <v-col cols="12">
                  <v-alert type="info" variant="tonal" density="compact" class="mb-4">
                    These stats are typically updated automatically via PDF upload, but you can manually adjust them here if needed.
                  </v-alert>
                </v-col>
                <v-col cols="6">
                  <v-text-field 
                    v-model.number="form.total_referrals_all_time" 
                    label="Total Referrals (Visits)" 
                    type="number" 
                    variant="outlined" 
                    density="compact"
                    min="0"
                    prepend-inner-icon="mdi-account-group"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field 
                    v-model.number="form.total_revenue_all_time" 
                    label="Total Revenue" 
                    type="number" 
                    variant="outlined" 
                    density="compact"
                    min="0"
                    prefix="$"
                    prepend-inner-icon="mdi-currency-usd"
                  />
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

    <!-- UPLOAD EZYVET REPORT DIALOG -->
    <v-dialog v-model="showUploadDialog" max-width="650">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-file-upload</v-icon>
          Upload EzyVet Referral Report
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Supports two report types:</strong>
            <ul class="mt-1 mb-0" style="padding-left: 20px;">
              <li><strong>Referral Statistics</strong> - Updates visit counts &amp; last referral date</li>
              <li><strong>Referrer Revenue</strong> - Updates revenue totals only</li>
            </ul>
            <div class="text-caption mt-1">The report type is auto-detected from the CSV header.</div>
          </v-alert>
          
          <!-- Clear Stats Button -->
          <v-btn
            color="warning"
            variant="outlined"
            size="small"
            class="mb-4"
            :loading="clearingStats"
            @click="clearReferralStats"
          >
            <v-icon start>mdi-delete-sweep</v-icon>
            Clear All Stats First
          </v-btn>
          <p class="text-caption text-grey mb-4">
            Use this to reset all visit/revenue totals before re-importing data.
          </p>
          
          <v-file-input
            v-model="uploadFile"
            accept=".csv"
            label="Select CSV Report"
            variant="outlined"
            prepend-icon="mdi-file-delimited"
            :disabled="uploadProcessing"
            show-size
          />

          <!-- Processing indicator -->
          <div v-if="uploadProcessing" class="text-center my-4">
            <v-progress-circular indeterminate color="primary" size="48" class="mb-2" />
            <div class="text-body-2">Processing CSV... This may take a moment.</div>
          </div>

          <!-- Results -->
          <v-alert v-if="uploadResult" :type="uploadResult.success ? 'success' : 'error'" class="mt-4">
            <v-alert-title class="d-flex align-center gap-2">
              {{ uploadResult.success ? 'Upload Successful' : 'Upload Failed' }}
              <v-chip v-if="uploadResult.reportType" size="small" :color="uploadResult.reportType === 'statistics' ? 'primary' : 'success'" variant="flat">
                {{ uploadResult.reportType === 'statistics' ? 'Statistics Report' : 'Revenue Report' }}
              </v-chip>
            </v-alert-title>
            <div v-if="uploadResult.success">
              <div class="text-caption mb-2" v-if="uploadResult.reportType === 'statistics'">
                Updated visit counts and last referral dates (revenue unchanged)
              </div>
              <div class="text-caption mb-2" v-else>
                Updated revenue totals (visit counts unchanged)
              </div>
              <div class="d-flex flex-wrap gap-4 my-2">
                <div>
                  <div class="text-h6 font-weight-bold">{{ uploadResult.updated }}</div>
                  <div class="text-caption">Partners Updated</div>
                </div>
                <div v-if="uploadResult.reportType === 'statistics'">
                  <div class="text-h6 font-weight-bold">{{ uploadResult.visitorsAdded?.toLocaleString() }}</div>
                  <div class="text-caption">Total Visits</div>
                </div>
                <div v-if="uploadResult.reportType === 'revenue'">
                  <div class="text-h6 font-weight-bold">${{ uploadResult.revenueAdded?.toLocaleString() }}</div>
                  <div class="text-caption">Revenue Added</div>
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

    <!-- Quick Visit Dialog -->
    <MarketingPartnershipQuickVisitDialog
      ref="quickVisitRef"
      :partners="partners"
      @saved="onVisitSaved"
      @notify="(p: { message: string; color: string }) => { snackbar.message = p.message; snackbar.color = p.color; snackbar.show = true }"
    />

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>

    <!-- Export Dialog -->
    <UiExportDialog
      v-model="showExportDialog"
      :data="filteredPartners"
      :columns="exportColumns"
      default-file-name="medical-partnerships-export"
      title="Medical Partnerships Export"
    />
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
const authStore = useAuthStore()

// Template refs
const quickVisitRef = ref<{ open: () => void; openWithPartner: (partner: any) => void } | null>(null)
const detailDialogRef = ref<{ open: (partner: any) => void } | null>(null)

// Export dialog
const showExportDialog = ref(false)
const exportColumns = [
  { key: 'name', title: 'Clinic Name' },
  { key: 'tier', title: 'Tier' },
  { key: 'priority', title: 'Priority' },
  { key: 'zone', title: 'Zone' },
  { key: 'status', title: 'Status' },
  { key: 'phone', title: 'Phone' },
  { key: 'email', title: 'Email' },
  { key: 'address', title: 'Address' },
  { key: 'clinic_type', title: 'Clinic Type' },
  { key: 'referral_count', title: 'Total Referrals' },
  { key: 'revenue', title: 'Revenue', format: (v: number) => v ? `$${v.toLocaleString()}` : '' },
  { key: 'last_referral_date', title: 'Last Referral' },
  { key: 'last_visit_date', title: 'Last Visit' },
  { key: 'notes', title: 'Notes' }
]

// State
const loading = ref(false)
const saving = ref(false)
const recalculating = ref(false)
const syncingReferrals = ref(false)
const mainTab = ref('list')
const formTab = ref('basic')
const search = ref('')
const filterTier = ref<string | null>(null)
const filterZone = ref<string | null>(null)
const filterPriority = ref<string | null>(null)
const filterFollowup = ref('all')

// Upload EzyVet Report state
const showUploadDialog = ref(false)
const clearingStats = ref(false)
const uploadFile = ref<File | File[] | null>(null)
const uploadProcessing = ref(false)
const uploadResult = ref<any>(null)

// Upload Log state
const loadingUploadLog = ref(false)
const unmatchedEntries = ref<any[]>([])
const uploadHistory = ref<any[]>([])

// Upload Log table headers
const uploadLogHeaders = [
  { title: 'Clinic Name', key: 'clinicName', sortable: true },
  { title: 'Visits', key: 'visits', sortable: true, align: 'center' },
  { title: 'Revenue', key: 'revenue', sortable: true, align: 'end' },
  { title: 'Upload Date', key: 'uploadDate', sortable: true },
  { title: 'Date Range', key: 'dateRange', sortable: false },
  { title: 'Actions', key: 'actions', sortable: false, align: 'center' }
]

const uploadHistoryHeaders = [
  { title: 'Upload Date', key: 'created_at', sortable: true },
  { title: 'File', key: 'filename', sortable: false },
  { title: 'Date Range', key: 'date_range_start', sortable: true },
  { title: 'Rows Parsed', key: 'total_rows_parsed', sortable: true },
  { title: 'Matched', key: 'total_rows_matched', sortable: true },
  { title: 'Revenue Added', key: 'total_revenue_added', sortable: true }
]

// Computed to check if file is selected
const hasUploadFile = computed(() => {
  if (!uploadFile.value) return false
  if (Array.isArray(uploadFile.value)) return uploadFile.value.length > 0
  return true
})

// Data
const partners = ref<any[]>([])
const recentActivity = ref<any[]>([])

// Dialog state
const showPartnerDialog = ref(false)
const editMode = ref(false)
const showDeleteDialog = ref(false)
const partnerToDelete = ref<any>(null)
const deleting = ref(false)

const snackbar = reactive({ show: false, message: '', color: 'success' })

// Options
const tierOptions = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Coal']
const priorityOptions = ['Very High', 'High', 'Medium', 'Low']
const clinicTypeOptions = ['general', 'specialty', 'emergency', 'urgent_care', 'mobile', 'shelter', 'corporate', 'independent']
const sizeOptions = ['small', 'medium', 'large', 'enterprise']
const organizationTypeOptions = ['independent', 'corporate', 'franchise', 'nonprofit', 'university', 'government']
const frequencyOptions = ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'as_needed']
const dayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const timeOptions = ['morning', 'midday', 'afternoon']
const agreementOptions = ['none', 'informal', 'formal', 'exclusive']
const outcomeOptions = ['successful', 'follow_up_needed', 'no_answer', 'voicemail', 'rescheduled', 'declined']

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
  needs_followup: false,
  total_referrals_all_time: 0,
  total_revenue_all_time: 0,
  // Social media
  instagram_handle: '',
  facebook_url: '',
  linkedin_url: '',
  // Size & organization
  size: null as string | null,
  organization_type: null as string | null,
  employee_count: null as number | null,
  expected_visit_frequency_days: null as number | null,
  // Agreements
  ce_event_host: false,
  lunch_and_learn_eligible: true,
  drop_off_materials: true,
  // Relationship
  relationship_health: null as number | null
})

// Table headers
const tableHeaders = [
  { title: 'Partner', key: 'name', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Health', key: 'relationship_health', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Referrals', key: 'total_referrals_all_time', sortable: true },
  { title: 'Revenue', key: 'total_revenue_all_time', sortable: true },
  { title: 'Last Referral', key: 'last_referral_date', sortable: true },
  { title: 'Last Visit', key: 'last_visit_date', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '160px' }
]

// Computed
const activeCount = computed(() => partners.value.filter(p => p.status === 'active').length)
const needsFollowupCount = computed(() => partners.value.filter(p => p.needs_followup).length)
const overdueCount = computed(() => partners.value.filter(p => p.visit_overdue).length)
const totalReferrals = computed(() => partners.value.reduce((sum, p) => sum + (p.total_referrals_all_time || 0), 0))
const totalRevenue = computed(() => partners.value.reduce((sum, p) => sum + (Number(p.total_revenue_all_time) || 0), 0))

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
  if (filterFollowup.value === 'overdue') result = result.filter(p => p.visit_overdue)
  return result
})

const overduePartners = computed(() => {
  return partners.value
    .filter(p => p.visit_overdue)
    .sort((a, b) => {
      // First sort by zone (alphabetically, null zones last)
      const zoneA = a.zone || 'zzz'
      const zoneB = b.zone || 'zzz'
      if (zoneA !== zoneB) return zoneA.localeCompare(zoneB)
      // Then by relationship_score (highest first, null last)
      const scoreA = a.relationship_score ?? -1
      const scoreB = b.relationship_score ?? -1
      return scoreB - scoreA
    })
})

const weeklyTargets = computed(() => {
  return partners.value
    .filter(p => p.status === 'active' && (p.visit_frequency === 'weekly' || p.needs_followup))
    .sort((a, b) => {
      // First sort by zone (alphabetically, null zones last)
      const zoneA = a.zone || 'zzz'
      const zoneB = b.zone || 'zzz'
      if (zoneA !== zoneB) return zoneA.localeCompare(zoneB)
      // Then by relationship_score (highest first, null last)
      const scoreA = a.relationship_score ?? -1
      const scoreB = b.relationship_score ?? -1
      return scoreB - scoreA
    })
    .slice(0, 10)
})

function getZoneCount(zone: string): number {
  if (zone === 'Unassigned') return partners.value.filter(p => !p.zone).length
  return partners.value.filter(p => p.zone === zone).length
}

// Get partners filtered by zone, sorted by priority then name
function getPartnersByZone(zone: string | null): any[] {
  const priorityOrder: Record<string, number> = { 'Very High': 0, 'High': 1, 'Medium': 2, 'Low': 3 }
  return partners.value
    .filter(p => zone === null ? !p.zone : p.zone === zone)
    .sort((a, b) => {
      // Overdue first
      if (a.visit_overdue && !b.visit_overdue) return -1
      if (!a.visit_overdue && b.visit_overdue) return 1
      // Then follow-ups
      if (a.needs_followup && !b.needs_followup) return -1
      if (!a.needs_followup && b.needs_followup) return 1
      // Then by priority
      const pA = priorityOrder[a.priority] ?? 99
      const pB = priorityOrder[b.priority] ?? 99
      if (pA !== pB) return pA - pB
      // Then by name
      return (a.name || '').localeCompare(b.name || '')
    })
}

function getZoneOverdueCount(zone: string): number {
  return partners.value.filter(p => p.zone === zone && p.visit_overdue).length
}

function getZoneFollowupCount(zone: string): number {
  return partners.value.filter(p => p.zone === zone && p.needs_followup).length
}

// Expansion panel state for targeting tab
const expandedZones = ref<string[]>([])
const expandedOverdueZones = ref<string[]>([])

// Zone definitions including Unassigned for overdue grouping
const overdueZoneDefinitions = computed(() => {
  const defs = [...zoneDefinitions]
  if (overduePartners.value.some(p => !p.zone)) {
    defs.push({ value: 'Unassigned', title: 'Unassigned Region', description: 'Partners without an assigned region' })
  }
  return defs
})

function getOverduePartnersByZone(zone: string): any[] {
  return overduePartners.value.filter(p => zone === 'Unassigned' ? !p.zone : p.zone === zone)
}

function expandAllZones() {
  expandedZones.value = zoneDefinitions.map(z => z.value)
  if (partners.value.some(p => !p.zone)) {
    expandedZones.value.push('Unassigned')
  }
}

function collapseAllZones() {
  expandedZones.value = []
}

function expandAllOverdueZones() {
  expandedOverdueZones.value = overdueZoneDefinitions.value
    .filter(z => getOverduePartnersByZone(z.value).length > 0)
    .map(z => z.value)
}

// Recalculate partner metrics (Tier, Priority, Relationship Health, Overdue)
async function recalculateMetrics() {
  recalculating.value = true
  try {
    const response = await $fetch('/api/recalculate-partner-metrics', { method: 'POST' })
    if (response.success) {
      snackbar.message = `Metrics recalculated for ${response.summary?.recordsUpdated || 0} partners`
      snackbar.color = 'success'
      snackbar.show = true
      // Reload partners to show updated values
      await loadPartners()
    } else {
      throw new Error(response.error || 'Failed to recalculate metrics')
    }
  } catch (e: any) {
    console.error('Error recalculating metrics:', e)
    snackbar.message = 'Error recalculating metrics: ' + e.message
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    recalculating.value = false
  }
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

// Map items_discussed values to display labels
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

async function loadRecentActivity() {
  try {
    const { data, error } = await supabase
      .from('clinic_visits')
      .select('*, referral_partners:partner_id(name)')
      .order('visit_date', { ascending: false })
      .limit(20)
    if (error) throw error
    recentActivity.value = (data || []).map(d => ({
      ...d,
      clinic_name: d.clinic_name || (d as any).referral_partners?.name || 'Unknown'
    }))
  } catch (e) {
    console.error('Error loading activity:', e)
  }
}

// Dialog handlers
function openPartnerDetail(partner: any) {
  detailDialogRef.value?.open(partner)
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
    needs_followup: partner.needs_followup || false,
    total_referrals_all_time: partner.total_referrals_all_time || 0,
    total_revenue_all_time: partner.total_revenue_all_time || 0,
    // Social media
    instagram_handle: partner.instagram_handle || '',
    facebook_url: partner.facebook_url || '',
    linkedin_url: partner.linkedin_url || '',
    // Size & organization
    size: partner.size || null,
    organization_type: partner.organization_type || null,
    employee_count: partner.employee_count || null,
    expected_visit_frequency_days: partner.expected_visit_frequency_days || null,
    // Agreements
    ce_event_host: partner.ce_event_host || false,
    lunch_and_learn_eligible: partner.lunch_and_learn_eligible !== false,
    drop_off_materials: partner.drop_off_materials !== false,
    // Relationship
    relationship_health: partner.relationship_health ?? null
  })
  formTab.value = 'basic'
  showPartnerDialog.value = true
}

function openLogVisit(partner: any) {
  quickVisitRef.value?.openWithPartner(partner)
}

// Sync visit_frequency text label → expected_visit_frequency_days
function syncVisitFrequencyDays(frequency: string) {
  const frequencyToDays: Record<string, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
    annually: 365,
    as_needed: 180
  }
  const days = frequencyToDays[frequency]
  if (days) {
    form.expected_visit_frequency_days = days
  }
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
    needs_followup: false,
    total_referrals_all_time: 0,
    total_revenue_all_time: 0,
    // Social media
    instagram_handle: '',
    facebook_url: '',
    linkedin_url: '',
    // Size & organization
    size: null,
    organization_type: null,
    employee_count: null,
    expected_visit_frequency_days: null,
    // Agreements
    ce_event_host: false,
    lunch_and_learn_eligible: true,
    drop_off_materials: true,
    // Relationship
    relationship_health: null
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
      needs_followup: form.needs_followup,
      total_referrals_all_time: form.total_referrals_all_time || 0,
      total_revenue_all_time: form.total_revenue_all_time || 0,
      // Social media
      instagram_handle: form.instagram_handle || null,
      facebook_url: form.facebook_url || null,
      linkedin_url: form.linkedin_url || null,
      // Size & organization
      size: form.size || null,
      organization_type: form.organization_type || null,
      employee_count: form.employee_count || null,
      expected_visit_frequency_days: form.expected_visit_frequency_days || null,
      // Agreements
      ce_event_host: form.ce_event_host,
      lunch_and_learn_eligible: form.lunch_and_learn_eligible,
      drop_off_materials: form.drop_off_materials,
      // relationship_health is auto-calculated by DB trigger (update_partner_derived_fields)
      // based on tier, priority, and last_visit_date — do not send manually
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
    await loadRecentActivity()
  } catch (e: any) {
    console.error('Error saving partner:', e)
    snackbar.message = e.message || 'Error saving partner'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}



// Delete partner
function confirmDeletePartner(partner: any) {
  partnerToDelete.value = partner
  showDeleteDialog.value = true
}

async function deletePartner() {
  if (!partnerToDelete.value?.id) return
  deleting.value = true
  try {
    // Delete related visit logs first
    // Delete related visit logs from both tables
    await supabase.from('clinic_visits').delete().eq('partner_id', partnerToDelete.value.id)
    await supabase.from('partner_visit_logs').delete().eq('partner_id', partnerToDelete.value.id)
    
    // Delete the partner record
    const { error } = await supabase.from('referral_partners').delete().eq('id', partnerToDelete.value.id)
    if (error) throw error
    
    snackbar.message = `"${partnerToDelete.value.name}" deleted`
    snackbar.color = 'success'
    snackbar.show = true
    showDeleteDialog.value = false
    partnerToDelete.value = null
    await loadPartners()
    await loadRecentActivity()
  } catch (e: any) {
    console.error('Error deleting partner:', e)
    snackbar.message = e.message || 'Error deleting partner'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    deleting.value = false
  }
}

// Handlers for child component events — reload both partners and activity
function onVisitSaved() {
  loadPartners()
  loadRecentActivity()
}

function onPartnerUpdated() {
  loadPartners()
  loadRecentActivity()
}

function exportPartners() {
  const csv = [
    ['Name', 'Tier', 'Priority', 'Zone', 'Status', 'Phone', 'Email', 'Last Referral', 'Last Visit'].join(','),
    ...filteredPartners.value.map(p => [
      `"${p.name || ''}"`,
      p.tier || '',
      p.priority || '',
      `"${p.zone || ''}"`,
      p.status || '',
      p.phone || '',
      p.email || '',
      p.last_referral_date || '',
      p.last_visit_date || ''
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
      message: error.data?.message || error.message || 'Failed to process CSV'
    }
    snackbar.message = 'Failed to process CSV'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    uploadProcessing.value = false
  }
}

// Clear all referral stats before re-importing
async function clearReferralStats() {
  if (!confirm('This will reset ALL visit counts and revenue totals to 0. Continue?')) {
    return
  }
  
  clearingStats.value = true
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No active session - please log in again')
    }
    
    const response = await $fetch<any>('/api/clear-referral-stats', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    if (response.success) {
      await loadPartners()
      snackbar.message = `Cleared stats from ${response.cleared.partnersAffected} partners`
      snackbar.color = 'success'
      snackbar.show = true
    }
  } catch (error: any) {
    console.error('Clear stats error:', error)
    snackbar.message = error.data?.message || error.message || 'Failed to clear stats'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    clearingStats.value = false
  }
}

function closeUploadDialog() {
  showUploadDialog.value = false
  uploadFile.value = null
  uploadResult.value = null
}

// ezyVet API Sync for Referral Stats
async function syncReferralsFromEzyVet() {
  syncingReferrals.value = true
  try {
    const result = await $fetch('/api/ezyvet/sync-analytics', {
      method: 'POST',
      body: { syncType: 'all' },
    }) as any

    if (result.success) {
      const first = Object.values(result.results)[0] as any
      const partnersUpdated = first?.referrals?.partnersUpdated || 0
      const contactsSynced = first?.contacts?.upserted || 0

      snackbar.message = `Synced ${contactsSynced.toLocaleString()} contacts, updated ${partnersUpdated} referral partners`
      snackbar.color = 'success'
      snackbar.show = true
      await loadPartners()
    }
  } catch (err: any) {
    const msg = err.data?.message || err.message || 'Sync failed'
    if (msg.includes('No active ezyVet clinic')) {
      snackbar.message = 'ezyVet API not configured yet. Use manual report upload or set up API credentials.'
      snackbar.color = 'warning'
    } else {
      snackbar.message = 'Sync failed: ' + msg
      snackbar.color = 'error'
    }
    snackbar.show = true
  } finally {
    syncingReferrals.value = false
  }
}

// Upload Log functions
async function loadUploadLog() {
  loadingUploadLog.value = true
  
  try {
    // Load upload history
    const { data: history, error: historyError } = await supabase
      .from('referral_sync_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (historyError) throw historyError
    uploadHistory.value = history || []
    
    // Extract unmatched entries from sync_details
    const unmatched: any[] = []
    
    for (const sync of (history || [])) {
      const details = sync.sync_details?.clinicDetails || []
      for (const detail of details) {
        if (!detail.matched && !detail.logged) {
          unmatched.push({
            id: `${sync.id}-${detail.clinicName}`,
            syncId: sync.id,
            clinicName: detail.clinicName,
            visits: detail.visits || 0,
            revenue: detail.revenue || 0,
            uploadDate: sync.created_at,
            dateRange: sync.date_range_start && sync.date_range_end 
              ? `${sync.date_range_start} - ${sync.date_range_end}` 
              : null,
            logging: false
          })
        }
      }
    }
    
    unmatchedEntries.value = unmatched
    
  } catch (err: any) {
    console.error('[UploadLog] Error loading:', err)
    snackbar.message = 'Failed to load upload log'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loadingUploadLog.value = false
  }
}

async function markAsLogged(entry: any) {
  entry.logging = true
  
  try {
    // Get the current sync record
    const { data: sync, error: fetchError } = await supabase
      .from('referral_sync_history')
      .select('sync_details')
      .eq('id', entry.syncId)
      .single()
    
    if (fetchError) throw fetchError
    
    // Update the specific entry's logged status
    const details = sync.sync_details || {}
    const clinicDetails = details.clinicDetails || []
    
    const updatedDetails = clinicDetails.map((d: any) => {
      if (d.clinicName === entry.clinicName && !d.matched) {
        return { ...d, logged: true, loggedAt: new Date().toISOString() }
      }
      return d
    })
    
    // Save back to database
    const { error: updateError } = await supabase
      .from('referral_sync_history')
      .update({
        sync_details: {
          ...details,
          clinicDetails: updatedDetails
        }
      })
      .eq('id', entry.syncId)
    
    if (updateError) throw updateError
    
    // Remove from local list
    unmatchedEntries.value = unmatchedEntries.value.filter(e => e.id !== entry.id)
    
    snackbar.message = `"${entry.clinicName}" marked as logged`
    snackbar.color = 'success'
    snackbar.show = true
    
  } catch (err: any) {
    console.error('[UploadLog] Error marking as logged:', err)
    snackbar.message = 'Failed to mark as logged'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    entry.logging = false
  }
}

// Init
onMounted(() => {
  loadPartners()
  loadRecentActivity()
  loadUploadLog() // Load upload log on mount
})
</script>

<style scoped>
.partnerships-page {
  max-width: 1400px;
}

/* Quick Visit Button - High Visibility */
.quick-visit-btn {
  min-height: 44px;
  font-weight: 600;
}

/* Quick Visit Dialog Styles */
.quick-visit-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.quick-visit-form {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Discussion Chips - Large Touch Targets */
.discussion-chip {
  min-height: 44px !important;
  padding: 0 16px !important;
  cursor: pointer;
  transition: all 0.2s ease;
}

.discussion-chip:hover {
  transform: scale(1.02);
}

/* Voice-to-Text Styles */
.listening-textarea :deep(.v-field) {
  border-color: #f44336 !important;
  background-color: rgba(244, 67, 54, 0.05);
}

/* Pulse Animation for Microphone */
.pulse-animation {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .quick-visit-form {
    padding: 16px !important;
  }
  
  .discussion-chip {
    flex: 1 1 calc(50% - 8px);
    justify-content: center;
  }
}
</style>
