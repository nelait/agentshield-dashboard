# AgentShield — Session Q&A Log
**Session dates:** March 7–8, 2026

---

## Features Implemented

### Audit Log — Search, Filter & Pagination
**Request:** Add filter criteria (agents, applications, errors) and pagination to the audit log.
**Implementation:**
- Multi-criteria ILIKE search on the backend
- Dynamic filter dropdowns (GET `/audit/filters`)
- Server-side pagination with page controls in the UI

### Agent Evaluation Module — Three-Layer Framework
**Request:** Design and implement an evaluation module based on 2026 best practices — Node-level, Session-level, System-level evaluation, LLM-as-a-Judge, agent simulation, and Human-in-the-Loop (HITL) review.
**Implementation:**
- **Database:** `005_evaluation.sql` — `eval_suites`, `eval_runs`, `eval_reviews` tables
- **Backend:** `EvaluationService` with 12 API routes, LLM-as-a-Judge with CoT grading, 5-persona simulation engine, HITL review workflow
- **Frontend:** `Evaluations.jsx` with 4 tabs (Test Suites, Run Evaluation, History, Reviews), `ScoreRing` visualization component

### Evaluation Settings Module
**Request:** Move all hardcoded evaluation settings to a configurable UI with clear separation of rule-based vs LLM-as-a-Judge.
**Implementation:**
- **Frontend:** New "📊 Evaluation" tab in Settings with 3 cards:
  - 📏 **Rule-Based Judge** — pass threshold, safety regex patterns (add/remove/toggle), default scores per dimension, confidence level
  - 🧠 **LLM-as-a-Judge** — HITL confidence threshold, judge temperature, max tokens, editable system prompt
  - ⚖️ **Scoring Weights** — accuracy/safety/latency/consistency percentages with 100% validation, configurable latency tiers
- **Backend:** `_loadEvalSettings()` with 5-minute in-memory cache. All four core methods now read from DB settings with inline fallback defaults.

---

## Conceptual Q&A

### How does rule-based evaluation work? Where are the rules? Is there hardcoding?
**Rule-based mode** (`_ruleBasedJudge`): Uses keyword matching for task_success, configurable regex patterns for safety, and fixed default scores for other dimensions. Always returns a low confidence to trigger HITL review.

**LLM-as-a-Judge mode** (`_judgeScenario`): Sends a structured prompt to OpenAI/Anthropic with Chain-of-Thought reasoning, returns scores 0–10 per dimension with confidence and flags.

**Previously hardcoded values** (now configurable via Evaluation Settings):
- Pass threshold (6.0), HITL confidence threshold (0.6)
- Score weights (accuracy 50%, safety 30%, latency 10%, consistency 10%)
- Latency tiers, safety regex patterns, judge temperature (0.1)
- Default model names

### What is the significance of simulation personas in test suites?
When `eval_mode = 'simulation'`, the system auto-generates test scenarios using 5 personas:

| Persona | Purpose |
|---|---|
| 🙂 Happy Path | Baseline accuracy with clear requests |
| 😕 Confused | Vague/ambiguous inputs to test clarification |
| 😡 Adversarial | Prompt injection & jailbreak attempts (2x weight) |
| 🔄 Edge Case | Empty strings, XSS, emojis, huge inputs |
| 📊 Data-Heavy | Large payloads for performance testing |

Each persona auto-generates 3–6 scenarios with agent-specific success criteria. This eliminates the need to write test cases manually for initial agent assessment.

### What is the significance of golden set vs test suite?

| Aspect | Test Suite | Golden Set |
|---|---|---|
| Mutability | Freely editable | 🔒 Locked after creation |
| Purpose | Active development | Regression benchmark |
| Use case | Iterating on agent | Proving no regression between versions |

Golden sets ensure **reproducible, tamper-proof comparisons** — critical for auditing in regulated environments (SOX/HIPAA). Any score difference between runs is guaranteed to come from agent changes, not test changes.

### What is "degraded" health status in Agent Registry?
Three-state health model based on periodic HTTP health checks:

| Scenario | Status |
|---|---|
| HTTP response < 400 | ✅ healthy |
| HTTP response 400–499 | ⚠️ degraded |
| Connection failure (below threshold) | ⚠️ degraded |
| Connection failure ≥ threshold consecutive times | 🔴 unhealthy |

"Degraded" = **warning state** — agent is reachable but not fully functional (e.g., auth expired, rate limited), or just had its first connection failure but hasn't hit the unhealthy threshold yet.
