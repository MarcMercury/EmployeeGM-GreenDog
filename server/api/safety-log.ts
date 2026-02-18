/**
 * Safety Log API Endpoint
 * Handles GET (retrieve) and POST (create) safety log entries
 */

import type { SafetyLog, SafetyLogType, SafetyLogLocation } from '~/types/safety-log.types'

export default defineEventHandler(async (event) => {
  const supabase = await useSupabaseServer(event)
  const user = await requireAuth(event)

  // ── GET: List safety logs (with pagination & filters) ──
  if (event.node.req.method === 'GET') {
    const query = getQuery(event)
    const logType = query.log_type as SafetyLogType
    const location = query.location as SafetyLogLocation | undefined
    const status = query.status as string | undefined
    const dateFrom = query.date_from as string | undefined
    const dateTo = query.date_to as string | undefined
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 25

    try {
      let q = supabase
        .from('safety_logs')
        .select('*, submitter:submitted_by(first_name, last_name, email)', { count: 'exact' })
        .eq('log_type', logType)
        .order('submitted_at', { ascending: false })

      if (location) q = q.eq('location', location)
      if (status) q = q.eq('status', status)
      if (dateFrom) q = q.gte('submitted_at', `${dateFrom}T00:00:00Z`)
      if (dateTo) q = q.lte('submitted_at', `${dateTo}T23:59:59Z`)

      // Apply pagination
      const offset = (page - 1) * pageSize
      q = q.range(offset, offset + pageSize - 1)

      const { data, error, count } = await q

      if (error) throw error

      return {
        data: data as SafetyLog[],
        total: count || 0,
        page,
        pageSize,
      }
    } catch (err: any) {
      console.error('Failed to fetch safety logs:', err)
      throw createError({
        statusCode: 500,
        statusMessage: err?.message || 'Failed to fetch safety logs',
      })
    }
  }

  // ── POST: Create new safety log ──
  if (event.node.req.method === 'POST') {
    const body = await readBody(event)

    const {
      log_type,
      location,
      form_data,
      osha_recordable,
      status = 'submitted',
    } = body

    // Validation
    if (!log_type || !location || !form_data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: log_type, location, form_data',
      })
    }

    try {
      const { data, error } = await supabase
        .from('safety_logs')
        .insert({
          log_type,
          location,
          form_data,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
          osha_recordable: !!osha_recordable,
          status,
          photo_urls: [],
        })
        .select('*')
        .single()

      if (error) throw error

      // ── Trigger notifications ──
      // Notify relevant roles if OSHA recordable
      if (osha_recordable) {
        try {
          const notifyResult = await supabase.functions.invoke('notify-osha-entry', {
            body: {
              log_id: data.id,
              log_type,
              location,
              submitted_by: user.id,
            },
          })
          console.log('[Safety Log] OSHA notification sent', notifyResult)
        } catch (notifyErr: any) {
          console.warn('[Safety Log] Failed to send OSHA notification:', notifyErr?.message)
          // Non-blocking - don't fail the entry submission
        }
      }

      return {
        success: true,
        data,
      }
    } catch (err: any) {
      console.error('[Safety Log] Failed to create entry:', err)
      throw createError({
        statusCode: 500,
        statusMessage: err?.message || 'Failed to submit safety log',
      })
    }
  }

  // ── Method not allowed ──
  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed',
  })
})
