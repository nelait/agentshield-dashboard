# Publicly Available MCP Servers & Configuration Guide

Guide for registering and testing MCP/REST agents in the AgentShield Agent Registry and Agent Playground.

---

## Publicly Available Servers to Test

### 1. OpenAI Chat Completions (REST — Already Configured)

| Field | Value |
|---|---|
| **Name** | GPT-4 Analyst |
| **Protocol** | `rest` |
| **Vendor** | OpenAI |
| **Endpoint** | `https://api.openai.com/v1/chat/completions` |
| **Auth** | Bearer token (API key from Settings → LLM Connections) |
| **Test Payload** | `{"prompt": "Hello, how can you help me?"}` (auto-formatted) |

### 2. Anthropic Claude (REST)

| Field | Value |
|---|---|
| **Name** | Claude Sonnet |
| **Protocol** | `rest` |
| **Vendor** | Anthropic |
| **Endpoint** | `https://api.anthropic.com/v1/messages` |
| **Auth** | API Key header: `x-api-key` |
| **Sign Up** | https://console.anthropic.com/ |
| **Test Payload** | `{"prompt": "Explain MCP in one sentence"}` (auto-formatted) |

### 3. Google Gemini (REST)

| Field | Value |
|---|---|
| **Name** | Gemini Flash |
| **Protocol** | `rest` |
| **Vendor** | Google |
| **Endpoint** | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY` |
| **Auth** | API key in URL (no header needed) |
| **Sign Up** | https://aistudio.google.com/apikey |
| **Test Payload** | `{"contents": [{"parts": [{"text": "Hello"}]}]}` |

### 4. Brave Search API (REST)

| Field | Value |
|---|---|
| **Name** | Brave Search |
| **Protocol** | `rest` |
| **Vendor** | Brave |
| **Endpoint** | `https://api.search.brave.com/res/v1/web/search?q=test` |
| **Auth** | Bearer token or `X-Subscription-Token` header |
| **Sign Up** | https://brave.com/search/api/ (free tier: 2,000 queries/month) |
| **Test Payload** | `{}` (query is in the URL for GET; the agent invocation will POST) |

### 5. JSONPlaceholder (REST — No Auth, Great for Testing)

| Field | Value |
|---|---|
| **Name** | JSONPlaceholder Test API |
| **Protocol** | `rest` |
| **Vendor** | jsonplaceholder |
| **Endpoint** | `https://jsonplaceholder.typicode.com/posts` |
| **Auth** | None needed |
| **Test Payload** | `{"title": "Test Post", "body": "Hello from AgentShield", "userId": 1}` |

> 💡 **Best for initial testing** — no API key required, always returns a valid response.

### 6. httpbin (REST — No Auth, Echo Service)

| Field | Value |
|---|---|
| **Name** | HTTPBin Echo |
| **Protocol** | `rest` |
| **Vendor** | httpbin |
| **Endpoint** | `https://httpbin.org/post` |
| **Auth** | None needed |
| **Test Payload** | `{"message": "Hello from AgentShield playground"}` |

> 💡 Echoes back everything you send — perfect for debugging.

---

## Step-by-Step Configuration

### Step 1: Go to Agent Registry

Navigate to **Agent Registry** in the left sidebar.

### Step 2: Click "+ Register Agent"

Click the **+ Register Agent** button in the top right.

### Step 3: Fill in Agent Details

For example, to register **JSONPlaceholder** (easiest — no auth needed):

| Field | What to Enter |
|---|---|
| **Name** | `JSONPlaceholder Test API` |
| **Slug** | `jsonplaceholder-test` (auto-generated or enter manually) |
| **Type** | `external` |
| **Protocol** | `rest` |
| **Vendor** | `jsonplaceholder` |
| **Description** | `Free REST API for testing POST requests` |
| **Endpoint URL** | `https://jsonplaceholder.typicode.com/posts` |

Leave **Auth Config** empty for JSONPlaceholder (no API key needed).

For OpenAI/Anthropic, configure the API key in **Settings → LLM Connections** and the Agent Playground will auto-resolve it.

### Step 4: Save the Agent

Click **Save** / **Register**. The agent will appear in the list.

### Step 5: Create an Allow Policy (if you have any active policies)

If the system blocks with "No matching policy — default deny", go to **Policies** and create:

| Field | Value |
|---|---|
| **Name** | `Allow Admin All Agents` |
| **Effect** | `allow` |
| **Subject Condition** | `role` equals `admin` |
| **Resource** | (leave empty — matches all agents) |

### Step 6: Go to Playground → Agent Playground

1. Click **Playground** in the sidebar
2. Click the **🚀 Agent Playground** tab

### Step 7: Select and Execute

1. **Select Agent** → Choose `JSONPlaceholder Test API` from dropdown
2. **Set Role** → `Admin` (to pass the allow policy)
3. **Enter Payload:**
   ```json
   {"title": "Test Post", "body": "Hello from AgentShield", "userId": 1}
   ```
4. Click **▶ Execute Agent**

### Step 8: View Results

You should see:
- ✅ **Status Check** — Agent is active and healthy
- ✅ **Policy Check** — Policy allows access
- 📨 **Agent Response** — JSONPlaceholder returns the created post with an `id`

---

## Note on MCP Protocol Servers

The Model Context Protocol (MCP) uses a **stdio/SSE transport** (not plain HTTP POST). AgentShield currently invokes agents via HTTP POST (`forwardToAgent`). For true MCP protocol servers (like the GitHub MCP, Playwright MCP, or Filesystem MCP), you would need:

1. An **MCP-to-HTTP bridge** — a local process that runs the MCP server and exposes an HTTP endpoint
2. Or integration with an **MCP client SDK** (e.g., `@modelcontextprotocol/sdk`)

The REST-based agents listed above (OpenAI, Anthropic, JSONPlaceholder, httpbin) work immediately with the current Agent Playground.

---

## Quick Reference: Which Servers Work Right Now

| Server | Auth Required | Works in Agent Playground |
|---|---|---|
| JSONPlaceholder | ❌ No | ✅ Yes — best for first test |
| httpbin.org | ❌ No | ✅ Yes — echo service |
| OpenAI Chat | ✅ API Key | ✅ Yes — auto-resolved from LLM settings |
| Anthropic Claude | ✅ API Key | ✅ Yes — add key in LLM settings |
| Google Gemini | ✅ API Key | ⚠️ Partial — key in URL, not header |
| Brave Search | ✅ API Key | ⚠️ Uses GET, not POST |
| GitHub MCP | ✅ Token | ❌ Needs MCP bridge |
| Playwright MCP | ❌ Local | ❌ Needs MCP bridge |
