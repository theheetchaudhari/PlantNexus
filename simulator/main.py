"""Entry point for the PlantNexus factory simulator (M1.4)."""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict

from config import DEFAULT_BACKEND_URL, DEFAULT_MACHINE_CONFIG
from machine import VirtualMachine


def send_telemetry(url: str, telemetry: Dict[str, Any]) -> None:
    """Send telemetry payload to the backend via HTTP POST using the Python standard library.

    Catches and logs network or server errors to prevent crashing the simulator.
    """
    data = json.dumps(telemetry).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status not in (200, 201):
                print(
                    f"[Warning] Backend returned unexpected status code: {response.status}",
                    flush=True,
                )
    except urllib.error.HTTPError as e:
        print(
            f"[Warning] Backend HTTP error {e.code}: {e.reason}",
            flush=True,
        )
    except urllib.error.URLError as e:
        print(
            f"[Warning] Backend unavailable at {url} ({e.reason}). Continuing simulation...",
            flush=True,
        )
    except Exception as e:
        print(
            f"[Warning] Failed to transmit telemetry to {url}: {e}. Continuing simulation...",
            flush=True,
        )


def run_simulator(
    scenario: str = "healthy",
    cycles: int | None = None,
    backend_url: str = DEFAULT_BACKEND_URL,
) -> None:
    """Run the telemetry generator loop and stream records to the backend.

    :param scenario: Simulation scenario ('healthy', 'degraded', or 'recovery').
    :param cycles: Optional count of iterations to run. If None, runs indefinitely.
    :param backend_url: Target URL for telemetry ingestion.
    """
    machine = VirtualMachine(DEFAULT_MACHINE_CONFIG, scenario=scenario)
    interval = DEFAULT_MACHINE_CONFIG.poll_interval_seconds

    print(
        f"[PlantNexus Simulator] Initialized machine '{machine.machine_id}' in [{scenario.upper()}] scenario. "
        f"Emitting telemetry every {interval}s to {backend_url}...",
        flush=True,
    )

    count = 0
    try:
        while True:
            telemetry = machine.generate_telemetry()
            print(json.dumps(telemetry), flush=True)
            send_telemetry(backend_url, telemetry)

            count += 1
            if cycles is not None and count >= cycles:
                break

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[PlantNexus Simulator] Stopping simulator gracefully.", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PlantNexus M1.4 Virtual Machine Simulator"
    )
    parser.add_argument(
        "--scenario",
        type=str,
        choices=["healthy", "degraded", "recovery"],
        default="healthy",
        help="Simulation scenario: healthy (default), degraded, or recovery",
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=None,
        help="Number of telemetry cycles to emit before exiting (default: infinite)",
    )
    parser.add_argument(
        "--backend-url",
        type=str,
        default=DEFAULT_BACKEND_URL,
        help=f"Backend ingestion URL (default: {DEFAULT_BACKEND_URL})",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_simulator(
        scenario=args.scenario,
        cycles=args.cycles,
        backend_url=args.backend_url,
    )
