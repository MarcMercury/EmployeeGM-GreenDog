<template>
  <div class="resources-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Resources</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'Manage marketing assets and resource library' : 'Download marketing assets' }}
        </p>
      </div>
      <div v-if="isAdmin" class="d-flex gap-2">
        <!-- Library Actions -->
        <v-btn variant="outlined" prepend-icon="mdi-folder-plus" @click="showAddFolderDialog = true">
          New Folder
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-upload" @click="showUploadDialog = true">
          Upload
        </v-btn>
      </div>
    </div>

    <!-- File Library Content -->
    <div>
        <!-- Breadcrumb Navigation -->
        <v-breadcrumbs :items="(breadcrumbs as any[])" class="px-0 mb-4">
          <template #prepend>
            <v-icon icon="mdi-folder-home" size="small" />
          </template>
          <template #divider>
            <v-icon icon="mdi-chevron-right" size="small" />
          </template>
          <template #item="{ item }">
            <v-breadcrumbs-item 
              :disabled="item.disabled"
              class="breadcrumb-link"
              @click="navigateToFolder(getBreadcrumbPath(item))"
            >
              {{ item.title }}
            </v-breadcrumbs-item>
          </template>
        </v-breadcrumbs>

        <!-- Search & Filters -->
        <v-card rounded="lg" class="mb-6">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="5">
                <v-text-field
                  v-model="librarySearch"
                  placeholder="Search files and folders..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="fileTypeFilter"
                  :items="['All Types', 'Documents', 'Images', 'Videos', 'Templates']"
                  label="File Type"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="2">
                <v-btn-toggle v-model="libraryViewMode" mandatory variant="outlined" density="compact">
                  <v-btn icon="mdi-view-grid" value="grid" size="small" />
                  <v-btn icon="mdi-view-list" value="list" size="small" />
                </v-btn-toggle>
              </v-col>
              <v-col v-if="isAdmin" cols="12" md="2" class="text-right">
                <v-switch
                  v-model="showArchived"
                  label="Archived"
                  hide-details
                  density="compact"
                  color="grey"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- External Resources (Top Level) -->
        <div v-if="currentPath === ''" class="mb-6">
          <h3 class="text-subtitle-2 text-grey mb-3">External Resources</h3>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                href="https://www.dropbox.com/scl/fo/465hik7yxbdej26k3xwe5/AEqcQ-cpxxU8OjzFrFQbNdY?rlkey=dvmv0cvj504n7gkvt7kf82eld&e=1&st=z1s68eaf&dl=0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" color="blue" class="mb-3">
                    <v-icon size="32" color="white">mdi-dropbox</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">Company Assets</h3>
                  <p class="text-caption text-grey mb-2">Dropbox folder for company assets</p>
                  <v-chip size="x-small" color="blue" variant="tonal">
                    <v-icon start size="x-small">mdi-open-in-new</v-icon>
                    External Link
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                href="https://www.dropbox.com/scl/fo/s36wdlct6q8rgznvsi8py/AJgaoCVe15pIUGjHdlX4omo?rlkey=cwwum11xdjslh36c2wddux1kg&e=1&st=udfnbd9u&dl=0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" color="purple" class="mb-3">
                    <v-icon size="32" color="white">mdi-dropbox</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">Media Drop Box</h3>
                  <p class="text-caption text-grey mb-2">Dropbox folder for media files</p>
                  <v-chip size="x-small" color="purple" variant="tonal">
                    <v-icon start size="x-small">mdi-open-in-new</v-icon>
                    External Link
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                href="https://www.canva.com/login/?redirect=%2Fdesign%2FDAGZrjtoYzw%2FF_LmUEwIEto-N96GAg6idw%2Fedit"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" color="teal" class="mb-3">
                    <v-icon size="32" color="white">mdi-palette</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">Canva</h3>
                  <p class="text-caption text-grey mb-2">Design platform for graphics</p>
                  <v-chip size="x-small" color="teal" variant="tonal">
                    <v-icon start size="x-small">mdi-open-in-new</v-icon>
                    External Link
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                href="https://docs.google.com/spreadsheets/d/1hZvC3hqKfotbMU7qkzOce2Ya4xovNabHVwGc2z2PI6Y/edit?gid=303049314#gid=303049314"
                target="_blank"
                rel="noopener noreferrer"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" color="green" class="mb-3">
                    <v-icon size="32" color="white">mdi-account-key</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">User Accounts</h3>
                  <p class="text-caption text-grey mb-2">Account credentials spreadsheet</p>
                  <v-chip size="x-small" color="green" variant="tonal">
                    <v-icon start size="x-small">mdi-open-in-new</v-icon>
                    External Link
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col v-if="isAdmin" cols="12" sm="6" md="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                :to="'/marketing/inventory'"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" color="amber" class="mb-3">
                    <v-icon size="32" color="white">mdi-package-variant-closed</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">Inventory</h3>
                  <p class="text-caption text-grey mb-2">Marketing supplies & materials</p>
                  <v-chip size="x-small" color="amber" variant="tonal">
                    <v-icon start size="x-small">mdi-arrow-right</v-icon>
                    View Inventory
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Category Folders (Top Level) -->
        <div v-if="currentPath === ''" class="mb-6">
          <h3 class="text-subtitle-2 text-grey mb-3">File Library</h3>
          <v-row>
            <v-col v-for="category in visibleCategories" :key="category.id" cols="12" sm="6" md="4" lg="3">
              <v-card 
                rounded="lg" 
                class="folder-card h-100"
                @click="navigateToFolder(category.id)"
              >
                <v-card-text class="text-center py-6">
                  <v-avatar size="64" :color="category.color" class="mb-3">
                    <v-icon size="32" color="white">{{ category.icon }}</v-icon>
                  </v-avatar>
                  <h3 class="text-subtitle-1 font-weight-bold">{{ category.name }}</h3>
                  <p class="text-caption text-grey mb-2">{{ category.description }}</p>
                  <v-chip size="x-small" variant="tonal">
                    {{ getFolderItemCount(category.id) }} items
                  </v-chip>
                  <v-chip v-if="category.adminOnly && isAdmin" size="x-small" color="warning" class="ml-1">
                    Admin
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Sub-folder / File Grid View -->
        <div v-else>
          <!-- Sub-folders -->
          <div v-if="currentSubfolders.length > 0" class="mb-6">
            <h3 class="text-subtitle-2 text-grey mb-3">Folders</h3>
            <v-row>
              <v-col v-for="folder in currentSubfolders" :key="folder.id" cols="6" sm="4" md="3" lg="2">
                <v-card 
                  rounded="lg" 
                  class="folder-card text-center pa-4"
                  @click="navigateToFolder(currentPath + '/' + folder.id)"
                >
                  <v-icon size="48" color="amber-darken-2">mdi-folder</v-icon>
                  <div class="text-body-2 font-weight-medium mt-2 text-truncate">{{ folder.name }}</div>
                  <div class="text-caption text-grey">{{ folder.itemCount }} items</div>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Files Grid -->
          <div v-if="libraryViewMode === 'grid'">
            <h3 v-if="currentFiles.length > 0" class="text-subtitle-2 text-grey mb-3">Files</h3>
            <v-row>
              <v-col v-for="file in currentFiles" :key="file.id" cols="6" sm="4" md="3" lg="2">
                <v-card rounded="lg" class="file-card text-center pa-3">
                  <v-icon size="40" :color="getFileTypeColor(file.file_type)">{{ getFileTypeIcon(file.file_type) }}</v-icon>
                  <div class="text-body-2 font-weight-medium mt-2 text-truncate" :title="file.name">
                    {{ file.name }}
                  </div>
                  <div class="text-caption text-grey">{{ formatFileSize(file.file_size) }}</div>
                  <div class="mt-2">
                    <v-btn size="x-small" variant="tonal" color="primary" @click="downloadFile(file)">
                      <v-icon size="14">mdi-download</v-icon>
                    </v-btn>
                    <v-btn v-if="isAdmin" size="x-small" variant="text" class="ml-1" @click="deleteFile(file)">
                      <v-icon size="14">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Files List View -->
          <v-card v-else rounded="lg">
            <v-data-table
              :headers="fileTableHeaders"
              :items="currentFiles"
              :search="librarySearch"
              hover
              density="compact"
            >
              <template #item.name="{ item }">
                <div class="d-flex align-center py-1">
                  <v-icon :color="getFileTypeColor(item.file_type)" class="mr-2">{{ getFileTypeIcon(item.file_type) }}</v-icon>
                  <span class="font-weight-medium">{{ item.name }}</span>
                </div>
              </template>
              <template #item.file_size="{ item }">
                {{ formatFileSize(item.file_size) }}
              </template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-download" size="x-small" variant="text" color="primary" @click="downloadFile(item)" />
                <v-btn v-if="isAdmin" icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteFile(item)" />
              </template>
            </v-data-table>
          </v-card>

          <!-- Empty State -->
          <v-card v-if="currentFiles.length === 0 && currentSubfolders.length === 0" rounded="lg" class="pa-8 text-center">
            <v-icon size="64" color="grey-lighten-1">mdi-folder-open-outline</v-icon>
            <h3 class="text-h6 mt-4 mb-2">This folder is empty</h3>
            <p class="text-body-2 text-grey">
              {{ isAdmin ? 'Upload files or create subfolders to get started' : 'No files available in this folder yet' }}
            </p>
            <v-btn v-if="isAdmin" color="primary" class="mt-4" @click="showUploadDialog = true">
              <v-icon start>mdi-upload</v-icon>
              Upload Files
            </v-btn>
          </v-card>
        </div>
      </div>

    <!-- Upload File Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-upload</v-icon>
          Upload Files
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-select
            v-model="uploadFolder"
            :items="allFolderPaths"
            item-title="title"
            item-value="value"
            label="Destination Folder"
            variant="outlined"
            density="compact"
            class="mb-4"
          />
          <v-file-input
            v-model="uploadFiles"
            label="Select Files"
            variant="outlined"
            density="compact"
            multiple
            show-size
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
          />
          <v-checkbox
            v-model="uploadAsAdminOnly"
            label="Admin-only access"
            hint="Only admins will be able to see and download these files"
            persistent-hint
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showUploadDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!uploadFiles?.length" :loading="uploading" @click="handleUpload">
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Folder Dialog -->
    <v-dialog v-model="showAddFolderDialog" max-width="400">
      <v-card>
        <v-card-title>Create New Folder</v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-select
            v-model="newFolderParent"
            :items="allFolderPaths"
            item-title="title"
            item-value="value"
            label="Parent Folder"
            variant="outlined"
            density="compact"
            class="mb-4"
          />
          <v-text-field
            v-model="newFolderName"
            label="Folder Name"
            variant="outlined"
            density="compact"
          />
          <v-checkbox
            v-model="newFolderAdminOnly"
            label="Admin-only folder"
            density="compact"
          />
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAddFolderDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!newFolderName" @click="createFolder">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'marketing-admin']
})

const { isAdmin } = useAppData()
const supabase = useSupabaseClient()
const route = useRoute()
const { showSuccess, showError } = useToast()

useHead({
  title: 'Resources'
})

// ============================================
// STATE
// ============================================
const currentPath = ref('')
const loadingFiles = ref(false)
const loadingFolders = ref(false)
const uploading = ref(false)

// Library state
const librarySearch = ref('')
const fileTypeFilter = ref('All Types')
const libraryViewMode = ref('grid')
const showArchived = ref(false)
const showUploadDialog = ref(false)
const showAddFolderDialog = ref(false)
const uploadFiles = ref<File[]>([])
const uploadFolder = ref('')
const uploadAsAdminOnly = ref(false)
const newFolderName = ref('')
const newFolderParent = ref('')
const newFolderAdminOnly = ref(false)

// Database-backed data
const dbFolders = ref<any[]>([])
const dbFiles = ref<any[]>([])

const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// ============================================
// LOAD DATA FROM DATABASE
// ============================================
async function loadFolders() {
  loadingFolders.value = true
  try {
    const { data, error } = await supabase
      .from('marketing_folders')
      .select('*')
      .order('sort_order')
    
    if (error) throw error
    dbFolders.value = data || []
  } catch (err: any) {
    console.error('Error loading folders:', err)
  } finally {
    loadingFolders.value = false
  }
}

async function loadFiles() {
  loadingFiles.value = true
  try {
    // Start with a simpler query that doesn't rely on is_archived column
    // in case the column doesn't exist in the database
    let query = supabase
      .from('marketing_resources')
      .select('*')
      .order('name')
    
    // Only filter by is_archived if not showing archived
    // This filter may fail if column doesn't exist, so we'll catch that
    if (!showArchived.value) {
      query = query.eq('is_archived', false)
    }
    
    const { data, error } = await query
    
    if (error) {
      // If error is about column not existing, try without the filter
      if (error.message?.includes('is_archived') || error.code === '42703') {
        console.warn('is_archived column may not exist, fetching all resources')
        const { data: allData, error: allError } = await supabase
          .from('marketing_resources')
          .select('*')
          .order('name')
        
        if (allError) throw allError
        dbFiles.value = allData || []
        return
      }
      throw error
    }
    dbFiles.value = data || []
  } catch (err: any) {
    console.error('Error loading files:', err)
    // Show empty state rather than crashing
    dbFiles.value = []
  } finally {
    loadingFiles.value = false
  }
}

// Load on mount
onMounted(() => {
  loadFolders()
  loadFiles()
})

// Watch for archived toggle
watch(showArchived, () => {
  loadFiles()
})

// ============================================
// TABLE HEADERS
// ============================================
const fileTableHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Type', key: 'file_type', sortable: true },
  { title: 'Size', key: 'file_size', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
]

// ============================================
// COMPUTED - USING DATABASE DATA
// ============================================

// Get root folders (categories)
const fileCategories = computed(() => {
  return dbFolders.value
    .filter(f => !f.parent_id)
    .map(f => ({
      id: f.path || f.id,
      name: f.name,
      description: f.description || '',
      icon: f.icon || 'mdi-folder',
      color: f.color || '#9E9E9E',
      adminOnly: f.admin_only,
      subfolders: dbFolders.value
        .filter(sf => sf.parent_id === f.id)
        .map(sf => ({
          id: sf.path?.split('/').pop() || sf.id,
          name: sf.name,
          itemCount: dbFiles.value.filter(file => file.folder_path === sf.path).length
        }))
    }))
})

const visibleCategories = computed(() => {
  return fileCategories.value.filter(cat => !cat.adminOnly || isAdmin.value)
})

const breadcrumbs = computed(() => {
  const items: { title: string; path: string; disabled: boolean }[] = [{ title: 'Library', path: '', disabled: currentPath.value === '' }]
  
  if (currentPath.value) {
    const parts = currentPath.value.split('/')
    let path = ''
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue
      path = path ? `${path}/${part}` : part
      
      // Find the name for this path segment
      let name: string = part
      if (i === 0) {
        const category = fileCategories.value.find(c => c.id === part)
        if (category) name = category.name
      } else {
        const categoryId = parts[0]
        const category = fileCategories.value.find(c => c.id === categoryId)
        const subfolder = category?.subfolders.find(s => s.id === part)
        if (subfolder) name = subfolder.name
      }
      
      items.push({
        title: name,
        path,
        disabled: path === currentPath.value
      })
    }
  }
  
  return items
})

const currentSubfolders = computed(() => {
  if (!currentPath.value) return []
  
  const categoryId = currentPath.value.split('/')[0]
  const category = fileCategories.value.find(c => c.id === categoryId)
  
  // If at category root, return subfolders
  if (currentPath.value === categoryId && category) {
    return category.subfolders
  }
  
  return []
})

const currentFiles = computed(() => {
  if (!currentPath.value) return []
  
  let result = dbFiles.value.filter(f => f.folder_path === currentPath.value)
  
  // Filter admin-only files for non-admins
  if (!isAdmin.value) {
    result = result.filter(f => !f.admin_only)
  }
  
  // Apply search
  if (librarySearch.value) {
    const query = librarySearch.value.toLowerCase()
    result = result.filter(f => f.name.toLowerCase().includes(query))
  }
  
  // Apply file type filter
  if (fileTypeFilter.value !== 'All Types') {
    const typeMap: Record<string, string[]> = {
      'Documents': ['document', 'pdf', 'doc', 'docx', 'txt'],
      'Images': ['image', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
      'Videos': ['video', 'mp4', 'mov', 'webm'],
      'Templates': ['template', 'ai', 'psd']
    }
    const types = typeMap[fileTypeFilter.value] || []
    result = result.filter(f => types.some(t => (f.file_type || '').toLowerCase().includes(t)))
  }
  
  return result
})

const allFolderPaths = computed(() => {
  const paths: { title: string; value: string }[] = [{ title: 'Root', value: '' }]
  fileCategories.value.forEach(cat => {
    if (!cat.adminOnly || isAdmin.value) {
      paths.push({ title: cat.name, value: cat.id })
      cat.subfolders.forEach(sub => {
        paths.push({ title: `${cat.name} / ${sub.name}`, value: `${cat.id}/${sub.id}` })
      })
    }
  })
  return paths
})

// ============================================
// METHODS
// ============================================
function getFolderItemCount(categoryId: string) {
  const category = fileCategories.value.find(c => c.id === categoryId)
  if (!category) return 0
  return category.subfolders.reduce((sum, sf) => sum + sf.itemCount, 0)
}

function navigateToFolder(path: string) {
  currentPath.value = path
}

function getBreadcrumbPath(item: unknown): string {
  return (item as { path: string }).path || ''
}

function getFileTypeIcon(type: string) {
  const typeStr = (type || '').toLowerCase()
  if (typeStr.includes('pdf') || typeStr.includes('document')) return 'mdi-file-document'
  if (typeStr.includes('image') || typeStr.includes('jpg') || typeStr.includes('png') || typeStr.includes('svg')) return 'mdi-file-image'
  if (typeStr.includes('video') || typeStr.includes('mp4')) return 'mdi-file-video'
  if (typeStr.includes('excel') || typeStr.includes('spreadsheet') || typeStr.includes('xlsx')) return 'mdi-file-excel'
  if (typeStr.includes('zip') || typeStr.includes('archive')) return 'mdi-folder-zip'
  if (typeStr.includes('word') || typeStr.includes('doc')) return 'mdi-file-word'
  if (typeStr.includes('powerpoint') || typeStr.includes('ppt')) return 'mdi-file-powerpoint'
  return 'mdi-file'
}

function getFileTypeColor(type: string) {
  const typeStr = (type || '').toLowerCase()
  if (typeStr.includes('pdf')) return '#F44336'
  if (typeStr.includes('image') || typeStr.includes('jpg') || typeStr.includes('png')) return '#4CAF50'
  if (typeStr.includes('video')) return '#9C27B0'
  if (typeStr.includes('excel') || typeStr.includes('xlsx')) return '#2E7D32'
  if (typeStr.includes('word') || typeStr.includes('doc')) return '#2196F3'
  if (typeStr.includes('zip')) return '#607D8B'
  return '#9E9E9E'
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

async function downloadFile(file: any) {
  try {
    if (!file.file_url) {
      showError('No file URL available')
      return
    }
    
    // Get signed URL for download
    const { data, error } = await supabase.storage
      .from('marketing-resources')
      .createSignedUrl(file.file_url, 60) // 60 second expiry
    
    if (error) throw error
    
    // Trigger download
    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    showSuccess(`Downloading ${file.name}...`)
  } catch (err: any) {
    showError('Failed to download file: ' + err.message)
  }
}

function editFile(file: any) {
  snackbar.message = 'Edit file dialog would open'
  snackbar.color = 'info'
  snackbar.show = true
}

async function deleteFile(file: any) {
  if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return
  
  try {
    // Delete from storage
    if (file.file_url) {
      const { error: storageError } = await supabase.storage
        .from('marketing-resources')
        .remove([file.file_url])
      
      if (storageError) console.warn('Storage delete error:', storageError)
    }
    
    // Delete from database
    const { error } = await supabase
      .from('marketing_resources')
      .delete()
      .eq('id', file.id)
    
    if (error) throw error
    
    showSuccess('File deleted')
    await loadFiles()
  } catch (err: any) {
    showError('Failed to delete file: ' + err.message)
  }
}

async function handleUpload() {
  if (!uploadFiles.value?.length) return
  
  uploading.value = true
  const targetFolder = uploadFolder.value || currentPath.value || ''
  
  try {
    for (const file of uploadFiles.value) {
      // Generate unique path
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = targetFolder ? `${targetFolder}/${timestamp}_${safeName}` : `${timestamp}_${safeName}`
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('marketing-resources')
        .upload(storagePath, file)
      
      if (uploadError) throw uploadError
      
      // Get file type from mime type
      let fileType = 'document'
      if (file.type.startsWith('image/')) fileType = 'image'
      else if (file.type.startsWith('video/')) fileType = 'video'
      else if (file.type.includes('pdf')) fileType = 'pdf'
      else if (file.type.includes('spreadsheet') || file.type.includes('excel')) fileType = 'spreadsheet'
      
      // Create database record
      const { error: dbError } = await supabase
        .from('marketing_resources')
        .insert({
          name: file.name,
          file_url: storagePath,
          file_type: fileType,
          file_size: file.size,
          folder_path: targetFolder,
          admin_only: uploadAsAdminOnly.value
        })
      
      if (dbError) throw dbError
    }
    
    showSuccess(`${uploadFiles.value.length} file(s) uploaded successfully`)
    showUploadDialog.value = false
    uploadFiles.value = []
    uploadAsAdminOnly.value = false
    await loadFiles()
  } catch (err: any) {
    showError('Upload failed: ' + err.message)
  } finally {
    uploading.value = false
  }
}

async function createFolder() {
  if (!newFolderName.value) return
  
  try {
    const parentPath = newFolderParent.value || ''
    const folderPath = parentPath ? `${parentPath}/${newFolderName.value.toLowerCase().replace(/\s+/g, '-')}` : newFolderName.value.toLowerCase().replace(/\s+/g, '-')
    
    // Find parent folder ID if nested
    let parentId = null
    if (parentPath) {
      const parentFolder = dbFolders.value.find(f => f.path === parentPath)
      if (parentFolder) parentId = parentFolder.id
    }
    
    const { error } = await supabase
      .from('marketing_folders')
      .insert({
        name: newFolderName.value,
        parent_id: parentId,
        path: folderPath,
        admin_only: newFolderAdminOnly.value
      })
    
    if (error) throw error
    
    showSuccess(`Folder "${newFolderName.value}" created`)
    showAddFolderDialog.value = false
    newFolderName.value = ''
    newFolderParent.value = ''
    newFolderAdminOnly.value = false
    await loadFolders()
  } catch (err: any) {
    showError('Failed to create folder: ' + err.message)
  }
}
</script>

<style scoped>
.resources-page {
  max-width: 1400px;
}

.folder-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.folder-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.file-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.file-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.breadcrumb-link {
  cursor: pointer;
}

.breadcrumb-link:not([disabled]):hover {
  text-decoration: underline;
}
</style>
