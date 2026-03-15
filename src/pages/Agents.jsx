import { useState, useEffect } from 'react';
import { HiPlus, HiArrowPath, HiTrash, HiPencil, HiArrowDownTray } from 'react-icons/hi2';
import api from '../api';

export default function Agents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', slug: '', type: 'external', vendor: '', protocol: 'rest', endpointUrl: '', healthCheckUrl: '' });
    const [saving, setSaving] = useState(false);

    const [seeding, setSeeding] = useState(false);

    useEffect(() => { loadAgents(); }, []);

    const loadAgents = async () => {
        setLoading(true);
        try {
            const res = await api.listAgents();
            setAgents(res.data || []);
        } catch (err) {
            console.error('Failed to load agents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        setSeeding(true);
        try {
            await api.seedAgents();
            await loadAgents();
        } catch (err) { alert('Error seeding: ' + err.message); }
        finally { setSeeding(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.createAgent(form);
            setShowModal(false);
            setForm({ name: '', slug: '', type: 'external', vendor: '', protocol: 'rest', endpointUrl: '', healthCheckUrl: '' });
            await loadAgents();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (agent) => {
        try {
            await api.updateAgent(agent.slug, { isActive: !agent.is_active });
            await loadAgents();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDelete = async (agent) => {
        if (!confirm(`Deactivate agent "${agent.name}"?`)) return;
        try {
            await api.deleteAgent(agent.slug);
            await loadAgents();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const healthColor = { healthy: 'green', degraded: 'yellow', unhealthy: 'red', unknown: 'gray' };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Register and manage external and internal agents</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleSeed} disabled={seeding}>
                        {seeding ? '⏳ Seeding...' : '🌱 Seed Sample Agents'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={loadAgents}><HiArrowPath /> Refresh</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiPlus /> Register Agent</button>
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
                            <tr><th>Agent</th><th>Type</th><th>Vendor</th><th>Protocol</th><th>Health</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {agents.map(agent => (
                                <tr key={agent.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{agent.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agent.slug}</div>
                                    </td>
                                    <td><span className={`badge ${agent.type === 'external' ? 'blue' : 'gray'}`}>{agent.type}</span></td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{agent.vendor || '—'}</td>
                                    <td><code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{agent.protocol}</code></td>
                                    <td><span className={`badge ${healthColor[agent.health_status] || 'gray'}`}><span className={`badge-dot ${healthColor[agent.health_status] || 'gray'}`} /> {agent.health_status}</span></td>
                                    <td>
                                        <label className="toggle">
                                            <input type="checkbox" checked={agent.is_active} onChange={() => handleToggle(agent)} />
                                            <span className="toggle-slider" />
                                        </label>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn-icon" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(agent)}><HiTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Register New Agent</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label>Agent Name</label>
                                    <input className="form-input" placeholder="My Agent" value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></div>
                                <div className="form-group"><label>Slug</label>
                                    <input className="form-input" placeholder="my-agent" value={form.slug}
                                        onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Type</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="external">External</option><option value="internal">Internal</option>
                                    </select></div>
                                <div className="form-group"><label>Protocol</label>
                                    <select className="form-select" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}>
                                        <option value="rest">REST</option><option value="mcp">MCP</option><option value="a2a">A2A</option><option value="grpc">gRPC</option>
                                    </select></div>
                            </div>
                            <div className="form-group"><label>Vendor</label>
                                <input className="form-input" placeholder="OpenAI, Anthropic, etc." value={form.vendor}
                                    onChange={e => setForm({ ...form, vendor: e.target.value })} /></div>
                            <div className="form-group"><label>Endpoint URL</label>
                                <input className="form-input" placeholder="https://api.example.com/agent" value={form.endpointUrl}
                                    onChange={e => setForm({ ...form, endpointUrl: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.endpointUrl}>
                                {saving ? 'Saving...' : 'Register Agent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
