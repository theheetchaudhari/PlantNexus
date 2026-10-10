import { TopBar } from './components/TopBar';
import { TabNavigation } from './components/TabNavigation';
import type { TabId } from './components/TabNavigation';
import { Footer } from './components/Footer';
import { OverviewDashboard } from './components/OverviewDashboard';
import { TelemetryTrends } from './components/TelemetryTrends';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { RecoveryDashboard } from './components/RecoveryDashboard';
import { LandingPage } from './components/LandingPage/LandingPage';
import { useRouter } from './router';
import './App.css';

function App() {
  const { path, tab, navigate, setDashboardTab } = useRouter();

  const getTabLabel = (currentTab: TabId) => {
    switch (currentTab) {
      case 'overview': return 'Overview';
      case 'telemetry': return 'Telemetry Trends';
      case 'analysis': return 'Analysis & Evidence';
      case 'recovery': return 'Recovery Verification';
    }
  };

  // Route: Landing page at '/'
  if (path === '/') {
    return <LandingPage onNavigate={navigate} />;
  }

  // Route: Operational Dashboard at '/dashboard' (with subpages /dashboard/:tab)
  return (
    <div className="app-shell">
      <TopBar onNavigate={navigate} />
      <TabNavigation activeTab={tab} onTabChange={setDashboardTab} />
      
      <main className="main-content">
        {tab === 'overview' ? (
          <OverviewDashboard machineId="M-017" />
        ) : tab === 'telemetry' ? (
          <TelemetryTrends machineId="M-017" />
        ) : tab === 'analysis' ? (
          <AnalysisDashboard machineId="M-017" />
        ) : tab === 'recovery' ? (
          <RecoveryDashboard machineId="M-017" />
        ) : (
          <div className="tab-panel-placeholder" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            <h2>{getTabLabel(tab)} Content</h2>
            <p>Placeholder panel for the {tab} tab. To be implemented in subsequent tasks.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
