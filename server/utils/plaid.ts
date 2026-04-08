/**
 * Plaid API - Server Utility
 * =============================
 * Bank account connections for expense tracking.
 * Free tier: 100 items in Sandbox/Development.
 *
 * Setup: https://dashboard.plaid.com/signup
 */
import type { PlaidAccount, PlaidTransaction } from '~/types/external-apis.types'

function getConfig(): { clientId: string; secret: string; env: string } {
  const config = useRuntimeConfig()
  if (!config.plaidClientId || !config.plaidSecret) {
    throw new Error('Plaid credentials not configured')
  }
  return {
    clientId: config.plaidClientId,
    secret: config.plaidSecret,
    env: config.plaidEnv || 'sandbox',
  }
}

function getBaseUrl(): string {
  const { env } = getConfig()
  const urls: Record<string, string> = {
    sandbox: 'https://sandbox.plaid.com',
    development: 'https://development.plaid.com',
    production: 'https://production.plaid.com',
  }
  return urls[env] || urls.sandbox
}

async function plaidFetch<T>(path: string, body: Record<string, any>): Promise<T> {
  const { clientId, secret } = getConfig()
  return $fetch<T>(`${getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })
}

/** Create a link token (for Plaid Link frontend component) */
export async function createPlaidLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
  return plaidFetch('/link/token/create', {
    user: { client_user_id: userId },
    client_name: 'EmployeeGM Green Dog',
    products: ['transactions'],
    country_codes: ['US'],
    language: 'en',
  })
}

/** Exchange public token for access token */
export async function exchangePlaidPublicToken(publicToken: string): Promise<{ access_token: string; item_id: string }> {
  return plaidFetch('/item/public_token/exchange', {
    public_token: publicToken,
  })
}

/** Get accounts for an item */
export async function getPlaidAccounts(accessToken: string): Promise<PlaidAccount[]> {
  const result = await plaidFetch<{ accounts: PlaidAccount[] }>('/accounts/get', {
    access_token: accessToken,
  })
  return result.accounts || []
}

/** Get transactions */
export async function getPlaidTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
  options?: { count?: number; offset?: number }
): Promise<{ transactions: PlaidTransaction[]; total_transactions: number }> {
  return plaidFetch('/transactions/get', {
    access_token: accessToken,
    start_date: startDate,
    end_date: endDate,
    options: {
      count: options?.count || 100,
      offset: options?.offset || 0,
    },
  })
}

/** Get real-time balance */
export async function getPlaidBalance(accessToken: string): Promise<PlaidAccount[]> {
  const result = await plaidFetch<{ accounts: PlaidAccount[] }>('/accounts/balance/get', {
    access_token: accessToken,
  })
  return result.accounts || []
}
