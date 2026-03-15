import { useState, useEffect } from 'react';
import { HiShieldCheck, HiServer, HiExclamationTriangle, HiCurrencyDollar, HiChartBar } from 'react-icons/hi2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [evalStats, setEvalStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.getDashboard();
            setData(res.data);
            try { const evalRes = await api.getEvalStats(); setEvalStats(evalRes.data); } catch (e) { /* eval stats optional */ }
        } catch (err) {
            // Fallback mock data
            setData({
                agents: { total: '0', active: '0', healthy: '0', unhealthy: '0' },
                audit: { total_events: '0', allowed: '0', denied: '0', errors: '0', avg_latency_ms: '0' },
                compliance: { total_samples: '0', flagged_count: '0', pii_detected_count: '0', samples_last_24h: '0' },
                cost: { total_tokens: '0', total_cost_cents: '0', total_requests: '0', tokens_last_24h: '0', cost_last_24h: '0' },
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) return <div className="empty-state"><div className="icon">⏳</div><h4>Loading dashboard...</h4></div>;

    const d = data;
    const totalCostDollars = (parseInt(d.cost?.total_cost_cents || 0) / 100).toFixed(2);
    const costLast24h = (parseInt(d.cost?.cost_last_24h || 0) / 100).toFixed(2);

    // Build chart data from audit stats
    const policyBreakdown = [
        { name: 'Allowed', value: parseInt(d.audit?.allowed || 0) },
        { name: 'Denied', value: parseInt(d.audit?.denied || 0) },
        { name: 'Errors', value: parseInt(d.audit?.errors || 0) },
    ].filter(i => i.value > 0);

    return (
        <div>
            {/* Stat Cards */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon primary"><HiServer /></div>
                    <div className="stat-content">
                        <h4>Registered Agents</h4>
                        <div className="value">{d.agents?.total || 0}</div>
                        <div className="sub">{d.agents?.active || 0} active · {d.agents?.healthy || 0} healthy</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><HiShieldCheck /></div>
                    <div className="stat-content">
                        <h4>Requests (24h)</h4>
                        <div className="value">{parseInt(d.audit?.total_events || 0).toLocaleString()}</div>
                        <div className="sub">{d.audit?.allowed || 0} allowed · {d.audit?.denied || 0} denied</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning"><HiExclamationTriangle /></div>
                    <div className="stat-content">
                        <h4>Compliance Flags</h4>
                        <div className="value">{d.compliance?.flagged_count || 0}</div>
                        <div className="sub">{d.compliance?.pii_detected_count || 0} PII detected · {d.compliance?.samples_last_24h || 0} sampled</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info"><HiCurrencyDollar /></div>
                    <div className="stat-content">
                        <h4>Total Cost</h4>
                        <div className="value">${totalCostDollars}</div>
                        <div className="sub">${costLast24h} last 24h · {parseInt(d.cost?.total_tokens || 0).toLocaleString()} tokens</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}><HiChartBar /></div>
                    <div className="stat-content">
                        <h4>Agent Evaluations</h4>
                        <div className="value">{evalStats?.last_score != null ? `${Math.round(evalStats.last_score)}%` : '—'}</div>
                        <div className="sub">{evalStats?.total_suites || 0} suites · {evalStats?.total_runs || 0} runs · {evalStats?.pending_reviews || 0} reviews</div>
                    </div>
                </div>
            </div>

            {/* Policy Decisions Chart */}
            {policyBreakdown.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h3>Policy Decisions</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={policyBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                outerRadius={90} innerRadius={55} paddingAngle={3} stroke="none">
                                {policyBreakdown.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid #2a3050', borderRadius: 8, color: '#f1f5f9' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: -8 }}>
                        {policyBreakdown.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
                                {item.name}: {item.value}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state when no data */}
            {parseInt(d.agents?.total || 0) === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="icon">🚀</div>
                        <h4>Welcome to AgentShield!</h4>
                        <p>Start by registering agents in the Agent Registry, then create workflows and policies.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
