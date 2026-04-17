/**
 * Batch Geocode Script
 * =====================
 * Geocodes addresses for marketing events and referral partners
 * that don't have coordinates yet.
 * 
 * Usage: npx tsx scripts/batch-geocode.ts
 */
import { createClient } from '@supabase/supabase-js'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ GOOGLE_MAPS_API_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface GeocodeResult {
  lat: number
  lng: number
  formatted_address: string
  place_id: string
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results.length) {
      console.warn(`  ⚠️ Could not geocode: ${address}`)
      return null
    }

    const result = data.results[0]
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id
    }
  } catch (error) {
    console.error(`  ❌ Error geocoding ${address}:`, error)
    return null
  }
}

async function geocodeMarketingEvents() {
  console.log('\n📍 Geocoding Marketing Events...\n')

  const { data: events, error } = await supabase
    .from('marketing_events')
    .select('id, name, location')
    .not('location', 'is', null)
    .is('venue_latitude', null)

  if (error) {
    console.error('Failed to fetch events:', error)
    return
  }

  console.log(`Found ${events?.length || 0} events needing geocoding\n`)

  let success = 0
  let failed = 0

  for (const event of events || []) {
    if (!event.location) continue

    console.log(`Processing: ${event.name}`)
    console.log(`  Address: ${event.location}`)

    const result = await geocodeAddress(event.location)
    
    if (result) {
      const { error: updateError } = await supabase
        .from('marketing_events')
        .update({
          venue_latitude: result.lat,
          venue_longitude: result.lng,
          venue_place_id: result.place_id
        })
        .eq('id', event.id)

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`)
        failed++
      } else {
        console.log(`  ✅ Geocoded: ${result.lat}, ${result.lng}`)
        success++
      }
    } else {
      failed++
    }

    // Rate limiting: 50 requests per second max
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n✅ Events: ${success} geocoded, ${failed} failed`)
}

async function geocodeReferralPartners() {
  console.log('\n📍 Geocoding Referral Partners...\n')

  const { data: partners, error } = await supabase
    .from('referral_partners')
    .select('id, name, address')
    .not('address', 'is', null)
    .is('latitude', null)

  if (error) {
    console.error('Failed to fetch partners:', error)
    return
  }

  console.log(`Found ${partners?.length || 0} partners needing geocoding\n`)

  let success = 0
  let failed = 0

  for (const partner of partners || []) {
    if (!partner.address) continue

    console.log(`Processing: ${partner.name}`)
    console.log(`  Address: ${partner.address}`)

    const result = await geocodeAddress(partner.address)
    
    if (result) {
      const { error: updateError } = await supabase
        .from('referral_partners')
        .update({
          latitude: result.lat,
          longitude: result.lng,
          place_id: result.place_id,
          geocoded_address: result.formatted_address
        })
        .eq('id', partner.id)

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`)
        failed++
      } else {
        console.log(`  ✅ Geocoded: ${result.lat}, ${result.lng}`)
        success++
      }
    } else {
      failed++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n✅ Partners: ${success} geocoded, ${failed} failed`)
}

async function geocodeLocations() {
  console.log('\n📍 Geocoding Clinic Locations...\n')

  const { data: locations, error } = await supabase
    .from('locations')
    .select('id, name, address')
    .not('address', 'is', null)
    .is('latitude', null)

  if (error) {
    console.error('Failed to fetch locations:', error)
    return
  }

  console.log(`Found ${locations?.length || 0} locations needing geocoding\n`)

  let success = 0
  let failed = 0

  for (const location of locations || []) {
    if (!location.address) continue

    console.log(`Processing: ${location.name}`)
    console.log(`  Address: ${location.address}`)

    const result = await geocodeAddress(location.address)
    
    if (result) {
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          latitude: result.lat,
          longitude: result.lng,
          place_id: result.place_id
        })
        .eq('id', location.id)

      if (updateError) {
        console.error(`  ❌ Failed to update: ${updateError.message}`)
        failed++
      } else {
        console.log(`  ✅ Geocoded: ${result.lat}, ${result.lng}`)
        success++
      }
    } else {
      failed++
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n✅ Locations: ${success} geocoded, ${failed} failed`)
}

async function main() {
  console.log('🗺️  Google Maps Batch Geocoding Script')
  console.log('=====================================\n')

  await geocodeLocations()
  await geocodeMarketingEvents()
  await geocodeReferralPartners()

  console.log('\n✅ Geocoding complete!')
}

main().catch(console.error)
