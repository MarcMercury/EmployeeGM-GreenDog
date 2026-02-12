/**
 * Audit invoice_lines data to identify data integrity issues.
 * Usage: npx tsx scripts/audit-invoice-data.ts
 */
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function audit() {
  console.log('=== INVOICE DATA AUDIT ===\n')

  // 1. Total row count
  const { count: totalRows } = await supabase.from('invoice_lines').select('*', { count: 'exact', head: true })
  console.log('Total rows in DB:', totalRows)

  // 2. Count by invoice_type
  const { data: allForType } = await supabase.from('invoice_lines').select('invoice_type').limit(50000)
  const typeCounts: Record<string, number> = {}
  for (const r of (allForType || [])) {
    const t = r.invoice_type || 'NULL'
    typeCounts[t] = (typeCounts[t] || 0) + 1
  }
  console.log('\nType distribution (first 50k):', typeCounts)

  // 3. Sample Header rows
  const { data: headerRows } = await supabase.from('invoice_lines')
    .select('invoice_number, invoice_type, total_earned, standard_price, staff_member, product_name, invoice_line_reference')
    .eq('invoice_type', 'Header')
    .limit(5)
  console.log('\nSample Header rows:', JSON.stringify(headerRows, null, 2))

  // 4. Sample Item rows
  const { data: itemRows } = await supabase.from('invoice_lines')
    .select('invoice_number, invoice_type, total_earned, standard_price, staff_member, product_name, invoice_line_reference')
    .eq('invoice_type', 'Item')
    .limit(5)
  console.log('\nSample Item rows:', JSON.stringify(itemRows, null, 2))

  // 5. Revenue by type
  const { data: allRows } = await supabase.from('invoice_lines')
    .select('invoice_type, total_earned')
    .limit(50000)
  let headerRev = 0, itemRev = 0, headerCount = 0, itemCount = 0, nullTE = 0, otherCount = 0
  for (const r of (allRows || [])) {
    const te = parseFloat(r.total_earned) || 0
    if (r.invoice_type === 'Header') { headerRev += te; headerCount++ }
    else if (r.invoice_type === 'Item') { itemRev += te; itemCount++ }
    else { otherCount++ }
    if (r.total_earned === null || r.total_earned === undefined) nullTE++
  }
  console.log('\n--- Revenue by Type ---')
  console.log('Header rows:', headerCount, '| revenue sum:', headerRev.toFixed(2))
  console.log('Item rows:', itemCount, '| revenue sum:', itemRev.toFixed(2))
  console.log('Other type rows:', otherCount)
  console.log('Rows with null total_earned:', nullTE)

  // 6. Date format
  const { data: dateSample } = await supabase.from('invoice_lines')
    .select('invoice_date, invoice_number')
    .not('invoice_date', 'is', null)
    .order('invoice_date', { ascending: false })
    .limit(5)
  console.log('\nDate format samples (newest):', dateSample)

  const { data: dateOldest } = await supabase.from('invoice_lines')
    .select('invoice_date, invoice_number')
    .not('invoice_date', 'is', null)
    .order('invoice_date', { ascending: true })
    .limit(5)
  console.log('Date format samples (oldest):', dateOldest)

  // 7. Rows with null invoice_date
  const { count: nullDates } = await supabase.from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('invoice_date', null)
  console.log('\nRows with NULL invoice_date:', nullDates)

  // 8. Rows with null total_earned
  const { count: nullEarned } = await supabase.from('invoice_lines')
    .select('*', { count: 'exact', head: true })
    .is('total_earned', null)
  console.log('Rows with NULL total_earned:', nullEarned)

  // 9. Spot-check: verify a known invoice from CSV against DB
  // From the CSV: Invoice 915698, Item row, product "Veterinary Exam - Dental", total_earned=85.00
  const { data: spotCheck } = await supabase.from('invoice_lines')
    .select('invoice_number, invoice_type, product_name, total_earned, standard_price, staff_member, department, invoice_date')
    .eq('invoice_number', '915698')
  console.log('\nSpot check Invoice 915698:', JSON.stringify(spotCheck, null, 2))

  // 10. Check for negative total_earned values
  const { data: negatives } = await supabase.from('invoice_lines')
    .select('invoice_number, total_earned, invoice_type, product_name')
    .lt('total_earned', 0)
    .limit(10)
  console.log('\nNegative total_earned examples:', JSON.stringify(negatives, null, 2))

  // 11. Revenue per month (to cross-reference with charts)
  const { data: monthly } = await supabase.from('invoice_lines')
    .select('invoice_date, total_earned, invoice_type')
    .not('invoice_date', 'is', null)
    .gte('invoice_date', '2025-01-01')
    .order('invoice_date')
    .limit(50000)
  
  const monthMap: Record<string, { all: number, items: number, headers: number, allCount: number, itemCount: number }> = {}
  for (const r of (monthly || [])) {
    const mo = r.invoice_date?.substring(0, 7)
    if (!mo) continue
    if (!monthMap[mo]) monthMap[mo] = { all: 0, items: 0, headers: 0, allCount: 0, itemCount: 0 }
    const te = parseFloat(r.total_earned) || 0
    monthMap[mo].all += te
    monthMap[mo].allCount++
    if (r.invoice_type === 'Item') { monthMap[mo].items += te; monthMap[mo].itemCount++ }
    if (r.invoice_type === 'Header') { monthMap[mo].headers += te }
  }
  console.log('\n--- Monthly Revenue (2025+) ---')
  for (const [mo, d] of Object.entries(monthMap).sort()) {
    console.log(`  ${mo}: ALL=$${d.all.toFixed(2)} (${d.allCount} rows) | ITEMS_ONLY=$${d.items.toFixed(2)} (${d.itemCount} rows) | HEADERS=$${d.headers.toFixed(2)}`)
  }
}

audit().catch(e => console.error(e))
