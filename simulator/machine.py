"""Virtual machine model representing factory machinery for PlantNexus."""

from datetime import datetime, timezone
import random
from typing import Any, Dict

from config import MachineBaselineConfig, DEFAULT_MACHINE_CONFIG


class VirtualMachine:
    """Simulates a single factory machine operating under healthy baseline conditions."""

    def __init__(self, config: MachineBaselineConfig = DEFAULT_MACHINE_CONFIG):
        self.config = config
        self.machine_id = config.machine_id

    def generate_telemetry(self) -> Dict[str, Any]:
        """Generate a single healthy telemetry payload with realistic random jitter."""
        # Gaussian jitter for organic, realistic continuous fluctuations around baseline
        energy_kw = random.gauss(
            self.config.energy_kw_baseline,
            self.config.energy_kw_jitter / 2.0,
        )
        production_rate = random.gauss(
            self.config.production_rate_baseline,
            self.config.production_rate_jitter / 2.0,
        )
        waste_kg = max(
            0.0,
            random.gauss(
                self.config.waste_kg_baseline,
                self.config.waste_kg_jitter / 2.0,
            ),
        )
        temperature = random.gauss(
            self.config.temperature_baseline,
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
