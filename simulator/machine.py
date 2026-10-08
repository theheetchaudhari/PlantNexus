"""Virtual machine model representing factory machinery for PlantNexus."""

from datetime import datetime, timezone
import random
from typing import Any, Dict

from config import (
    MachineBaselineConfig,
    DEFAULT_MACHINE_CONFIG,
    DEGRADATION_FACTORS,
    DEFAULT_RECOVERY_STEPS,
)


class VirtualMachine:
    """Simulates a single factory machine operating under healthy, degraded, or recovery conditions."""

    def __init__(
        self,
        config: MachineBaselineConfig = DEFAULT_MACHINE_CONFIG,
        scenario: str = "healthy",
        recovery_steps: int = DEFAULT_RECOVERY_STEPS,
    ):
        self.config = config
        self.machine_id = config.machine_id
        self.scenario = scenario.lower()
        self.recovery_steps = max(1, recovery_steps)
        self.current_step = 0

        # Calculate degraded starting baselines
        self.degraded_energy_baseline = config.energy_kw_baseline * DEGRADATION_FACTORS["energy_multiplier"]
        self.degraded_production_rate_baseline = config.production_rate_baseline * DEGRADATION_FACTORS["production_multiplier"]
        self.degraded_waste_baseline = config.waste_kg_baseline * DEGRADATION_FACTORS["waste_multiplier"]
        self.degraded_temperature_baseline = config.temperature_baseline * DEGRADATION_FACTORS["temperature_multiplier"]

        if self.scenario == "degraded":
            self.energy_baseline = self.degraded_energy_baseline
            self.production_rate_baseline = self.degraded_production_rate_baseline
            self.waste_baseline = self.degraded_waste_baseline
            self.temperature_baseline = self.degraded_temperature_baseline
        else:
            self.energy_baseline = config.energy_kw_baseline
            self.production_rate_baseline = config.production_rate_baseline
            self.waste_baseline = config.waste_kg_baseline
            self.temperature_baseline = config.temperature_baseline

    def generate_telemetry(self) -> Dict[str, Any]:
        """Generate a single telemetry payload with realistic random jitter."""
        if self.scenario == "recovery":
            progress = min(1.0, self.current_step / self.recovery_steps)
            # Smoothly transition from degraded baseline to healthy baseline
            energy_base = (
                self.degraded_energy_baseline * (1.0 - progress)
                + self.config.energy_kw_baseline * progress
            )
            production_rate_base = (
                self.degraded_production_rate_baseline * (1.0 - progress)
                + self.config.production_rate_baseline * progress
            )
            waste_base = (
                self.degraded_waste_baseline * (1.0 - progress)
                + self.config.waste_kg_baseline * progress
            )
            temperature_base = (
                self.degraded_temperature_baseline * (1.0 - progress)
                + self.config.temperature_baseline * progress
            )
            self.current_step += 1
        else:
            energy_base = self.energy_baseline
            production_rate_base = self.production_rate_baseline
            waste_base = self.waste_baseline
            temperature_base = self.temperature_baseline

        # Gaussian jitter for organic, realistic continuous fluctuations
        energy_kw = random.gauss(
            energy_base,
            self.config.energy_kw_jitter / 2.0,
        )
        production_rate = random.gauss(
            production_rate_base,
            self.config.production_rate_jitter / 2.0,
        )
        waste_kg = max(
            0.0,
            random.gauss(
                waste_base,
                self.config.waste_kg_jitter / 2.0,
            ),
        )
        temperature = random.gauss(
            temperature_base,
            self.config.temperature_jitter / 2.0,
        )

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "machineId": self.machine_id,
            "energyKw": round(energy_kw, 2),
            "productionRate": round(production_rate, 2),
            "wasteKg": round(waste_kg, 2),
            "temperature": round(temperature, 2),
        }


