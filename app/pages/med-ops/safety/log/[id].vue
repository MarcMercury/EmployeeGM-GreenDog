<template>
  <div class="safety-log-detail-page">
    <!-- Back link -->
    <div class="mb-4">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        @click="router.push('/med-ops/safety')"
        class="text-none"
      >
        Back to Safety Logs
      </v-btn>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="d-flex justify-center pa-12">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Not found -->
    <UiEmptyState
      v-else-if="!store.currentLog"
      type="generic"
      title="Log Not Found"
      description="This safety log entry could not be found."
    >
      <template #action>
        <v-btn color="primary" @click="router.push('/med-ops/safety')">
          Back to Safety Logs
        </v-btn>
      </template>
    </UiEmptyState>

    <!-- Detail View -->
    <SafetyLogDetail
      v-else
      :log="store.currentLog"
      :can-review="canManage"
      @review="handleReview"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useSafetyLogStore } from '~/stores/safetyLog'

definePageMeta({
  middleware: ['auth'],
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const store = useSafetyLogStore()
const toast = useToast()
const { can } = usePermissions()
const authStore = useAuthStore()

const canManage = computed(() => can('manage:safety-logs'))

async function handleReview(payload: { status: string; review_notes: string }) {
  try {
    await store.updateLog(store.currentLog!.id, {
      status: payload.status as any,
      review_notes: payload.review_notes,
      reviewed_by: authStore.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    toast.success(`Log ${payload.status === 'reviewed' ? 'reviewed' : 'flagged'} successfully`)
  } catch (err: any) {
    toast.error(err?.message || 'Failed to update log')
  }
}

onMounted(async () => {
  const logId = route.params.id as string
  if (logId) {
    try {
      await store.fetchLog(logId)
    } catch {
      toast.error('Failed to load safety log')
    }
  }
})
</script>

<style scoped>
.safety-log-detail-page {
  max-width: 900px;
}
</style>
