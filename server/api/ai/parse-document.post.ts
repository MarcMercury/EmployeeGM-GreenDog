/**
 * AI Document Parser API
 * 
 * Uses OpenAI to extract structured data from uploaded documents:
 * - Resumes → Candidate profile data
 * - Certifications → Credential info
 * - Transcripts → Education history
 * 
 * POST /api/ai/parse-document
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface ExtractedPerson {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
}

interface ExtractedExperience {
  title: string
  company: string
  startDate: string | null
  endDate: string | null
  description: string | null
  isVeterinary: boolean
}

interface ExtractedEducation {
  institution: string
  degree: string | null
  field: string | null
  graduationDate: string | null
}

interface ExtractedCertification {
  name: string
  issuer: string | null
  issueDate: string | null
  expirationDate: string | null
  certificateNumber: string | null
}

interface ExtractedSkill {
  name: string
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null
  category: string | null
}

interface DocumentParseResult {
  documentType: 'resume' | 'certification' | 'license' | 'transcript' | 'reference_letter' | 'other'
  confidence: number
  person: ExtractedPerson
  experience: ExtractedExperience[]
  education: ExtractedEducation[]
  certifications: ExtractedCertification[]
  skills: ExtractedSkill[]
  summary: string | null
  rawText: string
}

export default defineEventHandler(async (event) => {
  try {
    // Use service role for database operations (bypasses RLS)
    const supabaseAdmin = await serverSupabaseServiceRole(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    console.log('[parse-document] Processing request for user:', user.id)

    // Check user has recruiting or admin access
    // Use service role to bypass RLS when checking profile role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      console.error('[parse-document] Profile fetch error:', profileError.message)
      throw createError({ statusCode: 500, message: 'Failed to verify user profile' })
    }

    console.log('[parse-document] User role:', profile?.role)

    const recruitingRoles = ['super_admin', 'admin', 'manager', 'hr_admin', 'sup_admin', 'office_admin', 'marketing_admin']
    const userRole = profile?.role as string
    if (!profile || !recruitingRoles.includes(userRole)) {
      throw createError({ statusCode: 403, message: `Access denied. Role: ${userRole || 'unknown'}` })
    }

    // Get OpenAI API key
    const config = useRuntimeConfig()
    const openaiKey = config.openaiApiKey || process.env.OPENAI_API_KEY

    if (!openaiKey) {
      console.error('[parse-document] No OpenAI API key configured')
      throw createError({ 
        statusCode: 503, 
        message: 'AI service not configured. Please add OPENAI_API_KEY.' 
      })
    }

    // Read multipart form data
    console.log('[parse-document] Reading multipart form data...')
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file provided' })
    }

    const fileField = formData.find(f => f.name === 'file')
    const documentTypeHint = formData.find(f => f.name === 'documentType')?.data?.toString()

    if (!fileField || !fileField.data) {
      throw createError({ statusCode: 400, message: 'No file field found' })
    }

    console.log('[parse-document] File received:', fileField.filename, 'Size:', fileField.data.length, 'Type:', fileField.type)

    // Validate file type
    const mimeType = fileField.type || 'application/octet-stream'
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(mimeType)) {
      throw createError({ 
        statusCode: 400, 
        message: `Unsupported file type: ${mimeType}. Please upload PDF, DOC, DOCX, or TXT.` 
      })
    }

    // File size limit (5MB)
    if (fileField.data.length > 5 * 1024 * 1024) {
      throw createError({ statusCode: 400, message: 'File too large. Maximum 5MB.' })
    }

    // Extract text from document
    console.log('[parse-document] Extracting text from document...')
    let text: string
    try {
      text = await extractTextFromDocument(fileField.data, mimeType)
      console.log('[parse-document] Extracted text length:', text?.length || 0)
    } catch (extractErr: any) {
      console.error('[AI Parse] Text extraction error:', extractErr.message || extractErr)
      throw createError({
        statusCode: 400,
        message: 'Could not read document. Please ensure the file is not corrupted or password-protected.'
      })
    }

    if (!text || text.length < 50) {
      throw createError({ 
        statusCode: 400, 
        message: `Could not extract sufficient text from document (got ${text?.length || 0} chars). Please ensure the file is not image-only or try a different format.` 
      })
    }

    // Build the prompt
    const prompt = buildExtractionPrompt(text, documentTypeHint)

    // Call OpenAI
    console.log('[parse-document] Calling OpenAI API...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert document parser specializing in veterinary industry HR documents. 
Extract structured data from resumes, certifications, licenses, and other professional documents.
Always respond with valid JSON. Be thorough but only include data that is clearly present in the document.
For veterinary-specific skills and certifications, use standard terminology.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 3000
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[AI Parse] OpenAI error:', response.status, errorBody)
      throw createError({ statusCode: 503, message: `AI service error: ${response.status}` })
    }

    const completion = await response.json()
    console.log('[parse-document] OpenAI response received')
    
    const result = JSON.parse(completion.choices[0].message.content) as DocumentParseResult
    
    // Add the raw text for reference
    result.rawText = text.substring(0, 2000)

    // Log usage (non-blocking, uses service role)
    logAIUsage(supabaseAdmin, {
      userId: user.id,
      feature: 'document_parse',
      documentType: result.documentType,
      model: 'gpt-4-turbo-preview',
      confidence: result.confidence
    }).catch(err => console.error('[AI Parse] Audit log failed:', err))

    console.log('[parse-document] Success - returning result')
    return result

  } catch (err: any) {
    console.error('[AI Parse] Handler error:', err.message || err, err.stack)
    
    if (err.statusCode) {
      throw err
    }
    
    throw createError({ 
      statusCode: 500, 
      message: err.message || 'Failed to parse document' 
    })
  }
})

async function extractTextFromDocument(data: Buffer, mimeType: string): Promise<string> {
  // For now, handle plain text directly
  // In production, you'd use libraries like pdf-parse, mammoth, etc.
  
  if (mimeType === 'text/plain') {
    return data.toString('utf-8')
  }

  // For PDF and DOCX, we'll use a simple approach
  // In production, add proper parsing libraries
  
  if (mimeType === 'application/pdf') {
    // Try to extract text using basic PDF parsing
    // This is a simplified approach - production should use pdf-parse or similar
    const text = data.toString('utf-8')
    
    // Look for text between stream/endstream in PDF
    const matches = text.match(/stream\n([\s\S]*?)\nendstream/g)
    if (matches) {
      return matches
        .map(m => m.replace(/stream\n|\nendstream/g, ''))
        .join('\n')
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    // Fallback: extract readable ASCII
    return text
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // For DOCX, extract from XML content
  if (mimeType.includes('wordprocessingml')) {
    const text = data.toString('utf-8')
    // Extract text from <w:t> tags
    const matches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (matches) {
      return matches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .trim()
    }
    
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  return data.toString('utf-8')
}

function buildExtractionPrompt(text: string, typeHint?: string): string {
  const textPreview = text.length > 8000 ? text.substring(0, 8000) + '...[truncated]' : text

  return `
Extract structured information from this ${typeHint || 'professional'} document.

DOCUMENT TEXT:
"""
${textPreview}
"""

Extract the following and return as JSON:

{
  "documentType": "resume" | "certification" | "license" | "transcript" | "reference_letter" | "other",
  "confidence": 0.0-1.0 (how confident you are in the extraction),
  "person": {
    "firstName": "string or null",
    "lastName": "string or null",
    "email": "string or null",
    "phone": "string or null (normalized to digits)"
  },
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or 'present' or null",
      "description": "Brief description or null",
      "isVeterinary": true/false (is this veterinary-related work?)
    }
  ],
  "education": [
    {
      "institution": "School name",
      "degree": "Degree type or null",
      "field": "Field of study or null",
      "graduationDate": "YYYY or null"
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing body or null",
      "issueDate": "YYYY-MM or null",
      "expirationDate": "YYYY-MM or null",
      "certificateNumber": "string or null"
    }
  ],
  "skills": [
    {
      "name": "Skill name",
      "level": "beginner" | "intermediate" | "advanced" | "expert" | null,
      "category": "Technical" | "Clinical" | "Soft Skills" | "Management" | null
    }
  ],
  "summary": "Brief professional summary extracted from document, or null"
}

VETERINARY-SPECIFIC GUIDANCE:
- Look for: RVT, CVT, VTS, DVM, NAVTA certifications
- Common skills: anesthesia monitoring, dental prophylaxis, radiology, phlebotomy, surgical assistance
- Recognize clinic types: general practice, specialty, emergency, dental
- Extract CE (Continuing Education) hours if mentioned

Only include data that is clearly present in the document. Use null for missing fields.
`
}

async function logAIUsage(client: any, data: any) {
  try {
    await client.from('audit_log').insert({
      actor_id: data.userId,
      entity_type: 'ai_feature',
      entity_name: data.feature,
      action: 'parse',
      action_category: 'ai',
      new_values: {
        documentType: data.documentType,
        model: data.model,
        confidence: data.confidence
      }
    })
  } catch (err) {
    console.error('[AI Parse] Audit log error:', err)
  }
}
