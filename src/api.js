const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

let authToken = localStorage.getItem('agentshield_token');
let refreshTokenValue = localStorage.getItem('agentshield_refresh_token');
let isRefreshing = false;
let refreshPromise = null;
let sessionExpiredCallback = null;

export function setToken(token) {
    authToken = token;
    localStorage.setItem('agentshield_token', token);
}
export function setRefreshToken(token) {
    refreshTokenValue = token;
    localStorage.setItem('agentshield_refresh_token', token);
}
export function clearToken() {
    authToken = null;
    refreshTokenValue = null;
    localStorage.removeItem('agentshield_token');
    localStorage.removeItem('agentshield_refresh_token');
    localStorage.removeItem('agentshield_user');
}
export function getToken() { return authToken; }

/**
 * Register a callback that fires when the session is truly expired
 * (both access token and refresh token are invalid).
 * App.jsx uses this to redirect to the login screen.
 */
export function onSessionExpired(callback) {
    sessionExpiredCallback = callback;
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Deduplicates concurrent refresh attempts.
 */
async function tryRefreshToken() {
    if (!refreshTokenValue) return false;

    // Deduplicate — if a refresh is already in-flight, wait for it
    if (isRefreshing) {
        try { await refreshPromise; return true; }
        catch { return false; }
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Refresh failed');
        setToken(data.data.token);
    })();

    try {
        await refreshPromise;
        return true;
    } catch {
        return false;
    } finally {
        isRefreshing = false;
        refreshPromise = null;
    }
}

/**
 * Central request function with automatic token refresh on 401.
 * If the backend responds with TOKEN_EXPIRED, we try refreshing once.
 * If that also fails, we fire the session-expired callback.
 */
async function request(method, path, body = null) {
    const doFetch = () => {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        return fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        });
    };

    let res = await doFetch();
    let data = await res.json();

    // If token expired, attempt a silent refresh and retry once
    if (res.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.error === 'Token expired')) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with the new token
            res = await doFetch();
            data = await res.json();
        } else {
            // Refresh failed — session is truly expired
            clearToken();
            if (sessionExpiredCallback) sessionExpiredCallback();
            throw new Error('Session expired. Please log in again.');
        }
    }

    // Catch other 401s (invalid token, auth required) — also trigger logout
    if (res.status === 401) {
        clearToken();
        if (sessionExpiredCallback) sessionExpiredCallback();
        throw new Error(data.error || 'Authentication required');
    }

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

    // Rego / OPA
    regoStatus: () => request('GET', '/policies/rego/status'),
    validateRego: (source) => request('POST', '/policies/rego/validate', { source }),
    importRego: (name, source, priority) => request('POST', '/policies/rego/import', { name, source, priority }),
    exportRego: (id) => request('GET', `/policies/${id}/rego`),

    // Compliance
    listComplianceConfigs: () => request('GET', '/compliance/configs'),
    createComplianceConfig: (data) => request('POST', '/compliance/configs', data),
    listSamples: (params = '') => request('GET', `/compliance/samples?${params}`),
    getComplianceStats: () => request('GET', '/compliance/stats'),
    runComplianceCheck: (configId, samples = null) => request('POST', `/compliance/configs/${configId}/run`, { samples }),
    uploadComplianceSamples: (configId, samples) => request('POST', `/compliance/configs/${configId}/upload-samples`, { samples }),
    getComplianceChecks: (configId) => request('GET', `/compliance/configs/${configId}/checks`),

    // OSCAL
    validateOscal: (catalog) => request('POST', '/compliance/oscal/validate', catalog),
    previewOscal: (catalog) => request('POST', '/compliance/oscal/preview', catalog),
    importOscal: (catalog, framework, selectedGroups) => request('POST', '/compliance/oscal/import', { catalog, framework, selectedGroups }),
    listOscalCatalogs: () => request('GET', '/compliance/oscal/catalogs'),
    deleteOscalCatalog: (id) => request('DELETE', `/compliance/oscal/catalogs/${id}`),
    exportOscalResult: (checkId) => request('GET', `/compliance/checks/${checkId}/oscal`),

    // Budgets + Cost
    listBudgets: () => request('GET', '/budgets'),
    createBudget: (data) => request('POST', '/budgets', data),
    updateBudget: (id, data) => request('PUT', `/budgets/${id}`, data),
    deleteBudget: (id) => request('DELETE', `/budgets/${id}`),
    getCostReport: (params = '') => request('GET', `/cost/report?${params}`),
    getCostStats: () => request('GET', '/cost/stats'),
    getDailyUsage: (days = 30) => request('GET', `/cost/daily?days=${days}`),
    getModelPricing: () => request('GET', '/cost/model-pricing'),
    createModelPricing: (data) => request('POST', '/cost/model-pricing', data),
    updateModelPricing: (id, data) => request('PUT', `/cost/model-pricing/${id}`, data),
    deleteModelPricing: (id) => request('DELETE', `/cost/model-pricing/${id}`),
    getBudgetAlerts: () => request('GET', '/budgets/alerts'),
    getBudgetHistory: (id) => request('GET', `/budgets/${id}/history`),
    getAllBudgetHistory: (limit = 50) => request('GET', `/budgets/history/all?limit=${limit}`),

    // Audit
    listAuditLogs: (params = '') => request('GET', `/audit?${params}`),
    getAuditStats: () => request('GET', '/audit/stats'),
    getAuditFilters: () => request('GET', '/audit/filters'),

    // Seed & Playground
    seedAgents: () => request('POST', '/seed-agents'),
    simulatePolicy: (data) => request('POST', '/playground/simulate', data),
    testInvokeAgent: (data) => request('POST', '/playground/test-invoke', data),
    mcpListTools: (agentSlug, userContext) => request('POST', '/playground/mcp-tools', { agentSlug, ...(userContext || {}) }),
    mcpCallTool: (agentSlug, toolName, toolArguments, userContext) => request('POST', '/playground/mcp-call', { agentSlug, toolName, toolArguments, ...(userContext || {}) }),

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
        const doUpload = () => {
            const headers = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            return fetch(`${API_BASE}/compliance/rules/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });
        };

        let res = await doUpload();

        // Handle token expiry: try refresh and retry
        if (res.status === 401) {
            const data = await res.json().catch(() => ({}));
            if (data.code === 'TOKEN_EXPIRED' || data.error === 'Token expired') {
                const refreshed = await tryRefreshToken();
                if (refreshed) {
                    res = await doUpload();
                } else {
                    clearToken();
                    if (sessionExpiredCallback) sessionExpiredCallback();
                    throw new Error('Session expired. Please log in again.');
                }
            } else {
                clearToken();
                if (sessionExpiredCallback) sessionExpiredCallback();
                throw new Error(data.error || 'Authentication required');
            }
        }

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
    getEvalReviews: (params = '') => request('GET', `/evaluations/reviews${params ? '?' + params : ''}`),
    submitEvalReview: (id, data) => request('PUT', `/evaluations/reviews/${id}`, data),
    getEvalStats: () => request('GET', '/evaluations/stats'),
    getEvalPersonas: () => request('GET', '/evaluations/personas'),

    // API Keys
    createApiKey: (data) => request('POST', '/api-keys', data),
    listApiKeys: () => request('GET', '/api-keys'),
    revokeApiKey: (id) => request('DELETE', `/api-keys/${id}`),

    // Gateway Policy Check (self-service)
    policyCheck: (data) => request('POST', '/gateway/policy/check', data),

    // Guardrails
    listGuardrailProfiles: () => request('GET', '/guardrails/profiles'),
    getGuardrailProfile: (id) => request('GET', `/guardrails/profiles/${id}`),
    createGuardrailProfile: (data) => request('POST', '/guardrails/profiles', data),
    updateGuardrailProfile: (id, data) => request('PUT', `/guardrails/profiles/${id}`, data),
    deleteGuardrailProfile: (id) => request('DELETE', `/guardrails/profiles/${id}`),
    addGuardrailRule: (profileId, data) => request('POST', `/guardrails/profiles/${profileId}/rules`, data),
    updateGuardrailRule: (id, data) => request('PUT', `/guardrails/rules/${id}`, data),
    deleteGuardrailRule: (id) => request('DELETE', `/guardrails/rules/${id}`),
    assignGuardrail: (agentId, profileId) => request('POST', '/guardrails/assign', { agentId, profileId }),
    unassignGuardrail: (agentId, profileId) => request('DELETE', '/guardrails/assign', { agentId, profileId }),
    getAgentGuardrails: (agentId) => request('GET', `/guardrails/agents/${agentId}`),
    runGuardrailTests: (profileId, testCases, agentId = null) => request('POST', `/guardrails/profiles/${profileId}/test`, { testCases, agentId }),
    getGuardrailTestRuns: (profileId = null, limit = 20) => request('GET', `/guardrails/test-runs?${profileId ? `profileId=${profileId}&` : ''}limit=${limit}`),
    getGuardrailTestRun: (id) => request('GET', `/guardrails/test-runs/${id}`),
    getGuardrailStats: () => request('GET', '/guardrails/stats'),

    // Observability
    getOtelHealth: () => request('GET', '/observability/health'),

    // Reports
    getReportTypes: () => request('GET', '/reports/types'),
    generateReport: (type, params = '') => request('GET', `/reports/${type}?${params}`),
    getReportExportUrl: (type, format = 'csv', params = '') => {
        const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';
        const token = authToken || '';
        return `${base}/reports/${type}/export?format=${format}&${params}&token=${token}`;
    },
    saveReportSnapshot: (type, name, filters) => request('POST', `/reports/${type}/snapshot`, { name, filters }),
    listReportSnapshots: (type, limit = 20) => request('GET', `/reports/snapshots/list?type=${type || ''}&limit=${limit}`),
    getReportSnapshot: (id) => request('GET', `/reports/snapshots/${id}`),

    // ============================================
    // ADMIN — User Management
    // ============================================
    listAdminUsers: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request('GET', `/admin/users${qs ? '?' + qs : ''}`);
    },
    getAdminUser: (id) => request('GET', `/admin/users/${id}`),
    createAdminUser: (data) => request('POST', '/admin/users', data),
    updateAdminUser: (id, data) => request('PUT', `/admin/users/${id}`, data),
    toggleAdminUser: (id) => request('PATCH', `/admin/users/${id}/toggle`),
    resetAdminUserPassword: (id) => request('POST', `/admin/users/${id}/reset-password`),
    deleteAdminUser: (id) => request('DELETE', `/admin/users/${id}`),
    getUserLoginHistory: (id) => request('GET', `/admin/users/${id}/login-history`),
    getUserSessions: (id) => request('GET', `/admin/users/${id}/sessions`),
    revokeUserAllSessions: (id) => request('DELETE', `/admin/users/${id}/sessions`),

    // Admin — Login History (all users)
    getLoginHistory: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request('GET', `/admin/login-history${qs ? '?' + qs : ''}`);
    },

    // Admin — Invitations
    createInvitation: (data) => request('POST', '/admin/invitations', data),
    listInvitations: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request('GET', `/admin/invitations${qs ? '?' + qs : ''}`);
    },
    revokeInvitation: (id) => request('DELETE', `/admin/invitations/${id}`),

    // Admin — Self-Service Profile
    getProfile: () => request('GET', '/admin/profile'),
    updateProfile: (data) => request('PUT', '/admin/profile', data),
    changePassword: (data) => request('POST', '/admin/profile/change-password', data),
    getMyLoginHistory: () => request('GET', '/admin/profile/login-history'),
    getMySessions: () => request('GET', '/admin/profile/sessions'),
    revokeMySession: (id) => request('DELETE', `/admin/profile/sessions/${id}`),

    // Admin — System Stats
    getSystemStats: () => request('GET', '/admin/system/stats'),
};

export default api;
