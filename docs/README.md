# AgentShield Documentation

> **Agent Governance Firewall** — Govern, Audit, Trust Every Agent

## Architecture

| Document | Description |
|---|---|
| [System Overview](architecture/system-overview.md) | Architecture diagrams, tech stack, and system design |
| [Integration Patterns](architecture/integration-patterns.md) | Reverse Proxy vs Sidecar API patterns |
| [Database Schema](architecture/database-schema.md) | Full PostgreSQL schema — 14 tables across 5 migrations |

## Backend

| Document | Description |
|---|---|
| [API Reference](backend/api-reference.md) | Complete REST API — 65+ endpoints with request/response examples |
| [Middleware Chain](backend/middleware-chain.md) | Gateway middleware pipeline (TraceId → Auth → Audit → Policy → Budget → Compliance) |
| [Services](backend/services.md) | All 10 backend service classes with methods and implementation details |
| [Configuration](backend/configuration.md) | Environment variable reference with defaults |

## Features

| Document | Description |
|---|---|
| [Policy Engine](features/policy-engine.md) | Policy evaluation logic, default deny, OPA/Rego dual-mode evaluation, WASM compilation, playground simulation |
| [Identity & Context](features/identity-and-context.md) | JWT, API Key, and A2A identity propagation for policy evaluation |
| [Audit Logging](features/audit-logging.md) | Immutable audit trail, visualization, and archival |
| [Lifecycle Management](features/lifecycle-management.md) | Agent registration, workflow creation, policy lifecycle |
| [Evaluation Module](features/evaluation-module.md) | Three-layer agent evaluation, LLM-as-a-Judge, persona simulation, HITL review |
| [Compliance Engine](features/compliance-engine.md) | SOX/HIPAA/GDPR/PCI-DSS compliance, PII detection, encrypted sampling, **NIST OSCAL import/export** |
| [Cost Management](features/cost-management.md) | Token/cost budgets, usage tracking, period auto-reset |
| [Cost Management — Use Cases](features/cost-management-use-cases.md) | Use case scenarios for budget enforcement, overage handling, and analytics |
| [Cost Management — Test Cases](features/cost-management-test-cases.md) | Comprehensive test plan for cost recording, pricing, budgets, and UI |
| [Guardrails](features/guardrails.md) | Input/output content enforcement, PII detection, prompt injection, test runner |
| [Guardrails — Use Cases](features/guardrails-use-cases.md) | Use case scenarios for profiles, rules, assignments, and enforcement |
| [Guardrails — Test Cases](features/guardrails-test-cases.md) | Comprehensive test plan for rule evaluation, middleware, and dashboard UI |
| [Module Toggles](features/module-toggles.md) | Runtime module enable/disable, middleware bypass, sidebar filtering, cache |
| [Module Toggles — Use Cases](features/module-toggles-use-cases.md) | Use case scenarios for toggling, sidebar hiding, and MCP impact |
| [Module Toggles — Test Cases](features/module-toggles-test-cases.md) | Comprehensive test plan for cache, middleware bypass, API, and frontend |

## Guides

| Document | Description |
|---|---|
| [Playground Guide](guides/playground-guide.md) | Step-by-step testing of allowed/denied scenarios + agent invocation flow |
| [MCP Server Configuration](guides/mcp-server-configuration-guide.md) | Configuring MCP-to-HTTP bridge for tool-based agents |
| [Agent Testing Step-by-Step](guides/agent-testing-step-by-step.md) | End-to-end agent testing walkthrough |
| [MCP Testing Step-by-Step](guides/mcp-testing-step-by-step.md) | Testing MCP servers through the playground |
| [Market Analysis](guides/market-analysis.md) | Competitive landscape, available products, and market positioning |
| [Product Feasibility](guides/product-feasibility.md) | Feature feasibility, build estimates, risks, and verdict |
| [Session Q&A History](guides/session-qa-history.md) | All questions asked and answers provided across previous sessions |

## Analysis

| Document | Description |
|---|---|
| [Gateway Latency Analysis](analysis/gateway-latency-analysis.html) | Per-request DB query costs, middleware latency breakdown, and optimization strategies (HTML) |
| [Competitive Analysis](analysis/competitive-analysis.html) | Head-to-head comparison vs. Credo AI, OneTrust, Holistic AI, IBM watsonx, Microsoft Purview, Deeploy — feature matrix, sales battlecards (HTML) |
| [Cloud Deployment Options](analysis/deployment-options.html) | AWS, Azure, GCP deployment architectures for Starter/Growth/Enterprise tiers — cost estimates, scaling patterns, extensibility roadmap (HTML) |
| [GCP POC Deployment Guide](analysis/poc-deployment-guide.html) | End-to-end POC on Google Cloud — 6 test agents, infra setup, 25 test scenarios covering every governance capability (HTML) |
| [AWS POC Deployment Guide](analysis/poc-deployment-aws.html) | End-to-end POC on AWS — ECS Fargate, RDS, S3+CloudFront, 6 test agents, 25 test scenarios (HTML) |
| [Azure POC Deployment Guide](analysis/poc-deployment-azure.html) | End-to-end POC on Azure — Container Apps, Azure PostgreSQL, Static Web Apps, 6 test agents, 25 test scenarios (HTML) |

## Quick Start

```bash
# Start infrastructure (PostgreSQL + Redis)
cd ../agentshield && docker compose up -d postgres redis

# Run database migrations
npm run migrate

# Start the backend (from agentshield/ directory)
npm run dev

# Start the dashboard (from this directory)
cd ../agentshield-dashboard && npm run dev
```

- **Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Login**: `admin@agentshield.local` / `admin123`
- **Health Check**: http://localhost:3000/health
