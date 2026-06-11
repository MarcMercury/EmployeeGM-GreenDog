<template>
  <div class="find-dvm-page">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap gap-2">
      <div>
        <div class="d-flex align-center gap-2">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            size="small"
            to="/recruiting"
          />
          <h1 class="text-h4 font-weight-bold mb-0">Find DVM Candidates</h1>
        </div>
        <p class="text-body-2 text-grey-darken-1 mt-1">
          OpenAI + Gemini scour public hospital sites, state DVM boards, AVMA / specialty college
          directories, university faculty pages, and recruiting boards to surface real DVMs and
          specialists matching your criteria.
        </p>
      </div>
    </div>

    <!-- Search criteria -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="3">
            <v-select
              v-model="form.specialty"
              :items="specialtyOptions"
              label="Specialty / Role"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.location"
              label="Location"
              placeholder="Los Angeles, CA"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model.number="form.radiusMiles"
              type="number"
              label="Radius (mi)"
              variant="outlined"
              density="compact"
              hide-details
              min="5"
              max="500"
            />
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field
              v-model.number="form.experienceMin"
              type="number"
              label="Min experience (yrs)"
              variant="outlined"
              density="compact"
              hide-details
              min="0"
            />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field
              v-model.number="form.maxResults"
              type="number"
              label="Max results"
              variant="outlined"
              density="compact"
              hide-details
              min="5"
              max="50"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-combobox
              v-model="form.keywords"
              label="Keywords (press enter)"
              placeholder="ultrasound, fear free, exotic, dentistry"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center gap-3 flex-wrap">
            <v-checkbox
              v-model="form.includeSpecialists"
              label="Include board-certified specialists"
              density="compact"
              hide-details
            />
            <v-checkbox
              v-model="form.includeNewGraduates"
              label="Include new graduates"
              density="compact"
              hide-details
            />
            <v-switch
              v-model="form.activeOnly"
              label="Active job-seekers only"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </v-col>
          <v-col cols="12" class="d-flex align-center gap-3 flex-wrap">
            <v-checkbox
              v-model="form.enforceRadius"
              label="Enforce radius (OSM Nominatim)"
              density="compact"
              hide-details
              title="Geocode each prospect via OpenStreetMap and drop those outside the radius. Adds ~1s per prospect."
            />
            <v-checkbox
              v-model="form.verify"
              label="Verify credentials (NPI + state board + AVMA)"
              density="compact"
              hide-details
              title="Cross-check each prospect against the free CMS NPI registry, state veterinary board lookups, and the AVMA accredited-school list."
            />
          </v-col>
        </v-row>
        <div class="d-flex justify-end mt-3 gap-2">
          <v-btn variant="text" :disabled="loading" @click="resetForm">Reset</v-btn>
          <v-btn
            color="primary"
            :loading="loading"
            prepend-icon="mdi-magnify-scan"
            @click="runSearch"
          >
            Run Discovery
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Warnings (collapsed into a single expandable banner) -->
    <v-alert
      v-if="warnings.length"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-2"
      icon="mdi-information-outline"
    >
      <div class="d-flex align-center justify-space-between">
        <span>{{ warnings.length }} provider notice{{ warnings.length === 1 ? '' : 's' }}</span>
        <v-btn
          size="x-small"
          variant="text"
          @click="warningsOpen = !warningsOpen"
        >
          {{ warningsOpen ? 'Hide' : 'Show details' }}
        </v-btn>
      </div>
      <v-expand-transition>
        <ul v-if="warningsOpen" class="mt-2 mb-0 pl-4" style="font-size: 0.85rem">
          <li v-for="(w, idx) in warnings" :key="idx">{{ w }}</li>
        </ul>
      </v-expand-transition>
    </v-alert>

    <!-- Provider chips + view toggle -->
    <div v-if="lastSearchProviders" class="d-flex gap-2 mb-3 align-center flex-wrap">
      <v-chip
        v-for="(enabled, key) in lastSearchProviders"
        :key="key"
        size="small"
        :color="enabled ? 'success' : 'grey'"
        :prepend-icon="enabled ? 'mdi-check-circle' : 'mdi-close-circle'"
        variant="tonal"
      >
        {{ providerLabel(String(key)) }}
      </v-chip>
      <v-chip size="small" variant="tonal">
        {{ prospects.length }} prospect{{ prospects.length === 1 ? '' : 's' }}
      </v-chip>
      <v-chip
        v-if="activelySeekingCount > 0"
        size="small"
        color="warning"
        variant="tonal"
        prepend-icon="mdi-account-clock"
      >
        {{ activelySeekingCount }} actively seeking
      </v-chip>
      <v-spacer />
      <UiExportMenu
        v-if="prospects.length > 0"
        :data="exportRows"
        :columns="exportColumns"
        :filename="exportFilename"
        title="DVM Candidate Search"
      />
      <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
        <v-btn value="grid" size="small">
          <v-icon size="18">mdi-table</v-icon>
          <span class="ml-1">Grid</span>
        </v-btn>
        <v-btn value="cards" size="small">
          <v-icon size="18">mdi-view-grid-outline</v-icon>
          <span class="ml-1">Cards</span>
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- Empty state -->
    <v-card
      v-if="!loading && prospects.length === 0 && hasSearched"
      variant="outlined"
      class="text-center pa-8"
    >
      <v-icon size="56" color="grey-lighten-1">mdi-account-search-outline</v-icon>
      <h3 class="text-h6 mt-3">No prospects found</h3>
      <p class="text-grey">Try widening the radius or relaxing experience requirements.</p>
    </v-card>

    <v-card
      v-else-if="!loading && !hasSearched"
      variant="outlined"
      class="text-center pa-8"
    >
      <v-icon size="56" color="primary">mdi-robot-happy-outline</v-icon>
      <h3 class="text-h6 mt-3">Ready to discover candidates</h3>
      <p class="text-grey">
        Configure criteria above and click <strong>Run Discovery</strong> to begin.
      </p>
    </v-card>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <v-card v-for="i in 4" :key="i" variant="outlined" class="mb-3">
        <v-card-text>
          <v-skeleton-loader type="article" />
        </v-card-text>
      </v-card>
    </template>

    <!-- GRID / TABLE VIEW -->
    <v-card
      v-if="!loading && prospects.length > 0 && viewMode === 'grid'"
      variant="outlined"
    >
      <v-data-table
        :headers="gridHeaders"
        :items="prospects"
        :items-per-page="25"
        density="compact"
        class="prospects-grid"
      >
        <template #item.name="{ item }">
          <div class="font-weight-medium">
            {{ item.first_name }} {{ item.last_name }}<span v-if="item.credentials">, {{ item.credentials }}</span>
          </div>
          <div v-if="item.actively_seeking" class="text-caption text-warning d-flex align-center gap-1">
            <v-icon size="12">mdi-account-clock</v-icon> Actively seeking
          </div>
        </template>
        <template #item.specialty="{ item }">
          <span>{{ item.specialty || '—' }}</span>
        </template>
        <template #item.vet_school="{ item }">
          <div :title="item.vet_school_canonical || item.vet_school || ''">
            {{ item.vet_school_short || item.vet_school || '—' }}
          </div>
          <div v-if="item.graduation_year" class="text-caption text-grey">Class of {{ item.graduation_year }}</div>
          <div v-if="item.residency" class="text-caption text-grey">Residency: {{ item.residency }}</div>
        </template>
        <template #item.location="{ item }">
          {{ [item.city, item.state].filter(Boolean).join(', ') || '—' }}
        </template>
        <template #item.distance_miles="{ item }">
          <span v-if="item.distance_miles != null" class="text-caption">
            {{ item.distance_miles }} mi
          </span>
          <span v-else class="text-caption text-grey">—</span>
        </template>
        <template #item.license_status="{ item }">
          <div v-if="item.license_status">
            <a
              :href="item.license_status.source_url"
              target="_blank"
              rel="noopener"
              :title="`${item.license_status.raw_status || item.license_status.status}${item.license_status.license_number ? ` — #${item.license_status.license_number}` : ''}${item.license_status.expiration_date ? ` (exp ${item.license_status.expiration_date})` : ''}`"
              style="text-decoration: none;"
            >
              <v-chip
                size="x-small"
                :color="licenseColor(item.license_status.status)"
                variant="tonal"
              >
                {{ item.license_status.status }}
              </v-chip>
            </a>
            <div v-if="item.license_status.expiration_date" class="text-caption text-grey">
              exp {{ item.license_status.expiration_date }}
            </div>
          </div>
          <span v-else class="text-caption text-grey">—</span>
        </template>
        <template #item.signals="{ item }">
          <div class="d-flex flex-column gap-1">
            <v-chip
              v-if="item.recent_job_change"
              size="x-small"
              color="info"
              variant="tonal"
              :title="`Started ${item.recent_job_change.started_at} (${item.recent_job_change.days_in_role} days ago)${item.recent_job_change.previous_employer ? ` — previously at ${item.recent_job_change.previous_employer}` : ''}`"
            >
              <v-icon start size="12">mdi-briefcase-clock</v-icon>
              New role
            </v-chip>
            <v-tooltip v-if="item.vin_profile" :text="item.vin_profile.title || 'VIN profile'">
              <template #activator="{ props: tp }">
                <a v-bind="tp" :href="item.vin_profile.url" target="_blank" rel="noopener" class="text-caption">
                  <v-icon size="12" color="primary">mdi-paw</v-icon> VIN
                </a>
              </template>
            </v-tooltip>
            <v-tooltip
              v-if="item.email_verification"
              :text="`Hunter: ${item.email_verification.status || '—'}${item.email_verification.score != null ? ` (${item.email_verification.score}/100)` : ''}`"
            >
              <template #activator="{ props: tp }">
                <v-icon
                  v-bind="tp"
                  size="14"
                  :color="emailVerifyColor(item.email_verification)"
                >mdi-email-check-outline</v-icon>
              </template>
            </v-tooltip>
          </div>
        </template>
        <template #item.verification="{ item }">
          <div v-if="item.verification" class="d-flex flex-column gap-1">
            <v-chip
              size="x-small"
              :color="verifyColor(item.verification.confidence)"
              variant="tonal"
            >
              {{ item.verification.confidence }}%
            </v-chip>
            <div class="d-flex gap-1">
              <v-tooltip v-if="item.verification.npi_matched" :text="item.verification.npi_is_veterinary ? `NPI vet match (${item.verification.npi_number})` : `NPI match (${item.verification.npi_number}) — non-vet taxonomy`">
                <template #activator="{ props: tp }">
                  <v-icon v-bind="tp" size="14" :color="item.verification.npi_is_veterinary ? 'success' : 'grey'">mdi-card-account-details-outline</v-icon>
                </template>
              </v-tooltip>
              <v-tooltip v-if="item.verification.state_board_url" text="Open state board lookup">
                <template #activator="{ props: tp }">
                  <a v-bind="tp" :href="item.verification.state_board_url" target="_blank" rel="noopener">
                    <v-icon size="14" color="primary">mdi-shield-check-outline</v-icon>
                  </a>
                </template>
              </v-tooltip>
              <v-tooltip v-if="item.verification.diplomate_directory_url" text="Open diplomate directory">
                <template #activator="{ props: tp }">
                  <a v-bind="tp" :href="item.verification.diplomate_directory_url" target="_blank" rel="noopener">
                    <v-icon size="14" color="primary">mdi-medal-outline</v-icon>
                  </a>
                </template>
              </v-tooltip>
              <v-tooltip v-if="item.verification.avma_school_match === true" text="AVMA-accredited school">
                <template #activator="{ props: tp }">
                  <v-icon v-bind="tp" size="14" color="success">mdi-school-outline</v-icon>
                </template>
              </v-tooltip>
              <v-tooltip v-if="item.verification.avma_school_match === false" text="School not in AVMA list">
                <template #activator="{ props: tp }">
                  <v-icon v-bind="tp" size="14" color="warning">mdi-school-outline</v-icon>
                </template>
              </v-tooltip>
            </div>
          </div>
          <span v-else class="text-caption text-grey">—</span>
        </template>
        <template #item.experience_years="{ item }">
          {{ item.experience_years != null ? `${item.experience_years} yrs` : '—' }}
        </template>
        <template #item.current_employer="{ item }">
          {{ item.current_employer || '—' }}
        </template>
        <template #item.contact="{ item }">
          <div class="d-flex flex-column" style="line-height: 1.2;">
            <a v-if="item.email" :href="`mailto:${item.email}`" class="text-caption">
              <v-icon size="12">mdi-email-outline</v-icon> {{ item.email }}
            </a>
            <a v-if="item.phone" :href="`tel:${item.phone}`" class="text-caption">
              <v-icon size="12">mdi-phone-outline</v-icon> {{ item.phone }}
            </a>
            <a
              v-if="item.linkedin_url"
              :href="item.linkedin_url"
              target="_blank"
              rel="noopener"
              class="text-caption"
            >
              <v-icon size="12">mdi-linkedin</v-icon> LinkedIn
            </a>
            <span v-if="!item.email && !item.phone && !item.linkedin_url" class="text-caption text-grey">No contact</span>
          </div>
        </template>
        <template #item.match_score="{ item }">
          <v-chip
            v-if="item.match_score != null"
            size="x-small"
            :color="matchColor(item.match_score)"
            variant="tonal"
          >
            {{ item.match_score }}%
          </v-chip>
        </template>
        <template #item.specialty_match="{ item }">
          <v-tooltip v-if="item.specialty_match != null" text="How well this prospect's credentials and source match the requested specialty. Drives the result ordering.">
            <template #activator="{ props: tp }">
              <v-chip
                v-bind="tp"
                size="x-small"
                :color="matchColor(item.specialty_match)"
                variant="tonal"
                :prepend-icon="item.specialty_match >= 70 ? 'mdi-medal' : undefined"
              >
                {{ item.specialty_match }}%
              </v-chip>
            </template>
          </v-tooltip>
          <span v-else class="text-caption text-grey">—</span>
        </template>
        <template #item.source="{ item }">
          <a
            v-if="item.source_url"
            :href="item.source_url"
            target="_blank"
            rel="noopener"
            class="text-caption"
          >
            {{ item.source_name || 'View' }}
          </a>
          <span v-else class="text-caption text-grey">—</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            v-if="item.status === 'imported'"
            color="success"
            variant="tonal"
            size="small"
            prepend-icon="mdi-check-circle"
            :to="item.candidateId ? `/recruiting/${item.candidateId}` : '/recruiting'"
          >
            In Pipeline
          </v-btn>
          <v-btn
            v-else
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-account-plus"
            :loading="item.importing"
            @click="importProspect(item)"
          >
            Add
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- CARD VIEW -->
    <template v-if="!loading && prospects.length > 0 && viewMode === 'cards'">
    <v-card
      v-for="p in prospects"
      :key="prospectKey(p)"
      variant="outlined"
      class="mb-3"
    >
      <v-card-text>
        <div class="d-flex align-start justify-space-between flex-wrap gap-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-2 flex-wrap">
              <h3 class="text-h6 font-weight-bold mb-0">
                {{ p.first_name }} {{ p.last_name }}{{ p.credentials ? `, ${p.credentials}` : '' }}
              </h3>
              <v-chip
                v-if="p.match_score != null"
                size="x-small"
                :color="matchColor(p.match_score)"
                variant="tonal"
              >
                {{ p.match_score }}% match
              </v-chip>
              <v-chip
                v-if="p.actively_seeking"
                size="x-small"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-account-clock"
              >
                Actively seeking
              </v-chip>
              <v-chip size="x-small" variant="outlined" :prepend-icon="providerIcon(p.provider)">
                {{ p.provider }}
              </v-chip>
              <v-chip
                v-if="p.distance_miles != null"
                size="x-small"
                variant="tonal"
                color="info"
                prepend-icon="mdi-map-marker-distance"
              >
                {{ p.distance_miles }} mi
              </v-chip>
              <v-chip
                v-if="p.verification"
                size="x-small"
                :color="verifyColor(p.verification.confidence)"
                variant="tonal"
                prepend-icon="mdi-shield-check-outline"
                :title="p.verification.reasons.join(' • ')"
              >
                Verified {{ p.verification.confidence }}%
              </v-chip>
            </div>
            <div class="text-body-2 text-grey-darken-2 mt-1">
              <span v-if="p.specialty">{{ p.specialty }}</span>
              <span v-if="p.specialty && p.current_employer"> · </span>
              <span v-if="p.current_employer">{{ p.current_employer }}</span>
              <span v-if="(p.specialty || p.current_employer) && (p.city || p.state)"> · </span>
              <span v-if="p.city || p.state">{{ [p.city, p.state].filter(Boolean).join(', ') }}</span>
              <span v-if="p.experience_years != null"> · {{ p.experience_years }} yrs</span>
            </div>
            <div v-if="p.vet_school || p.residency" class="text-caption text-grey-darken-1 mt-1">
              <v-icon size="12">mdi-school-outline</v-icon>
              <span v-if="p.vet_school"> {{ p.vet_school }}</span>
              <span v-if="p.graduation_year"> ({{ p.graduation_year }})</span>
              <span v-if="p.residency"> · Residency: {{ p.residency }}</span>
            </div>
            <p v-if="p.notes" class="text-body-2 mt-2 mb-2">{{ p.notes }}</p>
            <div class="d-flex flex-wrap gap-2 mt-1">
              <v-chip
                v-if="p.email"
                size="x-small"
                variant="tonal"
                prepend-icon="mdi-email-outline"
              >{{ p.email }}</v-chip>
              <v-chip
                v-if="p.phone"
                size="x-small"
                variant="tonal"
                prepend-icon="mdi-phone-outline"
              >{{ p.phone }}</v-chip>
              <v-chip
                v-if="p.linkedin_url"
                size="x-small"
                variant="tonal"
                prepend-icon="mdi-linkedin"
                :href="p.linkedin_url"
                target="_blank"
                rel="noopener"
              >LinkedIn</v-chip>
              <v-chip
                v-if="p.website_url"
                size="x-small"
                variant="tonal"
                prepend-icon="mdi-web"
                :href="p.website_url"
                target="_blank"
                rel="noopener"
              >Website</v-chip>
              <v-chip
                v-if="p.source_url"
                size="x-small"
                variant="outlined"
                prepend-icon="mdi-source-branch"
                :href="p.source_url"
                target="_blank"
                rel="noopener"
              >{{ p.source_name || 'Source' }}</v-chip>
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <v-btn
              v-if="p.status === 'imported'"
              color="success"
              variant="tonal"
              prepend-icon="mdi-check-circle"
              :to="p.candidateId ? `/recruiting/${p.candidateId}` : '/recruiting'"
            >
              In Pipeline
            </v-btn>
            <v-btn
              v-else
              color="primary"
              variant="flat"
              prepend-icon="mdi-account-plus"
              :loading="p.importing"
              @click="importProspect(p)"
            >
              Add to Pipeline
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
    </template>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management'],
})

interface ProspectVerification {
  confidence: number
  reasons: string[]
  npi_matched: boolean
  npi_number?: string | null
  npi_is_veterinary: boolean
  state_board_url?: string | null
  diplomate_directory_url?: string | null
  avma_school_match: boolean | null
}

interface ProspectRow {
  first_name: string
  last_name: string
  credentials?: string | null
  specialty?: string | null
  current_employer?: string | null
  city?: string | null
  state?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  website_url?: string | null
  source_name?: string
  source_url?: string
  experience_years?: number | null
  vet_school?: string | null
  graduation_year?: number | null
  residency?: string | null
  actively_seeking?: boolean
  notes?: string | null
  match_score?: number | null
  /** Specialty-alignment score (0-100). Drives the primary result order. */
  specialty_match?: number | null
  provider: string
  distance_miles?: number | null
  verification?: ProspectVerification | null
  // Live state-board license lookup (CA + TX).
  license_status?: {
    status: string
    license_number?: string | null
    expiration_date?: string | null
    source_url: string
    raw_status?: string | null
  } | null
  // Hunter.io email-verifier output (deliverability check).
  email_verification?: {
    status?: string | null
    result?: string | null
    score?: number | null
    disposable?: boolean
    webmail?: boolean
    smtp_check?: string | null
    accept_all?: boolean
    block?: boolean
  } | null
  // Apollo-detected recent job change (<90 days in current role).
  recent_job_change?: {
    started_at: string
    days_in_role: number
    previous_employer?: string | null
  } | null
  // VIN public profile cross-reference.
  vin_profile?: {
    url: string
    title?: string | null
    snippet?: string | null
  } | null
  // Normalized vet-school names.
  vet_school_canonical?: string | null
  vet_school_short?: string | null
  // Local UI state
  status?: 'idle' | 'imported'
  importing?: boolean
  candidateId?: string
}

const specialtyOptions = [
  'General Practice',
  'Surgery',
  'Internal Medicine',
  'Dermatology',
  'Cardiology',
  'Oncology',
  'Ophthalmology',
  'Emergency & Critical Care',
  'Anesthesiology',
  'Dentistry',
  'Exotics',
  'Behavior',
  'Radiology',
  'Pathology',
  'Theriogenology',
  'Sports Medicine & Rehabilitation',
]

const form = ref({
  specialty: 'General Practice',
  location: 'Los Angeles, CA',
  radiusMiles: 50,
  experienceMin: 0,
  keywords: [] as string[],
  includeSpecialists: true,
  includeNewGraduates: true,
  maxResults: 25,
  activeOnly: false,
  enforceRadius: true,
  verify: true,
})

const loading = ref(false)
const hasSearched = ref(false)
const prospects = ref<ProspectRow[]>([])
const warnings = ref<string[]>([])
const warningsOpen = ref(false)
const lastSearchProviders = ref<Record<string, boolean> | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })
const viewMode = ref<'grid' | 'cards'>('grid')

const gridHeaders = [
  { title: 'Name', key: 'name', sortable: false, width: 200 },
  { title: 'Specialty', key: 'specialty', width: 140 },
  { title: 'Vet School', key: 'vet_school', width: 180 },
  { title: 'Experience', key: 'experience_years', width: 100 },
  { title: 'Current Employer', key: 'current_employer', width: 180 },
  { title: 'Location', key: 'location', sortable: false, width: 140 },
  { title: 'Distance', key: 'distance_miles', width: 90 },
  { title: 'License', key: 'license_status', sortable: false, width: 110 },
  { title: 'Signals', key: 'signals', sortable: false, width: 130 },
  { title: 'Verified', key: 'verification', sortable: false, width: 130 },
  { title: 'Contact', key: 'contact', sortable: false, width: 200 },
  { title: 'Specialty Fit', key: 'specialty_match', width: 110 },
  { title: 'Match', key: 'match_score', width: 90 },
  { title: 'Source', key: 'source', sortable: false, width: 120 },
  { title: '', key: 'actions', sortable: false, width: 130 },
]

const activelySeekingCount = computed(
  () => prospects.value.filter(p => p.actively_seeking).length,
)

// ---------- Export to Excel / CSV / PDF ----------
const exportColumns = [
  { key: 'first_name', title: 'First Name' },
  { key: 'last_name', title: 'Last Name' },
  { key: 'credentials', title: 'Credentials' },
  { key: 'specialty', title: 'Specialty' },
  { key: 'current_employer', title: 'Current Employer' },
  { key: 'city', title: 'City' },
  { key: 'state', title: 'State' },
  { key: 'distance_miles', title: 'Distance (mi)' },
  { key: 'experience_years', title: 'Experience (yrs)' },
  { key: 'vet_school', title: 'Vet School' },
  { key: 'vet_school_short', title: 'Vet School (Short)' },
  { key: 'graduation_year', title: 'Graduation Year' },
  { key: 'residency', title: 'Residency' },
  { key: 'email', title: 'Email' },
  { key: 'email_verification_status', title: 'Email Status' },
  { key: 'email_verification_score', title: 'Email Score' },
  { key: 'phone', title: 'Phone' },
  { key: 'linkedin_url', title: 'LinkedIn' },
  { key: 'website_url', title: 'Website' },
  { key: 'actively_seeking', title: 'Actively Seeking', format: (v: any) => (v ? 'Yes' : 'No') },
  { key: 'recent_job_change_flag', title: 'Recently Changed Jobs', format: (v: any) => (v ? 'Yes' : 'No') },
  { key: 'recent_job_change_started', title: 'New Role Start Date' },
  { key: 'recent_job_change_previous', title: 'Previous Employer' },
  { key: 'specialty_match', title: 'Specialty Fit %' },
  { key: 'match_score', title: 'Match %' },
  { key: 'verification_confidence', title: 'Verification %' },
  { key: 'verification_reasons', title: 'Verification Notes' },
  { key: 'license_status', title: 'License Status' },
  { key: 'license_number', title: 'License #' },
  { key: 'license_expiration', title: 'License Expiration' },
  { key: 'npi_number', title: 'NPI #' },
  { key: 'vin_profile_url', title: 'VIN Profile URL' },
  { key: 'provider', title: 'Source Provider' },
  { key: 'source_name', title: 'Source Name' },
  { key: 'source_url', title: 'Source URL' },
  { key: 'notes', title: 'Notes' },
]

const exportRows = computed(() =>
  prospects.value.map(p => ({
    ...p,
    verification_confidence: p.verification?.confidence ?? '',
    verification_reasons: p.verification?.reasons?.join(' | ') ?? '',
    npi_number: p.verification?.npi_number ?? '',
    vet_school_short: p.vet_school_short ?? '',
    email_verification_status: p.email_verification?.status ?? '',
    email_verification_score: p.email_verification?.score ?? '',
    license_status: p.license_status?.status ?? '',
    license_number: p.license_status?.license_number ?? '',
    license_expiration: p.license_status?.expiration_date ?? '',
    recent_job_change_flag: !!p.recent_job_change,
    recent_job_change_started: p.recent_job_change?.started_at ?? '',
    recent_job_change_previous: p.recent_job_change?.previous_employer ?? '',
    vin_profile_url: p.vin_profile?.url ?? '',
  })),
)

const exportFilename = computed(() => {
  const parts = ['dvm-candidates']
  if (form.value.specialty) parts.push(form.value.specialty.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  if (form.value.location) parts.push(form.value.location.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
  return parts.filter(Boolean).join('_').replace(/-+/g, '-')
})

function resetForm() {
  form.value = {
    specialty: 'General Practice',
    location: 'Los Angeles, CA',
    radiusMiles: 50,
    experienceMin: 0,
    keywords: [],
    includeSpecialists: true,
    includeNewGraduates: true,
    maxResults: 25,
    activeOnly: false,
    enforceRadius: true,
    verify: true,
  }
}

function prospectKey(p: ProspectRow) {
  return `${p.first_name}-${p.last_name}-${p.current_employer ?? ''}-${p.source_url ?? ''}`
}

function matchColor(score: number) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'primary'
  if (score >= 40) return 'warning'
  return 'grey'
}

function verifyColor(score: number) {
  if (score >= 60) return 'success'
  if (score >= 30) return 'primary'
  if (score > 0) return 'warning'
  return 'grey'
}

function licenseColor(status: string | null | undefined) {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'warning'
    case 'expired':
    case 'lapsed': return 'orange-darken-2'
    case 'suspended':
    case 'revoked': return 'error'
    default: return 'grey'
  }
}

function emailVerifyColor(v: any) {
  if (!v) return 'grey'
  if (v.status === 'valid' || v.result === 'deliverable') return 'success'
  if (v.status === 'accept_all' || v.accept_all) return 'warning'
  if (v.status === 'invalid' || v.result === 'undeliverable' || v.disposable || v.block) return 'error'
  if (v.status === 'unknown' || v.result === 'risky') return 'orange-darken-2'
  return 'grey'
}

function providerIcon(provider: string) {
  if (provider === 'openai') return 'mdi-creation'
  if (provider === 'gemini') return 'mdi-google'
  if (provider === 'merged') return 'mdi-source-merge'
  if (provider === 'acvs') return 'mdi-medal-outline'
  if (provider === 'apollo') return 'mdi-account-search'
  if (provider === 'npi') return 'mdi-card-account-details-outline'
  return 'mdi-robot-outline'
}

function providerLabel(key: string): string {
  const labels: Record<string, string> = {
    apollo: 'Apollo.io',
    npi: 'NPI Registry',
    tavily: 'Tavily',
    google_cse: 'Google CSE',
    brave: 'Brave Search',
    serpapi: 'SerpApi',
    openai: 'OpenAI',
    gemini: 'Gemini',
    acvs: 'ACVS Directory',
    hunter: 'Hunter.io',
  }
  return labels[key] || key
}

async function runSearch() {
  loading.value = true
  hasSearched.value = true
  warnings.value = []
  prospects.value = []

  try {
    const res = await $fetch<{
      success: boolean
      prospects: ProspectRow[]
      providers: Record<string, boolean>
      warnings: string[]
      cached?: boolean
    }>('/api/recruiting/find-dvm-candidates', {
      method: 'POST',
      body: { ...form.value },
    })

    prospects.value = (res.prospects || []).map(p => ({ ...p, status: 'idle' as const }))
    warnings.value = res.warnings || []
    lastSearchProviders.value = res.providers
    snackbar.value = {
      show: true,
      color: prospects.value.length ? 'success' : 'info',
      message: prospects.value.length
        ? `Found ${prospects.value.length} prospect${prospects.value.length === 1 ? '' : 's'}.${res.cached ? ' (cached)' : ''}`
        : 'No prospects matched. Try widening criteria.',
    }
  } catch (err: any) {
    snackbar.value = {
      show: true,
      color: 'error',
      message: err?.data?.message || err?.message || 'Discovery failed',
    }
  } finally {
    loading.value = false
  }
}

async function importProspect(p: ProspectRow) {
  p.importing = true
  try {
    const res = await $fetch<{ success: boolean; data: { id: string }; alreadyExists?: boolean }>(
      '/api/recruiting/import-prospect',
      { method: 'POST', body: p },
    )
    p.status = 'imported'
    p.candidateId = res.data?.id
    snackbar.value = {
      show: true,
      color: 'success',
      message: res.alreadyExists
        ? `${p.first_name} ${p.last_name} is already in the pipeline.`
        : `${p.first_name} ${p.last_name} added to recruiting pipeline.`,
    }
  } catch (err: any) {
    snackbar.value = {
      show: true,
      color: 'error',
      message: err?.data?.message || err?.message || 'Failed to import prospect',
    }
  } finally {
    p.importing = false
  }
}
</script>

<style scoped>
.find-dvm-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
