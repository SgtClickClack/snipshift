import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.1,
  speed: 200
});

export function RouteProgressBar() {
  const location = useLocation();

  useEffect(() => {
    // When location changes, we can consider the navigation "complete" or at least "started processing new route"
    // Since we can't easily hook into the "start" of a navigation with BrowserRouter v6 without data routers,
    // we show a quick progress bar to indicate the change happened.
    // For lazy loaded routes, Suspense will take over.
    
    NProgress.start();
    
    // Finish shortly after
    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname, location.search]);

  return null;
}

