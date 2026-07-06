import { useState, useEffect, useMemo } from 'react';
import { HiPlus, HiCurrencyDollar, HiPencilSquare, HiTrash, HiChartBar, HiExclamationTriangle, HiArrowDownTray, HiClock, HiTableCells } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import api from '../api';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

const EMPTY_FORM = { name: '', scopeType: 'team', scopeId: '', tokenLimit: 5000000, costLimitCents: 10000, period: 'monthly', warnThreshold: 80, hardLimit: true };

// Tab definitions
const TABS = [
    { id: 'overview', label: 'Overview', icon: <HiChartBar /> },
    { id: 'budgets', label: 'Budgets', icon: <HiCurrencyDollar /> },
    { id: 'pricing', label: 'Model Pricing', icon: <HiTableCells /> },
    { id: 'history', label: 'Budget History', icon: <HiClock /> },
];

export default function CostManagement() {
    const [activeTab, setActiveTab] = useState('overview');
    const [budgets, setBudgets] = useState([]);
    const [stats, setStats] = useState({});
    const [usageReport, setUsageReport] = useState([]);
    const [dailyUsage, setDailyUsage] = useState([]);
    const [budgetAlerts, setBudgetAlerts] = useState([]);
    const [modelPricing, setModelPricing] = useState([]);
    const [budgetHistory, setBudgetHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    // Model Pricing CRUD state
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [editingPricing, setEditingPricing] = useState(null);
    const [pricingForm, setPricingForm] = useState({ modelName: '', vendor: 'OpenAI', inputPer1M: 0, outputPer1M: 0 });
    const [savingPricing, setSavingPricing] = useState(false);
    const [deletingPricing, setDeletingPricing] = useState(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [budgetRes, statsRes, reportRes, dailyRes, alertsRes, pricingRes, historyRes] = await Promise.allSettled([
                api.listBudgets(), api.getCostStats(), api.getCostReport(),
                api.getDailyUsage(30), api.getBudgetAlerts(), api.getModelPricing(),
                api.getAllBudgetHistory(50),
            ]);
            if (budgetRes.status === 'fulfilled') setBudgets(budgetRes.value.data || []);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
            if (reportRes.status === 'fulfilled') setUsageReport(reportRes.value.data || []);
            if (dailyRes.status === 'fulfilled') setDailyUsage(dailyRes.value.data || []);
            if (alertsRes.status === 'fulfilled') setBudgetAlerts(alertsRes.value.data || []);
            if (pricingRes.status === 'fulfilled') setModelPricing(pricingRes.value.data || []);
            if (historyRes.status === 'fulfilled') setBudgetHistory(historyRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openCreateModal = () => {
        setEditingBudget(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    const openEditModal = (budget) => {
        setEditingBudget(budget);
        setForm({
            name: budget.name || '',
            scopeType: budget.scope_type || 'team',
            scopeId: budget.scope_id || '',
            tokenLimit: budget.token_limit || 0,
            costLimitCents: budget.cost_limit_cents || 0,
            period: budget.period || 'monthly',
            warnThreshold: Math.round((budget.warn_threshold || 0.80) * 100),
            hardLimit: budget.hard_limit !== false,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                scopeType: form.scopeType,
                scopeId: form.scopeType === 'global' ? 'global' : form.scopeId,
                tokenLimit: form.tokenLimit,
                costLimitCents: form.costLimitCents,
                period: form.period,
                warnThreshold: form.warnThreshold / 100,
                hardLimit: form.hardLimit,
            };
            if (editingBudget) {
                await api.updateBudget(editingBudget.id, payload);
            } else {
                await api.createBudget(payload);
            }
            setShowModal(false);
            setEditingBudget(null);
            setForm({ ...EMPTY_FORM });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this budget?')) return;
        setDeleting(id);
        try {
            await api.deleteBudget(id);
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setDeleting(null); }
    };

    // ── CSV Export ──
    const exportCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            csvRows.push(headers.map(h => {
                const val = row[h];
                const str = val == null ? '' : String(val);
                return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Model Pricing CRUD handlers ──
    const openCreatePricing = () => {
        setEditingPricing(null);
        setPricingForm({ modelName: '', vendor: 'OpenAI', inputPer1M: 0, outputPer1M: 0 });
        setShowPricingModal(true);
    };

    const openEditPricing = (m) => {
        setEditingPricing(m);
        setPricingForm({ modelName: m.model, vendor: m.vendor, inputPer1M: m.inputPer1M, outputPer1M: m.outputPer1M });
        setShowPricingModal(true);
    };

    const handleSavePricing = async () => {
        setSavingPricing(true);
        try {
            if (editingPricing) {
                await api.updateModelPricing(editingPricing.id, pricingForm);
            } else {
                await api.createModelPricing(pricingForm);
            }
            setShowPricingModal(false);
            setEditingPricing(null);
            // Reload pricing
            const res = await api.getModelPricing();
            setModelPricing(res.data || []);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSavingPricing(false); }
    };

    const handleDeletePricing = async (id) => {
        if (!confirm('Delete this model pricing entry?')) return;
        setDeletingPricing(id);
        try {
            await api.deleteModelPricing(id);
            const res = await api.getModelPricing();
            setModelPricing(res.data || []);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setDeletingPricing(null); }
    };

    // ── Forecasting ──
    const forecasts = useMemo(() => {
        return budgets.filter(b => b.is_active).map(b => {
            const periodDays = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 }[b.period] || 30;
            const start = new Date(b.period_start);
            const now = new Date();
            const elapsedDays = Math.max((now - start) / (1000 * 60 * 60 * 24), 0.01);

            // Token forecasting
            let tokenForecast = null;
            if (b.token_limit && b.current_tokens > 0) {
                const dailyBurn = b.current_tokens / elapsedDays;
                const remaining = b.token_limit - b.current_tokens;
                const daysUntilExhausted = remaining > 0 ? remaining / dailyBurn : 0;
                const endOfPeriod = periodDays - elapsedDays;
                tokenForecast = {
                    dailyBurn: Math.round(dailyBurn),
                    daysLeft: Math.round(daysUntilExhausted * 10) / 10,
                    willExceed: daysUntilExhausted < endOfPeriod,
                    projectedTotal: Math.round(dailyBurn * periodDays),
                };
            }

            // Cost forecasting
            let costForecast = null;
            if (b.cost_limit_cents && b.current_cost_cents > 0) {
                const dailyBurn = b.current_cost_cents / elapsedDays;
                const remaining = b.cost_limit_cents - b.current_cost_cents;
                const daysUntilExhausted = remaining > 0 ? remaining / dailyBurn : 0;
                const endOfPeriod = periodDays - elapsedDays;
                costForecast = {
                    dailyBurn: Math.round(dailyBurn),
                    daysLeft: Math.round(daysUntilExhausted * 10) / 10,
                    willExceed: daysUntilExhausted < endOfPeriod,
                    projectedTotal: Math.round(dailyBurn * periodDays),
                };
            }

            return { budget: b, tokenForecast, costForecast };
        }).filter(f => f.tokenForecast || f.costForecast);
    }, [budgets]);

    if (loading) return <div className="empty-state"><div className="icon">⏳</div><h4>Loading cost data...</h4></div>;

    // Prepare chart data
    const chartData = usageReport.map(r => ({
        name: r.agent_name || 'Unknown',
        tokens: parseInt(r.total_tokens || 0),
        requests: parseInt(r.request_count || 0),
        cost: parseInt(r.total_cost_cents || 0) / 100,
    }));

    const dailyChartData = dailyUsage.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tokens: parseInt(d.total_tokens || 0),
        cost: parseInt(d.cost_cents || 0) / 100,
        requests: parseInt(d.request_count || 0),
    }));

    const totalRequests = parseInt(stats.total_requests || 0);
    const tokensLast24h = parseInt(stats.tokens_last_24h || 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Manage token budgets and track costs across teams</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(usageReport.map(r => ({
                        agent: r.agent_name, requests: r.request_count, total_tokens: r.total_tokens,
                        input_tokens: r.total_input_tokens, output_tokens: r.total_output_tokens,
                        cost_dollars: (parseInt(r.total_cost_cents || 0) / 100).toFixed(2),
                    })), 'cost_report.csv')}>
                        <HiArrowDownTray /> Export CSV
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={openCreateModal}><HiPlus /> Create Budget</button>
                </div>
            </div>

            {/* Budget Alerts */}
            {budgetAlerts.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    {budgetAlerts.map(alert => {
                        const tokenPct = alert.token_limit ? Math.round((alert.current_tokens || 0) / alert.token_limit * 100) : 0;
                        const costPct = alert.cost_limit_cents ? Math.round((alert.current_cost_cents || 0) / alert.cost_limit_cents * 100) : 0;
                        const maxPct = Math.max(tokenPct, costPct);
                        const isExceeded = maxPct >= 100;
                        return (
                            <div key={alert.id} style={{
                                padding: '10px 16px', marginBottom: 8, borderRadius: 8,
                                background: isExceeded ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                border: `1px solid ${isExceeded ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                            }}>
                                <HiExclamationTriangle style={{ color: isExceeded ? '#ef4444' : '#f59e0b', flexShrink: 0 }} size={18} />
                                <span>
                                    <strong>{alert.name}</strong> ({alert.scope_type}: {alert.scope_id}) —{' '}
                                    {isExceeded ? (
                                        <span style={{ color: '#ef4444' }}>Budget exceeded! {tokenPct}% tokens, {costPct}% cost</span>
                                    ) : (
                                        <span style={{ color: '#f59e0b' }}>Approaching limit: {tokenPct}% tokens, {costPct}% cost</span>
                                    )}
                                    {alert.hard_limit && isExceeded && <span style={{ color: '#ef4444', fontWeight: 600 }}> · BLOCKING REQUESTS</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 0 }}>
                {TABS.map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                            fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            background: 'none', border: 'none',
                            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            marginBottom: -1, transition: 'all 0.15s',
                        }}>
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <>
                    {/* Stat Cards */}
                    <div className="stat-grid" style={{ marginBottom: 24 }}>
                        <div className="stat-card"><div className="stat-icon info"><HiCurrencyDollar /></div>
                            <div className="stat-content"><h4>Total Spend</h4>
                                <div className="value">${((stats.total_cost_cents || 0) / 100).toFixed(2)}</div>
                                <div className="sub">{parseInt(stats.total_tokens || 0).toLocaleString()} tokens</div></div></div>
                        <div className="stat-card"><div className="stat-icon primary"><HiChartBar /></div>
                            <div className="stat-content"><h4>Last 24 Hours</h4>
                                <div className="value">{tokensLast24h.toLocaleString()} tokens</div>
                                <div className="sub">${((stats.cost_last_24h || 0) / 100).toFixed(2)} cost</div></div></div>
                        <div className="stat-card"><div className="stat-icon success"><HiCurrencyDollar /></div>
                            <div className="stat-content"><h4>Total Requests</h4>
                                <div className="value">{totalRequests.toLocaleString()}</div>
                                <div className="sub">{budgets.length} budgets · {budgetAlerts.length} alerts</div></div></div>
                    </div>

                    {/* Daily Usage Trend Chart */}
                    {dailyChartData.length > 1 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="card-header"><h3>Daily Usage Trend (30 days)</h3></div>
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={dailyChartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="tokens" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                                    <YAxis yAxisId="cost" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                                        tickFormatter={v => `$${v}`} />
                                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid #2a3050', borderRadius: 8, color: '#f1f5f9' }}
                                        formatter={(value, name) => {
                                            if (name === 'tokens') return [parseInt(value).toLocaleString(), 'Tokens'];
                                            if (name === 'cost') return [`$${Number(value).toFixed(2)}`, 'Cost'];
                                            return [value, name];
                                        }} />
                                    <Area yAxisId="tokens" type="monotone" dataKey="tokens" stroke="#6366f1" fill="url(#tokenGrad)" strokeWidth={2} />
                                    <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="#22c55e" fill="url(#costGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', gap: 16, padding: '4px 16px 12px', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                    <span style={{ width: 12, height: 3, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} /> Tokens
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                    <span style={{ width: 12, height: 3, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} /> Cost ($)
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Usage Report Bar Chart */}
                    {chartData.length > 0 && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="card-header"><h3>Token Usage by Agent</h3></div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false}
                                        tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid #2a3050', borderRadius: 8, color: '#f1f5f9' }}
                                        formatter={(value, name) => {
                                            if (name === 'tokens') return [parseInt(value).toLocaleString(), 'Total Tokens'];
                                            return [`$${Number(value).toFixed(2)}`, 'Cost'];
                                        }} />
                                    <Bar dataKey="tokens" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                        {chartData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 16px 16px', justifyContent: 'center' }}>
                                {chartData.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }} />
                                        {item.name}: {item.tokens.toLocaleString()} tokens · {item.requests} reqs
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cost Forecasting */}
                    {forecasts.length > 0 && (
                        <div className="card">
                            <div className="card-header"><h3>Budget Forecasting</h3></div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ width: '100%' }}>
                                    <thead><tr>
                                        <th>Budget</th><th>Scope</th><th>Daily Burn Rate</th><th>Days Until Exhausted</th><th>Projected Total</th><th>Status</th>
                                    </tr></thead>
                                    <tbody>
                                        {forecasts.map(f => {
                                            const fc = f.tokenForecast || f.costForecast;
                                            const isToken = !!f.tokenForecast;
                                            return (
                                                <tr key={f.budget.id}>
                                                    <td style={{ fontWeight: 600 }}>{f.budget.name}</td>
                                                    <td><span className="badge gray">{f.budget.scope_type}</span></td>
                                                    <td>{isToken
                                                        ? `${(fc.dailyBurn / 1000).toFixed(0)}K tokens/day`
                                                        : `$${(fc.dailyBurn / 100).toFixed(2)}/day`}</td>
                                                    <td style={{ fontWeight: 600, color: fc.daysLeft <= 3 ? 'var(--danger)' : fc.daysLeft <= 7 ? 'var(--warning)' : 'var(--text-primary)' }}>
                                                        {fc.daysLeft <= 0 ? 'Exhausted' : `${fc.daysLeft} days`}
                                                    </td>
                                                    <td>{isToken
                                                        ? `${(fc.projectedTotal / 1000000).toFixed(1)}M tokens`
                                                        : `$${(fc.projectedTotal / 100).toFixed(2)}`}</td>
                                                    <td>
                                                        {fc.willExceed ? (
                                                            <span className="badge red">Will Exceed</span>
                                                        ) : (
                                                            <span className="badge green">On Track</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══ BUDGETS TAB ═══ */}
            {activeTab === 'budgets' && (
                <>
                    {budgets.length === 0 ? (
                        <div className="card"><div className="empty-state"><div className="icon">💰</div><h4>No budgets configured</h4><p>Create a budget to enforce token and cost limits</p></div></div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {budgets.map(b => {
                                const tokenPct = b.token_limit ? Math.round((b.current_tokens || 0) / b.token_limit * 100) : 0;
                                const costPct = b.cost_limit_cents ? Math.round((b.current_cost_cents || 0) / b.cost_limit_cents * 100) : 0;
                                const barColor = tokenPct >= 90 ? 'var(--danger)' : tokenPct >= 70 ? 'var(--warning)' : 'var(--accent-primary)';
                                const warnPct = Math.round((b.warn_threshold || 0.80) * 100);
                                const isAlerted = budgetAlerts.some(a => a.id === b.id);

                                return (
                                    <div className="card" key={b.id} style={isAlerted ? { borderColor: tokenPct >= 100 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)' } : {}}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                {isAlerted && <HiExclamationTriangle style={{ color: tokenPct >= 100 ? '#ef4444' : '#f59e0b' }} size={16} />}
                                                <span style={{ fontWeight: 700 }}>{b.name}</span>
                                                <span className="badge gray">{b.scope_type}</span>
                                                {b.scope_id && b.scope_type !== 'global' && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({b.scope_id})</span>}
                                                {b.hard_limit && <span className="badge red">Hard Limit</span>}
                                                {!b.hard_limit && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Soft Limit</span>}
                                                {!b.is_active && <span className="badge gray">Inactive</span>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{b.period} · warn@{warnPct}%</span>
                                                <button className="btn-icon" title="Edit budget" onClick={() => openEditModal(b)} style={{ color: 'var(--text-secondary)' }}>
                                                    <HiPencilSquare size={16} />
                                                </button>
                                                <button className="btn-icon" title="Delete budget" onClick={() => handleDelete(b.id)}
                                                    disabled={deleting === b.id}
                                                    style={{ color: deleting === b.id ? 'var(--text-muted)' : 'var(--danger)' }}>
                                                    <HiTrash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Token progress */}
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Tokens</span>
                                                <span style={{ color: barColor, fontWeight: 600 }}>
                                                    {((b.current_tokens || 0) / 1000000).toFixed(1)}M / {b.token_limit ? `${(b.token_limit / 1000000).toFixed(0)}M` : '∞'} ({tokenPct}%)
                                                </span>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ width: `${Math.min(tokenPct, 100)}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s' }} />
                                                <div style={{ position: 'absolute', left: `${warnPct}%`, top: 0, width: 1.5, height: '100%', background: 'var(--warning)', opacity: 0.6 }} />
                                            </div>
                                        </div>
                                        {/* Cost progress */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Cost</span>
                                                <span style={{ fontWeight: 600 }}>
                                                    ${((b.current_cost_cents || 0) / 100).toFixed(0)} / {b.cost_limit_cents ? `$${(b.cost_limit_cents / 100).toFixed(0)}` : '∞'} ({costPct}%)
                                                </span>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ width: `${Math.min(costPct, 100)}%`, height: '100%', background: costPct >= 90 ? 'var(--danger)' : 'var(--success)', borderRadius: 3, transition: 'width 0.5s' }} />
                                                <div style={{ position: 'absolute', left: `${warnPct}%`, top: 0, width: 1.5, height: '100%', background: 'var(--warning)', opacity: 0.6 }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ═══ MODEL PRICING TAB ═══ */}
            {activeTab === 'pricing' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>LLM Model Pricing</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                                modelPricing.map(m => ({ model: m.model, vendor: m.vendor, input_per_1M_tokens_cents: m.inputPer1M, output_per_1M_tokens_cents: m.outputPer1M })),
                                'model_pricing.csv'
                            )}><HiArrowDownTray /> Export</button>
                            <button className="btn btn-primary btn-sm" onClick={openCreatePricing}><HiPlus /> Add Model</button>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 16px', padding: '0 4px' }}>
                        Costs are auto-estimated using this table when the upstream agent does not return cost data. Prices in cents per 1M tokens. You can add, edit, or remove models.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead><tr>
                                <th>Model</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Input (¢/1M)</th><th style={{ textAlign: 'right' }}>Output (¢/1M)</th>
                                <th style={{ textAlign: 'right' }}>Input ($/1M)</th><th style={{ textAlign: 'right' }}>Output ($/1M)</th><th style={{ textAlign: 'center', width: 80 }}>Actions</th>
                            </tr></thead>
                            <tbody>
                                {modelPricing.map((m) => (
                                    <tr key={m.id}>
                                        <td>
                                            <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>{m.model}</span>
                                        </td>
                                        <td><span className="badge gray">{m.vendor}</span></td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.inputPer1M.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{m.outputPer1M.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>${(m.inputPer1M / 100).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>${(m.outputPer1M / 100).toFixed(2)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                <button className="btn-icon" title="Edit" onClick={() => openEditPricing(m)} style={{ color: 'var(--text-secondary)' }}>
                                                    <HiPencilSquare size={15} />
                                                </button>
                                                <button className="btn-icon" title="Delete" onClick={() => handleDeletePricing(m.id)}
                                                    disabled={deletingPricing === m.id}
                                                    style={{ color: deletingPricing === m.id ? 'var(--text-muted)' : 'var(--danger)' }}>
                                                    <HiTrash size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ BUDGET HISTORY TAB ═══ */}
            {activeTab === 'history' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Budget Period History</h3>
                        {budgetHistory.length > 0 && (
                            <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(
                                budgetHistory.map(h => ({
                                    budget: h.budget_name, scope: `${h.scope_type}:${h.scope_id}`, period: h.period,
                                    start: h.period_start, end: h.period_end,
                                    tokens: h.final_tokens, token_limit: h.token_limit,
                                    cost_cents: h.final_cost_cents, cost_limit_cents: h.cost_limit_cents,
                                })),
                                'budget_history.csv'
                            )}><HiArrowDownTray /> Export</button>
                        )}
                    </div>
                    {budgetHistory.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="icon">📊</div>
                            <h4>No history yet</h4>
                            <p>Budget period archives will appear here after a budget period resets (e.g. after a monthly budget rolls over)</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead><tr>
                                    <th>Budget</th><th>Scope</th><th>Period</th><th>Dates</th><th style={{ textAlign: 'right' }}>Tokens Used</th><th style={{ textAlign: 'right' }}>Cost</th><th>Utilization</th>
                                </tr></thead>
                                <tbody>
                                    {budgetHistory.map((h, i) => {
                                        const tokenUtil = h.token_limit ? Math.round((h.final_tokens || 0) / h.token_limit * 100) : 0;
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{h.budget_name}</td>
                                                <td><span className="badge gray">{h.scope_type}</span> {h.scope_id !== 'global' && <span style={{ fontSize: 12 }}>{h.scope_id}</span>}</td>
                                                <td>{h.period}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    {new Date(h.period_start).toLocaleDateString()} – {new Date(h.period_end).toLocaleDateString()}
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                    {parseInt(h.final_tokens || 0).toLocaleString()}{h.token_limit ? ` / ${parseInt(h.token_limit).toLocaleString()}` : ''}
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                                    ${((h.final_cost_cents || 0) / 100).toFixed(2)}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ width: 48, height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(tokenUtil, 100)}%`, height: '100%', background: tokenUtil >= 90 ? 'var(--danger)' : tokenUtil >= 70 ? 'var(--warning)' : 'var(--accent-primary)', borderRadius: 3 }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{tokenUtil}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingBudget ? 'Edit Budget' : 'Create Budget'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Budget Name</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering Monthly" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Scope Type</label>
                                    <select className="form-select" value={form.scopeType} onChange={e => setForm({ ...form, scopeType: e.target.value })}>
                                        <option value="user">User</option><option value="team">Team</option><option value="department">Department</option>
                                        <option value="agent">Agent</option><option value="workflow">Workflow</option>
                                        <option value="project">Project</option><option value="global">Global</option>
                                    </select></div>
                                <div className="form-group"><label>Scope ID</label>
                                    <input className="form-input" value={form.scopeId} onChange={e => setForm({ ...form, scopeId: e.target.value })}
                                        placeholder={form.scopeType === 'global' ? 'global' : form.scopeType === 'agent' ? 'agent UUID or slug' : 'e.g. team-alpha'}
                                        disabled={form.scopeType === 'global'} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Token Limit</label>
                                    <input className="form-input" type="number" value={form.tokenLimit} onChange={e => setForm({ ...form, tokenLimit: parseInt(e.target.value) || 0 })} /></div>
                                <div className="form-group"><label>Cost Limit ($)</label>
                                    <input className="form-input" type="number" value={form.costLimitCents / 100} onChange={e => setForm({ ...form, costLimitCents: parseInt(e.target.value) * 100 || 0 })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Period</label>
                                    <select className="form-select" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                                        <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                                    </select></div>
                                <div className="form-group"><label>Warn Threshold (%)</label>
                                    <input className="form-input" type="number" min="0" max="100" value={form.warnThreshold}
                                        onChange={e => setForm({ ...form, warnThreshold: parseInt(e.target.value) || 0 })} /></div>
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked={form.hardLimit} onChange={e => setForm({ ...form, hardLimit: e.target.checked })}
                                        style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }} />
                                    <span>Hard limit</span>
                                </label>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                    {form.hardLimit ? 'Blocks requests when exceeded' : 'Only logs warnings when exceeded'}
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
                                {saving ? 'Saving...' : editingBudget ? 'Save Changes' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPricingModal && (
                <div className="modal-overlay" onClick={() => setShowPricingModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingPricing ? 'Edit Model Pricing' : 'Add Model Pricing'}</h3>
                            <button className="btn-icon" onClick={() => setShowPricingModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label>Model Name</label>
                                <input className="form-input" value={pricingForm.modelName} onChange={e => setPricingForm({ ...pricingForm, modelName: e.target.value })}
                                    placeholder="e.g. gpt-4o-mini" disabled={!!editingPricing} />
                            </div>
                            <div className="form-group"><label>Vendor</label>
                                <select className="form-select" value={pricingForm.vendor} onChange={e => setPricingForm({ ...pricingForm, vendor: e.target.value })}>
                                    <option value="OpenAI">OpenAI</option><option value="Anthropic">Anthropic</option>
                                    <option value="Google">Google</option><option value="Meta">Meta</option>
                                    <option value="Mistral">Mistral</option><option value="Cohere">Cohere</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Input Price (¢ per 1M tokens)</label>
                                    <input className="form-input" type="number" step="0.01" value={pricingForm.inputPer1M}
                                        onChange={e => setPricingForm({ ...pricingForm, inputPer1M: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group"><label>Output Price (¢ per 1M tokens)</label>
                                    <input className="form-input" type="number" step="0.01" value={pricingForm.outputPer1M}
                                        onChange={e => setPricingForm({ ...pricingForm, outputPer1M: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                💡 That's <strong>${(pricingForm.inputPer1M / 100).toFixed(2)}</strong>/1M input and <strong>${(pricingForm.outputPer1M / 100).toFixed(2)}</strong>/1M output tokens.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowPricingModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSavePricing} disabled={savingPricing || !pricingForm.modelName}>
                                {savingPricing ? 'Saving...' : editingPricing ? 'Save Changes' : 'Add Model'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
