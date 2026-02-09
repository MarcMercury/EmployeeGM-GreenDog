/**
 * Daily Credential Expiration Check Cron Job
 * 
 * Runs daily at 8:00 AM UTC (12:00 AM PST / 3:00 AM EST)
 * Checks for expiring licenses and certifications
 * Creates notifications for employees, managers, and admins
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [
 *     { "path": "/api/cron/credential-expiry-check", "schedule": "0 8 * * *" }
 *   ]
 * }
 */

import { serverSupabaseServiceRole } from '#supabase/server'

// Types for the expiring credentials view (created by migration)
interface ExpiringCredential {
  credential_type: 'license' | 'certification'
  credential_name: string
  employee_name: string
  days_until_expiry: number
  expiration_date: string
}

interface NotificationResult {
  notifications_created: number
  licenses_processed: number
  certifications_processed: number
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  // Verify cron secret for security
  const authHeader = getHeader(event, 'authorization')
  const config = useRuntimeConfig()
  const cronSecret = config.cronSecret
  
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured - rejecting request', undefined, 'CredentialExpiryCron')
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron attempt', 'CredentialExpiryCron')
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  logger.cron('credential-expiry-check', 'started')

  const supabase = await serverSupabaseServiceRole(event)
  
  const results = {
    notificationsCreated: 0,
    licensesProcessed: 0,
    certificationsProcessed: 0,
    expiringCount: 0,
    slackNotificationsSent: 0,
    errors: [] as string[]
  }

  try {
    // 1. Call the database function to create notifications
    // Note: This RPC function is created by the credential_expiration_notifications migration
    logger.debug('Calling create_credential_expiration_notifications()', 'CredentialExpiryCron')
    
    // Use type assertion since the RPC function isn't in generated types yet
    const { data, error } = await (supabase.rpc as any)('create_credential_expiration_notifications') as {
      data: NotificationResult[] | null
      error: { message: string } | null
    }
    
    if (error) {
      logger.error('Error calling notification function', error as Error, 'CredentialExpiryCron')
      results.errors.push(`Database function error: ${error.message}`)
    } else if (data && Array.isArray(data) && data.length > 0) {
      results.notificationsCreated = data[0].notifications_created || 0
      results.licensesProcessed = data[0].licenses_processed || 0
      results.certificationsProcessed = data[0].certifications_processed || 0
      
      logger.info('Notifications created', 'CredentialExpiryCron', { notificationsCreated: results.notificationsCreated })
      logger.info('Licenses processed', 'CredentialExpiryCron', { licensesProcessed: results.licensesProcessed })
      logger.info('Certifications processed', 'CredentialExpiryCron', { certificationsProcessed: results.certificationsProcessed })
    }

    // 2. Get count of expiring credentials for summary
    // Note: The 'expiring_credentials' view is created by the migration
    const { count: expiringCount } = await (supabase.from as any)('expiring_credentials')
      .select('*', { count: 'exact', head: true })
      .lte('days_until_expiry', 30)
      .gte('days_until_expiry', 0) as { count: number | null }
    
    results.expiringCount = expiringCount || 0

    // 3. If there are urgent expirations (7 days or less), send Slack notification
    if (results.expiringCount > 0) {
      try {
        const { data: urgentCredentials } = await (supabase.from as any)('expiring_credentials')
          .select('credential_type, credential_name, employee_name, days_until_expiry, expiration_date')
          .lte('days_until_expiry', 7)
          .gte('days_until_expiry', 0)
          .order('days_until_expiry', { ascending: true })
          .limit(10) as { data: ExpiringCredential[] | null }
        
        if (urgentCredentials && urgentCredentials.length > 0) {
          // Get Slack settings - try app_settings if slack_settings doesn't exist
          let targetChannel: string | null = null
          
          try {
            const { data: appSettings } = await supabase
              .from('app_settings')
              .select('value')
              .eq('key', 'hr_notifications_channel')
              .single()
            
            targetChannel = appSettings?.value as string | null
            
            if (!targetChannel) {
              const { data: generalSettings } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'general_notifications_channel')
                .single()
              
              targetChannel = generalSettings?.value as string | null
            }
          } catch {
            logger.warn('Could not fetch Slack channel settings', 'CredentialExpiryCron')
          }
          
          if (targetChannel) {
            // Build Slack message
            const credentialList = urgentCredentials
              .map((c: ExpiringCredential) => `• ${c.employee_name}: ${c.credential_name} (${c.credential_type}) - ${c.days_until_expiry} days`)
              .join('\n')
            
            const slackMessage = {
              channel: targetChannel,
              text: `🚨 *Credential Expiration Alert*\n\n${urgentCredentials.length} credential(s) expiring within 7 days:\n\n${credentialList}\n\n_Please ensure renewals are in progress._`
            }
            
            // Send to Slack
            try {
              const slackResponse = await $fetch('/api/slack/send-message', {
                method: 'POST',
                body: slackMessage
              })
              
              if (slackResponse) {
                results.slackNotificationsSent = 1
                logger.info('Slack notification sent successfully', 'CredentialExpiryCron')
              }
            } catch (slackFetchErr: unknown) {
              const errMsg = slackFetchErr instanceof Error ? slackFetchErr.message : 'Unknown error'
              logger.error('Slack notification failed', slackFetchErr instanceof Error ? slackFetchErr : new Error(errMsg), 'CredentialExpiryCron')
              results.errors.push(`Slack notification failed: ${errMsg}`)
            }
          }
        }
      } catch (slackErr: unknown) {
        const errMsg = slackErr instanceof Error ? slackErr.message : 'Unknown error'
        logger.error('Error sending Slack notification', slackErr instanceof Error ? slackErr : new Error(errMsg), 'CredentialExpiryCron')
        results.errors.push(`Slack error: ${errMsg}`)
      }
    }

    // 4. Log audit entry
    try {
      await supabase.from('audit_logs').insert({
        action: 'cron_credential_expiry_check',
        entity_type: 'system',
        metadata: {
          notifications_created: results.notificationsCreated,
          licenses_processed: results.licensesProcessed,
          certifications_processed: results.certificationsProcessed,
          expiring_count_30_days: results.expiringCount,
          slack_notifications_sent: results.slackNotificationsSent,
          errors: results.errors,
          duration_ms: Date.now() - startTime
        }
      })
      logger.debug('Audit log created', 'CredentialExpiryCron')
    } catch (auditErr: unknown) {
      logger.error('Failed to create audit log', auditErr instanceof Error ? auditErr : new Error(String(auditErr)), 'CredentialExpiryCron')
    }

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    logger.cron('credential-expiry-check', 'failed', { error: errMsg })
    results.errors.push(`Fatal error: ${errMsg}`)
  }

  const duration = Date.now() - startTime
  logger.cron('credential-expiry-check', 'completed', { duration_ms: duration, ...results })

  return {
    success: results.errors.length === 0,
    duration_ms: duration,
    ...results
  }
})
