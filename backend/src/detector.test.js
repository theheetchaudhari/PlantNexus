"use strict";

/**
 * detector.test.js — Focused tests for Milestone 3 anomaly detection
 */

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectAnomalies,
  relativeDeviationPct,
  mean,
  MIN_BASELINE_READINGS,
} = require("./detector");

function makeRecord(overrides = {}) {
  return Object.assign(
    {
      id: 1,
      timestamp: "2026-10-10T12:00:00.000Z",
      machine_id: "M-017",
      energy_kw: 45,
      production_rate: 120,
      waste_kg: 1.1,
      temperature: 68.5,
      received_at: "2026-10-10T12:00:01.000Z",
    },
    overrides
  );
}

/** Newest-first series: index 0 is latest. */
function makeHealthySeries(count = MIN_BASELINE_READINGS + 1) {
  const records = [];
  for (let i = 0; i < count; i++) {
    records.push(
      makeRecord({
        id: count - i,
        timestamp: new Date(Date.UTC(2026, 9, 10, 12, 0, count - i)).toISOString(),
        energy_kw: 45 + (i % 2 === 0 ? 0.4 : -0.3),
        production_rate: 120 + (i % 2 === 0 ? 1 : -1),
        waste_kg: 1.1 + (i % 2 === 0 ? 0.02 : -0.01),
        temperature: 68.5 + (i % 2 === 0 ? 0.2 : -0.2),
      })
    );
  }
  return records;
}

describe("relativeDeviationPct / mean helpers", () => {
  test("relativeDeviationPct computes percent change", () => {
    assert.equal(relativeDeviationPct(50, 40), 25);
    assert.equal(relativeDeviationPct(30, 40), -25);
  });

  test("relativeDeviationPct returns null for zero baseline", () => {
    assert.equal(relativeDeviationPct(1, 0), null);
  });

  test("mean averages finite values", () => {
    assert.equal(mean([2, 4, 6]), 4);
    assert.equal(mean([]), null);
  });
});

describe("detectAnomalies — empty / insufficient baseline", () => {
  test("empty input returns insufficient_data quality", () => {
    const result = detectAnomalies([]);
    assert.equal(result.quality.status, "insufficient_data");
    assert.equal(result.condition, "HEALTHY");
    assert.equal(result.confidence, 0);
    assert.equal(result.evidence.length, 0);
  });

  test("too few history readings yields insufficient baselines", () => {
    const result = detectAnomalies([
      makeRecord({ energy_kw: 80 }),
      makeRecord({ id: 2, energy_kw: 45 }),
    ]);
    assert.equal(result.quality.status, "insufficient_data");
    assert.ok(result.quality.warnings.length > 0);
    assert.equal(result.evidence.length, 0);
  });
});

describe("detectAnomalies — healthy vs degraded vs critical", () => {
  test("near-baseline latest reading is HEALTHY", () => {
    const records = makeHealthySeries();
    const result = detectAnomalies(records);
    assert.equal(result.condition, "HEALTHY");
    assert.equal(result.machineId, "M-017");
    assert.ok(result.evidence.length === 4);
    assert.ok(result.evidence.every((e) => e.severity === "none"));
    assert.ok(result.confidence > 0);
  });

  test("simulator-like degraded latest reading is at least DEGRADED", () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({
      id: 999,
      timestamp: "2026-10-10T13:00:00.000Z",
      energy_kw: 45 * 1.42,
      production_rate: 120 * 0.93,
      waste_kg: 1.1 * 1.28,
      temperature: 68.5 * 1.12,
    });

    const result = detectAnomalies(records);
    assert.ok(
      result.condition === "DEGRADED" || result.condition === "CRITICAL"
    );
    assert.ok(result.evidence.some((e) => e.severity !== "none"));
    assert.ok(result.recommendations.length > 0);
    assert.match(result.summary, /M-017/);
  });

  test("extreme energy spike alone yields CRITICAL", () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({
      id: 999,
      energy_kw: 45 * 1.5,
      production_rate: 120,
      waste_kg: 1.1,
      temperature: 68.5,
    });

    const result = detectAnomalies(records);
    assert.equal(result.condition, "CRITICAL");
    const energy = result.evidence.find((e) => e.metric === "energy");
    assert.equal(energy.severity, "critical");
  });

  test("moderate production drop yields DEGRADED without CRITICAL", () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({
      id: 999,
      energy_kw: 45,
      production_rate: 120 * 0.9,
      waste_kg: 1.1,
      temperature: 68.5,
    });

    const result = detectAnomalies(records);
    assert.equal(result.condition, "DEGRADED");
    const production = result.evidence.find((e) => e.metric === "production");
    assert.equal(production.severity, "degraded");
  });
});

describe("detectAnomalies — output shape", () => {
  test("includes metrics baselines and evidence fields", () => {
    const result = detectAnomalies(makeHealthySeries());
    assert.equal(
      result.metrics.baselineStrategy,
      "evidence-mean-excluding-latest"
    );
    assert.ok(result.metrics.baselines.energy);
    assert.ok(Array.isArray(result.evidence));
    assert.ok(Array.isArray(result.recommendations));
    assert.equal(typeof result.confidence, "number");
  });
});
