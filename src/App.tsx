import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { TutorialOverlay } from '@/components/onboarding/tutorial-overlay';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { PwaUpdateHandler } from '@/components/pwa/pwa-update-handler';
import { RouteProgressBar } from '@/components/ui/route-progress-bar';
import Navbar from '@/components/navbar';
import { Footer } from '@/components/layout/footer';

// Core pages - load immediately for fast initial render (critical for FCP/LCP)
import LandingPage from '@/pages/landing';
import HomePage from '@/pages/home';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import { OAuthCallback } from '@/pages/oauth-callback';
import NotFound from '@/pages/not-found';

// Onboarding pages - lazy load (behind auth wall)
const RoleSelectionPage = lazy(() => import('@/pages/role-selection'));
const OnboardingPage = lazy(() => import('@/pages/onboarding'));
const HubOnboardingPage = lazy(() => import('@/pages/onboarding/hub'));
const ProfessionalOnboardingPage = lazy(() => import('@/pages/onboarding/professional'));

// Legal & Company pages - lazy load (less critical)
const TermsPage = lazy(() => import('@/pages/legal/terms'));
const PrivacyPage = lazy(() => import('@/pages/legal/privacy'));
const AboutPage = lazy(() => import('@/pages/company/about'));
const ContactPage = lazy(() => import('@/pages/company/contact'));

// Utility pages - lazy load
const DashboardRedirect = lazy(() => import('@/pages/dashboard-redirect'));
const ComingSoonPage = lazy(() => import('@/pages/coming-soon'));

// Dashboard pages - lazy load to reduce initial bundle
const UserDashboard = lazy(() => import('@/pages/user-dashboard'));
const EditProfilePage = lazy(() => import('@/pages/edit-profile'));
const JobFeedPage = lazy(() => import('@/pages/job-feed'));
const JobDetailsPage = lazy(() => import('@/pages/job-details'));
const MyApplicationsPage = lazy(() => import('@/pages/my-applications'));
const ReviewPage = lazy(() => import('@/pages/review'));
const PostJobPage = lazy(() => import('@/pages/post-job'));
const ManageJobsPage = lazy(() => import('@/pages/manage-jobs'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const HubDashboard = lazy(() => import('@/pages/hub-dashboard'));
const ProfessionalDashboard = lazy(() => import('@/pages/professional-dashboard'));
const BrandDashboard = lazy(() => import('@/pages/brand-dashboard'));
const TrainerDashboard = lazy(() => import('@/pages/trainer-dashboard'));

// Feature pages - lazy load for better performance
const DemoPage = lazy(() => import('@/pages/demo'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const CommunityPage = lazy(() => import('@/pages/community'));
const WalletPage = lazy(() => import('@/pages/wallet'));
const MessagesPage = lazy(() => import('@/pages/messages'));
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard'));

// Complex components - lazy load to reduce bundle size
const SocialFeed = lazy(() => import('@/components/social/social-feed'));
const TrainingHub = lazy(() => import('@/components/training/training-hub'));
const ContentModeration = lazy(() => import('@/components/admin/content-moderation'));
const NotificationDemo = lazy(() => import('@/components/notifications/notification-demo'));
const DesignSystemShowcase = lazy(() => import('@/components/demo/design-system-showcase').then(module => ({ default: module.DesignSystemShowcase })));

function AppRoutes() {
  const location = useLocation();
  const { isLoading } = useAuth();
  const hideNavbar = location.pathname === '/onboarding';
  const hideFooter = ['/onboarding', '/login', '/signup', '/role-selection'].includes(location.pathname);
  
  // Show loading screen while auth is initializing to prevent errors
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      {!hideNavbar && <Navbar />}
      <div className="flex-grow w-full max-w-full overflow-x-hidden">
        <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <AuthGuard>
            <LandingPage />
          </AuthGuard>
        } />
        
        <Route path="/home" element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        } />

        <Route path="/demo" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <DemoPage />
          </Suspense>
        } />

        <Route path="/design-showcase" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <DesignSystemShowcase />
          </Suspense>
        } />

        {/* Authentication routes */}
        <Route path="/login" element={
          <AuthGuard>
            <LoginPage />
          </AuthGuard>
        } />
        
        <Route path="/signup" element={
          <AuthGuard>
            <SignupPage />
          </AuthGuard>
        } />

        <Route path="/role-selection" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <RoleSelectionPage />
            </Suspense>
          </AuthGuard>
        } />

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

        {/* Protected dashboard routes */}
        <Route path="/dashboard" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <DashboardRedirect />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/user-dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <UserDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <EditProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/jobs" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <JobFeedPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/jobs/:id" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <JobDetailsPage />
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

        <Route path="/hub-dashboard" element={
          <ProtectedRoute allowedRoles={['hub', 'business']}>
            <Suspense fallback={<PageLoadingFallback />}>
              <HubDashboard />
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

        <Route path="/brand-dashboard" element={
          <ProtectedRoute requiredRole="brand">
            <Suspense fallback={<PageLoadingFallback />}>
              <BrandDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/trainer-dashboard" element={
          <ProtectedRoute requiredRole="trainer">
            <Suspense fallback={<PageLoadingFallback />}>
              <TrainerDashboard />
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

        <Route path="/messages" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MessagesPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideFooter && <Footer />}
    </div>
  );
}

import { ErrorBoundary } from '@/components/ui/error-boundary';

function App() {
  // Remove splash screen after React successfully mounts
  useEffect(() => {
    // Call removeSplash after a brief delay to ensure React has fully rendered
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.removeSplash) {
        window.removeSplash();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden min-h-screen">
      <HelmetProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="dark" storageKey="snipshift-ui-theme">
          <TooltipProvider>
            <Router>
              <AuthProvider>
                <NotificationProvider>
                  <RouteProgressBar />
                  <Toaster />
                  <AppRoutes />
                  <TutorialOverlay />
                  <FeedbackWidget />
                  <InstallPrompt />
                  <PwaUpdateHandler />
                  <Analytics />
                  <SpeedInsights />
                </NotificationProvider>
              </AuthProvider>
            </Router>
          </TooltipProvider>
          </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </div>
  );
}

export default App;
