// INVESTOR BRIEFING FIX: Removed 'brand' and 'trainer' roles
// System now only knows about 'Venue Owner' (Engine/hub/business) and 'Professional' (Staff)
export type AppRole = 'hub' | 'professional' | 'admin' | 'client' | 'business';

/**
 * FOUNDER ACCESS WHITELIST
 * 
 * These email addresses have god-mode access across the platform.
 * Used by: ProtectedRoute, Navbar CEO Insights, requireAdmin middleware.
 * 
 * Purpose: Ensures the designated admin can access all admin/CEO features
 * even if the 'admin' role hasn't been explicitly assigned in the database.
 */
export const FOUNDER_EMAILS = [
  'julian.g.roberts@gmail.com',
] as const;

/**
 * Check if an email belongs to a founder account.
 * Used for CEO/admin access bypass across the application.
 * 
 * SECURITY FIX: Case-insensitive comparison to handle Firebase email normalization inconsistencies.
 */
export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return FOUNDER_EMAILS.some(e => e.toLowerCase() === normalizedEmail);
}

export const roleToRoute: Record<AppRole, string> = {
  hub: '/venue/dashboard', // Aligned with business - both use /venue/dashboard
  business: '/venue/dashboard', // Primary URL for business role users
  professional: '/professional-dashboard',
  admin: '/admin',
  client: '/onboarding' // INVESTOR BRIEFING FIX: Changed from /role-selection to /onboarding
};

export function getDashboardRoute(role: AppRole | undefined | null): string {
  if (!role) return '/home';
  return roleToRoute[role] || '/home';
}

export function hasRole(roles: AppRole[] | undefined | null, role: AppRole): boolean {
  return !!roles && Array.isArray(roles) && roles.includes(role);
}

/**
 * CENTRALIZED ROLE MAPPING: Maps venue/business roles consistently across frontend and backend.
 * 
 * This is the single source of truth for venue <-> business mapping.
 * Used by both frontend (AuthContext, AuthGuard) and backend (API routes).
 * 
 * Rules:
 * - 'venue' → 'business' (legacy alias, normalized to business)
 * - 'hub' → 'business' (business owner role)
 * - All other roles map to themselves
 * 
 * INVESTOR BRIEFING FIX: Removed 'brand' and 'trainer' role mappings
 * CRITICAL: This function ensures BOTH 'venue' and 'hub' map to 'business' to prevent
 * access denied errors due to terminology mismatches.
 */
export function normalizeVenueToBusiness(role: string | null | undefined): AppRole | null {
  if (!role || typeof role !== 'string') return null;
  const normalized = role.toLowerCase();
  
  // Map venue-related roles to business (CRITICAL: both 'venue' and 'hub' must map to 'business')
  if (normalized === 'venue' || normalized === 'hub') {
    return 'business';
  }
  
  // Return valid roles as-is (INVESTOR BRIEFING FIX: removed 'trainer')
  if (['professional', 'business', 'admin', 'client'].includes(normalized)) {
    return normalized as AppRole;
  }
  
  return null;
}

/**
 * Checks if a role is equivalent to 'business' (including venue, hub aliases).
 * INVESTOR BRIEFING FIX: Removed 'brand' from business role check
 * Used for permission checks where business/venue/hub should be treated the same.
 */
export function isBusinessRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === 'business' || normalized === 'venue' || normalized === 'hub';
}

/**
 * Maps frontend roles to backend API role values.
 * INVESTOR BRIEFING FIX: Backend API now only accepts: 'professional', 'business', 'admin'
 * 
 * Uses centralized normalizeVenueToBusiness for consistency.
 */
export function mapRoleToApiRole(frontendRole: AppRole): 'professional' | 'business' | 'admin' {
  const normalized = normalizeVenueToBusiness(frontendRole);
  if (!normalized) return 'professional';
  
  const roleMapping: Record<AppRole, 'professional' | 'business' | 'admin'> = {
    'hub': 'business',
    'business': 'business',
    'professional': 'professional',
    'admin': 'admin',
    'client': 'professional', // Default fallback
  };
  return roleMapping[normalized] || 'professional';
}


