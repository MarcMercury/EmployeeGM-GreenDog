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
      <v-form ref="formRef" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          prepend-inner-icon="mdi-email"
          :rules="[rules.required, rules.email]"
          autocomplete="email"
          class="mb-3"
        />

        <v-text-field
          v-model="form.password"
          label="Password"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="[rules.required, rules.minLength]"
          autocomplete="current-password"
          @click:append-inner="showPassword = !showPassword"
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
          class="mb-4"
        >
          Sign In
        </v-btn>

        <div class="text-center">
          <span class="text-body-2 text-grey">Don't have an account? </span>
          <NuxtLink to="/auth/register" class="text-primary font-weight-medium">
            Contact Admin
          </NuxtLink>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const authStore = useAuthStore()
const router = useRouter()

const formRef = ref()
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

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  isLoading.value = true
  error.value = ''

  try {
    await authStore.signIn(form.email, form.password)
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign in failed. Please try again.'
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
