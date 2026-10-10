import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { ProblemSolution } from './ProblemSolution';
import { DashboardPreview } from './DashboardPreview';
import { HowItWorks } from './HowItWorks';
import { Capabilities } from './Capabilities';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';
import './LandingPage.css';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="landing-page">
      <LandingNavbar onNavigate={onNavigate} />
      <main id="main-content">
        <HeroSection onNavigate={onNavigate} />
        <ProblemSolution />
        <DashboardPreview onNavigate={onNavigate} />
        <HowItWorks />
        <Capabilities />
        <FinalCta onNavigate={onNavigate} />
      </main>
      <LandingFooter onNavigate={onNavigate} />
    </div>
  );
}
