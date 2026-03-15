import { useState, useEffect } from 'react';
import { HiPlus, HiCurrencyDollar } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

export default function CostManagement() {
    const [budgets, setBudgets] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', scopeType: 'team', scopeId: '', tokenLimit: 5000000, costLimitCents: 10000, period: 'monthly' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [budgetRes, statsRes] = await Promise.allSettled([
                api.listBudgets(), api.getCostStats(),
            ]);
            if (budgetRes.status === 'fulfilled') setBudgets(budgetRes.value.data || []);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.createBudget(form);
            setShowModal(false);
            setForm({ name: '', scopeType: 'team', scopeId: '', tokenLimit: 5000000, costLimitCents: 10000, period: 'monthly' });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="empty-state"><div className="icon">⏳</div><h4>Loading cost data...</h4></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage token budgets and track costs across teams</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiPlus /> Create Budget</button>
            </div>

            {/* Overview Stats */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon info"><HiCurrencyDollar /></div>
                    <div className="stat-content"><h4>Total Spend</h4>
                        <div className="value">${((stats.total_cost_cents || 0) / 100).toFixed(2)}</div>
                        <div className="sub">{parseInt(stats.total_tokens || 0).toLocaleString()} tokens</div></div></div>
                <div className="stat-card"><div className="stat-icon primary"><HiCurrencyDollar /></div>
                    <div className="stat-content"><h4>Active Budgets</h4>
                        <div className="value">{budgets.length}</div>
                        <div className="sub">{budgets.filter(b => b.hard_limit).length} with hard limits</div></div></div>
            </div>

            {/* Budget Cards */}
            {budgets.length === 0 ? (
                <div className="card"><div className="empty-state"><div className="icon">💰</div><h4>No budgets configured</h4><p>Create a budget to enforce token and cost limits</p></div></div>
            ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                    {budgets.map(b => {
                        const tokenPct = b.token_limit ? Math.round((b.current_tokens || 0) / b.token_limit * 100) : 0;
                        const costPct = b.cost_limit_cents ? Math.round((b.current_cost_cents || 0) / b.cost_limit_cents * 100) : 0;
                        const barColor = tokenPct >= 90 ? 'var(--danger)' : tokenPct >= 70 ? 'var(--warning)' : 'var(--accent-primary)';

                        return (
                            <div className="card" key={b.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <span style={{ fontWeight: 700 }}>{b.name}</span>
                                        <span className="badge gray" style={{ marginLeft: 8 }}>{b.scope_type}</span>
                                        {b.hard_limit && <span className="badge red" style={{ marginLeft: 4 }}>Hard Limit</span>}
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.period}</span>
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tokens</span>
                                        <span style={{ color: barColor, fontWeight: 600 }}>{((b.current_tokens || 0) / 1000000).toFixed(1)}M / {(b.token_limit / 1000000).toFixed(0)}M ({tokenPct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(tokenPct, 100)}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Cost</span>
                                        <span style={{ fontWeight: 600 }}>${((b.current_cost_cents || 0) / 100).toFixed(0)} / ${(b.cost_limit_cents / 100).toFixed(0)} ({costPct}%)</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(costPct, 100)}%`, height: '100%', background: costPct >= 90 ? 'var(--danger)' : 'var(--success)', borderRadius: 3, transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Create Budget</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Budget Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Scope Type</label>
                                    <select className="form-select" value={form.scopeType} onChange={e => setForm({ ...form, scopeType: e.target.value })}>
                                        <option value="user">User</option><option value="team">Team</option><option value="department">Department</option><option value="global">Global</option>
                                    </select></div>
                                <div className="form-group"><label>Scope ID</label><input className="form-input" value={form.scopeId} onChange={e => setForm({ ...form, scopeId: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Token Limit</label><input className="form-input" type="number" value={form.tokenLimit} onChange={e => setForm({ ...form, tokenLimit: parseInt(e.target.value) })} /></div>
                                <div className="form-group"><label>Cost Limit ($)</label><input className="form-input" type="number" value={form.costLimitCents / 100} onChange={e => setForm({ ...form, costLimitCents: parseInt(e.target.value) * 100 })} /></div>
                            </div>
                            <div className="form-group"><label>Period</label>
                                <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                                    <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                                </select></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Create'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
