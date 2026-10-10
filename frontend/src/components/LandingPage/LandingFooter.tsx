interface LandingFooterProps {
  onNavigate: (path: string) => void;
}

export function LandingFooter({ onNavigate }: LandingFooterProps) {
  return (
    <footer className="landing-footer" role="contentinfo">
      <div className="landing-container">
        <div className="landing-footer-grid">
          <div className="footer-brand-col">
            <div className="footer-brand-logo">
              <img src="/logo.png" alt="Plant Nexus Logo" className="footer-logo-img" />
              <span className="brand-wordmark">
                <span className="brand-word-plant">Plant</span>{' '}
                <span className="brand-word-nexus">Nexus</span>
              </span>
            </div>
            <p className="footer-brand-desc">
              Industrial Resource Intelligence platform for small and medium manufacturing plants.
              Deterministic anomaly detection, grounded AI explanations, and closed-loop recovery verification.
            </p>
          </div>

          <div>
            <h4 className="footer-col-title">Navigation</h4>
            <div className="footer-links-list">
              <button className="footer-link-item" onClick={() => onNavigate('/')}>
                Home
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('#problem')}>
                Problem &amp; Solution
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('#preview')}>
                Demo Preview
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('#how-it-works')}>
                How It Works
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('#capabilities')}>
                Capabilities
              </button>
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">Live Dashboard</h4>
            <div className="footer-links-list">
              <button className="footer-link-item" onClick={() => onNavigate('/dashboard/overview')}>
                Fleet Overview
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('/dashboard/telemetry')}>
                Telemetry Trends
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('/dashboard/analysis')}>
                Analysis &amp; Evidence
              </button>
              <button className="footer-link-item" onClick={() => onNavigate('/dashboard/recovery')}>
                Recovery Verification
              </button>
            </div>
          </div>

          <div>
            <h4 className="footer-col-title">System Info</h4>
            <div className="footer-links-list">
              <span className="footer-link-item" style={{ cursor: 'default' }}>
                Machine Target: M-017
              </span>
              <span className="footer-link-item" style={{ cursor: 'default' }}>
                Ingest: Express &middot; Supabase
              </span>
              <span className="footer-link-item" style={{ cursor: 'default' }}>
                Simulator: Python 3.10+
              </span>
              <span className="footer-link-item" style={{ cursor: 'default' }}>
                UI: React 19 &middot; Vite
              </span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div>
            &copy; {new Date().getFullYear()} Plant Nexus &mdash; Industrial Resource Intelligence MVP.
          </div>
          <div className="footer-badges">
            <span className="footer-tech-tag">Deterministic Core</span>
            <span className="footer-tech-tag">Grounded AI</span>
            <span className="footer-tech-tag">Zero Control Directives</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
