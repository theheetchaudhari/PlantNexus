export function ProblemSolution() {
  const items = [
    {
      type: 'energy',
      icon: '⚡',
      title: 'Energy Inefficiency & Demand Surges',
      problem:
        'Motor friction, thermal drift, and uncalibrated compressors draw excessive kW. Static threshold meters miss dynamic power spikes, resulting in massive utility demand penalties and wasted power.',
      solution:
        'Continuous relative-baseline analytics evaluate real-time power draw against rolling averages, detecting subtle electrical anomalies (+30% kW drift) before components overheat.',
    },
    {
      type: 'production',
      icon: '⚙',
      title: 'Production Losses & Silent Downtime',
      problem:
        'Industrial equipment does not fail instantaneously—it degrades silently over hours. Line operators only discover issues when a machine halts, leaving scheduled shifts behind target.',
      solution:
        'Automated health classification (Healthy, Degraded, Critical) identifies degradation velocity immediately, enabling preventive intervention during natural shift transitions.',
    },
    {
      type: 'waste',
      icon: '🗑',
      title: 'Industrial Waste & Scrap Spikes',
      problem:
        'Operating machines outside thermal or mechanical tolerances generates off-spec parts and excessive scrap. Material losses are often only identified hours later during batch QA inspection.',
      solution:
        'Correlated telemetry streams directly bind scrap kg/min to temperature and throughput anomalies, catching defective operating states the moment waste rates begin climbing.',
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
            Small and medium manufacturing facilities lose up to 15% of their gross margins to
            preventable energy spikes, unplanned line halts, and off-spec scrap generation.
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
                <span className="ps-block-label solution">The PlantNexus Fix</span>
                <p>{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
