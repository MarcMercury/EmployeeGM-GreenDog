<template>
  <div class="interviews-page pa-6">
    <v-alert type="info" variant="tonal" class="mb-6">
      <v-alert-title>
        <v-icon start>mdi-information</v-icon>
        Interviews have moved!
      </v-alert-title>
      <p class="mt-2">
        Interview management is now integrated directly into each candidate's profile.
        Click on any candidate in the Candidates page to log and view interviews.
      </p>
    </v-alert>

    <v-card variant="outlined">
      <v-card-text class="text-center pa-8">
        <v-icon size="80" color="primary" class="mb-4">mdi-account-voice</v-icon>
        <h2 class="text-h5 mb-4">Access Interviews from Candidate Profiles</h2>
        <p class="text-body-1 text-grey-darken-1 mb-6">
          To log a new interview or view interview history, go to the Candidates page
          and click on any candidate. You'll find an "Interviews" tab in their profile.
        </p>
        <v-btn color="primary" size="large" to="/recruiting/candidates" prepend-icon="mdi-account-group">
          Go to Candidates
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Quick Stats -->
    <v-card variant="outlined" class="mt-6">
      <v-card-title>Recent Interview Activity</v-card-title>
      <v-card-text>
        <div v-if="loading" class="d-flex justify-center pa-6">
          <v-progress-circular indeterminate />
        </div>
        <template v-else-if="recentInterviews.length > 0">
          <v-list density="compact">
            <v-list-item
              v-for="interview in recentInterviews"
              :key="interview.id"
              :to="`/recruiting/candidates?id=${interview.candidate_id}`"
            >
              <template #prepend>
                <v-avatar :color="getStatusColor(interview.status)" size="36">
                  <span class="text-white text-caption font-weight-bold">
                    {{ interview.candidate?.first_name?.[0] }}{{ interview.candidate?.last_name?.[0] }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title>
                {{ interview.candidate?.first_name }} {{ interview.candidate?.last_name }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ formatInterviewType(interview.interview_type) }} - {{ formatDate(interview.scheduled_at || interview.created_at) }}
              </v-list-item-subtitle>
              <template #append>
                <v-chip size="x-small" :color="getStatusColor(interview.status)" variant="tonal">
                  {{ interview.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </template>
        <div v-else class="text-center text-grey pa-4">
          No recent interviews
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { Interview } from '~/types/recruiting.types'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'management']
})

useHead({
  title: 'Interviews'
})

const client = useSupabaseClient()

const loading = ref(true)
const recentInterviews = ref<Interview[]>([])

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    scheduled: 'info',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'grey',
    no_show: 'error'
  }
  return colors[status] || 'grey'
}

const formatInterviewType = (type: string) => {
  const labels: Record<string, string> = {
    phone_screen: 'Phone Screen',
    video_call: 'Video Call',
    in_person: 'In Person',
    technical: 'Technical',
    working_interview: 'Working Interview',
    panel: 'Panel',
    final: 'Final'
  }
  return labels[type] || type
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Not scheduled'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const fetchRecentInterviews = async () => {
  loading.value = true
  try {
    const { data, error } = await client
      .from('candidate_interviews')
      .select(`
        id,
        candidate_id,
        interview_type,
        scheduled_at,
        created_at,
        status,
        candidate:candidate_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    recentInterviews.value = data || []
  } catch (err) {
    console.error('Failed to fetch interviews:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRecentInterviews()
})
</script>

<style scoped>
.interviews-page {
  max-width: 900px;
  margin: 0 auto;
}
</style>
