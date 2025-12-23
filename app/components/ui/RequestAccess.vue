<script setup lang="ts">
/**
 * RequestAccess Component
 * 
 * Shows a "Request Access" button when user lacks permission
 * Can be used inline or as a blocking overlay
 */

interface Props {
  permission: string
  mode?: 'inline' | 'overlay' | 'card'
  hideIfAllowed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'inline',
  hideIfAllowed: true
})

const { can, showRequestAccess, getFeatureName, requestAccess } = usePermissions()

const hasPermission = computed(() => can(props.permission))
const featureName = computed(() => getFeatureName(props.permission))

const isRequesting = ref(false)
const requestSent = ref(false)
const reason = ref('')
const showDialog = ref(false)

async function submitRequest() {
  isRequesting.value = true
  const success = await requestAccess(props.permission, reason.value)
  isRequesting.value = false
  
  if (success) {
    requestSent.value = true
    showDialog.value = false
  }
}

function openDialog() {
  reason.value = ''
  showDialog.value = true
}
</script>

<template>
  <!-- If user has permission, show slot content -->
  <template v-if="hasPermission">
    <slot />
  </template>
  
  <!-- If user lacks permission, show request access UI -->
  <template v-else-if="showRequestAccess(permission)">
    
    <!-- Inline mode - just a button -->
    <template v-if="mode === 'inline'">
      <v-tooltip :text="`Request access to ${featureName}`">
        <template #activator="{ props: tooltipProps }">
          <v-btn
            v-if="!requestSent"
            v-bind="tooltipProps"
            size="small"
            variant="outlined"
            color="primary"
            prepend-icon="mdi-lock-open-outline"
            :loading="isRequesting"
            @click="openDialog"
          >
            Request Access
          </v-btn>
          <v-chip
            v-else
            color="success"
            size="small"
            variant="tonal"
            prepend-icon="mdi-check-circle"
          >
            Access Requested
          </v-chip>
        </template>
      </v-tooltip>
    </template>
    
    <!-- Overlay mode - blocks content with overlay -->
    <template v-else-if="mode === 'overlay'">
      <div class="request-access-overlay">
        <slot />
        <div class="overlay-content">
          <v-card class="text-center pa-6" max-width="400">
            <v-icon size="64" color="warning" class="mb-4">mdi-lock</v-icon>
            <h3 class="text-h6 mb-2">Access Restricted</h3>
            <p class="text-body-2 text-medium-emphasis mb-4">
              You don't have permission to access <strong>{{ featureName }}</strong>.
            </p>
            <v-btn
              v-if="!requestSent"
              color="primary"
              prepend-icon="mdi-lock-open-outline"
              :loading="isRequesting"
              @click="openDialog"
            >
              Request Access
            </v-btn>
            <v-chip
              v-else
              color="success"
              variant="tonal"
              prepend-icon="mdi-check-circle"
            >
              Access Request Submitted
            </v-chip>
          </v-card>
        </div>
      </div>
    </template>
    
    <!-- Card mode - full card replacement -->
    <template v-else-if="mode === 'card'">
      <v-card variant="outlined" class="text-center pa-8">
        <v-icon size="48" color="grey">mdi-lock-outline</v-icon>
        <h4 class="text-subtitle-1 font-weight-bold mt-4 mb-2">{{ featureName }}</h4>
        <p class="text-body-2 text-medium-emphasis mb-4">
          This feature requires additional permissions.
        </p>
        <v-btn
          v-if="!requestSent"
          variant="tonal"
          color="primary"
          size="small"
          prepend-icon="mdi-lock-open-outline"
          :loading="isRequesting"
          @click="openDialog"
        >
          Request Access
        </v-btn>
        <v-chip
          v-else
          color="success"
          size="small"
          variant="tonal"
          prepend-icon="mdi-check-circle"
        >
          Request Submitted
        </v-chip>
      </v-card>
    </template>
    
    <!-- Request Access Dialog -->
    <v-dialog v-model="showDialog" max-width="450">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-lock-open-outline</v-icon>
          Request Access
        </v-card-title>
        
        <v-card-text>
          <p class="mb-4">
            You're requesting access to <strong>{{ featureName }}</strong>.
            Your request will be sent to an administrator for review.
          </p>
          
          <v-textarea
            v-model="reason"
            label="Reason for request (optional)"
            placeholder="Explain why you need access to this feature..."
            variant="outlined"
            rows="3"
            hide-details
          />
        </v-card-text>
        
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="isRequesting"
            @click="submitRequest"
          >
            Submit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
  
  <!-- No permission and not a requestable feature - hide completely -->
  <template v-else-if="!hideIfAllowed">
    <slot name="fallback">
      <!-- Empty by default -->
    </slot>
  </template>
</template>

<style scoped>
.request-access-overlay {
  position: relative;
}

.request-access-overlay > :first-child {
  filter: blur(4px);
  opacity: 0.5;
  pointer-events: none;
}

.overlay-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
  z-index: 10;
}
</style>
