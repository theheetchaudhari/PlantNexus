"""Configuration settings for PlantNexus machine simulation."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MachineBaselineConfig:
    machine_id: str = "M-017"
    energy_kw_baseline: float = 45.0
    energy_kw_jitter: float = 1.2
    production_rate_baseline: float = 120.0
    production_rate_jitter: float = 3.5
    waste_kg_baseline: float = 1.10
    waste_kg_jitter: float = 0.12
    temperature_baseline: float = 68.5
    temperature_jitter: float = 1.5
    poll_interval_seconds: float = 2.0


DEFAULT_MACHINE_CONFIG = MachineBaselineConfig()
