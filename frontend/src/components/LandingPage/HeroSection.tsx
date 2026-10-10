interface HeroSectionProps {
  onNavigate: (path: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <section className="hero-section">
      <div className="hero-grid-pattern" aria-hidden="true" />
      <div className="landing-container">
        <div className="hero-content">
          <div className="hero-badge-pill">
            <span className="hero-badge-dot" aria-hidden="true"></span>
            <span>Industrial Resource Intelligence &middot; Deterministic &amp; Grounded</span>
          </div>

          <h1 className="hero-title">
            Transform Factory Telemetry into{' '}
            <span className="hero-title-accent">Measured Plant Efficiency</span>
          </h1>

          <p className="hero-subtitle">
            Enterprise-grade telemetry ingestion, automated relative-baseline anomaly detection,
            strictly grounded root-cause explanations, and closed-loop recovery verification
            tailored for small and medium manufacturing plants.
          </p>

          <div className="hero-ctas">
            <button
              className="btn-primary-hero"
              onClick={() => onNavigate('/dashboard')}
              id="hero-primary-cta"
            >
              <span>Explore Operational Dashboard</span>
              <span aria-hidden="true">&rarr;</span>
            </button>

            <button
              className="btn-secondary-hero"
              onClick={() => onNavigate('#preview')}
              id="hero-secondary-cta"
            >
              <span>View Interactive Demo</span>
              <span aria-hidden="true">&darr;</span>
            </button>
          </div>

          <div className="hero-stats-grid">
            <div className="hero-stat-item">
              <span className="hero-stat-val">&lt; 1s</span>
              <span className="hero-stat-label">Ingest Latency</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">100%</span>
              <span className="hero-stat-label">Deterministic Rules</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">0%</span>
              <span className="hero-stat-label">Hallucination Risk</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">Verified</span>
              <span className="hero-stat-label">Closed-Loop Recovery</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
