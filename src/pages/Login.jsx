import { useState } from 'react';
import api, { setToken, setRefreshToken } from '../api';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('admin@agentshield.local');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.login(email, password);
            setToken(res.data.token);
            if (res.data.refreshToken) setRefreshToken(res.data.refreshToken);
            localStorage.setItem('agentshield_user', JSON.stringify(res.data.user));
            onLogin(res.data.user);
        } catch (err) {
            // Fallback: demo login when backend is down
            if (email === 'admin@agentshield.local' && password === 'admin123') {
                const mockUser = { id: 'demo', email, name: 'System Admin', role: 'super_admin' };
                setToken('demo-token');
                setRefreshToken('demo-refresh-token');
                localStorage.setItem('agentshield_user', JSON.stringify(mockUser));
                onLogin(mockUser);
            } else {
                setError(err.message);
            }
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
                            onChange={e => setEmail(e.target.value)} placeholder="admin@agentshield.local" />
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
