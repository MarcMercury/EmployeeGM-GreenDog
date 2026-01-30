/**
 * Test script for CSV referral parsing
 * Run with: node scripts/test-referral-csv-parse.cjs
 */

const fs = require('fs')
const path = require('path')

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  fields.push(current.trim())
  return fields
}

// Parse CSV content
function parseCSVContent(csvText) {
  // Normalize line endings (handle Windows CRLF)
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')
  const referrals = []
  const skippedUnknown = []
  const summaryRows = []
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = parseCSVLine(line)
    
    if (fields.length < 7) continue
    
    const dateTime = fields[0].trim()
    const clinicName = fields[1].trim()
    const amountStr = fields[6].trim()
    
    // Skip summary rows (empty date)
    if (!dateTime) {
      const amount = parseFloat(amountStr.replace(/[,$]/g, '')) || 0
      if (amount > 0) {
        summaryRows.push({ clinicName, amount })
      }
      continue
    }
    
    // Track Unknown Clinic entries
    if (clinicName.toLowerCase() === 'unknown clinic') {
      const amount = parseFloat(amountStr.replace(/[,$]/g, '')) || 0
      skippedUnknown.push({ date: dateTime, amount })
      continue
    }
    
    // Skip empty clinic names
    if (!clinicName) {
      continue
    }
    
    const amount = parseFloat(amountStr.replace(/[,$]/g, '')) || 0
    if (amount <= 0) continue
    
    referrals.push({
      clinicName,
      amount,
      date: dateTime
    })
  }
  
  return { referrals, skippedUnknown, summaryRows }
}

// Aggregate by clinic
function aggregateByClinic(referrals) {
  const clinicMap = new Map()
  
  for (const ref of referrals) {
    const existing = clinicMap.get(ref.clinicName) || { visits: 0, revenue: 0 }
    existing.visits += 1
    existing.revenue += ref.amount
    clinicMap.set(ref.clinicName, existing)
  }
  
  return Array.from(clinicMap.entries()).map(([clinicName, stats]) => ({
    clinicName,
    totalVisits: stats.visits,
    totalRevenue: Math.round(stats.revenue * 100) / 100
  }))
}

// Main test
async function main() {
  const csvPath = path.join(__dirname, '..', 'public', 'Referral Example.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath)
    process.exit(1)
  }
  
  console.log('Reading CSV from:', csvPath)
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  console.log('CSV size:', csvText.length, 'characters')
  console.log('Lines:', csvText.split('\n').length)
  
  console.log('\n========================================')
  console.log('PARSING CSV...')
  console.log('========================================\n')
  
  const { referrals, skippedUnknown, summaryRows } = parseCSVContent(csvText)
  
  console.log('Summary rows (clinic totals):', summaryRows.length)
  console.log('Detail rows parsed (known clinics):', referrals.length)
  console.log('Unknown Clinic rows skipped:', skippedUnknown.length)
  
  // Show first few referrals
  console.log('\nFirst 10 parsed referrals:')
  for (const ref of referrals.slice(0, 10)) {
    console.log(`  - ${ref.date} | ${ref.clinicName} | $${ref.amount}`)
  }
  
  console.log('\n========================================')
  console.log('AGGREGATING BY CLINIC...')
  console.log('========================================\n')
  
  const aggregated = aggregateByClinic(referrals)
  console.log('Unique clinics:', aggregated.length)
  
  // Sort by revenue descending
  aggregated.sort((a, b) => b.totalRevenue - a.totalRevenue)
  
  console.log('\nTop 20 clinics by revenue:')
  for (const agg of aggregated.slice(0, 20)) {
    console.log(`  - ${agg.clinicName}: ${agg.totalVisits} visits, $${agg.totalRevenue.toLocaleString()}`)
  }
  
  // Calculate totals
  const totalVisits = aggregated.reduce((sum, a) => sum + a.totalVisits, 0)
  const totalRevenue = aggregated.reduce((sum, a) => sum + a.totalRevenue, 0)
  const unknownRevenue = skippedUnknown.reduce((sum, s) => sum + s.amount, 0)
  
  console.log('\n========================================')
  console.log('SUMMARY')
  console.log('========================================')
  console.log(`\nAttributable (known clinics):`)
  console.log(`  Total Visits: ${totalVisits.toLocaleString()}`)
  console.log(`  Total Revenue: $${totalRevenue.toLocaleString()}`)
  console.log(`\nUnattributable (Unknown Clinic):`)
  console.log(`  Skipped Visits: ${skippedUnknown.length.toLocaleString()}`)
  console.log(`  Skipped Revenue: $${unknownRevenue.toLocaleString()}`)
  console.log(`\nGrand Total:`)
  console.log(`  All Visits: ${(totalVisits + skippedUnknown.length).toLocaleString()}`)
  console.log(`  All Revenue: $${(totalRevenue + unknownRevenue).toLocaleString()}`)
  
  // Compare with summary rows
  const summaryTotal = summaryRows.reduce((sum, s) => sum + s.amount, 0)
  console.log(`\nCSV Summary Row Total: $${summaryTotal.toLocaleString()}`)
}

main().catch(console.error)
