/**
 * Google Drive API - Server Utility
 * ====================================
 * Cloud document storage for SOPs, employee docs, knowledge base.
 *
 * Setup: https://console.cloud.google.com/apis/library/drive.googleapis.com
 * Uses same service account as Google Calendar.
 */
import type { GoogleDriveFile, GoogleDriveUploadMeta } from '~/types/external-apis.types'

const BASE_URL = 'https://www.googleapis.com/drive/v3'
const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3'

/** Reuses Google Calendar's auth — import getAccessToken or duplicate logic */
async function getAccessToken(): Promise<string> {
  const config = useRuntimeConfig()
  // Uses the same service account as Google Calendar
  // In production, share the token cache between google-calendar.ts and google-drive.ts
  const credentials = JSON.parse(config.googleServiceAccountJson || '{}')
  if (!credentials.client_email) throw new Error('Google service account not configured')

  // Simplified — in production, use shared token cache from google-calendar.ts
  const response = await $fetch<{ access_token: string }>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: '', // Needs proper JWT signing
    }),
  })
  return response.access_token
}

async function driveFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** List files in a folder */
export async function listDriveFiles(
  folderId?: string,
  options?: { query?: string; pageSize?: number; pageToken?: string }
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const parts: string[] = ["trashed = false"]
  if (folderId) parts.push(`'${folderId}' in parents`)
  if (options?.query) parts.push(options.query)

  const params = new URLSearchParams({
    q: parts.join(' and '),
    fields: 'nextPageToken,files(id,name,mimeType,parents,webViewLink,webContentLink,createdTime,modifiedTime,size,owners)',
    pageSize: String(options?.pageSize || 50),
  })
  if (options?.pageToken) params.set('pageToken', options.pageToken)

  return driveFetch<{ files: GoogleDriveFile[]; nextPageToken?: string }>(`/files?${params}`)
}

/** Get file metadata */
export async function getDriveFile(fileId: string): Promise<GoogleDriveFile> {
  return driveFetch<GoogleDriveFile>(
    `/files/${fileId}?fields=id,name,mimeType,parents,webViewLink,webContentLink,createdTime,modifiedTime,size,owners`
  )
}

/** Create a folder */
export async function createDriveFolder(name: string, parentId?: string): Promise<GoogleDriveFile> {
  return driveFetch<GoogleDriveFile>('/files', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    }),
  })
}

/** Upload a file */
export async function uploadDriveFile(
  metadata: GoogleDriveUploadMeta,
  content: Buffer | string,
  contentType: string
): Promise<GoogleDriveFile> {
  const token = await getAccessToken()
  // Use multipart upload
  const boundary = 'EmployeeGM_boundary'
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${contentType}`,
    '',
    typeof content === 'string' ? content : content.toString('base64'),
    `--${boundary}--`,
  ].join('\r\n')

  return $fetch<GoogleDriveFile>(`${UPLOAD_URL}/files?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
}

/** Delete a file */
export async function deleteDriveFile(fileId: string): Promise<void> {
  await driveFetch(`/files/${fileId}`, { method: 'DELETE' })
}
