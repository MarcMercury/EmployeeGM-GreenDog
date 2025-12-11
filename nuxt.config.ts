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
    '@nuxtjs/tailwindcss',
    '@vee-validate/nuxt'
  ],

  // VeeValidate configuration
  veeValidate: {
    autoImports: true,
    componentNames: {
      Form: 'VeeForm',
      Field: 'VeeField',
      FieldArray: 'VeeFieldArray',
      ErrorMessage: 'VeeErrorMessage'
    }
  },

  // Supabase configuration - keep it simple
  supabase: {
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      exclude: ['/auth/*'],
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
