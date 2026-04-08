/**
 * Mailchimp API - Server Utility
 * =================================
 * Email campaigns to referral partners, marketing leads.
 * Free tier: 500 contacts, 1000 emails/month.
 *
 * Setup: https://mailchimp.com/developer/
 */
import type { MailchimpMember, MailchimpCampaign } from '~/types/external-apis.types'

function getConfig(): { apiKey: string; serverPrefix: string } {
  const config = useRuntimeConfig()
  if (!config.mailchimpApiKey) throw new Error('Mailchimp API key not configured')
  // Mailchimp API keys end with -usXX (e.g., -us21)
  const parts = config.mailchimpApiKey.split('-')
  const serverPrefix = parts[parts.length - 1] || 'us21'
  return { apiKey: config.mailchimpApiKey, serverPrefix }
}

function getBaseUrl(): string {
  const { serverPrefix } = getConfig()
  return `https://${serverPrefix}.api.mailchimp.com/3.0`
}

async function mailchimpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey } = getConfig()
  return $fetch<T>(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ── Lists / Audiences ──

export async function listMailchimpAudiences(): Promise<{ lists: { id: string; name: string; stats: { member_count: number } }[] }> {
  return mailchimpFetch('/lists')
}

// ── Members ──

export async function addMailchimpMember(listId: string, member: MailchimpMember): Promise<MailchimpMember> {
  return mailchimpFetch<MailchimpMember>(`/lists/${listId}/members`, {
    method: 'POST',
    body: JSON.stringify({
      email_address: member.email_address,
      status: member.status || 'subscribed',
      merge_fields: member.merge_fields,
      tags: member.tags,
    }),
  })
}

export async function updateMailchimpMember(
  listId: string,
  subscriberHash: string,
  updates: Partial<MailchimpMember>
): Promise<MailchimpMember> {
  return mailchimpFetch<MailchimpMember>(`/lists/${listId}/members/${subscriberHash}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

/** Add or update a member (upsert) */
export async function upsertMailchimpMember(listId: string, member: MailchimpMember): Promise<MailchimpMember> {
  const crypto = await import('crypto')
  const subscriberHash = crypto.createHash('md5').update(member.email_address.toLowerCase()).digest('hex')
  return mailchimpFetch<MailchimpMember>(`/lists/${listId}/members/${subscriberHash}`, {
    method: 'PUT',
    body: JSON.stringify({
      email_address: member.email_address,
      status_if_new: member.status || 'subscribed',
      merge_fields: member.merge_fields,
      tags: member.tags,
    }),
  })
}

// ── Campaigns ──

export async function listMailchimpCampaigns(
  options?: { status?: string; count?: number }
): Promise<{ campaigns: MailchimpCampaign[] }> {
  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.count) params.set('count', String(options.count))
  return mailchimpFetch(`/campaigns?${params}`)
}

export async function createMailchimpCampaign(campaign: {
  type: MailchimpCampaign['type']
  recipients: { list_id: string }
  settings: { subject_line: string; from_name: string; reply_to: string }
}): Promise<MailchimpCampaign> {
  return mailchimpFetch<MailchimpCampaign>('/campaigns', {
    method: 'POST',
    body: JSON.stringify(campaign),
  })
}

export async function sendMailchimpCampaign(campaignId: string): Promise<void> {
  await mailchimpFetch(`/campaigns/${campaignId}/actions/send`, { method: 'POST' })
}
