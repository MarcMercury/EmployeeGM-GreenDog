<template>
  <v-card class="mx-auto" max-width="450" rounded="xl" elevation="8">
    <div class="text-center pa-6 pb-4">
      <v-avatar color="primary" size="80" class="mb-4">
        <v-icon size="48" color="white">mdi-paw</v-icon>
      </v-avatar>
      <h1 class="text-h5 font-weight-bold mb-1">Welcome Back!</h1>
      <p class="text-body-2 text-grey">Sign in to Employee GM</p>
    </div>

    <v-card-text class="px-6 pb-6">
      <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          prepend-inner-icon="mdi-email"
          :rules="[rules.required, rules.email]"
          autocomplete="email"
          variant="outlined"
          class="mb-3"
          @keyup.enter="handleSubmit"
        />

        <v-text-field
          v-model="form.password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="[rules.required, rules.minLength]"
          autocomplete="current-password"
          variant="outlined"
          @click:append-inner="showPassword = !showPassword"
          @keyup.enter="handleSubmit"
          class="mb-4"
        />

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="error = ''"
        >
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="isLoading"
          :disabled="isLoading"
          class="mb-4"
          @click="handleSubmit"
        >
          <v-icon start>mdi-login</v-icon>
          Sign In
        </v-btn>

        <div class="text-center text-body-2 text-grey">
          Need access? Contact your administrator
        </div>
      </v-form>

      <!-- Demo credentials for development -->
      <v-divider class="my-4" />
      <div class="text-center">
        <p class="text-caption text-grey mb-2">Demo Account:</p>
        <v-btn 
          size="small" 
          variant="outlined" 
          color="secondary"
          @click="fillDemoCredentials"
        >
          Use Admin Account
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: []  // No auth middleware on login page
})

const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()

const formRef = ref()
const formValid = ref(false)
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

const form = reactive({
  email: '',
  password: ''
})

const rules = {
  required: (v: string) => !!v || 'This field is required',
  email: (v: string) => /.+@.+\..+/.test(v) || 'Please enter a valid email',
  minLength: (v: string) => v.length >= 6 || 'Password must be at least 6 characters'
}

function fillDemoCredentials() {
  form.email = 'Marc.H.Mercury@gmail.com'
  form.password = 'admin123'
}

async function handleSubmit() {
  // Validate form
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  // Check for empty fields
  if (!form.email || !form.password) {
    error.value = 'Please enter email and password'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    })

    if (authError) {
      throw authError
    }

    if (data.user) {
      // Get redirect path from query or default to home
      const redirectTo = route.query.redirect as string || '/'
      await router.push(redirectTo)
    }
  } catch (err: any) {
    console.error('Login error:', err)
    error.value = err.message || 'Sign in failed. Please check your credentials.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
