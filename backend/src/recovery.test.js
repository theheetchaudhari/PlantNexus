"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  verifyRecovery,
  resolveHealthyBaseline,
  evaluateReadingAgainstBaseline,
  computeBaselineFromRecords,
  DEFAULT_MIN_CONSECUTIVE_HEALTHY,
  KNOWN_MACHINE_BASELINES,
} = require("./recovery");

const BASELINE_M017 = {
  energy_kw: 45.0,
  production_rate: 120.0,
  waste_kg: 1.1,
  temperature: 68.5,
};

function makeReading(overrides = {}) {
  return {
    machine_id: "M-017",
    timestamp: new Date().toISOString(),
    energy_kw: 45.0,
    production_rate: 120.0,
    waste_kg: 1.1,
    temperature: 68.5,
    ...overrides,
  };
}

function makeDegradedReading(overrides = {}) {
  // Energy +22% (degraded), production -8% (degraded), waste +20% (degraded), temp +12% (degraded)
  return makeReading({
    energy_kw: 55.0,
    production_rate: 110.0,
    waste_kg: 1.35,
    temperature: 77.0,
    ...overrides,
  });
}

function makeCriticalReading(overrides = {}) {
  // Energy +40% (critical), temp +25% (critical)
  return makeReading({
    energy_kw: 65.0,
    production_rate: 95.0,
    waste_kg: 1.6,
    temperature: 86.0,
    ...overrides,
  });
}

describe("Baseline Resolution", () => {
  test("uses explicit baseline provided in options", () => {
    const custom = {
      energy_kw: 50.0,
      production_rate: 100.0,
      waste_kg: 2.0,
      temperature: 70.0,
    };
    const resolved = resolveHealthyBaseline([], { baseline: custom });
    assert.strictEqual(resolved.source, "provided");
    assert.strictEqual(resolved.energy_kw, 50.0);
    assert.strictEqual(resolved.production_rate, 100.0);
    assert.strictEqual(resolved.waste_kg, 2.0);
    assert.strictEqual(resolved.temperature, 70.0);
  });

  test("uses camelCase in provided baseline", () => {
    const custom = {
      energyKw: 48.0,
      productionRate: 115.0,
      wasteKg: 1.2,
      temperature: 69.0,
    };
    const resolved = resolveHealthyBaseline([], { baseline: custom });
    assert.strictEqual(resolved.source, "provided");
    assert.strictEqual(resolved.energy_kw, 48.0);
    assert.strictEqual(resolved.production_rate, 115.0);
  });

  test("uses known machine specification for M-017 when not specified", () => {
    const records = [makeReading({ machine_id: "M-017" })];
    const resolved = resolveHealthyBaseline(records);
    assert.strictEqual(resolved.source, "machine_specification");
    assert.strictEqual(resolved.energy_kw, 45.0);
    assert.strictEqual(resolved.production_rate, 120.0);
  });

  test("computes baseline from baselineRecords option", () => {
    const baselineRecords = [
      makeReading({ energy_kw: 44.0, temperature: 68.0 }),
      makeReading({ energy_kw: 46.0, temperature: 69.0 }),
      makeReading({ energy_kw: 45.0, temperature: 68.5 }),
      makeReading({ energy_kw: 45.0, temperature: 68.5 }),
      makeReading({ energy_kw: 45.0, temperature: 68.5 }),
    ];
    const resolved = resolveHealthyBaseline([], {
      machineId: "UNKNOWN_MACH",
      baselineRecords,
    });
    assert.strictEqual(resolved.source, "baseline_records");
    assert.strictEqual(resolved.energy_kw, 45.0);
    assert.strictEqual(resolved.temperature, 68.5);
  });

  test("returns null when baseline cannot be established", () => {
    const resolved = resolveHealthyBaseline([], { machineId: "UNKNOWN_MACH" });
    assert.strictEqual(resolved, null);
  });
});

describe("Reading Evaluation against Baseline", () => {
  test("evaluates healthy reading within thresholds as HEALTHY", () => {
    const rec = makeReading({ energy_kw: 46.0, temperature: 69.0 });
    const ev = evaluateReadingAgainstBaseline(rec, BASELINE_M017);
    assert.strictEqual(ev.condition, "HEALTHY");
    assert.strictEqual(ev.maxSeverity, "none");
    assert.strictEqual(ev.metrics.energy.status, "healthy");
  });

  test("evaluates degraded reading exceeding soft threshold as DEGRADED", () => {
    const rec = makeDegradedReading();
    const ev = evaluateReadingAgainstBaseline(rec, BASELINE_M017);
    assert.strictEqual(ev.condition, "DEGRADED");
    assert.strictEqual(ev.maxSeverity, "degraded");
  });

  test("evaluates critical reading exceeding hard threshold as CRITICAL", () => {
    const rec = makeCriticalReading();
    const ev = evaluateReadingAgainstBaseline(rec, BASELINE_M017);
    assert.strictEqual(ev.condition, "CRITICAL");
    assert.strictEqual(ev.maxSeverity, "critical");
  });

  test("returns INVALID condition for malformed reading", () => {
    const rec = { energy_kw: "not_a_number" };
    const ev = evaluateReadingAgainstBaseline(rec, BASELINE_M017);
    assert.strictEqual(ev.condition, "INVALID");
  });
});

describe("Recovery Verification — VERIFIED Outcome", () => {
  test("declares VERIFIED when machine sustains 3 consecutive healthy readings after degradation", () => {
    // Newest first: 3 healthy readings followed by 3 degraded readings
    const records = [
      makeReading({ timestamp: "2026-10-10T12:05:00Z" }), // healthy (latest)
      makeReading({ timestamp: "2026-10-10T12:04:00Z" }), // healthy
      makeReading({ timestamp: "2026-10-10T12:03:00Z" }), // healthy
      makeDegradedReading({ timestamp: "2026-10-10T12:02:00Z" }), // degraded
      makeDegradedReading({ timestamp: "2026-10-10T12:01:00Z" }), // degraded
      makeDegradedReading({ timestamp: "2026-10-10T12:00:00Z" }), // degraded
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "VERIFIED");
    assert.strictEqual(result.verdict, "IMPROVED");
    assert.strictEqual(result.consecutiveHealthy, 3);
    assert.strictEqual(result.requiredConsecutiveHealthy, 3);
    assert.strictEqual(result.improvementScore, 1.0);
    assert.strictEqual(result.currentCondition, "HEALTHY");
    assert.ok(result.reason.includes("Recovery verified"));
    assert.strictEqual(result.metricsComparison.energy.status, "healthy");
    assert.strictEqual(result.metricsComparison.production.status, "healthy");
    assert.strictEqual(result.metricsComparison.waste.status, "healthy");
    assert.strictEqual(result.metricsComparison.temperature.status, "healthy");
    assert.strictEqual(result.quality.status, "ok");
  });

  test("declares VERIFIED with custom higher consecutive requirement (e.g. 5)", () => {
    const records = [
      makeReading(),
      makeReading(),
      makeReading(),
      makeReading(),
      makeReading(),
      makeDegradedReading(),
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 5,
    });

    assert.strictEqual(result.verificationStatus, "VERIFIED");
    assert.strictEqual(result.consecutiveHealthy, 5);
    assert.strictEqual(result.verdict, "IMPROVED");
  });
});

describe("Recovery Verification — RECOVERING Outcome", () => {
  test("returns RECOVERING when machine has 1 healthy reading (must not declare VERIFIED)", () => {
    // 1 healthy reading preceded by degraded readings
    const records = [
      makeReading({ timestamp: "2026-10-10T12:03:00Z" }), // healthy (1st)
      makeDegradedReading({ timestamp: "2026-10-10T12:02:00Z" }), // degraded
      makeDegradedReading({ timestamp: "2026-10-10T12:01:00Z" }), // degraded
      makeDegradedReading({ timestamp: "2026-10-10T12:00:00Z" }), // degraded
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "RECOVERING");
    assert.strictEqual(result.verdict, "PARTIALLY_IMPROVED");
    assert.strictEqual(result.consecutiveHealthy, 1);
    assert.strictEqual(result.requiredConsecutiveHealthy, 3);
    assert.notStrictEqual(result.verificationStatus, "VERIFIED");
    assert.ok(result.reason.includes("only 1 of 3"));
  });

  test("returns RECOVERING when machine has 2 healthy readings (less than required 3)", () => {
    const records = [
      makeReading(), // healthy 1
      makeReading(), // healthy 2
      makeDegradedReading(), // degraded
      makeDegradedReading(), // degraded
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "RECOVERING");
    assert.strictEqual(result.verdict, "PARTIALLY_IMPROVED");
    assert.strictEqual(result.consecutiveHealthy, 2);
    assert.strictEqual(result.improvementScore, 0.67);
  });

  test("returns RECOVERING when readings are improving toward baseline but still degraded", () => {
    // Transitioning from peak critical (energy 65, temp 86) down to milder degradation (energy 52, temp 74)
    const records = [
      makeReading({ energy_kw: 52.0, temperature: 74.0 }), // moderately degraded (latest)
      makeReading({ energy_kw: 57.0, temperature: 78.0 }), // worse
      makeCriticalReading({ energy_kw: 65.0, temperature: 86.0 }), // peak critical
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "RECOVERING");
    assert.strictEqual(result.verdict, "PARTIALLY_IMPROVED");
    assert.strictEqual(result.consecutiveHealthy, 0);
    assert.ok(result.improvementScore > 0);
    assert.ok(result.reason.includes("measurable improvement"));
  });
});

describe("Recovery Verification — NOT_RECOVERED Outcome", () => {
  test("returns NOT_RECOVERED for persistent degradation without recovery trend", () => {
    const records = [
      makeDegradedReading({ energy_kw: 55.0 }),
      makeDegradedReading({ energy_kw: 55.0 }),
      makeDegradedReading({ energy_kw: 55.0 }),
      makeDegradedReading({ energy_kw: 55.0 }),
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "NOT_RECOVERED");
    assert.strictEqual(result.verdict, "NO_IMPROVEMENT");
    assert.strictEqual(result.consecutiveHealthy, 0);
    assert.strictEqual(result.improvementScore, 0.0);
    assert.ok(result.reason.includes("material degradation"));
  });

  test("returns NOT_RECOVERED with DEGRADED verdict for critical worsening conditions", () => {
    const records = [
      makeCriticalReading({ energy_kw: 66.0 }), // worst reading latest
      makeDegradedReading({ energy_kw: 55.0 }),
      makeReading({ energy_kw: 45.0 }),
    ];

    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });

    assert.strictEqual(result.verificationStatus, "NOT_RECOVERED");
    assert.strictEqual(result.verdict, "DEGRADED");
    assert.strictEqual(result.consecutiveHealthy, 0);
  });
});

describe("Recovery Verification — INSUFFICIENT_DATA and Edge Cases", () => {
  test("returns INSUFFICIENT_DATA for empty array", () => {
    const result = verifyRecovery([], { machineId: "M-017" });
    assert.strictEqual(result.verificationStatus, "INSUFFICIENT_DATA");
    assert.strictEqual(result.verdict, "NO_IMPROVEMENT");
    assert.strictEqual(result.readingsEvaluated, 0);
    assert.strictEqual(result.quality.status, "insufficient_data");
  });

  test("returns INSUFFICIENT_DATA for non-array input", () => {
    const result = verifyRecovery(null, { machineId: "M-017" });
    assert.strictEqual(result.verificationStatus, "INSUFFICIENT_DATA");
  });

  test("returns INSUFFICIENT_DATA when history has fewer readings than minConsecutive", () => {
    const records = [makeReading()];
    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 3,
    });
    assert.strictEqual(result.verificationStatus, "INSUFFICIENT_DATA");
    assert.ok(result.reason.includes("Insufficient telemetry history"));
  });

  test("returns INSUFFICIENT_DATA when latest reading has invalid metrics", () => {
    const records = [
      { machine_id: "M-017", energy_kw: "invalid", temperature: null },
      makeReading(),
      makeReading(),
    ];
    const result = verifyRecovery(records, { machineId: "M-017" });
    assert.strictEqual(result.verificationStatus, "INSUFFICIENT_DATA");
    assert.ok(result.reason.includes("missing or malformed"));
  });

  test("enforces minimum consecutive count of at least 2 even if caller requests 1", () => {
    const records = [
      makeReading(),
      makeDegradedReading(),
      makeDegradedReading(),
    ];
    // Caller requests minConsecutiveHealthy = 1, but system should require at least 2
    const result = verifyRecovery(records, {
      machineId: "M-017",
      minConsecutiveHealthy: 1,
    });
    // With 1 healthy reading and minimum forced to default/2, outcome should be RECOVERING, not VERIFIED
    assert.strictEqual(result.verificationStatus, "RECOVERING");
    assert.notStrictEqual(result.verificationStatus, "VERIFIED");
  });

  test("output contains complete evidence-based comparison fields", () => {
    const records = [makeReading(), makeReading(), makeReading()];
    const result = verifyRecovery(records, { machineId: "M-017" });

    assert.ok(result.machineId);
    assert.ok(result.verificationStatus);
    assert.ok(result.verdict);
    assert.ok(result.timestamp);
    assert.strictEqual(typeof result.readingsEvaluated, "number");
    assert.strictEqual(typeof result.consecutiveHealthy, "number");
    assert.strictEqual(typeof result.requiredConsecutiveHealthy, "number");
    assert.strictEqual(typeof result.improvementScore, "number");
    assert.ok(result.reason);
    assert.ok(result.summary);
    assert.ok(result.metricsComparison.energy);
    assert.ok(result.metricsComparison.production);
    assert.ok(result.metricsComparison.waste);
    assert.ok(result.metricsComparison.temperature);
  });
});
