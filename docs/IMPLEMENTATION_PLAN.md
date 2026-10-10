# PlantNexus implementation plan (hackathon MVP)

Goal: the **smallest end-to-end demo** — simulate a machine, ingest telemetry, show analytics, detect degradation deterministically, explain with evidence, simulate recovery, measure improvement, display on a dashboard. Prefer a working demo over extra models, multi-machine fleets, or real PLC control.

Work in the **existing** Express + hosted Supabase + Python simulator + Vite React stack. Apply migrations only with explicit approval.

---

## Milestone 1 — Telemetry foundation and analytics API

**Objective:** Persist and summarize telemetry.

**Subtasks:** Done in working tree (ingest, read, `computeAnalytics`, GET analytics). Remaining: commit when asked; optional camelCase/snake_case alignment.

**Files likely to change:** none required unless aligning response shapes (`backend/src/server.js`).

**Dependencies:** Hosted `telemetry` table (already in use).

**Acceptance:** Simulator POST → row in Supabase → GET list + GET analytics 200 with non-empty quality object.

**Tests:** `analytics.test.js`; HTTP health/telemetry/analytics. Do not claim pass without running.

**Done when:** Criteria met and `PROJECT_STATUS.md` updated. **Met in working tree on 2026-10-10.**

---

## Milestone 2 — Deterministic anomaly detection and `POST /api/analyze`

**Objective:** Classify HEALTHY / DEGRADED / CRITICAL from evidence baselines, no AI.

**Subtasks:** Detector module + route (done). Remaining: apply intelligence SQL on host; confirm `analysisId`; keep analyze 200 if persist fails.

**Files:** `backend/src/detector.js`, `server.js`, `detector.test.js`, `server.test.js`; `supabase/migrations/20261009194500_create_intelligence_tables.sql`.

**Dependencies:** M1.

**Acceptance:** Analyze on healthy vs degraded series matches detector tests; HTTP 400 without `machineId`; 200 with evidence arrays. Persistence optional until tables exist.

**Tests:** `detector.test.js` + analyze cases in `server.test.js`.

**Done when:** Detection acceptance met. **Detection met; hosted persist not met.**

---

## Milestone 3 — Evidence-based AI explanation (NEXT)

**Objective:** Narrate **existing** detection evidence; safe, non-controlling recommendations.

**Subtasks:**

1. Add a small explanation module that takes `{ condition, evidence, metrics, recommendations, analytics }` and returns `{ explanation, source, error }`.
2. Call it from `POST /api/analyze` **after** `detectAnomalies`.
3. If the provider fails or returns empty: keep detection fields; set explanation error; **do not** change `condition`.
4. Prompt must forbid inventing sensors, faults, or metrics not in evidence.
5. Env: new provider key name only; never commit values.

**Files likely to change:** `backend/src/explain.js` (new), `server.js`, tests, `backend/package.json` only if a client lib is required (prefer `fetch` + existing stack).

**Dependencies:** M2 payload. Optional: hosted `intelligence_analysis` to store explanation later — not required for demo.

**Acceptance:**

- Same telemetry → same `condition` with explanation on or off.
- Fixture with CRITICAL energy evidence → explanation mentions energy deviation numbers from evidence.
- Empty evidence → no invented fault story.
- Provider down → 200 + detection + error, not 500 unless the process crashes.

**Tests:** Pure tests with a fake provider; one HTTP test with stub if possible. Never hit a paid API in default `npm test` unless gated.

**Done when:** Tests pass, status doc updated, no detector threshold changes unless requested.

---

## Milestone 4 — Before-and-after recovery verification

**Objective:** Prove simulated recovery with measured deltas, not a button that claims success.

**Subtasks:** Windowed compare (e.g. last N vs previous N, or pre/post analyze timestamps); map to IMPROVED / PARTIALLY_IMPROVED / NO_IMPROVEMENT / DEGRADED; `POST /api/recovery/verify`; persist if table exists.

**Files:** `backend/src/recovery.js` (new), `server.js`, tests; reuse `computeAnalytics`.

**Dependencies:** M1–M2; simulator `--scenario recovery`. Hosted `recovery_verifications` after approved push.

**Acceptance:** After healthy baseline + degraded + recovery cycles, verify returns IMPROVED or PARTIALLY_IMPROVED with metric deltas. Degraded-only window does not report IMPROVED.

**Tests:** Deterministic fixtures (no RNG). Optional live test gated.

**Done when:** Route + unit tests + status update. Still **no** equipment control.

---

## Milestone 5 — React dashboard

**Objective:** Operator-visible live condition and evidence.

**Subtasks:** Fetch health, latest telemetry, analytics, analyze for `M-017`; display condition, charts or tables, recommendations/explanation, later recovery verdict. Vite proxy optional (`localhost:3001`).

**Files:** `frontend/src/*`, `vite.config.ts`; no backend rewrite.

**Dependencies:** M1–M3 for a convincing screen; M4 when verify exists.

**Acceptance:** Browser: load app, see machine id, latest metrics, condition from analyze. Empty/error states shown.

**Tests:** At least one client unit or manual browser verification recorded in status (do not fake).

**Done when:** Demo can be shown without curling the API.

---

## Milestone 6 — AWS (after eligibility)

**Objective:** Satisfy hackathon AWS rules **if any**, without replacing the MVP path.

**Subtasks:** Obtain official eligibility text; map one service; implement the thinnest slice (e.g. Bedrock for M3 explanation, or Gateway in front of Express). Document as proposal until deployed.

**Files:** TBD after rules. Do not add AWS SDK “just in case”.

**Dependencies:** Written eligibility. Prefer wiring AWS into M3 explanation rather than a fifth backend.

**Acceptance:** User confirms rules; one real AWS call in the demo **or** documented exemption.

**Tests:** Mock at unit level; one manual proof with redacted logs.

**Done when:** Eligibility either met or explicitly waived.

---

## Milestone 7 — E2E and submission

**Objective:** Repeatable demo and clean repo.

**Subtasks:** Script: start API, healthy cycles, degraded cycles, analyze, (explain), recovery cycles, verify, dashboard. README how-to. Commit remaining work when asked. Do not commit `.env`.

**Files:** `README.md`, optional `scripts/demo.*`, tests.

**Dependencies:** M1–M5 (M6 if required).

**Acceptance:** A third person can run the README path and see degraded then improved condition.

**Tests:** Backend `npm test`; listed demo commands executed once.

**Done when:** Status shows M7 complete with commands and dates.

---

## Suggested sequence

M1 (done locally) → M2 persist (ops/approval) → **M3 explanation** → M4 verify → M5 dashboard → M6 only if required → M7. Skip extras (auth UI, multi-tenant, real PLC, training ML on telemetry) for this MVP.
