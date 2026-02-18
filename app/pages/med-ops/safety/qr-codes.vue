<template>
  <div class="qr-management-page">
    <!-- Page Header -->
    <UiPageHeader
      title="Safety Log QR Codes"
      :subtitle="`${allTypes.length * SAFETY_LOCATIONS.length} QR codes — one per log type per location. Print, post around the hospital, scan to submit.`"
      icon="mdi-qrcode"
    >
      <template #actions>
        <v-btn
          variant="outlined"
          prepend-icon="mdi-arrow-left"
          @click="router.push('/med-ops/safety')"
        >
          Back
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-printer"
          @click="printLocationSheet"
        >
          Print This Location
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Location Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6" grow>
      <v-tab
        v-for="loc in SAFETY_LOCATIONS"
        :key="loc.value"
        :value="loc.value"
      >
        <v-icon start size="18">mdi-map-marker</v-icon>
        {{ loc.label }}
        <v-chip
          v-if="locationCadenceCount(loc.value) > 0"
          size="x-small"
          color="primary"
          variant="tonal"
          class="ml-2"
        >
          {{ locationCadenceCount(loc.value) }} scheduled
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Cadence bulk-set bar -->
    <v-card v-if="canManage" variant="outlined" rounded="lg" class="mb-4">
      <v-card-text class="py-3">
        <v-row dense align="center">
          <v-col cols="12" sm="4">
            <span class="text-subtitle-2 font-weight-bold">
              <v-icon size="18" class="mr-1">mdi-bell-ring</v-icon>
              Notification Cadence
            </span>
            <div class="text-caption text-grey">Set how often each log type must be completed at this location</div>
          </v-col>
          <v-col cols="8" sm="4">
            <v-select
              v-model="bulkCadence"
              :items="CADENCE_OPTIONS"
              item-title="label"
              item-value="value"
              label="Set all to..."
              variant="outlined"
              density="compact"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="4" sm="2">
            <v-btn
              :disabled="!bulkCadence"
              color="primary"
              variant="tonal"
              block
              @click="applyBulkCadence"
            >
              Apply All
            </v-btn>
          </v-col>
          <v-col cols="12" sm="2">
            <v-btn
              v-if="hasUnsavedChanges"
              color="success"
              variant="flat"
              block
              prepend-icon="mdi-content-save"
              :loading="saving"
              @click="saveSchedules"
            >
              Save
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Loading -->
    <div v-if="loadingSchedules" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- QR Grid for active location -->
    <v-row v-else>
      <v-col
        v-for="cfg in printableTypes"
        :key="`${activeTab}-${cfg.key}`"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          variant="outlined"
          rounded="lg"
          class="qr-card text-center pa-4"
          :id="`qr-card-${activeTab}-${cfg.key}`"
        >
          <!-- Type icon + label -->
          <v-avatar :color="cfg.color" size="36" variant="tonal" class="mb-2">
            <v-icon size="20">{{ cfg.icon }}</v-icon>
          </v-avatar>
          <div class="text-subtitle-2 font-weight-bold">{{ cfg.label }}</div>
          <div class="text-caption text-grey mb-3" style="min-height: 28px; line-height: 1.3;">
            {{ truncate(cfg.description, 55) }}
          </div>

          <!-- QR Code (real SVG via qrcode.vue) -->
          <div class="qr-code-container mb-2">
            <QrcodeVue
              :value="getQrUrl(cfg.key)"
              :size="180"
              level="M"
              render-as="svg"
              class="qr-svg"
            />
          </div>

          <!-- Link -->
          <a
            :href="getQrUrl(cfg.key)"
            target="_blank"
            rel="noopener"
            class="text-caption font-weight-bold text-primary text-decoration-none d-inline-block mb-2"
            style="cursor: pointer;"
          >
            Open ↗
          </a>

          <!-- Cadence selector (managers only) -->
          <v-select
            v-if="canManage"
            v-model="localSchedules[scheduleKey(activeTab, cfg.key)]"
            :items="CADENCE_OPTIONS"
            item-title="label"
            item-value="value"
            label="Cadence"
            variant="outlined"
            density="compact"
            hide-details
            class="mb-2 cadence-select"
          />
          <v-chip
            v-else-if="localSchedules[scheduleKey(activeTab, cfg.key)] && localSchedules[scheduleKey(activeTab, cfg.key)] !== 'none'"
            size="small"
            variant="tonal"
            :color="cadenceColor(getCadence(activeTab, cfg.key))"
          >
            {{ cadenceLabel(getCadence(activeTab, cfg.key)) }}
          </v-chip>

          <!-- Actions row -->
          <div class="d-flex gap-1 justify-center mt-2 action-btns">
            <v-btn size="x-small" variant="text" icon="mdi-content-copy" @click="copyUrl(cfg.key)" title="Copy URL" />
            <v-btn size="x-small" variant="text" icon="mdi-download" @click="downloadQr(cfg.key, cfg.label)" title="Download PNG" />
            <v-btn size="x-small" variant="text" icon="mdi-printer" @click="printSingle(activeTab, cfg.key)" title="Print" />
          </div>

          <!-- Compliance tags -->
          <div v-if="cfg.complianceStandards?.length" class="mt-2 d-flex flex-wrap gap-1 justify-center compliance-tags">
            <v-chip
              v-for="std in cfg.complianceStandards"
              :key="std"
              size="x-small"
              variant="tonal"
              color="info"
            >
              {{ std }}
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Placement Tips -->
    <v-card variant="outlined" rounded="lg" class="mt-6">
      <v-card-text>
        <div class="d-flex align-center gap-3 mb-3">
          <v-icon color="info">mdi-information</v-icon>
          <span class="text-subtitle-2 font-weight-bold">How It Works</span>
        </div>
        <ul class="text-body-2 ml-4" style="list-style: disc;">
          <li><strong>Each QR code is permanent</strong> — scanning always opens a fresh form for that log type + location</li>
          <li>Print on <strong>laminated/weather-resistant</strong> paper for wet areas</li>
          <li>Set a <strong>cadence</strong> (monthly, quarterly, bi-annual, annual) to receive automatic overdue reminders</li>
          <li>Notifications go to <strong>managers, supervisors, HR, and admins</strong> via in-app + Slack</li>
          <li>Place <strong>Sharps Injury</strong> near sharps stations, <strong>Radiation Dosimetry</strong> by X-ray suites</li>
          <li>Post <strong>Emergency Contacts</strong> at entrances and break rooms</li>
        </ul>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import {
  SAFETY_LOG_TYPE_CONFIGS,
  SAFETY_LOCATIONS,
  type SafetyLogType,
  type SafetyLogLocation,
  safetyKeyToSlug,
} from '~/types/safety-log.types'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const router = useRouter()
const toast = useToast()
const { can } = usePermissions()
const runtimeConfig = useRuntimeConfig()
const { allTypes, fetchCustomTypes } = useCustomSafetyLogTypes()

const canManage = computed(() => can('manage:safety-logs'))

const baseUrl = computed(() => runtimeConfig.public.appUrl || 'https://employee-gm-green-dog.vercel.app')
const activeTab = ref<SafetyLogLocation>('venice')

const printableTypes = computed(() => allTypes.value)

// ── Cadence options ────────────────────────────────────
const CADENCE_OPTIONS = [
  { value: 'none', label: 'No Schedule' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-Annual' },
  { value: 'annual', label: 'Annual' },
]

function cadenceColor(val: string): string {
  const map: Record<string, string> = {
    monthly: 'blue', quarterly: 'teal', biannual: 'orange', annual: 'purple', none: 'grey',
  }
  return map[val] || 'grey'
}

function cadenceLabel(val: string): string {
  return CADENCE_OPTIONS.find(o => o.value === val)?.label || val
}

// ── Schedule state (keyed by `location::log_type`) ─────
const localSchedules = ref<Record<string, string>>({})
const savedSchedules = ref<Record<string, string>>({})
const loadingSchedules = ref(true)
const saving = ref(false)
const bulkCadence = ref<string | null>(null)

function scheduleKey(location: string, logType: string): string {
  return `${location}::${logType}`
}

function getCadence(location: string, logType: string): string {
  return localSchedules.value[scheduleKey(location, logType)] ?? 'none'
}

function getSavedCadence(key: string): string {
  return savedSchedules.value[key] ?? 'none'
}

const hasUnsavedChanges = computed(() => {
  for (const key in localSchedules.value) {
    const [loc = '', lt = ''] = key.split('::')
    if (getCadence(loc, lt) !== getSavedCadence(key)) return true
  }
  return false
})

function locationCadenceCount(location: string): number {
  let count = 0
  for (const cfg of allTypes.value) {
    const val = getCadence(location, cfg.key)
    if (val && val !== 'none') count++
  }
  return count
}

async function fetchSchedules() {
  loadingSchedules.value = true
  try {
    const data = await $fetch<any[]>('/api/safety-log/schedules')
    const map: Record<string, string> = {}
    for (const row of data || []) {
      map[scheduleKey(row.location, row.log_type)] = row.cadence || 'none'
    }
    localSchedules.value = { ...map }
    savedSchedules.value = { ...map }
  } catch (err: any) {
    console.error('Failed to fetch schedules:', err)
    // Initialize defaults
    for (const loc of SAFETY_LOCATIONS) {
      for (const cfg of allTypes.value) {
        const key = scheduleKey(loc.value, cfg.key)
        localSchedules.value[key] = 'none'
        savedSchedules.value[key] = 'none'
      }
    }
  } finally {
    loadingSchedules.value = false
  }
}

function applyBulkCadence() {
  if (!bulkCadence.value) return
  for (const cfg of allTypes.value) {
    const key = scheduleKey(activeTab.value, cfg.key)
    localSchedules.value[key] = bulkCadence.value
  }
  toast.info(`Set all ${SAFETY_LOCATIONS.find(l => l.value === activeTab.value)?.label} logs to ${cadenceLabel(bulkCadence.value)}`)
  bulkCadence.value = null
}

async function saveSchedules() {
  saving.value = true
  try {
    const updates: { log_type: string; location: string; cadence: string }[] = []
    for (const key in localSchedules.value) {
      const [loc = '', lt = ''] = key.split('::')
      const current = getCadence(loc, lt)
      if (current !== getSavedCadence(key)) {
        updates.push({ log_type: lt, location: loc, cadence: current })
      }
    }

    if (updates.length === 0) return

    await $fetch('/api/safety-log/schedules', {
      method: 'PUT',
      body: { updates },
    })

    // Sync saved state
    for (const key in localSchedules.value) {
      const [loc = '', lt = ''] = key.split('::')
      savedSchedules.value[key] = getCadence(loc, lt)
    }
    toast.success(`Saved ${updates.length} schedule update(s)`)
  } catch (err: any) {
    toast.error(err?.message || 'Failed to save schedules')
  } finally {
    saving.value = false
  }
}

// ── QR URL helpers ─────────────────────────────────────
function getQrUrl(logType: SafetyLogType): string {
  const slug = typeof logType === 'string' ? logType.replace(/_/g, '-') : safetyKeyToSlug(logType)
  return `${baseUrl.value}/med-ops/safety/${slug}?location=${activeTab.value}`
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + '...' : str
}

// ── Actions ────────────────────────────────────────────
function copyUrl(logType: SafetyLogType) {
  const url = getQrUrl(logType)
  navigator.clipboard.writeText(url).then(() => {
    toast.success('URL copied')
  }).catch(() => {
    toast.error('Copy failed')
  })
}

function downloadQr(key: string, label: string) {
  const cardId = `qr-card-${activeTab.value}-${key}`
  const card = document.getElementById(cardId)
  if (!card) {
    toast.error('Card element not found')
    return
  }

  // qrcode.vue with render-as="svg" renders the <svg> as the root element with class qr-svg
  const svg = card.querySelector('svg.qr-svg') as SVGSVGElement | null
    ?? card.querySelector('.qr-svg svg') as SVGSVGElement | null
    ?? card.querySelector('.qr-code-container svg') as SVGSVGElement | null
  if (!svg) {
    toast.error('QR code SVG not found')
    return
  }

  // SVG → Canvas → PNG
  const svgData = new XMLSerializer().serializeToString(svg)
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 400
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 400)
    ctx.drawImage(img, 0, 0, 400, 400)

    const link = document.createElement('a')
    link.download = `safety-qr-${safetyKeyToSlug(key as SafetyLogType)}-${activeTab.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded QR for ${label}`)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    toast.error('Failed to render QR image')
  }
  img.src = url
}

function printSingle(location: string, key: string) {
  const cardId = `qr-card-${location}-${key}`
  const card = document.getElementById(cardId)
  if (!card) return
  printElement(card.cloneNode(true) as HTMLElement, 'single')
}

function printLocationSheet() {
  const container = document.createElement('div')
  container.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 16px;'

  for (const cfg of printableTypes.value) {
    const cardId = `qr-card-${activeTab.value}-${cfg.key}`
    const card = document.getElementById(cardId)
    if (card) {
      const clone = card.cloneNode(true) as HTMLElement
      clone.style.cssText = 'border: 1px solid #ccc; border-radius: 8px; padding: 12px; text-align: center; break-inside: avoid;'
      container.appendChild(clone)
    }
  }

  const locLabel = SAFETY_LOCATIONS.find(l => l.value === activeTab.value)?.label || activeTab.value
  printElement(container, 'sheet', locLabel)
}

function printElement(el: HTMLElement, mode: 'single' | 'sheet', locationLabel?: string) {
  const win = window.open('', '_blank', 'width=1000,height=800')
  if (!win) {
    toast.error('Pop-up blocked — allow pop-ups to print')
    return
  }

  const title = mode === 'sheet'
    ? `Safety Log QR Codes — ${locationLabel}`
    : 'Safety Log QR Code'

  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; padding: 20px; color: #333; }
      h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
      p.sub { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
      .action-btns, .cadence-select, .v-select, .compliance-tags { display: none !important; }
      svg { max-width: 160px; max-height: 160px; display: block; margin: 0 auto; }
      a { display: none !important; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h1>${title}</h1>
    <p class="sub">Green Dog Veterinary — Scan to submit a safety log</p>
    ${el.outerHTML}
    <script>setTimeout(() => { window.print(); window.close(); }, 600);<\/script>
  </body></html>`)
  win.document.close()
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  fetchSchedules()
  fetchCustomTypes()
})
</script>

<style scoped>
.qr-management-page {
  max-width: 1400px;
}

.qr-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.qr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.qr-code-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 180px;
}

.qr-svg {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px;
  background: white;
}

.cadence-select :deep(.v-field) {
  font-size: 0.75rem;
}

@media print {
  .v-btn, .v-select, .v-text-field, .v-tabs, .action-btns {
    display: none !important;
  }
}
</style>
