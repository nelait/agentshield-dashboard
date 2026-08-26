import { useState } from 'react';
import { HiLockClosed, HiBookOpen, HiArrowRight, HiArrowLeft, HiShieldCheck } from 'react-icons/hi2';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

const PRODUCTS = [
    {
        id: 'agentshield',
        name: 'AgentShield',
        tagline: 'AI Agent Governance Firewall',
        desc: 'Centralized policy enforcement, compliance automation, and complete observability across your entire AI agent fleet.',
        icon: '🛡️',
        color: '#6366f1',
        gradient: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
        border: 'rgba(99,102,241,0.3)',
        docsPath: '/docs/site/index.html',
    },
    {
        id: 'grcstudio',
        name: 'GRC Studio',
        tagline: 'Governance, Risk & Compliance Platform',
        desc: 'Automated policy pipelines, regulatory compliance portals, and risk management for enterprise AI governance.',
        icon: '⚖️',
        color: '#10b981',
        gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
        border: 'rgba(16,185,129,0.3)',
        docsPath: '/docs/sitegrc/index.html',
    },
];

export default function Documentation({ onBack }) {
    const [authenticated, setAuthenticated] = useState(() => {
        const stored = sessionStorage.getItem('doc_token');
        const expiry = sessionStorage.getItem('doc_token_exp');
        if (stored && expiry && Date.now() < parseInt(expiry)) return true;
        sessionStorage.removeItem('doc_token');
        sessionStorage.removeItem('doc_token_exp');
        return false;
    });
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    // Access request form
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [reqForm, setReqForm] = useState({ name: '', email: '', company: '', role: '', reason: '' });
    const [reqStatus, setReqStatus] = useState('');
    const [reqError, setReqError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!passcode.trim()) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/public/docs/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: passcode.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid passcode');
            sessionStorage.setItem('doc_token', data.data.token);
            sessionStorage.setItem('doc_token_exp', String(Date.now() + 24 * 60 * 60 * 1000));
            setAuthenticated(true);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleRequestAccess = async (e) => {
        e.preventDefault();
        if (!reqForm.name || !reqForm.email) return;
        setReqStatus('loading');
        setReqError('');
        try {
            const res = await fetch(`${API_BASE}/public/doc-access-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit');
            setReqStatus('success');
            setReqForm({ name: '', email: '', company: '', role: '', reason: '' });
        } catch (err) {
            setReqError(err.message);
            setReqStatus('error');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('doc_token');
        sessionStorage.removeItem('doc_token_exp');
        setAuthenticated(false);
        setSelectedProduct(null);
        setPasscode('');
    };

    // ─── Passcode Gate ───
    if (!authenticated) {
        return (
            <div className="doc-gate-page">
                <nav className="landing-nav">
                    <div className="landing-nav-inner">
                        <div className="landing-logo">
                            <span className="landing-logo-icon">🛡️</span>
                            <div>
                                <span className="landing-logo-text">AI Sure</span>
                                <span className="landing-logo-sub">Documentation</span>
                            </div>
                        </div>
                        <button className="landing-nav-link" onClick={onBack}>← Back to Home</button>
                    </div>
                </nav>

                <div className="doc-gate-container">
                    <div className="doc-gate-card">
                        {showRequestForm ? (
                            reqStatus === 'success' ? (
                                <div className="landing-demo-success">
                                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                                    <h3>Request Submitted!</h3>
                                    <p>We'll review your request and send you a documentation passcode within 24 hours.</p>
                                    <button className="btn btn-secondary" onClick={() => { setShowRequestForm(false); setReqStatus(''); }} style={{ marginTop: 16, borderRadius: 8 }}>
                                        Back to Passcode Entry
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleRequestAccess}>
                                    <button type="button" className="login-back-link" onClick={() => setShowRequestForm(false)}>
                                        <HiArrowLeft /> Back to passcode
                                    </button>
                                    <h3 style={{ marginBottom: 4 }}>Request Documentation Access</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Fill in your details and we'll send you a passcode.</p>
                                    {reqError && <div className="login-error">{reqError}</div>}
                                    <div className="form-row">
                                        <div className="form-group"><label>Name *</label><input className="form-input" value={reqForm.name} onChange={e => setReqForm(f => ({ ...f, name: e.target.value }))} required placeholder="Jane Doe" /></div>
                                        <div className="form-group"><label>Work Email *</label><input className="form-input" type="email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} required placeholder="jane@company.com" /></div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group"><label>Company</label><input className="form-input" value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" /></div>
                                        <div className="form-group"><label>Role</label><input className="form-input" value={reqForm.role} onChange={e => setReqForm(f => ({ ...f, role: e.target.value }))} placeholder="CTO, Engineer, etc." /></div>
                                    </div>
                                    <div className="form-group"><label>Why do you need access?</label><textarea className="form-textarea" value={reqForm.reason} onChange={e => setReqForm(f => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Tell us about your use case..." /></div>
                                    <button className="btn btn-primary" type="submit" disabled={reqStatus === 'loading'} style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '12px' }}>
                                        {reqStatus === 'loading' ? 'Submitting...' : 'Request Access'}
                                    </button>
                                </form>
                            )
                        ) : (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}><HiBookOpen /></div>
                                    <h2 style={{ marginBottom: 4 }}>Documentation Access</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Enter your passcode to access AI Sure documentation.</p>
                                </div>
                                {error && <div className="login-error">{error}</div>}
                                <form onSubmit={handleVerify}>
                                    <div className="form-group">
                                        <label>Passcode</label>
                                        <div style={{ position: 'relative' }}>
                                            <HiLockClosed style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                            <input className="form-input" type="password" value={passcode}
                                                onChange={e => setPasscode(e.target.value)}
                                                placeholder="Enter your documentation passcode"
                                                style={{ paddingLeft: 36 }} autoFocus />
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" type="submit" disabled={loading}
                                        style={{ width: '100%', justifyContent: 'center', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
                                        {loading ? 'Verifying...' : 'Access Documentation'} <HiArrowRight />
                                    </button>
                                </form>
                                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>Don't have a passcode?</p>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowRequestForm(true)} style={{ borderRadius: 8 }}>
                                        Request Documentation Access
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Product Selector ───
    if (!selectedProduct) {
        return (
            <div className="doc-gate-page">
                <nav className="landing-nav">
                    <div className="landing-nav-inner">
                        <div className="landing-logo">
                            <span className="landing-logo-icon">🛡️</span>
                            <div>
                                <span className="landing-logo-text">AI Sure</span>
                                <span className="landing-logo-sub">Documentation</span>
                            </div>
                        </div>
                        <div className="landing-nav-links">
                            <button className="landing-nav-link" onClick={onBack}>← Home</button>
                            <button className="landing-nav-link" onClick={handleLogout} style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sign Out</button>
                        </div>
                    </div>
                </nav>

                <div className="doc-selector-container">
                    <div className="doc-selector-header">
                        <h2>Choose a Product</h2>
                        <p>Select the documentation you'd like to explore.</p>
                    </div>
                    <div className="doc-selector-grid">
                        {PRODUCTS.map(product => (
                            <button
                                key={product.id}
                                className="doc-product-card"
                                onClick={() => setSelectedProduct(product)}
                                style={{
                                    '--card-gradient': product.gradient,
                                    '--card-border': product.border,
                                    '--card-accent': product.color,
                                }}
                            >
                                <div className="doc-product-icon">{product.icon}</div>
                                <h3 className="doc-product-name">{product.name}</h3>
                                <p className="doc-product-tagline">{product.tagline}</p>
                                <p className="doc-product-desc">{product.desc}</p>
                                <span className="doc-product-cta">
                                    View Documentation <HiArrowRight />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Documentation Viewer (iframe) ───
    return (
        <div className="doc-viewer-page">
            <div className="doc-viewer-topbar">
                <button className="doc-viewer-back" onClick={() => setSelectedProduct(null)}>
                    <HiArrowLeft /> All Docs
                </button>
                <div className="doc-viewer-brand">
                    <span>{selectedProduct.icon}</span>
                    <span>{selectedProduct.name} Documentation</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="doc-viewer-back" onClick={onBack}>Home</button>
                    <button className="doc-viewer-logout" onClick={handleLogout}>Sign Out</button>
                </div>
            </div>
            <iframe
                src={selectedProduct.docsPath}
                className="doc-viewer-iframe"
                title={`${selectedProduct.name} Documentation`}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        </div>
    );
}
