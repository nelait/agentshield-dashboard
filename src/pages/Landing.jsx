import { useState, useRef } from 'react';
import { HiShieldCheck, HiServer, HiArrowsRightLeft, HiShieldExclamation, HiDocumentText, HiChartBar, HiCurrencyDollar, HiClipboardDocumentList, HiCodeBracket, HiSignal, HiArrowRight, HiCheckCircle, HiSparkles } from 'react-icons/hi2';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

const FEATURES = [
    { icon: HiServer, title: 'Agent Registry', desc: 'One catalog for every agent — REST, MCP, A2A, gRPC — across all vendors.', color: '#6366f1' },
    { icon: HiShieldCheck, title: 'Policy Engine', desc: 'Fine-grained access control with OPA/Rego. Role-based, resource-scoped, default-deny.', color: '#3b82f6' },
    { icon: HiShieldExclamation, title: 'Guardrails', desc: 'Protect every interaction — PII detection, prompt injection blocking, custom patterns.', color: '#f59e0b' },
    { icon: HiDocumentText, title: 'Compliance Engine', desc: 'SOX, HIPAA, GDPR, PCI-DSS — automated with NIST OSCAL catalog import/export.', color: '#22c55e' },
    { icon: HiChartBar, title: 'Agent Evaluation', desc: 'Three-layer assessment: Node, Session, System — with LLM-as-a-Judge & HITL review.', color: '#a855f7' },
    { icon: HiClipboardDocumentList, title: 'Immutable Audit Trail', desc: 'Every interaction, every decision, forever — append-only, compliance-grade logging.', color: '#ef4444' },
    { icon: HiCurrencyDollar, title: 'Cost Management', desc: 'Token & cost budgets per user, team, or agent — with real-time tracking & enforcement.', color: '#14b8a6' },
    { icon: HiArrowsRightLeft, title: 'Workflow Orchestration', desc: 'Chain agents into governed pipelines with per-step policies and guardrails.', color: '#ec4899' },
    { icon: HiCodeBracket, title: 'MCP Gateway', desc: 'Native Model Context Protocol support — proxy, tool discovery, Claude Desktop bridge.', color: '#f97316' },
    { icon: HiSignal, title: 'Observability', desc: 'OpenTelemetry-native tracing & metrics — end-to-end visibility across every agent call.', color: '#06b6d4' },
];

const STATS = [
    { value: '100%', label: 'Audit Coverage' },
    { value: '<50ms', label: 'Governance Overhead' },
    { value: '6+', label: 'Compliance Frameworks' },
    { value: '4', label: 'Protocol Support' },
];

const STEPS = [
    { num: '01', title: 'Register', desc: 'Add your AI agents to the registry — any protocol, any vendor, any deployment.' },
    { num: '02', title: 'Define', desc: 'Create policies, guardrails, budgets, and compliance configurations — no code changes.' },
    { num: '03', title: 'Monitor', desc: 'Every call is metered, audited, and evaluated — with real-time dashboards and alerts.' },
];

export default function Landing({ onSignIn }) {
    const [demoForm, setDemoForm] = useState({ name: '', email: '', company: '', role: '', message: '' });
    const [demoStatus, setDemoStatus] = useState('');
    const [demoError, setDemoError] = useState('');
    const demoRef = useRef(null);

    const scrollToDemo = () => {
        demoRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDemoSubmit = async (e) => {
        e.preventDefault();
        if (!demoForm.name || !demoForm.email) return;
        setDemoStatus('loading');
        setDemoError('');
        try {
            const res = await fetch(`${API_BASE}/public/demo-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(demoForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit');
            setDemoStatus('success');
            setDemoForm({ name: '', email: '', company: '', role: '', message: '' });
        } catch (err) {
            setDemoError(err.message);
            setDemoStatus('error');
        }
    };

    return (
        <div className="landing-page">
            {/* Navbar */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-logo">
                        <span className="landing-logo-icon">🛡️</span>
                        <div>
                            <span className="landing-logo-text">AI Sure</span>
                            <span className="landing-logo-sub">by AgentShield</span>
                        </div>
                    </div>
                    <div className="landing-nav-links">
                        <button className="landing-nav-link" onClick={scrollToDemo}>Request Demo</button>
                        <button className="btn btn-primary btn-sm" onClick={onSignIn} style={{ borderRadius: 8 }}>
                            Sign In <HiArrowRight />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-glow" />
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <HiSparkles /> Enterprise AI Governance Platform
                    </div>
                    <h1>Govern Your AI Agents.<br /><span className="gradient-text">Comply with Confidence.</span></h1>
                    <p className="landing-hero-sub">
                        AI Sure is the enterprise governance firewall for AI agents. Control access, enforce policies,
                        ensure compliance, and monitor every interaction — without touching a single line of agent code.
                    </p>
                    <div className="landing-hero-ctas">
                        <button className="btn btn-primary" onClick={scrollToDemo} style={{ borderRadius: 10, padding: '14px 28px', fontSize: 15 }}>
                            Request a Demo <HiArrowRight />
                        </button>
                        <button className="btn btn-secondary" onClick={onSignIn} style={{ borderRadius: 10, padding: '14px 28px', fontSize: 15 }}>
                            Sign In
                        </button>
                    </div>
                </div>
                <div className="landing-stats-bar">
                    {STATS.map(s => (
                        <div className="landing-stat" key={s.label}>
                            <div className="landing-stat-value">{s.value}</div>
                            <div className="landing-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Problem Section */}
            <section className="landing-section">
                <div className="landing-section-inner">
                    <h2 className="landing-section-title">The AI Agent <span className="gradient-text">Governance Gap</span></h2>
                    <p className="landing-section-sub">Enterprises deploy agents at an unprecedented pace — but governance has not kept up.</p>
                    <div className="landing-problems-grid">
                        <div className="landing-problem-card">
                            <div className="landing-problem-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>🔓</div>
                            <h3>No Unified Control Plane</h3>
                            <p>Agents scattered across vendors — OpenAI, Anthropic, Google, internal services. No single place to manage or control them.</p>
                        </div>
                        <div className="landing-problem-card">
                            <div className="landing-problem-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>📋</div>
                            <h3>Compliance Is Manual</h3>
                            <p>SOX auditors need proof. HIPAA requires PHI controls. Today you are stitching together spreadsheets and logs.</p>
                        </div>
                        <div className="landing-problem-card">
                            <div className="landing-problem-icon" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>🚨</div>
                            <h3>Blind Spots Everywhere</h3>
                            <p>Who called which agent? What data was sent? Was it authorized? Without audit trails, you are flying blind.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-section landing-section-dark">
                <div className="landing-section-inner">
                    <h2 className="landing-section-title">Everything You Need to <span className="gradient-text">Govern AI at Scale</span></h2>
                    <p className="landing-section-sub">A complete governance firewall — from agent registration to compliance reporting.</p>
                    <div className="landing-features-grid">
                        {FEATURES.map(f => (
                            <div className="landing-feature-card" key={f.title}>
                                <div className="landing-feature-icon" style={{ background: `${f.color}20`, color: f.color }}>
                                    <f.icon />
                                </div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="landing-section">
                <div className="landing-section-inner">
                    <h2 className="landing-section-title">How It <span className="gradient-text">Works</span></h2>
                    <p className="landing-section-sub">Three steps to full AI governance — deploy in minutes, not months.</p>
                    <div className="landing-steps-grid">
                        {STEPS.map(s => (
                            <div className="landing-step-card" key={s.num}>
                                <div className="landing-step-num">{s.num}</div>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Compliance Frameworks */}
            <section className="landing-section landing-section-dark">
                <div className="landing-section-inner" style={{ textAlign: 'center' }}>
                    <h2 className="landing-section-title">Built for <span className="gradient-text">Regulated Industries</span></h2>
                    <p className="landing-section-sub">Automated compliance testing and reporting across major regulatory frameworks.</p>
                    <div className="landing-frameworks">
                        {['SOX', 'HIPAA', 'GDPR', 'PCI-DSS', 'NIST 800-53', 'FedRAMP'].map(fw => (
                            <div className="landing-framework-badge" key={fw}>
                                <HiCheckCircle /> {fw}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Request Demo */}
            <section className="landing-section" ref={demoRef} id="request-demo">
                <div className="landing-section-inner">
                    <div className="landing-demo-container">
                        <div className="landing-demo-info">
                            <h2>Ready to <span className="gradient-text">Govern Your AI?</span></h2>
                            <p>Get a personalized demo of AI Sure for your organization. See how enterprise governance works with your existing AI stack.</p>
                            <ul className="landing-demo-benefits">
                                <li><HiCheckCircle className="check-icon" /> 30-minute personalized walkthrough</li>
                                <li><HiCheckCircle className="check-icon" /> See governance in action with your use cases</li>
                                <li><HiCheckCircle className="check-icon" /> Compliance framework mapping for your industry</li>
                                <li><HiCheckCircle className="check-icon" /> No commitment required</li>
                            </ul>
                        </div>
                        <div className="landing-demo-form-wrap">
                            {demoStatus === 'success' ? (
                                <div className="landing-demo-success">
                                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                                    <h3>Thank you!</h3>
                                    <p>Your demo request has been submitted. We will be in touch within 24 hours.</p>
                                    <button className="btn btn-secondary" onClick={() => setDemoStatus('')} style={{ marginTop: 16, borderRadius: 8 }}>
                                        Submit Another
                                    </button>
                                </div>
                            ) : (
                                <form className="landing-demo-form" onSubmit={handleDemoSubmit}>
                                    <h3>Request a Demo</h3>
                                    {demoError && <div className="login-error">{demoError}</div>}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Name *</label>
                                            <input className="form-input" value={demoForm.name}
                                                onChange={e => setDemoForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Jane Doe" required />
                                        </div>
                                        <div className="form-group">
                                            <label>Work Email *</label>
                                            <input className="form-input" type="email" value={demoForm.email}
                                                onChange={e => setDemoForm(f => ({ ...f, email: e.target.value }))}
                                                placeholder="jane@company.com" required />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Company</label>
                                            <input className="form-input" value={demoForm.company}
                                                onChange={e => setDemoForm(f => ({ ...f, company: e.target.value }))}
                                                placeholder="Acme Corp" />
                                        </div>
                                        <div className="form-group">
                                            <label>Role</label>
                                            <input className="form-input" value={demoForm.role}
                                                onChange={e => setDemoForm(f => ({ ...f, role: e.target.value }))}
                                                placeholder="CTO, VP Engineering, etc." />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Tell us about your use case</label>
                                        <textarea className="form-textarea" value={demoForm.message}
                                            onChange={e => setDemoForm(f => ({ ...f, message: e.target.value }))}
                                            placeholder="What AI agents are you deploying? What governance challenges are you facing?"
                                            rows={3} />
                                    </div>
                                    <button className="btn btn-primary" type="submit" disabled={demoStatus === 'loading'}
                                        style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '14px 24px', fontSize: 15 }}>
                                        {demoStatus === 'loading' ? 'Submitting...' : 'Request Demo'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-footer-inner">
                    <div className="landing-footer-brand">
                        <span>🛡️</span>
                        <span className="gradient-text" style={{ fontWeight: 700, fontSize: 16 }}>AI Sure</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>by AgentShield</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        &copy; {new Date().getFullYear()} AI Sure. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
