# PlantNexus project status

Authoritative tracker. Last verified: **2026-10-10 (Milestone 3 session)**. Do not mark work complete from plans alone.

**Git:** branch `main` tracking `origin/main` at `52a2724` (`feat: connect simulator to backend`). Large **uncommitted** working tree: backend analytics/detector/explain/analyze, tests, `@supabase/supabase-js`, `supabase/` migrations, `.gitignore` (`/backend/.env`). **Do not discard this work.**

**Tests this session (executed):** `node --test` → **85 pass / 0 fail** (analytics 50, detector 10, explain 19, HTTP 6 via live Supabase). Prior session report of 66 passing is superseded.

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

**Status: NOT STARTED** except simulator recovery **scenario** and unused SQL table.

### Completed

- Simulator `--scenario recovery` interpolates baselines over 10 steps.
- Migration defines `recovery_verifications` (not on host).

### Pending

- Compare windowed metrics before vs after recovery; verdicts IMPROVED / PARTIALLY_IMPROVED / NO_IMPROVEMENT / DEGRADED.
- API + persist (after tables exist).
- No real machine actuation.

### Dependencies

M1 telemetry + M2 condition labels. Simulator recovery for demo data.

### Blockers

Same missing hosted intelligence/recovery tables.

---

## Milestone 5 — React dashboard integration

**Status: NOT STARTED.**

### Completed

Vite + React 19 + TS scaffold (`frontend/`).

### Pending

- Client for health, telemetry, analytics, analyze (and later recovery).
- Charts / condition display; proxy or CORS already open on API.
- `vite.config.ts` has **no** API proxy.

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

**Current:** Milestones 1–3 complete in working tree. M2 persist blocked on hosted SQL. M3 explanation live in fallback mode; LLM path activates when `OPENAI_API_KEY` is set in `backend/.env`.

**Exact next task options (pick one):**

1. **Ops (approval required):** Apply `20261009194500_create_intelligence_tables.sql` to hosted Supabase, then re-run `POST /api/analyze` to confirm `analysisId` is non-null.
2. **Milestone 4:** Before/after recovery verification API — requires intelligence tables on host first.
3. **Milestone 5:** React dashboard — wire `GET /api/health`, `GET /api/telemetry`, `POST /api/analyze`; no hosted table dependency.

Do not commit, deploy, or modify hosted Supabase without explicit user approval.
