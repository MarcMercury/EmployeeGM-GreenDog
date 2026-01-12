/**
 * POST /api/intake/upload
 * 
 * Handles file uploads for intake forms (resumes, documents).
 * Works for both authenticated users and public intake form submissions.
 * 
 * Request: multipart/form-data with 'file' field
 * Query params:
 *   - token: intake link token (for public uploads)
 *   - type: document type (resume, cover_letter, certification, other)
 *   - personId: (optional) unified_person ID to link the document to
 */

import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { createAdminClient } from '../../utils/intake'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string | undefined
  const documentType = (query.type as string) || 'resume'
  const personId = query.personId as string | undefined

  // Read the multipart form data
  const formData = await readMultipartFormData(event)
  
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const fileField = formData.find(f => f.name === 'file')
  
  if (!fileField || !fileField.data) {
    throw createError({ statusCode: 400, statusMessage: 'No file field found' })
  }

  // Validate file type
  const mimeType = fileField.type || 'application/octet-stream'
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: `File type not allowed. Allowed: PDF, DOC, DOCX, JPEG, PNG` 
    })
  }

  // Validate file size
  if (fileField.data.length > MAX_FILE_SIZE) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: `File too large. Maximum size: 10MB` 
    })
  }

  const adminClient = createAdminClient()
  let uploadPath: string
  let linkId: string | undefined

  // Determine upload path based on authentication
  const user = await serverSupabaseUser(event).catch(() => null)
  
  if (user) {
    // Authenticated upload - store under user's folder
    const timestamp = Date.now()
    const ext = getFileExtension(fileField.filename || 'file', mimeType)
    uploadPath = `${user.id}/${documentType}_${timestamp}.${ext}`
  } else if (token) {
    // Public upload with intake token - validate token first
    const { data: link, error } = await adminClient
      .from('intake_links')
      .select('id, status, expires_at')
      .eq('token', token)
      .single()

    if (error || !link) {
      throw createError({ statusCode: 403, statusMessage: 'Invalid intake token' })
    }

    if (new Date(link.expires_at) < new Date()) {
      throw createError({ statusCode: 403, statusMessage: 'Intake link has expired' })
    }

    if (!['pending', 'sent', 'viewed'].includes(link.status)) {
      throw createError({ statusCode: 403, statusMessage: 'Intake link is no longer active' })
    }

    linkId = link.id
    const timestamp = Date.now()
    const ext = getFileExtension(fileField.filename || 'file', mimeType)
    uploadPath = `public-intake/${token}/${documentType}_${timestamp}.${ext}`
  } else {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await adminClient.storage
    .from('intake-documents')
    .upload(uploadPath, fileField.data, {
      contentType: mimeType,
      upsert: false
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    throw createError({ 
      statusCode: 500, 
      statusMessage: `Upload failed: ${uploadError.message}` 
    })
  }

  // Get the public URL (signed URL for private bucket)
  const { data: urlData } = adminClient.storage
    .from('intake-documents')
    .getPublicUrl(uploadPath)

  // If personId is provided, update the unified_persons record
  if (personId) {
    if (documentType === 'resume') {
      await adminClient
        .from('unified_persons')
        .update({ resume_url: urlData.publicUrl })
        .eq('id', personId)
    }

    // Also add to documents array
    const { data: person } = await adminClient
      .from('unified_persons')
      .select('documents')
      .eq('id', personId)
      .single()

    const documents = (person?.documents as any[]) || []
    documents.push({
      type: documentType,
      url: urlData.publicUrl,
      path: uploadPath,
      filename: fileField.filename,
      mimeType,
      size: fileField.data.length,
      uploadedAt: new Date().toISOString(),
      intakeLinkId: linkId
    })

    await adminClient
      .from('unified_persons')
      .update({ documents })
      .eq('id', personId)
  }

  return {
    success: true,
    data: {
      path: uploadPath,
      url: urlData.publicUrl,
      type: documentType,
      filename: fileField.filename,
      size: fileField.data.length,
      mimeType
    }
  }
})

function getFileExtension(filename: string, mimeType: string): string {
  // Try to get from filename first
  const parts = filename.split('.')
  if (parts.length > 1) {
    return parts.pop()!.toLowerCase()
  }

  // Fall back to mime type mapping
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png'
  }

  return mimeToExt[mimeType] || 'bin'
}
