/**
 * SendGrid API - Server Utility
 * ================================
 * Transactional email with templates and tracking.
 * Free tier: 100 emails/day.
 *
 * Setup: https://app.sendgrid.com/settings/api_keys
 */
import type { SendGridEmail } from '~/types/external-apis.types'

const BASE_URL = 'https://api.sendgrid.com/v3'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.sendgridApiKey) throw new Error('SendGrid API key not configured')
  return config.sendgridApiKey
}

async function sendgridFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Send a single email */
export async function sendSendGridEmail(email: SendGridEmail): Promise<{ statusCode: number }> {
  const toArray = Array.isArray(email.to) ? email.to.map(e => ({ email: e })) : [{ email: email.to }]

  const payload: Record<string, any> = {
    personalizations: [{ to: toArray }],
    from: email.from,
    subject: email.subject,
  }

  if (email.templateId) {
    payload.template_id = email.templateId
    if (email.dynamicTemplateData) {
      payload.personalizations[0].dynamic_template_data = email.dynamicTemplateData
    }
  } else {
    payload.content = []
    if (email.text) payload.content.push({ type: 'text/plain', value: email.text })
    if (email.html) payload.content.push({ type: 'text/html', value: email.html })
  }

  if (email.categories) payload.categories = email.categories

  await sendgridFetch('/mail/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return { statusCode: 202 }
}

/** Send batch emails (up to 1000 personalizations) */
export async function sendSendGridBatch(
  emails: { to: string; templateData?: Record<string, any> }[],
  options: { from: SendGridEmail['from']; subject: string; templateId?: string; html?: string }
): Promise<{ statusCode: number; count: number }> {
  const personalizations = emails.map(e => ({
    to: [{ email: e.to }],
    ...(e.templateData && { dynamic_template_data: e.templateData }),
  }))

  // SendGrid allows max 1000 personalizations per request
  const chunks = []
  for (let i = 0; i < personalizations.length; i += 1000) {
    chunks.push(personalizations.slice(i, i + 1000))
  }

  for (const chunk of chunks) {
    const payload: Record<string, any> = {
      personalizations: chunk,
      from: options.from,
      subject: options.subject,
    }
    if (options.templateId) payload.template_id = options.templateId
    if (options.html) payload.content = [{ type: 'text/html', value: options.html }]

    await sendgridFetch('/mail/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  return { statusCode: 202, count: emails.length }
}

/** Get email activity/stats */
export async function getSendGridStats(startDate: string, endDate?: string): Promise<any[]> {
  const params = new URLSearchParams({ start_date: startDate })
  if (endDate) params.set('end_date', endDate)
  return sendgridFetch<any[]>(`/stats?${params}`)
}
