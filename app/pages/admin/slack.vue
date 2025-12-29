<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin']
})

const { showSuccess, showError } = useToast()
const supabase = useSupabaseClient()

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

// Load settings and channels on mount
onMounted(async () => {
  await Promise.all([
    loadSettings(),
    loadChannels()
  ])
  loading.value = false
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
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-btn icon variant="text" to="/admin/settings" class="mr-2">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div>
        <h1 class="text-h4 font-weight-bold">Slack Integration</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Configure Slack channels for notifications
        </p>
      </div>
    </div>

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
  </v-container>
</template>
</script>
