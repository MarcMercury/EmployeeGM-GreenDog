<template>
  <v-row>
    <!-- Document Vault -->
    <v-col cols="12">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="teal">mdi-folder-account</v-icon>
          Document Vault
          <v-spacer />
          <v-chip size="x-small" variant="tonal" color="teal" class="mr-2">
            {{ documents.length }} files
          </v-chip>
          <v-btn
            v-if="isAdmin"
            color="primary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="emit('open-document-dialog')"
          >
            Add Document
          </v-btn>
        </v-card-title>
        <v-card-text v-if="documents.length > 0">
          <v-table density="compact" hover>
            <thead>
              <tr>
                <th class="text-left">Document</th>
                <th class="text-left">Category</th>
                <th class="text-left">Size</th>
                <th class="text-left">Uploaded</th>
                <th class="text-center" style="width: 80px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td>
                  <div class="d-flex align-center">
                    <v-avatar size="32" :color="getDocCategoryColor(doc.category)" variant="tonal" class="mr-2">
                      <v-icon size="16">{{ getDocCategoryIcon(doc.category) }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-body-2 font-weight-medium">{{ doc.file_name }}</div>
                      <div v-if="doc.description" class="text-caption text-grey">{{ doc.description }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <v-chip :color="getDocCategoryColor(doc.category)" size="x-small" variant="tonal">
                    {{ formatDocCategory(doc.category) }}
                  </v-chip>
                </td>
                <td class="text-caption text-grey">{{ formatFileSize(doc.file_size) }}</td>
                <td class="text-caption text-grey">{{ formatDate(doc.created_at) }}</td>
                <td class="text-center">
                  <v-btn 
                    v-if="doc.file_url"
                    icon="mdi-download" 
                    size="x-small" 
                    variant="text"
                    :href="doc.file_url"
                    target="_blank"
                  />
                  <v-btn 
                    v-if="doc.file_url"
                    icon="mdi-open-in-new" 
                    size="x-small" 
                    variant="text"
                    :href="doc.file_url"
                    target="_blank"
                  />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-text v-else class="text-center py-8">
          <v-icon size="64" color="grey-lighten-2">mdi-folder-open-outline</v-icon>
          <p class="text-body-2 text-grey mt-2">No documents on file</p>
          <p class="text-caption text-grey">Documents can be uploaded via the admin portal</p>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Document Categories Summary -->
    <v-col cols="12" md="4">
      <v-card class="bg-white shadow-sm rounded-xl" elevation="0">
        <v-card-title class="text-subtitle-1 font-weight-bold">
          <v-icon start size="20" color="grey">mdi-chart-pie</v-icon>
          By Category
        </v-card-title>
        <v-card-text>
          <v-list density="compact" class="bg-transparent">
            <v-list-item 
              v-for="cat in docCategories" 
              :key="cat"
              class="px-0"
            >
              <template #prepend>
                <v-icon :color="getDocCategoryColor(cat)" size="18">{{ getDocCategoryIcon(cat) }}</v-icon>
              </template>
              <v-list-item-title class="text-body-2">
                {{ formatDocCategory(cat) }}
              </v-list-item-title>
              <template #append>
                <v-chip size="x-small" variant="text">
                  {{ documents.filter(d => d.category === cat).length }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { formatDate } from '~/utils/rosterFormatters'

defineProps<{
  documents: any[]
  isAdmin: boolean
}>()

const emit = defineEmits<{
  'open-document-dialog': []
}>()

const docCategories = ['offer_letter', 'contract', 'performance_review', 'certification', 'license', 'training', 'general']

function getDocCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'general': 'mdi-file-document', 'offer_letter': 'mdi-file-sign', 'contract': 'mdi-file-certificate',
    'performance_review': 'mdi-file-chart', 'certification': 'mdi-certificate', 'license': 'mdi-card-account-details',
    'training': 'mdi-school', 'disciplinary': 'mdi-file-alert', 'other': 'mdi-file'
  }
  return icons[category] || 'mdi-file'
}

function getDocCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'general': 'grey', 'offer_letter': 'success', 'contract': 'primary',
    'performance_review': 'info', 'certification': 'warning', 'license': 'purple',
    'training': 'teal', 'disciplinary': 'error', 'other': 'grey'
  }
  return colors[category] || 'grey'
}

function formatDocCategory(category: string): string {
  const labels: Record<string, string> = {
    'general': 'General', 'offer_letter': 'Offer Letter', 'contract': 'Contract',
    'performance_review': 'Performance Review', 'certification': 'Certification', 'license': 'License',
    'training': 'Training', 'disciplinary': 'Disciplinary', 'other': 'Other'
  }
  return labels[category] || category
}

function formatFileSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
