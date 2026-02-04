/**
 * Resume Parser API
 * 
 * POST /api/recruiting/parse-resume
 * 
 * Uses OpenAI to extract candidate data from resumes.
 * Simplified approach: extract whatever text we can and let AI parse it.
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
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY

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

    // Get available positions for AI to map to
    const { data: positions } = await supabase
      .from('job_positions')
      .select('id, title')
      .order('title')

    const positionTitles = positions?.map(p => p.title).join(', ') || ''

    // Send file directly to OpenAI as base64
    const parsed = await parseResumeWithAI(openaiKey, fileData, mimeType, positionTitles)

    return {
      success: true,
      data: parsed
    }

  } catch (err: any) {
    console.error('[parse-resume] Error:', err.message)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to parse resume' })
  }
})

async function parseResumeWithAI(
  apiKey: string, 
  fileData: Buffer, 
  mimeType: string,
  positionTitles: string
): Promise<ParsedResume> {
  
  const systemPrompt = `You are an expert resume parser for a veterinary dental clinic. 
Extract candidate information from the resume text and return ONLY valid JSON.

Available positions: ${positionTitles || 'Veterinary Technician, Receptionist, Veterinary Assistant, Kennel Technician'}

Extract these fields:
- first_name, last_name: Full name split
- email: Email address  
- phone: Phone number (digits only, 10 digits preferred)
- city, state, postal_code, address_line1: Location info
- experience_summary: 2-3 sentence summary of relevant experience
- skills: Array of job-relevant skills
- education: Highest education/certifications
- linkedin_url: LinkedIn if present
- suggested_position: Best match from our available positions

Use null for fields you can't find. Return ONLY valid JSON matching this structure:
{
  "first_name": string | null,
  "last_name": string | null,
  "email": string | null,
  "phone": string | null,
  "city": string | null,
  "state": string | null,
  "postal_code": string | null,
  "address_line1": string | null,
  "experience_summary": string | null,
  "skills": string[],
  "education": string | null,
  "linkedin_url": string | null,
  "suggested_position": string | null
}`

  // Extract text from the file
  const textContent = extractTextFromFile(fileData, mimeType)
  
  console.log('[parse-resume] Extracted text length:', textContent.length)
  
  if (textContent.length < 30) {
    throw new Error('Could not extract text from resume. Please try a TXT file or manual entry.')
  }

  // Send extracted text to GPT-4o-mini
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Parse this resume text and extract candidate information:\n\n${textContent.substring(0, 12000)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('[parse-resume] OpenAI error:', response.status, errText)
    throw new Error('AI service error. Please try again.')
  }

  const completion = await response.json()
  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from AI')
  }

  try {
    return JSON.parse(content) as ParsedResume
  } catch {
    console.error('[parse-resume] Failed to parse JSON:', content)
    throw new Error('AI returned invalid response')
  }
}

// Extract text from various file formats - be flexible and forgiving
function extractTextFromFile(fileData: Buffer, mimeType: string): string {
  // Plain text
  if (mimeType === 'text/plain') {
    return fileData.toString('utf-8')
  }

  // For DOCX files
  if (mimeType.includes('docx') || mimeType.includes('wordprocessingml')) {
    const rawText = fileData.toString('utf-8')
    const matches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (matches && matches.length > 0) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
    }
  }

  // For PDFs - extract any readable ASCII text
  // This is a rough extraction but often works for text-based PDFs
  const binaryString = fileData.toString('binary')
  
  // Method 1: Find text between BT and ET markers (PDF text objects)
  const textObjects = binaryString.match(/BT[\s\S]*?ET/g)
  let extractedText = ''
  
  if (textObjects) {
    for (const obj of textObjects) {
      // Extract strings in parentheses (literal strings)
      const literals = obj.match(/\(([^)]+)\)/g)
      if (literals) {
        extractedText += literals.map(l => l.slice(1, -1)).join(' ') + ' '
      }
      // Extract hex strings
      const hexStrings = obj.match(/<([0-9A-Fa-f]+)>/g)
      if (hexStrings) {
        for (const hex of hexStrings) {
          const cleanHex = hex.slice(1, -1)
          try {
            let decoded = ''
            for (let i = 0; i < cleanHex.length; i += 2) {
              const code = parseInt(cleanHex.substr(i, 2), 16)
              if (code >= 32 && code <= 126) {
                decoded += String.fromCharCode(code)
              }
            }
            extractedText += decoded + ' '
          } catch {}
        }
      }
    }
  }

  // Method 2: Find any readable sequences
  const readableChunks = binaryString.match(/[\x20-\x7E]{4,}/g)
  if (readableChunks) {
    const filtered = readableChunks
      .filter(chunk => {
        // Filter out binary garbage and PDF operators
        if (chunk.length > 100 && !/[a-zA-Z]/.test(chunk)) return false
        if (/^[0-9.\s]+$/.test(chunk)) return false
        if (/^(obj|endobj|stream|endstream|xref|trailer)/.test(chunk)) return false
        return true
      })
      .join(' ')
    
    if (filtered.length > extractedText.length) {
      extractedText = filtered
    }
  }

  // Clean up the extracted text
  return extractedText
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
