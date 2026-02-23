/**
 * Clinic Report Parser
 * 
 * Parses the weekly appointment tracking CSVs from Green Dog clinics.
 * These are complex matrix-format spreadsheets, NOT standard row-per-appointment CSVs.
 * 
 * Format:
 * - Row 0: Title with week range, e.g. "January Week 1 ( 1/4/26 - 1/10/26 )"
 * - Row 1: Day headers with specific dates, e.g. "Monday 1/5" columns with SO,VN,VE sub-columns
 * - Row 2: Location sub-headers "SO,VN,VE" repeated per day + "Weekly Totals" + DOG PPL marker
 * - Data rows: service category headers (e.g. ",Dentistry,,,") followed by appointment type rows
 * - Each appointment type row has booked counts per location per day
 * - "Avail" rows show available slots
 * - "Totals Booked" rows summarize per section
 * 
 * Locations: SO = Sherman Oaks, VN = Van Nuys, VE = Venice/DOG PPL
 */

export interface ParsedWeeklyReport {
  weekTitle: string
  weekStart: string // ISO date
  weekEnd: string // ISO date
  editDate: string | null
  days: WeekDay[]
  sections: ReportSection[]
  appointments: FlattenedAppointment[]
}

export interface WeekDay {
  dayName: string
  date: string // ISO date
  dayOfWeek: number // 0=Sun, 6=Sat
}

export interface ReportSection {
  category: string
  serviceCode: string
  rows: SectionRow[]
  totalBooked: Record<string, number> // by location
}

export interface SectionRow {
  appointmentType: string
  isAvailability: boolean
  isTotals: boolean
  dailyCounts: DailyCount[]
  weeklyTotals: Record<string, number> // by location
}

export interface DailyCount {
  date: string
  dayOfWeek: number
  so: number // Sherman Oaks
  vn: number // Van Nuys
  ve: number // Venice
}

export interface FlattenedAppointment {
  appointment_date: string
  appointment_type: string
  service_category: string
  department: string
  location_name: string
  location_code: string
  count: number
  is_availability: boolean
  week_start: string
  source: 'weekly_tracking'
}

// Map section headers to service codes (all lowercase keys)
const SECTION_TO_SERVICE: Record<string, { code: string; department: string }> = {
  'dentistry': { code: 'DENTAL', department: 'Dentistry' },
  'dental': { code: 'DENTAL', department: 'Dentistry' },
  'neat': { code: 'DENTAL', department: 'Dentistry' },
  'advanced procedures': { code: 'AP', department: 'Advanced Procedures' },
  'advanced procedure': { code: 'AP', department: 'Advanced Procedures' },
  'ap': { code: 'AP', department: 'Advanced Procedures' },
  'wellness': { code: 'WELLNESS', department: 'Wellness' },
  'veterinary exams': { code: 'WELLNESS', department: 'Wellness' },
  'vet exams': { code: 'WELLNESS', department: 'Wellness' },
  'add-on services': { code: 'ADDON', department: 'Add-on Services' },
  'add on services': { code: 'ADDON', department: 'Add-on Services' },
  'addon services': { code: 'ADDON', department: 'Add-on Services' },
  'add-ons': { code: 'ADDON', department: 'Add-on Services' },
  'imaging': { code: 'IMAGING', department: 'Imaging' },
  'radiology': { code: 'IMAGING', department: 'Imaging' },
  'surgery': { code: 'SURG', department: 'Surgery' },
  'exotics': { code: 'EXOTIC', department: 'Exotics' },
  'exotic': { code: 'EXOTIC', department: 'Exotics' },
  'internal medicine': { code: 'IM', department: 'Internal Medicine' },
  'im': { code: 'IM', department: 'Internal Medicine' },
  'cardiology': { code: 'CARDIO', department: 'Cardiology' },
  'cardio': { code: 'CARDIO', department: 'Cardiology' },
  'dog ppl': { code: 'OTHER', department: 'DOG PPL' },
  'dogppl': { code: 'OTHER', department: 'DOG PPL' },
}

/**
 * Fuzzy match a string against SECTION_TO_SERVICE keys.
 * Handles extra whitespace, punctuation variations, and partial matches.
 */
function matchSectionName(raw: string): { code: string; department: string } | null {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
  if (!cleaned) return null

  // Exact match
  if (SECTION_TO_SERVICE[cleaned]) return SECTION_TO_SERVICE[cleaned]

  // Try without hyphens
  const noHyphens = cleaned.replace(/-/g, ' ')
  if (SECTION_TO_SERVICE[noHyphens]) return SECTION_TO_SERVICE[noHyphens]

  // Try with hyphens instead of spaces
  const withHyphens = cleaned.replace(/\s+/g, '-')
  if (SECTION_TO_SERVICE[withHyphens]) return SECTION_TO_SERVICE[withHyphens]

  // Partial/startsWith match
  for (const [key, val] of Object.entries(SECTION_TO_SERVICE)) {
    if (cleaned.startsWith(key) || key.startsWith(cleaned)) return val
  }

  // Contains match (e.g., "dentistry / dental" contains "dentistry")
  for (const [key, val] of Object.entries(SECTION_TO_SERVICE)) {
    if (key.length >= 3 && (cleaned.includes(key) || key.includes(cleaned))) return val
  }

  return null
}

const LOCATION_NAMES: Record<string, string> = {
  'SO': 'Sherman Oaks',
  'VN': 'Van Nuys',
  'VE': 'Venice',
}

/**
 * Parse a weekly appointment tracking CSV from the clinic
 */
export function parseWeeklyTrackingCSV(csvText: string): ParsedWeeklyReport {
  // Strip BOM characters and normalize line endings
  const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleanText.split('\n').map(l => l.trimEnd())

  // Row 0: Title — extract week range
  const titleLine = lines[0] || ''
  const weekTitle = titleLine.replace(/^,/, '').replace(/,+$/, '').trim()

  // Extract date range from title, e.g. "January Week 1 ( 1/4/26 - 1/10/26 )"
  const dateRangeMatch = weekTitle.match(/\(\s*(\d+\/\d+\/\d+)\s*-\s*(\d+\/\d+\/\d+)\s*\)/)
  let weekStart = ''
  let weekEnd = ''
  if (dateRangeMatch) {
    weekStart = parseShortDate(dateRangeMatch[1])
    weekEnd = parseShortDate(dateRangeMatch[2])
  }

  // Row 1: Day headers — extract edit date and day/date pairs
  const headerLine = lines[1] || ''
  const editMatch = headerLine.match(/Edit:\s*(.+?),/)
  const editDate = editMatch ? editMatch[1].trim() : null

  // Parse day columns from header
  const days: WeekDay[] = []
  const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d+\/\d+)/gi
  let match
  while ((match = dayPattern.exec(headerLine)) !== null) {
    const dayName = match[1]
    const dateStr = parseShortDate(match[2])
    days.push({
      dayName,
      date: dateStr,
      dayOfWeek: getDayOfWeekFromName(dayName),
    })
  }

  // Also try scanning other lines for day headers if none found in line 1
  if (days.length === 0) {
    for (let h = 0; h < Math.min(5, lines.length); h++) {
      const altLine = lines[h]
      const altPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d+\/\d+)/gi
      let altMatch
      while ((altMatch = altPattern.exec(altLine)) !== null) {
        const dayName = altMatch[1]
        const dateStr = parseShortDate(altMatch[2])
        days.push({ dayName, date: dateStr, dayOfWeek: getDayOfWeekFromName(dayName) })
      }
      if (days.length > 0) break
    }
  }

  // If still no days, generate from week range
  if (days.length === 0 && weekStart && weekEnd) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const start = new Date(weekStart + 'T00:00:00')
    const end = new Date(weekEnd + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      const dow = d.getDay()
      days.push({ dayName: dayNames[dow], date: iso, dayOfWeek: dow })
    }
  }

  // Parse data rows into sections
  const sections: ReportSection[] = []
  let currentSection: ReportSection | null = null

  for (let i = 3; i < lines.length; i++) {
    const cells = parseCSVCells(lines[i])
    if (cells.length === 0) continue

    const firstCell = (cells[0] || '').trim()
    const secondCell = (cells[1] || '').trim()

    // Check if this is a section header (category row)
    // Typical format: column 0 empty, section name in column 1 (e.g. ",Dentistry,,,")
    // Also handle: section name in column 0 (e.g. "Dentistry,,,")
    let svcInfo: { code: string; department: string } | null = null
    let sectionLabel = ''

    // Primary: section name in column 1 with empty column 0
    if (!firstCell && secondCell) {
      svcInfo = matchSectionName(secondCell)
      if (svcInfo) sectionLabel = secondCell
    }

    // Fallback: section name in column 0 (no data in other columns or all empty)
    if (!svcInfo && firstCell) {
      const otherCells = cells.slice(1).filter(c => c.trim())
      if (otherCells.length === 0) {
        svcInfo = matchSectionName(firstCell)
        if (svcInfo) sectionLabel = firstCell
      }
    }

    if (svcInfo) {
      currentSection = {
        category: sectionLabel,
        serviceCode: svcInfo.code,
        rows: [],
        totalBooked: {},
      }
      sections.push(currentSection)
      continue
    }

    // Skip empty/header rows
    if (!firstCell && !secondCell) continue
    if (!currentSection) continue

    // Check if it's a "Totals Booked" row
    const isTotals = firstCell.toLowerCase().startsWith('totals booked')

    // Check if it's an availability row
    const isAvail = firstCell.toLowerCase().includes('avail') ||
      firstCell.toLowerCase().includes('uc opening') ||
      firstCell.toLowerCase().includes('same day uc')

    // Parse the row data — extract counts per day per location
    const dailyCounts = parseDailyCounts(cells, days)
    const weeklyTotals = parseWeeklyTotals(cells, days.length)

    if (isTotals) {
      currentSection.totalBooked = weeklyTotals
    } else if (firstCell) {
      currentSection.rows.push({
        appointmentType: firstCell,
        isAvailability: isAvail,
        isTotals: false,
        dailyCounts,
        weeklyTotals,
      })
    }
  }

  // Flatten into individual appointment records
  const appointments = flattenToAppointments(sections, weekStart)

  return {
    weekTitle,
    weekStart,
    weekEnd,
    editDate,
    days,
    sections,
    appointments,
  }
}

/**
 * Parse cell values from a CSV line
 */
function parseCSVCells(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/**
 * Parse daily counts from a row. The layout per day is 3 columns: SO, VN, VE
 * Column layout after row label (col 0):
 *   Day 1: col 1 (SO), col 2 (VN), col 3 (VE)
 *   Day 2: col 4 (SO), col 5 (VN), col 6 (VE)
 *   etc.
 */
function parseDailyCounts(cells: string[], days: WeekDay[]): DailyCount[] {
  const counts: DailyCount[] = []
  for (let d = 0; d < days.length; d++) {
    const baseCol = 1 + d * 3
    counts.push({
      date: days[d].date,
      dayOfWeek: days[d].dayOfWeek,
      so: safeParseInt(cells[baseCol]),
      vn: safeParseInt(cells[baseCol + 1]),
      ve: safeParseInt(cells[baseCol + 2]),
    })
  }
  return counts
}

/**
 * Parse weekly totals from the end of a row
 * Weekly totals start after all days (days.length * 3 + 1 columns in)
 * Totals layout: SO total, VN total, VE total
 */
function parseWeeklyTotals(cells: string[], dayCount: number): Record<string, number> {
  const baseCol = 1 + dayCount * 3
  return {
    SO: safeParseInt(cells[baseCol]),
    VN: safeParseInt(cells[baseCol + 1]),
    VE: safeParseInt(cells[baseCol + 2]),
  }
}

/**
 * Flatten sections into individual appointment records
 * Creates one record per type per day per location where count > 0
 */
function flattenToAppointments(sections: ReportSection[], weekStart: string): FlattenedAppointment[] {
  const appointments: FlattenedAppointment[] = []

  for (const section of sections) {
    const svcInfo = matchSectionName(section.category) || { code: 'OTHER', department: section.category }

    for (const row of section.rows) {
      for (const daily of row.dailyCounts) {
        // Create one record per location where count > 0
        for (const [locCode, count] of Object.entries({ SO: daily.so, VN: daily.vn, VE: daily.ve })) {
          if (count > 0) {
            appointments.push({
              appointment_date: daily.date,
              appointment_type: row.appointmentType,
              service_category: svcInfo.code,
              department: svcInfo.department,
              location_name: LOCATION_NAMES[locCode] || locCode,
              location_code: locCode,
              count,
              is_availability: row.isAvailability,
              week_start: weekStart,
              source: 'weekly_tracking',
            })
          }
        }
      }
    }
  }

  return appointments
}

/**
 * Parse a short date like "1/5/26" or "1/5" (assume 2026)
 */
function parseShortDate(dateStr: string): string {
  const parts = dateStr.trim().split('/')
  if (parts.length < 2) return ''

  const month = parseInt(parts[0])
  const day = parseInt(parts[1])
  const year = parts.length >= 3 ? parseInt(parts[2]) : 26

  const fullYear = year < 100 ? 2000 + year : year
  return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDayOfWeekFromName(name: string): number {
  const map: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }
  return map[name.toLowerCase()] ?? -1
}

function safeParseInt(val: string | undefined): number {
  if (!val) return 0
  const cleaned = val.trim()
  if (cleaned === '' || cleaned === 'x' || cleaned === '-') return 0
  const n = parseInt(cleaned)
  return isNaN(n) ? 0 : n
}

// ── Appointment Type Master List ─────────────────────────────────────────

/**
 * Complete mapping of GreenDog appointment types to service categories.
 * Sourced from weekly tracking CSVs and EzyVet appointment type reports.
 */
export const GDD_APPOINTMENT_TYPE_MAP: Record<string, { serviceCode: string; department: string; requiresDVM: boolean; defaultDuration: number }> = {
  // ── Dentistry / NEAT ──
  'NEAT New': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: false, defaultDuration: 30 },
  'NEAT Returning': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: false, defaultDuration: 20 },
  'NEAT (Nails.Ears.Anal Glands) Returning': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: false, defaultDuration: 20 },
  'NAD New': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 45 },
  'NAD Returning': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 30 },
  'GDD (New)': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 45 },
  'GDD (Returning)': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 30 },
  'OE New': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 30 },
  'OE Returning': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 20 },
  'Oral Exam (New)': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 30 },
  'Oral Exam (Returning)': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: true, defaultDuration: 20 },
  'Dental Avail': { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: false, defaultDuration: 0 },

  // ── Advanced Procedures ──
  'AP': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 120 },
  'Advanced Procedure': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 120 },
  'OE/AP': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 60 },
  'OE Possible Same Day AP': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 60 },
  'AP Avail': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: false, defaultDuration: 0 },
  'Post AP Recheck': { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 20 },

  // ── Wellness / Veterinary Exams ──
  'VE New': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 40 },
  'VE Returning': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 },
  'Veterinary Exam New': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 40 },
  'Veterinary Exam Returning': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 },
  'VE Avail': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: false, defaultDuration: 0 },
  'UC Openings': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 },
  'Urgent Care (New)': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 45 },
  'Urgent Care (Returning)': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 },
  'Drop Off Urgent Care': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 60 },

  // ── Add-on Services ──
  'Tech Services': { serviceCode: 'ADDON', department: 'Add-on Services', requiresDVM: false, defaultDuration: 15 },
  'Tech Services (VX,AG,NT)': { serviceCode: 'ADDON', department: 'Add-on Services', requiresDVM: false, defaultDuration: 15 },
  'Bloodwork': { serviceCode: 'ADDON', department: 'Add-on Services', requiresDVM: false, defaultDuration: 15 },
  'Add-on Avail': { serviceCode: 'ADDON', department: 'Add-on Services', requiresDVM: false, defaultDuration: 0 },

  // ── Imaging ──
  'Imaging': { serviceCode: 'IMAGING', department: 'Imaging', requiresDVM: true, defaultDuration: 30 },

  // ── Surgery ──
  'Surgery': { serviceCode: 'SURG', department: 'Surgery', requiresDVM: true, defaultDuration: 180 },
  'Surgery Avail': { serviceCode: 'SURG', department: 'Surgery', requiresDVM: false, defaultDuration: 0 },
  'Surgery Consult New': { serviceCode: 'SURG', department: 'Surgery', requiresDVM: true, defaultDuration: 45 },
  'Surgery Consult Returning': { serviceCode: 'SURG', department: 'Surgery', requiresDVM: true, defaultDuration: 30 },

  // ── Exotics ──
  'EX Wellness New': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 40 },
  'EX Wellness Returning': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 30 },
  'EX- Veterinary Exam- NEW': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 40 },
  'EX Recheck': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 20 },
  'EX Tech': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 15 },
  'EX Sick New': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 45 },
  'EX Sick Returning': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 30 },
  'EX Surgery': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 120 },
  'EX Wellness Avail': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 0 },
  'EX Recheck Avail': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 0 },
  'EX Tech Avail': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 0 },
  'EX Sick Avail': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 0 },
  'EX Same Day UC Avail': { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: false, defaultDuration: 0 },

  // ── Internal Medicine ──
  'IM Consult New': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 60 },
  'IM Consult Returning': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 45 },
  'IM - Consult - Recheck': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 30 },
  'IM Recheck': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 30 },
  'IM Tech': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: false, defaultDuration: 15 },
  'IM Procedure': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 90 },
  'IM Avail': { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: false, defaultDuration: 0 },

  // ── Cardiology ──
  'Dr. D\'Urso': { serviceCode: 'CARDIO', department: 'Cardiology', requiresDVM: true, defaultDuration: 60 },
  'Dr. Saelinger': { serviceCode: 'CARDIO', department: 'Cardiology', requiresDVM: true, defaultDuration: 60 },

  // ── EzyVet Type Report extras ──
  'Available Slot': { serviceCode: 'OTHER', department: 'General', requiresDVM: false, defaultDuration: 0 },
  'zVET SERVICES ONLY': { serviceCode: 'OTHER', department: 'General', requiresDVM: false, defaultDuration: 0 },
  'MP - Pickup': { serviceCode: 'MPMV', department: 'Mobile/MPMV', requiresDVM: false, defaultDuration: 15 },
  'MP - Shipment': { serviceCode: 'MPMV', department: 'Mobile/MPMV', requiresDVM: false, defaultDuration: 15 },
  'MP - Meds Done': { serviceCode: 'MPMV', department: 'Mobile/MPMV', requiresDVM: false, defaultDuration: 10 },
  'VetFM Client': { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 },
  'WAITLIST - Not Confirmed': { serviceCode: 'OTHER', department: 'General', requiresDVM: false, defaultDuration: 0 },
  'Sherman Oaks - Main Facility': { serviceCode: 'OTHER', department: 'General', requiresDVM: false, defaultDuration: 0 },
}

/**
 * Look up a GDD appointment type and return its service mapping.
 * Falls back to fuzzy matching if no exact match.
 */
export function lookupAppointmentType(typeName: string): { serviceCode: string; department: string; requiresDVM: boolean; defaultDuration: number } | null {
  if (!typeName) return null
  const trimmed = typeName.trim()

  // Exact match
  if (GDD_APPOINTMENT_TYPE_MAP[trimmed]) {
    return GDD_APPOINTMENT_TYPE_MAP[trimmed]
  }

  // Case-insensitive match
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(GDD_APPOINTMENT_TYPE_MAP)) {
    if (key.toLowerCase() === lower) return val
  }

  // Partial/fuzzy match
  for (const [key, val] of Object.entries(GDD_APPOINTMENT_TYPE_MAP)) {
    const kLower = key.toLowerCase()
    if (lower.includes(kLower) || kLower.includes(lower)) return val
  }

  // Keyword-based fallback
  if (lower.includes('dental') || lower.includes('neat') || lower.includes('nad') || lower.includes('oral exam') || lower.includes('gdd')) {
    return { serviceCode: 'DENTAL', department: 'Dentistry', requiresDVM: lower.includes('new') || lower.includes('nad'), defaultDuration: 30 }
  }
  if (lower.includes('surg')) return { serviceCode: 'SURG', department: 'Surgery', requiresDVM: true, defaultDuration: 120 }
  if (lower.includes('exotic') || lower.startsWith('ex ') || lower.startsWith('ex-')) {
    return { serviceCode: 'EXOTIC', department: 'Exotics', requiresDVM: true, defaultDuration: 30 }
  }
  if (lower.includes('internal') || lower.startsWith('im ') || lower.startsWith('im-')) {
    return { serviceCode: 'IM', department: 'Internal Medicine', requiresDVM: true, defaultDuration: 45 }
  }
  if (lower.includes('cardio') || lower.includes('echo')) {
    return { serviceCode: 'CARDIO', department: 'Cardiology', requiresDVM: true, defaultDuration: 60 }
  }
  if (lower.includes('wellness') || lower.includes('veterinary exam') || lower.startsWith('ve ')) {
    return { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 }
  }
  if (lower.includes('urgent') || lower.includes('uc ')) {
    return { serviceCode: 'WELLNESS', department: 'Wellness', requiresDVM: true, defaultDuration: 30 }
  }
  if (lower.includes('tech') || lower.includes('bloodwork') || lower.includes('add-on')) {
    return { serviceCode: 'ADDON', department: 'Add-on Services', requiresDVM: false, defaultDuration: 15 }
  }
  if (lower.includes('imaging') || lower.includes('x-ray') || lower.includes('radiograph')) {
    return { serviceCode: 'IMAGING', department: 'Imaging', requiresDVM: true, defaultDuration: 30 }
  }
  if (lower.includes('mp ') || lower.includes('mpmv') || lower.includes('mobile') || lower.includes('pickup') || lower.includes('shipment')) {
    return { serviceCode: 'MPMV', department: 'Mobile/MPMV', requiresDVM: false, defaultDuration: 15 }
  }
  if (lower.includes('advanced') || lower.includes(' ap') || lower === 'ap') {
    return { serviceCode: 'AP', department: 'Advanced Procedures', requiresDVM: true, defaultDuration: 90 }
  }

  return null
}

/**
 * Get all known service departments and their appointment types
 * for use in AI scheduling context
 */
export function getServiceDepartmentSummary(): Array<{
  department: string
  serviceCode: string
  appointmentTypes: string[]
  requiresDVM: boolean
}> {
  const deptMap: Record<string, { serviceCode: string; types: Set<string>; requiresDVM: boolean }> = {}

  for (const [typeName, info] of Object.entries(GDD_APPOINTMENT_TYPE_MAP)) {
    if (info.serviceCode === 'OTHER') continue
    if (typeName.includes('Avail')) continue // Skip availability rows
    
    if (!deptMap[info.department]) {
      deptMap[info.department] = { serviceCode: info.serviceCode, types: new Set(), requiresDVM: info.requiresDVM }
    }
    deptMap[info.department].types.add(typeName)
    if (info.requiresDVM) deptMap[info.department].requiresDVM = true
  }

  return Object.entries(deptMap).map(([dept, info]) => ({
    department: dept,
    serviceCode: info.serviceCode,
    appointmentTypes: [...info.types],
    requiresDVM: info.requiresDVM,
  }))
}
