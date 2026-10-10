"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { detectAnomalies, MIN_BASELINE_READINGS } = require("./detector");
const {
  inspectCondition,
  inspectMeasurements,
  inspectIssues,
  inspectRecommendations,
  inspectUncertainty,
  buildFallbackExplanation,
  explainAnalysis,
  narrativeIsGrounded,
  resolveLlmConfig,
} = require("./explain");

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

function makeHealthySeries(count = MIN_BASELINE_READINGS + 1) {
  const records = [];
  for (let i = 0; i < count; i += 1) {
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

function assertExplanationShape(result) {
  const keys = [
    "condition",
    "severity",
    "issues",
    "measurements",
    "narrative",
    "recommendedActions",
    "verificationSuggestion",
    "uncertainty",
    "source",
    "error",
  ];
  for (const key of keys) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(result, key),
      `missing ${key}`
    );
  }
  assert.ok(Array.isArray(result.issues));
  assert.ok(Array.isArray(result.measurements));
  assert.ok(Array.isArray(result.recommendedActions));
  assert.equal(typeof result.narrative, "string");
  assert.ok(result.narrative.length > 0);
  assert.equal(typeof result.verificationSuggestion, "string");
  assert.equal(typeof result.uncertainty, "object");
  assert.ok(["fallback", "llm"].includes(result.source));
}

describe("investigation tools — validation", () => {
  test("inspectCondition rejects non-objects", () => {
    const result = inspectCondition(null);
    assert.equal(result.ok, false);
    assert.equal(result.value, null);
  });

  test("inspectCondition defaults invalid condition", () => {
    const result = inspectCondition({ condition: "BROKEN", evidence: [{}] });
    assert.equal(result.ok, true);
    assert.equal(result.value.condition, "HEALTHY");
    assert.ok(result.error);
  });

  test("inspectMeasurements omits malformed items", () => {
    const result = inspectMeasurements({
      evidence: [
        { foo: 1 },
        {
          metric: "energy",
          field: "energy_kw",
          unit: "kW",
          direction: "high",
          severity: "critical",
          observed: 67.5,
          baseline: 45,
          adversePct: 50,
          deviationPct: 50,
        },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].metric, "energy");
    assert.equal(result.value[0].difference, 22.5);
    assert.ok(result.warnings.some((w) => w.includes("index 0")));
  });

  test("inspectIssues returns only adverse items ranked by severity", () => {
    const result = inspectIssues({
      evidence: [
        {
          metric: "waste",
          observed: 1.3,
          baseline: 1.1,
          unit: "kg",
          severity: "degraded",
          adversePct: 18,
          field: "waste_kg",
          direction: "high",
        },
        {
          metric: "energy",
          observed: 70,
          baseline: 45,
          unit: "kW",
          severity: "critical",
          adversePct: 55,
          field: "energy_kw",
          direction: "high",
        },
        {
          metric: "production",
          observed: 120,
          baseline: 120,
          unit: "units/hour",
          severity: "none",
          adversePct: 0,
          field: "production_rate",
          direction: "low",
        },
      ],
    });
    assert.equal(result.value.length, 2);
    assert.equal(result.value[0].metric, "energy");
    assert.equal(result.value[1].metric, "waste");
  });

  test("inspectRecommendations keeps only non-empty strings", () => {
    const result = inspectRecommendations({
      recommendations: ["Inspect energy draw path: motors, heaters, and idle-load contributors.", "", 12, null],
    });
    assert.equal(result.value.length, 1);
  });

  test("inspectUncertainty flags insufficient data", () => {
    const result = inspectUncertainty({
      quality: { status: "insufficient_data", warnings: ["No telemetry records provided"] },
    });
    assert.equal(result.value.status, "insufficient_data");
    assert.ok(result.value.note.includes("insufficient"));
  });
});

describe("fallback explanation — healthy / degraded / critical / insufficient", () => {
  test("healthy series cites measurements and invents no issues", () => {
    const detection = detectAnomalies(makeHealthySeries());
    const result = buildFallbackExplanation(detection);
    assertExplanationShape(result);
    assert.equal(result.condition, "HEALTHY");
    assert.equal(result.severity, "none");
    assert.equal(result.issues.length, 0);
    assert.ok(result.measurements.length > 0);
    assert.match(result.narrative, /HEALTHY/);
    assert.equal(result.source, "fallback");
    assert.equal(result.error, null);
    assert.ok(!/sav(e|ings)|recovered/i.test(result.narrative));
  });

  test("critical energy spike cites observed vs baseline", () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({
      id: 999,
      energy_kw: 45 * 1.5,
      production_rate: 120,
      waste_kg: 1.1,
      temperature: 68.5,
    });
    const detection = detectAnomalies(records);
    const result = buildFallbackExplanation(detection);
    assert.equal(result.condition, "CRITICAL");
    assert.equal(result.severity, "critical");
    const energy = result.issues.find((i) => i.metric === "energy");
    assert.ok(energy);
    assert.equal(energy.observed, 67.5);
    assert.ok(result.narrative.includes("67.5"));
    assert.ok(result.recommendedActions.length > 0);
    assert.match(result.verificationSuggestion, /re-run POST \/api\/analyze/);
  });

  test("degraded production drop is explained without claiming recovery", () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({
      id: 999,
      energy_kw: 45,
      production_rate: 120 * 0.9,
      waste_kg: 1.1,
      temperature: 68.5,
    });
    const detection = detectAnomalies(records);
    const result = buildFallbackExplanation(detection);
    assert.equal(result.condition, "DEGRADED");
    assert.ok(result.issues.some((i) => i.metric === "production"));
    assert.ok(!/recovered|savings/i.test(result.narrative));
  });

  test("empty detection does not invent faults", () => {
    const detection = detectAnomalies([]);
    const result = buildFallbackExplanation(detection);
    assert.equal(result.severity, "insufficient");
    assert.equal(result.issues.length, 0);
    assert.equal(result.measurements.length, 0);
    assert.match(result.narrative, /insufficient/i);
    assert.ok(!/\d+\s*kW/.test(result.narrative));
  });
});

describe("malformed evidence and missing analysis", () => {
  test("malformed-only evidence yields no invented measurements", () => {
    const result = buildFallbackExplanation({
      machineId: "M-017",
      condition: "CRITICAL",
      confidence: 0.9,
      summary: "Machine M-017 is CRITICAL",
      evidence: [{ bad: true }, "not-an-object"],
      recommendations: ["Inspect energy draw path: motors, heaters, and idle-load contributors."],
      quality: { status: "ok", warnings: [] },
    });
    assert.equal(result.condition, "CRITICAL");
    assert.equal(result.issues.length, 0);
    assert.equal(result.measurements.length, 0);
    assert.match(result.narrative, /insufficient well-formed evidence/i);
    assert.ok(result.uncertainty.warnings.length > 0);
  });

  test("null analysis uses fallback schema with error", () => {
    const result = buildFallbackExplanation(null);
    assertExplanationShape(result);
    assert.equal(result.severity, "insufficient");
    assert.ok(result.error);
  });
});

describe("LLM config, grounding, success, and failure", () => {
  test("resolveLlmConfig is null without OPENAI_API_KEY", () => {
    assert.equal(resolveLlmConfig({}), null);
    assert.equal(resolveLlmConfig({ OPENAI_API_KEY: "   " }), null);
  });

  test("missing credentials uses fallback and does not call fetch", async () => {
    let called = false;
    const detection = detectAnomalies(makeHealthySeries());
    const result = await explainAnalysis(detection, {
      env: {},
      fetchImpl: async () => {
        called = true;
        throw new Error("should not be called");
      },
    });
    assert.equal(called, false);
    assert.equal(result.source, "fallback");
    assert.equal(result.error, null);
    assert.equal(result.condition, detection.condition);
  });

  test("provider failure keeps detection fields and fallback narrative", async () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({ id: 999, energy_kw: 45 * 1.5 });
    const detection = detectAnomalies(records);
    const result = await explainAnalysis(detection, {
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    assert.equal(result.source, "fallback");
    assert.equal(result.condition, "CRITICAL");
    assert.match(result.error, /network down/);
    assert.ok(result.narrative.includes("67.5"));
  });

  test("HTTP error from provider uses fallback", async () => {
    const detection = detectAnomalies(makeHealthySeries());
    const result = await explainAnalysis(detection, {
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => ({}),
      }),
    });
    assert.equal(result.source, "fallback");
    assert.match(result.error, /HTTP 401/);
  });

  test("grounded LLM narrative is used without changing condition", async () => {
    const records = makeHealthySeries();
    records[0] = makeRecord({ id: 999, energy_kw: 45 * 1.5 });
    const detection = detectAnomalies(records);
    const fallback = buildFallbackExplanation(detection);
    const llmNarrative =
      `Machine M-017 is CRITICAL. energy observed ${fallback.issues[0].observed} ` +
      `vs baseline ${fallback.issues[0].baseline} kW.`;

    const result = await explainAnalysis(detection, {
      env: { OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o-mini" },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ narrative: llmNarrative }) } }],
        }),
      }),
    });
    assert.equal(result.source, "llm");
    assert.equal(result.error, null);
    assert.equal(result.condition, detection.condition);
    assert.equal(result.narrative, llmNarrative);
    assert.deepEqual(result.issues, fallback.issues);
  });

  test("ungrounded LLM numbers are rejected", async () => {
    const detection = detectAnomalies(makeHealthySeries());
    const result = await explainAnalysis(detection, {
      env: { OPENAI_API_KEY: "sk-test" },
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  narrative: "This fault will save 99999 dollars after recovery.",
                }),
              },
            },
          ],
        }),
      }),
    });
    assert.equal(result.source, "fallback");
    assert.match(result.error, /not present in evidence/);
    assert.ok(!result.narrative.includes("99999"));
  });

  test("narrativeIsGrounded requires numbers from facts", () => {
    const facts = { observed: 67.5, baseline: 45 };
    assert.equal(narrativeIsGrounded("observed 67.5 vs 45", facts), true);
    assert.equal(narrativeIsGrounded("saves 12 percent", facts), false);
  });
});
