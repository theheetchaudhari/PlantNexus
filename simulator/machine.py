"""Virtual machine model representing factory machinery for PlantNexus."""

from datetime import datetime, timezone
import random
from typing import Any, Dict

from config import MachineBaselineConfig, DEFAULT_MACHINE_CONFIG, DEGRADATION_FACTORS


class VirtualMachine:
    """Simulates a single factory machine operating under healthy or degraded conditions."""

    def __init__(
        self,
        config: MachineBaselineConfig = DEFAULT_MACHINE_CONFIG,
        scenario: str = "healthy",
    ):
        self.config = config
        self.machine_id = config.machine_id
        self.scenario = scenario.lower()

        if self.scenario == "degraded":
            self.energy_baseline = config.energy_kw_baseline * DEGRADATION_FACTORS["energy_multiplier"]
            self.production_rate_baseline = config.production_rate_baseline * DEGRADATION_FACTORS["production_multiplier"]
            self.waste_baseline = config.waste_kg_baseline * DEGRADATION_FACTORS["waste_multiplier"]
            self.temperature_baseline = config.temperature_baseline * DEGRADATION_FACTORS["temperature_multiplier"]
        else:
            self.energy_baseline = config.energy_kw_baseline
            self.production_rate_baseline = config.production_rate_baseline
            self.waste_baseline = config.waste_kg_baseline
            self.temperature_baseline = config.temperature_baseline

    def generate_telemetry(self) -> Dict[str, Any]:
        """Generate a single telemetry payload with realistic random jitter."""
        # Gaussian jitter for organic, realistic continuous fluctuations around baseline
        energy_kw = random.gauss(
            self.energy_baseline,
            self.config.energy_kw_jitter / 2.0,
        )
        production_rate = random.gauss(
            self.production_rate_baseline,
            self.config.production_rate_jitter / 2.0,
        )
        waste_kg = max(
            0.0,
            random.gauss(
                self.waste_baseline,
                self.config.waste_kg_jitter / 2.0,
            ),
        )
        temperature = random.gauss(
            self.temperature_baseline,
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

