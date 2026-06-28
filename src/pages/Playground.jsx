import { useState, useEffect } from 'react';
import { HiPlay, HiShieldCheck, HiShieldExclamation, HiArrowPath, HiBeaker, HiChevronDown, HiChevronRight, HiCommandLine, HiCheckCircle, HiXCircle, HiClock, HiBolt } from 'react-icons/hi2';
import api from '../api';

function ConditionDetail({ label, conditions }) {
    if (!conditions || conditions.length === 0) return null;
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
            {conditions.map((c, i) => (
                <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px 1fr 1fr 60px', gap: 8, fontSize: 12, padding: '4px 8px',
                    background: c.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', borderRadius: 6, marginBottom: 2,
                    border: `1px solid ${c.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{c.field}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{c.op}</span>
                    <span>expected: <strong style={{ color: 'var(--text-primary)' }}>{JSON.stringify(c.expected)}</strong></span>
                    <span>actual: <strong style={{ color: c.passed ? 'var(--success)' : 'var(--danger)' }}>{JSON.stringify(c.actual) ?? 'undefined'}</strong></span>
                    <span className={`badge ${c.passed ? 'green' : 'red'}`} style={{ fontSize: 10 }}>{c.passed ? 'PASS' : 'FAIL'}</span>
                </div>
            ))}
        </div>
    );
}

// ==================== CHECK BADGE ====================
function CheckBadge({ label, check }) {
    if (!check) return null;
    const passed = check.passed;
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
            background: passed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${passed ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 8, flex: 1,
        }}>
            {passed
                ? <HiCheckCircle style={{ color: '#10b981', fontSize: 22, flexShrink: 0, marginTop: 1 }} />
                : <HiXCircle style={{ color: '#ef4444', fontSize: 22, flexShrink: 0, marginTop: 1 }} />}
            <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{check.reason}</div>
                {check.matchedPolicy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Policy: <strong>{check.matchedPolicy}</strong></div>}
            </div>
        </div>
    );
}

export default function Playground() {
    const [activeTab, setActiveTab] = useState('simulator');
    const [agents, setAgents] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    // === Policy Simulator State ===
    const [simulating, setSimulating] = useState(false);
    const [result, setResult] = useState(null);
    const [expandedPolicy, setExpandedPolicy] = useState(null);
    const [targetType, setTargetType] = useState('agent');
    const [selectedSlug, setSelectedSlug] = useState('');
    const [userRole, setUserRole] = useState('viewer');
    const [userEmail, setUserEmail] = useState('test@example.com');
    const [department, setDepartment] = useState('engineering');

    // === Agent Playground State ===
    const [apTargetType, setApTargetType] = useState('agent');
    const [apSelectedSlug, setApSelectedSlug] = useState('');
    const [apInput, setApInput] = useState('{\n  "prompt": "Hello, how can you help me?"\n}');
    const [apUserRole, setApUserRole] = useState('viewer');
    const [apUserEmail, setApUserEmail] = useState('test@example.com');
    const [apDepartment, setApDepartment] = useState('engineering');
    const [apRunning, setApRunning] = useState(false);
    const [apResult, setApResult] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [agentRes, wfRes] = await Promise.allSettled([api.listAgents(), api.listWorkflows()]);
            if (agentRes.status === 'fulfilled') setAgents(agentRes.value.data || []);
            if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // === Policy Simulator ===
    const runSimulation = async () => {
        if (!selectedSlug) return alert('Select an agent or workflow to test');
        setSimulating(true); setResult(null); setExpandedPolicy(null);
        try {
            const payload = { userRole, userEmail, department, ...(targetType === 'agent' ? { agentSlug: selectedSlug } : { workflowSlug: selectedSlug }) };
            const res = await api.simulatePolicy(payload);
            setResult(res.data);
        } catch (err) { setResult({ error: err.message }); }
        finally { setSimulating(false); }
    };

    // === Agent Playground ===
    const runTestInvoke = async () => {
        if (!apSelectedSlug) return alert('Select an agent or workflow');
        let parsedInput;
        try {
            parsedInput = JSON.parse(apInput);
        } catch {
            return alert('Invalid JSON input. Please check your payload.');
        }
        setApRunning(true); setApResult(null);
        try {
            const payload = {
                input: parsedInput,
                userRole: apUserRole, userEmail: apUserEmail, department: apDepartment,
                ...(apTargetType === 'agent' ? { agentSlug: apSelectedSlug } : { workflowSlug: apSelectedSlug }),
            };
            const res = await api.testInvokeAgent(payload);
            setApResult(res.data);
        } catch (err) { setApResult({ error: err.message }); }
        finally { setApRunning(false); }
    };

    const simOptions = targetType === 'agent'
        ? agents.map(a => ({ value: a.slug, label: `${a.name} (${a.protocol})` }))
        : workflows.map(w => ({ value: w.slug, label: `${w.name} (${(w.agents || []).length} steps)` }));

    const apOptions = apTargetType === 'agent'
        ? agents.map(a => ({ value: a.slug, label: `${a.name} (${a.protocol})`, active: a.is_active }))
        : workflows.map(w => ({ value: w.slug, label: `${w.name}`, active: w.is_enabled }));

    const TABS = [
        { key: 'simulator', label: '🧪 Policy Simulator', icon: <HiBeaker /> },
        { key: 'agent', label: '🚀 Agent Playground', icon: <HiCommandLine /> },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {activeTab === 'simulator'
                        ? <><HiBeaker style={{ marginRight: 6, verticalAlign: 'middle' }} />Simulate policy evaluation against agents and workflows without invoking them</>
                        : <><HiCommandLine style={{ marginRight: 6, verticalAlign: 'middle' }} />Test agents with live invocation — checks status and policies before execution</>}
                </p>
                <button className="btn btn-secondary btn-sm" onClick={loadData}><HiArrowPath /> Refresh</button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {TABS.map(tab => (
                    <button key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ========== POLICY SIMULATOR TAB (unchanged) ========== */}
            {activeTab === 'simulator' && (<>
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>🧪 Simulation Setup</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        <div className="form-row" style={{ marginBottom: 16 }}>
                            <div className="form-group">
                                <label>Test Target</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${targetType === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('agent'); setSelectedSlug(''); }}>🤖 Agent</button>
                                    <button className={`btn btn-sm ${targetType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setTargetType('workflow'); setSelectedSlug(''); }}>🔗 Workflow</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>{targetType === 'agent' ? 'Select Agent' : 'Select Workflow'}</label>
                                <select className="form-select" value={selectedSlug} onChange={e => setSelectedSlug(e.target.value)}>
                                    <option value="">— Choose {targetType} —</option>
                                    {simOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Simulated User Context</label>
                            <div className="form-row">
                                <div className="form-group"><label>Role</label>
                                    <select className="form-select" value={userRole} onChange={e => setUserRole(e.target.value)}>
                                        <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option><option value="analyst">Analyst</option><option value="developer">Developer</option>
                                    </select>
                                </div>
                                <div className="form-group"><label>Email</label><input className="form-input" value={userEmail} onChange={e => setUserEmail(e.target.value)} /></div>
                                <div className="form-group"><label>Department</label>
                                    <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                                        <option value="engineering">Engineering</option><option value="finance">Finance</option><option value="research">Research</option>
                                        <option value="operations">Operations</option><option value="support">Support</option><option value="security">Security</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={runSimulation} disabled={simulating || !selectedSlug}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15 }}>
                            <HiPlay style={{ fontSize: 18 }} />{simulating ? 'Evaluating Policies...' : 'Run Simulation'}
                        </button>
                    </div>
                </div>

                {result && !result.error && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div className="card" style={{ border: result.decision.allowed ? '2px solid var(--success)' : '2px solid var(--danger)', background: result.decision.allowed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                                {result.decision.allowed ? <HiShieldCheck style={{ fontSize: 42, color: 'var(--success)' }} /> : <HiShieldExclamation style={{ fontSize: 42, color: 'var(--danger)' }} />}
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: result.decision.allowed ? 'var(--success)' : 'var(--danger)' }}>{result.decision.allowed ? '✅ ACCESS ALLOWED' : '🚫 ACCESS DENIED'}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{result.decision.reason}</div>
                                    {result.decision.matchedPolicy && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Matched: <strong>{result.decision.matchedPolicy.name}</strong></div>}
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header"><h3>Policy Evaluation Trace ({result.totalPoliciesChecked} policies checked)</h3></div>
                            {result.policyEvaluations && result.policyEvaluations.length > 0 ? (
                                <div>{result.policyEvaluations.map((ev, i) => (
                                    <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', background: ev.matched ? 'rgba(34,197,94,0.04)' : 'transparent', cursor: 'pointer' }}
                                        onClick={() => setExpandedPolicy(expandedPolicy === i ? null : i)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {expandedPolicy === i ? <HiChevronDown style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <HiChevronRight style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
                                            <span style={{ fontWeight: ev.matched ? 700 : 400, flex: 1 }}>{ev.policy.name}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Priority: {ev.policy.priority}</span>
                                            <span className={`badge ${ev.effect === 'allow' ? 'green' : 'red'}`}>{ev.effect}</span>
                                            {ev.matched ? <span className="badge green">✓ Matched</span> : <span className="badge gray">✗ No Match</span>}
                                        </div>
                                        {expandedPolicy === i && (
                                            <div style={{ marginTop: 12, marginLeft: 28 }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{ev.reason}</div>
                                                <ConditionDetail label="Subject Conditions (Who)" conditions={ev.subjectConditions} />
                                                <ConditionDetail label="Resource Conditions (What)" conditions={ev.resourceConditions} />
                                            </div>
                                        )}
                                    </div>
                                ))}</div>
                            ) : (<div className="empty-state"><div className="icon">📋</div><p>No policies evaluated — create policies first</p></div>)}
                        </div>
                        <div className="card">
                            <div className="card-header"><h3>Request Context (sent to policy engine)</h3></div>
                            <pre style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)', overflow: 'auto', maxHeight: 300, background: 'var(--bg-input)', borderRadius: 8, margin: 12 }}>
                                {JSON.stringify(result.context, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
                {result && result.error && (
                    <div className="card" style={{ border: '2px solid var(--danger)' }}>
                        <div className="empty-state"><div className="icon">❌</div><h4>Simulation Error</h4><p>{result.error}</p></div>
                    </div>
                )}
                {!result && agents.length === 0 && !loading && (
                    <div className="card"><div className="empty-state"><div className="icon">🤖</div><h4>No agents available</h4><p>Go to Agent Registry and seed sample agents first</p></div></div>
                )}
            </>)}

            {/* ========== AGENT PLAYGROUND TAB ========== */}
            {activeTab === 'agent' && (<>
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>🚀 Agent Execution Setup</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        {/* Target Selection */}
                        <div className="form-row" style={{ marginBottom: 16 }}>
                            <div className="form-group">
                                <label>Target Type</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={`btn btn-sm ${apTargetType === 'agent' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setApTargetType('agent'); setApSelectedSlug(''); }}>🤖 Agent</button>
                                    <button className={`btn btn-sm ${apTargetType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setApTargetType('workflow'); setApSelectedSlug(''); }}>🔗 Workflow</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Select {apTargetType === 'agent' ? 'Agent' : 'Workflow'}</label>
                                <select className="form-select" value={apSelectedSlug} onChange={e => setApSelectedSlug(e.target.value)}>
                                    <option value="">— Choose {apTargetType} —</option>
                                    {apOptions.map(o => (
                                        <option key={o.value} value={o.value}>
                                            {o.active === false ? '⚠️ ' : '✅ '}{o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* User Context */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>User Context (for policy evaluation)</label>
                            <div className="form-row">
                                <div className="form-group"><label>Role</label>
                                    <select className="form-select" value={apUserRole} onChange={e => setApUserRole(e.target.value)}>
                                        <option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option>
                                        <option value="super_admin">Super Admin</option><option value="analyst">Analyst</option><option value="developer">Developer</option>
                                    </select>
                                </div>
                                <div className="form-group"><label>Email</label><input className="form-input" value={apUserEmail} onChange={e => setApUserEmail(e.target.value)} /></div>
                                <div className="form-group"><label>Department</label>
                                    <select className="form-select" value={apDepartment} onChange={e => setApDepartment(e.target.value)}>
                                        <option value="engineering">Engineering</option><option value="finance">Finance</option><option value="research">Research</option>
                                        <option value="operations">Operations</option><option value="support">Support</option><option value="security">Security</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Request Input */}
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label>Request Payload (JSON)</label>
                            <textarea
                                className="form-input"
                                rows={6}
                                value={apInput}
                                onChange={e => setApInput(e.target.value)}
                                placeholder='{ "prompt": "Hello" }'
                                style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
                            />
                        </div>

                        {/* Execute Button */}
                        <button className="btn btn-primary" onClick={runTestInvoke} disabled={apRunning || !apSelectedSlug}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15 }}>
                            <HiBolt style={{ fontSize: 18 }} />
                            {apRunning ? 'Checking & Executing...' : '▶ Execute Agent'}
                        </button>
                    </div>
                </div>

                {/* Results */}
                {apResult && !apResult.error && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        {/* Agent Info */}
                        {apResult.agent && (
                            <div className="card" style={{ padding: '12px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 20 }}>🤖</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{apResult.agent.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{apResult.agent.slug} · {apResult.agent.protocol}</div>
                                    </div>
                                    {apResult.latencyMs != null && (
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                                            <HiClock /> {apResult.latencyMs}ms
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Pre-flight Checks */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <CheckBadge label="Status Check" check={apResult.checks?.status} />
                            <CheckBadge label="Policy Check" check={apResult.checks?.policy} />
                        </div>

                        {/* Response */}
                        {apResult.response != null && (
                            <div className="card">
                                <div className="card-header">
                                    <h3>{apResult.response?.error ? '❌ Agent Error' : '📨 Agent Response'}</h3>
                                </div>
                                <pre style={{
                                    padding: 16, fontSize: 12, color: apResult.response?.error ? 'var(--danger)' : 'var(--text-secondary)',
                                    overflow: 'auto', maxHeight: 400, background: 'var(--bg-input)', borderRadius: 8, margin: 12, lineHeight: 1.6,
                                }}>
                                    {typeof apResult.response === 'string' ? apResult.response : JSON.stringify(apResult.response, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Blocked Message */}
                        {apResult.response == null && (
                            <div className="card" style={{ border: '2px solid var(--danger)', background: 'rgba(239,68,68,0.04)' }}>
                                <div style={{ padding: '24px 20px', textAlign: 'center' }}>
                                    <HiShieldExclamation style={{ fontSize: 48, color: 'var(--danger)', marginBottom: 8 }} />
                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Execution Blocked</div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>
                                        Pre-flight checks failed. The agent was not invoked. Fix the issues above and try again.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {apResult && apResult.error && (
                    <div className="card" style={{ border: '2px solid var(--danger)' }}>
                        <div className="empty-state"><div className="icon">❌</div><h4>Execution Error</h4><p>{apResult.error}</p></div>
                    </div>
                )}

                {!apResult && agents.length === 0 && !loading && (
                    <div className="card"><div className="empty-state"><div className="icon">🤖</div><h4>No agents available</h4><p>Go to Agent Registry and seed sample agents first</p></div></div>
                )}
            </>)}


        </div>
    );
}
