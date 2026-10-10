# PlantNexus architecture

Status language: **IMPLEMENTED** (code + evidence), **PARTIALLY IMPLEMENTED**, **PLANNED**, **UNVERIFIED**.

This document describes the **current working tree** on 2026-10-10. Much of the backend intelligence path is **uncommitted**; `origin/main` still has an ingest endpoint that only logs and returns 201 (no Supabase).

## System overview

```
Python simulator  --POST JSON-->  Express (localhost:3001)
                                      |
                                      v
                              Hosted Supabase
                                telemetry  [IMPLEMENTED; live GET verified]
                         intelligence_analysis  [CODE WRITES; TABLE MISSING ON HOST]
                         recovery_verifications [MIGRATION ONLY]
                                      ^
                                      |
                         computeAnalytics + detectAnomalies
                         GET analytics, POST /api/analyze
                                      |
                                      x  React dashboard (scaffold; no client)
```

| Component | Responsibility |
| --- | --- |
| Simulator | Generate jittered telemetry for one virtual machine; HTTP POST; survive backend downtime |
| Express | Validate ingest; persist/read telemetry; analytics; deterministic analyze; evidence-based explanation |
| `analytics.js` | Pure aggregates; no I/O |
| `detector.js` | Pure relative-baseline detection; no I/O / AI |
| `explain.js` | Evidence-based AI explanation; deterministic fallback; optional OpenAI-compatible provider |
| Supabase | Store rows; RLS enabled |
| Frontend | Unused Vite template |

## Directory structure (source)

```
PlantNexus/
  backend/src/server.js          Express app + routes
  backend/src/analytics.js       computeAnalytics
  backend/src/detector.js        detectAnomalies
  backend/src/explain.js         explainAnalysis (Milestone 3)
  backend/src/*.test.js          node:test
  simulator/{main,machine,config}.py
  frontend/src/{main,App}.tsx    Vite scaffold
  supabase/migrations/           SQL
  supabase/config.toml           Local CLI config (project_id PlantNexus)
```

Excluded from architecture: `node_modules`, `.venv`, build outputs.

## Telemetry data flow

1. `VirtualMachine.generate_telemetry()` builds a camelCase payload.
2. `send_telemetry` POSTs JSON to `DEFAULT_BACKEND_URL` (`http://localhost:3001/api/telemetry`), timeout 3s; warnings on failure, loop continues.
3. Express validates, maps to snake_case, `insert` into `telemetry`, returns 201 with camelCase `data`.
4. Reads (`GET /api/telemetry`, analytics, analyze) select newest-first (`timestamp` DESC).

**IMPLEMENTED:** this path in the working tree. Live `GET /api/telemetry` and `GET /api/telemetry/analytics` returned HTTP 200 on 2026-10-10. **UNVERIFIED this session:** a fresh simulator POST round-trip (ingest was previously reported verified).

### Fields, units, DB mapping

| JSON (simulator / POST) | DB column | Type | Unit |
| --- | --- | --- | --- |
| `timestamp` | `timestamp` | ISO-8601 string → `TIMESTAMPTZ` | UTC |
| `machineId` | `machine_id` | `TEXT` | id, default `M-017` |
| `energyKw` | `energy_kw` | finite number → `DOUBLE PRECISION` | kW |
| `productionRate` | `production_rate` | finite number → `DOUBLE PRECISION` | **assumed units/hour** (not stored as a unit) |
| `wasteKg` | `waste_kg` | finite number → `DOUBLE PRECISION` | kg |
| `temperature` | `temperature` | finite number → `DOUBLE PRECISION` | °C |
| — | `id` | identity bigint | — |
| — | `received_at` | `TIMESTAMPTZ` default `now()` | ingest time |

Simulator baselines (`config.py`): energy 45 kW, production 120, waste 1.10 kg, temperature 68.5 °C, poll 2s. Degradation multipliers: energy ×1.42, production ×0.93, waste ×1.28, temperature ×1.12. Recovery interpolates degraded → healthy over `DEFAULT_RECOVERY_STEPS` (10).

**GET `/api/telemetry` returns raw snake_case rows**, not camelCase.

## API (working tree)

All JSON. CORS enabled. Server **throws at process start** if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing.

### `GET /api/health` — IMPLEMENTED

`{ "status": "ok", "service": "plantnexus-backend" }` — 200. No DB.

### `POST /api/telemetry` — IMPLEMENTED (working tree)

Required body fields: `timestamp`, `machineId`, `energyKw`, `productionRate`, `wasteKg`, `temperature`.

| Error | Status | Body |
| --- | --- | --- |
| Missing / null / `""` | 400 | `{ success: false, error: "Missing required fields: …" }` |
| Non-finite numerics | 400 | `{ success: false, error: "<field> must be a finite number" }` |
| Empty `machineId` | 400 | `{ success: false, error: "machineId must be a non-empty string" }` |
| Bad `timestamp` | 400 | `{ success: false, error: "timestamp must be a valid date string" }` |
| Supabase insert error | 500 | `{ success: false, error: "Failed to save telemetry" }` |
| Unexpected | 500 | `{ success: false, error: "An unexpected error occurred while saving telemetry" }` |

Success 201: `{ success, message: "Telemetry saved", data: { id, timestamp, machineId, energyKw, productionRate, wasteKg, temperature } }`.

`limit` / query validation: **not** applied on POST. Empty-string timestamp is treated as missing (unlike committed code, which only checked null/undefined).

### `GET /api/telemetry` — IMPLEMENTED

Query: `machineId` (optional), `limit` (optional, default `100`, passed to `Number(limit)` with **no** finite/positive check).

Success: `{ success: true, data: <rows[]> }` (snake_case). Failure: 500 `"Database error"` or `"Server error"`.

### `GET /api/telemetry/analytics` — IMPLEMENTED

Query: `machineId` optional, `limit` default `1000`. Loads rows then `computeAnalytics(data)`. `{ success: true, data: <analytics> }`. Same 500 errors as read.

### `POST /api/analyze` — IMPLEMENTED (detection); persist **degraded**

Body: `{ machineId: string (required), limit?: number default 100 }`.

400 if missing `machineId` or non-positive `limit`. 200 always on successful detect, even if persist fails:

```
{ success: true, data: {
  analysisId, machineId, condition, confidence, summary,
  metrics, evidence, recommendations, quality, analytics
} }
```

`analysisId` is null when insert fails. **Verified 2026-10-10:** hosted insert error `Could not find the table 'public.intelligence_analysis' in the schema cache`; HTTP still 200.

The `explanation` field is always present; it contains the full `explainAnalysis` result (see §Explanation below).

No other routes. No recovery-verify or dashboard APIs.

## Analytics calculations — IMPLEMENTED

Pure functions in `analytics.js`. Contract: input is **newest-first** snake_case rows. `latestCondition` is `records[0]`.

- Energy: avg, peak, validReadings (kW)
- Production: avg, validReadings (units/hour)
- Waste: total, avg, validReadings (kg)
- Temperature: avg, peak (°C)
- Efficiency: mean of `energy_kw / production_rate` and `waste_kg / production_rate` only where `production_rate > 0`
- Quality: `empty` | `ok` | `degraded` with warnings for invalid fields / insufficient pairs
- Invalid / non-finite values skipped (`toFiniteNumber`)

**Not** in analytics: anomaly thresholds (those are in `detector.js`).

## Detection — IMPLEMENTED (deterministic)

`detectAnomalies(records)`: subject = `records[0]`; baseline = mean of `records[1..]` with ≥5 finite history values per metric.

Adverse: energy / waste / temperature **high**; production **low**. Soft / hard relative %:

| Metric | Soft (DEGRADED) | Hard (CRITICAL) |
| --- | --- | --- |
| energy | 15% | 35% |
| production | 5% | 15% |
| waste | 15% | 35% |
| temperature | 8% | 20% |

Condition = max severity across scored metrics. Confidence from baseline depth and metric coverage. Recommendations are **fixed strings** from `METRIC_RULES`, not an LLM. Empty series → `HEALTHY` + `insufficient_data` + confidence 0.

## Explanation — IMPLEMENTED (Milestone 3)

`explainAnalysis(analysis, { env?, fetchImpl? })` in `explain.js`. Called from `POST /api/analyze` after detection; result added to response under `explanation`.

### Inspection tools (pure, synchronous)

| Function | Purpose |
| --- | --- |
| `inspectCondition` | Validates condition/severity/confidence from analysis |
| `inspectMeasurements` | Normalises all evidence items; omits malformed |
| `inspectIssues` | Adverse measurements only, critical-first then adversePct desc |
| `inspectRecommendations` | Filters non-string/empty items from detector recommendations |
| `inspectUncertainty` | Quality status + warnings + human note |

### Output schema (both fallback and LLM)

```
{
  condition,           // "HEALTHY" | "DEGRADED" | "CRITICAL"
  severity,            // "none" | "degraded" | "critical" | "insufficient"
  issues,              // adverse measurements, critical-first
  measurements,        // all normalised measurements
  narrative,           // 2-4 sentence plain-English summary
  recommendedActions,  // string[] from detector (not invented)
  verificationSuggestion, // string — how to verify after action
  uncertainty,         // { status, warnings[], note }
  source,              // "fallback" | "llm"
  error                // null or error string
}
```

### Provider configuration

| Env variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | _(none — provider disabled if absent)_ | Bearer token for OpenAI-compatible API |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Chat Completions base URL |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name passed to the provider |

If `OPENAI_API_KEY` is absent or blank, `explainAnalysis` returns the deterministic fallback without calling `fetch`.

### Grounding check

`narrativeIsGrounded(narrative, facts)` verifies every standalone numeric token in the LLM narrative is an exact value present in the facts payload (using `Number()` equality, not substring search). Numbers embedded inside identifiers like `M-017` are skipped via a lookbehind regex `(?<![A-Za-z0-9-])`. If grounding fails, the fallback narrative is used and `source` is `"fallback"`.

## Database

### `telemetry` — IMPLEMENTED in repo; **live table exists** (GET 200)

Migration `20261009190500_create_telemetry_table.sql`. RLS **enabled**, **no policies** in that file. Backend uses **service role** (bypasses RLS). Anon access: **UNVERIFIED** / likely blocked.

### `intelligence_analysis` / `recovery_verifications` — PARTIALLY IMPLEMENTED

Migration `20261009194500_create_intelligence_tables.sql` exists (uncommitted). Policies: service_role ALL; anon/authenticated SELECT.

**Hosted application: NOT PRESENT** (analyze persist error 2026-10-10). Do not assume these tables exist until `db push` is explicitly approved and re-verified.

`config.toml` references `./seed.sql`; **file is absent**. Local Supabase stack: **UNVERIFIED** (app uses hosted URL from `.env`).

## Environment

| Name | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | `backend/.env` | Hosted project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/.env` | Server-side client |
| `PORT` | optional | Default 3001 |
| `OPENAI_API_KEY` | `backend/.env` (optional) | LLM provider bearer token |
| `OPENAI_BASE_URL` | `backend/.env` (optional) | LLM base URL (default OpenAI) |
| `OPENAI_MODEL` | `backend/.env` (optional) | LLM model name (default `gpt-4o-mini`) |
| Root `.env.example` | empty | Placeholder |

Never document secret values. Simulator has no `.env`.

## Deployment / AWS

- **IMPLEMENTED:** local `npm start` / `npm run dev` (nodemon); simulator `python main.py`.
- **NOT IMPLEMENTED:** Docker, IaC, CI, AWS resources, frontend hosting.
- AWS mentions in `supabase/config.toml` are **upstream CLI defaults** (Cognito/S3 placeholders), not PlantNexus AWS usage.
- **PROPOSAL only (eligibility unverified):** keep detection in Express; if the hackathon requires AWS, add a thin eligible service (for example Bedrock **only** to rephrase existing evidence, or API Gateway in front of the API) after reading the official rules. Do not treat this as done.

## Feature register

| Feature | Status | Evidence |
| --- | --- | --- |
| Simulator healthy/degraded/recovery | IMPLEMENTED | `machine.py`, `config.py`; not re-run this session |
| Health endpoint | IMPLEMENTED | HTTP test 200 |
| Telemetry persist + read | IMPLEMENTED (working tree) | Code + GET 200 vs hosted |
| Analytics module + GET | IMPLEMENTED | 50 unit tests pass; GET 200 |
| Deterministic detect + POST /api/analyze | IMPLEMENTED | 10 unit tests; HTTP 200 |
| Persist analysis rows | PARTIALLY IMPLEMENTED | Code insert; hosted table missing |
| Evidence-based AI explanation (`explain.js`) | IMPLEMENTED | 19 unit tests pass (2026-10-10); fallback + grounded LLM path; provider optional |
| Recovery verification API | PLANNED | Table SQL only; simulator recovery ≠ measured verdict |
| React dashboard / API client | PLANNED | Vite template `App.tsx` |
| AWS integration | PLANNED / UNVERIFIED eligibility | No app AWS code |
| Intelligence migrations on host | UNVERIFIED → **false** | Explicit missing-table error |

## Target architecture (proposed)

Keep current simulator → Express → hosted Supabase. Add, in order: apply intelligence migrations (approval); evidence-only AI explanation API; before/after recovery compare using `recovery_verifications`; React dashboard reading telemetry + analyze; optional AWS wrapper **after** eligibility check; end-to-end demo script. Detection stays local and deterministic.
