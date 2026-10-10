import { useState } from 'react';

interface LandingNavbarProps {
  onNavigate: (path: string) => void;
}

export function LandingNavbar({ onNavigate }: LandingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLinkClick = (hash: string) => {
    setMobileOpen(false);
    onNavigate(hash);
  };

  return (
    <div className="landing-nav-wrapper">
      <div className="landing-container">
        <header className="landing-nav">
          <button
            className="landing-logo"
            onClick={() => handleLinkClick('/')}
            aria-label="Plant Nexus Home"
          >
            <span className="landing-logo-icon" aria-hidden="true">⬡</span>
            <span className="brand-wordmark">
              <span className="brand-word-plant">Plant</span>{' '}
              <span className="brand-word-nexus">Nexus</span>
            </span>
            <span className="landing-logo-badge">Edge AI</span>
          </button>

          <nav className="landing-nav-links" aria-label="Landing Page Navigation">
            <button
              className="landing-nav-link"
              onClick={() => handleLinkClick('#problem')}
            >
              Problem &amp; Solution
            </button>
            <button
              className="landing-nav-link"
              onClick={() => handleLinkClick('#preview')}
            >
              Demo Preview
            </button>
            <button
              className="landing-nav-link"
              onClick={() => handleLinkClick('#how-it-works')}
            >
              How It Works
            </button>
            <button
              className="landing-nav-link"
              onClick={() => handleLinkClick('#capabilities')}
            >
              Capabilities
            </button>
          </nav>

          <div className="landing-nav-actions">
            <button
              className="nav-cta-btn"
              onClick={() => onNavigate('/dashboard')}
              id="cta-nav-dashboard"
            >
              <span>Explore Dashboard</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <button
            className="landing-nav-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
          </button>
        </header>
      </div>

      {mobileOpen && (
        <div className="mobile-nav-menu open">
          <button
            className="landing-nav-link"
            onClick={() => handleLinkClick('#problem')}
          >
            Problem &amp; Solution
          </button>
          <button
            className="landing-nav-link"
            onClick={() => handleLinkClick('#preview')}
          >
            Demo Preview
          </button>
          <button
            className="landing-nav-link"
            onClick={() => handleLinkClick('#how-it-works')}
          >
            How It Works
          </button>
          <button
            className="landing-nav-link"
            onClick={() => handleLinkClick('#capabilities')}
          >
            Capabilities
          </button>
          <button
            className="nav-cta-btn"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              setMobileOpen(false);
              onNavigate('/dashboard');
            }}
          >
            <span>Explore Dashboard</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
}
