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


