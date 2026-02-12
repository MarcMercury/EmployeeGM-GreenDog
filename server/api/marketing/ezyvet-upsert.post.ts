/**
 * EzyVet CRM Batch Upsert API
 * 
 * Handles batch insert/update of EzyVet contacts using ON CONFLICT upsert.
 * Designed for performance with chunked processing to avoid timeouts.
 */

import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Authenticate user first
  const supabaseUser = await serverSupabaseClient(event)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Verify admin role
  const supabase = await serverSupabaseServiceRole(event)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  
  if (!profile || !['admin', 'super_admin', 'manager', 'marketing_admin', 'sup_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  
  let body: any
  try {
    body = await readBody(event)
  } catch (parseErr) {
    logger.error('Failed to parse request body', parseErr instanceof Error ? parseErr : null, 'ezyvet-upsert')
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }
  
  const { contacts } = body || {}

  logger.info('Received request', 'ezyvet-upsert', { contactCount: contacts?.length || 0 })

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    logger.error('No contacts in request', null, 'ezyvet-upsert', { body: JSON.stringify(body).slice(0, 200) })
    throw createError({
      statusCode: 400,
      message: 'No contacts provided'
    })
  }

  // Enforce batch size limit to prevent memory exhaustion
  if (contacts.length > 10000) {
    throw createError({
      statusCode: 400,
      message: `Batch too large: ${contacts.length} contacts. Maximum 10,000 per request.`
    })
  }

  // Validate that all contacts have the required anchor key
  const validContacts = contacts.filter(c => c.ezyvet_contact_code)
  const invalidCount = contacts.length - validContacts.length

  if (validContacts.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No valid contacts with ezyvet_contact_code'
    })
  }

  let insertedCount = 0
  let updatedCount = 0
  let errorCount = invalidCount

  try {
    // Get existing contact codes to determine insert vs update
    const codes = validContacts.map(c => c.ezyvet_contact_code)
    const { data: existing } = await supabase
      .from('ezyvet_crm_contacts')
      .select('ezyvet_contact_code')
      .in('ezyvet_contact_code', codes)

    const existingCodes = new Set(existing?.map(e => e.ezyvet_contact_code) || [])

    // Prepare contacts for upsert - add timestamps
    const now = new Date().toISOString()
    const contactsToUpsert = validContacts.map(contact => ({
      ...contact,
      updated_at: now,
      last_sync_at: now,
      // Clean up null-like values
      email: contact.email || null,
      phone_mobile: contact.phone_mobile || null,
      address_city: contact.address_city || null,
      address_zip: contact.address_zip || null,
      division: contact.division || null,
      referral_source: contact.referral_source || null,
      breed: contact.breed || null,
      department: contact.department || null,
      revenue_ytd: parseFloat(contact.revenue_ytd) || 0,
      is_active: contact.is_active ?? true
    }))

    // Perform upsert - ON CONFLICT (ezyvet_contact_code) DO UPDATE
    const { data, error } = await supabase
      .from('ezyvet_crm_contacts')
      .upsert(contactsToUpsert, {
        onConflict: 'ezyvet_contact_code',
        ignoreDuplicates: false
      })
      .select('ezyvet_contact_code')

    if (error) {
      logger.error('Upsert error', error, 'ezyvet-upsert')
      throw createError({
        statusCode: 500,
        message: `Database error: ${error.message}`
      })
    }

    // Count inserts vs updates
    const processedCodes = new Set(data?.map(d => d.ezyvet_contact_code) || [])
    
    for (const code of processedCodes) {
      if (existingCodes.has(code)) {
        updatedCount++
      } else {
        insertedCount++
      }
    }

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
      total: validContacts.length
    }

  } catch (err: any) {
    logger.error('Upsert batch error', err, 'ezyvet-upsert')
    
    if (err.statusCode) throw err

    throw createError({
      statusCode: 500,
      message: err.message || 'Failed to upsert contacts'
    })
  }
})
