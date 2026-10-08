"""Entry point for the PlantNexus factory simulator (M1.1)."""

import argparse
import json
import sys
import time

from config import DEFAULT_MACHINE_CONFIG
from machine import VirtualMachine


def run_simulator(cycles: int | None = None) -> None:
    """Run the telemetry generator loop.

    :param cycles: Optional count of iterations to run. If None, runs indefinitely.
    """
    machine = VirtualMachine(DEFAULT_MACHINE_CONFIG)
    interval = DEFAULT_MACHINE_CONFIG.poll_interval_seconds

    print(
        f"[PlantNexus Simulator] Initialized machine '{machine.machine_id}'. "
        f"Emitting healthy telemetry every {interval}s...",
        flush=True,
    )

    count = 0
    try:
        while True:
            telemetry = machine.generate_telemetry()
            print(json.dumps(telemetry), flush=True)

            count += 1
            if cycles is not None and count >= cycles:
                break

            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[PlantNexus Simulator] Stopping simulator gracefully.", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PlantNexus M1.1 Virtual Machine Simulator"
    )
    parser.add_argument(
        "--cycles",
        type=int,
        default=None,
        help="Number of telemetry cycles to emit before exiting (default: infinite)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_simulator(cycles=args.cycles)
