import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import path from 'node:path'
import dotenv from 'dotenv'

dotenv.config()

const WORKBOOK_PATH = path.join(process.cwd(), 'data', 'Appointments', 'MANAGERS - Office Supplies_Vendors_Accounts.xlsx')
const WRITE_MODE = process.argv.includes('--write')

const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const LOCATION_ALIASES: Record<string, string[]> = {
  venice: ['venice', 've', 'ven'],
  sherman_oaks: ['sherman oaks', 'so'],
  aetna: ['aetna', 'the valley', 'valley', 'van nuys', 'gdvc', 'green dog dental veterinary center']
}

type PartnerSeed = {
  name: string
  category: string
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  website?: string | null
  notes?: string | null
  accountNumber?: string | null
  products?: string[]
}

type ResourceSeed = {
  name: string
  companyName?: string | null
  resourceType: string
  phone?: string | null
  email?: string | null
  website?: string | null
  serviceArea?: string | null
  notes?: string | null
  locationAliases: string[]
}

type LocationRow = {
  id: string
  name: string
  code?: string | null
}

function normalizeName(value: string | null | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizePhone(value: string | null | undefined): string | null {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits || null
}

function cleanCell(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function cleanUrl(value: string): string | null {
  const url = cleanCell(value)
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  if (url.includes('.')) return `https://${url}`
  return null
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(value => cleanCell(value)).filter(Boolean))]
}

function mergeNotes(...values: Array<string | null | undefined>): string | null {
  const parts = values
    .flatMap(value => cleanCell(value).split('|'))
    .map(part => cleanCell(part))
    .filter(Boolean)

  return parts.length ? [...new Set(parts)].join(' | ') : null
}

function getSheetRows(workbook: XLSX.WorkBook, name: string): any[][] {
  const sheet = workbook.Sheets[name]
  if (!sheet) {
    throw new Error(`Missing sheet: ${name}`)
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
}

function isSectionRow(row: any[]): boolean {
  const cells = row.map(cleanCell)
  return Boolean(cells[0] && cells.slice(1).every(cell => !cell))
}

function parseVendors(rows: any[][]): PartnerSeed[] {
  const partners: PartnerSeed[] = []
  let currentSection = 'Retail & Office Supply'

  for (const row of rows.slice(1)) {
    const companyName = cleanCell(row[0])
    const contactName = cleanCell(row[1])
    const phone = cleanCell(row[2])
    const emailOrUsername = cleanCell(row[3])
    const website = cleanCell(row[5])
    const accountNumber = cleanCell(row[7])
    const notes = cleanCell(row[8])

    if (!companyName) continue
    if (isSectionRow(row)) {
      currentSection = companyName
      continue
    }
    if (!contactName && !phone && !emailOrUsername && !website && !accountNumber && !notes) {
      continue
    }

    partners.push({
      name: companyName,
      category: currentSection || 'Retail & Office Supply',
      contactName: contactName || null,
      contactEmail: emailOrUsername.includes('@') ? emailOrUsername : null,
      website: cleanUrl(website),
      contactPhone: phone || null,
      accountNumber: accountNumber || null,
      notes: notes || null,
      products: []
    })
  }

  return partners
}

function parseOfficeSupply(rows: any[][]): PartnerSeed[] {
  const aggregate = new Map<string, PartnerSeed>()

  for (const row of rows.slice(2)) {
    const product = cleanCell(row[0])
    const website = cleanCell(row[1])
    const store = cleanCell(row[2])

    if (!product || /^cleaning supplies$/i.test(product)) continue
    if (!store && !website) continue

    const name = store || new URL(cleanUrl(website) || 'https://unknown.local').hostname.replace(/^www\./, '')
    const key = normalizeName(name)
    const existing = aggregate.get(key)
    const mergedProducts = uniqueStrings([...(existing?.products || []), product])

    aggregate.set(key, {
      name,
      category: 'Office Supply',
      website: existing?.website || cleanUrl(website),
      notes: existing?.notes || 'Imported from Office Supply inventory sheet',
      products: mergedProducts
    })
  }

  return [...aggregate.values()]
}

function mapResourceType(service: string): string {
  const normalized = normalizeName(service)
  if (normalized.includes('hvac')) return 'hvac'
  if (normalized.includes('plumb')) return 'plumber'
  if (normalized.includes('electric')) return 'electrician'
  if (normalized.includes('utility')) return 'other'
  return 'handyman'
}

function extractLocationAliases(raw: string): string[] {
  const value = cleanCell(raw)
  if (!value) return []

  return uniqueStrings(
    value
      .split(/[\/,]+/)
      .flatMap(part => part.split(/\band\b/i))
      .map(part => part.trim())
  )
}

function parseFacilityResources(rows: any[][]): ResourceSeed[] {
  const resources: ResourceSeed[] = []

  for (const row of rows.slice(1)) {
    const service = cleanCell(row[0])
    const name = cleanCell(row[1])
    const locations = cleanCell(row[2])
    const phone = cleanCell(row[3])
    const email = cleanCell(row[4])
    const notes = cleanCell(row[5])

    if (!name || !service) continue

    resources.push({
      name,
      resourceType: mapResourceType(service),
      phone: phone || null,
      email: email && email.toLowerCase() !== 'n/a' ? email : null,
      serviceArea: locations || null,
      notes: uniqueStrings([service, notes]).join(' | ') || null,
      locationAliases: extractLocationAliases(locations)
    })
  }

  return resources
}

function mergePartners(...partnerLists: PartnerSeed[][]): PartnerSeed[] {
  const merged = new Map<string, PartnerSeed>()

  for (const partner of partnerLists.flat()) {
    const key = normalizeName(partner.name)
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, { ...partner, products: [...(partner.products || [])] })
      continue
    }

    merged.set(key, {
      ...existing,
      category: existing.category || partner.category,
      contactName: existing.contactName || partner.contactName,
      contactEmail: existing.contactEmail || partner.contactEmail,
      contactPhone: existing.contactPhone || partner.contactPhone,
      website: existing.website || partner.website,
      accountNumber: existing.accountNumber || partner.accountNumber,
        notes: mergeNotes(existing.notes, partner.notes),
      products: uniqueStrings([...(existing.products || []), ...(partner.products || [])])
    })
  }

  return [...merged.values()]
}

function findLocationIds(aliases: string[], locations: LocationRow[]): string[] {
  if (!aliases.length) return []

  const matched = new Set<string>()

  for (const alias of aliases.map(normalizeName)) {
    for (const location of locations) {
      const haystacks = [location.name, location.code]
        .filter(Boolean)
        .map(value => normalizeName(value))

      const isDirectMatch = haystacks.some(value => value === alias || value.includes(alias) || alias.includes(value))
      const isAliasMatch = Object.values(LOCATION_ALIASES).some(group => group.includes(alias) && group.some(candidate => haystacks.some(value => value.includes(candidate))))

      if (isDirectMatch || isAliasMatch) {
        matched.add(location.id)
      }
    }
  }

  return [...matched]
}

async function main() {
  const workbook = XLSX.readFile(WORKBOOK_PATH)

  const partnerSeeds = mergePartners(
    parseVendors(getSheetRows(workbook, 'RETAIL WEBSITES & VENDORS')),
    parseOfficeSupply(getSheetRows(workbook, 'OFFICE SUPPLY'))
  )
  const resourceSeeds = parseFacilityResources(getSheetRows(workbook, 'HANDYMEN-PLIUMBERS-Utilities'))

  console.log(`Parsed ${partnerSeeds.length} Med Ops partner candidates and ${resourceSeeds.length} facility resource candidates from workbook.`)

  if (!supabaseUrl || !supabaseKey) {
    if (WRITE_MODE) {
      throw new Error('Missing SUPABASE_URL/NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY')
    }
    console.log('No Supabase credentials found. Parsed workbook successfully, but skipped database sync.')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const [partnersRes, contactsRes, resourcesRes, locationsRes, assignmentsRes] = await Promise.all([
    supabase.from('med_ops_partners').select('id, name, category, contact_name, contact_email, contact_phone, website, notes, account_number, products'),
    supabase.from('med_ops_partner_contacts').select('id, partner_id, name, email, phone'),
    supabase.from('facility_resources').select('id, name, company_name, resource_type, phone, email, website, service_area, notes'),
    supabase.from('locations').select('id, name, code').eq('is_active', true),
    supabase.from('facility_resource_locations').select('resource_id, location_id')
  ])

  for (const response of [partnersRes, contactsRes, resourcesRes, locationsRes, assignmentsRes]) {
    if (response.error) throw response.error
  }

  const existingPartners = partnersRes.data || []
  const existingContacts = contactsRes.data || []
  const existingResources = resourcesRes.data || []
  const locations = (locationsRes.data || []) as LocationRow[]
  const existingAssignments = assignmentsRes.data || []

  const existingPartnerMap = new Map(existingPartners.map(row => [normalizeName(row.name), row]))
  const existingResourceMap = new Map(existingResources.map(row => [normalizeName(row.name), row]))
  const existingContactKeys = new Set(
    existingContacts.map(contact => `${contact.partner_id}:${normalizeName(contact.name)}:${normalizeName(contact.email)}:${normalizePhone(contact.phone) || ''}`)
  )
  const existingAssignmentKeys = new Set(existingAssignments.map(row => `${row.resource_id}:${row.location_id}`))

  let insertedPartners = 0
  let updatedPartners = 0
  let insertedContacts = 0
  let insertedResources = 0
  let updatedResources = 0
  let insertedAssignments = 0

  for (const seed of partnerSeeds) {
    const existing = existingPartnerMap.get(normalizeName(seed.name))
    const payload = {
      name: seed.name,
      category: seed.category,
      contact_name: seed.contactName || null,
      contact_email: seed.contactEmail || null,
      contact_phone: seed.contactPhone || null,
      website: seed.website || null,
      notes: seed.notes || null,
      account_number: seed.accountNumber || null,
      products: seed.products?.length ? seed.products : null,
      is_active: true
    }

    let partnerId = existing?.id

    if (!existing) {
      if (WRITE_MODE) {
        const { data, error } = await supabase.from('med_ops_partners').insert(payload).select('id, name').single()
        if (error) throw error
        partnerId = data.id
        existingPartnerMap.set(normalizeName(seed.name), { ...payload, ...data })
      }
      insertedPartners += 1
    } else {
      const nextPartner = {
        category: existing.category || payload.category,
        contact_name: existing.contact_name || payload.contact_name,
        contact_email: existing.contact_email || payload.contact_email,
        contact_phone: existing.contact_phone || payload.contact_phone,
        website: existing.website || payload.website,
        account_number: existing.account_number || payload.account_number,
        products: uniqueStrings([...(existing.products || []), ...(payload.products || [])]),
        notes: mergeNotes(existing.notes, payload.notes)
      }
      const shouldUpdate = [
        existing.category !== nextPartner.category,
        (existing.contact_name || null) !== nextPartner.contact_name,
        (existing.contact_email || null) !== nextPartner.contact_email,
        (existing.contact_phone || null) !== nextPartner.contact_phone,
        (existing.website || null) !== nextPartner.website,
        (existing.account_number || null) !== nextPartner.account_number,
        JSON.stringify(existing.products || []) !== JSON.stringify(nextPartner.products),
        (existing.notes || null) !== nextPartner.notes
      ].some(Boolean)

      if (shouldUpdate) {
        if (WRITE_MODE) {
          const { error } = await supabase
            .from('med_ops_partners')
            .update({ ...payload, ...nextPartner })
            .eq('id', existing.id)
          if (error) throw error
        }
        updatedPartners += 1
      }
    }

    if (partnerId && (seed.contactName || seed.contactEmail || seed.contactPhone)) {
      const contactKey = `${partnerId}:${normalizeName(seed.contactName || seed.name)}:${normalizeName(seed.contactEmail)}:${normalizePhone(seed.contactPhone) || ''}`
      if (!existingContactKeys.has(contactKey)) {
        if (WRITE_MODE) {
          const { error } = await supabase.from('med_ops_partner_contacts').insert({
            partner_id: partnerId,
            name: seed.contactName || seed.name,
            email: seed.contactEmail || null,
            phone: seed.contactPhone || null,
            is_primary: true,
            relationship_notes: 'Imported from MANAGERS - Office Supplies_Vendors_Accounts workbook'
          })
          if (error) throw error
        }
        existingContactKeys.add(contactKey)
        insertedContacts += 1
      }
    }
  }

  for (const seed of resourceSeeds) {
    const existing = existingResourceMap.get(normalizeName(seed.name))
    const locationIds = findLocationIds(seed.locationAliases, locations)
    const payload = {
      name: seed.name,
      company_name: seed.companyName || null,
      resource_type: seed.resourceType,
      phone: seed.phone || null,
      email: seed.email || null,
      website: seed.website || null,
      service_area: seed.serviceArea || null,
      notes: seed.notes || null,
      is_active: true
    }

    let resourceId = existing?.id

    if (!existing) {
      if (WRITE_MODE) {
        const { data, error } = await supabase.from('facility_resources').insert(payload).select('id, name').single()
        if (error) throw error
        resourceId = data.id
        existingResourceMap.set(normalizeName(seed.name), { ...payload, ...data })
      }
      insertedResources += 1
    } else {
      const nextResource = {
        phone: existing.phone || payload.phone,
        email: existing.email || payload.email,
        website: existing.website || payload.website,
        service_area: existing.service_area || payload.service_area,
        notes: mergeNotes(existing.notes, payload.notes),
        resource_type: existing.resource_type || payload.resource_type
      }
      const shouldUpdate = [
        existing.resource_type !== nextResource.resource_type,
        (existing.phone || null) !== nextResource.phone,
        (existing.email || null) !== nextResource.email,
        (existing.website || null) !== nextResource.website,
        (existing.service_area || null) !== nextResource.service_area,
        (existing.notes || null) !== nextResource.notes
      ].some(Boolean)

      if (shouldUpdate) {
        if (WRITE_MODE) {
          const { error } = await supabase
            .from('facility_resources')
            .update({ ...payload, ...nextResource })
            .eq('id', existing.id)
          if (error) throw error
        }
        updatedResources += 1
      }
    }

    if (resourceId && locationIds.length) {
      for (const locationId of locationIds) {
        const assignmentKey = `${resourceId}:${locationId}`
        if (existingAssignmentKeys.has(assignmentKey)) continue

        if (WRITE_MODE) {
          const { error } = await supabase.from('facility_resource_locations').insert({
            resource_id: resourceId,
            location_id: locationId,
            is_primary: insertedAssignments === 0
          })
          if (error) throw error
        }
        existingAssignmentKeys.add(assignmentKey)
        insertedAssignments += 1
      }
    }
  }

  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} partner inserts: ${insertedPartners}`)
  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} partner updates: ${updatedPartners}`)
  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} partner contact inserts: ${insertedContacts}`)
  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} facility resource inserts: ${insertedResources}`)
  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} facility resource updates: ${updatedResources}`)
  console.log(`${WRITE_MODE ? 'Applied' : 'Planned'} resource-location inserts: ${insertedAssignments}`)

  if (!WRITE_MODE) {
    console.log('Dry run only. Re-run with --write to persist changes.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})