<template>
  <div class="manage-type-detail-page">
    <!-- Back link -->
    <div class="mb-4">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="router.push('/med-ops/safety/manage-types')"
        class="text-none"
      >
        Back to Manage Log Types
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Not found -->
    <UiEmptyState
      v-else-if="!typeConfig"
      type="generic"
      title="Unknown Log Type"
      description="This safety log type could not be found."
    >
      <template #action>
        <v-btn color="primary" @click="router.push('/med-ops/safety/manage-types')">
          Back to Manage Types
        </v-btn>
      </template>
    </UiEmptyState>

    <!-- Main content -->
    <template v-else>
      <!-- Header -->
      <UiPageHeader
        :title="typeConfig.label"
        :subtitle="typeConfig.description"
        :icon="typeConfig.icon"
      >
        <template #actions>
          <v-chip v-if="typeConfig.isCustom" variant="tonal" color="purple" size="small">Custom</v-chip>
          <v-chip v-else variant="tonal" color="info" size="small">Built-in</v-chip>
          <v-btn
            v-if="typeConfig.isCustom && canManage"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-pencil"
            @click="showEditDialog = true"
          >
            Edit Type
          </v-btn>
          <v-btn
            v-if="typeConfig.isCustom && canManage"
            color="error"
            variant="outlined"
            prepend-icon="mdi-delete"
            @click="showDeleteDialog = true"
          >
            Delete
          </v-btn>
        </template>
      </UiPageHeader>

      <!-- Compliance badges -->
      <div v-if="typeConfig.complianceStandards?.length" class="d-flex flex-wrap gap-2 mb-6">
        <v-chip
          v-for="std in typeConfig.complianceStandards"
          :key="std"
          variant="tonal"
          color="info"
          size="small"
        >
          {{ std }}
        </v-chip>
      </div>

      <!-- Tabs: QR Codes | Reminder Schedule | Form Fields -->
      <v-tabs v-model="activeSection" color="primary" class="mb-6">
        <v-tab value="qr">
          <v-icon start size="18">mdi-qrcode</v-icon>
          QR Codes
        </v-tab>
        <v-tab value="schedule">
          <v-icon start size="18">mdi-bell-ring</v-icon>
          Reminder Schedule
        </v-tab>
        <v-tab value="fields">
          <v-icon start size="18">mdi-form-select</v-icon>
          Form Fields ({{ typeConfig.fields.length }})
        </v-tab>
      </v-tabs>

      <!-- ═══════════════════════════════════════════
           TAB: QR Codes
           ═══════════════════════════════════════════ -->
      <div v-show="activeSection === 'qr'">
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-card-text class="py-3">
            <div class="d-flex align-center gap-2 mb-2">
              <v-icon size="18" color="info">mdi-information</v-icon>
              <span class="text-subtitle-2 font-weight-bold">QR codes for {{ typeConfig.label }}</span>
            </div>
            <div class="text-caption text-grey">
              Each QR code is permanent — scanning opens a fresh form pre-filled with the location. Print and post at each site.
            </div>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col
            v-for="loc in SAFETY_LOCATIONS"
            :key="loc.value"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card variant="outlined" rounded="lg" class="text-center pa-4 qr-card" :id="`qr-card-${loc.value}`">
              <div class="text-subtitle-2 font-weight-bold mb-1">{{ loc.label }}</div>
              <div class="text-caption text-grey mb-3">{{ loc.address }}</div>

              <div class="qr-code-container mb-3">
                <QrcodeVue
                  :value="getQrUrl(loc.value)"
                  :size="180"
                  level="M"
                  render-as="svg"
                  class="qr-svg"
                />
              </div>

              <a
                :href="getQrUrl(loc.value)"
                target="_blank"
                rel="noopener"
                class="text-caption font-weight-bold text-primary text-decoration-none d-inline-block mb-3"
              >
                Open Form ↗
              </a>

              <div class="d-flex gap-1 justify-center">
                <v-btn size="x-small" variant="text" icon="mdi-content-copy" @click="copyUrl(loc.value)" title="Copy URL" />
                <v-btn size="x-small" variant="text" icon="mdi-download" @click="downloadQr(loc.value, loc.label)" title="Download PNG" />
                <v-btn size="x-small" variant="text" icon="mdi-printer" @click="printSingle(loc.value)" title="Print" />
              </div>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- ═══════════════════════════════════════════
           TAB: Reminder Schedule
           ═══════════════════════════════════════════ -->
      <div v-show="activeSection === 'schedule'">
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-card-text class="py-3">
            <div class="d-flex align-center gap-2 mb-2">
              <v-icon size="18" color="info">mdi-information</v-icon>
              <span class="text-subtitle-2 font-weight-bold">Reminder Cadence</span>
            </div>
            <div class="text-caption text-grey">
              Set how often this log type must be completed at each location. Overdue reminders go to managers, supervisors, HR, and admins via in-app + Slack.
            </div>
          </v-card-text>
        </v-card>

        <div v-if="loadingSchedules" class="d-flex justify-center pa-6">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else>
          <v-row>
            <v-col
              v-for="loc in SAFETY_LOCATIONS"
              :key="loc.value"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card variant="outlined" rounded="lg" class="pa-4">
                <div class="d-flex align-center gap-2 mb-3">
                  <v-icon size="18">mdi-map-marker</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">{{ loc.label }}</span>
                </div>
                <v-select
                  v-if="canManage"
                  v-model="localSchedules[scheduleKey(loc.value)]"
                  :items="CADENCE_OPTIONS"
                  item-title="label"
                  item-value="value"
                  label="Cadence"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
                <v-chip
                  v-else
                  :color="cadenceColor(getCadence(loc.value))"
                  variant="tonal"
                  size="small"
                >
                  {{ cadenceLabel(getCadence(loc.value)) }}
                </v-chip>
              </v-card>
            </v-col>
          </v-row>

          <div v-if="canManage && hasUnsavedSchedules" class="d-flex justify-end mt-4">
            <v-btn
              color="success"
              variant="flat"
              prepend-icon="mdi-content-save"
              :loading="savingSchedules"
              @click="saveSchedules"
            >
              Save Schedule Changes
            </v-btn>
          </div>
        </template>
      </div>

      <!-- ═══════════════════════════════════════════
           TAB: Form Fields
           ═══════════════════════════════════════════ -->
      <div v-show="activeSection === 'fields'">
        <v-card variant="outlined" rounded="lg" class="mb-4">
          <v-card-text class="py-3">
            <div class="d-flex align-center gap-2 mb-2">
              <v-icon size="18" color="info">mdi-information</v-icon>
              <span class="text-subtitle-2 font-weight-bold">
                Form Fields
                <v-chip v-if="!typeConfig.isCustom" size="x-small" variant="tonal" color="warning" class="ml-2">Read-only (Built-in)</v-chip>
              </span>
            </div>
            <div class="text-caption text-grey">
              These fields appear when users fill out this log type via QR scan or manual entry.
              <template v-if="!typeConfig.isCustom">Built-in types cannot be edited.</template>
              <template v-else>Click "Edit Type" to modify fields.</template>
            </div>
          </v-card-text>
        </v-card>

        <div v-if="typeConfig.hasOshaToggle" class="mb-4">
          <v-chip color="error" variant="tonal" size="small" prepend-icon="mdi-alert">
            OSHA Recordable Toggle Enabled
          </v-chip>
        </div>

        <v-row dense>
          <v-col
            v-for="field in typeConfig.fields"
            :key="field.key"
            :cols="12"
            :sm="field.cols || 12"
          >
            <v-card variant="tonal" rounded="lg" class="pa-3">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <span class="text-body-2 font-weight-medium">{{ field.label }}</span>
                  <v-chip v-if="field.required" size="x-small" color="error" variant="tonal" class="ml-2">Required</v-chip>
                </div>
                <v-chip size="x-small" variant="outlined">{{ fieldTypeLabel(field.type) }}</v-chip>
              </div>
              <div v-if="field.options?.length" class="mt-2 d-flex flex-wrap gap-1">
                <v-chip
                  v-for="opt in field.options.slice(0, 5)"
                  :key="opt"
                  size="x-small"
                  variant="tonal"
                >
                  {{ opt }}
                </v-chip>
                <v-chip v-if="field.options.length > 5" size="x-small" variant="tonal" color="grey">
                  +{{ field.options.length - 5 }} more
                </v-chip>
              </div>
              <div v-if="field.hint" class="text-caption text-grey mt-1">{{ field.hint }}</div>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════
         DIALOG: Edit Custom Type
         ═══════════════════════════════════════════ -->
    <v-dialog v-model="showEditDialog" max-width="860" scrollable persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pt-4 px-4">
          <span class="text-h6 font-weight-bold">Edit Log Type</span>
          <v-btn icon="mdi-close" variant="text" @click="showEditDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4" style="max-height: 60vh; overflow-y: auto;">
          <v-row dense>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="editForm.label"
                label="Log Type Name *"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Name is required']"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="editForm.key"
                label="Key"
                variant="outlined"
                density="comfortable"
                disabled
                hint="Cannot change key"
                persistent-hint
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-text-field
                v-model="editForm.icon"
                label="Icon"
                variant="outlined"
                density="comfortable"
                hint="e.g. mdi-fire, mdi-flask"
                persistent-hint
                prepend-inner-icon="mdi-palette"
              />
            </v-col>
            <v-col cols="6" sm="4">
              <v-select
                v-model="editForm.color"
                :items="colorOptions"
                label="Color"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="4">
              <v-switch
                v-model="editForm.has_osha_toggle"
                label="OSHA Recordable Toggle"
                color="primary"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="editForm.description"
                label="Description"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="editForm.complianceText"
                label="Compliance Standards (comma-separated)"
                variant="outlined"
                density="comfortable"
                hint="e.g. Cal/OSHA Title 8 §3203, AAHA"
                persistent-hint
              />
            </v-col>
          </v-row>

          <!-- Field Builder -->
          <v-divider class="my-4" />
          <div class="d-flex align-center justify-space-between mb-3">
            <h4 class="text-subtitle-1 font-weight-bold">
              <v-icon size="18" class="mr-1">mdi-form-select</v-icon>
              Form Fields ({{ editForm.fields.length }})
            </h4>
            <v-btn variant="tonal" size="small" prepend-icon="mdi-plus" @click="addEditField">
              Add Field
            </v-btn>
          </div>

          <div v-if="editForm.fields.length === 0" class="text-center pa-6 text-caption text-grey">
            No fields yet. Add at least one field.
          </div>

          <div
            v-for="(field, i) in editForm.fields"
            :key="i"
            class="field-builder-row mb-3"
          >
            <v-card variant="tonal" rounded="lg" class="pa-3">
              <v-row dense>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="field.label"
                    label="Label *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="field.key = slugify(field.label)"
                  />
                </v-col>
                <v-col cols="6" sm="3">
                  <v-select
                    v-model="field.type"
                    :items="fieldTypeOptions"
                    label="Type"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="3" sm="2">
                  <v-select
                    v-model="field.cols"
                    :items="[6, 12]"
                    label="Width"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="3" sm="2">
                  <v-checkbox
                    v-model="field.required"
                    label="Req"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="1" class="d-flex justify-end align-center">
                  <v-btn icon="mdi-delete" variant="text" size="x-small" color="error" @click="removeEditField(i)" />
                </v-col>
              </v-row>
              <v-text-field
                v-if="['select', 'multiselect'].includes(field.type)"
                v-model="field._optionsText"
                label="Options (comma separated)"
                variant="outlined"
                density="compact"
                class="mt-2"
                hide-details
              />
            </v-card>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showEditDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingType"
            :disabled="!editForm.label || editForm.fields.length === 0"
            @click="saveEditType"
          >
            Update
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ═══════════════════════════════════════════
         DIALOG: Delete Confirmation
         ═══════════════════════════════════════════ -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="lg">
        <v-card-text class="text-center pa-6">
          <v-icon size="48" color="error" class="mb-3">mdi-alert-circle</v-icon>
          <h3 class="text-h6 font-weight-bold mb-2">Delete Log Type?</h3>
          <p class="text-body-2 text-grey">
            This will permanently delete <strong>{{ typeConfig?.label }}</strong>.
            Existing log entries of this type will remain but the form definition will be removed.
          </p>
        </v-card-text>
        <v-card-actions class="justify-center pb-4">
          <v-btn variant="outlined" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'
import {
  SAFETY_LOCATIONS,
  type SafetyLogType,
  type SafetyLogLocation,
  type SafetyLogTypeConfig,
  type SafetyFormField,
  safetySlugToKey,
  safetyKeyToSlug,
  getSafetyLogTypeConfig,
} from '~/types/safety-log.types'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { can } = usePermissions()
const runtimeConfig = useRuntimeConfig()
const { allTypes, findType, fetchCustomTypes, updateCustomType, deleteCustomType, loaded: ctLoaded } = useCustomSafetyLogTypes()

const canManage = computed(() => can('manage:safety-logs'))
const loading = ref(true)
const activeSection = ref('qr')

// ── Resolve type from URL ──────────────────────────────
const typeKey = computed<SafetyLogType>(() =>
  safetySlugToKey(route.params.type as string)
)

const typeConfig = computed<SafetyLogTypeConfig | undefined>(() => {
  const builtIn = getSafetyLogTypeConfig(typeKey.value)
  if (builtIn) return builtIn
  return findType(typeKey.value)
})

const baseUrl = computed(() => runtimeConfig.public.appUrl || 'https://employee-gm-green-dog.vercel.app')

// ── QR Code helpers ────────────────────────────────────
function getQrUrl(location: string): string {
  const slug = typeKey.value.replace(/_/g, '-')
  return `${baseUrl.value}/med-ops/safety/${slug}?location=${location}`
}

function copyUrl(location: string) {
  navigator.clipboard.writeText(getQrUrl(location)).then(() => {
    toast.success('URL copied')
  }).catch(() => {
    toast.error('Copy failed')
  })
}

function downloadQr(location: string, locationLabel: string) {
  const cardId = `qr-card-${location}`
  const card = document.getElementById(cardId)
  if (!card) return

  const svg = card.querySelector('svg.qr-svg') as SVGSVGElement | null
    ?? card.querySelector('.qr-svg svg') as SVGSVGElement | null
    ?? card.querySelector('.qr-code-container svg') as SVGSVGElement | null
  if (!svg) {
    toast.error('QR code SVG not found')
    return
  }

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
    link.download = `safety-qr-${safetyKeyToSlug(typeKey.value)}-${location}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded QR for ${locationLabel}`)
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    toast.error('Failed to render QR image')
  }
  img.src = url
}

function printSingle(location: string) {
  const cardId = `qr-card-${location}`
  const card = document.getElementById(cardId)
  if (!card) return

  const clone = card.cloneNode(true) as HTMLElement
  const win = window.open('', '_blank', 'width=600,height=800')
  if (!win) {
    toast.error('Pop-up blocked — allow pop-ups to print')
    return
  }
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Safety QR - ${typeConfig.value?.label}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; padding: 20px; color: #333; text-align: center; }
      svg { max-width: 200px; max-height: 200px; display: block; margin: 0 auto; }
      a { display: none !important; }
      button, .v-btn { display: none !important; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h2>${typeConfig.value?.label}</h2>
    ${clone.outerHTML}
    <script>setTimeout(() => { window.print(); window.close(); }, 600);<\/script>
  </body></html>`)
  win.document.close()
}

// ── Schedule / Cadence ─────────────────────────────────
const CADENCE_OPTIONS = [
  { value: 'none', label: 'No Schedule' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-Annual' },
  { value: 'annual', label: 'Annual' },
]

const localSchedules = ref<Record<string, string>>({})
const savedSchedules = ref<Record<string, string>>({})
const loadingSchedules = ref(true)
const savingSchedules = ref(false)

function scheduleKey(location: string): string {
  return `${location}::${typeKey.value}`
}

function getCadence(location: string): string {
  return localSchedules.value[scheduleKey(location)] ?? 'none'
}

function cadenceColor(val: string): string {
  const map: Record<string, string> = { monthly: 'blue', quarterly: 'teal', biannual: 'orange', annual: 'purple', none: 'grey' }
  return map[val] || 'grey'
}

function cadenceLabel(val: string): string {
  return CADENCE_OPTIONS.find(o => o.value === val)?.label || val
}

const hasUnsavedSchedules = computed(() => {
  for (const loc of SAFETY_LOCATIONS) {
    const key = scheduleKey(loc.value)
    if ((localSchedules.value[key] ?? 'none') !== (savedSchedules.value[key] ?? 'none')) return true
  }
  return false
})

async function fetchSchedules() {
  loadingSchedules.value = true
  try {
    const data = await $fetch<any[]>('/api/safety-log/schedules')
    for (const row of data || []) {
      if (row.log_type === typeKey.value) {
        const key = `${row.location}::${row.log_type}`
        localSchedules.value[key] = row.cadence || 'none'
        savedSchedules.value[key] = row.cadence || 'none'
      }
    }
    // Init defaults for missing
    for (const loc of SAFETY_LOCATIONS) {
      const key = scheduleKey(loc.value)
      if (!localSchedules.value[key]) {
        localSchedules.value[key] = 'none'
        savedSchedules.value[key] = 'none'
      }
    }
  } catch (err) {
    console.error('Failed to fetch schedules:', err)
    for (const loc of SAFETY_LOCATIONS) {
      const key = scheduleKey(loc.value)
      localSchedules.value[key] = 'none'
      savedSchedules.value[key] = 'none'
    }
  } finally {
    loadingSchedules.value = false
  }
}

async function saveSchedules() {
  savingSchedules.value = true
  try {
    const updates: { log_type: string; location: string; cadence: string }[] = []
    for (const loc of SAFETY_LOCATIONS) {
      const key = scheduleKey(loc.value)
      const current = localSchedules.value[key] ?? 'none'
      const saved = savedSchedules.value[key] ?? 'none'
      if (current !== saved) {
        updates.push({ log_type: typeKey.value, location: loc.value, cadence: current })
      }
    }
    if (updates.length === 0) return

    await $fetch('/api/safety-log/schedules', {
      method: 'PUT',
      body: { updates },
    })

    for (const loc of SAFETY_LOCATIONS) {
      const key = scheduleKey(loc.value)
      savedSchedules.value[key] = localSchedules.value[key] ?? 'none'
    }
    toast.success(`Saved ${updates.length} schedule update(s)`)
  } catch (err: any) {
    toast.error(err?.message || 'Failed to save schedules')
  } finally {
    savingSchedules.value = false
  }
}

// ── Field helpers ──────────────────────────────────────
function fieldTypeLabel(type: string): string {
  const map: Record<string, string> = {
    text: 'Text', textarea: 'Textarea', select: 'Select', multiselect: 'Multi-select',
    boolean: 'Toggle', date: 'Date', number: 'Number', file: 'File Upload',
  }
  return map[type] || type
}

// ── Edit Custom Type ───────────────────────────────────
const showEditDialog = ref(false)
const savingType = ref(false)

interface FieldForm extends SafetyFormField {
  _optionsText?: string
}

const editForm = ref({
  label: '',
  key: '',
  icon: 'mdi-clipboard-text',
  color: 'grey',
  description: '',
  has_osha_toggle: false,
  complianceText: '',
  fields: [] as FieldForm[],
})

const colorOptions = [
  'grey', 'blue', 'red', 'green', 'orange', 'purple', 'teal', 'amber',
  'indigo', 'cyan', 'lime', 'deep-orange', 'blue-grey', 'pink', 'brown',
]

const fieldTypeOptions = [
  { title: 'Text', value: 'text' },
  { title: 'Textarea', value: 'textarea' },
  { title: 'Select', value: 'select' },
  { title: 'Multi-select', value: 'multiselect' },
  { title: 'Boolean (Toggle)', value: 'boolean' },
  { title: 'Date', value: 'date' },
  { title: 'Number', value: 'number' },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function addEditField() {
  editForm.value.fields.push({
    key: '',
    label: '',
    type: 'text',
    required: false,
    cols: 12,
    _optionsText: '',
  })
}

function removeEditField(i: number) {
  editForm.value.fields.splice(i, 1)
}

watch(showEditDialog, (val) => {
  if (val && typeConfig.value) {
    const cfg = typeConfig.value
    editForm.value = {
      label: cfg.label,
      key: cfg.key,
      icon: cfg.icon,
      color: cfg.color,
      description: cfg.description,
      has_osha_toggle: cfg.hasOshaToggle || false,
      complianceText: (cfg.complianceStandards || []).join(', '),
      fields: cfg.fields.map(f => ({
        ...f,
        _optionsText: (f.options || []).join(', '),
      })),
    }
  }
})

async function saveEditType() {
  if (!editForm.value.label || editForm.value.fields.length === 0) return
  savingType.value = true

  try {
    const fields: SafetyFormField[] = editForm.value.fields.map(f => {
      const field: SafetyFormField = {
        key: f.key || slugify(f.label),
        label: f.label,
        type: f.type,
        required: f.required,
        cols: f.cols || 12,
      }
      if (['select', 'multiselect'].includes(f.type) && f._optionsText) {
        field.options = f._optionsText.split(',').map(o => o.trim()).filter(Boolean)
      }
      return field
    })

    const complianceStandards = editForm.value.complianceText
      ? editForm.value.complianceText.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const supabase = useSupabaseClient() as any
    const { data: existing } = await supabase
      .from('custom_safety_log_types')
      .select('id')
      .eq('key', editForm.value.key)
      .single()

    if (existing) {
      await updateCustomType(existing.id, {
        label: editForm.value.label,
        icon: editForm.value.icon,
        color: editForm.value.color,
        description: editForm.value.description,
        fields,
        has_osha_toggle: editForm.value.has_osha_toggle,
        compliance_standards: complianceStandards,
      })
      toast.success('Log type updated')
    }

    showEditDialog.value = false
  } catch (err: any) {
    toast.error(err?.message || 'Failed to update log type')
  } finally {
    savingType.value = false
  }
}

// ── Delete ─────────────────────────────────────────────
const showDeleteDialog = ref(false)
const deleting = ref(false)

async function doDelete() {
  if (!typeConfig.value) return
  deleting.value = true
  try {
    const supabase = useSupabaseClient() as any
    const { data } = await supabase
      .from('custom_safety_log_types')
      .select('id')
      .eq('key', typeConfig.value.key)
      .single()

    if (data) {
      await deleteCustomType(data.id)
      toast.success('Log type deleted')
      router.push('/med-ops/safety/manage-types')
    }
  } catch (err: any) {
    toast.error(err?.message || 'Failed to delete')
  } finally {
    deleting.value = false
  }
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(async () => {
  if (!ctLoaded.value) await fetchCustomTypes()
  loading.value = false
  fetchSchedules()
})
</script>

<style scoped>
.manage-type-detail-page {
  max-width: 1200px;
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

.field-builder-row {
  transition: opacity 0.15s;
}
</style>
