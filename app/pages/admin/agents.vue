<template>
  <div>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col>
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div>
            <h1 class="text-h4 font-weight-bold d-flex align-center">
              <v-icon class="mr-3" color="primary" size="36">mdi-robot</v-icon>
              AI Agent Workforce
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis mt-1">
              Autonomous agents managing skills, scheduling, HR, and engagement
            </p>
          </div>
          <v-btn
            color="primary"
            variant="elevated"
            :loading="isRunningAll"
            :disabled="store.activeAgents.length === 0"
            @click="runAllActive"
          >
            <v-icon start>mdi-play-speed</v-icon>
            Run All Active ({{ store.activeAgents.length }})
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Global Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="pa-4" color="primary" variant="tonal">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="48" class="mr-3">
              <v-icon>mdi-robot-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ store.activeAgents.length }}</div>
              <div class="text-caption text-medium-emphasis">Active Agents</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="pa-4" color="warning" variant="tonal">
          <div class="d-flex align-center">
            <v-avatar color="warning" size="48" class="mr-3">
              <v-icon>mdi-clipboard-check-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ store.pendingCount }}</div>
              <div class="text-caption text-medium-emphasis">Pending Proposals</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="pa-4" color="success" variant="tonal">
          <div class="d-flex align-center">
            <v-avatar color="success" size="48" class="mr-3">
              <v-icon>mdi-check-circle-outline</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ store.runStats.successRuns }}</div>
              <div class="text-caption text-medium-emphasis">Successful Runs (7d)</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card rounded="lg" class="pa-4" color="info" variant="tonal">
          <div class="d-flex align-center">
            <v-avatar color="info" size="48" class="mr-3">
              <v-icon>mdi-currency-usd</v-icon>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-bold">{{ store.totalCostFormatted }}</div>
              <div class="text-caption text-medium-emphasis">Token Cost (7d)</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-card rounded="lg">
      <v-tabs v-model="activeTab" color="primary" density="compact">
        <v-tab value="roster">
          <v-icon start>mdi-view-grid</v-icon>
          Agent Roster
        </v-tab>
        <v-tab value="proposals">
          <v-icon start>mdi-clipboard-text</v-icon>
          Proposals
          <v-chip v-if="store.pendingCount > 0" color="warning" size="x-small" class="ml-2">
            {{ store.pendingCount }}
          </v-chip>
        </v-tab>
        <v-tab value="runs">
          <v-icon start>mdi-history</v-icon>
          Run History
        </v-tab>
        <v-tab value="analytics">
          <v-icon start>mdi-chart-line</v-icon>
          Analytics
        </v-tab>
      </v-tabs>

      <v-divider />

      <!-- Error Banner -->
      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        closable
        class="ma-4"
        @click:close="store.error = null"
      >
        <strong>Failed to load agents:</strong> {{ store.error }}
        <template #append>
          <v-btn size="small" variant="text" @click="store.fetchAgents()">
            Retry
          </v-btn>
        </template>
      </v-alert>

      <v-window v-model="activeTab">
        <!-- AGENT ROSTER TAB -->
        <v-window-item value="roster">
          <v-container fluid>
            <div v-if="store.isLoading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else>
              <div v-for="(agents, cluster) in store.agentsByCluster" :key="cluster" class="mb-6">
                <h3 class="text-h6 font-weight-bold mb-3 d-flex align-center">
                  <v-icon class="mr-2" :color="clusterColor(String(cluster))">
                    {{ clusterIcon(String(cluster)) }}
                  </v-icon>
                  {{ clusterLabel(String(cluster)) }}
                  <v-chip size="x-small" class="ml-2" variant="tonal">
                    {{ agents.length }} agent{{ agents.length !== 1 ? 's' : '' }}
                  </v-chip>
                </h3>

                <v-row>
                  <v-col
                    v-for="agent in agents"
                    :key="agent.agent_id"
                    cols="12"
                    sm="6"
                    md="4"
                    lg="3"
                  >
                    <v-card rounded="lg" variant="outlined" class="h-100">
                      <v-card-text>
                        <div class="d-flex justify-space-between align-start mb-2">
                          <div>
                            <div class="text-subtitle-1 font-weight-bold">{{ agent.display_name }}</div>
                            <div class="text-caption text-medium-emphasis">{{ agent.agent_id }}</div>
                          </div>
                          <v-chip
                            :color="statusColor(agent.status)"
                            size="small"
                            variant="flat"
                          >
                            {{ agent.status }}
                          </v-chip>
                        </div>

                        <div class="text-body-2 text-medium-emphasis mb-3" style="min-height: 40px;">
                          {{ agent.description || 'No description' }}
                        </div>

                        <!-- Last run info -->
                        <div v-if="agent.last_run_at" class="text-caption mb-2">
                          <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
                          Last run: {{ formatRelative(agent.last_run_at) }}
                          <v-chip
                            :color="agent.last_run_status === 'success' ? 'success' : agent.last_run_status === 'error' ? 'error' : 'warning'"
                            size="x-small"
                            class="ml-1"
                          >
                            {{ agent.last_run_status }}
                          </v-chip>
                        </div>
                        <div v-else class="text-caption text-medium-emphasis mb-2">
                          Never run
                        </div>

                        <!-- Budget bar -->
                        <div class="text-caption mb-1">
                          Tokens: {{ agent.daily_tokens_used.toLocaleString() }} / {{ agent.daily_token_budget.toLocaleString() }}
                        </div>
                        <v-progress-linear
                          :model-value="(agent.daily_tokens_used / agent.daily_token_budget) * 100"
                          :color="agent.daily_tokens_used > agent.daily_token_budget * 0.8 ? 'error' : 'primary'"
                          height="4"
                          rounded
                          class="mb-3"
                        />
                      </v-card-text>

                      <v-divider />

                      <v-card-actions>
                        <v-btn
                          v-if="agent.status === 'paused'"
                          size="small"
                          color="success"
                          variant="text"
                          @click="toggleStatus(agent.agent_id, 'active')"
                        >
                          <v-icon start>mdi-play</v-icon>
                          Activate
                        </v-btn>
                        <v-btn
                          v-else-if="agent.status === 'active'"
                          size="small"
                          color="warning"
                          variant="text"
                          @click="toggleStatus(agent.agent_id, 'paused')"
                        >
                          <v-icon start>mdi-pause</v-icon>
                          Pause
                        </v-btn>

                        <v-spacer />

                        <v-btn
                          size="small"
                          color="primary"
                          variant="flat"
                          :loading="store.isTriggering === agent.agent_id"
                          :disabled="agent.status === 'disabled'"
                          @click="triggerRun(agent.agent_id)"
                        >
                          <v-icon start>mdi-play-circle</v-icon>
                          Run Now
                        </v-btn>
                      </v-card-actions>
                    </v-card>
                  </v-col>
                </v-row>
              </div>

              <div v-if="store.agents.length === 0" class="text-center pa-8 text-medium-emphasis">
                <v-icon size="64" class="mb-3">mdi-robot-off</v-icon>
                <div class="text-h6">No agents registered yet</div>
                <div class="text-body-2">Run the seed migration to populate agent registry</div>
              </div>
            </div>
          </v-container>
        </v-window-item>

        <!-- PROPOSALS TAB -->
        <v-window-item value="proposals">
          <v-container fluid>
            <!-- Filters -->
            <v-row class="mb-4">
              <v-col cols="12" sm="4" md="3">
                <v-select
                  v-model="store.proposalFilter.status"
                  :items="proposalStatusOptions"
                  label="Status"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadProposals"
                />
              </v-col>
              <v-col cols="12" sm="4" md="3">
                <v-select
                  v-model="store.proposalFilter.agentId"
                  :items="agentIdOptions"
                  label="Agent"
                  variant="outlined"
                  density="compact"
                  clearable
                  @update:model-value="loadProposals"
                />
              </v-col>
              <v-col cols="12" sm="4" md="3" class="d-flex align-center gap-2">
                <v-btn
                  color="teal"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-check-all"
                  :loading="bulkResolving"
                  :disabled="!hasResolvableProposals"
                  @click="bulkResolveAll"
                >
                  Resolve All ({{ resolvableCount }})
                </v-btn>
              </v-col>
            </v-row>

            <div v-if="store.isLoadingProposals" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <v-table v-else-if="store.proposals.length > 0" density="comfortable">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="proposal in store.proposals" :key="proposal.id">
                  <td>
                    <v-chip size="small" variant="tonal">{{ proposal.agent_id }}</v-chip>
                  </td>
                  <td>
                    <v-chip size="small" variant="outlined">{{ proposal.proposal_type }}</v-chip>
                  </td>
                  <td>
                    <div class="font-weight-medium">{{ proposal.title }}</div>
                    <div v-if="proposal.summary" class="text-caption text-medium-emphasis">
                      {{ proposal.summary?.substring(0, 80) }}{{ (proposal.summary?.length ?? 0) > 80 ? '...' : '' }}
                    </div>
                  </td>
                  <td>
                    <v-chip
                      :color="riskColor(proposal.risk_level)"
                      size="x-small"
                      variant="flat"
                    >
                      {{ proposal.risk_level }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip
                      :color="proposalStatusColor(proposal.status)"
                      size="small"
                      variant="flat"
                    >
                      {{ proposal.status }}
                    </v-chip>
                  </td>
                  <td class="text-caption">{{ formatRelative(proposal.created_at) }}</td>
                  <td>
                    <div class="d-flex ga-1">
                      <template v-if="proposal.status === 'pending'">
                        <v-btn
                          size="x-small"
                          color="success"
                          variant="tonal"
                          @click="openReviewDialog(proposal, 'approve')"
                        >
                          <v-icon>mdi-check</v-icon>
                        </v-btn>
                        <v-btn
                          size="x-small"
                          color="error"
                          variant="tonal"
                          @click="openReviewDialog(proposal, 'reject')"
                        >
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </template>
                      <template v-if="proposal.status === 'auto_approved' || proposal.status === 'approved'">
                        <v-btn
                          size="x-small"
                          color="teal"
                          variant="tonal"
                          @click="openReviewDialog(proposal, 'resolve')"
                        >
                          <v-icon start size="14">mdi-check-circle</v-icon>
                          Resolve
                        </v-btn>
                        <v-btn
                          size="x-small"
                          color="error"
                          variant="tonal"
                          @click="openReviewDialog(proposal, 'reject')"
                        >
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </template>
                      <v-btn
                        size="x-small"
                        variant="tonal"
                        @click="viewProposalDetail(proposal)"
                      >
                        <v-icon>mdi-eye</v-icon>
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <div v-else class="text-center pa-8 text-medium-emphasis">
              <v-icon size="48" class="mb-2">mdi-clipboard-text-off</v-icon>
              <div>No proposals found</div>
            </div>

            <!-- Pagination -->
            <div v-if="store.proposalsTotal > store.proposalFilter.limit" class="d-flex justify-center mt-4">
              <v-pagination
                :length="Math.ceil(store.proposalsTotal / store.proposalFilter.limit)"
                :model-value="Math.floor(store.proposalFilter.offset / store.proposalFilter.limit) + 1"
                @update:model-value="(p: number) => { store.proposalFilter.offset = (p - 1) * store.proposalFilter.limit; loadProposals() }"
                density="compact"
                rounded
              />
            </div>
          </v-container>
        </v-window-item>

        <!-- RUN HISTORY TAB -->
        <v-window-item value="runs">
          <v-container fluid>
            <!-- Run filter -->
            <v-row class="mb-4">
              <v-col cols="12" sm="4" md="3">
                <v-select
                  v-model="store.runFilter.agentId"
                  :items="agentIdOptions"
                  label="Filter by Agent"
                  variant="outlined"
                  density="compact"
                  clearable
                />
              </v-col>
            </v-row>

            <v-table v-if="store.filteredRuns.length > 0" density="comfortable">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Trigger</th>
                  <th>Status</th>
                  <th>Proposals</th>
                  <th>Tokens</th>
                  <th>Cost</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="run in store.filteredRuns" :key="run.id">
                  <td>
                    <v-chip size="small" variant="tonal">{{ run.agent_id }}</v-chip>
                  </td>
                  <td>
                    <v-chip size="x-small" variant="outlined">{{ run.trigger_type }}</v-chip>
                  </td>
                  <td>
                    <v-chip
                      :color="run.status === 'success' ? 'success' : run.status === 'error' ? 'error' : run.status === 'running' ? 'info' : 'warning'"
                      size="small"
                      variant="flat"
                    >
                      {{ run.status }}
                    </v-chip>
                  </td>
                  <td>{{ run.proposals_created }}</td>
                  <td>{{ run.tokens_used.toLocaleString() }}</td>
                  <td>${{ Number(run.cost_usd).toFixed(4) }}</td>
                  <td>
                    <template v-if="run.finished_at">
                      {{ ((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1) }}s
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td class="text-caption">{{ formatRelative(run.started_at) }}</td>
                  <td>
                    <v-tooltip v-if="run.error_message" location="top" max-width="400">
                      <template #activator="{ props }">
                        <v-icon v-bind="props" color="error" size="small">mdi-alert-circle</v-icon>
                      </template>
                      <span class="text-caption">{{ run.error_message }}</span>
                    </v-tooltip>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <div v-else class="text-center pa-8 text-medium-emphasis">
              <v-icon size="48" class="mb-2">mdi-history</v-icon>
              <div>No runs recorded yet</div>
            </div>
          </v-container>
        </v-window-item>

        <!-- ANALYTICS TAB -->
        <v-window-item value="analytics">
          <v-container fluid>
            <div v-if="store.isLoadingCharts" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="store.chartData">
              <v-row>
                <!-- Cost by Cluster (7 days) -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" rounded="lg">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start size="20">mdi-currency-usd</v-icon>
                      Daily Cost by Cluster (7d)
                    </v-card-title>
                    <v-card-text>
                      <ClientOnly>
                        <apexchart
                          type="bar"
                          height="280"
                          :options="costChartOptions"
                          :series="store.chartData.costSeries"
                        />
                      </ClientOnly>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Run Status (7 days) -->
                <v-col cols="12" md="6">
                  <v-card variant="outlined" rounded="lg">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start size="20">mdi-chart-bar</v-icon>
                      Run Status (7d)
                    </v-card-title>
                    <v-card-text>
                      <ClientOnly>
                        <apexchart
                          type="bar"
                          height="280"
                          :options="runChartOptions"
                          :series="store.chartData.runSeries"
                        />
                      </ClientOnly>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Token Budget Usage per Agent -->
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-card variant="outlined" rounded="lg">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start size="20">mdi-speedometer</v-icon>
                      Token Budget Usage (Today)
                    </v-card-title>
                    <v-card-text>
                      <div
                        v-for="agent in store.chartData.agentTokens"
                        :key="agent.agent_id"
                        class="mb-3"
                      >
                        <div class="d-flex justify-space-between align-center mb-1">
                          <div class="d-flex align-center">
                            <v-chip size="x-small" variant="tonal" :color="clusterColor(agent.cluster)" class="mr-2">
                              {{ agent.cluster }}
                            </v-chip>
                            <span class="text-body-2 font-weight-medium">{{ agent.name }}</span>
                          </div>
                          <span class="text-caption text-medium-emphasis">
                            {{ agent.used.toLocaleString() }} / {{ agent.budget.toLocaleString() }} ({{ agent.pct }}%)
                          </span>
                        </div>
                        <v-progress-linear
                          :model-value="agent.pct"
                          :color="agent.pct > 80 ? 'error' : agent.pct > 50 ? 'warning' : 'primary'"
                          height="6"
                          rounded
                        />
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Proposals by Agent (7d) -->
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-card variant="outlined" rounded="lg">
                    <v-card-title class="text-subtitle-1">
                      <v-icon start size="20">mdi-clipboard-text-multiple</v-icon>
                      Proposals by Agent (7d)
                    </v-card-title>
                    <v-card-text>
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th>Agent</th>
                            <th class="text-center">Pending</th>
                            <th class="text-center">Auto-Approved</th>
                            <th class="text-center">Approved</th>
                            <th class="text-center">Rejected</th>
                            <th class="text-center">Applied</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(counts, agentId) in store.chartData.proposalsByAgent"
                            :key="String(agentId)"
                          >
                            <td class="font-weight-medium">{{ getAgentName(String(agentId)) }}</td>
                            <td class="text-center">
                              <v-chip v-if="(counts as any).pending" color="warning" size="x-small">{{ (counts as any).pending }}</v-chip>
                              <span v-else class="text-medium-emphasis">0</span>
                            </td>
                            <td class="text-center">
                              <v-chip v-if="(counts as any).auto_approved" color="info" size="x-small">{{ (counts as any).auto_approved }}</v-chip>
                              <span v-else class="text-medium-emphasis">0</span>
                            </td>
                            <td class="text-center">
                              <v-chip v-if="(counts as any).approved" color="success" size="x-small">{{ (counts as any).approved }}</v-chip>
                              <span v-else class="text-medium-emphasis">0</span>
                            </td>
                            <td class="text-center">
                              <v-chip v-if="(counts as any).rejected" color="error" size="x-small">{{ (counts as any).rejected }}</v-chip>
                              <span v-else class="text-medium-emphasis">0</span>
                            </td>
                            <td class="text-center">
                              <v-chip v-if="(counts as any).applied" color="primary" size="x-small">{{ (counts as any).applied }}</v-chip>
                              <span v-else class="text-medium-emphasis">0</span>
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <div v-else class="text-center pa-8 text-medium-emphasis">
              <v-icon size="48" class="mb-2">mdi-chart-line</v-icon>
              <div>No analytics data available</div>
            </div>
          </v-container>
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Proposal Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="800">
      <v-card v-if="selectedProposal" rounded="lg">
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2">mdi-clipboard-text</v-icon>
          {{ selectedProposal.title }}
        </v-card-title>
        <v-card-text>
          <div class="d-flex ga-2 mb-3 flex-wrap">
            <v-chip :color="proposalStatusColor(selectedProposal.status)" size="small">
              {{ selectedProposal.status }}
            </v-chip>
            <v-chip :color="riskColor(selectedProposal.risk_level)" size="small">
              {{ selectedProposal.risk_level }} risk
            </v-chip>
            <v-chip size="small" variant="outlined">
              {{ selectedProposal.proposal_type }}
            </v-chip>
            <v-chip size="small" variant="tonal">
              {{ selectedProposal.agent_id }}
            </v-chip>
          </div>

          <div v-if="selectedProposal.summary" class="text-body-2 mb-4">
            {{ selectedProposal.summary }}
          </div>

          <v-divider class="mb-4" />

          <!-- Rich Proposal Detail Rendering -->
          <div class="text-subtitle-2 font-weight-bold mb-2">Proposal Detail</div>

          <!-- Render key-value pairs nicely if detail is a flat-ish object -->
          <div v-if="selectedProposal.detail && typeof selectedProposal.detail === 'object'" class="mb-4">
            <v-table density="compact" class="proposal-detail-table">
              <tbody>
                <tr v-for="(value, key) in flattenedDetail" :key="String(key)">
                  <td class="font-weight-medium text-caption" style="width: 180px; vertical-align: top;">
                    {{ humanizeKey(String(key)) }}
                  </td>
                  <td class="text-body-2">
                    <template v-if="Array.isArray(value)">
                      <v-chip
                        v-for="(item, idx) in (value as any[])"
                        :key="idx"
                        size="x-small"
                        variant="tonal"
                        class="mr-1 mb-1"
                      >
                        {{ typeof item === 'object' ? JSON.stringify(item) : item }}
                      </v-chip>
                    </template>
                    <template v-else-if="typeof value === 'boolean'">
                      <v-icon :color="value ? 'success' : 'error'" size="small">
                        {{ value ? 'mdi-check-circle' : 'mdi-close-circle' }}
                      </v-icon>
                    </template>
                    <template v-else-if="typeof value === 'object' && value !== null">
                      <pre class="text-caption pa-2 bg-grey-lighten-4 rounded" style="white-space: pre-wrap; max-height: 200px; overflow: auto;">{{ JSON.stringify(value, null, 2) }}</pre>
                    </template>
                    <template v-else>{{ value ?? '—' }}</template>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <!-- Fallback to JSON for non-object details -->
          <pre v-else class="text-body-2 pa-3 bg-grey-lighten-4 rounded overflow-auto" style="max-height: 400px; white-space: pre-wrap;">{{ JSON.stringify(selectedProposal.detail, null, 2) }}</pre>

          <!-- Review history -->
          <div v-if="selectedProposal.reviewed_at" class="mt-4">
            <v-divider class="mb-3" />
            <div class="text-caption text-medium-emphasis">
              <v-icon size="14" class="mr-1">mdi-clock-check</v-icon>
              Reviewed {{ formatRelative(selectedProposal.reviewed_at) }}
              <span v-if="selectedProposal.reviewed_by"> by {{ selectedProposal.reviewed_by }}</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="selectedProposal.status === 'pending'"
            color="success"
            variant="tonal"
            @click="openReviewDialog(selectedProposal, 'approve'); showDetailDialog = false"
          >
            <v-icon start>mdi-check</v-icon>
            Approve
          </v-btn>
          <v-btn
            v-if="selectedProposal.status === 'pending' || selectedProposal.status === 'auto_approved'"
            color="error"
            variant="tonal"
            @click="openReviewDialog(selectedProposal, 'reject'); showDetailDialog = false"
          >
            <v-icon start>mdi-close</v-icon>
            Reject
          </v-btn>
          <v-btn
            v-if="selectedProposal.status === 'auto_approved' || selectedProposal.status === 'approved'"
            color="teal"
            variant="tonal"
            @click="openReviewDialog(selectedProposal, 'resolve'); showDetailDialog = false"
          >
            <v-icon start>mdi-check-circle</v-icon>
            Resolve
          </v-btn>
          <v-btn @click="showDetailDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Review Notes Dialog -->
    <v-dialog v-model="showReviewDialog" max-width="500" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center">
          <v-icon
            class="mr-2"
            :color="reviewAction === 'approve' ? 'success' : reviewAction === 'resolve' ? 'teal' : 'error'"
          >
            {{ reviewAction === 'approve' ? 'mdi-check-circle' : reviewAction === 'resolve' ? 'mdi-check-all' : 'mdi-close-circle' }}
          </v-icon>
          {{ reviewAction === 'approve' ? 'Approve' : reviewAction === 'resolve' ? 'Resolve' : 'Reject' }} Proposal
        </v-card-title>
        <v-card-text>
          <div v-if="reviewTargetProposal" class="mb-3">
            <div class="text-subtitle-2 font-weight-medium">{{ reviewTargetProposal.title }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ reviewTargetProposal.agent_id }} &middot; {{ reviewTargetProposal.proposal_type }}
            </div>
          </div>
          <v-textarea
            v-model="reviewNotes"
            label="Review notes (optional)"
            variant="outlined"
            density="compact"
            rows="3"
            :placeholder="reviewAction === 'resolve' ? 'Acknowledged / resolved' : reviewAction === 'approve' ? 'Why are you approving this proposal?' : 'Reason for rejection...'"
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelReview">Cancel</v-btn>
          <v-btn
            :color="reviewAction === 'approve' ? 'success' : reviewAction === 'resolve' ? 'teal' : 'error'"
            variant="flat"
            :loading="isReviewing"
            @click="submitReview"
          >
            {{ reviewAction === 'approve' ? 'Approve' : reviewAction === 'resolve' ? 'Resolve' : 'Reject' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Snackbar for run feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="5000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { AgentProposalRow, AgentStatus, AgentRegistryRow } from '~/types/agent.types'
import { useAgentsStore } from '~/stores/agents'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'admin'],
})

const store = useAgentsStore()

const activeTab = ref('roster')
const showDetailDialog = ref(false)
const selectedProposal = ref<AgentProposalRow | null>(null)

// Snackbar state
const snackbar = reactive({
  show: false,
  text: '',
  color: 'success',
})

function showSnack(text: string, color = 'success') {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

// Review dialog state
const showReviewDialog = ref(false)
const reviewAction = ref<'approve' | 'reject' | 'resolve'>('approve')
const reviewNotes = ref('')
const reviewTargetProposal = ref<AgentProposalRow | null>(null)
const isReviewing = ref(false)
const isRunningAll = ref(false)
const bulkResolving = ref(false)

// Computed — resolvable proposals count
const resolvableCount = computed(() =>
  store.proposals.filter(p => ['auto_approved', 'approved', 'pending'].includes(p.status)).length
)
const hasResolvableProposals = computed(() => resolvableCount.value > 0)

// Load data on mount
onMounted(async () => {
  await store.fetchAgents()
  await store.fetchProposals()
})

// Watch tab changes to load data
watch(activeTab, async (tab) => {
  if (tab === 'runs' && store.recentRuns.length === 0) {
    try {
      const headers = await store._authHeaders()
      const runs = await $fetch('/api/agents/runs', {
        headers,
        params: { limit: 50 },
      }) as any
      if (runs?.data) store.recentRuns = runs.data
    } catch {
      // Runs endpoint not yet available
    }
  }
  if (tab === 'analytics' && !store.chartData) {
    await store.fetchCharts()
  }
})

// Options
const proposalStatusOptions = [
  { title: 'Pending', value: 'pending' },
  { title: 'Auto Approved', value: 'auto_approved' },
  { title: 'Approved', value: 'approved' },
  { title: 'Rejected', value: 'rejected' },
  { title: 'Applied', value: 'applied' },
  { title: 'Expired', value: 'expired' },
]

const agentIdOptions = computed(() => {
  const agents: AgentRegistryRow[] = store.agents
  return agents.map(a => ({ title: a.display_name, value: a.agent_id }))
})

// Chart options
const costChartOptions = computed(() => ({
  chart: { type: 'bar', stacked: true, toolbar: { show: false } },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  xaxis: { categories: store.chartData?.days ?? [] },
  yaxis: { title: { text: 'Cost (USD)' }, labels: { formatter: (v: number) => `$${v.toFixed(4)}` } },
  colors: ['#1976D2', '#FF9800', '#E91E63', '#9C27B0', '#4CAF50'],
  legend: { position: 'bottom' as const },
  tooltip: { y: { formatter: (v: number) => `$${v.toFixed(4)}` } },
  dataLabels: { enabled: false },
}))

const runChartOptions = computed(() => ({
  chart: { type: 'bar', stacked: true, toolbar: { show: false } },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  xaxis: { categories: store.chartData?.days ?? [] },
  yaxis: { title: { text: 'Runs' } },
  colors: ['#4CAF50', '#F44336', '#FF9800'],
  legend: { position: 'bottom' as const },
  dataLabels: { enabled: false },
}))

// Helpers
function clusterLabel(cluster: string): string {
  const labels: Record<string, string> = {
    skill_dev: 'Skill & Development',
    ops_hr: 'Operations & HR',
    engagement: 'Engagement & Growth',
    orchestration: 'Orchestration',
    admin: 'Administration',
  }
  return labels[cluster] ?? cluster
}

function clusterIcon(cluster: string): string {
  const icons: Record<string, string> = {
    skill_dev: 'mdi-school',
    ops_hr: 'mdi-account-hard-hat',
    engagement: 'mdi-heart-pulse',
    orchestration: 'mdi-brain',
    admin: 'mdi-shield-account',
  }
  return icons[cluster] ?? 'mdi-robot'
}

function clusterColor(cluster: string): string {
  const colors: Record<string, string> = {
    skill_dev: 'blue',
    ops_hr: 'orange',
    engagement: 'pink',
    orchestration: 'deep-purple',
    admin: 'purple',
  }
  return colors[cluster] ?? 'grey'
}

function statusColor(status: string): string {
  return { active: 'success', paused: 'warning', disabled: 'error' }[status] ?? 'grey'
}

function riskColor(risk: string): string {
  return { low: 'success', medium: 'warning', high: 'error' }[risk] ?? 'grey'
}

function proposalStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'warning',
    auto_approved: 'info',
    approved: 'success',
    rejected: 'error',
    applied: 'primary',
    expired: 'grey',
  }
  return map[status] ?? 'grey'
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, s => s.toUpperCase())
}

function getAgentName(agentId: string): string {
  const agent = store.getAgentById(agentId)
  return agent?.display_name ?? agentId
}

// Flatten detail for rich rendering (one level deep)
const flattenedDetail = computed(() => {
  if (!selectedProposal.value?.detail || typeof selectedProposal.value.detail !== 'object') return {}
  return selectedProposal.value.detail as Record<string, unknown>
})

// Actions
async function loadProposals() {
  store.proposalFilter.offset = 0
  await store.fetchProposals()
}

async function triggerRun(agentId: string) {
  const agent = store.getAgentById(agentId)
  const name = agent?.display_name || agentId
  showSnack(`Running ${name}...`, 'info')
  const success = await store.triggerAgent(agentId)
  if (success) {
    showSnack(`${name} completed successfully!`, 'success')
  } else {
    showSnack(store.error || `${name} failed`, 'error')
  }
}

async function runAllActive() {
  const active = store.activeAgents
  if (active.length === 0) return
  isRunningAll.value = true
  showSnack(`Running ${active.length} active agent${active.length !== 1 ? 's' : ''}...`, 'info')
  let succeeded = 0
  let failed = 0
  for (const agent of active) {
    const ok = await store.triggerAgent(agent.agent_id)
    if (ok) succeeded++
    else failed++
  }
  isRunningAll.value = false
  if (failed === 0) {
    showSnack(`All ${succeeded} agents completed successfully!`, 'success')
  } else {
    showSnack(`${succeeded} succeeded, ${failed} failed`, failed > 0 ? 'warning' : 'success')
  }
}

async function toggleStatus(agentId: string, status: AgentStatus) {
  const agent = store.getAgentById(agentId)
  const name = agent?.display_name || agentId
  const success = await store.updateStatus(agentId, status)
  if (success) {
    showSnack(`${name} is now ${status}`, 'success')
  } else {
    showSnack(store.error || `Failed to update ${name}`, 'error')
  }
}

function openReviewDialog(proposal: AgentProposalRow, action: 'approve' | 'reject' | 'resolve') {
  reviewTargetProposal.value = proposal
  reviewAction.value = action
  reviewNotes.value = ''
  showReviewDialog.value = true
}

function cancelReview() {
  showReviewDialog.value = false
  reviewTargetProposal.value = null
  reviewNotes.value = ''
}

async function submitReview() {
  if (!reviewTargetProposal.value) return
  isReviewing.value = true
  try {
    await store.reviewProposal(
      reviewTargetProposal.value.id,
      reviewAction.value,
      reviewNotes.value || undefined,
    )
    showSnack(`Proposal ${reviewAction.value}d successfully`)
    await store.fetchProposals()
    await store.fetchAgents()
    showReviewDialog.value = false
    reviewTargetProposal.value = null
    reviewNotes.value = ''
  } catch (err: any) {
    showSnack(err?.message || 'Review failed', 'error')
  } finally {
    isReviewing.value = false
  }
}

async function bulkResolveAll() {
  bulkResolving.value = true
  try {
    const headers = await store._authHeaders()
    const response = await $fetch('/api/agents/proposals/bulk-resolve', {
      method: 'POST',
      body: {
        agentId: store.proposalFilter.agentId || undefined,
        status: (store.proposalFilter.status === 'auto_approved' || store.proposalFilter.status === 'pending')
          ? store.proposalFilter.status
          : undefined,
      },
      headers,
    }) as any
    showSnack(`${response?.data?.resolved ?? 0} proposals resolved`)
    await store.fetchProposals()
    await store.fetchAgents()
  } catch (err: any) {
    showSnack(err?.message || 'Bulk resolve failed', 'error')
  } finally {
    bulkResolving.value = false
  }
}

function viewProposalDetail(proposal: AgentProposalRow) {
  selectedProposal.value = proposal
  showDetailDialog.value = true
}
</script>
