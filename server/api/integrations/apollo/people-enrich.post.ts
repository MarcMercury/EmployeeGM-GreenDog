/**
 * Apollo.io People Enrichment
 * POST /api/integrations/apollo/people-enrich
 *
 * Body: ApolloPeopleEnrichOptions (see server/utils/apollo.ts)
 * Docs: https://docs.apollo.io/reference/people-enrichment
 */
import type { ApolloPeopleEnrichOptions } from '~/server/utils/apollo'

export default defineEventHandler(async (event) => {
  const body = await readBody<ApolloPeopleEnrichOptions>(event) || {}

  if (!body.email && !body.linkedin_url && !(body.first_name && body.last_name) && !body.name) {
    throw createError({
      statusCode: 400,
      message: 'Provide at least one identifier: email, linkedin_url, name, or first_name + last_name',
    })
  }

  return await apolloPeopleEnrich(body)
})
