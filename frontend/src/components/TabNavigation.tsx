export type TabId = 'overview' | 'telemetry' | 'analysis' | 'recovery';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'telemetry', label: 'Telemetry Trends' },
    { id: 'analysis', label: 'Analysis & Evidence' },
    { id: 'recovery', label: 'Recovery Verification' }
  ];

  return (
    <nav className="tab-navigation" aria-label="Main navigation">
      <div className="tab-container" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
