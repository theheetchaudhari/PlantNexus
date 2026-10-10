# PlantNexus project status

Authoritative tracker. Last verified: **2026-10-10 (Milestone 4 session)**. Do not mark work complete from plans alone.

**Git:** branch `main` tracking `origin/main` at `51f3bd5` (`feat: complete PlantNexus analytics and AI explanations`). Working tree contains Milestone 4 recovery verification (`backend/src/recovery.js`, `backend/src/recovery.test.js`, updated `server.js` and `server.test.js`, docs).

**Tests this session (executed):** `node --test` → **111 pass / 0 fail** (analytics 50, detector 10, explain 19, recovery 22, HTTP 10 via live Supabase). Prior session report of 85 passing is superseded.

---

## Milestone 1 — Telemetry foundation and analytics API

**Status: COMPLETE in working tree** (not on `origin/main`).

### Completed

- Simulator scenarios healthy / degraded / recovery (`simulator/`).
- Express `GET /api/health`, `POST /api/telemetry` validation + Supabase insert, `GET /api/telemetry`.
- `computeAnalytics` + `GET /api/telemetry/analytics`.
- Hosted `telemetry` table used successfully (GET 200).

### Pending

- Commit/push working tree (only when the user asks).
- Re-verify a live simulator POST this session (**UNVERIFIED today**; previously reported).
- `GET` responses are snake_case vs POST camelCase (known inconsistency; not a blocker).

### Dependencies

Hosted Supabase credentials in `backend/.env`.

### Evidence

- Working tree `server.js`, `analytics.js`, `analytics.test.js`.
- HTTP: health, telemetry GET, analytics GET all 200 (2026-10-10).
- Analytics unit tests: 50 pass.

### Blockers

None for using M1 locally. Uncommitted vs `origin/main`: committed ingest does **not** persist.

---

## Milestone 2 — Deterministic anomaly detection and `POST /api/analyze`

**Status: COMPLETE for detection API; PARTIAL for persistence.**

### Completed

- `detector.js` relative-baseline rules, HEALTHY / DEGRADED / CRITICAL.
- `POST /api/analyze` loads telemetry, runs analytics + detection, returns payload.
- Unit tests for healthy / degraded / critical / insufficient data.
- HTTP: 400 without `machineId`; 200 with `machineId: M-017`.

### Pending

- Apply `20261009194500_create_intelligence_tables.sql` to **hosted** Supabase (**explicit approval required**). Until then `analysisId` stays null.
- Optional: mock Supabase in HTTP tests so CI does not need live credentials.

### Dependencies

Milestone 1 telemetry rows (analyze on `M-017` with `limit: 50` succeeded against live data).

### Evidence

- 10 detector unit tests pass.
- HTTP analyze 200; log: `Persist intelligence_analysis failed: Could not find the table 'public.intelligence_analysis' in the schema cache`.

### Blockers

Hosted intelligence tables **not** applied. Detection still works without them.

---

## Milestone 3 — Evidence-based AI explanation and safe recommendations

**Status: COMPLETE (2026-10-10).**

### Completed

- `explain.js` with five pure inspection tools: `inspectCondition`, `inspectMeasurements`, `inspectIssues`, `inspectRecommendations`, `inspectUncertainty`.
- Deterministic `buildFallbackExplanation` — returns the full output schema; never invents sensors, savings, or recovery outcomes.
- `explainAnalysis(analysis, { env?, fetchImpl? })` — optional OpenAI-compatible provider via `OPENAI_API_KEY`; falls back silently when unconfigured or on provider error.
- `narrativeIsGrounded` — verifies every standalone numeric token in the LLM narrative is an exact value in the facts payload (`Number()` equality; machine-ID digits excluded via lookbehind `(?<![A-Za-z0-9-])`).
- `POST /api/analyze` already calls `explainAnalysis`; `explanation` field is always present in the response.
- **19 unit tests** covering: healthy / degraded / critical / insufficient-data, malformed evidence, null analysis, missing credentials (fetch never called), provider failure, HTTP 401, grounded LLM narrative, ungrounded-number rejection, and `narrativeIsGrounded` unit.
- **Two bugs fixed this session:** (1) healthy narrative contained "savings" — changed to "does not project future conditions"; (2) `narrativeIsGrounded` used substring match causing float imprecision false-positives — replaced with exact `Number()` Set membership + lookbehind regex.

### Pending

- Optional: integration test that `POST /api/analyze` response body includes `explanation` key with correct shape.

### Dependencies

Milestone 2 payload shape. Detection stays independent of AI.

### Evidence

- `node --test` → **85 pass / 0 fail** (2026-10-10, this session).
- `POST /api/analyze` response includes `explanation` with `source: "fallback"` (no `OPENAI_API_KEY` in env).

### Blockers

None.

---

## Milestone 4 — Before-and-after recovery verification

**Status: COMPLETE (2026-10-10).**

### Completed

- `backend/src/recovery.js` module implementing evidence-based recovery validation.
- Compares measurements against healthy baselines using project's existing `METRIC_RULES` (soft/hard relative % tolerances).
- Requires configurable minimum consecutive healthy readings (`minConsecutiveHealthy`, default 3, minimum 2) before declaring recovery.
- Evaluates four distinct deterministic outcomes:
  - `VERIFIED` (verdict: `IMPROVED`): Sustained consecutive healthy readings satisfied.
  - `RECOVERING` (verdict: `PARTIALLY_IMPROVED`): Readings in healthy tolerance but consecutive count not yet met, or measurements showing >=15% reduction in adverse deviation vs peak degradation.
  - `NOT_RECOVERED` (verdict: `NO_IMPROVEMENT` or `DEGRADED`): Persistent or worsening degradation without recovery trend.
  - `INSUFFICIENT_DATA` (verdict: `NO_IMPROVEMENT`): Insufficient readings (< minConsecutive), missing telemetry, or baseline unavailable.
- Evidence-based result returns: `machineId`, `verificationStatus`, `verdict`, `timestamp`, `readingsEvaluated`, `consecutiveHealthy`, `requiredConsecutiveHealthy`, `improvementScore`, `currentCondition`, `metricsComparison` (per-metric current, baseline, deviationPct, adversePct, thresholdPct, status), `reason`, `summary`, and `quality`.
- Endpoints `POST /api/verify-recovery` and `POST /api/recovery/verify` mounted on Express backend.
- Database persistence handling: attempts insert into `public.recovery_verifications`; gracefully catches missing hosted table (`verificationId: null`, HTTP 200 returned).
- 22 unit tests in `recovery.test.js` + 4 integration tests in `server.test.js` (total 26 tests for M4).

### Pending

- Apply `20261009194500_create_intelligence_tables.sql` to hosted Supabase to enable persistence for `recovery_verifications` (blocked on explicit user approval).

### Dependencies

M1 telemetry ingest + M2 metric definitions and baseline rules. Simulator `--scenario recovery` for organic test data.

### Evidence

- `node --test` → **111 pass / 0 fail** (2026-10-10, Milestone 4 session).
- HTTP endpoints `POST /api/verify-recovery` and `POST /api/recovery/verify` tested and passing.

### Blockers

None for verification API. Persistence is degraded (`verificationId: null`) until hosted migration is approved.

---

## Milestone 5 — React dashboard integration

**Status: IN PROGRESS (Task 4 Complete).**

### Completed

- Vite + React 19 + TS scaffold (`frontend/`).
- Task 1: Design System Foundation (CSS tokens, typography, app placeholder).
- Task 2: Application Shell (TopBar, Tabs, Footer), Vite proxy, and `useApiHealth` polling.
- Task 3: API Client and Telemetry Hooks (`fetchTelemetry`, `fetchAnalytics`, TypeScript types, `useTelemetry`, `useAnalytics`). Build successfully verified.
- Task 4: Real-Data Overview Dashboard (`OverviewDashboard`, `MetricCard`, `ConditionBadge`). Real analytics metrics displayed including Energy, Production, Waste, Temperature, and Efficiency with proper data state handling (loading, empty, stale, normal).

### Pending

- Client for analyze (and later recovery).
- Charts / analysis and evidence panels display.

### Dependencies

Stable backend routes (M1–M2 exist).

### Blockers

None to start UI against local API.

---

## Milestone 6 — AWS eligibility-compliant integration

**Status: PLANNED. Not implemented. Eligibility UNVERIFIED.**

### Completed

None in application code.

### Pending

- Read the hackathon’s **actual** AWS rules.
- Propose the smallest compliant service that does **not** replace deterministic detection.
- Implement only after user approval.

### Dependencies

Official eligibility text (not in this repo).

### Blockers

Requirements unknown. Do not invent AWS architecture as “done”.

---

## Milestone 7 — End-to-end testing and submission

**Status: NOT STARTED.**

### Completed

Focused backend `node:test` coverage (66 tests this session). Simulator `--cycles` for short runs.

### Pending

- Scripted demo: healthy → degraded → analyze → (AI) → recovery → verify → dashboard.
- Frontend tests; E2E; submission checklist.
- Commit strategy for uncommitted backend/supabase.

### Blockers

M3–M5 incomplete. M2 persist incomplete on host.

---

## Current milestone and next task

**Current:** Milestones 1–4 complete in working tree. Recovery verification is live with full deterministic test coverage (111 passing tests). DB persistence for intelligence/recovery tables is gracefully handled and pending hosted SQL migration approval.

**Exact next task options (pick one):**

1. **Milestone 5 (React dashboard):** Implement frontend dashboard consuming `GET /api/health`, `GET /api/telemetry`, `POST /api/analyze`, and `POST /api/verify-recovery`.
2. **Ops (approval required):** Apply `20261009194500_create_intelligence_tables.sql` to hosted Supabase, confirming `analysisId` and `verificationId` are non-null on future calls.

Do not commit, deploy, or modify hosted Supabase without explicit user approval.
