<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'gdu']
})

const supabase = useSupabaseClient()

// Fetch dashboard stats
const { data: stats } = await useAsyncData('gdu-stats', async () => {
  // Get visitor counts by type
  const { data: visitors } = await supabase
    .from('education_visitors')
    .select('visitor_type, is_active')
  
  // Get CE events by status
  const { data: events } = await supabase
    .from('ce_events')
    .select('id, status, event_date_start')
  
  // Get pending tasks count
  const { data: tasks } = await supabase
    .from('ce_event_tasks')
    .select('status')
    .neq('status', 'completed')
  
  const now = new Date()
  const upcomingEvents = events?.filter(e => new Date(e.event_date_start) >= now) || []
  
  return {
    totalVisitors: visitors?.length || 0,
    activeVisitors: visitors?.filter(v => v.is_active).length || 0,
    visitorsByType: {
      intern: visitors?.filter(v => v.visitor_type === 'intern').length || 0,
      extern: visitors?.filter(v => v.visitor_type === 'extern').length || 0,
      student: visitors?.filter(v => v.visitor_type === 'student').length || 0,
      ce_attendee: visitors?.filter(v => v.visitor_type === 'ce_attendee').length || 0,
    },
    totalEvents: events?.length || 0,
    upcomingEvents: upcomingEvents.length,
    draftEvents: events?.filter(e => e.status === 'draft').length || 0,
    approvedEvents: events?.filter(e => e.status === 'approved').length || 0,
    pendingTasks: tasks?.length || 0,
  }
})

// Recent visitors
const { data: recentVisitors } = await useAsyncData('recent-visitors', async () => {
  const { data } = await supabase
    .from('education_visitors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  return data || []
})

// Upcoming events
const { data: upcomingEvents } = await useAsyncData('upcoming-events', async () => {
  const { data } = await supabase
    .from('ce_events')
    .select('*')
    .gte('event_date_start', new Date().toISOString().split('T')[0])
    .order('event_date_start', { ascending: true })
    .limit(5)
  return data || []
})

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    pending_approval: 'warning',
    approved: 'success',
    in_progress: 'info',
    completed: 'primary',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getVisitorTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    intern: 'mdi-briefcase-account',
    extern: 'mdi-school-outline',
    student: 'mdi-account-school',
    ce_attendee: 'mdi-certificate',
    shadow: 'mdi-account-eye',
    other: 'mdi-account'
  }
  return icons[type] || 'mdi-account'
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">
          🎓 GDU Dash
        </h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Green Dog University - Education Management System
        </p>
      </div>
      <v-spacer />
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        to="/gdu/events/new"
        class="mr-2"
      >
        New CE Event
      </v-btn>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-account-plus"
        to="/gdu/visitors?action=add"
      >
        Add Visitor
      </v-btn>
    </div>

    <!-- Stats Cards -->
    <UiStatsRow
      :stats="[
        { value: stats?.totalVisitors || 0, label: 'Total Visitors', color: 'primary', icon: 'mdi-account-group', subtitle: stats?.activeVisitors ? `${stats.activeVisitors} active` : undefined, subtitleColor: 'success' },
        { value: stats?.upcomingEvents || 0, label: 'Upcoming CE Events', color: 'success', icon: 'mdi-calendar-check', subtitle: stats?.totalEvents ? `${stats.totalEvents} total events` : undefined },
        { value: stats?.pendingTasks || 0, label: 'Pending Tasks', color: 'warning', icon: 'mdi-clipboard-list', subtitle: 'across all events' },
        { value: stats?.approvedEvents || 0, label: 'Approved Events', color: 'info', icon: 'mdi-file-document-check', subtitle: stats?.draftEvents ? `${stats.draftEvents} drafts` : undefined, subtitleColor: 'warning' }
      ]"
      layout="4-col"
      tile-size="tall"
    />

    <!-- Quick Actions & Navigation -->
    <v-row class="mb-6">
      <v-col cols="12" md="4">
        <v-card color="blue" variant="tonal" to="/gdu/students" class="h-100">
          <v-card-text class="d-flex align-center">
            <v-avatar color="blue" class="mr-4">
              <v-icon>mdi-account-school</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">Student Contacts</div>
              <div class="text-caption">Interns, Externs, Cohorts, Intensives</div>
            </div>
            <v-spacer />
            <v-icon>mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card color="amber" variant="tonal" to="/gdu/visitors" class="h-100">
          <v-card-text class="d-flex align-center">
            <v-avatar color="amber" class="mr-4">
              <v-icon>mdi-certificate</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">CE Course Contacts</div>
              <div class="text-caption">Continuing Education Attendees</div>
            </div>
            <v-spacer />
            <v-icon>mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card color="success" variant="tonal" to="/gdu/events" class="h-100">
          <v-card-text class="d-flex align-center">
            <v-avatar color="success" class="mr-4">
              <v-icon>mdi-calendar-star</v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">CE Events</div>
              <div class="text-caption">{{ stats?.upcomingEvents || 0 }} upcoming</div>
            </div>
            <v-spacer />
            <v-icon>mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Legacy Visitor Stats by Type -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-account-group</v-icon>
            Legacy Visitors (Being Migrated)
            <v-spacer />
            <v-btn variant="text" size="small" to="/gdu/visitors">View All</v-btn>
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap gap-2">
              <v-chip color="blue" variant="tonal">
                <v-icon start>mdi-briefcase-account</v-icon>
                Interns: {{ stats?.visitorsByType?.intern || 0 }}
              </v-chip>
              <v-chip color="purple" variant="tonal">
                <v-icon start>mdi-school-outline</v-icon>
                Externs: {{ stats?.visitorsByType?.extern || 0 }}
              </v-chip>
              <v-chip color="green" variant="tonal">
                <v-icon start>mdi-account-school</v-icon>
                Students: {{ stats?.visitorsByType?.student || 0 }}
              </v-chip>
              <v-chip color="amber" variant="tonal">
                <v-icon start>mdi-certificate</v-icon>
                CE Attendees: {{ stats?.visitorsByType?.ce_attendee || 0 }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-lightning-bolt</v-icon>
            Quick Actions
          </v-card-title>
          <v-card-text>
            <div class="d-flex flex-wrap gap-2">
              <v-btn variant="tonal" color="primary" to="/gdu/events/new" prepend-icon="mdi-plus">
                Create CE Event
              </v-btn>
              <v-btn variant="tonal" color="blue" to="/gdu/students" prepend-icon="mdi-account-plus">
                Invite Student
              </v-btn>
              <v-btn variant="tonal" to="/gdu/events" prepend-icon="mdi-calendar">
                View All Events
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Recent Activity -->
    <v-row>
      <!-- Recent Visitors -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-account-clock</v-icon>
            Recent Visitors
            <v-spacer />
            <v-btn variant="text" size="small" to="/gdu/visitors">View All</v-btn>
          </v-card-title>
          <v-list v-if="recentVisitors?.length">
            <v-list-item
              v-for="visitor in recentVisitors"
              :key="visitor.id"
              :to="`/gdu/visitors?edit=${visitor.id}`"
            >
              <template #prepend>
                <v-avatar color="primary" size="40">
                  <v-icon>{{ getVisitorTypeIcon(visitor.visitor_type) }}</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ visitor.first_name }} {{ visitor.last_name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ visitor.visitor_type.replace('_', ' ') }} 
                <span v-if="visitor.organization_name">• {{ visitor.organization_name }}</span>
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="x-small" :color="visitor.is_active ? 'success' : 'grey'">
                  {{ visitor.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center text-medium-emphasis">
            No visitors yet
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Upcoming Events -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-calendar-star</v-icon>
            Upcoming CE Events
            <v-spacer />
            <v-btn variant="text" size="small" to="/gdu/events">View All</v-btn>
          </v-card-title>
          <v-list v-if="upcomingEvents?.length">
            <v-list-item
              v-for="event in upcomingEvents"
              :key="event.id"
              :to="`/gdu/events/${event.id}`"
            >
              <template #prepend>
                <v-avatar color="success" size="40">
                  <v-icon>mdi-school</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title>{{ event.title }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ new Date(event.event_date_start).toLocaleDateString() }}
                <span v-if="event.ce_hours_offered">• {{ event.ce_hours_offered }} CE hrs</span>
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="x-small" :color="getStatusColor(event.status)">
                  {{ event.status.replace('_', ' ') }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-text v-else class="text-center text-medium-emphasis">
            No upcoming events
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
