import { useState, useEffect } from 'react';
import { HiPlus, HiTrash, HiPencil, HiArrowPath } from 'react-icons/hi2';
import api from '../api';

export default function Workflows() {
    const [workflows, setWorkflows] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSlug, setEditingSlug] = useState(null);
    const [showStepModal, setShowStepModal] = useState(null);
    const [form, setForm] = useState({ name: '', slug: '', maxConcurrent: 10, description: '' });
    const [stepForm, setStepForm] = useState({ agentId: '', stepOrder: 1 });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [wfRes, agentRes] = await Promise.allSettled([api.listWorkflows(), api.listAgents()]);
            if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data || []);
            if (agentRes.status === 'fulfilled') setAgents(agentRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditingSlug(null);
        setForm({ name: '', slug: '', maxConcurrent: 10, description: '' });
        setShowModal(true);
    };

    const openEdit = (wf) => {
        setEditingSlug(wf.slug);
        setForm({
            name: wf.name,
            slug: wf.slug,
            maxConcurrent: wf.max_concurrent || 10,
            description: wf.description || '',
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingSlug) {
                await api.updateWorkflow(editingSlug, {
                    name: form.name,
                    description: form.description,
                    maxConcurrent: form.maxConcurrent,
                });
            } else {
                await api.createWorkflow(form);
            }
            setShowModal(false);
            setEditingSlug(null);
            setForm({ name: '', slug: '', maxConcurrent: 10, description: '' });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleAddStep = async () => {
        setSaving(true);
        try {
            await api.addWorkflowStep(showStepModal, stepForm.agentId, stepForm.stepOrder);
            setShowStepModal(null);
            setStepForm({ agentId: '', stepOrder: 1 });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleRemoveStep = async (wfSlug, agentId) => {
        if (!confirm('Remove this step from the workflow?')) return;
        try { await api.removeWorkflowStep(wfSlug, agentId); await loadAll(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const handleToggle = async (wf) => {
        try { await api.toggleWorkflow(wf.slug, !wf.is_enabled); await loadAll(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const handleDelete = async (wf) => {
        if (!confirm(`Delete workflow "${wf.name}"?`)) return;
        try { await api.deleteWorkflow(wf.slug); await loadAll(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Orchestrate agents into multi-step workflows</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={loadAll}><HiArrowPath /> Refresh</button>
                    <button className="btn btn-primary btn-sm" onClick={openCreate}><HiPlus /> Create Workflow</button>
                </div>
            </div>

            {loading ? (
                <div className="card"><div className="empty-state"><div className="icon">⏳</div><h4>Loading workflows...</h4></div></div>
            ) : workflows.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="icon">🔗</div><h4>No workflows created</h4><p>Create a workflow, then add agent steps to build a pipeline</p></div></div>
            ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                    {workflows.map(wf => {
                        const wfAgents = (wf.agents || []).filter(a => a.agent_id);
                        return (
                            <div className="card" key={wf.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontWeight: 700, fontSize: 16 }}>{wf.name}</span>
                                        <span className={`badge ${wf.is_enabled ? 'green' : 'gray'}`}>{wf.is_enabled ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                            setShowStepModal(wf.slug);
                                            setStepForm({ agentId: '', stepOrder: (wfAgents.length || 0) + 1 });
                                        }}><HiPlus /> Add Step</button>
                                        <button className="btn-icon" style={{ color: 'var(--accent-primary)' }} onClick={() => openEdit(wf)} title="Edit workflow"><HiPencil /></button>
                                        <label className="toggle">
                                            <input type="checkbox" checked={wf.is_enabled} onChange={() => handleToggle(wf)} />
                                            <span className="toggle-slider" />
                                        </label>
                                        <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(wf)}><HiTrash /></button>
                                    </div>
                                </div>

                                {wfAgents.length > 0 ? (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {wfAgents.sort((a, b) => a.step_order - b.step_order).map((a, i) => (
                                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{
                                                    background: 'var(--accent-glow)', color: 'var(--accent-primary)',
                                                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                }}>
                                                    <span style={{
                                                        background: 'var(--accent-primary)', color: '#fff',
                                                        width: 20, height: 20, borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 11, fontWeight: 700,
                                                    }}>{a.step_order}</span>
                                                    {a.agent_name || a.agent_slug || 'Unknown'}
                                                    <button className="btn-icon" style={{ marginLeft: 4, color: 'var(--danger)', fontSize: 14, padding: 0, width: 'auto', height: 'auto' }}
                                                        onClick={() => handleRemoveStep(wf.slug, a.agent_id)} title="Remove step">✕</button>
                                                </span>
                                                {i < wfAgents.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                                        No agent steps — click "Add Step" to build the pipeline
                                    </div>
                                )}

                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                                    Slug: <code style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4 }}>{wf.slug}</code> · Max concurrent: {wf.max_concurrent} · {wfAgents.length} step{wfAgents.length !== 1 ? 's' : ''}
                                    {wf.description && <span> · {wf.description}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Workflow Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>{editingSlug ? '✏️ Edit Workflow' : '➕ Create Workflow'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Workflow Name</label>
                                <input className="form-input" value={form.name} placeholder="e.g. Research Pipeline"
                                    onChange={e => setForm({
                                        ...form,
                                        name: e.target.value,
                                        ...(!editingSlug ? { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}),
                                    })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Slug</label>
                                    <input className="form-input" value={form.slug} disabled={!!editingSlug}
                                        style={editingSlug ? { opacity: 0.5 } : {}}
                                        onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
                                <div className="form-group"><label>Max Concurrent</label>
                                    <input className="form-input" type="number" value={form.maxConcurrent}
                                        onChange={e => setForm({ ...form, maxConcurrent: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="form-group"><label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                                <input className="form-input" value={form.description} placeholder="Brief description of this workflow"
                                    onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                                {saving ? 'Saving...' : editingSlug ? 'Update Workflow' : 'Create Workflow'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Agent Step Modal */}
            {showStepModal && (
                <div className="modal-overlay" onClick={() => setShowStepModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Add Agent Step to <code style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4 }}>{showStepModal}</code></h3>
                            <button className="btn-icon" onClick={() => setShowStepModal(null)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Select Agent</label>
                                <select className="form-select" value={stepForm.agentId} onChange={e => setStepForm({ ...stepForm, agentId: e.target.value })}>
                                    <option value="">— Select Agent —</option>
                                    {agents.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} ({a.protocol}) — {a.vendor || 'internal'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Step Order</label>
                                <input className="form-input" type="number" min="1" value={stepForm.stepOrder}
                                    onChange={e => setStepForm({ ...stepForm, stepOrder: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowStepModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddStep} disabled={saving || !stepForm.agentId}>{saving ? 'Adding...' : 'Add Step'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
