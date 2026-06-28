import { useState, useEffect } from 'react';
import { HiPlus, HiArrowPath, HiTrash, HiPencil, HiXMark, HiCheck, HiServer, HiGlobeAlt, HiShieldCheck, HiClock, HiCpuChip, HiChevronRight, HiArrowLeft, HiSignal, HiLink, HiDocumentText, HiCog6Tooth } from 'react-icons/hi2';
import api from '../api';

const PROTOCOL_INFO = {
    rest: { label: 'REST', color: 'blue', icon: '🌐' },
    mcp: { label: 'MCP', color: 'purple', icon: '🔌' },
    a2a: { label: 'A2A', color: 'green', icon: '🤝' },
    grpc: { label: 'gRPC', color: 'yellow', icon: '⚡' },
};

const HEALTH_COLORS = { healthy: 'green', degraded: 'yellow', unhealthy: 'red', unknown: 'gray' };
const HEALTH_ICONS = { healthy: '🟢', degraded: '🟡', unhealthy: '🔴', unknown: '⚪' };

function formatDate(ts) {
    return ts ? new Date(ts).toLocaleString() : '—';
}

function InfoRow({ label, value, mono }) {
    return (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '10px 0' }}>
            <div style={{ width: 160, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3, paddingTop: 2 }}>{label}</div>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit', wordBreak: 'break-all' }}>
                {value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
            </div>
        </div>
    );
}

export default function Agents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const emptyForm = {
        name: '', slug: '', type: 'external', vendor: '', protocol: 'rest',
        endpointUrl: '', healthCheckUrl: '', description: '', version: '',
        capabilities: [], metadata: {},
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { loadAgents(); }, []);

    const loadAgents = async () => {
        setLoading(true);
        try {
            const res = await api.listAgents();
            const data = res.data;
            setAgents(Array.isArray(data) ? data : (data?.agents || []));
        } catch (err) { console.error('Failed to load agents:', err); }
        finally { setLoading(false); }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try { await api.seedAgents(); await loadAgents(); }
        catch (err) { alert('Error seeding: ' + err.message); }
        finally { setSeeding(false); }
    };

    const openRegisterModal = () => {
        setEditMode(false);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (agent) => {
        setEditMode(true);
        setForm({
            name: agent.name || '',
            slug: agent.slug || '',
            type: agent.type || 'external',
            vendor: agent.vendor || '',
            protocol: agent.protocol || 'rest',
            endpointUrl: agent.endpoint_url || '',
            healthCheckUrl: agent.health_check_url || '',
            description: agent.description || '',
            version: agent.version || '',
            capabilities: agent.capabilities || [],
            metadata: agent.metadata || {},
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editMode && selectedAgent) {
                await api.updateAgent(selectedAgent.slug, form);
                // Refresh the selected agent detail
                const res = await api.getAgent(form.slug || selectedAgent.slug);
                setSelectedAgent(res.data || res);
            } else {
                await api.createAgent(form);
            }
            setShowModal(false);
            setForm(emptyForm);
            await loadAgents();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleToggle = async (agent) => {
        try {
            await api.updateAgent(agent.slug, { isActive: !agent.is_active });
            await loadAgents();
            if (selectedAgent?.id === agent.id) {
                const res = await api.getAgent(agent.slug);
                setSelectedAgent(res.data || res);
            }
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleDelete = async (agent) => {
        if (!confirm(`Deactivate agent "${agent.name}"?`)) return;
        try {
            await api.deleteAgent(agent.slug);
            if (selectedAgent?.id === agent.id) setSelectedAgent(null);
            await loadAgents();
        } catch (err) { alert('Error: ' + err.message); }
    };

    const openDetail = async (agent) => {
        try {
            const res = await api.getAgent(agent.slug);
            setSelectedAgent(res.data || res);
        } catch (err) {
            setSelectedAgent(agent);
        }
    };

    // ─── Detail View ────────────────────────────
    if (selectedAgent) {
        const a = selectedAgent;
        const proto = PROTOCOL_INFO[a.protocol] || PROTOCOL_INFO.rest;
        return (
            <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedAgent(null)}>
                        <HiArrowLeft /> Back
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h2 style={{ margin: 0, fontSize: 20 }}>{a.name}</h2>
                            <span className={`badge ${a.is_active ? 'green' : 'gray'}`} style={{ fontSize: 10 }}>
                                {a.is_active ? '● Active' : '○ Inactive'}
                            </span>
                            <span className={`badge ${HEALTH_COLORS[a.health_status] || 'gray'}`} style={{ fontSize: 10 }}>
                                {HEALTH_ICONS[a.health_status]} {a.health_status}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                            <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{a.slug}</code>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span>{proto.icon} {proto.label}</span>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span>{a.type}</span>
                            {a.vendor && <><span style={{ margin: '0 8px' }}>•</span><span>{a.vendor}</span></>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openEditModal(a)}>
                            <HiPencil /> Edit Agent
                        </button>
                        <label className="toggle" style={{ margin: 0 }}>
                            <input type="checkbox" checked={a.is_active} onChange={() => handleToggle(a)} />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                {/* Detail cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* General Info */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HiServer style={{ color: 'var(--accent-primary)' }} /> General Information
                        </h3>
                        <InfoRow label="Name" value={a.name} />
                        <InfoRow label="Slug" value={a.slug} mono />
                        <InfoRow label="Type" value={
                            <span className={`badge ${a.type === 'external' ? 'blue' : 'gray'}`}>{a.type}</span>
                        } />
                        <InfoRow label="Vendor" value={a.vendor} />
                        <InfoRow label="Version" value={a.version} />
                        <InfoRow label="Created By" value={a.created_by} mono />
                    </div>

                    {/* Connectivity */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HiGlobeAlt style={{ color: 'var(--info)' }} /> Connectivity
                        </h3>
                        <InfoRow label="Protocol" value={
                            <span className={`badge ${proto.color}`}>{proto.icon} {proto.label}</span>
                        } />
                        <InfoRow label="Endpoint URL" value={a.endpoint_url} mono />
                        <InfoRow label="Health Check URL" value={a.health_check_url} mono />
                        <InfoRow label="Health Status" value={
                            <span className={`badge ${HEALTH_COLORS[a.health_status] || 'gray'}`}>
                                {HEALTH_ICONS[a.health_status]} {a.health_status}
                            </span>
                        } />
                        <InfoRow label="Last Health Check" value={formatDate(a.last_health_check)} />
                        <InfoRow label="Consecutive Failures" value={a.consecutive_failures || 0} />
                    </div>

                    {/* Description */}
                    <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HiDocumentText style={{ color: 'var(--warning)' }} /> Description
                        </h3>
                        <div style={{
                            fontSize: 13, color: a.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                            lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: a.description ? 'normal' : 'italic',
                            padding: 12, background: 'var(--bg-input)', borderRadius: 8, minHeight: 60,
                        }}>
                            {a.description || 'No description provided. Click "Edit Agent" to add one.'}
                        </div>
                    </div>

                    {/* Auth Config */}
                    {a.auth_config && Object.keys(a.auth_config).length > 0 && (
                        <div className="card" style={{ padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <HiShieldCheck style={{ color: 'var(--success)' }} /> Auth Configuration
                            </h3>
                            <pre style={{
                                padding: 12, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12,
                                margin: 0, overflow: 'auto', maxHeight: 200, lineHeight: 1.5,
                            }}>
                                {JSON.stringify(a.auth_config, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Capabilities */}
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HiCpuChip style={{ color: 'var(--accent-primary)' }} /> Capabilities
                        </h3>
                        {(!a.capabilities || a.capabilities.length === 0) ? (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No capabilities defined</div>
                        ) : (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {a.capabilities.map((cap, i) => (
                                    <span key={i} className="badge blue" style={{ fontSize: 11 }}>
                                        {typeof cap === 'string' ? cap : cap.name || JSON.stringify(cap)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                        <div className="card" style={{ padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <HiCog6Tooth style={{ color: 'var(--text-muted)' }} /> Metadata
                            </h3>
                            <pre style={{
                                padding: 12, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12,
                                margin: 0, overflow: 'auto', maxHeight: 200, lineHeight: 1.5,
                            }}>
                                {JSON.stringify(a.metadata, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="card" style={{ padding: 20, gridColumn: '1 / -1' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HiClock style={{ color: 'var(--text-muted)' }} /> Timestamps
                        </h3>
                        <div style={{ display: 'flex', gap: 40 }}>
                            <InfoRow label="Created At" value={formatDate(a.created_at)} />
                            <InfoRow label="Updated At" value={formatDate(a.updated_at)} />
                        </div>
                    </div>
                </div>

                {/* Render the modal if editing */}
                {showModal && renderModal()}
            </div>
        );
    }

    // ─── List View ──────────────────────────────
    function renderModal() {
        return (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
                    <div className="modal-header">
                        <h3>{editMode ? 'Edit Agent' : 'Register New Agent'}</h3>
                        <button className="btn-icon" onClick={() => setShowModal(false)}><HiXMark /></button>
                    </div>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group"><label>Agent Name</label>
                                <input className="form-input" placeholder="My Agent" value={form.name}
                                    onChange={e => setForm({
                                        ...form, name: e.target.value,
                                        ...(editMode ? {} : { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }),
                                    })} />
                            </div>
                            <div className="form-group"><label>Slug</label>
                                <input className="form-input" placeholder="my-agent" value={form.slug}
                                    disabled={editMode}
                                    style={editMode ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    onChange={e => setForm({ ...form, slug: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Type</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="external">External</option><option value="internal">Internal</option>
                                </select>
                            </div>
                            <div className="form-group"><label>Protocol</label>
                                <select className="form-select" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}>
                                    <option value="rest">REST</option><option value="mcp">MCP</option>
                                    <option value="a2a">A2A</option><option value="grpc">gRPC</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Vendor</label>
                                <input className="form-input" placeholder="OpenAI, Anthropic, etc." value={form.vendor}
                                    onChange={e => setForm({ ...form, vendor: e.target.value })} />
                            </div>
                            <div className="form-group"><label>Version</label>
                                <input className="form-input" placeholder="v1.0.0" value={form.version}
                                    onChange={e => setForm({ ...form, version: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group"><label>Endpoint URL</label>
                            <input className="form-input" placeholder="https://api.example.com/agent" value={form.endpointUrl}
                                onChange={e => setForm({ ...form, endpointUrl: e.target.value })} />
                        </div>
                        <div className="form-group"><label>Health Check URL <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span></label>
                            <input className="form-input" placeholder="https://api.example.com/health" value={form.healthCheckUrl}
                                onChange={e => setForm({ ...form, healthCheckUrl: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Description <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span></label>
                            <textarea className="form-input" rows={4}
                                placeholder="Describe what this agent does, its capabilities, use cases, and any important notes for operators..."
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                style={{ resize: 'vertical', minHeight: 80 }} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.endpointUrl}>
                            {saving ? 'Saving...' : editMode ? 'Save Changes' : 'Register Agent'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Register and manage external and internal agents</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleSeed} disabled={seeding}>
                        {seeding ? '⏳ Seeding...' : '🌱 Seed Sample Agents'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={loadAgents}><HiArrowPath /> Refresh</button>
                    <button className="btn btn-primary btn-sm" onClick={openRegisterModal}><HiPlus /> Register Agent</button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="icon">⏳</div><h4>Loading agents...</h4></div>
                ) : agents.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">🤖</div>
                        <h4>No agents registered yet</h4>
                        <p>Click "Register Agent" to add your first agent</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Agent</th><th>Type</th><th>Vendor</th><th>Protocol</th>
                                <th>Health</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => {
                                const proto = PROTOCOL_INFO[agent.protocol] || PROTOCOL_INFO.rest;
                                return (
                                    <tr key={agent.id} onClick={() => openDetail(agent)}
                                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>{agent.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agent.slug}</div>
                                                    {agent.description && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {agent.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <HiChevronRight style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }} />
                                            </div>
                                        </td>
                                        <td><span className={`badge ${agent.type === 'external' ? 'blue' : 'gray'}`}>{agent.type}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{agent.vendor || '—'}</td>
                                        <td>
                                            <span className={`badge ${proto.color}`} style={{ fontSize: 10 }}>
                                                {proto.icon} {proto.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${HEALTH_COLORS[agent.health_status] || 'gray'}`}>
                                                <span className={`badge-dot ${HEALTH_COLORS[agent.health_status] || 'gray'}`} /> {agent.health_status}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <label className="toggle">
                                                <input type="checkbox" checked={agent.is_active} onChange={() => handleToggle(agent)} />
                                                <span className="toggle-slider" />
                                            </label>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" title="Edit" onClick={() => { setSelectedAgent(agent); openEditModal(agent); }}><HiPencil /></button>
                                                <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(agent)}><HiTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && renderModal()}
        </div>
    );
}
