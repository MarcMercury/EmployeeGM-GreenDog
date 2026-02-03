/**
 * Debug endpoint to test service role connection
 * GET /api/debug/test-service-role
 */
import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    console.log('[test-service-role] Starting test...')
    
    // Test 1: Get user
    const user = await serverSupabaseUser(event)
    console.log('[test-service-role] User:', user?.id || 'not found')
    
    if (!user) {
      return { success: false, error: 'No user session', step: 'user' }
    }
    
    // Test 2: Check environment variables
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl || process.env.SUPABASE_URL
    const serviceRoleKey = config.supabaseServiceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[test-service-role] Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('[test-service-role] Service Role Key:', serviceRoleKey ? 'SET (length: ' + serviceRoleKey.length + ')' : 'MISSING')
    
    if (!supabaseUrl || !serviceRoleKey) {
      return {
        success: false,
        error: 'Missing environment variables',
        supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
        serviceRoleKey: serviceRoleKey ? 'SET' : 'MISSING',
        step: 'env_check'
      }
    }
    
    // Test 3: Create service role client manually
    console.log('[test-service-role] Creating service role client...')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('[test-service-role] Service role client created')
    
    // Test 4: Query profiles
    console.log('[test-service-role] Querying profiles...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email')
      .eq('auth_user_id', user.id)
      .single()
    
    if (profileError) {
      console.error('[test-service-role] Profile error:', profileError)
      return { success: false, error: profileError.message, step: 'profile_query' }
    }
    
    console.log('[test-service-role] Profile found:', profile)
    
    return {
      success: true,
      userId: user.id,
      profile: {
        id: profile.id,
        role: profile.role,
        email: profile.email
      }
    }
  } catch (err: any) {
    console.error('[test-service-role] Error:', err.message, err.stack)
    return {
      success: false,
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5)
    }
  }
})
