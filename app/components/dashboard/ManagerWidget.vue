<script setup lang="ts">
/**
 * ManagerWidget Component
 * 
 * Dashboard widget for managers showing:
 * - Team overview (active/total employees)
 * - Pending approvals (time-off requests)
 * - Alerts (upcoming reviews, expiring certs)
 */

const client = useSupabaseClient()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)

// Widget data
const teamStats = ref({
  total: 0,
  active: 0,
  onPTO: 0,
  newHires: 0
})

const pendingApprovals = ref<any[]>([])
const alerts = ref<any[]>([])

async function fetchData() {
  if (!authStore.profile?.id) return
  
  loading.value = true
  error.value = null
  
  try {
    const today = new Date().toISOString().split('T')[0]
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    // Fetch team stats from employees table (profiles doesn't have status/hire_date)
    const { data: employees, error: empError } = await client
      .from('employees')
      .select('id, employment_status, hire_date, department_id')
      .eq('employment_status', 'active')
    
    if (empError) throw empError
    
    teamStats.value = {
      total: employees?.length || 0,
      active: employees?.filter(e => e.employment_status === 'active').length || 0,
      onPTO: 0, // Will be calculated from time_off_requests
      newHires: employees?.filter(e => e.hire_date && new Date(e.hire_date) > threeMonthsAgo).length || 0
    }
    
    // Fetch pending time-off requests
    const { data: timeOffRequests, error: toError } = await client
      .from('time_off_requests')
      .select('*, employee:profiles(id, first_name, last_name, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (toError) throw toError
    pendingApprovals.value = timeOffRequests || []
    
    // Calculate on PTO
    const { data: currentPTO } = await client
      .from('time_off_requests')
      .select('employee_id')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
    
    teamStats.value.onPTO = currentPTO?.length || 0
    
    // Fetch alerts (upcoming reviews, expiring certs, etc.)
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    const { data: upcomingReviews } = await client
      .from('performance_reviews')
      .select('*, employee:profiles(first_name, last_name)')
      .eq('status', 'scheduled')
      .lte('review_date', nextMonth.toISOString().split('T')[0])
      .order('review_date', { ascending: true })
      .limit(3)
    
    alerts.value = [
      ...(upcomingReviews || []).map(r => ({
        type: 'review',
        icon: 'mdi-clipboard-account',
        color: 'primary',
        title: `Review due for ${r.employee?.first_name} ${r.employee?.last_name}`,
        subtitle: new Date(r.review_date).toLocaleDateString(),
        link: '/reviews'
      }))
    ]
    
  } catch (err: any) {
    console.error('[ManagerWidget] Error:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function approveRequest(request: any) {
  const { error } = await client
    .from('time_off_requests')
    .update({ status: 'approved', approved_by: authStore.profile?.id, approved_at: new Date().toISOString() })
    .eq('id', request.id)
  
  if (!error) {
    pendingApprovals.value = pendingApprovals.value.filter(r => r.id !== request.id)
  }
}

async function denyRequest(request: any) {
  const { error } = await client
    .from('time_off_requests')
    .update({ status: 'denied', approved_by: authStore.profile?.id, approved_at: new Date().toISOString() })
    .eq('id', request.id)
  
  if (!error) {
    pendingApprovals.value = pendingApprovals.value.filter(r => r.id !== request.id)
  }
}

onMounted(fetchData)
</script>

<template>
  <v-card variant="outlined" rounded="lg" class="h-100">
    <v-card-title class="d-flex align-center">
      <v-icon color="primary" class="mr-2">mdi-account-group</v-icon>
      Team Overview
    </v-card-title>
    
    <v-card-text v-if="loading">
      <v-skeleton-loader type="article" />
    </v-card-text>
    
    <v-card-text v-else-if="error">
      <v-alert type="error" variant="tonal">{{ error }}</v-alert>
    </v-card-text>
    
    <v-card-text v-else>
      <!-- Team Stats Row -->
      <v-row dense class="mb-4">
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-primary">{{ teamStats.total }}</div>
            <div class="text-caption text-medium-emphasis">Total</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-success">{{ teamStats.active }}</div>
            <div class="text-caption text-medium-emphasis">Active</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-warning">{{ teamStats.onPTO }}</div>
            <div class="text-caption text-medium-emphasis">On PTO</div>
          </div>
        </v-col>
        <v-col cols="3">
          <div class="text-center">
            <div class="text-h5 font-weight-bold text-info">{{ teamStats.newHires }}</div>
            <div class="text-caption text-medium-emphasis">New Hires</div>
          </div>
        </v-col>
      </v-row>
      
      <v-divider class="mb-4" />
      
      <!-- Pending Approvals -->
      <div class="mb-4">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-subtitle-2 font-weight-bold">Pending Approvals</span>
          <v-chip size="x-small" color="warning" variant="tonal">{{ pendingApprovals.length }}</v-chip>
        </div>
        
        <v-list v-if="pendingApprovals.length > 0" density="compact" class="pa-0">
          <v-list-item
            v-for="request in pendingApprovals"
            :key="request.id"
            class="px-0"
          >
            <template #prepend>
              <v-avatar size="32" color="grey-lighten-3">
                <v-img v-if="request.employee?.avatar_url" :src="request.employee.avatar_url" />
                <span v-else class="text-caption">{{ request.employee?.first_name?.[0] }}{{ request.employee?.last_name?.[0] }}</span>
              </v-avatar>
            </template>
            
            <v-list-item-title class="text-body-2">
              {{ request.employee?.first_name }} {{ request.employee?.last_name }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ request.request_type }} • {{ new Date(request.start_date).toLocaleDateString() }}
            </v-list-item-subtitle>
            
            <template #append>
              <v-btn icon="mdi-check" size="x-small" color="success" variant="text" @click="approveRequest(request)" />
              <v-btn icon="mdi-close" size="x-small" color="error" variant="text" @click="denyRequest(request)" />
            </template>
          </v-list-item>
        </v-list>
        
        <div v-else class="text-center text-medium-emphasis text-caption py-2">
          No pending approvals
        </div>
      </div>
      
      <!-- Alerts -->
      <div v-if="alerts.length > 0">
        <span class="text-subtitle-2 font-weight-bold">Alerts</span>
        <v-list density="compact" class="pa-0 mt-2">
          <v-list-item
            v-for="(alert, index) in alerts"
            :key="index"
            :to="alert.link"
            class="px-0"
          >
            <template #prepend>
              <v-icon :color="alert.color" size="small">{{ alert.icon }}</v-icon>
            </template>
            <v-list-item-title class="text-body-2">{{ alert.title }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ alert.subtitle }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
    </v-card-text>
    
    <v-card-actions>
      <v-btn variant="text" size="small" to="/roster" prepend-icon="mdi-account-multiple">
        View Team
      </v-btn>
      <v-spacer />
      <v-btn variant="text" size="small" to="/time-off" prepend-icon="mdi-calendar-clock">
        Time Off
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
