<template>
  <div class="org-chart-page">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          <v-icon class="mr-2" color="primary">mdi-sitemap</v-icon>
          Organization Chart
        </h1>
        <p class="text-body-2 text-grey">
          Visualize the reporting structure of your team
        </p>
      </div>

      <!-- Controls -->
      <div class="d-flex gap-2 align-center flex-wrap">
        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          placeholder="Search employees..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="min-width: 250px"
        />
        
        <!-- View Toggle -->
        <v-btn-toggle v-model="viewMode" mandatory density="compact" variant="outlined">
          <v-btn value="tree" icon="mdi-file-tree" />
          <v-btn value="list" icon="mdi-view-list" />
        </v-btn-toggle>
        
        <!-- Expand/Collapse -->
        <v-btn-group density="compact" variant="outlined">
          <v-btn @click="expandAll" prepend-icon="mdi-arrow-expand-all">
            Expand
          </v-btn>
          <v-btn @click="collapseAll" prepend-icon="mdi-arrow-collapse-all">
            Collapse
          </v-btn>
        </v-btn-group>
        
        <!-- Zoom Controls -->
        <v-btn-group density="compact" variant="outlined">
          <v-btn icon="mdi-minus" @click="zoomOut" :disabled="zoom <= 0.3" />
          <v-btn @click="resetZoom">{{ Math.round(zoom * 100) }}%</v-btn>
          <v-btn icon="mdi-plus" @click="zoomIn" :disabled="zoom >= 1.5" />
        </v-btn-group>
      </div>
    </div>

    <!-- Stats Bar -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="d-flex align-center gap-6 py-3">
        <div class="d-flex align-center gap-2">
          <v-icon color="primary">mdi-account-group</v-icon>
          <span class="font-weight-medium">{{ totalEmployees }}</span>
          <span class="text-grey text-body-2">Employees</span>
        </div>
        <v-divider vertical class="mx-2" />
        <div class="d-flex align-center gap-2">
          <v-icon color="secondary">mdi-account-tie</v-icon>
          <span class="font-weight-medium">{{ rootNodes }}</span>
          <span class="text-grey text-body-2">Top Level</span>
        </div>
        <v-divider vertical class="mx-2" />
        <div class="d-flex align-center gap-2">
          <v-icon color="accent">mdi-layers</v-icon>
          <span class="font-weight-medium">{{ treeDepth }}</span>
          <span class="text-grey text-body-2">Levels Deep</span>
        </div>
        
        <v-spacer />
        
        <!-- Department Legend -->
        <div class="d-flex align-center gap-2 flex-wrap">
          <span class="text-caption text-grey mr-2">Departments:</span>
          <v-chip 
            v-for="dept in uniqueDepartments" 
            :key="dept"
            size="x-small"
            :color="getDepartmentColor(dept)"
            variant="tonal"
          >
            {{ dept }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="pending" class="d-flex justify-center align-center" style="min-height: 400px">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" variant="tonal" class="mb-4">
      <v-alert-title>Failed to load organization data</v-alert-title>
      <p class="text-body-2 mb-2">{{ error.message }}</p>
      <v-btn color="error" variant="flat" size="small" @click="refresh">
        <v-icon start>mdi-refresh</v-icon>
        Retry
      </v-btn>
    </v-alert>

    <!-- Empty State -->
    <v-card v-else-if="filteredTree.length === 0" variant="outlined" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-question</v-icon>
      <h3 class="text-h6 mb-2">
        {{ searchQuery ? 'No employees match your search' : 'No employees found' }}
      </h3>
      <p class="text-body-2 text-grey mb-4">
        {{ searchQuery 
          ? 'Try a different search term or clear the filter' 
          : 'Add employees to see the organization chart' 
        }}
      </p>
      <v-btn v-if="searchQuery" color="primary" variant="tonal" @click="searchQuery = ''">
        Clear Search
      </v-btn>
    </v-card>

    <!-- Tree View -->
    <v-card v-else class="org-chart-container" variant="outlined">
      <div 
        ref="chartContainer"
        class="org-chart-scroll"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }"
        @mousedown="startPan"
        @mousemove="pan"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <div class="org-chart-tree" :class="{ 'view-list': viewMode === 'list' }">
          <OrgChartNode
            v-for="rootNode in filteredTree"
            :key="rootNode.employee_id"
            :node="rootNode"
            :get-department-color="getDepartmentColor"
            :is-root="true"
            :highlighted-id="selectedEmployeeId"
            @toggle="toggleNode"
            @select="handleSelectEmployee"
          />
        </div>
      </div>
    </v-card>

    <!-- Employee Detail Dialog -->
    <v-dialog v-model="showEmployeeDialog" max-width="500">
      <v-card v-if="selectedEmployee">
        <v-card-title class="d-flex align-center gap-3 pa-4">
          <v-avatar :size="56" :color="getDepartmentColor(selectedEmployee.department_name)">
            <v-img v-if="selectedEmployee.avatar_url" :src="selectedEmployee.avatar_url" />
            <span v-else class="text-white font-weight-bold text-h6">
              {{ selectedEmployee.first_name?.[0] }}{{ selectedEmployee.last_name?.[0] }}
            </span>
          </v-avatar>
          <div>
            <div class="text-h6">{{ selectedEmployee.full_name }}</div>
            <div class="text-body-2 text-grey">{{ selectedEmployee.job_title || 'No title' }}</div>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="showEmployeeDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-4">
          <v-list density="compact" class="pa-0">
            <v-list-item v-if="selectedEmployee.department_name">
              <template #prepend>
                <v-icon :color="getDepartmentColor(selectedEmployee.department_name)">mdi-domain</v-icon>
              </template>
              <v-list-item-title>Department</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEmployee.department_name }}</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedEmployee.primary_location_name">
              <template #prepend>
                <v-icon>mdi-map-marker</v-icon>
              </template>
              <v-list-item-title>Primary Location</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEmployee.primary_location_name }}</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item v-if="selectedEmployee.assigned_locations?.length > 1">
              <template #prepend>
                <v-icon>mdi-map-marker-multiple</v-icon>
              </template>
              <v-list-item-title>All Locations</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip 
                  v-for="loc in selectedEmployee.assigned_locations" 
                  :key="loc.id"
                  size="x-small"
                  :variant="loc.is_primary ? 'flat' : 'outlined'"
                  :color="loc.is_primary ? 'primary' : undefined"
                  class="mr-1 mt-1"
                >
                  {{ loc.name }}
                  <v-icon v-if="loc.is_primary" end size="12">mdi-star</v-icon>
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item>
              <template #prepend>
                <v-icon>mdi-account-supervisor</v-icon>
              </template>
              <v-list-item-title>Direct Reports</v-list-item-title>
              <v-list-item-subtitle>{{ selectedEmployee.children?.length || 0 }} employees</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        
        <v-divider />
        
        <v-card-actions class="pa-4">
          <v-btn 
            v-if="isAdmin"
            color="primary" 
            variant="flat" 
            :to="`/roster/${selectedEmployee.employee_id}`"
          >
            <v-icon start>mdi-account-details</v-icon>
            View Full Profile
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEmployeeDialog = false">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { OrgChartNode } from '~/utils/orgChart'

definePageMeta({
  title: 'Organization Chart',
  middleware: ['auth']
})

// Auth store for admin check
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

// Composable
const {
  employees,
  filteredTree,
  pending,
  error,
  refresh,
  totalEmployees,
  treeDepth,
  rootNodes,
  searchQuery,
  toggleNode,
  expandAll,
  collapseAll,
  getDepartmentColor
} = useOrgChart()

// View state
const viewMode = ref<'tree' | 'list'>('tree')
const zoom = ref(0.65) // Start more zoomed out to see more of the chart
const selectedEmployee = ref<OrgChartNode | null>(null)
const selectedEmployeeId = ref<string | null>(null)
const showEmployeeDialog = ref(false)

// Pan state
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const chartContainer = ref<HTMLElement | null>(null)

// Unique departments for legend
const uniqueDepartments = computed(() => {
  if (!employees.value) return []
  const depts = new Set<string>()
  employees.value.forEach(emp => {
    if (emp.department_name) {
      depts.add(emp.department_name)
    }
  })
  return Array.from(depts).sort()
})

// Zoom controls
function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.1, 1.5)
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.1, 0.3)
}

function resetZoom() {
  zoom.value = 0.65 // Reset to default zoomed-out view
}

// Pan controls
function startPan(e: MouseEvent) {
  if (e.button !== 0) return // Only left click
  isPanning.value = true
  panStart.value = { x: e.clientX, y: e.clientY }
}

function pan(e: MouseEvent) {
  if (!isPanning.value || !chartContainer.value) return
  
  const dx = e.clientX - panStart.value.x
  const dy = e.clientY - panStart.value.y
  
  chartContainer.value.scrollLeft -= dx
  chartContainer.value.scrollTop -= dy
  
  panStart.value = { x: e.clientX, y: e.clientY }
}

function endPan() {
  isPanning.value = false
}

// Handle employee selection
function handleSelectEmployee(node: OrgChartNode) {
  selectedEmployee.value = node
  selectedEmployeeId.value = node.employee_id
  showEmployeeDialog.value = true
}

// Keyboard zoom
function handleKeydown(e: KeyboardEvent) {
  if (e.key === '+' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    zoomIn()
  } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    zoomOut()
  } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    resetZoom()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.org-chart-page {
  min-height: 100%;
}

.org-chart-container {
  overflow: hidden;
  position: relative;
  min-height: 500px;
  background: 
    linear-gradient(90deg, #f8f9fa 1px, transparent 1px),
    linear-gradient(#f8f9fa 1px, transparent 1px);
  background-size: 20px 20px;
}

.v-theme--dark .org-chart-container {
  background: 
    linear-gradient(90deg, #2a2a2a 1px, transparent 1px),
    linear-gradient(#2a2a2a 1px, transparent 1px);
  background-size: 20px 20px;
}

.org-chart-scroll {
  overflow: auto;
  padding: 40px;
  min-height: 500px;
  cursor: grab;
  transition: transform 0.2s ease;
}

.org-chart-scroll:active {
  cursor: grabbing;
}

.org-chart-tree {
  display: flex;
  justify-content: center;
  gap: 32px;
  min-width: min-content;
}

/* List View Mode */
.org-chart-tree.view-list {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.org-chart-tree.view-list :deep(.org-node) {
  padding-left: calc(var(--level, 0) * 32px);
}

.org-chart-tree.view-list :deep(.org-children) {
  flex-direction: column;
  gap: 8px;
  padding-left: 0;
}

.org-chart-tree.view-list :deep(.org-connector) {
  display: none;
}

.org-chart-tree.view-list :deep(.org-children::before) {
  display: none;
}

.org-chart-tree.view-list :deep(.org-children > .org-node::before) {
  display: none;
}

/* Responsive */
@media (max-width: 960px) {
  .org-chart-scroll {
    padding: 20px;
  }
  
  .org-chart-tree {
    flex-direction: column;
    align-items: center;
  }
}
</style>
