"use strict";

/**
 * analytics.js — PlantNexus telemetry analytics module
 *
 * Pure, deterministic, synchronous functions that accept telemetry records
 * and return structured metrics. No Express, Supabase, or AI dependencies.
 *
 * Units
 * -----
 *   energy_kw        : kilowatts  (kW)
 *   production_rate  : units/hour (assumed; unit label is not stored in DB)
 *   waste_kg         : kilograms  (kg)
 *   temperature      : degrees Celsius (°C)
 *   energyEfficiency : kW per production-unit  (energy_kw / production_rate)
 *   wasteIntensity   : kg per production-unit  (waste_kg  / production_rate)
 *
 * Assumptions
 * -----------
 * - Records are plain objects with snake_case column names as returned by
 *   Supabase: { id, timestamp, machine_id, energy_kw, production_rate,
 *               waste_kg, temperature, received_at }
 * - "Valid" numeric fields are finite numbers (NaN, Infinity, null, undefined,
 *   and non-numeric strings are treated as invalid/missing).
 * - Anomaly thresholds are intentionally NOT defined here; they belong in the
 *   detection module (next milestone).
 */

const MINIMUM_READINGS_FOR_EFFICIENCY = 1; // at least 1 reading with production_rate > 0

/**
 * Parse a value as a finite number. Returns null if the value is not a valid
 * finite number (guards against NaN, Infinity, null, undefined, strings).
 *
 * @param {*} value
 * @returns {number|null}
 */
function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute summary analytics for an array of telemetry records.
 *
 * @param {Object[]} records  - Raw telemetry rows from the database.
 * @returns {Object}          - JSON-serializable analytics result.
 */
function computeAnalytics(records) {
  // Data-quality guard: empty dataset
  if (!Array.isArray(records) || records.length === 0) {
    return {
      quality: {
        status: "empty",
        readingCount: 0,
        warnings: ["No telemetry records provided"],
      },
      timeRange: null,
      latestCondition: null,
      energy: null,
      production: null,
      waste: null,
      temperature: null,
      efficiency: null,
    };
  }

  const readingCount = records.length;

  // Time range
  const timestamps = records
    .map((r) => r.timestamp)
    .filter((t) => t != null)
    .map((t) => new Date(t).getTime())
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);

  const timeRange =
    timestamps.length > 0
      ? {
          earliest: new Date(timestamps[0]).toISOString(),
          latest: new Date(timestamps[timestamps.length - 1]).toISOString(),
          durationMs: timestamps[timestamps.length - 1] - timestamps[0],
        }
      : null;

  // Latest record (first in result set = newest, per ordering contract)
  const latest = records[0];

  const latestCondition = {
    machineId: latest.machine_id !== undefined ? latest.machine_id : null,
    timestamp: latest.timestamp !== undefined ? latest.timestamp : null,
    energyKw: toFiniteNumber(latest.energy_kw),
    productionRate: toFiniteNumber(latest.production_rate),
    wasteKg: toFiniteNumber(latest.waste_kg),
    temperature: toFiniteNumber(latest.temperature),
  };

  // Per-field aggregation helpers
  const warnings = [];

  /**
   * Collect valid finite values for a named field across all records.
   * Appends a warning if some values were invalid.
   */
  function collectValid(fieldName) {
    const valid = [];
    let invalidCount = 0;
    for (const r of records) {
      const n = toFiniteNumber(r[fieldName]);
      if (n !== null) {
        valid.push(n);
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      warnings.push(
        `${invalidCount} record(s) had invalid/missing ${fieldName} values`
      );
    }
    return valid;
  }

  function avg(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  function total(arr) {
    if (arr.length === 0) return null;
    return arr.reduce((s, v) => s + v, 0);
  }

  function peak(arr) {
    if (arr.length === 0) return null;
    return Math.max(...arr);
  }

  // Energy (kW)
  const energyValues = collectValid("energy_kw");
  const energy =
    energyValues.length > 0
      ? {
          unit: "kW",
          average: avg(energyValues),
          peak: peak(energyValues),
          validReadings: energyValues.length,
        }
      : null;

  // Production rate (units/hour)
  const productionValues = collectValid("production_rate");
  const production =
    productionValues.length > 0
      ? {
          unit: "units/hour",
          average: avg(productionValues),
          validReadings: productionValues.length,
        }
      : null;

  // Waste (kg)
  const wasteValues = collectValid("waste_kg");
  const waste =
    wasteValues.length > 0
      ? {
          unit: "kg",
          total: total(wasteValues),
          average: avg(wasteValues),
          validReadings: wasteValues.length,
        }
      : null;

  // Temperature (°C)
  const tempValues = collectValid("temperature");
  const temperature =
    tempValues.length > 0
      ? {
          unit: "°C",
          average: avg(tempValues),
          peak: peak(tempValues),
          validReadings: tempValues.length,
        }
      : null;

  // Efficiency metrics (require paired valid readings with production_rate > 0)
  let efficiency = null;
  const pairedEfficiency = [];
  const pairedWasteIntensity = [];

  for (const r of records) {
    const e = toFiniteNumber(r.energy_kw);
    const p = toFiniteNumber(r.production_rate);
    const w = toFiniteNumber(r.waste_kg);

    // Guard against division by zero
    if (e !== null && p !== null && p > 0) {
      pairedEfficiency.push(e / p);
    }
    if (w !== null && p !== null && p > 0) {
      pairedWasteIntensity.push(w / p);
    }
  }

  if (pairedEfficiency.length >= MINIMUM_READINGS_FOR_EFFICIENCY) {
    efficiency = {
      energyEfficiency: {
        unit: "kW per (unit/hour)",
        description: "Average energy consumed per unit of production rate",
        average: avg(pairedEfficiency),
        validReadings: pairedEfficiency.length,
      },
    };
  } else {
    warnings.push(
      "Insufficient readings with production_rate > 0 for energy efficiency calculation"
    );
  }

  if (pairedWasteIntensity.length >= MINIMUM_READINGS_FOR_EFFICIENCY) {
    if (!efficiency) efficiency = {};
    efficiency.wasteIntensity = {
      unit: "kg per (unit/hour)",
      description: "Average waste generated per unit of production rate",
      average: avg(pairedWasteIntensity),
      validReadings: pairedWasteIntensity.length,
    };
  } else {
    warnings.push(
      "Insufficient readings with production_rate > 0 for waste intensity calculation"
    );
  }

  // Data-quality summary
  const quality = {
    status: warnings.length === 0 ? "ok" : "degraded",
    readingCount,
    warnings,
  };

  return {
    quality,
    timeRange,
    latestCondition,
    energy,
    production,
    waste,
    temperature,
    efficiency,
  };
}

module.exports = { computeAnalytics, toFiniteNumber };
