/**
 * Update Revenue Data for Referral Partners
 * 
 * This script updates the revenue_ytd field for matching referral partners
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Revenue data from user - aggregated by clinic (summing duplicates)
const revenueData: Record<string, number> = {}

const rawData = `
Beverly Hills Small Animal Hospital	$85.00
Center - Sinai Animal Hospital	$100.80
Culver City Animal Hospital	$114.00
Sevilla Veterinary Hospital	$249.00
Stewart Veterinary Group	$254.60
Paws and Claws Hospital and Mobile Vet	$369.00
East Village Animal Clinic	$384.35
Veterinary HealthCare Center	$445.00
Pacific Animal Clinic	$490.80
Vca Miller Robertson 	$1,171.63
Vermont Animal Hospital	$1,327.83
Park La Brea  Veterinary Care	$1,335.01
Metropolitian Animal Specialty Hospital	$1,440.79
Los Feliz Small Animal Hospital	$1,954.27
El Segundo Animal Hospital	$2,000.00
Animal Medical Center Valenicia	$5,852.86
Let's MoVet Mobile Veterinary Care	$890.80
Brent- Air Animal Hospital	$1,264.63
Hancock Park Vet Clinic	$1,481.57
The Cat Hospital	$1,828.83
Larchmont Village Vet	$4,586.94
Animal Wellness Center	$6,928.06
Manhattan Beach Animal Hospital	$249.80
Antelope Valley Animal Hospital	$334.18
Pacific Palisades Veterinary Center	$854.00
Glendale Small Animal Hospital	$1,006.20
Los Angeles Veterinary Center	$1,483.09
Dog and Cat Hospital Calabasas	$2,207.91
West La. Veterinary Group	$2,873.00
Laurel Pet Hospital	$3,849.61
Westside Pet Clinic	$4,449.82
Pasternak Vet Center	$898.00
Vca Venture Animal Hospital	$3,179.00
Melrose Veterinary Hospital	$4,515.15
Holistika Veterinary	$5,083.15
Corona Community Animal Hospital	$677.20
Vca Wilshire Animal Hospital	$8,631.44
California Animal Rehab	$1,425.91
Shane Veterinary Medical Center	$1,687.79
Rancho Park Veterinary Clinic	$8,068.89
Emerald Animal Hospital	$1,521.76
Veterinary Emergency Group	$1,735.20
Palisades Animal Clinic	$12,427.46
Palms and Paws Veterinary Center	$24,430.05
Beverly Robertson Veterinarian	$11,293.33
Malibu Coast Animal Hospital	$7,455.01
Marina Veterinary Center	$8,021.39
Elite Veterinary Group	$12,172.92
Santa Monica Pet medical Center	$12,854.19
Vca Santa Monica Dog and Cat	$15,672.51
Vca Marina Bay Cities Animal Hospital	$13,662.74
VCA Asec	$16,329.69
Overland Veterinary Clinic	$13,186.73
Modern Animal Santa Monica	$25,503.40
Vca West Los Animal Hospital	$13,794.58
Centinela Animal Hospital	$99,286.90
Bay Animal Hospital	$1,700.50
San Fernando Pet Hospital	$85.00
Veterinary Angeles Medical Center	$85.00
Beverly Hills Small Animal Hospital	$85.00
Beverly Oaks Animal Hospital	$130.00
Center Sinai Animal Hospital	$145.00
Emerald Animal Hospital	$156.00
Affordable Animal Hospital Silver Lake	$249.00
Cahuenga Animal Hosptial	$249.00
Vca West Los Angeles Animal Hospital	$747.00
Beverly Robertson Veterinarian	$249.00
Glendale Small Animal Hospital	$252.87
VCA VSV	$280.00
Best Friends Animal Hospital	$280.00
Los Altos Veterinary Clinic	$351.52
Holistika Veterinary 	$444.00
Santa Monica Pet Medical Center	$1,403.79
The Veterinary Care Center	$2,212.17
Tarzana Pet Clinic	$3,724.33
Vca Tlc Animal Hospital	$440.79
Veterinary Medical Center	$786.59
Mohawk Alley Animal Hospital	$1,893.67
Vca McClave Veterinary Hospital	$2,219.99
SouthPaw Vets	$2,067.97
Vca McClave Veterinary Hospital	$2,219.99
Overland Veterinary Clinic	$2,910.00
Sherman Oaks Veterinary group	$4,859.33
McGrath Veterinary Center 	$583.00
Los Feliz small hospital	$795.44
Winnetka Animal Clinic	$834.25
SouthPaw Vets	$2,340.97
Dog and Cat Hospital Calabasas	$2,744.00
Mid Valley Veterinary Hospital	$7,757.48
Townsgate Pet Hospital	$9,265.96
Studio City City Animal Hospital	$1,198.00
Encino Veterinary Center	$1,790.87
Vca Miller Robertson	$4,501.76
Modern Animal Studio City	$4,548.62
Larchmont Village Vet	$6,389.99
Centinela Animal Hospital	$2,583.77
Van Nuys Veterinary Clinic	$9,599.15
California Animal Rehab	$164.00
Cresenta Valley Veterinary Hospital	$25.00
Rancho Park Veterinary Clinic	$30.00
Value Vet	$85.00
VCA McClave Veterinary Hospital	$159.00
TownsGate Pet Hospital	$249.00
Melrose Veterinary Hospital	$249.00
Vet Villa Animal Hospital	$249.00
Mission Veterinary Clinic and Animal hosipital	$280.00
Emerald Animal Hospital	$292.37
LA Pet Clinic	$393.00
Panorama Pet Hospital	$570.80
Tarzana Pet Clinic	$609.00
Veterinary HealthCare Center	$1,445.41
Animal Medical Center (Valencia)	$1,567.35
Holistika Veterinary 	$3,143.19
Vca Chatoak	$5,545.18
Beverly Oaks Animal Hospital	$254.60
Paws and Claws Hospital and Mobile	$909.20
Encino Veterinary	$914.52
Southpaws Vets	$1,490.40
Winnetka Animal Clinic	$2,077.63
Vca Wilshire Animal Hospital	$2,614.33
Vca VSV	$2,778.77
Best Friends Hospital	$3,018.88
McGrath Veterinary center	$3,280.00
Burbank Veterinary Center	$4,773.00
Pet Orphans Of Southern California	$172.88
Calabasas Animal Clinic And Holistic Vet Center	$412.78
Dog and Cat Hospital Calabasas	$604.80
Vca Miller Robertson	$2,904.47
Media City Animal Hospital	$3,309.12
Vca Marina Bay Cities	$4,089.75
VCA Animal Medical Center of Southern California	$4,816.92
Studio City Animal Hospital	$639.20
Sherman Oaks Veterinary Group	$941.50
CozyCroft Pet Hospital	$4,509.80
Southern California Veterinary Hospital	$1,245.88
Centinela Animal Hospital	$2,083.00
Glendale Small Animal Hospital	$2,218.77
Los Feliz Animal Hospital	$6,008.05
Modern Animal (Studio City)	$11,611.82
Van nuys veterinary Clinic 	$30,094.55
VCA West LA 	$32,920.99
VCA ASEC	$3,185.93
MidValley Veternary Hospital	$6,000.00
`

// Parse the raw data and aggregate by normalized clinic name
function normalizeClinicName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/vca/g, '')
    .replace(/veterinary|vet|animal|hospital|clinic|center|centre|pet/g, '')
    .trim()
}

function parseRevenue(revenueStr: string): number {
  // Remove $ and commas, then parse as float
  return parseFloat(revenueStr.replace(/[$,]/g, ''))
}

// Parse raw data and aggregate
const lines = rawData.trim().split('\n')
for (const line of lines) {
  const parts = line.split('\t')
  if (parts.length >= 2) {
    const clinicName = parts[0].trim()
    const revenue = parseRevenue(parts[1])
    
    if (clinicName && !isNaN(revenue)) {
      const normalized = normalizeClinicName(clinicName)
      // Sum up revenue for duplicate clinics
      revenueData[normalized] = (revenueData[normalized] || 0) + revenue
      
      // Also store original name mappings for better matching
      revenueData[clinicName.toLowerCase().trim()] = (revenueData[clinicName.toLowerCase().trim()] || 0) + revenue
    }
  }
}

console.log(`Parsed ${Object.keys(revenueData).length / 2} unique clinics with revenue data`)

async function main() {
  console.log('=== Revenue Data Update ===\n')
  
  // Load existing referral partners
  console.log('Loading existing referral partners...')
  
  const { data: existingPartners, error: loadError } = await supabase
    .from('referral_partners')
    .select('id, hospital_name, name, revenue_ytd, total_revenue_all_time')
  
  if (loadError) {
    console.error('Error loading partners:', loadError)
    return
  }
  
  console.log(`Loaded ${existingPartners?.length || 0} existing partners\n`)
  
  let matches = 0
  let updates = 0
  const unmatched: string[] = []
  const matchedClinics = new Set<string>()
  
  for (const partner of existingPartners || []) {
    const normalizedHospital = normalizeClinicName(partner.hospital_name)
    const normalizedName = partner.name ? normalizeClinicName(partner.name) : ''
    const lowerHospital = partner.hospital_name.toLowerCase().trim()
    const lowerName = partner.name?.toLowerCase().trim() || ''
    
    // Try to find matching revenue
    let revenue = revenueData[normalizedHospital] || 
                  revenueData[normalizedName] ||
                  revenueData[lowerHospital] ||
                  revenueData[lowerName]
    
    if (revenue) {
      matches++
      matchedClinics.add(partner.hospital_name)
      
      // Round to 2 decimal places
      revenue = Math.round(revenue * 100) / 100
      
      const { error: updateError } = await supabase
        .from('referral_partners')
        .update({ 
          revenue_ytd: revenue,
          total_revenue_all_time: revenue // Also update total revenue
        })
        .eq('id', partner.id)
      
      if (updateError) {
        console.error(`Error updating ${partner.hospital_name}:`, updateError)
      } else {
        updates++
        console.log(`  Updated: ${partner.hospital_name} -> $${revenue.toLocaleString()}`)
      }
    }
  }
  
  // Find unmatched revenue entries
  const processedNormalized = new Set<string>()
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const clinicName = parts[0].trim()
      const normalized = normalizeClinicName(clinicName)
      
      if (processedNormalized.has(normalized)) continue
      processedNormalized.add(normalized)
      
      let found = false
      for (const partner of existingPartners || []) {
        if (normalizeClinicName(partner.hospital_name) === normalized ||
            (partner.name && normalizeClinicName(partner.name) === normalized)) {
          found = true
          break
        }
      }
      
      if (!found) {
        unmatched.push(clinicName)
      }
    }
  }
  
  console.log(`\n=== Summary ===`)
  console.log(`Matched: ${matches}`)
  console.log(`Updated: ${updates}`)
  console.log(`Unmatched revenue entries: ${unmatched.length}`)
  
  if (unmatched.length > 0) {
    console.log(`\nUnmatched clinics (no CRM record found):`)
    unmatched.forEach(n => console.log(`  - ${n}`))
  }
  
  console.log('\n=== Update Complete ===')
}

main().catch(console.error)
