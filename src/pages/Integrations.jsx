import { useState, useEffect } from 'react';
import { HiCodeBracket, HiKey, HiShieldCheck, HiCog6Tooth, HiPlay, HiArrowPath, HiClipboard, HiCheck, HiCommandLine, HiBolt, HiGlobeAlt, HiLockClosed, HiCpuChip, HiDocumentText, HiBeaker, HiArrowsRightLeft } from 'react-icons/hi2';
import api from '../api';

// ─── Reusable Copy Button ────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '4px 10px' }} onClick={copy}>
            {copied ? <><HiCheck /> Copied!</> : <><HiClipboard /> Copy</>}
        </button>
    );
}

// ─── Code Block ──────────────────────────────
function CodeBlock({ code, maxHeight = 400 }) {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                <CopyButton text={code} />
            </div>
            <pre style={{
                padding: 20, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-input)',
                margin: 0, overflow: 'auto', lineHeight: 1.7, borderRadius: 8, maxHeight,
            }}>
                {code}
            </pre>
        </div>
    );
}

// ─── Endpoint Card ───────────────────────────
function EndpointCard({ method, path, description, children, badge }) {
    const [expanded, setExpanded] = useState(false);
    const methodColors = { POST: '#10b981', GET: '#6366f1', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#8b5cf6' };
    return (
        <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer',
                    borderBottom: expanded ? '1px solid var(--border-color)' : 'none',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
            >
                <span style={{
                    fontWeight: 800, fontSize: 11, color: 'white', letterSpacing: 0.5,
                    background: methodColors[method] || '#6366f1', padding: '3px 10px', borderRadius: 4,
                    minWidth: 52, textAlign: 'center',
                }}>{method}</span>
                <code style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', flex: 1 }}>{path}</code>
                {badge && <span className="badge blue" style={{ fontSize: 10 }}>{badge}</span>}
                <span style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{description}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▼' : '▶'}</span>
            </div>
            {expanded && (
                <div style={{ padding: '16px 20px' }}>
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Tab Constants ───────────────────────────
const TABS = [
    { key: 'quickstart', label: '⚡ Quick Start', icon: HiBolt },
    { key: 'gateway', label: '🌐 Gateway API', icon: HiGlobeAlt },
    { key: 'admin', label: '🔧 Admin API', icon: HiCog6Tooth },
    { key: 'auth', label: '🔑 Authentication', icon: HiLockClosed },
    { key: 'sdks', label: '📦 SDKs & Snippets', icon: HiCodeBracket },
];

export default function Integrations() {
    const [activeTab, setActiveTab] = useState('quickstart');
    const [agents, setAgents] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [targetType, setTargetType] = useState('agent');
    const [selectedSlug, setSelectedSlug] = useState('');
    const [snippetLang, setSnippetLang] = useState('curl');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [agentRes, wfRes] = await Promise.allSettled([api.listAgents(), api.listWorkflows()]);
            if (agentRes.status === 'fulfilled') {
                const d = agentRes.value.data;
                setAgents(Array.isArray(d) ? d : (d?.agents || []));
            }
            if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const simOptions = targetType === 'agent'
        ? agents.map(a => ({ value: a.slug, label: `${a.name} (${a.protocol})` }))
        : workflows.map(w => ({ value: w.slug, label: `${w.name} (${(w.agents || []).length} steps)` }));

    const slug = selectedSlug || 'your-agent-slug';
    const slugKey = targetType === 'agent' ? 'agentSlug' : 'workflowSlug';

    // ─── Snippet Generators ──────────────────
    const policyCheckSnippets = {
        curl: `curl -s -X POST http://localhost:3000/api/v1/gateway/policy/check \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "${slugKey}": "${slug}",
    "user": { "role": "viewer", "department": "engineering" }
  }'`,
        python: `import requests

response = requests.post(
    "http://localhost:3000/api/v1/gateway/policy/check",
    headers={"X-API-Key": "YOUR_API_KEY"},
    json={
        "${slugKey}": "${slug}",
        "user": {"role": "viewer", "department": "engineering"}
    }
)

result = response.json()
if result["data"]["allowed"]:
    print("✅ Policy allows this request")
else:
    print(f"🚫 Denied: {result['data']['reason']}")`,
        javascript: `const response = await fetch(
  "http://localhost:3000/api/v1/gateway/policy/check",
  {
    method: "POST",
    headers: {
      "X-API-Key": "YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ${slugKey}: "${slug}",
      user: { role: "viewer", department: "engineering" },
    }),
  }
);

const { data } = await response.json();
console.log(data.allowed ? "✅ Allowed" : "🚫 Denied:", data.reason);`,
    };

    const invokeSnippets = {
        curl: `curl -s -X POST http://localhost:3000/api/v1/gateway/agent/${slug}/invoke \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Summarize the quarterly report"
  }'`,
        python: `import requests

response = requests.post(
    f"http://localhost:3000/api/v1/gateway/agent/${slug}/invoke",
    headers={
        "Authorization": "Bearer YOUR_JWT_TOKEN",
        "Content-Type": "application/json"
    },
    json={"prompt": "Summarize the quarterly report"}
)

print(response.json())`,
        javascript: `const response = await fetch(
  "http://localhost:3000/api/v1/gateway/agent/${slug}/invoke",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_JWT_TOKEN",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "Summarize the quarterly report"
    }),
  }
);

const result = await response.json();
console.log(result);`,
    };

    // ─── Render ──────────────────────────────
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    <HiCodeBracket style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    API documentation, code snippets, and integration guides for AgentShield
                </p>
                <button className="btn btn-secondary btn-sm" onClick={loadData}><HiArrowPath /> Refresh</button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {TABS.map(tab => (
                    <button key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ========== QUICK START TAB ========== */}
            {activeTab === 'quickstart' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    {/* Getting Started */}
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🚀 Getting Started with AgentShield API</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                            AgentShield provides a unified gateway for managing AI agent invocations with built-in policy enforcement,
                            guardrails, cost tracking, and audit logging. Integrate in 3 steps:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            {[
                                { step: 1, title: 'Get API Key', desc: 'Generate an API key from Settings → API Keys, or use JWT authentication.', icon: '🔑' },
                                { step: 2, title: 'Register Agent', desc: 'Register your agent in the Agent Registry with its endpoint URL and protocol.', icon: '🤖' },
                                { step: 3, title: 'Invoke via Gateway', desc: 'Send requests through the gateway to get policy enforcement, guardrails, and audit logging.', icon: '🌐' },
                            ].map(s => (
                                <div key={s.step} style={{
                                    padding: 20, background: 'var(--bg-input)', borderRadius: 12,
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <span style={{
                                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontWeight: 800, fontSize: 13,
                                            background: 'var(--accent-primary)', color: 'white',
                                        }}>{s.step}</span>
                                        <span style={{ fontSize: 15, fontWeight: 700 }}>{s.title}</span>
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Base URL */}
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>📡 Base URL</h3>
                        <div style={{
                            padding: '14px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
                            borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <code style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>http://localhost:3000/api/v1</code>
                            <CopyButton text="http://localhost:3000/api/v1" />
                        </div>
                    </div>

                    {/* Self-Service Policy Check */}
                    <div className="card">
                        <div className="card-header"><h3>🔌 Self-Service Policy Validation API</h3></div>
                        <div style={{ padding: '16px 20px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                                External agents can pre-check if their requests would be <strong>allowed or denied</strong> before invoking.
                                Authenticate with an API key from <strong>Settings → API Keys</strong>.
                            </p>

                            <div style={{
                                padding: '14px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
                                borderRadius: 10, marginBottom: 20, border: '1px solid rgba(99,102,241,0.2)',
                            }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Endpoint</div>
                                <code style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>POST /api/v1/gateway/policy/check</code>
                            </div>

                            {/* Target Selection */}
                            <div className="form-row" style={{ marginBottom: 16 }}>
                                <div className="form-group">
                                    <label>Target (for code snippets)</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className={`btn btn-sm ${targetType === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => { setTargetType('agent'); setSelectedSlug(''); }}>🤖 Agent</button>
                                        <button className={`btn btn-sm ${targetType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => { setTargetType('workflow'); setSelectedSlug(''); }}>🔗 Workflow</button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Select {targetType}</label>
                                    <select className="form-select" value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
                                        <option value="">— Choose {targetType} —</option>
                                        {simOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Language Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 0 }}>
                                {[{ key: 'curl', label: '$ curl' }, { key: 'python', label: '🐍 Python' }, { key: 'javascript', label: '⚡ JavaScript' }].map(t => (
                                    <button key={t.key} onClick={() => setSnippetLang(t.key)}
                                        style={{
                                            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                            borderBottom: snippetLang === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                            background: 'transparent', color: snippetLang === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        }}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <CodeBlock code={policyCheckSnippets[snippetLang]} />
                        </div>
                    </div>

                    {/* Example Response */}
                    <div className="card">
                        <div className="card-header"><h3>📨 Example Response</h3></div>
                        <div style={{ padding: '12px 20px' }}>
                            <CodeBlock code={`{
  "success": true,
  "data": {
    "allowed": true,
    "reason": "Policy \\"Allow Engineering\\" matched (allow)",
    "matchedPolicy": "Allow Engineering",
    "checkedAt": "2026-03-16T18:00:00.000Z",
    "target": {
      "type": "${targetType}",
      "slug": "${slug}",
      "name": "GPT-4 Analyst"
    }
  }
}`} maxHeight={300} />
                        </div>
                    </div>
                </div>
            )}

            {/* ========== GATEWAY API TAB ========== */}
            {activeTab === 'gateway' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    <div className="card" style={{ padding: 20, marginBottom: 8 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>🌐 Gateway API</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                            The Gateway proxies requests to registered agents through the full middleware chain:
                            Auth → Audit → Policy → Budget → Guardrails → Compliance → Agent.
                        </p>
                    </div>

                    {/* Target selector */}
                    <div className="card" style={{ padding: '12px 20px' }}>
                        <div className="form-row" style={{ margin: 0 }}>
                            <div className="form-group">
                                <label>Target</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${targetType === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('agent'); setSelectedSlug(''); }}>🤖 Agent</button>
                                    <button className={`btn btn-sm ${targetType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('workflow'); setSelectedSlug(''); }}>🔗 Workflow</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Select {targetType}</label>
                                <select className="form-select" value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
                                    <option value="">— Choose {targetType} —</option>
                                    {simOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <EndpointCard method="POST" path={`/gateway/agent/${slug}/invoke`} description="Invoke a registered agent through the governance pipeline" badge="Core">
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Sends a request to the agent after running all middleware checks (auth, policy, budget, guardrails).
                            Supports OpenAI, Anthropic, plain prompt, and MCP payload formats.
                        </p>
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 0 }}>
                            {[{ key: 'curl', label: '$ curl' }, { key: 'python', label: '🐍 Python' }, { key: 'javascript', label: '⚡ JavaScript' }].map(t => (
                                <button key={t.key} onClick={() => setSnippetLang(t.key)}
                                    style={{
                                        padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        borderBottom: snippetLang === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                        background: 'transparent', color: snippetLang === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <CodeBlock code={invokeSnippets[snippetLang]} maxHeight={250} />
                    </EndpointCard>

                    <EndpointCard method="POST" path="/gateway/policy/check" description="Pre-flight policy check without invoking the agent" badge="Self-Service">
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Check if a request would be allowed by the policy engine before making the actual invocation.
                            Useful for client-side pre-validation.
                        </p>
                        <CodeBlock code={policyCheckSnippets.curl} maxHeight={200} />
                    </EndpointCard>

                    <EndpointCard method="POST" path={`/gateway/workflow/${slug}/run`} description="Execute a multi-step workflow" badge="Workflows">
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Runs a registered workflow, executing each agent step in order. Policy and guardrails are enforced per-step.
                        </p>
                        <CodeBlock code={`curl -s -X POST http://localhost:3000/api/v1/gateway/workflow/${slug}/run \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "Analyze this dataset" }'`} maxHeight={150} />
                    </EndpointCard>
                </div>
            )}

            {/* ========== ADMIN API TAB ========== */}
            {activeTab === 'admin' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    <div className="card" style={{ padding: 20, marginBottom: 8 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>🔧 Admin API Reference</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                            Manage agents, policies, workflows, budgets, guardrails, and system configuration.
                            All admin endpoints require JWT authentication with appropriate role.
                        </p>
                    </div>

                    <h4 style={{ margin: '8px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Agent Registry</h4>
                    <EndpointCard method="GET" path="/agents" description="List all registered agents with optional filters">
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Query params: <code>type</code>, <code>protocol</code>, <code>vendor</code>, <code>isActive</code>, <code>search</code>, <code>limit</code>, <code>offset</code></p>
                        <CodeBlock code={`curl -s http://localhost:3000/api/v1/agents \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`} maxHeight={80} />
                    </EndpointCard>
                    <EndpointCard method="POST" path="/agents" description="Register a new agent">
                        <CodeBlock code={`curl -s -X POST http://localhost:3000/api/v1/agents \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "GPT-4 Analyst",
    "slug": "gpt4-analyst",
    "type": "external",
    "vendor": "OpenAI",
    "protocol": "rest",
    "endpointUrl": "https://api.openai.com/v1/chat/completions",
    "description": "General-purpose analyst agent"
  }'`} maxHeight={200} />
                    </EndpointCard>
                    <EndpointCard method="GET" path="/agents/:slug" description="Get agent details by slug or ID" />
                    <EndpointCard method="PUT" path="/agents/:slug" description="Update agent configuration" badge="Editor+" />
                    <EndpointCard method="DELETE" path="/agents/:slug" description="Deactivate an agent" badge="Admin" />

                    <h4 style={{ margin: '16px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Policies</h4>
                    <EndpointCard method="GET" path="/policies" description="List all access policies" />
                    <EndpointCard method="POST" path="/policies" description="Create a new access policy" badge="Editor+" />
                    <EndpointCard method="PUT" path="/policies/:id" description="Update a policy" badge="Editor+" />
                    <EndpointCard method="DELETE" path="/policies/:id" description="Delete a policy" badge="Admin" />

                    <h4 style={{ margin: '16px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Guardrails</h4>
                    <EndpointCard method="GET" path="/guardrails/profiles" description="List all guardrail profiles with rule/agent counts" />
                    <EndpointCard method="POST" path="/guardrails/profiles" description="Create a guardrail profile" badge="Editor+" />
                    <EndpointCard method="POST" path="/guardrails/profiles/:id/rules" description="Add a rule to a profile" badge="Editor+" />
                    <EndpointCard method="POST" path="/guardrails/assign" description="Assign a profile to an agent" badge="Editor+" />
                    <EndpointCard method="POST" path="/guardrails/profiles/:id/test" description="Run guardrail tests" badge="Editor+" />
                    <EndpointCard method="GET" path="/guardrails/stats" description="Get guardrail dashboard statistics" />

                    <h4 style={{ margin: '16px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Budgets & Cost</h4>
                    <EndpointCard method="GET" path="/budgets" description="List all budgets" />
                    <EndpointCard method="POST" path="/budgets" description="Create a budget" badge="Admin" />
                    <EndpointCard method="GET" path="/cost/records" description="Query cost records with filters" />
                    <EndpointCard method="GET" path="/cost/analytics" description="Get cost analytics and aggregations" />

                    <h4 style={{ margin: '16px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Workflows</h4>
                    <EndpointCard method="GET" path="/workflows" description="List all workflows" />
                    <EndpointCard method="POST" path="/workflows" description="Create a workflow" badge="Editor+" />
                    <EndpointCard method="PUT" path="/workflows/:id" description="Update a workflow" badge="Editor+" />

                    <h4 style={{ margin: '16px 0 4px', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>System</h4>
                    <EndpointCard method="POST" path="/auth/login" description="Authenticate and get JWT token" />
                    <EndpointCard method="POST" path="/auth/refresh" description="Refresh an expired JWT token" />
                    <EndpointCard method="GET" path="/audit-log" description="Query audit log entries" />
                    <EndpointCard method="GET" path="/settings/:category" description="Get system settings by category" />
                    <EndpointCard method="POST" path="/api-keys" description="Create an API key" badge="Admin" />
                </div>
            )}

            {/* ========== AUTHENTICATION TAB ========== */}
            {activeTab === 'auth' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🔑 Authentication Methods</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                            AgentShield supports two authentication methods. All API requests (except login and health) must include one.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* JWT */}
                            <div style={{
                                padding: 20, background: 'var(--bg-input)', borderRadius: 12,
                                border: '1px solid var(--border-color)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <HiLockClosed style={{ color: 'var(--accent-primary)', fontSize: 18 }} />
                                    <h4 style={{ margin: 0, fontSize: 14 }}>JWT Bearer Token</h4>
                                    <span className="badge green" style={{ fontSize: 10 }}>Recommended</span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                                    Authenticate with email/password to get a JWT token. Include in the <code>Authorization</code> header.
                                    Tokens expire in 15 minutes; use refresh tokens for long-lived sessions.
                                </p>
                                <CodeBlock code={`# 1. Login to get token
curl -s -X POST http://localhost:3000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "admin@agentshield.local", "password": "admin123"}'

# 2. Use token in requests
curl -s http://localhost:3000/api/v1/agents \\
  -H "Authorization: Bearer <token>"`} maxHeight={200} />
                            </div>

                            {/* API Key */}
                            <div style={{
                                padding: 20, background: 'var(--bg-input)', borderRadius: 12,
                                border: '1px solid var(--border-color)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <HiKey style={{ color: 'var(--warning)', fontSize: 18 }} />
                                    <h4 style={{ margin: 0, fontSize: 14 }}>API Key</h4>
                                    <span className="badge blue" style={{ fontSize: 10 }}>Machine-to-Machine</span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                                    Generate API keys from <strong>Settings → API Keys</strong>. Include in the <code>X-API-Key</code> header.
                                    Best for server-to-server integrations and CI/CD pipelines.
                                </p>
                                <CodeBlock code={`# Use API key in requests
curl -s http://localhost:3000/api/v1/agents \\
  -H "X-API-Key: ask_15c83289..."

# Policy check with API key
curl -s -X POST http://localhost:3000/api/v1/gateway/policy/check \\
  -H "X-API-Key: ask_15c83289..." \\
  -H "Content-Type: application/json" \\
  -d '{"agentSlug": "gpt4-analyst"}'`} maxHeight={200} />
                            </div>
                        </div>
                    </div>

                    {/* Response Codes */}
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14 }}>📋 Response Status Codes</h3>
                        <table className="data-table">
                            <thead><tr><th>Code</th><th>Meaning</th><th>When</th></tr></thead>
                            <tbody>
                                {[
                                    ['200', 'OK', 'Successful request'],
                                    ['201', 'Created', 'Resource created (agent, policy, etc.)'],
                                    ['401', 'Unauthorized', 'Missing or invalid authentication'],
                                    ['403', 'Forbidden', 'Insufficient role permissions'],
                                    ['404', 'Not Found', 'Resource not found'],
                                    ['409', 'Conflict', 'Duplicate slug or constraint violation'],
                                    ['422', 'Unprocessable', 'Guardrail violation blocked the request'],
                                    ['429', 'Rate Limited', 'Budget or rate limit exceeded'],
                                    ['500', 'Server Error', 'Internal error'],
                                ].map(([code, meaning, when]) => (
                                    <tr key={code}>
                                        <td><code style={{ fontWeight: 700, color: parseInt(code) < 400 ? 'var(--success)' : parseInt(code) < 500 ? 'var(--warning)' : 'var(--danger)' }}>{code}</code></td>
                                        <td style={{ fontWeight: 600 }}>{meaning}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{when}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========== SDKS & SNIPPETS TAB ========== */}
            {activeTab === 'sdks' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>📦 SDK & Integration Snippets</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                            Ready-to-use code snippets for common integration patterns. Select a target agent to generate personalized code.
                        </p>
                    </div>

                    {/* Target Selector */}
                    <div className="card" style={{ padding: '12px 20px' }}>
                        <div className="form-row" style={{ margin: 0 }}>
                            <div className="form-group">
                                <label>Target</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${targetType === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('agent'); setSelectedSlug(''); }}>🤖 Agent</button>
                                    <button className={`btn btn-sm ${targetType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('workflow'); setSelectedSlug(''); }}>🔗 Workflow</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Select {targetType}</label>
                                <select className="form-select" value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
                                    <option value="">— Choose {targetType} —</option>
                                    {simOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Python SDK */}
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3>🐍 Python — Full Client Example</h3>
                        </div>
                        <div style={{ padding: '0 20px 20px' }}>
                            <CodeBlock code={`import requests

class AgentShieldClient:
    def __init__(self, base_url="http://localhost:3000/api/v1", api_key=None):
        self.base_url = base_url
        self.headers = {"Content-Type": "application/json"}
        if api_key:
            self.headers["X-API-Key"] = api_key

    def login(self, email, password):
        resp = requests.post(f"{self.base_url}/auth/login",
                           json={"email": email, "password": password})
        token = resp.json()["data"]["token"]
        self.headers["Authorization"] = f"Bearer {token}"
        return token

    def invoke_agent(self, slug, payload):
        resp = requests.post(
            f"{self.base_url}/gateway/agent/{slug}/invoke",
            headers=self.headers, json=payload)
        return resp.json()

    def check_policy(self, agent_slug, user_context=None):
        resp = requests.post(
            f"{self.base_url}/gateway/policy/check",
            headers=self.headers,
            json={"agentSlug": agent_slug, "user": user_context or {}})
        return resp.json()["data"]

    def list_agents(self):
        resp = requests.get(f"{self.base_url}/agents", headers=self.headers)
        return resp.json()["data"]


# Usage
client = AgentShieldClient(api_key="ask_15c83289...")

# Check policy before invoking
policy = client.check_policy("${slug}", {"role": "viewer"})
if policy["allowed"]:
    result = client.invoke_agent("${slug}", {"prompt": "Summarize Q3 report"})
    print(result)
else:
    print(f"Denied: {policy['reason']}")`} />
                        </div>
                    </div>

                    {/* JavaScript/Node.js */}
                    <div className="card">
                        <div className="card-header"><h3>⚡ JavaScript/Node.js — Full Client Example</h3></div>
                        <div style={{ padding: '0 20px 20px' }}>
                            <CodeBlock code={`class AgentShieldClient {
  constructor({ baseUrl = "http://localhost:3000/api/v1", apiKey } = {}) {
    this.baseUrl = baseUrl;
    this.headers = { "Content-Type": "application/json" };
    if (apiKey) this.headers["X-API-Key"] = apiKey;
  }

  async login(email, password) {
    const resp = await fetch(\`\${this.baseUrl}/auth/login\`, {
      method: "POST", headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    const { data } = await resp.json();
    this.headers["Authorization"] = \`Bearer \${data.token}\`;
    return data;
  }

  async invokeAgent(slug, payload) {
    const resp = await fetch(
      \`\${this.baseUrl}/gateway/agent/\${slug}/invoke\`,
      { method: "POST", headers: this.headers, body: JSON.stringify(payload) }
    );
    return resp.json();
  }

  async checkPolicy(agentSlug, userContext = {}) {
    const resp = await fetch(\`\${this.baseUrl}/gateway/policy/check\`, {
      method: "POST", headers: this.headers,
      body: JSON.stringify({ agentSlug, user: userContext }),
    });
    return (await resp.json()).data;
  }

  async listAgents() {
    const resp = await fetch(\`\${this.baseUrl}/agents\`, { headers: this.headers });
    return (await resp.json()).data;
  }
}

// Usage
const client = new AgentShieldClient({ apiKey: "ask_15c83289..." });

const policy = await client.checkPolicy("${slug}", { role: "viewer" });
if (policy.allowed) {
  const result = await client.invokeAgent("${slug}", { prompt: "Summarize Q3 report" });
  console.log(result);
} else {
  console.log("Denied:", policy.reason);
}`} />
                        </div>
                    </div>

                    {/* Webhook / Event */}
                    <div className="card">
                        <div className="card-header"><h3>🔔 Webhook Integration Pattern</h3></div>
                        <div style={{ padding: '0 20px 20px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                                Use the audit log API to poll for events, or implement a webhook listener for real-time notifications.
                            </p>
                            <CodeBlock code={`# Poll recent guardrail violations
curl -s "http://localhost:3000/api/v1/audit-log?eventType=guardrail_violation&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Poll recent policy denials
curl -s "http://localhost:3000/api/v1/audit-log?outcome=denied&limit=10" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`} maxHeight={150} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
