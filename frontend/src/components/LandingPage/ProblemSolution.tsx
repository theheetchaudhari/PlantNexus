export function ProblemSolution() {
  const items = [
    {
      type: 'energy',
      icon: '⚡',
      title: 'Excessive Energy Consumption',
      problem:
        'Motor friction, thermal drift, and uncalibrated compressors draw excessive kW. Static threshold meters miss dynamic power drift, resulting in utility demand penalties and wasted power.',
      solution:
        'Continuous relative-baseline analytics evaluate real-time power draw against rolling averages, catching electrical anomalies (+30% kW drift) before components overheat.',
    },
    {
      type: 'production',
      icon: '⚙',
      title: 'Production Inefficiencies & Downtime',
      problem:
        'Equipment rarely fails instantly—it degrades silently over operating hours. Operators often discover issues only after a machine halts or runs below target throughput.',
      solution:
        'Automated health classification (Healthy, Degraded, Critical) identifies degradation velocity immediately, enabling corrective action before line halts occur.',
    },
    {
      type: 'waste',
      icon: '🗑',
      title: 'Industrial Waste & Scrap Spikes',
      problem:
        'Operating machines outside thermal or mechanical tolerances creates off-spec parts and scrap that are often caught hours later during batch quality inspections.',
      solution:
        'Correlated telemetry links scrap generation directly to temperature and throughput anomalies, catching defective operating states the moment waste begins climbing.',
    },
  ];

  return (
    <section className="landing-section problem-solution-section" id="problem">
      <div className="landing-container">
        <div className="section-header-centered">
          <span className="section-tag">Industrial Problem &amp; Solution</span>
          <h2 className="section-title">
            Stop Silent Resource Leaks on the Factory Floor
          </h2>
          <p className="section-desc">
            Excessive energy consumption, production inefficiencies, and industrial waste create hidden operational costs across manufacturing plants.
          </p>
        </div>

        <div className="ps-grid">
          {items.map((item) => (
            <div key={item.title} className={`ps-card ${item.type}`}>
              <div className="ps-card-icon-wrap" aria-hidden="true">
                {item.icon}
              </div>
              <h3 className="ps-card-title">{item.title}</h3>

              <div className="ps-block">
                <span className="ps-block-label problem">The Problem</span>
                <p>{item.problem}</p>
              </div>

              <div className="ps-block ps-solution-box">
                <span className="ps-block-label solution">The Plant Nexus Fix</span>
                <p>{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
