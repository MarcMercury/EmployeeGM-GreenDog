<template>
  <v-card 
    rounded="lg" 
    class="course-card h-100"
    :class="{ 
      'border-warning': required && !completed,
      'border-success': completed 
    }"
  >
    <!-- Thumbnail -->
    <div class="course-thumbnail">
      <v-img 
        :src="enrollment.course?.thumbnail_url || '/images/course-placeholder.jpg'"
        height="140"
        cover
        class="bg-grey-lighten-3"
      >
        <template #placeholder>
          <div class="d-flex align-center justify-center h-100 bg-grey-lighten-3">
            <v-icon size="48" color="grey-lighten-1">mdi-school</v-icon>
          </div>
        </template>
      </v-img>
      
      <!-- Status Badge -->
      <v-chip 
        class="status-badge"
        size="small"
        :color="statusColor"
        variant="flat"
      >
        <v-icon start size="small">{{ statusIcon }}</v-icon>
        {{ statusText }}
      </v-chip>
      
      <!-- Required Badge -->
      <v-chip 
        v-if="required"
        class="required-badge"
        size="x-small"
        color="warning"
        variant="flat"
      >
        Required
      </v-chip>
    </div>

    <v-card-text class="pb-2">
      <!-- Category -->
      <div class="text-caption text-grey mb-1">
        {{ enrollment.course?.category || 'General' }}
      </div>
      
      <!-- Title -->
      <h3 class="text-subtitle-1 font-weight-bold mb-2 course-title">
        {{ enrollment.course?.title || 'Course' }}
      </h3>
      
      <!-- Duration -->
      <div class="d-flex align-center gap-4 text-caption text-grey mb-3">
        <span>
          <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
          {{ formatDuration(enrollment.course?.duration_minutes) }}
        </span>
        <span v-if="enrollment.due_date">
          <v-icon size="14" class="mr-1">mdi-calendar</v-icon>
          Due {{ formatDate(enrollment.due_date) }}
        </span>
      </div>

      <!-- Progress Bar -->
      <v-progress-linear
        v-if="!completed"
        :model-value="enrollment.progress_percent || 0"
        color="primary"
        height="6"
        rounded
        class="mb-2"
      />
      <div v-if="!completed" class="text-caption text-grey">
        {{ enrollment.progress_percent || 0 }}% complete
      </div>
      
      <!-- Completed Date -->
      <div v-if="completed" class="text-caption text-success">
        <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
        Completed {{ formatDate(enrollment.completed_at) }}
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn 
        v-if="completed"
        variant="text" 
        color="primary"
        @click="$emit('view-certificate', enrollment)"
      >
        <v-icon start>mdi-certificate</v-icon>
        Certificate
      </v-btn>
      <v-btn 
        v-else-if="enrollment.progress_percent > 0"
        variant="flat" 
        color="primary"
        @click="$emit('continue', enrollment)"
      >
        Continue
      </v-btn>
      <v-btn 
        v-else
        variant="flat" 
        color="primary"
        @click="$emit('start', enrollment)"
      >
        Start Course
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  enrollment: any
  required?: boolean
  completed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  completed: false
})

defineEmits<{
  continue: [enrollment: any]
  start: [enrollment: any]
  'view-certificate': [enrollment: any]
}>()

const statusColor = computed(() => {
  if (props.completed) return 'success'
  if (props.enrollment.progress_percent > 0) return 'info'
  return 'grey'
})

const statusIcon = computed(() => {
  if (props.completed) return 'mdi-check-circle'
  if (props.enrollment.progress_percent > 0) return 'mdi-progress-clock'
  return 'mdi-play-circle'
})

const statusText = computed(() => {
  if (props.completed) return 'Completed'
  if (props.enrollment.progress_percent > 0) return 'In Progress'
  return 'Not Started'
})

function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.course-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.course-thumbnail {
  position: relative;
}

.status-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
}

.required-badge {
  position: absolute;
  top: 8px;
  right: 8px;
}

.course-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}

.border-warning {
  border: 2px solid rgb(var(--v-theme-warning));
}

.border-success {
  border: 2px solid rgb(var(--v-theme-success));
}
</style>
