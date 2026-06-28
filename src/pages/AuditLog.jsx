import { useState, useEffect, useCallback } from 'react';
import { HiMagnifyingGlass, HiArrowPath, HiXMark, HiClock, HiFingerPrint, HiShieldCheck, HiExclamationTriangle, HiBolt, HiUser, HiGlobeAlt, HiFunnel, HiChevronLeft, HiChevronRight, HiXCircle } from 'react-icons/hi2';
import api from '../api';

const outcomeStyle = { allowed: 'green', denied: 'red', error: 'yellow', info: 'gray' };
const outcomeIcon = { allowed: HiShieldCheck, denied: HiExclamationTriangle, error: HiBolt };

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function DetailRow({ label, value, icon: Icon, color }) {
    if (!value && value !== 0) return null;
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
            {Icon && <Icon style={{ fontSize: 16, color: color || 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />}
            <div style={{ minWidth: 120, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all', flex: 1 }}>{value}</div>
        </div>
    );
}

function FilterChip({ label, value, onRemove }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px 4px 12px', borderRadius: 20,
            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)',
            fontSize: 12, fontWeight: 500, transition: 'all 0.15s',
        }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{label}:</span>
            <span>{value}</span>
            <HiXCircle
                onClick={onRemove}
                style={{ fontSize: 15, cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
            />
        </span>
    );
}

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [outcomeFilter, setOutcomeFilter] = useState('all');
    const [eventTypeFilter, setEventTypeFilter] = useState('all');
    const [agentFilter, setAgentFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    // Filter options
    const [filterOptions, setFilterOptions] = useState({ eventTypes: [], resourceTypes: [] });
    const [agents, setAgents] = useState([]);

    // Load filter options on mount
    useEffect(() => {
        loadFilterOptions();
    }, []);

    // Reload logs when filters or pagination change
    useEffect(() => {
        loadLogs();
    }, [outcomeFilter, eventTypeFilter, agentFilter, dateFrom, dateTo, page, pageSize]);

    const loadFilterOptions = async () => {
        try {
            const [filtersRes, agentsRes] = await Promise.all([
                api.getAuditFilters(),
                api.listAgents(),
            ]);
            setFilterOptions(filtersRes.data || { eventTypes: [], resourceTypes: [] });
            setAgents((agentsRes.data || []).map(a => ({ slug: a.slug, name: a.name })));
        } catch (err) { console.error('Failed to load filter options:', err); }
    };

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter);
            if (eventTypeFilter !== 'all') params.set('eventType', eventTypeFilter);
            if (agentFilter !== 'all') params.set('resourceType', 'agent');
            if (dateFrom) params.set('from', new Date(dateFrom).toISOString());
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                params.set('to', toDate.toISOString());
            }
            params.set('limit', String(pageSize));
            params.set('offset', String((page - 1) * pageSize));

            const res = await api.listAuditLogs(params.toString());
            setLogs(res.data || []);
            setTotalCount(res.total || 0);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, outcomeFilter, eventTypeFilter, agentFilter, dateFrom, dateTo, page, pageSize]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadLogs();
    };

    const clearAllFilters = () => {
        setSearch('');
        setOutcomeFilter('all');
        setEventTypeFilter('all');
        setAgentFilter('all');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const hasActiveFilters = search || outcomeFilter !== 'all' || eventTypeFilter !== 'all' || agentFilter !== 'all' || dateFrom || dateTo;

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, totalCount);

    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    };

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push('...');
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
            if (page < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Immutable audit trail of all firewall events</p>
                    {totalCount > 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0' }}>
                            {totalCount.toLocaleString()} total record{totalCount !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); loadLogs(); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HiArrowPath style={{ fontSize: 14 }} /> Refresh
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <HiFunnel style={{ fontSize: 14 }} /> Filters
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {/* Search */}
                    <div style={{ flex: '1 1 220px', minWidth: 180 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Search</label>
                        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                            <HiMagnifyingGlass style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', fontSize: 14 }} />
                            <input className="form-input" placeholder="Trace ID, action, details..." value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ paddingLeft: 32, width: '100%', boxSizing: 'border-box' }} />
                        </form>
                    </div>

                    {/* Event Type */}
                    <div style={{ flex: '0 1 160px', minWidth: 140 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Event Type</label>
                        <select className="form-select" value={eventTypeFilter}
                            onChange={e => { setEventTypeFilter(e.target.value); setPage(1); }}
                            style={{ width: '100%' }}>
                            <option value="all">All Events</option>
                            {filterOptions.eventTypes.map(et => (
                                <option key={et} value={et}>{et.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Agent */}
                    <div style={{ flex: '0 1 180px', minWidth: 140 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Agent</label>
                        <select className="form-select" value={agentFilter}
                            onChange={e => { setAgentFilter(e.target.value); setPage(1); }}
                            style={{ width: '100%' }}>
                            <option value="all">All Agents</option>
                            {agents.map(a => (
                                <option key={a.slug} value={a.slug}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Outcome */}
                    <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>Outcome</label>
                        <select className="form-select" value={outcomeFilter}
                            onChange={e => { setOutcomeFilter(e.target.value); setPage(1); }}
                            style={{ width: '100%' }}>
                            <option value="all">All Outcomes</option>
                            <option value="allowed">Allowed</option>
                            <option value="denied">Denied</option>
                            <option value="error">Error</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div style={{ flex: '0 1 155px', minWidth: 140 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>From</label>
                        <input type="date" className="form-input" value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                            style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>

                    {/* Date To */}
                    <div style={{ flex: '0 1 155px', minWidth: 140 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>To</label>
                        <input type="date" className="form-input" value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                </div>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
                        {search && <FilterChip label="Search" value={search} onRemove={() => { setSearch(''); setPage(1); setTimeout(loadLogs, 0); }} />}
                        {outcomeFilter !== 'all' && <FilterChip label="Outcome" value={outcomeFilter} onRemove={() => { setOutcomeFilter('all'); setPage(1); }} />}
                        {eventTypeFilter !== 'all' && <FilterChip label="Event" value={eventTypeFilter.replace(/_/g, ' ')} onRemove={() => { setEventTypeFilter('all'); setPage(1); }} />}
                        {agentFilter !== 'all' && <FilterChip label="Agent" value={agents.find(a => a.slug === agentFilter)?.name || agentFilter} onRemove={() => { setAgentFilter('all'); setPage(1); }} />}
                        {dateFrom && <FilterChip label="From" value={dateFrom} onRemove={() => { setDateFrom(''); setPage(1); }} />}
                        {dateTo && <FilterChip label="To" value={dateTo} onRemove={() => { setDateTo(''); setPage(1); }} />}
                        <button onClick={clearAllFilters}
                            style={{
                                background: 'none', border: 'none', color: 'var(--danger)',
                                fontSize: 12, cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                                fontWeight: 500, transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <div className="empty-state"><div className="icon">⏳</div><h4>Loading audit logs...</h4></div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📜</div>
                        <h4>{hasActiveFilters ? 'No matching records' : 'No audit records yet'}</h4>
                        <p>{hasActiveFilters ? 'Try adjusting your filters' : 'Audit events will appear as agents are invoked through the gateway'}</p>
                        {hasActiveFilters && (
                            <button className="btn btn-secondary btn-sm" onClick={clearAllFilters} style={{ marginTop: 8 }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead><tr><th>Time</th><th>Trace ID</th><th>Event</th><th>Action</th><th>Outcome</th><th>Latency</th><th>Details</th></tr></thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} onClick={() => setSelectedLog(log)}
                                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(log.recorded_at).toLocaleTimeString()}</td>
                                        <td><code
                                            title={`Click to view trace in Jaeger: ${log.trace_id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const jaegerUrl = localStorage.getItem('agentshield_jaeger_url') || 'http://localhost:16686';
                                                const hexId = (log.trace_id || '').replace(/-/g, '').substring(0, 32);
                                                window.open(`${jaegerUrl}/trace/${hexId}`, '_blank');
                                            }}
                                            style={{ background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'none', transition: 'opacity 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                        >{(log.trace_id || '').substring(0, 8)}…</code></td>
                                        <td style={{ fontSize: 12 }}>{log.event_type}</td>
                                        <td style={{ fontSize: 13, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.action}</td>
                                        <td><span className={`badge ${outcomeStyle[log.outcome] || 'gray'}`}>{log.outcome}</span></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{log.latency_ms ? `${log.latency_ms}ms` : '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.details?.reason || log.details?.error || (log.details?.statusCode ? `HTTP ${log.details.statusCode}` : '—')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', borderTop: '1px solid var(--border-color)',
                            fontSize: 13, color: 'var(--text-muted)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>Showing {showingFrom}–{showingTo} of {totalCount.toLocaleString()}</span>
                                <span style={{ color: 'var(--border-color)' }}>|</span>
                                <span style={{ fontSize: 12 }}>Rows:</span>
                                <select className="form-select"
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    style={{ width: 65, padding: '4px 6px', fontSize: 12 }}>
                                    {PAGE_SIZE_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                    className="btn-icon"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    style={{ opacity: page === 1 ? 0.3 : 1, fontSize: 16 }}
                                >
                                    <HiChevronLeft />
                                </button>

                                {getPageNumbers().map((p, i) => (
                                    p === '...' ? (
                                        <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                                    ) : (
                                        <button key={p}
                                            onClick={() => setPage(p)}
                                            style={{
                                                minWidth: 32, height: 32, borderRadius: 8,
                                                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                                background: p === page ? 'var(--accent-primary)' : 'transparent',
                                                color: p === page ? '#fff' : 'var(--text-secondary)',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = 'var(--bg-card)'; }}
                                            onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {p}
                                        </button>
                                    )
                                ))}

                                <button
                                    className="btn-icon"
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    style={{ opacity: page === totalPages ? 0.3 : 1, fontSize: 16 }}
                                >
                                    <HiChevronRight />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Audit Detail Modal */}
            {selectedLog && (() => {
                const log = selectedLog;
                const OutIcon = outcomeIcon[log.outcome] || HiShieldCheck;
                const isAllowed = log.outcome === 'allowed';
                const details = log.details || {};
                return (
                    <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
                            <div className="modal-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <OutIcon style={{ color: isAllowed ? 'var(--success)' : log.outcome === 'error' ? 'var(--warning)' : 'var(--danger)' }} />
                                    Audit Event Details
                                </h3>
                                <button className="btn-icon" onClick={() => setSelectedLog(null)}><HiXMark /></button>
                            </div>
                            <div className="modal-body" style={{ padding: 0 }}>
                                {/* Decision Banner */}
                                <div style={{
                                    padding: '16px 20px',
                                    background: isAllowed ? 'rgba(34,197,94,0.08)' : log.outcome === 'error' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                                    borderBottom: `2px solid ${isAllowed ? 'var(--success)' : log.outcome === 'error' ? 'var(--warning)' : 'var(--danger)'}`,
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <OutIcon style={{ fontSize: 28, color: isAllowed ? 'var(--success)' : log.outcome === 'error' ? 'var(--warning)' : 'var(--danger)' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: isAllowed ? 'var(--success)' : log.outcome === 'error' ? 'var(--warning)' : 'var(--danger)' }}>
                                            {log.outcome?.toUpperCase()}
                                        </div>
                                        {details.reason && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{details.reason}</div>}
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div style={{ padding: '8px 20px 16px' }}>
                                    <DetailRow label="Timestamp" value={formatDate(log.recorded_at)} icon={HiClock} />
                                    <DetailRow label="Trace ID" value={
                                        <code
                                            title="Click to view trace in Jaeger"
                                            onClick={() => {
                                                const jaegerUrl = localStorage.getItem('agentshield_jaeger_url') || 'http://localhost:16686';
                                                const hexId = (log.trace_id || '').replace(/-/g, '').substring(0, 32);
                                                window.open(`${jaegerUrl}/trace/${hexId}`, '_blank');
                                            }}
                                            style={{ background: 'var(--bg-input)', padding: '3px 10px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', cursor: 'pointer', color: 'var(--accent-primary)', transition: 'opacity 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                        >{log.trace_id} ↗</code>
                                    } icon={HiFingerPrint} />
                                    <DetailRow label="Event Type" value={
                                        <span className="badge gray">{log.event_type}</span>
                                    } icon={HiBolt} />
                                    <DetailRow label="Action" value={log.action} icon={HiGlobeAlt} />
                                    <DetailRow label="Outcome" value={
                                        <span className={`badge ${outcomeStyle[log.outcome] || 'gray'}`}>{log.outcome}</span>
                                    } icon={HiShieldCheck} color={isAllowed ? 'var(--success)' : 'var(--danger)'} />
                                    <DetailRow label="Latency" value={log.latency_ms ? `${log.latency_ms}ms` : 'N/A'} icon={HiClock} />
                                    {log.actor_id && <DetailRow label="Actor ID" value={log.actor_id} icon={HiUser} />}
                                    {log.actor_email && <DetailRow label="Actor Email" value={log.actor_email} icon={HiUser} />}
                                    {log.agent_id && <DetailRow label="Agent ID" value={log.agent_id} icon={HiGlobeAlt} />}
                                    {log.agent_slug && <DetailRow label="Agent Slug" value={log.agent_slug} icon={HiGlobeAlt} />}
                                    {log.workflow_id && <DetailRow label="Workflow ID" value={log.workflow_id} icon={HiGlobeAlt} />}
                                    {details.statusCode && <DetailRow label="HTTP Status" value={details.statusCode} icon={HiGlobeAlt} />}
                                    {details.error && <DetailRow label="Error" value={
                                        <span style={{ color: 'var(--danger)' }}>{details.error}</span>
                                    } icon={HiExclamationTriangle} color="var(--danger)" />}
                                    {details.matchedPolicy && <DetailRow label="Matched Policy" value={details.matchedPolicy} icon={HiShieldCheck} color="var(--accent-primary)" />}
                                    {details.policyId && <DetailRow label="Policy ID" value={details.policyId} icon={HiShieldCheck} />}
                                    {details.ip && <DetailRow label="Source IP" value={details.ip} icon={HiGlobeAlt} />}
                                    {details.userAgent && <DetailRow label="User Agent" value={details.userAgent} icon={HiGlobeAlt} />}
                                </div>

                                {/* Raw JSON */}
                                {Object.keys(details).length > 0 && (
                                    <div style={{ padding: '0 20px 16px' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                                            Raw Details
                                        </div>
                                        <pre style={{
                                            padding: 12, fontSize: 11, color: 'var(--text-secondary)', overflow: 'auto',
                                            maxHeight: 200, background: 'var(--bg-input)', borderRadius: 8, margin: 0,
                                            fontFamily: 'monospace', lineHeight: 1.5,
                                        }}>
                                            {JSON.stringify(details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
