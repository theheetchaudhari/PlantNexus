# PlantNexus — coding agent instructions

PlantNexus is a hackathon MVP for **industrial plant monitoring**: a Python simulator emits machine telemetry, Express ingests it into hosted Supabase, and the backend computes analytics and **deterministic** anomaly detection. The intended demo path is simulator → ingest → analytics → detection → evidence-based AI explanation → simulated recovery → measured verification → React dashboard. Do **not** control real industrial equipment.

## Architecture (working tree)

| Component | Stack | Role |
| --- | --- | --- |
| `simulator/` | Python 3.10+, stdlib only | Emits camelCase telemetry (`M-017`; healthy / degraded / recovery) to `POST /api/telemetry` |
| `backend/` | Node CommonJS, Express 5, `@supabase/supabase-js` | Health, ingest, read, analytics, `POST /api/analyze` |
| `supabase/` | SQL migrations | `telemetry` (in repo); `intelligence_analysis` + `recovery_verifications` (in repo, **not** on hosted DB as of 2026-10-10) |
| `frontend/` | Vite + React 19 + TypeScript | Scaffold only; **no** API integration |

Backend is CommonJS (`"type": "commonjs"`). Reuse existing dependencies; do not add packages unless the milestone requires it. `supertest` is listed but unused (`server.test.js` uses `fetch`).

**Preserve working features:** simulator scenarios, ingest validation, Supabase `telemetry` insert/read, `computeAnalytics`, `detectAnomalies`, and existing tests. Do not rewrite committed simulator behavior.

## Hard constraints

- Never modify **Shivaay Enterprises** or its database.
- Never print, log, or commit secrets. Never commit `.env` files. Root `.gitignore` includes `.env` and `/backend/.env`.
- Never run destructive SQL (`DROP`, `TRUNCATE`, `DELETE` without a scoped filter) or deploy / `supabase db push` without **explicit user approval**.
- Never invent hosted database state or test results. Only claim tests passed if you executed them in this session.
- Core detection must stay deterministic and independent of AI. AI may only explain **real** evidence from detection/analytics; it must not invent machine conditions.
- Do not implement actual equipment control.

## How to work

- Prefer **small, cohesive milestones**. Implement only the requested milestone.
- Inspect **relevant files** only; do not repeatedly scan the whole repo (skip `node_modules`, `.git`, `dist`, `.venv`, caches).
- Distinguish **committed** `origin/main` from the **uncommitted** working tree (analytics, detector, live ingest, tests, `supabase/`).
- After each completed milestone, update `docs/PROJECT_STATUS.md` with evidence, blockers, and the next task.
- Run **focused** regression tests (`node --test` on the files you changed). `src/server.test.js` loads `backend/.env` and hits **hosted** Supabase.
- End the report with: files changed, tests run (command + pass/fail counts), blockers, next task.

## Env names (no values)

Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `PORT` (default `3001`). Simulator: `--backend-url` (default `http://localhost:3001/api/telemetry`).
