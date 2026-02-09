/**
 * Standardized audit logging utility.
 * All destructive server operations should call createAuditLog() after successful mutations.
 *
 * Writes to the `audit_logs` table (plural) via service-role Supabase client.
 * Failures are caught and logged but never break the request.
 *
 * Usage:
 *   await createAuditLog({
 *     action: 'user_created',
 *     entityType: 'user',
 *     entityId: userId,
 *     actorProfileId: profile.id,
 *     metadata: { role: 'admin', inviteMethod: 'email' }
 *   })
 */

interface AuditLogParams {
  /** Action performed, e.g. 'user_created', 'password_reset', 'employee_deactivated' */
  action: string
  /** Entity type, e.g. 'user', 'employee', 'candidate', 'schedule' */
  entityType: string
  /** ID of the affected entity */
  entityId?: string
  /** Profile ID of the actor performing the action */
  actorProfileId?: string
  /** Additional context (old/new values, reason, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Insert an audit log entry. Safe to call in any server endpoint —
 * failures are caught and logged, never propagated.
 * Uses createAdminClient() (auto-imported from server/utils/intake.ts) for service-role access.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const client = createAdminClient()

    const { error } = await client.from('audit_logs').insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      actor_profile_id: params.actorProfileId ?? null,
      metadata: params.metadata ?? {},
    })

    if (error) {
      logger.warn('Audit log insert failed', 'audit', {
        action: params.action,
        entityType: params.entityType,
        dbError: error.message,
      })
    }
  } catch (e: unknown) {
    // Never let audit logging break the request
    logger.warn('Audit log exception', 'audit', {
      action: params.action,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
