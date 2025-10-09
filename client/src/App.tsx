import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageLoadingFallback } from '@/components/loading/loading-spinner';
import { TutorialOverlay } from '@/components/onboarding/tutorial-overlay';
import { FeedbackWidget } from '@/components/feedback/feedback-widget';
import { PerformanceMonitor } from '@/components/performance/performance-monitor';
import { ErrorBoundary } from '@/components/error-handling/error-boundary';
import OfflineSupport from '@/components/mobile/mobile-offline-support';
import Navbar from '@/components/navbar';

// Core pages - load immediately for fast initial render
import LandingPage from '@/pages/landing';
import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import ForgotPasswordPage from '@/pages/forgot-password';
import { OAuthCallback } from '@/pages/oauth-callback';
import RoleSelectionPage from '@/pages/role-selection';
import NotFound from '@/pages/not-found';

// Onboarding pages - lazy load for better performance
const BarberOnboarding = lazy(() => import('@/pages/onboarding/barber'));
const ShopOnboarding = lazy(() => import('@/pages/onboarding/shop'));
const BrandOnboarding = lazy(() => import('@/pages/onboarding/brand'));

// Dashboard pages - lazy load to reduce initial bundle
const HubDashboard = lazy(() => import('@/pages/hub-dashboard'));
const ProfessionalDashboard = lazy(() => import('@/pages/professional-dashboard'));
const BrandDashboard = lazy(() => import('@/pages/brand-dashboard'));

// Feature pages - lazy load for better performance
const DemoPage = lazy(() => import('@/pages/demo'));
const ProfilePage = lazy(() => import('@/pages/profile'));
const CommunityPage = lazy(() => import('@/pages/community'));
const ShiftFeedPage = lazy(() => import('@/pages/shift-feed'));
const TournamentsPage = lazy(() => import('@/pages/tournaments'));
const ApplicationsPage = lazy(() => import('@/pages/applications'));
const AnalyticsPage = lazy(() => import('@/pages/analytics'));

// Mobile pages - lazy load for mobile-specific features
const MobileJobsPage = lazy(() => import('@/pages/mobile/mobile-jobs'));
const MobileCommunityPage = lazy(() => import('@/pages/mobile/mobile-community'));
const MobileMessagesPage = lazy(() => import('@/pages/mobile/mobile-messages'));
const MobileDashboardPage = lazy(() => import('@/pages/mobile/mobile-dashboard'));

// Complex components - lazy load to reduce bundle size
const SocialFeed = lazy(() => import('@/components/social/social-feed'));
const TrainingHub = lazy(() => import('@/components/training/training-hub'));
const ContentModeration = lazy(() => import('@/components/admin/content-moderation'));
const NotificationDemo = lazy(() => import('@/components/notifications/notification-demo'));
const DesignSystemShowcase = lazy(() => import('@/pages/design-showcase'));
const AdminDashboard = lazy(() => import('@/pages/admin-dashboard'));

// Legal pages - lazy load for compliance
const TermsOfService = lazy(() => import('@/pages/terms-of-service'));
const PrivacyPolicy = lazy(() => import('@/pages/privacy-policy'));
const AntiSpamPolicy = lazy(() => import('@/pages/anti-spam-policy'));

// Expo demo page - lazy load for performance
const ExpoDemo = lazy(() => import('@/pages/expo-demo'));

// Payment tracking page - lazy load for performance  
const PaymentTracking = lazy(() => import('@/pages/payment-tracking'));

// Contractor compliance page - lazy load for performance
const ContractorCompliance = lazy(() => import('@/pages/contractor-compliance'));

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          <AuthGuard>
            <LandingPage />
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

        <Route path="/forgot-password" element={
          <AuthGuard>
            <ForgotPasswordPage />
          </AuthGuard>
        } />

        <Route path="/role-selection" element={
          <AuthGuard requireAuth={true}>
            <RoleSelectionPage />
          </AuthGuard>
        } />

        {/* Onboarding routes */}
        <Route path="/onboarding/professional" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <BarberOnboarding />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/onboarding/hub" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <ShopOnboarding />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/onboarding/brand" element={
          <AuthGuard requireAuth={true}>
            <Suspense fallback={<PageLoadingFallback />}>
              <BrandOnboarding />
            </Suspense>
          </AuthGuard>
        } />

        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/__/auth/handler" element={<OAuthCallback />} />

        {/* Protected dashboard routes */}
        <Route path="/hub/dashboard" element={
          <ProtectedRoute requiredRole="hub">
            <Suspense fallback={<PageLoadingFallback />}>
              <HubDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/professional/dashboard" element={
          <ProtectedRoute requiredRole="professional">
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfessionalDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/brand/dashboard" element={
          <ProtectedRoute requiredRole="brand">
            <Suspense fallback={<PageLoadingFallback />}>
              <BrandDashboard />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/hub-dashboard" element={
          <ProtectedRoute requiredRole="hub">
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

        {/* Profile route */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ProfilePage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Protected feature routes */}
        <Route path="/community" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <CommunityPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/shift-feed" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ShiftFeedPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/tournaments" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <TournamentsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/applications" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ApplicationsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <AnalyticsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/social-feed" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <SocialFeed />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/training-hub" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <TrainingHub />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
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

        <Route path="/payment-tracking" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <PaymentTracking />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/contractor-compliance" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <ContractorCompliance />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/notifications/demo" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <div className="min-h-screen bg-gray-50">
                <NotificationDemo />
              </div>
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Mobile-specific routes */}
        <Route path="/mobile/jobs" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MobileJobsPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/mobile/community" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MobileCommunityPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/mobile/messages" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MobileMessagesPage />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/mobile/dashboard" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingFallback />}>
              <MobileDashboardPage />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Legal pages - public access */}
        <Route path="/terms-of-service" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <TermsOfService />
          </Suspense>
        } />

        <Route path="/privacy-policy" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <PrivacyPolicy />
          </Suspense>
        } />

        <Route path="/anti-spam-policy" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <AntiSpamPolicy />
          </Suspense>
        } />

        {/* Expo demo - public access for demonstrations */}
        <Route path="/expo-demo" element={
          <Suspense fallback={<PageLoadingFallback />}>
            <ExpoDemo />
          </Suspense>
        } />

        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <OfflineSupport>
                <Toaster />
                <AppRoutes />
                <TutorialOverlay />
                <FeedbackWidget />
                <PerformanceMonitor />
              </OfflineSupport>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;