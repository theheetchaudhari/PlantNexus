import { useState, useEffect, useCallback } from 'react';
import type { TabId } from './components/TabNavigation';

export interface RouteState {
  path: string;       // '/' | '/dashboard'
  tab: TabId;         // 'overview' | 'telemetry' | 'analysis' | 'recovery'
}

function parseLocation(): RouteState {
  if (typeof window === 'undefined') {
    return { path: '/', tab: 'overview' };
  }

  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  // Direct shorthand deep links: /overview, /telemetry, /analysis, /recovery
  if (pathname === '/overview' || pathname === '/telemetry' || pathname === '/analysis' || pathname === '/recovery') {
    return { path: '/dashboard', tab: pathname.slice(1) as TabId };
  }

  // Dashboard routes: /dashboard, /dashboard/overview, /dashboard/telemetry, etc.
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const subRoute = pathname.replace(/^\/dashboard\/?/, '').split('/')[0];

    let tab: TabId = 'overview';
    if (subRoute === 'telemetry' || subRoute === 'analysis' || subRoute === 'recovery' || subRoute === 'overview') {
      tab = subRoute;
    } else {
      const tabParam = searchParams.get('tab');
      if (tabParam === 'telemetry' || tabParam === 'analysis' || tabParam === 'recovery' || tabParam === 'overview') {
        tab = tabParam;
      }
    }
    return { path: '/dashboard', tab };
  }

  // Default: public landing page at '/' or graceful fallback for unmapped paths
  return { path: '/', tab: 'overview' };
}

export function useRouter() {
  const [routeState, setRouteState] = useState<RouteState>(parseLocation);

  useEffect(() => {
    const handlePopState = () => {
      setRouteState(parseLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;

    // Handle hash links when currently on landing page vs from other pages
    if (to.startsWith('#')) {
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', `/${to}`);
        setRouteState(parseLocation());
        setTimeout(() => {
          const el = document.getElementById(to.slice(1));
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 60);
        return;
      }

      const el = document.getElementById(to.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Handle cross-page hash navigation like /#preview
    if (to.startsWith('/#')) {
      const hash = to.slice(2);
      window.history.pushState(null, '', `/#${hash}`);
      setRouteState(parseLocation());
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 60);
      return;
    }

    if (to === window.location.pathname + window.location.search) return;

    window.history.pushState(null, '', to);
    setRouteState(parseLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setDashboardTab = useCallback((tab: TabId) => {
    const newPath = `/dashboard/${tab}`;
    window.history.pushState(null, '', newPath);
    setRouteState({ path: '/dashboard', tab });
  }, []);

  return {
    path: routeState.path,
    tab: routeState.tab,
    navigate,
    setDashboardTab,
  };
}
