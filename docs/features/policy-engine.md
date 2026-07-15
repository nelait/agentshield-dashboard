# Policy Engine & Simulation Playground

## Overview

AI Sure uses a **dual-mode policy evaluation engine** combining dashboard-configured JSON rules with OPA/Rego policy-as-code. The system follows a **"Default Deny"** posture — access is only granted if an active `allow` policy matches the incoming request context.

> **Source**: [`src/policies/service.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/policies/service.js)

---

## Policy Evaluation Modes

| Mode | Source | Evaluated By | Use Case |
|------|--------|-------------|----------|
| **Dashboard Mode** | PostgreSQL `policies` table | `PolicyService.evaluate()` | Teams using the visual UI |
| **Rego Mode** | `.rego` code (compiled to WASM) | `RegoEvaluator` (OPA WASM) | Policy-as-code workflows |
| **Hybrid** | Both | Merged (deny wins) | Default — both modes active |

---

## Context Object

The evaluation context includes four top-level entities:

1. **User**: `id`, `role`, `email`, `department`
2. **Agent**: `id`, `slug`, `protocol`, `vendor`
3. **Workflow**: `id`, `slug`, `agents[]`
4. **Request**: `method`, `path`, `timestamp`

---

## Dashboard Policy Mode (JSON Rules)

### Evaluation Flow
1. Fetch all active policies
2. Iterate through policies by **Priority** (descending)
3. Check `rules_json` against the `context` using a recursive attribute matcher
4. If a match is found:
   - Return the policy effect (`allow` or `deny`)
   - Short-circuit if `deny` is matched (standard security practice)

### Policy Rule Structure

```json
{
  "effect": "allow",
  "subjects": [{ "field": "role", "op": "eq", "value": "financial_analyst" }],
  "resources": [{ "type": "workflow", "slug": "quarterly_close" }],
  "conditions": [
    { "field": "mfa_verified", "op": "eq", "value": true },
    { "field": "time", "op": "between", "value": ["08:00", "18:00"] }
  ]
}
```

---

## OPA/Rego Mode (Policy-as-Code) — Phase 1

> **Added**: July 2026  
> **Source**: [`src/policies/rego-evaluator.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/policies/rego-evaluator.js)

### How It Works

Dashboard-configured policies are automatically compiled to OPA Rego and can be evaluated via the OPA WASM runtime. Policies can also be authored directly in Rego.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  AI Sure Policy Evaluation (Dual-Mode)           │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ Dashboard    │  │ OPA/Rego     │               │
│  │ JSON Rules   │  │ WASM Engine  │               │
│  └──────┬──────┘  └──────┬───────┘               │
│         │                │                        │
│         ▼                ▼                        │
│  ┌────────────────────────────┐                   │
│  │  Unified Policy Evaluator  │                   │
│  │  (merge results, deny wins)│                   │
│  └────────────┬───────────────┘                   │
│               ▼                                   │
│  Decision: allow / deny + reason                  │
└─────────────────────────────────────────────────┘
```

### Rego Compilation

Visual rules from the dashboard UI are compiled to Rego:

```rego
package agentshield.access

default allow = false

allow {
    input.user.role == "financial_analyst"
    input.workflow.slug == "quarterly_close"
    input.user.mfa_verified == true
    is_business_hours(input.timestamp)
}

allow {
    input.user.role == "admin"
}

is_business_hours(ts) {
    hour := time.clock(time.parse_rfc3339_ns(ts))[0]
    hour >= 8
    hour < 18
}
```

### Rego Export API

```
GET /api/v1/policies/:id/rego
```

Returns the compiled `.rego` file for any policy. Useful for:
- Git-based policy versioning
- Integration with external OPA instances
- Policy audit and review

### Key Features

| Feature | Description |
|---------|-------------|
| **WASM evaluation** | OPA policies compiled to WASM for in-process evaluation (no sidecar) |
| **Auto-compilation** | Dashboard policies auto-compile to Rego on save |
| **Backward compatible** | Existing JSON policies continue to work without modification |
| **Audit trail** | All decisions logged regardless of evaluation mode |
| **Dashboard editor** | Rego code editor with syntax highlighting in the Compliance → Rules tab |

---

## Enhanced Simulation Engine

The Playground uses the exact `policyService.evaluate(context)` logic as the live Gateway, ensuring parity between simulation and production enforcement.

### Per-Condition Detailed Trace
The simulation result provides a deep-dive evaluation trace:
- **Expected vs Actual**: Displays the criteria defined in the policy alongside the value found in the simulated context
- **Operator Analysis**: Shows the conditional operator (e.g., `eq`, `in`, `contains`) used for the match
- **Pass/Fail Status**: Each individual condition within a policy is flagged as either `PASS` or `FAIL`

### Debugging & UI Interaction
- **Expandable Rows**: Clicking a policy in the result table expands to show a detailed breakdown of Subject and Resource conditions
- **Visual Cues**: Color-coded badges and green/red highlights indicate exactly why a policy matched or failed to match

---

## Common Simulation Issues

### Access Denied by Default
The system uses a "Fail-Open to Deny" strategy. If no policy explicitly matches a context, the simulation will show **ACCESS DENIED**. To test this, ensure at least one policy exists with `effect: allow`.

### Exact Field Matching
The attribute matcher requires exact key matches in the context object:
- **`user.role`**: Matches the user's role (e.g., `analyst`)
- **`agent.slug`**: Matches the agent identifier (e.g., `gpt4-analyst`)
