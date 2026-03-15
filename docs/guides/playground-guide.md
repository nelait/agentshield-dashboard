# Playground Simulation Guide: Allowed vs. Denied Cases

This guide outlines a step-by-step procedure for testing both **Access Allowed** and **Access Denied** cases in the AgentShield Policy Playground.

---

## 🟢 Scenario 1: ACCESS ALLOWED

### Step 1 — Create an Allow Policy
1. Go to **Policies** in the sidebar.
2. Click **"+ Create Policy"**.
3. Fill in:
   - **Policy Name**: `Allow Analysts to GPT4`
   - **Effect**: ✅ Allow
   - **Priority**: `100`
   - **Subject Conditions (Who)**: Field = `role`, Operator = `Equals`, Value = `analyst`
   - **Resource Conditions (What)**: Field = `slug`, Operator = `Equals`, Value = `gpt4-analyst`
4. Click **"Create Policy"**.

### Step 2 — Run Simulation (Allowed)
1. Go to **Playground** in the sidebar.
2. Set target to **Agent** and select **"GPT-4 Analyst"**.
3. Set **Role** = `Analyst`.
4. Click **"Run Simulation"**.
5. ✅ You should see **ACCESS ALLOWED** with "Policy 'Allow Analysts to GPT4' matched".

---

## 🔴 Scenario 2: ACCESS DENIED

### Step 3 — Run Same Simulation with Different Role
1. Stay on the **Playground**.
2. Keep agent = **GPT-4 Analyst**.
3. Change **Role** to `Viewer`.
4. Click **"Run Simulation"**.
5. 🚫 You should see **ACCESS DENIED** with the reason "No matching policy — default deny".

---

## Understanding the Logic
As you run these simulations, click any policy in the **evaluation trace** table below the result to expand it. You will see exactly which conditions passed and which failed, along with the **Expected** vs. **Actual** values.

---

## How Agent Invocation Works with Policy Validation

When an actual agent is called (not a simulation), the flow is:

### Reverse Proxy Pattern (Production)
```
Client Request
    → POST /api/v1/gateway/agents/{slug}/invoke
    → Rate Limiter (check Redis)
    → Auth Middleware (decode JWT / lookup API key)
    → Policy Enforcer (evaluate all active policies against context)
        → If DENIED → Return 403 + Audit Log entry
        → If ALLOWED → Continue
    → Budget Checker (check token/cost limits)
    → Guardrail Checker (input validation)
    → Compliance Sampler (async capture if sampled)
    → Audit Logger (record event)
    → Reverse Proxy → Upstream Agent (OpenAI, Claude, etc.)
    → Response returned to client
```

### Sidecar Pattern (Alternative)
```
Your App
    → POST /api/v1/policy/check (ask AgentShield)
    → AgentShield evaluates → returns allowed/denied
    → If allowed, your app calls the agent directly
```
