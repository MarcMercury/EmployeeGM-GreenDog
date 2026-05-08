/**
 * Apollo.io Organization Enrichment
 * GET /api/integrations/apollo/organization-enrich?domain=stripe.com
 *
 * Docs: https://docs.apollo.io/reference/organization-enrichment
 */
export default defineEventHandler(async (event) => {
  const { domain } = getQuery(event) as { domain?: string }
  if (!domain) {
    throw createError({ statusCode: 400, message: 'domain query param is required' })
  }
  return await apolloOrganizationEnrich(domain.trim())
})
