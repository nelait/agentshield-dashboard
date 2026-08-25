import { useState, useEffect } from 'react';
import { HiLockClosed, HiBookOpen, HiArrowRight, HiArrowLeft } from 'react-icons/hi2';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';
const DOCS_BASE = '/docs/site/index.html';

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

    // ─── Documentation Viewer (iframe to static HTML site) ───
    return (
        <div className="doc-viewer-page">
            <div className="doc-viewer-topbar">
                <button className="doc-viewer-back" onClick={onBack}>
                    <HiArrowLeft /> Home
                </button>
                <div className="doc-viewer-brand">
                    <span>🛡️</span>
                    <span>AI Sure Documentation</span>
                </div>
                <button className="doc-viewer-logout" onClick={handleLogout}>
                    Sign Out
                </button>
            </div>
            <iframe
                src={DOCS_BASE}
                className="doc-viewer-iframe"
                title="AI Sure Documentation"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        </div>
    );
}
