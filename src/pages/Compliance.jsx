import { useState, useEffect, useRef } from 'react';
import { HiPlus, HiExclamationTriangle, HiDocumentText, HiPlay, HiArrowUpTray, HiArrowDownTray, HiChevronDown, HiChevronUp, HiCheckCircle, HiXCircle, HiExclamationCircle, HiPencil, HiTrash, HiShieldCheck, HiEye, HiMagnifyingGlass, HiClock, HiGlobeAlt } from 'react-icons/hi2';
import api from '../api';

const RULE_FRAMEWORK_TABS = [
    { key: 'sox', label: 'SOX', icon: '📊' },
    { key: 'hipaa', label: 'HIPAA', icon: '🏥' },
    { key: 'gdpr', label: 'GDPR', icon: '🇪🇺' },
    { key: 'pci_dss', label: 'PCI-DSS', icon: '💳' },
];

export default function Compliance() {
    // ===== TOP-LEVEL TAB =====
    const [mainTab, setMainTab] = useState('configs');

    // ===== CONFIGS TAB STATE =====
    const [configs, setConfigs] = useState([]);
    const [agents, setAgents] = useState([]);
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', framework: 'sox', sampleRate: 10, retentionDays: 2190, agentId: '', workflowId: '' });
    const [saving, setSaving] = useState(false);
    const [detailConfigId, setDetailConfigId] = useState(null);
    const [detailConfig, setDetailConfig] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [assignAgentId, setAssignAgentId] = useState('');

    // ===== SCANS TAB STATE =====
    const [scanConfigId, setScanConfigId] = useState('');
    const [scanRunning, setScanRunning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scanCustomSamples, setScanCustomSamples] = useState('');
    const [scanUseCustom, setScanUseCustom] = useState(false);

    // ===== HISTORY TAB STATE =====
    const [historyConfigId, setHistoryConfigId] = useState('');
    const [historyRuns, setHistoryRuns] = useState([]);
    const [historyRunsLoading, setHistoryRunsLoading] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState('');
    const [selectedRunData, setSelectedRunData] = useState(null);

    // ===== COMPLIANCE RULES TAB STATE =====
    const [ruleFramework, setRuleFramework] = useState('sox');
    const [rules, setRules] = useState([]);
    const [rulesLoading, setRulesLoading] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [ruleForm, setRuleForm] = useState({ name: '', description: '', category: '', severity: 'medium', passInput: '', passOutput: '', failInput: '', failOutput: '' });
    const [savingRule, setSavingRule] = useState(false);
    const [expandedSample, setExpandedSample] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const fileInputRef = useRef(null);
    const [uploadingRules, setUploadingRules] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);

    // ===== OSCAL STATE =====
    const [showOscalModal, setShowOscalModal] = useState(false);
    const [oscalJson, setOscalJson] = useState('');
    const [oscalFramework, setOscalFramework] = useState('sox');
    const [oscalPreview, setOscalPreview] = useState(null);
    const [oscalSelectedGroups, setOscalSelectedGroups] = useState([]);
    const [oscalImporting, setOscalImporting] = useState(false);
    const [oscalCatalogs, setOscalCatalogs] = useState([]);
    const oscalFileRef = useRef(null);

    useEffect(() => { loadAll(); loadOscalCatalogs(); }, []);
    useEffect(() => { if (mainTab === 'rules') { loadRules(); loadOscalCatalogs(); } }, [ruleFramework, mainTab]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [configRes, agentRes, wfRes] = await Promise.allSettled([
                api.listComplianceConfigs(), api.listAgents(), api.listWorkflows(),
            ]);
            if (configRes.status === 'fulfilled') setConfigs(configRes.value.data || []);
            if (agentRes.status === 'fulfilled') setAgents(agentRes.value.data || []);
            if (wfRes.status === 'fulfilled') setWorkflows(wfRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const loadRules = async () => {
        setRulesLoading(true);
        try {
            const res = await api.getComplianceRules(ruleFramework);
            setRules(res.data || []);
        } catch (err) { console.error(err); }
        finally { setRulesLoading(false); }
    };

    const loadOscalCatalogs = async () => {
        try {
            const res = await api.listOscalCatalogs();
            setOscalCatalogs(res.data || []);
        } catch { /* non-critical */ }
    };

    const handleOscalPreview = async () => {
        try {
            const parsed = JSON.parse(oscalJson);
            const res = await api.previewOscal(parsed);
            if (res.data?.valid) {
                setOscalPreview(res.data);
                setOscalSelectedGroups(res.data.groups?.map(g => g.id) || []);
            } else {
                alert('Invalid OSCAL: ' + (res.data?.errors?.join('; ') || 'Unknown error'));
            }
        } catch (err) { alert('JSON parse error: ' + err.message); }
    };

    const handleOscalImport = async () => {
        if (!oscalPreview) return;
        setOscalImporting(true);
        try {
            const parsed = JSON.parse(oscalJson);
            const res = await api.importOscal(parsed, oscalFramework, oscalSelectedGroups);
            alert(`Imported ${res.data?.importedControls || 0} controls from "${res.data?.title}"`);
            setShowOscalModal(false);
            setOscalJson(''); setOscalPreview(null); setOscalSelectedGroups([]);
            await loadRules();
            await loadOscalCatalogs();
        } catch (err) { alert('Import error: ' + err.message); }
        finally { setOscalImporting(false); }
    };

    const handleDeleteCatalog = async (id) => {
        if (!confirm('Delete this OSCAL catalog and all its imported rules?')) return;
        try {
            await api.deleteOscalCatalog(id);
            await loadRules();
            await loadOscalCatalogs();
        } catch (err) { alert('Delete error: ' + err.message); }
    };

    const handleExportOscal = async (checkId) => {
        try {
            const res = await api.exportOscalResult(checkId);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `oscal-assessment-result-${checkId.slice(0, 8)}.json`; a.click();
            URL.revokeObjectURL(url);
        } catch (err) { alert('Export error: ' + err.message); }
    };

    const handleOscalFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setOscalJson(ev.target.result);
        reader.readAsText(file);
    };

    // ===== CONFIG DETAIL + AGENT ASSIGNMENT =====
    const loadConfigDetail = async (configId) => {
        setDetailLoading(true);
        try {
            const res = await api.getComplianceConfig(configId);
            setDetailConfig(res.data || null);
        } catch (err) { console.error('Failed to load config detail:', err); }
        finally { setDetailLoading(false); }
    };

    const handleToggleDetail = async (configId) => {
        if (detailConfigId === configId) {
            setDetailConfigId(null);
            setDetailConfig(null);
        } else {
            setDetailConfigId(configId);
            await loadConfigDetail(configId);
        }
    };

    const handleAssignAgent = async (configId) => {
        if (!assignAgentId) return;
        try {
            await api.assignCompliance(assignAgentId, configId);
            setAssignAgentId('');
            await loadConfigDetail(configId);
            await loadAll();
        } catch (err) { alert('Error assigning agent: ' + err.message); }
    };

    const handleUnassignAgent = async (agentId, configId) => {
        try {
            await api.unassignCompliance(agentId, configId);
            await loadConfigDetail(configId);
            await loadAll();
        } catch (err) { alert('Error unassigning agent: ' + err.message); }
    };

    // ===== CONFIG HANDLERS =====
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.createComplianceConfig({
                name: form.name,
                framework: form.framework,
                sampleRate: form.sampleRate / 100,
                retentionDays: form.retentionDays,
                appliesTo: {
                    agents: form.agentId ? [form.agentId] : [],
                    workflows: form.workflowId ? [form.workflowId] : [],
                },
            });
            setShowModal(false);
            setForm({ name: '', framework: 'sox', sampleRate: 10, retentionDays: 2190, agentId: '', workflowId: '' });
            await loadAll();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSaving(false); }
    };

    // ===== SCAN HANDLERS =====
    const handleRunScan = async () => {
        if (!scanConfigId) { alert('Please select a compliance config first.'); return; }
        setScanRunning(true);
        setScanResult(null);
        try {
            let samples = null;
            if (scanUseCustom && scanCustomSamples.trim()) {
                try {
                    samples = JSON.parse(scanCustomSamples);
                    if (!Array.isArray(samples)) samples = [samples];
                } catch {
                    alert('Invalid JSON. Please provide an array of sample objects.');
                    setScanRunning(false);
                    return;
                }
            }
            const res = samples
                ? await api.uploadComplianceSamples(scanConfigId, samples)
                : await api.runComplianceCheck(scanConfigId);
            setScanResult(res.data);
        } catch (err) { alert('Scan failed: ' + err.message); }
        finally { setScanRunning(false); }
    };

    // ===== HISTORY HANDLERS =====
    const handleSelectHistoryConfig = async (configId) => {
        setHistoryConfigId(configId);
        setSelectedRunId('');
        setSelectedRunData(null);
        setHistoryRuns([]);
        if (!configId) return;
        setHistoryRunsLoading(true);
        try {
            const res = await api.getComplianceChecks(configId);
            setHistoryRuns(res.data || []);
        } catch (err) { console.error(err); setHistoryRuns([]); }
        finally { setHistoryRunsLoading(false); }
    };

    const handleSelectRun = (runId) => {
        setSelectedRunId(runId);
        if (!runId) { setSelectedRunData(null); return; }
        const run = historyRuns.find(r => r.id === runId);
        if (run) {
            const results = typeof run.results === 'string' ? JSON.parse(run.results) : (run.results || []);
            setSelectedRunData({ ...run, results });
        }
    };

    // ===== COMPLIANCE RULE HANDLERS =====
    const handleToggleRule = async (rule) => {
        try {
            await api.toggleComplianceRule(rule.id, !rule.is_enabled);
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_enabled: !r.is_enabled } : r));
        } catch (err) { alert('Error: ' + err.message); }
    };

    const handleSaveRule = async () => {
        setSavingRule(true);
        try {
            const evaluationConfig = {};
            if (ruleForm.passInput || ruleForm.passOutput || ruleForm.failInput || ruleForm.failOutput) {
                evaluationConfig.samples = {};
                if (ruleForm.passInput || ruleForm.passOutput) {
                    evaluationConfig.samples.pass = { input: ruleForm.passInput, output: ruleForm.passOutput };
                }
                if (ruleForm.failInput || ruleForm.failOutput) {
                    evaluationConfig.samples.fail = { input: ruleForm.failInput, output: ruleForm.failOutput };
                }
            }
            await api.upsertComplianceRule({
                id: editingRule?.id || undefined,
                framework: ruleFramework,
                name: ruleForm.name,
                description: ruleForm.description,
                category: ruleForm.category,
                severity: ruleForm.severity,
                isEnabled: true,
                evaluationConfig: Object.keys(evaluationConfig).length > 0 ? evaluationConfig : undefined,
            });
            setShowRuleModal(false);
            setEditingRule(null);
            setRuleForm({ name: '', description: '', category: '', severity: 'medium', passInput: '', passOutput: '', failInput: '', failOutput: '' });
            await loadRules();
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSavingRule(false); }
    };

    const handleEditRule = (rule) => {
        const samples = rule.evaluation_config?.samples || {};
        setEditingRule(rule);
        setRuleForm({
            name: rule.name,
            description: rule.description || '',
            category: rule.category || '',
            severity: rule.severity || 'medium',
            passInput: samples.pass?.input || '',
            passOutput: samples.pass?.output || '',
            failInput: samples.fail?.input || '',
            failOutput: samples.fail?.output || '',
        });
        setShowRuleModal(true);
    };

    const handleDeleteRule = async (rule) => {
        if (rule.is_builtin) { alert('Cannot delete built-in rules. Disable them instead.'); return; }
        setDeleteConfirm(rule);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await api.deleteComplianceRule(deleteConfirm.id);
            setDeleteConfirm(null);
            await loadRules();
        } catch (err) { alert('Error: ' + err.message); setDeleteConfirm(null); }
    };

    // ===== HELPER RENDERERS =====
    const getStatusBadge = (status) => {
        if (status === 'passed') return <span className="badge green"><HiCheckCircle style={{ fontSize: 12 }} /> PASSED</span>;
        if (status === 'failed') return <span className="badge red"><HiXCircle style={{ fontSize: 12 }} /> FAILED</span>;
        if (status === 'partial') return <span className="badge yellow"><HiExclamationCircle style={{ fontSize: 12 }} /> PARTIAL</span>;
        return <span className="badge blue">RUNNING</span>;
    };

    const getSeverityBadge = (severity) => {
        const colors = { critical: 'red', high: 'yellow', medium: 'blue', low: 'green' };
        return <span className={`badge ${colors[severity] || 'blue'}`}>{(severity || 'medium').toUpperCase()}</span>;
    };

    const getTargetName = (config, type) => {
        const appliesTo = config.applies_to || {};
        if (type === 'agent') {
            const agentIds = appliesTo.agents || [];
            if (agentIds.length === 0) return null;
            const agent = agents.find(a => a.id === agentIds[0]);
            return agent ? agent.name : agentIds[0];
        }
        if (type === 'workflow') {
            const wfIds = appliesTo.workflows || [];
            if (wfIds.length === 0) return null;
            const wf = workflows.find(w => w.id === wfIds[0]);
            return wf ? wf.name : wfIds[0];
        }
        return null;
    };

    const getTargetSummary = (config) => {
        const agentName = getTargetName(config, 'agent');
        const wfName = getTargetName(config, 'workflow');
        const parts = [];
        if (agentName) parts.push(agentName);
        if (wfName) parts.push(`WF: ${wfName}`);
        return parts.length > 0 ? parts.join(', ') : 'All agents';
    };

    // Helper to render scan/history result details panel
    const renderResultsPanel = (result) => {
        if (!result) return null;
        const results = result.results || [];
        const samplesUsed = result.samplesUsed || result.samples_used || [];
        return (
            <div>
                {/* Status Banner */}
                <div style={{
                    padding: '16px',
                    borderRadius: 10,
                    background: result.status === 'passed' ? 'rgba(16,185,129,0.1)' : result.status === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${result.status === 'passed' ? 'rgba(16,185,129,0.3)' : result.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    marginBottom: 16,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4 style={{ margin: 0 }}>
                            {result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⚠️'}
                            {' '}Compliance Check — {(result.framework || '').toUpperCase()}
                        </h4>
                        {getStatusBadge(result.status)}
                    </div>
                    <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                        <span><strong>{result.passedRules || result.passed_rules || 0}</strong> passed</span>
                        <span><strong>{result.failedRules || result.failed_rules || 0}</strong> failed</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            {result.totalRules || result.total_rules || 0} total rules
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            Source: {result.sampleSource || result.sample_source || 'generated'}
                        </span>
                    </div>
                </div>

                {/* Per-rule results */}
                {results.length > 0 && (
                    <table className="data-table" style={{ marginBottom: 16 }}>
                        <thead><tr><th>Rule</th><th>Category</th><th>Severity</th><th>Result</th><th>Details</th></tr></thead>
                        <tbody>
                            {results.map((r, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 600 }}>{r.ruleName}</td>
                                    <td><span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{r.category}</span></td>
                                    <td>{getSeverityBadge(r.severity)}</td>
                                    <td>{r.passed ? <span className="badge green"><HiCheckCircle style={{ fontSize: 12 }} /> Pass</span> : <span className="badge red"><HiXCircle style={{ fontSize: 12 }} /> Fail</span>}</td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300 }}>{r.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Samples Used */}
                {samplesUsed.length > 0 && (
                    <div>
                        <h4 style={{ marginBottom: 8, fontSize: 14 }}>
                            📝 Agent Invocation Results ({samplesUsed.length} samples)
                            {result.agentReachable !== undefined && (
                                <span style={{ marginLeft: 12, fontWeight: 400 }}>
                                    {result.agentReachable
                                        ? <span className="badge green">🟢 Agent Reachable</span>
                                        : <span className="badge red">🔴 Agent Unreachable</span>
                                    }
                                </span>
                            )}
                        </h4>
                        <div style={{ maxHeight: 400, overflowY: 'auto', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                            {samplesUsed.map((s, i) => (
                                <div key={i} style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span className="badge blue">{s.context || 'general'}</span>
                                        {s.connectionSuccess !== undefined && (
                                            s.connectionSuccess
                                                ? <span className="badge green">✓ Connected</span>
                                                : <span className="badge red">✗ Failed</span>
                                        )}
                                        {s.latencyMs && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.latencyMs}ms</span>}
                                        {s.statusCode > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>HTTP {s.statusCode}</span>}
                                        {s.agentEndpoint && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>→ {s.agentEndpoint}</span>}
                                    </div>
                                    <div style={{ marginBottom: 4 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>INPUT:</span>
                                        <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'block', marginTop: 2 }}>
                                            {(s.input || '').substring(0, 200)}{(s.input || '').length > 200 ? '...' : ''}
                                        </code>
                                    </div>
                                    {s.responseText && (
                                        <div>
                                            <span style={{ color: s.connectionSuccess ? 'var(--color-success)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                                                {s.connectionSuccess ? 'AGENT RESPONSE:' : 'ERROR:'}
                                            </span>
                                            <code style={{
                                                background: s.connectionSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                padding: '2px 6px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all', display: 'block', marginTop: 2,
                                                border: `1px solid ${s.connectionSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                            }}>
                                                {(s.responseText || '').substring(0, 300)}{(s.responseText || '').length > 300 ? '...' : ''}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="empty-state"><div className="icon">⏳</div><h4>Loading compliance data...</h4></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Monitor SOX/HIPAA/GDPR/PCI compliance with automated sampling & checks</p>
            </div>

            {/* ===== Main Tab Bar ===== */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                {[
                    { key: 'configs', label: '📋 Configs' },
                    { key: 'scans', label: '🔍 Scans' },
                    { key: 'history', label: '📜 History' },
                    { key: 'rules', label: '⚙️ Compliance Rules' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setMainTab(tab.key)}
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: 600, transition: 'all 0.2s ease',
                            background: mainTab === tab.key ? 'var(--accent-primary)' : 'transparent',
                            color: mainTab === tab.key ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ============================================================ */}
            {/* CONFIGS TAB — Config CRUD + Detail Panel only                 */}
            {/* ============================================================ */}
            {mainTab === 'configs' && (
                <div>
                    {/* Add Config button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><HiPlus /> Add Config</button>
                    </div>

                    {/* Configs Card */}
                    <div className="card">
                        <div className="card-header"><h3>Compliance Configurations</h3></div>
                        {configs.length === 0 ? (
                            <div className="empty-state"><div className="icon">📋</div><h4>No compliance configs</h4><p>Add a sampling configuration to start auditing agents</p></div>
                        ) : (
                            <div>
                                {configs.map(c => (
                                    <div key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span className="badge blue">{(c.framework || '').toUpperCase()}</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Rate: {(parseFloat(c.sample_rate) * 100).toFixed(0)}%</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Retention: {Math.round(c.retention_days / 365)}y</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                        {parseInt(c.agent_count) > 0 ? (
                                                            <span className="badge green" style={{ fontSize: 11, padding: '2px 8px' }}>🎯 {c.agent_count} agent{parseInt(c.agent_count) !== 1 ? 's' : ''}</span>
                                                        ) : (
                                                            <span className="badge" style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(156,163,175,0.15)' }}>All Agents</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {/* View Details button */}
                                                <button
                                                    className="btn-icon"
                                                    title="View details"
                                                    onClick={() => handleToggleDetail(c.id)}
                                                    style={{ color: detailConfigId === c.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                                >
                                                    <HiEye style={{ fontSize: 18 }} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* ===== Config Detail Panel ===== */}
                                        {detailConfigId === c.id && (
                                            <div style={{
                                                padding: '16px 20px', margin: '0 16px 12px',
                                                background: 'var(--bg-input)', borderRadius: 10,
                                                border: '1px solid var(--border-color)',
                                                animation: 'fadeIn 0.2s ease',
                                            }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <HiShieldCheck style={{ fontSize: 14 }} /> Configuration Details
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                                    {/* Framework */}
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Framework</div>
                                                        <span className="badge blue" style={{ fontSize: 13, padding: '4px 12px' }}>{(c.framework || '').toUpperCase()}</span>
                                                    </div>
                                                    {/* Sample Rate */}
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Sample Rate</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-color)', overflow: 'hidden', maxWidth: 100 }}>
                                                                <div style={{ width: `${(parseFloat(c.sample_rate) * 100)}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3 }} />
                                                            </div>
                                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{(parseFloat(c.sample_rate) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                    {/* Retention */}
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Retention Period</div>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                                                            {c.retention_days} days <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>({Math.round(c.retention_days / 365)} years)</span>
                                                        </div>
                                                    </div>
                                                    {/* Created */}
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Created</div>
                                                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</div>
                                                    </div>
                                                    {/* Target Workflow */}
                                                    <div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Target Workflow</div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                            {getTargetName(c, 'workflow') ? (
                                                                <span className="badge yellow" style={{ fontSize: 12, padding: '3px 10px' }}>{getTargetName(c, 'workflow')}</span>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>All Workflows</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ===== Assigned Agents Section ===== */}
                                                <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        🎯 Assigned Agents
                                                    </div>

                                                    {detailLoading ? (
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Loading...</div>
                                                    ) : (
                                                        <>
                                                            {/* Current assignments */}
                                                            {detailConfig?.assigned_agents?.length > 0 ? (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                                                    {detailConfig.assigned_agents.map(agent => (
                                                                        <div key={agent.id} style={{
                                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                                            padding: '6px 12px', borderRadius: 8,
                                                                            background: 'rgba(16,185,129,0.1)',
                                                                            border: '1px solid rgba(16,185,129,0.25)',
                                                                            fontSize: 13,
                                                                        }}>
                                                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.health_status === 'healthy' ? '#10b981' : agent.health_status === 'degraded' ? '#f59e0b' : '#6b7280' }} />
                                                                            <span style={{ fontWeight: 600 }}>{agent.name}</span>
                                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({agent.protocol})</span>
                                                                            <button
                                                                                onClick={() => handleUnassignAgent(agent.id, c.id)}
                                                                                style={{
                                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                                    color: 'var(--text-muted)', fontSize: 14, padding: '0 2px',
                                                                                    lineHeight: 1,
                                                                                }}
                                                                                title="Unassign agent"
                                                                            >✕</button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, fontStyle: 'italic' }}>
                                                                    No agents assigned — this config applies to all agents.
                                                                </div>
                                                            )}

                                                            {/* Assign new agent */}
                                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                <select
                                                                    className="form-select"
                                                                    value={assignAgentId}
                                                                    onChange={e => setAssignAgentId(e.target.value)}
                                                                    style={{ flex: 1, maxWidth: 280, fontSize: 13 }}
                                                                >
                                                                    <option value="">Select agent to assign...</option>
                                                                    {agents
                                                                        .filter(a => !detailConfig?.assigned_agents?.some(aa => aa.id === a.id))
                                                                        .map(a => (
                                                                            <option key={a.id} value={a.id}>{a.name} ({a.protocol})</option>
                                                                        ))}
                                                                </select>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() => handleAssignAgent(c.id)}
                                                                    disabled={!assignAgentId}
                                                                    style={{ fontSize: 12 }}
                                                                >
                                                                    Assign
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* SCANS TAB — Select config, run scan, see live results         */}
            {/* ============================================================ */}
            {mainTab === 'scans' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    {/* Config Selector Card */}
                    <div className="card">
                        <div className="card-header"><h3><HiMagnifyingGlass style={{ marginRight: 8 }} />Run Compliance Scan</h3></div>
                        <div style={{ padding: '20px' }}>
                            {/* Config dropdown */}
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label>Select Compliance Config</label>
                                <select
                                    className="form-select"
                                    value={scanConfigId}
                                    onChange={e => { setScanConfigId(e.target.value); setScanResult(null); }}
                                >
                                    <option value="">— Select a config to scan —</option>
                                    {configs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({(c.framework || '').toUpperCase()})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected config summary */}
                            {scanConfigId && (() => {
                                const sc = configs.find(c => c.id === scanConfigId);
                                if (!sc) return null;
                                return (
                                    <div style={{
                                        display: 'flex', gap: 16, alignItems: 'center', padding: '12px 16px',
                                        background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16,
                                        border: '1px solid var(--border-color)', flexWrap: 'wrap',
                                    }}>
                                        <span className="badge blue" style={{ fontSize: 13, padding: '4px 12px' }}>{(sc.framework || '').toUpperCase()}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Rate: {(parseFloat(sc.sample_rate) * 100).toFixed(0)}%</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target: {getTargetSummary(sc)}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Retention: {Math.round(sc.retention_days / 365)}y</span>
                                    </div>
                                );
                            })()}

                            {/* Custom samples toggle */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={scanUseCustom} onChange={e => setScanUseCustom(e.target.checked)} />
                                    <span style={{ fontWeight: 600 }}>Use custom test samples</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(paste JSON array)</span>
                                </label>
                            </div>

                            {scanUseCustom && (
                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label>Custom Samples (JSON)</label>
                                    <textarea
                                        className="form-input"
                                        rows={8}
                                        value={scanCustomSamples}
                                        onChange={e => setScanCustomSamples(e.target.value)}
                                        placeholder={`[\n  { "input": "Process payment of $5000 for account SSN 123-45-6789", "context": "financial_transaction" },\n  { "input": "Summarize quarterly earnings", "context": "reporting" }\n]`}
                                        style={{ fontFamily: 'monospace', fontSize: 13 }}
                                    />
                                </div>
                            )}

                            {/* Run button */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRunScan}
                                    disabled={!scanConfigId || scanRunning}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 14 }}
                                >
                                    <HiPlay /> {scanRunning ? 'Running Scan...' : '▶ Run Scan'}
                                </button>
                                {scanResult && (
                                    <button className="btn btn-secondary" onClick={() => setScanResult(null)}>Clear Results</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Running indicator */}
                    {scanRunning && (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12, animation: 'spin 2s linear infinite' }}>⏳</div>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Running compliance scan...</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 0' }}>This may take a moment while the agent is being tested against all applicable rules.</p>
                        </div>
                    )}

                    {/* Scan Results */}
                    {scanResult && !scanRunning && (
                        <div className="card">
                            <div className="card-header">
                                <h3>
                                    {scanResult.status === 'passed' ? '✅' : scanResult.status === 'failed' ? '❌' : '⚠️'}
                                    {' '}Scan Results
                                </h3>
                            </div>
                            <div style={{ padding: '16px 20px' }}>
                                {renderResultsPanel(scanResult)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* HISTORY TAB — Select config → select run → view details       */}
            {/* ============================================================ */}
            {mainTab === 'history' && (
                <div style={{ display: 'grid', gap: 20 }}>
                    {/* Step 1: Config selector */}
                    <div className="card">
                        <div className="card-header"><h3><HiClock style={{ marginRight: 8 }} />Compliance Check History</h3></div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {/* Config dropdown */}
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>Step 1: Select Compliance Config</label>
                                    <select
                                        className="form-select"
                                        value={historyConfigId}
                                        onChange={e => handleSelectHistoryConfig(e.target.value)}
                                    >
                                        <option value="">— Select a config —</option>
                                        {configs.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({(c.framework || '').toUpperCase()})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Run dropdown */}
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>Step 2: Select Run</label>
                                    <select
                                        className="form-select"
                                        value={selectedRunId}
                                        onChange={e => handleSelectRun(e.target.value)}
                                        disabled={!historyConfigId || historyRunsLoading}
                                    >
                                        <option value="">{historyRunsLoading ? 'Loading runs...' : historyRuns.length === 0 && historyConfigId ? 'No runs found' : '— Select a run —'}</option>
                                        {historyRuns.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {new Date(r.started_at).toLocaleString()} — {(r.status || 'unknown').toUpperCase()} ({r.passed_rules || 0}P / {r.failed_rules || 0}F)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Empty state when no config selected */}
                    {!historyConfigId && (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Select a compliance config to view its run history</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 0' }}>
                                Choose a configuration from the dropdown above, then select a specific run to view its detailed results.
                            </p>
                        </div>
                    )}

                    {/* Loading state */}
                    {historyRunsLoading && (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading run history...</h4>
                        </div>
                    )}

                    {/* No runs state */}
                    {historyConfigId && !historyRunsLoading && historyRuns.length === 0 && (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                            <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>No runs found for this configuration</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 0' }}>
                                Run a scan from the <strong>🔍 Scans</strong> tab to create history.
                            </p>
                        </div>
                    )}

                    {/* Config selected, runs available, but no run picked yet */}
                    {historyConfigId && !historyRunsLoading && historyRuns.length > 0 && !selectedRunId && (
                        <div className="card">
                            <div className="card-header"><h3>Available Runs ({historyRuns.length})</h3></div>
                            <div>
                                {historyRuns.map(r => (
                                    <div
                                        key={r.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', padding: '10px 16px',
                                            gap: 12, borderBottom: '1px solid var(--border-color)',
                                            cursor: 'pointer', transition: 'background 0.15s',
                                        }}
                                        onClick={() => handleSelectRun(r.id)}
                                        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-input)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                                {new Date(r.started_at).toLocaleString()}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <span className="badge blue">{(r.framework || '').toUpperCase()}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Source: {r.sample_source || 'generated'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: 13 }}><strong>{r.passed_rules || 0}</strong> passed</span>
                                            <span style={{ fontSize: 13 }}><strong>{r.failed_rules || 0}</strong> failed</span>
                                            {getStatusBadge(r.status)}
                                            <HiChevronDown style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selected run details */}
                    {selectedRunData && (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>
                                    Run Details — {new Date(selectedRunData.started_at).toLocaleString()}
                                </h3>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => handleExportOscal(selectedRunData.id)} title="Export as OSCAL Assessment Result">
                                        <HiArrowDownTray /> Export OSCAL
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedRunId(''); setSelectedRunData(null); }}>
                                        ← Back to runs
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '16px 20px' }}>
                                {renderResultsPanel(selectedRunData)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ============================================================ */}
            {/* COMPLIANCE RULES TAB                                         */}
            {/* ============================================================ */}
            {mainTab === 'rules' && (
                <div>
                    {/* Framework Sub-tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-input)', padding: 4, borderRadius: 8 }}>
                        {RULE_FRAMEWORK_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setRuleFramework(tab.key)}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: 600, transition: 'all 0.2s ease',
                                    background: ruleFramework === tab.key ? 'var(--accent-primary)' : 'transparent',
                                    color: ruleFramework === tab.key ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {rulesLoading ? (
                        <div className="empty-state"><div className="icon">⏳</div><h4>Loading rules...</h4></div>
                    ) : (
                        <div className="card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3><HiShieldCheck style={{ marginRight: 8 }} />{RULE_FRAMEWORK_TABS.find(t => t.key === ruleFramework)?.label} Rules</h3>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="file" ref={fileInputRef} accept=".csv,.xls,.xlsx" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingRules(true);
                                        setUploadStatus(null);
                                        try {
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            formData.append('framework', ruleFramework);
                                            const res = await api.uploadComplianceRules(formData);
                                            setUploadStatus({ type: 'success', message: `Imported ${res.data?.imported || 0} rules successfully` });
                                            await loadRules();
                                        } catch (err) {
                                            setUploadStatus({ type: 'error', message: err.message || 'Upload failed' });
                                        } finally {
                                            setUploadingRules(false);
                                            fileInputRef.current.value = '';
                                        }
                                    }} />
                                    <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingRules}>
                                        <HiArrowUpTray /> {uploadingRules ? 'Uploading...' : 'Upload CSV/XLS'}
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowOscalModal(true); setOscalJson(''); setOscalPreview(null); setOscalSelectedGroups([]); }}>
                                        <HiGlobeAlt /> Import OSCAL
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={() => { setEditingRule(null); setRuleForm({ name: '', description: '', category: '', severity: 'medium', passInput: '', passOutput: '', failInput: '', failOutput: '' }); setShowRuleModal(true); }}>
                                        <HiPlus /> Add Rule
                                    </button>
                                </div>
                            </div>

                            {uploadStatus && (
                                <div style={{ padding: '8px 16px', background: uploadStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderBottom: '1px solid var(--border-color)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: uploadStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                                        {uploadStatus.type === 'success' ? '✅' : '❌'} {uploadStatus.message}
                                    </span>
                                    <button className="btn-icon" onClick={() => setUploadStatus(null)} style={{ fontSize: 12 }}>✕</button>
                                </div>
                            )}

                            {rules.length === 0 ? (
                                <div className="empty-state"><div className="icon">📋</div><h4>No rules for this framework</h4><p>Add compliance rules to validate agents</p></div>
                            ) : (
                                <div>
                                    {/* Header row */}
                                    <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                        <div style={{ width: 100 }}>Rule ID</div>
                                        <div style={{ flex: 1 }}>Name</div>
                                        <div style={{ width: 120 }}>Category</div>
                                        <div style={{ width: 80 }}>Severity</div>
                                        <div style={{ width: 70 }}>Type</div>
                                        <div style={{ width: 60 }}>Enabled</div>
                                        <div style={{ width: 110 }}>Actions</div>
                                    </div>
                                    {rules.map(r => {
                                        const rSamples = r.evaluation_config?.samples;
                                        const isExpanded = expandedSample === r.id;
                                        return (
                                            <div key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: rSamples ? 'pointer' : 'default', opacity: r.is_enabled ? 1 : 0.5, transition: 'opacity 0.2s' }}
                                                    onClick={() => rSamples && setExpandedSample(isExpanded ? null : r.id)}
                                                >
                                                    <div style={{ width: 100 }}><code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>{r.rule_id}</code></div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.description}</div>
                                                    </div>
                                                    <div style={{ width: 120, fontSize: 13, color: 'var(--text-secondary)' }}>{r.category}</div>
                                                    <div style={{ width: 80 }}>{getSeverityBadge(r.severity)}</div>
                                                    <div style={{ width: 70 }}>
                                                        {r.oscal_catalog_id ? <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontSize: 10 }}>OSCAL</span>
                                                            : r.is_builtin ? <span className="badge blue">Built-in</span>
                                                            : <span className="badge green">Custom</span>}
                                                    </div>
                                                    <div style={{ width: 60 }}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleRule(r); }}
                                                            style={{
                                                                width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
                                                                background: r.is_enabled ? 'var(--accent-primary)' : 'var(--bg-tertiary)', transition: 'background 0.2s ease',
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3,
                                                                left: r.is_enabled ? 23 : 3, transition: 'left 0.2s ease',
                                                            }} />
                                                        </button>
                                                    </div>
                                                    <div style={{ width: 110, display: 'flex', gap: 6, alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditRule(r); }} title="Edit"><HiPencil /></button>
                                                        {!r.is_builtin && (
                                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteRule(r); }} title="Delete"><HiTrash style={{ color: 'var(--color-error)' }} /></button>
                                                        )}
                                                        {rSamples && (isExpanded ? <HiChevronUp style={{ fontSize: 16, color: 'var(--text-muted)' }} /> : <HiChevronDown style={{ fontSize: 16, color: 'var(--text-muted)' }} />)}
                                                    </div>
                                                </div>

                                                {/* Expanded sample data */}
                                                {isExpanded && rSamples && (
                                                    <div style={{ padding: '0 16px 16px', display: 'flex', gap: 12 }}>
                                                        {rSamples.pass && (
                                                            <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)', padding: 12 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                                    <HiCheckCircle style={{ color: '#10b981', fontSize: 16 }} />
                                                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#10b981' }}>PASS Example</span>
                                                                </div>
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</div>
                                                                    <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                                        {rSamples.pass.input}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</div>
                                                                    <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid rgba(16,185,129,0.15)' }}>
                                                                        {rSamples.pass.output}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {rSamples.fail && (
                                                            <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', padding: 12 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                                    <HiXCircle style={{ color: '#ef4444', fontSize: 16 }} />
                                                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444' }}>FAIL Example</span>
                                                                </div>
                                                                <div style={{ marginBottom: 8 }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</div>
                                                                    <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid rgba(239,68,68,0.15)' }}>
                                                                        {rSamples.fail.input}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</div>
                                                                    <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '8px 10px', fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid rgba(239,68,68,0.15)' }}>
                                                                        {rSamples.fail.output}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: 12 }}>
                                {rules.filter(r => r.is_enabled).length} of {rules.length} rules enabled • Built-in rules can be disabled but not deleted
                            </div>
                        </div>
                    )}

                    {/* OSCAL Imported Catalogs */}
                    {oscalCatalogs.length > 0 && (
                        <div className="card" style={{ marginTop: 16 }}>
                            <div className="card-header">
                                <h3><HiGlobeAlt style={{ marginRight: 8 }} />Imported OSCAL Catalogs</h3>
                            </div>
                            <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                                <div style={{ flex: 1 }}>Catalog</div>
                                <div style={{ width: 100 }}>Framework</div>
                                <div style={{ width: 80 }}>Controls</div>
                                <div style={{ width: 120 }}>Imported</div>
                                <div style={{ width: 60 }}>Actions</div>
                            </div>
                            {oscalCatalogs.map(cat => (
                                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{cat.version} • UUID: {cat.catalog_uuid?.slice(0, 8)}...</div>
                                    </div>
                                    <div style={{ width: 100 }}>
                                        <span className="badge blue">{(cat.framework || '').toUpperCase()}</span>
                                    </div>
                                    <div style={{ width: 80, fontSize: 13 }}>{cat.total_controls}</div>
                                    <div style={{ width: 120, fontSize: 12, color: 'var(--text-muted)' }}>
                                        {cat.imported_controls} controls • {new Date(cat.created_at).toLocaleDateString()}
                                    </div>
                                    <div style={{ width: 60 }}>
                                        <button className="btn-icon" onClick={() => handleDeleteCatalog(cat.id)} title="Delete catalog">
                                            <HiTrash style={{ color: 'var(--color-error)' }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* OSCAL Import Modal */}
            {showOscalModal && (
                <div className="modal-overlay" onClick={() => setShowOscalModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
                        <div className="modal-header">
                            <h3><HiGlobeAlt style={{ marginRight: 8 }} /> Import OSCAL Catalog</h3>
                            <button className="btn-icon" onClick={() => setShowOscalModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: 20 }}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Target Framework</label>
                                <select className="form-select" value={oscalFramework} onChange={e => setOscalFramework(e.target.value)}>
                                    <option value="sox">SOX</option>
                                    <option value="hipaa">HIPAA</option>
                                    <option value="gdpr">GDPR</option>
                                    <option value="pci_dss">PCI-DSS</option>
                                    <option value="nist_800_53">NIST 800-53</option>
                                    <option value="fedramp">FedRAMP</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>OSCAL Catalog JSON</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input type="file" ref={oscalFileRef} accept=".json" style={{ display: 'none' }} onChange={handleOscalFileUpload} />
                                    <button className="btn btn-secondary btn-sm" onClick={() => oscalFileRef.current?.click()}>
                                        <HiArrowUpTray /> Upload .json
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={handleOscalPreview} disabled={!oscalJson.trim()}>
                                        Preview Catalog
                                    </button>
                                </div>
                                <textarea
                                    className="form-textarea"
                                    value={oscalJson}
                                    onChange={e => { setOscalJson(e.target.value); setOscalPreview(null); }}
                                    placeholder='Paste OSCAL catalog JSON here...'
                                    style={{ height: 160, fontFamily: 'monospace', fontSize: 12, width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 10, color: 'var(--text-primary)', resize: 'vertical' }}
                                />
                            </div>

                            {/* Preview Results */}
                            {oscalPreview && (
                                <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 16 }}>{oscalPreview.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>v{oscalPreview.version} • {oscalPreview.totalControls} total controls</div>
                                        </div>
                                        <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>OSCAL</span>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select Control Groups to Import:</div>
                                    {oscalPreview.groups?.map(g => (
                                        <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}>
                                            <input
                                                type="checkbox"
                                                checked={oscalSelectedGroups.includes(g.id)}
                                                onChange={e => {
                                                    setOscalSelectedGroups(prev => e.target.checked
                                                        ? [...prev, g.id]
                                                        : prev.filter(id => id !== g.id)
                                                    );
                                                }}
                                            />
                                            <span style={{ fontWeight: 600 }}>{g.title}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({g.controlCount} controls)</span>
                                        </label>
                                    ))}
                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                        {oscalSelectedGroups.length} of {oscalPreview.groups?.length || 0} groups selected •{' '}
                                        ~{oscalPreview.groups?.filter(g => oscalSelectedGroups.includes(g.id)).reduce((sum, g) => sum + g.controlCount, 0)} controls will be imported
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowOscalModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleOscalImport} disabled={!oscalPreview || oscalSelectedGroups.length === 0 || oscalImporting}>
                                {oscalImporting ? 'Importing...' : `Import ${oscalSelectedGroups.length} Group(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* MODALS                                                        */}
            {/* ============================================================ */}

            {/* Create Config Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>New Compliance Config</h3><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label>Config Name</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. SOX Check - Financial Agents" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Framework</label>
                                    <select className="form-select" value={form.framework} onChange={e => setForm({ ...form, framework: e.target.value })}>
                                        <option value="sox">SOX</option><option value="hipaa">HIPAA</option><option value="gdpr">GDPR</option><option value="pci_dss">PCI-DSS</option><option value="custom">Custom</option>
                                    </select></div>
                                <div className="form-group"><label>Sample Rate (%)</label><input className="form-input" type="number" min="1" max="100" value={form.sampleRate} onChange={e => setForm({ ...form, sampleRate: parseInt(e.target.value) })} /></div>
                            </div>
                            <div className="form-group"><label>Retention (days)</label><input className="form-input" type="number" value={form.retentionDays} onChange={e => setForm({ ...form, retentionDays: parseInt(e.target.value) })} /></div>

                            {/* Agent Picker — Single Select */}
                            <div className="form-group">
                                <label>Target Agent <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(select one, or leave as "All Agents")</span></label>
                                <select className="form-select" value={form.agentId} onChange={e => setForm({ ...form, agentId: e.target.value })}>
                                    <option value="">— All Agents —</option>
                                    {agents.map(a => (<option key={a.id} value={a.id}>{a.name}</option>))}
                                </select>
                            </div>

                            {/* Workflow Picker — Single Select */}
                            <div className="form-group">
                                <label>Target Workflow <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(select one, or leave as "All Workflows")</span></label>
                                <select className="form-select" value={form.workflowId} onChange={e => setForm({ ...form, workflowId: e.target.value })}>
                                    <option value="">— All Workflows —</option>
                                    {workflows.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compliance Rule Modal */}
            {showRuleModal && (
                <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header"><h3>{editingRule ? 'Edit' : 'Add'} Compliance Rule</h3><button className="btn-icon" onClick={() => setShowRuleModal(false)}>✕</button></div>
                        <div className="modal-body" style={{ overflowY: 'auto' }}>
                            <div className="form-group"><label>Rule Name</label><input className="form-input" value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} placeholder="e.g. Data Retention Check" /></div>
                            <div className="form-group"><label>Description</label><textarea className="form-input" rows={2} value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} placeholder="What does this rule check?" /></div>
                            <div className="form-row">
                                <div className="form-group"><label>Category</label><input className="form-input" value={ruleForm.category} onChange={e => setRuleForm({ ...ruleForm, category: e.target.value })} placeholder="e.g. data_protection" /></div>
                                <div className="form-group"><label>Severity</label>
                                    <select className="form-select" value={ruleForm.severity} onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}>
                                        <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                                    </select>
                                </div>
                            </div>

                            {/* Sample Data Section */}
                            <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>📋 Sample Data <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(optional — helps illustrate the rule)</span></div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(16,185,129,0.3)', padding: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                                            <HiCheckCircle style={{ color: '#10b981', fontSize: 14 }} />
                                            <span style={{ fontWeight: 700, fontSize: 12, color: '#10b981' }}>PASS Example</span>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 8 }}>
                                            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</label>
                                            <textarea className="form-input" rows={3} value={ruleForm.passInput} onChange={e => setRuleForm({ ...ruleForm, passInput: e.target.value })} placeholder="Compliant agent input..." style={{ fontSize: 12, fontFamily: 'monospace' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</label>
                                            <textarea className="form-input" rows={3} value={ruleForm.passOutput} onChange={e => setRuleForm({ ...ruleForm, passOutput: e.target.value })} placeholder="Expected compliant output..." style={{ fontSize: 12, fontFamily: 'monospace' }} />
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', padding: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                                            <HiXCircle style={{ color: '#ef4444', fontSize: 14 }} />
                                            <span style={{ fontWeight: 700, fontSize: 12, color: '#ef4444' }}>FAIL Example</span>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 8 }}>
                                            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input</label>
                                            <textarea className="form-input" rows={3} value={ruleForm.failInput} onChange={e => setRuleForm({ ...ruleForm, failInput: e.target.value })} placeholder="Non-compliant agent input..." style={{ fontSize: 12, fontFamily: 'monospace' }} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</label>
                                            <textarea className="form-input" rows={3} value={ruleForm.failOutput} onChange={e => setRuleForm({ ...ruleForm, failOutput: e.target.value })} placeholder="Violation-containing output..." style={{ fontSize: 12, fontFamily: 'monospace' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveRule} disabled={savingRule || !ruleForm.name}>{savingRule ? 'Saving...' : editingRule ? 'Update' : 'Create Rule'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header"><h3>⚠️ Delete Rule</h3><button className="btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button></div>
                        <div className="modal-body">
                            <p style={{ margin: 0 }}>Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>?</p>
                            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--color-error)', color: 'white' }} onClick={confirmDelete}>Delete Rule</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
