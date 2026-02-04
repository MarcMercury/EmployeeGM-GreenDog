/**
 * CSV Bulk Import API
 * 
 * POST /api/recruiting/bulk-import
 * 
 * Uses OpenAI to intelligently map CSV headers to our candidate schema,
 * then validates and inserts candidates in bulk.
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

interface ImportResult {
  success: number
  duplicates: number
  errors: { row: number; email?: string; message: string }[]
  mappedHeaders: Record<string, string>
}

// Our expected database columns
const CANDIDATE_COLUMNS = [
  'first_name',
  'last_name', 
  'email',
  'phone',
  'phone_mobile',
  'city',
  'state',
  'postal_code',
  'address_line1',
  'address_line2',
  'source',
  'referral_source',
  'notes',
  'linkedin_url',
  'experience_years'
]

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Please log in' })
    }

    const authUserId = (user as any).sub || (user as any).id
    if (!authUserId) {
      throw createError({ statusCode: 401, message: 'Invalid session' })
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', authUserId)
      .single()

    const allowedRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      throw createError({ statusCode: 403, message: 'Permission denied' })
    }

    const body = await readBody(event)
    const { headers, rows, useAIMapping } = body as {
      headers: string[]
      rows: Record<string, any>[]
      useAIMapping?: boolean
    }

    if (!headers || !rows || rows.length === 0) {
      throw createError({ statusCode: 400, message: 'No data provided' })
    }

    // Map headers to our schema
    let headerMapping: Record<string, string>

    if (useAIMapping) {
      const config = useRuntimeConfig()
      const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY
      
      if (openaiKey) {
        headerMapping = await mapHeadersWithAI(openaiKey, headers)
      } else {
        headerMapping = mapHeadersManually(headers)
      }
    } else {
      headerMapping = mapHeadersManually(headers)
    }

    // Get existing emails to check for duplicates
    const { data: existingCandidates } = await supabase
      .from('candidates')
      .select('email')

    const existingEmails = new Set(
      (existingCandidates || []).map(c => c.email?.toLowerCase())
    )

    // Process rows
    const result: ImportResult = {
      success: 0,
      duplicates: 0,
      errors: [],
      mappedHeaders: headerMapping
    }

    const candidatesToInsert: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Account for header row + 0-index

      try {
        // Map row data using header mapping
        const candidate: Record<string, any> = {
          status: 'new',
          source: 'CSV Import'
        }

        for (const [csvHeader, dbColumn] of Object.entries(headerMapping)) {
          if (dbColumn && row[csvHeader] !== undefined && row[csvHeader] !== '') {
            candidate[dbColumn] = row[csvHeader]
          }
        }

        // Validate required fields
        if (!candidate.first_name || !candidate.last_name || !candidate.email) {
          result.errors.push({
            row: rowNum,
            email: candidate.email,
            message: 'Missing required field (first_name, last_name, or email)'
          })
          continue
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(candidate.email)) {
          result.errors.push({
            row: rowNum,
            email: candidate.email,
            message: 'Invalid email format'
          })
          continue
        }

        // Check for duplicates
        if (existingEmails.has(candidate.email.toLowerCase())) {
          result.duplicates++
          continue
        }

        // Normalize data
        candidate.email = candidate.email.toLowerCase().trim()
        candidate.first_name = candidate.first_name.trim()
        candidate.last_name = candidate.last_name.trim()
        
        if (candidate.phone) {
          candidate.phone = normalizePhone(candidate.phone)
        }
        if (candidate.phone_mobile) {
          candidate.phone_mobile = normalizePhone(candidate.phone_mobile)
        }
        if (candidate.state) {
          candidate.state = normalizeState(candidate.state)
        }

        // Add to batch
        candidatesToInsert.push(candidate)
        existingEmails.add(candidate.email) // Prevent duplicates within batch

      } catch (err: any) {
        result.errors.push({
          row: rowNum,
          message: err.message || 'Unknown error'
        })
      }
    }

    // Batch insert
    if (candidatesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('candidates')
        .insert(candidatesToInsert)

      if (insertError) {
        console.error('[bulk-import] Insert error:', insertError)
        throw createError({ statusCode: 500, message: 'Failed to insert candidates: ' + insertError.message })
      }

      result.success = candidatesToInsert.length
    }

    return result

  } catch (err: any) {
    console.error('[bulk-import] Error:', err.message)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Import failed' })
  }
})

function mapHeadersManually(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  
  const patterns: [RegExp, string][] = [
    [/^(first[_\s]?name|fname|first)$/i, 'first_name'],
    [/^(last[_\s]?name|lname|last|surname)$/i, 'last_name'],
    [/^(email|e-mail|email[_\s]?address)$/i, 'email'],
    [/^(phone|telephone|tel|phone[_\s]?number)$/i, 'phone'],
    [/^(mobile|cell|cell[_\s]?phone|mobile[_\s]?phone)$/i, 'phone_mobile'],
    [/^(city|town)$/i, 'city'],
    [/^(state|province|st)$/i, 'state'],
    [/^(zip|postal|zip[_\s]?code|postal[_\s]?code)$/i, 'postal_code'],
    [/^(address|street|address[_\s]?1|street[_\s]?address)$/i, 'address_line1'],
    [/^(address[_\s]?2|apt|suite|unit)$/i, 'address_line2'],
    [/^(source|referral|how[_\s]?did|lead[_\s]?source)$/i, 'source'],
    [/^(notes|comments|additional[_\s]?info)$/i, 'notes'],
    [/^(linkedin|linkedin[_\s]?url|linkedin[_\s]?profile)$/i, 'linkedin_url'],
    [/^(experience|years|experience[_\s]?years|yrs[_\s]?exp)$/i, 'experience_years']
  ]

  for (const header of headers) {
    for (const [pattern, column] of patterns) {
      if (pattern.test(header.trim())) {
        mapping[header] = column
        break
      }
    }
  }

  return mapping
}

async function mapHeadersWithAI(apiKey: string, headers: string[]): Promise<Record<string, string>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a data mapper. Map CSV column headers to our database columns.

Our database columns: ${CANDIDATE_COLUMNS.join(', ')}

Rules:
1. Return a JSON object mapping input headers to our columns
2. If a header doesn't match any column, map it to null
3. Be intelligent: "Cell Phone" → "phone_mobile", "First" → "first_name"
4. Only return valid mappings - no new column names

Return format: { "CSV Header": "database_column" | null }`
        },
        {
          role: 'user',
          content: `Map these CSV headers: ${JSON.stringify(headers)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 500
    })
  })

  if (!response.ok) {
    // Fallback to manual mapping
    return mapHeadersManually(headers)
  }

  const completion = await response.json()
  const content = completion.choices[0]?.message?.content

  try {
    const aiMapping = JSON.parse(content)
    // Filter out null mappings and validate columns
    const validMapping: Record<string, string> = {}
    for (const [header, column] of Object.entries(aiMapping)) {
      if (column && CANDIDATE_COLUMNS.includes(column as string)) {
        validMapping[header] = column as string
      }
    }
    return validMapping
  } catch {
    return mapHeadersManually(headers)
  }
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const d = digits.slice(1)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return phone.trim()
}

function normalizeState(state: string): string {
  const abbrevs: Record<string, string> = {
    'california': 'CA', 'texas': 'TX', 'florida': 'FL', 'new york': 'NY',
    'colorado': 'CO', 'arizona': 'AZ', 'nevada': 'NV', 'oregon': 'OR',
    'washington': 'WA', 'georgia': 'GA', 'north carolina': 'NC'
    // Add more as needed
  }
  const lower = state.toLowerCase().trim()
  return abbrevs[lower] || (state.length === 2 ? state.toUpperCase() : state.trim())
}
