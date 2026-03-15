# AgentShield System Architecture

## Overview
**AgentShield** is an Agent Governance Firewall that acts as a transparent proxy between end users and AI agents/workflows. It enforces authentication, authorization, compliance, cost controls, and guardrails via an admin dashboard.

## Key Features
- **Agent Registry**: Centralized management of internal and external agents across REST, MCP, A2A, and gRPC protocols.
- **Workflow Orchestration**: Combining multiple agents into multi-step pipelines with numbered steps and data flow rules.
- **Policy Engine**: Access control policies (Allow/Deny) based on subject (user role, email) and resource (agent/workflow slug) attributes.
- **Policy Playground**: A simulation environment to test policy evaluations against various user contexts without invoking actual agents.
- **Audit Logging**: Immutable, append-only trail of all firewall events with detailed visualization.
- **Cost & Budgeting**: Token-based and cost-based limits for users, teams, and projects.
- **Compliance Sampling**: Configurable request/response sampling for regulatory frameworks like SOX or HIPAA.

## Tech Stack
- **Backend**: Node.js / Express (Go-based gateway in production plan).
- **Database**: PostgreSQL (relational integrity, JSONB support).
- **Frontend**: React + Vite + Tailwind/Glassmorphism.
- **Policy Language**: OPA / Rego (simulated via JS logic in MVP).

## Architecture Diagram

```mermaid
graph TB
    subgraph Clients["End Users"]
        MCP_C["MCP Client"]
        REST_C["REST Client"]
    end

    subgraph Gateway["Gateway / Admin API"]
        REG["Registry Service"]
        POL["Policy Service"]
        WF["Workflow Service"]
        MW["Middleware Chain"]
    end

    subgraph Data["PostgreSQL"]
        T1["Agents"]
        T2["Workflows"]
        T3["Policies"]
        T4["Audit Logs"]
    end

    Clients --> Gateway
    Gateway --> Data
    Gateway --> Upstream["Upstream Agents"]
```

## Full System Architecture (Production Plan)

```mermaid
graph TB
    subgraph Clients["End Users"]
        MCP_C["MCP Client"]
        REST_C["REST Client"]
    end

    subgraph Gateway["Gateway Layer"]
        MCP_S["MCP Server Endpoint"]
        REST_S["REST API Endpoint"]
        PROXY["Reverse Proxy Engine"]
        MW["Middleware Chain"]
    end

    subgraph Middleware["Middleware Chain (ordered)"]
        M1["1. Rate Limiter"]
        M2["2. Auth Middleware (JWT/OAuth)"]
        M3["3. Policy Enforcer (OPA)"]
        M4["4. Budget Checker"]
        M5["5. Guardrail Checker"]
        M6["6. Compliance Sampler"]
        M7["7. Audit Logger"]
    end

    subgraph Admin["Admin Dashboard (React)"]
        UI_REG["Agent Registry UI"]
        UI_POL["Policy Builder UI"]
        UI_COMP["Compliance Dashboard"]
        UI_COST["Cost Dashboard"]
        UI_WF["Workflow Manager"]
    end

    subgraph Core["Core Services"]
        SVC_REG["Registry Service"]
        SVC_POL["Policy Service"]
        SVC_COMP["Compliance Service"]
        SVC_COST["Cost Service"]
        SVC_WF["Workflow Service"]
        SVC_AUDIT["Audit Service"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL"]
        REDIS["Redis (Cache + Rate Limit)"]
        S3["S3/MinIO (Audit Archive)"]
        OPA["OPA (Policy Engine)"]
    end

    subgraph Agents["Upstream Agents (Untouched)"]
        EXT1["External Agent A"]
        EXT2["External Agent B"]
        INT1["Internal Agent 1"]
    end

    MCP_C & REST_C --> Gateway
    MCP_S & REST_S --> MW
    MW --> M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7
    M7 --> PROXY --> EXT1 & EXT2 & INT1

    Admin --> Core
    Core --> Data
    MW -.->|reads config| PG & REDIS & OPA
    M7 -.->|writes| PG & S3
```
