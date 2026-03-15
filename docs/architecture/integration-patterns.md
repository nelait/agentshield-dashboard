# Integration Patterns for AgentShield

AgentShield serves as an intermediary and policy enforcer for AI agent and workflow traffic. Depending on your current infrastructure and requirements, there are two primary integration patterns.

## Pattern 1: AgentShield AS the Gateway (Reverse Proxy)

This is the recommended pattern for full feature support (e.g., streaming and real-time guardrails). AgentShield acts as a reverse proxy between your application and the AI agents.

### Flow
1. **Request**: The client application sends a request to the AgentShield Gateway (e.g., `POST /api/v1/gateway/agents/{slug}/invoke`).
2. **Identity**: The Gateway extracts user identity and context from the request (headers, JWT, or API Key).
3. **Registry**: The Gateway retrieves agent metadata (upstream URL, etc.) from the Registry service.
4. **Policy Check**: The Policy Engine evaluates the request context against all active policies.
5. **Enforcement**:
   - **Allowed**: The Gateway proxies the request to the upstream AI agent (e.g., OpenAI, Claude).
   - **Denied**: The Gateway returns a `403 Forbidden` response and generates an Audit Log entry.
6. **Response**: The Gateway returns the agent's response to the client application.

### Benefits
- **Full Transparency**: Applications don't need to know individual agent endpoints.
- **Unified Governance**: Single point of control for all agent interactions.
- **Enhanced Guardrails**: Can perform real-time scanning of request/response payloads.

---

## Pattern 2: Sidecar / Policy Check API

In this pattern, your existing application gateway or orchestrator maintains direct control over agent calls but consults AgentShield for authorization before each invocation.

### Flow
1. **Authorization**: Your application sends a "Policy Check" request to AgentShield (e.g., `POST /api/v1/playground/simulate` or a dedicated `/api/v1/policy/check` endpoint).
2. **Evaluation**: AgentShield evaluates the provided context and returns an `allowed/denied` decision with the associated reason.
3. **Execution**: If allowed, your application proceeds to call the AI agent directly.

### Benefits
- **Minimal Latency**: No proxying overhead for large payloads.
- **Flexible Integration**: Easier to integrate into legacy systems with existing orchestration logic.

---

## Pattern Comparison

| Feature | Pattern 1 (Reverse Proxy) | Pattern 2 (Sidecar/Check API) |
|---|---|---|
| **Control Point** | Gateway | Calling Application |
| **Effort to Implement** | Low (Point App to GW) | Medium (Modify Code) |
| **Real-Time Guardrails** | Full Support | Manual Interaction |
| **Visibility** | High (All traffic flows through) | Partial (Only what is requested) |
