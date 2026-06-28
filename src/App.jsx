import { useState, useEffect, useCallback } from 'react';
import { HiSquares2X2, HiServer, HiShieldCheck, HiShieldExclamation, HiArrowsRightLeft, HiDocumentText, HiCurrencyDollar, HiClipboardDocumentList, HiBeaker, HiArrowRightOnRectangle, HiCog6Tooth, HiChartBar, HiSignal, HiCodeBracket } from 'react-icons/hi2';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import Policies from './pages/Policies';
import Workflows from './pages/Workflows';
import Compliance from './pages/Compliance';
import CostManagement from './pages/CostManagement';
import AuditLog from './pages/AuditLog';
import Playground from './pages/Playground';
import Evaluations from './pages/Evaluations';
import Settings from './pages/Settings';
import Observability from './pages/Observability';
import Guardrails from './pages/Guardrails';
import Integrations from './pages/Integrations';
import api, { clearToken, onSessionExpired } from './api';
import './index.css';

const NAV_ITEMS = [
  {
    section: 'Overview', items: [
      { key: 'dashboard', label: 'Dashboard', icon: HiSquares2X2 },
    ]
  },
  {
    section: 'Governance', items: [
      { key: 'agents', label: 'Agent Registry', icon: HiServer },
      { key: 'workflows', label: 'Workflows', icon: HiArrowsRightLeft },
      { key: 'policies', label: 'Policies', icon: HiShieldCheck },
      { key: 'guardrails', label: 'Guardrails', icon: HiShieldExclamation },
    ]
  },
  {
    section: 'Compliance & Cost', items: [
      { key: 'compliance', label: 'Compliance', icon: HiDocumentText },
      { key: 'cost', label: 'Cost Management', icon: HiCurrencyDollar },
    ]
  },
  {
    section: 'Testing', items: [
      { key: 'playground', label: 'Playground', icon: HiBeaker },
      { key: 'evaluations', label: 'Evaluations', icon: HiChartBar },
    ]
  },
  {
    section: 'Monitoring', items: [
      { key: 'audit', label: 'Audit Log', icon: HiClipboardDocumentList },
      { key: 'observability', label: 'Observability', icon: HiSignal },
    ]
  },
  {
    section: 'System', items: [
      { key: 'integrations', label: 'Integrations', icon: HiCodeBracket },
      { key: 'settings', label: 'Settings', icon: HiCog6Tooth },
    ]
  },
];

// Maps module keys → sidebar nav keys that should be hidden when module is disabled
const MODULE_NAV_MAP = {
  policies: ['policies'],
  guardrails: ['guardrails'],
  compliance: ['compliance'],
  cost_management: ['cost'],
  evaluations: ['evaluations'],
};

// Build reverse map: nav key → module key
const NAV_TO_MODULE = {};
Object.entries(MODULE_NAV_MAP).forEach(([mod, keys]) => {
  keys.forEach(k => { NAV_TO_MODULE[k] = mod; });
});

const PAGES = {
  dashboard: { title: 'Dashboard', component: Dashboard },
  agents: { title: 'Agent Registry', component: Agents },
  workflows: { title: 'Workflows', component: Workflows },
  policies: { title: 'Access Policies', component: Policies },
  compliance: { title: 'Compliance Center', component: Compliance },
  cost: { title: 'Cost Management', component: CostManagement },
  audit: { title: 'Audit Log', component: AuditLog },
  playground: { title: 'Policy Playground', component: Playground },
  evaluations: { title: 'Agent Evaluations', component: Evaluations },
  settings: { title: 'Settings', component: Settings },
  observability: { title: 'Observability', component: Observability },
  guardrails: { title: 'Guardrails', component: Guardrails },
  integrations: { title: 'Integrations', component: Integrations },
};

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('agentshield_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [moduleStates, setModuleStates] = useState({});

  // Fetch module statuses (on login and every 60s)
  const fetchModuleStates = useCallback(async () => {
    try {
      const res = await api.getSettings('modules');
      const states = {};
      (res.data || []).forEach(s => {
        const val = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        states[s.key] = val;
      });
      setModuleStates(states);
    } catch { /* fail-open: default all enabled */ }
  }, []);

  useEffect(() => {
    if (user) {
      fetchModuleStates();
      const interval = setInterval(fetchModuleStates, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchModuleStates]);

  // Redirect to dashboard if current page's module is disabled
  useEffect(() => {
    const modKey = NAV_TO_MODULE[activePage];
    if (modKey && moduleStates[modKey]?.enabled === false) {
      setActivePage('dashboard');
    }
  }, [activePage, moduleStates]);

  // Auto-logout when session expires (access + refresh tokens both invalid)
  const handleSessionExpired = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    onSessionExpired(handleSessionExpired);
  }, [handleSessionExpired]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const currentPage = PAGES[activePage];
  const PageComponent = currentPage.component;

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="shield-icon">🛡️</span>
          <div>
            <h1>AgentShield</h1>
            <span>Governance Firewall</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(section => {
            // Filter items by module status
            const visibleItems = section.items.filter(item => {
              const modKey = NAV_TO_MODULE[item.key];
              if (!modKey) return true; // Not tied to a module → always visible
              return moduleStates[modKey]?.enabled !== false; // Default: enabled
            });
            if (visibleItems.length === 0) return null;
            return (
              <div className="nav-section" key={section.section}>
                <div className="nav-section-title">{section.section}</div>
                {visibleItems.map(item => (
                  <button key={item.key}
                    className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                    onClick={() => setActivePage(item.key)}>
                    <item.icon className="icon" />
                    {item.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--accent-primary)' }}>
              {(user.name || user.email || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || user.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <HiArrowRightOnRectangle />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-bar">
          <h2>{currentPage.title}</h2>
          <div className="top-bar-actions">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>v0.1.0</span>
          </div>
        </header>
        <main className="page-content">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
