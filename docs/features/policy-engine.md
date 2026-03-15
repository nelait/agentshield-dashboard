# Policy Engine & Simulation Playground

## Policy Evaluation Logic
AgentShield uses a **"Default Deny"** posture. Access is only granted if an active `allow` policy matches the incoming request context.

### Context Object
The evaluation context includes four top-level entities:
1. **User**: `id`, `role`, `email`, `department`.
2. **Agent**: `id`, `slug`, `protocol`, `vendor`.
3. **Workflow**: `id`, `slug`, `agents[]`.
4. **Request**: `method`, `path`, `timestamp`.

### Evaluation Flow
1. Fetch all active policies.
2. Iterate through policies by **Priority** (descending).
3. Check `rules_json` against the `context` using a recursive attribute matcher.
4. If a match is found:
   - Return the policy effect (`allow` or `deny`).
   - Short-circuit if `deny` is matched (standard security practice).

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

### OPA Rego Compilation

Visual rules from the UI are compiled to Rego for the OPA policy engine:

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

---

## Enhanced Simulation Engine
The Playground uses the exact `policyService.evaluate(context)` logic as the live Gateway, ensuring parity between simulation and production enforcement.

### Per-Condition Detailed Trace
The simulation result provides a deep-dive evaluation trace:
- **Expected vs Actual**: Displays the criteria defined in the policy alongside the value found in the simulated context.
- **Operator Analysis**: Shows the conditional operator (e.g., `eq`, `in`, `contains`) used for the match.
- **Pass/Fail Status**: Each individual condition within a policy is flagged as either `PASS` or `FAIL`.

### Debugging & UI Interaction
- **Expandable Rows**: Clicking a policy in the result table expands to show a detailed breakdown of Subject and Resource conditions.
- **Visual Cues**: Color-coded badges and green/red highlights indicate exactly why a policy matched or failed to match.

## Common Simulation Issues

### Access Denied by Default
The system uses a "Fail-Open to Deny" strategy. If no policy explicitly matches a context, the simulation will show **ACCESS DENIED**. To test this, ensure at least one policy exists with `effect: allow`.

### Exact Field Matching
The attribute matcher requires exact key matches in the context object:
- **`user.role`**: Matches the user's role (e.g., `analyst`).
- **`agent.slug`**: Matches the agent identifier (e.g., `gpt4-analyst`).
