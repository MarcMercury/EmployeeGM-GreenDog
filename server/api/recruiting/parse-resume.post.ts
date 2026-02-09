/**
 * Resume Parser API
 * 
 * POST /api/recruiting/parse-resume
 * 
 * Uses unpdf to extract text from PDFs (serverless-compatible), then OpenAI to parse.
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

interface ParsedResume {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  address_line1: string | null
  experience_summary: string | null
  skills: string[]
  education: string | null
  linkedin_url: string | null
  suggested_position: string | null
}

export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Please log in to parse resumes' })
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

    // Get OpenAI key
    const config = useRuntimeConfig()
    const openaiKey = config.openaiApiKey

    if (!openaiKey) {
      throw createError({ statusCode: 503, message: 'AI service not configured' })
    }

    // Read uploaded file
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const fileField = formData.find(f => f.name === 'file')
    if (!fileField || !fileField.data) {
      throw createError({ statusCode: 400, message: 'Invalid file' })
    }

    const mimeType = fileField.type || 'application/pdf'
    const fileData = fileField.data

    logger.info('Processing file', 'parse-resume', { mimeType, size: fileData.length })

    // Get available positions
    const { data: positions } = await supabase
      .from('job_positions')
      .select('id, title')
      .order('title')

    const positionTitles = positions?.map(p => p.title).join(', ') || ''

    // Extract text from the file
    let textContent = ''
    
    if (mimeType === 'text/plain') {
      textContent = fileData.toString('utf-8')
    } else if (mimeType.includes('docx') || mimeType.includes('wordprocessingml')) {
      textContent = extractDocxText(fileData)
    } else if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      textContent = await extractPdfText(fileData)
    } else {
      // Try raw text extraction
      textContent = extractRawText(fileData)
    }

    logger.debug('Extracted text length', 'parse-resume', { length: textContent.length })

    if (textContent.length < 30) {
      throw createError({ 
        statusCode: 400, 
        message: 'Could not extract text from file. Please try a different format (TXT recommended) or use manual entry.' 
      })
    }

    // Parse with OpenAI
    const parsed = await parseWithOpenAI(openaiKey, textContent, positionTitles)

    return { success: true, data: parsed }

  } catch (err: any) {
    logger.error('Error', err, 'parse-resume')
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to parse resume' })
  }
})

// Extract text from DOCX
function extractDocxText(buffer: Buffer): string {
  try {
    const content = buffer.toString('utf-8')
    // Extract text from XML tags
    const matches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
    if (matches && matches.length > 0) {
      return matches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .filter(t => t.trim())
        .join(' ')
    }
    return ''
  } catch {
    return ''
  }
}

// Extract text from PDF using unpdf (serverless-compatible)
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Use unpdf which is serverless-compatible
    const { extractText } = await import('unpdf')
    
    // Convert buffer to Uint8Array
    const data = new Uint8Array(buffer)
    
    // Extract text from PDF
    const result = await extractText(data, { mergePages: true })
    
    logger.debug('PDF extracted', 'parse-resume', { textLength: result.text?.length || 0 })
    
    // Handle the result - unpdf returns { text: string, totalPages: number }
    if (result.text && result.text.length > 0) {
      return result.text.trim()
    }
    
    // If unpdf fails, try fallback
    logger.debug('unpdf returned empty, trying fallback', 'parse-resume')
    return extractRawText(buffer)
  } catch (err: any) {
    logger.error('PDF extraction failed', err, 'parse-resume')
    // Fall back to raw extraction
    return extractRawText(buffer)
  }
}

// Fallback: extract readable ASCII from binary
function extractRawText(buffer: Buffer): string {
  const binary = buffer.toString('binary')
  
  // Find readable sequences (5+ printable chars)
  const matches = binary.match(/[\x20-\x7E]{5,}/g)
  if (!matches) return ''
  
  // Filter out obvious binary/PDF commands
  const filtered = matches.filter(chunk => {
    // Must contain some letters
    if (!/[a-zA-Z]{2,}/.test(chunk)) return false
    // Filter out PDF internals
    if (/^(obj|endobj|stream|endstream|xref|trailer|\/\w+|<<|>>)/.test(chunk)) return false
    // Filter out just numbers
    if (/^[\d\s.]+$/.test(chunk)) return false
    return true
  })
  
  return filtered.join(' ').replace(/\s+/g, ' ').trim()
}

// Parse extracted text with OpenAI
async function parseWithOpenAI(
  apiKey: string,
  text: string,
  positionTitles: string
): Promise<ParsedResume> {
  
  const systemPrompt = `You are an expert resume parser for a veterinary dental clinic.
Extract candidate information from the resume text.
Return ONLY a valid JSON object with no additional text.

Available positions: ${positionTitles || 'Veterinary Technician, Receptionist, Veterinary Assistant'}

Return this exact JSON structure:
{
  "first_name": "string or null",
  "last_name": "string or null",
  "email": "string or null",
  "phone": "string or null (10 digits preferred)",
  "city": "string or null",
  "state": "string or null (2-letter code preferred)",
  "postal_code": "string or null",
  "address_line1": "string or null",
  "experience_summary": "2-3 sentence summary or null",
  "skills": ["array", "of", "relevant", "skills"],
  "education": "string or null",
  "linkedin_url": "string or null",
  "suggested_position": "best matching position from list or null"
}`

  const config = useRuntimeConfig()
  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this resume text:\n\n${text.substring(0, 12000)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const err = await response.text()
    logger.error('OpenAI error', null, 'parse-resume', { status: response.status, body: err })
    throw new Error('AI service temporarily unavailable')
  }

  const completion = await response.json()
  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from AI')
  }

  try {
    return JSON.parse(content) as ParsedResume
  } catch {
    logger.error('Failed to parse AI response', null, 'parse-resume', { content })
    throw new Error('AI returned invalid format')
  }
}
