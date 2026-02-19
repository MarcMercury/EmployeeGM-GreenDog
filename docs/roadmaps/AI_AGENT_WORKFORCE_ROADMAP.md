# AI Agent Workforce — Architecture & Implementation Roadmap

> **Goal:** Build a roster of autonomous AI agents that operate as full-time "digital employees," each owning a narrow domain, working both independently and collaboratively, so human employees can focus on interpersonal communication, personal growth, and physical work.

> **Date:** 2026-02-09  
> **Status:** Planning → Phase 0 ready

---

## Table of Contents

1. [Vision & Design Principles](#1-vision--design-principles)
2. [Agent Roster](#2-agent-roster)
3. [Core Infrastructure (Phase 0)](#3-core-infrastructure-phase-0)
4. [Phase 1 — Skill & Development Cluster](#4-phase-1--skill--development-cluster)
5. [Phase 2 — Operations & HR Cluster](#5-phase-2--operations--hr-cluster)
6. [Phase 3 — Engagement & Growth Cluster](#6-phase-3--engagement--growth-cluster)
7. [Phase 4 — Cross-Agent Orchestration](#7-phase-4--cross-agent-orchestration)
8. [Database Additions](#8-database-additions)
9. [Technology Choices](#9-technology-choices)
10. [Cost & Rate-Limit Strategy](#10-cost--rate-limit-strategy)
11. [Implementation Order & Dependencies](#11-implementation-order--dependencies)

---

## 1. Vision & Design Principles

### What "full-time AI employee" means

Each agent:
- **Runs on a schedule** (cron) and **reacts to events** (DB triggers, webhooks).
- **Has a narrow mandate** — one domain, clear inputs/outputs.
- **Writes decisions to the database** with full audit trail.
- **Surfaces work to humans** via notifications, dashboard cards, and Slack.
- **Proposes, doesn't impose** — creates recommendations/drafts that a human (or a supervisor agent) approves before side effects.
- **Costs are tracked** — every LLM call logs to `ai_usage_log`.

### Design Principles

| Principle | Meaning |
|-----------|---------|
| **Event-driven** | Agents wake on cron ticks or DB/webhook events, not long-running processes. |
| **Propose → Review → Apply** | All agent output is a "proposal" until approved (auto or human). |
| **Shared memory = database** | Agents communicate through well-defined DB tables, not direct calls. |
| **Composable tools** | Each agent is a serverless function that calls reusable "tool" utilities. |
| **Cost ceiling** | Every agent has a per-day token budget enforced in middleware. |
| **Observable** | Every action is logged, dashboarded, and Slack-reported. |

---

## 2. Agent Roster

### Cluster A — Skill & Development

| ID | Agent Name | Domain | Runs | Priority |
|----|-----------|--------|------|----------|
| A1 | **Skill Scout** | Scours web for vet-industry skills, updates `skill_library` | Daily cron + manual trigger | 🔴 High |
| A2 | **Role Mapper** | Maps skills → positions/roles with recommended levels | After A1 runs, or on role change | 🔴 High |
| A3 | **Gap Analyzer** | Compares employee skills vs role expectations, produces gap reports | Daily or on skill/role change | 🔴 High |
| A4 | **Course Architect** | Designs training courses, quizzes, video recommendations for L1-L2 gaps | After A3 identifies gaps | 🟡 Medium |
| A5 | **Mentor Matchmaker** | Pairs L4-L5 employees with L1-L3 employees on matching skills | After A3 runs | 🟡 Medium |

### Cluster B — Operations & HR

| ID | Agent Name | Domain | Runs | Priority |
|----|-----------|--------|------|----------|
| B1 | **HR Auditor** | Reviews profiles for completeness, requests missing info | Daily cron | 🔴 High |
| B2 | **Schedule Planner** | Auto-generates weekly draft schedules per location | Weekly cron (builds on existing AI schedule endpoint) | 🔴 High |
| B3 | **Attendance Monitor** | Analyzes clock-ins, lateness, reliability scores, flags issues | Hourly cron or event trigger on `time_punches` | 🔴 High |
| B4 | **Payroll Watchdog** | Monitors time entries, overtime, anomalies, prepares payroll summaries | Daily cron | 🟡 Medium |
| B5 | **Compliance Tracker** | Monitors credential expiry, license renewals, required training | Daily cron (extends existing `credential-expiry-check`) | 🟡 Medium |

### Cluster C — Engagement & Growth

| ID | Agent Name | Domain | Runs | Priority |
|----|-----------|--------|------|----------|
| C1 | **Personal Coach** | Per-employee nudges: goal reminders, skill suggestions, encouragement | Daily cron + event triggers | 🟡 Medium |
| C2 | **Review Orchestrator** | Initiates review cycles, reminds managers, drafts review summaries | On review cycle schedule | 🟡 Medium |
| C3 | **Engagement Pulse** | Analyzes login frequency, skill activity, quiz completion to detect disengagement | Weekly cron | 🟢 Lower |
| C4 | **Referral Intelligence** | Analyzes referral data, suggests outreach priorities | Weekly cron | 🟢 Lower |

### Cluster D — Orchestration & Admin

| ID | Agent Name | Domain | Runs | Priority |
|----|-----------|--------|------|----------|
| D1 | **Supervisor Agent** | Reviews proposals from all agents, auto-approves low-risk, escalates high-risk | Event-driven (on new proposals) | Phase 4 |
| D2 | **Agent Dashboard** | UI for viewing agent activity, proposals, costs, health | Always-on page | Phase 0 (builds incrementally) |

---

## 3. Core Infrastructure (Phase 0)

Before any agent can run, build the shared foundation.

### 3.1 Agent Registry Table

```sql
CREATE TABLE agent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT UNIQUE NOT NULL,          -- 'skill_scout', 'hr_auditor', etc.
  display_name TEXT NOT NULL,
  cluster TEXT NOT NULL,                   -- 'skill_dev', 'ops_hr', 'engagement', 'admin'
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- active, paused, disabled
  schedule_cron TEXT,                      -- '0 6 * * *' for daily at 6am UTC
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,                    -- success, partial, error
  last_run_duration_ms INTEGER,
  daily_token_budget INTEGER DEFAULT 50000,
  daily_tokens_used INTEGER DEFAULT 0,
  budget_reset_at TIMESTAMPTZ DEFAULT now(),
  config JSONB DEFAULT '{}',               -- agent-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Agent Proposals Table (the universal output)

```sql
CREATE TABLE agent_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_registry(agent_id),
  proposal_type TEXT NOT NULL,             -- 'new_skill', 'skill_role_mapping', 'course_draft',
                                           -- 'schedule_draft', 'mentor_match', 'nudge', 
                                           -- 'profile_update_request', 'attendance_flag', etc.
  title TEXT NOT NULL,
  summary TEXT,
  detail JSONB NOT NULL,                   -- structured payload specific to proposal type
  target_employee_id UUID REFERENCES employees(id),
  target_entity_type TEXT,                 -- 'skill_library', 'training_courses', 'shifts', etc.
  target_entity_id UUID,
  risk_level TEXT DEFAULT 'low',           -- low, medium, high
  status TEXT DEFAULT 'pending',           -- pending, auto_approved, approved, rejected, expired
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  applied_at TIMESTAMPTZ,                  -- when the proposal was actually applied
  expires_at TIMESTAMPTZ,                  -- auto-expire stale proposals
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_proposals_agent ON agent_proposals(agent_id, status);
CREATE INDEX idx_proposals_status ON agent_proposals(status, created_at);
CREATE INDEX idx_proposals_employee ON agent_proposals(target_employee_id) WHERE target_employee_id IS NOT NULL;
```

### 3.3 Agent Run Log (extends existing `ai_usage_log`)

```sql
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_registry(agent_id),
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',   -- running, success, partial, error
  trigger_type TEXT NOT NULL,               -- 'cron', 'event', 'manual', 'agent'
  trigger_source TEXT,                      -- cron job name, event type, requesting agent
  proposals_created INTEGER DEFAULT 0,
  proposals_auto_approved INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id, started_at DESC);
```

### 3.4 Shared Server Utilities

Create reusable utilities under `server/utils/agents/`:

```
server/utils/agents/
  ├── openai.ts          # Shared OpenAI client (replaces raw fetch)
  ├── registry.ts        # getAgent(), updateAgentStatus(), checkBudget()
  ├── proposals.ts       # createProposal(), approveProposal(), applyProposal()
  ├── runs.ts            # startRun(), completeRun(), failRun()
  ├── budget.ts          # checkTokenBudget(), recordTokenUsage(), resetDailyBudgets()
  ├── tools/             # Reusable tool functions agents can call
  │   ├── web-search.ts  # Web scraping / search API for Skill Scout
  │   ├── skill-ops.ts   # CRUD on skill_library, employee_skills
  │   ├── course-ops.ts  # CRUD on training_courses, lessons, quizzes
  │   ├── notify.ts      # Send notifications (in-app + Slack)
  │   └── employee-ops.ts# Read/update employee profiles, attendance
  └── schemas.ts         # Zod schemas for proposal payloads
```

**`server/utils/agents/openai.ts`** — single shared client:
```typescript
// Wraps OpenAI calls with:
// - Automatic token counting & logging to ai_usage_log
// - Budget checking (rejects if agent over daily limit)
// - Retry with exponential backoff
// - Structured JSON response parsing
// - Model selection (gpt-4o for reasoning, gpt-4o-mini for simple tasks)
export async function agentChat(options: {
  agentId: string
  runId: string
  messages: ChatMessage[]
  model?: 'reasoning' | 'fast'
  responseFormat?: 'json' | 'text'
  maxTokens?: number
}): Promise<AgentChatResult>
```

### 3.5 Agent API Endpoints

```
server/api/agents/
  ├── index.get.ts              # List all agents with status
  ├── [agentId]/
  │   ├── index.get.ts          # Agent detail + recent runs
  │   ├── trigger.post.ts       # Manually trigger an agent run
  │   ├── pause.post.ts         # Pause/unpause agent
  │   └── config.patch.ts       # Update agent config
  ├── proposals/
  │   ├── index.get.ts          # List proposals (filterable)
  │   ├── [id].get.ts           # Proposal detail
  │   ├── [id]/approve.post.ts  # Approve a proposal
  │   └── [id]/reject.post.ts   # Reject a proposal
  ├── runs/
  │   └── index.get.ts          # Recent runs across all agents
  └── dashboard.get.ts          # Aggregated stats for dashboard
```

### 3.6 Cron Dispatcher

A single new Vercel cron endpoint that acts as the **agent scheduler**:

```
server/api/cron/agent-dispatcher.get.ts
```

Every minute (or every 5 minutes), it:
1. Reads `agent_registry` where `status = 'active'`
2. Checks each agent's `schedule_cron` against current time
3. For due agents, calls their handler function
4. Updates `last_run_at`, `last_run_status`

This avoids needing a separate Vercel cron for every agent.

### 3.7 Frontend — Agent Dashboard Page

```
app/pages/admin/agents.vue       # Agent roster, status, recent activity
app/pages/admin/agents/[id].vue  # Single agent detail + proposals
app/stores/agents.ts             # Pinia store for agent data
```

---

## 4. Phase 1 — Skill & Development Cluster

### Agent A1: Skill Scout

**Purpose:** Continuously discover and add veterinary industry skills.

**How it works:**
1. Cron triggers daily (or manual).
2. Calls OpenAI with a prompt like:
   > "You are a veterinary workforce expert. Given this existing skill library [attach current skills], suggest 10-20 new skills that a modern veterinary practice should track for these roles: Veterinarian, Vet Technician, Vet Assistant, CSR, Supervisor, Practice Manager. For each skill, provide: name, category, description, typical roles. Focus on [Clinical, Diagnostics, Surgical, Emergency, Pharmacy, Client Communication, Admin, Technology] categories. Prioritize skills not already in the library."
3. Optionally: Uses a web search tool (SerpAPI / Tavily / Brave Search API) to find recent AVMA, NAVTA publications, job postings on Indeed/LinkedIn for emerging skill trends.
4. Creates one `agent_proposal` per new skill with `proposal_type = 'new_skill'`.
5. Low-risk proposals (well-known skills) auto-approve. Novel/ambiguous ones go to human review.
6. On approval, inserts into `skill_library`.

**LLM cost estimate:** ~2K-5K tokens/run → ~$0.01-0.03/day with gpt-4o-mini.

### Agent A2: Role Mapper

**Purpose:** Maintain a `role_skill_expectations` table mapping each position/role to expected skills and proficiency levels.

**How it works:**
1. Triggers after A1 completes, or when roles/positions change.
2. Reads current `job_positions`, `skill_library`, and existing mappings.
3. Asks LLM: "For a [CSR / Vet Tech / Supervisor / etc.] at a veterinary practice, which of these skills should they have and at what level (1-5)?"
4. Creates proposals for new/updated role-skill mappings.
5. On approval, upserts into `role_skill_expectations`.

### Agent A3: Gap Analyzer

**Purpose:** For every employee, compare their current skills against their role's expectations and produce gap reports.

**How it works:**
1. Runs daily. No LLM needed — pure SQL/logic.
2. Joins `employee_skills` with `role_skill_expectations` (via employee's `job_position_id`).
3. Computes gaps: skills the employee lacks entirely, and skills below expected level.
4. Writes to `employee_skill_gaps` table.
5. Triggers downstream agents (A4, A5, C1).

### Agent A4: Course Architect

**Purpose:** Design training content for L1-L2 skill gaps.

**How it works:**
1. Reads `employee_skill_gaps` where `expected_level <= 2` and no existing course covers the skill.
2. For each uncovered skill, asks LLM to generate:
   - Course outline (3-5 lessons)
   - Quiz questions (5-10 per course)
   - Suggested video topics / external resource links
   - Estimated completion time
3. Creates proposals with `proposal_type = 'course_draft'`.
4. On approval, inserts into `training_courses`, `training_lessons`, `training_quizzes`, `training_quiz_questions`.

### Agent A5: Mentor Matchmaker

**Purpose:** Pair high-skill employees with those who need growth.

**How it works:**
1. Reads `employee_skill_gaps` where `current_level >= 3` and `expected_level >= 4`.
2. Finds employees with level 4-5 in the same skill.
3. Scores matches by: same location (preferred), compatible schedules, mentor capacity (max 2-3 mentees).
4. Creates proposals with `proposal_type = 'mentor_match'`.
5. On approval, inserts into `mentorships` table with status `pending`.
6. Sends notification to both parties.

---

## 5. Phase 2 — Operations & HR Cluster

### Agent B1: HR Auditor

**Purpose:** Ensure all employee profiles are complete and current.

**How it works:**
1. Daily cron.
2. Checks each employee profile against a completeness checklist:
   - Emergency contact filled? License numbers present? Profile photo? Address? Tax docs? I-9 status?
3. For incomplete profiles, creates proposals with `proposal_type = 'profile_update_request'`.
4. Auto-approved → sends in-app notification + Slack DM to the employee asking them to update.
5. Tracks response rate. Escalates to manager after 3 days of no action.

### Agent B2: Schedule Planner

**Purpose:** Auto-generate draft weekly schedules.

**How it works:**
1. Weekly cron (extends existing `schedule-suggest` endpoint).
2. For each location, gathers: required shifts, employee availability, skill requirements, reliability scores, overtime risk, time-off requests.
3. Calls OpenAI to generate optimal schedule.
4. Creates a proposal with `proposal_type = 'schedule_draft'` containing the full week's shifts.
5. Manager reviews on the schedule page and approves/modifies.

### Agent B3: Attendance Monitor

**Purpose:** Real-time lateness detection and reliability scoring.

**How it works:**
1. Event-driven: triggers on `time_punches` insert.
2. Compares clock-in time against scheduled shift start.
3. Updates `attendance` record with lateness minutes.
4. Recalculates rolling 90-day reliability score.
5. Thresholds:
   - Score drops below 80%: Creates proposal to notify supervisor.
   - Score drops below 60%: Creates proposal to notify HR + manager with recommended action.
   - 3+ no-call-no-shows: Creates proposal for disciplinary review.
6. No LLM needed — pure math/rules.

### Agent B4: Payroll Watchdog

**Purpose:** Pre-payroll anomaly detection.

**How it works:**
1. Daily cron.
2. Scans `time_entries` for: missing punches, >12h shifts, overtime approaching 40h, duplicate entries, unapproved entries nearing payroll deadline.
3. Creates flagged reports as proposals.
4. Weekly summary to payroll admin via Slack.

### Agent B5: Compliance Tracker

**Purpose:** Extends existing credential-expiry-check.

**How it works:**
1. Daily cron (merge with existing).
2. Adds: required CE hours tracking, license renewal reminders 60/30/14/7 days out, mandatory training completion tracking, OSHA compliance checks.
3. Creates proposals for overdue items.
4. Auto-sends notifications on low-risk reminders.

---

## 6. Phase 3 — Engagement & Growth Cluster

### Agent C1: Personal Coach

**Purpose:** Each employee gets a daily personalized nudge.

**How it works:**
1. Daily cron, processes all active employees.
2. For each, gathers context: current goals progress, skill gaps, recent quiz completions, upcoming deadlines, achievements close to unlocking.
3. Uses gpt-4o-mini to generate a 2-3 sentence motivational/actionable message.
4. Delivers via in-app notification (dashboard card) and optionally Slack.
5. Examples:
   - "You're 80% to your Radiology goal — just 2 more quiz modules to go! 🎯"
   - "Sarah M. in your clinic is a Level 5 in Client Communication — consider requesting mentorship!"
   - "You've been consistent with clock-ins this month — your reliability score is 96%! 💪"

### Agent C2: Review Orchestrator

**Purpose:** Automate the performance review lifecycle.

**How it works:**
1. Reads `review_cycles` and checks dates.
2. Auto-creates review instances for employees when a cycle opens.
3. Sends reminders at intervals (7 days, 3 days, 1 day before deadline).
4. After both self-review and manager-review are complete, uses LLM to draft a summary.
5. Creates proposal with `proposal_type = 'review_summary_draft'` for manager to edit.

### Agent C3: Engagement Pulse

**Purpose:** Detect disengagement early.

**How it works:**
1. Weekly cron.
2. Computes engagement score per employee:
   - Login frequency (last 7/30 days)
   - Skills updated or leveled up
   - Courses progressed
   - Goals updated
   - Quizzes attempted
   - Mentorship activity
3. Flags employees with declining engagement (>20% drop week-over-week).
4. Creates proposals to notify their manager with suggested actions.

---

## 7. Phase 4 — Cross-Agent Orchestration

### Agent D1: Supervisor Agent

**Purpose:** Review and route proposals from all agents.

**How it works:**
1. Event-driven: triggers on new `agent_proposals` insert.
2. Rules engine:
   - `risk_level = 'low'` and approved category → auto-approve.
   - `risk_level = 'medium'` → route to appropriate human role (HR, manager, admin).
   - `risk_level = 'high'` → require admin approval + Slack alert.
3. Optional LLM review: For ambiguous proposals, asks LLM to evaluate risk.
4. Tracks approval rates per agent to calibrate trust levels over time.

### Agent D2: Agent Dashboard (UI)

A dedicated admin page showing:
- Agent roster with status indicators (running/idle/paused/error)
- Recent proposals with approve/reject actions
- Token usage and cost graphs
- Run history timeline
- Per-agent configuration panel
- System health metrics

---

## 8. Database Additions

### New Tables Required

```
agent_registry              -- Agent definitions and status (Phase 0)
agent_proposals             -- Universal proposal queue (Phase 0)
agent_runs                  -- Execution history (Phase 0)
role_skill_expectations     -- Skills expected per role/position (Phase 1)
employee_skill_gaps         -- Computed gap analysis results (Phase 1)
employee_engagement_scores  -- Weekly engagement metrics (Phase 3)
agent_notifications         -- Agent-generated notification queue (Phase 0)
```

### Modified Tables

```
skill_library               -- Add: source ('manual', 'agent_scout'), agent_proposal_id
training_courses            -- Add: source ('manual', 'agent_architect'), agent_proposal_id
mentorships                 -- Add: agent_proposal_id (nullable)
attendance                  -- Add: reliability_score (if not exists), agent_flags JSONB
notifications               -- Works as-is, agents use existing notification system
```

---

## 9. Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **LLM Provider** | OpenAI (gpt-4o-mini default, gpt-4o for complex reasoning) | Already integrated, cost-effective |
| **Web Search** | Tavily API or Brave Search API | Structured search results for Skill Scout |
| **Task Scheduling** | Vercel Cron + agent dispatcher pattern | Matches existing infrastructure |
| **Event Triggers** | Supabase Database Webhooks or pg_notify + Nuxt server routes | React to DB changes without polling |
| **Agent Framework** | Custom lightweight (not LangChain) | Simpler, fewer dependencies, full control |
| **Token Tracking** | Existing `ai_usage_log` + new `agent_runs` | Unified cost monitoring |
| **Notifications** | Existing notification system + Slack | Already built |

### Why Not LangChain / CrewAI / AutoGen?

These frameworks add complexity, dependencies, and abstraction that this project doesn't need. Your agents are:
- **Narrow-scope** (not general-purpose reasoners)
- **Database-centric** (read data → call LLM → write proposals)
- **Serverless** (must run in Vercel functions, not long-running processes)

A lightweight custom pattern with shared utilities gives you full control, simpler debugging, and lower costs.

---

## 10. Cost & Rate-Limit Strategy

### Estimated Monthly Costs (all agents active)

| Agent | Runs/Month | Tokens/Run | Model | Est. Cost |
|-------|-----------|------------|-------|-----------|
| Skill Scout | 30 | 5K | gpt-4o-mini | $0.90 |
| Role Mapper | 30 | 3K | gpt-4o-mini | $0.54 |
| Gap Analyzer | 30 | 0 (SQL only) | — | $0 |
| Course Architect | 10 | 10K | gpt-4o | $3.00 |
| Mentor Matchmaker | 30 | 0 (SQL only) | — | $0 |
| HR Auditor | 30 | 0 (SQL only) | — | $0 |
| Schedule Planner | 4 | 8K | gpt-4o | $1.60 |
| Attendance Monitor | 600 | 0 (rules only) | — | $0 |
| Payroll Watchdog | 30 | 0 (SQL only) | — | $0 |
| Personal Coach | 30 × N employees | 1K | gpt-4o-mini | ~$5-15 |
| Review Orchestrator | 4 | 5K | gpt-4o-mini | $1.20 |
| Engagement Pulse | 4 | 0 (SQL only) | — | $0 |
| **Total** | | | | **~$15-25/mo** |

### Budget Controls

1. Each agent has a `daily_token_budget` in `agent_registry`.
2. `agentChat()` utility checks budget before calling OpenAI.
3. Daily cron resets `daily_tokens_used` at midnight UTC.
4. Admin dashboard shows real-time spend.
5. Slack alert when any agent hits 80% of daily budget.

---

## 11. Implementation Order & Dependencies

```
Phase 0 (Foundation) — ~1-2 weeks
├── Migration: agent_registry, agent_proposals, agent_runs tables
├── server/utils/agents/ shared utilities
├── server/api/agents/ CRUD endpoints
├── server/api/cron/agent-dispatcher.get.ts
├── app/pages/admin/agents.vue (basic dashboard)
└── app/stores/agents.ts

Phase 1 (Skill & Development) — ~2-3 weeks
├── Migration: role_skill_expectations, employee_skill_gaps tables
├── Agent A3: Gap Analyzer (SQL-only, simplest, immediate value)
├── Agent A1: Skill Scout (first LLM agent)
├── Agent A2: Role Mapper
├── Agent A5: Mentor Matchmaker (SQL-only)
├── Agent A4: Course Architect (most complex LLM agent)
└── Dashboard enhancements for skill cluster

Phase 2 (Operations & HR) — ~2-3 weeks
├── Agent B3: Attendance Monitor (event-driven, rules-only, high value)
├── Agent B1: HR Auditor (SQL + notification)
├── Agent B4: Payroll Watchdog (SQL + notification)
├── Agent B2: Schedule Planner (refactor existing endpoint)
├── Agent B5: Compliance Tracker (extend existing cron)
└── Dashboard enhancements for ops cluster

Phase 3 (Engagement & Growth) — ~2 weeks
├── Migration: employee_engagement_scores table
├── Agent C3: Engagement Pulse (SQL-only)
├── Agent C1: Personal Coach (LLM, per-employee)
├── Agent C2: Review Orchestrator (LLM + workflow)
└── Dashboard enhancements for engagement cluster

Phase 4 (Orchestration) — ~1-2 weeks
├── Agent D1: Supervisor Agent (auto-approval rules engine)
├── Full dashboard polish
├── Cross-agent metrics and reporting
└── Tuning: adjust schedules, budgets, approval thresholds
```

### Dependency Graph

```
Phase 0 ──────────────────────────────────────────┐
  │                                                │
  ├── Phase 1                                      │
  │     A1 (Skill Scout)                           │
  │       └── A2 (Role Mapper)                     │
  │             └── A3 (Gap Analyzer)              │
  │                   ├── A4 (Course Architect)    │
  │                   └── A5 (Mentor Matchmaker)   │
  │                                                │
  ├── Phase 2 (independent of Phase 1)             │
  │     B1 (HR Auditor)                            │
  │     B2 (Schedule Planner)                      │
  │     B3 (Attendance Monitor)                    │
  │     B4 (Payroll Watchdog)                      │
  │     B5 (Compliance Tracker)                    │
  │                                                │
  ├── Phase 3 (depends on Phase 1 for skill data)  │
  │     C1 (Personal Coach) ← needs A3 gap data   │
  │     C2 (Review Orchestrator)                   │
  │     C3 (Engagement Pulse)                      │
  │                                                │
  └── Phase 4 (depends on all above)               │
        D1 (Supervisor Agent)                      │
        D2 (Dashboard complete)                    │
```

---

## Quick Start: What to Build First

**If you want to start coding today, build in this order:**

1. **Database migration** — `agent_registry`, `agent_proposals`, `agent_runs` tables
2. **`server/utils/agents/openai.ts`** — shared LLM client with budget tracking
3. **`server/utils/agents/registry.ts`** — agent CRUD helpers
4. **`server/utils/agents/proposals.ts`** — proposal CRUD helpers
5. **`server/utils/agents/runs.ts`** — run lifecycle helpers
6. **`server/api/cron/agent-dispatcher.get.ts`** — the scheduler
7. **Agent A3: Gap Analyzer** — first agent, SQL-only, proves the pattern
8. **Agent B3: Attendance Monitor** — second agent, event-driven, proves event pattern
9. **Agent A1: Skill Scout** — first LLM agent, proves the LLM integration

Each agent is a single file under `server/api/agents/handlers/` following the pattern:

```typescript
// server/api/agents/handlers/skill-scout.ts
export async function runSkillScout(runContext: AgentRunContext): Promise<AgentRunResult> {
  // 1. Gather context (read DB)
  // 2. Build prompt
  // 3. Call agentChat()
  // 4. Parse response
  // 5. Create proposals
  // 6. Return summary
}
```

---

## Notes

- **Phases 1 and 2 can run in parallel** since they're independent.
- **Every agent starts paused** — enable one at a time, monitor, tune, then enable the next.
- **Human-in-the-loop first** — start with all proposals requiring human approval, then gradually auto-approve low-risk ones as confidence builds.
- **The proposal table is the key abstraction** — it decouples agent logic from side effects, making everything auditable and reversible.
