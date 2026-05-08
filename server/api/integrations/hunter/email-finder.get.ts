/**
 * Hunter.io Email Finder
 * GET /api/integrations/hunter/email-finder?domain=reddit.com&first_name=Alexis&last_name=Ohanian
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const domain = (q.domain as string | undefined)?.trim() || undefined
  const company = (q.company as string | undefined)?.trim() || undefined
  const first_name = (q.first_name as string | undefined)?.trim() || undefined
  const last_name = (q.last_name as string | undefined)?.trim() || undefined
  const full_name = (q.full_name as string | undefined)?.trim() || undefined

  if (!domain && !company) {
    throw createError({ statusCode: 400, message: 'domain or company is required' })
  }
  if (!full_name && !(first_name && last_name)) {
    throw createError({
      statusCode: 400,
      message: 'full_name or (first_name + last_name) is required',
    })
  }

  return await hunterEmailFinder({ domain, company, first_name, last_name, full_name })
})
