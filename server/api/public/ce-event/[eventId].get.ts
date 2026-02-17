/**
 * GET /api/public/ce-event/:eventId
 *
 * PUBLIC ENDPOINT - Fetches CE event details for the public sign-up form.
 * Uses service role key to bypass RLS (ce_events requires authenticated role).
 * Returns only fields needed for the registration form—no sensitive data.
 */

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!eventId || !uuidRegex.test(eventId)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid event ID.'
    })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = config.supabaseServiceRoleKey

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      message: 'Server configuration error'
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: ceEvent, error: fetchError } = await supabase
    .from('ce_events')
    .select('id, title, description, event_date_start, event_date_end, location_name, location_address, format, status, ce_hours_offered, speaker_name, speaker_credentials, max_attendees, current_attendees')
    .eq('id', eventId)
    .single()

  if (fetchError || !ceEvent) {
    throw createError({
      statusCode: 404,
      message: 'Event not found.'
    })
  }

  // Don't expose cancelled events
  if (ceEvent.status === 'cancelled') {
    throw createError({
      statusCode: 404,
      message: 'Event not found.'
    })
  }

  return {
    id: ceEvent.id,
    title: ceEvent.title,
    description: ceEvent.description,
    event_date_start: ceEvent.event_date_start,
    event_date_end: ceEvent.event_date_end,
    location_name: ceEvent.location_name,
    location_address: ceEvent.location_address,
    format: ceEvent.format,
    status: ceEvent.status,
    ce_hours_offered: ceEvent.ce_hours_offered,
    speaker_name: ceEvent.speaker_name,
    speaker_credentials: ceEvent.speaker_credentials,
    max_attendees: ceEvent.max_attendees,
    current_attendees: ceEvent.current_attendees,
    capacity_full: ceEvent.max_attendees ? ceEvent.current_attendees >= ceEvent.max_attendees : false
  }
})
