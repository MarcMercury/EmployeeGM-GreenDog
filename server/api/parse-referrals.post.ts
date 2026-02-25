/**
 * Referral CSV Parser API — Re-engineered
 *
 * Accepts TWO EzyVet report types (auto-detected from header):
 *
 * 1. "Referrer Revenue" CSV
 *    Header: Date/Time, Referring Vet Clinic, Referring Vet, Client, Animal, Division, Amount
 *    PRIMARY source — extracts per-clinic: referral count, total revenue, last referral date.
 *    Uses ROW-LEVEL dedup so re-uploads only add genuinely new rows.
 *    Partner totals are recalculated from stored line items.
 *    Rows with "Unknown Clinic" are skipped.
 *
 * 2. "Referral Statistics" CSV
 *    Header: Clinic Name, Vet, Date of Last Referral, …, Total Referrals 12 Months, …
 *    SECONDARY source — quick snapshot of referral count & last referral date.
 *    Uses file-level dedup (same file is rejected).
 *    Updates total_referrals_all_time and last_referral_date only.
 *
 * After processing either report the API calls recalculate_partner_metrics()
 * which auto-computes Tier, Priority, Visit Tier, Relationship Health, and Overdue.
 */
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { createHash } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────

type ReportType = 'revenue' | 'statistics'

interface RevenueRow {
  date: string
  clinicName: string
  referringVet: string
  clientName: string
  animalName: string
  division: string
  amount: number
}

interface StatisticsRow {
  clinicName: string
  lastReferralDate: string | null
  totalReferrals12Months: number
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** SHA-256 hash of file content for file-level tracking */
function hashFileContent(csv: string): string {
  return createHash('sha256')
    .update(csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim())
    .digest('hex')
}

/** SHA-256 hash for a single revenue row (date+clinic+vet+client+animal+amount) */
function hashRevenueRow(r: RevenueRow): string {
  const key = [
    r.date.trim().toLowerCase(),
    r.clinicName.trim().toLowerCase(),
    r.referringVet.trim().toLowerCase(),
    r.clientName.trim().toLowerCase(),
    r.animalName.trim().toLowerCase(),
    r.amount.toFixed(2),
  ].join('|')
  return createHash('sha256').update(key).digest('hex')
}

/** Parse a single CSV line handling quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = '' }
    else { current += ch }
  }
  fields.push(current.trim())
  return fields
}

/** Detect report type from the first line */
function detectReportType(csv: string): ReportType {
  const first = csv.replace(/\r\n/g, '\n').split('\n')[0].toLowerCase()
  if (first.includes('clinic name') && first.includes('date of last referral')) return 'statistics'
  return 'revenue'
}

/** Normalise a clinic name for fuzzy matching */
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

/** Extract significant keywords */
function extractKeywords(name: string): string[] {
  const generic = new Set([
    'the', 'and', 'for', 'of', 'at', 'in', 'vet', 'vets', 'pet', 'pets', 'animal', 'animals',
    'clinic', 'clinics', 'hospital', 'hospitals', 'center', 'centre', 'medical', 'veterinary',
    'care', 'health', 'wellness', 'group', 'practice', 'dr', 'dvm', 'inc', 'llc', 'corp',
  ])
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !generic.has(w))
}

/** Match a CSV clinic name to the best referral_partners record */
function findBestMatch(clinicName: string, partners: any[]): any | null {
  const normalised = normaliseName(clinicName)

  // 1. Exact (case-insensitive)
  let m = partners.find(p => p.name.toLowerCase().trim() === clinicName.toLowerCase().trim())
  if (m) return m

  // 2. Normalised exact
  m = partners.find(p => normaliseName(p.name) === normalised)
  if (m) return m

  // 3. Contains (at least 6 chars)
  m = partners.find(p => {
    const np = normaliseName(p.name)
    const shorter = normalised.length < np.length ? normalised : np
    if (shorter.length < 6) return false
    return normalised.includes(np) || np.includes(normalised)
  })
  if (m) return m

  // 4. Keyword overlap (≥ 2 required, or 1 if only 1 keyword)
  const kw = extractKeywords(clinicName)
  if (!kw.length) return null
  const minReq = kw.length >= 2 ? 2 : 1
  let best: any = null, bestScore = 0
  for (const p of partners) {
    const pk = extractKeywords(p.name)
    if (!pk.length) continue
    const score = kw.filter(w => pk.includes(w)).length
    if (score >= minReq && score > bestScore) { bestScore = score; best = p }
  }
  return best
}

// ─── CSV Parsers ──────────────────────────────────────────────────────

function parseRevenueCSV(csv: string): RevenueRow[] {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: RevenueRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const f = parseCsvLine(line)
    if (f.length < 7) continue

    const date = f[0].trim()
    const clinicName = f[1].trim()
    const referringVet = (f[2] || '').trim()
    const clientName = (f[3] || '').trim()
    const animalName = (f[4] || '').trim()
    const division = (f[5] || '').trim()
    const amount = parseFloat((f[6] || '').replace(/[,$]/g, '')) || 0

    // Skip summary rows (no date), unknown clinics, empty clinics, zero/negative amounts
    if (!date) continue
    if (!clinicName) continue
    if (clinicName.toLowerCase() === 'unknown clinic') continue
    if (clinicName.toLowerCase().startsWith('total ')) continue
    if (amount <= 0) continue

    rows.push({ date, clinicName, referringVet, clientName, animalName, division, amount })
  }
  return rows
}

function parseStatisticsCSV(csv: string): StatisticsRow[] {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: StatisticsRow[] = []
  const header = parseCsvLine(lines[0])
  let nameIdx = header.findIndex(h => h.toLowerCase().includes('clinic name'))
  let dateIdx = header.findIndex(h => h.toLowerCase().includes('date of last referral'))
  let countIdx = header.findIndex(h => h.toLowerCase().includes('total referrals 12 months'))
  if (nameIdx === -1) nameIdx = 0
  if (dateIdx === -1) dateIdx = 2
  if (countIdx === -1) countIdx = 6

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const f = parseCsvLine(line)
    if (f.length < 7) continue

    const clinicName = (f[nameIdx] || '').trim()
    const dateStr = (f[dateIdx] || '').trim()
    const countStr = (f[countIdx] || '').trim()

    if (!clinicName || clinicName.toLowerCase() === 'unknown') continue

    // Parse MM-DD-YYYY → YYYY-MM-DD
    let lastReferralDate: string | null = null
    if (dateStr && dateStr.toLowerCase() !== 'n/a') {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const [month, day, year] = parts
        lastReferralDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    rows.push({ clinicName, lastReferralDate, totalReferrals12Months: parseInt(countStr, 10) || 0 })
  }
  return rows
}

// ─── Main handler ─────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  try {
    // ── Auth ──
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    const authHeader = event.headers.get('authorization')
    if (!authHeader) throw createError({ statusCode: 401, message: 'No authorization header' })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) throw createError({ statusCode: 401, message: 'Invalid or expired session' })

    const supabase = await serverSupabaseClient(event)

    // Untyped wrapper for tables not yet in generated Supabase types
    // (referral_revenue_line_items, referral_sync_history, recalculate_partner_metrics)
    const db = supabase as any

    // ── Profile / role check ──
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles').select('id, role, email, auth_user_id').eq('auth_user_id', user.id).single()
    if (profileErr) throw createError({ statusCode: 403, message: `Profile lookup failed: ${profileErr.message}` })
    if (!profile || !['super_admin', 'admin', 'marketing_admin'].includes(profile.role)) {
      throw createError({ statusCode: 403, message: `Admin or Marketing Admin access required. Your role: ${profile?.role || 'unknown'}` })
    }
    logger.info('Access granted', 'parse-referrals', { role: profile.role })

    // ── Read uploaded file ──
    const formData = await readMultipartFormData(event)
    if (!formData?.length) throw createError({ statusCode: 400, message: 'No file uploaded' })
    const file = formData.find(f => f.name === 'file')
    if (!file?.data) throw createError({ statusCode: 400, message: 'No file found in upload' })
    const filename = file.filename?.toLowerCase() || ''
    if (!filename.endsWith('.csv')) throw createError({ statusCode: 400, message: 'Please upload a CSV file.' })

    const csvText = Buffer.from(file.data).toString('utf-8')
    const reportType = detectReportType(csvText)
    const contentHash = hashFileContent(csvText)
    logger.info('File received', 'parse-referrals', { filename: file.filename, size: csvText.length, reportType })

    // ── Fetch all partners for matching ──
    const { data: partners } = await supabase
      .from('referral_partners')
      .select('id, name, total_referrals_all_time, total_revenue_all_time, last_contact_date, last_referral_date, last_data_source')
    if (!partners) throw createError({ statusCode: 500, message: 'Failed to fetch partners' })
    logger.info('Partners available for matching', 'parse-referrals', { count: partners.length })

    // ── Result object ──
    const result = {
      reportType,
      updated: 0,
      skipped: 0,
      newRows: 0,
      notMatched: 0,
      revenueAdded: 0,
      visitorsAdded: 0,
      details: [] as Array<{ clinicName: string; matched: boolean; matchedTo?: string; visits: number; revenue: number; lastDate?: string }>,
    }
    let dateRange: { start: string | null; end: string | null } = { start: null, end: null }

    // ══════════════════════════════════════════════════════════════════
    //  REVENUE REPORT — row-level dedup, recalculate totals
    // ══════════════════════════════════════════════════════════════════
    if (reportType === 'revenue') {
      const entries = parseRevenueCSV(csvText)
      if (!entries.length) {
        throw createError({ statusCode: 400, message: 'No valid revenue entries found. Ensure the CSV has Date/Time, Referring Vet Clinic, and Amount columns.' })
      }
      logger.info('Parsed revenue rows', 'parse-referrals', { total: entries.length })

      // Date range
      const dates = entries.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime())
      if (dates.length) {
        dateRange = { start: dates[0].toISOString().split('T')[0], end: dates[dates.length - 1].toISOString().split('T')[0] }
      }

      // Compute dedup hashes
      const rowsHashed = entries.map(e => ({ ...e, hash: hashRevenueRow(e) }))

      // Batch-check existing hashes
      const existingHashes = new Set<string>()
      const CHUNK = 500
      for (let i = 0; i < rowsHashed.length; i += CHUNK) {
        const chunk = rowsHashed.slice(i, i + CHUNK).map(r => r.hash)
        const { data: found } = await db
          .from('referral_revenue_line_items').select('dedup_hash').in('dedup_hash', chunk)
        if (found) found.forEach((r: any) => existingHashes.add(r.dedup_hash))
      }

      const newRows = rowsHashed.filter(r => !existingHashes.has(r.hash))
      result.skipped = rowsHashed.length - newRows.length
      result.newRows = newRows.length
      logger.info('Row dedup', 'parse-referrals', { total: rowsHashed.length, new: newRows.length, skipped: result.skipped })

      // Match & prepare inserts
      const affectedPartnerIds = new Set<string>()
      const lineItems: any[] = []
      const clinicAgg = new Map<string, { matched: boolean; matchedTo?: string; partnerId?: string; visits: number; revenue: number; lastDate?: string }>()

      for (const row of newRows) {
        const match = findBestMatch(row.clinicName, partners)
        const key = row.clinicName // preserve original casing for display
        const agg = clinicAgg.get(key) || { matched: false, visits: 0, revenue: 0 }
        agg.visits++
        agg.revenue += row.amount
        // Track latest date
        if (!agg.lastDate || row.date > agg.lastDate) agg.lastDate = row.date

        if (match) {
          agg.matched = true
          agg.matchedTo = match.name
          agg.partnerId = match.id
          affectedPartnerIds.add(match.id)
          lineItems.push({
            partner_id: match.id,
            transaction_date: row.date,
            csv_clinic_name: row.clinicName,
            referring_vet: row.referringVet || null,
            client_name: row.clientName || null,
            animal_name: row.animalName || null,
            division: row.division || null,
            amount: row.amount,
            dedup_hash: row.hash,
          })
        }
        clinicAgg.set(key, agg)
      }

      // Insert new line items
      for (let i = 0; i < lineItems.length; i += CHUNK) {
        const chunk = lineItems.slice(i, i + CHUNK)
        const { error } = await db.from('referral_revenue_line_items').insert(chunk)
        if (error) logger.error('Line item insert error', null, 'parse-referrals', { message: error.message, batch: i })
      }

      // Recalculate partner totals from ALL line items
      if (affectedPartnerIds.size > 0) {
        const ids = Array.from(affectedPartnerIds)
        const { data: allItems } = await db
          .from('referral_revenue_line_items')
          .select('partner_id, amount, transaction_date')
          .in('partner_id', ids)

        if (allItems) {
          const totals = new Map<string, { revenue: number; count: number; latestDate: string | null }>()
          for (const item of allItems) {
            const t = totals.get(item.partner_id) || { revenue: 0, count: 0, latestDate: null }
            t.revenue += Number(item.amount)
            t.count++
            // Parse transaction_date for comparison (MM-DD-YYYY format from CSV)
            if (item.transaction_date) {
              const d = new Date(item.transaction_date)
              const iso = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null
              if (iso && (!t.latestDate || iso > t.latestDate)) t.latestDate = iso
            }
            totals.set(item.partner_id, t)
          }

          const syncDate = new Date().toISOString()
          for (const [id, t] of totals) {
            const updateData: any = {
              total_revenue_all_time: Math.round(t.revenue * 100) / 100,
              total_referrals_all_time: t.count,
              last_sync_date: syncDate,
              last_data_source: 'csv_upload',
            }
            if (t.latestDate) {
              updateData.last_referral_date = t.latestDate
              updateData.last_contact_date = t.latestDate
            }
            const { error } = await supabase.from('referral_partners').update(updateData).eq('id', id)
            if (error) logger.error('Partner update error', null, 'parse-referrals', { id, message: error.message })
          }
        }
      }

      // Build result details
      for (const [clinicName, agg] of clinicAgg) {
        if (agg.matched) { result.updated++; result.revenueAdded += agg.revenue; result.visitorsAdded += agg.visits }
        else { result.notMatched++ }
        result.details.push({
          clinicName,
          matched: agg.matched,
          matchedTo: agg.matchedTo,
          visits: agg.visits,
          revenue: Math.round(agg.revenue * 100) / 100,
          lastDate: agg.lastDate,
        })
      }

    // ══════════════════════════════════════════════════════════════════
    //  STATISTICS REPORT — file-level dedup, replaces counts/dates
    // ══════════════════════════════════════════════════════════════════
    } else {
      // File-level duplicate check (statistics use replacement semantics)
      const { data: existing } = await db
        .from('referral_sync_history').select('id, filename, created_at')
        .eq('content_hash', contentHash).eq('report_type', 'statistics').limit(1).maybeSingle()
      if (existing) {
        const at = new Date(existing.created_at).toLocaleDateString()
        throw createError({ statusCode: 409, message: `Duplicate upload. This file was already uploaded on ${at} ("${existing.filename}"). Clear stats first to re-import.` })
      }

      const entries = parseStatisticsCSV(csvText)
      if (!entries.length) {
        throw createError({ statusCode: 400, message: 'No valid statistics entries found. Ensure the CSV has Clinic Name, Date of Last Referral, and Total Referrals columns.' })
      }
      logger.info('Parsed statistics rows', 'parse-referrals', { count: entries.length })

      // Date range
      const validDates = entries.map(e => e.lastReferralDate).filter((d): d is string => !!d).sort()
      if (validDates.length) dateRange = { start: validDates[0], end: validDates[validDates.length - 1] }

      const syncDate = new Date().toISOString()
      for (const entry of entries) {
        const match = findBestMatch(entry.clinicName, partners)
        if (match) {
          const updateData: any = {
            total_referrals_all_time: entry.totalReferrals12Months,
            last_sync_date: syncDate,
            last_data_source: 'csv_upload',
          }
          if (entry.lastReferralDate) {
            updateData.last_referral_date = entry.lastReferralDate
            updateData.last_contact_date = entry.lastReferralDate
          }
          const { error } = await supabase.from('referral_partners').update(updateData).eq('id', match.id)
          if (error) logger.error('Statistics update error', null, 'parse-referrals', { id: match.id, message: error.message })

          result.updated++
          result.visitorsAdded += entry.totalReferrals12Months
          result.details.push({ clinicName: entry.clinicName, matched: true, matchedTo: match.name, visits: entry.totalReferrals12Months, revenue: 0, lastDate: entry.lastReferralDate || undefined })
        } else {
          result.notMatched++
          result.details.push({ clinicName: entry.clinicName, matched: false, visits: entry.totalReferrals12Months, revenue: 0, lastDate: entry.lastReferralDate || undefined })
        }
      }
    }

    // ── Log sync history ──
    await db.from('referral_sync_history').insert({
      filename: file.filename || 'referral-report.csv',
      content_hash: contentHash,
      report_type: reportType,
      data_source: 'csv_upload',
      date_range_start: dateRange.start,
      date_range_end: dateRange.end,
      total_rows_parsed: reportType === 'revenue' ? result.newRows + result.skipped : result.details.length,
      total_rows_matched: result.updated,
      total_rows_skipped: result.skipped,
      total_revenue_added: result.revenueAdded,
      uploaded_by: profile?.id,
      sync_details: { reportType, notMatched: result.notMatched, visitorsAdded: result.visitorsAdded, clinicDetails: result.details },
    })

    // ── Recalculate metrics (Tier, Priority, Health, Overdue) ──
    logger.info('Recalculating partner metrics…', 'parse-referrals')
    const { error: recalcErr } = await db.rpc('recalculate_partner_metrics')
    if (recalcErr) logger.warn('Metrics recalc failed', 'parse-referrals', { message: recalcErr.message })
    else logger.info('Metrics recalculated', 'parse-referrals')

    logger.info('Sync complete', 'parse-referrals', { updated: result.updated, skipped: result.skipped, notMatched: result.notMatched })

    // Build user-facing message
    let message: string
    if (reportType === 'revenue') {
      const parts = [`${result.updated} partners updated`]
      if (result.revenueAdded > 0) parts.push(`$${Math.round(result.revenueAdded).toLocaleString()} revenue`)
      if (result.visitorsAdded > 0) parts.push(`${result.visitorsAdded} referrals`)
      if (result.skipped > 0) parts.push(`${result.skipped} duplicate rows skipped`)
      message = `Revenue Report: ${parts.join(', ')}`
    } else {
      message = `Statistics Report: Updated ${result.updated} partners with ${result.visitorsAdded} referrals`
    }

    return {
      success: true,
      reportType,
      message,
      updated: result.updated,
      skipped: result.skipped,
      newRows: result.newRows,
      notMatched: result.notMatched,
      revenueAdded: Math.round(result.revenueAdded * 100) / 100,
      visitorsAdded: result.visitorsAdded,
      dateRange,
      details: result.details,
    }

  } catch (error: any) {
    logger.error('Error', error, 'parse-referrals')
    throw createError({ statusCode: error.statusCode || 500, message: error.message || 'Failed to parse CSV' })
  }
})
