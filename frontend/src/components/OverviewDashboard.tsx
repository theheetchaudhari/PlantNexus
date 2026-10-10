
import { useAnalytics } from '../hooks/useAnalytics';
import { MetricCard } from './MetricCard';
import { ConditionBadge } from './ConditionBadge';

interface OverviewDashboardProps {
  machineId: string;
}

export function OverviewDashboard({ machineId }: OverviewDashboardProps) {
  const { data, loading, error, refresh } = useAnalytics(machineId);

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
        <button onClick={() => refresh()} className="retry-button">Retry</button>
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

  const { latestCondition, energy, production, waste, temperature, efficiency, timeRange, quality } = data;

  const getConditionStatus = (): 'ok' | 'degraded' | 'critical' | 'unknown' => {
    // Quality status from backend analytics
    if (quality.status === 'ok') return 'ok';
    if (quality.status === 'degraded') return 'degraded';
    return 'unknown';
  };

  const isStale = timeRange?.latest ? (new Date().getTime() - new Date(timeRange.latest).getTime()) > 60000 : false;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Overview</h2>
          <span className="machine-id-badge">{machineId}</span>
        </div>
        <div className="dashboard-meta">
          <ConditionBadge status={getConditionStatus()} label={quality.status === 'ok' ? 'Healthy' : 'Degraded Data'} />
          <div className="freshness-indicator text-xs">
            {timeRange?.latest ? (
              <span className={isStale ? 'text-stale' : 'text-fresh'}>
                Updated: {new Date(timeRange.latest).toLocaleTimeString()} {isStale && '(Stale)'}
              </span>
            ) : (
              <span>Unknown freshness</span>
            )}
          </div>
        </div>
      </header>

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
    </div>
  );
}
