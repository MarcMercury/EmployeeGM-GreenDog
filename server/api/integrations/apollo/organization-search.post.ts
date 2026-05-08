/**
 * Apollo.io Organization Search
 * POST /api/integrations/apollo/organization-search
 *
 * Body: ApolloOrganizationSearchOptions (see server/utils/apollo.ts)
 * Docs: https://docs.apollo.io/reference/organization-search
 */
import type { ApolloOrganizationSearchOptions } from '~/server/utils/apollo'

export default defineEventHandler(async (event) => {
  const body = await readBody<ApolloOrganizationSearchOptions>(event) || {}

  const perPage = body.per_page ? Math.min(Math.max(1, body.per_page), 100) : 25
  const page = body.page && body.page > 0 ? body.page : 1

  return await apolloOrganizationSearch({ ...body, page, per_page: perPage })
})
