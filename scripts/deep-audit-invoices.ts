/**
 * Deep audit of invoice data - uses Range headers to bypass 1000-row default limit.
 * Usage: npx tsx scripts/deep-audit-invoices.ts
 */
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function query(selectCols: string, filters: string, rangeStart: number, rangeEnd: number) {
  const url = `${SUPABASE_URL}/rest/v1/invoice_lines?select=${encodeURIComponent(selectCols)}${filters}`
  const res = await fetch(url, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Range': `${rangeStart}-${rangeEnd}`,
      'Prefer': 'count=exact',
    },
  })
  const contentRange = res.headers.get('content-range') // e.g., "0-999/296777"
  const data = await res.json()
  return { data, contentRange, total: contentRange ? parseInt(contentRange.split('/')[1]) : null }
}

async function fetchAll(selectCols: string, filters: string) {
  const PAGE = 5000
  let all: any[] = []
  let offset = 0
  let total = 0

  while (true) {
    const { data, contentRange } = await query(selectCols, filters, offset, offset + PAGE - 1)
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (contentRange) {
      total = parseInt(contentRange.split('/')[1])
    }
    offset += data.length
    if (data.length < PAGE) break
    if (offset >= total) break
  }
  return { rows: all, total }
}

async function main() {
  console.log('=== DEEP INVOICE DATA AUDIT ===\n')

  // 1. Count total rows
  const { contentRange } = await query('id', '', 0, 0)
  const totalRows = contentRange ? parseInt(contentRange.split('/')[1]) : 0
  console.log('Total rows in DB:', totalRows)

  // 2. Fetch ALL rows with just the columns we need for analysis
  console.log('\nFetching all rows (type, total_earned, invoice_date, invoice_number, department)...')
  const { rows: allRows } = await fetchAll(
    'invoice_type,total_earned,invoice_date,invoice_number,department,staff_member,case_owner,client_code,product_group',
    ''
  )
  console.log('Rows fetched:', allRows.length)

  // 3. Type distribution
  const typeCounts: Record<string, number> = {}
  for (const r of allRows) {
    const t = r.invoice_type || 'NULL'
    // Truncate long corrupted types
    const key = t.length > 20 ? t.substring(0, 20) + '...(corrupted)' : t
    typeCounts[key] = (typeCounts[key] || 0) + 1
  }
  console.log('\n--- Invoice Type Distribution ---')
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} (${(count / allRows.length * 100).toFixed(1)}%)`)
  }

  // 4. NULL analysis
  let nullDate = 0, nullEarned = 0, nullBoth = 0, zeroEarned = 0
  for (const r of allRows) {
    const dateNull = !r.invoice_date
    const earnedNull = r.total_earned === null || r.total_earned === undefined
    const earnedZero = parseFloat(r.total_earned) === 0
    if (dateNull) nullDate++
    if (earnedNull) nullEarned++
    if (dateNull && earnedNull) nullBoth++
    if (earnedZero) zeroEarned++
  }
  console.log('\n--- NULL Analysis ---')
  console.log(`  NULL invoice_date: ${nullDate} (${(nullDate / allRows.length * 100).toFixed(1)}%)`)
  console.log(`  NULL total_earned: ${nullEarned} (${(nullEarned / allRows.length * 100).toFixed(1)}%)`)
  console.log(`  NULL both: ${nullBoth}`)
  console.log(`  Zero total_earned: ${zeroEarned}`)

  // 5. Revenue analysis - ALL types vs Item-only
  let allRevenue = 0, itemRevenue = 0, itemCount = 0
  let headerCount = 0, nullTypeCount = 0, scCount = 0, corruptedCount = 0
  for (const r of allRows) {
    const te = parseFloat(r.total_earned) || 0
    allRevenue += te
    if (r.invoice_type === 'Item') {
      itemRevenue += te
      itemCount++
    } else if (r.invoice_type === 'Header') {
      headerCount++
    } else if (r.invoice_type === 'SC') {
      scCount++
    } else if (!r.invoice_type) {
      nullTypeCount++
    } else {
      corruptedCount++
    }
  }
  console.log('\n--- Revenue Analysis ---')
  console.log(`  ALL rows revenue: $${allRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  console.log(`  Item-only revenue: $${itemRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  console.log(`  Difference (Headers/SC/NULL): $${(allRevenue - itemRevenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  console.log(`  Item rows: ${itemCount}`)
  console.log(`  Header rows: ${headerCount}`)
  console.log(`  SC rows: ${scCount}`)
  console.log(`  NULL type rows: ${nullTypeCount}`)
  console.log(`  Corrupted type rows: ${corruptedCount}`)

  // 6. CRITICAL: What do NULL-type rows look like?
  const nullTypeRows = allRows.filter(r => !r.invoice_type)
  const nullTypeWithRevenue = nullTypeRows.filter(r => parseFloat(r.total_earned) > 0)
  const nullTypeWithDate = nullTypeRows.filter(r => r.invoice_date)
  console.log('\n--- NULL-type row analysis ---')
  console.log(`  Total NULL-type rows: ${nullTypeRows.length}`)
  console.log(`  With revenue > 0: ${nullTypeWithRevenue.length}`)
  console.log(`  With invoice_date: ${nullTypeWithDate.length}`)
  console.log(`  Revenue sum: $${nullTypeRows.reduce((s, r) => s + (parseFloat(r.total_earned) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  console.log(`  Sample (first 5):`, nullTypeRows.slice(0, 5).map(r => ({
    type: r.invoice_type,
    earned: r.total_earned,
    date: r.invoice_date,
    inv: r.invoice_number,
    dept: r.department,
    staff: r.staff_member
  })))

  // 7. Monthly revenue breakdown (Item rows only)
  const monthMap: Record<string, { revenue: number, lines: number, invoices: Set<string>, clients: Set<string> }> = {}
  for (const r of allRows) {
    if (!r.invoice_date) continue
    // Include all rows with revenue (NULL type rows likely ARE items with parsing issues)
    const te = parseFloat(r.total_earned) || 0
    const mo = r.invoice_date.substring(0, 7)
    if (!monthMap[mo]) monthMap[mo] = { revenue: 0, lines: 0, invoices: new Set(), clients: new Set() }
    monthMap[mo].revenue += te
    monthMap[mo].lines++
    if (r.invoice_number) monthMap[mo].invoices.add(r.invoice_number)
    if (r.client_code) monthMap[mo].clients.add(r.client_code)
  }
  console.log('\n--- Monthly Revenue (ALL rows with dates) ---')
  for (const [mo, d] of Object.entries(monthMap).sort()) {
    console.log(`  ${mo}: $${d.revenue.toFixed(2)} | ${d.lines} lines | ${d.invoices.size} invoices | ${d.clients.size} clients`)
  }

  // 8. Top staff by revenue (all rows)
  const staffMap: Record<string, number> = {}
  for (const r of allRows) {
    if (!r.staff_member) continue
    staffMap[r.staff_member] = (staffMap[r.staff_member] || 0) + (parseFloat(r.total_earned) || 0)
  }
  console.log('\n--- Top 10 Staff by Revenue ---')
  const topStaff = Object.entries(staffMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [name, rev] of topStaff) {
    console.log(`  ${name}: $${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  }

  // 9. Departments
  const deptMap: Record<string, number> = {}
  for (const r of allRows) {
    const dept = r.department || 'NULL'
    deptMap[dept] = (deptMap[dept] || 0) + (parseFloat(r.total_earned) || 0)
  }
  console.log('\n--- Revenue by Department ---')
  for (const [dept, rev] of Object.entries(deptMap).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dept}: $${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)
  }
}

main().catch(e => console.error(e))
