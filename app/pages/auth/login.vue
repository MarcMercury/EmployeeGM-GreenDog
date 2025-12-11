<template>
  <div class="login-container">
    <!-- Animated Background Elements -->
    <div class="floating-paws">
      <div v-for="n in 6" :key="n" :class="`floating-paw paw-${n}`">
        <v-icon color="rgba(255,255,255,0.1)" size="40">mdi-paw</v-icon>
      </div>
    </div>

    <v-card class="login-card mx-auto" max-width="520" rounded="xl" elevation="24">
      <!-- Glowing Header Section -->
      <div class="card-header text-center pa-8 pb-6">
        <!-- Animated Paw Logo -->
        <div class="paw-container mb-4">
          <div class="paw-glow"></div>
          <div class="paw-ring"></div>
          <v-avatar class="paw-avatar" size="100">
            <v-icon size="56" class="paw-icon">mdi-paw</v-icon>
          </v-avatar>
        </div>
        
        <!-- Main Header -->
        <h1 class="main-title mb-2">
          Green Dog Dental
          <span class="title-accent">Veterinary Center</span>
        </h1>
        
        <!-- Sub Header -->
        <div class="sub-header">
          <span class="sub-text">Employee</span>
          <span class="gm-text">GM</span>
        </div>
        
        <p class="welcome-text mt-3">Welcome back! Please sign in to continue.</p>
      </div>

      <v-card-text class="px-8 pb-8">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
          <v-text-field
            v-model="form.email"
            label="Email Address"
            type="email"
            prepend-inner-icon="mdi-email-outline"
            :rules="[rules.required, rules.email]"
            autocomplete="email"
            variant="outlined"
            color="primary"
            class="mb-4 custom-input"
            bg-color="rgba(46,125,50,0.05)"
            @keyup.enter="handleSubmit"
          />

          <v-text-field
            v-model="form.password"
            label="Password"
            :type="showPassword ? 'text' : 'password'"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="[rules.required, rules.minLength]"
            autocomplete="current-password"
            variant="outlined"
            color="primary"
            class="mb-4 custom-input"
            bg-color="rgba(46,125,50,0.05)"
            @click:append-inner="showPassword = !showPassword"
            @keyup.enter="handleSubmit"
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
            type="button"
            color="primary"
            size="x-large"
            block
            :loading="isLoading"
            :disabled="isLoading"
            class="login-btn mb-4"
            @click="handleSubmit"
          >
            <v-icon start>mdi-login-variant</v-icon>
            Sign In
          </v-btn>

          <div class="text-center text-body-2 text-medium-emphasis">
            Need access? Contact your administrator
          </div>
        </v-form>

        <!-- Demo Section -->
        <div class="demo-section mt-6">
          <div class="demo-divider">
            <span>Quick Access</span>
          </div>
          <v-btn 
            variant="tonal" 
            color="secondary"
            block
            class="mt-4"
            @click="fillDemoCredentials"
          >
            <v-icon start>mdi-account-key</v-icon>
            Use Demo Account
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Footer -->
    <p class="footer-text mt-6">
      © 2025 Green Dog Dental Veterinary Center
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()

// Simple state
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
  error.value = ''
  
  if (!form.email || !form.password) {
    error.value = 'Please enter email and password'
    return
  }

  isLoading.value = true

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password
    })

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        error.value = 'Invalid email or password.'
      } else {
        error.value = authError.message || 'Authentication failed'
      }
      isLoading.value = false
      return
    }

    if (data?.session) {
      // Simple redirect - just go to home
      window.location.href = '/'
    } else {
      error.value = 'Login failed. Please try again.'
      isLoading.value = false
    }
  } catch (err: any) {
    error.value = 'An unexpected error occurred.'
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Floating Paws Animation */
.floating-paws {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.floating-paw {
  position: absolute;
  animation: float 20s infinite ease-in-out;
  opacity: 0.5;
}

.paw-1 { top: 10%; left: 10%; animation-delay: 0s; }
.paw-2 { top: 20%; right: 15%; animation-delay: -3s; }
.paw-3 { bottom: 30%; left: 5%; animation-delay: -6s; }
.paw-4 { bottom: 15%; right: 10%; animation-delay: -9s; }
.paw-5 { top: 50%; left: 20%; animation-delay: -12s; }
.paw-6 { top: 70%; right: 25%; animation-delay: -15s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-20px) rotate(5deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(20px) rotate(-5deg); }
}

/* Login Card */
.login-card {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(46, 125, 50, 0.1);
  overflow: visible;
  z-index: 10;
}

/* Card Header */
.card-header {
  background: linear-gradient(135deg, #2E7D32 0%, #1B5E20 50%, #0D3D12 100%);
  position: relative;
  overflow: visible;
}

/* Paw Logo Container */
.paw-container {
  position: relative;
  display: inline-block;
}

.paw-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(76,175,80,0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 2s infinite ease-in-out;
}

.paw-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: spin-ring 8s infinite linear;
}

.paw-avatar {
  background: linear-gradient(145deg, #4CAF50, #2E7D32) !important;
  box-shadow: 
    0 10px 40px rgba(46, 125, 50, 0.4),
    0 0 60px rgba(76, 175, 80, 0.3),
    inset 0 -3px 10px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 2;
}

.paw-icon {
  color: white !important;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  animation: paw-bounce 3s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% { 
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  50% { 
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.3;
  }
}

@keyframes spin-ring {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes paw-bounce {
  0%, 100% { 
    transform: translateY(0) rotate(0deg);
  }
  25% { 
    transform: translateY(-3px) rotate(-5deg);
  }
  50% { 
    transform: translateY(0) rotate(0deg);
  }
  75% { 
    transform: translateY(-3px) rotate(5deg);
  }
}

/* Typography - Desktop-first sizing */
.main-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
}

@media (max-width: 960px) {
  .main-title {
    font-size: 1.75rem;
  }
}

.title-accent {
  display: block;
  font-size: 1.35rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

@media (max-width: 960px) {
  .title-accent {
    font-size: 1.1rem;
  }
}

.sub-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 8px 20px;
  border-radius: 30px;
  backdrop-filter: blur(10px);
  margin-top: 12px;
}

.sub-text {
  font-size: 1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1px;
}

.gm-text {
  font-size: 1.2rem;
  font-weight: 800;
  color: #81C784;
  text-shadow: 0 0 10px rgba(129, 199, 132, 0.5);
}

.welcome-text {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 400;
}

/* Custom Input Styling */
.custom-input :deep(.v-field) {
  border-radius: 12px;
}

.custom-input :deep(.v-field--focused) {
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.2);
}

/* Login Button */
.login-btn {
  border-radius: 12px !important;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  height: 52px !important;
  background: linear-gradient(135deg, #2E7D32, #1B5E20) !important;
  box-shadow: 0 4px 15px rgba(46, 125, 50, 0.4) !important;
  transition: all 0.3s ease !important;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(46, 125, 50, 0.5) !important;
}

/* Demo Section */
.demo-section {
  position: relative;
}

.demo-divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #9e9e9e;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.demo-divider::before,
.demo-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.demo-divider span {
  padding: 0 16px;
}

/* Footer */
.footer-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  text-align: center;
}
</style>
