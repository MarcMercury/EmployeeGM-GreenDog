/**
 * Resume Parser API
 * 
 * POST /api/recruiting/parse-resume
 * 
 * Uses OpenAI Files API to properly parse PDFs.
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
    const fileName = fileField.filename || 'resume.pdf'
    const fileData = fileField.data

    // Get available positions
    const { data: positions } = await supabase
      .from('job_positions')
      .select('id, title')
      .order('title')

    const positionTitles = positions?.map(p => p.title).join(', ') || ''

    // Upload to OpenAI and parse
    const parsed = await parseResumeWithOpenAI(openaiKey, fileData, fileName, mimeType, positionTitles)

    return { success: true, data: parsed }

  } catch (err: any) {
    console.error('[parse-resume] Error:', err.message)
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: err.message || 'Failed to parse resume' })
  }
})

async function parseResumeWithOpenAI(
  apiKey: string,
  fileData: Buffer,
  fileName: string,
  mimeType: string,
  positionTitles: string
): Promise<ParsedResume> {
  
  // Upload file to OpenAI
  console.log('[parse-resume] Uploading file:', fileName, fileData.length, 'bytes')
  
  const form = new FormData()
  const blob = new Blob([fileData], { type: mimeType })
  form.append('file', blob, fileName)
  form.append('purpose', 'assistants')

  const uploadRes = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: form
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    console.error('[parse-resume] Upload failed:', err)
    throw new Error('Failed to upload file')
  }

  const uploadedFile = await uploadRes.json()
  const fileId = uploadedFile.id
  console.log('[parse-resume] Uploaded file ID:', fileId)

  try {
    // Create thread with file
    const threadRes = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Parse this resume and return ONLY valid JSON with these fields: first_name, last_name, email, phone, city, state, postal_code, address_line1, experience_summary (2-3 sentences), skills (array), education, linkedin_url, suggested_position. Use null for missing fields. Available positions: ' + (positionTitles || 'Veterinary Technician, Receptionist'),
          attachments: [{ file_id: fileId, tools: [{ type: 'file_search' }] }]
        }]
      })
    })

    if (!threadRes.ok) {
      console.log('[parse-resume] Thread failed, using fallback')
      return await fallbackParse(apiKey, fileData, mimeType, positionTitles)
    }

    const thread = await threadRes.json()

    // Run with model directly (no assistant needed)
    const runRes = await fetch('https://api.openai.com/v1/threads/' + thread.id + '/runs', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: 'You parse resumes. Return ONLY valid JSON, no markdown.',
        tools: [{ type: 'file_search' }]
      })
    })

    if (!runRes.ok) {
      console.log('[parse-resume] Run failed, using fallback')
      return await fallbackParse(apiKey, fileData, mimeType, positionTitles)
    }

    const run = await runRes.json()

    // Poll for completion
    let status = run.status
    let attempts = 0
    while (status !== 'completed' && status !== 'failed' && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000))
      const statusRes = await fetch('https://api.openai.com/v1/threads/' + thread.id + '/runs/' + run.id, {
        headers: { 'Authorization': 'Bearer ' + apiKey, 'OpenAI-Beta': 'assistants=v2' }
      })
      const statusData = await statusRes.json()
      status = statusData.status
      attempts++
    }

    if (status !== 'completed') {
      throw new Error('Processing timed out')
    }

    // Get messages
    const msgsRes = await fetch('https://api.openai.com/v1/threads/' + thread.id + '/messages', {
      headers: { 'Authorization': 'Bearer ' + apiKey, 'OpenAI-Beta': 'assistants=v2' }
    })
    const msgs = await msgsRes.json()
    const assistantMsg = msgs.data?.find((m: any) => m.role === 'assistant')
    const content = assistantMsg?.content?.[0]?.text?.value

    if (!content) throw new Error('No AI response')

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')

    return JSON.parse(jsonMatch[0])

  } finally {
    // Cleanup file
    fetch('https://api.openai.com/v1/files/' + fileId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + apiKey }
    }).catch(() => {})
  }
}

async function fallbackParse(
  apiKey: string,
  fileData: Buffer,
  mimeType: string,
  positionTitles: string
): Promise<ParsedResume> {
  
  let text = ''
  
  if (mimeType === 'text/plain') {
    text = fileData.toString('utf-8')
  } else if (mimeType.includes('docx')) {
    const raw = fileData.toString('utf-8')
    const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g)
    if (matches) text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
  } else {
    // PDF: extract readable text
    const bin = fileData.toString('binary')
    const readable = bin.match(/[\x20-\x7E]{5,}/g)
    if (readable) {
      text = readable.filter(c => /[a-zA-Z]{2,}/.test(c)).join(' ')
    }
  }

  text = text.replace(/\s+/g, ' ').trim()
  console.log('[parse-resume] Fallback text length:', text.length)

  if (text.length < 50) {
    throw new Error('Could not extract text. Please use manual entry.')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Parse resume, return only JSON: {first_name, last_name, email, phone, city, state, postal_code, address_line1, experience_summary, skills[], education, linkedin_url, suggested_position}. Positions: ' + positionTitles },
        { role: 'user', content: text.substring(0, 10000) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  })

  if (!res.ok) throw new Error('AI error')
  const data = await res.json()
  return JSON.parse(data.choices[0]?.message?.content || '{}')
}
