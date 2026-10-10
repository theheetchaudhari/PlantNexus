# PlantNexus — Industrial Resource Intelligence Platform

PlantNexus is an industrial plant intelligence and monitoring platform designed for real-time telemetry ingestion, deterministic anomaly detection, evidence-based AI root cause explanation, and measurable before-and-after recovery verification.

---

## Architecture Overview

```
[ Factory Simulator ] (Python 3.10+ stdlib)
       │ HTTP POST /api/telemetry (M-017; healthy / degraded / recovery)
       ▼
[ PlantNexus Backend ] (Node.js Express 5 + CommonJS)
       │ Ingestion & Analytics Engine
       ├─► [ Hosted Supabase ] (PostgreSQL: telemetry, intelligence_analysis, recovery_verifications)
       ├─► [ Deterministic Detector ] (Tolerance baselines: HEALTHY, DEGRADED, CRITICAL)
       ├─► [ Evidence Grounding ] (Pure inspection tools + grounded AI narrative fallback)
       └─► [ Recovery Verifier ] (Sustained consecutive healthy streaks & improvement scoring)
       ▲
       │ /api/health, /api/telemetry, /api/analyze, /api/verify-recovery
[ React Dashboard ] (Vite + React 19 + TypeScript + Recharts)
  ├── 1. Overview Tab (Real-time analytics, KPIs, machine conditions)
  ├── 2. Telemetry Trends (Time-series Area charts for Energy, Production, Waste, Temp)
  ├── 3. Analysis & Evidence (Anomaly detection, deviation metrics, AI explanation)
  └── 4. Recovery Verification (Consecutive healthy progress, before/after metrics)
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18+ (tested on v20+)
- **Python**: 3.10+ (Standard library only; zero pip dependencies needed)
- **Supabase**: Hosted PostgreSQL project credentials in `backend/.env`

### 2. Backend Service
```bash
cd backend
npm install
npm test            # Run 111 unit & integration regression tests
npm start           # Starts on http://localhost:3001
```

### 3. Frontend Dashboard
```bash
cd frontend
npm install
npm run build       # Typecheck and build production bundle
npm run dev         # Starts on http://localhost:5173 (proxies /api to backend)
```

### 4. Telemetry Simulator
```bash
cd simulator
# Windows PowerShell
.venv\Scripts\python.exe main.py --scenario healthy
```

---

## End-to-End Demo Lifecycle Walkthrough

To demonstrate the full industrial lifecycle from healthy operation to degradation and recovery verification:

### Phase 1: Normal Baseline Operation (Healthy)
1. Run healthy cycles from the simulator:
   ```bash
   python main.py --scenario healthy --cycles 5
   ```
2. Open the dashboard at `http://localhost:5173`.
3. In **Overview** and **Telemetry Trends**, observe stable baseline values for machine `M-017` (~42 kW energy, ~115 units/hr production, ~1.2 kg waste, ~68 °C temperature).
4. In **Analysis & Evidence**, click **Run Analysis** → Condition is `HEALTHY` with zero adverse deviations.

### Phase 2: Equipment Degradation (Degraded / Critical)
1. Simulate industrial equipment stress (+42% energy spike, +12% temperature elevation):
   ```bash
   python main.py --scenario degraded --cycles 5
   ```
2. In **Telemetry Trends**, observe immediate upward spikes in Energy (reaching ~64 kW) and Temperature (reaching ~77 °C).
3. In **Analysis & Evidence**, click **Run Analysis** → Condition changes to `CRITICAL` or `DEGRADED`.
   - The **Evidence Deviations Grid** highlights critical energy and temperature tolerances exceeded.
   - The **Grounded AI Explanation** cites strictly verified numerical evidence and provides targeted action recommendations.
4. In **Recovery Verification**, click **Run Verification** → Status is `NOT_RECOVERED` (Verdict: `DEGRADED`, Consecutive: `0/3`).

### Phase 3: Simulated Machine Maintenance & Recovery
1. Run the progressive recovery simulation:
   ```bash
   python main.py --scenario recovery --cycles 6
   ```
2. In **Recovery Verification**, click **Run Verification** → Status transitions to `RECOVERING` (Verdict: `PARTIALLY_IMPROVED`, Score > 0.50).

### Phase 4: Sustained Recovery Verification
1. Resume healthy baseline operation to prove stability:
   ```bash
   python main.py --scenario healthy --cycles 4
   ```
2. In **Recovery Verification**, click **Run Verification** → Status confirms `VERIFIED` (Verdict: `IMPROVED`, Consecutive: `3/3+`, Score: `1.0`).
   - Before-and-after baseline versus current comparisons show all metrics back within green tolerances.

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend service health check |
| `POST` | `/api/telemetry` | Ingest camelCase machine telemetry payload |
| `GET` | `/api/telemetry?machineId=M-017&limit=100` | Fetch recent telemetry records |
| `GET` | `/api/telemetry/analytics?machineId=M-017&limit=1000` | Statistical analytics & summaries |
| `POST` | `/api/analyze` | Deterministic anomaly detection & grounded AI explanation |
| `POST` | `/api/verify-recovery` | Before-and-after recovery verification & streak validation |
| `POST` | `/api/recovery/verify` | Alias for verify-recovery |

---

## Safety Constraints
- Core anomaly detection is strictly deterministic and never hallucinates conditions.
- AI narratives only explain verified numeric telemetry deviations.
- Read-only simulation: does not control physical industrial hardware.
