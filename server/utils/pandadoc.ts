/**
 * PandaDoc API - Server Utility
 * ================================
 * Document generation + e-signatures for offer letters, NDAs, compliance forms.
 * Free tier available for e-signing.
 *
 * Setup: https://developers.pandadoc.com/
 */
import type { PandaDocDocument, PandaDocRecipient } from '~/types/external-apis.types'

const BASE_URL = 'https://api.pandadoc.com/public/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.pandadocApiKey) throw new Error('PandaDoc API key not configured')
  return config.pandadocApiKey
}

async function pandadocFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `API-Key ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** List documents with optional status filter */
export async function listPandaDocDocuments(
  options?: { status?: string; count?: number; page?: number; q?: string }
): Promise<{ results: PandaDocDocument[] }> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.count) params.set('count', String(options.count))
  if (options?.page) params.set('page', String(options.page))
  if (options?.q) params.set('q', options.q)
  return pandadocFetch<{ results: PandaDocDocument[] }>(`/documents?${params}`)
}

/** Get document details */
export async function getPandaDocDocument(documentId: string): Promise<PandaDocDocument> {
  return pandadocFetch<PandaDocDocument>(`/documents/${documentId}/details`)
}

/** Create document from template */
export async function createPandaDocFromTemplate(options: {
  templateId: string
  name: string
  recipients: { email: string; first_name: string; last_name: string; role: string }[]
  tokens?: { name: string; value: string }[]
  fields?: Record<string, { value: string }>
  metadata?: Record<string, string>
}): Promise<{ id: string; status: string }> {
  return pandadocFetch<{ id: string; status: string }>('/documents', {
    method: 'POST',
    body: JSON.stringify({
      name: options.name,
      template_uuid: options.templateId,
      recipients: options.recipients,
      tokens: options.tokens,
      fields: options.fields,
      metadata: options.metadata,
    }),
  })
}

/** Send document for signing */
export async function sendPandaDocForSigning(
  documentId: string,
  message?: string,
  subject?: string
): Promise<{ id: string; status: string }> {
  return pandadocFetch<{ id: string; status: string }>(`/documents/${documentId}/send`, {
    method: 'POST',
    body: JSON.stringify({
      message: message || 'Please review and sign this document.',
      subject: subject || 'Document ready for your signature',
      silent: false,
    }),
  })
}

/** Download completed document as PDF */
export async function downloadPandaDocPdf(documentId: string): Promise<Buffer> {
  const apiKey = getApiKey()
  const response = await fetch(`${BASE_URL}/documents/${documentId}/download`, {
    headers: { Authorization: `API-Key ${apiKey}` },
  })
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** Create a document sending link (no email required) */
export async function createPandaDocLink(
  documentId: string,
  recipientEmail: string,
  lifetime?: number
): Promise<{ id: string; expires_at: string }> {
  return pandadocFetch<{ id: string; expires_at: string }>(`/documents/${documentId}/session`, {
    method: 'POST',
    body: JSON.stringify({
      recipient: recipientEmail,
      lifetime: lifetime || 900, // 15 min default
    }),
  })
}
