<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-8 text-center" elevation="8">
          <template v-if="loading">
            <v-progress-circular
              :size="64"
              :width="6"
              indeterminate
              color="primary"
              class="mb-4"
            />
            <h2 class="text-h6 mb-2">Verifying your account...</h2>
            <p class="text-body-2 text-medium-emphasis">
              Please wait while we set up your access.
            </p>
          </template>
          
          <template v-else-if="error">
            <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
            <h2 class="text-h6 mb-2">Verification Failed</h2>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ error }}
            </p>
            <v-btn color="primary" to="/auth/login" variant="flat">
              Go to Login
            </v-btn>
          </template>
          
          <template v-else-if="success">
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
            <h2 class="text-h6 mb-2">Welcome to Green Dog!</h2>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Your account has been verified. Redirecting you now...
            </p>
            <v-progress-linear indeterminate color="primary" class="mb-4" />
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()
const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const success = ref(false)

onMounted(async () => {
  await handleCallback()
})

async function handleCallback() {
  try {
    // Get the URL hash for auth tokens (Supabase uses hash-based redirects)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type') || route.query.type
    
    // Also check query params for invite type
    const queryType = route.query.type as string
    const profileId = route.query.profileId as string
    
    console.log('[Auth Callback] Processing callback:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      type: type || queryType,
      profileId 
    })

    // If we have tokens in the hash, set the session
    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError) {
        console.error('[Auth Callback] Session error:', sessionError)
        error.value = 'Failed to establish session. Please try logging in again.'
        loading.value = false
        return
      }
    }

    // Get the current session
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
    
    if (getSessionError || !session) {
      console.error('[Auth Callback] No session:', getSessionError)
      error.value = 'Your invitation link may have expired. Please contact your administrator for a new invite.'
      loading.value = false
      return
    }

    console.log('[Auth Callback] Session established for:', session.user.email)

    // If this was an invite callback, we may need to link the profile
    if ((type === 'invite' || queryType === 'invite') && profileId) {
      console.log('[Auth Callback] Linking invite to profile:', profileId)
      
      // Update the profile with the auth user ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          auth_user_id: session.user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .is('auth_user_id', null) // Only update if not already linked
      
      if (updateError) {
        console.warn('[Auth Callback] Profile link warning:', updateError)
        // Don't fail - the profile might already be linked from the invite process
      }

      // Also update the employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', profileId)
        .single()
      
      if (employee) {
        await supabase
          .from('employees')
          .update({
            needs_user_account: false,
            user_created_at: new Date().toISOString(),
            onboarding_status: 'completed'
          })
          .eq('id', employee.id)
      }
    }

    success.value = true
    loading.value = false
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/')
    }, 1500)
    
  } catch (err: any) {
    console.error('[Auth Callback] Unexpected error:', err)
    error.value = err.message || 'An unexpected error occurred. Please try again.'
    loading.value = false
  }
}
</script>
