import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
// PERFORMANCE: Lazy-load analytics to reduce initial bundle size
const Analytics = lazy(() => import('@vercel/analytics/react').then(m => ({ default: m.Analytics })));
const SpeedInsights = lazy(() => import('@vercel/speed-insights/react').then(m => ({ default: m.SpeedInsights })));
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { PusherProvider } from '@/contexts/PusherContext';
import { NotificationToast } from '@/components/notifications/notification-toast';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AuthGate } from '@/components/auth/AuthGate';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TutorialOverlay } from '@/components/onboarding/tutorial-overlay';
import { OfflineNotification } from '@/components/common/OfflineNotification';

// PERFORMANCE: Lazy-load Support Bot to improve FCP/LCP (Target: < 0.8s)
// These widgets load AFTER primary UI is interactive
const SupportChatWidget = lazy(() => import('@/components/support/SupportChatWidget'));
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { PwaUpdateHandler } from '@/components/pwa/pwa-update-handler';
import { RouteProgressBar } from '@/components/ui/route-progress-bar';
import Navbar from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PersistentLayout } from '@/components/layout/PersistentLayout';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Core pages - load immediately for fast initial render (critical for FCP/LCP)
import LandingPage from '@/pages/landing';
import { WaitlistPage } from '@/pages/Waitlist';
import HomePage from '@/pages/home';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import ForgotPasswordPage from '@/pages/forgot-password';
import StatusPage from '@/pages/status';
import InvestorPortal from '@/pages/InvestorPortal';
import { OAuthCallback } from '@/pages/oauth-callback';
import NotFound from '@/pages/not-found';

// Onboarding pages - lazy load (behind auth wall)
// PURGED: RoleSelectionPage lazy import removed - /role-selection now redirects to /onboarding
const OnboardingPage = lazy(() => import('@/pages/Onboarding'));
const HubOnboardingPage = lazy(() => import('@/pages/onboarding/hub'));
const ProfessionalOnboardingPage = lazy(() => import('@/pages/onboarding/professional'));

// Help & Support pages
const HelpCenterPage = lazy(() => import('@/pages/HelpCenter'));

// Legal & Company pages - lazy load (less critical)
const TermsPage = lazy(() => import('@/pages/legal/terms'));
const PrivacyPage = lazy(() => import('@/pages/legal/privacy'));
const RefundPolicyPage = lazy(() => import('@/pages/legal/refunds'));
const SitemapPage = lazy(() => import('@/pages/legal/sitemap'));
const AboutPage = lazy(() => import('@/pages/company/about'));
const ContactPage = lazy(() => import('@/pages/company/contact'));
const VenueGuidePage = lazy(() => import('@/pages/venue-guide'));

// Utility pages - lazy load
const DashboardRedirect = lazy(() => import('@/pages/dashboard-redirect'));
const ComingSoonPage = lazy(() => import('@/pages/coming-soon'));
const AuthBridgePage = lazy(() => import('@/pages/auth/Bridge'));

// Dashboard pages - lazy load to reduce initial bundle
const UserDashboard = lazy(() => import('@/pages/user-dashboard'));
const EditProfilePage = lazy(() => import('@/pages/edit-profile'));
const JobFeedPage = lazy(() => import('@/pages/job-feed'));
const BrowseShiftsPage = lazy(() => import('@/pages/BrowseShifts'));
const JobDetailsPage = lazy(() => import('@/pages/job-details'));
const ShiftDetailsPage = lazy(() => import('@/pages/shift-details'));
const TravelPage = lazy(() => import('@/pages/travel'));
const MyApplicationsPage = lazy(() => import('@/pages/my-applications'));
const ReviewPage = lazy(() => import('@/pages/review'));
const PostJobPage = lazy(() => import('@/pages/post-job'));
const ManageJobsPage = lazy(() => import('@/pages/manage-jobs'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const VenueDashboard = lazy(() => import('@/pages/venue-dashboard'));
const VenueProfilePage = lazy(() => import('@/pages/venue-profile'));
const VenueApplicationsPage = lazy(() => import('@/pages/venue-applications'));
const StaffPage = lazy(() => import('@/pages/Staff'));
const WorkerEarningsView = lazy(() => import('@/pages/worker-earnings'));
const ShopSchedulePage = lazy(() => import('@/pages/shop/schedule'));
const ProfessionalDashboard = lazy(() => import('@/pages/professional-dashboard'));
// PURGED: BrandDashboard and TrainerDashboard removed per Investor Briefing Lockdown
// System now only knows about 'Venue Owner' (Engine) and 'Professional' (Staff)
// Feature pages - lazy load for better performance
const ProfilePage = lazy(() => import('@/pages/profile'));
const WalletPage = lazy(() => import('@/pages/wallet'));
const EarningsPage = lazy(() => import('@/pages/earnings'));
const MessagesPage = lazy(() => import('@/pages/messages'));
const ProfessionalMessagesPage = lazy(() => import('@/pages/professional-messages'));
const SalonCreateJobPage = lazy(() => import('@/pages/salon-create-job'));
const SettingsPage = lazy(() => import('@/pages/settings'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));
const AdminLeadsPage = lazy(() => import('@/pages/admin/Leads'));
const AdminHealthPage = lazy(() => import('@/pages/admin/health'));
const LeadTracker = lazy(() => import('@/pages/admin/LeadTracker'));
const CTODashboard = lazy(() => import('@/pages/admin/CTODashboard'));
const RevenueForecast = lazy(() => import('@/pages/admin/RevenueForecast'));

const NotificationDemo = lazy(() => import('@/components/notifications/notification-demo'));
const DesignSystemShowcase = lazy(() => import('@/components/demo/design-system-showcase').then(module => ({ default: module.DesignSystemShowcase })));
const UnauthorizedPage = lazy(() => import('@/pages/unauthorized'));

function AppRoutes({ splashHandled }: { splashHandled: boolean }) {
  const location = useLocation();
  const { isLoading, isRedirecting, isNavigationLocked, isSystemReady } = useAuth();

  // Performance check: if isNavigationLocked takes >2s to flip, optimize GET /api/venues/me
  const lockStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (isNavigationLocked) {
      if (lockStartRef.current === null) lockStartRef.current = Date.now();
    } else {
      if (lockStartRef.current !== null) {
        const elapsed = Date.now() - lockStartRef.current;
        console.debug('[App] isNavigationLocked changed to false', { elapsedMs: elapsed });
        if (elapsed > 2000) {
          console.warn('[App] isNavigationLocked took >2s to unlock — consider optimizing GET /api/venues/me');
        }
        lockStartRef.current = null;
      }
    }
  }, [isNavigationLocked]);

  const isBridgeRoute = location.pathname === '/auth/bridge';
  const hideNavbar = location.pathname === '/onboarding' || location.pathname === '/' || location.pathname === '/investorportal' || isBridgeRoute;
  const hideFooter = ['/onboarding', '/login', '/signup', '/forgot-password', '/auth/bridge', '/investorportal'].includes(location.pathname);

  // Initialize push notifications when user is authenticated
  usePushNotifications();

  // PERFORMANCE: Use isSystemReady for smooth splash-to-app transition
  // This eliminates the skeleton flash by keeping HTML splash until auth + venue check complete
  // PROGRESSIVE UNLOCK: /investorportal is a neutral zone - always render immediately for Rick
  const isInvestorPortal = location.pathname === '/investorportal' || location.pathname.startsWith('/investorportal');
  const isSignupOrLandingOrOnboarding = location.pathname === '/signup' || location.pathname === '/' || location.pathname.startsWith('/onboarding') || isInvestorPortal;
  // AUTH GATE: Public routes that should NEVER block on auth (no API calls needed)
  const isPublicRoute = location.pathname === '/' || location.pathname === '/status' || location.pathname === '/waitlist' || isInvestorPortal;
  
  // STRICT HYDRATION GATE: Block ALL page content until Firebase handshake completes
  // This prevents the "401 storm" by ensuring no API calls fire before auth token is ready
  // Exceptions:
  //   - Public routes (landing, status, waitlist, investor portal) - no auth needed
  //   - Auth bridge route - handles its own auth flow
  //   - Signup/onboarding routes - allowed to render immediately for UX
  if (!isSystemReady && !isPublicRoute && !isBridgeRoute && !isSignupOrLandingOrOnboarding) {
    // Keep HTML splash if not yet removed, otherwise show React loading screen
    if (!splashHandled) {
      return null;
    }
    return <LoadingScreen />;
  }

  // GLOBAL REDIRECT LOCKDOWN: Block router from mounting ANY route until AuthContext has finished
  // Guard: on onboarding/signup routes, always render content even if navigation lock is true.
  // PROGRESSIVE UNLOCK: /investorportal bypasses ALL loading guards - immediate render for investors
  const effectiveNavigationLocked = isSignupOrLandingOrOnboarding ? false : isNavigationLocked;
  const shouldShowLockScreen = effectiveNavigationLocked && splashHandled && !isBridgeRoute && !isInvestorPortal;
  if (shouldShowLockScreen) {
    return <LoadingScreen />;
  }

  // Show full-page loader while auth is settling OR a redirect is in progress (prevents route flash)
  // But only after system is ready (avoids double loading state)
  // PROGRESSIVE UNLOCK: /investorportal NEVER shows loader - immediate render for investors
  const showFullPageLoader = (isLoading || isRedirecting) && splashHandled && !isBridgeRoute && isSystemReady;
  const shouldBypassLoading = location.pathname === '/signup' || isInvestorPortal;
  if (showFullPageLoader && !shouldBypassLoading) {
    return <LoadingScreen />;
  }

  // If still loading but HTML splash hasn't been removed yet, render nothing
  // PROGRESSIVE UNLOCK: /investorportal bypasses all loading guards
  if (isLoading && !splashHandled && !isBridgeRoute && !isInvestorPortal) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col w-full max-w-full overflow-x-hidden">
      {!hideNavbar && <Navbar />}
      <div className="flex-grow w-full max-w-full overflow-x-hidden">
        <Routes>
        {/* PERFORMANCE: Route loaded signal for E2E tests - placed at top so it renders early */}
        {/* Public routes */}
        {/* IMPORTANT: Landing must remain fully public (no auth guard / no protected route wrapper). */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/waitlist" element={<WaitlistPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/investorportal" element={<InvestorPortal />} />

        {/* Public marketplace routes */}
        <Route path="/marketplace/:id" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <VenueProfilePage />
          </Suspense>
        } />
        
        <Route path="/home" element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        } />

        {/* Removed /demo route - development-only feature */}

        <Route path="/design-showcase" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <DesignSystemShowcase />
          </Suspense>
        } />

        {/* Authentication routes - /login must be publicly accessible (no AuthGuard) */}
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/signup" element={<SignupPage />} />

        <Route path="/forgot-password" element={
          <AuthGuard>
            <ForgotPasswordPage />
          </AuthGuard>
        } />

        <Route path="/auth/bridge" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AuthBridgePage />
          </Suspense>
        } />

        {/* INVESTOR BRIEFING LOCKDOWN: /role-selection redirects to /onboarding - the modern gateway */}
        <Route path="/role-selection" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding/role-selection" element={<Navigate to="/onboarding" replace />} />

        <Route path="/onboarding" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <OnboardingPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/onboarding/hub" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <HubOnboardingPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/onboarding/venue-details" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <HubOnboardingPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/onboarding/professional" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfessionalOnboardingPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/__/auth/handler" element={<OAuthCallback />} />

        {/* Legal Pages */}
        <Route path="/terms" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <TermsPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/privacy" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <PrivacyPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/refunds" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <RefundPolicyPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/sitemap" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <SitemapPage />
            </Suspense>
          </AuthGuard>
        } />

        {/* Company Pages */}
        <Route path="/about" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <AboutPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/contact" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <ContactPage />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/venue-guide" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <VenueGuidePage />
          </Suspense>
        } />

        {/* Help & Support */}
        <Route path="/help" element={
          <AuthGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <HelpCenterPage />
            </Suspense>
          </AuthGuard>
        } />

        {/* Protected dashboard routes */}
        <Route path="/dashboard" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <DashboardRedirect />
            </Suspense>
          </AuthGuard>
        } />


        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <EditProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/jobs" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <JobFeedPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/browse-shifts" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <BrowseShiftsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/jobs/:id" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <JobDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/shifts/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ShiftDetailsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/travel" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <TravelPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/my-applications" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MyApplicationsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/review" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ReviewPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/post-job" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <PostJobPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/manage-jobs" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ManageJobsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/notifications" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <NotificationsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Legacy route redirects → new branded paths */}
        <Route path="/shop-dashboard" element={<Navigate to="/venue/dashboard" replace />} />
        <Route path="/shop/schedule" element={<Navigate to="/venue/schedule" replace />} />
        <Route path="/salon/create-job" element={<Navigate to="/venue/create-shift" replace />} />

        {/* Venue routes (primary branded paths) */}
        <Route path="/venue/schedule" element={
          <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <ShopSchedulePage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/venue/create-shift" element={
          <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <SalonCreateJobPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/professional-dashboard" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfessionalDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/professional-messages" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfessionalMessagesPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* PURGED: /brand-dashboard and /trainer-dashboard routes removed per Investor Briefing Lockdown */}

        <Route path="/venue-dashboard" element={
          <Navigate to="/venue/dashboard" replace />
        } />

        <Route path="/hub-dashboard" element={
          <Navigate to="/venue/dashboard" replace />
        } />

        {/* Branded dashboard paths (keep underlying pages stable) */}
        <Route path="/venue/dashboard" element={
          <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <VenueDashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/venue/applications" element={
          <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <VenueApplicationsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/venue/staff" element={
          <ProtectedRoute allowedRoles={['hub', 'business', 'venue']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <StaffPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/worker/dashboard" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfessionalDashboard />
            </Suspense>
          </ProtectedRoute>
        } />
        
        {/* Protected feature routes - Disabled for stability */}
        <Route path="/community" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ComingSoonPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/social-feed" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ComingSoonPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/training-hub" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ComingSoonPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/admin/overview" element={<Navigate to="/admin/dashboard" replace />} />
        
        <Route path="/admin/leads" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <AdminLeadsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* CEO Insights - Lead Tracker & CTO Dashboard */}
        <Route path="/admin/lead-tracker" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <LeadTracker />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/admin/cto-dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <CTODashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/admin/revenue-forecast" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <RevenueForecast />
            </Suspense>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/profile/:userId" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/notifications/demo" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <div className="min-h-screen bg-steel-50">
                <NotificationDemo />
              </div>
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/wallet" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <WalletPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Persistent Layout Routes - These share the same layout and won't re-mount */}
        <Route element={<PersistentLayout />}>
          <Route path="/messages" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <MessagesPage />
              </Suspense>
            </ProtectedRoute>
          } />
          
          <Route path="/user-dashboard" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <UserDashboard />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/earnings" element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <EarningsPage />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/worker/earnings" element={
            <ProtectedRoute requiredRole="professional">
              <Suspense fallback={<PageLoadingFallback />}>
                <WorkerEarningsView />
              </Suspense>
            </ProtectedRoute>
          } />

          <Route path="/admin/health" element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<PageLoadingFallback />}>
                <AdminHealthPage />
              </Suspense>
            </ProtectedRoute>
          } />
        </Route>

        <Route path="/settings" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Unauthorized - shown when user tries to access restricted route */}
        <Route path="/unauthorized" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <UnauthorizedPage />
          </Suspense>
        } />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
        </Routes>
        {/* PERFORMANCE: Route loaded signal for E2E tests - stable element that signals route is interactive */}
        <div data-testid="route-loaded-signal" aria-hidden="true" style={{ display: 'none' }} />
      </div>
      {!hideFooter && <Footer />}
    </div>
  );
}

import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GlobalErrorBoundary } from '@/components/common/GlobalErrorBoundary';

// SPLASH_SHIELD: No legacy HTML splash - AuthGate is sole splash source (eliminates mounting race flicker)
const splashHandled = true;

function App() {

  return (
    <ThemeProvider defaultTheme="dark" storageKey="hospogo-ui-theme">
      <GlobalErrorBoundary>
        <div className="relative w-full overflow-x-hidden min-h-screen">
          <HelmetProvider>
            <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <Router>
                  <AuthProvider>
                    {/* HOSPOGO_CORE_SYSTEM_RECOVERY: Top-level auth gate */}
                    {/* This wraps ALL content and shows Electric Lime splash until isSystemReady && user !== undefined */}
                    <AuthGate splashHandled={splashHandled}>
                      <PusherProvider>
                        <NotificationProvider>
                          <RouteProgressBar />
                          <Toaster />
                          <NotificationToast />
                          <AppRoutes splashHandled={splashHandled} />
                          <TutorialOverlay />
                          {/* PERFORMANCE: Support Bot lazy-loads after primary UI is interactive */}
                          <Suspense fallback={null}>
                            <SupportChatWidget />
                          </Suspense>
                          <OfflineNotification />
                          <InstallPrompt />
                          <PwaUpdateHandler />
                          <Suspense fallback={null}><Analytics /></Suspense>
                          <Suspense fallback={null}><SpeedInsights /></Suspense>
                        </NotificationProvider>
                      </PusherProvider>
                    </AuthGate>
                  </AuthProvider>
                </Router>
              </TooltipProvider>
            </QueryClientProvider>
            </ErrorBoundary>
          </HelmetProvider>
        </div>
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
