# Entity Lifecycle Management

## Agent Lifecycle

### Registration
1. **Manual Registration**: Admin fills out agent details (name, slug, type, vendor, protocol, endpoint URL) via the dashboard.
2. **Agent Card Import**: Auto-import from `.well-known/agent.json` (A2A protocol).
3. **MCP Descriptor Import**: Import MCP server capabilities from a URL.
4. **Seed Sample Agents**: Bulk-create 6 pre-configured agents via `POST /api/v1/seed-agents`.

### Health Monitoring
- Background health checker runs every 30 seconds (configurable).
- Pings `health_check_url` or `endpoint_url` for each active agent.
- Updates `health_status`: `healthy` | `degraded` | `unhealthy` | `unknown`.
- After 3 consecutive unhealthy checks → auto-disable + alert.

### Sample Agents

| Agent | Protocol | Type | Vendor |
|---|---|---|---|
| GPT-4 Analyst | REST | External | OpenAI |
| Claude Researcher | REST | External | Anthropic |
| Code Review Agent | MCP | Internal | — |
| Financial Reconciliation | A2A | Internal | — |
| Data Pipeline Agent | gRPC | External | Databricks |
| Support Triage Bot | REST | Internal | — |

---

## Workflow Lifecycle

### Creation
1. Define workflow name, slug, description.
2. Add agent steps via "Add Agent Step" modal — select agents from the registry.
3. Steps are numbered and displayed as a pipeline: `①Agent A → ②Agent B → ③Agent C`.
4. Configure per-step options: step order, optional flag, data flow rules.

### Management
- **Enable/Disable Toggle**: Graceful shutdown (complete in-flight, reject new).
- **Execution Limits**: `max_concurrent`, `daily_limit`.
- **Approval Gates**: `requires_approval` flag for human-in-the-loop.

---

## Policy Lifecycle

### Creation
1. Define policy name, description, and effect (`allow` or `deny`).
2. Add **Subject Conditions** (Who): field, operator, value (e.g., `role = analyst`).
3. Add **Resource Conditions** (What): field, operator, value (e.g., `slug = gpt4-analyst`).
4. Set **Priority** (higher priority policies are evaluated first).
5. Visual rules are stored as `rules_json` and compiled to Rego for OPA.

### Testing
- Use the **Policy Playground** to simulate evaluations before deploying to production.
- Playground uses the same `policyService.evaluate(context)` as the live gateway.
