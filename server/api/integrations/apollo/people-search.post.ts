/**
 * Apollo.io People Search
 * POST /api/integrations/apollo/people-search
 *
 * Body: ApolloPeopleSearchOptions (see server/utils/apollo.ts)
 * Docs: https://docs.apollo.io/reference/people-search
 */
import type { ApolloPeopleSearchOptions } from '~/server/utils/apollo'

export default defineEventHandler(async (event) => {
  const body = await readBody<ApolloPeopleSearchOptions>(event) || {}

  const perPage = body.per_page ? Math.min(Math.max(1, body.per_page), 100) : 25
  const page = body.page && body.page > 0 ? body.page : 1

  return await apolloPeopleSearch({ ...body, page, per_page: perPage })
})
