import { useState, useEffect, useCallback } from 'react';
import { HiShieldExclamation, HiPlus, HiTrash, HiPencil, HiArrowPath, HiCheckCircle, HiXCircle, HiPlay, HiChevronDown, HiChevronRight, HiXMark, HiEye, HiLink, HiLinkSlash, HiBeaker, HiExclamationTriangle, HiShieldCheck, HiCpuChip, HiFunnel, HiDocumentText, HiLockClosed, HiSignal } from 'react-icons/hi2';
import api from '../api';

const RULE_TYPES = {
    content_filter: { label: 'Content Filter', icon: '🚫', color: 'red', description: 'Block keywords/phrases' },
    pii_shield: { label: 'PII Shield', icon: '🔒', color: 'blue', description: 'Detect sensitive data (SSN, CC, email)' },
    prompt_injection: { label: 'Prompt Injection', icon: '💉', color: 'red', description: 'Detect jailbreak attempts' },
    topic_boundary: { label: 'Topic Boundary', icon: '🎯', color: 'yellow', description: 'Enforce allowed/blocked topics' },
    token_limit: { label: 'Token Limit', icon: '📏', color: 'gray', description: 'Max token enforcement' },
    custom_regex: { label: 'Custom Regex', icon: '🔍', color: 'blue', description: 'User-defined patterns' },
    output_format: { label: 'Output Format', icon: '📋', color: 'gray', description: 'Validate response structure' },
    llm_judge: { label: 'LLM Judge', icon: '🧠', color: 'purple', description: 'AI-based content eval' },
};

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6b7280' };
const SEVERITY_LABELS = { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '⚪ Low' };
const SCOPE_LABELS = { input: '→ Input', output: '← Output', both: '↔ Both' };

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

function PassRateRing({ rate, size = 80, label }) {
    const pct = Math.min(100, Math.max(0, rate));
    const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
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
            <div style={{ marginTop: -size / 2 - 12, fontSize: size > 60 ? 18 : 14, fontWeight: 700, color, textAlign: 'center', height: size > 60 ? 22 : 18 }}>{pct.toFixed(0)}%</div>
            {label && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: size > 60 ? 14 : 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>}
        </div>
    );
}

export default function Guardrails() {
    const [activeTab, setActiveTab] = useState('profiles');
    const [profiles, setProfiles] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // Profile state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [profileForm, setProfileForm] = useState({ name: '', description: '', mode: 'block' });
    const [selectedProfile, setSelectedProfile] = useState(null);

    // Rule state
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [expandedRuleId, setExpandedRuleId] = useState(null);
    const [ruleForm, setRuleForm] = useState({
        name: '', description: '', ruleType: 'content_filter', scope: 'both', severity: 'high',
        config: { keywords: [] },
    });

    // Profile name duplicate check
    const [profileNameError, setProfileNameError] = useState('');

    // Assignment state
    const [assignAgentId, setAssignAgentId] = useState('');
    const [assignProfileId, setAssignProfileId] = useState('');

    // Test state
    const [testProfileId, setTestProfileId] = useState('');
    const [testCases, setTestCases] = useState([
        { input: '', expectedVerdict: 'block', description: '', direction: 'input' },
    ]);
    const [testRunning, setTestRunning] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testRuns, setTestRuns] = useState([]);
    const [expandedTest, setExpandedTest] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profilesRes, agentsRes, statsRes] = await Promise.allSettled([
                api.listGuardrailProfiles(),
                api.listAgents(),
                api.getGuardrailStats(),
            ]);
            if (profilesRes.status === 'fulfilled') setProfiles(profilesRes.value.data || []);
            if (agentsRes.status === 'fulfilled') {
                const agentData = agentsRes.value.data;
                setAgents(Array.isArray(agentData) ? agentData : (agentData?.agents || []));
            }
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || null);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // ─── Profile CRUD ───
    const handleSaveProfile = async () => {
        setProfileNameError('');
        try {
            if (editingProfile) {
                await api.updateGuardrailProfile(editingProfile.id, profileForm);
            } else {
                await api.createGuardrailProfile(profileForm);
            }
            setShowProfileModal(false);
            setEditingProfile(null);
            setProfileForm({ name: '', description: '', mode: 'block' });
            setProfileNameError('');
            loadData();
        } catch (err) {
            if (err.message?.includes('already exists')) {
                setProfileNameError(err.message);
            } else {
                alert(err.message);
            }
        }
    };

    const handleDeleteProfile = async (id) => {
        if (!confirm('Delete this guardrail profile and all its rules?')) return;
        try { await api.deleteGuardrailProfile(id); if (selectedProfile?.id === id) setSelectedProfile(null); loadData(); }
        catch (err) { alert(err.message); }
    };

    const loadProfile = async (id) => {
        try {
            const res = await api.getGuardrailProfile(id);
            setSelectedProfile(res.data);
        } catch (err) { alert(err.message); }
    };

    // ─── Rule CRUD ───
    const handleSaveRule = async () => {
        if (!selectedProfile) return;
        try {
            await api.addGuardrailRule(selectedProfile.id, ruleForm);
            setShowRuleModal(false);
            setRuleForm({ name: '', description: '', ruleType: 'content_filter', scope: 'both', severity: 'high', config: { keywords: [] } });
            loadProfile(selectedProfile.id);
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!confirm('Delete this rule?')) return;
        try { await api.deleteGuardrailRule(ruleId); loadProfile(selectedProfile.id); loadData(); }
        catch (err) { alert(err.message); }
    };

    // ─── Assignment ───
    const handleAssign = async () => {
        if (!assignAgentId || !assignProfileId) return alert('Select both an agent and a profile');
        try {
            await api.assignGuardrail(assignAgentId, assignProfileId);
            setAssignAgentId(''); setAssignProfileId('');
            loadData();
        } catch (err) { alert(err.message); }
    };

    const handleUnassign = async (agentId, profileId) => {
        try { await api.unassignGuardrail(agentId, profileId); loadData(); }
        catch (err) { alert(err.message); }
    };

    // ─── Test Runner ───
    const addTestCase = () => {
        setTestCases([...testCases, { input: '', expectedVerdict: 'block', description: '', direction: 'input' }]);
    };

    const updateTestCase = (i, field, value) => {
        const updated = [...testCases];
        updated[i] = { ...updated[i], [field]: value };
        setTestCases(updated);
    };

    const removeTestCase = (i) => {
        setTestCases(testCases.filter((_, j) => j !== i));
    };

    const handleRunTests = async () => {
        if (!testProfileId) return alert('Select a guardrail profile');
        const validCases = testCases.filter(tc => tc.input.trim());
        if (validCases.length === 0) return alert('Add at least one test case with input');
        setTestRunning(true); setTestResult(null);
        try {
            const res = await api.runGuardrailTests(testProfileId, validCases);
            setTestResult(res.data);
            loadTestHistory();
        } catch (err) { setTestResult({ error: err.message }); }
        finally { setTestRunning(false); }
    };

    const loadTestHistory = async () => {
        try {
            const res = await api.getGuardrailTestRuns(null, 20);
            setTestRuns(res.data || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (activeTab === 'tests') loadTestHistory();
    }, [activeTab]);

    // ─── Config Editor ───
    const renderConfigEditor = () => {
        const config = ruleForm.config || {};
        switch (ruleForm.ruleType) {
            case 'content_filter':
                return (
                    <div className="form-group">
                        <label>Blocked Keywords <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(one per line)</span></label>
                        <textarea className="form-input" rows={4} placeholder={"password\nconfidential\nsecret key"}
                            value={(config.keywords || []).join('\n')}
                            onChange={e => setRuleForm({ ...ruleForm, config: { ...config, keywords: e.target.value.split('\n').filter(k => k.trim()) } })} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13 }}>
                            <input type="checkbox" checked={config.caseSensitive || false}
                                onChange={e => setRuleForm({ ...ruleForm, config: { ...config, caseSensitive: e.target.checked } })} />
                            Case Sensitive
                        </label>
                    </div>
                );
            case 'pii_shield':
                return (
                    <div className="form-group">
                        <label>PII Patterns to Detect</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                            {['ssn', 'credit_card', 'email', 'phone', 'dob', 'mrn'].map(p => (
                                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '4px 8px', background: 'var(--bg-input)', borderRadius: 6 }}>
                                    <input type="checkbox"
                                        checked={!(config.patterns?.length > 0) || (config.patterns || []).includes(p)}
                                        onChange={e => {
                                            const current = config.patterns?.length > 0 ? config.patterns : ['ssn', 'credit_card', 'email', 'phone', 'dob', 'mrn'];
                                            const patterns = e.target.checked ? [...current, p] : current.filter(x => x !== p);
                                            setRuleForm({ ...ruleForm, config: { ...config, patterns } });
                                        }} />
                                    {p.replace(/_/g, ' ').toUpperCase()}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'prompt_injection':
                return (
                    <div className="form-group">
                        <label>Extra Patterns <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(regex, one per line — built-in patterns always active)</span></label>
                        <textarea className="form-input" rows={3} placeholder="custom injection pattern regex"
                            value={(config.extraPatterns || []).join('\n')}
                            onChange={e => setRuleForm({ ...ruleForm, config: { ...config, extraPatterns: e.target.value.split('\n').filter(k => k.trim()) } })} />
                    </div>
                );
            case 'topic_boundary':
                return (
                    <>
                        <div className="form-group">
                            <label>Allowed Topics <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(one per line)</span></label>
                            <textarea className="form-input" rows={3} placeholder={"finance\naccounting\nbudget"}
                                value={(config.allowedTopics || []).join('\n')}
                                onChange={e => setRuleForm({ ...ruleForm, config: { ...config, allowedTopics: e.target.value.split('\n').filter(k => k.trim()) } })} />
                        </div>
                        <div className="form-group">
                            <label>Blocked Topics <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(one per line)</span></label>
                            <textarea className="form-input" rows={3} placeholder={"politics\nreligion\nviolence"}
                                value={(config.blockedTopics || []).join('\n')}
                                onChange={e => setRuleForm({ ...ruleForm, config: { ...config, blockedTopics: e.target.value.split('\n').filter(k => k.trim()) } })} />
                        </div>
                    </>
                );
            case 'token_limit':
                return (
                    <div className="form-group">
                        <label>Max Tokens</label>
                        <input type="number" className="form-input" value={config.maxTokens || 4096}
                            onChange={e => setRuleForm({ ...ruleForm, config: { ...config, maxTokens: parseInt(e.target.value) || 4096 } })} />
                    </div>
                );
            case 'custom_regex':
                return (
                    <div className="form-group">
                        <label>Custom Patterns <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(JSON array)</span></label>
                        <textarea className="form-input" rows={4}
                            placeholder={'[{"pattern": "\\\\bAPI_KEY\\\\b", "label": "API Key Leak", "flags": "gi"}]'}
                            value={JSON.stringify(config.patterns || [], null, 2)}
                            onChange={e => {
                                try { setRuleForm({ ...ruleForm, config: { ...config, patterns: JSON.parse(e.target.value) } }); }
                                catch { /* let user keep typing */ }
                            }} />
                    </div>
                );
            case 'output_format':
                return (
                    <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
                            <input type="checkbox" checked={config.requireJson || false}
                                onChange={e => setRuleForm({ ...ruleForm, config: { ...config, requireJson: e.target.checked } })} />
                            Require JSON output
                        </label>
                        <div className="form-group">
                            <label>Max Output Length (chars)</label>
                            <input type="number" className="form-input" value={config.maxLength || ''}
                                onChange={e => setRuleForm({ ...ruleForm, config: { ...config, maxLength: parseInt(e.target.value) || undefined } })}
                                placeholder="No limit" />
                        </div>
                    </>
                );
            default:
                return <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 8 }}>No configuration needed for this rule type.</div>;
        }
    };

    // ─── Rule Config Detail Renderer ───
    const renderRuleConfigDetail = (rule) => {
        const config = typeof rule.config === 'string' ? JSON.parse(rule.config) : (rule.config || {});
        const rt = rule.rule_type;

        const ConfigRow = ({ label, children }) => (
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-muted)', minWidth: 120, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1 }}>{children}</div>
            </div>
        );

        const TagList = ({ items, color = 'blue' }) => (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(items || []).map((item, i) => (
                    <span key={i} className={`badge ${color}`} style={{ fontSize: 10, padding: '2px 8px' }}>{item}</span>
                ))}
                {(!items || items.length === 0) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None configured</span>}
            </div>
        );

        return (
            <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 8, marginTop: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    {RULE_TYPES[rt]?.icon} {RULE_TYPES[rt]?.label} Configuration
                </div>

                {rt === 'content_filter' && (
                    <>
                        <ConfigRow label="Blocked Keywords">
                            <TagList items={config.keywords} color="red" />
                        </ConfigRow>
                        <ConfigRow label="Case Sensitive">
                            <span className={`badge ${config.caseSensitive ? 'green' : 'gray'}`} style={{ fontSize: 10 }}>
                                {config.caseSensitive ? 'Yes' : 'No (default)'}
                            </span>
                        </ConfigRow>
                    </>
                )}

                {rt === 'pii_shield' && (
                    <ConfigRow label="PII Patterns">
                        <TagList items={config.patterns} color="blue" />
                    </ConfigRow>
                )}

                {rt === 'prompt_injection' && (
                    <>
                        <ConfigRow label="Built-in Detection">
                            <span className="badge green" style={{ fontSize: 10 }}>✓ Always Active</span>
                        </ConfigRow>
                        {config.extraPatterns?.length > 0 && (
                            <ConfigRow label="Extra Patterns">
                                <div style={{ display: 'grid', gap: 3 }}>
                                    {config.extraPatterns.map((p, i) => (
                                        <code key={i} style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{p}</code>
                                    ))}
                                </div>
                            </ConfigRow>
                        )}
                    </>
                )}

                {rt === 'topic_boundary' && (
                    <>
                        <ConfigRow label="Allowed Topics">
                            <TagList items={config.allowedTopics} color="green" />
                        </ConfigRow>
                        <ConfigRow label="Blocked Topics">
                            <TagList items={config.blockedTopics} color="red" />
                        </ConfigRow>
                    </>
                )}

                {rt === 'token_limit' && (
                    <ConfigRow label="Max Tokens">
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{(config.maxTokens || 4096).toLocaleString()}</span>
                    </ConfigRow>
                )}

                {rt === 'custom_regex' && (
                    <ConfigRow label="Custom Patterns">
                        <div style={{ display: 'grid', gap: 4 }}>
                            {(config.patterns || []).map((p, i) => (
                                <div key={i} style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.06)', borderRadius: 6, fontSize: 11 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontWeight: 600, color: 'var(--info)' }}>{p.label || `Pattern ${i + 1}`}</span>
                                        {p.flags && <span className="badge gray" style={{ fontSize: 9 }}>/{p.flags}</span>}
                                    </div>
                                    <code style={{ fontSize: 10, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{p.pattern}</code>
                                </div>
                            ))}
                            {(!config.patterns || config.patterns.length === 0) && <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>No patterns configured</span>}
                        </div>
                    </ConfigRow>
                )}

                {rt === 'output_format' && (
                    <>
                        <ConfigRow label="Require JSON">
                            <span className={`badge ${config.requireJson ? 'green' : 'gray'}`} style={{ fontSize: 10 }}>
                                {config.requireJson ? '✓ Required' : 'Not Required'}
                            </span>
                        </ConfigRow>
                        <ConfigRow label="Max Length">
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {config.maxLength ? `${config.maxLength.toLocaleString()} chars` : 'No limit'}
                            </span>
                        </ConfigRow>
                    </>
                )}

                {rt === 'llm_judge' && (
                    <ConfigRow label="Config">
                        <pre style={{ fontSize: 10, padding: 8, background: 'var(--bg-card)', borderRadius: 6, margin: 0, overflow: 'auto', maxHeight: 120 }}>
                            {JSON.stringify(config, null, 2)}
                        </pre>
                    </ConfigRow>
                )}

                {/* Raw JSON fallback for unknown types */}
                {!['content_filter', 'pii_shield', 'prompt_injection', 'topic_boundary', 'token_limit', 'custom_regex', 'output_format', 'llm_judge'].includes(rt) && (
                    <ConfigRow label="Raw Config">
                        <pre style={{ fontSize: 10, padding: 8, background: 'var(--bg-card)', borderRadius: 6, margin: 0, overflow: 'auto', maxHeight: 120 }}>
                            {JSON.stringify(config, null, 2)}
                        </pre>
                    </ConfigRow>
                )}
            </div>
        );
    };

    const formatDate = (ts) => ts ? new Date(ts).toLocaleString() : '—';

    const TABS = [
        { key: 'profiles', label: '🛡️ Profiles & Rules' },
        { key: 'assign', label: '🔗 Agent Assignments' },
        { key: 'tests', label: '🧪 Test Runner' },
    ];

    return (
        <div>
            {/* Stats Bar */}
            {stats && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <MetricCard icon={HiShieldExclamation} label="Profiles" value={stats.active_profiles || 0} sub={`${stats.total_profiles || 0} total`} color="var(--accent-primary)" />
                    <MetricCard icon={HiFunnel} label="Active Rules" value={stats.active_rules || 0} sub={`${stats.total_rules || 0} total`} color="var(--info)" />
                    <MetricCard icon={HiCpuChip} label="Protected Agents" value={stats.agents_with_guardrails || 0} color="var(--success)" />
                    <MetricCard icon={HiBeaker} label="Test Runs" value={stats.completed_test_runs || 0} sub={`${stats.total_test_runs || 0} total`} color="var(--warning)" />
                </div>
            )}

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

            {/* ========== TAB 1: PROFILES & RULES ========== */}
            {activeTab === 'profiles' && (
                <div style={{ display: 'grid', gridTemplateColumns: selectedProfile ? '1fr 1.5fr' : '1fr', gap: 16 }}>
                    {/* Profile List */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>Guardrail Profiles</h3>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm" onClick={loadData}><HiArrowPath /> Refresh</button>
                                <button className="btn btn-primary btn-sm" onClick={() => { setEditingProfile(null); setProfileForm({ name: '', description: '', mode: 'block' }); setShowProfileModal(true); }}>
                                    <HiPlus /> New Profile
                                </button>
                            </div>
                        </div>
                        {profiles.length === 0 ? (
                            <div className="card"><div className="empty-state"><div className="icon">🛡️</div><h4>No guardrail profiles</h4><p>Create a profile to define content safety rules for your agents</p></div></div>
                        ) : (
                            <div style={{ display: 'grid', gap: 8 }}>
                                {profiles.map(p => (
                                    <div key={p.id} className="card" onClick={() => loadProfile(p.id)}
                                        style={{
                                            padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s',
                                            border: selectedProfile?.id === p.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                                                    <span className={`badge ${p.mode === 'block' ? 'red' : 'yellow'}`} style={{ fontSize: 10 }}>
                                                        {p.mode === 'block' ? '🛑 Block' : '👁️ Log Only'}
                                                    </span>
                                                    {!p.is_active && <span className="badge gray" style={{ fontSize: 10 }}>Inactive</span>}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {p.rule_count || 0} rules • {p.agent_count || 0} agents
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setEditingProfile(p); setProfileForm({ name: p.name, description: p.description || '', mode: p.mode }); setShowProfileModal(true); }}><HiPencil /></button>
                                                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteProfile(p.id); }}><HiTrash /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Rule Detail Panel */}
                    {selectedProfile && (
                        <div>
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 16 }}>{selectedProfile.name}</h3>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {selectedProfile.description || 'No description'}
                                        </div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => {
                                        setRuleForm({ name: '', description: '', ruleType: 'content_filter', scope: 'both', severity: 'high', config: { keywords: [] } });
                                        setShowRuleModal(true);
                                    }}>
                                        <HiPlus /> Add Rule
                                    </button>
                                </div>

                                {/* Assigned Agents */}
                                {selectedProfile.assigned_agents?.length > 0 && (
                                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Assigned Agents</div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {selectedProfile.assigned_agents.map(a => (
                                                <span key={a.id} className="badge blue" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {a.name}
                                                    <HiXMark style={{ cursor: 'pointer', fontSize: 12 }} onClick={() => handleUnassign(a.id, selectedProfile.id).then(() => loadProfile(selectedProfile.id))} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rules List */}
                                {(!selectedProfile.rules || selectedProfile.rules.length === 0) ? (
                                    <div className="empty-state" style={{ padding: 24 }}>
                                        <div className="icon">📋</div>
                                        <h4>No rules yet</h4>
                                        <p>Add rules to define what this guardrail profile enforces</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {selectedProfile.rules.map(rule => {
                                            const rt = RULE_TYPES[rule.rule_type] || {};
                                            const isExpanded = expandedRuleId === rule.id;
                                            return (
                                                <div key={rule.id} style={{
                                                    padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)',
                                                    background: rule.is_enabled ? 'var(--bg-card)' : 'rgba(107,114,128,0.05)',
                                                    opacity: rule.is_enabled ? 1 : 0.6,
                                                    borderLeft: `4px solid ${SEVERITY_COLORS[rule.severity] || '#6b7280'}`,
                                                    transition: 'all 0.15s ease',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                                                         onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}>
                                                        <span style={{ fontSize: 20 }}>{rt.icon || '📋'}</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                                <span style={{ fontWeight: 600, fontSize: 13 }}>{rule.name}</span>
                                                                <span className={`badge ${rt.color || 'gray'}`} style={{ fontSize: 9 }}>{rt.label}</span>
                                                                <span className="badge gray" style={{ fontSize: 9 }}>{SCOPE_LABELS[rule.scope]}</span>
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {rule.description || rt.description} • {SEVERITY_LABELS[rule.severity]}
                                                            </div>
                                                        </div>
                                                        <button className="btn-icon" title="View rule details"
                                                            style={{ color: isExpanded ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'color 0.15s' }}>
                                                            <HiEye />
                                                        </button>
                                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}><HiTrash /></button>
                                                    </div>
                                                    {isExpanded && renderRuleConfigDetail(rule)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========== TAB 2: AGENT ASSIGNMENTS ========== */}
            {activeTab === 'assign' && (
                <div>
                    {/* Quick Assign Card */}
                    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}><HiLink style={{ verticalAlign: 'middle', marginRight: 4 }} /> Assign Guardrail to Agent</h3>
                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Agent</label>
                                <select className="form-select" value={assignAgentId} onChange={e => setAssignAgentId(e.target.value)}>
                                    <option value="">— Select Agent —</option>
                                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.protocol})</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Guardrail Profile</label>
                                <select className="form-select" value={assignProfileId} onChange={e => setAssignProfileId(e.target.value)}>
                                    <option value="">— Select Profile —</option>
                                    {profiles.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.mode})</option>)}
                                </select>
                            </div>
                            <button className="btn btn-primary" onClick={handleAssign} disabled={!assignAgentId || !assignProfileId}>
                                <HiLink /> Assign
                            </button>
                        </div>
                    </div>

                    {/* Assignment Table */}
                    <div className="card">
                        <div className="card-header"><h3>All Agents & Guardrails</h3></div>
                        <table className="data-table">
                            <thead>
                                <tr><th>Agent</th><th>Protocol</th><th>Health</th><th>Assigned Profiles</th><th>Mode</th><th></th></tr>
                            </thead>
                            <tbody>
                                {agents.map(a => {
                                    const assignedProfiles = profiles.filter(p =>
                                        (p.agent_count > 0) // Approximate — in production we'd query per-agent
                                    );
                                    return (
                                        <tr key={a.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{a.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.slug}</div>
                                            </td>
                                            <td><span className="badge blue" style={{ fontSize: 10 }}>{a.protocol?.toUpperCase()}</span></td>
                                            <td>
                                                <span className={`badge ${a.health_status === 'healthy' ? 'green' : a.health_status === 'unhealthy' ? 'red' : 'gray'}`} style={{ fontSize: 10 }}>
                                                    {a.health_status || 'unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                    Managed via Profiles tab
                                                </span>
                                            </td>
                                            <td>—</td>
                                            <td>
                                                <button className="btn-icon" onClick={() => { setAssignAgentId(a.id); }}><HiLink /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========== TAB 3: TEST RUNNER ========== */}
            {activeTab === 'tests' && (
                <div>
                    {/* Test Setup */}
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><h3>🧪 Guardrail Test Runner</h3></div>
                        <div style={{ padding: '16px 20px' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16 }}>
                                Test your guardrail rules with sample inputs. Each test case specifies an input and whether you expect the guardrail to <strong>pass</strong> (allow) or <strong>block</strong> (reject) it.
                            </p>

                            <div className="form-row" style={{ marginBottom: 16 }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Guardrail Profile</label>
                                    <select className="form-select" value={testProfileId} onChange={e => setTestProfileId(e.target.value)}>
                                        <option value="">— Select Profile —</option>
                                        {profiles.map(p => <option key={p.id} value={p.id}>{p.name} ({p.rule_count || 0} rules, {p.mode})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Test Cases Editor */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontWeight: 600 }}>Test Cases ({testCases.length})</label>
                                    <button className="btn btn-secondary btn-sm" onClick={addTestCase}><HiPlus /> Add Case</button>
                                </div>
                                {testCases.map((tc, i) => (
                                    <div key={i} style={{ padding: 12, marginBottom: 8, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <div style={{ flex: 3 }}>
                                                <input className="form-input" placeholder="Test description" value={tc.description}
                                                    onChange={e => updateTestCase(i, 'description', e.target.value)}
                                                    style={{ marginBottom: 6, fontSize: 12 }} />
                                                <textarea className="form-input" rows={2} placeholder="Input text to test against guardrails..."
                                                    value={tc.input} onChange={e => updateTestCase(i, 'input', e.target.value)}
                                                    style={{ fontSize: 12 }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110 }}>
                                                <select className="form-select" value={tc.expectedVerdict} onChange={e => updateTestCase(i, 'expectedVerdict', e.target.value)} style={{ fontSize: 12 }}>
                                                    <option value="block">🛑 Expect Block</option>
                                                    <option value="pass">✅ Expect Pass</option>
                                                </select>
                                                <select className="form-select" value={tc.direction} onChange={e => updateTestCase(i, 'direction', e.target.value)} style={{ fontSize: 12 }}>
                                                    <option value="input">→ Input</option>
                                                    <option value="output">← Output</option>
                                                </select>
                                                {testCases.length > 1 && (
                                                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: 'none', fontSize: 11 }}
                                                        onClick={() => removeTestCase(i)}><HiTrash /> Remove</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-primary" onClick={handleRunTests} disabled={testRunning || !testProfileId}
                                style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 15 }}>
                                <HiPlay style={{ fontSize: 18 }} />{testRunning ? 'Running Tests...' : '▶ Run Guardrail Tests'}
                            </button>
                        </div>
                    </div>

                    {/* Test Results */}
                    {testResult && !testResult.error && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* Score Overview */}
                            <div className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                                    <PassRateRing rate={parseFloat(testResult.passRate)} size={100} label="Pass Rate" />
                                    <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                        <MetricCard icon={HiCheckCircle} label="Passed" value={testResult.passedTests} color="var(--success)" />
                                        <MetricCard icon={HiXCircle} label="Failed" value={testResult.failedTests} color="var(--danger)" />
                                        <MetricCard icon={HiBeaker} label="Total Tests" value={testResult.totalTests} />
                                    </div>
                                </div>
                            </div>

                            {/* Per-Test Results */}
                            <div className="card">
                                <div className="card-header"><h3>Test Results</h3></div>
                                {(testResult.results || []).map((r, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                        onClick={() => setExpandedTest(expandedTest === i ? null : i)}>
                                        <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            {expandedTest === i ? <HiChevronDown style={{ color: 'var(--text-muted)' }} /> : <HiChevronRight style={{ color: 'var(--text-muted)' }} />}
                                            {r.passed
                                                ? <HiCheckCircle style={{ color: 'var(--success)', fontSize: 18 }} />
                                                : <HiXCircle style={{ color: 'var(--danger)', fontSize: 18 }} />
                                            }
                                            <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{r.description || `Test ${i + 1}`}</span>
                                            <span className="badge gray" style={{ fontSize: 10 }}>{SCOPE_LABELS[r.direction] || r.direction}</span>
                                            <span className={`badge ${r.expectedVerdict === 'block' ? 'red' : 'green'}`} style={{ fontSize: 10 }}>
                                                Expected: {r.expectedVerdict}
                                            </span>
                                            <span className={`badge ${r.actualVerdict === 'block' ? 'red' : 'green'}`} style={{ fontSize: 10 }}>
                                                Actual: {r.actualVerdict}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {r.violationCount} violation{r.violationCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        {expandedTest === i && (
                                            <div style={{ padding: '0 20px 16px 44px', display: 'grid', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Input</div>
                                                    <pre style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12, margin: 0, overflow: 'auto', maxHeight: 100 }}>{r.input}</pre>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Rule Results</div>
                                                    <div style={{ display: 'grid', gap: 4 }}>
                                                        {(r.ruleResults || []).map((rr, j) => (
                                                            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, fontSize: 12, background: rr.triggered ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)' }}>
                                                                {rr.triggered ? <HiExclamationTriangle style={{ color: 'var(--danger)' }} /> : <HiCheckCircle style={{ color: 'var(--success)' }} />}
                                                                <span style={{ fontWeight: 600, minWidth: 140 }}>{rr.ruleName}</span>
                                                                <span className={`badge ${RULE_TYPES[rr.ruleType]?.color || 'gray'}`} style={{ fontSize: 9 }}>{rr.ruleType}</span>
                                                                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{rr.details}</span>
                                                                <span style={{ fontSize: 10, color: SEVERITY_COLORS[rr.severity] }}>{rr.severity?.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {testResult?.error && (
                        <div className="card" style={{ border: '2px solid var(--danger)' }}>
                            <div className="empty-state"><div className="icon">❌</div><h4>Test Error</h4><p>{testResult.error}</p></div>
                        </div>
                    )}

                    {/* Test History */}
                    {testRuns.length > 0 && (
                        <div className="card" style={{ marginTop: 20 }}>
                            <div className="card-header"><h3>📊 Test Run History</h3></div>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Date</th><th>Profile</th><th>Agent</th><th>Tests</th><th>Pass Rate</th><th>Status</th></tr>
                                </thead>
                                <tbody>
                                    {testRuns.map(r => {
                                        const passRate = r.total_tests > 0 ? ((r.passed_tests / r.total_tests) * 100) : 0;
                                        return (
                                            <tr key={r.id}>
                                                <td style={{ fontSize: 13 }}>{formatDate(r.started_at)}</td>
                                                <td style={{ fontWeight: 600 }}>{r.profile_name}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.agent_name || '—'}</td>
                                                <td>
                                                    <span style={{ color: 'var(--success)' }}>{r.passed_tests}✓</span> / <span style={{ color: 'var(--danger)' }}>{r.failed_tests}✗</span> / {r.total_tests}
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 700, color: passRate >= 80 ? 'var(--success)' : passRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                                        {passRate.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td><span className={`badge ${r.status === 'completed' ? 'green' : 'gray'}`}>{r.status}</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ========== PROFILE MODAL ========== */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h3>{editingProfile ? 'Edit Profile' : 'Create Guardrail Profile'}</h3>
                            <button className="btn-icon" onClick={() => setShowProfileModal(false)}><HiXMark /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Profile Name</label>
                                <input className="form-input" value={profileForm.name}
                                    onChange={e => { setProfileForm({ ...profileForm, name: e.target.value }); setProfileNameError(''); }}
                                    placeholder="e.g., PII Protection Suite"
                                    style={profileNameError ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : {}} />
                                {profileNameError && (
                                    <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <HiExclamationTriangle style={{ fontSize: 14 }} /> {profileNameError}
                                    </div>
                                )}
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Description</label>
                                <input className="form-input" value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                                    placeholder="What does this guardrail profile protect against?" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label>Enforcement Mode</label>
                                <select className="form-select" value={profileForm.mode} onChange={e => setProfileForm({ ...profileForm, mode: e.target.value })}>
                                    <option value="block">🛑 Block — Reject violating requests (strict)</option>
                                    <option value="log_only">👁️ Log Only — Allow traffic, flag violations in audit</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={!profileForm.name.trim()}>
                                {editingProfile ? 'Update' : 'Create'} Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== RULE MODAL ========== */}
            {showRuleModal && (
                <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3>Add Guardrail Rule</h3>
                            <button className="btn-icon" onClick={() => setShowRuleModal(false)}><HiXMark /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Rule Name</label>
                                <input className="form-input" value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                                    placeholder="e.g., Block SSN Leakage" />
                            </div>
                            <div className="form-row" style={{ marginBottom: 12 }}>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label>Rule Type</label>
                                    <select className="form-select" value={ruleForm.ruleType}
                                        onChange={e => setRuleForm({ ...ruleForm, ruleType: e.target.value, config: {} })}>
                                        {Object.entries(RULE_TYPES).map(([key, rt]) => (
                                            <option key={key} value={key}>{rt.icon} {rt.label} — {rt.description}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row" style={{ marginBottom: 12 }}>
                                <div className="form-group">
                                    <label>Scope</label>
                                    <select className="form-select" value={ruleForm.scope} onChange={e => setRuleForm({ ...ruleForm, scope: e.target.value })}>
                                        <option value="both">↔ Both (input + output)</option>
                                        <option value="input">→ Input only</option>
                                        <option value="output">← Output only</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Severity</label>
                                    <select className="form-select" value={ruleForm.severity} onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}>
                                        <option value="critical">🔴 Critical</option>
                                        <option value="high">🟠 High</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="low">⚪ Low</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label>Description</label>
                                <input className="form-input" value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                                    placeholder="What does this rule check for?" />
                            </div>

                            {/* Type-specific config */}
                            <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                                    {RULE_TYPES[ruleForm.ruleType]?.icon} {RULE_TYPES[ruleForm.ruleType]?.label} Configuration
                                </div>
                                {renderConfigEditor()}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveRule} disabled={!ruleForm.name.trim()}>
                                Add Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
