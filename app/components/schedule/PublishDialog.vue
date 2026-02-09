<script setup lang="ts">
import { format, addDays } from 'date-fns'
import type { ScheduleWeek } from '~/types/schedule.types'

const props = defineProps<{
  weekStart: Date
  weekNum: number
  shifts: any[]
  scheduleWeek: ScheduleWeek | null
}>()

const emit = defineEmits<{
  published: []
  notify: [payload: { message: string; color: string }]
}>()

const supabase = useSupabaseClient()
const { locations } = useAppData()

const publishDialog = ref(false)
const isPublishing = ref(false)
const sendSlackNotifications = ref(true)

// Local mutable copy of scheduleWeek for DB operations
const localScheduleWeek = ref<ScheduleWeek | null>(null)

watch(() => props.scheduleWeek, (val) => {
  localScheduleWeek.value = val ? { ...val } : null
}, { immediate: true })

function open() {
  publishDialog.value = true
}

async function confirmPublish() {
  isPublishing.value = true

  try {
    // Ensure we have a schedule_week record
    if (!localScheduleWeek.value?.id) {
      await loadOrCreateScheduleWeek()
    }

    if (!localScheduleWeek.value?.id) {
      throw new Error('Failed to create schedule week record')
    }

    // Link all shifts to this schedule_week
    const { error: linkError } = await supabase
      .from('shifts')
      .update({ schedule_week_id: localScheduleWeek.value.id })
      .is('schedule_week_id', null)
      .gte('start_at', props.weekStart.toISOString())
      .lt('start_at', addDays(props.weekStart, 7).toISOString())

    if (linkError) {
      console.warn('Link error:', linkError)
    }

    // Call RPC to publish (handles status + in-app notifications)
    const { error: rpcError } = await supabase.rpc('publish_schedule_week', {
      p_schedule_week_id: localScheduleWeek.value.id
    })

    if (rpcError) throw rpcError

    // Send Slack notifications if enabled
    if (sendSlackNotifications.value) {
      await sendScheduleSlackNotification()
    }

    emit('notify', { message: `Published ${props.shifts.length} shifts! Employees have been notified.`, color: 'success' })
    publishDialog.value = false
    emit('published')
  } catch (err) {
    console.error('Publish error:', err)
    emit('notify', { message: 'Failed to publish week', color: 'error' })
  } finally {
    isPublishing.value = false
  }
}

// Send Slack notification for published schedule
async function sendScheduleSlackNotification() {
  try {
    const weekLabel = `${format(props.weekStart, 'MMM d')} - ${format(addDays(props.weekStart, 6), 'MMM d, yyyy')}`

    // Get unique employees with shifts this week
    const employeeIds = [...new Set(props.shifts.map(s => s.employee_id).filter(Boolean))]

    await $fetch('/api/slack/notifications/queue', {
      method: 'POST',
      body: {
        triggerType: 'schedule_published',
        channel: '#schedule',
        message: `📅 Schedule Published for ${weekLabel}\n\n${employeeIds.length} team members have shifts scheduled this week. Check your schedule in EmployeeGM!`,
        metadata: {
          week_start: format(props.weekStart, 'yyyy-MM-dd'),
          schedule_week_id: localScheduleWeek.value?.id,
          shift_count: props.shifts.length,
          employee_count: employeeIds.length
        }
      }
    })
  } catch (err) {
    console.warn('Slack notification failed:', err)
    // Don't fail the publish for notification errors
  }
}

// Load or create schedule_week record for current week
async function loadOrCreateScheduleWeek() {
  try {
    // Get primary location (first one)
    const primaryLocation = locations.value?.[0]
    if (!primaryLocation) return

    // Call RPC to get or create
    const { data, error } = await supabase.rpc('get_or_create_schedule_week', {
      p_location_id: primaryLocation.id,
      p_week_start: format(props.weekStart, 'yyyy-MM-dd')
    })

    if (error) {
      console.warn('get_or_create_schedule_week error:', error)
      // Fallback: try direct query
      const { data: existing } = await supabase
        .from('schedule_weeks')
        .select('*')
        .eq('week_start', format(props.weekStart, 'yyyy-MM-dd'))
        .single()

      if (existing) {
        localScheduleWeek.value = existing
      }
      return
    }

    // data is the schedule_week_id UUID
    if (data) {
      const { data: weekData } = await supabase
        .from('schedule_weeks')
        .select('*')
        .eq('id', data)
        .single()

      localScheduleWeek.value = weekData
    }
  } catch (err) {
    console.error('Failed to load schedule week:', err)
  }
}

defineExpose({ open })
</script>

<template>
  <v-dialog v-model="publishDialog" max-width="500">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon color="success" class="mr-2">mdi-send</v-icon>
        Publish Week Schedule
      </v-card-title>
      <v-card-text>
        <p class="mb-3">You are about to publish <strong>{{ shifts.length }}</strong> shifts for:</p>
        <p class="text-subtitle-1 font-weight-bold mb-3">
          Week {{ weekNum }}: {{ format(weekStart, 'MMM d') }} - {{ format(addDays(weekStart, 6), 'MMM d, yyyy') }}
        </p>

        <v-alert type="info" density="compact" variant="tonal" class="mb-4">
          <strong>This will:</strong>
          <ul class="mt-1 mb-0 pl-4">
            <li>Make shifts visible on employee schedules</li>
            <li>Enable attendance tracking for these shifts</li>
            <li>Allow clock-in/out for reliability scoring</li>
            <li>Lock the week status to "published"</li>
          </ul>
        </v-alert>

        <v-divider class="my-3" />

        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-2">Notify team via Slack</div>
            <div class="text-caption text-grey">Post to #schedule channel</div>
          </div>
          <v-switch
            v-model="sendSlackNotifications"
            color="primary"
            hide-details
            density="compact"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="publishDialog = false" :disabled="isPublishing">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          @click="confirmPublish"
          :loading="isPublishing"
        >
          <v-icon start>mdi-send</v-icon>
          Publish Schedule
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
