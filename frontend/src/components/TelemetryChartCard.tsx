import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface ChartDataPoint {
  id: string;
  timeLabel: string;
  fullTime: string;
  value: number | null;
}

interface TelemetryChartCardProps {
  title: string;
  unit: string;
  strokeColor: string;
  gradientId: string;
  data: ChartDataPoint[];
  yAxisDomain?: [number | 'auto', number | 'auto'];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  unit: string;
}

function CustomTooltip({ active, payload, unit }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0];
    const val = item.value;
    return (
      <div className="chart-tooltip">
        <div className="tooltip-time">{item.payload.fullTime}</div>
        <div className="tooltip-value">
          <span className="tooltip-number">
            {typeof val === 'number'
              ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : '--'}
          </span>
          <span className="tooltip-unit"> {unit}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function TelemetryChartCard({
  title,
  unit,
  strokeColor,
  gradientId,
  data,
  yAxisDomain = ['auto', 'auto'],
}: TelemetryChartCardProps) {
  const validValues = data
    .map((d) => d.value)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  const latestValue = validValues.length > 0 ? validValues[validValues.length - 1] : null;
  const minValue = validValues.length > 0 ? Math.min(...validValues) : null;
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : null;
  const avgValue =
    validValues.length > 0
      ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
      : null;

  const formatStat = (val: number | null) => {
    if (val === null) return '--';
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-title-area">
          <h3 className="chart-title">{title}</h3>
          <span className="chart-unit-badge">{unit}</span>
        </div>
        <div className="chart-latest-value">
          <span className="latest-label">Latest:</span>
          <span className="latest-number" style={{ color: strokeColor }}>
            {formatStat(latestValue)}
          </span>
          <span className="latest-unit">{unit}</span>
        </div>
      </div>

      <div className="chart-stats-strip">
        <div className="stat-item">
          <span className="stat-label">Min</span>
          <span className="stat-value">{formatStat(minValue)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg</span>
          <span className="stat-value">{formatStat(avgValue)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max</span>
          <span className="stat-value">{formatStat(maxValue)}</span>
        </div>
      </div>

      <div className="chart-wrapper">
        {validValues.length === 0 ? (
          <div className="chart-no-data">
            <p>No valid data points available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF2" vertical={false} />
              <XAxis
                dataKey="timeLabel"
                tick={{ fontSize: 11, fill: '#8B919D' }}
                tickLine={{ stroke: '#E2E5EA' }}
                axisLine={{ stroke: '#E2E5EA' }}
                minTickGap={35}
              />
              <YAxis
                domain={yAxisDomain}
                tick={{ fontSize: 11, fill: '#8B919D' }}
                tickLine={{ stroke: '#E2E5EA' }}
                axisLine={{ stroke: '#E2E5EA' }}
                width={45}
                tickFormatter={(val: number) =>
                  typeof val === 'number'
                    ? val.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : String(val)
                }
              />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2, fill: '#FFFFFF' }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
