import { useState } from 'react';
import { useAnalysis } from '../hooks/useAnalysis';
import { ConditionBadge } from './ConditionBadge';
import type { ConditionStatus } from './ConditionBadge';
import type { EvidenceSeverity } from '../api/types';

interface AnalysisDashboardProps {
  machineId: string;
}

export function AnalysisDashboard({ machineId }: AnalysisDashboardProps) {
  const [limit, setLimit] = useState<number>(100);
  const { data, loading, error, execute } = useAnalysis(machineId, limit);

  const handleRunAnalysis = () => {
    execute(limit);
  };

  const getConditionStatus = (cond?: string): ConditionStatus => {
    switch (cond) {
      case 'HEALTHY':
        return 'ok';
      case 'DEGRADED':
        return 'degraded';
      case 'CRITICAL':
        return 'critical';
      default:
        return 'unknown';
    }
  };

  const getSeverityBadgeClass = (sev: EvidenceSeverity) => {
    switch (sev) {
      case 'critical':
        return 'evidence-badge critical';
      case 'degraded':
        return 'evidence-badge degraded';
      default:
        return 'evidence-badge normal';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header and Controls */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Analysis &amp; Evidence</h2>
          <span className="machine-id-badge">{machineId}</span>
          {data && (
            <span className="analysis-id-badge">
              {data.analysisId ? `Analysis #${data.analysisId}` : 'Analysis: Ephemeral'}
            </span>
          )}
        </div>

        <div className="analysis-actions">
          <div className="limit-selector-group">
            <label htmlFor="analysis-limit-select" className="selector-label text-xs">
              Baseline Depth:
            </label>
            <select
              id="analysis-limit-select"
              className="selector-select text-xs"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
            >
              <option value={25}>25 readings</option>
              <option value={50}>50 readings</option>
              <option value={100}>100 readings</option>
              <option value={200}>200 readings</option>
            </select>
          </div>

          <button
            onClick={handleRunAnalysis}
            className="action-button-primary"
            disabled={loading}
          >
            {loading ? 'Evaluating Telemetry...' : '⚡ Run Analysis'}
          </button>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="analysis-banner banner-critical">
          <div className="banner-content">
            <h4>Analysis Request Failed</h4>
            <p>{error.message}</p>
          </div>
          <button onClick={handleRunAnalysis} className="retry-button" disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Initial Idle State */}
      {!data && !loading && !error && (
        <div className="analysis-idle-card">
          <div className="idle-icon">🔍</div>
          <h3>Ready for Anomaly Detection</h3>
          <p>
            Evaluate real historical telemetry for machine <strong>{machineId}</strong> against
            deterministic baseline rules. PlantNexus calculates relative percentage deviations
            for energy, throughput, waste, and temperature, backed by fact-grounded explanations.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="action-button-primary large"
          >
            Run Analysis Now
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="dashboard-container center-content">
          <div className="loading-spinner"></div>
          <p>Loading deterministic anomaly analysis for {machineId}...</p>
        </div>
      )}

      {/* Analysis Results View */}
      {data && (
        <div className="analysis-results">
          {/* Condition & Severity Banner */}
          <div className={`condition-banner banner-${getConditionStatus(data.condition)}`}>
            <div className="condition-banner-main">
              <div className="condition-banner-header">
                <ConditionBadge status={getConditionStatus(data.condition)} />
                <span className="confidence-pill">
                  Confidence: {(data.confidence * 100).toFixed(0)}%
                </span>
                <span className="baseline-depth-pill text-xs">
                  Window: {data.metrics?.baselineDepth ?? 0} historical readings
                </span>
              </div>
              <p className="condition-summary">{data.summary}</p>
            </div>
            {data.quality?.warnings && data.quality.warnings.length > 0 && (
              <div className="quality-warnings">
                <strong>Quality Notice:</strong>
                <ul>
                  {data.quality.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Evidence Grid: Deterministic Metric Deviations */}
          <section className="analysis-section">
            <div className="section-header">
              <h3>Deterministic Evidence &amp; Baseline Deviations</h3>
              <span className="section-subtitle text-xs">
                Relative deviations measured against historical baseline means (excluding latest)
              </span>
            </div>

            {data.evidence && data.evidence.length > 0 ? (
              <div className="evidence-grid">
                {data.evidence.map((item) => (
                  <div key={item.metric} className={`evidence-card severity-${item.severity}`}>
                    <div className="evidence-card-header">
                      <div className="metric-title-group">
                        <span className="metric-name">{item.metric.toUpperCase()}</span>
                        <span className="metric-unit-tag">{item.unit}</span>
                      </div>
                      <span className={getSeverityBadgeClass(item.severity)}>
                        {item.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="evidence-values-row">
                      <div className="val-block">
                        <span className="val-label">Observed</span>
                        <span className="val-number">
                          {item.observed.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="val-block">
                        <span className="val-label">Baseline (Mean)</span>
                        <span className="val-number">
                          {item.baseline.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="val-block">
                        <span className="val-label">Adverse Dev.</span>
                        <span
                          className={`val-number deviation-tag ${
                            (item.adversePct ?? 0) > 0 ? 'adverse-text' : 'normal-text'
                          }`}
                        >
                          {item.adversePct !== null
                            ? `${item.adversePct > 0 ? '+' : ''}${item.adversePct.toFixed(1)}%`
                            : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="evidence-thresholds-strip text-xs">
                      <span>Soft Threshold: {item.softThresholdPct}%</span>
                      <span>Hard Threshold: {item.hardThresholdPct}%</span>
                    </div>

                    {item.recommendation && (
                      <p className="evidence-rec-text text-xs">{item.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="evidence-empty-card">
                <p>
                  No scored evidence items available. The baseline window may have fewer than{' '}
                  {data.metrics?.minBaselineReadings ?? 5} valid historical readings.
                </p>
              </div>
            )}
          </section>

          {/* Explanation & Recommendations */}
          <div className="analysis-split-row">
            {/* Grounded AI Narrative Panel */}
            <section className="analysis-section explanation-panel">
              <div className="section-header">
                <h3>Grounded Operator Explanation</h3>
                <div className="explanation-meta">
                  {data.explanation ? (
                    <span
                      className={`source-badge ${
                        data.explanation.source === 'llm' ? 'source-llm' : 'source-fallback'
                      }`}
                    >
                      {data.explanation.source === 'llm'
                        ? '🤖 Verified LLM Narrative'
                        : '⚙️ Deterministic Narrative'}
                    </span>
                  ) : (
                    <span className="source-badge source-fallback">
                      Detector Only (No Narrative)
                    </span>
                  )}
                </div>
              </div>

              {data.explanation ? (
                <div className="explanation-body">
                  <p className="narrative-paragraph">{data.explanation.narrative}</p>

                  {data.explanation.error && (
                    <div className="explanation-notice text-xs">
                      ℹ️ {data.explanation.error}
                    </div>
                  )}

                  {data.explanation.verificationSuggestion && (
                    <div className="verification-suggestion-box">
                      <span className="suggestion-label text-xs">Next Action &amp; Verification:</span>
                      <p className="suggestion-text text-sm">
                        {data.explanation.verificationSuggestion}
                      </p>
                    </div>
                  )}

                  {data.explanation.uncertainty?.note && (
                    <p className="uncertainty-note text-xs">
                      Note: {data.explanation.uncertainty.note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="explanation-body">
                  <p className="narrative-paragraph">
                    Detector completed condition assessment: <strong>{data.condition}</strong>. AI
                    narrative service was not configured or returned no narrative payload.
                  </p>
                </div>
              )}
            </section>

            {/* Actionable Operator Recommendations */}
            <section className="analysis-section recommendations-panel">
              <div className="section-header">
                <h3>Recommended Operator Actions</h3>
              </div>

              <div className="recommendations-list">
                {data.recommendations && data.recommendations.length > 0 ? (
                  <ul>
                    {data.recommendations.map((rec, i) => (
                      <li key={i} className="recommendation-item">
                        <span className="rec-bullet">→</span>
                        <span className="rec-text">{rec}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-secondary text-sm">No specific action required.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
