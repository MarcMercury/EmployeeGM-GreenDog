<script setup lang="ts">
/**
 * Compliance Alerts Widget
 * 
 * Shows upcoming license/certification expirations
 * Used on admin dashboard
 */

interface ComplianceAlert {
  id: string
  alert_type: string
  entity_type: string
  entity_id: string
  entity_name: string
  title: string
  description: string
  due_date: string
  days_until_due: number
  severity: 'critical' | 'warning' | 'info'
  created_at: string
  resolved_at: string | null
}

interface Props {
  maxItems?: number
  showSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 5,
  showSummary: true
})

const { data, pending, error, refresh } = await useFetch('/api/compliance/alerts', {
  query: { limit: props.maxItems }
})

const severityStyles = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700'
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-700'
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700'
  }
}

function formatDaysUntil(days: number): string {
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `${days} days`
  if (days <= 30) return `${Math.ceil(days / 7)} weeks`
  return `${Math.ceil(days / 30)} months`
}

async function resolveAlert(alertId: string) {
  try {
    await $fetch('/api/compliance/resolve', {
      method: 'POST',
      body: { alertId }
    })
    refresh()
  } catch (e) {
    console.error('Failed to resolve alert:', e)
  }
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-lg">⚠️</span>
        <h3 class="font-semibold text-slate-800">Compliance Alerts</h3>
      </div>
      <button 
        @click="refresh()"
        class="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
        :class="{ 'animate-spin': pending }"
      >
        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>
    
    <!-- Summary Badges -->
    <div v-if="showSummary && data?.summary" class="px-4 py-2 flex gap-2 border-b border-slate-100">
      <span 
        v-if="data.summary.critical > 0"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"
      >
        {{ data.summary.critical }} Critical
      </span>
      <span 
        v-if="data.summary.warning > 0"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
      >
        {{ data.summary.warning }} Warning
      </span>
      <span 
        v-if="data.summary.info > 0"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
      >
        {{ data.summary.info }} Info
      </span>
      <span 
        v-if="data.total === 0"
        class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"
      >
        ✓ All Clear
      </span>
    </div>
    
    <!-- Loading State -->
    <div v-if="pending" class="p-8 text-center text-slate-400">
      <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="p-4 text-center text-red-500 text-sm">
      Failed to load alerts
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!data?.alerts?.length" class="p-8 text-center">
      <span class="text-3xl">✅</span>
      <p class="mt-2 text-slate-500 text-sm">No upcoming compliance deadlines</p>
    </div>
    
    <!-- Alerts List -->
    <div v-else class="divide-y divide-slate-100">
      <div 
        v-for="alert in data.alerts" 
        :key="alert.id"
        class="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
        :class="severityStyles[alert.severity].bg"
      >
        <!-- Severity Icon -->
        <div 
          class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          :class="severityStyles[alert.severity].icon"
        >
          <span v-if="alert.severity === 'critical'">🚨</span>
          <span v-else-if="alert.severity === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm truncate" :class="severityStyles[alert.severity].text">
              {{ alert.entity_name }}
            </span>
            <span 
              class="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium"
              :class="severityStyles[alert.severity].badge"
            >
              {{ formatDaysUntil(alert.days_until_due) }}
            </span>
          </div>
          <p class="text-xs text-slate-600 truncate mt-0.5">
            {{ alert.title }}
          </p>
        </div>
        
        <!-- Resolve Button -->
        <button 
          @click="resolveAlert(alert.id)"
          class="shrink-0 p-1.5 rounded-lg hover:bg-white/50 transition-colors text-slate-400 hover:text-green-600"
          title="Mark as resolved"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- View All Link -->
    <div v-if="data?.total && data.total > maxItems" class="px-4 py-2 border-t border-slate-100 bg-slate-50">
      <NuxtLink 
        to="/admin/compliance" 
        class="text-xs text-green-600 hover:text-green-700 font-medium"
      >
        View all {{ data.total }} alerts →
      </NuxtLink>
    </div>
  </div>
</template>
