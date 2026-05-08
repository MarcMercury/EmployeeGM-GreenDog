/**
 * Hunter.io Discover (company search)
 * POST /api/integrations/hunter/discover
 * Body: { query?, filters?, limit?, offset? }
 */
import type { HunterDiscoverOptions } from '~/types/external-apis.types'

export default defineEventHandler(async (event) => {
  const body = await readBody<HunterDiscoverOptions>(event).catch(() => ({}) as HunterDiscoverOptions)
  return await hunterDiscover(body || {})
})
