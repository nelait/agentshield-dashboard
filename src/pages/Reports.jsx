import { useState, useEffect, useCallback } from 'react';
import {
    HiDocumentArrowDown, HiArrowPath, HiChevronLeft, HiFunnel,
    HiCalendarDays, HiTableCells, HiChartBar as HiChartBarIcon
} from 'react-icons/hi2';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
    CartesianGrid
} from 'recharts';
import api from '../api';

// ── Palette ──────────────────────────────────────────────
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#ec4899'];
const CHART_TOOLTIP = { background: '#1a1f35', border: '1px solid #2a3050', borderRadius: 8, color: '#f1f5f9' };

// ── Category icons & colors ──────────────────────────────
const CATEGORY_STYLES = {
    'Security & Access':   { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    'Compliance & Audit':  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Cost & Usage':        { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    'Agent Performance':   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    'Guardrails':          { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    'Executive':           { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

export default function Reports() {
    const [reportTypes, setReportTypes] = useState([]);
    const [selectedType, setSelectedType] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTypes, setLoadingTypes] = useState(true);
    const [dateRange, setDateRange] = useState({ from: _defaultFrom(), to: _defaultTo() });
    const [error, setError] = useState(null);

    // Load report types on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await api.getReportTypes();
                setReportTypes(res.data || []);
            } catch (e) { console.error(e); }
            finally { setLoadingTypes(false); }
        })();
    }, []);

    // Generate a report
    const generateReport = useCallback(async (type) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (dateRange.from) params.set('from', new Date(dateRange.from).toISOString());
            if (dateRange.to) params.set('to', new Date(dateRange.to).toISOString());
            const res = await api.generateReport(type, params.toString());
            setReportData(res.data);
            setSelectedType(type);
        } catch (e) {
            setError(e.message);
            console.error(e);
        } finally { setLoading(false); }
    }, [dateRange]);

    // Export handler
    const handleExport = (format) => {
        if (!selectedType) return;
        const params = new URLSearchParams();
        if (dateRange.from) params.set('from', new Date(dateRange.from).toISOString());
        if (dateRange.to) params.set('to', new Date(dateRange.to).toISOString());
        const url = api.getReportExportUrl(selectedType, format, params.toString());
        window.open(url, '_blank');
    };

    // ── REPORT TYPE SELECTOR (Landing) ──
    if (!selectedType) {
        const grouped = {};
        reportTypes.forEach(rt => {
            if (!grouped[rt.category]) grouped[rt.category] = [];
            grouped[rt.category].push(rt);
        });

        return (
            <div>
                {/* Date Range Filter */}
                <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <HiCalendarDays style={{ fontSize: 18, color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Report Period:</span>
                        <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))}
                            style={dateInputStyle} />
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))}
                            style={dateInputStyle} />
                    </div>
                </div>

                {loadingTypes ? (
                    <div className="empty-state"><div className="icon">⏳</div><h4>Loading report types...</h4></div>
                ) : (
                    Object.entries(grouped).map(([category, types]) => {
                        const cs = CATEGORY_STYLES[category] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
                        return (
                            <div key={category} style={{ marginBottom: 28 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 4 }}>
                                    <div style={{ width: 4, height: 20, borderRadius: 2, background: cs.color }} />
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{category}</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                                    {types.map(rt => (
                                        <button key={rt.type} onClick={() => generateReport(rt.type)}
                                            disabled={loading}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px',
                                                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                                                borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                                                transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = cs.color; e.currentTarget.style.boxShadow = `0 0 20px ${cs.bg}`; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            <div style={{
                                                fontSize: 24, width: 44, height: 44, borderRadius: 10,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: cs.bg, flexShrink: 0,
                                            }}>
                                                {rt.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{rt.label}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{_reportDescription(rt.type)}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}

                {loading && <LoadingOverlay />}
            </div>
        );
    }

    // ── REPORT VIEW ──
    const meta = reportTypes.find(rt => rt.type === selectedType);

    return (
        <div>
            {/* Header toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => { setSelectedType(null); setReportData(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiChevronLeft /> Back
                    </button>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
                        {meta?.icon} {meta?.label || selectedType}
                    </h3>
                    <span className="badge badge-info" style={{ fontSize: 11 }}>{meta?.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" value={dateRange.from} onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} style={dateInputStyle} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
                    <input type="date" value={dateRange.to} onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} style={dateInputStyle} />
                    <button className="btn btn-secondary" onClick={() => generateReport(selectedType)} disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiArrowPath className={loading ? 'spin' : ''} /> Refresh
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleExport('csv')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiDocumentArrowDown /> CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleExport('xlsx')}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiTableCells /> XLSX
                    </button>
                </div>
            </div>

            {error && <div className="badge badge-danger" style={{ marginBottom: 16, padding: '10px 16px', fontSize: 13 }}>Error: {error}</div>}

            {loading && <LoadingOverlay />}
            {!loading && reportData && <ReportRenderer type={selectedType} data={reportData} />}
        </div>
    );
}

// ============================================
// REPORT RENDERER — dispatches to type-specific views
// ============================================
function ReportRenderer({ type, data }) {
    const renderers = {
        access_decisions: AccessDecisionsReport,
        policy_effectiveness: PolicyEffectivenessReport,
        compliance_posture: CompliancePostureReport,
        compliance_history: ComplianceHistoryReport,
        pii_exposure: PiiExposureReport,
        audit_export: AuditExportReport,
        cost_overview: CostOverviewReport,
        budget_utilization: BudgetUtilizationReport,
        token_usage: TokenUsageReport,
        agent_health: AgentHealthReport,
        agent_scorecard: AgentScorecardReport,
        agent_invocations: AgentInvocationsReport,
        guardrail_violations: GuardrailViolationsReport,
        guardrail_coverage: GuardrailCoverageReport,
        governance_posture: GovernancePostureReport,
        workflow_execution: WorkflowExecutionReport,
    };
    const Component = renderers[type] || GenericReport;
    return <Component data={data} />;
}

// ============================================
// 1. ACCESS DECISIONS
// ============================================
function AccessDecisionsReport({ data }) {
    const s = data.summary || {};
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Total Requests" value={fmt(s.total_requests)} sub={`Avg latency: ${s.avg_latency_ms || 0}ms`} color="#6366f1" />
                <StatCard label="Allowed" value={fmt(s.allowed)} sub={`${s.allow_rate}%`} color="#22c55e" />
                <StatCard label="Denied" value={fmt(s.denied)} sub={`${s.deny_rate}%`} color="#ef4444" />
                <StatCard label="Errors" value={fmt(s.errors)} color="#f59e0b" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 20 }}>
                <div className="card">
                    <div className="card-header"><h3>Daily Access Trend</h3></div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.daily_trend || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Area type="monotone" dataKey="allowed" stackId="1" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" />
                            <Area type="monotone" dataKey="denied" stackId="1" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" />
                            <Area type="monotone" dataKey="errors" stackId="1" fill="#f59e0b" fillOpacity={0.3} stroke="#f59e0b" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="card-header"><h3>By Event Type</h3></div>
                    {data.by_event_type?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={data.by_event_type} dataKey="total" nameKey="event_type"
                                    cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} stroke="none">
                                    {data.by_event_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={CHART_TOOLTIP} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <EmptyChart />}
                    <ChartLegend items={data.by_event_type?.map((e, i) => ({ label: e.event_type, value: e.total, color: COLORS[i % COLORS.length] })) || []} />
                </div>
            </div>

            {data.top_denied_actors?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Top Denied Actors</h3></div>
                    <DataTable columns={['Actor ID', 'Type', 'Deny Count']}
                        rows={data.top_denied_actors.map(a => [a.actor_id?.substring(0, 12) + '…', a.actor_type, a.deny_count])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 2. POLICY EFFECTIVENESS
// ============================================
function PolicyEffectivenessReport({ data }) {
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Active Policies" value={data.total_active_policies || 0} color="#6366f1" />
                <StatCard label="Policies with Hits" value={data.policy_hits?.length || 0} color="#22c55e" />
                <StatCard label="Dormant Policies" value={data.dormant_policies?.length || 0} sub="Zero matches" color="#f59e0b" />
            </div>

            {data.policy_hits?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Policy Hit Counts</h3></div>
                    <ResponsiveContainer width="100%" height={Math.max(200, data.policy_hits.length * 40)}>
                        <BarChart data={data.policy_hits} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis dataKey="policy_name" type="category" width={180} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} />
                            <Bar dataKey="allowed" fill="#22c55e" stackId="a" name="Allowed" />
                            <Bar dataKey="denied" fill="#ef4444" stackId="a" name="Denied" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {data.dormant_policies?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>⚠️ Dormant Policies (No Matches)</h3></div>
                    <DataTable columns={['Name', 'Type', 'Priority', 'Created']}
                        rows={data.dormant_policies.map(p => [p.name, p.policy_type, p.priority, fmtDate(p.created_at)])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 3. COMPLIANCE POSTURE
// ============================================
function CompliancePostureReport({ data }) {
    const pii = data.pii_summary || {};
    return (
        <div>
            <div className="stat-grid">
                {(data.by_framework || []).map(fw => (
                    <StatCard key={fw.framework} label={fw.framework.toUpperCase()}
                        value={`${fw.pass_rate}%`}
                        sub={`${fw.passed}/${fw.total_checks} passed`}
                        color={Number(fw.pass_rate) >= 80 ? '#22c55e' : Number(fw.pass_rate) >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
                <StatCard label="PII Detected" value={pii.pii_found || 0} sub={`${pii.flagged || 0} flagged / ${pii.total_samples || 0} sampled`} color="#ef4444" />
            </div>

            {data.trend?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Compliance Check Trend</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Bar dataKey="passed" fill="#22c55e" name="Passed" />
                            <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ============================================
// 4. COMPLIANCE HISTORY
// ============================================
function ComplianceHistoryReport({ data }) {
    return (
        <div>
            {data.checks?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Recent Compliance Checks</h3></div>
                    <DataTable columns={['Config', 'Framework', 'Status', 'Passed', 'Failed', 'Source', 'Date']}
                        rows={data.checks.map(c => [
                            c.config_name, c.framework?.toUpperCase(),
                            <StatusBadge key={c.id} status={c.status} />,
                            c.passed_rules, c.failed_rules, c.sample_source, fmtDate(c.started_at),
                        ])} />
                </div>
            )}

            {data.persistent_failures?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>🔴 Persistently Failing Rules</h3></div>
                    <DataTable columns={['Rule Name', 'Failure Count']}
                        rows={data.persistent_failures.map(r => [r.rule_name, r.failure_count])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 5. PII EXPOSURE
// ============================================
function PiiExposureReport({ data }) {
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {data.by_type?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>PII by Type</h3></div>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={data.by_type} dataKey="count" nameKey="pii_type"
                                    cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} stroke="none">
                                    {data.by_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={CHART_TOOLTIP} />
                            </PieChart>
                        </ResponsiveContainer>
                        <ChartLegend items={data.by_type.map((t, i) => ({ label: t.pii_type, value: t.count, color: COLORS[i % COLORS.length] }))} />
                    </div>
                )}
                {data.by_agent?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>PII by Agent</h3></div>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.by_agent} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <YAxis dataKey="agent_name" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={CHART_TOOLTIP} />
                                <Bar dataKey="pii_count" fill="#ef4444" name="PII Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {data.trend?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>PII Detection Trend</h3></div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Area type="monotone" dataKey="pii_detected" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" name="PII Detected" />
                            <Area type="monotone" dataKey="total_sampled" fill="#6366f1" fillOpacity={0.1} stroke="#6366f1" name="Total Sampled" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ============================================
// 6. AUDIT EXPORT
// ============================================
function AuditExportReport({ data }) {
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Records Exported" value={fmt(data.total_records)} color="#6366f1" />
            </div>
            {data.records?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Audit Records Preview (first 50)</h3></div>
                    <div style={{ overflowX: 'auto' }}>
                        <DataTable columns={['Trace ID', 'Event', 'Action', 'Outcome', 'Actor', 'Latency', 'Time']}
                            rows={data.records.slice(0, 50).map(r => [
                                r.trace_id?.substring(0, 12) + '…', r.event_type, r.action,
                                <StatusBadge key={r.id} status={r.outcome} />,
                                r.actor_type || '—', r.latency_ms ? `${r.latency_ms}ms` : '—', fmtDateTime(r.recorded_at),
                            ])} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// 7. COST OVERVIEW
// ============================================
function CostOverviewReport({ data }) {
    const s = data.summary || {};
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Total Spend" value={`$${s.total_cost_dollars || '0.00'}`} color="#22c55e" />
                <StatCard label="Total Tokens" value={fmt(s.total_tokens)} sub={`In: ${fmt(s.total_input_tokens)} / Out: ${fmt(s.total_output_tokens)}`} color="#6366f1" />
                <StatCard label="Requests" value={fmt(s.total_requests)} color="#3b82f6" />
            </div>

            {data.daily_trend?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Daily Cost Trend</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={data.daily_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v / 100).toFixed(0)}`} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} formatter={(v) => [`$${(v / 100).toFixed(2)}`, 'Cost']} />
                            <Area type="monotone" dataKey="cost_cents" fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" name="Cost" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                {data.by_agent?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>Cost by Agent</h3></div>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.by_agent} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `$${(v / 100).toFixed(0)}`} />
                                <YAxis dataKey="agent_name" type="category" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => [`$${(v / 100).toFixed(2)}`, 'Cost']} />
                                <Bar dataKey="cost_cents" fill="#22c55e" name="Cost" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
                {data.by_model?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>Cost by Model</h3></div>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={data.by_model} dataKey="cost_cents" nameKey="model_name"
                                    cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3} stroke="none">
                                    {data.by_model.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => [`$${(v / 100).toFixed(2)}`, 'Cost']} />
                            </PieChart>
                        </ResponsiveContainer>
                        <ChartLegend items={data.by_model.map((m, i) => ({ label: m.model_name, value: `$${(m.cost_cents / 100).toFixed(2)}`, color: COLORS[i % COLORS.length] }))} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// 8. BUDGET UTILIZATION
// ============================================
function BudgetUtilizationReport({ data }) {
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Total Budgets" value={data.total_budgets || 0} color="#6366f1" />
                <StatCard label="Over Threshold" value={data.over_threshold_count || 0} color={data.over_threshold_count > 0 ? '#ef4444' : '#22c55e'} />
            </div>
            {data.budgets?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Budget Status</h3></div>
                    <DataTable columns={['Name', 'Scope', 'Period', 'Token Usage', 'Cost Usage', 'Status']}
                        rows={data.budgets.map(b => [
                            b.name, `${b.scope_type}: ${b.scope_id}`, b.period,
                            <ProgressBar key={`t-${b.id}`} pct={parseFloat(b.token_utilization_pct)} label={`${fmt(b.current_tokens)} / ${fmt(b.token_limit)}`} />,
                            <ProgressBar key={`c-${b.id}`} pct={parseFloat(b.cost_utilization_pct)} label={`$${(b.current_cost_cents / 100).toFixed(2)} / $${(b.cost_limit_cents / 100).toFixed(2)}`} />,
                            b.hard_limit ? <span className="badge badge-danger">Hard Limit</span> : <span className="badge badge-info">Soft</span>,
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 9. TOKEN USAGE
// ============================================
function TokenUsageReport({ data }) {
    return (
        <div>
            {data.daily_trend?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Token Consumption Trend</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={data.daily_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Area type="monotone" dataKey="input_tokens" stackId="1" fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" name="Input" />
                            <Area type="monotone" dataKey="output_tokens" stackId="1" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" name="Output" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                {data.by_agent_ratio?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>Input/Output Ratio by Agent</h3></div>
                        <DataTable columns={['Agent', 'Input Tokens', 'Output Tokens', 'Ratio']}
                            rows={data.by_agent_ratio.map(a => [a.agent_name, fmt(a.input_tokens), fmt(a.output_tokens), a.output_input_ratio])} />
                    </div>
                )}
                {data.by_model?.length > 0 && (
                    <div className="card">
                        <div className="card-header"><h3>Model Utilization</h3></div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={data.by_model}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                                <XAxis dataKey="model_name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip contentStyle={CHART_TOOLTIP} />
                                <Bar dataKey="total_tokens" fill="#6366f1" name="Tokens" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {data.top_outliers?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>🔥 Top 10 Most Token-Expensive Requests</h3></div>
                    <DataTable columns={['Agent', 'Model', 'Total Tokens', 'Cost', 'Time']}
                        rows={data.top_outliers.map(o => [
                            o.agent_name || '—', o.model_name || '—', fmt(o.total_tokens),
                            `$${(o.cost_cents / 100).toFixed(2)}`, fmtDateTime(o.recorded_at),
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 10. AGENT HEALTH
// ============================================
function AgentHealthReport({ data }) {
    const s = data.summary || {};
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Total Agents" value={s.total} color="#6366f1" />
                <StatCard label="Healthy" value={s.healthy} color="#22c55e" />
                <StatCard label="Unhealthy" value={s.unhealthy} color="#ef4444" />
                <StatCard label="Unknown" value={s.unknown} color="#94a3b8" />
            </div>
            {data.agents?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>Agent Fleet Status</h3></div>
                    <DataTable columns={['Name', 'Slug', 'Protocol', 'Status', 'Failures', 'Last Check']}
                        rows={data.agents.map(a => [
                            a.name, a.slug, a.protocol,
                            <HealthBadge key={a.id} status={a.health_status} />,
                            a.consecutive_failures || 0,
                            a.last_health_check ? fmtDateTime(a.last_health_check) : 'Never',
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 11. AGENT SCORECARD
// ============================================
function AgentScorecardReport({ data }) {
    return (
        <div>
            {data.score_trend?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Evaluation Score Trend</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={data.score_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Line type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
            {data.runs?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Evaluation Runs</h3></div>
                    <DataTable columns={['Agent', 'Suite', 'Mode', 'Score', 'Pass/Fail', 'Review', 'Status', 'Date']}
                        rows={data.runs.map(r => [
                            r.agent_name, r.suite_name, r.eval_mode,
                            r.overall_score != null ? `${Number(r.overall_score).toFixed(1)}%` : '—',
                            `${r.passed_scenarios}/${r.total_scenarios}`,
                            r.needs_review || 0,
                            <StatusBadge key={r.id} status={r.status} />,
                            fmtDate(r.started_at),
                        ])} />
                </div>
            )}
            {data.review_summary?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>HITL Review Summary</h3></div>
                    <DataTable columns={['Action', 'Count']}
                        rows={data.review_summary.map(r => [r.review_action || 'Pending', r.count])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 12. AGENT INVOCATIONS
// ============================================
function AgentInvocationsReport({ data }) {
    return (
        <div>
            {data.daily_trend?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Invocation Volume</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={data.daily_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Area type="monotone" dataKey="invocations" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" name="Invocations" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            {data.by_agent?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>By Agent</h3></div>
                    <DataTable columns={['Agent ID', 'Invocations', 'Avg Latency', 'Min', 'Max', 'Success', 'Errors']}
                        rows={data.by_agent.map(a => [
                            a.agent_id?.substring(0, 12) + '…', a.invocation_count,
                            `${a.avg_latency_ms}ms`, `${a.min_latency_ms}ms`, `${a.max_latency_ms}ms`,
                            a.success_count, a.error_count,
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 13. GUARDRAIL VIOLATIONS
// ============================================
function GuardrailViolationsReport({ data }) {
    return (
        <div>
            {data.by_rule_type?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Violations by Rule Type</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.by_rule_type}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="rule_type" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} />
                            <Bar dataKey="total_failures" fill="#ef4444" name="Failures" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {data.test_runs?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Recent Test Runs</h3></div>
                    <DataTable columns={['Profile', 'Mode', 'Agent', 'Status', 'Pass/Fail', 'Date']}
                        rows={data.test_runs.map(r => [
                            r.profile_name, r.mode, r.agent_name || '—',
                            <StatusBadge key={r.started_at} status={r.status} />,
                            `${r.passed_tests}/${r.total_tests}`, fmtDate(r.started_at),
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 14. GUARDRAIL COVERAGE
// ============================================
function GuardrailCoverageReport({ data }) {
    const s = data.summary || {};
    return (
        <div>
            <div className="stat-grid">
                <StatCard label="Total Agents" value={s.total_agents} color="#6366f1" />
                <StatCard label="Protected" value={s.protected_count} color="#22c55e" />
                <StatCard label="Unprotected" value={s.unprotected_count} color="#ef4444" />
                <StatCard label="Coverage" value={`${s.coverage_pct}%`} color={Number(s.coverage_pct) >= 80 ? '#22c55e' : '#f59e0b'} />
            </div>
            {data.unprotected_agents?.length > 0 && (
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header"><h3>⚠️ Unprotected Agents</h3></div>
                    <DataTable columns={['Name', 'Slug']}
                        rows={data.unprotected_agents.map(a => [a.name, a.slug])} />
                </div>
            )}
            {data.protected_agents?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Protected Agents</h3></div>
                    <DataTable columns={['Name', 'Slug', 'Profiles']}
                        rows={data.protected_agents.map(a => [a.name, a.slug, (a.profile_names || []).filter(Boolean).join(', ')])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 15. GOVERNANCE POSTURE
// ============================================
function GovernancePostureReport({ data }) {
    const sec = data.security || {};
    const comp = data.compliance || {};
    const cost = data.cost || {};
    const agents = data.agents?.fleet || {};
    const guard = data.guardrails || {};
    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
                <MiniPostureCard icon="🛡️" title="Security" value={`${sec.deny_rate || 0}% deny`} sub={`${fmt(sec.total_requests)} requests`}
                    color={Number(sec.deny_rate) <= 5 ? '#22c55e' : '#f59e0b'} />
                <MiniPostureCard icon="📋" title="Compliance" value={`${comp.frameworks?.length || 0} frameworks`}
                    sub={`PII: ${comp.pii?.pii_found || 0}`} color={comp.pii?.pii_found > 0 ? '#f59e0b' : '#22c55e'} />
                <MiniPostureCard icon="💰" title="Cost" value={`$${cost.total_spend || '0.00'}`}
                    sub={`${cost.top_agents?.length || 0} agents billed`} color="#22c55e" />
                <MiniPostureCard icon="🤖" title="Agents" value={`${agents.healthy || 0}/${agents.total || 0} healthy`}
                    sub={`${agents.unhealthy || 0} unhealthy`} color={agents.unhealthy > 0 ? '#ef4444' : '#22c55e'} />
                <MiniPostureCard icon="🚧" title="Guardrails" value={`${guard.violation_count || 0} violations`}
                    sub={`${guard.threat_types?.length || 0} types`} color={guard.violation_count > 0 ? '#f59e0b' : '#22c55e'} />
            </div>

            {comp.frameworks?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>Compliance by Framework</h3></div>
                    <DataTable columns={['Framework', 'Checks', 'Pass Rate', 'Status']}
                        rows={comp.frameworks.map(fw => [
                            fw.framework?.toUpperCase(), fw.total_checks,
                            `${fw.pass_rate}%`,
                            <RagBadge key={fw.framework} value={Number(fw.pass_rate)} />,
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// 16. WORKFLOW EXECUTION
// ============================================
function WorkflowExecutionReport({ data }) {
    return (
        <div>
            {data.daily_trend?.length > 0 && (
                <div className="card">
                    <div className="card-header"><h3>Workflow Execution Trend</h3></div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={data.daily_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
                            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={fmtDate} />
                            <Area type="monotone" dataKey="executions" fill="#a855f7" fillOpacity={0.2} stroke="#a855f7" name="Executions" />
                            <Area type="monotone" dataKey="errors" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" name="Errors" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            {data.by_workflow?.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header"><h3>By Workflow</h3></div>
                    <DataTable columns={['Workflow ID', 'Executions', 'Success', 'Errors', 'Avg Latency', 'Max Latency']}
                        rows={data.by_workflow.map(w => [
                            w.workflow_id?.substring(0, 12) + '…', w.execution_count,
                            w.success_count, w.error_count,
                            `${w.avg_latency_ms || 0}ms`, `${w.max_latency_ms || 0}ms`,
                        ])} />
                </div>
            )}
        </div>
    );
}

// ============================================
// GENERIC FALLBACK
// ============================================
function GenericReport({ data }) {
    return (
        <div className="card">
            <pre style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'auto', maxHeight: 500 }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function StatCard({ label, value, sub, color }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: `${color}20`, color }}><HiChartBarIcon /></div>
            <div className="stat-content">
                <h4>{label}</h4>
                <div className="value">{value}</div>
                {sub && <div className="sub">{sub}</div>}
            </div>
        </div>
    );
}

function DataTable({ columns, rows }) {
    return (
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr>{columns.map((c, i) => <th key={i} style={thStyle}>{c}</th>)}</tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        {row.map((cell, ci) => <td key={ci} style={tdStyle}>{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function StatusBadge({ status }) {
    const map = {
        passed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
        completed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
        allowed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
        failed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        denied: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        error: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
        partial: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
        running: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
        pending_review: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
    };
    const s = map[status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
    return <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
}

function HealthBadge({ status }) {
    const map = { healthy: '#22c55e', unhealthy: '#ef4444', degraded: '#f59e0b', unknown: '#94a3b8' };
    const color = map[status] || '#94a3b8';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {status}
        </span>
    );
}

function RagBadge({ value }) {
    const color = value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444';
    const label = value >= 80 ? 'GREEN' : value >= 50 ? 'AMBER' : 'RED';
    return <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${color}20`, color }}>{label}</span>;
}

function ProgressBar({ pct, label }) {
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
    return (
        <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                <span>{label}</span><span style={{ color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border-color)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.3s' }} />
            </div>
        </div>
    );
}

function MiniPostureCard({ icon, title, value, sub, color }) {
    return (
        <div className="card" style={{ padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

function ChartLegend({ items }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '8px 0' }}>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                    {item.label}: {item.value}
                </div>
            ))}
        </div>
    );
}

function EmptyChart() {
    return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div>;
}

function LoadingOverlay() {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div className="card" style={{ padding: '30px 40px', textAlign: 'center' }}>
                <div className="spin" style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Generating report...</div>
            </div>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================
function fmt(n) { return (parseInt(n) || 0).toLocaleString(); }
function fmtDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return d; } }
function fmtDateTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }
function _defaultFrom() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); }
function _defaultTo() { return new Date().toISOString().slice(0, 10); }

function _reportDescription(type) {
    const map = {
        access_decisions: 'Allowed vs denied requests, top denied actors and resources',
        policy_effectiveness: 'Policy hit counts, dormant policies, deny-to-allow ratios',
        compliance_posture: 'Framework pass rates, PII detection, compliance trends',
        compliance_history: 'Chronological compliance check results and failing rules',
        pii_exposure: 'PII detected by type, agent, and over time',
        audit_export: 'Full immutable audit trail export for regulators',
        cost_overview: 'Total spend, daily trends, cost by agent and model',
        budget_utilization: 'Budget consumption vs allocation, threshold alerts',
        token_usage: 'Input/output ratios, model utilization, outlier detection',
        agent_health: 'Fleet health status, consecutive failures, availability',
        agent_scorecard: 'Three-layer eval scores, trends, HITL review summary',
        agent_invocations: 'Volume, latency, success rates, peak usage patterns',
        guardrail_violations: 'Violations by rule type, severity, and test run results',
        guardrail_coverage: 'Protected vs unprotected agents, coverage gaps',
        governance_posture: 'Executive summary across security, compliance, cost, agents',
        workflow_execution: 'Execution counts, error rates, latency per workflow',
    };
    return map[type] || '';
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '2px solid var(--border-color)', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)' };
const dateInputStyle = { background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)', fontSize: 13 };
