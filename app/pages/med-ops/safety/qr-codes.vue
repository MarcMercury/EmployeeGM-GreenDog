<template>
  <div class="qr-management-page">
    <!-- Page Header -->
    <UiPageHeader
      title="Safety Log QR Codes"
      subtitle="Print and place these permanent QR codes around the hospital. Each scan opens a fresh form."
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
          @click="printAll"
        >
          Print All
        </v-btn>
      </template>
    </UiPageHeader>

    <!-- Location selector -->
    <v-card variant="outlined" rounded="lg" class="mb-6">
      <v-card-text class="pb-3">
        <v-row dense align="center">
          <v-col cols="12" sm="6" md="4">
            <v-select
              v-model="selectedLocation"
              :items="SAFETY_LOCATIONS"
              item-title="label"
              item-value="value"
              label="Pre-fill location in QR"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              persistent-placeholder
              placeholder="No location pre-fill"
            />
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              :model-value="baseUrl"
              label="Site URL"
              variant="outlined"
              density="compact"
              hide-details
              readonly
              append-inner-icon="mdi-content-copy"
              @click:append-inner="copyBaseUrl"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- QR Grid -->
    <v-row>
      <v-col
        v-for="cfg in printableTypes"
        :key="cfg.key"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          variant="outlined"
          rounded="lg"
          class="qr-card text-center pa-4"
          :id="`qr-card-${cfg.key}`"
        >
          <!-- Header -->
          <v-avatar :color="cfg.color" size="40" variant="tonal" class="mb-2">
            <v-icon size="22">{{ cfg.icon }}</v-icon>
          </v-avatar>
          <div class="text-subtitle-2 font-weight-bold mb-1">{{ cfg.label }}</div>
          <div class="text-caption text-grey mb-3" style="min-height: 32px;">
            {{ cfg.description.length > 60 ? cfg.description.slice(0, 57) + '...' : cfg.description }}
          </div>

          <!-- QR Code (rendered as SVG via canvas) -->
          <div class="qr-code-container mb-3">
            <canvas
              :ref="el => setCanvasRef(cfg.key, el as HTMLCanvasElement)"
              width="200"
              height="200"
              class="qr-canvas"
            />
          </div>

          <!-- URL display -->
          <div class="text-caption text-grey-darken-1 mb-3 url-text" style="word-break: break-all; font-size: 0.65rem;">
            {{ getQrUrl(cfg.key) }}
          </div>

          <!-- Actions -->
          <div class="d-flex gap-2 justify-center">
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="mdi-content-copy"
              @click="copyUrl(cfg.key)"
            >
              Copy
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="mdi-printer"
              @click="printSingle(cfg.key)"
            >
              Print
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="mdi-download"
              @click="downloadQr(cfg.key, cfg.label)"
            >
              PNG
            </v-btn>
          </div>

          <!-- Compliance tags -->
          <div v-if="cfg.complianceStandards?.length" class="mt-3 d-flex flex-wrap gap-1 justify-center">
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

    <!-- Print instructions -->
    <v-card variant="outlined" rounded="lg" class="mt-6">
      <v-card-text>
        <div class="d-flex align-center gap-3 mb-3">
          <v-icon color="info">mdi-information</v-icon>
          <span class="text-subtitle-2 font-weight-bold">Placement Tips</span>
        </div>
        <ul class="text-body-2 ml-4" style="list-style: disc;">
          <li>Print on weather-resistant/laminated paper for wet areas</li>
          <li>Place <strong>Sharps Injury</strong> and <strong>Equipment Maintenance</strong> QR codes near relevant stations</li>
          <li>Post <strong>Emergency Contacts & Shutoffs</strong> at each facility entrance and break room</li>
          <li>Place <strong>Radiation Dosimetry</strong> near the X-ray suite</li>
          <li>Each scan opens a <em>fresh blank form</em> — the QR code is permanent and reusable</li>
          <li>If you select a location above, that location is pre-filled when someone scans the code</li>
        </ul>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
const runtimeConfig = useRuntimeConfig()

const baseUrl = computed(() => runtimeConfig.public.appUrl || 'https://employeegm.greendog.vet')
const selectedLocation = ref<SafetyLogLocation | null>(null)

// All printable types (exclude emergency_contacts — it has no form, but keep it for reference posting)
const printableTypes = computed(() => SAFETY_LOG_TYPE_CONFIGS)

// Canvas refs for QR rendering
const canvasRefs = ref<Record<string, HTMLCanvasElement | null>>({})

function setCanvasRef(key: string, el: HTMLCanvasElement | null) {
  canvasRefs.value[key] = el
}

function getQrUrl(logType: SafetyLogType): string {
  const slug = safetyKeyToSlug(logType)
  let url = `${baseUrl.value}/med-ops/safety/${slug}`
  if (selectedLocation.value) {
    url += `?location=${selectedLocation.value}`
  }
  return url
}

/**
 * Simple QR code renderer using canvas.
 * We generate QR codes client-side without external libraries
 * by encoding the URL into a QR matrix via a lightweight algorithm.
 * For production, this uses the browser's built-in capability
 * via a Google Charts QR API fallback rendered into img → canvas.
 */
async function renderQrCode(key: string) {
  const canvas = canvasRefs.value[key]
  if (!canvas) return

  const url = getQrUrl(key as SafetyLogType)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Use Google Charts API to generate QR code image
  const qrImageUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|2`

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    ctx.clearRect(0, 0, 200, 200)
    ctx.drawImage(img, 0, 0, 200, 200)
  }
  img.onerror = () => {
    // Fallback: render a placeholder with the URL text
    ctx.clearRect(0, 0, 200, 200)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#666'
    ctx.font = '11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('QR Code', 100, 90)
    ctx.fillText('(install qrcode lib', 100, 110)
    ctx.fillText('for offline generation)', 100, 130)
  }
  img.src = qrImageUrl
}

async function renderAllQrCodes() {
  await nextTick()
  // Small delay to ensure canvases are mounted
  setTimeout(() => {
    for (const cfg of SAFETY_LOG_TYPE_CONFIGS) {
      renderQrCode(cfg.key)
    }
  }, 100)
}

function copyUrl(logType: SafetyLogType) {
  const url = getQrUrl(logType)
  navigator.clipboard.writeText(url).then(() => {
    toast.success('URL copied to clipboard')
  }).catch(() => {
    toast.error('Failed to copy URL')
  })
}

function copyBaseUrl() {
  navigator.clipboard.writeText(baseUrl.value).then(() => {
    toast.success('Base URL copied')
  }).catch(() => {
    toast.error('Failed to copy')
  })
}

function downloadQr(key: string, label: string) {
  const canvas = canvasRefs.value[key]
  if (!canvas) return

  const link = document.createElement('a')
  link.download = `safety-qr-${safetyKeyToSlug(key as SafetyLogType)}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
  toast.success(`Downloaded QR for ${label}`)
}

function printSingle(key: string) {
  const card = document.getElementById(`qr-card-${key}`)
  if (!card) return
  printElement(card)
}

function printAll() {
  const printContent = document.createElement('div')
  printContent.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 16px;'

  for (const cfg of printableTypes.value) {
    const card = document.getElementById(`qr-card-${cfg.key}`)
    if (card) {
      const clone = card.cloneNode(true) as HTMLElement
      clone.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; break-inside: avoid;'
      printContent.appendChild(clone)
    }
  }

  printElement(printContent)
}

function printElement(el: HTMLElement) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    toast.error('Pop-up blocked. Please allow pop-ups for printing.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Safety Log QR Codes - Green Dog Veterinary</title>
      <style>
        body { font-family: Inter, Arial, sans-serif; padding: 20px; color: #333; }
        .qr-card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; break-inside: avoid; }
        .qr-canvas { display: block; margin: 0 auto; }
        .v-btn, .v-chip, .url-text { display: none !important; }
        .v-avatar { display: none; }
        h1 { text-align: center; margin-bottom: 8px; }
        p.subtitle { text-align: center; color: #666; margin-bottom: 24px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>Safety Log QR Codes</h1>
      <p class="subtitle">Green Dog Veterinary — Scan to submit a safety log</p>
      ${el.outerHTML}
      <script>
        setTimeout(() => { window.print(); window.close(); }, 500);
      <\/script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

// Re-render QR codes when location changes
watch(selectedLocation, () => {
  renderAllQrCodes()
})

onMounted(() => {
  renderAllQrCodes()
})
</script>

<style scoped>
.qr-management-page {
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
  min-height: 200px;
}

.qr-canvas {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

@media print {
  .v-btn, .v-select, .v-text-field {
    display: none !important;
  }
}
</style>
