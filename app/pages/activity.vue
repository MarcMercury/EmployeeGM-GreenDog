<template>
  <div class="activity-hub pa-4 pa-md-6">
    <!-- Hero Header with Personal Stats -->
    <div class="hero-header mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-4">
        <div>
          <p class="text-body-2 text-grey-darken-1">{{ greeting }}, <span class="font-weight-medium">{{ firstName }}</span>! 👋</p>
          <h1 class="text-h4 font-weight-bold mb-1 d-flex align-center gap-2">
            <span class="hero-icon">🔔</span>
            Activity Hub
          </h1>
          <p class="text-body-2 text-grey-darken-1">{{ currentDate }}</p>
        </div>
        <div class="d-flex gap-2 align-center">
          <!-- View Toggle for Admins -->
          <v-btn-toggle
            v-if="isAdmin"
            v-model="viewMode"
            mandatory
            density="compact"
            variant="outlined"
            divided
          >
            <v-btn value="personal" size="small">
              <v-icon start size="16">mdi-account</v-icon>
              Personal
            </v-btn>
            <v-btn value="company" size="small">
              <v-icon start size="16">mdi-domain</v-icon>
              Company
            </v-btn>
          </v-btn-toggle>
          
          <v-btn 
            color="primary"
            :to="viewMode === 'personal' ? '/profile' : '/roster'"
            size="small"
          >
            <v-icon start size="16">{{ viewMode === 'personal' ? 'mdi-account' : 'mdi-account-group' }}</v-icon>
            {{ viewMode === 'personal' ? 'My Profile' : 'View Team' }}
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Compact Personal Stats Row -->
    <v-row class="mb-6" dense>
      <v-col cols="6" sm="3">
        <v-card 
          class="stat-tile" 
          rounded="xl" 
          :to="'/my-schedule'"
          hover
        >
          <v-card-text class="d-flex align-center gap-3 pa-3">
            <div class="stat-icon-small bg-green">
              <v-icon color="white" size="20">mdi-calendar-clock</v-icon>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">{{ personalStats.upcomingShifts }}</div>
              <div class="text-caption text-grey">Shifts This Week</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card 
          class="stat-tile" 
          rounded="xl" 
          :to="'/people/my-skills'"
          hover
        >
          <v-card-text class="d-flex align-center gap-3 pa-3">
            <div class="stat-icon-small bg-amber">
              <v-icon color="white" size="20">mdi-star</v-icon>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">{{ personalStats.skillCount }}</div>
              <div class="text-caption text-grey">My Skills</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card 
          class="stat-tile" 
          rounded="xl" 
          :to="'/development'"
          hover
        >
          <v-card-text class="d-flex align-center gap-3 pa-3">
            <div class="stat-icon-small bg-pink">
              <v-icon color="white" size="20">mdi-target</v-icon>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">{{ personalStats.activeGoals }}</div>
              <div class="text-caption text-grey">Active Goals</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card 
          class="stat-tile" 
          rounded="xl" 
          :to="'/academy/my-training'"
          hover
        >
          <v-card-text class="d-flex align-center gap-3 pa-3">
            <div class="stat-icon-small bg-purple">
              <v-icon color="white" size="20">mdi-school</v-icon>
            </div>
            <div>
              <div class="text-h5 font-weight-bold">{{ personalStats.trainingInProgress }}</div>
              <div class="text-caption text-grey">Courses In Progress</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Activity Stats Summary -->
    <v-row class="mb-6" dense>
      <v-col cols="6" sm="4" md="2">
        <v-card 
          class="stat-card" 
          :class="{ 'stat-card--active': !selectedCategories.length && !showClosed && !showPriorityOnly }"
          @click="clearFilters"
          rounded="xl"
        >
          <v-card-text class="text-center py-3">
            <div class="stat-emoji mb-1">📬</div>
            <div class="text-h5 font-weight-bold text-primary">{{ totalCount }}</div>
            <div class="text-caption text-grey">Open</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card 
          class="stat-card"
          :class="{ 'stat-card--active': showPriorityOnly && !showClosed }"
          @click="togglePriorityFilter"
          rounded="xl"
        >
          <v-card-text class="text-center py-3">
            <div class="stat-emoji mb-1">🔥</div>
            <div class="text-h5 font-weight-bold text-error">{{ priorityCount }}</div>
            <div class="text-caption text-grey">Action Required</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="stat-card" rounded="xl">
          <v-card-text class="text-center py-3">
            <div class="stat-emoji mb-1">📅</div>
            <div class="text-h5 font-weight-bold text-info">{{ todayCount }}</div>
            <div class="text-caption text-grey">Today</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="stat-card" rounded="xl">
          <v-card-text class="text-center py-3">
            <div class="stat-emoji mb-1">📆</div>
            <div class="text-h5 font-weight-bold text-success">{{ thisWeekCount }}</div>
            <div class="text-caption text-grey">This Week</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card 
          class="stat-card"
          :class="{ 'stat-card--active': showClosed }"
          @click="showClosed = !showClosed; showPriorityOnly = false"
          rounded="xl"
        >
          <v-card-text class="text-center py-3">
            <div class="stat-emoji mb-1">📦</div>
            <div class="text-h5 font-weight-bold text-grey">{{ closedCount }}</div>
            <div class="text-caption text-grey">Closed</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" sm="4" md="2">
        <v-card class="stat-card d-flex align-center justify-center" rounded="xl">
          <v-card-text class="text-center py-3">
            <v-btn 
              v-if="unreadCount > 0 && !showClosed"
              variant="tonal" 
              size="small"
              color="primary"
              @click.stop="markAllAsRead"
              :loading="markingAllRead"
              block
            >
              <v-icon start size="14">mdi-check-all</v-icon>
              Mark Read
            </v-btn>
            <v-btn 
              v-else
              variant="text" 
              icon="mdi-refresh"
              :loading="loadingNotifications"
              @click.stop="loadNotifications"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filters Panel -->
    <v-card rounded="xl" class="mb-6 filters-card">
      <v-card-text class="py-3">
        <div class="d-flex align-center gap-4 flex-wrap">
          <span class="text-caption font-weight-bold text-grey-darken-1">
            {{ showClosed ? 'CLOSED NOTIFICATIONS' : 'FILTER BY:' }}
          </span>
          
          <v-chip-group
            v-model="selectedCategories"
            multiple
            class="flex-grow-1"
          >
            <v-chip
              v-for="cat in categories"
              :key="cat.value"
              :value="cat.value"
              :prepend-icon="cat.icon"
              filter
              variant="outlined"
              size="small"
              :color="selectedCategories.includes(cat.value) ? cat.color : undefined"
            >
              {{ cat.label }}
              <span v-if="getCategoryCount(cat.value) > 0" class="ml-1 opacity-70">
                ({{ getCategoryCount(cat.value) }})
              </span>
            </v-chip>
          </v-chip-group>

          <v-btn
            v-if="selectedCategories.length > 0 || showPriorityOnly || showClosed"
            variant="text"
            size="small"
            color="grey"
            @click="clearFilters"
          >
            Clear Filters
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Loading State -->
    <div v-if="loadingNotifications && notifications.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-grey mt-4">Loading your activity feed...</p>
    </div>

    <!-- Empty State -->
    <v-card v-else-if="filteredNotifications.length === 0" rounded="xl" class="text-center py-12">
      <div class="empty-state">
        <div class="empty-icon mb-4">{{ showClosed ? '📦' : '🎉' }}</div>
        <h3 class="text-h5 font-weight-bold mb-2">
          {{ showClosed ? 'No Closed Notifications' : 'All Caught Up!' }}
        </h3>
        <p class="text-grey">
          {{ showClosed 
            ? 'Notifications you close will appear here for reference.'
            : (selectedCategories.length > 0 || showPriorityOnly 
              ? 'No notifications match your current filters.' 
              : 'No new notifications. Check back later!') 
          }}
        </p>
        <v-btn 
          v-if="selectedCategories.length > 0 || showPriorityOnly || showClosed" 
          variant="text" 
          color="primary"
          @click="clearFilters"
          class="mt-4"
        >
          {{ showClosed ? 'View Open Notifications' : 'Clear Filters' }}
        </v-btn>
      </div>
    </v-card>

    <!-- Notifications Grid -->
    <v-row v-else>
      <v-col
        v-for="notification in filteredNotifications"
        :key="notification.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card
          class="notification-card h-100"
          :class="{
            'notification-card--unread': !notification.is_read && !notification.closed_at,
            'notification-card--priority': notification.requires_action && !notification.closed_at,
            'notification-card--closed': notification.closed_at
          }"
          rounded="xl"
          @click="openNotification(notification)"
        >
          <!-- Priority Badge -->
          <div v-if="notification.requires_action && !notification.closed_at" class="priority-badge">
            <v-icon size="14" color="white">mdi-alert</v-icon>
            Action Required
          </div>

          <v-card-text class="pa-4">
            <!-- Header -->
            <div class="d-flex align-center gap-3 mb-3">
              <div 
                class="notification-icon"
                :style="{ background: getCategoryColor(notification.category) }"
              >
                {{ getCategoryEmoji(notification.category) }}
              </div>
              <div class="flex-grow-1">
                <div class="d-flex align-center gap-2">
                  <span class="text-caption text-grey">{{ getCategoryLabel(notification.category) }}</span>
                  <v-chip v-if="!notification.is_read && !notification.closed_at" color="primary" size="x-small" label>New</v-chip>
                </div>
                <div class="text-caption text-grey-darken-1">
                  {{ formatTimeAgo(notification.created_at) }}
                </div>
              </div>
            </div>

            <!-- Title -->
            <h3 class="text-subtitle-1 font-weight-bold mb-2 notification-title">
              {{ notification.title }}
            </h3>

            <!-- Body -->
            <p class="text-body-2 text-grey-darken-1 notification-body mb-3">
              {{ notification.body }}
            </p>

            <!-- Action Button -->
            <div v-if="notification.action_url && !showClosed" class="mt-auto mb-2">
              <v-btn
                :to="notification.action_url"
                variant="tonal"
                size="small"
                :color="notification.requires_action ? 'error' : 'primary'"
                block
              >
                {{ notification.action_label || 'View Details' }}
                <v-icon end size="16">mdi-arrow-right</v-icon>
              </v-btn>
            </div>

            <!-- Close/Reopen Button -->
            <div class="mt-auto">
              <v-btn
                v-if="!showClosed"
                variant="text"
                size="small"
                color="grey"
                block
                @click.stop="closeNotification(notification)"
              >
                <v-icon start size="16">mdi-archive-arrow-down</v-icon>
                Close
              </v-btn>
              <v-btn
                v-else
                variant="text"
                size="small"
                color="primary"
                block
                @click.stop="reopenNotification(notification)"
              >
                <v-icon start size="16">mdi-archive-arrow-up</v-icon>
                Reopen
              </v-btn>
            </div>
          </v-card-text>

          <!-- Unread Indicator -->
          <div v-if="!notification.is_read && !notification.closed_at" class="unread-dot"></div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Load More -->
    <div v-if="hasMore && filteredNotifications.length > 0" class="text-center mt-6">
      <v-btn
        variant="outlined"
        color="primary"
        @click="loadMore"
        :loading="loadingMore"
        rounded="xl"
      >
        Load More
        <v-icon end>mdi-chevron-down</v-icon>
      </v-btn>
    </div>

    <!-- Notification Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="500" rounded="xl">
      <v-card v-if="selectedNotification" rounded="xl">
        <v-card-title class="d-flex align-center gap-3 pa-4">
          <div 
            class="notification-icon"
            :style="{ background: getCategoryColor(selectedNotification.category) }"
          >
            {{ getCategoryEmoji(selectedNotification.category) }}
          </div>
          <div>
            <div class="text-caption text-grey">{{ getCategoryLabel(selectedNotification.category) }}</div>
            <div class="text-h6">{{ selectedNotification.title }}</div>
          </div>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" aria-label="Close" @click="detailDialog = false" />
        </v-card-title>
        
        <v-divider />
        
        <v-card-text class="pa-4">
          <p class="text-body-1 mb-4">{{ selectedNotification.body }}</p>
          
          <div class="d-flex align-center gap-2 text-caption text-grey">
            <v-icon size="14">mdi-clock-outline</v-icon>
            {{ formatDateTime(selectedNotification.created_at) }}
          </div>

          <div v-if="selectedNotification.data" class="mt-4">
            <v-expansion-panels variant="accordion">
              <v-expansion-panel>
                <v-expansion-panel-title class="text-caption">
                  Additional Details
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <pre class="text-caption bg-grey-lighten-4 pa-2 rounded">{{ JSON.stringify(selectedNotification.data, null, 2) }}</pre>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn
            v-if="!selectedNotification.is_read && !selectedNotification.closed_at"
            variant="text"
            @click="markAsRead(selectedNotification)"
          >
            Mark as Read
          </v-btn>
          <v-btn
            v-if="!selectedNotification.closed_at"
            variant="text"
            color="grey"
            @click="closeNotification(selectedNotification)"
          >
            <v-icon start size="16">mdi-archive-arrow-down</v-icon>
            Close
          </v-btn>
          <v-btn
            v-else
            variant="text"
            color="primary"
            @click="reopenNotification(selectedNotification)"
          >
            <v-icon start size="16">mdi-archive-arrow-up</v-icon>
            Reopen
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="selectedNotification.action_url && !selectedNotification.closed_at"
            :to="selectedNotification.action_url"
            color="primary"
            variant="flat"
            @click="detailDialog = false"
          >
            {{ selectedNotification.action_label || 'View Details' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityNotification } from '~/types/integrations.types'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

useHead({
  title: 'Activity Hub'
})

// Get global hydrated data
const { employees, loading, isAdmin, currentUserProfile, fetchGlobalData } = useAppData()
const supabase = useSupabaseClient() as SupabaseClient

// Dashboard view mode: 'personal' or 'company'
const viewMode = ref<'personal' | 'company'>('personal')

// Personal dashboard data
const myUpcomingShifts = ref<any[]>([])
const myActiveGoals = ref<any[]>([])
const myTrainingProgress = ref<any[]>([])
const loadingPersonal = ref(false)

// Greeting based on time of day
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const firstName = computed(() => currentUserProfile.value?.first_name || 'there')

// Current date formatted
const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Personal stats computed
const personalStats = computed(() => {
  const profile = currentUserProfile.value
  if (!profile) return { skillCount: 0, upcomingShifts: 0, activeGoals: 0, trainingInProgress: 0 }
  
  // Get user's skills from employees array
  const userEmployee = employees.value.find(e => e.id === profile.id)
  const userSkills = userEmployee?.skills || []
  
  return {
    skillCount: userSkills.length,
    upcomingShifts: myUpcomingShifts.value.length,
    activeGoals: myActiveGoals.value.length,
    trainingInProgress: myTrainingProgress.value.length
  }
})

// Fetch personal dashboard data
async function fetchPersonalData() {
  if (!currentUserProfile.value?.id) return
  loadingPersonal.value = true
  
  try {
    const userId = currentUserProfile.value.id
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Fetch upcoming shifts from the shifts table
    try {
      // First try to get employee_id from employees table using profile_id
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', userId)
        .single()
      
      if (empData?.id) {
        const { data: shifts } = await supabase
          .from('shifts')
          .select('id, start_at, end_at, status, location:locations(name)')
          .eq('employee_id', empData.id)
          .in('status', ['published', 'scheduled'])
          .gte('start_at', `${today}T00:00:00`)
          .lte('start_at', `${nextWeek}T23:59:59`)
          .order('start_at', { ascending: true })
          .limit(5)
        
        myUpcomingShifts.value = shifts || []
      } else {
        myUpcomingShifts.value = []
      }
    } catch {
      myUpcomingShifts.value = []
    }
    
    // Fetch active goals
    try {
      const { data: goals } = await supabase
        .from('employee_goals')
        .select('*')
        .eq('employee_id', userId)
        .eq('completed', false)
        .order('target_date', { ascending: true })
        .limit(5)
      
      myActiveGoals.value = goals || []
    } catch {
      myActiveGoals.value = []
    }
    
    // Fetch training progress
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', userId)
        .single()
      
      if (empData?.id) {
        const { data: enrollments } = await supabase
          .from('training_enrollments')
          .select(`
            id,
            status,
            course:training_courses(title)
          `)
          .eq('employee_id', empData.id)
          .eq('status', 'in_progress')
          .limit(5)
        
        myTrainingProgress.value = enrollments || []
      } else {
        myTrainingProgress.value = []
      }
    } catch {
      myTrainingProgress.value = []
    }
    
  } catch (err) {
    console.error('[ActivityHub] Error fetching personal data:', err)
  } finally {
    loadingPersonal.value = false
  }
}

// ============= NOTIFICATIONS SECTION =============

// Categories configuration
const categories = [
  { value: 'schedule', label: 'Schedule', icon: 'mdi-calendar', color: 'blue', emoji: '📅' },
  { value: 'skills', label: 'Skills', icon: 'mdi-star', color: 'amber', emoji: '⭐' },
  { value: 'profile', label: 'Profile', icon: 'mdi-account', color: 'purple', emoji: '👤' },
  { value: 'training', label: 'Training', icon: 'mdi-school', color: 'green', emoji: '🎓' },
  { value: 'hr', label: 'HR', icon: 'mdi-briefcase', color: 'orange', emoji: '💼' },
  { value: 'marketing', label: 'Marketing', icon: 'mdi-bullhorn', color: 'pink', emoji: '📣' },
  { value: 'pto', label: 'Time Off', icon: 'mdi-palm-tree', color: 'teal', emoji: '🏖️' },
  { value: 'system', label: 'System', icon: 'mdi-cog', color: 'grey', emoji: '⚙️' },
]

// State
const loadingNotifications = ref(true)
const loadingMore = ref(false)
const markingAllRead = ref(false)
const notifications = ref<ActivityNotification[]>([])
const selectedCategories = ref<string[]>([])
const showPriorityOnly = ref(false)
const showClosed = ref(false)
const detailDialog = ref(false)
const selectedNotification = ref<ActivityNotification | null>(null)
const page = ref(1)
const pageSize = 30
const hasMore = ref(true)

// Computed
const openNotifications = computed(() => notifications.value.filter(n => !n.closed_at))
const closedNotifications = computed(() => notifications.value.filter(n => n.closed_at))
const totalCount = computed(() => openNotifications.value.length)
const closedCount = computed(() => closedNotifications.value.length)
const unreadCount = computed(() => openNotifications.value.filter(n => !n.is_read).length)
const priorityCount = computed(() => openNotifications.value.filter(n => n.requires_action).length)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return openNotifications.value.filter(n => new Date(n.created_at).toDateString() === today).length
})
const thisWeekCount = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return openNotifications.value.filter(n => new Date(n.created_at) >= weekAgo).length
})

const filteredNotifications = computed(() => {
  let result = showClosed.value ? [...closedNotifications.value] : [...openNotifications.value]
  
  if (showPriorityOnly.value && !showClosed.value) {
    result = result.filter(n => n.requires_action)
  }
  
  if (selectedCategories.value.length > 0) {
    result = result.filter(n => selectedCategories.value.includes(n.category))
  }
  
  result.sort((a, b) => {
    if (a.requires_action && !b.requires_action) return -1
    if (!a.requires_action && b.requires_action) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  
  return result
})

// Methods
const loadNotifications = async () => {
  loadingNotifications.value = true
  page.value = 1
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(pageSize)
    
    if (error) throw error
    
    notifications.value = (data || []).map(enrichNotification)
    hasMore.value = (data || []).length === pageSize
  } catch (err) {
    console.error('Error loading notifications:', err)
  } finally {
    loadingNotifications.value = false
  }
}

const loadMore = async () => {
  loadingMore.value = true
  page.value++
  
  try {
    const offset = (page.value - 1) * pageSize
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    
    if (error) throw error
    
    const newNotifications = (data || []).map(enrichNotification)
    notifications.value.push(...newNotifications)
    hasMore.value = newNotifications.length === pageSize
  } catch (err) {
    console.error('Error loading more notifications:', err)
  } finally {
    loadingMore.value = false
  }
}

const enrichNotification = (n: any): ActivityNotification => {
  const category = n.category || n.type?.split('_')[0] || 'system'
  const actionTypes = ['approval_needed', 'response_required', 'urgent', 'action_required']
  const requires_action = n.requires_action || actionTypes.some(t => n.type?.includes(t)) || n.data?.requires_action
  const action_url = n.data?.url || n.data?.action_url || null
  const action_label = n.data?.action_label || null
  
  return { ...n, category, requires_action, action_url, action_label }
}

const openNotification = async (notification: ActivityNotification) => {
  selectedNotification.value = notification
  detailDialog.value = true
  
  if (!notification.is_read) {
    await markAsRead(notification)
  }
}

const markAsRead = async (notification: ActivityNotification) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notification.id)
    
    const item = notifications.value.find(n => n.id === notification.id)
    if (item) {
      item.is_read = true
      item.read_at = new Date().toISOString()
    }
  } catch (err) {
    console.error('Error marking notification as read:', err)
  }
}

const markAllAsRead = async () => {
  markingAllRead.value = true
  
  try {
    const unreadIds = notifications.value.filter(n => !n.is_read).map(n => n.id)
    
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', unreadIds)
      
      notifications.value.forEach(n => {
        if (!n.is_read) {
          n.is_read = true
          n.read_at = new Date().toISOString()
        }
      })
    }
  } catch (err) {
    console.error('Error marking all as read:', err)
  } finally {
    markingAllRead.value = false
  }
}

const closeNotification = async (notification: ActivityNotification) => {
  try {
    const closedAt = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ closed_at: closedAt, is_read: true, read_at: notification.read_at || closedAt })
      .eq('id', notification.id)
    
    const item = notifications.value.find(n => n.id === notification.id)
    if (item) {
      item.closed_at = closedAt
      item.is_read = true
      if (!item.read_at) item.read_at = closedAt
    }
    
    if (selectedNotification.value?.id === notification.id) {
      detailDialog.value = false
    }
  } catch (err) {
    console.error('Error closing notification:', err)
  }
}

const reopenNotification = async (notification: ActivityNotification) => {
  try {
    await supabase
      .from('notifications')
      .update({ closed_at: null })
      .eq('id', notification.id)
    
    const item = notifications.value.find(n => n.id === notification.id)
    if (item) {
      item.closed_at = null
    }
  } catch (err) {
    console.error('Error reopening notification:', err)
  }
}

const clearFilters = () => {
  selectedCategories.value = []
  showPriorityOnly.value = false
  showClosed.value = false
}

const togglePriorityFilter = () => {
  showPriorityOnly.value = !showPriorityOnly.value
  showClosed.value = false
}

const getCategoryCount = (category: string) => {
  const source = showClosed.value ? closedNotifications.value : openNotifications.value
  return source.filter(n => n.category === category).length
}

const getCategoryEmoji = (category: string) => {
  return categories.find(c => c.value === category)?.emoji || '📌'
}

const getCategoryLabel = (category: string) => {
  return categories.find(c => c.value === category)?.label || category
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    schedule: 'rgba(33, 150, 243, 0.15)',
    skills: 'rgba(255, 193, 7, 0.15)',
    profile: 'rgba(156, 39, 176, 0.15)',
    training: 'rgba(76, 175, 80, 0.15)',
    hr: 'rgba(255, 152, 0, 0.15)',
    marketing: 'rgba(233, 30, 99, 0.15)',
    pto: 'rgba(0, 150, 136, 0.15)',
    system: 'rgba(158, 158, 158, 0.15)',
  }
  return colors[category] || colors.system
}

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(async () => {
  await fetchGlobalData()
  await fetchPersonalData()
  await loadNotifications()
})
</script>

<style scoped>
.activity-hub {
  max-width: 1400px;
  margin: 0 auto;
}

.hero-header {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
  border-radius: 24px;
  padding: 24px;
}

.hero-icon {
  font-size: 2rem;
  animation: ring 1s ease-in-out;
}

@keyframes ring {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(10deg); }
  20%, 40% { transform: rotate(-10deg); }
  50% { transform: rotate(0deg); }
}

/* Compact stat tiles */
.stat-tile {
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.stat-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-small.bg-green { background: linear-gradient(135deg, #4CAF50, #2E7D32); }
.stat-icon-small.bg-amber { background: linear-gradient(135deg, #FFC107, #FF8F00); }
.stat-icon-small.bg-pink { background: linear-gradient(135deg, #E91E63, #C2185B); }
.stat-icon-small.bg-purple { background: linear-gradient(135deg, #9C27B0, #6A1B9A); }

/* Activity stats */
.stat-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.stat-emoji {
  font-size: 1.25rem;
}

.filters-card {
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.notification-card {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  position: relative;
  overflow: visible;
}

.notification-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.notification-card--unread {
  border-color: rgba(var(--v-theme-primary), 0.3);
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.03) 0%, transparent 100%);
}

.notification-card--priority {
  border-color: rgba(var(--v-theme-error), 0.4);
  background: linear-gradient(135deg, rgba(var(--v-theme-error), 0.05) 0%, transparent 100%);
}

.notification-card--closed {
  opacity: 0.7;
  background: rgba(158, 158, 158, 0.05);
}

.notification-card--closed:hover {
  opacity: 1;
}

.priority-badge {
  position: absolute;
  top: -8px;
  right: 16px;
  background: rgb(var(--v-theme-error));
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 4px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.notification-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.notification-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-body {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 10px;
  height: 10px;
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.empty-state {
  padding: 40px;
}

.empty-icon {
  font-size: 4rem;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .hero-header {
    padding: 16px;
  }
  
  .notification-card {
    margin-bottom: 8px;
  }
}
</style>
