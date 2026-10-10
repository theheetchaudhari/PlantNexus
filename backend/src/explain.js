"use strict";

/**
 * explain.js — Evidence-based explanation for PlantNexus analyze results.
 *
 * Detection remains in detector.js. This module only inspects a supplied
 * analysis object (the /api/analyze payload shape) and never invents
 * measurements, causes, savings, or recovery outcomes.
 *
 * Optional LLM providers (in order of preference):
 *   1. Strands Agents + Google Gemini when GEMINI_API_KEY is set.
 *   2. OpenAI-compatible Chat Completions via fetch when OPENAI_API_KEY is set.
 * Narrative only; structured fields always come from validated inspection tools.
 * Missing key or provider failure uses the same schema with a deterministic
 * template narrative.
 */

const { toFiniteNumber } = require("./analytics");

const CONDITIONS = new Set(["HEALTHY", "DEGRADED", "CRITICAL"]);
const EVIDENCE_SEVERITIES = new Set(["none", "degraded", "critical"]);
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

const SYSTEM_PROMPT =
  "You explain PlantNexus machine-condition evidence for operators.\n" +
  "Use only the JSON facts provided. Do not invent sensors, measurements, " +
  "fault causes, dollar savings, or recovery results. Do not recommend " +
  "controlling industrial equipment.\n\n" +
  "CRITICAL NUMERIC GROUNDING RULES:\n" +
  "1. Quote numeric values VERBATIM from the supplied evidence (exactEvidence or measurements) " +
  "without rounding, truncating, or approximating. For example, if a baseline is 54.1051, " +
  "you MUST cite 54.1051 (do NOT write 54.11 or 54.1); if 1.24245, cite 1.24245 (do NOT write 1.24).\n" +
  "2. Do NOT compute, derive, or invent new numbers, percentages, or baseline thresholds.\n" +
  "3. Only cite numbers that appear directly in the provided evidence JSON. Any rounded or " +
  "unlisted number fails deterministic safety verification.\n\n" +
  "Reply strictly with JSON: {\"narrative\":\"...\"} as 2 to 4 sentences that cite the exact supplied numbers and units.";

/**
 * @param {*} analysis
 * @returns {{ ok: boolean, error: string|null, value: object|null }}
 */
function inspectCondition(analysis) {
  if (analysis === null || analysis === undefined || typeof analysis !== "object") {
    return {
      ok: false,
      error: "analysis must be an object",
      value: null,
    };
  }

  const condition = CONDITIONS.has(analysis.condition)
    ? analysis.condition
    : "HEALTHY";
  const qualityStatus =
    typeof analysis.quality?.status === "string"
      ? analysis.quality.status
      : null;
  const evidenceCount = Array.isArray(analysis.evidence)
    ? analysis.evidence.length
    : 0;
  const insufficient =
    qualityStatus === "insufficient_data" ||
    qualityStatus === "empty" ||
    evidenceCount === 0;

  let severity = "none";
  if (insufficient) severity = "insufficient";
  else if (condition === "CRITICAL") severity = "critical";
  else if (condition === "DEGRADED") severity = "degraded";

  const machineId =
    typeof analysis.machineId === "string" && analysis.machineId.trim()
      ? analysis.machineId.trim()
      : null;

  return {
    ok: true,
    error: CONDITIONS.has(analysis.condition)
      ? null
      : "condition missing or invalid; defaulted to HEALTHY",
    value: {
      machineId,
      condition,
      severity,
      confidence: toFiniteNumber(analysis.confidence),
      summary: typeof analysis.summary === "string" ? analysis.summary : "",
    },
  };
}

/**
 * @param {*} item
 * @returns {object|null}
 */
function normalizeEvidenceItem(item) {
  if (!item || typeof item !== "object") return null;

  const metric =
    typeof item.metric === "string" && item.metric.trim()
      ? item.metric.trim()
      : null;
  const field =
    typeof item.field === "string" && item.field.trim()
      ? item.field.trim()
      : null;
  const unit = typeof item.unit === "string" ? item.unit : "";
  const direction =
    item.direction === "high" || item.direction === "low"
      ? item.direction
      : null;
  const severity = EVIDENCE_SEVERITIES.has(item.severity)
    ? item.severity
    : null;
  const observed = toFiniteNumber(item.observed);
  const baseline = toFiniteNumber(item.baseline);
  const adversePct = toFiniteNumber(item.adversePct);
  const deviationPct = toFiniteNumber(item.deviationPct);

  if (!metric || observed === null || baseline === null || !severity) {
    return null;
  }

  return {
    metric,
    field,
    unit,
    direction,
    severity,
    observed,
    baseline,
    difference: observed - baseline,
    deviationPct,
    adversePct,
  };
}

/**
 * @param {*} analysis
 * @returns {{ ok: boolean, error: string|null, value: object[], warnings: string[] }}
 */
function inspectMeasurements(analysis) {
  if (analysis === null || analysis === undefined || typeof analysis !== "object") {
    return {
      ok: false,
      error: "analysis must be an object",
      value: [],
      warnings: ["No analysis object provided"],
    };
  }

  const raw = Array.isArray(analysis.evidence) ? analysis.evidence : [];
  const value = [];
  const warnings = [];

  if (!Array.isArray(analysis.evidence)) {
    warnings.push("evidence was missing or not an array");
  }

  for (let i = 0; i < raw.length; i += 1) {
    const normalized = normalizeEvidenceItem(raw[i]);
    if (normalized) value.push(normalized);
    else warnings.push(`Malformed evidence item at index ${i} omitted`);
  }

  return { ok: true, error: null, value, warnings };
}

/**
 * Adverse measurements, critical first, then by adversePct descending.
 * @param {*} analysis
 * @returns {{ ok: boolean, error: string|null, value: object[], warnings: string[] }}
 */
function inspectIssues(analysis) {
  const measurements = inspectMeasurements(analysis);
  if (!measurements.ok) {
    return { ...measurements, value: [] };
  }

  const rank = { critical: 2, degraded: 1, none: 0 };
  const value = measurements.value
    .filter((item) => item.severity !== "none")
    .sort((a, b) => {
      const sev = (rank[b.severity] || 0) - (rank[a.severity] || 0);
      if (sev !== 0) return sev;
      return (b.adversePct || 0) - (a.adversePct || 0);
    });

  return {
    ok: true,
    error: null,
    value,
    warnings: measurements.warnings,
  };
}

/**
 * @param {*} analysis
 * @returns {{ ok: boolean, error: string|null, value: string[] }}
 */
function inspectRecommendations(analysis) {
  if (analysis === null || analysis === undefined || typeof analysis !== "object") {
    return {
      ok: false,
      error: "analysis must be an object",
      value: [],
    };
  }

  const raw = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
    : [];
  const value = raw.filter((item) => typeof item === "string" && item.trim());

  return { ok: true, error: null, value };
}

/**
 * @param {*} analysis
 * @returns {{ ok: boolean, error: string|null, value: object }}
 */
function inspectUncertainty(analysis) {
  if (analysis === null || analysis === undefined || typeof analysis !== "object") {
    return {
      ok: false,
      error: "analysis must be an object",
      value: {
        status: "insufficient_data",
        warnings: ["No analysis object provided"],
        note: "Evidence is insufficient; do not infer a machine fault.",
      },
    };
  }

  const status =
    typeof analysis.quality?.status === "string"
      ? analysis.quality.status
      : "unknown";
  const warnings = Array.isArray(analysis.quality?.warnings)
    ? analysis.quality.warnings.filter((w) => typeof w === "string")
    : [];

  let note = null;
  if (status === "insufficient_data" || status === "empty") {
    note =
      "Evidence is insufficient for a reliable baseline comparison. " +
      "Do not treat the reported condition as a confirmed fault or recovery.";
  } else if (status === "degraded") {
    note =
      "Some metrics lacked a full baseline window; cited measurements are " +
      "limited to well-formed evidence items.";
  }

  return {
    ok: true,
    error: null,
    value: { status, warnings, note },
  };
}

function formatNum(value) {
  if (!Number.isFinite(value)) return "n/a";
  return String(Number(value.toPrecision(6)));
}

function formatMeasurement(item) {
  const unit = item.unit ? ` ${item.unit}` : "";
  const pct =
    item.adversePct === null
      ? ""
      : ` (${formatNum(item.adversePct)}% adverse vs baseline)`;
  return (
    `${item.metric}: observed ${formatNum(item.observed)}${unit}, ` +
    `baseline ${formatNum(item.baseline)}${unit}, ` +
    `difference ${formatNum(item.difference)}${unit}${pct}`
  );
}

function verificationSuggestion(condition, severity) {
  if (severity === "insufficient") {
    return (
      "Collect at least five additional historical readings per metric, " +
      "then re-run POST /api/analyze. Do not assume a fault or recovery " +
      "until measurements support it."
    );
  }
  if (condition === "HEALTHY") {
    return (
      "Continue telemetry sampling and re-run POST /api/analyze after the " +
      "next operating window to confirm values remain within the evidence baseline."
    );
  }
  return (
    "After inspection, ingest new telemetry (for example a recovery scenario " +
    "on the simulator) and re-run POST /api/analyze. Compare new evidence to " +
    "these measurements; do not claim recovery until observed values improve."
  );
}

/**
 * Build the canonical structured explanation (template narrative).
 * @param {object} analysis
 * @returns {object}
 */
function buildFallbackExplanation(analysis) {
  const conditionResult = inspectCondition(analysis);
  const issuesResult = inspectIssues(analysis);
  const measurementsResult = inspectMeasurements(analysis);
  const recsResult = inspectRecommendations(analysis);
  const uncertaintyResult = inspectUncertainty(analysis);

  const conditionValue = conditionResult.value || {
    machineId: null,
    condition: "HEALTHY",
    severity: "insufficient",
    confidence: null,
    summary: "",
  };

  if (
    issuesResult.value.length === 0 &&
    conditionValue.condition !== "HEALTHY" &&
    conditionValue.severity !== "insufficient"
  ) {
    uncertaintyResult.value.note = [
      uncertaintyResult.value.note,
      "Reported condition has no well-formed evidence items; no measurements were cited.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (conditionValue.severity === "insufficient") {
    uncertaintyResult.value.note =
      uncertaintyResult.value.note ||
      "Evidence is insufficient; do not infer a machine fault.";
  }

  const machine = conditionValue.machineId || "unknown-machine";
  const issues = issuesResult.value;
  const measurements = measurementsResult.value;
  let narrative;

  if (conditionValue.severity === "insufficient" || measurements.length === 0) {
    narrative =
      `Machine ${machine} has insufficient well-formed evidence for a reliable ` +
      `explanation. Detector condition is ${conditionValue.condition}. ` +
      `No invented sensor values or causes are available. Re-run analysis after ` +
      `collecting a longer baseline.`;
  } else if (conditionValue.condition === "HEALTHY") {
    const cites = measurements.map(formatMeasurement).join("; ");
    narrative =
      `Machine ${machine} is HEALTHY: no scored metric exceeded its adverse ` +
      `threshold versus the evidence-mean baseline. Latest versus baseline: ${cites}. ` +
      `This is not a forecast and does not project future conditions.`;
  } else {
    const lead =
      `Machine ${machine} is ${conditionValue.condition} ` +
      `(severity ${conditionValue.severity}).`;
    const issueText = issues.map(formatMeasurement).join("; ");
    narrative =
      `${lead} Important measured deviations: ${issueText}. ` +
      `Recommended actions are limited to the detector list; causes beyond ` +
      `these measurements are not established.`;
  }

  const warnings = [
    ...(conditionResult.error ? [conditionResult.error] : []),
    ...issuesResult.warnings,
    ...uncertaintyResult.value.warnings,
  ];
  uncertaintyResult.value.warnings = [...new Set(warnings)];

  return {
    condition: conditionValue.condition,
    severity: conditionValue.severity,
    issues,
    measurements,
    narrative,
    recommendedActions: recsResult.value,
    verificationSuggestion: verificationSuggestion(
      conditionValue.condition,
      conditionValue.severity
    ),
    uncertainty: uncertaintyResult.value,
    source: "fallback",
    error: conditionResult.ok ? null : conditionResult.error,
  };
}

function factsPayload(explanation) {
  const exactEvidence = Array.isArray(explanation.measurements)
    ? explanation.measurements.map((item) => ({
        metric: item.metric,
        unit: item.unit,
        observed: item.observed,
        baseline: item.baseline,
        severity: item.severity,
      }))
    : [];

  return {
    condition: explanation.condition,
    severity: explanation.severity,
    exactEvidence,
    issues: explanation.issues,
    measurements: explanation.measurements,
    recommendedActions: explanation.recommendedActions,
    uncertainty: explanation.uncertainty,
  };
}

function narrativeIsGrounded(narrative, facts) {
  if (typeof narrative !== "string" || !narrative.trim()) return false;
  const factsJson = JSON.stringify(facts);
  // Build a set of exact numeric values present in the facts payload.
  // This avoids substring false-positives from IEEE-754 float representations
  // (e.g. "0.4199999999999946" containing the substring "99999").
  const factsNums = new Set(
    (factsJson.match(/-?[0-9]+(?:\.[0-9]+)?/g) || []).map(Number)
  );
  // Extract numeric tokens from the narrative. Use a lookbehind to skip
  // digits embedded inside identifiers like "M-017" (preceded by letter,
  // digit, or hyphen).
  const nums = narrative.match(/(?<![A-Za-z0-9-])-?[0-9]+(?:\.[0-9]+)?/g) || [];
  return nums.every((token) => {
    const n = Number(token);
    return Number.isFinite(n) && factsNums.has(n);
  });
}

function resolveLlmConfig(env) {
  const source = env && typeof env === "object" ? env : {};
  const apiKey =
    typeof source.OPENAI_API_KEY === "string" && source.OPENAI_API_KEY.trim()
      ? source.OPENAI_API_KEY.trim()
      : "";
  if (!apiKey) return null;

  const baseUrl =
    typeof source.OPENAI_BASE_URL === "string" && source.OPENAI_BASE_URL.trim()
      ? source.OPENAI_BASE_URL.trim().replace(/\/$/, "")
      : DEFAULT_OPENAI_BASE_URL;
  const model =
    typeof source.OPENAI_MODEL === "string" && source.OPENAI_MODEL.trim()
      ? source.OPENAI_MODEL.trim()
      : DEFAULT_OPENAI_MODEL;

  return { apiKey, baseUrl, model };
}

async function fetchLlmNarrative(facts, config, fetchImpl) {
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(facts),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM HTTP ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("LLM returned empty content");
  }

  let cleaned = content.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("LLM content was not JSON");
  }

  if (typeof parsed?.narrative !== "string" || !parsed.narrative.trim()) {
    throw new Error("LLM JSON missing narrative string");
  }

  return parsed.narrative.trim();
}

/**
 * Resolve Gemini (Strands) config from env. Returns null when key is absent.
 * @param {object} env
 * @returns {{ apiKey: string, modelId: string }|null}
 */
function resolveGeminiConfig(env) {
  const source = env && typeof env === "object" ? env : {};
  const apiKey =
    typeof source.GEMINI_API_KEY === "string" && source.GEMINI_API_KEY.trim()
      ? source.GEMINI_API_KEY.trim()
      : "";
  if (!apiKey) return null;

  const modelId =
    typeof source.GEMINI_MODEL === "string" && source.GEMINI_MODEL.trim()
      ? source.GEMINI_MODEL.trim()
      : DEFAULT_GEMINI_MODEL;

  return { apiKey, modelId };
}

/**
 * Default agentFactory: uses the Strands Agent abstraction with GoogleModel.
 *
 * The five inspection functions are registered as FunctionTool instances so
 * the agent can invoke them during its reasoning loop. The analysis facts are
 * closed over via the userContent argument, which the agent receives as its
 * initial user message.
 *
 * Dynamic import keeps the CommonJS backend compatible with the ESM SDK.
 *
 * @param {string} systemPrompt
 * @param {string} userContent  JSON-serialised facts payload
 * @param {{ apiKey: string, modelId: string }} config
 * @returns {Promise<string>}
 */
async function defaultStrandsAgentFactory(systemPrompt, userContent, config) {
  // Dynamic imports — keep ESM SDK compatible with CommonJS backend.
  const { GoogleModel } = await import("@strands-agents/sdk/models/google");
  const { Agent, FunctionTool } = await import("@strands-agents/sdk");

  const model = new GoogleModel({
    apiKey: config.apiKey,
    modelId: config.modelId,
    params: { temperature: 0 },
  });

  // Parse the facts payload once so tools can operate on it without re-parsing.
  let parsedFacts;
  try {
    parsedFacts = JSON.parse(userContent);
  } catch {
    parsedFacts = {};
  }

  // Register the five inspection functions as Strands agent tools.
  // Each tool receives the parsed analysis evidence (already embedded in
  // parsedFacts) so the agent can inspect specific aspects independently.
  const inspectionTools = [
    new FunctionTool({
      name: "inspect_condition",
      description:
        "Inspect the machine condition, severity, and confidence from the " +
        "analysis evidence. Returns condition (HEALTHY/DEGRADED/CRITICAL), " +
        "severity, and confidence.",
      callback: () => JSON.stringify(inspectCondition(parsedFacts)),
    }),
    new FunctionTool({
      name: "inspect_measurements",
      description:
        "Return all normalised measurement items from the evidence array. " +
        "Each item has metric, observed, baseline, difference, unit, " +
        "direction, severity, deviationPct, and adversePct.",
      callback: () => JSON.stringify(inspectMeasurements(parsedFacts)),
    }),
    new FunctionTool({
      name: "inspect_issues",
      description:
        "Return only adverse (non-none severity) measurement items ranked " +
        "critical-first then by adversePct descending. Use this to identify " +
        "the primary driver of a DEGRADED or CRITICAL condition.",
      callback: () => JSON.stringify(inspectIssues(parsedFacts)),
    }),
    new FunctionTool({
      name: "inspect_recommendations",
      description:
        "Return the detector-supplied recommended actions as an array of " +
        "strings. Do not invent actions beyond what is returned here.",
      callback: () => JSON.stringify(inspectRecommendations(parsedFacts)),
    }),
    new FunctionTool({
      name: "inspect_uncertainty",
      description:
        "Return the data-quality status and any quality warnings. When " +
        "status is insufficient_data or empty, do not infer faults or " +
        "recovery; note the limitation in your narrative.",
      callback: () => JSON.stringify(inspectUncertainty(parsedFacts)),
    }),
  ];

  const agent = new Agent({
    model,
    systemPrompt,
    tools: inspectionTools,
  });

  const result = await agent.invoke(userContent);
  return result.toString();
}

/**
 * Obtain a narrative from Strands + Gemini.
 * The agentFactory is injected for testability — tests pass a mock that
 * returns controlled text without calling the real API.
 *
 * @param {object} facts
 * @param {{ apiKey: string, modelId: string }} config
 * @param {Function} agentFactory
 * @returns {Promise<string>}
 */
async function fetchStrandsNarrative(facts, config, agentFactory) {
  const rawText = await agentFactory(
    SYSTEM_PROMPT,
    JSON.stringify(facts),
    config
  );

  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("Strands model returned empty content");
  }

  // The model is instructed to reply with JSON {"narrative":"..."}
  // but may return markdown fences (```json ... ```) or plain text.
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let narrative;
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed?.narrative === "string" && parsed.narrative.trim()) {
      narrative = parsed.narrative.trim();
    } else {
      throw new Error("Strands JSON missing narrative string");
    }
  } catch (parseErr) {
    // If the model returned plain text (not JSON), use it directly only when
    // narrativeIsGrounded will accept it; otherwise propagate the parse error.
    if (parseErr.message === "Strands JSON missing narrative string") {
      throw parseErr;
    }
    // rawText is not JSON — treat the full text as the narrative candidate.
    narrative = cleaned;
  }

  return narrative;
}

/**
 * Explain an /api/analyze-shaped result.
 *
 * @param {object} analysis
 * @param {{
 *   env?: object,
 *   fetchImpl?: Function,
 *   agentFactory?: Function
 * }} [options]
 * @returns {Promise<object>}
 */
async function explainAnalysis(analysis, options = {}) {
  const fallback = buildFallbackExplanation(analysis);
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  // --- Strands + Gemini path (preferred) ---
  const geminiConfig = resolveGeminiConfig(env);
  if (geminiConfig) {
    const agentFactory = options.agentFactory || defaultStrandsAgentFactory;
    try {
      const facts = factsPayload(fallback);
      const narrative = await fetchStrandsNarrative(facts, geminiConfig, agentFactory);
      if (!narrativeIsGrounded(narrative, facts)) {
        return {
          ...fallback,
          error:
            "Strands narrative contained numbers not present in evidence; used fallback narrative",
        };
      }
      return {
        ...fallback,
        narrative,
        source: "llm",
        error: null,
      };
    } catch (err) {
      const message = err && err.message ? err.message : "unknown provider error";
      return {
        ...fallback,
        error: `Strands provider failed (${message}); used fallback narrative`,
      };
    }
  }

  // --- OpenAI-compatible fallback path ---
  const config = resolveLlmConfig(env);

  if (!config) {
    return fallback;
  }

  if (typeof fetchImpl !== "function") {
    return {
      ...fallback,
      error: "LLM configured but fetch is unavailable; used fallback narrative",
    };
  }

  try {
    const facts = factsPayload(fallback);
    const narrative = await fetchLlmNarrative(facts, config, fetchImpl);
    if (!narrativeIsGrounded(narrative, facts)) {
      return {
        ...fallback,
        error:
          "LLM narrative contained numbers not present in evidence; used fallback narrative",
      };
    }
    return {
      ...fallback,
      narrative,
      source: "llm",
      error: null,
    };
  } catch (err) {
    const message = err && err.message ? err.message : "unknown provider error";
    return {
      ...fallback,
      error: `LLM provider failed (${message}); used fallback narrative`,
    };
  }
}

module.exports = {
  inspectCondition,
  inspectMeasurements,
  inspectIssues,
  inspectRecommendations,
  inspectUncertainty,
  buildFallbackExplanation,
  explainAnalysis,
  narrativeIsGrounded,
  resolveLlmConfig,
  resolveGeminiConfig,
  fetchStrandsNarrative,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  SYSTEM_PROMPT,
};
