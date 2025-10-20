export type AppRole = 'professional' | 'business' | 'hub' | 'admin' | 'shop' | 'barber';

export const roleToRoute: Record<AppRole, string> = {
  professional: '/professional-dashboard',
  business: '/business-dashboard',
  hub: '/hub-dashboard',
  admin: '/admin',
  shop: '/shop-dashboard',
  barber: '/professional-dashboard'
};

export function getDashboardRoute(role: AppRole | undefined | null): string {
  if (!role) return '/role-selection';
  return roleToRoute[role] || '/role-selection';
}

export function hasRole(roles: AppRole[] | undefined | null, role: AppRole): boolean {
  return !!roles && Array.isArray(roles) && roles.includes(role);
}


