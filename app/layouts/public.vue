<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Simple header with logo -->
    <header class="bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            🐕
          </div>
          <div>
            <h1 class="text-white font-semibold text-lg">GreenDog</h1>
            <p class="text-slate-400 text-xs">Employee Experience Platform</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content area -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Simple footer -->
    <footer class="border-t border-white/10 py-6">
      <div class="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
        <p>&copy; {{ new Date().getFullYear() }} GreenDog. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Public layout - no authentication required, no sidebar
// Used for public-facing pages like lead capture forms
definePageMeta({
  layout: false // This prevents nested layouts
})
</script>

<style scoped>
/* Keep public pages clean and minimal */
</style>
