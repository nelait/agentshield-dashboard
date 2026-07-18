import { useState, useEffect, useCallback } from 'react';
import { HiSignal, HiChartBar, HiArrowTopRightOnSquare, HiClock, HiFingerPrint, HiCog6Tooth, HiCheckCircle, HiXCircle, HiArrowPath, HiShieldCheck, HiExclamationTriangle, HiBolt, HiXMark, HiClipboard, HiDocumentText, HiServerStack, HiUser, HiGlobeAlt } from 'react-icons/hi2';
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
    const [selectedTrace, setSelectedTrace] = useState(null);
    const [copiedField, setCopiedField] = useState(null);
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

    const handleCopyField = (value, fieldName) => {
        navigator.clipboard.writeText(value).then(() => {
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        });
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
                        Click a Trace ID to view details
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
                                    style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                                    onClick={() => setSelectedTrace(trace)}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                                        <HiClock style={{ fontSize: 12, marginRight: 4, verticalAlign: -1 }} />
                                        {new Date(trace.recorded_at).toLocaleTimeString()}
                                    </td>
                                    <td>
                                        <code
                                            style={{
                                                background: 'var(--bg-input)', padding: '3px 8px',
                                                borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
                                                color: 'var(--accent-primary)',
                                                transition: 'all 0.15s', display: 'inline-flex',
                                                alignItems: 'center', gap: 4,
                                            }}
                                        >
                                            {(trace.trace_id || '').substring(0, 16)}…
                                            <HiDocumentText style={{ fontSize: 10 }} />
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

            {/* ═══════════ TRACE DETAIL MODAL ═══════════ */}
            {selectedTrace && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1000, padding: 20,
                    }}
                    onClick={() => setSelectedTrace(null)}
                >
                    <div
                        style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                            borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.06) 100%)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <HiFingerPrint style={{ fontSize: 22, color: 'var(--accent-primary)' }} />
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Trace Detail
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {new Date(selectedTrace.recorded_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTrace(null)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: 20, padding: 4,
                                    borderRadius: 6, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                            >
                                <HiXMark />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* Outcome Banner */}
                            <div style={{
                                padding: '14px 18px', borderRadius: 10,
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: selectedTrace.outcome === 'allowed'
                                    ? 'rgba(34,197,94,0.08)' : selectedTrace.outcome === 'denied'
                                    ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                                border: `1px solid ${selectedTrace.outcome === 'allowed'
                                    ? 'rgba(34,197,94,0.25)' : selectedTrace.outcome === 'denied'
                                    ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                            }}>
                                {selectedTrace.outcome === 'allowed'
                                    ? <HiCheckCircle style={{ fontSize: 22, color: 'var(--success)' }} />
                                    : selectedTrace.outcome === 'denied'
                                    ? <HiXCircle style={{ fontSize: 22, color: 'var(--danger)' }} />
                                    : <HiExclamationTriangle style={{ fontSize: 22, color: 'var(--warning)' }} />}
                                <div>
                                    <div style={{
                                        fontSize: 15, fontWeight: 700,
                                        color: selectedTrace.outcome === 'allowed' ? 'var(--success)' : selectedTrace.outcome === 'denied' ? 'var(--danger)' : 'var(--warning)',
                                    }}>
                                        {selectedTrace.outcome === 'allowed' ? 'Request Allowed' : selectedTrace.outcome === 'denied' ? 'Request Denied' : selectedTrace.outcome?.charAt(0).toUpperCase() + selectedTrace.outcome?.slice(1)}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {selectedTrace.event_type} • {selectedTrace.action}
                                    </div>
                                </div>
                                {selectedTrace.latency_ms && (
                                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedTrace.latency_ms}ms</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Latency</div>
                                    </div>
                                )}
                            </div>

                            {/* Trace ID Row */}
                            <div style={{
                                background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                borderRadius: 10, padding: '12px 16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Trace ID</div>
                                    <code style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                                        {selectedTrace.trace_id || '—'}
                                    </code>
                                </div>
                                <button
                                    onClick={() => handleCopyField(selectedTrace.trace_id || '', 'traceId')}
                                    style={{
                                        background: 'none', border: '1px solid var(--border-color)', cursor: 'pointer',
                                        color: copiedField === 'traceId' ? 'var(--success)' : 'var(--text-muted)',
                                        fontSize: 13, padding: '4px 10px', borderRadius: 6,
                                        display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                                    }}
                                >
                                    <HiClipboard /> {copiedField === 'traceId' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>

                            {/* Detail Grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                            }}>
                                {[
                                    { icon: <HiUser style={{ color: 'var(--accent-primary)' }} />, label: 'Actor', value: selectedTrace.actor_email || selectedTrace.actor_id || '—' },
                                    { icon: <HiServerStack style={{ color: 'var(--accent-primary)' }} />, label: 'Agent', value: selectedTrace.agent_name || selectedTrace.agent_slug || '—' },
                                    { icon: <HiGlobeAlt style={{ color: 'var(--accent-primary)' }} />, label: 'IP Address', value: selectedTrace.ip_address || '—' },
                                    { icon: <HiBolt style={{ color: 'var(--accent-primary)' }} />, label: 'Event Type', value: selectedTrace.event_type || '—' },
                                    { icon: <HiShieldCheck style={{ color: 'var(--accent-primary)' }} />, label: 'Policy', value: selectedTrace.policy_applied || '—' },
                                    { icon: <HiClock style={{ color: 'var(--accent-primary)' }} />, label: 'Recorded At', value: selectedTrace.recorded_at ? new Date(selectedTrace.recorded_at).toLocaleString() : '—' },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                        borderRadius: 8, padding: '10px 14px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            {item.icon}
                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                                {item.label}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Guardrail Violations */}
                            {selectedTrace.guardrail_violations && (
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                                        Guardrail Violations
                                    </div>
                                    <div style={{
                                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 8, padding: 14, fontSize: 13,
                                    }}>
                                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {typeof selectedTrace.guardrail_violations === 'string'
                                                ? selectedTrace.guardrail_violations
                                                : JSON.stringify(selectedTrace.guardrail_violations, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Denial Reason */}
                            {selectedTrace.denial_reason && (
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                                        Denial Reason
                                    </div>
                                    <div style={{
                                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--danger)',
                                    }}>
                                        {selectedTrace.denial_reason}
                                    </div>
                                </div>
                            )}

                            {/* Full JSON */}
                            <details style={{ marginTop: 4 }}>
                                <summary style={{
                                    fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: 0.8, cursor: 'pointer',
                                    padding: '8px 0', userSelect: 'none',
                                }}>
                                    Raw Event JSON
                                </summary>
                                <div style={{
                                    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                    borderRadius: 8, padding: 14, marginTop: 8, position: 'relative',
                                }}>
                                    <button
                                        onClick={() => handleCopyField(JSON.stringify(selectedTrace, null, 2), 'json')}
                                        style={{
                                            position: 'absolute', top: 8, right: 8,
                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                            cursor: 'pointer', color: copiedField === 'json' ? 'var(--success)' : 'var(--text-muted)',
                                            fontSize: 11, padding: '3px 8px', borderRadius: 4,
                                            display: 'flex', alignItems: 'center', gap: 3,
                                        }}
                                    >
                                        <HiClipboard /> {copiedField === 'json' ? '✓' : 'Copy'}
                                    </button>
                                    <pre style={{
                                        margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                                        color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all', maxHeight: 300, overflow: 'auto',
                                        lineHeight: 1.6,
                                    }}>
                                        {JSON.stringify(selectedTrace, null, 2)}
                                    </pre>
                                </div>
                            </details>

                            {/* External Jaeger Link (if configured and not localhost) */}
                            {config.jaegerUrl && !config.jaegerUrl.includes('localhost') && selectedTrace.trace_id && (
                                <a
                                    href={`${config.jaegerUrl}/trace/${(selectedTrace.trace_id || '').replace(/-/g, '').substring(0, 32)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '10px 16px', borderRadius: 8,
                                        background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                                        color: 'var(--accent-primary)', textDecoration: 'none',
                                        fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
                                >
                                    <HiArrowTopRightOnSquare /> Open in Jaeger UI
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
            `}
            </style>
        </div>
    );
}

