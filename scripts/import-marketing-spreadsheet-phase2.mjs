/**
 * Import medium-priority + new-feature tabs from "Marketing Spreadsheets All.xlsx"
 *
 * Tabs imported:
 * 1. OLD INFLUENCERS (2015-2022) → marketing_influencers (status=inactive)
 * 2. 2026 Event List → marketing_events (merge)
 * 3. 25 ADPA + 25 GD LAND Vendors → marketing_partners
 * 4. Pet Shops → marketing_partners (prospects, exotic_shop type)
 * 5. CE Outreach Resources → marketing_partners (ce contacts)
 * 6. TESTIMONIALS → marketing_testimonials (NEW table)
 * 7. Do Not Film + Events Staff List → event_staff_preferences (NEW table)
 *
 * Usage: node scripts/import-marketing-spreadsheet-phase2.mjs [tab-number]
 *   1-7 to import a specific tab, or omit to import all
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
  const utcDays = Math.floor(serial - 25569)
  const d = new Date(utcDays * 86400 * 1000)
  return d.toISOString().split('T')[0]
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

// ── 1. OLD INFLUENCERS → marketing_influencers (inactive) ───────────
async function importOldInfluencers() {
  console.log('\n═══ 1. Importing OLD INFLUENCERS → marketing_influencers ═══')
  const ws = wb.Sheets['OLD INFLUENCERS (2015 - 2022)']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing for duplicate checking (by name + email combo)
  const { data: existing } = await supabase
    .from('marketing_influencers')
    .select('contact_name, email, pet_name')
  const existingByName = new Set(
    (existing || []).map(r => (r.contact_name || '').toLowerCase().trim())
  )
  const existingByNameEmail = new Set(
    (existing || []).map(r => `${(r.contact_name || '').toLowerCase()}|${(r.email || '').toLowerCase()}`)
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Headers at row 1: IMPORTANT NOTES, BK Notes, HUMAN NAME(2), ORGANIZATION/PET(3), PHONE(4), PET AGE(5), BREED(6), SEX(7), EMAIL(8), HANDLE(9), PAGE LINK(10), IG FOLLOWERS(11), LOCATION(12)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i]
    const contactName = clean(r[2])

    if (!contactName) { skipped++; continue }

    // Skip section headers
    if (contactName.toUpperCase() === contactName && contactName.length > 20 && !contactName.includes('@')) {
      skipped++; continue
    }

    const email = clean(r[8])

    // Duplicate check: by name (case-insensitive) or by name+email
    if (existingByName.has(contactName.toLowerCase().trim())) {
      duplicates++; continue
    }
    if (email && existingByNameEmail.has(`${contactName.toLowerCase()}|${email.toLowerCase()}`)) {
      duplicates++; continue
    }

    // Parse follower count
    let followerCount = null
    const followersRaw = clean(r[11])
    if (followersRaw) {
      let fc = followersRaw.toUpperCase().replace(/,/g, '').replace(/\+/g, '')
      if (fc.includes('MILLION') || fc.includes('M')) followerCount = Math.round(parseFloat(fc) * 1000000)
      else if (fc.includes('K')) followerCount = Math.round(parseFloat(fc) * 1000)
      else followerCount = parseInt2(fc)
    }

    // Parse IG handle/url
    const handleRaw = clean(r[9])
    const pageLinkRaw = clean(r[10])
    let instagramHandle = null, instagramUrl = null
    if (pageLinkRaw && pageLinkRaw.includes('instagram.com')) {
      instagramUrl = pageLinkRaw
      const match = pageLinkRaw.match(/instagram\.com\/([^/?]+)/)
      if (match) instagramHandle = match[1]
    }
    if (!instagramHandle && handleRaw) {
      instagramHandle = handleRaw.replace('@', '')
    }

    // Build notes from IMPORTANT NOTES (col 0) and BK Notes (col 1)
    const notes0 = clean(r[0])
    const notes1 = clean(r[1])
    const notesParts = []
    if (notes0) notesParts.push(notes0.substring(0, 500))
    if (notes1) notesParts.push(`BK: ${notes1.substring(0, 200)}`)
    const notes = notesParts.join(' | ') || null

    const record = {
      contact_name: contactName,
      pet_name: clean(r[3]) || null,
      phone: clean(r[4]) || null,
      email: email || null,
      status: 'inactive',  // old/archived influencers
      instagram_handle: instagramHandle,
      instagram_url: instagramUrl,
      follower_count: followerCount,
      location: clean(r[12]) || null,
      notes: notes ? `[Archived 2015-2022] ${notes}` : '[Archived 2015-2022]'
    }

    const { error } = await supabase.from('marketing_influencers').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${contactName}): ${error.message}`)
      skipped++
    } else {
      existingByName.add(contactName.toLowerCase().trim())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 2. 2026 EVENT LIST → marketing_events ───────────────────────────
async function importEventList() {
  console.log('\n═══ 2. Importing 2026 Event List → marketing_events ═══')
  const ws = wb.Sheets['2026 Event List']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing events for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_events')
    .select('id, name, event_date, event_type, event_category')

  // Build lookup sets
  const existingByNameDate = new Set(
    (existing || []).map(r => `${(r.name || '').toLowerCase().trim()}|${r.event_date || ''}`)
  )
  const existingByName = new Map(
    (existing || []).map(r => [(r.name || '').toLowerCase().trim(), r])
  )

  let inserted = 0, skipped = 0, duplicates = 0, updated = 0

  // Headers row 0: Date(0), Month(1), Event Name(2), Event Type(3), Clinic(4),
  // Owner(s)/Organizer(5), Planning Phase(6), Staff(7), Supplies(8),
  // Description / Notes(9), Notify(10)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const eventName = clean(r[2])
    if (!eventName) { skipped++; continue }

    const eventDate = excelDateToISO(r[0])
    const month = clean(r[1])
    const eventTypeRaw = clean(r[3]).toLowerCase()
    const clinic = clean(r[4])
    const organizer = clean(r[5])
    const planningPhase = clean(r[6])
    const staff = clean(r[7])
    const supplies = clean(r[8])
    const description = clean(r[9])
    const notify = clean(r[10])

    // Map event_type from spreadsheet
    let eventType = 'general'
    if (eventTypeRaw.includes('awareness')) eventType = 'community_outreach'
    else if (eventTypeRaw.includes('holiday') || eventTypeRaw.includes('national')) eventType = 'general'
    else if (eventTypeRaw.includes('street') || eventTypeRaw.includes('fair')) eventType = 'street_fair'
    else if (eventTypeRaw.includes('ce') || eventTypeRaw.includes('continuing')) eventType = 'ce_event'
    else if (eventTypeRaw.includes('adoption') || eventTypeRaw.includes('adopt')) eventType = 'adoption_event'
    else if (eventTypeRaw.includes('open house')) eventType = 'open_house'
    else if (eventTypeRaw.includes('health')) eventType = 'health_fair'
    else if (eventTypeRaw.includes('school')) eventType = 'school_visit'
    else if (eventTypeRaw.includes('expo')) eventType = 'pet_expo'
    else if (eventTypeRaw.includes('fundraiser')) eventType = 'fundraiser'

    // Map event_category
    let eventCategory = 'general'
    if (eventTypeRaw === 'awareness') eventCategory = 'awareness_day'
    else if (eventTypeRaw.includes('holiday') || eventTypeRaw.includes('national holiday')) eventCategory = 'major_holiday'

    // Duplicate check by name+date
    const dupeKey = `${eventName.toLowerCase().trim()}|${eventDate || ''}`
    if (existingByNameDate.has(dupeKey)) {
      duplicates++
      continue
    }

    // Also check by name-only for awareness/holiday events (often no specific date)
    const existingEvent = existingByName.get(eventName.toLowerCase().trim())
    if (existingEvent) {
      // If existing event has same type, skip - it's awareness day duplicate
      if (!eventDate) {
        duplicates++
        continue
      }
      // If existing event has a date and new one has same date, skip
      if (existingEvent.event_date === eventDate) {
        duplicates++
        continue
      }
    }

    // Build notes
    const notesParts = []
    if (month) notesParts.push(`Month: ${month}`)
    if (clinic) notesParts.push(`Clinic: ${clinic}`)
    if (organizer) notesParts.push(`Organizer: ${organizer}`)
    if (planningPhase) notesParts.push(`Phase: ${planningPhase}`)
    if (staff) notesParts.push(`Staff: ${staff}`)
    if (supplies) notesParts.push(`Supplies: ${supplies}`)
    if (notify) notesParts.push(`Notify: ${notify}`)
    const notes = notesParts.join(' | ') || null

    const record = {
      name: eventName,
      event_date: eventDate || '2026-01-01', // Default for awareness days without specific date
      event_type: eventType,
      event_category: eventCategory,
      status: 'planned',
      description: description || null,
      notes,
      staffing_needs: staff || null,
      supplies_needed: supplies || null,
      contact_name: organizer || null
    }

    const { error } = await supabase.from('marketing_events').insert(record)
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        duplicates++
      } else {
        console.error(`  ⚠ Row ${i} (${eventName}): ${error.message}`)
        skipped++
      }
    } else {
      existingByNameDate.add(dupeKey)
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 3. VENDOR/RESCUE CONTACTS → marketing_partners ──────────────────
async function importVendorRescueContacts() {
  console.log('\n═══ 3. Importing Vendor/Rescue Contacts → marketing_partners ═══')

  // Get existing for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_partners')
    .select('name, contact_email')
  const existingNames = new Set(
    (existing || []).map(r => (r.name || '').toLowerCase().trim())
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // ── Tab 23: 25 ADPA - All Vendor contacts ──
  console.log('  ── Processing: 25 ADPA - All Vendor contacts ──')
  const ws23 = wb.Sheets['25 ADPA - All Vendor contacts']
  const rows23 = XLSX.utils.sheet_to_json(ws23, { header: 1, defval: '' })

  // Row 2 is the real header:
  // STATUS(0), Events Attended(1), BUSINESS NAME(2), BUSINESS TYPE(3),
  // NAME(4), PHONE(5), EMAIL(6), WEBSITE(7), GD CLIENT(8), CURRENT PARTNERSHIP(9),
  // IG(10), FB(11), TT(12), YTube(13), ...
  let currentSection = 'other' // Track section (RESCUES, VENDORS, etc.)

  for (let i = 3; i < rows23.length; i++) {
    const r = rows23[i]
    const businessName = clean(r[2])
    const bizType = clean(r[3]).toLowerCase()

    // Check for section headers
    if (clean(r[0]).toUpperCase().includes('RESCUE') && !businessName) {
      currentSection = 'rescue'
      continue
    }
    if (clean(r[0]).toUpperCase().includes('VENDOR') && !businessName) {
      currentSection = 'vendor'
      continue
    }

    if (!businessName) { skipped++; continue }

    // Skip section headers (all text, no contact info)
    if (!clean(r[4]) && !clean(r[5]) && !clean(r[6]) && businessName.toUpperCase() === businessName && businessName.length < 30) {
      // Might be a section label like "RESCUES"
      if (businessName.toLowerCase().includes('rescue')) currentSection = 'rescue'
      else if (businessName.toLowerCase().includes('vendor')) currentSection = 'vendor'
      skipped++
      continue
    }

    if (existingNames.has(businessName.toLowerCase().trim())) {
      duplicates++; continue
    }

    // Determine partner type
    let partnerType = 'other'
    if (bizType.includes('rescue') || currentSection === 'rescue') partnerType = 'rescue'
    else if (bizType.includes('food') || bizType.includes('restaurant')) partnerType = 'food_vendor'
    else if (bizType.includes('pet')) partnerType = 'pet_business'
    else if (bizType.includes('entertainment')) partnerType = 'entertainment'
    else if (bizType.includes('retail') || bizType.includes('shop')) partnerType = 'pet_retail'
    else if (bizType.includes('groomer') || bizType.includes('groom')) partnerType = 'groomer'
    else if (bizType.includes('merch') || bizType.includes('vendor') || currentSection === 'vendor') partnerType = 'merch_vendor'
    else partnerType = 'local_business'

    const eventsAttended = clean(r[1])
    const eventsArray = eventsAttended ? eventsAttended.split(/[,\n\r]+/).map(s => s.trim()).filter(Boolean) : null

    const notesParts = []
    if (clean(r[0])) notesParts.push(clean(r[0]).substring(0, 500))
    if (clean(r[8])) notesParts.push(`GD Client: ${clean(r[8])}`)
    if (clean(r[9])) notesParts.push(`Current Partnership: ${clean(r[9])}`)
    const notes = notesParts.join(' | ') || null

    // Parse IG handle
    const igRaw = clean(r[10])
    let instagramHandle = null
    if (igRaw.includes('instagram.com')) {
      const match = igRaw.match(/instagram\.com\/([^/?]+)/)
      if (match) instagramHandle = match[1]
    } else if (igRaw) instagramHandle = igRaw.replace('@', '')

    const record = {
      name: businessName,
      partner_type: partnerType,
      status: 'prospect',
      contact_name: clean(r[4]) || null,
      contact_phone: clean(r[5]) || null,
      contact_email: clean(r[6]) || null,
      website: clean(r[7]) || null,
      instagram_handle: instagramHandle,
      facebook_url: clean(r[11]) || null,
      tiktok_handle: clean(r[12]) || null,
      youtube_url: clean(r[13]) || null,
      events_attended: eventsArray,
      notes: notes ? `[ADPA Vendor] ${notes}` : '[ADPA Vendor]'
    }

    const { error } = await supabase.from('marketing_partners').insert(record)
    if (error) {
      console.error(`  ⚠ ADPA Row ${i} (${businessName}): ${error.message}`)
      skipped++
    } else {
      existingNames.add(businessName.toLowerCase().trim())
      inserted++
    }
  }

  // ── Tab 27: 25 GD LAND Vendors ──
  console.log('  ── Processing: 25 GD LAND Vendors ──')
  const ws27 = wb.Sheets['25 GD LAND Vendors ']
  const rows27 = XLSX.utils.sheet_to_json(ws27, { header: 1, defval: '' })

  // Row 2 header: (0 blank), RESCUES(1), (2-4 blank), NAME(5), EMAIL(6), (7 blank), PHONE(8), ...
  for (let i = 3; i < rows27.length; i++) {
    const r = rows27[i]
    const businessName = clean(r[1])

    if (!businessName) { skipped++; continue }

    if (existingNames.has(businessName.toLowerCase().trim())) {
      duplicates++; continue
    }

    // These are primarily rescue organizations
    const record = {
      name: businessName,
      partner_type: 'rescue',
      status: 'prospect',
      contact_name: clean(r[5]) || null,
      contact_email: clean(r[6]) || null,
      contact_phone: clean(r[8]) || null,
      notes: '[GreenDogLand Vendor/Rescue]'
    }

    const { error } = await supabase.from('marketing_partners').insert(record)
    if (error) {
      console.error(`  ⚠ GDL Row ${i} (${businessName}): ${error.message}`)
      skipped++
    } else {
      existingNames.add(businessName.toLowerCase().trim())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 4. PET SHOPS → marketing_partners ───────────────────────────────
async function importPetShops() {
  console.log('\n═══ 4. Importing Pet Shops → marketing_partners ═══')
  const ws = wb.Sheets['Pet Shops']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const { data: existing } = await supabase
    .from('marketing_partners')
    .select('name')
  const existingNames = new Set(
    (existing || []).map(r => (r.name || '').toLowerCase().trim())
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Row 3 header: SHOP NAME(0), ADDRESS(1), PHONE NUMBER(2), PROXIMITY TO AETNA(3),
  //   WEBSITE(4), CONTACT(5), NOTES(6)
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i]
    const shopName = clean(r[0])

    if (!shopName) { skipped++; continue }

    // Skip section headers
    const lower = shopName.toLowerCase()
    if (lower.includes('area') || lower === 'pet shops' || lower.includes('outreach') ||
        lower.includes('shop name') || lower.includes('exotics')) {
      skipped++; continue
    }

    if (existingNames.has(shopName.toLowerCase().trim())) {
      duplicates++; continue
    }

    const record = {
      name: shopName,
      partner_type: 'exotic_shop',
      status: 'prospect',
      address: clean(r[1]) || null,
      contact_phone: clean(r[2]) || null,
      proximity_to_location: clean(r[3]) || null,
      website: clean(r[4]) || null,
      contact_name: clean(r[5]) || null,
      notes: clean(r[6]) ? `[Pet Shop/Exotics] ${clean(r[6])}` : '[Pet Shop/Exotics Outreach]'
    }

    const { error } = await supabase.from('marketing_partners').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${shopName}): ${error.message}`)
      skipped++
    } else {
      existingNames.add(shopName.toLowerCase().trim())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 5. CE OUTREACH → marketing_partners ─────────────────────────────
async function importCEOutreach() {
  console.log('\n═══ 5. Importing CE Outreach Resources → marketing_partners ═══')
  const ws = wb.Sheets['CE Outreach Resources ']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const { data: existing } = await supabase
    .from('marketing_partners')
    .select('name, contact_email')
  const existingEmails = new Set(
    (existing || []).map(r => (r.contact_email || '').toLowerCase().trim()).filter(Boolean)
  )
  const existingNames = new Set(
    (existing || []).map(r => (r.name || '').toLowerCase().trim())
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Row 1 header: Email(0), Name(1), Source(2), Status/Date/Initials(3)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i]
    const email = clean(r[0])
    const name = clean(r[1])
    const source = clean(r[2])
    const status = clean(r[3])

    // Must have email
    if (!email || !email.includes('@')) { skipped++; continue }

    // Duplicate check by email
    if (existingEmails.has(email.toLowerCase().trim())) {
      duplicates++; continue
    }

    // Use source or name as the partner name
    const partnerName = name || source || email.split('@')[0]

    // Check by name too
    if (existingNames.has(partnerName.toLowerCase().trim())) {
      duplicates++; continue
    }

    const record = {
      name: partnerName,
      partner_type: 'association', // CE contacts are professional associations/individuals
      status: 'prospect',
      contact_email: email,
      contact_name: name || null,
      services_provided: source || null,
      notes: status ? `[CE Outreach] ${status.substring(0, 500)}` : '[CE Outreach Contact]'
    }

    const { error } = await supabase.from('marketing_partners').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${partnerName}): ${error.message}`)
      skipped++
    } else {
      existingEmails.add(email.toLowerCase().trim())
      existingNames.add(partnerName.toLowerCase().trim())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 6. TESTIMONIALS → marketing_testimonials ────────────────────────
async function importTestimonials() {
  console.log('\n═══ 6. Importing TESTIMONIALS → marketing_testimonials ═══')
  const ws = wb.Sheets['TESTIMONIALS']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Get existing for duplicate checking
  const { data: existing } = await supabase
    .from('marketing_testimonials')
    .select('owner_name, pet_name')
  const existingSet = new Set(
    (existing || []).map(r => `${(r.owner_name || '').toLowerCase()}|${(r.pet_name || '').toLowerCase()}`)
  )

  let inserted = 0, skipped = 0, duplicates = 0

  // Row 1 header: DATE SHOT | WHO SHOT(0), OWNER NAME(1), PET NAME | TYPE(2),
  //   CONTACT(3), LOCATION SHOT(4), STATUS(5), FOLLOW-UP(6), NOTES(7)
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i]
    const ownerName = clean(r[1])

    if (!ownerName) { skipped++; continue }

    // Parse pet name and type
    const petInfo = clean(r[2])
    let petName = null, petType = null
    if (petInfo) {
      // Format: "Thyme - M small dog" or "M chihuahua"
      const parts = petInfo.split(/\s*-\s*/)
      petName = parts[0] || null
      petType = parts.slice(1).join(' - ') || null
    }

    // Duplicate check
    const dupKey = `${ownerName.toLowerCase()}|${(petName || '').toLowerCase()}`
    if (existingSet.has(dupKey)) {
      duplicates++; continue
    }

    // Parse date and who shot
    const dateWhoRaw = clean(r[0])
    let dateShot = null, shotBy = null
    if (dateWhoRaw) {
      // Format: "11/13 Dre + Hso"
      const dateMatch = dateWhoRaw.match(/^(\d{1,2}\/\d{1,2})/)
      if (dateMatch) {
        // Assume current year
        dateShot = `2025-${dateMatch[1].split('/').map(d => d.padStart(2, '0')).join('-')}`
      }
      const nameMatch = dateWhoRaw.replace(/^\d{1,2}\/\d{1,2}\s*/, '')
      if (nameMatch.trim()) shotBy = nameMatch.trim()
    }

    // Map status
    const statusRaw = clean(r[5]).toLowerCase()
    let status = 'pending'
    if (statusRaw.includes('edit')) status = 'editing'
    else if (statusRaw.includes('approv') || statusRaw.includes('done') || statusRaw.includes('complete')) status = 'approved'
    else if (statusRaw.includes('publish') || statusRaw.includes('post')) status = 'published'

    const record = {
      owner_name: ownerName,
      pet_name: petName,
      pet_type: petType,
      contact: clean(r[3]) || null,
      location_shot: clean(r[4]) || null,
      date_shot: dateShot,
      shot_by: shotBy,
      status,
      follow_up: clean(r[6]) || null,
      notes: clean(r[7]) || null
    }

    const { error } = await supabase.from('marketing_testimonials').insert(record)
    if (error) {
      console.error(`  ⚠ Row ${i} (${ownerName}): ${error.message}`)
      skipped++
    } else {
      existingSet.add(dupKey)
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── 7. STAFF PREFERENCES → event_staff_preferences ──────────────────
async function importEventStaff() {
  console.log('\n═══ 7. Importing Staff Preferences → event_staff_preferences ═══')

  // Get existing profiles to try linking
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')

  const profileMap = new Map()
  for (const p of (profiles || [])) {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase()
    const firstName = (p.first_name || '').toLowerCase()
    profileMap.set(fullName, p.id)
    profileMap.set(firstName, p.id)
  }

  // Get existing staff prefs for duplicate checking
  const { data: existing } = await supabase
    .from('event_staff_preferences')
    .select('staff_name')
  const existingNames = new Set(
    (existing || []).map(r => (r.staff_name || '').toLowerCase().trim())
  )

  // Build "Do Not Film" set
  const wsFilm = wb.Sheets['Do Not Film Employee List ']
  const filmRows = XLSX.utils.sheet_to_json(wsFilm, { header: 1, defval: '' })
  const doNotFilm = new Set()
  for (let i = 1; i < filmRows.length; i++) {
    const name = clean(filmRows[i][0])
    if (name) {
      // Normalize to first name for matching
      doNotFilm.add(name.toLowerCase())
      doNotFilm.add(name.split(/\s+/)[0].toLowerCase())
    }
  }

  let inserted = 0, skipped = 0, duplicates = 0

  // Events Staff List
  const wsStaff = wb.Sheets['Events Staff List']
  const staffRows = XLSX.utils.sheet_to_json(wsStaff, { header: 1, defval: '' })

  // Row 1 header: STAFF MEMBER(0), CAR Y/N?(1), Newer to Events?(2), Other Notes(3)
  for (let i = 2; i < staffRows.length; i++) {
    const r = staffRows[i]
    const staffName = clean(r[0])

    if (!staffName) { skipped++; continue }

    if (existingNames.has(staffName.toLowerCase().trim())) {
      duplicates++; continue
    }

    const hasCar = clean(r[1]).toUpperCase() === 'Y'
    const isNewRaw = clean(r[2]).toUpperCase()
    const isNew = isNewRaw === 'Y'
    const notesRaw = clean(r[3])

    // Parse do_not_schedule_with from notes
    const doNotScheduleWith = []
    if (notesRaw) {
      const schedMatch = notesRaw.match(/[Dd]o not schedule with\s+(\w+)/i)
      if (schedMatch) doNotScheduleWith.push(schedMatch[1])
    }

    // Check if this person is on the do-not-film list
    const canBeFilmed = !doNotFilm.has(staffName.toLowerCase()) &&
                        !doNotFilm.has(staffName.split(/\s+/)[0].toLowerCase())

    // Try to find matching profile
    const profileId = profileMap.get(staffName.toLowerCase()) ||
                      profileMap.get(staffName.split(/\s+/)[0].toLowerCase()) || null

    const record = {
      staff_name: staffName,
      profile_id: profileId,
      has_car: hasCar,
      is_new_to_events: isNew,
      can_be_filmed: canBeFilmed,
      scheduling_notes: notesRaw || null,
      do_not_schedule_with: doNotScheduleWith.length > 0 ? doNotScheduleWith : null,
      is_active: true
    }

    const { error } = await supabase.from('event_staff_preferences').insert(record)
    if (error) {
      console.error(`  ⚠ (${staffName}): ${error.message}`)
      skipped++
    } else {
      existingNames.add(staffName.toLowerCase().trim())
      inserted++
    }
  }

  // Also add Do-Not-Film people who aren't in the staff list yet
  for (let i = 1; i < filmRows.length; i++) {
    const fullName = clean(filmRows[i][0])
    if (!fullName) continue

    const firstName = fullName.split(/\s+/)[0]
    if (existingNames.has(fullName.toLowerCase().trim()) ||
        existingNames.has(firstName.toLowerCase().trim())) {
      continue // Already added via staff list
    }

    const profileId = profileMap.get(fullName.toLowerCase()) ||
                      profileMap.get(firstName.toLowerCase()) || null

    // Extract notes if present (e.g., "Dr. Andre De Mattos Faro - please ask Gladys...")
    let schedulingNotes = null
    if (fullName.includes(' - ')) {
      schedulingNotes = fullName.split(' - ').slice(1).join(' - ')
    }

    const displayName = fullName.split(' - ')[0].trim()

    const record = {
      staff_name: displayName,
      profile_id: profileId,
      can_be_filmed: false, // Explicitly on the do-not-film list
      scheduling_notes: schedulingNotes,
      is_active: true
    }

    const { error } = await supabase.from('event_staff_preferences').insert(record)
    if (error) {
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        console.error(`  ⚠ DoNotFilm (${displayName}): ${error.message}`)
      }
      skipped++
    } else {
      existingNames.add(displayName.toLowerCase().trim())
      inserted++
    }
  }

  console.log(`  ✅ Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped: ${skipped}`)
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const tabArg = process.argv[2] ? parseInt(process.argv[2]) : null

  console.log('📊 Marketing Spreadsheet Import — Phase 2')
  console.log('════════════════════════════════════════════════════════')

  const importFns = [
    { num: 1, name: 'Old Influencers', fn: importOldInfluencers },
    { num: 2, name: '2026 Event List', fn: importEventList },
    { num: 3, name: 'Vendor/Rescue Contacts', fn: importVendorRescueContacts },
    { num: 4, name: 'Pet Shops', fn: importPetShops },
    { num: 5, name: 'CE Outreach', fn: importCEOutreach },
    { num: 6, name: 'Testimonials', fn: importTestimonials },
    { num: 7, name: 'Event Staff Preferences', fn: importEventStaff },
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
  console.log('✅ Phase 2 import complete!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
