# PlantNexus Simulator (M1.1 Foundation)

Lightweight factory simulator generating healthy baseline telemetry for machine `M-017`.

## Prerequisites
- Python 3.10+ (Standard library only; zero external dependencies required for M1.1).

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

Run continuously (emits a telemetry record every 2 seconds):
```bash
python main.py
```

Run for a specific number of records (e.g., 5 cycles):
```bash
python main.py --cycles 5
```
