# AI Sure — Admin Dashboard

> **Agent Governance Firewall** — Govern, Audit, Trust Every Agent

The AI Sure Dashboard is a React-based admin interface for managing AI agent governance, compliance, policies, and observability.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Vanilla CSS with CSS variables (dark theme)
- **Icons**: React Icons (Heroicons v2)
- **Routing**: Hash-based SPA routing
- **Hosting**: Firebase Hosting → [agentshield-dashboard.web.app](https://agentshield-dashboard.web.app)
- **Backend API**: Cloud Run → `agentshield-api-*.us-central1.run.app`

## Features

| Module | Description |
|--------|-------------|
| **Agent Registry** | Register, configure, and manage AI agents |
| **Workflow Builder** | Create multi-agent workflows with step sequencing |
| **Policy Engine** | ABAC-style access control with OPA/Rego compilation |
| **Compliance** | SOX/HIPAA/GDPR/PCI-DSS rules + NIST OSCAL import/export |
| **Guardrails** | Input/output content enforcement with PII detection |
| **Evaluation** | Three-layer agent evaluation with LLM-as-a-Judge |
| **Audit Log** | Immutable, filterable audit trail with visualization |
| **Cost Management** | Token/cost budgets with usage tracking |
| **Playground** | Policy simulation and agent invocation testing |
| **Settings** | API keys, module toggles, user management |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
npx firebase-tools deploy --only hosting
```

- **Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Login**: `admin@agentshield.local` / `admin123`

## Recent Changes

### Phase 1: OPA/Rego Policy-as-Code (July 2026)
- Rego code editor with syntax highlighting in Policy UI
- Rego export API integration
- Dual-mode policy evaluation (JSON + WASM)

### Phase 2: NIST OSCAL Compliance (July 2026)
- **Import OSCAL** button in Compliance → Rules tab
- Import modal with JSON paste/file upload and group selector
- Purple "OSCAL" badges on imported rules
- Imported OSCAL Catalogs section with delete
- **Export OSCAL** button on compliance check history (Assessment Results)

## Documentation

See [docs/README.md](docs/README.md) for the full documentation index.
