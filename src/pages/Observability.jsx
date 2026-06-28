import { useState, useEffect, useCallback } from 'react';
import { HiSignal, HiChartBar, HiArrowTopRightOnSquare, HiClock, HiFingerPrint, HiCog6Tooth, HiCheckCircle, HiXCircle, HiArrowPath, HiShieldCheck, HiExclamationTriangle, HiBolt } from 'react-icons/hi2';
import api from '../api';

const outcomeStyle = { allowed: 'green', denied: 'red', error: 'yellow', info: 'gray' };

function formatUptime(seconds) {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function Observability() {
    const [health, setHealth] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentTraces, setRecentTraces] = useState([]);
    const [config, setConfig] = useState({
        jaegerUrl: localStorage.getItem('agentshield_jaeger_url') || 'http://localhost:16686',
        grafanaUrl: localStorage.getItem('agentshield_grafana_url') || '',
        samplingRate: 100,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [healthRes, statsRes, tracesRes] = await Promise.allSettled([
                api.getOtelHealth(),
                api.getAuditStats(),
                api.listAuditLogs('limit=20'),
            ]);

            if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (tracesRes.status === 'fulfilled') setRecentTraces(tracesRes.value.data || []);
        } catch (err) {
            console.error('Failed to load observability data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    const handleSaveConfig = async () => {
        setSaving(true);
        setSaveSuccess(false);
        try {
            // Save to localStorage for instant use by AuditLog trace links
            localStorage.setItem('agentshield_jaeger_url', config.jaegerUrl);
            if (config.grafanaUrl) localStorage.setItem('agentshield_grafana_url', config.grafanaUrl);

            // Also persist to backend settings
            await api.upsertSetting({
                category: 'observability',
                key: 'jaeger_url',
                value: config.jaegerUrl,
            });
            if (config.grafanaUrl) {
                await api.upsertSetting({
                    category: 'observability',
                    key: 'grafana_url',
                    value: config.grafanaUrl,
                });
            }
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save config:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const isHealthy = health?.exporterHealthy;
    const exporterLabel = health?.exporterType === 'otlp'
        ? health.exporterEndpoint
        : 'Console (Development)';

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ textAlign: 'center' }}>
                    <HiSignal style={{ fontSize: 48, color: 'var(--accent-primary)', marginBottom: 16, animation: 'pulse 2s infinite' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading observability data…</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        OpenTelemetry distributed tracing, metrics, and log correlation
                    </div>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                >
                    <HiArrowPath style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            {/* Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

                {/* Card 1: Trace Exporter */}
                <div className="card" style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.04) 100%)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    transition: 'all 0.2s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HiSignal style={{ fontSize: 20, color: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Trace Exporter
                            </span>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: isHealthy ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: isHealthy ? 'var(--success)' : 'var(--danger)',
                        }}>
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: isHealthy ? 'var(--success)' : 'var(--danger)',
                                boxShadow: isHealthy ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
                                animation: 'pulse 2s infinite',
                            }} />
                            {isHealthy ? 'Connected' : 'Disconnected'}
                        </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, wordBreak: 'break-all' }}>
                        {exporterLabel}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>Service: <strong style={{ color: 'var(--text-secondary)' }}>{health?.serviceName || 'agentshield'}</strong></span>
                        <span>v{health?.serviceVersion || '0.1.0'}</span>
                        <span>Uptime: {formatUptime(health?.uptime)}</span>
                    </div>
                </div>

                {/* Card 2: Metrics Summary */}
                <div className="card" style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(34, 197, 94, 0.04) 100%)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    transition: 'all 0.2s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiChartBar style={{ fontSize: 20, color: 'var(--success)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Audit Metrics
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {stats?.total?.toLocaleString() || '0'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total Events</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
                                {stats?.allowed?.toLocaleString() || '0'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Allowed</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>
                                {stats?.denied?.toLocaleString() || '0'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Denied</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        Sampling: <strong style={{ color: 'var(--text-secondary)' }}>{((health?.samplingRate || 1) * 100).toFixed(0)}%</strong>
                        <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
                        Env: <strong style={{ color: 'var(--text-secondary)' }}>{health?.environment || 'development'}</strong>
                    </div>
                </div>

                {/* Card 3: Quick Links */}
                <div className="card" style={{
                    padding: 20,
                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.04) 100%)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    transition: 'all 0.2s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiArrowTopRightOnSquare style={{ fontSize: 20, color: 'var(--warning)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Quick Links
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <a
                            href={config.jaegerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 8,
                                background: 'var(--bg-input)', color: 'var(--text-primary)',
                                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                                transition: 'all 0.15s', border: '1px solid var(--border-color)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                        >
                            <span style={{ fontSize: 18 }}>🔍</span>
                            <div style={{ flex: 1 }}>
                                <div>Jaeger UI</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Distributed Trace Viewer</div>
                            </div>
                            <HiArrowTopRightOnSquare style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                        </a>
                        {config.grafanaUrl && (
                            <a
                                href={config.grafanaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px', borderRadius: 8,
                                    background: 'var(--bg-input)', color: 'var(--text-primary)',
                                    textDecoration: 'none', fontSize: 13, fontWeight: 500,
                                    transition: 'all 0.15s', border: '1px solid var(--border-color)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                            >
                                <span style={{ fontSize: 18 }}>📊</span>
                                <div style={{ flex: 1 }}>
                                    <div>Grafana</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Metrics Dashboard</div>
                                </div>
                                <HiArrowTopRightOnSquare style={{ color: 'var(--text-muted)', fontSize: 14 }} />
                            </a>
                        )}
                        {!config.grafanaUrl && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 8,
                                background: 'var(--bg-input)', color: 'var(--text-muted)',
                                fontSize: 13, border: '1px dashed var(--border-color)',
                            }}>
                                <span style={{ fontSize: 18 }}>📊</span>
                                <div style={{ flex: 1 }}>
                                    <div>Grafana</div>
                                    <div style={{ fontSize: 11 }}>Configure URL below to enable</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Configuration Section */}
            <div className="card" style={{ padding: 0, border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <HiCog6Tooth style={{ fontSize: 18, color: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Configuration</span>
                </div>
                <div style={{ padding: 20, display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Jaeger URL
                        </label>
                        <input
                            className="form-input"
                            type="url"
                            value={config.jaegerUrl}
                            onChange={e => setConfig(c => ({ ...c, jaegerUrl: e.target.value }))}
                            placeholder="http://localhost:16686"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Grafana URL <span style={{ fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input
                            className="form-input"
                            type="url"
                            value={config.grafanaUrl}
                            onChange={e => setConfig(c => ({ ...c, grafanaUrl: e.target.value }))}
                            placeholder="http://localhost:3001"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveConfig}
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    >
                        {saveSuccess ? <HiCheckCircle /> : saving ? <HiArrowPath style={{ animation: 'spin 1s linear infinite' }} /> : <HiCog6Tooth />}
                        {saveSuccess ? 'Saved!' : saving ? 'Saving…' : 'Save Configuration'}
                    </button>
                </div>
                {saveSuccess && (
                    <div style={{
                        padding: '8px 20px 12px',
                        fontSize: 12, color: 'var(--success)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <HiCheckCircle /> Configuration saved. Trace ID links in Audit Log will use the new Jaeger URL.
                    </div>
                )}
            </div>

            {/* Recent Traces Table */}
            <div className="card" style={{ padding: 0, border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <HiFingerPrint style={{ fontSize: 18, color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Recent Traces</span>
                        <span className="badge gray" style={{ fontSize: 11 }}>{recentTraces.length}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Click a Trace ID to view in Jaeger
                    </span>
                </div>

                {recentTraces.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <HiFingerPrint style={{ fontSize: 36, marginBottom: 8, opacity: 0.3 }} />
                        <div style={{ fontSize: 14 }}>No traces yet. Make some API requests to generate traces.</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Trace ID</th>
                                <th>Event</th>
                                <th>Action</th>
                                <th>Outcome</th>
                                <th>Latency</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTraces.map(trace => (
                                <tr key={trace.id}
                                    style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                                        <HiClock style={{ fontSize: 12, marginRight: 4, verticalAlign: -1 }} />
                                        {new Date(trace.recorded_at).toLocaleTimeString()}
                                    </td>
                                    <td>
                                        <code
                                            title={`View in Jaeger: ${trace.trace_id}`}
                                            onClick={() => {
                                                const hexId = (trace.trace_id || '').replace(/-/g, '').substring(0, 32);
                                                window.open(`${config.jaegerUrl}/trace/${hexId}`, '_blank');
                                            }}
                                            style={{
                                                background: 'var(--bg-input)', padding: '3px 8px',
                                                borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
                                                cursor: 'pointer', color: 'var(--accent-primary)',
                                                transition: 'all 0.15s', display: 'inline-flex',
                                                alignItems: 'center', gap: 4,
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                        >
                                            {(trace.trace_id || '').substring(0, 16)}…
                                            <HiArrowTopRightOnSquare style={{ fontSize: 10 }} />
                                        </code>
                                    </td>
                                    <td><span className="badge gray" style={{ fontSize: 11 }}>{trace.event_type}</span></td>
                                    <td style={{ fontSize: 13, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {trace.action}
                                    </td>
                                    <td>
                                        <span className={`badge ${outcomeStyle[trace.outcome] || 'gray'}`}>
                                            {trace.outcome}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                        {trace.latency_ms ? `${trace.latency_ms}ms` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* CSS Animation for pulse */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
