#!/usr/bin/env node
/**
 * MCP-to-HTTP Bridge
 * 
 * Spawns an MCP server as a child process (stdio transport) and exposes
 * its tools as HTTP REST endpoints for AgentShield Agent Playground.
 * 
 * Endpoints:
 *   GET  /tools           — List all available MCP tools
 *   POST /tools/:toolName — Call a specific MCP tool
 *   POST /invoke          — AgentShield gateway-compatible endpoint
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = parseInt(process.env.MCP_BRIDGE_PORT || '4100');
const MCP_CMD = process.argv[2] || 'npx';
const MCP_ARGS = process.argv.slice(3);

if (MCP_ARGS.length === 0) {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  MCP-to-HTTP Bridge for AgentShield                   ║
╠════════════════════════════════════════════════════════╣
║  Usage:                                               ║
║    node mcp-bridge.js <command> [args...]              ║
║                                                       ║
║  Examples:                                            ║
║    node mcp-bridge.js npx @anthropic-ai/mcp-server-fetch  ║
║    node mcp-bridge.js npx @anthropic-ai/mcp-server-filesystem /tmp ║
║    node mcp-bridge.js npx @modelcontextprotocol/server-everything  ║
║                                                       ║
║  Env: MCP_BRIDGE_PORT=4100 (default)                  ║
╚════════════════════════════════════════════════════════╝
`);
    process.exit(1);
}

// ── MCP JSON-RPC helpers ──

let msgId = 1;
let pendingRequests = new Map();
let buffer = '';
let mcpProcess = null;
let toolsList = [];
let serverInfo = null;

function sendMcpRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = msgId++;
        const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
        pendingRequests.set(id, {
            resolve, reject, timer: setTimeout(() => {
                pendingRequests.delete(id);
                reject(new Error(`MCP request timed out: ${method}`));
            }, 30000)
        });
        mcpProcess.stdin.write(msg);
    });
}

function handleMcpOutput(data) {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const msg = JSON.parse(line);
            if (msg.id && pendingRequests.has(msg.id)) {
                const req = pendingRequests.get(msg.id);
                clearTimeout(req.timer);
                pendingRequests.delete(msg.id);
                if (msg.error) req.reject(new Error(msg.error.message));
                else req.resolve(msg.result);
            }
        } catch (e) {
            // Not JSON — likely a log message from the MCP server
            process.stderr.write(`  [mcp] ${line}\n`);
        }
    }
}

// ── Start MCP Server ──

async function startMcp() {
    console.log(`🔌 Starting MCP server: ${MCP_CMD} ${MCP_ARGS.join(' ')}`);

    mcpProcess = spawn(MCP_CMD, MCP_ARGS, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
    });

    mcpProcess.stdout.on('data', handleMcpOutput);
    mcpProcess.stderr.on('data', d => process.stderr.write(`  [mcp-err] ${d}`));
    mcpProcess.on('exit', (code) => {
        console.error(`❌ MCP server exited with code ${code}`);
        process.exit(1);
    });

    // Wait for process to start
    await new Promise(r => setTimeout(r, 2000));

    // Initialize MCP handshake
    try {
        serverInfo = await sendMcpRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'agentshield-bridge', version: '1.0.0' },
        });
        console.log(`✅ MCP handshake complete: ${JSON.stringify(serverInfo.serverInfo || {})}`);

        // Send initialized notification
        mcpProcess.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

        // List tools
        const toolsResult = await sendMcpRequest('tools/list', {});
        toolsList = toolsResult.tools || [];
        console.log(`🔧 ${toolsList.length} tools available:`);
        toolsList.forEach(t => console.log(`   • ${t.name}: ${(t.description || '').substring(0, 70)}`));
    } catch (err) {
        console.error('❌ MCP initialization failed:', err.message);
        process.exit(1);
    }
}

// ── HTTP Server ──

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data, null, 2));
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch { reject(new Error('Invalid JSON body')); }
        });
    });
}

async function handleRequest(req, res) {
    // CORS
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
        return res.end();
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    try {
        // GET /tools — list all tools
        if (req.method === 'GET' && url.pathname === '/tools') {
            return sendJSON(res, 200, {
                server: serverInfo?.serverInfo || {},
                tools: toolsList.map(t => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                })),
            });
        }

        // POST /tools/:toolName — call a specific tool
        if (req.method === 'POST' && url.pathname.startsWith('/tools/')) {
            const toolName = url.pathname.replace('/tools/', '');
            const tool = toolsList.find(t => t.name === toolName);
            if (!tool) return sendJSON(res, 404, { error: `Tool not found: ${toolName}` });

            const body = await parseBody(req);
            const result = await sendMcpRequest('tools/call', { name: toolName, arguments: body });
            return sendJSON(res, 200, { tool: toolName, result });
        }

        // POST /invoke — AgentShield-compatible endpoint
        // Expects: { tool: "toolName", ...args } or { prompt: "text" }
        if (req.method === 'POST' && url.pathname === '/invoke') {
            const body = await parseBody(req);

            // If body has a "tool" field, call that specific tool
            if (body.tool) {
                const toolName = body.tool;
                delete body.tool;
                const tool = toolsList.find(t => t.name === toolName);
                if (!tool) return sendJSON(res, 404, { error: `Tool not found: ${toolName}`, availableTools: toolsList.map(t => t.name) });

                const result = await sendMcpRequest('tools/call', { name: toolName, arguments: body });
                return sendJSON(res, 200, {
                    server: serverInfo?.serverInfo?.name,
                    tool: toolName,
                    result,
                    availableTools: toolsList.map(t => t.name),
                });
            }

            // If body has "prompt" but no "tool", list available tools
            return sendJSON(res, 200, {
                message: 'MCP Bridge — specify a "tool" field to call a tool',
                server: serverInfo?.serverInfo || {},
                availableTools: toolsList.map(t => ({ name: t.name, description: t.description })),
            });
        }

        // GET / — health check
        if (req.method === 'GET' && url.pathname === '/') {
            return sendJSON(res, 200, {
                status: 'ok',
                server: serverInfo?.serverInfo || {},
                toolCount: toolsList.length,
                tools: toolsList.map(t => t.name),
            });
        }

        sendJSON(res, 404, { error: 'Not found' });
    } catch (err) {
        sendJSON(res, 500, { error: err.message });
    }
}

// ── Main ──

async function main() {
    await startMcp();

    const server = http.createServer(handleRequest);
    server.listen(PORT, () => {
        console.log(`\n🌉 MCP Bridge running on http://localhost:${PORT}`);
        console.log(`   Register in AgentShield → Endpoint: http://localhost:${PORT}/invoke`);
        console.log(`   List tools: curl http://localhost:${PORT}/tools`);
        console.log(`   Call tool:  curl -X POST http://localhost:${PORT}/invoke -H "Content-Type: application/json" -d '{"tool":"echo","message":"hello"}'`);
    });
}

main().catch(err => { console.error(err); process.exit(1); });
