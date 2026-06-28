# Module Toggles — Test Cases

Comprehensive test plan for the AgentShield Module Toggle System covering backend cache, middleware bypass, API routes, and frontend UI.

> **Module under test**:
> - Settings Service: [`src/settings/service.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/settings/service.js)
> - Gateway Middleware: [`src/gateway/middleware/index.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/gateway/middleware/index.js)
> - Admin Routes: [`src/admin/routes.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/admin/routes.js)
> - Frontend: [`src/pages/Settings.jsx`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield-dashboard/src/pages/Settings.jsx), [`src/App.jsx`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield-dashboard/src/App.jsx)

---

## 1. Module Status Cache (SettingsService)

### TC-1.1: getModuleStatus returns true for unconfigured module

| Field | Value |
|-------|-------|
| **Precondition** | No rows in `settings` where `category = 'modules'` |
| **Steps** | 1. Call `settingsService.getModuleStatus('guardrails')` |
| **Expected** | Returns `true` (default: all modules enabled) |
| **Priority** | P0 |

### TC-1.2: getModuleStatus returns false for disabled module

| Field | Value |
|-------|-------|
| **Precondition** | Row exists: `{ category: 'modules', key: 'guardrails', value: { enabled: false } }` |
| **Steps** | 1. Call `settingsService.getModuleStatus('guardrails')` |
| **Expected** | Returns `false` |
| **Priority** | P0 |

### TC-1.3: getModuleStatus returns true for enabled module

| Field | Value |
|-------|-------|
| **Precondition** | Row exists: `{ category: 'modules', key: 'policies', value: { enabled: true } }` |
| **Steps** | 1. Call `settingsService.getModuleStatus('policies')` |
| **Expected** | Returns `true` |
| **Priority** | P0 |

### TC-1.4: Cache uses 30-second TTL

| Field | Value |
|-------|-------|
| **Precondition** | Cache is populated |
| **Steps** | 1. Call `getModuleStatus('guardrails')` → cache populated, `_moduleCacheExpiry` set. 2. Directly update DB row to `{ enabled: false }` (bypass service). 3. Immediately call `getModuleStatus('guardrails')` |
| **Expected** | Returns the stale cached value (cache TTL not expired yet) |
| **Priority** | P1 |

### TC-1.5: Cache invalidation clears cache

| Field | Value |
|-------|-------|
| **Precondition** | Cache is populated |
| **Steps** | 1. Call `settingsService.invalidateModuleCache()`. 2. Check `settingsService._moduleCache` |
| **Expected** | `_moduleCache === null`, `_moduleCacheExpiry === 0` |
| **Priority** | P0 |

### TC-1.6: Cache refreshes after invalidation

| Field | Value |
|-------|-------|
| **Precondition** | Cache was invalidated |
| **Steps** | 1. Call `invalidateModuleCache()`. 2. Call `getModuleStatus('guardrails')` |
| **Expected** | `_refreshModuleCache()` is triggered. Fresh data loaded from DB. |
| **Priority** | P0 |

### TC-1.7: Cache fail-open on DB error

| Field | Value |
|-------|-------|
| **Precondition** | Database connection is unavailable |
| **Steps** | 1. Disconnect DB. 2. Call `getModuleStatus('guardrails')` |
| **Expected** | Returns `true` (fail-open, defaults all modules to enabled). `_moduleCacheExpiry` set to 5 seconds (fast retry). |
| **Priority** | P0 |

### TC-1.8: getAllModuleStatuses returns full map

| Field | Value |
|-------|-------|
| **Precondition** | Rows exist for `guardrails` (disabled) and `policies` (enabled) |
| **Steps** | 1. Call `settingsService.getAllModuleStatuses()` |
| **Expected** | Returns `{ guardrails: { enabled: false }, policies: { enabled: true } }` |
| **Priority** | P1 |

### TC-1.9: Value parsing handles string JSON

| Field | Value |
|-------|-------|
| **Precondition** | DB row has `value` stored as string `'{"enabled":false}'` instead of JSONB object |
| **Steps** | 1. Call `getModuleStatus()` |
| **Expected** | `_refreshModuleCache()` parses the string value correctly. Returns `false`. |
| **Priority** | P1 |

---

## 2. Middleware Toggle Bypass

### TC-2.1: policyEnforcer skips when policies disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `policies` is disabled. Agent exists with active policies. |
| **Steps** | 1. Send `POST /api/v1/gateway/agents/:slug/invoke` with a user role that would normally be denied |
| **Expected** | Request passes through. No `403 POLICY_DENIED` response. Agent is invoked. |
| **Priority** | P0 |

### TC-2.2: budgetChecker skips when cost_management disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `cost_management` is disabled. User has exceeded their budget limit. |
| **Steps** | 1. Send `POST /api/v1/gateway/agents/:slug/invoke` |
| **Expected** | Request passes through. No `402 BUDGET_EXCEEDED` response. Agent is invoked. |
| **Priority** | P0 |

### TC-2.3: guardrailEnforcer skips when guardrails disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `guardrails` is disabled. Agent has a PII Shield guardrail profile. |
| **Steps** | 1. Send invoke request with body containing SSN: `"My SSN is 123-45-6789"` |
| **Expected** | Request passes through. No `422 GUARDRAIL_VIOLATION` response. Agent receives the PII. |
| **Priority** | P0 |

### TC-2.4: complianceSampler skips when compliance disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `compliance` is disabled. Agent has compliance sampling configured. |
| **Steps** | 1. Send invoke request. 2. Check `compliance_samples` table. |
| **Expected** | No new compliance sample created. Response is returned normally. |
| **Priority** | P0 |

### TC-2.5: Multiple modules disabled simultaneously

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails`, `compliance`, and `cost_management` all disabled. `policies` enabled. |
| **Steps** | 1. Send invoke request from a user with valid policy access |
| **Expected** | Policy check runs (enabled). Budget, guardrail, and compliance checks are all skipped. Agent is invoked. |
| **Priority** | P0 |

### TC-2.6: Middleware skips non-gateway paths

| Field | Value |
|-------|-------|
| **Precondition** | `policies` module is disabled |
| **Steps** | 1. Send `GET /api/v1/agents` (non-gateway admin route) |
| **Expected** | No module toggle check occurs (path doesn't start with `/api/v1/gateway/`). Route works normally. |
| **Priority** | P1 |

### TC-2.7: Middleware fail-open on cache error

| Field | Value |
|-------|-------|
| **Precondition** | `getModuleStatus()` throws an error (DB unavailable during refresh) |
| **Steps** | 1. Disconnect DB. 2. Send gateway invoke request. |
| **Expected** | The `.catch(() => next())` in each middleware allows the request to proceed. All middleware functions execute their core logic (fail-open = modules treated as enabled). |
| **Priority** | P0 |

### TC-2.8: Cost recording still works when cost_management disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `cost_management` is disabled. Agent returns usage data. |
| **Steps** | 1. Invoke an agent that returns `usage: { input_tokens: 100, output_tokens: 50 }`. 2. Check `cost_records` table. |
| **Expected** | Usage record is created in `cost_records` (recording is in `proxy.js`, not middleware). Budget enforcement was skipped but tracking continues. |
| **Priority** | P0 |

### TC-2.9: MCP agent invocation with guardrails disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `guardrails` is disabled. Agent protocol is `mcp`. |
| **Steps** | 1. Send invoke request to an MCP agent with PII in the prompt. |
| **Expected** | Guardrail check is skipped. MCP SSE connection, tool listing, and tool calling proceed normally. Response includes `data.tools` and `data.result`. |
| **Priority** | P1 |

---

## 3. API Routes

### TC-3.1: GET /settings/modules returns module settings

| Field | Value |
|-------|-------|
| **Precondition** | Module toggles exist for `guardrails` and `policies` |
| **Steps** | 1. `GET /settings/modules` with valid JWT |
| **Expected** | Response: `{ success: true, data: [{ key: 'guardrails', value: { enabled: false } }, { key: 'policies', value: { enabled: true } }] }` |
| **Priority** | P0 |

### TC-3.2: GET /settings/modules returns empty for fresh install

| Field | Value |
|-------|-------|
| **Precondition** | No `category='modules'` rows in settings |
| **Steps** | 1. `GET /settings/modules` |
| **Expected** | Response: `{ success: true, data: [] }` |
| **Priority** | P1 |

### TC-3.3: PUT /settings creates module toggle

| Field | Value |
|-------|-------|
| **Precondition** | No toggle for `guardrails` exists |
| **Steps** | 1. `PUT /settings` with `{ category: 'modules', key: 'guardrails', value: { enabled: false } }` |
| **Expected** | Row created. Response: `{ success: true, data: { id: uuid, category: 'modules', key: 'guardrails', value: { enabled: false } } }` |
| **Priority** | P0 |

### TC-3.4: PUT /settings updates existing toggle (upsert)

| Field | Value |
|-------|-------|
| **Precondition** | Toggle for `guardrails` exists with `{ enabled: false }` |
| **Steps** | 1. `PUT /settings` with `{ category: 'modules', key: 'guardrails', value: { enabled: true } }` |
| **Expected** | Existing row updated via `ON CONFLICT DO UPDATE`. `value` is now `{ enabled: true }`. `updated_at` is refreshed. |
| **Priority** | P0 |

### TC-3.5: PUT /settings invalidates module cache

| Field | Value |
|-------|-------|
| **Precondition** | Module cache is populated |
| **Steps** | 1. `PUT /settings` with `{ category: 'modules', key: 'guardrails', value: { enabled: false } }` |
| **Expected** | `settingsService.invalidateModuleCache()` is called. `_moduleCache` is `null`. |
| **Priority** | P0 |

### TC-3.6: PUT /settings does NOT invalidate cache for non-module settings

| Field | Value |
|-------|-------|
| **Precondition** | Module cache is populated |
| **Steps** | 1. `PUT /settings` with `{ category: 'llm', key: 'openai_123', value: { provider: 'openai' } }` |
| **Expected** | `invalidateModuleCache()` is NOT called. Module cache remains valid. |
| **Priority** | P1 |

### TC-3.7: PUT /settings requires admin role

| Field | Value |
|-------|-------|
| **Precondition** | User has `editor` role |
| **Steps** | 1. `PUT /settings` with module toggle payload |
| **Expected** | `403 Forbidden` response. No row created/updated. |
| **Priority** | P0 |

### TC-3.8: policy/check works when policies module is disabled

| Field | Value |
|-------|-------|
| **Precondition** | Module `policies` is disabled. Policies exist in the system. |
| **Steps** | 1. `POST /api/v1/gateway/policy/check` with `{ agentSlug: 'my-agent' }` |
| **Expected** | Policy evaluation runs normally and returns a decision. The `policy/check` endpoint calls `policyService.evaluate()` directly, not through the middleware. |
| **Priority** | P1 |

---

## 4. Frontend — Settings Modules Tab

### TC-4.1: Modules tab renders five module cards

| Field | Value |
|-------|-------|
| **Precondition** | User navigates to Settings → Modules tab |
| **Steps** | 1. Open Settings page. Modules tab is active by default. |
| **Expected** | Five cards rendered: Access Policies, Guardrails, Compliance, Cost Management, Evaluations. Each has icon, name, description, toggle switch. |
| **Priority** | P0 |

### TC-4.2: Toggle switch reflects current state

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails` is disabled in the DB |
| **Steps** | 1. Load Modules tab |
| **Expected** | Guardrails card: toggle is in OFF position (left), badge shows `○ Disabled`, opacity is 0.75 |
| **Priority** | P0 |

### TC-4.3: Toggle switch persists change

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails` is enabled |
| **Steps** | 1. Click the Guardrails toggle switch |
| **Expected** | `PUT /settings` is called with `{ category: 'modules', key: 'guardrails', value: { enabled: false } }`. Toggle animates to OFF. Badge changes to `○ Disabled`. |
| **Priority** | P0 |

### TC-4.4: Critical module shows confirmation dialog

| Field | Value |
|-------|-------|
| **Precondition** | `policies` is enabled (severity: critical) |
| **Steps** | 1. Click the Policies toggle switch |
| **Expected** | A `confirm()` dialog appears with warning text. Only proceeds if user confirms. |
| **Priority** | P0 |

### TC-4.5: Non-critical module does not show confirmation

| Field | Value |
|-------|-------|
| **Precondition** | `compliance` is enabled (severity: medium) |
| **Steps** | 1. Click the Compliance toggle switch |
| **Expected** | No confirmation dialog. Toggle proceeds immediately. |
| **Priority** | P1 |

### TC-4.6: Warning banner appears for disabled module with warning text

| Field | Value |
|-------|-------|
| **Precondition** | `policies` is disabled |
| **Steps** | 1. View Policies card |
| **Expected** | Red warning banner below description: _"⚠️ Disabling this means ALL gateway requests will be allowed without access checks."_ |
| **Priority** | P0 |

### TC-4.7: Warning banner hidden when module enabled

| Field | Value |
|-------|-------|
| **Precondition** | `policies` is enabled |
| **Steps** | 1. View Policies card |
| **Expected** | No warning banner visible (warning only shows when disabled). |
| **Priority** | P1 |

### TC-4.8: Summary footer shows disabled count

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails` and `compliance` are disabled |
| **Steps** | 1. View Modules tab |
| **Expected** | Yellow footer bar: _"⚠️ **2 modules** currently disabled."_ |
| **Priority** | P1 |

### TC-4.9: Summary footer hidden when all enabled

| Field | Value |
|-------|-------|
| **Precondition** | All modules are enabled |
| **Steps** | 1. View Modules tab |
| **Expected** | No summary footer visible. |
| **Priority** | P2 |

### TC-4.10: Pipeline badge shows correct type

| Field | Value |
|-------|-------|
| **Precondition** | All modules loaded |
| **Steps** | 1. Check badge text on each card |
| **Expected** | Policies, Guardrails, Compliance, Cost Management show blue `Gateway Pipeline`. Evaluations shows gray `On-Demand`. |
| **Priority** | P2 |

---

## 5. Frontend — Sidebar Visibility

### TC-5.1: Sidebar hides disabled module page

| Field | Value |
|-------|-------|
| **Precondition** | Module `guardrails` is disabled |
| **Steps** | 1. Load dashboard |
| **Expected** | "Guardrails" nav item is NOT visible in the sidebar under "Governance" section |
| **Priority** | P0 |

### TC-5.2: Sidebar shows enabled module page

| Field | Value |
|-------|-------|
| **Precondition** | Module `guardrails` is enabled |
| **Steps** | 1. Load dashboard |
| **Expected** | "Guardrails" nav item IS visible in the sidebar |
| **Priority** | P0 |

### TC-5.3: Entire nav section hidden when all items disabled

| Field | Value |
|-------|-------|
| **Precondition** | Both `compliance` and `cost_management` are disabled |
| **Steps** | 1. Load dashboard |
| **Expected** | The "Compliance & Cost" section header and all its items are not rendered. |
| **Priority** | P1 |

### TC-5.4: Auto-redirect when current page disabled

| Field | Value |
|-------|-------|
| **Precondition** | User is on the Guardrails page. Module `guardrails` is then disabled by another admin. |
| **Steps** | 1. Wait for 60-second poll cycle. |
| **Expected** | `activePage` is set to `'dashboard'`. User is redirected to the Dashboard page. |
| **Priority** | P0 |

### TC-5.5: Settings page never hidden

| Field | Value |
|-------|-------|
| **Precondition** | Any combination of modules disabled |
| **Steps** | 1. Check sidebar |
| **Expected** | "Settings" nav item is always visible under "System" section. |
| **Priority** | P0 |

### TC-5.6: Non-module pages never hidden

| Field | Value |
|-------|-------|
| **Precondition** | Any combination of modules disabled |
| **Steps** | 1. Check sidebar |
| **Expected** | Dashboard, Agent Registry, Workflows, Playground, Audit Log, Observability, Integrations are all always visible. |
| **Priority** | P1 |

### TC-5.7: Module states polled every 60 seconds

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in |
| **Steps** | 1. Open browser DevTools → Network tab. 2. Wait 2 minutes. |
| **Expected** | `GET /settings/modules` is called every 60 seconds (interval polling). |
| **Priority** | P2 |

### TC-5.8: Poll stops on logout

| Field | Value |
|-------|-------|
| **Precondition** | User is logged in, polling is active |
| **Steps** | 1. Log out |
| **Expected** | `clearInterval` is called. No more `GET /settings/modules` requests. |
| **Priority** | P2 |

---

## 6. Edge Cases

### TC-6.1: Toggle same module rapidly

| Field | Value |
|-------|-------|
| **Steps** | 1. Click toggle ON. 2. Immediately click toggle OFF before first request completes. |
| **Expected** | `togglingModule` state prevents double-click. Second click is ignored (button disabled while first request is in flight). |
| **Priority** | P1 |

### TC-6.2: Toggle module with invalid value

| Field | Value |
|-------|-------|
| **Steps** | 1. `PUT /settings` with `{ category: 'modules', key: 'guardrails', value: { enabled: 'yes' } }` (string instead of boolean) |
| **Expected** | `getModuleStatus()` evaluates `'yes' !== false` → returns `true`. Module is treated as enabled. No crash. |
| **Priority** | P2 |

### TC-6.3: Unknown module key

| Field | Value |
|-------|-------|
| **Steps** | 1. `PUT /settings` with `{ category: 'modules', key: 'unknown_module', value: { enabled: false } }` |
| **Expected** | Row is created. No middleware references this key, so it has no effect. No error. |
| **Priority** | P2 |

### TC-6.4: Delete module toggle row directly from DB

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails` is disabled via settings row |
| **Steps** | 1. `DELETE FROM settings WHERE category='modules' AND key='guardrails'`. 2. Wait for cache expiry (30s). |
| **Expected** | After cache refresh, `getModuleStatus('guardrails')` returns `true` (no row = default enabled). |
| **Priority** | P2 |

### TC-6.5: Server restart preserves module states

| Field | Value |
|-------|-------|
| **Precondition** | `guardrails` disabled, `cost_management` disabled |
| **Steps** | 1. Restart the AgentShield server. 2. Send gateway invoke request. |
| **Expected** | First request triggers cache refresh from DB. Guardrail and budget checks are skipped (still disabled). |
| **Priority** | P0 |
