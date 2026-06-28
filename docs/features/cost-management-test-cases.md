# Cost Management — Test Cases

Comprehensive test plan for the AgentShield Cost Management module covering backend services, API routes, middleware enforcement, and frontend UI.

> **Module under test**:
> - Backend Service: [`src/cost/service.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/cost/service.js)
> - API Routes: [`src/admin/routes.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/admin/routes.js)
> - Gateway Proxy: [`src/gateway/proxy.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/gateway/proxy.js)
> - Budget Middleware: [`src/gateway/middleware/index.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/gateway/middleware/index.js)
> - Frontend: [`src/pages/CostManagement.jsx`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield-dashboard/src/pages/CostManagement.jsx)
> - Migration: [`migrations/007_cost_enhancements.sql`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/migrations/007_cost_enhancements.sql)

---

## 1. Usage Recording (CostService.recordUsage)

### TC-1.1: Basic token usage recording

| Field | Value |
|-------|-------|
| **Precondition** | `cost_records` table exists, agent is registered |
| **Input** | `{ traceId: uuid, agentId: uuid, userId: uuid, inputTokens: 500, outputTokens: 200, costCents: 0, modelName: 'gpt-4o' }` |
| **Steps** | 1. Call `costService.recordUsage(input)` |
| **Expected** | Row inserted in `cost_records` with `total_tokens = 700`, `cost_cents` auto-estimated from gpt-4o pricing |
| **Priority** | P0 |

### TC-1.2: Usage recording with explicit cost_cents

| Field | Value |
|-------|-------|
| **Input** | `{ ..., costCents: 42, modelName: 'gpt-4o' }` |
| **Steps** | 1. Call `costService.recordUsage(input)` |
| **Expected** | `cost_cents = 42` (explicit value preserved, auto-estimate NOT applied) |
| **Priority** | P0 |

### TC-1.3: Usage recording with unknown model

| Field | Value |
|-------|-------|
| **Input** | `{ ..., costCents: 0, modelName: 'custom-model-xyz' }` |
| **Steps** | 1. Call `costService.recordUsage(input)` |
| **Expected** | `cost_cents = 0` (unknown model, no estimate) |
| **Priority** | P1 |

### TC-1.4: Usage recording with null fields

| Field | Value |
|-------|-------|
| **Input** | `{ traceId: uuid, agentId: null, workflowId: null, userId: null, inputTokens: 0, outputTokens: 0 }` |
| **Steps** | 1. Call `costService.recordUsage(input)` |
| **Expected** | Row inserted with `total_tokens = 0`, all nullable fields set to `NULL` |
| **Priority** | P1 |

### TC-1.5: Multi-scope budget counter update

| Field | Value |
|-------|-------|
| **Precondition** | Budgets exist for `user:u1`, `team:t1`, `department:eng`, and `global:global` |
| **Input** | `{ userId: 'u1', teamId: 't1', department: 'eng', inputTokens: 1000, outputTokens: 500 }` |
| **Steps** | 1. Call `recordUsage(input)` |
| **Expected** | All 4 budgets have `current_tokens` incremented by 1500 |
| **Priority** | P0 |

### TC-1.6: Agent-scoped budget counter update

| Field | Value |
|-------|-------|
| **Precondition** | Budget exists with `scope_type = 'agent'`, `scope_id = agent-uuid-123` |
| **Input** | `{ agentId: 'agent-uuid-123', inputTokens: 100, outputTokens: 50 }` |
| **Steps** | 1. Call `recordUsage(input)` |
| **Expected** | The agent-scoped budget's `current_tokens` is incremented by 150 |
| **Priority** | P1 |

---

## 2. Model Pricing & Cost Estimation

### TC-2.1: Cost estimation for known model (gpt-4o)

| Field | Value |
|-------|-------|
| **Input** | `estimateCost('gpt-4o', 1000000, 500000)` |
| **Expected** | Returns `(1000000 × 250/1000000) + (500000 × 1000/1000000) = 250 + 500 = 750` cents |
| **Priority** | P0 |

### TC-2.2: Cost estimation for Anthropic model

| Field | Value |
|-------|-------|
| **Input** | `estimateCost('claude-sonnet-4-20250514', 100000, 50000)` |
| **Expected** | Returns `(100000 × 300/1000000) + (50000 × 1500/1000000) = 30 + 75 = 105` cents |
| **Priority** | P1 |

### TC-2.3: Cost estimation for unknown model

| Field | Value |
|-------|-------|
| **Input** | `estimateCost('unknown-model-v2', 1000000, 500000)` |
| **Expected** | Returns `0` |
| **Priority** | P1 |

### TC-2.4: Cost estimation with null model

| Field | Value |
|-------|-------|
| **Input** | `estimateCost(null, 1000, 500)` |
| **Expected** | Returns `0` |
| **Priority** | P1 |

### TC-2.5: Partial model name matching

| Field | Value |
|-------|-------|
| **Input** | `estimateCost('gpt-4o-2024-11-20', 1000, 500)` |
| **Expected** | Matches `gpt-4o` pricing and returns a non-zero estimate |
| **Priority** | P2 |

### TC-2.6: Get model pricing table

| Field | Value |
|-------|-------|
| **Steps** | 1. Call `costService.getModelPricing()` |
| **Expected** | Returns array of objects with `{ model, inputPer1M, outputPer1M }`, includes all 20+ models |
| **Priority** | P1 |

---

## 3. Budget Enforcement (checkBudget)

### TC-3.1: Request within budget (allowed)

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `token_limit = 1000000`, `current_tokens = 500000`, `hard_limit = true` |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Returns `{ allowed: true, reason: 'Within budget' }` |
| **Priority** | P0 |

### TC-3.2: Hard limit token exceeded (blocked)

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `token_limit = 1000000`, `current_tokens = 1000001`, `hard_limit = true` |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Returns `{ allowed: false, reason: 'Token budget exceeded...' }` |
| **Priority** | P0 |

### TC-3.3: Hard limit cost exceeded (blocked)

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `cost_limit_cents = 50000`, `current_cost_cents = 50001`, `hard_limit = true` |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Returns `{ allowed: false, reason: 'Cost budget exceeded...' }` |
| **Priority** | P0 |

### TC-3.4: Soft limit exceeded (allowed with warning)

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `token_limit = 1000000`, `current_tokens = 1000001`, `hard_limit = false` |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Returns `{ allowed: true }`, logger.warn called |
| **Priority** | P0 |

### TC-3.5: Warn threshold reached

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `token_limit = 1000000`, `current_tokens = 810000`, `warn_threshold = 0.80` |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Returns `{ allowed: true }`, `logger.warn('Budget warning: ... at 81.0% token usage')` called |
| **Priority** | P1 |

### TC-3.6: No matching budgets

| Field | Value |
|-------|-------|
| **Precondition** | No budgets exist for the user's scopes |
| **Steps** | 1. Call `checkBudget('nonexistent-user')` |
| **Expected** | Returns `{ allowed: true, reason: 'Within budget' }` |
| **Priority** | P1 |

### TC-3.7: Multiple scopes — strictest wins

| Field | Value |
|-------|-------|
| **Precondition** | User budget: `current_tokens = 500000 / limit = 1000000` (OK). Team budget: `current_tokens = 5000000 / limit = 5000000` (exceeded, hard). |
| **Steps** | 1. Call `checkBudget(userId, teamId)` |
| **Expected** | Returns `{ allowed: false }` because team budget is exceeded |
| **Priority** | P0 |

### TC-3.8: Agent-scoped budget enforcement

| Field | Value |
|-------|-------|
| **Precondition** | Budget: `scope_type = 'agent'`, `scope_id = agent-uuid`, exceeded, hard limit |
| **Steps** | 1. Call `checkBudget(userId, teamId, deptId, 'agent-uuid')` |
| **Expected** | Returns `{ allowed: false }` with agent scope in the reason |
| **Priority** | P1 |

---

## 4. Period Management

### TC-4.1: Daily period expiration detection

| Field | Value |
|-------|-------|
| **Input** | Budget with `period = 'daily'`, `period_start = 25 hours ago` |
| **Expected** | `_isPeriodExpired()` returns `true` |
| **Priority** | P0 |

### TC-4.2: Monthly period NOT expired

| Field | Value |
|-------|-------|
| **Input** | Budget with `period = 'monthly'`, `period_start = 15 days ago` |
| **Expected** | `_isPeriodExpired()` returns `false` |
| **Priority** | P0 |

### TC-4.3: Period auto-reset with history archive

| Field | Value |
|-------|-------|
| **Precondition** | Budget with expired period, `current_tokens = 5000000`, `budget_history` table exists |
| **Steps** | 1. Call `checkBudget(userId)` (triggers `_archiveAndResetBudget`) |
| **Expected** | 1. `budget_history` row inserted with `final_tokens = 5000000` and `period_end = NOW()` <br> 2. Budget's `current_tokens` and `current_cost_cents` reset to 0 <br> 3. `period_start` advanced to `NOW()` |
| **Priority** | P0 |

### TC-4.4: Period reset when budget_history table missing

| Field | Value |
|-------|-------|
| **Precondition** | Budget with expired period, `budget_history` table does NOT exist |
| **Steps** | 1. Call `checkBudget(userId)` |
| **Expected** | Archive step logs a warning but does NOT throw. Budget counters still reset. |
| **Priority** | P1 |

### TC-4.5: Quarterly period boundary (90 days)

| Field | Value |
|-------|-------|
| **Input** | Budget with `period = 'quarterly'`, `period_start = 89 days ago` |
| **Expected** | `_isPeriodExpired()` returns `false` |
| **Priority** | P2 |

### TC-4.6: Quarterly period just expired

| Field | Value |
|-------|-------|
| **Input** | Budget with `period = 'quarterly'`, `period_start = 91 days ago` |
| **Expected** | `_isPeriodExpired()` returns `true` |
| **Priority** | P2 |

---

## 5. Budget CRUD

### TC-5.1: Create budget — happy path

| Field | Value |
|-------|-------|
| **Steps** | 1. `POST /budgets` with valid payload |
| **Expected** | 201 response with created budget. `period_start = NOW()`, `current_tokens = 0` |
| **Priority** | P0 |

### TC-5.2: Create budget — global scope auto-sets scope_id

| Field | Value |
|-------|-------|
| **Input** | `{ scopeType: 'global', scopeId: '' }` |
| **Expected** | `scope_id` is saved as `'global'` |
| **Priority** | P1 |

### TC-5.3: List budgets

| Field | Value |
|-------|-------|
| **Precondition** | 3 budgets exist |
| **Steps** | 1. `GET /budgets` |
| **Expected** | 200 response with array of 3 budgets, ordered by `created_at DESC` |
| **Priority** | P0 |

### TC-5.4: Update budget — change limits

| Field | Value |
|-------|-------|
| **Steps** | 1. `PUT /budgets/:id` with `{ tokenLimit: 20000000 }` |
| **Expected** | Budget's `token_limit` updated. `current_tokens` unchanged. `updated_at` refreshed. |
| **Priority** | P0 |

### TC-5.5: Update budget — deactivate

| Field | Value |
|-------|-------|
| **Steps** | 1. `PUT /budgets/:id` with `{ isActive: false }` |
| **Expected** | Budget's `is_active = false`. Budget no longer enforced during `checkBudget`. |
| **Priority** | P1 |

### TC-5.6: Delete budget — happy path

| Field | Value |
|-------|-------|
| **Steps** | 1. `DELETE /budgets/:id` |
| **Expected** | 200 response. Budget removed from DB. |
| **Priority** | P0 |

### TC-5.7: Delete budget — not found

| Field | Value |
|-------|-------|
| **Steps** | 1. `DELETE /budgets/nonexistent-uuid` |
| **Expected** | 404 response with `"Budget not found"` |
| **Priority** | P1 |

### TC-5.8: Budget CRUD — non-admin role blocked

| Field | Value |
|-------|-------|
| **Precondition** | Authenticated as `role = 'viewer'` |
| **Steps** | 1. `POST /budgets`, `PUT /budgets/:id`, `DELETE /budgets/:id` |
| **Expected** | All return 403 Forbidden |
| **Priority** | P0 |

---

## 6. Reporting & Analytics

### TC-6.1: Usage report — all agents

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/report` |
| **Expected** | Returns array grouped by agent_name with `request_count`, `total_tokens`, `total_cost_cents` |
| **Priority** | P0 |

### TC-6.2: Usage report — date range filter

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/report?from=2026-06-01&to=2026-06-15` |
| **Expected** | Only returns records within the date range |
| **Priority** | P1 |

### TC-6.3: Usage report — filter by agent

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/report?agentId=uuid` |
| **Expected** | Returns only records for the specified agent |
| **Priority** | P1 |

### TC-6.4: Cost stats

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/stats` |
| **Expected** | Returns `{ total_tokens, total_cost_cents, total_requests, tokens_last_24h, cost_last_24h }` |
| **Priority** | P0 |

### TC-6.5: Daily usage — 30 day default

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/daily` |
| **Expected** | Returns array of up to 30 objects with `{ date, total_tokens, input_tokens, output_tokens, cost_cents, request_count }` |
| **Priority** | P1 |

### TC-6.6: Daily usage — custom range

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/daily?days=7` |
| **Expected** | Returns only last 7 days of data |
| **Priority** | P2 |

### TC-6.7: Budget alerts query

| Field | Value |
|-------|-------|
| **Precondition** | Budget A at 85% tokens (above warn), Budget B at 50% (below warn) |
| **Steps** | 1. `GET /budgets/alerts` |
| **Expected** | Returns only Budget A. Budget B excluded. |
| **Priority** | P1 |

### TC-6.8: Budget history — per budget

| Field | Value |
|-------|-------|
| **Precondition** | Budget has 3 archived periods |
| **Steps** | 1. `GET /budgets/:id/history` |
| **Expected** | Returns 3 history entries ordered by `period_end DESC` |
| **Priority** | P1 |

### TC-6.9: Budget history — global list

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /budgets/history/all?limit=10` |
| **Expected** | Returns at most 10 entries across all budgets |
| **Priority** | P1 |

### TC-6.10: Model pricing endpoint

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /cost/model-pricing` |
| **Expected** | Returns array with 20+ model entries, each having `{ model, inputPer1M, outputPer1M }` |
| **Priority** | P1 |

---

## 7. Frontend UI Tests

### TC-7.1: Page load — all data loaded

| Field | Value |
|-------|-------|
| **Steps** | 1. Navigate to Cost Management page |
| **Expected** | Loading spinner shown, then stat cards, charts, and alerts render. No console errors. |
| **Priority** | P0 |

### TC-7.2: Tab navigation

| Field | Value |
|-------|-------|
| **Steps** | 1. Click each tab: Overview → Budgets → Model Pricing → Budget History |
| **Expected** | Correct content renders for each tab. Active tab is visually highlighted. |
| **Priority** | P0 |

### TC-7.3: Create budget modal — form submission

| Field | Value |
|-------|-------|
| **Steps** | 1. Click "Create Budget" → 2. Fill form → 3. Click "Create" |
| **Expected** | Modal closes. Budget list refreshes with new budget. |
| **Priority** | P0 |

### TC-7.4: Create budget — validation (empty name)

| Field | Value |
|-------|-------|
| **Steps** | 1. Open modal → 2. Leave name empty → 3. Observe "Create" button |
| **Expected** | "Create" button is disabled |
| **Priority** | P1 |

### TC-7.5: Create budget — global scope auto-disables scope ID

| Field | Value |
|-------|-------|
| **Steps** | 1. Open modal → 2. Select "Global" scope type |
| **Expected** | Scope ID input is disabled with placeholder "global" |
| **Priority** | P2 |

### TC-7.6: Create budget — agent/workflow scope options present

| Field | Value |
|-------|-------|
| **Steps** | 1. Open modal → 2. Open Scope Type dropdown |
| **Expected** | Options include: User, Team, Department, Agent, Workflow, Project, Global |
| **Priority** | P1 |

### TC-7.7: Edit budget modal — pre-filled values

| Field | Value |
|-------|-------|
| **Precondition** | Budget exists with `name = "Test"`, `token_limit = 5000000`, `hard_limit = true` |
| **Steps** | 1. Click edit icon on the budget card |
| **Expected** | Modal opens with pre-filled values matching the budget. Title says "Edit Budget". |
| **Priority** | P0 |

### TC-7.8: Edit budget — save changes

| Field | Value |
|-------|-------|
| **Steps** | 1. Open edit modal → 2. Change token limit → 3. Click "Save Changes" |
| **Expected** | Modal closes. Budget card updates with new limit. |
| **Priority** | P0 |

### TC-7.9: Delete budget — confirm dialog

| Field | Value |
|-------|-------|
| **Steps** | 1. Click delete icon → 2. Click "OK" on confirm dialog |
| **Expected** | Budget removed from the list. |
| **Priority** | P0 |

### TC-7.10: Delete budget — cancel dialog

| Field | Value |
|-------|-------|
| **Steps** | 1. Click delete icon → 2. Click "Cancel" |
| **Expected** | Budget remains in the list. No API call made. |
| **Priority** | P1 |

### TC-7.11: Budget card — progress bars

| Field | Value |
|-------|-------|
| **Precondition** | Budget at 75% token usage, 40% cost usage, `warn_threshold = 0.80` |
| **Expected** | Token bar is 75% filled (yellow/warning color). Cost bar is 40% (green). Warn marker line visible at 80%. |
| **Priority** | P1 |

### TC-7.12: Budget card — exceeded state

| Field | Value |
|-------|-------|
| **Precondition** | Budget at 110% token usage |
| **Expected** | Token bar is full (red). Progress text shows >100%. |
| **Priority** | P1 |

### TC-7.13: Alert banners — warning state

| Field | Value |
|-------|-------|
| **Precondition** | Budget at 85% (above 80% warn threshold) |
| **Expected** | Yellow alert banner at top: "Budget Name (scope) — Approaching limit: 85% tokens" |
| **Priority** | P1 |

### TC-7.14: Alert banners — exceeded state with hard limit

| Field | Value |
|-------|-------|
| **Precondition** | Budget at 105%, `hard_limit = true` |
| **Expected** | Red alert banner: "Budget exceeded! ... BLOCKING REQUESTS" |
| **Priority** | P0 |

### TC-7.15: Budget card alert highlight

| Field | Value |
|-------|-------|
| **Precondition** | Budget is in alerts list |
| **Expected** | Budget card has colored border (yellow or red) and warning icon |
| **Priority** | P2 |

### TC-7.16: Daily usage area chart

| Field | Value |
|-------|-------|
| **Precondition** | At least 2 days of usage data exists |
| **Expected** | Area chart renders with dual axes (tokens left, cost right), gradient fills, and legend |
| **Priority** | P1 |

### TC-7.17: Per-agent bar chart

| Field | Value |
|-------|-------|
| **Precondition** | Usage records exist for 3+ agents |
| **Expected** | Bar chart renders with color-coded bars, tooltip showing token counts and cost, legend below |
| **Priority** | P1 |

### TC-7.18: Cost forecasting table

| Field | Value |
|-------|-------|
| **Precondition** | Budget with non-zero usage exists |
| **Expected** | Table shows daily burn rate, days until exhausted, projected total, and "On Track"/"Will Exceed" badge |
| **Priority** | P1 |

### TC-7.19: Forecasting — "Will Exceed" badge

| Field | Value |
|-------|-------|
| **Precondition** | Budget at 80% usage with only 5 days elapsed in a 30-day period |
| **Expected** | Badge shows 🔴 "Will Exceed" |
| **Priority** | P1 |

### TC-7.20: Model Pricing table display

| Field | Value |
|-------|-------|
| **Steps** | 1. Click "Model Pricing" tab |
| **Expected** | Table shows all models with vendor badge, input/output cents per 1M, and dollar equivalents |
| **Priority** | P1 |

### TC-7.21: Budget History table display

| Field | Value |
|-------|-------|
| **Precondition** | At least 1 budget period archived |
| **Steps** | 1. Click "Budget History" tab |
| **Expected** | Table shows budget name, scope, period, dates, tokens used, cost, and utilization bar |
| **Priority** | P1 |

### TC-7.22: Budget History — empty state

| Field | Value |
|-------|-------|
| **Precondition** | No budget history entries |
| **Expected** | Empty state with message: "Budget period archives will appear here after a budget period resets" |
| **Priority** | P2 |

### TC-7.23: CSV export — cost report

| Field | Value |
|-------|-------|
| **Steps** | 1. Click "Export CSV" on Overview tab |
| **Expected** | Browser downloads `cost_report.csv` with headers: agent, requests, total_tokens, input_tokens, output_tokens, cost_dollars |
| **Priority** | P1 |

### TC-7.24: CSV export — model pricing

| Field | Value |
|-------|-------|
| **Steps** | 1. Go to Model Pricing tab → 2. Click "Export" |
| **Expected** | Browser downloads `model_pricing.csv` with all models |
| **Priority** | P2 |

### TC-7.25: CSV export — budget history

| Field | Value |
|-------|-------|
| **Steps** | 1. Go to Budget History tab → 2. Click "Export" |
| **Expected** | Browser downloads `budget_history.csv` with archived period data |
| **Priority** | P2 |

### TC-7.26: CSV export — empty data

| Field | Value |
|-------|-------|
| **Precondition** | No usage data |
| **Steps** | 1. Click "Export CSV" |
| **Expected** | No file downloaded. No error. |
| **Priority** | P2 |

### TC-7.27: Page load — graceful error handling

| Field | Value |
|-------|-------|
| **Precondition** | Backend API returns 500 on one endpoint |
| **Expected** | Page still loads with partial data. Failed sections show empty/default states. No crash. |
| **Priority** | P1 |

---

## 8. API Route Authorization Tests

### TC-8.1: Budget create — admin only

| Field | Value |
|-------|-------|
| **Steps** | 1. `POST /budgets` as admin |
| **Expected** | 201 Created |
| **Priority** | P0 |

### TC-8.2: Budget create — viewer blocked

| Field | Value |
|-------|-------|
| **Steps** | 1. `POST /budgets` as viewer |
| **Expected** | 403 Forbidden |
| **Priority** | P0 |

### TC-8.3: Budget update — admin only

| Field | Value |
|-------|-------|
| **Steps** | 1. `PUT /budgets/:id` as admin |
| **Expected** | 200 OK |
| **Priority** | P0 |

### TC-8.4: Budget delete — admin only

| Field | Value |
|-------|-------|
| **Steps** | 1. `DELETE /budgets/:id` as admin |
| **Expected** | 200 OK |
| **Priority** | P0 |

### TC-8.5: Read endpoints — any authenticated user

| Field | Value |
|-------|-------|
| **Steps** | 1. `GET /budgets`, `GET /cost/stats`, `GET /cost/report`, `GET /cost/daily`, `GET /budgets/alerts`, `GET /cost/model-pricing` as viewer |
| **Expected** | All return 200 OK |
| **Priority** | P1 |

### TC-8.6: All endpoints — unauthenticated blocked

| Field | Value |
|-------|-------|
| **Steps** | 1. Call any cost/budget endpoint without auth token |
| **Expected** | 401 Unauthorized |
| **Priority** | P0 |

---

## 9. Database Migration Tests

### TC-9.1: Migration 007 — budget_history table created

| Field | Value |
|-------|-------|
| **Steps** | 1. Run `007_cost_enhancements.sql` |
| **Expected** | `budget_history` table exists with correct columns and indexes |
| **Priority** | P0 |

### TC-9.2: Migration 007 — scope_type constraint updated

| Field | Value |
|-------|-------|
| **Steps** | 1. Run migration → 2. `INSERT INTO budgets (scope_type) VALUES ('agent')` |
| **Expected** | Insert succeeds (previously blocked by CHECK constraint) |
| **Priority** | P0 |

### TC-9.3: Migration 007 — cascade delete

| Field | Value |
|-------|-------|
| **Steps** | 1. Create budget → 2. Archive a period → 3. Delete the budget |
| **Expected** | `budget_history` rows for that budget are also deleted (ON DELETE CASCADE) |
| **Priority** | P1 |

### TC-9.4: Migration 007 — idempotent re-run

| Field | Value |
|-------|-------|
| **Steps** | 1. Run migration twice |
| **Expected** | No errors on second run (uses `IF NOT EXISTS` and `DROP CONSTRAINT IF EXISTS`) |
| **Priority** | P1 |

---

## 10. Gateway Integration Tests

### TC-10.1: Agent invocation — usage recorded

| Field | Value |
|-------|-------|
| **Steps** | 1. `POST /agent/invoke` with valid auth → agent returns usage object |
| **Expected** | `cost_records` row inserted with correct tokens, model, and estimated cost |
| **Priority** | P0 |

### TC-10.2: Agent invocation — budget exceeded blocks request

| Field | Value |
|-------|-------|
| **Precondition** | User's budget is exceeded, `hard_limit = true` |
| **Steps** | 1. `POST /agent/invoke` |
| **Expected** | 402 response with `BUDGET_EXCEEDED` error, request never reaches agent |
| **Priority** | P0 |

### TC-10.3: Workflow invocation — usage recorded per step

| Field | Value |
|-------|-------|
| **Steps** | 1. `POST /workflow/run` with multi-step workflow |
| **Expected** | One `cost_records` row per step, all include `workflowId`, user context passed correctly |
| **Priority** | P1 |

### TC-10.4: Agent invocation — no usage object

| Field | Value |
|-------|-------|
| **Steps** | 1. Agent returns response without `usage` field |
| **Expected** | No `cost_records` row inserted. No error. |
| **Priority** | P1 |

### TC-10.5: Agent invocation — cost tracking error non-fatal

| Field | Value |
|-------|-------|
| **Precondition** | `cost_records` table is temporarily unavailable |
| **Steps** | 1. `POST /agent/invoke` |
| **Expected** | Agent response returned successfully. Error logged but not returned to client. |
| **Priority** | P1 |

---

## Test Summary

| Category | P0 | P1 | P2 | Total |
|----------|----|----|----|----|
| 1. Usage Recording | 2 | 2 | 0 | 4 |
| 2. Model Pricing | 1 | 3 | 1 | 5 |
| 3. Budget Enforcement | 4 | 2 | 0 | 6 |
| 4. Period Management | 2 | 1 | 2 | 5 |
| 5. Budget CRUD | 4 | 3 | 0 | 7 |
| 6. Reporting & Analytics | 2 | 6 | 1 | 9 |
| 7. Frontend UI | 5 | 14 | 5 | 24 |
| 8. API Authorization | 4 | 1 | 0 | 5 |
| 9. DB Migration | 1 | 2 | 0 | 3 |
| 10. Gateway Integration | 2 | 3 | 0 | 5 |
| **Total** | **27** | **37** | **9** | **73** |
