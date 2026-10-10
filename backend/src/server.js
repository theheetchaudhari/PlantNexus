
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { computeAnalytics } = require("./analytics");
const { detectAnomalies } = require("./detector");
const { explainAnalysis, buildFallbackExplanation } = require("./explain");

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables in backend/.env");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "plantnexus-backend",
  });
});

// Telemetry ingestion
app.post("/api/telemetry", async (req, res) => {
  const {
    timestamp,
    machineId,
    energyKw,
    productionRate,
    wasteKg,
    temperature,
  } = req.body || {};

  const missingFields = [
    "timestamp",
    "machineId",
    "energyKw",
    "productionRate",
    "wasteKg",
    "temperature",
  ].filter(
    (field) =>
      req.body?.[field] === undefined ||
      req.body?.[field] === null ||
      req.body?.[field] === ""
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const numericFields = {
    energyKw,
    productionRate,
    wasteKg,
    temperature,
  };

  for (const [field, value] of Object.entries(numericFields)) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return res.status(400).json({
        success: false,
        error: `${field} must be a finite number`,
      });
    }
  }

  if (typeof machineId !== "string" || !machineId.trim()) {
    return res.status(400).json({
      success: false,
      error: "machineId must be a non-empty string",
    });
  }

  const parsedTimestamp = new Date(timestamp);

  if (
    typeof timestamp !== "string" ||
    !Number.isFinite(parsedTimestamp.getTime())
  ) {
    return res.status(400).json({
      success: false,
      error: "timestamp must be a valid date string",
    });
  }

  const row = {
    timestamp: parsedTimestamp.toISOString(),
    machine_id: machineId.trim(),
    energy_kw: energyKw,
    production_rate: productionRate,
    waste_kg: wasteKg,
    temperature,
  };

  try {
    const { data, error } = await supabase
      .from("telemetry")
      .insert(row)
      .select("id, timestamp, machine_id")
      .single();

    if (error) {
      console.error("[Supabase] Telemetry insert failed:", error.message);

      return res.status(500).json({
        success: false,
        error: "Failed to save telemetry",
      });
    }

    console.log(
      `[Backend] Saved telemetry for ${machineId}: ` +
        `energy=${energyKw}kW, production=${productionRate}, ` +
        `waste=${wasteKg}kg, temperature=${temperature}°C`
    );

    return res.status(201).json({
      success: true,
      message: "Telemetry saved",
      data: {
        id: data.id,
        timestamp: data.timestamp,
        machineId: data.machine_id,
        energyKw,
        productionRate,
        wasteKg,
        temperature,
      },
    });
  } catch (error) {
    console.error("[Backend] Unexpected telemetry error:", error.message);

    return res.status(500).json({
      success: false,
      error: "An unexpected error occurred while saving telemetry",
    });
  }
});

// Get telemetry data
app.get("/api/telemetry", async (req, res) => {
  const { machineId, limit = 100 } = req.query;

  try {
    let query = supabase
      .from("telemetry")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (machineId) {
      query = query.eq("machine_id", machineId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Fetch telemetry failed:", error.message);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[Backend] Unexpected fetch error:", error.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// Get telemetry analytics
app.get("/api/telemetry/analytics", async (req, res) => {
  const { machineId, limit = 1000 } = req.query;

  try {
    let query = supabase
      .from("telemetry")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (machineId) {
      query = query.eq("machine_id", machineId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Supabase] Fetch telemetry for analytics failed:", error.message);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    const analytics = computeAnalytics(data);

    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error("[Backend] Unexpected analytics error:", error.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

// Deterministic anomaly analysis (Milestone 3)
app.post("/api/analyze", async (req, res) => {
  const machineId =
    typeof req.body?.machineId === "string" ? req.body.machineId.trim() : "";
  const limitRaw = req.body?.limit;
  const limit =
    limitRaw === undefined || limitRaw === null ? 100 : Number(limitRaw);

  if (!machineId) {
    return res.status(400).json({
      success: false,
      error: "machineId is required and must be a non-empty string",
    });
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return res.status(400).json({
      success: false,
      error: "limit must be a positive number",
    });
  }

  try {
    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("machine_id", machineId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Supabase] Fetch telemetry for analyze failed:", error.message);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    const records = data || [];
    const analytics = computeAnalytics(records);
    const detection = detectAnomalies(records);

    const analysisForExplain = {
      machineId,
      condition: detection.condition,
      confidence: detection.confidence,
      summary: detection.summary,
      metrics: detection.metrics,
      evidence: detection.evidence,
      recommendations: detection.recommendations,
      quality: detection.quality,
      analytics,
    };

    let explanation;
    try {
      explanation = await explainAnalysis(analysisForExplain);
    } catch (explainError) {
      explanation = buildFallbackExplanation(analysisForExplain);
      explanation.error =
        `Explanation failed (${explainError.message}); used fallback narrative`;
    }

    let analysisId = null;
    const { data: saved, error: saveError } = await supabase
      .from("intelligence_analysis")
      .insert({
        telemetry_id: detection.telemetryId,
        machine_id: machineId,
        condition: detection.condition,
        confidence: detection.confidence,
        summary: detection.summary,
        metrics: detection.metrics,
        evidence: detection.evidence,
        recommendations: detection.recommendations,
      })
      .select("id")
      .single();

    if (saveError) {
      // Detection still succeeds even if persistence is unavailable.
      console.error(
        "[Supabase] Persist intelligence_analysis failed:",
        saveError.message
      );
    } else {
      analysisId = saved?.id ?? null;
    }

    return res.status(200).json({
      success: true,
      data: {
        analysisId,
        machineId,
        condition: detection.condition,
        confidence: detection.confidence,
        summary: detection.summary,
        metrics: detection.metrics,
        evidence: detection.evidence,
        recommendations: detection.recommendations,
        quality: detection.quality,
        analytics,
        explanation,
      },
    });
  } catch (error) {
    console.error("[Backend] Unexpected analyze error:", error.message);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
