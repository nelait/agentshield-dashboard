# Step-by-Step: Testing Public Agents in AgentShield

This guide walks through registering and testing 3 publicly available agents in the Agent Playground.

---

## Prerequisites

- AgentShield backend running on `localhost:3000`
- Dashboard running on `localhost:5173`
- Logged in as admin

---

## Step 1: Create an Allow-All Policy

Go to **Policies** → create a new policy:

| Field | Value |
|---|---|
| Name | `Allow All Playground Testing` |
| Type | `access_control` |
| Effect | `allow` |
| Priority | `1` |
| Subjects | Leave empty (matches all users) |
| Resources | Leave empty (matches all agents) |

> ⚠️ Without this, the system defaults to "deny" once any active policy exists.

---

## Step 2: Register Test Agents

Go to **Agent Registry** → **+ Register Agent** for each:

### Agent 1: JSONPlaceholder (no auth — easiest)

| Field | Value |
|---|---|
| Name | `JSONPlaceholder API` |
| Slug | `jsonplaceholder-api` |
| Type | `external` |
| Protocol | `rest` |
| Vendor | `PlaceholderService` |
| Endpoint URL | `https://jsonplaceholder.typicode.com/posts` |
| Auth Config | Leave empty |

### Agent 2: HTTPBin Echo (no auth)

| Field | Value |
|---|---|
| Name | `HTTPBin Echo Service` |
| Slug | `httpbin-echo` |
| Type | `external` |
| Protocol | `rest` |
| Vendor | `HTTPBin` |
| Endpoint URL | `https://httpbin.org/post` |
| Auth Config | Leave empty |

### Agent 3: GPT-4 Analyst (OpenAI — requires API key)

This agent should already be seeded. If not:

| Field | Value |
|---|---|
| Name | `GPT-4 Analyst` |
| Slug | `gpt4-analyst` |
| Type | `external` |
| Protocol | `rest` |
| Vendor | `OpenAI` |
| Endpoint URL | `https://api.openai.com/v1/chat/completions` |
| Auth Config | Leave empty (API key auto-resolved from LLM settings) |

Make sure your OpenAI API key is configured in **Settings → LLM Connections**.

---

## Step 3: Test in Agent Playground

Navigate to **Playground** → click **🚀 Agent Playground** tab.

### Test 1: JSONPlaceholder API

1. **Select Agent**: `JSONPlaceholder API`
2. **Set Role**: `Admin`
3. **Request Payload**:
   ```json
   {"title": "Test Post from AgentShield", "body": "Testing agent playground", "userId": 1}
   ```
4. Click **▶ Execute Agent**

**Expected Result:**
- ✅ Status Check: Agent is active and healthy
- ✅ Policy Check: "Allow All Playground Testing" (allow)
- 📨 Response:
  ```json
  {
    "title": "Test Post from AgentShield",
    "body": "Testing agent playground",
    "userId": 1,
    "id": 101
  }
  ```
- ⏱️ Latency: ~100ms

> JSONPlaceholder returns the posted data back with a mock `id: 101`.

---

### Test 2: HTTPBin Echo Service

1. **Select Agent**: `HTTPBin Echo Service`
2. **Set Role**: `Admin`
3. **Request Payload**:
   ```json
   {"message": "Hello from AgentShield playground", "timestamp": "2026-03-05", "feature": "Agent Playground"}
   ```
4. Click **▶ Execute Agent**

**Expected Result:**
- ✅ Status Check: Active and healthy
- ✅ Policy Check: Allow
- 📨 Response (echoes back everything):
  ```json
  {
    "json": {
      "message": "Hello from AgentShield playground",
      "timestamp": "2026-03-05",
      "feature": "Agent Playground"
    },
    "headers": {
      "X-Forwarded-By": "AgentShield",
      "Content-Type": "application/json"
    },
    "url": "https://httpbin.org/post"
  }
  ```
- ⏱️ Latency: ~300ms

> Notice the `X-Forwarded-By: AgentShield` header — proof the request went through the AgentShield gateway.

---

### Test 3: GPT-4 Analyst (OpenAI)

1. **Select Agent**: `GPT-4 Analyst`
2. **Set Role**: `Admin`
3. **Request Payload**:
   ```json
   {"prompt": "Say hello and tell me a fun fact about AI in one sentence"}
   ```
4. Click **▶ Execute Agent**

**Expected Result:**
- ✅ Status Check: Active and healthy
- ✅ Policy Check: Allow
- 📨 Response (GPT-4 reply):
  ```json
  {
    "model": "gpt-4o-2024-08-06",
    "choices": [{
      "message": {
        "role": "assistant",
        "content": "Hello! Did you know that AI can create art and music, often producing pieces indistinguishable from those made by humans?"
      }
    }],
    "usage": { "prompt_tokens": 20, "completion_tokens": 25, "total_tokens": 45 }
  }
  ```
- ⏱️ Latency: ~1-3 seconds

> The `{"prompt": "..."}` is auto-formatted to OpenAI's `{model, messages}` format by the backend.

---

## Understanding the Results

For each agent execution, the playground shows:

| Section | What It Shows |
|---|---|
| **Agent Info** | Name, slug, protocol, latency |
| **Status Check** | ✅ Active and healthy / ❌ Inactive or unhealthy |
| **Policy Check** | ✅ Policy allows / ❌ Policy denies (with policy name) |
| **Agent Response** | Raw JSON response from the agent |
| **Execution Blocked** | Shown when status or policy check fails |

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "No matching policy — default deny" | Create an allow policy with `effect: allow` in Policies |
| "Agent is unhealthy" | Agent endpoint is unreachable — check URL |
| "Agent returned error: 401" | Missing API key — add it in Settings → LLM Connections |
| "you must provide a model parameter" | Use `{"prompt": "..."}` format — backend auto-formats for OpenAI |
| "Agent returned error: 404" | Check the endpoint URL has the correct path (e.g., `/posts`) |
