/**
 * Candidate Zod Validation Schema
 * 
 * Ensures all candidate data (manual, resume, or CSV import) 
 * matches the exact database schema before insertion.
 */

import { z } from 'zod'

// Phone number normalization regex
const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/

// Normalized phone format: (xxx) xxx-xxxx
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  
  // Extract digits only
  const digits = phone.replace(/\D/g, '')
  
  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  // Handle 11-digit with leading 1
  if (digits.length === 11 && digits.startsWith('1')) {
    const trimmed = digits.slice(1)
    return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`
  }
  
  // Return original if can't normalize
  return phone.trim() || null
}

// State abbreviation normalization
const stateAbbreviations: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
}

export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null
  const lower = state.toLowerCase().trim()
  
  // Already an abbreviation
  if (lower.length === 2) {
    return lower.toUpperCase()
  }
  
  // Full state name
  return stateAbbreviations[lower] || state.trim()
}

// Candidate sources enum
export const candidateSources = [
  'Indeed',
  'LinkedIn', 
  'Referral',
  'Walk-in',
  'Website',
  'Job Fair',
  'Craigslist',
  'Facebook',
  'Instagram',
  'Employee Referral',
  'Other'
] as const

// Candidate statuses enum (matches database CHECK constraint)
export const candidateStatuses = [
  'new',
  'screening', 
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'converted'
] as const

/**
 * Core Candidate Schema
 * All three input methods (manual, resume, CSV) must produce this structure
 */
export const CandidateInsertSchema = z.object({
  // Required fields
  first_name: z.string().min(1, 'First name is required').transform(s => s.trim()),
  last_name: z.string().min(1, 'Last name is required').transform(s => s.trim()),
  email: z.string().email('Invalid email address').transform(s => s.toLowerCase().trim()),
  
  // Optional fields with normalization
  phone: z.string().optional().nullable().transform(normalizePhone),
  phone_mobile: z.string().optional().nullable().transform(normalizePhone),
  
  // Address fields
  address_line1: z.string().optional().nullable().transform(s => s?.trim() || null),
  address_line2: z.string().optional().nullable().transform(s => s?.trim() || null),
  city: z.string().optional().nullable().transform(s => s?.trim() || null),
  state: z.string().optional().nullable().transform(normalizeState),
  postal_code: z.string().optional().nullable().transform(s => s?.trim() || null),
  
  // Professional info
  target_position_id: z.string().uuid().optional().nullable(),
  source: z.enum(candidateSources).optional().default('Other'),
  referral_source: z.string().optional().nullable().transform(s => s?.trim() || null),
  
  // Experience & notes
  notes: z.string().optional().nullable().transform(s => s?.trim() || null),
  experience_summary: z.string().optional().nullable(),
  
  // LinkedIn
  linkedin_url: z.string().url().optional().nullable().or(z.literal('')).transform(s => s || null),
  
  // Status defaults to 'new'
  status: z.enum(candidateStatuses).optional().default('new'),
})

export type CandidateInsert = z.infer<typeof CandidateInsertSchema>

/**
 * Schema for AI-parsed resume data
 * More lenient - allows AI output to be validated and transformed
 */
export const ResumeParseResultSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
  experience_summary: z.string().nullable().optional(),
  skills: z.array(z.string()).optional().default([]),
  education: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  suggested_position: z.string().nullable().optional(), // AI-inferred position title
})

export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>

/**
 * Schema for CSV row mapping
 * Very lenient - allows various column name formats
 */
export const CsvRowSchema = z.record(z.string(), z.any())

/**
 * Bulk import result
 */
export interface BulkImportResult {
  success: number
  duplicates: number
  errors: { row: number; email?: string; message: string }[]
}
