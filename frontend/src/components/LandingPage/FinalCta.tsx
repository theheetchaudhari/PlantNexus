interface FinalCtaProps {
  onNavigate: (path: string) => void;
}

export function FinalCta({ onNavigate }: FinalCtaProps) {
  return (
    <section className="landing-section final-cta-section">
      <div className="landing-container">
        <div className="final-cta-card">
          <h2 className="final-cta-title">
            Ready to Eliminate Blind Spots on Your Factory Floor?
          </h2>
          <p className="final-cta-desc">
            Experience live telemetry streaming, deterministic relative-baseline anomaly detection,
            and measured recovery verification on Machine M-017 right now.
          </p>
          <button
            className="btn-final-cta"
            onClick={() => onNavigate('/dashboard')}
            id="cta-bottom-dashboard"
          >
            <span>Explore Dashboard</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </section>
  );
}
