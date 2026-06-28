import { useState } from 'react';

export default function IntegrationTab({ agents, workflows, targetType, setTargetType, selectedSlug, setSelectedSlug, simOptions }) {
    const [snippetLang, setSnippetLang] = useState('curl');
    const slugKey = targetType === 'agent' ? 'agentSlug' : 'workflowSlug';
    const slug = selectedSlug || 'your-agent-slug';

    const snippets = {
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

    const exampleResponse = `{
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
}`;

    const [copied, setCopied] = useState(false);
    const copySnippet = () => {
        navigator.clipboard.writeText(snippets[snippetLang]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <>
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3>🔌 Self-Service Policy Validation API</h3></div>
                <div style={{ padding: '16px 20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                        External agents can pre-check if their requests would be <strong>allowed or denied</strong> before invoking.
                        Authenticate with an API key from <strong>Settings → API Keys</strong>.
                    </p>

                    <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))', borderRadius: 10, marginBottom: 20, border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Endpoint</div>
                        <code style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>POST /api/v1/gateway/policy/check</code>
                    </div>

                    {/* Target Selection */}
                    <div className="form-row" style={{ marginBottom: 0 }}>
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
                </div>
            </div>

            {/* Language Tabs + Code */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
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
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-secondary btn-sm" style={{ margin: '6px 12px' }} onClick={copySnippet}>
                        {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                </div>
                <pre style={{
                    padding: 20, fontSize: 13, color: 'var(--text-secondary)',
                    background: 'var(--bg-input)', margin: 0, overflow: 'auto', lineHeight: 1.7,
                    borderRadius: '0 0 10px 10px', maxHeight: 400,
                }}>
                    {snippets[snippetLang]}
                </pre>
            </div>

            {/* Example Response */}
            <div className="card">
                <div className="card-header"><h3>📨 Example Response</h3></div>
                <pre style={{
                    padding: 20, fontSize: 13, color: 'var(--text-secondary)',
                    background: 'var(--bg-input)', margin: 12, borderRadius: 8, overflow: 'auto', lineHeight: 1.7,
                }}>
                    {exampleResponse}
                </pre>
            </div>
        </>
    );
}
