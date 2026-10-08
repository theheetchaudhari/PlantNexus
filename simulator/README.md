# PlantNexus Simulator (M1.4 Backend Integration)

Lightweight factory simulator generating telemetry for machine `M-017` with healthy, degraded, and recovery operating scenarios, and streaming records to the local backend ingestion endpoint.

## Prerequisites
- Python 3.10+ (Standard library only; zero external dependencies).

## Setup
The virtual environment is created at `.venv/`. To activate:

- **Windows (PowerShell):**
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate.bat
  ```

## Running the Simulator

> **Note:** Execute commands from inside the `simulator` directory (`cd simulator`).

By default, every emitted telemetry payload is displayed in the terminal and automatically transmitted via HTTP POST to `http://localhost:3001/api/telemetry`.

### 1. Healthy Scenario (Default)
Generates baseline telemetry under normal healthy conditions:
```bash
python main.py --scenario healthy
# Or simply (defaults to healthy):
python main.py
```

### 2. Degraded Scenario
Simulates equipment stress and degradation (+42% energy, -7% production rate, +28% waste, +12% temperature):
```bash
python main.py --scenario degraded
```

### 3. Recovery Scenario
Simulates a machine progressively returning from degraded conditions toward the healthy baseline across successive telemetry cycles:
```bash
python main.py --scenario recovery
```

### Controlled Cycles (Testing)
Limit the number of emitted records using `--cycles <N>`:
```bash
python main.py --scenario healthy --cycles 3
python main.py --scenario degraded --cycles 5
python main.py --scenario recovery --cycles 10
```

### Custom Backend URL
To send telemetry to an alternate ingestion URL:
```bash
python main.py --backend-url http://localhost:3001/api/telemetry
```

### Graceful Offline Handling
If the backend server is stopped or unreachable, the simulator prints a warning and continues running without crashing.
