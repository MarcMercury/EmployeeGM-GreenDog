/**
 * Clockify API - Server Utility
 * ================================
 * Free time tracking, timesheets, and reporting.
 *
 * Setup: https://clockify.me/developers-api
 */
import type { ClockifyTimeEntry, ClockifyUser, ClockifyWorkspace } from '~/types/external-apis.types'

const BASE_URL = 'https://api.clockify.me/api/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  if (!config.clockifyApiKey) throw new Error('Clockify API key not configured')
  return config.clockifyApiKey
}

async function clockifyFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return $fetch<T>(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': getApiKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
}

// ── Workspaces ──

export async function listClockifyWorkspaces(): Promise<ClockifyWorkspace[]> {
  return clockifyFetch<ClockifyWorkspace[]>('/workspaces')
}

// ── Users ──

export async function listClockifyUsers(workspaceId: string): Promise<ClockifyUser[]> {
  return clockifyFetch<ClockifyUser[]>(`/workspaces/${workspaceId}/users`)
}

export async function getCurrentClockifyUser(): Promise<ClockifyUser> {
  return clockifyFetch<ClockifyUser>('/user')
}

// ── Time Entries ──

export async function listClockifyTimeEntries(
  workspaceId: string,
  userId: string,
  options?: { start?: string; end?: string; page?: number; pageSize?: number }
): Promise<ClockifyTimeEntry[]> {
  const params = new URLSearchParams()
  if (options?.start) params.set('start', options.start)
  if (options?.end) params.set('end', options.end)
  if (options?.page) params.set('page', String(options.page))
  params.set('page-size', String(options?.pageSize || 50))

  return clockifyFetch<ClockifyTimeEntry[]>(
    `/workspaces/${workspaceId}/user/${userId}/time-entries?${params}`
  )
}

export async function startClockifyTimer(
  workspaceId: string,
  data: { description?: string; projectId?: string; billable?: boolean }
): Promise<ClockifyTimeEntry> {
  return clockifyFetch<ClockifyTimeEntry>(
    `/workspaces/${workspaceId}/time-entries`,
    {
      method: 'POST',
      body: JSON.stringify({
        start: new Date().toISOString(),
        description: data.description || '',
        projectId: data.projectId,
        billable: data.billable ?? false,
      }),
    }
  )
}

export async function stopClockifyTimer(workspaceId: string, userId: string): Promise<ClockifyTimeEntry> {
  return clockifyFetch<ClockifyTimeEntry>(
    `/workspaces/${workspaceId}/user/${userId}/time-entries`,
    {
      method: 'PATCH',
      body: JSON.stringify({ end: new Date().toISOString() }),
    }
  )
}

/** Get time entries for a date range (useful for payroll export) */
export async function getClockifyReport(
  workspaceId: string,
  startDate: string,
  endDate: string,
  userIds?: string[]
): Promise<ClockifyTimeEntry[]> {
  // Clockify reports API uses POST
  const result = await $fetch<{ timeentries: ClockifyTimeEntry[] }>(
    `https://reports.api.clockify.me/v1/workspaces/${workspaceId}/reports/detailed`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': getApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRangeStart: startDate,
        dateRangeEnd: endDate,
        detailedFilter: {
          page: 1,
          pageSize: 1000,
          ...(userIds && { users: { ids: userIds, contains: 'CONTAINS', status: 'ALL' } }),
        },
      }),
    }
  )
  return result.timeentries || []
}
