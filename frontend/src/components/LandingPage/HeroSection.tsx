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
            Turn Industrial Data Into{' '}
            <span className="hero-title-accent">Resource Intelligence</span>
          </h1>

          <p className="hero-subtitle">
            Detect inefficiencies, understand their causes, and verify recovery with evidence from industrial telemetry.
          </p>

          <div className="hero-ctas">
            <button
              className="btn-primary-hero"
              onClick={() => onNavigate('/dashboard')}
              id="hero-primary-cta"
            >
              <span>Explore Dashboard</span>
              <span aria-hidden="true">&rarr;</span>
            </button>

            <button
              className="btn-secondary-hero"
              onClick={() => onNavigate('#how-it-works')}
              id="hero-secondary-cta"
            >
              <span>How It Works</span>
              <span aria-hidden="true">&darr;</span>
            </button>
          </div>

          <div className="hero-stats-grid">
            <div className="hero-stat-item">
              <span className="hero-stat-val">Sub-second</span>
              <span className="hero-stat-label">Telemetry Ingest</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">Deterministic</span>
              <span className="hero-stat-label">Baseline Anomaly Rules</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">Evidence-Based</span>
              <span className="hero-stat-label">Root-Cause Explanations</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-val">Closed-Loop</span>
              <span className="hero-stat-label">Recovery Verification</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
