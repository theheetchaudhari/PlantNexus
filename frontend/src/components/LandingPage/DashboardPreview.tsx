import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DashboardPreviewProps {
  onNavigate: (path: string) => void;
}

type PreviewTab = 'overview' | 'telemetry' | 'analysis' | 'recovery';

const STATIC_CHART_DATA = [
  { time: '10:00', energy: 34.2, temp: 64.5, label: 'Normal Baseline' },
  { time: '10:05', energy: 34.8, temp: 65.1, label: 'Normal Baseline' },
  { time: '10:10', energy: 35.1, temp: 66.0, label: 'Normal Baseline' },
  { time: '10:15', energy: 38.6, temp: 69.4, label: 'Minor Friction' },
  { time: '10:20', energy: 42.1, temp: 73.8, label: 'Thermal Drift' },
  { time: '10:25', energy: 48.2, temp: 82.1, label: 'Peak Anomaly' },
  { time: '10:30', energy: 46.5, temp: 80.4, label: 'Intervention Triggered' },
  { time: '10:35', energy: 39.0, temp: 74.2, label: 'Cooling Initiated' },
  { time: '10:40', energy: 35.5, temp: 68.0, label: 'Stabilizing' },
  { time: '10:45', energy: 34.6, temp: 65.5, label: 'Verified Recovery' },
  { time: '10:50', energy: 34.3, temp: 64.9, label: 'Healthy Baseline' },
];

export function DashboardPreview({ onNavigate }: DashboardPreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('overview');

  return (
    <section className="landing-section preview-section" id="preview">
      <div className="landing-container">
        <div className="section-header-centered">
          <span className="section-tag">Interactive Workspace Preview</span>
          <h2 className="section-title">
            The PlantNexus Operator Interface
          </h2>
          <p className="section-desc">
            Explore a static, fully offline simulation of the PlantNexus monitoring workspace.
            Click the tabs below to preview each operational capability.
          </p>
        </div>

        {/* Demo Data Notice */}
        <div className="preview-badge-banner" role="note" aria-label="Demo Data Notice">
          <div className="preview-badge-text">
            <span className="preview-badge-tag">OFFLINE PREVIEW</span>
            <span>All values below are static illustrative demonstration data for Machine M-017</span>
          </div>
          <span className="text-mono text-xs" style={{ color: '#92400E' }}>
            Zero Backend Dependency
          </span>
        </div>

        {/* Mock Window Frame */}
        <div className="preview-window-frame">
          <div className="preview-window-topbar">
            <div className="window-dots">
              <span className="window-dot red"></span>
              <span className="window-dot yellow"></span>
              <span className="window-dot green"></span>
            </div>
            <div className="window-title">
              <span>⬡ PlantNexus UI</span>
              <span>&mdash;</span>
              <span>M-017 (Illustrative CNC Milling Center)</span>
            </div>
            <div className="text-mono text-xs" style={{ color: 'var(--color-healthy)' }}>
              ● Demo Mode
            </div>
          </div>

          {/* Preview Navigation Tabs */}
          <div className="preview-tabs-bar" role="tablist" aria-label="Demo tabs">
            <button
              className={`preview-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              role="tab"
              aria-selected={activeTab === 'overview'}
            >
              1. Overview
            </button>
            <button
              className={`preview-tab-btn ${activeTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setActiveTab('telemetry')}
              role="tab"
              aria-selected={activeTab === 'telemetry'}
            >
              2. Telemetry Trends
            </button>
            <button
              className={`preview-tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
              role="tab"
              aria-selected={activeTab === 'analysis'}
            >
              3. Analysis &amp; Evidence
            </button>
            <button
              className={`preview-tab-btn ${activeTab === 'recovery' ? 'active' : ''}`}
              onClick={() => setActiveTab('recovery')}
              role="tab"
              aria-selected={activeTab === 'recovery'}
            >
              4. Recovery Verification
            </button>
          </div>

          {/* Viewport Content */}
          <div className="preview-viewport">
            {activeTab === 'overview' && (
              <div className="preview-panel">
                <div className="preview-panel-header">
                  <div>
                    <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
                      Live Fleet Health Snapshot
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      Simulated incident scenario: Thermal coupling &amp; power surge
                    </p>
                  </div>
                  <div className="preview-machine-badge">
                    <span>Machine: M-017</span>
                    <span style={{ color: 'var(--color-degraded)', fontWeight: 600 }}>
                      ● Condition: Degraded
                    </span>
                  </div>
                </div>

                <div className="preview-cards-grid">
                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Energy Consumption</div>
                    <div className="preview-metric-val">
                      48.20 <span className="preview-metric-unit">kW</span>
                    </div>
                    <div className="preview-metric-sub" style={{ color: 'var(--color-critical)' }}>
                      +39.7% vs Baseline (34.50 kW)
                    </div>
                  </div>

                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Production Throughput</div>
                    <div className="preview-metric-val">
                      112.0 <span className="preview-metric-unit">units/min</span>
                    </div>
                    <div className="preview-metric-sub" style={{ color: 'var(--color-degraded)' }}>
                      -22.8% vs Baseline (145.0 u/m)
                    </div>
                  </div>

                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Scrap Waste</div>
                    <div className="preview-metric-val">
                      3.40 <span className="preview-metric-unit">kg/batch</span>
                    </div>
                    <div className="preview-metric-sub" style={{ color: 'var(--color-critical)' }}>
                      +183% vs Baseline (1.20 kg)
                    </div>
                  </div>

                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Spindle Temperature</div>
                    <div className="preview-metric-val">
                      82.10 <span className="preview-metric-unit">&deg;C</span>
                    </div>
                    <div className="preview-metric-sub" style={{ color: 'var(--color-critical)' }}>
                      Critical Thermal Rise (+17.1&deg;C)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'telemetry' && (
              <div className="preview-panel">
                <div className="preview-chart-box">
                  <div className="preview-chart-header">
                    <div>
                      <div className="preview-chart-title">
                        Multi-Sensor Correlation (Energy vs Temperature)
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        Demonstrates power surge preceding thermal rise and subsequent cooling
                      </div>
                    </div>
                    <div className="preview-chart-legend">
                      <span>
                        <span className="legend-dot kw"></span> Energy (kW)
                      </span>
                      <span>
                        <span className="legend-dot temp"></span> Spindle Temp (&deg;C)
                      </span>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={STATIC_CHART_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="demoEnergyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="demoTempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
                        <XAxis dataKey="time" stroke="#8B919D" fontSize={11} />
                        <YAxis stroke="#8B919D" fontSize={11} domain={[20, 90]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E5EA',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="energy"
                          stroke="#2563EB"
                          strokeWidth={2}
                          fill="url(#demoEnergyGrad)"
                          name="Energy (kW)"
                        />
                        <Area
                          type="monotone"
                          dataKey="temp"
                          stroke="#DC2626"
                          strokeWidth={2}
                          fill="url(#demoTempGrad)"
                          name="Temp (°C)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="preview-panel">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Deterministic Rule Trigger</div>
                    <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-critical)', marginBottom: 8 }}>
                      ENERGY_SPIKE_WITH_THERMAL_RISE
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Rule triggered deterministically: Energy draw exceeded baseline mean by +39.7% (&gt; 25% threshold) concurrent with spindle temperature exceeding 80.0&deg;C.
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-critical)' }}>
                        Severity: Critical
                      </span>
                      <span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-primary)' }}>
                        Baseline: 100 Samples
                      </span>
                    </div>
                  </div>

                  <div className="preview-metric-box">
                    <div className="preview-metric-label">Grounded AI Narrative (Zero Hallucination)</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)', lineHeight: 1.6, marginBottom: 10 }}>
                      &ldquo;Machine M-017 is operating in DEGRADED condition. Real-time power draw surged to <strong>48.20 kW</strong> (+39.7% over 34.50 kW baseline). Concurrently, spindle temperature rose to <strong>82.10 &deg;C</strong> while production throughput dropped to <strong>112.0 units/min</strong> with <strong>3.40 kg</strong> scrap waste.&rdquo;
                    </p>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      <strong>Prescribed Action:</strong> Inspect bearing lubrication; throttle feed rate until temperature normalizes below 70.0&deg;C.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'recovery' && (
              <div className="preview-panel">
                <div className="preview-table-box">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Baseline Mean</th>
                        <th>Incident Peak</th>
                        <th>Post-Fix Verification</th>
                        <th>Measured Delta</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Energy Consumption</strong></td>
                        <td>34.50 kW</td>
                        <td>48.20 kW</td>
                        <td>34.60 kW</td>
                        <td style={{ color: 'var(--color-healthy)' }}>-28.2%</td>
                        <td><span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-healthy)' }}>VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td><strong>Spindle Temperature</strong></td>
                        <td>65.00 &deg;C</td>
                        <td>82.10 &deg;C</td>
                        <td>65.50 &deg;C</td>
                        <td style={{ color: 'var(--color-healthy)' }}>-20.2%</td>
                        <td><span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-healthy)' }}>VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td><strong>Production Rate</strong></td>
                        <td>145.0 u/m</td>
                        <td>112.0 u/m</td>
                        <td>144.5 u/m</td>
                        <td style={{ color: 'var(--color-healthy)' }}>+29.0%</td>
                        <td><span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-healthy)' }}>VERIFIED</span></td>
                      </tr>
                      <tr>
                        <td><strong>Waste Generation</strong></td>
                        <td>1.20 kg</td>
                        <td>3.40 kg</td>
                        <td>1.25 kg</td>
                        <td style={{ color: 'var(--color-healthy)' }}>-63.2%</td>
                        <td><span className="preview-badge-tag" style={{ backgroundColor: 'var(--color-healthy)' }}>VERIFIED</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                    Verification Verdict: <strong style={{ color: 'var(--color-healthy)' }}>IMPROVED</strong> (5 consecutive healthy sample windows confirmed)
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>
                    Algorithm: Pre vs Post Mean Delta
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar Linking to Live Dashboard */}
          <div className="preview-bottom-cta">
            <p>
              Want to see this running against the live telemetry simulator and backend?
            </p>
            <button
              className="btn-open-live-dash"
              onClick={() => onNavigate('/dashboard')}
              id="cta-preview-launch"
            >
              <span>Explore Operational Dashboard</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
