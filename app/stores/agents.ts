/**
 * Agent Workforce Pinia Store
 * 
 * Manages the AI agent dashboard state: agent list, proposals, runs, and stats.
 * Follows the project's Options API store pattern.
 */

import type {
  AgentRegistryRow,
  AgentProposalRow,
  AgentRunRow,
  AgentStatus,
  ProposalStatus,
  ProposalType,
} from '~/types/agent.types'

interface ProposalStats {
  pending: number
  auto_approved: number
  approved: number
  rejected: number
  applied: number
  expired: number
}

interface RunStats {
  totalRuns: number
  successRuns: number
  errorRuns: number
  totalTokens: number
  totalCost: number
  avgDurationMs: number
}

interface ChartData {
  days: string[]
  costSeries: Array<{ name: string; data: number[] }>
  runSeries: Array<{ name: string; data: number[] }>
  agentTokens: Array<{
    agent_id: string
    name: string
    cluster: string
    used: number
    budget: number
    pct: number
  }>
  proposalsByAgent: Record<string, Record<string, number>>
  clusters: string[]
}

interface AgentsState {
  agents: AgentRegistryRow[]
  selectedAgent: AgentRegistryRow | null
  proposals: AgentProposalRow[]
  proposalsTotal: number
  recentRuns: AgentRunRow[]
  proposalStats: ProposalStats
  runStats: RunStats
  chartData: ChartData | null
  isLoading: boolean
  isLoadingProposals: boolean
  isLoadingCharts: boolean
  isTriggering: string | null  // agent_id being triggered
  error: string | null

  // Filters
  proposalFilter: {
    status: ProposalStatus | ''
    agentId: string
    proposalType: ProposalType | ''
    limit: number
    offset: number
  }
  runFilter: {
    agentId: string
  }
}

export const useAgentsStore = defineStore('agents', {
  state: (): AgentsState => ({
    agents: [],
    selectedAgent: null,
    proposals: [],
    proposalsTotal: 0,
    recentRuns: [],
    proposalStats: {
      pending: 0,
      auto_approved: 0,
      approved: 0,
      rejected: 0,
      applied: 0,
      expired: 0,
    },
    runStats: {
      totalRuns: 0,
      successRuns: 0,
      errorRuns: 0,
      totalTokens: 0,
      totalCost: 0,
      avgDurationMs: 0,
    },
    chartData: null,
    isLoading: false,
    isLoadingProposals: false,
    isLoadingCharts: false,
    isTriggering: null,
    error: null,
    proposalFilter: {
      status: '',
      agentId: '',
      proposalType: '',
      limit: 20,
      offset: 0,
    },
    runFilter: {
      agentId: '',
    },
  }),

  getters: {
    activeAgents: (state) => state.agents.filter(a => a.status === 'active'),
    pausedAgents: (state) => state.agents.filter(a => a.status === 'paused'),
    agentsByCluster: (state) => {
      const clusters: Record<string, AgentRegistryRow[]> = {}
      for (const agent of state.agents) {
        const key = agent.cluster
        if (!clusters[key]) {
          clusters[key] = []
        }
        clusters[key].push(agent)
      }
      return clusters
    },
    pendingProposals: (state) => state.proposals.filter(p => p.status === 'pending'),
    pendingCount: (state) => state.proposalStats.pending,
    totalCostFormatted: (state) => `$${state.runStats.totalCost.toFixed(4)}`,
    filteredRuns: (state) => {
      if (!state.runFilter.agentId) return state.recentRuns
      return state.recentRuns.filter(r => r.agent_id === state.runFilter.agentId)
    },
    getAgentById: (state) => (agentId: string) =>
      state.agents.find(a => a.agent_id === agentId) ?? null,
  },

  actions: {
    /**
     * Get Authorization headers with the current session's access token.
     */
    async _authHeaders(): Promise<Record<string, string>> {
      const supabase = useSupabaseClient()
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.access_token) {
        throw new Error('No active session')
      }
      return { Authorization: `Bearer ${session.session.access_token}` }
    },

    /**
     * Fetch all agents and global stats.
     */
    async fetchAgents() {
      this.isLoading = true
      this.error = null

      try {
        const headers = await this._authHeaders()
        const response = await $fetch('/api/agents', { headers }) as any

        if (response?.success) {
          this.agents = response.data.agents
          this.proposalStats = response.data.stats.proposals
          this.runStats = response.data.stats.runs
        }
      } catch (err: any) {
        this.error = err?.data?.message || err?.message || 'Failed to fetch agents'
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch a single agent's details with runs.
     */
    async fetchAgentDetail(agentId: string) {
      this.isLoading = true
      this.error = null

      try {
        const headers = await this._authHeaders()
        const response = await $fetch(`/api/agents/${agentId}`, { headers }) as any

        if (response?.success) {
          this.selectedAgent = response.data.agent
          this.recentRuns = response.data.recentRuns
          this.proposalStats = response.data.proposalStats
        }
      } catch (err: any) {
        this.error = err?.data?.message || err?.message || 'Failed to fetch agent'
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch proposals with current filters.
     */
    async fetchProposals() {
      this.isLoadingProposals = true

      try {
        const headers = await this._authHeaders()
        const params = new URLSearchParams()
        if (this.proposalFilter.status) params.set('status', this.proposalFilter.status)
        if (this.proposalFilter.agentId) params.set('agentId', this.proposalFilter.agentId)
        if (this.proposalFilter.proposalType) params.set('proposalType', this.proposalFilter.proposalType)
        params.set('limit', String(this.proposalFilter.limit))
        params.set('offset', String(this.proposalFilter.offset))

        const response = await $fetch(`/api/agents/proposals?${params.toString()}`, { headers }) as any

        if (response?.success) {
          this.proposals = response.data
          this.proposalsTotal = response.pagination.total
        }
      } finally {
        this.isLoadingProposals = false
      }
    },

    /**
     * Manually trigger an agent run.
     */
    async triggerAgent(agentId: string) {
      this.isTriggering = agentId

      try {
        const headers = await this._authHeaders()
        await $fetch(`/api/agents/${agentId}/trigger`, {
          method: 'POST',
          headers,
        })

        // Refresh agent data after run
        await this.fetchAgents()
        return true
      } catch (err: any) {
        this.error = err?.data?.message || err?.message || 'Failed to trigger agent'
        return false
      } finally {
        this.isTriggering = null
      }
    },

    /**
     * Update an agent's status.
     */
    async updateStatus(agentId: string, status: AgentStatus) {
      try {
        const headers = await this._authHeaders()
        await $fetch(`/api/agents/${agentId}/status`, {
          method: 'POST',
          body: { status },
          headers,
        })

        // Update local state
        const agent = this.agents.find(a => a.agent_id === agentId)
        if (agent) agent.status = status

        return true
      } catch (err: any) {
        this.error = err?.data?.message || err?.message || 'Failed to update status'
        return false
      }
    },

    /**
     * Review a proposal (approve or reject).
     */
    async reviewProposal(proposalId: string, action: 'approve' | 'reject', notes?: string) {
      try {
        const headers = await this._authHeaders()
        await $fetch(`/api/agents/proposals/${proposalId}/review`, {
          method: 'POST',
          body: { action, notes },
          headers,
        })

        // Update local state
        const proposal = this.proposals.find(p => p.id === proposalId)
        if (proposal) {
          proposal.status = action === 'approve' ? 'approved' : 'rejected'
          proposal.reviewed_at = new Date().toISOString()
        }

        // Refresh stats
        await this.fetchAgents()
        return true
      } catch (err: any) {
        this.error = err?.data?.message || err?.message || 'Review failed'
        return false
      }
    },

    /**
     * Fetch chart data for the analytics tab.
     */
    async fetchCharts() {
      this.isLoadingCharts = true
      try {
        const headers = await this._authHeaders()
        const response = await $fetch('/api/agents/charts', { headers }) as any

        if (response?.success) {
          this.chartData = response.data
        }
      } finally {
        this.isLoadingCharts = false
      }
    },
  },
})
