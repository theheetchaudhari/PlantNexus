

export type ConditionStatus = 'ok' | 'degraded' | 'critical' | 'unknown' | 'empty';

interface ConditionBadgeProps {
  status: ConditionStatus;
  label?: string;
}

export function ConditionBadge({ status, label }: ConditionBadgeProps) {
  const getStatusLabel = () => {
    if (label) return label;
    switch (status) {
      case 'ok': return 'Healthy';
      case 'degraded': return 'Degraded';
      case 'critical': return 'Critical';
      case 'empty': return 'No Data';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`condition-badge condition-${status}`}>
      <div className="condition-dot"></div>
      <span className="condition-label">{getStatusLabel()}</span>
    </div>
  );
}
