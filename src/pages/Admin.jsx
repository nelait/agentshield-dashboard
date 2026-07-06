import { useState, useEffect, useCallback } from 'react';
import {
    HiUsers, HiEnvelope, HiShieldCheck, HiClock, HiCpuChip,
    HiPlus, HiPencil, HiTrash, HiArrowPath, HiLockClosed, HiLockOpen,
    HiCheckCircle, HiXCircle, HiKey, HiXMark, HiEye, HiClipboard,
    HiExclamationTriangle, HiCheck, HiArrowRightOnRectangle,
} from 'react-icons/hi2';
import api from '../api';

// ============================================
// TAB DEFINITIONS
// ============================================
const TABS = [
    { key: 'users', label: 'Users', icon: HiUsers },
    { key: 'invitations', label: 'Invitations', icon: HiEnvelope },
    { key: 'roles', label: 'Roles & Permissions', icon: HiShieldCheck },
    { key: 'activity', label: 'Login Activity', icon: HiClock },
    { key: 'system', label: 'System', icon: HiCpuChip },
];

const ROLE_COLORS = {
    super_admin: { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: 'Super Admin' },
    admin: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Admin' },
    editor: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Editor' },
    viewer: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Viewer' },
};

const STATUS_COLORS = {
    success: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    failed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    locked: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function Admin() {
    const [activeTab, setActiveTab] = useState('users');

    return (
        <div>
            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-raised)', padding: '6px', borderRadius: 12, marginBottom: 24 }}>
                {TABS.map(tab => (
                    <button key={tab.key}
                        className={`btn ${activeTab === tab.key ? 'btn-primary' : ''}`}
                        style={{ flex: 1, justifyContent: 'center', gap: 8, borderRadius: 8, fontSize: 13, padding: '10px 16px', background: activeTab === tab.key ? undefined : 'transparent', border: 'none', color: activeTab === tab.key ? undefined : 'var(--text-secondary)' }}
                        onClick={() => setActiveTab(tab.key)}>
                        <tab.icon style={{ fontSize: 16 }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'invitations' && <InvitationsTab />}
            {activeTab === 'roles' && <RolesTab />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'system' && <SystemTab />}
        </div>
    );
}

// ============================================
// USERS TAB
// ============================================
function UsersTab() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [resetResult, setResetResult] = useState(null);
    const [viewUser, setViewUser] = useState(null);
    const [pagination, setPagination] = useState({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            const res = await api.listAdminUsers(params);
            setUsers(res.data || []);
            setPagination(res.pagination || {});
        } catch (err) { console.error('Failed to fetch users:', err); }
        setLoading(false);
    }, [search, roleFilter, statusFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggle = async (user) => {
        if (!confirm(`${user.is_active ? 'Deactivate' : 'Activate'} ${user.name || user.email}?`)) return;
        try {
            await api.toggleAdminUser(user.id);
            fetchUsers();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Delete ${user.name || user.email}? This action cannot be undone.`)) return;
        try {
            await api.deleteAdminUser(user.id);
            fetchUsers();
        } catch (err) { alert(err.message); }
    };

    const handleResetPassword = async (user) => {
        if (!confirm(`Reset password for ${user.name || user.email}?`)) return;
        try {
            const res = await api.resetAdminUserPassword(user.id);
            setResetResult(res.data);
        } catch (err) { alert(err.message); }
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const getUserStatus = (user) => {
        if (user.locked_until && new Date(user.locked_until) > new Date()) return { label: 'Locked', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
        if (!user.is_active) return { label: 'Inactive', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
        return { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="form-input" placeholder="Search by name or email..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }} />
                <select className="form-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 140 }}>
                    <option value="">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                </select>
                <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 140 }}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="locked">Locked</option>
                </select>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <HiPlus /> Add User
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Users', value: pagination.total || users.length, color: '#6366f1' },
                    { label: 'Active', value: users.filter(u => u.is_active).length, color: '#10b981' },
                    { label: 'Inactive', value: users.filter(u => !u.is_active).length, color: '#ef4444' },
                    { label: 'Locked', value: users.filter(u => u.locked_until && new Date(u.locked_until) > new Date()).length, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* User Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading users...</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table className="io-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>User</th>
                                <th style={thStyle}>Role</th>
                                <th style={thStyle}>Department</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Last Login</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const status = getUserStatus(user);
                                const roleInfo = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;
                                return (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: roleInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: roleInfo.color, flexShrink: 0 }}>
                                                    {(user.name || user.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{user.name || '—'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: roleInfo.bg, color: roleInfo.color }}>
                                                {roleInfo.label}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.department || '—'}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: status.bg, color: status.color }}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td style={tdStyle}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(user.last_login_at)}</span>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                <button className="btn-icon" title="View" onClick={() => setViewUser(user)}><HiEye /></button>
                                                <button className="btn-icon" title="Edit" onClick={() => setEditUser(user)}><HiPencil /></button>
                                                <button className="btn-icon" title="Reset Password" onClick={() => handleResetPassword(user)}><HiKey /></button>
                                                {user.role !== 'super_admin' && (
                                                    <>
                                                        <button className="btn-icon" title={user.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(user)}>
                                                            {user.is_active ? <HiLockClosed /> : <HiLockOpen />}
                                                        </button>
                                                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(user)} style={{ color: '#ef4444' }}><HiTrash /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {users.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No users found</div>}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || editUser) && (
                <UserFormModal
                    user={editUser}
                    onClose={() => { setShowCreateModal(false); setEditUser(null); }}
                    onSaved={() => { setShowCreateModal(false); setEditUser(null); fetchUsers(); }}
                />
            )}

            {/* Reset Password Result */}
            {resetResult && (
                <Modal title="🔑 Password Reset" onClose={() => setResetResult(null)}>
                    <div style={{ textAlign: 'center', padding: 20 }}>
                        <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Temporary password for <strong>{resetResult.email}</strong>:</p>
                        <div style={{ background: 'var(--surface-raised)', padding: '16px 24px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                            {resetResult.temporaryPassword}
                            <button className="btn-icon" onClick={() => { navigator.clipboard.writeText(resetResult.temporaryPassword); }} title="Copy"><HiClipboard /></button>
                        </div>
                        <p style={{ fontSize: 12, color: '#f59e0b' }}>⚠️ This password is shown only once. The user should change it immediately.</p>
                    </div>
                </Modal>
            )}

            {/* View User Detail */}
            {viewUser && <UserDetailModal userId={viewUser.id} onClose={() => setViewUser(null)} />}
        </div>
    );
}

// ============================================
// USER FORM MODAL (Create / Edit)
// ============================================
function UserFormModal({ user, onClose, onSaved }) {
    const isEdit = !!user;
    const [form, setForm] = useState({
        email: user?.email || '',
        name: user?.name || '',
        password: '',
        role: user?.role || 'viewer',
        department: user?.department || '',
        phone: user?.phone || '',
        timezone: user?.timezone || 'UTC',
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            if (isEdit) {
                await api.updateAdminUser(user.id, {
                    name: form.name,
                    role: form.role,
                    department: form.department || null,
                    phone: form.phone || null,
                    timezone: form.timezone,
                });
            } else {
                await api.createAdminUser(form);
            }
            onSaved();
        } catch (err) {
            setError(err.message || 'Failed to save');
        }
        setSaving(false);
    };

    return (
        <Modal title={isEdit ? '✏️ Edit User' : '➕ Create User'} onClose={onClose} width={520}>
            <form onSubmit={handleSubmit}>
                {error && <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
                {!isEdit && (
                    <>
                        <FormField label="Email" required>
                            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </FormField>
                        <FormField label="Password" required hint="Min 8 chars, 1 uppercase, 1 number">
                            <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </FormField>
                    </>
                )}
                <FormField label="Full Name" required>
                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormField label="Role">
                        <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </FormField>
                    <FormField label="Department">
                        <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g., Engineering" />
                    </FormField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormField label="Phone">
                        <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0100" />
                    </FormField>
                    <FormField label="Timezone">
                        <select className="form-input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                            {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'].map(tz => (
                                <option key={tz} value={tz}>{tz}</option>
                            ))}
                        </select>
                    </FormField>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}</button>
                </div>
            </form>
        </Modal>
    );
}

// ============================================
// USER DETAIL MODAL
// ============================================
function UserDetailModal({ userId, onClose }) {
    const [user, setUser] = useState(null);
    const [loginHistory, setLoginHistory] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('info');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [userRes, historyRes, sessionsRes] = await Promise.all([
                    api.getAdminUser(userId),
                    api.getUserLoginHistory(userId),
                    api.getUserSessions(userId),
                ]);
                setUser(userRes.data);
                setLoginHistory(historyRes.data || []);
                setSessions(sessionsRes.data || []);
            } catch (err) { console.error(err); }
            setLoading(false);
        })();
    }, [userId]);

    if (loading) return <Modal title="Loading..." onClose={onClose}><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading user details...</div></Modal>;
    if (!user) return null;

    const roleInfo = ROLE_COLORS[user.role] || ROLE_COLORS.viewer;

    return (
        <Modal title={`👤 ${user.name || user.email}`} onClose={onClose} width={680}>
            {/* Section tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[{ key: 'info', label: 'Profile' }, { key: 'logins', label: `Login History (${loginHistory.length})` }, { key: 'sessions', label: `Sessions (${sessions.length})` }].map(s => (
                    <button key={s.key} className="btn" style={{ fontSize: 12, background: activeSection === s.key ? 'var(--accent-glow)' : undefined, color: activeSection === s.key ? 'var(--accent-primary)' : undefined }} onClick={() => setActiveSection(s.key)}>
                        {s.label}
                    </button>
                ))}
            </div>

            {activeSection === 'info' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <InfoRow label="Email" value={user.email} />
                    <InfoRow label="Role" value={<span style={{ padding: '2px 10px', borderRadius: 6, background: roleInfo.bg, color: roleInfo.color, fontWeight: 600, fontSize: 12 }}>{roleInfo.label}</span>} />
                    <InfoRow label="Department" value={user.department || '—'} />
                    <InfoRow label="Phone" value={user.phone || '—'} />
                    <InfoRow label="Timezone" value={user.timezone || 'UTC'} />
                    <InfoRow label="Status" value={user.is_active ? '✅ Active' : '❌ Inactive'} />
                    <InfoRow label="Created" value={new Date(user.created_at).toLocaleDateString()} />
                    <InfoRow label="Last Login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'} />
                    <InfoRow label="Successful Logins" value={user.login_stats?.successful_logins || 0} />
                    <InfoRow label="Failed Logins" value={user.login_stats?.failed_logins || 0} />
                    <InfoRow label="Active Sessions" value={user.active_sessions || 0} />
                    <InfoRow label="Password Changed" value={user.password_changed_at ? new Date(user.password_changed_at).toLocaleDateString() : '—'} />
                </div>
            )}

            {activeSection === 'logins' && (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {loginHistory.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No login history</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr>{['Status', 'IP Address', 'Device', 'Time', 'Reason'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                            <tbody>
                                {loginHistory.map(h => {
                                    const sc = STATUS_COLORS[h.status] || STATUS_COLORS.failed;
                                    return (
                                        <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }}>{h.status}</span></td>
                                            <td style={tdStyle}>{h.ip_address || '—'}</td>
                                            <td style={tdStyle}>{h.user_agent ? h.user_agent.substring(0, 40) + '...' : '—'}</td>
                                            <td style={tdStyle}>{new Date(h.created_at).toLocaleString()}</td>
                                            <td style={tdStyle}>{h.failure_reason || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeSection === 'sessions' && (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {sessions.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No active sessions</div> : (
                        sessions.map(s => (
                            <div key={s.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.device_label || 'Unknown Device'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            IP: {s.ip_address || '—'} · Last activity: {new Date(s.last_activity).toLocaleString()} · Expires: {new Date(s.expires_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Active</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </Modal>
    );
}

// ============================================
// INVITATIONS TAB
// ============================================
function InvitationsTab() {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchInvites = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.listInvitations();
            setInvites(res.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    const handleRevoke = async (invite) => {
        if (!confirm(`Revoke invitation for ${invite.email}?`)) return;
        try {
            await api.revokeInvitation(invite.id);
            fetchInvites();
        } catch (err) { alert(err.message); }
    };

    const statusStyle = (status) => {
        const map = { pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' }, accepted: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' }, expired: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }, revoked: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' } };
        return map[status] || map.expired;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{invites.filter(i => i.status === 'pending').length} pending · {invites.filter(i => i.status === 'accepted').length} accepted</span>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}><HiEnvelope /> Send Invitation</button>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div> : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['Email', 'Role', 'Status', 'Invited By', 'Expires', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                        <tbody>
                            {invites.map(inv => {
                                const ss = statusStyle(inv.status);
                                const roleInfo = ROLE_COLORS[inv.role] || ROLE_COLORS.viewer;
                                return (
                                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}><span style={{ fontWeight: 600, fontSize: 13 }}>{inv.email}</span></td>
                                        <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: roleInfo.bg, color: roleInfo.color }}>{roleInfo.label}</span></td>
                                        <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>{inv.status}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{inv.invited_by_name || '—'}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(inv.expires_at).toLocaleDateString()}</span></td>
                                        <td style={tdStyle}>
                                            {inv.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn-icon" title="Copy invite link" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`); }}><HiClipboard /></button>
                                                    <button className="btn-icon" title="Revoke" onClick={() => handleRevoke(inv)} style={{ color: '#ef4444' }}><HiXMark /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {invites.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No invitations yet</div>}
                </div>
            )}

            {showCreateModal && (
                <InviteFormModal onClose={() => setShowCreateModal(false)} onSaved={() => { setShowCreateModal(false); fetchInvites(); }} />
            )}
        </div>
    );
}

// Invite form modal
function InviteFormModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ email: '', role: 'viewer', department: '' });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const res = await api.createInvitation(form);
            setResult(res.data);
        } catch (err) { setError(err.message); }
        setSaving(false);
    };

    if (result) {
        const link = `${window.location.origin}/invite/${result.token}`;
        return (
            <Modal title="📨 Invitation Sent!" onClose={() => { onClose(); onSaved(); }}>
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <p style={{ marginBottom: 16 }}>Invitation sent to <strong>{result.email}</strong></p>
                    <div style={{ background: 'var(--surface-raised)', padding: '12px 16px', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', marginBottom: 12 }}>{link}</div>
                    <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(link)}><HiClipboard /> Copy Link</button>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>Expires: {new Date(result.expires_at).toLocaleDateString()}</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal title="📨 Send Invitation" onClose={onClose} width={440}>
            <form onSubmit={handleSubmit}>
                {error && <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
                <FormField label="Email Address" required>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </FormField>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FormField label="Role">
                        <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </FormField>
                    <FormField label="Department">
                        <input className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                    </FormField>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Sending...' : 'Send Invitation'}</button>
                </div>
            </form>
        </Modal>
    );
}

// ============================================
// ROLES & PERMISSIONS TAB (Reference Only)
// ============================================
function RolesTab() {
    const PERMISSIONS = [
        { action: 'View dashboard & observability', super_admin: true, admin: true, editor: true, viewer: true },
        { action: 'View agents, policies, workflows', super_admin: true, admin: true, editor: true, viewer: true },
        { action: 'View audit log & reports', super_admin: true, admin: true, editor: true, viewer: true },
        { action: 'Run policy playground tests', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Create / edit agents', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Create / edit policies', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Create / edit workflows', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Create / edit guardrail profiles', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Run compliance checks', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Run evaluation suites', super_admin: true, admin: true, editor: true, viewer: false },
        { action: 'Delete agents, policies, workflows', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Manage compliance configs', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Manage budgets & cost settings', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Manage users & invitations', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Manage API keys', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Reset user passwords', super_admin: true, admin: true, editor: false, viewer: false },
        { action: 'Module toggles (enable/disable)', super_admin: true, admin: false, editor: false, viewer: false },
        { action: 'LLM connection settings', super_admin: true, admin: false, editor: false, viewer: false },
        { action: 'System statistics & diagnostics', super_admin: true, admin: false, editor: false, viewer: false },
    ];

    return (
        <div>
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Role Hierarchy</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    AgentShield uses a hierarchical role model. Higher roles inherit all permissions from lower roles.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {['super_admin', 'admin', 'editor', 'viewer'].map((role, i) => {
                        const ri = ROLE_COLORS[role];
                        return (
                            <span key={role}>
                                <span style={{ padding: '6px 16px', borderRadius: 8, background: ri.bg, color: ri.color, fontWeight: 700, fontSize: 13 }}>{ri.label}</span>
                                {i < 3 && <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>→</span>}
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Permission</th>
                            {['super_admin', 'admin', 'editor', 'viewer'].map(r => {
                                const ri = ROLE_COLORS[r];
                                return <th key={r} style={{ ...thStyle, textAlign: 'center' }}><span style={{ color: ri.color }}>{ri.label}</span></th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSIONS.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ ...tdStyle, fontSize: 13 }}>{p.action}</td>
                                {['super_admin', 'admin', 'editor', 'viewer'].map(role => (
                                    <td key={role} style={{ ...tdStyle, textAlign: 'center' }}>
                                        {p[role] ? <HiCheckCircle style={{ color: '#10b981', fontSize: 18 }} /> : <HiXCircle style={{ color: '#374151', fontSize: 18 }} />}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================
// LOGIN ACTIVITY TAB
// ============================================
function ActivityTab() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [pagination, setPagination] = useState({});

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const res = await api.getLoginHistory(params);
            setHistory(res.data || []);
            setPagination(res.pagination || {});
        } catch (err) { console.error(err); }
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['', 'success', 'failed', 'locked'].map(s => (
                        <button key={s} className="btn" onClick={() => setStatusFilter(s)}
                            style={{ fontSize: 12, background: statusFilter === s ? 'var(--accent-glow)' : undefined, color: statusFilter === s ? 'var(--accent-primary)' : undefined }}>
                            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn" onClick={fetchHistory}><HiArrowPath /> Refresh</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Attempts', value: pagination.total || history.length, color: '#6366f1' },
                    { label: 'Successful', value: history.filter(h => h.status === 'success').length, color: '#10b981' },
                    { label: 'Failed / Locked', value: history.filter(h => h.status !== 'success').length, color: '#ef4444' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div> : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['User', 'Status', 'IP Address', 'Device', 'Time', 'Reason'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                        <tbody>
                            {history.map(h => {
                                const sc = STATUS_COLORS[h.status] || STATUS_COLORS.failed;
                                return (
                                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{h.user_name || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.email}</div>
                                        </td>
                                        <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600, fontSize: 11 }}>{h.status}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 12, fontFamily: 'monospace' }}>{h.ip_address || '—'}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.user_agent ? h.user_agent.substring(0, 50) : '—'}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString()}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: 12, color: h.failure_reason ? '#ef4444' : 'var(--text-muted)' }}>{h.failure_reason || '—'}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {history.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No login activity recorded</div>}
                </div>
            )}
        </div>
    );
}

// ============================================
// SYSTEM TAB
// ============================================
function SystemTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.getSystemStats();
                setStats(res.data);
            } catch (err) { console.error(err); }
            setLoading(false);
        })();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading system stats...</div>;
    if (!stats) return <div style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>Failed to load system stats</div>;

    const tableStats = [
        { label: 'Users', value: stats.tables.users, icon: '👥' },
        { label: 'Active Users', value: stats.tables.active_users, icon: '✅' },
        { label: 'Agents', value: stats.tables.agents, icon: '🤖' },
        { label: 'Policies', value: stats.tables.policies, icon: '🛡️' },
        { label: 'Workflows', value: stats.tables.workflows, icon: '⚙️' },
        { label: 'Audit Records', value: stats.tables.audit_records?.toLocaleString(), icon: '📋' },
        { label: 'Cost Records', value: stats.tables.cost_records?.toLocaleString(), icon: '💰' },
        { label: 'Compliance Checks', value: stats.tables.compliance_checks, icon: '📊' },
        { label: 'Eval Runs', value: stats.tables.eval_runs, icon: '🎯' },
        { label: 'Login Attempts', value: stats.tables.login_attempts, icon: '🔐' },
        { label: 'Active Sessions', value: stats.tables.active_sessions, icon: '🖥️' },
        { label: 'API Keys', value: stats.tables.api_keys, icon: '🔑' },
        { label: 'Pending Invitations', value: stats.tables.pending_invitations, icon: '📨' },
    ];

    return (
        <div>
            {/* Server Info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Database Size', value: stats.database.size, color: '#6366f1' },
                    { label: 'Node.js', value: stats.server.node_version, color: '#10b981' },
                    { label: 'Memory Usage', value: `${stats.server.memory_mb} MB`, color: '#f59e0b' },
                    { label: 'DB Uptime', value: (() => {
                        const u = stats.database.uptime;
                        if (!u) return '—';
                        if (typeof u === 'string') return u.split('.')[0];
                        if (typeof u === 'object') {
                            const parts = [];
                            if (u.days) parts.push(`${u.days}d`);
                            if (u.hours) parts.push(`${u.hours}h`);
                            if (u.minutes) parts.push(`${u.minutes}m`);
                            if (u.seconds) parts.push(`${Math.floor(u.seconds)}s`);
                            return parts.join(' ') || '0s';
                        }
                        return String(u);
                    })(), color: '#3b82f6' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table Row Counts */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Table Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
                {tableStats.map(t => (
                    <div key={t.label} className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 18 }}>{t.icon}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{t.value}</span>
                    </div>
                ))}
            </div>

            {/* Recent Migrations */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📦 Recent Migrations</h3>
            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={thStyle}>Migration File</th><th style={thStyle}>Applied At</th></tr></thead>
                    <tbody>
                        {(stats.recent_migrations || []).map(m => (
                            <tr key={m.filename} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={tdStyle}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{m.filename}</span></td>
                                <td style={tdStyle}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.applied_at).toLocaleString()}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================
// SHARED COMPONENTS
// ============================================
function Modal({ title, onClose, children, width = 560 }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
            <div style={{ background: 'var(--surface-raised)', borderRadius: 16, border: '1px solid var(--border-color)', width, maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
                    <button className="btn-icon" onClick={onClose}><HiXMark /></button>
                </div>
                <div style={{ padding: 24, overflowY: 'auto' }}>{children}</div>
            </div>
        </div>
    );
}

function FormField({ label, children, required, hint }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
            </label>
            {children}
            {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
        </div>
    );
}

// Shared styles
const thStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)' };
const tdStyle = { padding: '12px 16px' };
