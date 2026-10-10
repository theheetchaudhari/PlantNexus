export function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Collect',
      desc: 'High-frequency telemetry stream (energy kW, production rate, waste kg, temperature) ingested via lightweight REST endpoints.',
    },
    {
      step: '02',
      title: 'Analyze',
      desc: 'Rolling baseline calculations, peak detection, and data-quality health validation computed across temporal sliding windows.',
    },
    {
      step: '03',
      title: 'Detect',
      desc: 'Deterministic multi-factor rule engine evaluates live telemetry against relative baselines—no opaque black-box models.',
    },
    {
      step: '04',
      title: 'Explain',
      desc: 'AI explanation layer uses pure inspection tools to synthesize root-cause narratives strictly grounded on measured numbers.',
    },
    {
      step: '05',
      title: 'Act',
      desc: 'Operational personnel receive prioritized, safety-first remediation guidance with quantified resource impact projections.',
    },
    {
      step: '06',
      title: 'Verify',
      desc: 'Mathematical pre-vs-post delta verification confirms consecutive healthy windows before clearing industrial alert states.',
    },
  ];

  return (
    <section className="landing-section how-it-works-section" id="how-it-works">
      <div className="landing-container">
        <div className="section-header-centered">
          <span className="section-tag">End-to-End Pipeline</span>
          <h2 className="section-title">
            How PlantNexus Works
          </h2>
          <p className="section-desc">
            A six-stage closed-loop operational pipeline engineered for verifiable industrial reliability.
          </p>
        </div>

        <div className="pipeline-steps-grid">
          {steps.map((s) => (
            <div key={s.step} className="pipeline-step-card">
              <div className="step-num-badge" aria-hidden="true">
                {s.step}
              </div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
