# Step-by-Step: Testing Publicly Available MCP Servers in AgentShield

MCP servers use stdio/SSE transport (not HTTP), so we use an **MCP-to-HTTP bridge** to make them accessible via the Agent Playground.

---

## Architecture

```
Agent Playground → AgentShield Gateway → MCP Bridge (HTTP) → MCP Server (stdio)
                                          port 4100            child process
```

---

## Step 1: Install the MCP Server Package

The MCP "Everything" reference server includes 13 demo tools.

```bash
npm install -g @modelcontextprotocol/server-everything
```

Other available MCP servers (install similarly):
- `@anthropic-ai/mcp-server-fetch` — fetch web pages
- `@anthropic-ai/mcp-server-filesystem` — file operations

---

## Step 2: Start the MCP Bridge

The bridge spawns the MCP server as a child process (stdio) and exposes its tools via HTTP.

```bash
cd /path/to/agentshield-dashboard

# Start the bridge on port 4100
MCP_BRIDGE_PORT=4100 node tools/mcp-bridge.cjs npx -y @modelcontextprotocol/server-everything
```

**Expected output:**
```
🔌 Starting MCP server: npx -y @modelcontextprotocol/server-everything
✅ MCP handshake complete: {"name":"mcp-servers/everything","version":"2.0.0"}
🔧 13 tools available:
   • echo: Echoes back the input string
   • get-sum: Returns the sum of two numbers
   • get-tiny-image: Returns a tiny MCP logo image
   • simulate-research-query: Simulates a deep research operation
   ... (9 more tools)

🌉 MCP Bridge running on http://localhost:4100
```

---

## Step 3: Verify the Bridge

### List available tools:
```bash
curl http://localhost:4100/tools
```

### Test echo tool directly:
```bash
curl -X POST http://localhost:4100/invoke \
  -H "Content-Type: application/json" \
  -d '{"tool":"echo","message":"Hello!"}'
```

**Response:**
```json
{
  "server": "mcp-servers/everything",
  "tool": "echo",
  "result": {
    "content": [{"type": "text", "text": "Echo: Hello!"}]
  }
}
```

---

## Step 4: Register the MCP Server in AgentShield

Go to **Agent Registry** → **+ Register Agent**:

| Field | Value |
|---|---|
| Name | `MCP Everything Server` |
| Slug | `mcp-everything` |
| Type | `external` |
| Protocol | `mcp` |
| Vendor | `MCP` |
| Description | `Official MCP Reference Server with 13 tools` |
| Endpoint URL | `http://localhost:4100/invoke` |
| Health Check URL | `http://localhost:4100/` |
| Auth Config | Leave empty |

---

## Step 5: Ensure an Allow Policy Exists

In **Policies**, create (if not already present):

| Field | Value |
|---|---|
| Name | `Allow All Playground Testing` |
| Effect | `allow` |
| Priority | `1` |
| Subjects | Empty (all users) |
| Resources | Empty (all agents) |

---

## Step 6: Test MCP Tools in Agent Playground

Navigate to **Playground** → **🚀 Agent Playground** → Select **MCP Everything Server**.

### Test 1: Echo Tool

**Payload:**
```json
{"tool": "echo", "message": "Hello from AgentShield Agent Playground!"}
```

**Result:**
- ✅ Status Check: Active and healthy
- ✅ Policy Check: Allow
- 📨 Response: `"Echo: Hello from AgentShield Agent Playground!"`
- ⏱️ Latency: **2ms**

### Test 2: Sum Tool

**Payload:**
```json
{"tool": "get-sum", "a": 42, "b": 58}
```

**Result:**
- ✅ Status Check: Active and healthy
- ✅ Policy Check: Allow
- 📨 Response: `"The sum of 42 and 58 is 100."`
- ⏱️ Latency: **1ms**

### Test 3: Structured Content (with parameters)

**Payload:**
```json
{"tool": "get-structured-content", "location": "New York"}
```

**Result:**
- ✅ Status Check & Policy Check pass
- 📨 Response: Structured weather data for New York

### Test 4: List Available Tools (no tool specified)

**Payload:**
```json
{"prompt": "What tools are available?"}
```

**Result:**
- 📨 Response: Full list of 13 available tools with descriptions

---

## All 13 MCP Everything Tools

| Tool Name | Description | Example Payload |
|---|---|---|
| `echo` | Echoes back input | `{"tool":"echo","message":"hello"}` |
| `get-sum` | Adds two numbers | `{"tool":"get-sum","a":5,"b":3}` |
| `get-tiny-image` | Returns MCP logo | `{"tool":"get-tiny-image"}` |
| `get-env` | Returns env variables | `{"tool":"get-env"}` |
| `get-structured-content` | Weather data | `{"tool":"get-structured-content","location":"Chicago"}` |
| `get-annotated-message` | Annotated content demo | `{"tool":"get-annotated-message","messageType":"error"}` |
| `get-resource-links` | Resource link examples | `{"tool":"get-resource-links"}` |
| `get-resource-reference` | Resource ref demo | `{"tool":"get-resource-reference","resourceId":"1"}` |
| `gzip-file-as-resource` | Compresses file | `{"tool":"gzip-file-as-resource","filePath":"/tmp/test.txt"}` |
| `toggle-simulated-logging` | Toggle logging | `{"tool":"toggle-simulated-logging","enabled":true}` |
| `toggle-subscriber-updates` | Toggle updates | `{"tool":"toggle-subscriber-updates","enabled":true}` |
| `trigger-long-running-operation` | Progress demo | `{"tool":"trigger-long-running-operation","duration":3000}` |
| `simulate-research-query` | Research simulation | `{"tool":"simulate-research-query","query":"AI agents"}` |

---

## Running Other MCP Servers

Start a different MCP server by changing the command:

```bash
# Fetch MCP — downloads web pages
MCP_BRIDGE_PORT=4101 node tools/mcp-bridge.cjs npx -y @anthropic-ai/mcp-server-fetch

# Filesystem MCP — file operations on /tmp
MCP_BRIDGE_PORT=4102 node tools/mcp-bridge.cjs npx -y @anthropic-ai/mcp-server-filesystem /tmp
```

Each gets its own port. Register each one as a separate agent in AgentShield.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Bridge hangs on startup | MCP handshake timeout — check MCP server package is installed |
| "Tool not found" error | Include `"tool":"toolName"` in your JSON payload |
| ES module error (.js) | Use `.cjs` extension for the bridge script |
| "created_by cannot be null" | Register via dashboard UI or ensure JWT auth is configured |
| MCP server exits immediately | Check stderr output; may need specific args (e.g., `/tmp` for filesystem) |
