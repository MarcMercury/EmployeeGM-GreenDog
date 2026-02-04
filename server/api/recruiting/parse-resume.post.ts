/**
 * Resume Parser API
 * 
 * POST /api/recruiting/parse-resume
 * 
 * Uses OpenAI to extract structured candidate data from resume files.
 * Returns data matching the CandidateInsertSchema for validation.
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

    // Extract text from PDF
    const text = await extractText(fileField.data, fileField.type || 'application/pdf')
    
    if (!text || text.length < 50) {
      throw createError({ statusCode: 400, message: 'Could not extract text from resume' })
    }

    // Get available positions for AI to map to
    const { data: positions } = await supabase
      .from('job_positions')
      .select('id, title')
      .order('title')

    const positionTitles = positions?.map(p => p.title).join(', ') || ''

    // Parse with OpenAI
    const parsed = await parseWithOpenAI(openaiKey, text, positionTitles)

    return {
      success: true,
      data: parsed,
      rawTextPreview: text.substring(0, 500)
    }

  } catch (err: any) {
    console.error('[parse-resume] Error:', err.message)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to parse resume' })
  }
})

async function extractText(data: Buffer, mimeType: string): Promise<string> {
  // Plain text
  if (mimeType === 'text/plain') {
    return data.toString('utf-8')
  }

  // PDF - use unpdf with getDocumentProxy for more control
  if (mimeType === 'application/pdf') {
    try {
      const { getDocumentProxy } = await import('unpdf')
      
      // Convert Buffer to Uint8Array
      const uint8Array = new Uint8Array(data)
      
      const pdf = await getDocumentProxy(uint8Array)
      let fullText = ''
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }
      
      return fullText.trim()
    } catch (err: any) {
      console.error('[parse-resume] PDF parse error:', err.message, err.stack)
      throw new Error('Could not read PDF: ' + (err.message || 'Unknown error'))
    }
  }

  // DOCX - basic extraction
  if (mimeType.includes('wordprocessingml') || mimeType.includes('docx')) {
    const text = data.toString('utf-8')
    const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (matches) {
      return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
    }
  }

  throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.')
}

async function parseWithOpenAI(apiKey: string, resumeText: string, positionTitles: string): Promise<ParsedResume> {
  const systemPrompt = `You are an expert resume parser for a veterinary clinic. Extract candidate information and return ONLY valid JSON.

Available positions at the clinic: ${positionTitles || 'Veterinary Technician, Receptionist, Veterinary Assistant, Kennel Technician, Practice Manager'}

Rules:
1. Extract ONLY these fields - ignore everything else (hobbies, references, etc.)
2. Format phone as digits only (AI will format later)
3. Normalize city names (e.g., "San Fran" → "San Francisco")
4. For suggested_position, map the candidate's objective/experience to one of our available positions
5. For experience_summary, write 2-3 sentences summarizing their relevant veterinary/medical/customer service experience
6. For skills, extract only job-relevant skills (not "proficient in Microsoft Word")
7. If a field cannot be found, use null

Return this exact JSON structure:
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
        { role: 'user', content: `Parse this resume:\n\n${resumeText.substring(0, 8000)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('[parse-resume] OpenAI error:', errText)
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
    console.error('[parse-resume] Invalid JSON from OpenAI:', content)
    throw new Error('Failed to parse AI response')
  }
}
