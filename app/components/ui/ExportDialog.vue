<template>
  <v-dialog v-model="dialogOpen" max-width="500" persistent>
    <v-card class="export-dialog">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-file-export-outline</v-icon>
        Export Data
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="close" />
      </v-card-title>

      <v-card-text>
        <!-- Step 1: Choose Format -->
        <div v-if="step === 1">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Select the format you'd like to export {{ recordCount.toLocaleString() }} records to:
          </p>

          <v-list class="export-format-list">
            <v-list-item
              v-for="format in exportFormats"
              :key="format.value"
              :value="format.value"
              :active="selectedFormat === format.value"
              rounded="lg"
              class="mb-2"
              @click="selectedFormat = format.value"
            >
              <template #prepend>
                <v-avatar :color="format.color" variant="tonal" size="40">
                  <v-icon>{{ format.icon }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">{{ format.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ format.description }}</v-list-item-subtitle>
              <template #append>
                <v-icon v-if="selectedFormat === format.value" color="primary">mdi-check-circle</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Step 2: Options -->
        <div v-else-if="step === 2">
          <p class="text-body-2 text-medium-emphasis mb-4">
            Configure your {{ selectedFormatLabel }} export:
          </p>

          <v-text-field
            v-model="fileName"
            label="File Name"
            variant="outlined"
            density="compact"
            :suffix="selectedFormatExtension"
            hint="Optional: customize the filename"
            persistent-hint
            class="mb-4"
          />

          <v-checkbox
            v-model="includeTimestamp"
            label="Include date in filename"
            hide-details
            density="compact"
            class="mb-2"
          />

          <v-checkbox
            v-if="selectedFormat === 'pdf'"
            v-model="useLandscape"
            label="Landscape orientation (better for wide tables)"
            hide-details
            density="compact"
            class="mb-2"
          />

          <!-- Preview -->
          <v-card variant="outlined" class="mt-4 bg-grey-lighten-4">
            <v-card-text class="d-flex align-center justify-space-between py-3">
              <div class="d-flex align-center">
                <v-icon :color="selectedFormatDetails.color" class="mr-2">{{ selectedFormatDetails.icon }}</v-icon>
                <span class="text-body-2">{{ previewFileName }}</span>
              </div>
              <v-chip size="x-small" color="grey">{{ recordCount }} rows</v-chip>
            </v-card-text>
          </v-card>
        </div>

        <!-- Step 3: Exporting -->
        <div v-else-if="step === 3" class="text-center py-4">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
            class="mb-4"
          />
          <p class="text-body-1 font-weight-medium">Exporting...</p>
          <p class="text-body-2 text-medium-emphasis">Preparing your {{ selectedFormatLabel }} file</p>
        </div>

        <!-- Step 4: Complete -->
        <div v-else-if="step === 4" class="text-center py-4">
          <v-icon color="success" size="64" class="mb-4">mdi-check-circle</v-icon>
          <p class="text-body-1 font-weight-medium">Export Complete!</p>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Your file should download automatically.
          </p>
          <v-chip color="success" variant="tonal" prepend-icon="mdi-file-download">
            {{ previewFileName }}
          </v-chip>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <template v-if="step === 1">
          <v-btn variant="text" @click="close">Cancel</v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!selectedFormat"
            @click="step = 2"
          >
            Next
            <v-icon end>mdi-arrow-right</v-icon>
          </v-btn>
        </template>

        <template v-else-if="step === 2">
          <v-btn variant="text" @click="step = 1">
            <v-icon start>mdi-arrow-left</v-icon>
            Back
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            @click="doExport"
          >
            <v-icon start>mdi-download</v-icon>
            Export {{ selectedFormatLabel }}
          </v-btn>
        </template>

        <template v-else-if="step === 4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="close">
            Done
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface ExportColumn {
  key: string
  title: string
  format?: (value: any, row: any) => string
}

interface Props {
  modelValue: boolean
  data: any[]
  columns: ExportColumn[]
  defaultFileName?: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultFileName: 'export',
  title: 'Export'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { exportToCsv, exportToExcel, exportToPdf, isExporting } = useTableExport()

// Dialog state
const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const step = ref(1)
const selectedFormat = ref<'csv' | 'excel' | 'pdf'>('excel')
const fileName = ref('')
const includeTimestamp = ref(true)
const useLandscape = ref(true)

// Record count
const recordCount = computed(() => props.data?.length || 0)

// Export format options
const exportFormats = [
  {
    value: 'excel',
    title: 'Excel / Google Sheets',
    description: 'Best for spreadsheet apps (Excel, Sheets, Numbers)',
    icon: 'mdi-file-excel',
    color: 'success',
    extension: '.xlsx'
  },
  {
    value: 'csv',
    title: 'CSV',
    description: 'Universal format, good for imports and data processing',
    icon: 'mdi-file-delimited',
    color: 'info',
    extension: '.csv'
  },
  {
    value: 'pdf',
    title: 'PDF',
    description: 'Printable document format',
    icon: 'mdi-file-pdf-box',
    color: 'error',
    extension: '.pdf'
  }
]

// Computed helpers
const selectedFormatDetails = computed(() => {
  return exportFormats.find(f => f.value === selectedFormat.value) || exportFormats[0]
})

const selectedFormatLabel = computed(() => selectedFormatDetails.value.title.split(' ')[0])
const selectedFormatExtension = computed(() => selectedFormatDetails.value.extension)

const previewFileName = computed(() => {
  const base = fileName.value || props.defaultFileName
  const timestamp = includeTimestamp.value
    ? `_${new Date().toISOString().split('T')[0]}`
    : ''
  return `${base}${timestamp}${selectedFormatExtension.value}`
})

// Reset on open
watch(dialogOpen, (open) => {
  if (open) {
    step.value = 1
    selectedFormat.value = 'excel'
    fileName.value = ''
    includeTimestamp.value = true
    useLandscape.value = true
  }
})

// Do export
async function doExport() {
  step.value = 3
  
  const options = {
    filename: fileName.value || props.defaultFileName,
    title: props.title,
    subtitle: `Exported on ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`,
    includeTimestamp: includeTimestamp.value,
    orientation: useLandscape.value ? 'landscape' as const : 'portrait' as const
  }
  
  let success = false
  
  try {
    if (selectedFormat.value === 'csv') {
      success = await exportToCsv(props.data, props.columns, options)
    } else if (selectedFormat.value === 'excel') {
      success = await exportToExcel(props.data, props.columns, options)
    } else if (selectedFormat.value === 'pdf') {
      success = await exportToPdf(props.data, props.columns, options)
    }
    
    if (success) {
      step.value = 4
    } else {
      step.value = 2
    }
  } catch (e) {
    console.error('Export error:', e)
    step.value = 2
  }
}

function close() {
  dialogOpen.value = false
}
</script>

<style scoped>
.export-dialog {
  border-radius: 12px;
}

.export-format-list {
  background: transparent !important;
}

.export-format-list .v-list-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.export-format-list .v-list-item:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.export-format-list .v-list-item--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08) !important;
}
</style>
