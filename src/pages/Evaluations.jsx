import { useState, useEffect, useCallback } from 'react';
import { HiPlay, HiPlus, HiTrash, HiPencil, HiChartBar, HiArrowPath, HiBeaker, HiShieldCheck, HiShieldExclamation, HiBolt, HiClock, HiCheckCircle, HiXCircle, HiExclamationTriangle, HiChevronDown, HiChevronRight, HiEye, HiLockClosed, HiUserGroup, HiXMark, HiFlag, HiHandThumbUp, HiCpuChip } from 'react-icons/hi2';
import api from '../api';

const MODE_LABELS = { test_suite: '🧪 Test Suite', simulation: '🎭 Simulation', golden_set: '🏅 Golden Set' };
const MODE_COLORS = { test_suite: 'blue', simulation: 'yellow', golden_set: 'green' };
const CATEGORY_COLORS = { accuracy: 'blue', safety: 'red', robustness: 'yellow', edge_case: 'yellow', performance: 'gray', general: 'gray' };
const STATUS_COLORS = { passed: 'green', failed: 'red', running: 'blue', completed: 'green', pending_review: 'yellow' };

function ScoreRing({ score, size = 80, label }) {
    const pct = Math.min(100, Math.max(0, score));
    const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={6} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
            </svg>
            <div style={{ marginTop: -size / 2 - 12, fontSize: size > 60 ? 20 : 14, fontWeight: 700, color, textAlign: 'center', height: size > 60 ? 24 : 18 }}>{Math.round(pct)}</div>
            {label && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: size > 60 ? 14 : 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
    return (
        <div style={{ padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border-color)', flex: 1, minWidth: 120 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon style={{ fontSize: 16, color: color || 'var(--text-muted)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

export default function Evaluations() {
    const [activeTab, setActiveTab] = useState('suites');
    const [suites, setSuites] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSuite, setEditingSuite] = useState(null);

    // Run state
    const [selectedSuiteId, setSelectedSuiteId] = useState('');
    const [judgeModel, setJudgeModel] = useState('');
    const [llmSettings, setLlmSettings] = useState([]);
    const [running, setRunning] = useState(false);
    const [runResult, setRunResult] = useState(null);
    const [expandedCase, setExpandedCase] = useState(null);

    // History state
    const [historyRuns, setHistoryRuns] = useState([]);
    const [historySuiteId, setHistorySuiteId] = useState('');
    const [selectedRun, setSelectedRun] = useState(null);

    // Reviews state
    const [reviews, setReviews] = useState([]);
    const [reviewNotes, setReviewNotes] = useState({});
    const [reviewScores, setReviewScores] = useState({});

    // Suite form
    const [suiteForm, setSuiteForm] = useState({
        name: '', description: '', agent_id: '', eval_mode: 'test_suite', is_locked: false,
        scenarios: [{ id: 'sc-1', name: '', input: '', success_criteria: '', expected_tools: '', category: 'accuracy', weight: 1.0 }],
        persona_config: { personas: ['happy_path', 'confused', 'adversarial', 'edge_case', 'data_heavy'] },
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [suitesRes, agentsRes, settingsRes] = await Promise.allSettled([
                api.listEvalSuites(), api.listAgents(), api.getSettings('llm')
            ]);
            if (suitesRes.status === 'fulfilled') setSuites(suitesRes.value.data || []);
            if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value.data || []);
            if (settingsRes.status === 'fulfilled') setLlmSettings(settingsRes.value.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ============= SUITES TAB =============
    const handleSaveSuite = async () => {
        try {
            const data = {
                ...suiteForm,
                scenarios: suiteForm.eval_mode === 'simulation' ? [] : suiteForm.scenarios.map(s => ({
                    ...s,
                    input: typeof s.input === 'string' ? (s.input.startsWith('{') ? JSON.parse(s.input) : { prompt: s.input }) : s.input,
                    expected_tools: typeof s.expected_tools === 'string' ? s.expected_tools.split(',').map(t => t.trim()).filter(Boolean) : s.expected_tools,
                })),
            };
            if (editingSuite) {
                await api.updateEvalSuite(editingSuite.id, data);
            } else {
                await api.createEvalSuite(data);
            }
            setShowCreateModal(false);
            setEditingSuite(null);
            resetForm();
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteSuite = async (id) => {
        if (!confirm('Delete this evaluation suite?')) return;
        try { await api.deleteEvalSuite(id); loadData(); } catch (err) { alert(err.message); }
    };

    const resetForm = () => setSuiteForm({
        name: '', description: '', agent_id: '', eval_mode: 'test_suite', is_locked: false,
        scenarios: [{ id: 'sc-1', name: '', input: '', success_criteria: '', expected_tools: '', category: 'accuracy', weight: 1.0 }],
        persona_config: { personas: ['happy_path', 'confused', 'adversarial', 'edge_case', 'data_heavy'] },
    });

    const addScenario = () => {
        const idx = suiteForm.scenarios.length + 1;
        setSuiteForm({ ...suiteForm, scenarios: [...suiteForm.scenarios, { id: `sc-${idx}`, name: '', input: '', success_criteria: '', expected_tools: '', category: 'accuracy', weight: 1.0 }] });
    };

    const updateScenario = (i, field, value) => {
        const updated = [...suiteForm.scenarios];
        updated[i] = { ...updated[i], [field]: value };
        setSuiteForm({ ...suiteForm, scenarios: updated });
    };

    const removeScenario = (i) => {
        setSuiteForm({ ...suiteForm, scenarios: suiteForm.scenarios.filter((_, j) => j !== i) });
    };

    // ============= RUN TAB =============
    const handleRunEval = async () => {
        if (!selectedSuiteId) return alert('Select a suite to evaluate');
        setRunning(true); setRunResult(null); setExpandedCase(null);
        try {
            const res = await api.runEvaluation(selectedSuiteId, judgeModel || null);
            setRunResult(res.data);
        } catch (err) { setRunResult({ error: err.message }); }
        finally { setRunning(false); }
    };

    // ============= HISTORY TAB =============
    const loadHistory = useCallback(async (suiteId) => {
        if (!suiteId) { setHistoryRuns([]); return; }
        try {
            const res = await api.getEvalRuns(suiteId);
            setHistoryRuns(res.data || []);
        } catch (err) { console.error(err); }
    }, []);

    const loadRunDetail = async (runId) => {
        try {
            const res = await api.getEvalRun(runId);
            setSelectedRun(res.data);
        } catch (err) { console.error(err); }
    };

    // ============= REVIEWS TAB =============
    const loadReviews = async () => {
        try {
            const res = await api.getEvalReviews();
            setReviews(res.data || []);
        } catch (err) { console.error(err); }
    };

    const handleSubmitReview = async (reviewId, action) => {
        try {
            await api.submitEvalReview(reviewId, {
                review_action: action,
                reviewed_score: reviewScores[reviewId] || null,
                reviewer_notes: reviewNotes[reviewId] || '',
            });
            loadReviews();
        } catch (err) { alert(err.message); }
    };

    useEffect(() => {
        if (activeTab === 'reviews') loadReviews();
    }, [activeTab]);

    useEffect(() => {
        if (historySuiteId) loadHistory(historySuiteId);
    }, [historySuiteId, loadHistory]);

    const TABS = [
        { key: 'suites', label: '📋 Test Suites' },
        { key: 'run', label: '▶️ Run Evaluation' },
        { key: 'history', label: '📊 History' },
        { key: 'reviews', label: `🔍 Reviews${reviews.length > 0 ? ` (${reviews.length})` : ''}` },
    ];

    const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : '—';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                    Three-layer behavioral evaluation • Node · Session · System
                </p>
                <button className="btn btn-secondary btn-sm" onClick={loadData}><HiArrowPath /> Refresh</button>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ========== TAB 1: SUITES ========== */}
            {activeTab === 'suites' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setEditingSuite(null); setShowCreateModal(true); }}>
                            <HiPlus /> Create Suite
                        </button>
                    </div>
                    {suites.length === 0 ? (
                        <div className="card"><div className="empty-state"><div className="icon">🧪</div><h4>No evaluation suites yet</h4><p>Create a test suite to start evaluating your agents</p></div></div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {suites.map(s => {
                                const scenarios = typeof s.scenarios === 'string' ? JSON.parse(s.scenarios) : (s.scenarios || []);
                                return (
                                    <div key={s.id} className="card" style={{ padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                                                    <span className={`badge ${MODE_COLORS[s.eval_mode]}`}>{MODE_LABELS[s.eval_mode]}</span>
                                                    {s.is_locked && <HiLockClosed style={{ color: 'var(--warning)', fontSize: 14 }} />}
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {s.agent_name ? `Agent: ${s.agent_name}` : 'No agent assigned'} • {s.eval_mode === 'simulation' ? 'Auto-generated scenarios' : `${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''}`} • {s.run_count || 0} runs
                                                </div>
                                            </div>
                                            {s.last_score != null && <ScoreRing score={s.last_score} size={50} />}
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" onClick={() => {
                                                    setEditingSuite(s);
                                                    setSuiteForm({
                                                        name: s.name, description: s.description || '', agent_id: s.agent_id || '',
                                                        eval_mode: s.eval_mode, is_locked: s.is_locked, scenarios: scenarios.length > 0 ? scenarios : [{ id: 'sc-1', name: '', input: '', success_criteria: '', expected_tools: '', category: 'accuracy', weight: 1.0 }],
                                                        persona_config: typeof s.persona_config === 'string' ? JSON.parse(s.persona_config) : (s.persona_config || {}),
                                                    });
                                                    setShowCreateModal(true);
                                                }}><HiPencil /></button>
                                                <button className="btn-icon" onClick={() => handleDeleteSuite(s.id)}><HiTrash /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========== TAB 2: RUN ========== */}
            {activeTab === 'run' && (
                <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>⚡ Evaluation Setup</h3></div>
                        <div style={{ padding: '16px 20px' }}>
                            <div className="form-row" style={{ marginBottom: 16 }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Test Suite</label>
                                    <select className="form-select" value={selectedSuiteId} onChange={e => setSelectedSuiteId(e.target.value)}>
                                        <option value="">— Select Suite —</option>
                                        {suites.map(s => <option key={s.id} value={s.id}>{s.name} ({MODE_LABELS[s.eval_mode]})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Judge Model (LLM-as-a-Judge)</label>
                                    <select className="form-select" value={judgeModel} onChange={e => setJudgeModel(e.target.value)}>
                                        <option value="">Rule-based (no LLM)</option>
                                        {llmSettings.map(s => {
                                            const v = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
                                            return <option key={s.id} value={s.key}>{v.provider} / {v.model}</option>;
                                        })}
                                    </select>
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={handleRunEval} disabled={running || !selectedSuiteId}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15 }}>
                                <HiPlay style={{ fontSize: 18 }} />{running ? 'Evaluating Agent...' : '▶ Run Evaluation'}
                            </button>
                        </div>
                    </div>

                    {/* Run Results */}
                    {runResult && !runResult.error && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* Score Overview */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                                    <ScoreRing score={runResult.overall_score || 0} size={100} label="Overall" />
                                    <div style={{ flex: 1, display: 'grid', gap: 12 }}>
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            <MetricCard icon={HiCheckCircle} label="Passed" value={runResult.passed_scenarios} color="var(--success)" />
                                            <MetricCard icon={HiXCircle} label="Failed" value={runResult.failed_scenarios} color="var(--danger)" />
                                            <MetricCard icon={HiExclamationTriangle} label="Needs Review" value={runResult.needs_review} color="var(--warning)" />
                                            <MetricCard icon={HiClock} label="Avg Latency" value={`${runResult.system_scores?.avg_latency_ms || 0}ms`} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Three-Layer Breakdown */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {/* Node-Level */}
                                <div className="card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>🔬 Node-Level</div>
                                    {runResult.node_scores && Object.entries(runResult.node_scores).map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: v >= 7 ? 'var(--success)' : v >= 4 ? 'var(--warning)' : 'var(--danger)' }}>{typeof v === 'number' ? v.toFixed(1) : v}/10</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Session-Level */}
                                <div className="card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Session-Level</div>
                                    {runResult.session_scores && Object.entries(runResult.session_scores).map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: v >= 7 ? 'var(--success)' : v >= 4 ? 'var(--warning)' : 'var(--danger)' }}>{typeof v === 'number' ? v.toFixed(1) : v}/10</span>
                                        </div>
                                    ))}
                                </div>
                                {/* System-Level */}
                                <div className="card" style={{ padding: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--warning)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>⚡ System-Level</div>
                                    {runResult.system_scores && Object.entries(runResult.system_scores).map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{typeof v === 'number' && k.includes('latency') ? `${v}ms` : (typeof v === 'number' ? (k.includes('token_efficiency') ? `${v}/10` : v) : v)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Per-Scenario Results */}
                            <div className="card">
                                <div className="card-header"><h3>Per-Scenario Results ({(typeof runResult.results === 'string' ? JSON.parse(runResult.results) : (runResult.results || [])).length} scenarios)</h3></div>
                                {(typeof runResult.results === 'string' ? JSON.parse(runResult.results) : (runResult.results || [])).map((r, i) => (
                                    <div key={r.scenario_id || i} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                        onClick={() => setExpandedCase(expandedCase === i ? null : i)}>
                                        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {expandedCase === i ? <HiChevronDown style={{ color: 'var(--text-muted)' }} /> : <HiChevronRight style={{ color: 'var(--text-muted)' }} />}
                                            <span className={`badge ${CATEGORY_COLORS[r.category] || 'gray'}`} style={{ fontSize: 10 }}>{r.category}</span>
                                            <span style={{ flex: 1, fontWeight: 500 }}>{r.scenario_name || r.scenario_id}</span>
                                            {r.system_metrics && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><HiClock style={{ verticalAlign: 'middle' }} /> {r.system_metrics.latency_ms}ms</span>}
                                            <span style={{ fontSize: 14, fontWeight: 700, color: r.score >= 6 ? 'var(--success)' : r.score >= 3 ? 'var(--warning)' : 'var(--danger)' }}>{r.score?.toFixed(1)}/10</span>
                                            <span className={`badge ${r.status === 'passed' ? 'green' : 'red'}`}>{r.status?.toUpperCase()}</span>
                                            {r.needs_review && <span className="badge yellow">REVIEW</span>}
                                        </div>
                                        {expandedCase === i && (
                                            <div style={{ padding: '0 20px 16px 44px', display: 'grid', gap: 10 }}>
                                                {r.error && <div style={{ padding: 10, background: 'rgba(239,68,68,0.08)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>❌ {r.error}</div>}
                                                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Input</div>
                                                    <pre style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12, margin: 0, overflow: 'auto', maxHeight: 100 }}>{typeof r.input === 'string' ? r.input : JSON.stringify(r.input, null, 2)}</pre>
                                                </div>
                                                <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Success Criteria</div>
                                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.expected || '—'}</div>
                                                </div>
                                                {r.agent_response && (
                                                    <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Agent Response</div>
                                                        <pre style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12, margin: 0, overflow: 'auto', maxHeight: 150 }}>{r.agent_response.text || JSON.stringify(r.agent_response, null, 2)}</pre>
                                                    </div>
                                                )}
                                                {r.judge_verdict?.reasoning && (
                                                    <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 4 }}>🧠 Judge Reasoning</div>
                                                        <div style={{ display: 'grid', gap: 4 }}>
                                                            {Object.entries(r.judge_verdict.reasoning).map(([k, v]) => (
                                                                <div key={k} style={{ display: 'flex', gap: 8, padding: 6, background: 'rgba(99,102,241,0.04)', borderRadius: 6, fontSize: 12 }}>
                                                                    <span style={{ fontWeight: 600, minWidth: 120, color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}</span>
                                                                    <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{v}</span>
                                                                    <span style={{ fontWeight: 700, color: (r.judge_verdict.scores?.[k] || 0) >= 7 ? 'var(--success)' : (r.judge_verdict.scores?.[k] || 0) >= 4 ? 'var(--warning)' : 'var(--danger)' }}>{r.judge_verdict.scores?.[k]}/10</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {runResult?.error && (
                        <div className="card" style={{ border: '2px solid var(--danger)' }}>
                            <div className="empty-state"><div className="icon">❌</div><h4>Evaluation Error</h4><p>{runResult.error}</p></div>
                        </div>
                    )}
                </div>
            )}

            {/* ========== TAB 3: HISTORY ========== */}
            {activeTab === 'history' && (
                <div>
                    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Select Suite</label>
                                <select className="form-select" value={historySuiteId} onChange={e => { setHistorySuiteId(e.target.value); setSelectedRun(null); }}>
                                    <option value="">— Choose Suite —</option>
                                    {suites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {historyRuns.length > 0 && (
                        <div className="card">
                            <table className="data-table">
                                <thead><tr><th>Date</th><th>Mode</th><th>Judge</th><th>Scenarios</th><th>Score</th><th>Status</th><th></th></tr></thead>
                                <tbody>
                                    {historyRuns.map(r => (
                                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => loadRunDetail(r.id)}>
                                            <td style={{ fontSize: 13 }}>{formatDate(r.started_at)}</td>
                                            <td><span className={`badge ${MODE_COLORS[r.eval_mode]}`}>{r.eval_mode}</span></td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.judge_model || 'rule-based'}</td>
                                            <td>
                                                <span style={{ color: 'var(--success)' }}>{r.passed_scenarios}✓</span> / <span style={{ color: 'var(--danger)' }}>{r.failed_scenarios}✗</span> / {r.total_scenarios}
                                            </td>
                                            <td><span style={{ fontWeight: 700, color: r.overall_score >= 70 ? 'var(--success)' : r.overall_score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{Math.round(r.overall_score)}</span></td>
                                            <td><span className={`badge ${STATUS_COLORS[r.status] || 'gray'}`}>{r.status}</span></td>
                                            <td><button className="btn-icon" onClick={(e) => { e.stopPropagation(); loadRunDetail(r.id); }}><HiEye /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedRun && (
                        <div className="card" style={{ marginTop: 16, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: 16 }}>Run Detail: {selectedRun.suite_name}</h3>
                                <ScoreRing score={selectedRun.overall_score || 0} size={60} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: 6 }}>🔬 Node</div>
                                    {selectedRun.node_scores && Object.entries(typeof selectedRun.node_scores === 'string' ? JSON.parse(selectedRun.node_scores) : selectedRun.node_scores).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{k.replace(/_/g, ' ')}</span><strong>{typeof v === 'number' ? v.toFixed(1) : v}</strong></div>
                                    ))}
                                </div>
                                <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', marginBottom: 6 }}>📊 Session</div>
                                    {selectedRun.session_scores && Object.entries(typeof selectedRun.session_scores === 'string' ? JSON.parse(selectedRun.session_scores) : selectedRun.session_scores).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{k.replace(/_/g, ' ')}</span><strong>{typeof v === 'number' ? v.toFixed(1) : v}</strong></div>
                                    ))}
                                </div>
                                <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 6 }}>⚡ System</div>
                                    {selectedRun.system_scores && Object.entries(typeof selectedRun.system_scores === 'string' ? JSON.parse(selectedRun.system_scores) : selectedRun.system_scores).map(([k, v]) => (
                                        <div key={k} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span>{k.replace(/_/g, ' ')}</span><strong>{typeof v === 'number' && k.includes('latency') ? `${v}ms` : v}</strong></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {historySuiteId && historyRuns.length === 0 && (
                        <div className="card"><div className="empty-state"><div className="icon">📊</div><h4>No runs yet</h4><p>Run an evaluation for this suite to see results here</p></div></div>
                    )}
                </div>
            )}

            {/* ========== TAB 4: REVIEWS (HITL) ========== */}
            {activeTab === 'reviews' && (
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                            <HiUserGroup style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Human-in-the-Loop review queue — evaluate low-confidence and flagged results
                        </p>
                    </div>
                    {reviews.length === 0 ? (
                        <div className="card"><div className="empty-state"><div className="icon">✅</div><h4>No pending reviews</h4><p>All evaluation results have been reviewed or scored with high confidence</p></div></div>
                    ) : (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {reviews.map(r => (
                                <div key={r.id} className="card" style={{ padding: 20, border: '1px solid var(--warning)', borderLeft: '4px solid var(--warning)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15 }}>{r.suite_name} → {r.scenario_id}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Agent: {r.agent_name || '—'} • Judge: {r.judge_model || 'rule-based'} • Reason: <span className="badge yellow" style={{ fontSize: 10 }}>{r.review_reason}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--warning)' }}>
                                            {r.original_score != null ? Number(r.original_score).toFixed(1) : '?'}/10
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 12 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Override Score (optional)</label>
                                            <input type="number" className="form-input" min="0" max="10" step="0.5" placeholder="0-10"
                                                value={reviewScores[r.id] || ''} onChange={e => setReviewScores({ ...reviewScores, [r.id]: e.target.value })} style={{ width: 100 }} />
                                        </div>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
                                            <input className="form-input" placeholder="Review notes..."
                                                value={reviewNotes[r.id] || ''} onChange={e => setReviewNotes({ ...reviewNotes, [r.id]: e.target.value })} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: 'none' }} onClick={() => handleSubmitReview(r.id, 'approved')}><HiHandThumbUp /> Approve</button>
                                            <button className="btn btn-sm" style={{ background: 'var(--info-bg)', color: 'var(--info)', border: 'none' }} onClick={() => handleSubmitReview(r.id, 'overridden')}><HiPencil /> Override</button>
                                            <button className="btn btn-sm" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: 'none' }} onClick={() => handleSubmitReview(r.id, 'flagged_known_issue')}><HiFlag /> Flag</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========== CREATE/EDIT SUITE MODAL ========== */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750, maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3>{editingSuite ? 'Edit Suite' : 'Create Evaluation Suite'}</h3>
                            <button className="btn-icon" onClick={() => setShowCreateModal(false)}><HiXMark /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row" style={{ marginBottom: 12 }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Suite Name</label>
                                    <input className="form-input" value={suiteForm.name} onChange={e => setSuiteForm({ ...suiteForm, name: e.target.value })} placeholder="e.g., GPT-4 Quality Baseline" />
                                </div>
                                <div className="form-group">
                                    <label>Mode</label>
                                    <select className="form-select" value={suiteForm.eval_mode} onChange={e => setSuiteForm({ ...suiteForm, eval_mode: e.target.value })}>
                                        <option value="test_suite">🧪 Test Suite</option>
                                        <option value="simulation">🎭 Simulation</option>
                                        <option value="golden_set">🏅 Golden Set</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Description</label>
                                <input className="form-input" value={suiteForm.description} onChange={e => setSuiteForm({ ...suiteForm, description: e.target.value })} placeholder="What does this suite evaluate?" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Target Agent</label>
                                <select className="form-select" value={suiteForm.agent_id} onChange={e => setSuiteForm({ ...suiteForm, agent_id: e.target.value })}>
                                    <option value="">— Select Agent —</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.protocol})</option>)}
                                </select>
                            </div>

                            {suiteForm.eval_mode === 'golden_set' && (
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" checked={suiteForm.is_locked} onChange={e => setSuiteForm({ ...suiteForm, is_locked: e.target.checked })} />
                                        <HiLockClosed /> Lock Golden Set (prevent modifications)
                                    </label>
                                </div>
                            )}

                            {suiteForm.eval_mode === 'simulation' ? (
                                <div>
                                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Simulation Personas</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                        {[
                                            { key: 'happy_path', emoji: '🙂', name: 'Happy Path' },
                                            { key: 'confused', emoji: '😕', name: 'Confused User' },
                                            { key: 'adversarial', emoji: '😡', name: 'Adversarial' },
                                            { key: 'edge_case', emoji: '🔄', name: 'Edge Cases' },
                                            { key: 'data_heavy', emoji: '📊', name: 'Data-Heavy' },
                                        ].map(p => (
                                            <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--bg-input)', borderRadius: 8, cursor: 'pointer' }}>
                                                <input type="checkbox"
                                                    checked={(suiteForm.persona_config.personas || []).includes(p.key)}
                                                    onChange={e => {
                                                        const personas = e.target.checked
                                                            ? [...(suiteForm.persona_config.personas || []), p.key]
                                                            : (suiteForm.persona_config.personas || []).filter(k => k !== p.key);
                                                        setSuiteForm({ ...suiteForm, persona_config: { ...suiteForm.persona_config, personas } });
                                                    }} />
                                                <span>{p.emoji} {p.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ fontWeight: 600 }}>Scenarios ({suiteForm.scenarios.length})</label>
                                        <button className="btn btn-secondary btn-sm" onClick={addScenario}><HiPlus /> Add</button>
                                    </div>
                                    {suiteForm.scenarios.map((s, i) => (
                                        <div key={i} style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 8, position: 'relative' }}>
                                            {suiteForm.scenarios.length > 1 && (
                                                <button className="btn-icon" style={{ position: 'absolute', top: 8, right: 8 }} onClick={() => removeScenario(i)}><HiTrash /></button>
                                            )}
                                            <div className="form-row" style={{ marginBottom: 8 }}>
                                                <div className="form-group" style={{ flex: 2 }}>
                                                    <label style={{ fontSize: 11 }}>Name</label>
                                                    <input className="form-input" value={s.name} onChange={e => updateScenario(i, 'name', e.target.value)} placeholder="Scenario name" />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontSize: 11 }}>Category</label>
                                                    <select className="form-select" value={s.category} onChange={e => updateScenario(i, 'category', e.target.value)}>
                                                        <option value="accuracy">Accuracy</option>
                                                        <option value="safety">Safety</option>
                                                        <option value="robustness">Robustness</option>
                                                        <option value="performance">Performance</option>
                                                    </select>
                                                </div>
                                                <div className="form-group" style={{ maxWidth: 80 }}>
                                                    <label style={{ fontSize: 11 }}>Weight</label>
                                                    <input type="number" className="form-input" min="0.1" max="5" step="0.1" value={s.weight} onChange={e => updateScenario(i, 'weight', parseFloat(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <label style={{ fontSize: 11 }}>Input (text or JSON)</label>
                                                <textarea className="form-input" rows={2} style={{ fontFamily: 'monospace', fontSize: 12 }} value={typeof s.input === 'string' ? s.input : JSON.stringify(s.input)}
                                                    onChange={e => updateScenario(i, 'input', e.target.value)} placeholder='What should the agent do?' />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 8 }}>
                                                <label style={{ fontSize: 11 }}>Success Criteria</label>
                                                <input className="form-input" value={s.success_criteria} onChange={e => updateScenario(i, 'success_criteria', e.target.value)} placeholder="What does a good response look like?" />
                                            </div>
                                            <div className="form-group">
                                                <label style={{ fontSize: 11 }}>Expected Tools (comma-separated, optional)</label>
                                                <input className="form-input" value={typeof s.expected_tools === 'string' ? s.expected_tools : (s.expected_tools || []).join(', ')}
                                                    onChange={e => updateScenario(i, 'expected_tools', e.target.value)} placeholder="tool_a, tool_b" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveSuite} disabled={!suiteForm.name || !suiteForm.agent_id}>
                                {editingSuite ? 'Update Suite' : 'Create Suite'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
