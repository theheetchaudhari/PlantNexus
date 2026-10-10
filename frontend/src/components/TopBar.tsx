import { useApiHealth } from '../hooks/useApiHealth';

interface TopBarProps {
  onNavigate?: (path: string) => void;
}

export function TopBar({ onNavigate }: TopBarProps = {}) {
  const health = useApiHealth();

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button
          className="topbar-logo"
          onClick={() => onNavigate ? onNavigate('/') : undefined}
          style={{ cursor: onNavigate ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0 }}
          aria-label="Return to PlantNexus Homepage"
        >
          <span className="logo-icon">⬡</span>
          <span className="logo-text">PlantNexus</span>
        </button>
        {onNavigate && (
          <button
            className="topbar-home-btn"
            onClick={() => onNavigate('/')}
            title="Return to Landing Page"
            aria-label="Return to Landing Page"
          >
            &larr; Home
          </button>
        )}
      </div>
      <div className="topbar-center">
        <div className="machine-selector" aria-label="Selected machine">
          <span className="machine-id">M-017</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="health-indicator" data-status={health} role="status">
          <span className="health-dot" aria-hidden="true"></span>
          <span className="health-text">
            {health === 'checking' ? 'Checking API...' :
             health === 'online' ? 'API Online' :
             health === 'offline' ? 'API Offline' : 'API Error'}
          </span>
        </div>
      </div>
    </header>
  );
}
