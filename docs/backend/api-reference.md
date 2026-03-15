# AgentShield API Reference

> **Base URL**: `http://localhost:3000/api/v1`

All endpoints (except Auth login/refresh and Health) require a `Bearer` token in the `Authorization` header.

---

## Authentication

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/auth/login` | — | — | Login with email/password, returns JWT + refresh token |
| `POST` | `/auth/refresh` | — | — | Exchange refresh token for new JWT |
| `GET` | `/auth/me` | ✅ | Any | Get current user profile |
| `POST` | `/auth/users` | ✅ | Admin | Create a new user |
| `GET` | `/auth/users` | ✅ | Admin | List all users |

### `POST /auth/login`

**Request Body:**
```json
{
  "email": "admin@agentshield.local",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "eyJhb...",
    "user": { "id": "uuid", "email": "...", "name": "...", "role": "admin" }
  }
}
```

---

## Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard` | ✅ | Aggregated stats (agents, audit, compliance, cost) |

Returns parallel-fetched stats from all subsystems for the dashboard overview cards.

---

## Agent Registry

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/agents` | ✅ | Any | List agents with filters |
| `GET` | `/agents/stats` | ✅ | Any | Agent statistics for dashboard |
| `GET` | `/agents/:idOrSlug` | ✅ | Any | Get single agent by UUID or slug |
| `POST` | `/agents` | ✅ | Any | Register a new agent |
| `POST` | `/agents/import` | ✅ | Any | Import from A2A Agent Card URL |
| `PUT` | `/agents/:idOrSlug` | ✅ | Any | Update agent fields |
| `DELETE` | `/agents/:idOrSlug` | ✅ | Any | Soft-delete (deactivate) an agent |
| `POST` | `/seed-agents` | ✅ | Any | Seed 6 sample agents |

### List Agents — Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `type` | `external` \| `internal` | Filter by agent type |
| `protocol` | `a2a` \| `mcp` \| `rest` \| `grpc` | Filter by protocol |
| `vendor` | string | Filter by vendor name |
| `is_active` | `true` \| `false` | Filter by active status |
| `health_status` | string | Filter by health status |
| `search` | string | Search name/slug (ILIKE) |
| `sort_by` | string | Sort field |
| `sort_order` | `asc` \| `desc` | Sort direction |
| `limit` | number | Page size |
| `offset` | number | Pagination offset |

### Register Agent — Request Body

```json
{
  "name": "My Agent",
  "slug": "my-agent",
  "type": "external",
  "vendor": "OpenAI",
  "protocol": "rest",
  "endpointUrl": "https://api.openai.com/v1/chat/completions",
  "authConfig": { "type": "bearer", "token": "sk-..." },
  "capabilities": {},
  "healthCheckUrl": "https://api.openai.com/v1/models",
  "version": "1.0"
}
```

---

## Gateway (Agent Invocation)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/gateway/agents/:agentSlug/invoke` | ✅ | Invoke agent through the firewall |
| `POST` | `/gateway/workflows/:workflowSlug/run` | ✅ | Execute a multi-step workflow |
| `GET` | `/gateway/agents/:agentSlug/status` | ✅ | Check agent health/active status |

### Agent Invocation Response

```json
{
  "success": true,
  "data": { "...agent response..." },
  "meta": {
    "traceId": "uuid",
    "agentSlug": "gpt4-analyst",
    "latencyMs": 1234,
    "usage": { "input_tokens": 100, "output_tokens": 200, "cost_cents": 5 }
  }
}
```

### Workflow Execution Response

```json
{
  "success": true,
  "data": { "...final output..." },
  "meta": {
    "traceId": "uuid",
    "workflowSlug": "my-workflow",
    "totalLatencyMs": 5678,
    "steps": [
      { "agentSlug": "agent-a", "latencyMs": 1000, "skipped": false },
      { "agentSlug": "agent-b", "latencyMs": 2000, "skipped": false }
    ]
  }
}
```

---

## Policies

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/policies` | ✅ | Any | List policies (filterable by `policyType`, `isActive`) |
| `GET` | `/policies/:id` | ✅ | Any | Get policy by UUID |
| `POST` | `/policies` | ✅ | Editor | Create a new policy |
| `PUT` | `/policies/:id` | ✅ | Editor | Update policy fields |
| `DELETE` | `/policies/:id` | ✅ | Admin | Delete a policy |

### Create Policy — Request Body

```json
{
  "name": "Allow Analysts to GPT-4",
  "description": "Grants analysts access to the GPT-4 agent",
  "policyType": "access_control",
  "priority": 100,
  "rulesJson": {
    "effect": "allow",
    "subjects": [{ "field": "role", "op": "eq", "value": "analyst" }],
    "resources": [{ "field": "slug", "op": "eq", "value": "gpt4-analyst" }],
    "conditions": []
  }
}
```

---

## Workflows

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/workflows` | ✅ | Any | List workflows with agent details |
| `GET` | `/workflows/:idOrSlug` | ✅ | Any | Get workflow by UUID or slug |
| `POST` | `/workflows` | ✅ | Editor | Create a new workflow |
| `PUT` | `/workflows/:idOrSlug` | ✅ | Editor | Update workflow fields |
| `PATCH` | `/workflows/:idOrSlug/toggle` | ✅ | Editor | Toggle enabled/disabled |
| `DELETE` | `/workflows/:idOrSlug` | ✅ | Admin | Delete a workflow |
| `POST` | `/workflows/:idOrSlug/steps` | ✅ | Editor | Add an agent step |
| `DELETE` | `/workflows/:idOrSlug/steps/:agentId` | ✅ | Editor | Remove an agent step |

---

## Compliance

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/compliance/configs` | ✅ | Any | List compliance configurations |
| `POST` | `/compliance/configs` | ✅ | Admin | Create a compliance config |
| `GET` | `/compliance/samples` | ✅ | Any | List compliance samples (filterable) |
| `GET` | `/compliance/stats` | ✅ | Any | Compliance statistics |
| `POST` | `/compliance/configs/:id/run` | ✅ | Editor | Run a compliance check |
| `POST` | `/compliance/configs/:id/upload-samples` | ✅ | Editor | Upload samples + run check |
| `GET` | `/compliance/configs/:id/checks` | ✅ | Any | Check history for a config |
| `GET` | `/compliance/checks/history` | ✅ | Any | Global check history |
| `GET` | `/compliance/rules/:framework` | ✅ | Any | List rules for a framework |
| `PUT` | `/compliance/rules` | ✅ | Admin | Create/update a compliance rule |
| `PATCH` | `/compliance/rules/:id/toggle` | ✅ | Editor | Toggle rule enabled/disabled |
| `DELETE` | `/compliance/rules/:id` | ✅ | Admin | Delete a custom rule |
| `POST` | `/compliance/rules/upload` | ✅ | Any | Upload CSV/XLSX of rules |

---

## Budgets & Cost

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/budgets` | ✅ | Any | List all budgets |
| `POST` | `/budgets` | ✅ | Admin | Create a budget |
| `PUT` | `/budgets/:id` | ✅ | Admin | Update a budget |
| `GET` | `/cost/report` | ✅ | Any | Usage report (filterable by date, agent) |
| `GET` | `/cost/stats` | ✅ | Any | Aggregated cost statistics |

---

## Audit Log

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/audit` | ✅ | Query audit logs (see filters below) |
| `GET` | `/audit/filters` | ✅ | Get distinct filter options (event types, resource types) |
| `GET` | `/audit/stats` | ✅ | Audit statistics (default: last 24 hours) |

### Audit Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search across action, trace_id, details |
| `traceId` | UUID | Exact trace ID match |
| `actorId` | UUID | Filter by actor |
| `eventType` | string | Filter by event type |
| `action` | string | Filter by action |
| `outcome` | `allowed` \| `denied` \| `error` | Filter by outcome |
| `resourceType` | string | Filter by resource type |
| `from` | ISO date | Start date |
| `to` | ISO date | End date |
| `limit` | number | Page size (max 500) |
| `offset` | number | Pagination offset |

---

## Playground

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/playground/simulate` | ✅ | Simulate policy evaluation against a context |
| `POST` | `/playground/test-invoke` | ✅ | Full test: status → policy → invoke agent |

### Simulate — Request Body

```json
{
  "userId": "playground-user",
  "userRole": "analyst",
  "userEmail": "analyst@company.com",
  "department": "finance",
  "agentSlug": "gpt4-analyst",
  "workflowSlug": null,
  "customContext": {}
}
```

### Test Invoke — Request Body

```json
{
  "agentSlug": "gpt4-analyst",
  "input": { "prompt": "What is the quarterly revenue?" },
  "userRole": "analyst",
  "userEmail": "analyst@company.com",
  "department": "finance"
}
```

---

## Settings

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `GET` | `/settings/:category` | ✅ | Any | Get settings by category (`llm`, `general`, etc.) |
| `PUT` | `/settings` | ✅ | Admin | Create/update a setting |
| `DELETE` | `/settings/:id` | ✅ | Admin | Delete a setting |

---

## Evaluations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/evaluations/suites` | ✅ | List evaluation suites |
| `GET` | `/evaluations/suites/:id` | ✅ | Get suite with scenarios |
| `POST` | `/evaluations/suites` | ✅ | Create an evaluation suite |
| `PUT` | `/evaluations/suites/:id` | ✅ | Update a suite |
| `DELETE` | `/evaluations/suites/:id` | ✅ | Delete a suite |
| `POST` | `/evaluations/suites/:id/run` | ✅ | Run evaluation (optional `judgeModel`) |
| `GET` | `/evaluations/suites/:id/runs` | ✅ | Get run history for a suite |
| `GET` | `/evaluations/runs/:id` | ✅ | Get detailed run results |
| `GET` | `/evaluations/reviews` | ✅ | List pending HITL reviews |
| `PUT` | `/evaluations/reviews/:id` | ✅ | Submit a review decision |
| `GET` | `/evaluations/stats` | ✅ | Evaluation statistics |
| `GET` | `/evaluations/personas` | ✅ | List available persona templates |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Database + service health check |
| `GET` | `/ready` | — | Readiness probe |

---

## Role Hierarchy

Endpoints with role requirements use a hierarchical model:

| Role | Level | Inherits |
|------|-------|----------|
| `super_admin` | 4 | All permissions |
| `admin` | 3 | Editor + viewer |
| `editor` | 2 | Viewer |
| `viewer` | 1 | Read-only |

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "traceId": "uuid"
}
```

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | No token provided |
| `TOKEN_EXPIRED` | 401 | JWT has expired |
| `INVALID_TOKEN` | 401 | JWT signature invalid |
| `POLICY_DENIED` | 403 | Access control policy blocked request |
| `BUDGET_EXCEEDED` | 402 | Token/cost budget exhausted |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
