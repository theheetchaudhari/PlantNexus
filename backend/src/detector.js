"use strict";

/**
 * detector.js — PlantNexus anomaly detection module
 *
 * Pure, deterministic, synchronous functions. No Express, Supabase, or AI.
 *
 * Baseline strategy (evidence-based)
 * ---------------------------------
 * Records follow the analytics ordering contract: newest-first.
 * - Subject: records[0] (latest reading)
 * - Baseline window: records[1..] with valid finite values per metric
 * - Baseline value: arithmetic mean of the historical window
 * - Comparison: relative percent deviation of latest vs baseline
 *
 * Directional rules
 * -----------------
 * - energy_kw, waste_kg, temperature: elevation above baseline is adverse
 * - production_rate: drop below baseline is adverse
 *
 * Severity thresholds are relative % (not absolute units) so they adapt to
 * whatever operating level the machine's own history implies.
 */

const { toFiniteNumber } = require("./analytics");

const MIN_BASELINE_READINGS = 5;

/** Soft (DEGRADED) and hard (CRITICAL) relative-deviation thresholds. */
const METRIC_RULES = {
  energy_kw: {
    label: "energy",
    field: "energy_kw",
    unit: "kW",
    direction: "high",
    softPct: 15,
    hardPct: 35,
    recommendation:
      "Inspect energy draw path: motors, heaters, and idle-load contributors.",
  },
  production_rate: {
    label: "production",
    field: "production_rate",
    unit: "units/hour",
    direction: "low",
    softPct: 5,
    hardPct: 15,
    recommendation:
      "Check feed rate, cycle time, and downstream bottlenecks reducing throughput.",
  },
  waste_kg: {
    label: "waste",
    field: "waste_kg",
    unit: "kg",
    direction: "high",
    softPct: 15,
    hardPct: 35,
    recommendation:
      "Review scrap/reject sources and process settings that elevate waste.",
  },
  temperature: {
    label: "temperature",
    field: "temperature",
    unit: "°C",
    direction: "high",
    softPct: 8,
    hardPct: 20,
    recommendation:
      "Verify cooling, ambient conditions, and thermal sensors near the hot spot.",
  },
};

/**
 * Mean of finite numbers, or null when empty.
 * @param {number[]} values
 * @returns {number|null}
 */
function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Relative percent deviation of observed from baseline.
 * Positive when observed > baseline.
 * @param {number} observed
 * @param {number} baseline
 * @returns {number|null}
 */
function relativeDeviationPct(observed, baseline) {
  if (
    !Number.isFinite(observed) ||
    !Number.isFinite(baseline) ||
    baseline === 0
  ) {
    return null;
  }
  return ((observed - baseline) / Math.abs(baseline)) * 100;
}

/**
 * Collect finite values for a field from a record slice.
 * @param {Object[]} records
 * @param {string} field
 * @returns {number[]}
 */
function collectFinite(records, field) {
  const values = [];
  for (const record of records) {
    const n = toFiniteNumber(record?.[field]);
    if (n !== null) values.push(n);
  }
  return values;
}

/**
 * Score one metric against its baseline using soft/hard relative thresholds.
 * @param {Object} rule
 * @param {number} observed
 * @param {number} baseline
 * @param {number} baselineCount
 * @returns {Object}
 */
function evaluateMetric(rule, observed, baseline, baselineCount) {
  const deviationPct = relativeDeviationPct(observed, baseline);
  const adversePct =
    deviationPct === null
      ? null
      : rule.direction === "high"
        ? Math.max(0, deviationPct)
        : Math.max(0, -deviationPct);

  let severity = "none";
  if (adversePct !== null) {
    if (adversePct >= rule.hardPct) severity = "critical";
    else if (adversePct >= rule.softPct) severity = "degraded";
  }

  return {
    metric: rule.label,
    field: rule.field,
    unit: rule.unit,
    direction: rule.direction,
    observed,
    baseline,
    baselineCount,
    deviationPct,
    adversePct,
    softThresholdPct: rule.softPct,
    hardThresholdPct: rule.hardPct,
    severity,
    recommendation: rule.recommendation,
  };
}

/**
 * Map evidence severities to HEALTHY | DEGRADED | CRITICAL.
 * @param {Object[]} evidence
 * @returns {"HEALTHY"|"DEGRADED"|"CRITICAL"}
 */
function deriveCondition(evidence) {
  const severities = evidence.map((e) => e.severity);
  if (severities.includes("critical")) return "CRITICAL";
  if (severities.includes("degraded")) return "DEGRADED";
  return "HEALTHY";
}

/**
 * Confidence in [0, 1] from baseline depth and how many metrics were scored.
 * @param {number} baselineDepth
 * @param {number} scoredMetrics
 * @param {number} totalMetrics
 * @returns {number}
 */
function deriveConfidence(baselineDepth, scoredMetrics, totalMetrics) {
  const depthFactor = Math.min(
    1,
    baselineDepth / (MIN_BASELINE_READINGS * 2)
  );
  const coverageFactor = totalMetrics === 0 ? 0 : scoredMetrics / totalMetrics;
  return Number((0.55 * depthFactor + 0.45 * coverageFactor).toFixed(4));
}

/**
 * Human-readable summary from condition + evidence.
 * @param {"HEALTHY"|"DEGRADED"|"CRITICAL"} condition
 * @param {string} machineId
 * @param {Object[]} evidence
 * @returns {string}
 */
function buildSummary(condition, machineId, evidence) {
  const id = machineId || "unknown-machine";
  const adverse = evidence.filter((e) => e.severity !== "none");

  if (condition === "HEALTHY") {
    return `Machine ${id} is within evidence-based baseline tolerances.`;
  }

  const parts = adverse.map(
    (e) =>
      `${e.metric} ${e.adversePct.toFixed(1)}% adverse ` +
      `(${e.observed} vs baseline ${e.baseline.toFixed(3)} ${e.unit})`
  );

  const lead =
    condition === "CRITICAL"
      ? `Machine ${id} is CRITICAL:`
      : `Machine ${id} is DEGRADED:`;

  return `${lead} ${parts.join("; ")}.`;
}

/**
 * Detect anomalies for a telemetry series.
 *
 * @param {Object[]} records - Newest-first telemetry rows (snake_case fields).
 * @returns {Object} JSON-serializable detection result aligned with
 *   intelligence_analysis: condition, confidence, summary, metrics, evidence,
 *   recommendations.
 */
function detectAnomalies(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      machineId: null,
      telemetryId: null,
      condition: "HEALTHY",
      confidence: 0,
      summary: "No telemetry records available for anomaly detection.",
      metrics: {
        baselineStrategy: "evidence-mean-excluding-latest",
        minBaselineReadings: MIN_BASELINE_READINGS,
        baselineDepth: 0,
        latest: null,
        baselines: {},
      },
      evidence: [],
      recommendations: [
        "Ingest additional telemetry before relying on detection results.",
      ],
      quality: {
        status: "insufficient_data",
        warnings: ["No telemetry records provided"],
      },
    };
  }

  const latest = records[0];
  const history = records.slice(1);
  const machineId =
    typeof latest.machine_id === "string" && latest.machine_id.trim()
      ? latest.machine_id.trim()
      : null;
  const telemetryId =
    latest.id !== undefined && latest.id !== null ? latest.id : null;

  const warnings = [];
  if (history.length < MIN_BASELINE_READINGS) {
    warnings.push(
      `Baseline window has ${history.length} reading(s); ` +
        `need at least ${MIN_BASELINE_READINGS} for reliable detection`
    );
  }

  const baselines = {};
  const evidence = [];
  const metricKeys = Object.keys(METRIC_RULES);

  for (const key of metricKeys) {
    const rule = METRIC_RULES[key];
    const observed = toFiniteNumber(latest[rule.field]);
    const baselineValues = collectFinite(history, rule.field);
    const baseline = mean(baselineValues);

    baselines[rule.label] = {
      value: baseline,
      count: baselineValues.length,
      unit: rule.unit,
    };

    if (observed === null) {
      warnings.push(`Latest reading missing valid ${rule.field}`);
      continue;
    }
    if (baseline === null || baselineValues.length < MIN_BASELINE_READINGS) {
      warnings.push(
        `Insufficient baseline for ${rule.field} ` +
          `(${baselineValues.length}/${MIN_BASELINE_READINGS})`
      );
      continue;
    }

    evidence.push(
      evaluateMetric(rule, observed, baseline, baselineValues.length)
    );
  }

  const condition = deriveCondition(evidence);
  const scoredMetrics = evidence.length;
  const baselineDepth = history.length;
  const confidence =
    warnings.some((w) => w.includes("Insufficient baseline")) &&
    scoredMetrics === 0
      ? 0
      : deriveConfidence(baselineDepth, scoredMetrics, metricKeys.length);

  const recommendations = [
    ...new Set(
      evidence
        .filter((e) => e.severity !== "none")
        .map((e) => e.recommendation)
    ),
  ];

  if (condition === "HEALTHY" && recommendations.length === 0) {
    recommendations.push(
      "Continue monitoring; no adverse deviations vs evidence baseline."
    );
  }

  if (scoredMetrics === 0) {
    recommendations.unshift(
      "Collect more historical telemetry to establish evidence-based baselines."
    );
  }

  const latestSnapshot = {
    timestamp: latest.timestamp ?? null,
    energyKw: toFiniteNumber(latest.energy_kw),
    productionRate: toFiniteNumber(latest.production_rate),
    wasteKg: toFiniteNumber(latest.waste_kg),
    temperature: toFiniteNumber(latest.temperature),
  };

  return {
    machineId,
    telemetryId,
    condition,
    confidence,
    summary: buildSummary(condition, machineId, evidence),
    metrics: {
      baselineStrategy: "evidence-mean-excluding-latest",
      minBaselineReadings: MIN_BASELINE_READINGS,
      baselineDepth,
      latest: latestSnapshot,
      baselines,
      rules: Object.fromEntries(
        metricKeys.map((key) => {
          const rule = METRIC_RULES[key];
          return [
            rule.label,
            {
              direction: rule.direction,
              softPct: rule.softPct,
              hardPct: rule.hardPct,
              unit: rule.unit,
            },
          ];
        })
      ),
    },
    evidence,
    recommendations,
    quality: {
      status:
        scoredMetrics === 0
          ? "insufficient_data"
          : warnings.length > 0
            ? "degraded"
            : "ok",
      warnings,
    },
  };
}

module.exports = {
  detectAnomalies,
  relativeDeviationPct,
  mean,
  METRIC_RULES,
  MIN_BASELINE_READINGS,
};
