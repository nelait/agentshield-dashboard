const API_BASE = 'http://localhost:3000/api/v1';

let authToken = localStorage.getItem('agentshield_token');

export function setToken(token) {
    authToken = token;
    localStorage.setItem('agentshield_token', token);
}
export function clearToken() {
    authToken = null;
    localStorage.removeItem('agentshield_token');
    localStorage.removeItem('agentshield_user');
}
export function getToken() { return authToken; }

async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

const api = {
    // Auth
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    refreshToken: (refreshToken) => request('POST', '/auth/refresh', { refreshToken }),
    getMe: () => request('GET', '/auth/me'),
    listUsers: () => request('GET', '/auth/users'),
    createUser: (data) => request('POST', '/auth/users', data),

    // Dashboard
    getDashboard: () => request('GET', '/dashboard'),

    // Agents
    listAgents: (params = '') => request('GET', `/agents?${params}`),
    getAgent: (slug) => request('GET', `/agents/${slug}`),
    createAgent: (data) => request('POST', '/agents', data),
    updateAgent: (slug, data) => request('PUT', `/agents/${slug}`, data),
    deleteAgent: (slug) => request('DELETE', `/agents/${slug}`),
    importAgent: (url) => request('POST', '/agents/import', { url }),
    getAgentStats: () => request('GET', '/agents/stats'),

    // Workflows
    listWorkflows: () => request('GET', '/workflows'),
    getWorkflow: (slug) => request('GET', `/workflows/${slug}`),
    createWorkflow: (data) => request('POST', '/workflows', data),
    updateWorkflow: (slug, data) => request('PUT', `/workflows/${slug}`, data),
    toggleWorkflow: (slug, isEnabled) => request('PATCH', `/workflows/${slug}/toggle`, { isEnabled }),
    deleteWorkflow: (slug) => request('DELETE', `/workflows/${slug}`),

    // Policies
    listPolicies: () => request('GET', '/policies'),
    getPolicy: (id) => request('GET', `/policies/${id}`),
    createPolicy: (data) => request('POST', '/policies', data),
    updatePolicy: (id, data) => request('PUT', `/policies/${id}`, data),
    deletePolicy: (id) => request('DELETE', `/policies/${id}`),

    // Compliance
    listComplianceConfigs: () => request('GET', '/compliance/configs'),
    createComplianceConfig: (data) => request('POST', '/compliance/configs', data),
    listSamples: (params = '') => request('GET', `/compliance/samples?${params}`),
    getComplianceStats: () => request('GET', '/compliance/stats'),
    runComplianceCheck: (configId, samples = null) => request('POST', `/compliance/configs/${configId}/run`, { samples }),
    uploadComplianceSamples: (configId, samples) => request('POST', `/compliance/configs/${configId}/upload-samples`, { samples }),
    getComplianceChecks: (configId) => request('GET', `/compliance/configs/${configId}/checks`),

    // Budgets + Cost
    listBudgets: () => request('GET', '/budgets'),
    createBudget: (data) => request('POST', '/budgets', data),
    updateBudget: (id, data) => request('PUT', `/budgets/${id}`, data),
    getCostReport: (params = '') => request('GET', `/cost/report?${params}`),
    getCostStats: () => request('GET', '/cost/stats'),

    // Audit
    listAuditLogs: (params = '') => request('GET', `/audit?${params}`),
    getAuditStats: () => request('GET', '/audit/stats'),
    getAuditFilters: () => request('GET', '/audit/filters'),

    // Seed & Playground
    seedAgents: () => request('POST', '/seed-agents'),
    simulatePolicy: (data) => request('POST', '/playground/simulate', data),
    testInvokeAgent: (data) => request('POST', '/playground/test-invoke', data),

    // Workflow Steps
    addWorkflowStep: (slug, agentId, stepOrder, config) => request('POST', `/workflows/${slug}/steps`, { agentId, stepOrder, config }),
    removeWorkflowStep: (slug, agentId) => request('DELETE', `/workflows/${slug}/steps/${agentId}`),

    // Settings
    getSettings: (category) => request('GET', `/settings/${category}`),
    upsertSetting: (data) => request('PUT', '/settings', data),
    deleteSetting: (id) => request('DELETE', `/settings/${id}`),

    // Compliance Rules
    getComplianceRules: (framework) => request('GET', `/compliance/rules/${framework}`),
    upsertComplianceRule: (data) => request('PUT', '/compliance/rules', data),
    toggleComplianceRule: (id, isEnabled) => request('PATCH', `/compliance/rules/${id}/toggle`, { isEnabled }),
    deleteComplianceRule: (id) => request('DELETE', `/compliance/rules/${id}`),
    uploadComplianceRules: async (formData) => {
        const token = localStorage.getItem('agentshield_token');
        const res = await fetch(`${API_BASE}/compliance/rules/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(err.error || 'Upload failed');
        }
        return res.json();
    },

    // Compliance History
    getComplianceHistory: (limit = 50) => request('GET', `/compliance/checks/history?limit=${limit}`),

    // Evaluations
    listEvalSuites: (params = '') => request('GET', `/evaluations/suites?${params}`),
    getEvalSuite: (id) => request('GET', `/evaluations/suites/${id}`),
    createEvalSuite: (data) => request('POST', '/evaluations/suites', data),
    updateEvalSuite: (id, data) => request('PUT', `/evaluations/suites/${id}`, data),
    deleteEvalSuite: (id) => request('DELETE', `/evaluations/suites/${id}`),
    runEvaluation: (suiteId, judgeModel = null) => request('POST', `/evaluations/suites/${suiteId}/run`, { judgeModel }),
    getEvalRuns: (suiteId) => request('GET', `/evaluations/suites/${suiteId}/runs`),
    getEvalRun: (runId) => request('GET', `/evaluations/runs/${runId}`),
    getEvalReviews: () => request('GET', '/evaluations/reviews'),
    submitEvalReview: (id, data) => request('PUT', `/evaluations/reviews/${id}`, data),
    getEvalStats: () => request('GET', '/evaluations/stats'),
    getEvalPersonas: () => request('GET', '/evaluations/personas'),
};

export default api;
