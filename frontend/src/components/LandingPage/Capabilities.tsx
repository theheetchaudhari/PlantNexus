import type { ReactNode } from 'react';
import { TrendingUp, Search, ShieldCheck, Check } from 'lucide-react';

interface CapabilityItem {
  icon: ReactNode;
  title: string;
  desc: string;
  features: string[];
}

export function Capabilities() {
  const capabilities: CapabilityItem[] = [
    {
      icon: <TrendingUp size={24} strokeWidth={2} />,
      title: 'Telemetry Trends',
      desc: 'Real-time multi-metric streaming and interactive time-series exploration across power, throughput, thermal, and scrap sensors.',
      features: [
        'Interactive Recharts area visualizations with gradient styling',
        'Configurable baseline depths (25 to 200 telemetry samples)',
        'Temporal freshness tracking with auto-stale alerts',
        'Single-metric isolation and cross-sensor correlation filters',
      ],
    },
    {
      icon: <Search size={24} strokeWidth={2} />,
      title: 'Evidence-Based Anomaly Analysis',
      desc: 'Deterministic rule evaluation paired with strictly grounded AI explanations that cite real physical sensor data.',
      features: [
        'Deterministic relative-baseline rules (Healthy, Degraded, Critical)',
        'Evidence-grounded explanations citing real physical sensor telemetry',
        'Categorized evidence items with severity levels and threshold ratios',
        'Prioritized maintenance steps with explicit safety constraints',
      ],
    },
    {
      icon: <ShieldCheck size={24} strokeWidth={2} />,
      title: 'Recovery Verification',
      desc: 'Closed-loop mathematical verification validating that operator maintenance actions physically restored equipment to baseline.',
      features: [
        'Automated tracking of consecutive healthy verification cycles',
        'Pre-incident vs incident peak vs post-action delta analysis',
        'Objective status badges: Verified, Recovering, Not Recovered',
        'Eliminates premature alarm clearing on the plant floor',
      ],
    },
  ];

  return (
    <section className="landing-section capabilities-section" id="capabilities">
      <div className="landing-container">
        <div className="section-header-centered">
          <span className="section-tag">Current Platform Capabilities</span>
          <h2 className="section-title">
            Built for Real Industrial Demands
          </h2>
          <p className="section-desc">
            Explore the core architectural components powering the Plant Nexus operational dashboard.
          </p>
        </div>

        <div className="capabilities-grid">
          {capabilities.map((cap) => (
            <div key={cap.title} className="capability-card">
              <div className="capability-icon-wrap" aria-hidden="true">
                {cap.icon}
              </div>
              <h3 className="capability-title">{cap.title}</h3>
              <p className="capability-desc">{cap.desc}</p>

              <div className="capability-feature-list">
                {cap.features.map((feat) => (
                  <div key={feat} className="capability-feature-item">
                    <span className="feature-check" aria-hidden="true">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
