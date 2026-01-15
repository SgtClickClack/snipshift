export type AppRole = 'hub' | 'professional' | 'brand' | 'trainer' | 'admin' | 'client' | 'business';

export const roleToRoute: Record<AppRole, string> = {
  hub: '/hub-dashboard',
  business: '/hub-dashboard', // Map business to hub dashboard
  professional: '/professional-dashboard',
  brand: '/brand-dashboard',
  trainer: '/trainer-dashboard',
  admin: '/admin',
  client: '/role-selection'
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
 * - 'brand' → 'business' (brand/company role)
 * - All other roles map to themselves
 */
export function normalizeVenueToBusiness(role: string | null | undefined): AppRole | null {
  if (!role || typeof role !== 'string') return null;
  const normalized = role.toLowerCase();
  
  // Map venue-related roles to business
  if (normalized === 'venue' || normalized === 'hub' || normalized === 'brand') {
    return 'business';
  }
  
  // Return valid roles as-is
  if (['professional', 'business', 'admin', 'trainer', 'client'].includes(normalized)) {
    return normalized as AppRole;
  }
  
  return null;
}

/**
 * Checks if a role is equivalent to 'business' (including venue, hub, brand aliases).
 * Used for permission checks where business/venue/hub should be treated the same.
 */
export function isBusinessRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === 'business' || normalized === 'venue' || normalized === 'hub' || normalized === 'brand';
}

/**
 * Maps frontend roles to backend API role values.
 * The backend API only accepts: 'professional', 'business', 'admin', 'trainer'
 * 
 * Uses centralized normalizeVenueToBusiness for consistency.
 */
export function mapRoleToApiRole(frontendRole: AppRole): 'professional' | 'business' | 'admin' | 'trainer' {
  const normalized = normalizeVenueToBusiness(frontendRole);
  if (!normalized) return 'professional';
  
  const roleMapping: Record<AppRole, 'professional' | 'business' | 'admin' | 'trainer'> = {
    'hub': 'business',
    'brand': 'business',
    'business': 'business',
    'professional': 'professional',
    'trainer': 'trainer',
    'admin': 'admin',
    'client': 'professional', // Default fallback
  };
  return roleMapping[normalized] || 'professional';
}


