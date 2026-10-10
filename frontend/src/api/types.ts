export interface TelemetryRecord {
  id: string;
  timestamp: string;
  machineId: string;
  energyKw: number;
  productionRate: number;
  wasteKg: number;
  temperature: number;
}

export interface QualityMetrics {
  status: 'ok' | 'degraded' | 'empty';
  readingCount: number;
  warnings: string[];
}

export interface TimeRange {
  earliest: string;
  latest: string;
  durationMs: number;
}

export interface LatestCondition {
  machineId: string | null;
  timestamp: string | null;
  energyKw: number | null;
  productionRate: number | null;
  wasteKg: number | null;
  temperature: number | null;
}

export interface MetricSummary {
  unit: string;
  average: number | null;
  peak?: number | null;
  total?: number | null;
  validReadings: number;
}

export interface EfficiencyMetric {
  unit: string;
  description: string;
  average: number | null;
  validReadings: number;
}

export interface Efficiency {
  energyEfficiency?: EfficiencyMetric;
  wasteIntensity?: EfficiencyMetric;
}

export interface AnalyticsResponse {
  quality: QualityMetrics;
  timeRange: TimeRange | null;
  latestCondition: LatestCondition | null;
  energy: MetricSummary | null;
  production: MetricSummary | null;
  waste: MetricSummary | null;
  temperature: MetricSummary | null;
  efficiency: Efficiency | null;
}
