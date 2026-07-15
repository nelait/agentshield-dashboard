import { useState } from 'react';
import api, { setToken, setRefreshToken } from '../api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await api.login(email, password);
            setToken(res.data.token);
            if (res.data.refreshToken) setRefreshToken(res.data.refreshToken);
            localStorage.setItem('agentshield_user', JSON.stringify(res.data.user));
            onLogin(res.data.user);
        } catch (err) {
            setError(err.message || 'Invalid email or password');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">🛡️</div>
                <h2>AgentShield</h2>
                <p className="subtitle">Agent Governance Firewall</p>
                {error && <div className="login-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" value={email}
                            onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="form-input" type="password" value={password}
                            onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
                        disabled={loading} type="submit">
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
