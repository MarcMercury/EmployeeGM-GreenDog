<template>
  <div class="login-container">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Login Card -->
    <v-card class="login-card mx-auto" max-width="480" rounded="xl" elevation="24">
      <!-- Logo Section with Animation -->
      <div class="logo-section">
        <div class="paw-container">
          <div class="paw-glow"></div>
          <v-avatar color="white" size="100" class="paw-avatar">
            <v-icon size="56" class="paw-icon">mdi-paw</v-icon>
          </v-avatar>
          <div class="paw-ring"></div>
        </div>
        
        <h1 class="main-title">Green Dog Dental</h1>
        <h2 class="sub-title">Veterinary Center</h2>
        <div class="divider-line"></div>
        <p class="app-name">EmployeeGM</p>
      </div>

      <!-- Form Section -->
      <v-card-text class="form-section">
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
            bg-color="white"
            class="mb-4 login-field"
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
            bg-color="white"
            @click:append-inner="showPassword = !showPassword"
            @keyup.enter="handleSubmit"
            class="mb-2 login-field"
          />

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mb-4 error-alert"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <v-btn
            type="submit"
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
        </v-form>

        <!-- Demo Section -->
        <div class="demo-section">
          <v-divider class="mb-4">
            <span class="divider-text">Quick Access</span>
          </v-divider>
          <v-btn 
            variant="outlined" 
            color="secondary"
            block
            size="large"
            @click="fillDemoCredentials"
            class="demo-btn"
          >
            <v-icon start>mdi-account-key</v-icon>
            Use Demo Account
          </v-btn>
        </div>

        <!-- Footer -->
        <div class="login-footer">
          <p>Need help? Contact your administrator</p>
        </div>
      </v-card-text>
    </v-card>

    <!-- Floating paw prints -->
    <div class="floating-paws">
      <v-icon v-for="i in 6" :key="i" :class="`floating-paw paw-${i}`" size="24">
        mdi-paw
      </v-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const router = useRouter()

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
  form.email = 'marc.h.mercury@gmail.com'
  form.password = 'admin123'
}

async function handleSubmit() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

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

    if (authError) throw authError

    if (data.user) {
      await router.push('/')
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
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 25%, #388E3C 50%, #43A047 75%, #4CAF50 100%);
}

/* Animated Background */
.animated-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
  animation: float 15s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #81C784 0%, transparent 70%);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #A5D6A7 0%, transparent 70%);
  bottom: -150px;
  right: -100px;
  animation-delay: -5s;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #C8E6C9 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(20px, 10px) scale(1.02); }
}

/* Login Card */
.login-card {
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  overflow: visible !important;
}

/* Logo Section */
.logo-section {
  background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%);
  padding: 40px 24px 32px;
  text-align: center;
  position: relative;
  overflow: visible;
}

.paw-container {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.paw-avatar {
  position: relative;
  z-index: 3;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.paw-icon {
  color: #2E7D32;
  animation: pawBounce 2s ease-in-out infinite;
}

@keyframes pawBounce {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(-5deg); }
  50% { transform: scale(1) rotate(0deg); }
  75% { transform: scale(1.1) rotate(5deg); }
}

.paw-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  z-index: 1;
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
}

.paw-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130px;
  height: 130px;
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  animation: ringPulse 2s ease-out infinite;
}

@keyframes ringPulse {
  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}

.main-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.5px;
}

.sub-title {
  font-size: 1.1rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  margin: 4px 0 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.divider-line {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
  margin: 0 auto 12px;
  border-radius: 2px;
}

.app-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin: 0;
}

/* Form Section */
.form-section {
  padding: 32px 28px !important;
}

.login-field :deep(.v-field) {
  border-radius: 12px;
}

.login-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0.3;
}

.login-field :deep(.v-field--focused .v-field__outline) {
  --v-field-border-width: 2px;
}

.login-btn {
  border-radius: 12px !important;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: none;
  font-size: 1.1rem;
  box-shadow: 0 4px 20px rgba(46, 125, 50, 0.4);
  transition: all 0.3s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(46, 125, 50, 0.5);
}

.demo-section {
  margin-top: 8px;
}

.divider-text {
  color: #9e9e9e;
  font-size: 0.85rem;
  padding: 0 12px;
  background: white;
}

.demo-btn {
  border-radius: 12px !important;
  text-transform: none;
  font-weight: 500;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.login-footer p {
  color: #9e9e9e;
  font-size: 0.85rem;
  margin: 0;
}

/* Floating Paws */
.floating-paws {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.floating-paw {
  position: absolute;
  color: rgba(255, 255, 255, 0.15);
  animation: floatPaw 20s linear infinite;
}

.paw-1 { top: 10%; left: 10%; animation-delay: 0s; }
.paw-2 { top: 20%; right: 15%; animation-delay: -3s; }
.paw-3 { bottom: 30%; left: 8%; animation-delay: -6s; }
.paw-4 { bottom: 15%; right: 10%; animation-delay: -9s; }
.paw-5 { top: 50%; left: 5%; animation-delay: -12s; }
.paw-6 { top: 40%; right: 8%; animation-delay: -15s; }

@keyframes floatPaw {
  0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
  10% { opacity: 0.3; }
  90% { opacity: 0.3; }
  100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
}

/* Error Alert */
.error-alert {
  border-radius: 12px;
}

/* Responsive */
@media (max-width: 500px) {
  .login-card {
    margin: 16px;
  }
  
  .main-title {
    font-size: 1.5rem;
  }
  
  .form-section {
    padding: 24px 20px !important;
  }
}
</style>
