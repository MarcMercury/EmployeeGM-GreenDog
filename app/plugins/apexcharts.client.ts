/**
 * ApexCharts Plugin for Nuxt
 * 
 * Lazily registers vue3-apexcharts — the heavy library is only loaded
 * when a component actually uses <apexchart>. This avoids adding ~500KB
 * to the initial bundle for pages that don't use charts.
 */

import { defineAsyncComponent } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  // Register as an async component so the chunk is code-split and lazy-loaded
  nuxtApp.vueApp.component('apexchart', defineAsyncComponent(() =>
    import('vue3-apexcharts').then(m => m.default)
  ))
})
