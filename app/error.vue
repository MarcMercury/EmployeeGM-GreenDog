<script setup lang="ts">
/**
 * Global Error Page
 * 
 * Catches unhandled errors and displays a user-friendly message.
 * Mobile-optimized for the web app experience.
 */

import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const handleError = () => clearError({ redirect: '/' })

const errorMessages: Record<number, { title: string; message: string; emoji: string }> = {
  401: {
    title: 'Not Authorized',
    message: 'You need to log in to access this page.',
    emoji: '🔐'
  },
  403: {
    title: 'Access Denied',
    message: "You don't have permission to view this page.",
    emoji: '🚫'
  },
  404: {
    title: 'Page Not Found',
    message: "We couldn't find the page you're looking for.",
    emoji: '🔍'
  },
  500: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again.',
    emoji: '⚙️'
  }
}

const errorInfo = computed(() => {
  const code = props.error?.statusCode || 500
  return errorMessages[code] || {
    title: 'Something Went Wrong',
    message: props.error?.message || 'An unexpected error occurred.',
    emoji: '😕'
  }
})

const isAuthError = computed(() => 
  [401, 403].includes(props.error?.statusCode || 0)
)
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full text-center">
      <!-- Error Icon -->
      <div class="text-7xl sm:text-8xl mb-6 animate-bounce">
        {{ errorInfo.emoji }}
      </div>
      
      <!-- Error Code Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-mono mb-4">
        <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Error {{ error?.statusCode || 500 }}
      </div>
      
      <!-- Title -->
      <h1 class="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
        {{ errorInfo.title }}
      </h1>
      
      <!-- Message -->
      <p class="text-slate-600 mb-8 px-4">
        {{ errorInfo.message }}
      </p>
      
      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="handleError"
          class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-600/25 min-h-[48px]"
        >
          🏠 Go Home
        </button>
        
        <NuxtLink
          v-if="isAuthError"
          to="/auth/login"
          class="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors min-h-[48px] flex items-center justify-center"
        >
          🔑 Log In
        </NuxtLink>
        
        <button
          v-else
          @click="$router.back()"
          class="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-medium transition-colors min-h-[48px]"
        >
          ← Go Back
        </button>
      </div>
      
      <!-- Technical Details (collapsed on mobile) -->
      <details v-if="error?.stack" class="mt-8 text-left">
        <summary class="text-xs text-slate-400 cursor-pointer hover:text-slate-600 text-center">
          Technical Details
        </summary>
        <pre class="mt-4 p-4 bg-slate-900 text-slate-300 rounded-lg text-xs overflow-x-auto max-h-48">{{ error.stack }}</pre>
      </details>
      
      <!-- Brand Footer -->
      <div class="mt-12 text-slate-400 text-sm">
        <span class="text-lg">🐾</span> GDD - Green Dog Veterinary
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-bounce {
  animation: bounce 2s ease-in-out infinite;
}
</style>
