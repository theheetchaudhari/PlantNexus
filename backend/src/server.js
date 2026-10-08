require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "plantnexus-backend",
  });
});

// Telemetry ingestion endpoint
app.post("/api/telemetry", (req, res) => {
  const { timestamp, machineId, energyKw, productionRate, wasteKg, temperature } =
    req.body || {};

  const requiredFields = [
    "timestamp",
    "machineId",
    "energyKw",
    "productionRate",
    "wasteKg",
    "temperature",
  ];

  const missingFields = requiredFields.filter(
    (field) => req.body?.[field] === undefined || req.body?.[field] === null
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  console.log(
    `[Backend] Received telemetry for ${machineId}: energy=${energyKw}kW, prod=${productionRate}, waste=${wasteKg}kg, temp=${temperature}°C`
  );

  return res.status(201).json({
    success: true,
    data: {
      timestamp,
      machineId,
      energyKw,
      productionRate,
      wasteKg,
      temperature,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
