<template>
  <div class="resources-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">Resources</h1>
        <p class="text-body-1 text-grey-darken-1">
          {{ isAdmin ? 'Manage marketing assets, vendor contacts, and resource library' : 'Download marketing assets and find vendor contacts' }}
        </p>
      </div>
      <div v-if="isAdmin" class="d-flex gap-2">
        <v-btn variant="outlined" prepend-icon="mdi-folder-plus" @click="showAddFolderDialog = true">
          New Folder
        </v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-upload" @click="showUploadDialog = true">
          Upload
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showAddResourceDialog = true">
          Add Vendor
        </v-btn>
      </div>
    </div>

    <!-- Tab Navigation -->
    <v-tabs v-model="activeTab" class="mb-6" color="primary">
      <v-tab value="library">
        <v-icon start>mdi-folder-multiple</v-icon>
        File Library
      </v-tab>
      <v-tab value="vendors">
        <v-icon start>mdi-account-tie</v-icon>
        Vendor Directory
      </v-tab>
    </v-tabs>

    <!-- File Library Tab -->
    <v-window v-model="activeTab">
      <v-window-item value="library">
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

        <!-- Category Folders (Top Level) -->
        <div v-if="currentPath === ''" class="mb-6">
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
      </v-window-item>

      <!-- Vendor Directory Tab -->
      <v-window-item value="vendors">
        <!-- Filters & Search -->
        <v-card rounded="lg" class="mb-6">
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="vendorSearch"
                  placeholder="Search vendors..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="vendorCategoryFilter"
                  :items="vendorCategories"
                  label="Category"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="vendorStatusFilter"
                  :items="['All', 'Active', 'Inactive', 'Preferred']"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="2" class="text-right">
                <v-btn-toggle v-model="vendorViewMode" mandatory variant="outlined">
                  <v-btn icon="mdi-view-grid" value="grid" />
                  <v-btn icon="mdi-view-list" value="list" />
                </v-btn-toggle>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Vendor Category Quick Filters -->
        <div class="d-flex flex-wrap gap-2 mb-6">
          <v-chip
            v-for="cat in vendorCategoryChips"
            :key="cat.value"
            :color="vendorCategoryFilter === cat.value ? 'primary' : 'grey'"
            :variant="vendorCategoryFilter === cat.value ? 'flat' : 'outlined'"
            :prepend-icon="cat.icon"
            size="small"
            @click="vendorCategoryFilter = vendorCategoryFilter === cat.value ? '' : cat.value"
          >
            {{ cat.label }} ({{ getVendorCategoryCount(cat.value) }})
          </v-chip>
        </div>

        <!-- Vendor Grid View -->
        <v-row v-if="vendorViewMode === 'grid'">
          <v-col v-for="vendor in filteredVendors" :key="vendor.id" cols="12" sm="6" md="4" lg="3">
            <v-card rounded="lg" class="vendor-card h-100" @click="viewVendor(vendor)">
              <div class="vendor-header" :style="{ backgroundColor: getVendorCategoryColor(vendor.category) }">
                <v-avatar size="48" color="white">
                  <v-icon :color="getVendorCategoryColor(vendor.category)">{{ getVendorCategoryIcon(vendor.category) }}</v-icon>
                </v-avatar>
                <v-chip
                  v-if="vendor.preferred"
                  color="warning"
                  size="x-small"
                  class="preferred-badge"
                >
                  <v-icon size="12">mdi-star</v-icon>
                </v-chip>
              </div>
              
              <v-card-text>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ vendor.name }}</h3>
                <v-chip size="x-small" variant="outlined" class="mb-2">{{ vendor.category }}</v-chip>
                <p class="text-body-2 text-grey-darken-1 mb-3 description-text">
                  {{ vendor.description }}
                </p>
                <div class="d-flex align-center gap-1 flex-wrap">
                  <v-chip v-for="tag in vendor.tags?.slice(0, 2)" :key="tag" size="x-small" variant="tonal">
                    {{ tag }}
                  </v-chip>
                  <v-chip v-if="vendor.tags?.length > 2" size="x-small" variant="text">
                    +{{ vendor.tags.length - 2 }}
                  </v-chip>
                </div>
              </v-card-text>
              
              <v-divider />
              
              <v-card-actions>
                <v-btn size="small" variant="text" :href="`mailto:${vendor.email}`" @click.stop>
                  <v-icon>mdi-email</v-icon>
                </v-btn>
                <v-btn size="small" variant="text" :href="`tel:${vendor.phone}`" @click.stop>
                  <v-icon>mdi-phone</v-icon>
                </v-btn>
                <v-btn v-if="vendor.website" size="small" variant="text" :href="vendor.website" target="_blank" @click.stop>
                  <v-icon>mdi-open-in-new</v-icon>
                </v-btn>
                <v-spacer />
                <v-btn v-if="isAdmin" size="small" variant="text" icon="mdi-pencil" @click.stop="editVendor(vendor)" />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Vendor List View -->
        <v-card v-else rounded="lg">
          <v-data-table
            :headers="vendorTableHeaders"
            :items="filteredVendors"
            :search="vendorSearch"
            hover
          >
            <template #item.name="{ item }">
              <div class="d-flex align-center py-2">
                <v-avatar size="36" :color="getVendorCategoryColor(item.category)" class="mr-3">
                  <v-icon color="white" size="small">{{ getVendorCategoryIcon(item.category) }}</v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-medium">{{ item.name }}</div>
                  <div class="text-caption text-grey">{{ item.description?.substring(0, 50) }}...</div>
                </div>
                <v-icon v-if="item.preferred" color="warning" size="small" class="ml-2">mdi-star</v-icon>
              </div>
            </template>
            
            <template #item.category="{ item }">
              <v-chip size="small" variant="outlined">{{ item.category }}</v-chip>
            </template>
            
            <template #item.contact="{ item }">
              <div class="text-body-2">{{ item.contact_name }}</div>
              <div class="text-caption text-grey">{{ item.email }}</div>
            </template>
            
            <template #item.status="{ item }">
              <v-chip :color="item.active ? 'success' : 'grey'" size="small" variant="flat">
                {{ item.active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            
            <template #item.actions="{ item }">
              <v-btn icon="mdi-eye" size="small" variant="text" @click="viewVendor(item)" />
              <v-btn v-if="isAdmin" icon="mdi-pencil" size="small" variant="text" @click="editVendor(item)" />
              <v-btn v-if="isAdmin" icon="mdi-delete" size="small" variant="text" color="error" @click="deleteVendor(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Add/Edit Vendor Dialog -->
    <v-dialog v-model="showAddResourceDialog" max-width="700">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-tie</v-icon>
          {{ editMode ? 'Edit Vendor' : 'Add Vendor' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="vendorForm.name"
                label="Vendor Name *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="vendorForm.category"
                :items="vendorCategories"
                label="Category *"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="vendorForm.description"
                label="Description"
                variant="outlined"
                rows="2"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="vendorForm.contact_name"
                label="Contact Name"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="vendorForm.email"
                label="Email"
                type="email"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="vendorForm.phone"
                label="Phone"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="vendorForm.website"
                label="Website"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="vendorForm.address"
                label="Address"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-combobox
                v-model="vendorForm.tags"
                :items="vendorTags"
                label="Tags"
                variant="outlined"
                density="compact"
                multiple
                chips
                closable-chips
              />
            </v-col>
            <v-col cols="12" md="6">
              <div class="d-flex gap-4">
                <v-switch v-model="vendorForm.active" label="Active" color="success" hide-details density="compact" />
                <v-switch v-model="vendorForm.preferred" label="Preferred" color="warning" hide-details density="compact" />
              </div>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="vendorForm.notes"
                label="Internal Notes (Admin Only)"
                variant="outlined"
                rows="2"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeVendorDialog">Cancel</v-btn>
          <v-btn color="primary" @click="saveVendor">{{ editMode ? 'Update' : 'Add' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- View Vendor Dialog -->
    <v-dialog v-model="showViewVendorDialog" max-width="600">
      <v-card v-if="selectedVendor">
        <div class="pa-6 text-center" :style="{ backgroundColor: getVendorCategoryColor(selectedVendor.category) + '22' }">
          <v-avatar size="80" :color="getVendorCategoryColor(selectedVendor.category)">
            <v-icon size="40" color="white">{{ getVendorCategoryIcon(selectedVendor.category) }}</v-icon>
          </v-avatar>
          <h2 class="text-h5 font-weight-bold mt-4">{{ selectedVendor.name }}</h2>
          <v-chip size="small" variant="outlined" class="mt-2">{{ selectedVendor.category }}</v-chip>
          <v-chip v-if="selectedVendor.preferred" size="small" color="warning" class="ml-2">
            <v-icon size="14" start>mdi-star</v-icon> Preferred
          </v-chip>
        </div>
        
        <v-card-text>
          <p class="text-body-1 mb-4">{{ selectedVendor.description }}</p>
          
          <v-list density="compact">
            <v-list-item v-if="selectedVendor.contact_name" prepend-icon="mdi-account">
              <v-list-item-title>{{ selectedVendor.contact_name }}</v-list-item-title>
              <v-list-item-subtitle>Contact Person</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedVendor.email" prepend-icon="mdi-email">
              <v-list-item-title>
                <a :href="`mailto:${selectedVendor.email}`">{{ selectedVendor.email }}</a>
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedVendor.phone" prepend-icon="mdi-phone">
              <v-list-item-title>
                <a :href="`tel:${selectedVendor.phone}`">{{ selectedVendor.phone }}</a>
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedVendor.website" prepend-icon="mdi-web">
              <v-list-item-title>
                <a :href="selectedVendor.website" target="_blank">{{ selectedVendor.website }}</a>
              </v-list-item-title>
            </v-list-item>
            <v-list-item v-if="selectedVendor.address" prepend-icon="mdi-map-marker">
              <v-list-item-title>{{ selectedVendor.address }}</v-list-item-title>
            </v-list-item>
          </v-list>
          
          <div v-if="selectedVendor.tags?.length" class="mt-4">
            <div class="text-caption text-grey mb-2">Tags</div>
            <div class="d-flex flex-wrap gap-1">
              <v-chip v-for="tag in selectedVendor.tags" :key="tag" size="small" variant="tonal">
                {{ tag }}
              </v-chip>
            </div>
          </div>
          
          <div v-if="isAdmin && selectedVendor.notes" class="mt-4">
            <div class="text-caption text-grey mb-1">Internal Notes</div>
            <v-alert type="info" variant="tonal" density="compact">
              {{ selectedVendor.notes }}
            </v-alert>
          </div>
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-btn variant="text" @click="showViewVendorDialog = false">Close</v-btn>
          <v-spacer />
          <v-btn v-if="isAdmin" color="primary" @click="editVendor(selectedVendor); showViewVendorDialog = false">
            <v-icon start>mdi-pencil</v-icon>
            Edit Vendor
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
  middleware: ['auth']
})

const { isAdmin } = useAppData()
const supabase = useSupabaseClient()
const { showSuccess, showError } = useToast()

useHead({
  title: 'Resources'
})

// ============================================
// STATE
// ============================================
const activeTab = ref('library')
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

// Vendor state
const vendorSearch = ref('')
const vendorCategoryFilter = ref('')
const vendorStatusFilter = ref('All')
const vendorViewMode = ref('grid')
const showAddResourceDialog = ref(false)
const showViewVendorDialog = ref(false)
const editMode = ref(false)
const selectedVendor = ref<any>(null)

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
    let query = supabase
      .from('marketing_resources')
      .select('*')
      .order('name')
    
    if (!showArchived.value) {
      query = query.eq('is_archived', false)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    dbFiles.value = data || []
  } catch (err: any) {
    console.error('Error loading files:', err)
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
// VENDOR DIRECTORY DATA
// ============================================
const vendorCategories = [
  'Event Venue',
  'Catering',
  'Entertainment',
  'Photography',
  'Videography',
  'Graphic Design',
  'Printing Services',
  'Marketing Agency',
  'PR Agency',
  'Web Development',
  'Promotional Products',
  'Rescue Partner',
  'Pet Business',
  'Other'
]

const vendorCategoryChips = [
  { label: 'Venues', value: 'Event Venue', icon: 'mdi-map-marker' },
  { label: 'Photo', value: 'Photography', icon: 'mdi-camera' },
  { label: 'Video', value: 'Videography', icon: 'mdi-video' },
  { label: 'Design', value: 'Graphic Design', icon: 'mdi-palette' },
  { label: 'Print', value: 'Printing Services', icon: 'mdi-printer' },
  { label: 'Rescues', value: 'Rescue Partner', icon: 'mdi-heart' }
]

const vendorTags = [
  'Local', 'National', 'Premium', 'Budget-Friendly', 'Fast Turnaround',
  'Pet Specialty', 'Veterinary Focus', 'Digital', 'Print', 'Video Production',
  'Social Media', 'SEO', 'PPC', 'Content Creation', 'Long-term Partner'
]

const vendors = ref([
  {
    id: '1',
    name: 'PetLens Photography',
    category: 'Photography',
    description: 'Specialized in pet and veterinary clinic photography. Excellent at capturing natural moments with animals.',
    contact_name: 'Jennifer Adams',
    email: 'hello@petlens.com',
    phone: '555-0201',
    website: 'https://petlens.com',
    address: '456 Photo Lane, Animal City',
    tags: ['Pet Specialty', 'Local', 'Premium'],
    active: true,
    preferred: true,
    notes: 'Great for social media content and website updates. Contract renewed through 2025.'
  },
  {
    id: '2',
    name: 'Vet Marketing Pro',
    category: 'Marketing Agency',
    description: 'Full-service marketing agency specializing in veterinary practices. Digital and traditional marketing services.',
    contact_name: 'David Miller',
    email: 'david@vetmarketingpro.com',
    phone: '555-0202',
    website: 'https://vetmarketingpro.com',
    address: '789 Marketing Blvd',
    tags: ['Veterinary Focus', 'Digital', 'SEO', 'PPC'],
    active: true,
    preferred: true,
    notes: 'Running our Google Ads campaigns. Monthly retainer $2,500.'
  },
  {
    id: '3',
    name: 'Creative Paws Design',
    category: 'Graphic Design',
    description: 'Boutique design studio focusing on pet industry branding and marketing materials.',
    contact_name: 'Sarah Chen',
    email: 'sarah@creativepaws.design',
    phone: '555-0203',
    website: 'https://creativepaws.design',
    address: '',
    tags: ['Pet Specialty', 'Premium', 'Content Creation'],
    active: true,
    preferred: false,
    notes: ''
  },
  {
    id: '4',
    name: 'Quick Print Solutions',
    category: 'Printing Services',
    description: 'Local printing company with fast turnaround. Business cards, brochures, and large format printing.',
    contact_name: 'Tom Roberts',
    email: 'orders@quickprint.com',
    phone: '555-0204',
    website: 'https://quickprint.com',
    address: '321 Print Ave',
    tags: ['Local', 'Fast Turnaround', 'Budget-Friendly'],
    active: true,
    preferred: false,
    notes: 'Use for standard print jobs. 10% discount on orders over $500.'
  },
  {
    id: '5',
    name: 'Animal Tales Video',
    category: 'Videography',
    description: 'Video production company specializing in pet-related content. Testimonials, commercials, and educational videos.',
    contact_name: 'Mike Johnson',
    email: 'mike@animaltalesvideo.com',
    phone: '555-0205',
    website: 'https://animaltalesvideo.com',
    address: '555 Film Street',
    tags: ['Pet Specialty', 'Video Production', 'Premium'],
    active: true,
    preferred: true,
    notes: 'Created our clinic tour video. Day rate is $1,500.'
  },
  {
    id: '6',
    name: 'Paws & Claws Rescue',
    category: 'Rescue Partner',
    description: 'Local animal rescue organization. Partner for adoption events and community outreach.',
    contact_name: 'Lisa Thompson',
    email: 'lisa@pawsclawsrescue.org',
    phone: '555-0210',
    website: 'https://pawsclawsrescue.org',
    address: '100 Rescue Lane',
    tags: ['Local', 'Long-term Partner', 'Pet Specialty'],
    active: true,
    preferred: true,
    notes: 'Monthly adoption events at Sherman Oaks location.'
  },
  {
    id: '7',
    name: 'The Barking Lot Venue',
    category: 'Event Venue',
    description: 'Pet-friendly outdoor event space. Perfect for community events and fundraisers.',
    contact_name: 'James Wilson',
    email: 'events@barkinglot.com',
    phone: '555-0215',
    website: 'https://barkinglot.com',
    address: '888 Event Plaza',
    tags: ['Pet Specialty', 'Local', 'Premium'],
    active: true,
    preferred: false,
    notes: 'Used for 2024 Summer Bash. Capacity 200 guests.'
  }
])

const vendorForm = reactive({
  id: '',
  name: '',
  category: '',
  description: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  tags: [] as string[],
  active: true,
  preferred: false,
  notes: ''
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

const vendorTableHeaders = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Contact', key: 'contact' },
  { title: 'Phone', key: 'phone' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false }
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

const filteredVendors = computed(() => {
  let result = vendors.value
  
  if (vendorCategoryFilter.value) {
    result = result.filter(v => v.category === vendorCategoryFilter.value)
  }
  
  if (vendorStatusFilter.value !== 'All') {
    if (vendorStatusFilter.value === 'Active') {
      result = result.filter(v => v.active)
    } else if (vendorStatusFilter.value === 'Inactive') {
      result = result.filter(v => !v.active)
    } else if (vendorStatusFilter.value === 'Preferred') {
      result = result.filter(v => v.preferred)
    }
  }
  
  if (vendorSearch.value) {
    const query = vendorSearch.value.toLowerCase()
    result = result.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.category.toLowerCase().includes(query) ||
      v.tags?.some(t => t.toLowerCase().includes(query))
    )
  }
  
  return result
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
  showAddFolderDialog.value = false
  newFolderName.value = ''
}

function getVendorCategoryCount(category: string) {
  return vendors.value.filter(v => v.category === category).length
}

function getVendorCategoryColor(category: string) {
  const colors: Record<string, string> = {
    'Event Venue': '#F44336',
    'Catering': '#E91E63',
    'Entertainment': '#9C27B0',
    'Photography': '#673AB7',
    'Videography': '#3F51B5',
    'Graphic Design': '#2196F3',
    'Printing Services': '#00BCD4',
    'Marketing Agency': '#009688',
    'PR Agency': '#4CAF50',
    'Web Development': '#8BC34A',
    'Promotional Products': '#CDDC39',
    'Rescue Partner': '#FF5722',
    'Pet Business': '#795548',
    'Other': '#9E9E9E'
  }
  return colors[category] || '#9E9E9E'
}

function getVendorCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    'Event Venue': 'mdi-map-marker',
    'Catering': 'mdi-food',
    'Entertainment': 'mdi-music',
    'Photography': 'mdi-camera',
    'Videography': 'mdi-video',
    'Graphic Design': 'mdi-palette',
    'Printing Services': 'mdi-printer',
    'Marketing Agency': 'mdi-bullhorn',
    'PR Agency': 'mdi-newspaper',
    'Web Development': 'mdi-web',
    'Promotional Products': 'mdi-gift',
    'Rescue Partner': 'mdi-heart',
    'Pet Business': 'mdi-paw',
    'Other': 'mdi-dots-horizontal'
  }
  return icons[category] || 'mdi-dots-horizontal'
}

function viewVendor(vendor: any) {
  selectedVendor.value = vendor
  showViewVendorDialog.value = true
}

function editVendor(vendor: any) {
  Object.assign(vendorForm, vendor)
  editMode.value = true
  showAddResourceDialog.value = true
}

function deleteVendor(vendor: any) {
  vendors.value = vendors.value.filter(v => v.id !== vendor.id)
  snackbar.message = 'Vendor deleted'
  snackbar.color = 'info'
  snackbar.show = true
}

function closeVendorDialog() {
  showAddResourceDialog.value = false
  editMode.value = false
  resetVendorForm()
}

function resetVendorForm() {
  Object.assign(vendorForm, {
    id: '',
    name: '',
    category: '',
    description: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    tags: [],
    active: true,
    preferred: false,
    notes: ''
  })
}

function saveVendor() {
  if (!vendorForm.name || !vendorForm.category) {
    snackbar.message = 'Please fill in required fields'
    snackbar.color = 'warning'
    snackbar.show = true
    return
  }
  
  if (editMode.value) {
    const index = vendors.value.findIndex(v => v.id === vendorForm.id)
    if (index !== -1) {
      vendors.value[index] = { ...vendorForm }
    }
    snackbar.message = 'Vendor updated'
  } else {
    vendors.value.push({
      ...vendorForm,
      id: Date.now().toString()
    })
    snackbar.message = 'Vendor added'
  }
  
  snackbar.color = 'success'
  snackbar.show = true
  closeVendorDialog()
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

.vendor-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.vendor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.vendor-header {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.preferred-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.description-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.breadcrumb-link {
  cursor: pointer;
}

.breadcrumb-link:not([disabled]):hover {
  text-decoration: underline;
}
</style>
