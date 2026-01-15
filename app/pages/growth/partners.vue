<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Referral Partners</h1>
        <p class="text-body-1 text-grey-darken-1">
          Manage relationships with referring hospitals
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddDialog">
        Add Partner
      </v-btn>
    </div>

    <!-- Stats Row -->
    <UiStatsRow
      :stats="[
        { value: partners.length, label: 'Total Partners', color: 'primary' },
        { value: totalReferrals, label: 'Total Referrals', color: 'success', format: 'number' },
        { value: totalRevenue, label: 'Total Revenue', color: 'warning', format: 'currency' },
        { value: activeCount, label: 'Active Partners', color: 'secondary' }
      ]"
      layout="4-col"
    />

    <!-- Partner Cards Grid -->
    <v-row v-if="!loading && partners.length > 0">
      <v-col
        v-for="partner in sortedPartners"
        :key="partner.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card rounded="lg" class="h-100 partner-card" hover @click="openDetails(partner)">
          <!-- Header with Tier Badge -->
          <v-card-title class="d-flex align-center pa-4 pb-2">
            <v-avatar :color="getTierColor(partner.tier)" size="48" class="mr-3">
              <v-icon color="white" size="24">mdi-hospital-building</v-icon>
            </v-avatar>
            <div class="flex-grow-1">
              <h3 class="text-h6 font-weight-bold text-truncate">
                {{ partner.hospital_name }}
              </h3>
            </div>
            <v-chip :color="getTierColor(partner.tier)" size="small" label class="ml-2">
              <v-icon start size="14">{{ getTierIcon(partner.tier) }}</v-icon>
              {{ formatTier(partner.tier) }}
            </v-chip>
          </v-card-title>

          <v-card-text class="pb-2">
            <!-- Key Contact -->
            <div class="d-flex align-center mb-2">
              <v-icon size="18" color="grey" class="mr-2">mdi-account</v-icon>
              <span class="text-body-2">{{ partner.contact_person || 'No contact' }}</span>
            </div>

            <!-- Referral Count & Revenue -->
            <div class="d-flex align-center gap-4 mb-2">
              <div class="d-flex align-center">
                <v-icon size="18" color="grey" class="mr-2">mdi-handshake</v-icon>
                <span class="text-body-2 font-weight-medium">{{ partner.total_referrals.toLocaleString() }} referrals</span>
              </div>
              <div v-if="partner.total_revenue" class="d-flex align-center">
                <v-icon size="18" color="success" class="mr-1">mdi-currency-usd</v-icon>
                <span class="text-body-2 font-weight-medium text-success">{{ formatCurrency(partner.total_revenue) }}</span>
              </div>
            </div>

            <!-- Notes Preview -->
            <p v-if="partner.notes" class="text-caption text-grey text-truncate mb-0">
              {{ partner.notes }}
            </p>
          </v-card-text>

          <v-card-actions class="pa-4 pt-0">
            <v-chip
              :color="partner.is_active ? 'success' : 'grey'"
              size="x-small"
              label
            >
              {{ partner.is_active ? 'Active' : 'Inactive' }}
            </v-chip>
            <v-spacer />
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-note-plus"
              @click.stop="logVisit(partner)"
            >
              Log Visit
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-card v-else-if="!loading && partners.length === 0" rounded="lg" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-hospital-building</v-icon>
      <h3 class="text-h6 mt-4">No referral partners yet</h3>
      <p class="text-grey mb-4">Add your first referring hospital partner</p>
      <v-btn color="primary" @click="openAddDialog">Add Partner</v-btn>
    </v-card>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
      <p class="text-grey mt-4">Loading partners...</p>
    </div>

    <!-- Partner Details Dialog - Full CRM Profile -->
    <v-dialog v-model="detailsDialog" max-width="800" scrollable>
      <v-card v-if="selectedPartner" rounded="lg">
        <v-card-title class="d-flex align-center pa-4">
          <v-avatar :color="getTierColor(selectedPartner.tier)" size="48" class="mr-3">
            <v-icon color="white" size="24">mdi-hospital-building</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <h3 class="text-h6 font-weight-bold">{{ selectedPartner.hospital_name }}</h3>
            <p class="text-body-2 text-grey mb-0">{{ selectedPartner.contact_person }}</p>
          </div>
          <v-chip :color="getTierColor(selectedPartner.tier)" label>
            {{ formatTier(selectedPartner.tier) }}
          </v-chip>
        </v-card-title>

        <v-divider />

        <!-- Tabs for different CRM sections -->
        <v-tabs v-model="detailsTab" color="primary" align-tabs="center">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="contacts">Contacts</v-tab>
          <v-tab value="visits">Visit Log</v-tab>
          <v-tab value="notes">Notes</v-tab>
        </v-tabs>

        <v-window v-model="detailsTab">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <v-card-text class="pa-4">
              <v-row>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 text-grey mb-3">Contact Information</h4>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item v-if="selectedPartner.email">
                      <template #prepend>
                        <v-icon color="primary" size="20">mdi-email</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.email }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.phone">
                      <template #prepend>
                        <v-icon color="primary" size="20">mdi-phone</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.phone }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.address">
                      <template #prepend>
                        <v-icon color="primary" size="20">mdi-map-marker</v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.address }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
                <v-col cols="12" md="6">
                  <h4 class="text-subtitle-2 text-grey mb-3">Relationship Stats</h4>
                  <v-list density="compact" class="bg-transparent">
                    <v-list-item>
                      <template #prepend>
                        <v-icon color="success" size="20">mdi-handshake</v-icon>
                      </template>
                      <v-list-item-title>{{ (selectedPartner.total_referrals || 0).toLocaleString() }} total referrals</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.total_revenue">
                      <template #prepend>
                        <v-icon color="amber-darken-2" size="20">mdi-currency-usd</v-icon>
                      </template>
                      <v-list-item-title>${{ selectedPartner.total_revenue.toLocaleString() }} total revenue</v-list-item-title>
                    </v-list-item>
                    <v-list-item>
                      <template #prepend>
                        <v-icon :color="selectedPartner.is_active ? 'success' : 'grey'" size="20">
                          mdi-circle
                        </v-icon>
                      </template>
                      <v-list-item-title>{{ selectedPartner.is_active ? 'Active Partner' : 'Inactive' }}</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="selectedPartner.relationship_status">
                      <template #prepend>
                        <v-icon color="info" size="20">mdi-chart-line</v-icon>
                      </template>
                      <v-list-item-title>
                        <v-chip :color="getRelationshipColor(selectedPartner.relationship_status)" size="x-small" label>
                          {{ formatRelationshipStatus(selectedPartner.relationship_status) }}
                        </v-chip>
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <!-- Quick Actions -->
              <h4 class="text-subtitle-2 text-grey mb-3">Quick Actions</h4>
              <div class="d-flex gap-2 flex-wrap">
                <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-note-plus" @click="openVisitLogDialog">
                  Log Visit
                </v-btn>
                <v-btn color="secondary" variant="tonal" size="small" prepend-icon="mdi-pencil" @click="openEditFromDetails">
                  Edit Partner
                </v-btn>
                <v-btn v-if="selectedPartner.email" variant="tonal" size="small" prepend-icon="mdi-email" :href="`mailto:${selectedPartner.email}`">
                  Send Email
                </v-btn>
                <v-btn v-if="selectedPartner.phone" variant="tonal" size="small" prepend-icon="mdi-phone" :href="`tel:${selectedPartner.phone}`">
                  Call
                </v-btn>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- Contacts Tab (Key Decision Maker) -->
          <v-window-item value="contacts">
            <v-card-text class="pa-4">
              <h4 class="text-subtitle-2 text-grey mb-3">Key Decision Maker</h4>
              <v-card variant="outlined" class="mb-4">
                <v-card-text>
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.key_decision_maker"
                        label="Name"
                        density="compact"
                        variant="outlined"
                        prepend-inner-icon="mdi-account-star"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.key_decision_maker_title"
                        label="Title/Role"
                        density="compact"
                        variant="outlined"
                        prepend-inner-icon="mdi-badge-account"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.key_decision_maker_email"
                        label="Email"
                        density="compact"
                        variant="outlined"
                        prepend-inner-icon="mdi-email"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.key_decision_maker_phone"
                        label="Phone"
                        density="compact"
                        variant="outlined"
                        prepend-inner-icon="mdi-phone"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <h4 class="text-subtitle-2 text-grey mb-3">Communication Preferences</h4>
              <v-card variant="outlined">
                <v-card-text>
                  <v-row dense>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="crmFields.communication_preference"
                        :items="communicationOptions"
                        label="Preferred Contact Method"
                        density="compact"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="crmFields.relationship_status"
                        :items="relationshipOptions"
                        label="Relationship Status"
                        density="compact"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.last_contact_date"
                        label="Last Contact"
                        type="date"
                        density="compact"
                        variant="outlined"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="crmFields.next_followup_date"
                        label="Next Follow-up"
                        type="date"
                        density="compact"
                        variant="outlined"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <div class="d-flex justify-end mt-4">
                <v-btn color="primary" :loading="savingCrm" @click="saveCrmFields">
                  Save Contact Info
                </v-btn>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- Visits Tab -->
          <v-window-item value="visits">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between mb-4">
                <h4 class="text-subtitle-2 text-grey">Visit History</h4>
                <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openVisitLogDialog">
                  Log New Visit
                </v-btn>
              </div>

              <div v-if="visitLogs.length === 0" class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1">mdi-clipboard-text-clock</v-icon>
                <p class="text-grey mt-2">No visits logged yet</p>
              </div>

              <v-timeline v-else density="compact" side="end">
                <v-timeline-item
                  v-for="visit in visitLogs"
                  :key="visit.id"
                  :dot-color="getVisitTypeColor(visit.visit_type)"
                  size="small"
                >
                  <template #opposite>
                    <span class="text-caption text-grey">{{ formatVisitDate(visit.visit_date) }}</span>
                  </template>
                  <v-card variant="outlined" density="compact">
                    <v-card-text class="pa-3">
                      <div class="d-flex align-center gap-2 mb-1">
                        <v-chip :color="getVisitTypeColor(visit.visit_type)" size="x-small" label>
                          {{ visit.visit_type }}
                        </v-chip>
                        <span v-if="visit.contacted_person" class="text-caption">with {{ visit.contacted_person }}</span>
                      </div>
                      <p v-if="visit.summary" class="text-body-2 mb-1">{{ visit.summary }}</p>
                      <p v-if="visit.next_steps" class="text-caption text-grey">
                        <strong>Next:</strong> {{ visit.next_steps }}
                      </p>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-window-item>

          <!-- Notes Tab -->
          <v-window-item value="notes">
            <v-card-text class="pa-4">
              <h4 class="text-subtitle-2 text-grey mb-3">Notes & Comments</h4>
              <v-textarea
                v-model="editNotes"
                variant="outlined"
                rows="8"
                placeholder="Add notes about this partner relationship, preferences, history, etc."
              />
              <div class="d-flex justify-end mt-4">
                <v-btn color="primary" :loading="saving" @click="saveNotes">
                  Save Notes
                </v-btn>
              </div>
            </v-card-text>
          </v-window-item>
        </v-window>

        <v-divider />

        <v-card-actions class="px-4 py-3">
          <v-btn variant="text" color="error" @click="confirmDelete(selectedPartner)">
            Delete Partner
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="detailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Visit Log Dialog -->
    <v-dialog v-model="visitLogDialog" max-width="500">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-clipboard-text-clock</v-icon>
          Log Visit
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="visitForm" v-model="visitFormValid">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="visitFormData.visit_date"
                  label="Visit Date *"
                  type="date"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="visitFormData.visit_type"
                  :items="visitTypeOptions"
                  label="Visit Type *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="visitFormData.contacted_person"
                  label="Person Contacted"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="visitFormData.summary"
                  label="Summary"
                  rows="3"
                  variant="outlined"
                  density="compact"
                  placeholder="What did you discuss? Key takeaways?"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="visitFormData.next_steps"
                  label="Next Steps"
                  rows="2"
                  variant="outlined"
                  density="compact"
                  placeholder="What are the follow-up actions?"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="visitLogDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingVisit" :disabled="!visitFormValid" @click="saveVisitLog">
            Log Visit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add/Edit Partner Dialog -->
    <v-dialog v-model="partnerDialog" max-width="600">
      <v-card rounded="lg">
        <v-card-title class="bg-primary text-white py-4">
          <v-icon start>mdi-hospital-building</v-icon>
          {{ editMode ? 'Edit Partner' : 'Add Partner' }}
        </v-card-title>
        <v-card-text class="pt-6">
          <v-form ref="partnerForm" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="partnerFormData.hospital_name"
                  label="Hospital / Practice Name *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.contact_person"
                  label="Key Contact"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="partnerFormData.tier"
                  :items="tierOptions"
                  label="Volume Tier *"
                  :rules="[v => !!v || 'Required']"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="partnerFormData.phone"
                  label="Phone"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="partnerFormData.address"
                  label="Address"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="partnerFormData.total_referrals"
                  label="Total Referrals"
                  type="number"
                  min="0"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="partnerFormData.is_active"
                  label="Active Partner"
                  color="success"
                  hide-details
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="partnerFormData.notes"
                  label="Notes"
                  rows="3"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="partnerDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" :disabled="!formValid" @click="savePartner">
            {{ editMode ? 'Update' : 'Add Partner' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-title class="bg-error text-white py-4">
          <v-icon start>mdi-alert</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pt-6">
          Are you sure you want to delete <strong>{{ partnerToDelete?.hospital_name }}</strong>?
        </v-card-text>
        <v-card-actions class="px-6 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deleting" @click="deletePartner">Delete</v-btn>
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
import type { ReferralPartner, ReferralTier } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const client = useSupabaseClient()
const user = useSupabaseUser()

// State
const partners = ref<ReferralPartner[]>([])
const visitLogs = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const savingCrm = ref(false)
const savingVisit = ref(false)
const deleting = ref(false)
const partnerDialog = ref(false)
const detailsDialog = ref(false)
const visitLogDialog = ref(false)
const deleteDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)
const visitFormValid = ref(false)
const selectedPartner = ref<ReferralPartner | null>(null)
const partnerToDelete = ref<ReferralPartner | null>(null)
const editNotes = ref('')
const detailsTab = ref('overview')

// Snackbar
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const partnerFormData = reactive({
  hospital_name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tier: 'bronze' as ReferralTier,
  total_referrals: 0,
  notes: '',
  is_active: true
})

// CRM fields for extended partner info
const crmFields = reactive({
  key_decision_maker: '',
  key_decision_maker_title: '',
  key_decision_maker_email: '',
  key_decision_maker_phone: '',
  communication_preference: 'email',
  relationship_status: 'new',
  last_contact_date: '',
  next_followup_date: ''
})

// Visit log form data
const visitFormData = reactive({
  visit_date: new Date().toISOString().split('T')[0],
  visit_type: 'in_person',
  contacted_person: '',
  summary: '',
  next_steps: ''
})

const tierOptions = [
  { title: 'Bronze (Low)', value: 'bronze' },
  { title: 'Silver (Medium)', value: 'silver' },
  { title: 'Gold (High)', value: 'gold' },
  { title: 'Platinum (VIP)', value: 'platinum' }
]

const communicationOptions = [
  { title: 'Email', value: 'email' },
  { title: 'Phone', value: 'phone' },
  { title: 'Text/SMS', value: 'text' },
  { title: 'In Person', value: 'in_person' }
]

const relationshipOptions = [
  { title: 'New', value: 'new' },
  { title: 'Developing', value: 'developing' },
  { title: 'Established', value: 'established' },
  { title: 'At Risk', value: 'at_risk' },
  { title: 'Churned', value: 'churned' }
]

const visitTypeOptions = [
  { title: 'In Person', value: 'in_person' },
  { title: 'Phone Call', value: 'phone' },
  { title: 'Video Call', value: 'video' },
  { title: 'Email', value: 'email' }
]

// Computed
const sortedPartners = computed(() => {
  const tierOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 }
  return [...partners.value].sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier]
    if (tierDiff !== 0) return tierDiff
    return b.total_referrals - a.total_referrals
  })
})

const highVolumeCount = computed(() =>
  partners.value.filter(p => p.tier === 'gold' || p.tier === 'platinum').length
)

const activeCount = computed(() =>
  partners.value.filter(p => p.is_active).length
)

const totalReferrals = computed(() =>
  partners.value.reduce((sum, p) => sum + p.total_referrals, 0)
)

const totalRevenue = computed(() =>
  partners.value.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
)

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

// Methods
const showNotification = (message: string, color = 'success') => {
  snackbarText.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const getTierColor = (tier: ReferralTier) => {
  const colors: Record<ReferralTier, string> = {
    bronze: 'brown',
    silver: 'grey',
    gold: 'amber-darken-2',
    platinum: 'blue-grey'
  }
  return colors[tier]
}

const getTierIcon = (tier: ReferralTier) => {
  const icons: Record<ReferralTier, string> = {
    bronze: 'mdi-medal-outline',
    silver: 'mdi-medal',
    gold: 'mdi-trophy',
    platinum: 'mdi-crown'
  }
  return icons[tier]
}

const formatTier = (tier: ReferralTier) =>
  tier.charAt(0).toUpperCase() + tier.slice(1)

const getRelationshipColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'info',
    developing: 'warning',
    established: 'success',
    at_risk: 'orange',
    churned: 'grey'
  }
  return colors[status] || 'grey'
}

const formatRelationshipStatus = (status: string) => {
  const labels: Record<string, string> = {
    new: 'New',
    developing: 'Developing',
    established: 'Established',
    at_risk: 'At Risk',
    churned: 'Churned'
  }
  return labels[status] || status
}

const getVisitTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    in_person: 'success',
    phone: 'info',
    video: 'purple',
    email: 'warning'
  }
  return colors[type] || 'grey'
}

const formatVisitDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const openAddDialog = () => {
  editMode.value = false
  Object.assign(partnerFormData, {
    hospital_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tier: 'bronze',
    total_referrals: 0,
    notes: '',
    is_active: true
  })
  partnerDialog.value = true
}

const openDetails = async (partner: ReferralPartner) => {
  selectedPartner.value = partner
  editNotes.value = partner.notes || ''
  detailsTab.value = 'overview'
  
  // Load CRM fields
  Object.assign(crmFields, {
    key_decision_maker: (partner as any).key_decision_maker || '',
    key_decision_maker_title: (partner as any).key_decision_maker_title || '',
    key_decision_maker_email: (partner as any).key_decision_maker_email || '',
    key_decision_maker_phone: (partner as any).key_decision_maker_phone || '',
    communication_preference: (partner as any).communication_preference || 'email',
    relationship_status: (partner as any).relationship_status || 'new',
    last_contact_date: (partner as any).last_contact_date || '',
    next_followup_date: (partner as any).next_followup_date || ''
  })
  
  // Fetch visit logs
  try {
    const { data, error } = await client
      .from('partner_visit_logs')
      .select('*')
      .eq('partner_id', partner.id)
      .order('visit_date', { ascending: false })
    
    if (!error) {
      visitLogs.value = data || []
    }
  } catch (err) {
    console.error('Error fetching visit logs:', err)
    visitLogs.value = []
  }
  
  detailsDialog.value = true
}

const openEditFromDetails = () => {
  if (!selectedPartner.value) return
  editMode.value = true
  Object.assign(partnerFormData, {
    hospital_name: selectedPartner.value.hospital_name,
    contact_person: selectedPartner.value.contact_person || '',
    email: selectedPartner.value.email || '',
    phone: selectedPartner.value.phone || '',
    address: selectedPartner.value.address || '',
    tier: selectedPartner.value.tier,
    total_referrals: selectedPartner.value.total_referrals,
    notes: selectedPartner.value.notes || '',
    is_active: selectedPartner.value.is_active
  })
  detailsDialog.value = false
  partnerDialog.value = true
}

const openVisitLogDialog = () => {
  Object.assign(visitFormData, {
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: 'in_person',
    contacted_person: selectedPartner.value?.contact_person || '',
    summary: '',
    next_steps: ''
  })
  visitLogDialog.value = true
}

const saveCrmFields = async () => {
  if (!selectedPartner.value) return
  
  savingCrm.value = true
  try {
    const { error } = await client
      .from('referral_partners')
      .update({
        key_decision_maker: crmFields.key_decision_maker || null,
        key_decision_maker_title: crmFields.key_decision_maker_title || null,
        key_decision_maker_email: crmFields.key_decision_maker_email || null,
        key_decision_maker_phone: crmFields.key_decision_maker_phone || null,
        communication_preference: crmFields.communication_preference,
        relationship_status: crmFields.relationship_status,
        last_contact_date: crmFields.last_contact_date || null,
        next_followup_date: crmFields.next_followup_date || null
      })
      .eq('id', selectedPartner.value.id)
    
    if (error) throw error
    showNotification('Contact info saved!')
    await fetchPartners()
  } catch (err) {
    console.error('Error saving CRM fields:', err)
    showNotification('Failed to save contact info', 'error')
  } finally {
    savingCrm.value = false
  }
}

const saveVisitLog = async () => {
  if (!selectedPartner.value) return
  
  savingVisit.value = true
  try {
    const { error } = await client
      .from('partner_visit_logs')
      .insert({
        partner_id: selectedPartner.value.id,
        visit_date: visitFormData.visit_date,
        visit_type: visitFormData.visit_type,
        contacted_person: visitFormData.contacted_person || null,
        summary: visitFormData.summary || null,
        next_steps: visitFormData.next_steps || null,
        logged_by: user.value?.id || null
      })
    
    if (error) throw error
    
    // Also update last_contact_date
    await client
      .from('referral_partners')
      .update({ last_contact_date: visitFormData.visit_date })
      .eq('id', selectedPartner.value.id)
    
    visitLogDialog.value = false
    showNotification('Visit logged!')
    
    // Refresh visit logs
    const { data } = await client
      .from('partner_visit_logs')
      .select('*')
      .eq('partner_id', selectedPartner.value.id)
      .order('visit_date', { ascending: false })
    
    visitLogs.value = data || []
  } catch (err) {
    console.error('Error saving visit log:', err)
    showNotification('Failed to log visit', 'error')
  } finally {
    savingVisit.value = false
  }
}

const logVisit = (partner: ReferralPartner) => {
  selectedPartner.value = partner
  openVisitLogDialog()
}

const saveNotes = async () => {
  if (!selectedPartner.value) return

  saving.value = true
  try {
    await client
      .from('referral_partners')
      .update({ notes: editNotes.value })
      .eq('id', selectedPartner.value.id)

    selectedPartner.value.notes = editNotes.value
    detailsDialog.value = false
    showNotification('Notes saved')
  } catch (error) {
    console.error('Error saving notes:', error)
    showNotification('Failed to save notes', 'error')
  } finally {
    saving.value = false
  }
}

const savePartner = async () => {
  saving.value = true
  try {
    if (editMode.value && selectedPartner.value) {
      const { error } = await client
        .from('referral_partners')
        .update({
          hospital_name: partnerFormData.hospital_name,
          contact_person: partnerFormData.contact_person || null,
          email: partnerFormData.email || null,
          phone: partnerFormData.phone || null,
          address: partnerFormData.address || null,
          tier: partnerFormData.tier,
          total_referrals_all_time: partnerFormData.total_referrals,
          notes: partnerFormData.notes || null,
          is_active: partnerFormData.is_active
        })
        .eq('id', selectedPartner.value.id)

      if (error) throw error
      showNotification('Partner updated successfully')
    } else {
      const { error } = await client
        .from('referral_partners')
        .insert({
          hospital_name: partnerFormData.hospital_name,
          contact_person: partnerFormData.contact_person || null,
          email: partnerFormData.email || null,
          phone: partnerFormData.phone || null,
          address: partnerFormData.address || null,
          tier: partnerFormData.tier,
          total_referrals_all_time: partnerFormData.total_referrals,
          notes: partnerFormData.notes || null,
          is_active: partnerFormData.is_active
        })

      if (error) throw error
      showNotification('Partner added successfully')
    }

    partnerDialog.value = false
    await fetchPartners()
  } catch (error) {
    console.error('Error saving partner:', error)
    showNotification('Failed to save partner', 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (partner: ReferralPartner) => {
  partnerToDelete.value = partner
  detailsDialog.value = false
  deleteDialog.value = true
}

const deletePartner = async () => {
  if (!partnerToDelete.value) return

  deleting.value = true
  try {
    await client
      .from('referral_partners')
      .delete()
      .eq('id', partnerToDelete.value.id)

    deleteDialog.value = false
    showNotification('Partner deleted')
    await fetchPartners()
  } catch (error) {
    console.error('Error deleting partner:', error)
    showNotification('Failed to delete partner', 'error')
  } finally {
    deleting.value = false
  }
}

const fetchPartners = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('referral_partners')
      .select('*')
      .order('hospital_name')

    if (error) throw error
    // Map total_referrals_all_time to total_referrals for display
    // The actual stats come from the all_time columns populated by import scripts
    partners.value = (data || []).map(p => ({
      ...p,
      total_referrals: p.total_referrals_all_time || p.total_referrals || 0,
      total_revenue: p.total_revenue_all_time || 0
    }))
  } catch (error) {
    console.error('Error fetching partners:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPartners()
})
</script>

<style scoped>
.partner-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.partner-card:hover {
  transform: translateY(-4px);
}
</style>
