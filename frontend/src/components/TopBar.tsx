import { useApiHealth } from '../hooks/useApiHealth';

export function TopBar() {
  const health = useApiHealth();

  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="logo-icon">⬡</span>
        <span className="logo-text">PlantNexus</span>
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
