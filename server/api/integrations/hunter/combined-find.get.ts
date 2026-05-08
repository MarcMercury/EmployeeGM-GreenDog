/**
 * Hunter.io Combined Enrichment (person + company by email)
 * GET /api/integrations/hunter/combined-find?email=patrick@stripe.com
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const email = (q.email as string | undefined)?.trim()
  if (!email) {
    throw createError({ statusCode: 400, message: 'email query param is required' })
  }
  return await hunterCombinedFind(email)
})
