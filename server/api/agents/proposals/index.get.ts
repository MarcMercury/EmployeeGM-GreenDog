/**
 * GET /api/agents/proposals
 * 
 * List agent proposals with filtering.
 * Accessible to admin roles only.
 */

export default defineEventHandler(async (event) => {
  await requireAgentAdmin(event)

  const query = getQuery(event)

  const result = await listProposals({
    agentId: query.agentId as string | undefined,
    status: query.status as any,
    proposalType: query.proposalType as any,
    targetEmployeeId: query.employeeId as string | undefined,
    limit: query.limit ? Number(query.limit) : 50,
    offset: query.offset ? Number(query.offset) : 0,
  })

  return {
    success: true,
    data: result.proposals,
    pagination: {
      total: result.total,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    },
  }
})
