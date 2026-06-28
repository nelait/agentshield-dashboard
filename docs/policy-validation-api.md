# Self-Service Policy Validation API

External agents can call a lightweight API to **pre-check if their requests would be allowed or denied** by AgentShield policies — without actually invoking the agent.

## Endpoint

```
POST /api/v1/gateway/policy/check
```

**Authentication**: `X-API-Key` header (create keys in **Settings → API Keys**)

## Request

```json
{
  "agentSlug": "gpt4-analyst",
  "user": {
    "role": "analyst",
    "email": "alice@corp.com",
    "department": "finance"
  },
  "action": "invoke",
  "customContext": {}
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `agentSlug` | One of `agentSlug` or `workflowSlug` | Agent to check |
| `workflowSlug` | One of `agentSlug` or `workflowSlug` | Workflow to check |
| `user` | Optional | Simulated user context (role, email, department) |
| `action` | Optional | Defaults to `"invoke"` |
| `customContext` | Optional | Extra context merged into the request object |

## Response

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "reason": "Policy \"Allow Finance Analysts\" matched (allow)",
    "matchedPolicy": "Allow Finance Analysts",
    "checkedAt": "2026-03-16T18:00:00.000Z",
    "target": {
      "type": "agent",
      "slug": "gpt4-analyst",
      "name": "GPT-4 Analyst"
    }
  }
}
```

## Code Examples

### curl

```bash
curl -s -X POST http://localhost:3000/api/v1/gateway/policy/check \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentSlug": "gpt4-analyst",
    "user": { "role": "viewer", "department": "engineering" }
  }'
```

### Python

```python
import requests

response = requests.post(
    "http://localhost:3000/api/v1/gateway/policy/check",
    headers={"X-API-Key": "YOUR_API_KEY"},
    json={
        "agentSlug": "gpt4-analyst",
        "user": {"role": "viewer", "department": "engineering"}
    }
)

result = response.json()
if result["data"]["allowed"]:
    print("✅ Policy allows this request")
else:
    print(f"🚫 Denied: {result['data']['reason']}")
```

### JavaScript

```javascript
const response = await fetch(
  "http://localhost:3000/api/v1/gateway/policy/check",
  {
    method: "POST",
    headers: {
      "X-API-Key": "YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agentSlug: "gpt4-analyst",
      user: { role: "viewer", department: "engineering" },
    }),
  }
);

const { data } = await response.json();
console.log(data.allowed ? "✅ Allowed" : "🚫 Denied:", data.reason);
```

## Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `AUTH_REQUIRED` | No `X-API-Key` or `Authorization` header |
| 401 | `INVALID_API_KEY` | Key is invalid, expired, or revoked |
| 403 | `SCOPE_DENIED` | API key lacks `policy:check` scope |
| 400 | `MISSING_TARGET` | Neither `agentSlug` nor `workflowSlug` provided |

## API Key Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/api-keys` | POST | Create key (admin, returns raw key once) |
| `/api/v1/api-keys` | GET | List keys (prefix only) |
| `/api/v1/api-keys/:id` | DELETE | Revoke a key |

Or use the dashboard: **Settings → 🔑 API Keys**

## Architecture Notes

- Uses the **same `policyService.evaluate()`** as the live gateway — zero policy drift
- Every pre-check is logged as `event_type: 'policy_precheck'` in the audit log
- Zero side-effects — no agent invocation, no cost tracking, no compliance sampling
- Keys are stored as SHA-256 hashes; raw key is shown only once at creation
