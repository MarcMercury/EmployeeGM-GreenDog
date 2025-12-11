<template>
  <div class="empty-state text-center py-12">
    <!-- Illustration -->
    <div class="empty-illustration mb-6">
      <svg 
        v-if="type === 'employees'" 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="55" fill="currentColor" class="text-grey-lighten-3" opacity="0.3"/>
        <circle cx="60" cy="40" r="16" fill="currentColor" class="text-grey-lighten-1"/>
        <ellipse cx="60" cy="80" rx="28" ry="16" fill="currentColor" class="text-grey-lighten-1"/>
        <circle cx="30" cy="50" r="10" fill="currentColor" class="text-grey-lighten-2" opacity="0.6"/>
        <circle cx="90" cy="50" r="10" fill="currentColor" class="text-grey-lighten-2" opacity="0.6"/>
      </svg>

      <svg 
        v-else-if="type === 'candidates'" 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="55" fill="currentColor" class="text-grey-lighten-3" opacity="0.3"/>
        <rect x="35" y="25" width="50" height="70" rx="4" fill="currentColor" class="text-grey-lighten-1"/>
        <rect x="42" y="35" width="36" height="6" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="42" y="47" width="28" height="4" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="42" y="57" width="36" height="4" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="42" y="67" width="24" height="4" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <circle cx="85" cy="85" r="18" fill="currentColor" class="text-primary" opacity="0.8"/>
        <path d="M85 77V93M77 85H93" stroke="white" stroke-width="3" stroke-linecap="round"/>
      </svg>

      <svg 
        v-else-if="type === 'search'" 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="55" fill="currentColor" class="text-grey-lighten-3" opacity="0.3"/>
        <circle cx="52" cy="52" r="25" stroke="currentColor" class="text-grey-lighten-1" stroke-width="6" fill="none"/>
        <line x1="70" y1="70" x2="90" y2="90" stroke="currentColor" class="text-grey-lighten-1" stroke-width="6" stroke-linecap="round"/>
      </svg>

      <svg 
        v-else-if="type === 'events'" 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="55" fill="currentColor" class="text-grey-lighten-3" opacity="0.3"/>
        <rect x="30" y="30" width="60" height="60" rx="8" fill="currentColor" class="text-grey-lighten-1"/>
        <rect x="30" y="30" width="60" height="16" rx="8" fill="currentColor" class="text-primary" opacity="0.7"/>
        <rect x="40" y="55" width="12" height="12" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="55" y="55" width="12" height="12" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="70" y="55" width="12" height="12" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
        <rect x="40" y="70" width="12" height="12" rx="2" fill="currentColor" class="text-grey-lighten-3"/>
      </svg>

      <v-icon v-else :size="80" color="grey-lighten-1">{{ fallbackIcon }}</v-icon>
    </div>

    <!-- Title -->
    <h3 class="text-h6 font-weight-medium mb-2">{{ title }}</h3>

    <!-- Description -->
    <p class="text-body-2 text-grey mb-6" style="max-width: 320px; margin: 0 auto;">
      {{ description }}
    </p>

    <!-- Action Button -->
    <v-btn
      v-if="actionText"
      :color="actionColor"
      :variant="actionVariant"
      :prepend-icon="actionIcon"
      @click="$emit('action')"
    >
      {{ actionText }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'employees' | 'candidates' | 'search' | 'events' | 'generic'
  title?: string
  description?: string
  actionText?: string
  actionIcon?: string
  actionColor?: string
  actionVariant?: 'flat' | 'outlined' | 'tonal'
  fallbackIcon?: string
}

withDefaults(defineProps<Props>(), {
  type: 'generic',
  title: 'Nothing here yet',
  description: 'Get started by adding your first item.',
  actionText: '',
  actionIcon: 'mdi-plus',
  actionColor: 'primary',
  actionVariant: 'flat',
  fallbackIcon: 'mdi-folder-open-outline'
})

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-illustration svg {
  opacity: 0.9;
}
</style>
