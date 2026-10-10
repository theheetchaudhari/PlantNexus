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

export type AnomalyCondition = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export type EvidenceSeverity = 'none' | 'degraded' | 'critical';

export interface EvidenceItem {
  metric: string;
  field: string;
  unit: string;
  direction: 'high' | 'low';
  observed: number;
  baseline: number;
  baselineCount: number;
  deviationPct: number | null;
  adversePct: number | null;
  softThresholdPct: number;
  hardThresholdPct: number;
  severity: EvidenceSeverity;
  recommendation: string;
}

export interface MetricBaseline {
  value: number | null;
  count: number;
  unit: string;
}

export interface MetricRule {
  direction: 'high' | 'low';
  softPct: number;
  hardPct: number;
  unit: string;
}

export interface AnalysisMetrics {
  baselineStrategy: string;
  minBaselineReadings: number;
  baselineDepth: number;
  latest: {
    timestamp: string | null;
    energyKw: number | null;
    productionRate: number | null;
    wasteKg: number | null;
    temperature: number | null;
  } | null;
  baselines: Record<string, MetricBaseline>;
  rules: Record<string, MetricRule>;
}

export interface AnalysisQuality {
  status: 'ok' | 'degraded' | 'insufficient_data';
  warnings: string[];
}

export interface ExplanationMeasurement {
  metric: string;
  field: string;
  unit: string;
  direction: 'high' | 'low';
  observed: number;
  baseline: number;
  difference: number;
  deviationPct: number | null;
  adversePct: number | null;
  severity: EvidenceSeverity;
  thresholdPct?: number;
}

export interface ExplanationUncertainty {
  status: string;
  warnings: string[];
  note: string | null;
}

export interface AnalysisExplanation {
  condition: AnomalyCondition;
  severity: 'none' | 'degraded' | 'critical' | 'insufficient';
  issues: ExplanationMeasurement[];
  measurements: ExplanationMeasurement[];
  narrative: string;
  recommendedActions: string[];
  verificationSuggestion: string;
  uncertainty: ExplanationUncertainty;
  source: 'fallback' | 'llm';
  error: string | null;
}

export interface AnalysisResult {
  analysisId: string | number | null;
  machineId: string;
  condition: AnomalyCondition;
  confidence: number;
  summary: string;
  metrics: AnalysisMetrics;
  evidence: EvidenceItem[];
  recommendations: string[];
  quality: AnalysisQuality;
  analytics?: AnalyticsResponse;
  explanation?: AnalysisExplanation;
}

