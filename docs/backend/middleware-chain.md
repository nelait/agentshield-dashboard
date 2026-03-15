# Gateway Middleware Chain

AgentShield processes every inbound HTTP request through an ordered middleware pipeline before it reaches route handlers. This chain implements the core firewall logic.

> **Source**: [`src/gateway/middleware/index.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/gateway/middleware/index.js)

## Pipeline Order

```
Request → TraceId → Authenticate → AuditLogger → PolicyEnforcer → BudgetChecker → ComplianceSampler → Route Handler → Response
```

```mermaid
graph LR
  A["Incoming Request"] --> B["1. TraceId"]
  B --> C["2. Authenticate"]
  C --> D["3. AuditLogger"]
  D --> E["4. PolicyEnforcer"]
  E --> F["5. BudgetChecker"]
  F --> G["6. ComplianceSampler"]
  G --> H["Route Handler"]
  H --> I["ErrorHandler"]
```

> **Order matters.** Middleware 4–6 only activate on `/api/v1/gateway/*` paths (agent invocation), keeping admin API requests fast.

---

## 1. TraceId

**Purpose:** Assigns a UUID to every request for end-to-end tracing.

| Behavior | Detail |
|----------|--------|
| Reads `X-Trace-Id` header | Uses client-provided trace ID if present |
| Generates UUID v4 | Falls back to a new unique ID |
| Sets `req.traceId` | Available to all downstream middleware and handlers |
| Sets `req.startTime` | `Date.now()` for latency calculation |
| Response header | `X-Trace-Id` echoed back to the client |

---

## 2. Authenticate

**Purpose:** Validates JWT tokens and extracts user context.

| Behavior | Detail |
|----------|--------|
| **Public paths** (skip auth) | `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/health`, `/ready` |
| Extracts `Bearer` token | From `Authorization` header |
| Verifies with `jwt.verify()` | Using `JWT_SECRET` from config |
| Sets `req.user` | Decoded payload: `{ id, email, role, department }` |
| Error: missing token | `401` with code `AUTH_REQUIRED` |
| Error: expired token | `401` with code `TOKEN_EXPIRED` |
| Error: invalid signature | `401` with code `INVALID_TOKEN` |

---

## 3. AuditLogger

**Purpose:** Records an audit log entry for every completed request.

| Behavior | Detail |
|----------|--------|
| Non-blocking | Hooks into `res.on('finish')` event |
| Outcome mapping | `< 400` → `allowed`, `400-499` → `denied`, `500+` → `error` |
| Captures | traceId, user, resource type, HTTP method/path, status code, latency |
| Failure tolerance | Audit write errors are silently caught — never breaks request flow |

---

## 4. PolicyEnforcer

**Purpose:** Evaluates access control policies on gateway requests.

| Behavior | Detail |
|----------|--------|
| **Scope** | Only `/api/v1/gateway/*` paths |
| Context built | `{ user, agent, workflow, action, timestamp }` |
| Agent lookup | Resolves agent metadata from `RegistryService` |
| Evaluation | Calls `policyService.evaluate(context)` |
| **If denied** | Logs audit event → returns `403 POLICY_DENIED` |
| **If allowed** | Sets `req.policyResult` → continues |
| No policies | Default allow (no policies defined) |
| No match | Default deny (policies exist but none match) |

---

## 5. BudgetChecker

**Purpose:** Enforces token and cost budgets before proxying.

| Behavior | Detail |
|----------|--------|
| **Scope** | Only `/api/v1/gateway/*` paths |
| Checks | `costService.checkBudget(userId, teamId, departmentId)` |
| Evaluates | All matching budgets (user, team, department scopes) |
| Period reset | Auto-resets expired budget periods |
| **If exceeded** | Logs audit event → returns `402 BUDGET_EXCEEDED` |
| **If within limit** | Continues to next middleware |

---

## 6. ComplianceSampler

**Purpose:** Probabilistically samples request/response pairs for regulatory compliance.

| Behavior | Detail |
|----------|--------|
| **Scope** | Only `/api/v1/gateway/*` paths |
| Non-blocking | Wraps `res.json()` to capture response body asynchronously |
| Sample decision | `complianceService.shouldSample(agentId, workflowId)` |
| Storage | `complianceService.storeSample()` with SHA-256 hashing + AES-256-GCM encryption |
| PII detection | Automatically scans for SSN, email, credit card, phone, etc. |
| Failure tolerance | Sampling errors never block the response |

---

## Error Handler

**Purpose:** Catches unhandled errors and returns consistent error responses.

| Behavior | Detail |
|----------|--------|
| Operational errors | Returns the error's own message and status code |
| Non-operational errors | Returns generic `500 Internal server error` |
| Logging | Full stack trace logged with trace ID |
| Response format | `{ success: false, error, code, traceId }` |

---

## Middleware Activation Matrix

| Middleware | Admin API | Gateway API | Health Endpoints |
|-----------|-----------|-------------|------------------|
| TraceId | ✅ | ✅ | ✅ |
| Authenticate | ✅ | ✅ | ❌ (skipped) |
| AuditLogger | ✅ | ✅ | ✅ |
| PolicyEnforcer | ❌ | ✅ | ❌ |
| BudgetChecker | ❌ | ✅ | ❌ |
| ComplianceSampler | ❌ | ✅ | ❌ |
| ErrorHandler | ✅ | ✅ | ✅ |
