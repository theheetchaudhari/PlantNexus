import { useState, useMemo, useEffect } from 'react';
import { useTelemetry } from '../hooks/useTelemetry';
import { TelemetryChartCard } from './TelemetryChartCard';
import type { ChartDataPoint } from './TelemetryChartCard';
import { ConditionBadge } from './ConditionBadge';

interface TelemetryTrendsProps {
  machineId: string;
}

type MetricFilter = 'all' | 'energy' | 'production' | 'waste' | 'temperature';

function formatShortTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (!Number.isFinite(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

function formatFullTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (!Number.isFinite(d.getTime())) return isoString;
    return d.toLocaleString();
  } catch {
    return isoString;
  }
}

export function TelemetryTrends({ machineId }: TelemetryTrendsProps) {
  const [limit, setLimit] = useState<number>(100);
  const [activeFilter, setActiveFilter] = useState<MetricFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { data, loading, error, refresh } = useTelemetry(machineId, limit);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort chronological (ascending) for time-series display
  const sortedTelemetry = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data]
      .filter((item) => item && item.timestamp)
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
      });
  }, [data]);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const latestRecord = sortedTelemetry.length > 0 ? sortedTelemetry[sortedTelemetry.length - 1] : null;
  const latestTime = latestRecord ? new Date(latestRecord.timestamp) : null;
  const isStale = latestTime ? now - latestTime.getTime() > 60000 : false;

  const energyData: ChartDataPoint[] = useMemo(() => {
    return sortedTelemetry.map((item) => ({
      id: item.id,
      timeLabel: formatShortTime(item.timestamp),
      fullTime: formatFullTime(item.timestamp),
      value:
        typeof item.energyKw === 'number' && Number.isFinite(item.energyKw)
          ? item.energyKw
          : null,
    }));
  }, [sortedTelemetry]);

  const productionData: ChartDataPoint[] = useMemo(() => {
    return sortedTelemetry.map((item) => ({
      id: item.id,
      timeLabel: formatShortTime(item.timestamp),
      fullTime: formatFullTime(item.timestamp),
      value:
        typeof item.productionRate === 'number' && Number.isFinite(item.productionRate)
          ? item.productionRate
          : null,
    }));
  }, [sortedTelemetry]);

  const wasteData: ChartDataPoint[] = useMemo(() => {
    return sortedTelemetry.map((item) => ({
      id: item.id,
      timeLabel: formatShortTime(item.timestamp),
      fullTime: formatFullTime(item.timestamp),
      value:
        typeof item.wasteKg === 'number' && Number.isFinite(item.wasteKg)
          ? item.wasteKg
          : null,
    }));
  }, [sortedTelemetry]);

  const temperatureData: ChartDataPoint[] = useMemo(() => {
    return sortedTelemetry.map((item) => ({
      id: item.id,
      timeLabel: formatShortTime(item.timestamp),
      fullTime: formatFullTime(item.timestamp),
      value:
        typeof item.temperature === 'number' && Number.isFinite(item.temperature)
          ? item.temperature
          : null,
    }));
  }, [sortedTelemetry]);

  if (loading && data.length === 0) {
    return (
      <div className="dashboard-container center-content">
        <div className="loading-spinner"></div>
        <p>Loading telemetry trends for {machineId}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container center-content error-state">
        <h3>Error loading telemetry</h3>
        <p>{error.message}</p>
        <button onClick={handleRefresh} className="retry-button" disabled={isRefreshing}>
          {isRefreshing ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    );
  }

  if (sortedTelemetry.length === 0) {
    return (
      <div className="dashboard-container center-content empty-state">
        <ConditionBadge status="empty" />
        <h3>No telemetry available</h3>
        <p>Awaiting records for machine {machineId}. Ensure the simulator is actively running.</p>
        <button onClick={handleRefresh} className="retry-button" disabled={isRefreshing}>
          {isRefreshing ? 'Checking...' : 'Check Again'}
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-title-area">
          <h2>Telemetry Trends</h2>
          <span className="machine-id-badge">{machineId}</span>
          <span className="records-count-badge">{sortedTelemetry.length} readings</span>
        </div>
        <div className="dashboard-meta">
          <div className="freshness-indicator text-xs">
            {latestTime ? (
              <span className={isStale ? 'text-stale' : 'text-fresh'}>
                Latest reading: {latestTime.toLocaleTimeString()} {isStale && '(Stale)'}
              </span>
            ) : (
              <span>Unknown freshness</span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="action-button-subtle text-xs"
            disabled={isRefreshing}
            title="Refresh telemetry"
          >
            {isRefreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </header>

      <div className="telemetry-toolbar">
        <div className="filter-pill-group" role="tablist" aria-label="Metric filter">
          <button
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Metrics
          </button>
          <button
            className={`filter-pill ${activeFilter === 'energy' ? 'active' : ''}`}
            onClick={() => setActiveFilter('energy')}
          >
            Energy (kW)
          </button>
          <button
            className={`filter-pill ${activeFilter === 'production' ? 'active' : ''}`}
            onClick={() => setActiveFilter('production')}
          >
            Production
          </button>
          <button
            className={`filter-pill ${activeFilter === 'waste' ? 'active' : ''}`}
            onClick={() => setActiveFilter('waste')}
          >
            Waste (kg)
          </button>
          <button
            className={`filter-pill ${activeFilter === 'temperature' ? 'active' : ''}`}
            onClick={() => setActiveFilter('temperature')}
          >
            Temperature (°C)
          </button>
        </div>

        <div className="limit-selector-group">
          <label htmlFor="telemetry-limit-select" className="selector-label text-xs">
            Window:
          </label>
          <select
            id="telemetry-limit-select"
            className="selector-select text-xs"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={25}>Latest 25 readings</option>
            <option value={50}>Latest 50 readings</option>
            <option value={100}>Latest 100 readings</option>
            <option value={200}>Latest 200 readings</option>
          </select>
        </div>
      </div>

      <div className={`charts-grid ${activeFilter !== 'all' ? 'single-metric' : ''}`}>
        {(activeFilter === 'all' || activeFilter === 'energy') && (
          <TelemetryChartCard
            title="Energy Consumption"
            unit="kW"
            strokeColor="#1B3A5C"
            gradientId="energy-gradient"
            data={energyData}
            yAxisDomain={['auto', 'auto']}
          />
        )}

        {(activeFilter === 'all' || activeFilter === 'production') && (
          <TelemetryChartCard
            title="Production Rate"
            unit="units/hr"
            strokeColor="#16A34A"
            gradientId="prod-gradient"
            data={productionData}
            yAxisDomain={[0, 'auto']}
          />
        )}

        {(activeFilter === 'all' || activeFilter === 'waste') && (
          <TelemetryChartCard
            title="Waste Generated"
            unit="kg"
            strokeColor="#D97706"
            gradientId="waste-gradient"
            data={wasteData}
            yAxisDomain={[0, 'auto']}
          />
        )}

        {(activeFilter === 'all' || activeFilter === 'temperature') && (
          <TelemetryChartCard
            title="Temperature"
            unit="°C"
            strokeColor="#DC2626"
            gradientId="temp-gradient"
            data={temperatureData}
            yAxisDomain={['auto', 'auto']}
          />
        )}
      </div>
    </div>
  );
}
