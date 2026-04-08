// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Disable SSR for debugging - fixes hydration issues
  ssr: false,

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
    '@pinia-plugin-persistedstate/nuxt',
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

  // Supabase configuration
  // We disable the module's built-in redirect so our own auth middleware
  // (app/middleware/auth.ts) handles all login redirects — including
  // the emergency admin bypass when Supabase is down.
  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      exclude: ['/auth/*', '/public/*', '/public/**'],
      cookieRedirect: false
    },
    // Map SUPABASE_SERVICE_ROLE_KEY to the key the module expects for serverSupabaseServiceRole()
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  // Runtime config
  runtimeConfig: {
    // Server-only (not exposed to client)
    // Support both naming conventions: SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_SECRET_KEY (legacy Vercel env)
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.service_role,
    slackBotToken: process.env.SLACK_BOT_TOKEN,
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiAdminKey: process.env.OPENAI_ADMIN_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiScheduleModel: process.env.OPENAI_SCHEDULE_MODEL || 'gpt-4-turbo-preview',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL,
    sentryDsn: process.env.SENTRY_DSN,
    cronSecret: process.env.CRON_SECRET,
    ezyvetWebhookSecret: process.env.EZYVET_WEBHOOK_SECRET,
    emergencyAdminSecret: process.env.EMERGENCY_ADMIN_SECRET,
    emergencyAdminEmail: process.env.EMERGENCY_ADMIN_EMAIL,
    emergencyAdminName: process.env.EMERGENCY_ADMIN_NAME || 'Emergency Admin',

    // ── Google APIs (Calendar, Drive, Business, Analytics, Maps) ──
    googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    ga4MeasurementId: process.env.GA4_MEASUREMENT_ID,
    ga4ApiSecret: process.env.GA4_API_SECRET,

    // ── Cal.com ──
    calcomApiKey: process.env.CALCOM_API_KEY,
    calcomBaseUrl: process.env.CALCOM_BASE_URL || 'https://api.cal.com/v1',

    // ── Cronitor ──
    cronitorApiKey: process.env.CRONITOR_API_KEY,

    // ── Clockify ──
    clockifyApiKey: process.env.CLOCKIFY_API_KEY,

    // ── SendGrid ──
    sendgridApiKey: process.env.SENDGRID_API_KEY,

    // ── OneSignal ──
    onesignalAppId: process.env.ONESIGNAL_APP_ID,
    onesignalApiKey: process.env.ONESIGNAL_API_KEY,

    // ── Google Gemini ──
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

    // ── Pinecone ──
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
    pineconeIndexName: process.env.PINECONE_INDEX_NAME || 'employee-gm-knowledge',

    // ── AssemblyAI ──
    assemblyaiApiKey: process.env.ASSEMBLYAI_API_KEY,

    // ── PandaDoc ──
    pandadocApiKey: process.env.PANDADOC_API_KEY,

    // ── Mixpanel ──
    mixpanelToken: process.env.MIXPANEL_TOKEN,

    // ── Mailchimp ──
    mailchimpApiKey: process.env.MAILCHIMP_API_KEY,

    // ── HubSpot ──
    hubspotAccessToken: process.env.HUBSPOT_ACCESS_TOKEN,

    // ── Yelp ──
    yelpApiKey: process.env.YELP_API_KEY,

    // ── Meta (Facebook/Instagram) ──
    metaPageAccessToken: process.env.META_PAGE_ACCESS_TOKEN,
    metaPageId: process.env.META_PAGE_ID,

    // ── Eventbrite ──
    eventbriteToken: process.env.EVENTBRITE_TOKEN,
    eventbriteOrganizationId: process.env.EVENTBRITE_ORGANIZATION_ID,

    // ── Plaid ──
    plaidClientId: process.env.PLAID_CLIENT_ID,
    plaidSecret: process.env.PLAID_SECRET,
    plaidEnv: process.env.PLAID_ENV || 'sandbox',

    // ── Metabase ──
    metabaseUrl: process.env.METABASE_URL,
    metabaseSecretKey: process.env.METABASE_SECRET_KEY,
    metabaseUsername: process.env.METABASE_USERNAME,
    metabasePassword: process.env.METABASE_PASSWORD,

    // ── VetCove ──
    vetcoveApiKey: process.env.VETCOVE_API_KEY,

    // Public (exposed to client)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
      appUrl: process.env.NUXT_PUBLIC_APP_URL || process.env.APP_URL,
      sentryDsn: process.env.SENTRY_DSN,
      onesignalAppId: process.env.ONESIGNAL_APP_ID,
      googleMapsApiKey: process.env.GOOGLE_MAPS_PUBLIC_KEY,
    }
  },

  // App configuration
  app: {
    head: {
      title: 'EmployeeGM - Green Dog Veterinary',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'description', content: 'Team Management System for Green Dog Veterinary' },
        
        // Mobile Web App Meta Tags
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'EmployeeGM' },
        
        // Theme colors
        { name: 'theme-color', content: '#0f172a' }, // slate-900
        { name: 'msapplication-TileColor', content: '#22c55e' }, // green-500
        
        // Prevent phone number detection
        { name: 'format-detection', content: 'telephone=no' },
        
        // Open Graph
        { property: 'og:title', content: 'EmployeeGM - Green Dog Veterinary' },
        { property: 'og:description', content: 'Team Management System' },
        { property: 'og:type', content: 'website' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ]
    }
  },

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: false // Disable for development
  },

  // Nitro configuration for server-side packages
  nitro: {
    externals: {
      // Don't bundle heavy libraries into the Nitro server — keep as external node_modules
      inline: ['xlsx'],
      external: ['unpdf']
    },
    routeRules: {
      '/api/invoices/upload': {
        // Allow larger payloads for file uploads (25 MB — XLS files can be large)
        maxBodySize: 25 * 1024 * 1024,
      },
      '/api/appointments/upload-status': {
        maxBodySize: 25 * 1024 * 1024,
      },
      '/api/appointments/upload-tracking': {
        maxBodySize: 25 * 1024 * 1024,
      },
    },
  },

  // Vite build optimizations
  vite: {
    plugins: [
      // Auto-import Vuetify components for tree-shaking (only used components are bundled)
      (await import('vite-plugin-vuetify')).default({ autoImport: true }),
    ],
    build: {
      // Reduce memory: disable source maps for production
      sourcemap: false,
      // Increase chunk size warning limit (Vuetify is large)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Split heavy dependencies into separate chunks to reduce memory pressure
            if (id.includes('node_modules/vuetify')) return 'vuetify'
            if (id.includes('node_modules/apexcharts') || id.includes('node_modules/vue3-apexcharts')) return 'charts'
            if (id.includes('node_modules/@sentry')) return 'sentry'
            if (id.includes('node_modules/@mdi')) return 'mdi-icons'
          }
        }
      }
    }
  },

  // Route rules
  routeRules: {
    '/marketing/performance-analysis': { redirect: '/marketing/practice-analytics' },
  },
})
