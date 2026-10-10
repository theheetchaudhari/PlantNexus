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
});
