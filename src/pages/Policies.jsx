import { useState, useEffect } from 'react';
import { HiPlus, HiTrash, HiPencil, HiShieldCheck, HiCodeBracket, HiArrowDownTray, HiArrowUpTray, HiCheck, HiExclamationTriangle } from 'react-icons/hi2';
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

const DEFAULT_REGO = `package aisure.authz

import rego.v1

default allow := false

# Example: Allow admins access to all agents
allow if {
    input.user.role == "admin"
}

# Example: Deny viewers from specific agents
deny if {
    input.user.role == "viewer"
    input.agent.slug == "finance-agent"
}
`;

export default function Policies() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    // Rego state
    const [policyMode, setPolicyMode] = useState('json'); // 'json' | 'rego'
    const [regoSource, setRegoSource] = useState(DEFAULT_REGO);
    const [regoValidation, setRegoValidation] = useState(null); // { valid, errors }
    const [validating, setValidating] = useState(false);
    const [opaAvailable, setOpaAvailable] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [importName, setImportName] = useState('');
    const [importSource, setImportSource] = useState('');
    const [importPriority, setImportPriority] = useState(100);

    useEffect(() => { loadPolicies(); checkOpa(); }, []);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const res = await api.listPolicies();
            setPolicies(res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const checkOpa = async () => {
        try {
            const res = await api.regoStatus();
            setOpaAvailable(res.data?.opaAvailable || false);
        } catch { setOpaAvailable(false); }
    };

    const openCreate = () => {
        setEditingId(null);
        setPolicyMode('json');
        setForm({ ...EMPTY_FORM });
        setRegoSource(DEFAULT_REGO);
        setRegoValidation(null);
        setShowModal(true);
    };

    const openEdit = (p) => {
        const format = p.policy_format || 'json';
        setEditingId(p.id);
        setPolicyMode(format);
        setRegoValidation(null);

        if (format === 'rego') {
            setRegoSource(p.rego_source || DEFAULT_REGO);
            setForm({ name: p.name, priority: p.priority, effect: 'allow', subjects: [], resources: [], conditions: [] });
        } else {
            const rules = p.rules_json || {};
            setForm({
                name: p.name,
                effect: rules.effect || 'allow',
                priority: p.priority,
                subjects: rules.subjects && rules.subjects.length > 0 ? rules.subjects : [{ field: '', op: 'eq', value: '' }],
                resources: rules.resources && rules.resources.length > 0 ? rules.resources : [{ field: '', op: 'eq', value: '' }],
                conditions: rules.conditions || [],
            });
        }
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

    const handleValidateRego = async () => {
        setValidating(true);
        try {
            const res = await api.validateRego(regoSource);
            setRegoValidation(res.data);
        } catch (err) {
            setRegoValidation({ valid: false, errors: [err.message] });
        } finally { setValidating(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (policyMode === 'rego') {
                // Rego policy
                const payload = {
                    name: form.name,
                    policyType: 'access_control',
                    policyFormat: 'rego',
                    regoSource: regoSource,
                    priority: form.priority,
                    rulesJson: {},
                };
                if (editingId) {
                    await api.updatePolicy(editingId, payload);
                } else {
                    await api.createPolicy(payload);
                }
            } else {
                // JSON policy (existing)
                const payload = {
                    name: form.name, policyType: 'access_control', priority: form.priority,
                    rulesJson: { effect: form.effect, subjects: form.subjects, resources: form.resources, conditions: form.conditions },
                };
                if (editingId) {
                    await api.updatePolicy(editingId, payload);
                } else {
                    await api.createPolicy(payload);
                }
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

    const handleImportRego = async () => {
        if (!importName || !importSource) return alert('Name and Rego source are required');
        setSaving(true);
        try {
            await api.importRego(importName, importSource, importPriority);
            setShowImport(false);
            setImportName(''); setImportSource(''); setImportPriority(100);
            await loadPolicies();
        } catch (err) { alert('Import error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleExportRego = async (id) => {
        try {
            const res = await api.exportRego(id);
            const blob = new Blob([res.data.source], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${res.data.name || 'policy'}.rego`; a.click();
            URL.revokeObjectURL(url);
        } catch (err) { alert('Export error: ' + err.message); }
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (showImport) {
                setImportSource(ev.target.result);
                if (!importName) setImportName(file.name.replace('.rego', ''));
            } else {
                setRegoSource(ev.target.result);
            }
        };
        reader.readAsText(file);
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
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Define who can access which agents and workflows</p>
                    {opaAvailable && <span className="badge green" style={{ marginTop: 4, display: 'inline-block', fontSize: 11 }}>OPA/Rego Available</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {opaAvailable && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setShowImport(true); setImportSource(''); setImportName(''); }}>
                            <HiArrowUpTray /> Import .rego
                        </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={openCreate}><HiPlus /> Create Policy</button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="icon">⏳</div><h4>Loading policies...</h4></div>
                ) : policies.length === 0 ? (
                    <div className="empty-state"><div className="icon">🛡️</div><h4>No policies defined</h4><p>Create your first access control policy</p></div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>Policy</th><th>Format</th><th>Effect</th><th>Priority</th><th>Details</th><th>Active</th><th>Actions</th></tr></thead>
                        <tbody>
                            {policies.map(p => {
                                const rules = p.rules_json || {};
                                const format = p.policy_format || 'json';
                                const isRego = format === 'rego';
                                return (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {isRego ? <HiCodeBracket style={{ color: 'var(--accent-primary)' }} />
                                                    : <HiShieldCheck style={{ color: rules.effect === 'allow' ? 'var(--success)' : 'var(--danger)' }} />}
                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${isRego ? 'blue' : 'gray'}`} style={{ fontSize: 11 }}>
                                                {isRego ? 'Rego' : 'JSON'}
                                            </span>
                                        </td>
                                        <td>
                                            {isRego ? <span className="badge" style={{ fontSize: 11 }}>OPA</span>
                                                : <span className={`badge ${rules.effect === 'allow' ? 'green' : 'red'}`}>{rules.effect}</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{p.priority}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {isRego ? `pkg: ${p.rego_package || '—'}` :
                                                `${(rules.subjects?.length || 0)} subjects, ${(rules.resources?.length || 0)} resources`}
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
                                                {isRego && <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} onClick={() => handleExportRego(p.id)} title="Export .rego"><HiArrowDownTray /></button>}
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

            {/* ── Create/Edit Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header"><h3>{editingId ? '✏️ Edit Policy' : '➕ Create Access Policy'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            {/* Format Toggle */}
                            {opaAvailable && !editingId && (
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <button className={`btn btn-sm ${policyMode === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setPolicyMode('json')}>🏗️ Visual Builder</button>
                                    <button className={`btn btn-sm ${policyMode === 'rego' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setPolicyMode('rego')}><HiCodeBracket style={{ marginRight: 4 }} /> Rego Editor</button>
                                </div>
                            )}

                            {/* Shared fields */}
                            <div className="form-row">
                                <div className="form-group"><label>Policy Name</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Financial Analysts Only" /></div>
                                <div className="form-group"><label>Priority (lower = first)</label>
                                    <input className="form-input" type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} /></div>
                            </div>

                            {policyMode === 'rego' ? (
                                /* ── Rego Editor ── */
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Rego Policy Source</label>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginBottom: 0 }}>
                                                <HiArrowUpTray /> Upload .rego
                                                <input type="file" accept=".rego" onChange={handleFileImport} style={{ display: 'none' }} />
                                            </label>
                                            <button className="btn btn-secondary btn-sm" onClick={handleValidateRego} disabled={validating}>
                                                {validating ? '⏳ Checking…' : '✓ Validate'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={regoSource}
                                        onChange={e => { setRegoSource(e.target.value); setRegoValidation(null); }}
                                        style={{
                                            width: '100%', minHeight: 280, fontFamily: 'monospace', fontSize: 13,
                                            background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                            border: `1px solid ${regoValidation ? (regoValidation.valid ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`,
                                            borderRadius: 8, padding: 12, resize: 'vertical', lineHeight: 1.5,
                                        }}
                                        placeholder="package aisure.authz&#10;&#10;default allow := false&#10;..."
                                        spellCheck={false}
                                    />
                                    {regoValidation && (
                                        <div style={{
                                            marginTop: 8, padding: '8px 12px', borderRadius: 6, fontSize: 12,
                                            background: regoValidation.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                            color: regoValidation.valid ? 'var(--success)' : 'var(--danger)',
                                            display: 'flex', alignItems: 'flex-start', gap: 6,
                                        }}>
                                            {regoValidation.valid
                                                ? <><HiCheck /> Rego syntax is valid</>
                                                : <><HiExclamationTriangle /> {regoValidation.errors?.join('; ') || 'Invalid syntax'}</>}
                                        </div>
                                    )}
                                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                                        The policy must declare a <code>package</code> and export <code>allow</code> and/or <code>deny</code>.
                                        Input fields available: <code>input.user.role</code>, <code>input.user.email</code>, <code>input.user.department</code>,
                                        <code> input.agent.slug</code>, <code>input.agent.name</code>, <code>input.action</code>
                                    </div>
                                </div>
                            ) : (
                                /* ── JSON Visual Builder (existing) ── */
                                <>
                                    <div className="form-group"><label>Effect</label>
                                        <select className="form-select" value={form.effect} onChange={e => setForm({ ...form, effect: e.target.value })}>
                                            <option value="allow">✅ Allow</option><option value="deny">🚫 Deny</option>
                                        </select></div>
                                    {renderConditionRow('subjects', 'Subject Conditions (Who)')}
                                    {renderConditionRow('resources', 'Resource Conditions (What)')}
                                    {renderConditionRow('conditions', 'Additional Conditions (When/How)')}
                                </>
                            )}
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

            {/* ── Import .rego Modal ── */}
            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3><HiArrowUpTray /> Import Rego Policy</h3>
                            <button className="btn-icon" onClick={() => setShowImport(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label>Policy Name</label>
                                    <input className="form-input" value={importName} onChange={e => setImportName(e.target.value)} placeholder="e.g. RBAC Policy" /></div>
                                <div className="form-group"><label>Priority</label>
                                    <input className="form-input" type="number" value={importPriority} onChange={e => setImportPriority(parseInt(e.target.value))} /></div>
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label>Rego Source</label>
                                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', marginBottom: 0 }}>
                                        📁 Upload File
                                        <input type="file" accept=".rego" onChange={handleFileImport} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                <textarea
                                    value={importSource}
                                    onChange={e => setImportSource(e.target.value)}
                                    style={{
                                        width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: 13,
                                        background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border)', borderRadius: 8, padding: 12,
                                        resize: 'vertical', lineHeight: 1.5,
                                    }}
                                    placeholder="Paste Rego source or upload a .rego file..."
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleImportRego} disabled={saving || !importName || !importSource}>
                                {saving ? 'Importing...' : 'Import Policy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
