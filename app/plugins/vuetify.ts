import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Tree-shaking: Components and directives are auto-imported by vite-plugin-vuetify.
// Do NOT use `import * as components` — that imports the entire library (~200+ components).

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    ssr: true,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi
      }
    },
    theme: {
      defaultTheme: 'greenDogTheme',
      themes: {
        greenDogTheme: {
          dark: false,
          colors: {
            primary: '#2E7D32',      // Green - Main brand color
            secondary: '#1565C0',    // Blue - Accent
            accent: '#FF6F00',       // Orange - Highlights
            error: '#D32F2F',
            warning: '#FFA000',
            info: '#0288D1',
            success: '#388E3C',
            background: '#F5F5F5',
            surface: '#FFFFFF',
            'on-primary': '#FFFFFF',
            'on-secondary': '#FFFFFF',
            'on-surface': '#212121',
            'on-background': '#212121',
            // Semantic tokens for borders, muted text, and surface variants
            'surface-variant': '#FAFAFA',
            'border': '#E0E0E0',
            'text-secondary': '#666666',
            'muted': '#9E9E9E',
            // Custom skill level colors
            'skill-learning': '#FF9800',    // 0-2: Learning
            'skill-competent': '#2196F3',   // 3-4: Competent
            'skill-mentor': '#4CAF50'       // 5: Mentor
          }
        },
        greenDogDark: {
          dark: true,
          colors: {
            primary: '#4CAF50',
            secondary: '#2196F3',
            accent: '#FF9800',
            error: '#EF5350',
            warning: '#FFB74D',
            info: '#29B6F6',
            success: '#66BB6A',
            background: '#121212',
            surface: '#1E1E1E',
            'on-primary': '#000000',
            'on-secondary': '#000000',
            'on-surface': '#FFFFFF',
            'on-background': '#FFFFFF',
            // Semantic tokens for dark theme
            'surface-variant': '#2C2C2C',
            'border': '#424242',
            'text-secondary': '#B0B0B0',
            'muted': '#757575',
            'skill-learning': '#FFB74D',
            'skill-competent': '#64B5F6',
            'skill-mentor': '#81C784'
          }
        }
      }
    },
    defaults: {
      VBtn: {
        rounded: 'lg',
        elevation: 2
      },
      VCard: {
        rounded: 'lg',
        elevation: 2
      },
      VTextField: {
        variant: 'outlined',
        density: 'comfortable'
      },
      VSelect: {
        variant: 'outlined',
        density: 'comfortable'
      }
    }
  })

  nuxtApp.vueApp.use(vuetify)
})
