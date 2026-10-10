export function Capabilities() {
  const capabilities = [
    {
      icon: '📈',
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
      icon: '🔍',
      title: 'Evidence-Based Anomaly Analysis',
      desc: 'Deterministic rule evaluation paired with strictly grounded AI explanations that cite real physical sensor data.',
      features: [
        'Deterministic relative-baseline rules (Healthy, Degraded, Critical)',
        'Strict numerical token grounding preventing LLM hallucinations',
        'Categorized evidence items with severity levels and threshold ratios',
        'Prioritized maintenance steps with explicit safety constraints',
      ],
    },
    {
      icon: '🛡',
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
            Explore the core architectural components powering the PlantNexus operational dashboard today.
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
                    <span className="feature-check" aria-hidden="true">&#10003;</span>
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
