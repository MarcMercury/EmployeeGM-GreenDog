<template>
  <v-dialog v-model="dialogVisible" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center py-4 bg-primary">
        <v-icon class="mr-3" color="white">mdi-file-export</v-icon>
        <span class="text-white font-weight-bold">Export {{ entityLabel }}</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="close" :disabled="exporting" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Export Format -->
        <div class="mb-6">
          <h4 class="text-subtitle-1 font-weight-medium mb-3">Export Format</h4>
          <v-radio-group v-model="exportFormat" hide-details inline>
            <v-radio value="csv">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon start color="success">mdi-file-delimited</v-icon>
                  CSV
                </div>
              </template>
            </v-radio>
            <v-radio value="excel">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon start color="success">mdi-microsoft-excel</v-icon>
                  Excel
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <!-- Column Selection -->
        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <h4 class="text-subtitle-1 font-weight-medium">Columns to Export</h4>
            <div>
              <v-btn variant="text" size="x-small" @click="selectAllColumns">Select All</v-btn>
              <v-btn variant="text" size="x-small" @click="deselectAllColumns">Clear</v-btn>
            </div>
          </div>
          
          <v-card variant="outlined" class="pa-2" style="max-height: 250px; overflow-y: auto;">
            <v-checkbox
              v-for="col in columns"
              :key="col.key"
              v-model="selectedColumns"
              :value="col.key"
              :label="col.title"
              density="compact"
              hide-details
              class="mb-1"
            />
          </v-card>
        </div>

        <!-- Record Count -->
        <v-alert type="info" variant="tonal" density="compact">
          <div class="d-flex align-center">
            <v-icon start>mdi-information</v-icon>
            <span><strong>{{ data.length }}</strong> records will be exported</span>
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="close" :disabled="exporting">
          Cancel
        </v-btn>
        <v-btn 
          color="success" 
          :loading="exporting" 
          :disabled="selectedColumns.length === 0"
          @click="doExport"
        >
          <v-icon start>mdi-download</v-icon>
          Export {{ data.length }} Records
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface ExportColumn {
  key: string
  title: string
  format?: (value: any, row?: any) => string
}

const props = defineProps<{
  modelValue: boolean
  entityLabel: string
  columns: ExportColumn[]
  data: any[]
  filename?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'exported', count: number): void
}>()

const toast = useToast()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const exportFormat = ref<'csv' | 'excel'>('csv')
const exporting = ref(false)
const selectedColumns = ref<string[]>([])

// Initialize selected columns with all columns
watch(() => props.modelValue, (visible) => {
  if (visible) {
    selectedColumns.value = props.columns.map(c => c.key)
  }
}, { immediate: true })

function selectAllColumns() {
  selectedColumns.value = props.columns.map(c => c.key)
}

function deselectAllColumns() {
  selectedColumns.value = []
}

function formatValue(value: any, format?: (v: any, r?: any) => string, row?: any): string {
  if (format) {
    return format(value, row)
  }
  
  if (value === null || value === undefined) {
    return ''
  }
  
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  
  if (typeof value === 'object') {
    if (value.name) return value.name
    if (value.title) return value.title
    if (value.label) return value.label
    return JSON.stringify(value)
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  // Date detection and formatting
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }
  
  return String(value)
}

function generateCsv(): string {
  const exportCols = props.columns.filter(c => selectedColumns.value.includes(c.key))
  
  // Header row
  const headers = exportCols.map(col => `"${col.title.replace(/"/g, '""')}"`).join(',')
  
  // Data rows
  const rows = props.data.map(row => {
    return exportCols.map(col => {
      const value = formatValue(row[col.key], col.format, row)
      return `"${value.replace(/"/g, '""')}"`
    }).join(',')
  })
  
  return [headers, ...rows].join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function doExport() {
  exporting.value = true
  
  try {
    const csv = generateCsv()
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFilename = props.filename || props.entityLabel.toLowerCase().replace(/\s+/g, '_')
    
    if (exportFormat.value === 'csv') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, `${baseFilename}_${timestamp}.csv`)
    } else {
      // Excel format (CSV with BOM for Excel compatibility)
      const bom = '\uFEFF'
      const blob = new Blob([bom + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      downloadBlob(blob, `${baseFilename}_${timestamp}.xlsx`)
    }
    
    toast.success(`Exported ${props.data.length} ${props.entityLabel.toLowerCase()}`)
    emit('exported', props.data.length)
    close()
  } catch (err: any) {
    console.error('Export failed:', err)
    toast.error('Failed to export data')
  } finally {
    exporting.value = false
  }
}

function close() {
  dialogVisible.value = false
}
</script>
