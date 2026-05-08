/**
 * Hunter.io Domain Search
 * GET /api/integrations/hunter/domain-search?domain=stripe.com
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const domain = (q.domain as string | undefined)?.trim() || undefined
  const company = (q.company as string | undefined)?.trim() || undefined

  if (!domain && !company) {
    throw createError({ statusCode: 400, message: 'domain or company query param is required' })
  }

  const limit = q.limit ? Math.min(parseInt(q.limit as string, 10) || 10, 100) : undefined
  const offset = q.offset ? parseInt(q.offset as string, 10) || 0 : undefined

  return await hunterDomainSearch({
    domain,
    company,
    limit,
    offset,
    type: (q.type as 'personal' | 'generic' | undefined) || undefined,
    seniority: (q.seniority as string | undefined) || undefined,
    department: (q.department as string | undefined) || undefined,
    required_field: (q.required_field as string | undefined) || undefined,
  })
})
