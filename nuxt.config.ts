// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // CSS
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/css/main.css'
  ],

  // Build configuration for Vuetify
  build: {
    transpile: ['vuetify']
  },

  // Modules
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt'
  ],

  // Supabase configuration - handles auth automatically
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      include: undefined,
      exclude: ['/auth/*', '/auth/login', '/auth/register'],
      cookieRedirect: false
    }
  },

  // Runtime config
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },

  // App configuration
  app: {
    head: {
      title: 'Employee GM - Green Dog Dental',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Gamified Veterinary Hospital Management System' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: false // Disable for development
  }
})
