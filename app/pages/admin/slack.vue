<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const { showSuccess, showError } = useToast()
const supabase = useSupabaseClient()

// Slack Sync composable
const { 
  syncStatus, 
  conflicts, 
  slackUsers,
  triggers,
  isLoading: syncLoading, 
  isSyncing,
  fetchSyncStatus,
  runSync,
  fetchConflicts,
  resolveConflict,
  linkEmployee,
  fetchSlackUsers,
  fetchTriggers,
  updateTrigger
} = useSlackSync()

// Active tab
const activeTab = ref('channels')

// State
const loading = ref(true)
const saving = ref(false)
const testingConnection = ref(false)
const testResult = ref<{ ok: boolean; message: string } | null>(null)

// Slack channels
const channels = ref<Array<{ id: string; name: string; displayName: string }>>([])
const channelsLoading = ref(false)

// Settings form
const settings = ref({
  visitor_announcements_channel: '',
  time_off_requests_channel: '',
  ce_events_channel: '',
  schedule_changes_channel: '',
  general_notifications_channel: ''
})

// Conflict resolution dialog
const conflictDialog = ref(false)
const selectedConflict = ref<any>(null)
const selectedSlackUser = ref<string | null>(null)
const resolutionNotes = ref('')

// Manual link dialog
const manualLinkDialog = ref(false)
const manualLinkEmployeeId = ref<string | null>(null)
const manualLinkEmail = ref('')

// Load settings and channels on mount
onMounted(async () => {
  await Promise.all([
    loadSettings(),
    loadChannels(),
    fetchSyncStatus(),
    fetchConflicts(),
    fetchTriggers()
  ])
  loading.value = false
})

// Watch for tab changes to load data
watch(activeTab, async (tab) => {
  if (tab === 'sync') {
    await fetchSyncStatus()
    await fetchConflicts()
  } else if (tab === 'notifications') {
    await fetchTriggers()
  }
})

async function loadSettings() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'slack_%')
    
    if (error) throw error
    
    // Map settings to form
    data?.forEach((setting: { key: string; value: string }) => {
      const key = setting.key.replace('slack_', '') as keyof typeof settings.value
      if (key in settings.value) {
        settings.value[key] = setting.value || ''
      }
    })
  } catch (error) {
    console.error('Failed to load Slack settings:', error)
  }
}

async function loadChannels() {
  channelsLoading.value = true
  try {
    const response = await $fetch<{ ok: boolean; channels: any[]; error?: string }>('/api/slack/channels')
    if (response.ok) {
      channels.value = response.channels
    } else {
      console.error('Failed to load channels:', response.error)
    }
  } catch (error) {
    console.error('Failed to load Slack channels:', error)
  } finally {
    channelsLoading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  
  try {
    // Upsert each setting
    for (const [key, value] of Object.entries(settings.value)) {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: `slack_${key}`,
          value: value || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      
      if (error) throw error
    }
    
    showSuccess('Slack settings saved!')
  } catch (error: any) {
    console.error('Failed to save settings:', error)
    showError(error.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testingConnection.value = true
  testResult.value = null
  
  try {
    // Test by fetching channels
    const response = await $fetch<{ ok: boolean; channels?: any[]; error?: string }>('/api/slack/channels')
    
    if (response.ok) {
      testResult.value = {
        ok: true,
        message: `Connected! Found ${response.channels?.length || 0} channels.`
      }
    } else {
      testResult.value = {
        ok: false,
        message: response.error || 'Connection failed'
      }
    }
  } catch (error: any) {
    testResult.value = {
      ok: false,
      message: error.message || 'Connection failed'
    }
  } finally {
    testingConnection.value = false
  }
}

async function sendTestMessage() {
  if (!settings.value.general_notifications_channel) {
    showError('Please select a General Notifications channel first')
    return
  }
  
  try {
    const response = await $fetch<{ ok: boolean; error?: string }>('/api/slack/send', {
      method: 'POST',
      body: {
        type: 'channel',
        channel: settings.value.general_notifications_channel,
        text: '🧪 *Test Message from Employee GM*\n\nIf you see this, Slack integration is working correctly! 🎉'
      }
    })
    
    if (response.ok) {
      showSuccess('Test message sent!')
    } else {
      showError(response.error || 'Failed to send test message')
    }
  } catch (error: any) {
    showError(error.message || 'Failed to send test message')
  }
}

// Sync functions
async function handleRunSync() {
  const result = await runSync(true)
  if (result.ok) {
    showSuccess(`Sync completed! ${result.summary?.matched_count || 0} users matched.`)
  } else {
    showError(result.error || 'Sync failed')
  }
}

function openConflictDialog(conflict: any) {
  selectedConflict.value = conflict
  selectedSlackUser.value = conflict.slack_user_id
  resolutionNotes.value = ''
  conflictDialog.value = true
}

async function handleResolveConflict(action: 'link' | 'ignore' | 'manual_link') {
  if (!selectedConflict.value) return
  
  const result = await resolveConflict(
    selectedConflict.value.id,
    action,
    selectedSlackUser.value || undefined,
    resolutionNotes.value
  )
  
  if (result.ok) {
    showSuccess('Conflict resolved')
    conflictDialog.value = false
  } else {
    showError(result.error || 'Failed to resolve conflict')
  }
}

async function handleLinkEmployee() {
  if (!manualLinkEmployeeId.value || !manualLinkEmail.value) return
  
  const result = await linkEmployee(manualLinkEmployeeId.value, undefined, manualLinkEmail.value)
  
  if (result.ok) {
    showSuccess('Employee linked to Slack')
    manualLinkDialog.value = false
    manualLinkEmployeeId.value = null
    manualLinkEmail.value = ''
  } else {
    showError(result.error || 'Failed to link employee')
  }
}

async function handleToggleTrigger(trigger: any) {
  const result = await updateTrigger(trigger.id, { is_active: !trigger.is_active })
  if (result.ok) {
    showSuccess(`${trigger.name} ${!trigger.is_active ? 'enabled' : 'disabled'}`)
  } else {
    showError(result.error || 'Failed to update trigger')
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleString()
}

function getConflictIcon(type: string) {
  switch (type) {
    case 'no_match': return 'mdi-account-question'
    case 'multiple_matches': return 'mdi-account-multiple'
    case 'email_mismatch': return 'mdi-email-alert'
    case 'deactivated_in_slack': return 'mdi-account-off'
    default: return 'mdi-alert-circle'
  }
}

function getConflictColor(type: string) {
  switch (type) {
    case 'no_match': return 'warning'
    case 'deactivated_in_slack': return 'error'
    default: return 'info'
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" to="/admin/global-settings" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Slack Integration</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Manage Slack synchronization and notifications
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6">
      <v-tab value="channels">
        <v-icon start>mdi-pound</v-icon>
        Channels
      </v-tab>
      <v-tab value="sync">
        <v-icon start>mdi-sync</v-icon>
        User Sync
        <v-badge
          v-if="syncStatus?.pendingConflicts"
          :content="syncStatus.pendingConflicts"
          color="warning"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="notifications">
        <v-icon start>mdi-bell</v-icon>
        Notification Triggers
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Channels Tab -->
      <v-window-item value="channels">
        <v-row>
          <v-col cols="12" md="8">
            <!-- Connection Status -->
            <v-card class="mb-6">
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-slack</v-icon>
                Connection Status
              </v-card-title>
              
              <v-card-text>
                <div class="d-flex align-center gap-4">
                  <v-btn
                    :loading="testingConnection"
                    variant="outlined"
                    prepend-icon="mdi-connection"
                    @click="testConnection"
                  >
                    Test Connection
                  </v-btn>
                  
                  <v-alert
                    v-if="testResult"
                    :type="testResult.ok ? 'success' : 'error'"
                    density="compact"
                    class="flex-grow-1 mb-0"
                  >
                    {{ testResult.message }}
                  </v-alert>
                </div>
              </v-card-text>
            </v-card>

            <!-- Channel Configuration -->
            <v-card :loading="loading">
              <v-card-title>
                <v-icon class="mr-2">mdi-cog</v-icon>
                Notification Channels
              </v-card-title>
              
              <v-card-subtitle>
                Select which Slack channels receive different types of notifications
              </v-card-subtitle>
              
              <v-card-text class="pt-4">
                <v-row>
                  <v-col cols="12">
                    <v-select
                      v-model="settings.visitor_announcements_channel"
                      :items="channels"
                      item-title="displayName"
                      item-value="id"
                      label="Visitor Announcements"
                      hint="New visitors (interns, externs, students) will be announced here"
                      persistent-hint
                      variant="outlined"
                      :loading="channelsLoading"
                      clearable
                      prepend-inner-icon="mdi-account-group"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-select
                      v-model="settings.time_off_requests_channel"
                      :items="channels"
                      item-title="displayName"
                      item-value="id"
                      label="Time-Off Requests"
                      hint="Managers will be notified here when time-off requests are submitted"
                      persistent-hint
                      variant="outlined"
                      :loading="channelsLoading"
                      clearable
                      prepend-inner-icon="mdi-calendar-clock"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-select
                      v-model="settings.ce_events_channel"
                      :items="channels"
                      item-title="displayName"
                      item-value="id"
                      label="CE Events"
                      hint="New continuing education events will be announced here"
                      persistent-hint
                      variant="outlined"
                      :loading="channelsLoading"
                      clearable
                      prepend-inner-icon="mdi-school"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-select
                      v-model="settings.schedule_changes_channel"
                      :items="channels"
                      item-title="displayName"
                      item-value="id"
                      label="Schedule Changes"
                      hint="Shift changes and schedule updates will be posted here"
                      persistent-hint
                      variant="outlined"
                      :loading="channelsLoading"
                      clearable
                      prepend-inner-icon="mdi-calendar-edit"
                    />
                  </v-col>
                  
                  <v-col cols="12">
                    <v-select
                      v-model="settings.general_notifications_channel"
                      :items="channels"
                      item-title="displayName"
                      item-value="id"
                      label="General Notifications"
                      hint="General app notifications and alerts"
                      persistent-hint
                      variant="outlined"
                      :loading="channelsLoading"
                      clearable
                      prepend-inner-icon="mdi-bell"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
              
              <v-divider />
              
              <v-card-actions class="pa-4">
                <v-btn
                  variant="outlined"
                  prepend-icon="mdi-send"
                  :disabled="!settings.general_notifications_channel"
                  @click="sendTestMessage"
                >
                  Send Test Message
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  :loading="saving"
                  prepend-icon="mdi-content-save"
                  @click="saveSettings"
                >
                  Save Settings
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <!-- Info Card -->
            <v-card variant="tonal" color="info">
              <v-card-title>
                <v-icon class="mr-2">mdi-information</v-icon>
                About Slack Notifications
              </v-card-title>
              
              <v-card-text>
                <p class="mb-3">
                  Employee GM can automatically post notifications to Slack when:
                </p>
                
                <v-list density="compact" class="bg-transparent">
                  <v-list-item prepend-icon="mdi-account-plus">
                    New visitors are added
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-calendar-clock">
                    Time-off requests are submitted
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-school">
                    CE events are created
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-calendar-edit">
                    Schedules are changed
                  </v-list-item>
                </v-list>
                
                <v-alert type="warning" density="compact" variant="tonal" class="mt-4">
                  Make sure the Employee GM bot has been added to the selected channels.
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- User Sync Tab -->
      <v-window-item value="sync">
        <v-row>
          <v-col cols="12" md="8">
            <!-- Sync Status Card -->
            <v-card class="mb-6">
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-sync</v-icon>
                Synchronization Status
                <v-spacer />
                <v-btn
                  color="primary"
                  :loading="isSyncing"
                  prepend-icon="mdi-sync"
                  @click="handleRunSync"
                >
                  Run Sync Now
                </v-btn>
              </v-card-title>
              
              <v-card-text>
                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-primary">
                        {{ syncStatus?.stats?.total || 0 }}
                      </div>
                      <div class="text-caption text-grey">Total Employees</div>
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-success">
                        {{ syncStatus?.stats?.linked || 0 }}
                      </div>
                      <div class="text-caption text-grey">Linked</div>
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-warning">
                        {{ syncStatus?.stats?.pending_review || 0 }}
                      </div>
                      <div class="text-caption text-grey">Pending Review</div>
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-center">
                      <div class="text-h4 font-weight-bold text-error">
                        {{ syncStatus?.stats?.deactivated || 0 }}
                      </div>
                      <div class="text-caption text-grey">Deactivated</div>
                    </div>
                  </v-col>
                </v-row>
                
                <v-divider class="my-4" />
                
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-clock-outline</v-icon>
                  <span class="text-body-2">
                    Last Sync: {{ formatDate(syncStatus?.lastSync?.completed_at) }}
                  </span>
                  <v-chip
                    v-if="syncStatus?.lastSync?.status"
                    :color="syncStatus.lastSync.status === 'success' ? 'success' : 'warning'"
                    size="small"
                    class="ml-2"
                  >
                    {{ syncStatus.lastSync.status }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <!-- Conflicts Card -->
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="warning">mdi-alert-circle</v-icon>
                Pending Conflicts
                <v-badge
                  v-if="conflicts.length"
                  :content="conflicts.length"
                  color="warning"
                  inline
                  class="ml-2"
                />
              </v-card-title>
              
              <v-card-text v-if="conflicts.length === 0">
                <v-alert type="success" variant="tonal" density="compact">
                  No conflicts! All users are properly synchronized.
                </v-alert>
              </v-card-text>
              
              <v-list v-else lines="two">
                <v-list-item
                  v-for="conflict in conflicts"
                  :key="conflict.id"
                  @click="openConflictDialog(conflict)"
                >
                  <template #prepend>
                    <v-avatar :color="getConflictColor(conflict.conflict_type)" size="40">
                      <v-icon color="white">{{ getConflictIcon(conflict.conflict_type) }}</v-icon>
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title>
                    {{ conflict.employee?.first_name }} {{ conflict.employee?.last_name }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ conflict.employee_email || 'No email' }} • {{ conflict.conflict_type.replace(/_/g, ' ') }}
                  </v-list-item-subtitle>
                  
                  <template #append>
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                    >
                      <v-icon>mdi-chevron-right</v-icon>
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <!-- Recent Sync Logs -->
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-history</v-icon>
                Recent Sync Logs
              </v-card-title>
              
              <v-list density="compact">
                <v-list-item
                  v-for="log in syncStatus?.recentLogs || []"
                  :key="log.id"
                >
                  <template #prepend>
                    <v-icon
                      :color="log.status === 'success' ? 'success' : log.status === 'failed' ? 'error' : 'warning'"
                      size="small"
                    >
                      {{ log.status === 'success' ? 'mdi-check-circle' : log.status === 'failed' ? 'mdi-close-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                  </template>
                  
                  <v-list-item-title class="text-body-2">
                    {{ log.sync_type }} • {{ log.matched_count }} matched
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-caption">
                    {{ formatDate(log.started_at) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card>
            
            <!-- Sync Info -->
            <v-card variant="tonal" color="info" class="mt-4">
              <v-card-title class="text-body-1">
                <v-icon class="mr-2">mdi-information</v-icon>
                About User Sync
              </v-card-title>
              
              <v-card-text>
                <p class="mb-2 text-body-2">
                  Synchronization matches Employee GM users with Slack accounts using email addresses.
                </p>
                <ul class="text-body-2 ml-4">
                  <li><strong>Linked:</strong> Successfully matched</li>
                  <li><strong>Pending:</strong> Needs manual review</li>
                  <li><strong>Deactivated:</strong> Slack account inactive</li>
                </ul>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Notification Triggers Tab -->
      <v-window-item value="notifications">
        <v-row>
          <v-col cols="12" md="8">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="primary">mdi-bell-cog</v-icon>
                Notification Triggers
              </v-card-title>
              
              <v-card-subtitle>
                Configure which events trigger Slack notifications
              </v-card-subtitle>
              
              <v-list lines="three">
                <v-list-item
                  v-for="trigger in triggers"
                  :key="trigger.id"
                >
                  <template #prepend>
                    <v-switch
                      :model-value="trigger.is_active"
                      color="primary"
                      hide-details
                      @update:model-value="handleToggleTrigger(trigger)"
                    />
                  </template>
                  
                  <v-list-item-title>{{ trigger.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ trigger.description }}
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="mt-1">
                    <v-chip size="x-small" class="mr-1" v-if="trigger.channel_target">
                      <v-icon start size="x-small">mdi-pound</v-icon>
                      {{ trigger.channel_target }}
                    </v-chip>
                    <v-chip size="x-small" color="info" v-if="trigger.send_dm">
                      <v-icon start size="x-small">mdi-message</v-icon>
                      DM
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card variant="tonal" color="info">
              <v-card-title class="text-body-1">
                <v-icon class="mr-2">mdi-information</v-icon>
                About Triggers
              </v-card-title>
              
              <v-card-text class="text-body-2">
                <p class="mb-2">
                  Notification triggers define when Employee GM sends messages to Slack.
                </p>
                <p>
                  Enable or disable triggers to control which events generate notifications. 
                  Messages can be sent to channels, direct messages, or both.
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Conflict Resolution Dialog -->
    <v-dialog v-model="conflictDialog" max-width="600">
      <v-card v-if="selectedConflict">
        <v-card-title>
          <v-icon class="mr-2" :color="getConflictColor(selectedConflict.conflict_type)">
            {{ getConflictIcon(selectedConflict.conflict_type) }}
          </v-icon>
          Resolve Conflict
        </v-card-title>
        
        <v-card-text>
          <v-alert 
            :type="getConflictColor(selectedConflict.conflict_type) as any" 
            variant="tonal" 
            density="compact"
            class="mb-4"
          >
            {{ selectedConflict.conflict_type.replace(/_/g, ' ').toUpperCase() }}
          </v-alert>
          
          <div class="mb-4">
            <div class="text-subtitle-2 mb-1">Employee</div>
            <div class="text-body-1">
              {{ selectedConflict.employee?.first_name }} {{ selectedConflict.employee?.last_name }}
            </div>
            <div class="text-body-2 text-grey">
              {{ selectedConflict.employee_email || 'No email' }}
            </div>
          </div>
          
          <div class="mb-4" v-if="selectedConflict.slack_user_id">
            <div class="text-subtitle-2 mb-1">Slack User Found</div>
            <div class="text-body-2">
              ID: {{ selectedConflict.slack_user_id }}<br>
              {{ selectedConflict.slack_display_name || selectedConflict.slack_email }}
            </div>
          </div>
          
          <v-textarea
            v-model="resolutionNotes"
            label="Resolution Notes (optional)"
            variant="outlined"
            rows="2"
          />
        </v-card-text>
        
        <v-card-actions class="pa-4">
          <v-btn
            variant="outlined"
            color="error"
            @click="handleResolveConflict('ignore')"
          >
            Ignore
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="conflictDialog = false">
            Cancel
          </v-btn>
          <v-btn
            v-if="selectedConflict.slack_user_id"
            color="primary"
            @click="handleResolveConflict('link')"
          >
            Link User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
