import { useState } from 'react';
import { useRecoveryVerification } from '../hooks/useRecoveryVerification';
import type {
  VerificationStatus,
  VerificationVerdict,
  MetricComparisonStatus,
} from '../api/types';

interface RecoveryDashboardProps {
  machineId: string;
}

export function RecoveryDashboard({ machineId }: RecoveryDashboardProps) {
  const [limit, setLimit] = useState<number>(50);
  const [minConsecutive, setMinConsecutive] = useState<number>(3);

  const { data, loading, error, execute } = useRecoveryVerification(
    machineId,
    limit,
    minConsecutive
  );

  const handleVerify = () => {
    execute(limit, minConsecutive);
  };

  const getStatusBadgeClass = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return 'recovery-status-badge verified';
      case 'RECOVERING':
        return 'recovery-status-badge recovering';
      case 'NOT_RECOVERED':
        return 'recovery-status-badge not-recovered';
      case 'INSUFFICIENT_DATA':
      default:
        return 'recovery-status-badge insufficient';
    }
  };

  const getVerdictBadgeClass = (verdict: VerificationVerdict) => {
    switch (verdict) {
      case 'IMPROVED':
        return 'verdict-badge improved';
      case 'PARTIALLY_IMPROVED':
        return 'verdict-badge partially-improved';
      case 'DEGRADED':
        return 'verdict-badge degraded';
      case 'NO_IMPROVEMENT':
      default:
        return 'verdict-badge no-improvement';
    }
  };

  const getMetricStatusClass = (status: MetricComparisonStatus) => {
    switch (status) {
      case 'healthy':
        return 'metric-status-tag healthy';
      case 'degraded':
        return 'metric-status-tag degraded';
      case 'critical':
        return 'metric-status-tag critical';
      default:
        return 'metric-status-tag unknown';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header and Controls */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Recovery Verification</h2>
          <span className="machine-id-badge">{machineId}</span>
          {data && (
            <span className="analysis-id-badge">
              {data.verificationId
                ? `Verification #${data.verificationId}`
                : 'Verification: Ephemeral'}
            </span>
          )}
        </div>

        <div className="analysis-actions">
          <div className="limit-selector-group">
            <label htmlFor="recovery-limit-select" className="selector-label text-xs">
              Sample Window:
            </label>
            <select
              id="recovery-limit-select"
              className="selector-select text-xs"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={loading}
            >
              <option value={25}>25 readings</option>
              <option value={50}>50 readings</option>
              <option value={100}>100 readings</option>
            </select>
          </div>

          <div className="limit-selector-group">
            <label htmlFor="recovery-consecutive-select" className="selector-label text-xs">
              Required Streak:
            </label>
            <select
              id="recovery-consecutive-select"
              className="selector-select text-xs"
              value={minConsecutive}
              onChange={(e) => setMinConsecutive(Number(e.target.value))}
              disabled={loading}
            >
              <option value={2}>2 readings</option>
              <option value={3}>3 readings (default)</option>
              <option value={4}>4 readings</option>
              <option value={5}>5 readings</option>
            </select>
          </div>

          <button
            onClick={handleVerify}
            className="action-button-primary"
            disabled={loading}
          >
            {loading ? 'Evaluating...' : '⚡ Verify Recovery'}
          </button>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="analysis-banner banner-critical">
          <div className="banner-content">
            <h4>Recovery Verification Request Failed</h4>
            <p>{error.message}</p>
          </div>
          <button onClick={handleVerify} className="retry-button" disabled={loading}>
            Retry
          </button>
        </div>
      )}

      {/* Initial Idle State */}
      {!data && !loading && !error && (
        <div className="analysis-idle-card">
          <div className="idle-icon">🛡️</div>
          <h3>Verify Equipment Recovery</h3>
          <p>
            Recovery verification tests recent machine telemetry against healthy baseline
            tolerances. To prevent premature declaration of recovery, the system strictly requires
            a sustained sequence of consecutive healthy readings before certifying recovery.
          </p>
          <button onClick={handleVerify} className="action-button-primary large">
            Run Recovery Verification
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="dashboard-container center-content">
          <div className="loading-spinner"></div>
          <p>Evaluating recovery telemetry streak for {machineId}...</p>
        </div>
      )}

      {/* Results View */}
      {data && (
        <div className="analysis-results">
          {/* Main Status & Verdict Banner */}
          <div className={`recovery-banner status-${data.verificationStatus.toLowerCase()}`}>
            <div className="recovery-banner-top">
              <div className="recovery-badges-group">
                <span className={getStatusBadgeClass(data.verificationStatus)}>
                  {data.verificationStatus.replace('_', ' ')}
                </span>
                <span className={getVerdictBadgeClass(data.verdict)}>
                  VERDICT: {data.verdict.replace('_', ' ')}
                </span>
                <span className="improvement-pill text-xs">
                  Score: {(data.improvementScore * 100).toFixed(0)}%
                </span>
              </div>
              <span className="timestamp-note text-xs">
                Evaluated: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <p className="recovery-summary-text">{data.summary}</p>
            <p className="recovery-reason-text text-sm">{data.reason}</p>

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

          {/* Consecutive Healthy Streak Card */}
          <section className="analysis-section">
            <div className="section-header">
              <h3>Consecutive Healthy Telemetry Streak</h3>
              <span className="section-subtitle text-xs">
                {data.readingsEvaluated} readings inspected in evaluation window
              </span>
            </div>

            <div className="streak-progress-container">
              <div className="streak-stats-row">
                <div className="streak-number-group">
                  <span className="streak-big-number">{data.consecutiveHealthy}</span>
                  <span className="streak-divider">/</span>
                  <span className="streak-target-number">
                    {data.requiredConsecutiveHealthy}
                  </span>
                  <span className="streak-label text-sm">
                    consecutive healthy reading(s)
                  </span>
                </div>

                <div className="streak-status-text text-sm">
                  {data.consecutiveHealthy >= data.requiredConsecutiveHealthy ? (
                    <span className="streak-satisfied-text">
                      ✓ Minimum required healthy sequence met
                    </span>
                  ) : (
                    <span className="streak-pending-text">
                      Awaiting {data.requiredConsecutiveHealthy - data.consecutiveHealthy} more
                      consecutive healthy reading(s)
                    </span>
                  )}
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="streak-progress-bar-track">
                <div
                  className={`streak-progress-bar-fill ${
                    data.consecutiveHealthy >= data.requiredConsecutiveHealthy
                      ? 'fill-complete'
                      : 'fill-partial'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (data.consecutiveHealthy / (data.requiredConsecutiveHealthy || 1)) * 100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </section>

          {/* Before-and-After Metric Baseline Comparison */}
          <section className="analysis-section">
            <div className="section-header">
              <h3>Baseline vs. Current Metric Comparison</h3>
              <span className="section-subtitle text-xs">
                Comparing current observed readings against authoritative healthy baseline
              </span>
            </div>

            {data.metricsComparison && Object.keys(data.metricsComparison).length > 0 ? (
              <div className="evidence-grid">
                {Object.entries(data.metricsComparison).map(([key, item]) => (
                  <div
                    key={key}
                    className={`evidence-card severity-${
                      item.status === 'healthy'
                        ? 'none'
                        : item.status === 'critical'
                          ? 'critical'
                          : 'degraded'
                    }`}
                  >
                    <div className="evidence-card-header">
                      <div className="metric-title-group">
                        <span className="metric-name">{key.toUpperCase()}</span>
                        <span className="metric-unit-tag">{item.unit}</span>
                      </div>
                      <span className={getMetricStatusClass(item.status)}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="evidence-values-row">
                      <div className="val-block">
                        <span className="val-label">Baseline (Ref)</span>
                        <span className="val-number">
                          {item.baseline.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="val-block">
                        <span className="val-label">Current</span>
                        <span className="val-number">
                          {item.current !== null
                            ? item.current.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : '--'}
                        </span>
                      </div>
                      <div className="val-block">
                        <span className="val-label">Deviation</span>
                        <span
                          className={`val-number deviation-tag ${
                            (item.adversePct ?? 0) > 0 ? 'adverse-text' : 'normal-text'
                          }`}
                        >
                          {item.deviationPct !== null
                            ? `${item.deviationPct > 0 ? '+' : ''}${item.deviationPct.toFixed(1)}%`
                            : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="evidence-thresholds-strip text-xs">
                      <span>Tolerance Threshold: {item.thresholdPct}%</span>
                      <span>
                        Adverse:{' '}
                        {item.adversePct !== null ? `${item.adversePct.toFixed(1)}%` : '--'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="evidence-empty-card">
                <p>No metric comparison data available for this machine.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
