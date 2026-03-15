# AgentShield — Previous Session Q&A Summary

All questions and answers from the **"Fixing Playground Policy Evaluation"** session ([conversation 80be7464](file:///Users/krishnakollepara/.gemini/antigravity/brain/80be7464-b9fb-4868-9fab-21073a288202/)).

---

## Q1: What products exist for AI agent governance and orchestration?

**Your question:** You wanted to understand the market — what tools exist for consuming, orchestrating, exposing, and governing AI agents.

**Answer provided:** A comprehensive market analysis covering 5 categories:

| Category | Key Products |
|---|---|
| **Agent Gateways** | agentgateway.dev (OSS), Portkey AI, Google Apigee, Kong AI Gateway |
| **Observability** | LangSmith, Arize AI, Langfuse (OSS), Maxim AI |
| **Guardrails & Security** | Lasso Security, Patronus AI, Google Model Armor, NVIDIA NeMo Guardrails |
| **Multi-Agent Orchestration** | Google ADK, LangGraph, CrewAI, Microsoft AutoGen |
| **API Governance** | MuleSoft Anypoint, Sensedia, DigitalAPI |

**Key insight:** ~60-70% of what you need exists as products; the remaining 30-40% (agent registry, compliance audit trails, cross-agent auth) requires custom development.

📄 [Full analysis](file:///Users/krishnakollepara/.gemini/antigravity/brain/80be7464-b9fb-4868-9fab-21073a288202/agent_governance_analysis.md)

---

## Q2: Is building an "Agent Governance Firewall" feasible?

**Your question:** You proposed a product that acts as a transparent proxy in front of agents — enforcing auth, compliance, cost controls, and guardrails via an admin dashboard. You wanted a feasibility assessment.

**Answer provided:** A detailed feature-by-feature feasibility analysis:

| Feature | Feasibility | Market Gap |
|---|---|---|
| Agent Registry | 🟢 High | 🔴 Large gap — **key differentiator** |
| Compliance Sampling (SOX/HIPAA) | 🟡 Medium | 🔴 Large gap — **massive differentiator** |
| Cross-Agent Auth Policies | 🟢 High | 🟡 Medium gap |
| Workflow Restrictions | 🟢 High | 🟡 Medium gap |
| Cost/Token Allocation | 🟢 High | 🟡 Medium gap |
| Enable/Disable Workflows | 🟢 High | 🟢 Small gap |

**Verdict:** Highly feasible. MVP estimated at ~5-6 months with a team of 5-6 engineers. The product was named **AgentShield**.

📄 [Full feasibility analysis](file:///Users/krishnakollepara/.gemini/antigravity/brain/80be7464-b9fb-4868-9fab-21073a288202/product_feasibility_analysis.md)

---

## Q3: Build the full AgentShield MVP — architecture, schema, and implementation plan

**Your question:** You approved the concept and asked to build it.

**Answer provided:** A 672-line implementation plan covering:
- **System architecture** — Gateway → Middleware Chain → Admin Dashboard → Core Services → Data Layer
- **Tech stack** — Go gateway, React dashboard, OPA policy engine, PostgreSQL, Redis
- **Full database schema** — 8 tables: `agents`, `workflows`, `workflow_agents`, `policies`, `budgets`, `compliance_configs`, `compliance_samples`, `audit_log`
- **Module-by-module implementation details** for Registry, Compliance, Policy Engine, Gateway Proxy, and Cost Management
- **4-phase development plan** spanning 22 weeks
- **Verification plan** — unit tests, integration tests, load testing targets

📄 [Full implementation plan](file:///Users/krishnakollepara/.gemini/antigravity/brain/80be7464-b9fb-4868-9fab-21073a288202/implementation_plan.md)

---

## Q4: How does policy validation work?

**Your question:** You wanted to understand how the policy engine evaluates access decisions.

**Answer provided:**

1. **Default Deny** — No access unless an explicit `allow` policy matches
2. **Context object** built from 4 entities: User (role, email, dept), Agent (slug, protocol), Workflow (slug, agents), Request (method, path)
3. **Evaluation flow:**
   - Fetch all active policies
   - Iterate by **priority** (descending)
   - Match `rules_json` subjects (who) and resources (what) against context
   - First match wins — `allow` grants access, `deny` blocks
   - No match → **default deny**
4. **Condition matching** uses operators: `eq`, `in`, `contains` against nested context fields
5. **Playground simulation** runs the exact same `policyService.evaluate(context)` as the live gateway

📄 [Policy engine docs](file:///Users/krishnakollepara/.gemini/antigravity/knowledge/agentshield_system_architecture/artifacts/features/policy_and_simulation.md)

---

## Q5: The playground always shows "Access Denied" — fix it

**Your question:** All simulations in the Playground resulted in "Access Denied" regardless of the policy configuration.

**Answer provided:** Debugged and fixed the issue. The work included:
- **Seed sample agents** — Created `POST /api/v1/seed-agents` endpoint with 6 pre-configured agents
- **Built the Playground page** — Full simulation UI with agent/workflow targeting, user context config, decision banner, and evaluation trace
- **Enhanced workflows** — Agent step management with numbered pipeline visualization
- **Created and tested policies** — "Allow Engineers to Research" policy, verified both ALLOWED and DENIED scenarios

📄 [Walkthrough with screenshots](file:///Users/krishnakollepara/.gemini/antigravity/brain/80be7464-b9fb-4868-9fab-21073a288202/walkthrough.md)

---

## Q6: How to test allowed vs. denied scenarios in the Playground?

**Your question:** You wanted clear steps for testing both cases.

**Answer provided:** Step-by-step guide:

### Allowed scenario:
1. Create an **Allow** policy (e.g., role=`analyst`, agent=`gpt4-analyst`)
2. Go to Playground → select the agent → set role=`Analyst` → Run → ✅ ACCESS ALLOWED

### Denied scenario:
1. Same setup, change role to `Viewer` → Run → 🚫 ACCESS DENIED ("No matching policy — default deny")

📄 [User guide](file:///Users/krishnakollepara/.gemini/antigravity/knowledge/agentshield_system_architecture/artifacts/features/user_guides.md)

---

## Q7: How is an agent actually called and how are policies validated during invocation?

**Your question:** You wanted to understand the end-to-end flow of how a request reaches an agent and where policy validation happens.

**Answer provided:** Two integration patterns were explained:

### Pattern 1: Reverse Proxy (Recommended)
AgentShield acts as the gateway — all traffic flows through it:

1. **Client sends request** → `POST /api/v1/gateway/agents/{slug}/invoke`
2. **Identity extraction** — Gateway extracts user identity from JWT headers or API key
3. **Registry lookup** — Gateway retrieves agent metadata (upstream URL, protocol) from the Registry
4. **Policy evaluation** — Policy Engine evaluates the request context against all active policies
5. **Enforcement:**
   - ✅ **Allowed** → Gateway proxies the request to the upstream agent (OpenAI, Claude, etc.)
   - 🚫 **Denied** → Gateway returns `403 Forbidden` + writes an Audit Log entry
6. **Response** returned to the client

### Pattern 2: Sidecar / Policy Check API
Your existing app calls AgentShield just for authorization:

1. App sends a **policy check** request to AgentShield → `POST /api/v1/policy/check`
2. AgentShield evaluates and returns `allowed/denied` with reason
3. If allowed, your app calls the agent directly

| Feature | Reverse Proxy | Sidecar API |
|---|---|---|
| Control Point | Gateway | Calling App |
| Real-Time Guardrails | Full Support | Manual |
| Visibility | High (all traffic) | Partial |

📄 [Integration patterns](file:///Users/krishnakollepara/.gemini/antigravity/knowledge/agentshield_system_architecture/artifacts/architecture/integration_patterns.md)

---

## Q8: How does identity and context flow into the policy engine?

**Your question:** You asked how user identity is passed to the policy engine during agent calls.

**Answer provided:** Three identity patterns:

1. **JWT Token** — Web apps pass JWT in `Authorization` header. Gateway decodes claims (`sub`, `role`, `dept`) and maps them to `context.user.*`
2. **API Key + Lookup** — Automated services send `X-API-Key`, Gateway looks up the associated identity
3. **A2A (Agent-to-Agent)** — In multi-agent workflows, the original user's identity is propagated through the chain. Policies can require "Agent B only if called by Agent A on behalf of a user in the research department"

The policy engine also receives **request-level metadata**: `method`, `path`, `timestamp`, and `customContext` (arbitrary JSON for complex rules).

📄 [Identity & context docs](file:///Users/krishnakollepara/.gemini/antigravity/knowledge/agentshield_system_architecture/artifacts/features/identity_and_context.md)

---

## Q9: What happens when no policy is attached, or a policy is active vs. inactive?

**Your question:** You asked how the `is_active` flag affects policy evaluation, and what happens in three scenarios: no policy, inactive policy, and active policy.

**Answer provided:** The policy engine (`PolicyService.evaluate()`) only queries policies with `is_active = true`. Here's the behavior for each scenario:

| Scenario | Result | Reason |
|---|---|---|
| **No policies exist** | ✅ **Allow** | "No policies defined — default allow" |
| **All policies inactive** (`is_active = false`) | ✅ **Allow** | Inactive policies are invisible; same as having none |
| **Active policies exist, none match the request** | ❌ **Deny** | "No matching policy — default deny" |
| **Active policy matches, effect = `allow`** | ✅ **Allow** | First matching policy wins |
| **Active policy matches, effect = `deny`** | ❌ **Deny** | First matching policy wins |

**Key insight:** Creating your first active policy flips the system from "allow all" to "deny by default unless explicitly allowed." Policies are evaluated in **priority order** (lowest number = highest priority), and the **first match wins**.

**Evaluation flow:**
1. Fetch all policies where `is_active = true`
2. If none found → allow (open system)
3. Iterate by priority → evaluate subject conditions (who) and resource conditions (what)
4. First match determines outcome based on its `effect` (allow/deny)
5. No match → default deny

📄 [Policy engine source](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/policy/service.js)
