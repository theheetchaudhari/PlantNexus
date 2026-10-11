const test = require("node:test");
const assert = require("node:assert");
const app = require("./server");

test("API Endpoints", async (t) => {
  // Start server on random port
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test("GET /api/health should return ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "ok");
  });

  await t.test("GET /api/telemetry should return 200", async () => {
    const res = await fetch(`${baseUrl}/api/telemetry?limit=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.success, "boolean");
  });

  await t.test("GET /api/telemetry/analytics should return 200 and condition", async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/analytics?machineId=M-017&limit=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.success, "boolean");
    // limit=1 has insufficient baseline data for anomaly detection, so condition is null
    assert.strictEqual(data.data.condition, null);
    assert.ok("quality" in data.data);
    assert.ok("latestCondition" in data.data);
  });

  await t.test("GET /api/telemetry/analytics with larger sample returns condition", async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/analytics?machineId=M-017&limit=100`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok("condition" in body.data);
    if (body.data.condition !== null) {
      assert.ok(["HEALTHY", "DEGRADED", "CRITICAL"].includes(body.data.condition));
    }
  });

  await t.test("POST /api/analyze requires machineId", async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await t.test("POST /api/analyze returns detection payload", async () => {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: "M-017", limit: 50 }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.machineId, "M-017");
    assert.ok(["HEALTHY", "DEGRADED", "CRITICAL"].includes(body.data.condition));
    assert.strictEqual(typeof body.data.confidence, "number");
    assert.ok(Array.isArray(body.data.evidence));
    assert.ok(Array.isArray(body.data.recommendations));
    assert.ok(body.data.analytics);
    assert.ok(body.data.metrics);
    assert.ok(body.data.explanation);
    assert.ok(["HEALTHY", "DEGRADED", "CRITICAL"].includes(body.data.explanation.condition));
    assert.equal(typeof body.data.explanation.narrative, "string");
    assert.ok(Array.isArray(body.data.explanation.recommendedActions));
    assert.ok(Array.isArray(body.data.explanation.issues));
    assert.ok(["fallback", "llm"].includes(body.data.explanation.source));
  });

  await t.test("POST /api/verify-recovery requires machineId", async () => {
    const res = await fetch(`${baseUrl}/api/verify-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes("machineId"));
  });

  await t.test("POST /api/verify-recovery rejects invalid limit or minConsecutive", async () => {
    const resBadLimit = await fetch(`${baseUrl}/api/verify-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: "M-017", limit: -5 }),
    });
    assert.strictEqual(resBadLimit.status, 400);

    const resBadConsecutive = await fetch(`${baseUrl}/api/verify-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: "M-017", minConsecutive: 1 }),
    });
    assert.strictEqual(resBadConsecutive.status, 400);
  });

  await t.test("POST /api/verify-recovery returns verification payload", async () => {
    const res = await fetch(`${baseUrl}/api/verify-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: "M-017", limit: 50, minConsecutive: 3 }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.machineId, "M-017");
    assert.ok(
      ["VERIFIED", "RECOVERING", "NOT_RECOVERED", "INSUFFICIENT_DATA"].includes(
        body.data.verificationStatus
      )
    );
    assert.ok(
      ["IMPROVED", "PARTIALLY_IMPROVED", "NO_IMPROVEMENT", "DEGRADED"].includes(
        body.data.verdict
      )
    );
    assert.strictEqual(typeof body.data.readingsEvaluated, "number");
    assert.strictEqual(typeof body.data.consecutiveHealthy, "number");
    assert.strictEqual(typeof body.data.requiredConsecutiveHealthy, "number");
    assert.strictEqual(typeof body.data.improvementScore, "number");
    assert.ok(body.data.reason);
    assert.ok(body.data.metricsComparison);
    assert.strictEqual(body.data.verificationId, null); // Schema unmigrated on hosted DB
  });

  await t.test("POST /api/recovery/verify alias returns identical shape", async () => {
    const res = await fetch(`${baseUrl}/api/recovery/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineId: "M-017", limit: 20 }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.machineId, "M-017");
  });
});

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

function makeHealthySeries(count = 10) {
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

test("buildAnalyticsResponse — machine condition vs data quality", async (t) => {
  const { buildAnalyticsResponse } = app;

  await t.test("healthy telemetry returns ok data quality and HEALTHY condition", () => {
    const records = makeHealthySeries(10);
    const result = buildAnalyticsResponse(records);
    assert.strictEqual(result.quality.status, "ok");
    assert.strictEqual(result.condition, "HEALTHY");
    assert.ok(result.energy && result.energy.average > 0);
  });

  await t.test("valid-but-degraded telemetry returns ok data quality and DEGRADED condition", () => {
    const records = makeHealthySeries(10);
    // Degraded latest reading (+20% energy and +20% waste: exceeds softPct 15% but under hardPct 35%)
    records[0] = makeRecord({
      id: 999,
      timestamp: "2026-10-10T13:00:00.000Z",
      energy_kw: 45 * 1.20,
      production_rate: 120,
      waste_kg: 1.1 * 1.20,
      temperature: 68.5,
    });
    const result = buildAnalyticsResponse(records);
    // Crucial check: Telemetry data quality is ok (all numbers valid), but machine operational condition is DEGRADED
    assert.strictEqual(result.quality.status, "ok");
    assert.strictEqual(result.condition, "DEGRADED");
  });

  await t.test("valid-but-critical telemetry returns ok data quality and CRITICAL condition", () => {
    const records = makeHealthySeries(10);
    records[0] = makeRecord({
      id: 999,
      timestamp: "2026-10-10T13:00:00.000Z",
      energy_kw: 45 * 1.5,
      production_rate: 120,
      waste_kg: 1.1,
      temperature: 68.5,
    });
    const result = buildAnalyticsResponse(records);
    assert.strictEqual(result.quality.status, "ok");
    assert.strictEqual(result.condition, "CRITICAL");
  });

  await t.test("insufficient data — empty series yields empty quality and null condition", () => {
    const result = buildAnalyticsResponse([]);
    assert.strictEqual(result.quality.status, "empty");
    assert.strictEqual(result.condition, null);
  });

  await t.test("insufficient data — fewer than baseline requirement yields ok data quality but null condition", () => {
    const records = [
      makeRecord({ id: 1, energy_kw: 45 }),
      makeRecord({ id: 2, energy_kw: 45 }),
    ];
    const result = buildAnalyticsResponse(records);
    assert.strictEqual(result.quality.status, "ok");
    // Condition cannot be calculated from insufficient baseline; must NOT be falsely HEALTHY
    assert.strictEqual(result.condition, null);
  });

  await t.test("analytics API response compatibility — maintains all existing AnalyticsResponse fields and detection", () => {
    const records = makeHealthySeries(10);
    const result = buildAnalyticsResponse(records);

    // Verify all fields required by AnalyticsResponse interface are present
    assert.ok("condition" in result);
    assert.ok("quality" in result);
    assert.ok("timeRange" in result);
    assert.ok("latestCondition" in result);
    assert.ok("energy" in result);
    assert.ok("production" in result);
    assert.ok("waste" in result);
    assert.ok("temperature" in result);
    assert.ok("efficiency" in result);
    assert.ok("detection" in result);
    assert.strictEqual(result.detection.condition, "HEALTHY");
    assert.ok(typeof result.detection.evaluatedAt === "string");
    assert.ok(Array.isArray(result.detection.evidence));
    assert.ok(Array.isArray(result.detection.recommendations));
  });
});

