# Compliance Engine

AI Sure's Compliance Engine provides regulatory compliance monitoring through probabilistic request/response sampling, PII detection, encrypted storage, framework-specific rule evaluation, and **NIST OSCAL** catalog import/export.

> **Source**: [`src/compliance/service.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/compliance/service.js)  
> **OSCAL Parser**: [`src/compliance/oscal-parser.js`](file:///Users/krishnakollepara/AntiGravityProjects/agentshield/src/compliance/oscal-parser.js)

---

## Supported Frameworks

| Framework | Description | Default Retention | Built-in Rules | OSCAL Import |
|-----------|-------------|-------------------|----------------|--------------|
| **SOX** | Sarbanes-Oxley (financial data integrity) | 7 years | 5 rules | ✅ |
| **HIPAA** | Health Insurance Portability (PHI protection) | 6 years (2190 days) | 5 rules | ✅ |
| **GDPR** | General Data Protection Regulation (EU PII) | Per consent | 5 rules | ✅ |
| **PCI-DSS** | Payment Card Industry (cardholder data) | 1 year | 5 rules | ✅ |
| **NIST 800-53** | Federal Information Security | Configurable | Via OSCAL import | ✅ |
| **FedRAMP** | Federal Risk and Authorization | Configurable | Via OSCAL import | ✅ |
| **Custom** | User-defined compliance rules | Configurable | User-created | ✅ |

---

## Rule Sources

Rules in AI Sure come from three sources, indicated by badges in the dashboard:

| Source | Badge | Description |
|--------|-------|-------------|
| **Built-in** | 🔵 Blue "Built-in" | Seeded via database migration, cannot be deleted |
| **Custom** | 🟢 Green "Custom" | Created via dashboard or CSV/XLSX upload |
| **OSCAL** | 🟣 Purple "OSCAL" | Imported from NIST OSCAL catalog JSON |

---

## Compliance Configuration

A compliance config defines what to monitor:

```json
{
  "name": "HIPAA Monitoring",
  "framework": "hipaa",
  "sample_rate": 0.10,
  "applies_to": { "agents": ["medical-agent"], "workflows": ["patient-intake"] },
  "retention_days": 2190,
  "pii_detection": true,
  "is_active": true
}
```

| Field | Description |
|-------|-------------|
| `sample_rate` | Probability of sampling a request (0.0 – 1.0) |
| `applies_to` | JSONB filter for target agents/workflows |
| `retention_days` | How long to retain encrypted samples |
| `pii_detection` | Enable automatic PII scanning |

---

## PII Detection

The engine scans agent request/response bodies for personally identifiable information using regex patterns:

| PII Type | Pattern |
|----------|---------|
| **SSN** | `\b\d{3}-\d{2}-\d{4}\b` |
| **Email** | Standard email regex |
| **Phone** | 10-digit US format (`\b\d{3}[-.]?\d{3}[-.]?\d{4}\b`) |
| **Credit Card** | 13-19 digit card numbers |
| **Date of Birth** | `\b\d{2}/\d{2}/\d{4}\b` and `\b\d{4}-\d{2}-\d{2}\b` |
| **IP Address** | IPv4 format |
| **Medical Terms** | Diagnosis, prescription, patient, medical record keywords |

When PII is detected:
- `pii_detected` flag is set to `true` on the sample
- `pii_types` JSONB array lists all detected categories
- Sample is flagged for compliance review

---

## Encrypted Sample Storage

All compliance samples are secured with defense-in-depth:

1. **Integrity**: SHA-256 hash of request and response bodies (`request_hash`, `response_hash`)
2. **Encryption**: AES-256-GCM encryption of request and response bodies
   - Key: `COMPLIANCE_ENCRYPTION_KEY` env var (must be 32 bytes)
   - Each sample uses a unique 16-byte IV
   - Authentication tag prevents tampering
3. **Storage**: Encrypted content stored as `BYTEA` in PostgreSQL

```
Request/Response → SHA-256 Hash → AES-256-GCM Encrypt → Store (BYTEA)
```

---

## Sampling Middleware

The `complianceSampler` middleware (step 6 in the gateway chain) handles sampling:

1. **Decision**: `shouldSample(agentId, workflowId)` checks active configs and their sample rates
2. **Capture**: Non-blocking — wraps `res.json()` to capture response body asynchronously
3. **Storage**: Runs in background — never blocks HTTP response
4. **PII scan**: Automatically runs `detectPII()` on both request and response bodies

---

## Framework Rules

Each framework ships with 5 built-in rules (seeded via migration `003_settings_and_rules.sql`). Additional rules can be imported via OSCAL catalogs.

### SOX Rules (Built-in)
| Rule ID | Name | Severity |
|---------|------|----------|
| `sox-1` | Financial Data Integrity | Critical |
| `sox-2` | Segregation of Duties | Critical |
| `sox-3` | Access Logging Completeness | High |
| `sox-4` | PII in Financial Data | High |
| `sox-5` | Approval Trail Verification | Medium |

### HIPAA Rules (Built-in)
| Rule ID | Name | Severity |
|---------|------|----------|
| `hipaa-1` | PHI Detection | Critical |
| `hipaa-2` | Encryption Adequacy | Critical |
| `hipaa-3` | Access Control Verification | High |
| `hipaa-4` | Minimum Necessary Rule | High |
| `hipaa-5` | Data Retention Compliance | Medium |

### GDPR Rules (Built-in)
| Rule ID | Name | Severity |
|---------|------|----------|
| `gdpr-1` | PII Detection | Critical |
| `gdpr-2` | Consent Tracking | Critical |
| `gdpr-3` | Right to Erasure Support | High |
| `gdpr-4` | Data Minimization | High |
| `gdpr-5` | Cross-Border Transfer Check | Medium |

### PCI-DSS Rules (Built-in)
| Rule ID | Name | Severity |
|---------|------|----------|
| `pci-1` | Credit Card Data Detection | Critical |
| `pci-2` | Encryption Standards | Critical |
| `pci-3` | Access Control | High |
| `pci-4` | Audit Trail Completeness | High |
| `pci-5` | Network Segmentation | Medium |

---

## NIST OSCAL Integration (Phase 2)

> **Added**: July 2026  
> **Spec**: OSCAL 1.1.2 ([https://pages.nist.gov/OSCAL/](https://pages.nist.gov/OSCAL/))

### OSCAL Import Flow

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant API
    participant Parser
    participant DB

    User->>Dashboard: Upload OSCAL catalog JSON
    Dashboard->>API: POST /compliance/oscal/validate
    API->>Parser: validate(oscalJson)
    Parser-->>API: { valid, errors, warnings }
    API-->>Dashboard: Validation result

    Dashboard->>API: POST /compliance/oscal/preview
    API->>Parser: parseCatalog(oscalJson)
    Parser-->>API: { groups, totalControls }
    API-->>Dashboard: Preview with selectable groups

    User->>Dashboard: Select groups → Import
    Dashboard->>API: POST /compliance/oscal/import
    API->>Parser: parseCatalog + controlToRule()
    API->>DB: INSERT oscal_catalogs + compliance_rules
    API-->>Dashboard: { importedControls, catalogId }
```

### OSCAL API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/compliance/oscal/validate` | Editor+ | Validate OSCAL JSON structure |
| `POST` | `/compliance/oscal/preview` | Editor+ | Parse catalog — show groups/controls without saving |
| `POST` | `/compliance/oscal/import` | Admin | Import catalog → create compliance rules |
| `GET` | `/compliance/oscal/catalogs` | Any | List imported OSCAL catalogs |
| `DELETE` | `/compliance/oscal/catalogs/:id` | Admin | Delete catalog + cascade to imported rules |
| `GET` | `/compliance/checks/:id/oscal` | Any | Export check as OSCAL Assessment Result JSON |

### Import Request

```json
{
  "catalog": { /* OSCAL catalog JSON */ },
  "framework": "sox",
  "selectedGroups": ["sox-data-integrity", "sox-access-control"]
}
```

### Import Response

```json
{
  "success": true,
  "data": {
    "catalogId": "54e033dd-...",
    "title": "SOX Compliance Controls for AI Agents",
    "version": "2.0.0",
    "framework": "sox",
    "totalControls": 8,
    "importedControls": 8,
    "groups": [
      { "id": "sox-data-integrity", "title": "Data Integrity Controls", "controlCount": 3 },
      { "id": "sox-access-control", "title": "Access Control & Segregation", "controlCount": 2 },
      { "id": "sox-audit", "title": "Audit Trail & Logging", "controlCount": 3 }
    ]
  }
}
```

### OSCAL Assessment Result Export

Export compliance check results as NIST OSCAL Assessment Results:

```json
{
  "assessment-results": {
    "uuid": "...",
    "metadata": {
      "title": "AI Sure Compliance Assessment — SOX Jul 2026",
      "oscal-version": "1.1.2"
    },
    "results": [{
      "findings": [
        {
          "title": "Financial Data Integrity",
          "target": {
            "target-id": "SOX-AI-DI-01",
            "status": { "state": "satisfied" }
          }
        }
      ],
      "observations": [
        {
          "description": "Rule passed — no fabricated financial data detected",
          "methods": ["TEST"]
        }
      ]
    }]
  }
}
```

### OSCAL Parser Features

| Feature | Description |
|---------|-------------|
| **Catalog validation** | Checks for required fields: uuid, metadata.title, groups/controls |
| **Nested groups** | Recursively parses sub-groups within groups |
| **Sub-controls** | Handles control enhancements (e.g., `SOX-AI-DI-01.a`) |
| **Part extraction** | Extracts `statement` and `guidance` prose from control parts |
| **Severity inference** | Extracts from props or infers from keywords (must/shall → critical) |
| **Keyword extraction** | Builds keyword lists from statements for basic evaluation matching |

### Dashboard UI

| Feature | Location |
|---------|----------|
| **Import OSCAL** button | Compliance → Rules tab → header bar |
| **Import Modal** | Framework picker + JSON paste/file upload + group selector |
| **OSCAL Badge** | Purple badge on imported rules in the rules list |
| **Imported Catalogs** | Table below rules showing all catalogs with delete |
| **Export OSCAL** | Button in compliance check detail view (History tab) |

---

## Compliance Check Workflow

```mermaid
sequenceDiagram
  participant User
  participant API
  participant CompService
  participant Agent
  participant DB

  User->>API: POST /compliance/configs/:id/run
  API->>CompService: runComplianceCheck(configId, samples)
  CompService->>DB: Load config + enabled rules (built-in + OSCAL)
  
  alt Custom samples provided
    CompService->>CompService: Use uploaded samples
  else Auto-generate
    CompService->>CompService: generateSamples(framework, agent)
  end

  loop For each rule
    CompService->>Agent: invokeAgent(agent, sampleInput)
    Agent-->>CompService: Agent response
    CompService->>CompService: evaluateRule(rule, response)
    CompService->>CompService: detectPII(response)
  end

  CompService->>DB: Store compliance_checks record
  CompService-->>API: Check results with pass/fail per rule
  API-->>User: Compliance report

  opt Export OSCAL
    User->>API: GET /compliance/checks/:id/oscal
    API->>CompService: exportOscalAssessmentResult(checkId)
    CompService-->>User: OSCAL Assessment Result JSON
  end
```

**Check Results:**
- Status: `passed` | `failed` | `partial`
- Per-rule breakdown with pass/fail + reason
- Sample source: `generated` | `uploaded` | `mixed`
- Export: OSCAL Assessment Result JSON

---

## Rule Management

Rules can be managed via the dashboard or API:

- **Built-in rules**: Cannot be deleted, only enabled/disabled
- **Custom rules**: Full CRUD support
- **Bulk import (CSV/XLSX)**: Upload files with columns: `name`, `description`, `category`, `severity`, `pass_input`, `pass_output`, `fail_input`, `fail_output`
- **OSCAL import**: Upload NIST OSCAL catalog JSON → select control groups → import as rules

---

## Database Tables

| Table | Description |
|-------|-------------|
| `compliance_configs` | Framework configurations with sample rates and retention |
| `compliance_samples` | Encrypted request/response pairs with PII flags |
| `compliance_checks` | Check run results with per-rule scores |
| `compliance_rules` | Framework-specific rules (built-in + custom + OSCAL) |
| `oscal_catalogs` | Imported OSCAL catalog metadata and source JSON |
