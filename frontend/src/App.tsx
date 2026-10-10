import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { TabNavigation } from './components/TabNavigation';
import type { TabId } from './components/TabNavigation';
import { Footer } from './components/Footer';
import { OverviewDashboard } from './components/OverviewDashboard';
import { TelemetryTrends } from './components/TelemetryTrends';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const getTabLabel = (tab: TabId) => {
    switch (tab) {
      case 'overview': return 'Overview';
      case 'telemetry': return 'Telemetry Trends';
      case 'analysis': return 'Analysis & Evidence';
      case 'recovery': return 'Recovery Verification';
    }
  };

  return (
    <div className="app-shell">
      <TopBar />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="main-content">
          {activeTab === 'overview' ? (
            <OverviewDashboard machineId="M-017" />
          ) : activeTab === 'telemetry' ? (
            <TelemetryTrends machineId="M-017" />
          ) : (
            <div className="tab-panel-placeholder" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              <h2>{getTabLabel(activeTab)} Content</h2>
              <p>Placeholder panel for the {activeTab} tab. To be implemented in subsequent tasks.</p>
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
