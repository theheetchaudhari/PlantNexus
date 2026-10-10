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

  await t.test("GET /api/telemetry/analytics should return 200", async () => {
    const res = await fetch(`${baseUrl}/api/telemetry/analytics?machineId=M-017&limit=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.success, "boolean");
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
