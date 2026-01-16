/**
 * ApexCharts Plugin for Nuxt
 * 
 * Registers vue3-apexcharts globally for use in components.
 */

import VueApexCharts from 'vue3-apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueApexCharts)
})
