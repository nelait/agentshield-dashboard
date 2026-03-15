import { useState } from 'react';
import { HiSquares2X2, HiServer, HiShieldCheck, HiArrowsRightLeft, HiDocumentText, HiCurrencyDollar, HiClipboardDocumentList, HiBeaker, HiArrowRightOnRectangle, HiCog6Tooth, HiChartBar } from 'react-icons/hi2';
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
import { clearToken } from './api';
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
    ]
  },
  {
    section: 'System', items: [
      { key: 'settings', label: 'Settings', icon: HiCog6Tooth },
    ]
  },
];

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
};

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('agentshield_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activePage, setActivePage] = useState('dashboard');

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
          {NAV_ITEMS.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <button key={item.key}
                  className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                  onClick={() => setActivePage(item.key)}>
                  <item.icon className="icon" />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
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
