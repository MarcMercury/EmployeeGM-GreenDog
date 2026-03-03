<script setup lang="ts">
/**
 * List Hygiene & Email Parse
 *
 * A client-side utility to clean, merge, and filter external contact lists (CSVs)
 * before importing them into the CRM.
 *
 * Logic is split into three composables:
 *   useListParser     — CSV parsing, header mapping, file management
 *   useSetOperations   — dedup, find-new, merge, intersection, CSV export
 *   useCRMImport       — upsert leads into marketing_leads with confirmation
 */
import { STANDARD_FIELDS } from '~/composables/useListParser'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin'],
})

// ============================================
// COMPOSABLES
// ============================================

const {
  targetFiles,
  suppressionFiles,
  isDragging,
  isDraggingSuppression,
  isLoadingFiles,
  showMappingDialog,
  currentMappingFile,
  pendingMappings,
  targetFileInput,
  suppressionFileInput,
  handleFileDrop,
  handleFileInput,
  confirmMappings,
  removeFile,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  clearAll: clearAllFiles,
} = useListParser()

const {
  operationType,
  matchField,
  isProcessing,
  processedData,
  removedRecords,
  processingStats,
  showRemovedDialog,
  operationOptions,
  matchFieldOptions,
  showSuppressionZone,
  hasProcessedData,
  recordsMissingIdentifiers,
  previewHeaders,
  processLists,
  downloadCleanCSV,
} = useSetOperations()

const {
  sourceTag,
  isImporting,
  importProgress,
  importError,
  showImportConfirm,
  pendingImportCount,
  requestImport,
  importToCRM,
} = useCRMImport()

// ============================================
// PAGE-LEVEL LOGIC
// ============================================

const canProcess = computed(() => {
  if (operationType.value === 'find_new') {
    return targetFiles.value.length > 0 && suppressionFiles.value.length > 0
  }
  return targetFiles.value.length > 0
})

function handleProcessLists() {
  processLists(targetFiles, suppressionFiles)
}

function handleRequestImport() {
  requestImport(processedData.value.length)
}

function handleConfirmImport() {
  importToCRM(processedData.value, () => {
    processedData.value = []
    clearAllFiles()
    processingStats.value = { totalRows: 0, duplicatesRemoved: 0, finalCount: 0, multiEmailSplit: 0 }
  })
}

function handleClearAll() {
  clearAllFiles()
  processedData.value = []
}
</script>

<template>
  <div class="list-hygiene-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          <v-icon class="mr-2" color="primary">mdi-filter-variant</v-icon>
          List Hygiene
        </h1>
        <p class="text-body-1 text-grey-darken-1">
          Clean, merge, and filter external contact lists before CRM import
        </p>
      </div>
      <div class="d-flex gap-2">
        <v-btn
          v-if="targetFiles.length > 0 || suppressionFiles.length > 0"
          variant="outlined"
          color="error"
          prepend-icon="mdi-delete-sweep"
          @click="handleClearAll"
        >
          Clear All
        </v-btn>
      </div>
    </div>

    <!-- Operation Selection -->
    <v-card class="mb-6" rounded="lg">
      <v-card-title class="pb-1">
        <v-icon class="mr-2" size="20">mdi-cog-outline</v-icon>
        Recipe Selection
      </v-card-title>
      <v-card-text>
        <v-radio-group v-model="operationType" inline hide-details class="mt-0">
          <v-radio
            v-for="op in operationOptions"
            :key="op.value"
            :value="op.value"
            :color="op.color"
            class="mr-6"
          >
            <template #label>
              <div class="d-flex align-center">
                <v-icon :icon="op.icon" :color="op.color" class="mr-2" size="20" />
                <div>
                  <div class="font-weight-medium">{{ op.title }}</div>
                  <div class="text-caption text-grey">{{ op.subtitle }}</div>
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
        
        <!-- Match Field Toggle - Shown for all operations -->
        <div class="mt-4 pt-4" style="border-top: 1px solid rgba(0,0,0,0.1);">
          <div class="text-subtitle-2 mb-2 d-flex align-center">
            <v-icon size="18" class="mr-2">mdi-filter-check</v-icon>
            {{ showSuppressionZone ? 'Match & Exclude By' : 'Deduplicate By' }}
          </div>
          <v-btn-toggle v-model="matchField" mandatory color="primary" variant="outlined" density="compact">
            <v-btn 
              v-for="opt in matchFieldOptions" 
              :key="opt.value" 
              :value="opt.value"
              size="small"
            >
              <v-icon start size="18">{{ opt.icon }}</v-icon>
              {{ opt.title }}
            </v-btn>
          </v-btn-toggle>
          <div class="text-caption text-grey mt-1">
            {{ matchFieldOptions.find(o => o.value === matchField)?.description }}
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Dropzones Grid -->
    <v-row class="mb-6">
      <!-- Target List Dropzone -->
      <v-col :cols="showSuppressionZone ? 6 : 12">
        <v-card 
          class="dropzone-card" 
          :class="{ 'dropzone-active': isDragging }"
          rounded="lg"
          @dragenter="handleDragEnter($event, 'target')"
          @dragleave="handleDragLeave($event, 'target')"
          @dragover="handleDragOver"
          @drop="handleFileDrop($event, 'target')"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-file-upload</v-icon>
            {{ showSuppressionZone ? 'Target List (New Leads)' : 'Drop CSV Files Here' }}
            <v-chip class="ml-2" size="small" color="primary" variant="tonal">
              {{ targetFiles.length }} file{{ targetFiles.length !== 1 ? 's' : '' }}
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <!-- Loading Overlay -->
            <div v-if="isLoadingFiles" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
              <div class="text-body-1">Processing files...</div>
            </div>
            
            <!-- Upload Zone -->
            <div 
              v-else
              class="upload-zone text-center py-8 mb-4 rounded-lg"
              :class="{ 'upload-zone-active': isDragging }"
            >
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-cloud-upload</v-icon>
              <div class="text-body-1 mb-2">Drag & drop CSV files here</div>
              <div class="text-caption text-grey mb-4">or</div>
              <v-btn 
                color="primary" 
                variant="outlined"
                prepend-icon="mdi-folder-open"
                @click="targetFileInput?.click()"
              >
                Browse Files
              </v-btn>
              <input
                ref="targetFileInput"
                type="file"
                accept=".csv,text/csv,application/csv,text/plain"
                multiple
                hidden
                @change="handleFileInput($event, 'target')"
              />
            </div>

            <!-- File Chips -->
            <div v-if="targetFiles.length > 0 && !isLoadingFiles" class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="file in targetFiles"
                :key="file.id"
                closable
                :color="file.isMapping ? 'warning' : 'success'"
                variant="tonal"
                @click:close="removeFile(file.id, 'target')"
              >
                <v-icon start size="16">mdi-file-delimited</v-icon>
                {{ file.name }}
                <v-chip size="x-small" class="ml-2" color="grey-lighten-1">
                  {{ file.rowCount }} rows
                </v-chip>
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Suppression List Dropzone (only for Find New) -->
      <v-col v-if="showSuppressionZone" cols="6">
        <v-card 
          class="dropzone-card" 
          :class="{ 'dropzone-active': isDraggingSuppression }"
          rounded="lg"
          @dragenter="handleDragEnter($event, 'suppression')"
          @dragleave="handleDragLeave($event, 'suppression')"
          @dragover="handleDragOver"
          @drop="handleFileDrop($event, 'suppression')"
        >
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="error">mdi-file-remove</v-icon>
            Suppression List (Existing/Clients)
            <v-chip class="ml-2" size="small" color="error" variant="tonal">
              {{ suppressionFiles.length }} file{{ suppressionFiles.length !== 1 ? 's' : '' }}
            </v-chip>
          </v-card-title>
          
          <v-card-text>
            <!-- Upload Zone -->
            <div 
              class="upload-zone upload-zone-suppression text-center py-8 mb-4 rounded-lg"
              :class="{ 'upload-zone-active': isDraggingSuppression }"
            >
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-cloud-upload</v-icon>
              <div class="text-body-1 mb-2">Drop suppression list(s)</div>
              <div class="text-caption text-grey mb-4">Emails to exclude from target</div>
              <v-btn 
                color="error" 
                variant="outlined"
                prepend-icon="mdi-folder-open"
                @click="suppressionFileInput?.click()"
              >
                Browse Files
              </v-btn>
              <input
                ref="suppressionFileInput"
                type="file"
                accept=".csv,text/csv,application/csv,text/plain"
                multiple
                hidden
                @change="handleFileInput($event, 'suppression')"
              />
            </div>

            <!-- File Chips -->
            <div v-if="suppressionFiles.length > 0" class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="file in suppressionFiles"
                :key="file.id"
                closable
                color="error"
                variant="tonal"
                @click:close="removeFile(file.id, 'suppression')"
              >
                <v-icon start size="16">mdi-file-delimited</v-icon>
                {{ file.name }}
                <v-chip size="x-small" class="ml-2" color="grey-lighten-1">
                  {{ file.rowCount }} rows
                </v-chip>
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Process Button -->
    <div class="text-center mb-6">
      <v-btn
        size="large"
        color="primary"
        :disabled="!canProcess"
        :loading="isProcessing"
        prepend-icon="mdi-play-circle"
        @click="handleProcessLists"
      >
        Process Lists
      </v-btn>
      <div v-if="!canProcess" class="text-caption text-grey mt-2">
        <template v-if="operationType === 'find_new'">
          Add files to both Target and Suppression zones
        </template>
        <template v-else>
          Add at least one CSV file to process
        </template>
      </div>
    </div>

    <!-- Results Section -->
    <v-expand-transition>
      <v-card v-if="hasProcessedData" rounded="lg" class="mb-6">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
            Processing Complete
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <v-chip color="primary" variant="tonal" size="small">
              <v-icon start size="14">mdi-file-document</v-icon>
              {{ processingStats.totalRows }} input rows
            </v-chip>
            <v-chip v-if="processingStats.multiEmailSplit > 0" color="info" variant="tonal" size="small">
              <v-icon start size="14">mdi-email-multiple</v-icon>
              {{ processingStats.multiEmailSplit }} multi-email splits
            </v-chip>
            <v-chip 
              color="warning" 
              variant="tonal" 
              size="small"
              :class="{ 'cursor-pointer': operationType === 'find_new' && removedRecords.length > 0 }"
              @click="operationType === 'find_new' && removedRecords.length > 0 ? showRemovedDialog = true : null"
            >
              <v-icon start size="14">mdi-content-duplicate</v-icon>
              {{ processingStats.duplicatesRemoved }} removed
            </v-chip>
            <v-chip color="success" variant="tonal" size="small">
              <v-icon start size="14">mdi-account-check</v-icon>
              {{ processingStats.finalCount }} unique
            </v-chip>
          </div>
        </v-card-title>

        <v-divider />

        <!-- Warning for missing identifiers (email AND phone both missing) -->
        <v-alert
          v-if="recordsMissingIdentifiers > 0"
          type="error"
          variant="tonal"
          density="compact"
          class="mx-4 mt-4"
          icon="mdi-alert"
        >
          <strong>{{ recordsMissingIdentifiers }}</strong> of {{ processedData.length }} records are missing both email and phone.
          These records cannot be matched and will be excluded.
        </v-alert>

        <!-- Preview Table -->
        <v-card-text>
          <div class="text-subtitle-2 mb-2">Preview (first 10 rows)</div>
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th 
                  v-for="header in previewHeaders" 
                  :key="header.key"
                  :class="{ 'text-primary font-weight-bold': header.required }"
                >
                  {{ header.title }}
                  <span v-if="header.required" class="text-error">*</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in processedData.slice(0, 10)" :key="idx">
                <td 
                  v-for="header in previewHeaders" 
                  :key="header.key"
                  :class="{ 'text-error': header.required && !row[header.key] }"
                >
                  <template v-if="row[header.key]">
                    {{ row[header.key] }}
                  </template>
                  <span v-else class="text-grey-lighten-1">
                    {{ header.required ? '(missing)' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="processedData.length > 10" class="text-caption text-grey text-center mt-2">
            ... and {{ processedData.length - 10 }} more rows
          </div>
        </v-card-text>

        <v-divider />

        <!-- Actions -->
        <v-card-actions class="pa-4">
          <v-row align="center">
            <v-col cols="12" md="6">
              <v-btn
                color="secondary"
                variant="outlined"
                prepend-icon="mdi-download"
                @click="downloadCleanCSV"
              >
                Download Clean CSV
              </v-btn>
            </v-col>
            <v-col cols="12" md="6">
              <div class="d-flex align-center gap-3">
                <v-text-field
                  v-model="sourceTag"
                  label="Source Tag"
                  placeholder="e.g., Event_X_2026"
                  variant="outlined"
                  density="compact"
                  hide-details
                  prepend-inner-icon="mdi-tag"
                  style="max-width: 200px"
                />
                <v-btn
                  color="primary"
                  :loading="isImporting"
                  :disabled="!sourceTag.trim()"
                  prepend-icon="mdi-database-import"
                  @click="handleRequestImport"
                >
                  Import to CRM
                </v-btn>
              </div>
              <v-progress-linear
                v-if="isImporting"
                :model-value="importProgress"
                color="primary"
                class="mt-2"
                height="4"
                rounded
              />
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <!-- Removed Records Dialog -->
    <v-dialog v-model="showRemovedDialog" max-width="1200" scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-filter-remove</v-icon>
          Removed Records ({{ removedRecords.length }})
        </v-card-title>
        <v-card-subtitle>
          Records filtered out during processing (suppression matches + internal duplicates)
        </v-card-subtitle>
        <v-divider />
        <v-card-text class="pa-0" style="max-height: 600px;">
          <v-table density="compact" hover fixed-header>
            <thead>
              <tr>
                <th class="text-left">#</th>
                <th class="text-left">Reason</th>
                <th class="text-left">Email</th>
                <th class="text-left">First Name</th>
                <th class="text-left">Last Name</th>
                <th class="text-left">Phone</th>
                <th class="text-left">Company</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, idx) in removedRecords" :key="idx">
                <td>{{ idx + 1 }}</td>
                <td>
                  <v-chip 
                    :color="record._removeReason === 'Suppression List Match' ? 'error' : 'warning'" 
                    size="x-small" 
                    variant="tonal"
                  >
                    {{ record._removeReason || 'Unknown' }}
                  </v-chip>
                </td>
                <td>{{ record.email || '-' }}</td>
                <td>{{ record.first_name || '-' }}</td>
                <td>{{ record.last_name || '-' }}</td>
                <td>{{ record.phone || '-' }}</td>
                <td>{{ record.company || '-' }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-if="removedRecords.length === 0" class="text-center pa-6 text-grey">
            <v-icon size="48" color="grey-lighten-1">mdi-filter-off</v-icon>
            <div class="text-body-2 mt-2">No records were removed</div>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showRemovedDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Header Mapping Dialog -->
    <v-dialog v-model="showMappingDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-head-question</v-icon>
          Confirm Header Mappings
        </v-card-title>
        <v-card-subtitle>
          Some column headers need confirmation for: {{ currentMappingFile?.name }}
        </v-card-subtitle>
        <v-card-text>
          <v-list>
            <v-list-item v-for="(mapping, idx) in pendingMappings" :key="idx">
              <template #prepend>
                <v-icon color="grey">mdi-table-column</v-icon>
              </template>
              <v-list-item-title>
                "{{ mapping.original }}"
              </v-list-item-title>
              <template #append>
                <v-select
                  v-model="mapping.suggested"
                  :items="STANDARD_FIELDS"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="min-width: 150px"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showMappingDialog = false">Skip</v-btn>
          <v-btn color="primary" @click="confirmMappings">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import Confirmation Dialog -->
    <v-dialog v-model="showImportConfirm" max-width="450">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-database-import</v-icon>
          Confirm CRM Import
        </v-card-title>
        <v-card-text>
          <p class="text-body-1 mb-3">
            You are about to import <strong>{{ pendingImportCount }}</strong> leads into the CRM
            with source tag <strong>"{{ sourceTag }}"</strong>.
          </p>
          <p class="text-body-2 text-grey">
            Existing leads with the same email will be skipped (not duplicated).
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showImportConfirm = false">Cancel</v-btn>
          <v-btn color="primary" @click="handleConfirmImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.list-hygiene-page {
  max-width: 1400px;
  margin: 0 auto;
}

.cursor-pointer {
  cursor: pointer;
  transition: opacity 0.2s;
}

.cursor-pointer:hover {
  opacity: 0.8;
}

.dropzone-card {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  transition: all 0.3s ease;
}

.dropzone-card.dropzone-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.upload-zone {
  border: 2px dashed #e0e0e0;
  background-color: #fafafa;
  transition: all 0.3s ease;
}

.upload-zone.upload-zone-active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.upload-zone-suppression.upload-zone-active {
  border-color: rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.08);
}
</style>
