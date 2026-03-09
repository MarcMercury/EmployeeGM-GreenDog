/**
 * Import 6 tabs from "Marketing Spreadsheets All.xlsx" into Supabase.
 * 
 * Tabs imported:
 * 1. MARKETING SPENDING → marketing_spending
 * 2. 2025 Event Client Sign Ups → marketing_leads
 * 3. INFLUENCERS → marketing_influencers
 * 4. Inventory → marketing_inventory
 * 5. 2026 Event Recaps → marketing_events (UPDATE existing)
 * 6. 2025 ALL MARKETING CONTACTS → marketing_partners
 * 
 * Duplicate checking on each insert.
 * Usage: node scripts/import-marketing-spreadsheet.mjs [tab-number]
 *   tab-number: 1-6 to import a specific tab, or omit to import all
 */

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXCEL_PATH = path.join(__dirname, '..', 'data', 'marketing', 'Marketing Spreadsheets All.xlsx')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

const wb = XLSX.readFile(EXCEL_PATH)

// ── Helpers ──────────────────────────────────────────────────────────
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null
  // Excel epoch: Jan 0, 1900 (with the Lotus 1-2-3 bug)
  const utcDays = Math.floor(serial - 25569)
  const d = new Date(utcDays * 86400 * 1000)
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

function clean(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function parseNumber(val) {
  if (typeof val === 'number') return val
  const s = String(val).replace(/[$,]/g, '').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseInt2(val) {
  if (typeof val === 'number') return Math.round(val)
  const s = String(val).replace(/[,]/g, '').trim()
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

// ── 1. MARKETING SPENDING ───────────────────────────────────────────
async function importMarketingSpending() {
  console.log('\n═══ Importing MARKETING SPENDING → marketing_spending ═══')
  const ws = wb.Sheets['MARKETING SPENDING']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing records for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_spending')
    .select('vendor, description, amount, payment_date')
  const existingSet = new Set(
    (existing || []).map(r => `${r.vendor}|${r.description}|${r.amount}|${r.payment_date}`)
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Data starts at row index 4, header at row 2
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i]
    const vendor = clean(r[1])
    const amount = parseNumber(r[5])

    // Skip rows without vendor or valid amount
    if (!vendor || amount === null || amount <= 0) {
      skipped++
      continue
    }

    const description = clean(r[2]) || 'N/A'
    const paymentDate = excelDateToISO(r[4])

    // Duplicate check
    const key = `${vendor}|${description}|${amount}|${paymentDate}`
    if (existingSet.has(key)) {
      duplicates++
      continue
    }

    // Map status
    const statusRaw = clean(r[0]).toLowerCase()
    let status = 'pending'
    if (statusRaw.includes('reimbursed')) status = 'reimbursed'
    else if (statusRaw.includes('paid') || statusRaw.includes('sent')) status = 'paid'
    else if (statusRaw.includes('cancel')) status = 'cancelled'

    // Map payment method
    const paymentUsed = clean(r[7])
    let paymentMethod = null
    if (paymentUsed.toUpperCase().includes('AMEX')) paymentMethod = 'AMEX'
    else if (paymentUsed.toUpperCase().includes('VISA')) paymentMethod = 'Visa'
    else if (paymentUsed.toUpperCase().includes('ZELLE')) paymentMethod = 'Zelle'
    else if (paymentUsed.toUpperCase().includes('CASH')) paymentMethod = 'Cash'
    else if (paymentUsed.toUpperCase().includes('MASTERCARD')) paymentMethod = 'Visa' // closest match

    // Receipt date
    const receiptDateRaw = clean(r[9])
    const receiptSentDate = excelDateToISO(r[9])
    const receiptSent = !!(receiptSentDate || receiptDateRaw)

    // Build notes from Contact (col 3), Term of Service (col 8), and Notes (col 10)
    const noteParts = []
    if (clean(r[3])) noteParts.push(`Contact: ${clean(r[3])}`)
    if (clean(r[8])) noteParts.push(`Term: ${clean(r[8])}`)
    if (clean(r[10])) noteParts.push(clean(r[10]))
    const notes = noteParts.join(' | ') || null

    const record = {
      vendor,
      description,
      amount,
      payment_date: paymentDate,
      paid_by: clean(r[6]) || null,
      payment_method: paymentMethod,
      status,
      receipt_sent: receiptSent,
      receipt_sent_date: receiptSentDate,
      notes
    }

    const { error } = await supabase.from('marketing_spending').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i}: ${error.message}`)
      skipped++
    } else {
      existingSet.add(key)
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 2. EVENT CLIENT SIGN UPS → marketing_leads ─────────────────────
async function importEventClientSignUps() {
  console.log('\n═══ Importing 2025 Event Client Sign Ups → marketing_leads ═══')
  const ws = wb.Sheets['2025 Event Client Sign Ups ']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing leads for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_leads')
    .select('lead_name, email')
  const existingSet = new Set(
    (existing || []).map(r => `${(r.lead_name || '').toLowerCase()}|${(r.email || '').toLowerCase()}`)
  )

  // Get existing marketing_events for linking
  const { data: existingEvents } = await supabase
    .from('marketing_events')
    .select('id, name, event_date')
  const eventsByName = new Map()
  for (const ev of (existingEvents || [])) {
    eventsByName.set(ev.name.toLowerCase().trim(), ev.id)
  }

  let inserted = 0, skipped = 0, duplicates = 0
  let currentEventName = null
  let currentEventDate = null

  // Event header pattern: "6/14/25 Fluffology" or "8/2/25 GRLSWIRL"
  const eventHeaderRe = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const col0 = clean(r[0])

    // Check if this is an event header row
    const headerMatch = col0.match(eventHeaderRe)
    if (headerMatch) {
      currentEventDate = headerMatch[1]
      currentEventName = headerMatch[2].trim()
      continue
    }

    // Skip sub-header rows and empty rows
    if (!col0 || col0.startsWith('New Client') || col0.startsWith('Returning Client') || col0 === 'EMAIL' || col0.startsWith('NEW CLIENT')) {
      continue
    }

    // Process new clients (cols 0-2) and returning clients (cols 4-6)
    const leads = []

    // New client
    const newName = col0
    const newEmail = clean(r[1])
    const newPhone = clean(r[2])
    if (newName && newEmail && newEmail.includes('@')) {
      leads.push({ name: newName, email: newEmail, phone: newPhone, isNew: true })
    }

    // Returning client (in the same row, cols 4-6)
    const retName = clean(r[4])
    const retEmail = clean(r[5])
    const retPhone = clean(r[6])
    if (retName && retEmail && retEmail.includes('@')) {
      leads.push({ name: retName, email: retEmail, phone: retPhone, isNew: false })
    }

    for (const lead of leads) {
      const dupKey = `${lead.name.toLowerCase()}|${lead.email.toLowerCase()}`
      if (existingSet.has(dupKey)) {
        duplicates++
        continue
      }

      // Try to find a matching event
      let eventId = null
      if (currentEventName) {
        eventId = eventsByName.get(currentEventName.toLowerCase()) || null
      }

      // Split name into first/last
      const nameParts = lead.name.split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const record = {
        lead_name: lead.name,
        first_name: firstName,
        last_name: lastName,
        email: lead.email,
        phone: lead.phone || null,
        source: currentEventName ? `Event: ${currentEventName} (${currentEventDate || ''})` : 'Event Sign Up Sheet',
        source_event_id: eventId,
        status: 'new',
        interest_level: lead.isNew ? 'very_interested' : 'learning_more',
        notes: lead.isNew ? 'New client from event sign-up' : 'Returning client from event sign-up'
      }

      const { error } = await supabase.from('marketing_leads').insert(record)
      if (error) {
        console.error(`  ⚠ Row ${i} (${lead.name}): ${error.message}`)
        skipped++
      } else {
        existingSet.add(dupKey)
        inserted++
      }
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 3. INFLUENCERS → marketing_influencers ──────────────────────────
async function importInfluencers() {
  console.log('\n═══ Importing INFLUENCERS → marketing_influencers ═══')
  const ws = wb.Sheets['INFLUENCERS']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_influencers')
    .select('contact_name, email')
  const existingSet = new Set(
    (existing || []).map(r => `${(r.contact_name || '').toLowerCase()}|${(r.email || '').toLowerCase()}`)
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Header at row 1, data starts row 2
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i]
    const contactName = clean(r[1])

    // Skip rows without a contact name - section headers or blank rows
    if (!contactName) {
      skipped++
      continue
    }

    const email = clean(r[4])
    const dupKey = `${contactName.toLowerCase()}|${email.toLowerCase()}`
    if (existingSet.has(dupKey)) {
      duplicates++
      continue
    }

    // Parse status from notes column
    const statusNotes = clean(r[0])
    let status = 'prospect'
    if (statusNotes.toLowerCase().includes('active')) status = 'active'
    else if (statusNotes.toLowerCase().includes('inactive') || statusNotes.toLowerCase().includes('removed')) status = 'inactive'
    else if (statusNotes.toLowerCase().includes('completed')) status = 'completed'

    // Parse follower count
    let followerCount = null
    const followersRaw = clean(r[10])
    if (followersRaw) {
      // Handle "4.2M", "125K", plain number
      let fc = followersRaw.toUpperCase().replace(/,/g, '')
      if (fc.includes('M')) followerCount = Math.round(parseFloat(fc) * 1000000)
      else if (fc.includes('K')) followerCount = Math.round(parseFloat(fc) * 1000)
      else followerCount = parseInt2(fc)
    }

    // Parse IG - could be a URL or handle
    const igRaw = clean(r[6])
    let instagramHandle = null, instagramUrl = null
    if (igRaw.includes('instagram.com')) {
      instagramUrl = igRaw
      const match = igRaw.match(/instagram\.com\/([^/?]+)/)
      if (match) instagramHandle = match[1]
    } else if (igRaw) {
      instagramHandle = igRaw.replace('@', '')
    }

    // Parse events attended - split by comma or newline
    const eventsRaw = clean(r[13])
    const eventsAttended = eventsRaw ? eventsRaw.split(/[,\n\r]+/).map(s => s.trim()).filter(Boolean) : null

    const record = {
      contact_name: contactName,
      pet_name: clean(r[2]) || null,
      phone: clean(r[3]) || null,
      email: email || null,
      status,
      agreement_details: clean(r[5]) || null,
      instagram_handle: instagramHandle,
      instagram_url: instagramUrl,
      facebook_url: clean(r[7]) || null,
      tiktok_handle: clean(r[8]) || null,
      youtube_url: clean(r[9]) || null,
      follower_count: followerCount,
      ezyvet_tracking: clean(r[11]) || null,
      location: clean(r[12]) || null,
      events_attended: eventsAttended,
      notes: statusNotes || null
    }

    const { error } = await supabase.from('marketing_influencers').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${contactName}): ${error.message}`)
      skipped++
    } else {
      existingSet.add(dupKey)
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 4. INVENTORY → marketing_inventory ──────────────────────────────
async function importInventory() {
  console.log('\n═══ Importing Inventory → marketing_inventory ═══')
  const ws = wb.Sheets['Inventory']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_inventory')
    .select('item_name')
  const existingSet = new Set(
    (existing || []).map(r => (r.item_name || '').toLowerCase())
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Header at row 0, data starts row 1
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const itemName = clean(r[2])

    if (!itemName) {
      skipped++
      continue
    }

    if (existingSet.has(itemName.toLowerCase())) {
      duplicates++
      continue
    }

    // Parse boxes - could be "1 box", "1/2 box", or a number
    let boxesOnHand = 0
    const boxesRaw = clean(r[3])
    if (boxesRaw) {
      if (boxesRaw.includes('/')) {
        // "1/2 box" → treat as 1
        boxesOnHand = 1
      } else {
        boxesOnHand = parseInt2(boxesRaw) || 0
      }
    }

    // Categorize item
    let category = 'other'
    const itemLower = itemName.toLowerCase()
    if (itemLower.includes('brochure')) category = 'brochures'
    else if (itemLower.includes('flyer') || itemLower.includes('flier')) category = 'flyers'
    else if (itemLower.includes('card')) category = 'business_cards'
    else if (itemLower.includes('banner') || itemLower.includes('sign') || itemLower.includes('flag')) category = 'signage'
    else if (itemLower.includes('shirt') || itemLower.includes('hat') || itemLower.includes('apron') || itemLower.includes('apparel')) category = 'apparel'
    else if (itemLower.includes('sticker') || itemLower.includes('magnet') || itemLower.includes('pen') || itemLower.includes('treat') || itemLower.includes('tag') || itemLower.includes('bandana')) category = 'promotional_items'
    else if (itemLower.includes('bag') || itemLower.includes('tape') || itemLower.includes('clip') || itemLower.includes('folder')) category = 'supplies'

    const record = {
      item_name: itemName,
      category,
      boxes_on_hand: boxesOnHand,
      quantity_venice: parseInt2(r[4]) || 0,
      quantity_sherman_oaks: parseInt2(r[5]) || 0,
      quantity_valley: parseInt2(r[6]) || 0,
      reorder_point: parseInt2(r[7]) || 100,
      last_ordered: excelDateToISO(r[8]),
      supplier: clean(r[1]) || null,
      notes: clean(r[0]) || null
    }

    const { error } = await supabase.from('marketing_inventory').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${itemName}): ${error.message}`)
      skipped++
    } else {
      existingSet.add(itemName.toLowerCase())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 5. EVENT RECAPS → marketing_events (UPDATE) ────────────────────
async function importEventRecaps() {
  console.log('\n═══ Importing 2026 Event Recaps → marketing_events (UPDATE) ═══')
  const ws = wb.Sheets['2026 Event Recaps']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing events for matching
  const { data: existingEvents } = await supabase
    .from('marketing_events')
    .select('id, name, event_date, status')

  let updated = 0, created = 0, skipped = 0

  // Header at row 0, data may have year markers (rows 1, 3)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const eventName = clean(r[0])
    const dateRaw = r[1]

    // Skip year markers, blank rows, and section headers
    if (!eventName || eventName === '2026' || eventName === '2025' || eventName === '2024') {
      skipped++
      continue
    }

    // Need at least a name to proceed
    const eventDate = excelDateToISO(dateRaw)

    // Try to find a matching existing event
    let matchedEvent = null
    if (existingEvents) {
      // Match by name (fuzzy) and date
      matchedEvent = existingEvents.find(ev => {
        const nameMatch = ev.name.toLowerCase().replace(/\s+/g, ' ').trim() === eventName.toLowerCase().replace(/\s+/g, ' ').trim()
        const dateMatch = eventDate ? ev.event_date === eventDate : true
        return nameMatch && dateMatch
      })
      // Also try partial name match if exact didn't work
      if (!matchedEvent) {
        matchedEvent = existingEvents.find(ev =>
          ev.name.toLowerCase().includes(eventName.toLowerCase().slice(0, 15)) ||
          eventName.toLowerCase().includes(ev.name.toLowerCase().slice(0, 15))
        )
      }
    }

    // Parse recap fields
    const location = clean(r[2]) || null
    const clinic = clean(r[3]) || null
    const cost = parseNumber(r[4])
    const attendeesRaw = clean(r[5])
    const actualAttendance = parseInt2(attendeesRaw.replace(/[Kk]/g, '000').replace(/[^0-9]/g, ''))
    const signUps = parseInt2(r[6])
    const appointments = clean(r[7])
    const productsSold = clean(r[8])
    const redemptionCodes = clean(r[9])
    const couponsRedeemed = clean(r[10])
    const clientSpend = parseNumber(r[11])
    const feedback = clean(r[12])

    // Build post_event_notes from various fields
    const notesParts = []
    if (clinic) notesParts.push(`Clinic: ${clinic}`)
    if (appointments) notesParts.push(`Appointments: ${appointments}`)
    if (productsSold) notesParts.push(`Products Sold: ${productsSold}`)
    if (redemptionCodes) notesParts.push(`Redemption Codes: ${redemptionCodes}`)
    if (couponsRedeemed) notesParts.push(`Coupons Redeemed: ${couponsRedeemed}`)
    if (feedback) notesParts.push(feedback)
    const postEventNotes = notesParts.join(' | ') || null

    if (matchedEvent) {
      // UPDATE existing event with recap data
      const updateData = {
        status: 'completed',
        updated_at: new Date().toISOString()
      }
      if (location) updateData.location = location
      if (cost !== null) updateData.budget = cost
      if (actualAttendance !== null) updateData.actual_attendance = actualAttendance
      if (signUps !== null) updateData.leads_collected = signUps
      if (clientSpend !== null) updateData.revenue_generated = clientSpend
      if (postEventNotes) updateData.post_event_notes = postEventNotes

      const { error } = await supabase
        .from('marketing_events')
        .update(updateData)
        .eq('id', matchedEvent.id)

      if (error) {
        console.error(`  ⚠ Update ${eventName}: ${error.message}`)
        skipped++
      } else {
        console.log(`  📝 Updated: ${eventName}`)
        updated++
      }
    } else {
      // CREATE new event with recap data
      if (!eventDate) {
        console.log(`  ⏭ Skipped (no date): ${eventName}`)
        skipped++
        continue
      }

      // Check if we already have this exact event by name+date
      const { data: dupeCheck } = await supabase
        .from('marketing_events')
        .select('id')
        .ilike('name', eventName)
        .eq('event_date', eventDate)
        .limit(1)

      if (dupeCheck && dupeCheck.length > 0) {
        console.log(`  🔁 Duplicate found: ${eventName} (${eventDate})`)
        skipped++
        continue
      }

      const record = {
        name: eventName,
        event_date: eventDate,
        location,
        status: 'completed',
        budget: cost,
        actual_attendance: actualAttendance,
        leads_collected: signUps || 0,
        revenue_generated: clientSpend || 0,
        post_event_notes: postEventNotes,
        description: `Imported from spreadsheet recap`
      }

      const { error } = await supabase.from('marketing_events').insert(record)
      if (error) {
        console.error(`  ⚠ Create ${eventName}: ${error.message}`)
        skipped++
      } else {
        console.log(`  ✨ Created: ${eventName} (${eventDate})`)
        created++
      }
    }
  }

  console.log(`  ✅ Updated: ${updated}, Created: ${created}, Skipped: ${skipped}`)
}

// ── 6. MARKETING CONTACTS → marketing_partners ─────────────────────
async function importMarketingContacts() {
  console.log('\n═══ Importing 2025 ALL MARKETING CONTACTS → marketing_partners ═══')
  const ws = wb.Sheets['2025 ALL MARKETING CONTACTS']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_partners')
    .select('name, contact_email')
  const existingSet = new Set(
    (existing || []).map(r => (r.name || '').toLowerCase())
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Header at row 0, data starts row 1
  // Section headers exist (e.g., "CHAMBERS OF COMMERCE & ASSOCIATIONS")
  const sectionHeaders = [
    'chambers of commerce', 'associations', 'food vendor', 'pet business',
    'rescue', 'entertainment', 'local business', 'print vendor',
    'exotic shop', 'spay', 'media', 'other', 'vendor', 'partnership'
  ]

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const businessName = clean(r[1])

    // Skip if no business name
    if (!businessName) {
      skipped++
      continue
    }

    // Skip section header rows (all-caps descriptive text)
    const lower = businessName.toLowerCase()
    if (sectionHeaders.some(h => lower.includes(h) && !lower.includes('.com'))) {
      // Could be section header - check if there's no contact info
      if (!clean(r[2]) && !clean(r[3]) && !clean(r[4])) {
        skipped++
        continue
      }
    }

    // Duplicate check
    if (existingSet.has(lower)) {
      duplicates++
      continue
    }

    // Determine partner type from col 5 (Business Type), col 12 (Business type), or section context
    let partnerType = 'other'
    const bizType = (clean(r[5]) + ' ' + clean(r[12])).toLowerCase()
    if (bizType.includes('chamber')) partnerType = 'chamber'
    else if (bizType.includes('association')) partnerType = 'association'
    else if (bizType.includes('food') || bizType.includes('restaurant') || bizType.includes('cafe')) partnerType = 'food_vendor'
    else if (bizType.includes('pet') || bizType.includes('vet') || bizType.includes('animal')) partnerType = 'pet_business'
    else if (bizType.includes('rescue') || bizType.includes('shelter') || bizType.includes('adopt')) partnerType = 'rescue'
    else if (bizType.includes('entertainment') || bizType.includes('event')) partnerType = 'entertainment'
    else if (bizType.includes('print') || bizType.includes('design')) partnerType = 'print_vendor'
    else if (bizType.includes('media') || bizType.includes('news') || bizType.includes('blog')) partnerType = 'media'
    else if (bizType.includes('groom')) partnerType = 'groomer'
    else if (bizType.includes('daycare') || bizType.includes('boarding')) partnerType = 'daycare_boarding'
    else if (bizType.includes('retail') || bizType.includes('shop') || bizType.includes('store')) partnerType = 'pet_retail'
    else if (bizType.includes('charity') || bizType.includes('nonprofit')) partnerType = 'charity'
    else if (bizType.includes('merch') || bizType.includes('swag')) partnerType = 'merch_vendor'
    else if (bizType.includes('exotic')) partnerType = 'exotic_shop'
    else if (bizType.includes('spay') || bizType.includes('neuter')) partnerType = 'spay_neuter'
    else partnerType = 'local_business'

    // Parse events attended
    const eventsRaw = clean(r[13])
    const eventsAttended = eventsRaw ? eventsRaw.split(/[,\n\r]+/).map(s => s.trim()).filter(Boolean) : null

    // Build notes from col 0 (notes) + col 6 (initiative)
    const notesParts = []
    if (clean(r[0])) notesParts.push(clean(r[0]))
    if (clean(r[6])) notesParts.push(`Initiative: ${clean(r[6])}`)
    const notes = notesParts.join(' | ') || null

    // Parse IG handle
    const igRaw = clean(r[7])
    let instagramHandle = null
    if (igRaw.includes('instagram.com')) {
      const match = igRaw.match(/instagram\.com\/([^/?]+)/)
      if (match) instagramHandle = match[1]
    } else if (igRaw) {
      instagramHandle = igRaw.replace('@', '')
    }

    const record = {
      name: businessName,
      partner_type: partnerType,
      status: 'prospect',
      contact_name: clean(r[2]) || null,
      contact_phone: clean(r[3]) || null,
      contact_email: clean(r[4]) || null,
      services_provided: clean(r[5]) || null,
      instagram_handle: instagramHandle,
      facebook_url: clean(r[8]) || null,
      tiktok_handle: clean(r[9]) || null,
      youtube_url: clean(r[10]) || null,
      website: clean(r[11]) || null,
      events_attended: eventsAttended,
      notes
    }

    const { error } = await supabase.from('marketing_partners').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${businessName}): ${error.message}`)
      skipped++
    } else {
      existingSet.add(lower)
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const tabArg = process.argv[2] ? parseInt(process.argv[2]) : null

  console.log('📊 Marketing Spreadsheet Import')
  console.log('════════════════════════════════════════════════════════')

  const importFns = [
    { num: 1, name: 'Marketing Spending', fn: importMarketingSpending },
    { num: 2, name: 'Event Client Sign Ups', fn: importEventClientSignUps },
    { num: 3, name: 'Influencers', fn: importInfluencers },
    { num: 4, name: 'Inventory', fn: importInventory },
    { num: 5, name: 'Event Recaps', fn: importEventRecaps },
    { num: 6, name: 'Marketing Contacts', fn: importMarketingContacts },
  ]

  for (const imp of importFns) {
    if (tabArg && imp.num !== tabArg) continue
    try {
      await imp.fn()
    } catch (err) {
      console.error(`\n❌ Error importing ${imp.name}:`, err.message)
    }
  }

  console.log('\n════════════════════════════════════════════════════════')
  console.log('✅ Import complete!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
