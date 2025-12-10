<template>
  <div class="org-node" :class="{ 'is-root': isRoot, 'has-children': node.children.length > 0 }">
    <!-- Employee Card -->
    <div 
      class="org-card"
      :class="{ 
        'is-expanded': node.isExpanded,
        'is-highlighted': isHighlighted 
      }"
      :style="{ '--dept-color': getDepartmentColor(node.department_name) }"
      @click="handleCardClick"
    >
      <!-- Avatar -->
      <div class="org-card-avatar">
        <v-avatar 
          :size="isRoot ? 56 : 48" 
          :color="getDepartmentColor(node.department_name)"
        >
          <v-img v-if="node.avatar_url" :src="node.avatar_url" :alt="node.full_name" />
          <span v-else class="text-white font-weight-bold">{{ initials }}</span>
        </v-avatar>
      </div>

      <!-- Info -->
      <div class="org-card-info">
        <div class="org-card-name">{{ node.full_name }}</div>
        <div v-if="node.job_title" class="org-card-title">{{ node.job_title }}</div>
        
        <!-- Department Badge -->
        <v-chip 
          v-if="node.department_name" 
          size="x-small" 
          :color="getDepartmentColor(node.department_name)"
          variant="tonal"
          class="mt-1"
        >
          {{ node.department_name }}
        </v-chip>
        
        <!-- Locations -->
        <div v-if="hasLocations" class="org-card-locations mt-1">
          <v-icon size="12" class="mr-1">mdi-map-marker</v-icon>
          <span class="text-caption">{{ locationText }}</span>
        </div>
      </div>

      <!-- Expand/Collapse Button -->
      <v-btn
        v-if="node.children.length > 0"
        :icon="node.isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        size="x-small"
        variant="text"
        density="compact"
        class="org-card-toggle"
        @click.stop="$emit('toggle', node.employee_id)"
      />
      
      <!-- Direct Reports Count Badge -->
      <v-badge
        v-if="node.children.length > 0"
        :content="node.children.length"
        color="primary"
        class="org-card-badge"
        inline
      />
    </div>

    <!-- Connector Line -->
    <div v-if="node.children.length > 0 && node.isExpanded" class="org-connector">
      <div class="connector-line vertical"></div>
      <div class="connector-line horizontal"></div>
    </div>

    <!-- Children -->
    <Transition name="expand">
      <div v-if="node.children.length > 0 && node.isExpanded" class="org-children">
        <OrgChartNode
          v-for="child in node.children"
          :key="child.employee_id"
          :node="child"
          :get-department-color="getDepartmentColor"
          :highlighted-id="highlightedId"
          @toggle="$emit('toggle', $event)"
          @select="$emit('select', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { OrgChartNode } from '~/utils/orgChart'

interface Props {
  node: OrgChartNode
  getDepartmentColor: (dept: string | null) => string
  isRoot?: boolean
  highlightedId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isRoot: false,
  highlightedId: null
})

const emit = defineEmits<{
  toggle: [employeeId: string]
  select: [node: OrgChartNode]
}>()

// Computed
const initials = computed(() => {
  const first = props.node.first_name?.[0] || ''
  const last = props.node.last_name?.[0] || ''
  return (first + last).toUpperCase()
})

const hasLocations = computed(() => {
  return props.node.primary_location_name || 
    (props.node.assigned_locations && props.node.assigned_locations.length > 0)
})

const locationText = computed(() => {
  if (props.node.assigned_locations && props.node.assigned_locations.length > 1) {
    const names = props.node.assigned_locations.map(l => l.name)
    return names.join(' • ')
  }
  return props.node.primary_location_name || ''
})

const isHighlighted = computed(() => {
  return props.highlightedId === props.node.employee_id
})

// Methods
function handleCardClick() {
  emit('select', props.node)
}
</script>

<style scoped>
.org-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 0 8px;
}

.org-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  border-left: 4px solid var(--dept-color, #607D8B);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 220px;
  max-width: 280px;
  position: relative;
}

.org-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.org-card.is-highlighted {
  border-color: var(--dept-color, #607D8B);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.is-root .org-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-left-width: 6px;
  min-width: 260px;
}

.v-theme--dark .org-card {
  background: #1e1e1e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.v-theme--dark .is-root .org-card {
  background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);
}

.org-card-avatar {
  flex-shrink: 0;
}

.org-card-info {
  flex: 1;
  min-width: 0;
}

.org-card-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: #212121;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-theme--dark .org-card-name {
  color: #ffffff;
}

.is-root .org-card-name {
  font-size: 1.1rem;
}

.org-card-title {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.v-theme--dark .org-card-title {
  color: #aaa;
}

.org-card-locations {
  display: flex;
  align-items: center;
  color: #888;
  font-size: 0.75rem;
}

.org-card-toggle {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: white !important;
  border: 1px solid #e0e0e0 !important;
  z-index: 2;
}

.v-theme--dark .org-card-toggle {
  background: #2d2d2d !important;
  border-color: #444 !important;
}

.org-card-badge {
  position: absolute;
  top: -8px;
  right: -8px;
}

/* Connector Lines */
.org-connector {
  position: relative;
  height: 24px;
  width: 100%;
}

.connector-line {
  background: #e0e0e0;
}

.v-theme--dark .connector-line {
  background: #444;
}

.connector-line.vertical {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  transform: translateX(-50%);
}

.connector-line.horizontal {
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 2px;
}

/* Children Container */
.org-children {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  padding-top: 8px;
  position: relative;
}

.org-children::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 8px;
  background: #e0e0e0;
  transform: translateX(-50%);
}

.v-theme--dark .org-children::before {
  background: #444;
}

/* Each child gets a connector from the horizontal line */
.org-children > .org-node::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  width: 2px;
  height: 8px;
  background: #e0e0e0;
  transform: translateX(-50%);
}

.v-theme--dark .org-children > .org-node::before {
  background: #444;
}

/* Expand/Collapse Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 960px) {
  .org-children {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .org-card {
    min-width: 200px;
    max-width: 260px;
  }
  
  .connector-line.horizontal {
    display: none;
  }
}
</style>
