import { useState, useEffect } from 'react';
import { HiPlus, HiTrash, HiPencil, HiShieldCheck } from 'react-icons/hi2';
import api from '../api';

const OPS = [
    { value: 'eq', label: 'Equals' }, { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'In List' }, { value: 'contains', label: 'Contains' },
    { value: 'gt', label: 'Greater Than' }, { value: 'lt', label: 'Less Than' },
    { value: 'between', label: 'Between' }, { value: 'exists', label: 'Exists' },
];

const EMPTY_FORM = {
    name: '', effect: 'allow', priority: 100,
    subjects: [{ field: 'role', op: 'eq', value: '' }],
    resources: [{ field: 'slug', op: 'eq', value: '' }],
    conditions: [],
};

export default function Policies() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadPolicies(); }, []);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const res = await api.listPolicies();
            setPolicies(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    const openEdit = (p) => {
        const rules = p.rules_json || {};
        setEditingId(p.id);
        setForm({
            name: p.name,
            effect: rules.effect || 'allow',
            priority: p.priority,
            subjects: rules.subjects && rules.subjects.length > 0 ? rules.subjects : [{ field: '', op: 'eq', value: '' }],
            resources: rules.resources && rules.resources.length > 0 ? rules.resources : [{ field: '', op: 'eq', value: '' }],
            conditions: rules.conditions || [],
        });
        setShowModal(true);
    };

    const addCondition = (type) => {
        const updated = { ...form };
        updated[type] = [...updated[type], { field: '', op: 'eq', value: '' }];
        setForm(updated);
    };

    const updateCondition = (type, idx, key, val) => {
        const updated = { ...form };
        updated[type] = updated[type].map((c, i) => i === idx ? { ...c, [key]: val } : c);
        setForm(updated);
    };

    const removeCondition = (type, idx) => {
        const updated = { ...form };
        updated[type] = updated[type].filter((_, i) => i !== idx);
        setForm(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: form.name, policyType: 'access_control', priority: form.priority,
                rulesJson: { effect: form.effect, subjects: form.subjects, resources: form.resources, conditions: form.conditions },
            };
            if (editingId) {
                await api.updatePolicy(editingId, payload);
            } else {
                await api.createPolicy(payload);
            }
            setShowModal(false);
            setEditingId(null);
            setForm({ ...EMPTY_FORM });
            await loadPolicies();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this policy?')) return;
        try { await api.deletePolicy(id); await loadPolicies(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const handleToggle = async (p) => {
        try { await api.updatePolicy(p.id, { isActive: !p.is_active }); await loadPolicies(); }
        catch (err) { alert('Error: ' + err.message); }
    };

    const renderConditionRow = (type, label) => (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
                <button className="btn btn-secondary btn-sm" onClick={() => addCondition(type)}>+ Add</button>
            </div>
            {form[type].map((cond, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 32px', gap: 8, marginBottom: 6 }}>
                    <input className="form-input" placeholder="field" value={cond.field}
                        onChange={e => updateCondition(type, i, 'field', e.target.value)} style={{ padding: '6px 10px', fontSize: 13 }} />
                    <select className="form-select" value={cond.op}
                        onChange={e => updateCondition(type, i, 'op', e.target.value)} style={{ padding: '6px 10px', fontSize: 13 }}>
                        {OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input className="form-input" placeholder="value" value={cond.value}
                        onChange={e => updateCondition(type, i, 'value', e.target.value)} style={{ padding: '6px 10px', fontSize: 13 }} />
                    <button className="btn-icon" onClick={() => removeCondition(type, i)} style={{ color: 'var(--danger)' }}>✕</button>
                </div>
            ))}
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Define who can access which agents and workflows</p>
                <button className="btn btn-primary btn-sm" onClick={openCreate}><HiPlus /> Create Policy</button>
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="icon">⏳</div><h4>Loading policies...</h4></div>
                ) : policies.length === 0 ? (
                    <div className="empty-state"><div className="icon">🛡️</div><h4>No policies defined</h4><p>Create your first access control policy</p></div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>Policy</th><th>Effect</th><th>Priority</th><th>Rules</th><th>Active</th><th>Actions</th></tr></thead>
                        <tbody>
                            {policies.map(p => {
                                const rules = p.rules_json || {};
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <HiShieldCheck style={{ color: rules.effect === 'allow' ? 'var(--success)' : 'var(--danger)' }} />
                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td><span className={`badge ${rules.effect === 'allow' ? 'green' : 'red'}`}>{rules.effect}</span></td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{p.priority}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {(rules.subjects?.length || 0)} subjects, {(rules.resources?.length || 0)} resources
                                        </td>
                                        <td>
                                            <label className="toggle">
                                                <input type="checkbox" checked={p.is_active} onChange={() => handleToggle(p)} />
                                                <span className="toggle-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" style={{ color: 'var(--accent-primary)' }} onClick={() => openEdit(p)} title="Edit"><HiPencil /></button>
                                                <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)} title="Delete"><HiTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="modal-header"><h3>{editingId ? '✏️ Edit Policy' : '➕ Create Access Policy'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label>Policy Name</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Financial Analysts Only" /></div>
                                <div className="form-group"><label>Effect</label>
                                    <select className="form-select" value={form.effect} onChange={e => setForm({ ...form, effect: e.target.value })}>
                                        <option value="allow">✅ Allow</option><option value="deny">🚫 Deny</option>
                                    </select></div>
                            </div>
                            <div className="form-group"><label>Priority (lower = evaluated first)</label>
                                <input className="form-input" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} /></div>
                            {renderConditionRow('subjects', 'Subject Conditions (Who)')}
                            {renderConditionRow('resources', 'Resource Conditions (What)')}
                            {renderConditionRow('conditions', 'Additional Conditions (When/How)')}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                                {saving ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
