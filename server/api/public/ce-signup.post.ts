/**
 * POST /api/public/ce-signup
 *
 * PUBLIC ENDPOINT - Registers an attendee for a CE event.
 * Creates an education_visitors record (visitor_type = 'ce_attendee')
 * and a ce_event_attendees record linking them to the event.
 * No authentication required.
 */

import { createClient } from '@supabase/supabase-js'

interface CESignupBody {
  event_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  organization_name: string
  license_type?: string | null
  license_number?: string | null
  license_state?: string | null
  special_accommodations?: string | null
  lead_source?: string | null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CESignupBody>(event)

  // Validate required fields
  if (!body.event_id || !body.first_name || !body.last_name || !body.email || !body.phone || !body.organization_name) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: event_id, first_name, last_name, email, phone, and organization_name are required.'
    })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Please provide a valid email address.'
    })
  }

  // Validate UUID format for event_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(body.event_id)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid event ID.'
    })
  }

  // Enforce input length limits
  if (body.first_name.length > 100 || body.last_name.length > 100) {
    throw createError({ statusCode: 400, message: 'Name fields must be under 100 characters.' })
  }
  if (body.email.length > 255) {
    throw createError({ statusCode: 400, message: 'Email must be under 255 characters.' })
  }
  if (body.phone.length > 20) {
    throw createError({ statusCode: 400, message: 'Phone must be under 20 characters.' })
  }
  if (body.organization_name.length > 200) {
    throw createError({ statusCode: 400, message: 'Organization name must be under 200 characters.' })
  }
  if (body.special_accommodations && body.special_accommodations.length > 500) {
    throw createError({ statusCode: 400, message: 'Special accommodations must be under 500 characters.' })
  }
  if (body.license_number && body.license_number.length > 50) {
    throw createError({ statusCode: 400, message: 'License number must be under 50 characters.' })
  }
  if (body.license_state && body.license_state.length > 2) {
    throw createError({ statusCode: 400, message: 'License state must be a 2-letter abbreviation.' })
  }

  // Create Supabase client with service role for public endpoint
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

  // Verify the event exists and is not cancelled
  const { data: ceEvent, error: eventError } = await supabase
    .from('ce_events')
    .select('id, title, status, max_attendees, current_attendees')
    .eq('id', body.event_id)
    .single()

  if (eventError || !ceEvent) {
    throw createError({
      statusCode: 404,
      message: 'Event not found.'
    })
  }

  if (ceEvent.status === 'cancelled') {
    throw createError({
      statusCode: 400,
      message: 'This event has been cancelled and is no longer accepting registrations.'
    })
  }

  // Check capacity
  if (ceEvent.max_attendees && ceEvent.current_attendees >= ceEvent.max_attendees) {
    throw createError({
      statusCode: 400,
      message: 'This event has reached its maximum capacity.'
    })
  }

  // Check for duplicate registration (same email + same event)
  // Check directly in ce_event_attendees (covers both email and visitor_id linkage)
  const { data: existingAttendee } = await supabase
    .from('ce_event_attendees')
    .select('id')
    .eq('ce_event_id', body.event_id)
    .eq('email', body.email.toLowerCase())
    .maybeSingle()

  if (existingAttendee) {
    throw createError({
      statusCode: 409,
      message: 'You are already registered for this event.'
    })
  }

  // Also check via visitor_id linkage (for records that may not have email on attendee row)
  const { data: existingVisitorForEvent } = await supabase
    .from('education_visitors')
    .select('id')
    .eq('email', body.email.toLowerCase())
    .eq('visitor_type', 'ce_attendee')
    .limit(1)
    .maybeSingle()

  if (existingVisitorForEvent) {
    const { data: linkedAttendee } = await supabase
      .from('ce_event_attendees')
      .select('id')
      .eq('ce_event_id', body.event_id)
      .eq('visitor_id', existingVisitorForEvent.id)
      .maybeSingle()

    if (linkedAttendee) {
      throw createError({
        statusCode: 409,
        message: 'You are already registered for this event.'
      })
    }
  }

  // Build notes from special fields
  const noteParts: string[] = []
  if (body.license_type) noteParts.push(`Role: ${body.license_type}`)
  if (body.license_state) noteParts.push(`License State: ${body.license_state}`)
  if (body.special_accommodations) noteParts.push(`Accommodations: ${body.special_accommodations}`)
  const combinedNotes = noteParts.length > 0 ? noteParts.join(' | ') : null

  // Step 1: Find or create education_visitors record (single record per person)
  // Look for an existing CE attendee with the same email
  const { data: existingVisitor } = await supabase
    .from('education_visitors')
    .select('id')
    .eq('email', body.email.toLowerCase().trim())
    .eq('visitor_type', 'ce_attendee')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let visitorId: string

  if (existingVisitor) {
    // Reuse existing visitor record — update with latest info if needed
    visitorId = existingVisitor.id
    const updatePayload: Record<string, any> = {}
    if (body.phone) updatePayload.phone = body.phone
    if (body.organization_name) updatePayload.organization_name = body.organization_name
    if (combinedNotes) {
      // Append new notes
      const { data: currentVisitor } = await supabase
        .from('education_visitors')
        .select('notes')
        .eq('id', visitorId)
        .single()
      const existingNotes = currentVisitor?.notes || ''
      const eventNote = `[${ceEvent.title}] ${combinedNotes}`
      updatePayload.notes = existingNotes ? `${existingNotes}\n${eventNote}` : eventNote
    }
    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from('education_visitors')
        .update(updatePayload)
        .eq('id', visitorId)
    }
  } else {
    // Create new visitor record (no ce_event_id — events tracked via join table)
    const { data: visitor, error: visitorError } = await supabase
      .from('education_visitors')
      .insert({
        first_name: body.first_name.trim(),
        last_name: body.last_name.trim(),
        email: body.email.toLowerCase().trim(),
        phone: body.phone || null,
        visitor_type: 'ce_attendee',
        organization_name: body.organization_name || null,
        lead_source: body.lead_source || 'CE Event Signup',
        notes: combinedNotes,
        is_active: true,
        visit_status: 'upcoming',
        reason_for_visit: `CE Event Registration: ${ceEvent.title}`
      })
      .select('id')
      .single()

    if (visitorError) {
      console.error('Failed to create visitor record:', visitorError)
      throw createError({
        statusCode: 500,
        message: 'Failed to complete registration. Please try again.'
      })
    }
    visitorId = visitor.id
  }

  // Step 2: Create ce_event_attendees record (linked to the single visitor)
  const { error: attendeeError } = await supabase
    .from('ce_event_attendees')
    .insert({
      ce_event_id: body.event_id,
      visitor_id: visitorId,
      first_name: body.first_name.trim(),
      last_name: body.last_name.trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone || null,
      license_number: body.license_number || null,
      license_type: body.license_type || null,
      checked_in: false,
      certificate_issued: false
    })

  if (attendeeError) {
    console.error('Failed to create attendee record:', attendeeError)
    // Only clean up if we just created the visitor
    if (!existingVisitor) {
      await supabase.from('education_visitors').delete().eq('id', visitorId)
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to complete registration. Please try again.'
    })
  }

  // Step 3: Atomically increment the current_attendees count on the event
  // Uses raw SQL to avoid race conditions with concurrent registrations
  const { error: incrementError } = await supabase.rpc('increment_event_attendees' as any, {
    p_event_id: body.event_id
  })

  // Fallback: if RPC doesn't exist, use standard update (less safe but functional)
  if (incrementError) {
    console.warn('RPC increment_event_attendees not available, using fallback:', incrementError.message)
    await supabase
      .from('ce_events')
      .update({ current_attendees: (ceEvent.current_attendees || 0) + 1 })
      .eq('id', body.event_id)
  }

  return {
    success: true,
    message: 'Registration successful!'
  }
})
