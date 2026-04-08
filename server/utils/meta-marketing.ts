/**
 * Meta Marketing API - Server Utility
 * =======================================
 * Automate social media posts for marketing events on Facebook/Instagram.
 *
 * Setup: https://developers.facebook.com/apps/
 */
import type { MetaPost, MetaPageInsight } from '~/types/external-apis.types'

const BASE_URL = 'https://graph.facebook.com/v19.0'

function getConfig(): { pageAccessToken: string; pageId: string } {
  const config = useRuntimeConfig()
  if (!config.metaPageAccessToken || !config.metaPageId) {
    throw new Error('Meta (Facebook) page credentials not configured')
  }
  return { pageAccessToken: config.metaPageAccessToken, pageId: config.metaPageId }
}

async function metaFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { pageAccessToken } = getConfig()
  const separator = path.includes('?') ? '&' : '?'
  return $fetch<T>(`${BASE_URL}${path}${separator}access_token=${pageAccessToken}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

/** Publish a post to Facebook page */
export async function publishMetaPost(post: MetaPost): Promise<{ id: string }> {
  const { pageId } = getConfig()
  return metaFetch<{ id: string }>(`/${pageId}/feed`, {
    method: 'POST',
    body: JSON.stringify(post),
  })
}

/** Schedule a post for later */
export async function scheduleMetaPost(post: MetaPost, publishTime: Date): Promise<{ id: string }> {
  const { pageId } = getConfig()
  return metaFetch<{ id: string }>(`/${pageId}/feed`, {
    method: 'POST',
    body: JSON.stringify({
      ...post,
      published: false,
      scheduled_publish_time: Math.floor(publishTime.getTime() / 1000),
    }),
  })
}

/** Get page insights / analytics */
export async function getMetaPageInsights(
  metrics: string[],
  period: 'day' | 'week' | 'days_28' = 'week'
): Promise<MetaPageInsight[]> {
  const { pageId } = getConfig()
  const result = await metaFetch<{ data: MetaPageInsight[] }>(
    `/${pageId}/insights?metric=${metrics.join(',')}&period=${period}`
  )
  return result.data || []
}

/** Get posts from page */
export async function getMetaPagePosts(limit = 25): Promise<any[]> {
  const { pageId } = getConfig()
  const result = await metaFetch<{ data: any[] }>(
    `/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=${limit}`
  )
  return result.data || []
}

/** Delete a scheduled or published post */
export async function deleteMetaPost(postId: string): Promise<{ success: boolean }> {
  return metaFetch<{ success: boolean }>(`/${postId}`, { method: 'DELETE' })
}
