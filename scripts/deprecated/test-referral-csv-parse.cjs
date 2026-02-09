/**
 * Test script for CSV referral parsing
 * Run with: node scripts/test-referral-csv-parse.cjs [filename]
 * 
 * Supports two report types:
 * 1. Referrer Revenue - Date/Time,Referring Vet Clinic,...,Amount
 * 2. Referral Statistics - Clinic Name,Vet,Date of Last Referral,...
 */

const fs = require('fs')
const path = require('path')

// Detect report type from header
function detectReportType(csvText) {
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const firstLine = normalizedText.split('\n')[0].toLowerCase()
  
  if (firstLine.includes('clinic name') && firstLine.includes('date of last referral')) {
    return 'statistics'
  }
  if (firstLine.includes('date/time') && firstLine.includes('referring vet clinic')) {
    return 'revenue'
  }
  return 'unknown'
}

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

// Parse Revenue Report CSV (Date/Time,Referring Vet Clinic,...,Amount)
function parseRevenueCSV(csvText) {
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
    
    if (!clinicName) continue
    
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

// Parse Statistics Report CSV (Clinic Name,Vet,Date of Last Referral,...,Total Referrals 12 Months,...)
function parseStatisticsCSV(csvText) {
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedText.split('\n')
  const entries = []
  const header = lines[0].toLowerCase()
  
  // Find column indices
  const headerFields = parseCSVLine(header)
  const clinicIdx = headerFields.findIndex(h => h.includes('clinic name'))
  const lastRefIdx = headerFields.findIndex(h => h.includes('date of last referral'))
  const totalRefsIdx = headerFields.findIndex(h => h.includes('total referrals'))
  
  console.log('Statistics CSV column indices:')
  console.log(`  Clinic Name: ${clinicIdx}`)
  console.log(`  Date of Last Referral: ${lastRefIdx}`)
  console.log(`  Total Referrals: ${totalRefsIdx}`)
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    const fields = parseCSVLine(line)
    if (fields.length < 3) continue
    
    const clinicName = clinicIdx >= 0 ? fields[clinicIdx]?.trim() : fields[0]?.trim()
    const lastRefDate = lastRefIdx >= 0 ? fields[lastRefIdx]?.trim() : fields[2]?.trim()
    const totalReferrals = totalRefsIdx >= 0 ? parseInt(fields[totalRefsIdx]) || 0 : 0
    
    if (!clinicName) continue
    
    entries.push({
      clinicName,
      lastRefDate,
      totalReferrals
    })
  }
  
  return entries
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
  // Check for command line argument or use default
  const defaultFile = 'Referral Example.csv'
  const inputFile = process.argv[2] || defaultFile
  
  let csvPath
  if (path.isAbsolute(inputFile)) {
    csvPath = inputFile
  } else {
    csvPath = path.join(__dirname, '..', 'public', inputFile)
  }
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath)
    console.log('\nUsage: node scripts/test-referral-csv-parse.cjs [filename]')
    console.log('  filename can be a path relative to public/ or absolute')
    process.exit(1)
  }
  
  console.log('Reading CSV from:', csvPath)
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  console.log('CSV size:', csvText.length, 'characters')
  console.log('Lines:', csvText.split('\n').length)
  
  // Detect report type
  const reportType = detectReportType(csvText)
  console.log('\n========================================')
  console.log(`DETECTED REPORT TYPE: ${reportType.toUpperCase()}`)
  console.log('========================================\n')
  
  if (reportType === 'statistics') {
    // Parse Statistics Report
    console.log('Parsing Statistics Report (visit counts + last visit date)...\n')
    const entries = parseStatisticsCSV(csvText)
    
    console.log(`\nParsed ${entries.length} clinic entries`)
    
    // Sort by total referrals descending
    entries.sort((a, b) => b.totalReferrals - a.totalReferrals)
    
    console.log('\nTop 20 clinics by total referrals:')
    for (const entry of entries.slice(0, 20)) {
      console.log(`  - ${entry.clinicName}: ${entry.totalReferrals} visits (last: ${entry.lastRefDate || 'N/A'})`)
    }
    
    const totalReferrals = entries.reduce((sum, e) => sum + e.totalReferrals, 0)
    console.log('\n========================================')
    console.log('SUMMARY')
    console.log('========================================')
    console.log(`Total Clinics: ${entries.length}`)
    console.log(`Total Referrals (12 months): ${totalReferrals.toLocaleString()}`)
    console.log('\nThis report updates:')
    console.log('  ✓ total_referrals_all_time')
    console.log('  ✓ last_contact_date')
    console.log('  ✗ total_revenue_all_time (NOT updated)')
    
  } else if (reportType === 'revenue') {
    // Parse Revenue Report
    console.log('Parsing Revenue Report (revenue amounts)...\n')
    const { referrals, skippedUnknown, summaryRows } = parseRevenueCSV(csvText)
    
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
    
    console.log('\nThis report updates:')
    console.log('  ✓ total_revenue_all_time')
    console.log('  ✗ total_referrals_all_time (NOT updated)')
    console.log('  ✗ last_contact_date (NOT updated)')
    
  } else {
    console.error('ERROR: Unknown report type')
    console.log('Expected one of:')
    console.log('  - Revenue Report: Header starts with "Date/Time,Referring Vet Clinic,..."')
    console.log('  - Statistics Report: Header starts with "Clinic Name,Vet,Date of Last Referral,..."')
    process.exit(1)
  }
}

main().catch(console.error)
