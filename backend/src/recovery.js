"use strict";

/**
 * recovery.js — PlantNexus evidence-based recovery verification module (Milestone 4)
 *
 * Evaluates whether recent machine telemetry demonstrates verifiable recovery
 * following degradation. Recovery is strictly evidence-based and requires a
 * configurable minimum sequence of consecutive healthy readings against a
 * healthy baseline before declaring VERIFIED.
 *
 * Deterministic outcomes:
 * - VERIFIED: Sufficient consecutive readings meet healthy baseline tolerances.
 * - RECOVERING: Measurements are improving or partially healthy, but consecutive requirement not yet met.
 * - NOT_RECOVERED: Measurements remain materially degraded with no sustained recovery trend.
 * - INSUFFICIENT_DATA: Telemetry or baseline evidence is insufficient to make a reliable decision.
 */

const { toFiniteNumber } = require("./analytics");
const {
  METRIC_RULES,
  MIN_BASELINE_READINGS,
  relativeDeviationPct,
  mean,
} = require("./detector");

const DEFAULT_MIN_CONSECUTIVE_HEALTHY = 3;

/** Standard healthy baselines for known machine specifications */
const KNOWN_MACHINE_BASELINES = {
  "M-017": {
    energy_kw: 45.0,
    production_rate: 120.0,
    waste_kg: 1.1,
    temperature: 68.5,
  },
};

/**
 * Compute average metric values from a record slice.
 * @param {Object[]} records
 * @returns {Object|null}
 */
function computeBaselineFromRecords(records) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const result = {};
  for (const [key, rule] of Object.entries(METRIC_RULES)) {
    const values = [];
    for (const r of records) {
      const v = toFiniteNumber(r?.[rule.field] ?? r?.[rule.label]);
      if (v !== null) values.push(v);
    }
    const avg = mean(values);
    if (avg === null) return null;
    result[key] = Number(avg.toFixed(4));
  }
  return result;
}

/**
 * Resolve an authoritative healthy baseline for comparison.
 * Priority:
 * 1. Explicit baseline object in options
 * 2. Explicit baselineRecords array in options
 * 3. Machine specification defaults for known machines (e.g. M-017)
 * 4. Computed historical window from the tail of the telemetry array
 *
 * @param {Object[]} records
 * @param {Object} options
 * @returns {Object|null}
 */
function resolveHealthyBaseline(records, options = {}) {
  // 1. Explicit baseline object
  if (options.baseline && typeof options.baseline === "object") {
    const b = options.baseline;
    const energy = toFiniteNumber(b.energy_kw ?? b.energyKw ?? b.energy);
    const prod = toFiniteNumber(b.production_rate ?? b.productionRate ?? b.production);
    const waste = toFiniteNumber(b.waste_kg ?? b.wasteKg ?? b.waste);
    const temp = toFiniteNumber(b.temperature ?? b.temp);

    if (energy !== null && prod !== null && waste !== null && temp !== null) {
      return {
        energy_kw: energy,
        production_rate: prod,
        waste_kg: waste,
        temperature: temp,
        source: "provided",
      };
    }
  }

  // 2. Explicit baselineRecords array
  if (
    Array.isArray(options.baselineRecords) &&
    options.baselineRecords.length >= MIN_BASELINE_READINGS
  ) {
    const computed = computeBaselineFromRecords(options.baselineRecords);
    if (computed) {
      return {
        ...computed,
        source: "baseline_records",
      };
    }
  }

  // 3. Known machine default
  const machineId =
    (typeof options.machineId === "string" ? options.machineId.trim() : "") ||
    (typeof records?.[0]?.machine_id === "string" ? records[0].machine_id.trim() : "") ||
    (typeof records?.[0]?.machineId === "string" ? records[0].machineId.trim() : "");

  if (machineId && KNOWN_MACHINE_BASELINES[machineId]) {
    return {
      ...KNOWN_MACHINE_BASELINES[machineId],
      source: "machine_specification",
    };
  }

  // 4. Historical tail if records has enough depth
  const minConsecutive = Math.max(
    2,
    Number(options.minConsecutiveHealthy) || DEFAULT_MIN_CONSECUTIVE_HEALTHY
  );

  if (
    Array.isArray(records) &&
    records.length >= minConsecutive + MIN_BASELINE_READINGS
  ) {
    const tail = records.slice(minConsecutive);
    const computed = computeBaselineFromRecords(tail);
    if (computed) {
      return {
        ...computed,
        source: "historical_telemetry",
      };
    }
  }

  return null;
}

/**
 * Evaluate a single telemetry reading against baseline tolerances.
 * @param {Object} record
 * @param {Object} baseline
 * @returns {Object}
 */
function evaluateReadingAgainstBaseline(record, baseline) {
  if (!record || typeof record !== "object") {
    return {
      condition: "INVALID",
      maxSeverity: "unknown",
      maxAdversePct: null,
      totalAdversePct: null,
      metrics: {},
    };
  }

  const values = {
    energy_kw: toFiniteNumber(record.energy_kw ?? record.energyKw),
    production_rate: toFiniteNumber(record.production_rate ?? record.productionRate),
    waste_kg: toFiniteNumber(record.waste_kg ?? record.wasteKg),
    temperature: toFiniteNumber(record.temperature),
  };

  const metrics = {};
  let maxSeverity = "none";
  let maxAdversePct = 0;
  let totalAdversePct = 0;
  let validCount = 0;

  for (const [key, rule] of Object.entries(METRIC_RULES)) {
    const observed = values[key];
    const baseVal = baseline[key];

    if (observed === null || baseVal === null || baseVal === 0) {
      metrics[rule.label] = {
        field: rule.field,
        observed,
        baseline: baseVal,
        unit: rule.unit,
        deviationPct: null,
        adversePct: null,
        severity: "unknown",
      };
      continue;
    }

    validCount += 1;
    const devPct = relativeDeviationPct(observed, baseVal);
    const adverse =
      devPct === null
        ? 0
        : rule.direction === "high"
          ? Math.max(0, devPct)
          : Math.max(0, -devPct);

    let sev = "none";
    if (adverse >= rule.hardPct) {
      sev = "critical";
    } else if (adverse >= rule.softPct) {
      sev = "degraded";
    }

    if (sev === "critical") {
      maxSeverity = "critical";
    } else if (sev === "degraded" && maxSeverity !== "critical") {
      maxSeverity = "degraded";
    }

    if (adverse > maxAdversePct) maxAdversePct = adverse;
    totalAdversePct += adverse;

    metrics[rule.label] = {
      field: rule.field,
      observed,
      baseline: baseVal,
      unit: rule.unit,
      deviationPct: Number(devPct.toFixed(2)),
      adversePct: Number(adverse.toFixed(2)),
      thresholdPct: rule.softPct,
      severity: sev,
      status: sev === "none" ? "healthy" : sev,
    };
  }

  if (validCount < 4) {
    return {
      condition: "INVALID",
      maxSeverity: "unknown",
      maxAdversePct: null,
      totalAdversePct: null,
      metrics,
    };
  }

  const condition =
    maxSeverity === "critical"
      ? "CRITICAL"
      : maxSeverity === "degraded"
        ? "DEGRADED"
        : "HEALTHY";

  return {
    condition,
    maxSeverity,
    maxAdversePct: Number(maxAdversePct.toFixed(2)),
    totalAdversePct: Number(totalAdversePct.toFixed(2)),
    metrics,
  };
}

/**
 * Verify whether recent telemetry confirms machine recovery.
 *
 * @param {Object[]} records Telemetry array, newest first (records[0] is latest)
 * @param {Object} [options]
 * @param {number} [options.minConsecutiveHealthy=3] Required consecutive healthy readings (minimum 2)
 * @param {Object} [options.baseline] Custom healthy baseline { energy_kw, production_rate, waste_kg, temperature }
 * @param {Object[]} [options.baselineRecords] Historical records to derive baseline from
 * @param {string} [options.machineId] Target machine ID
 * @param {number} [options.evaluationWindowSize] Number of recent readings to inspect
 * @returns {Object}
 */
function verifyRecovery(records, options = {}) {
  const reqMinConsecutive = Number(options.minConsecutiveHealthy);
  // Never allow less than 2 consecutive healthy readings for verification
  const minConsecutive =
    Number.isFinite(reqMinConsecutive) && reqMinConsecutive >= 2
      ? Math.floor(reqMinConsecutive)
      : DEFAULT_MIN_CONSECUTIVE_HEALTHY;

  const machineId =
    (typeof options.machineId === "string" ? options.machineId.trim() : "") ||
    (typeof records?.[0]?.machine_id === "string" ? records[0].machine_id.trim() : "") ||
    (typeof records?.[0]?.machineId === "string" ? records[0].machineId.trim() : "") ||
    "unknown-machine";

  const emptyResponse = (reason, warnings = []) => ({
    machineId,
    verificationStatus: "INSUFFICIENT_DATA",
    verdict: "NO_IMPROVEMENT",
    timestamp: new Date().toISOString(),
    readingsEvaluated: 0,
    consecutiveHealthy: 0,
    requiredConsecutiveHealthy: minConsecutive,
    improvementScore: 0.0,
    currentCondition: null,
    metricsComparison: {},
    reason,
    summary: `Machine ${machineId} recovery verification failed: ${reason}`,
    quality: {
      status: "insufficient_data",
      warnings: warnings.length > 0 ? warnings : [reason],
    },
  });

  if (!Array.isArray(records) || records.length === 0) {
    return emptyResponse("No telemetry records provided");
  }

  const baseline = resolveHealthyBaseline(records, options);
  if (!baseline) {
    return {
      machineId,
      verificationStatus: "INSUFFICIENT_DATA",
      verdict: "NO_IMPROVEMENT",
      timestamp: records[0]?.timestamp || new Date().toISOString(),
      readingsEvaluated: records.length,
      consecutiveHealthy: 0,
      requiredConsecutiveHealthy: minConsecutive,
      improvementScore: 0.0,
      currentCondition: null,
      metricsComparison: {},
      reason: "No healthy baseline could be established for comparison",
      summary: `Machine ${machineId} recovery verification: baseline unavailable`,
      quality: {
        status: "insufficient_data",
        warnings: ["Baseline could not be established from history or configuration"],
      },
    };
  }

  // Need at least minConsecutive readings in the series to evaluate recovery
  if (records.length < minConsecutive) {
    return {
      machineId,
      verificationStatus: "INSUFFICIENT_DATA",
      verdict: "NO_IMPROVEMENT",
      timestamp: records[0]?.timestamp || new Date().toISOString(),
      readingsEvaluated: records.length,
      consecutiveHealthy: 0,
      requiredConsecutiveHealthy: minConsecutive,
      improvementScore: 0.0,
      currentCondition: null,
      metricsComparison: {},
      reason: `Insufficient telemetry history (${records.length} reading(s); need at least ${minConsecutive} to evaluate recovery)`,
      summary: `Machine ${machineId} recovery verification: insufficient readings (${records.length}/${minConsecutive})`,
      quality: {
        status: "insufficient_data",
        warnings: [
          `Telemetry array has ${records.length} reading(s); minimum required is ${minConsecutive}`,
        ],
      },
    };
  }

  const windowSize = Math.min(
    records.length,
    Number(options.evaluationWindowSize) || Math.max(10, minConsecutive * 2)
  );

  const evaluated = [];
  for (let i = 0; i < windowSize; i += 1) {
    evaluated.push(evaluateReadingAgainstBaseline(records[i], baseline));
  }

  const latestEval = evaluated[0];
  if (latestEval.condition === "INVALID") {
    return {
      machineId,
      verificationStatus: "INSUFFICIENT_DATA",
      verdict: "NO_IMPROVEMENT",
      timestamp: records[0]?.timestamp || new Date().toISOString(),
      readingsEvaluated: windowSize,
      consecutiveHealthy: 0,
      requiredConsecutiveHealthy: minConsecutive,
      improvementScore: 0.0,
      currentCondition: null,
      metricsComparison: {},
      reason: "Latest telemetry reading contains missing or malformed metric values",
      summary: `Machine ${machineId} latest reading invalid`,
      quality: {
        status: "insufficient_data",
        warnings: ["Latest reading could not be evaluated against baseline tolerances"],
      },
    };
  }

  // Count consecutive healthy readings starting from the newest (index 0)
  let consecutiveHealthy = 0;
  for (let i = 0; i < evaluated.length; i += 1) {
    if (evaluated[i].condition === "HEALTHY") {
      consecutiveHealthy += 1;
    } else {
      break;
    }
  }

  // Build metrics comparison object using the latest reading vs baseline
  const metricsComparison = {};
  for (const [key, rule] of Object.entries(METRIC_RULES)) {
    const m = latestEval.metrics[rule.label];
    metricsComparison[rule.label] = {
      field: rule.field,
      current: m?.observed ?? null,
      baseline: baseline[key],
      unit: rule.unit,
      deviationPct: m?.deviationPct ?? null,
      adversePct: m?.adversePct ?? null,
      thresholdPct: rule.softPct,
      status:
        m?.severity === "none"
          ? "healthy"
          : m?.severity === "critical"
            ? "critical"
            : m?.severity === "degraded"
              ? "degraded"
              : "unknown",
    };
  }

  let verificationStatus;
  let verdict;
  let improvementScore;
  let reason;

  // Case 1: VERIFIED — sustained consecutive healthy readings met
  if (consecutiveHealthy >= minConsecutive) {
    verificationStatus = "VERIFIED";
    verdict = "IMPROVED";
    improvementScore = 1.0;
    reason =
      `Recovery verified: sustained ${consecutiveHealthy} consecutive reading(s) ` +
      `within baseline tolerances (minimum required: ${minConsecutive}).`;
  }
  // Case 2: RECOVERING — latest reading is healthy, but streak is less than required
  else if (consecutiveHealthy > 0) {
    verificationStatus = "RECOVERING";
    verdict = "PARTIALLY_IMPROVED";
    improvementScore = Number(
      (consecutiveHealthy / minConsecutive).toFixed(2)
    );
    reason =
      `Telemetry is within healthy tolerances, but only ${consecutiveHealthy} of ` +
      `${minConsecutive} required consecutive reading(s) have been observed. ` +
      `Recovery is not yet verified.`;
  }
  // Case 3: Latest reading is still degraded or critical — check trajectory
  else {
    const historicalEvaluated = evaluated.slice(1).filter((e) => e.condition !== "INVALID");
    const peakHistoricalAdverse =
      historicalEvaluated.length > 0
        ? Math.max(...historicalEvaluated.map((e) => e.totalAdversePct || 0))
        : 0;

    const currentAdverse = latestEval.totalAdversePct || 0;

    // Check if measurements are moving towards baseline from a worse degraded state
    if (
      peakHistoricalAdverse > 0 &&
      currentAdverse < peakHistoricalAdverse &&
      latestEval.condition !== "CRITICAL"
    ) {
      const reduction = (peakHistoricalAdverse - currentAdverse) / peakHistoricalAdverse;
      if (reduction >= 0.15) {
        verificationStatus = "RECOVERING";
        verdict = "PARTIALLY_IMPROVED";
        improvementScore = Number(
          Math.min(0.85, Math.max(0.1, reduction)).toFixed(2)
        );
        reason =
          `Measurements show measurable improvement (${(reduction * 100).toFixed(0)}% ` +
          `adverse deviation reduction vs peak), but conditions remain degraded.`;
      } else {
        verificationStatus = "NOT_RECOVERED";
        verdict = "NO_IMPROVEMENT";
        improvementScore = 0.0;
        reason =
          `Measurements remain degraded without sufficient improvement toward baseline tolerances.`;
      }
    } else {
      verificationStatus = "NOT_RECOVERED";
      verdict = latestEval.condition === "CRITICAL" ? "DEGRADED" : "NO_IMPROVEMENT";
      improvementScore = 0.0;
      reason =
        `Measurements continue to exhibit material degradation (${latestEval.condition.toLowerCase()}) ` +
        `with no verified recovery trend.`;
    }
  }

  const summary =
    `Machine ${machineId} recovery verification: status ${verificationStatus} ` +
    `(${consecutiveHealthy}/${minConsecutive} consecutive healthy readings; ` +
    `evaluated ${windowSize} readings).`;

  return {
    machineId,
    verificationStatus,
    verdict,
    timestamp: records[0]?.timestamp || new Date().toISOString(),
    readingsEvaluated: windowSize,
    consecutiveHealthy,
    requiredConsecutiveHealthy: minConsecutive,
    improvementScore,
    currentCondition: latestEval.condition,
    metricsComparison,
    reason,
    summary,
    quality: {
      status: "ok",
      warnings: [],
    },
  };
}

module.exports = {
  verifyRecovery,
  resolveHealthyBaseline,
  evaluateReadingAgainstBaseline,
  computeBaselineFromRecords,
  DEFAULT_MIN_CONSECUTIVE_HEALTHY,
  KNOWN_MACHINE_BASELINES,
};
