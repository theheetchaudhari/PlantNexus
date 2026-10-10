"use strict";

/**
 * analytics.test.js — Built-in Node.js test runner tests for analytics.js
 *
 * Run:  node --test backend/src/analytics.test.js
 *       (Node ≥ 18 required for built-in test runner)
 */

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { computeAnalytics, toFiniteNumber } = require("./analytics");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid telemetry record. All fields can be overridden. */
function makeRecord(overrides = {}) {
  return Object.assign(
    {
      id: 1,
      timestamp: "2026-10-10T00:00:00.000Z",
      machine_id: "M1",
      energy_kw: 10,
      production_rate: 5,
      waste_kg: 2,
      temperature: 22,
      received_at: "2026-10-10T00:00:01.000Z",
    },
    overrides
  );
}

// ---------------------------------------------------------------------------
// toFiniteNumber
// ---------------------------------------------------------------------------

describe("toFiniteNumber", () => {
  test("returns the number for valid finite integers", () => {
    assert.equal(toFiniteNumber(42), 42);
  });

  test("returns the number for valid finite floats", () => {
    assert.equal(toFiniteNumber(3.14), 3.14);
  });

  test("returns null for NaN", () => {
    assert.equal(toFiniteNumber(NaN), null);
  });

  test("returns null for Infinity", () => {
    assert.equal(toFiniteNumber(Infinity), null);
  });

  test("returns null for -Infinity", () => {
    assert.equal(toFiniteNumber(-Infinity), null);
  });

  test("returns null for null", () => {
    assert.equal(toFiniteNumber(null), null);
  });

  test("returns null for undefined", () => {
    assert.equal(toFiniteNumber(undefined), null);
  });

  test("returns null for non-numeric string", () => {
    assert.equal(toFiniteNumber("abc"), null);
  });

  test("coerces numeric string '7' to 7", () => {
    assert.equal(toFiniteNumber("7"), 7);
  });

  test("returns 0 for 0", () => {
    assert.equal(toFiniteNumber(0), 0);
  });

  test("returns negative numbers", () => {
    assert.equal(toFiniteNumber(-5), -5);
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — empty / invalid input
// ---------------------------------------------------------------------------

describe("computeAnalytics — empty / invalid input", () => {
  test("returns empty status for empty array", () => {
    const result = computeAnalytics([]);
    assert.equal(result.quality.status, "empty");
    assert.equal(result.quality.readingCount, 0);
    assert.ok(result.quality.warnings.length > 0);
    assert.equal(result.timeRange, null);
    assert.equal(result.latestCondition, null);
    assert.equal(result.energy, null);
    assert.equal(result.production, null);
    assert.equal(result.waste, null);
    assert.equal(result.temperature, null);
    assert.equal(result.efficiency, null);
  });

  test("returns empty status for non-array input", () => {
    const result = computeAnalytics(null);
    assert.equal(result.quality.status, "empty");
    assert.equal(result.quality.readingCount, 0);
  });

  test("returns empty status for undefined", () => {
    const result = computeAnalytics(undefined);
    assert.equal(result.quality.status, "empty");
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — single valid record
// ---------------------------------------------------------------------------

describe("computeAnalytics — single valid record", () => {
  const record = makeRecord({
    timestamp: "2026-10-10T06:00:00.000Z",
    energy_kw: 20,
    production_rate: 4,
    waste_kg: 1,
    temperature: 30,
  });
  const result = computeAnalytics([record]);

  test("quality status is ok", () => {
    assert.equal(result.quality.status, "ok");
    assert.equal(result.quality.readingCount, 1);
    assert.deepEqual(result.quality.warnings, []);
  });

  test("timeRange earliest === latest for single record", () => {
    assert.equal(result.timeRange.earliest, result.timeRange.latest);
    assert.equal(result.timeRange.durationMs, 0);
  });

  test("latestCondition reflects the record", () => {
    assert.equal(result.latestCondition.machineId, "M1");
    assert.equal(result.latestCondition.energyKw, 20);
    assert.equal(result.latestCondition.productionRate, 4);
    assert.equal(result.latestCondition.wasteKg, 1);
    assert.equal(result.latestCondition.temperature, 30);
  });

  test("energy average equals the single value", () => {
    assert.equal(result.energy.average, 20);
    assert.equal(result.energy.peak, 20);
    assert.equal(result.energy.unit, "kW");
    assert.equal(result.energy.validReadings, 1);
  });

  test("production average equals the single value", () => {
    assert.equal(result.production.average, 4);
    assert.equal(result.production.validReadings, 1);
  });

  test("waste total and average equal the single value", () => {
    assert.equal(result.waste.total, 1);
    assert.equal(result.waste.average, 1);
  });

  test("temperature average equals the single value", () => {
    assert.equal(result.temperature.average, 30);
    assert.equal(result.temperature.peak, 30);
  });

  test("efficiency energyEfficiency = energy / production_rate", () => {
    // 20 kW / 4 unit/h = 5
    assert.equal(result.efficiency.energyEfficiency.average, 5);
  });

  test("efficiency wasteIntensity = waste / production_rate", () => {
    // 1 kg / 4 unit/h = 0.25
    assert.equal(result.efficiency.wasteIntensity.average, 0.25);
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — multiple records, aggregate correctness
// ---------------------------------------------------------------------------

describe("computeAnalytics — multiple records", () => {
  const records = [
    makeRecord({ timestamp: "2026-10-10T01:00:00.000Z", energy_kw: 10, production_rate: 2, waste_kg: 1, temperature: 20 }),
    makeRecord({ timestamp: "2026-10-10T02:00:00.000Z", energy_kw: 20, production_rate: 4, waste_kg: 3, temperature: 40 }),
    makeRecord({ timestamp: "2026-10-10T03:00:00.000Z", energy_kw: 30, production_rate: 6, waste_kg: 5, temperature: 60 }),
  ];
  const result = computeAnalytics(records);

  test("readingCount is 3", () => {
    assert.equal(result.quality.readingCount, 3);
  });

  test("timeRange spans first to last timestamp", () => {
    assert.equal(result.timeRange.earliest, "2026-10-10T01:00:00.000Z");
    assert.equal(result.timeRange.latest, "2026-10-10T03:00:00.000Z");
    assert.equal(result.timeRange.durationMs, 2 * 60 * 60 * 1000); // 2 hours in ms
  });

  test("energy average is correct", () => {
    // (10 + 20 + 30) / 3 = 20
    assert.equal(result.energy.average, 20);
  });

  test("energy peak is correct", () => {
    assert.equal(result.energy.peak, 30);
  });

  test("production average is correct", () => {
    // (2 + 4 + 6) / 3 = 4
    assert.equal(result.production.average, 4);
  });

  test("waste total is correct", () => {
    // 1 + 3 + 5 = 9
    assert.equal(result.waste.total, 9);
  });

  test("waste average is correct", () => {
    // 9 / 3 = 3
    assert.equal(result.waste.average, 3);
  });

  test("temperature average is correct", () => {
    // (20 + 40 + 60) / 3 = 40
    assert.equal(result.temperature.average, 40);
  });

  test("temperature peak is correct", () => {
    assert.equal(result.temperature.peak, 60);
  });

  test("energy efficiency average is correct", () => {
    // (10/2 + 20/4 + 30/6) / 3 = (5 + 5 + 5) / 3 = 5
    assert.equal(result.efficiency.energyEfficiency.average, 5);
  });

  test("waste intensity average is correct", () => {
    // (1/2 + 3/4 + 5/6) / 3 = (0.5 + 0.75 + 0.8333...) / 3
    const expected = (0.5 + 0.75 + 5 / 6) / 3;
    assert.ok(Math.abs(result.efficiency.wasteIntensity.average - expected) < 1e-10);
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — zero production_rate guard (no division by zero)
// ---------------------------------------------------------------------------

describe("computeAnalytics — zero production_rate", () => {
  test("excludes zero production_rate from efficiency calculation", () => {
    const records = [
      makeRecord({ energy_kw: 10, production_rate: 0, waste_kg: 2 }),
    ];
    const result = computeAnalytics(records);
    // pairedEfficiency will be empty → efficiency should be null or not include energyEfficiency
    assert.equal(result.efficiency, null);
  });

  test("uses positive production records among mixed zeros", () => {
    const records = [
      makeRecord({ energy_kw: 10, production_rate: 0, waste_kg: 1 }),
      makeRecord({ energy_kw: 20, production_rate: 4, waste_kg: 2 }),
    ];
    const result = computeAnalytics(records);
    // Only second record contributes: 20 / 4 = 5
    assert.equal(result.efficiency.energyEfficiency.average, 5);
    // Waste intensity: 2 / 4 = 0.5
    assert.equal(result.efficiency.wasteIntensity.average, 0.5);
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — missing / invalid field values
// ---------------------------------------------------------------------------

describe("computeAnalytics — invalid/missing field values", () => {
  test("null energy_kw produces null energy block and a warning", () => {
    const records = [makeRecord({ energy_kw: null })];
    const result = computeAnalytics(records);
    assert.equal(result.energy, null);
    assert.ok(result.quality.warnings.some((w) => w.includes("energy_kw")));
  });

  test("NaN production_rate produces null production block and a warning", () => {
    const records = [makeRecord({ production_rate: NaN })];
    const result = computeAnalytics(records);
    assert.equal(result.production, null);
    assert.ok(result.quality.warnings.some((w) => w.includes("production_rate")));
  });

  test("Infinity waste_kg produces null waste block and a warning", () => {
    const records = [makeRecord({ waste_kg: Infinity })];
    const result = computeAnalytics(records);
    assert.equal(result.waste, null);
    assert.ok(result.quality.warnings.some((w) => w.includes("waste_kg")));
  });

  test("undefined temperature produces null temperature block and a warning", () => {
    const records = [makeRecord({ temperature: undefined })];
    const result = computeAnalytics(records);
    assert.equal(result.temperature, null);
    assert.ok(result.quality.warnings.some((w) => w.includes("temperature")));
  });

  test("quality status is degraded when there are warnings", () => {
    const records = [makeRecord({ energy_kw: null })];
    const result = computeAnalytics(records);
    assert.equal(result.quality.status, "degraded");
  });

  test("partial invalids: counts only valid readings", () => {
    const records = [
      makeRecord({ energy_kw: 10 }),
      makeRecord({ energy_kw: null }),
      makeRecord({ energy_kw: 30 }),
    ];
    const result = computeAnalytics(records);
    assert.equal(result.energy.validReadings, 2);
    assert.equal(result.energy.average, 20); // (10 + 30) / 2
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — missing / invalid timestamps
// ---------------------------------------------------------------------------

describe("computeAnalytics — timestamp edge cases", () => {
  test("null timestamp is excluded from timeRange", () => {
    const records = [
      makeRecord({ timestamp: null }),
    ];
    const result = computeAnalytics(records);
    assert.equal(result.timeRange, null);
  });

  test("invalid timestamp string is excluded from timeRange", () => {
    const records = [
      makeRecord({ timestamp: "not-a-date" }),
    ];
    const result = computeAnalytics(records);
    assert.equal(result.timeRange, null);
  });

  test("mixed valid/invalid timestamps uses only valid ones", () => {
    const records = [
      makeRecord({ timestamp: "2026-10-10T01:00:00.000Z" }),
      makeRecord({ timestamp: null }),
      makeRecord({ timestamp: "2026-10-10T03:00:00.000Z" }),
    ];
    const result = computeAnalytics(records);
    assert.equal(result.timeRange.earliest, "2026-10-10T01:00:00.000Z");
    assert.equal(result.timeRange.latest, "2026-10-10T03:00:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — latestCondition uses records[0]
// ---------------------------------------------------------------------------

describe("computeAnalytics — latestCondition", () => {
  test("latestCondition reflects the first element of the array", () => {
    const records = [
      makeRecord({ machine_id: "FIRST", energy_kw: 99 }),
      makeRecord({ machine_id: "SECOND", energy_kw: 1 }),
    ];
    const result = computeAnalytics(records);
    assert.equal(result.latestCondition.machineId, "FIRST");
    assert.equal(result.latestCondition.energyKw, 99);
  });

  test("latestCondition nullifies invalid numeric fields", () => {
    const records = [makeRecord({ energy_kw: "bad", production_rate: NaN })];
    const result = computeAnalytics(records);
    assert.equal(result.latestCondition.energyKw, null);
    assert.equal(result.latestCondition.productionRate, null);
  });

  test("latestCondition nullifies missing machine_id", () => {
    const r = makeRecord();
    delete r.machine_id;
    const result = computeAnalytics([r]);
    assert.equal(result.latestCondition.machineId, null);
  });
});

// ---------------------------------------------------------------------------
// computeAnalytics — output shape always present
// ---------------------------------------------------------------------------

describe("computeAnalytics — output shape", () => {
  test("all expected top-level keys are present on a valid result", () => {
    const result = computeAnalytics([makeRecord()]);
    const keys = ["quality", "timeRange", "latestCondition", "energy", "production", "waste", "temperature", "efficiency"];
    for (const key of keys) {
      assert.ok(Object.prototype.hasOwnProperty.call(result, key), `Missing key: ${key}`);
    }
  });

  test("efficiency keys are energyEfficiency and wasteIntensity", () => {
    const result = computeAnalytics([makeRecord()]);
    assert.ok(result.efficiency.energyEfficiency);
    assert.ok(result.efficiency.wasteIntensity);
  });
});
