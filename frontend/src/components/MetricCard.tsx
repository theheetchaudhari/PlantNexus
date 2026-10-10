

interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  secondaryLabel?: string;
  secondaryValue?: string | number | null | undefined;
}

export function MetricCard({ title, value, unit, secondaryLabel, secondaryValue }: MetricCardProps) {
  const formatValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '--';
    if (typeof val === 'number') return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return val;
  };

  return (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value-container">
        <span className="metric-value">{formatValue(value)}</span>
        {unit && value !== null && value !== undefined && (
          <span className="metric-unit">{unit}</span>
        )}
      </div>
      {secondaryLabel && secondaryValue !== undefined && secondaryValue !== null && (
        <div className="metric-secondary">
          <span className="metric-secondary-label">{secondaryLabel}:</span>
          <span className="metric-secondary-value">{formatValue(secondaryValue)} {unit}</span>
        </div>
      )}
    </div>
  );
}
