# Identity Flow & User Context

AgentShield relies on the calling application to provide the identity and context necessary for policy evaluation. This information is mapped to the `user` and `request` objects in the Policy Engine.

## Common Identity Patterns

### 1. JWT Token Integration
For web applications, the most common pattern is passing a JWT (JSON Web Token) in the `Authorization` header. AgentShield's authentication middleware decodes the token to populate the context:

- **Example Token Claims**: `{ "sub": "123", "role": "analyst", "dept": "finance" }`
- **Mapping**:
  - `context.user.id` ← `123`
  - `context.user.role` ← `analyst`
  - `context.user.department` ← `finance`

### 2. API Key + Metadata Lookup
For automated services or inter-service communication, an API Key can be used. AgentShield maintains a mapping of API keys to service identities:

- **Example Flow**:
  1. Service sends `X-API-Key: sk-abc123`.
  2. Gateway looks up identity associated with `sk-abc123`.
  3. Context populated with `service-a` identity and `developer` role.

### 3. Agent-to-Agent (A2A) Context
In multi-agent workflows, the identity context of the original user is propagated throughout the pipeline:

- **Provenance Tracking**: Each subsequent step in a workflow carries the original `user` context plus the identity of the `calling_agent`.
- **Nested Visibility**: Policies can be defined to allow `Agent B` to be invoked only if the request originated from `Agent A` on behalf of a user in the `research` department.

---

## The Request Context

Beyond user identity, the policy engine receives request-level metadata that can be used in `conditions`:

| Field | Description |
|---|---|
| **`method`** | The HTTP method being attempted (e.g., `POST`, `GET`). |
| **`path`** | The specific endpoint or action path. |
| **`timestamp`** | The ISO-8601 timestamp of the request (used for time-based policies). |
| **`customContext`** | Arbitrary JSON data provided by the calling application for complex rule logic. |

---

## Playground Simulation
In the **Policy Playground**, all of these real-world inputs are simulated using dropdowns and text fields. When a customer uses the Playground, they are effectively mocking the JWT claims or API key metadata that would arrive in a real scenario.
