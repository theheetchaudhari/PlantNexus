import { useAnalytics } from '../hooks/useAnalytics';
import { useAnalysis } from '../hooks/useAnalysis';
import type { UseAnalysisResult } from '../hooks/useAnalysis';
import { useRecoveryVerification } from '../hooks/useRecoveryVerification';
import type { UseRecoveryVerificationResult } from '../hooks/useRecoveryVerification';
import type { TabId } from './TabNavigation';
import { MetricCard } from './MetricCard';
import { ConditionBadge } from './ConditionBadge';
import type { ConditionStatus } from './ConditionBadge';
import type { VerificationStatus, VerificationVerdict } from '../api/types';

interface OverviewDashboardProps {
  machineId: string;
  analysisState?: UseAnalysisResult;
  recoveryState?: UseRecoveryVerificationResult;
  onNavigateTab?: (tab: TabId) => void;
}

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Not Available';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

export function OverviewDashboard({
  machineId,
  analysisState,
  recoveryState,
  onNavigateTab,
}: OverviewDashboardProps) {
  const { data, loading, error, refresh } = useAnalytics(machineId);

  // Fallback hooks if not passed from parent
  const internalAnalysis = useAnalysis(machineId);
  const internalRecovery = useRecoveryVerification(machineId);

  const analysis = analysisState || internalAnalysis;
  const recovery = recoveryState || internalRecovery;

  if (loading && !data) {
    return (
      <div className="dashboard-container center-content">
        <div className="loading-spinner"></div>
        <p>Loading analytics for {machineId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container center-content error-state">
        <h3>Error loading dashboard</h3>
        <p>{error.message}</p>
        <button onClick={() => refresh()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.quality.status === 'empty') {
    return (
      <div className="dashboard-container center-content empty-state">
        <ConditionBadge status="empty" />
        <h3>No telemetry available</h3>
        <p>Awaiting data for machine {machineId}. Ensure the simulator is running.</p>
      </div>
    );
  }

  const {
    latestCondition,
    energy,
    production,
    waste,
    temperature,
    efficiency,
    timeRange,
    quality,
  } = data;

  // Operational status strictly derived from deterministic condition (never from data packet quality)
  const getOperationalStatus = (): ConditionStatus => {
    if (data.condition) {
      switch (data.condition) {
        case 'HEALTHY':
          return 'ok';
        case 'DEGRADED':
          return 'degraded';
        case 'CRITICAL':
          return 'critical';
        default:
          return 'unknown';
      }
    }
    return 'unknown';
  };

  const getConditionBadgeStatus = (cond?: string | null): ConditionStatus => {
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

  const getRecoveryBadgeClass = (status: VerificationStatus | 'NOT_RUN') => {
    switch (status) {
      case 'VERIFIED':
        return 'recovery-status-badge verified';
      case 'RECOVERING':
        return 'recovery-status-badge recovering';
      case 'NOT_RECOVERED':
        return 'recovery-status-badge not-recovered';
      case 'INSUFFICIENT_DATA':
        return 'recovery-status-badge insufficient';
      case 'NOT_RUN':
      default:
        return 'recovery-status-badge not-run';
    }
  };

  const getVerdictBadgeClass = (verdict?: VerificationVerdict) => {
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

  const isStale = timeRange?.latest
    ? new Date().getTime() - new Date(timeRange.latest).getTime() > 60000
    : false;

  // Analysis resolution:
  // Priority 1: Full session analysis from useAnalysis (with AI or fallback narrative)
  // Priority 2: Automatic deterministic detection from live telemetry analytics (GET /api/telemetry/analytics)
  const fullAnalysis = analysis.data;
  const autoDetection = data.detection;
  const isFullAnalysis = !!fullAnalysis;
  const isAutoAnalysis = !fullAnalysis && !!autoDetection;

  const activeAnalysis = fullAnalysis || autoDetection;
  const analysisTimestamp = fullAnalysis
    ? analysis.lastEvaluatedAt || fullAnalysis.timestamp
    : autoDetection?.evaluatedAt;

  // Extract primary evidence (metric with highest adverse percentage)
  const evidenceList = activeAnalysis?.evidence || [];
  const primaryEvidence =
    evidenceList.length > 0
      ? [...evidenceList].sort(
          (a, b) => (b.adversePct ?? 0) - (a.adversePct ?? 0)
        )[0]
      : null;

  const primaryRecommendation = activeAnalysis?.recommendations?.[0] || null;

  // Recovery resolution
  const recoveryResult = recovery.data;
  const isRecoveryRun = !!recoveryResult;
  const recoveryTimestamp = recovery.lastEvaluatedAt || recoveryResult?.timestamp;

  return (
    <div className="dashboard-container">
      {/* Dashboard Top Header */}
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Overview</h2>
          <span className="machine-id-badge">{machineId}</span>
        </div>
        <div className="dashboard-meta">
          <div className="status-badge-group">
            <ConditionBadge
              status={getOperationalStatus()}
              label={data.condition ? undefined : 'Unavailable'}
            />
            <span
              className={`data-quality-pill text-xs ${
                quality.status === 'degraded' ? 'degraded' : ''
              }`}
            >
              Data:{' '}
              {quality.status === 'ok'
                ? 'Valid'
                : quality.status === 'degraded'
                ? 'Degraded'
                : 'No Data'}
            </span>
          </div>
        </div>
      </header>

      {/* Freshness Strip: 3 Clearly Distinct Timestamps */}
      <div className="freshness-strip">
        <div className="freshness-item">
          <span className="freshness-label">Last Telemetry</span>
          <span className={`freshness-value ${isStale ? 'text-stale' : 'text-fresh'}`}>
            {timeRange?.latest ? formatTimestamp(timeRange.latest) : 'Unknown'}{' '}
            {isStale && '(Stale)'}
          </span>
          <span className="freshness-subtext">Live Telemetry Ingest</span>
        </div>

        <div className="freshness-item">
          <span className="freshness-label">Last Analysis</span>
          <span className="freshness-value">
            {analysisTimestamp ? formatTimestamp(analysisTimestamp) : 'Not Run'}
          </span>
          <span className="freshness-subtext">
            {isFullAnalysis
              ? 'Session Ephemeral'
              : isAutoAnalysis
              ? 'Deterministic Baseline Check'
              : 'Pending Evaluation'}
          </span>
        </div>

        <div className="freshness-item">
          <span className="freshness-label">Last Recovery Check</span>
          <span className="freshness-value">
            {recoveryTimestamp ? formatTimestamp(recoveryTimestamp) : 'Not Run'}
          </span>
          <span className="freshness-subtext">
            {isRecoveryRun ? 'Session Ephemeral' : 'Not Evaluated'}
          </span>
        </div>
      </div>

      {/* Data Quality Warnings */}
      {quality.warnings && quality.warnings.length > 0 && (
        <div className="quality-warnings" style={{ margin: 'var(--space-4) 0' }}>
          <strong>Data Quality Notice:</strong>
          <ul>
            {quality.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Real-Time Telemetry Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Energy Consumption"
          value={latestCondition?.energyKw}
          unit={energy?.unit}
          secondaryLabel="Avg"
          secondaryValue={energy?.average}
        />
        <MetricCard
          title="Production Rate"
          value={latestCondition?.productionRate}
          unit={production?.unit}
          secondaryLabel="Avg"
          secondaryValue={production?.average}
        />
        <MetricCard
          title="Waste Generated"
          value={latestCondition?.wasteKg}
          unit={waste?.unit}
          secondaryLabel="Total"
          secondaryValue={waste?.total}
        />
        <MetricCard
          title="Temperature"
          value={latestCondition?.temperature}
          unit={temperature?.unit}
          secondaryLabel="Peak"
          secondaryValue={temperature?.peak}
        />
        {efficiency?.energyEfficiency && (
          <MetricCard
            title="Energy Efficiency"
            value={efficiency.energyEfficiency.average}
            unit={efficiency.energyEfficiency.unit}
          />
        )}
      </div>

      {/* Overview Intelligence Summaries Grid: Analysis + Recovery */}
      <div className="overview-intelligence-grid">
        {/* Card 1: Latest Anomaly Analysis Summary */}
        <section className="overview-summary-card">
          <div className="overview-summary-header">
            <div className="overview-summary-title-area">
              <h3 className="overview-summary-title">Latest Anomaly Analysis</h3>
              <div className="overview-summary-badges">
                {activeAnalysis ? (
                  <>
                    <ConditionBadge
                      status={getConditionBadgeStatus(activeAnalysis.condition)}
                    />
                    {isFullAnalysis ? (
                      <span
                        className={`source-badge text-xs ${
                          fullAnalysis.explanation?.source === 'llm'
                            ? 'source-llm'
                            : 'source-fallback'
                        }`}
                      >
                        {fullAnalysis.explanation?.source === 'llm'
                          ? '🤖 Verified LLM Narrative'
                          : '⚙️ Deterministic Narrative'}
                      </span>
                    ) : (
                      <span className="source-badge source-fallback text-xs">
                        ⚙️ Deterministic Detection
                      </span>
                    )}
                    <span className="confidence-pill text-xs">
                      Confidence: {(activeAnalysis.confidence * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span className="recovery-status-badge not-run">NOT RUN</span>
                )}
              </div>
            </div>

            <div className="overview-summary-actions">
              <button
                onClick={() => analysis.execute()}
                disabled={analysis.loading}
                className="action-button-primary text-xs"
                title="Run comprehensive analysis with grounded AI reasoning"
              >
                {analysis.loading ? 'Evaluating...' : '⚡ Run Analysis'}
              </button>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('analysis')}
                  className="overview-link-btn"
                >
                  Full Details →
                </button>
              )}
            </div>
          </div>

          <div className="overview-summary-body">
            {activeAnalysis ? (
              <>
                <p className="condition-summary text-sm" style={{ margin: 0 }}>
                  {activeAnalysis.summary}
                </p>

                {/* Primary Evidence Block */}
                {primaryEvidence ? (
                  <div className="overview-evidence-box">
                    <span className="overview-box-label">Primary Evidence</span>
                    <div className="overview-evidence-line">
                      <span className="overview-evidence-metric">
                        {primaryEvidence.metric.toUpperCase()}
                      </span>
                      <span
                        className={`deviation-tag ${
                          (primaryEvidence.adversePct ?? 0) > 0
                            ? 'adverse-text'
                            : 'normal-text'
                        }`}
                        style={{ fontWeight: 'bold' }}
                      >
                        {primaryEvidence.adversePct !== null
                          ? `${primaryEvidence.adversePct > 0 ? '+' : ''}${primaryEvidence.adversePct.toFixed(1)}% adverse`
                          : 'Baseline matched'}
                      </span>
                    </div>
                    <div className="overview-evidence-numbers">
                      Observed:{' '}
                      <strong>
                        {primaryEvidence.observed.toFixed(2)} {primaryEvidence.unit}
                      </strong>{' '}
                      vs Baseline:{' '}
                      <strong>
                        {primaryEvidence.baseline.toFixed(2)} {primaryEvidence.unit}
                      </strong>
                    </div>
                    {primaryEvidence.recommendation && (
                      <p className="text-xs text-secondary" style={{ margin: 0, fontStyle: 'italic' }}>
                        {primaryEvidence.recommendation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overview-evidence-box">
                    <span className="overview-box-label">Primary Evidence</span>
                    <p className="text-xs text-secondary" style={{ margin: 0 }}>
                      No adverse deviations detected. Operating within baseline tolerances.
                    </p>
                  </div>
                )}

                {/* Recommended Operator Action Block */}
                {primaryRecommendation && (
                  <div className="overview-action-box">
                    <span className="overview-box-label" style={{ color: 'var(--color-primary)' }}>
                      Recommended Operator Action
                    </span>
                    <p className="overview-action-text">{primaryRecommendation}</p>
                  </div>
                )}

                {/* Grounding & Persistence Status */}
                <div
                  className="text-xs text-tertiary"
                  style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}
                >
                  <span>
                    Evaluated:{' '}
                    {analysisTimestamp ? formatTimestamp(analysisTimestamp) : 'Just now'} (
                    {fullAnalysis?.analysisId ? `Analysis #${fullAnalysis.analysisId}` : 'Session Ephemeral'})
                  </span>
                  {isAutoAnalysis && (
                    <span className="text-accent" style={{ fontWeight: 600 }}>
                      AI reasoning pending (click Run Analysis)
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="overview-idle-notice">
                <p>
                  No anomaly analysis has been evaluated in this session. Telemetry history requires
                  at least 5 valid readings to establish baseline tolerances.
                </p>
                <button
                  onClick={() => analysis.execute()}
                  disabled={analysis.loading}
                  className="action-button-primary text-xs"
                >
                  {analysis.loading ? 'Evaluating...' : 'Run Deterministic Analysis'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Card 2: Equipment Recovery Verification Summary */}
        <section className="overview-summary-card">
          <div className="overview-summary-header">
            <div className="overview-summary-title-area">
              <h3 className="overview-summary-title">Recovery Verification</h3>
              <div className="overview-summary-badges">
                {isRecoveryRun ? (
                  <>
                    <span
                      className={getRecoveryBadgeClass(
                        recoveryResult.verificationStatus
                      )}
                    >
                      {recoveryResult.verificationStatus.replace('_', ' ')}
                    </span>
                    <span
                      className={getVerdictBadgeClass(recoveryResult.verdict)}
                    >
                      VERDICT: {recoveryResult.verdict.replace('_', ' ')}
                    </span>
                    <span className="improvement-pill text-xs">
                      Score: {(recoveryResult.improvementScore * 100).toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <span className="recovery-status-badge not-run">NOT RUN</span>
                )}
              </div>
            </div>

            <div className="overview-summary-actions">
              <button
                onClick={() => recovery.execute()}
                disabled={recovery.loading}
                className="action-button-primary text-xs"
                title="Verify sustained consecutive healthy telemetry streak"
              >
                {recovery.loading ? 'Evaluating...' : '⚡ Verify Recovery'}
              </button>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('recovery')}
                  className="overview-link-btn"
                >
                  Full Breakdown →
                </button>
              )}
            </div>
          </div>

          <div className="overview-summary-body">
            {isRecoveryRun ? (
              <>
                <p className="recovery-summary-text text-sm" style={{ margin: 0 }}>
                  {recoveryResult.summary}
                </p>

                {/* Consecutive Healthy Streak Block */}
                <div className="streak-progress-container" style={{ padding: 0 }}>
                  <div className="streak-stats-row">
                    <div className="streak-number-group">
                      <span className="streak-big-number">
                        {recoveryResult.consecutiveHealthy}
                      </span>
                      <span className="streak-divider">/</span>
                      <span className="streak-target-number">
                        {recoveryResult.requiredConsecutiveHealthy}
                      </span>
                      <span className="streak-label text-xs">
                        consecutive healthy reading(s)
                      </span>
                    </div>

                    <div className="streak-status-text text-xs">
                      {recoveryResult.consecutiveHealthy >=
                      recoveryResult.requiredConsecutiveHealthy ? (
                        <span className="streak-satisfied-text">
                          ✓ Required healthy streak achieved
                        </span>
                      ) : (
                        <span className="streak-pending-text">
                          Awaiting{' '}
                          {recoveryResult.requiredConsecutiveHealthy -
                            recoveryResult.consecutiveHealthy}{' '}
                          more healthy reading(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="streak-progress-bar-track">
                    <div
                      className={`streak-progress-bar-fill ${
                        recoveryResult.consecutiveHealthy >=
                        recoveryResult.requiredConsecutiveHealthy
                          ? 'fill-complete'
                          : 'fill-partial'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (recoveryResult.consecutiveHealthy /
                            (recoveryResult.requiredConsecutiveHealthy || 1)) *
                            100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {recoveryResult.reason && (
                  <p className="text-xs text-secondary" style={{ margin: 0 }}>
                    {recoveryResult.reason}
                  </p>
                )}

                {/* Honest Integrity Notice */}
                <div className="recovery-integrity-notice">
                  ⚠️ <strong>Integrity check:</strong> Recovery requires verified consecutive
                  healthy readings within baseline tolerances. Active telemetry arrival does not
                  imply equipment recovery.
                </div>

                <div
                  className="text-xs text-tertiary"
                  style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}
                >
                  <span>
                    Evaluated:{' '}
                    {recoveryTimestamp ? formatTimestamp(recoveryTimestamp) : 'Just now'} (
                    {recoveryResult.verificationId
                      ? `Verification #${recoveryResult.verificationId}`
                      : 'Session Ephemeral'}
                    )
                  </span>
                </div>
              </>
            ) : (
              <div className="overview-idle-notice">
                <p>
                  Recovery verification has not been evaluated in this session. Plant Nexus
                  requires a sustained sequence of consecutive healthy readings before certifying
                  equipment recovery.
                </p>
                <div className="recovery-integrity-notice" style={{ width: '100%', textAlign: 'left' }}>
                  ⚠️ Telemetry arrival alone does not certify recovery.
                </div>
                <button
                  onClick={() => recovery.execute()}
                  disabled={recovery.loading}
                  className="action-button-primary text-xs"
                >
                  {recovery.loading ? 'Evaluating...' : 'Run Recovery Verification'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
