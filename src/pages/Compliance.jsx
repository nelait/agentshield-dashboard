import { useState, useEffect } from 'react';
import { HiPlus, HiExclamationTriangle, HiDocumentText, HiPlay, HiArrowUpTray, HiChevronDown, HiChevronUp, HiCheckCircle, HiXCircle, HiExclamationCircle } from 'react-icons/hi2';
import api from '../api';

export default function Compliance() {
    const [configs, setConfigs] = useState([]);
    const [samples, setSamples] = useState([]);
    const [stats, setStats] = useState({});
    const [agents, setAgents] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', framework: 'sox', sampleRate: 10, retentionDays: 2190, appliesTo: { agents: [], workflows: [] } });
    const [saving, setSaving] = useState(false);

    // Check state
    const [runningCheckId, setRunningCheckId] = useState(null);
    const [checkResults, setCheckResults] = useState({}); // configId -> result
    const [expandedConfig, setExpandedConfig] = useState(null);
    const [expandedRules, setExpandedRules] = useState({});

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadConfigId, setUploadConfigId] = useState(null);
    const [uploadText, setUploadText] = useState('');
    const [uploading, setUploading] = useState(false);

    // History state
    const [checkHistory, setCheckHistory] = useState([]);
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [configRes, sampleRes, statsRes, agentRes, wfRes, historyRes] = await Promise.allSettled([
                api.listComplianceConfigs(), api.listSamples(), api.getComplianceStats(),
                api.listAgents(), api.listWorkflows(), api.getComplianceHistory(),
            ]);
            if (configRes.status === 'fulfilled') setConfigs(configRes.value.data || []);
            if (sampleRes.status === 'fulfilled') setSamples(sampleRes.value.data || []);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
            if (agentRes.status === 'fulfilled') setAgents(agentRes.value.data || []);
            if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data || []);
            if (historyRes.status === 'fulfilled') setCheckHistory(historyRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.createComplianceConfig({
                name: form.name,
                framework: form.framework,
                sampleRate: form.sampleRate / 100,
                retentionDays: form.retentionDays,
                appliesTo: form.appliesTo,
            });
            setShowModal(false);
            setForm({ name: '', framework: 'sox', sampleRate: 10, retentionDays: 2190, appliesTo: { agents: [], workflows: [] } });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleRunCheck = async (configId) => {
        setRunningCheckId(configId);
        try {
            const res = await api.runComplianceCheck(configId);
            setCheckResults(prev => ({ ...prev, [configId]: res.data }));
            setExpandedConfig(configId);
        } catch (err) { alert('Check failed: ' + err.message); }
        finally { setRunningCheckId(null); }
    };

    const handleUploadAndRun = async () => {
        setUploading(true);
        try {
            let samples;
            try {
                samples = JSON.parse(uploadText);
                if (!Array.isArray(samples)) samples = [samples];
            } catch {
                alert('Invalid JSON. Please provide an array of sample objects.');
                setUploading(false);
                return;
            }
            const res = await api.uploadComplianceSamples(uploadConfigId, samples);
            setCheckResults(prev => ({ ...prev, [uploadConfigId]: res.data }));
            setExpandedConfig(uploadConfigId);
            setShowUploadModal(false);
            setUploadText('');
        } catch (err) { alert('Upload failed: ' + err.message); }
        finally { setUploading(false); }
    };

    const loadChecks = async (configId) => {
        try {
            const res = await api.getComplianceChecks(configId);
            if (res.data && res.data.length > 0) {
                const latest = res.data[0];
                setCheckResults(prev => ({ ...prev, [configId]: { ...latest, results: latest.results || [], samplesUsed: latest.samples_used || [] } }));
            }
        } catch (err) { console.error(err); }
    };

    const toggleAgent = (agentId) => {
        setForm(prev => {
            const current = prev.appliesTo.agents || [];
            const updated = current.includes(agentId) ? current.filter(a => a !== agentId) : [...current, agentId];
            return { ...prev, appliesTo: { ...prev.appliesTo, agents: updated } };
        });
    };

    const toggleWorkflow = (wfId) => {
        setForm(prev => {
            const current = prev.appliesTo.workflows || [];
            const updated = current.includes(wfId) ? current.filter(w => w !== wfId) : [...current, wfId];
            return { ...prev, appliesTo: { ...prev.appliesTo, workflows: updated } };
        });
    };

    const getStatusBadge = (status) => {
        if (status === 'passed') return <span className="badge green"><HiCheckCircle style={{ fontSize: 12 }} /> PASSED</span>;
        if (status === 'failed') return <span className="badge red"><HiXCircle style={{ fontSize: 12 }} /> FAILED</span>;
        if (status === 'partial') return <span className="badge yellow"><HiExclamationCircle style={{ fontSize: 12 }} /> PARTIAL</span>;
        return <span className="badge blue">RUNNING</span>;
    };

    const getSeverityBadge = (severity) => {
        if (severity === 'critical') return <span className="badge red">CRITICAL</span>;
        if (severity === 'high') return <span className="badge yellow">HIGH</span>;
        return <span className="badge blue">MEDIUM</span>;
    };

    const getTargetNames = (config) => {
        const appliesTo = config.applies_to || {};
        const names = [];
        if (appliesTo.agents?.length) {
            appliesTo.agents.forEach(aId => {
                const agent = agents.find(a => a.id === aId);
                if (agent) names.push(agent.name);
            });
        }
        if (appliesTo.workflows?.length) {
            appliesTo.workflows.forEach(wId => {
                const wf = workflows.find(w => w.id === wId);
                if (wf) names.push(`WF: ${wf.name}`);
            });
        }
        return names.length > 0 ? names.join(', ') : 'All agents';
    };

    if (loading) return <div className="empty-state"><div className="icon">⏳</div><h4>Loading compliance data...</h4></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Monitor SOX/HIPAA/GDPR/PCI compliance with automated sampling & checks</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiPlus /> Add Config</button>
            </div>

            {/* Stats */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon info"><HiDocumentText /></div>
                    <div className="stat-content"><h4>Total Samples</h4><div className="value">{stats.total_samples || 0}</div><div className="sub">{stats.samples_last_24h || 0} last 24h</div></div></div>
                <div className="stat-card"><div className="stat-icon danger"><HiExclamationTriangle /></div>
                    <div className="stat-content"><h4>Flagged</h4><div className="value">{stats.flagged_count || 0}</div><div className="sub">{stats.pii_detected_count || 0} with PII detected</div></div></div>
            </div>

            {/* Configs with Run Check */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3>Compliance Configurations</h3></div>
                {configs.length === 0 ? (
                    <div className="empty-state"><div className="icon">📋</div><h4>No compliance configs</h4><p>Add a sampling configuration to start auditing agents</p></div>
                ) : (
                    <div>
                        {configs.map(c => (
                            <div key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className="badge blue">{(c.framework || '').toUpperCase()}</span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Rate: {(parseFloat(c.sample_rate) * 100).toFixed(0)}%</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Retention: {Math.round(c.retention_days / 365)}y</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Target: {getTargetNames(c)}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {checkResults[c.id] && getStatusBadge(checkResults[c.id].status)}
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleRunCheck(c.id)}
                                            disabled={runningCheckId === c.id}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <HiPlay /> {runningCheckId === c.id ? 'Running...' : 'Run Check'}
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => { setUploadConfigId(c.id); setShowUploadModal(true); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <HiArrowUpTray /> Upload
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => {
                                                if (expandedConfig === c.id) { setExpandedConfig(null); }
                                                else { setExpandedConfig(c.id); if (!checkResults[c.id]) loadChecks(c.id); }
                                            }}
                                        >
                                            {expandedConfig === c.id ? <HiChevronUp /> : <HiChevronDown />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Check Results */}
                                {expandedConfig === c.id && checkResults[c.id] && (
                                    <div style={{ padding: '0 16px 16px', background: 'var(--bg-card)' }}>
                                        <div style={{
                                            padding: '16px',
                                            borderRadius: 8,
                                            background: checkResults[c.id].status === 'passed' ? 'rgba(16,185,129,0.1)' : checkResults[c.id].status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                            border: `1px solid ${checkResults[c.id].status === 'passed' ? 'rgba(16,185,129,0.3)' : checkResults[c.id].status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                            marginBottom: 16,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <h4 style={{ margin: 0 }}>
                                                    {checkResults[c.id].status === 'passed' ? '✅' : checkResults[c.id].status === 'failed' ? '❌' : '⚠️'}
                                                    {' '}Compliance Check — {(c.framework || '').toUpperCase()}
                                                </h4>
                                                {getStatusBadge(checkResults[c.id].status)}
                                            </div>
                                            <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                                                <span><strong>{checkResults[c.id].passedRules || checkResults[c.id].passed_rules || 0}</strong> passed</span>
                                                <span><strong>{checkResults[c.id].failedRules || checkResults[c.id].failed_rules || 0}</strong> failed</span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {checkResults[c.id].totalRules || checkResults[c.id].total_rules || 0} total rules
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    Source: {checkResults[c.id].sampleSource || checkResults[c.id].sample_source || 'generated'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Per-rule results */}
                                        <table className="data-table">
                                            <thead><tr><th>Rule</th><th>Category</th><th>Severity</th><th>Result</th><th>Details</th></tr></thead>
                                            <tbody>
                                                {(checkResults[c.id].results || []).map((r, idx) => (
                                                    <tr key={idx} onClick={() => setExpandedRules(prev => ({ ...prev, [`${c.id}-${idx}`]: !prev[`${c.id}-${idx}`] }))} style={{ cursor: 'pointer' }}>
                                                        <td style={{ fontWeight: 600 }}>{r.ruleName}</td>
                                                        <td><span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.category}</span></td>
                                                        <td>{getSeverityBadge(r.severity)}</td>
                                                        <td>{r.passed ? <span className="badge green"><HiCheckCircle style={{ fontSize: 12 }} /> Pass</span> : <span className="badge red"><HiXCircle style={{ fontSize: 12 }} /> Fail</span>}</td>
                                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300 }}>{r.details}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Samples Used — with agent invocation details */}
                                        {(checkResults[c.id].samplesUsed || checkResults[c.id].samples_used || []).length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <h4 style={{ marginBottom: 8, fontSize: 14 }}>
                                                    📝 Agent Invocation Results ({(checkResults[c.id].samplesUsed || checkResults[c.id].samples_used).length} samples)
                                                    {checkResults[c.id].agentReachable !== undefined && (
                                                        <span style={{ marginLeft: 12, fontWeight: 400 }}>
                                                            {checkResults[c.id].agentReachable
                                                                ? <span className="badge green">🟢 Agent Reachable</span>
                                                                : <span className="badge red">🔴 Agent Unreachable</span>
                                                            }
                                                        </span>
                                                    )}
                                                </h4>
                                                <div style={{ maxHeight: 400, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                                    {(checkResults[c.id].samplesUsed || checkResults[c.id].samples_used).map((s, i) => (
                                                        <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                                                            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span className="badge blue">{s.context || 'general'}</span>
                                                                {s.connectionSuccess !== undefined && (
                                                                    s.connectionSuccess
                                                                        ? <span className="badge green">✓ Connected</span>
                                                                        : <span className="badge red">✗ Failed</span>
                                                                )}
                                                                {s.latencyMs && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.latencyMs}ms</span>}
                                                                {s.statusCode > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>HTTP {s.statusCode}</span>}
                                                                {s.agentEndpoint && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→ {s.agentEndpoint}</span>}
                                                            </div>
                                                            {/* Input */}
                                                            <div style={{ marginBottom: 4 }}>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>INPUT:</span>
                                                                <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'block', marginTop: 2 }}>
                                                                    {(s.input || '').substring(0, 200)}{(s.input || '').length > 200 ? '...' : ''}
                                                                </code>
                                                            </div>
                                                            {/* Response */}
                                                            {s.responseText && (
                                                                <div>
                                                                    <span style={{ color: s.connectionSuccess ? 'var(--color-success)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                                                                        {s.connectionSuccess ? 'AGENT RESPONSE:' : 'ERROR:'}
                                                                    </span>
                                                                    <code style={{
                                                                        background: s.connectionSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                        padding: '2px 6px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'block', marginTop: 2,
                                                                        border: `1px solid ${s.connectionSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                                    }}>
                                                                        {(s.responseText || '').substring(0, 300)}{(s.responseText || '').length > 300 ? '...' : ''}
                                                                    </code>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Samples */}
            <div className="card">
                <div className="card-header"><h3>Recent Samples</h3></div>
                {samples.length === 0 ? (
                    <div className="empty-state"><div className="icon">🔍</div><h4>No samples yet</h4><p>Samples appear when agents are invoked through the gateway</p></div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>Trace ID</th><th>Agent</th><th>PII</th><th>Flagged</th><th>Time</th></tr></thead>
                        <tbody>
                            {samples.map(s => (
                                <tr key={s.id}>
                                    <td><code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{s.trace_id}</code></td>
                                    <td>{s.agent_name || s.agent_id}</td>
                                    <td>{s.pii_detected ? <span className="badge red">{(s.pii_types || []).join(', ')}</span> : <span className="badge green">Clean</span>}</td>
                                    <td>{s.flagged ? <span className="badge red"><HiExclamationTriangle style={{ fontSize: 12 }} /> Flagged</span> : <span className="badge green">OK</span>}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{new Date(s.sampled_at).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Compliance Check History */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header"><h3>📜 Compliance Check History</h3></div>
                {checkHistory.length === 0 ? (
                    <div className="empty-state"><div className="icon">📋</div><h4>No checks run yet</h4><p>Run a compliance check from a config above to see history</p></div>
                ) : (
                    <div>
                        {checkHistory.map(h => {
                            const results = typeof h.results === 'string' ? JSON.parse(h.results) : (h.results || []);
                            const isExpanded = expandedHistoryId === h.id;
                            return (
                                <div key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <div
                                        style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12, cursor: 'pointer' }}
                                        onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{h.config_name || 'Unknown Config'}</div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span className="badge blue">{(h.framework || '').toUpperCase()}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(h.started_at).toLocaleString()}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Source: {h.sample_source || 'generated'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: 13 }}><strong>{h.passed_rules || 0}</strong> passed</span>
                                            <span style={{ fontSize: 13 }}><strong>{h.failed_rules || 0}</strong> failed</span>
                                            {getStatusBadge(h.status)}
                                            {isExpanded ? <HiChevronUp /> : <HiChevronDown />}
                                        </div>
                                    </div>
                                    {isExpanded && results.length > 0 && (
                                        <div style={{ padding: '0 16px 12px' }}>
                                            <table className="data-table">
                                                <thead><tr><th>Rule</th><th>Severity</th><th>Result</th><th>Details</th></tr></thead>
                                                <tbody>
                                                    {results.map((r, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: 600 }}>{r.ruleName}</td>
                                                            <td>{getSeverityBadge(r.severity)}</td>
                                                            <td>{r.passed ? <span className="badge green"><HiCheckCircle style={{ fontSize: 12 }} /> Pass</span> : <span className="badge red"><HiXCircle style={{ fontSize: 12 }} /> Fail</span>}</td>
                                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 350 }}>{r.details}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Config Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>New Compliance Config</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Config Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. SOX Check - Financial Agents" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Framework</label>
                                    <select className="form-select" value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })}>
                                        <option value="sox">SOX</option><option value="hipaa">HIPAA</option><option value="gdpr">GDPR</option><option value="pci_dss">PCI-DSS</option><option value="custom">Custom</option>
                                    </select></div>
                                <div className="form-group"><label>Sample Rate (%)</label><input className="form-input" type="number" min="1" max="100" value={form.sampleRate} onChange={e => setForm({ ...form, sampleRate: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="form-group"><label>Retention (days)</label><input className="form-input" type="number" value={form.retentionDays} onChange={e => setForm({ ...form, retentionDays: parseInt(e.target.value) })} /></div>

                            {/* Agent Picker */}
                            <div className="form-group">
                                <label>Target Agents <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(leave empty for all)</span></label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8, minHeight: 40, background: 'var(--bg-input)' }}>
                                    {agents.length === 0 ? (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No agents registered</span>
                                    ) : agents.map(a => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            onClick={() => toggleAgent(a.id)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: form.appliesTo.agents.includes(a.id) ? 'var(--color-primary)' : 'var(--border-color)',
                                                background: form.appliesTo.agents.includes(a.id) ? 'var(--color-primary)' : 'transparent',
                                                color: form.appliesTo.agents.includes(a.id) ? 'white' : 'var(--text-primary)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {form.appliesTo.agents.includes(a.id) ? '✓ ' : ''}{a.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Workflow Picker */}
                            <div className="form-group">
                                <label>Target Workflows <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(leave empty for all)</span></label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, border: '1px solid var(--border-color)', borderRadius: 8, minHeight: 40, background: 'var(--bg-input)' }}>
                                    {workflows.length === 0 ? (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No workflows created</span>
                                    ) : workflows.map(w => (
                                        <button
                                            key={w.id}
                                            type="button"
                                            onClick={() => toggleWorkflow(w.id)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 16, fontSize: 12, cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: form.appliesTo.workflows.includes(w.id) ? 'var(--color-primary)' : 'var(--border-color)',
                                                background: form.appliesTo.workflows.includes(w.id) ? 'var(--color-primary)' : 'transparent',
                                                color: form.appliesTo.workflows.includes(w.id) ? 'white' : 'var(--text-primary)',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {form.appliesTo.workflows.includes(w.id) ? '✓ ' : ''}{w.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Samples Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>Upload Custom Samples</h3><button className="btn-icon" onClick={() => setShowUploadModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                                Paste JSON array of sample inputs to test against the compliance framework. Each sample should have an <code>input</code> and optional <code>context</code> field.
                            </p>
                            <textarea
                                className="form-input"
                                rows={10}
                                value={uploadText}
                                onChange={e => setUploadText(e.target.value)}
                                placeholder={`[\n  { "input": "Process payment of $5000 for account SSN 123-45-6789", "context": "financial_transaction", "description": "Payment with PII" },\n  { "input": "Summarize quarterly earnings", "context": "reporting", "description": "Clean financial query" }\n]`}
                                style={{ fontFamily: 'monospace', fontSize: 13 }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleUploadAndRun} disabled={uploading || !uploadText.trim()}>
                                {uploading ? 'Running...' : '🚀 Upload & Run Check'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
