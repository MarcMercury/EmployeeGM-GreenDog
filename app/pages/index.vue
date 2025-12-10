<template>
  <div class="command-center">
    <!-- 🚀 Hero Header Section -->
    <div class="hero-section mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-4">
        <div>
          <div class="d-flex align-center gap-2 mb-2">
            <span class="text-h6">👋</span>
            <span class="greeting-text">{{ greetingTime }}, {{ firstName }}!</span>
          </div>
          <h1 class="text-h4 text-md-h3 font-weight-bold hero-title">
            Command Center
          </h1>
          <p class="text-body-1 text-medium-emphasis mt-1">
            {{ currentDate }}
          </p>
        </div>

        <!-- Quick Actions -->
        <div class="d-flex gap-2 flex-wrap">
          <v-btn 
            color="primary" 
            prepend-icon="mdi-calendar-plus" 
            variant="flat" 
            class="action-btn"
            @click="quickAddShift"
          >
            Add Shift
          </v-btn>
          <v-btn 
            v-if="isAdmin" 
            color="secondary" 
            prepend-icon="mdi-calendar-star" 
            variant="flat"
            class="action-btn"
            @click="quickAddEvent"
          >
            New Event
          </v-btn>
        </div>
      </div>
    </div>

    <!-- 🔔 Alert Banner (Critical Attention) -->
    <v-slide-y-transition>
      <v-alert 
        v-if="criticalAlerts.length > 0" 
        type="error" 
        variant="flat" 
        class="alert-banner mb-6"
        border="start"
        prominent
      >
        <template #prepend>
          <div class="alert-icon-wrap">
            <v-icon size="28">mdi-alert-octagon</v-icon>
          </div>
        </template>
        <v-alert-title class="text-subtitle-1 font-weight-bold">
          ⚠️ {{ criticalAlerts.length }} Item{{ criticalAlerts.length > 1 ? 's' : '' }} Need{{ criticalAlerts.length === 1 ? 's' : '' }} Attention
        </v-alert-title>
        <div class="text-body-2 mt-1">
          {{ criticalAlerts[0]?.message }}
          <span v-if="criticalAlerts.length > 1" class="text-caption ml-1">
            (+{{ criticalAlerts.length - 1 }} more)
          </span>
        </div>
        <template #append>
          <v-btn color="white" variant="flat" size="small" @click="showAllAlerts = true">
            Review All
          </v-btn>
        </template>
      </v-alert>
    </v-slide-y-transition>

    <!-- 📊 Live Stats Row - Glassmorphic Cards -->
    <div class="stats-grid mb-6">
      <div class="stat-card stat-primary" @click="navigateTo('/employees')">
        <div class="stat-icon">
          <v-icon size="28">mdi-account-group</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalStaff }}</div>
          <div class="stat-label">Total Staff</div>
        </div>
        <div class="stat-trend" v-if="stats.newHires > 0">
          <v-icon size="14" color="success">mdi-trending-up</v-icon>
          <span class="text-success">+{{ stats.newHires }}</span>
        </div>
      </div>

      <div class="stat-card stat-success" @click="navigateTo('/schedule')">
        <div class="stat-icon">
          <v-icon size="28">mdi-calendar-check</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.onShiftToday }}</div>
          <div class="stat-label">On Shift Today</div>
        </div>
        <div class="stat-badge" v-if="stats.onShiftToday > 0">
          <span class="pulse-dot"></span>
          Live
        </div>
      </div>

      <div class="stat-card stat-warning" @click="navigateTo('/time-off')">
        <div class="stat-icon">
          <v-icon size="28">mdi-clock-alert</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingRequests }}</div>
          <div class="stat-label">Pending Requests</div>
        </div>
        <v-chip v-if="stats.pendingRequests > 0" size="x-small" color="warning" class="stat-action">
          Review
        </v-chip>
      </div>

      <div class="stat-card stat-info" @click="navigateTo('/mentorship')">
        <div class="stat-icon">
          <v-icon size="28">mdi-account-supervisor</v-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeMentorships }}</div>
          <div class="stat-label">Active Mentorships</div>
        </div>
      </div>
    </div>

    <!-- 🔔 NOTIFICATION CENTER - The Star Feature -->
    <v-card class="notification-center mb-6" variant="flat">
      <div class="notification-header">
        <div class="d-flex align-center gap-2">
          <v-icon color="amber">mdi-bell-ring</v-icon>
          <span class="text-h6 font-weight-bold">Activity Feed</span>
          <v-chip 
            v-if="totalUnreadNotifications > 0" 
            size="x-small" 
            color="error" 
            class="ml-2"
          >
            {{ totalUnreadNotifications }} new
          </v-chip>
        </div>
        
        <!-- Category Filters -->
        <div class="notification-filters">
          <v-chip-group v-model="activeNotificationFilter" mandatory>
            <v-chip 
              value="all" 
              size="small" 
              variant="tonal"
              :color="activeNotificationFilter === 'all' ? 'primary' : 'default'"
            >
              📋 All
            </v-chip>
            <v-chip 
              value="schedule" 
              size="small" 
              variant="tonal"
              :color="activeNotificationFilter === 'schedule' ? 'blue' : 'default'"
            >
              📅 Schedule
            </v-chip>
            <v-chip 
              value="skills" 
              size="small" 
              variant="tonal"
              :color="activeNotificationFilter === 'skills' ? 'purple' : 'default'"
            >
              ⭐ Skills
            </v-chip>
            <v-chip 
              value="team" 
              size="small" 
              variant="tonal"
              :color="activeNotificationFilter === 'team' ? 'green' : 'default'"
            >
              👥 Team
            </v-chip>
            <v-chip 
              value="performance" 
              size="small" 
              variant="tonal"
              :color="activeNotificationFilter === 'performance' ? 'amber' : 'default'"
            >
              📈 Performance
            </v-chip>
          </v-chip-group>
        </div>
      </div>

      <v-divider />

      <!-- Notification Tiles Grid -->
      <div class="notification-grid">
        <TransitionGroup name="notification" tag="div" class="notification-tiles">
          <div 
            v-for="notification in filteredNotifications" 
            :key="notification.id"
            class="notification-tile"
            :class="[`tile-${notification.category}`, { 'tile-unread': !notification.read }]"
            @click="handleNotificationClick(notification)"
          >
            <div class="tile-emoji">{{ notification.emoji }}</div>
            <div class="tile-content">
              <div class="tile-title">{{ notification.title }}</div>
              <div class="tile-description">{{ notification.description }}</div>
              <div class="tile-meta">
                <span class="tile-time">{{ formatTimeAgo(notification.timestamp) }}</span>
                <v-chip 
                  v-if="notification.actionLabel" 
                  size="x-small" 
                  :color="notification.actionColor || 'primary'"
                  variant="tonal"
                  class="tile-action"
                >
                  {{ notification.actionLabel }}
                </v-chip>
              </div>
            </div>
            <div v-if="!notification.read" class="tile-unread-dot"></div>
          </div>
        </TransitionGroup>

        <!-- Empty State -->
        <div v-if="filteredNotifications.length === 0" class="notification-empty">
          <v-icon size="48" color="grey-lighten-2">mdi-bell-check</v-icon>
          <p class="text-body-2 text-grey mt-2">No notifications in this category</p>
        </div>
      </div>
    </v-card>

    <!-- 🎯 Main Dashboard Grid -->
    <v-row>
      <!-- Team Health Overview -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="dashboard-card health-card" variant="flat">
          <div class="card-header">
            <div class="d-flex align-center gap-2">
              <span class="card-emoji">💚</span>
              <span class="card-title">Team Health</span>
            </div>
            <v-chip size="x-small" :color="teamHealth.percentage >= 80 ? 'success' : 'warning'" variant="flat">
              {{ teamHealth.percentage }}%
            </v-chip>
          </div>
          
          <div class="health-content">
            <div class="health-circle">
              <v-progress-circular
                :model-value="teamHealth.percentage"
                :size="120"
                :width="10"
                :color="teamHealth.percentage >= 80 ? 'success' : teamHealth.percentage >= 60 ? 'warning' : 'error'"
              >
                <div class="text-center">
                  <div class="text-h5 font-weight-bold">{{ teamHealth.compliant }}</div>
                  <div class="text-caption text-grey">Compliant</div>
                </div>
              </v-progress-circular>
            </div>
            
            <div class="health-stats">
              <div class="health-stat">
                <v-icon size="18" color="success">mdi-check-circle</v-icon>
                <span class="stat-num text-success">{{ teamHealth.compliant }}</span>
                <span class="stat-text">Up to Date</span>
              </div>
              <div class="health-stat">
                <v-icon size="18" color="warning">mdi-clock-alert</v-icon>
                <span class="stat-num text-warning">{{ teamHealth.expiringSoon }}</span>
                <span class="stat-text">Expiring Soon</span>
              </div>
              <div class="health-stat">
                <v-icon size="18" color="error">mdi-alert-circle</v-icon>
                <span class="stat-num text-error">{{ teamHealth.expired }}</span>
                <span class="stat-text">Expired</span>
              </div>
            </div>
          </div>

          <v-divider class="my-3" />
          
          <v-btn variant="text" color="primary" size="small" block to="/training">
            View Training Status →
          </v-btn>
        </v-card>
      </v-col>

      <!-- Mentorship Hub -->
      <v-col cols="12" md="6" lg="4">
        <v-card class="dashboard-card mentorship-card" variant="flat">
          <div class="card-header">
            <div class="d-flex align-center gap-2">
              <span class="card-emoji">🌟</span>
              <span class="card-title">Mentorship Hub</span>
            </div>
            <v-chip v-if="pendingMentorships.length > 0" size="x-small" color="amber" variant="flat">
              {{ pendingMentorships.length }} pending
            </v-chip>
          </div>

          <div v-if="pendingMentorships.length > 0" class="mentorship-list">
            <div 
              v-for="match in pendingMentorships.slice(0, 3)" 
              :key="match.id" 
              class="mentorship-item"
            >
              <div class="d-flex align-center gap-2">
                <v-avatar size="32" color="blue-lighten-4">
                  <span class="text-caption font-weight-bold text-blue">
                    {{ match.learnerName?.charAt(0) || 'L' }}
                  </span>
                </v-avatar>
                <div>
                  <div class="text-body-2 font-weight-medium">{{ match.learnerName }}</div>
                  <div class="text-caption text-grey">wants to learn {{ match.skillName }}</div>
                </div>
              </div>
              <div class="d-flex align-center gap-1">
                <v-icon size="14" color="grey">mdi-arrow-right</v-icon>
                <v-avatar size="28" color="amber-lighten-4">
                  <span class="text-caption font-weight-bold text-amber-darken-3">
                    {{ match.mentorName?.charAt(0) || 'M' }}
                  </span>
                </v-avatar>
                <v-btn 
                  v-if="isAdmin"
                  icon 
                  size="x-small" 
                  color="success" 
                  variant="tonal" 
                  @click.stop="approveMentorship(match.id)"
                >
                  <v-icon size="14">mdi-check</v-icon>
                </v-btn>
              </div>
            </div>
          </div>

          <div v-else class="mentorship-empty">
            <v-icon size="40" color="grey-lighten-2">mdi-account-supervisor-circle</v-icon>
            <p class="text-caption text-grey mt-2">No pending matches</p>
          </div>

          <v-divider class="my-3" />
          
          <v-btn variant="text" color="primary" size="small" block to="/mentorship">
            Mentorship Hub →
          </v-btn>
        </v-card>
      </v-col>

      <!-- Quick Links & Actions -->
      <v-col cols="12" md="12" lg="4">
        <v-card class="dashboard-card quicklinks-card" variant="flat">
          <div class="card-header">
            <div class="d-flex align-center gap-2">
              <span class="card-emoji">🚀</span>
              <span class="card-title">Quick Actions</span>
            </div>
          </div>

          <div class="quicklinks-grid">
            <div class="quicklink-item" @click="navigateTo('/employees')">
              <div class="quicklink-icon bg-blue">👥</div>
              <span>Team Directory</span>
            </div>
            <div class="quicklink-item" @click="navigateTo('/schedule')">
              <div class="quicklink-icon bg-green">📅</div>
              <span>Schedule</span>
            </div>
            <div class="quicklink-item" @click="navigateTo('/my-stats')">
              <div class="quicklink-icon bg-purple">📊</div>
              <span>My Stats</span>
            </div>
            <div class="quicklink-item" @click="navigateTo('/goals')">
              <div class="quicklink-icon bg-amber">🎯</div>
              <span>Goals</span>
            </div>
            <div class="quicklink-item" @click="navigateTo('/training')">
              <div class="quicklink-icon bg-teal">🎓</div>
              <span>Training</span>
            </div>
            <div class="quicklink-item" @click="navigateTo('/time-off')">
              <div class="quicklink-icon bg-pink">🏖️</div>
              <span>Time Off</span>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Upcoming Schedule -->
      <v-col cols="12" lg="8">
        <v-card class="dashboard-card schedule-card" variant="flat">
          <div class="card-header">
            <div class="d-flex align-center gap-2">
              <span class="card-emoji">📆</span>
              <span class="card-title">Upcoming Schedule</span>
              <v-chip size="x-small" color="blue" variant="tonal">Next 48h</v-chip>
            </div>
            <v-btn variant="text" color="primary" size="small" to="/schedule">
              Full Schedule →
            </v-btn>
          </div>

          <v-data-table
            v-if="upcomingShifts.length > 0"
            :headers="scheduleHeaders"
            :items="upcomingShifts.slice(0, 6)"
            density="compact"
            class="schedule-table"
            hide-default-footer
          >
            <template #item.employee="{ item }">
              <div class="d-flex align-center gap-2">
                <v-avatar size="28" :color="item.employee ? 'primary' : 'error'">
                  <span class="text-caption text-white font-weight-bold">
                    {{ item.employee?.initials || '?' }}
                  </span>
                </v-avatar>
                <div>
                  <div class="text-body-2">{{ item.employee?.name || 'OPEN SHIFT' }}</div>
                  <div class="text-caption text-grey">{{ item.role }}</div>
                </div>
              </div>
            </template>
            <template #item.time="{ item }">
              <div>
                <div class="text-body-2 font-weight-medium">{{ formatShiftDate(item.date) }}</div>
                <div class="text-caption text-grey">{{ item.time }}</div>
              </div>
            </template>
            <template #item.status="{ item }">
              <v-chip 
                :color="item.employee ? 'success' : 'error'" 
                size="x-small" 
                variant="flat"
              >
                {{ item.employee ? '✓ Filled' : '⚠️ Open' }}
              </v-chip>
            </template>
          </v-data-table>

          <div v-else class="schedule-empty">
            <v-icon size="48" color="grey-lighten-2">mdi-calendar-blank</v-icon>
            <p class="text-body-2 text-grey mt-2">No upcoming shifts scheduled</p>
            <v-btn variant="tonal" color="primary" size="small" class="mt-3" @click="quickAddShift">
              + Add First Shift
            </v-btn>
          </div>
        </v-card>
      </v-col>

      <!-- Growth Pulse (Admin) -->
      <v-col v-if="isAdmin" cols="12" lg="4">
        <v-card class="dashboard-card growth-card" variant="flat">
          <div class="card-header">
            <div class="d-flex align-center gap-2">
              <span class="card-emoji">📈</span>
              <span class="card-title">Growth Pulse</span>
            </div>
          </div>

          <div class="growth-content">
            <div class="growth-stat-main">
              <div class="text-h3 font-weight-bold text-purple">{{ growthStats.leadsThisWeek }}</div>
              <div class="text-caption text-grey">Leads This Week</div>
              <v-progress-linear
                :model-value="(growthStats.leadsThisWeek / growthStats.weeklyGoal) * 100"
                :color="growthStats.leadsThisWeek >= growthStats.weeklyGoal ? 'success' : 'purple'"
                height="8"
                rounded
                class="mt-2"
              />
              <div class="text-caption text-grey mt-1">
                Goal: {{ growthStats.weeklyGoal }}
              </div>
            </div>

            <div class="growth-metrics">
              <div class="growth-metric">
                <v-icon size="18" color="success">mdi-percent</v-icon>
                <span class="metric-value">{{ growthStats.conversionRate }}%</span>
                <span class="metric-label">Conversion</span>
              </div>
              <div class="growth-metric">
                <v-icon size="18" color="blue">mdi-calendar-star</v-icon>
                <span class="metric-value">{{ growthStats.upcomingEvents }}</span>
                <span class="metric-label">Events</span>
              </div>
            </div>
          </div>

          <v-divider class="my-3" />
          
          <v-btn variant="text" color="primary" size="small" block to="/leads">
            View Leads →
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Add Dialogs -->
    <v-dialog v-model="showShiftDialog" max-width="500" persistent>
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center gap-2">
          <span>📅</span>
          <span>Quick Add Shift</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="shiftFormRef" v-model="shiftFormValid">
            <v-autocomplete
              v-model="shiftForm.employee_id"
              :items="employeeOptions"
              item-title="name"
              item-value="id"
              label="Employee"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Employee is required']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.date"
                  label="Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Date is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="shiftForm.shift_template_id"
                  :items="shiftTemplates"
                  item-title="name"
                  item-value="id"
                  label="Shift Template"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.start_time"
                  label="Start Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Start time is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="shiftForm.end_time"
                  label="End Time"
                  type="time"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'End time is required']"
                />
              </v-col>
            </v-row>
            <v-textarea
              v-model="shiftForm.notes"
              label="Notes (optional)"
              variant="outlined"
              density="compact"
              rows="2"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeShiftDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingShift" @click="saveQuickShift">
            Create Shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEventDialog" max-width="500" persistent>
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center gap-2">
          <span>🎉</span>
          <span>New Event</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="eventFormRef" v-model="eventFormValid">
            <v-text-field
              v-model="eventForm.name"
              label="Event Name"
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[v => !!v || 'Event name is required']"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="eventForm.start_date"
                  label="Start Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                  :rules="[v => !!v || 'Start date is required']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="eventForm.end_date"
                  label="End Date"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>
            <v-select
              v-model="eventForm.event_type"
              :items="eventTypes"
              label="Event Type"
              variant="outlined"
              density="compact"
              class="mb-3"
            />
            <v-textarea
              v-model="eventForm.description"
              label="Description"
              variant="outlined"
              density="compact"
              rows="3"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeEventDialog">Cancel</v-btn>
          <v-btn color="secondary" variant="flat" :loading="savingEvent" @click="saveQuickEvent">
            Create Event
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- All Alerts Dialog -->
    <v-dialog v-model="showAllAlerts" max-width="600">
      <v-card class="dialog-card">
        <v-card-title class="d-flex align-center gap-2">
          <span>⚠️</span>
          <span>All Alerts</span>
        </v-card-title>
        <v-card-text>
          <v-list density="compact">
            <v-list-item 
              v-for="alert in criticalAlerts" 
              :key="alert.id"
              :prepend-icon="alert.icon"
              :title="alert.title"
              :subtitle="alert.message"
            >
              <template #append>
                <v-btn 
                  v-if="alert.action" 
                  size="small" 
                  variant="tonal" 
                  :color="alert.color"
                  @click="handleAlertAction(alert)"
                >
                  {{ alert.actionLabel }}
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAllAlerts = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const router = useRouter()
const supabase = useSupabaseClient()
const authStore = useAuthStore()
const userStore = useUserStore()
const dashboardStore = useDashboardStore()

const isAdmin = computed(() => authStore.isAdmin)
const firstName = computed(() => authStore.profile?.first_name || 'there')

// Time-based greeting
const greetingTime = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const currentDate = computed(() => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// Notification System
const activeNotificationFilter = ref('all')
const totalUnreadNotifications = computed(() => 
  notifications.value.filter(n => !n.read).length
)

interface Notification {
  id: string
  emoji: string
  title: string
  description: string
  category: 'schedule' | 'skills' | 'team' | 'performance'
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionColor?: string
  actionRoute?: string
}

const notifications = ref<Notification[]>([
  {
    id: '1',
    emoji: '📅',
    title: 'Schedule Updated',
    description: 'Your shift on Friday has been moved to 9 AM',
    category: 'schedule',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
    actionLabel: 'View',
    actionColor: 'blue',
    actionRoute: '/schedule'
  },
  {
    id: '2',
    emoji: '⭐',
    title: 'Skill Milestone!',
    description: 'You\'ve reached Level 4 in Customer Service',
    category: 'skills',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
    actionLabel: 'See Stats',
    actionColor: 'purple',
    actionRoute: '/my-stats'
  },
  {
    id: '3',
    emoji: '👋',
    title: 'New Team Member',
    description: 'Sarah Johnson joined the Front Desk team',
    category: 'team',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
    actionLabel: 'Meet',
    actionColor: 'green',
    actionRoute: '/employees'
  },
  {
    id: '4',
    emoji: '🎯',
    title: 'Goal Progress',
    description: 'You\'re 80% to your quarterly certification goal',
    category: 'performance',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
    actionLabel: 'Track',
    actionColor: 'amber',
    actionRoute: '/goals'
  },
  {
    id: '5',
    emoji: '🔔',
    title: 'Time Off Approved',
    description: 'Your request for Dec 24-26 has been approved',
    category: 'schedule',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    read: true,
    actionRoute: '/time-off'
  }
])

const filteredNotifications = computed(() => {
  if (activeNotificationFilter.value === 'all') {
    return notifications.value
  }
  return notifications.value.filter(n => n.category === activeNotificationFilter.value)
})

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function handleNotificationClick(notification: Notification) {
  notification.read = true
  if (notification.actionRoute) {
    router.push(notification.actionRoute)
  }
}

// Critical Alerts
interface CriticalAlert {
  id: string
  icon: string
  title: string
  message: string
  color: string
  action?: () => void
  actionLabel?: string
}

const criticalAlerts = computed((): CriticalAlert[] => {
  const alerts: CriticalAlert[] = []
  
  if (dashboardStore.openShiftsCount > 0) {
    alerts.push({
      id: 'open-shifts',
      icon: 'mdi-calendar-alert',
      title: 'Open Shifts',
      message: `${dashboardStore.openShiftsCount} shift${dashboardStore.openShiftsCount > 1 ? 's' : ''} need coverage`,
      color: 'error',
      action: () => router.push('/schedule'),
      actionLabel: 'View Schedule'
    })
  }
  
  if (dashboardStore.teamHealth.expired > 0) {
    alerts.push({
      id: 'expired-certs',
      icon: 'mdi-certificate',
      title: 'Expired Certifications',
      message: `${dashboardStore.teamHealth.expired} staff member${dashboardStore.teamHealth.expired > 1 ? 's have' : ' has'} expired certifications`,
      color: 'warning',
      action: () => router.push('/training'),
      actionLabel: 'View Training'
    })
  }
  
  if (stats.value.pendingRequests > 0 && isAdmin.value) {
    alerts.push({
      id: 'pending-requests',
      icon: 'mdi-clock-alert',
      title: 'Pending Approvals',
      message: `${stats.value.pendingRequests} time-off request${stats.value.pendingRequests > 1 ? 's' : ''} awaiting approval`,
      color: 'warning',
      action: () => router.push('/time-off'),
      actionLabel: 'Review'
    })
  }
  
  return alerts
})

const showAllAlerts = ref(false)

function handleAlertAction(alert: CriticalAlert) {
  if (alert.action) {
    alert.action()
    showAllAlerts.value = false
  }
}

// Dashboard Data
const stats = computed(() => ({
  ...dashboardStore.stats,
  newHires: 3 // Mock - would come from real data
}))
const teamHealth = computed(() => ({
  ...dashboardStore.teamHealth,
  expiringSoon: 5 // Mock - would come from real data
}))
const pendingMentorships = computed(() => dashboardStore.pendingMentorships)
const growthStats = computed(() => dashboardStore.growthStats)
const upcomingShifts = computed(() => dashboardStore.upcomingShifts)

// Schedule Table
const scheduleHeaders = [
  { title: 'Employee', key: 'employee', sortable: false },
  { title: 'Time', key: 'time', sortable: false },
  { title: 'Location', key: 'location', sortable: false },
  { title: 'Status', key: 'status', sortable: false, align: 'end' as const }
]

function formatShiftDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Navigation
function navigateTo(path: string) {
  router.push(path)
}

// Quick Actions
const showShiftDialog = ref(false)
const showEventDialog = ref(false)
const shiftFormRef = ref()
const eventFormRef = ref()
const shiftFormValid = ref(false)
const eventFormValid = ref(false)
const savingShift = ref(false)
const savingEvent = ref(false)

const shiftForm = reactive({
  employee_id: null as string | null,
  date: new Date().toISOString().split('T')[0],
  shift_template_id: null as string | null,
  start_time: '09:00',
  end_time: '17:30',
  notes: ''
})

const eventForm = reactive({
  name: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  event_type: 'meeting',
  description: ''
})

const eventTypes = [
  { title: '📅 Meeting', value: 'meeting' },
  { title: '🎓 Training', value: 'training' },
  { title: '🎉 Team Building', value: 'team_building' },
  { title: '🏢 Company Wide', value: 'company_wide' },
  { title: '📋 Other', value: 'other' }
]

const employeeOptions = ref<{ id: string; name: string }[]>([])
const shiftTemplates = ref<{ id: string; name: string }[]>([])

watch(showShiftDialog, async (val) => {
  if (val && employeeOptions.value.length === 0) {
    await loadEmployeeOptions()
    await loadShiftTemplates()
  }
})

async function loadEmployeeOptions() {
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('is_active', true)
    .order('first_name')
  
  if (data) {
    employeeOptions.value = data.map(e => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`
    }))
  }
}

async function loadShiftTemplates() {
  const { data } = await supabase
    .from('shift_templates')
    .select('id, name')
    .order('name')
  
  if (data) {
    shiftTemplates.value = data
  }
}

function quickAddShift() {
  resetShiftForm()
  showShiftDialog.value = true
}

function quickAddEvent() {
  resetEventForm()
  showEventDialog.value = true
}

function resetShiftForm() {
  shiftForm.employee_id = null
  shiftForm.date = new Date().toISOString().split('T')[0]
  shiftForm.shift_template_id = null
  shiftForm.start_time = '09:00'
  shiftForm.end_time = '17:30'
  shiftForm.notes = ''
}

function resetEventForm() {
  eventForm.name = ''
  eventForm.start_date = new Date().toISOString().split('T')[0]
  eventForm.end_date = ''
  eventForm.event_type = 'meeting'
  eventForm.description = ''
}

function closeShiftDialog() {
  showShiftDialog.value = false
  resetShiftForm()
}

function closeEventDialog() {
  showEventDialog.value = false
  resetEventForm()
}

async function saveQuickShift() {
  if (shiftFormRef.value) {
    const { valid } = await shiftFormRef.value.validate()
    if (!valid) return
  }
  
  savingShift.value = true
  try {
    const { error } = await supabase.from('schedules').insert({
      employee_id: shiftForm.employee_id,
      date: shiftForm.date,
      shift_template_id: shiftForm.shift_template_id,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      notes: shiftForm.notes || null,
      status: 'scheduled',
      created_by: authStore.profile?.id
    })
    
    if (error) throw error
    
    closeShiftDialog()
    await dashboardStore.fetchDashboardData()
  } catch (err) {
    console.error('Error creating shift:', err)
  } finally {
    savingShift.value = false
  }
}

async function saveQuickEvent() {
  if (eventFormRef.value) {
    const { valid } = await eventFormRef.value.validate()
    if (!valid) return
  }
  
  savingEvent.value = true
  try {
    const { error } = await supabase.from('events').insert({
      name: eventForm.name,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date || eventForm.start_date,
      event_type: eventForm.event_type,
      description: eventForm.description || null,
      created_by: authStore.profile?.id
    })
    
    if (error) throw error
    
    closeEventDialog()
  } catch (err) {
    console.error('Error creating event:', err)
  } finally {
    savingEvent.value = false
  }
}

async function approveMentorship(id: string) {
  try {
    await dashboardStore.approveMentorship(id)
  } catch (err) {
    console.error('Error approving mentorship:', err)
  }
}

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    userStore.fetchUserData(),
    dashboardStore.fetchDashboardData()
  ])
})
</script>

<style scoped>
.command-center {
  max-width: 1600px;
  margin: 0 auto;
}

/* Hero Section */
.hero-section {
  padding: 1rem 0;
}

.greeting-text {
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.hero-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-btn {
  font-weight: 600;
  letter-spacing: 0.025em;
}

/* Alert Banner */
.alert-banner {
  border-radius: 12px !important;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%) !important;
}

.alert-icon-wrap {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  padding: 8px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: rgba(var(--v-theme-surface), 1);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-primary::before { background: linear-gradient(90deg, #667eea, #764ba2); }
.stat-success::before { background: linear-gradient(90deg, #11998e, #38ef7d); }
.stat-warning::before { background: linear-gradient(90deg, #f093fb, #f5576c); }
.stat-info::before { background: linear-gradient(90deg, #4facfe, #00f2fe); }

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-primary .stat-icon { background: linear-gradient(135deg, #667eea20, #764ba220); color: #667eea; }
.stat-success .stat-icon { background: linear-gradient(135deg, #11998e20, #38ef7d20); color: #11998e; }
.stat-warning .stat-icon { background: linear-gradient(135deg, #f093fb20, #f5576c20); color: #f5576c; }
.stat-info .stat-icon { background: linear-gradient(135deg, #4facfe20, #00f2fe20); color: #4facfe; }

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 4px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #11998e;
  font-weight: 600;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #11998e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Notification Center */
.notification-center {
  background: rgba(var(--v-theme-surface), 1);
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  overflow: hidden;
}

.notification-header {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.notification-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.notification-grid {
  padding: 1rem;
  min-height: 200px;
}

.notification-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.notification-tile {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.notification-tile:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  transform: translateX(4px);
}

.tile-unread {
  border-left: 3px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.tile-emoji {
  font-size: 1.5rem;
  line-height: 1;
}

.tile-content {
  flex: 1;
  min-width: 0;
}

.tile-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 2px;
}

.tile-description {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tile-time {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.tile-unread-dot {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 8px;
  height: 8px;
  background: rgb(var(--v-theme-primary));
  border-radius: 50%;
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

/* Notification Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Dashboard Cards */
.dashboard-card {
  background: rgba(var(--v-theme-surface), 1);
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding: 1.25rem;
  height: 100%;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-emoji {
  font-size: 1.25rem;
}

.card-title {
  font-weight: 600;
  font-size: 1rem;
}

/* Health Card */
.health-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.health-circle {
  flex-shrink: 0;
}

.health-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.health-stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.health-stat .stat-num {
  font-weight: 700;
  font-size: 1rem;
  min-width: 24px;
}

.health-stat .stat-text {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Mentorship Card */
.mentorship-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mentorship-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 8px;
}

.mentorship-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
}

/* Quick Links Card */
.quicklinks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.quicklink-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.quicklink-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
  transform: translateY(-2px);
}

.quicklink-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.quicklink-icon.bg-blue { background: linear-gradient(135deg, #667eea20, #764ba220); }
.quicklink-icon.bg-green { background: linear-gradient(135deg, #11998e20, #38ef7d20); }
.quicklink-icon.bg-purple { background: linear-gradient(135deg, #a855f720, #6366f120); }
.quicklink-icon.bg-amber { background: linear-gradient(135deg, #f59e0b20, #fbbf2420); }
.quicklink-icon.bg-teal { background: linear-gradient(135deg, #14b8a620, #06b6d420); }
.quicklink-icon.bg-pink { background: linear-gradient(135deg, #ec489920, #f472b620); }

.quicklink-item span:not(.quicklink-icon) {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

/* Schedule Card */
.schedule-table {
  background: transparent !important;
}

.schedule-table :deep(th) {
  font-size: 0.7rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
}

.schedule-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
}

/* Growth Card */
.growth-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.growth-stat-main {
  text-align: center;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1));
  border-radius: 12px;
}

.growth-metrics {
  display: flex;
  justify-content: space-around;
}

.growth-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.growth-metric .metric-value {
  font-weight: 700;
  font-size: 1.25rem;
}

.growth-metric .metric-label {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* Dialog Card */
.dialog-card {
  border-radius: 16px !important;
}

/* Dark Mode Adjustments */
.v-theme--dark .stat-card {
  background: rgba(30, 30, 40, 0.8);
}

.v-theme--dark .notification-center,
.v-theme--dark .dashboard-card {
  background: rgba(30, 30, 40, 0.8);
}

.v-theme--dark .notification-tile {
  background: rgba(255, 255, 255, 0.03);
}

.v-theme--dark .notification-tile:hover {
  background: rgba(255, 255, 255, 0.06);
}
</style>
